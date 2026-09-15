import { editImage } from './fal';
import { buildLightPrompt, buildRevisePrompt, LIGHT_SYSTEM } from './prompts';
import { renderGuide } from '../image/guide';
import type { Design, EditResult, RooflineSegment } from '../types';

/**
 * S4 + S5 — applies one lighting design to the dusk master.
 *
 * Always runs against the master, never against the original photo. That's what
 * guarantees variants share an identical house, sky and grade.
 */

export interface LightingOptions {
  master: Buffer;
  design: Design;
  width: number;
  height: number;
  /** Omit to let the model find the roofline itself (worse, but needs no tracing). */
  segments?: RooflineSegment[];
  decorations?: string[];
  placementNotes?: string;
  frontageFeet?: number;
  quality?: 'draft' | 'final';
  seed?: number;
}

export interface LightingOutcome {
  edit: EditResult;
  /** The guide overlay, kept for the debug contact sheet. */
  guide?: Buffer;
  bulbCount: number;
}

export async function applyLighting(opts: LightingOptions): Promise<LightingOutcome> {
  const { master, design, width, height, segments, decorations, placementNotes, frontageFeet, quality, seed } = opts;

  const usable = segments?.filter((s) => s.included && s.points.length >= 2) ?? [];
  const hasGuide = usable.length > 0;

  let guide: Buffer | undefined;
  let bulbCount = 0;
  if (hasGuide) {
    const guideOpts = { segments: usable, design, width, height, frontageFeet };
    guide = await renderGuide(guideOpts);
    const { planBulbs } = await import('../image/guide');
    bulbCount = planBulbs(guideOpts).length;
    console.log(`  guide: ${bulbCount} × ${design.label} at ${design.spacingInches}" spacing`);
  }

  const edit = await editImage({
    prompt: buildLightPrompt({ design, hasGuide, decorations, placementNotes }),
    systemPrompt: LIGHT_SYSTEM,
    images: guide ? [master, guide] : [master],
    quality,
    seed,
  });

  return { edit, guide, bulbCount };
}

export async function reviseImage(image: Buffer, instruction: string, quality?: 'draft' | 'final') {
  return editImage({
    prompt: buildRevisePrompt(instruction),
    systemPrompt: LIGHT_SYSTEM,
    images: [image],
    quality,
  });
}
