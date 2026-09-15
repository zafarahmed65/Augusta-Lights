import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import type { EditRequest, EditResult } from '../types';

/**
 * OpenRouter backend.
 *
 * Same image models as the fal path (Gemini 3 Pro Image and 3.1 Flash Image) but
 * billed through the user's own OpenRouter account, and it reports the exact cost
 * of every call in `usage.cost` — so spend tracking is measured rather than
 * estimated from a price table.
 */

const DRAFT_MODEL = 'google/gemini-3.1-flash-image';
const FINAL_MODEL = 'google/gemini-3-pro-image';

/** A single edit should never outlast this; a stuck request blocks a whole batch. */
const REQUEST_TIMEOUT_MS = 6 * 60 * 1000;

/**
 * Gemini image models intermittently answer in prose — "I have updated the
 * photograph…" — and attach no image. It is not a refusal and not deterministic;
 * the identical request usually succeeds on a second attempt. Observed live on
 * the upload endpoint after the same prompt had worked in batch runs.
 */
const NO_IMAGE_ATTEMPTS = 3;
const RETURN_THE_IMAGE =
  '\n\nReturn the edited image itself as an image. Do not reply with a description, ' +
  'a summary, or any text about what you changed.';

async function toDataUrl(image: string | Buffer): Promise<string> {
  if (typeof image === 'string' && /^https?:\/\//.test(image)) return image;
  const buf = typeof image === 'string' ? await readFile(image) : image;
  // Normalise to JPEG: PNG guides are large and the extra bytes are billed as
  // prompt tokens on every call.
  const jpeg = await sharp(buf).jpeg({ quality: 92 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

interface ORResponse {
  error?: { message?: string };
  choices?: { message?: { images?: { image_url?: { url?: string } }[]; content?: string } }[];
  usage?: { cost?: number };
}

export async function editImageViaOpenRouter(req: EditRequest): Promise<EditResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set in .env.local');

  const model = req.quality === 'final' ? FINAL_MODEL : DRAFT_MODEL;
  const images = await Promise.all(req.images.map(toDataUrl));

  /*
   * The system prompt is folded into the user turn rather than sent as a system
   * message. Gemini's image path has no real system role, so OpenRouter has to
   * translate it, and a separate system turn measurably raises the chance of a
   * text-only reply.
   */
  const instruction = req.systemPrompt ? `${req.systemPrompt}\n\n${req.prompt}` : req.prompt;

  const attempt = async (text: string) => {
    const content = [
      { type: 'text', text },
      ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
    return callModel(key, model, content);
  };

  let lastSaid = '';
  for (let i = 0; i < NO_IMAGE_ATTEMPTS; i++) {
    // Each retry states the requirement more plainly than the last.
    const data = await attempt(i === 0 ? instruction : instruction + RETURN_THE_IMAGE);
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (url) {
      const buffer = Buffer.from(url.split(',', 2)[1], 'base64');
      const meta = await sharp(buffer).metadata();
      if (i > 0) console.log(`  (image returned on attempt ${i + 1})`);
      return {
        buffer,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        model,
        costUsd: data.usage?.cost ?? 0,
      };
    }
    lastSaid = String(data.choices?.[0]?.message?.content ?? '').slice(0, 200);
    console.warn(`  ${model} replied with text instead of an image (attempt ${i + 1}/${NO_IMAGE_ATTEMPTS})`);
  }

  throw new Error(
    `${model} answered in text instead of returning an image, ${NO_IMAGE_ATTEMPTS} times. ` +
      `It said: "${lastSaid}"`,
  );
}

async function callModel(
  key: string,
  model: string,
  content: unknown[],
): Promise<ORResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content }],
      }),
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      throw new Error(`${model} did not return within ${REQUEST_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  }
  clearTimeout(timer);

  const data = (await res.json()) as ORResponse;
  if (data.error) throw new Error(`OpenRouter: ${data.error.message ?? 'unknown error'}`);
  return data;
}
