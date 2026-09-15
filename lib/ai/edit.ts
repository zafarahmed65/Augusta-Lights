import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { editImage as editViaFal, isMock } from './fal';
import { recordSpend, totalSpend } from './spend';
import { editImageViaOpenRouter } from './openrouter';
import type { EditRequest, EditResult } from '../types';

/**
 * Single entry point for every paid image edit.
 *
 * Two backends serve the same Gemini image models: fal, and OpenRouter through
 * the user's own account. PROVIDER selects one; OpenRouter is the default because
 * it reports exact per-call cost rather than an estimated price table.
 *
 * Nothing outside lib/ai may import a backend directly, so every dollar spent
 * passes through here and lands in the spend log.
 */

export type Provider = 'openrouter' | 'fal';

export const provider = (): Provider =>
  (process.env.PROVIDER as Provider) ?? (process.env.OPENROUTER_API_KEY ? 'openrouter' : 'fal');

async function mockEdit(req: EditRequest): Promise<EditResult> {
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

  // Name both options. Without a key the provider defaults to fal, so a missing
  // OpenRouter key used to surface as a fal error, which points at the wrong fix.
  if (!process.env.OPENROUTER_API_KEY && !process.env.FAL_KEY) {
    throw new Error(
      'No image provider key found. Set OPENROUTER_API_KEY (openrouter.ai/keys) or FAL_KEY ' +
        '(fal.ai/dashboard/keys) in your environment, or set MOCK_AI=1 to run against fixtures ' +
        'without spending anything.',
    );
  }

  const which = provider();
  // fal already records its own spend against a price table; OpenRouter returns
  // the real figure, so only that path needs logging here.
  if (which === 'fal') return editViaFal(req);

  const result = await editImageViaOpenRouter(req);
  await recordSpend({ model: result.model, costUsd: result.costUsd, provider: which });
  return result;
}

export { isMock } from './fal';
export { totalSpend };
