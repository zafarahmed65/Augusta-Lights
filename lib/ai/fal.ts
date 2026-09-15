import { fal } from '@fal-ai/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import type { EditRequest, EditResult, Resolution } from '../types';
import { recordSpend, totalSpend as readTotal } from './spend';

/**
 * Single choke point for every paid API call.
 *
 * Nothing else in the codebase may import @fal-ai/client, so FAL_KEY exists in
 * exactly one module and every dollar spent passes through recordSpend().
 */

const DRAFT_MODEL = 'fal-ai/nano-banana-2/edit';
const FINAL_MODEL = 'fal-ai/gemini-3-pro-image-preview/edit';

/** fal list price, USD per returned image, as of 2026-09. */
const PRICING: Record<string, Partial<Record<Resolution, number>>> = {
  [DRAFT_MODEL]: { '0.5K': 0.06, '1K': 0.08, '2K': 0.12, '4K': 0.16 },
  [FINAL_MODEL]: { '1K': 0.15, '2K': 0.15, '4K': 0.3 },
};


/**
 * Hard ceiling on one render. fal.subscribe has no timeout of its own, so a
 * request that never settles blocks the whole batch indefinitely — observed
 * during the gallery build, where one variant hung for over twenty minutes while
 * spend sat still. A 2K edit normally returns in one to four minutes.
 */
const REQUEST_TIMEOUT_MS = 6 * 60 * 1000;

function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} did not return within ${ms / 1000}s`)), ms);
    }),
  ]).finally(() => clearTimeout(timer)) as Promise<T>;
}

export const isMock = () => process.env.MOCK_AI === '1';

/**
 * Draft quality is the default everywhere so an accidental loop costs $0.06 a
 * shot, not $0.15. Callers opt into `final` explicitly for deliverables.
 */
function resolveModel(quality: EditRequest['quality']): { model: string; resolution: Resolution } {
  const wantFinal = quality === 'final' || process.env.QUALITY === 'final';
  const model = wantFinal ? FINAL_MODEL : DRAFT_MODEL;
  const envRes = process.env.RESOLUTION as Resolution | undefined;
  const fallback: Resolution = wantFinal ? '2K' : '0.5K';
  let resolution = envRes ?? fallback;
  // Pro has no 0.5K tier; asking for one is a 422 from fal.
  if (model === FINAL_MODEL && resolution === '0.5K') resolution = '1K';
  return { model, resolution };
}

export function priceOf(model: string, resolution: Resolution): number {
  return PRICING[model]?.[resolution] ?? 0;
}

/** Spend lives in one module so it works on a read-only serverless filesystem. */
export async function totalSpend(): Promise<number> {
  return readTotal();
}

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error(
      'FAL_KEY is not set. Add it to .env.local (get one at https://fal.ai/dashboard/keys), ' +
        'or run with MOCK_AI=1 to use pre-baked fixtures.',
    );
  }
  fal.config({ credentials: key });
  configured = true;
}

/** fal takes URLs, not bytes. Paths and buffers get uploaded; https URLs pass through. */
async function toUrl(image: string | Buffer): Promise<string> {
  if (typeof image === 'string' && /^https?:\/\//.test(image)) return image;
  const buf = typeof image === 'string' ? await readFile(image) : image;
  const name = typeof image === 'string' ? path.basename(image) : 'input.jpg';
  const ext = path.extname(name).toLowerCase();
  const type = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return fal.storage.upload(new File([new Uint8Array(buf)], name, { type }));
}

async function mockEdit(req: EditRequest): Promise<EditResult> {
  // Echo the first input image back so the pipeline's shape can be exercised
  // end-to-end without spending anything.
  const source = req.images[0];
  const buf =
    typeof source !== 'string'
      ? source
      : /^https?:\/\//.test(source)
        ? Buffer.from(await (await fetch(source)).arrayBuffer())
        : await readFile(source);
  const out = await sharp(buf).modulate({ brightness: 0.55 }).tint('#2a3a6b').jpeg({ quality: 90 }).toBuffer();
  const meta = await sharp(out).metadata();
  console.log(`  [mock] ${req.prompt.slice(0, 60).replace(/\s+/g, ' ')}...`);
  return { buffer: out, width: meta.width ?? 0, height: meta.height ?? 0, model: 'mock', costUsd: 0 };
}

export async function editImage(req: EditRequest): Promise<EditResult> {
  if (isMock()) return mockEdit(req);
  ensureConfigured();

  const { model, resolution } = resolveModel(req.quality);
  const image_urls = await Promise.all(req.images.map(toUrl));

  const result = await withTimeout(fal.subscribe(model, {
    input: {
      prompt: req.prompt,
      image_urls,
      resolution,
      output_format: 'jpeg',
      num_images: 1,
      ...(req.systemPrompt ? { system_prompt: req.systemPrompt } : {}),
      ...(req.seed !== undefined ? { seed: req.seed } : {}),
    },
  }), REQUEST_TIMEOUT_MS, model);

  const image = (result.data as { images?: { url: string; width?: number; height?: number }[] }).images?.[0];
  if (!image?.url) {
    throw new Error(`${model} returned no image. Response: ${JSON.stringify(result.data).slice(0, 400)}`);
  }

  const buffer = Buffer.from(await (await fetch(image.url)).arrayBuffer());
  const costUsd = priceOf(model, resolution);
  await recordSpend({ model, costUsd, provider: 'fal', resolution });

  const meta = await sharp(buffer).metadata();
  return {
    buffer,
    width: image.width ?? meta.width ?? 0,
    height: image.height ?? meta.height ?? 0,
    model,
    costUsd,
    description: (result.data as { description?: string }).description,
  };
}
