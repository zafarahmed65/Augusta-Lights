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

  const content = [
    { type: 'text', text: req.prompt },
    ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
  ];

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
        messages: [
          ...(req.systemPrompt ? [{ role: 'system', content: req.systemPrompt }] : []),
          { role: 'user', content },
        ],
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

  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) {
    const text = data.choices?.[0]?.message?.content ?? JSON.stringify(data).slice(0, 300);
    throw new Error(`${model} returned no image. Said: ${String(text).slice(0, 300)}`);
  }

  const buffer = Buffer.from(url.split(',', 2)[1], 'base64');
  const meta = await sharp(buffer).metadata();

  return {
    buffer,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    model,
    costUsd: data.usage?.cost ?? 0,
  };
}
