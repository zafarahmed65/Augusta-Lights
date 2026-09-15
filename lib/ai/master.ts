import { editImage } from './fal';
import { MASTER_PROMPT, MASTER_PROMPT_STRICT, MASTER_SYSTEM } from './prompts';
import { verifyPreservation } from '../image/verify';
import type { EditResult, PreservationReport } from '../types';

/**
 * S1 + S2 — the canonical dusk master.
 *
 * Produced once per property and cached. Every lighting variation derives from
 * this single image, which is what makes the 2x2 comparison sheet show the same
 * house four times instead of four similar houses.
 */

export interface MasterOptions {
  quality?: 'draft' | 'final';
  threshold?: number;
  /** Attempts including the first. A failed score retries with a stricter prompt. */
  maxAttempts?: number;
  seed?: number;
}

export interface MasterOutcome {
  buffer: Buffer;
  report: PreservationReport;
  attempts: number;
  /** Total across every attempt, including ones the retry discarded. */
  costUsd: number;
  /** Every attempt, so a rejected render can still be shown in the write-up. */
  history: { attempt: number; score: number; passed: boolean }[];
  edit: EditResult;
}

export async function generateMaster(original: Buffer, opts: MasterOptions = {}): Promise<MasterOutcome> {
  const { quality = 'draft', threshold = 88, maxAttempts = 2, seed } = opts;
  const history: MasterOutcome['history'] = [];
  let costUsd = 0;

  let best: { buffer: Buffer; report: PreservationReport; edit: EditResult } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const edit = await editImage({
      prompt: attempt === 1 ? MASTER_PROMPT : MASTER_PROMPT_STRICT,
      systemPrompt: MASTER_SYSTEM,
      images: [original],
      quality,
      seed,
    });

    costUsd += edit.costUsd;
    const report = await verifyPreservation(original, edit.buffer, threshold);
    history.push({ attempt, score: report.score, passed: report.passed });
    console.log(
      `  preservation ${report.score.toFixed(1)}/100 ${report.passed ? 'PASS' : `FAIL (<${threshold})`}` +
        ` — ${report.detail.inventedPixels} invented / ${report.detail.lostPixels} lost edge px`,
    );

    if (!best || report.score > best.report.score) best = { buffer: edit.buffer, report, edit };
    if (report.passed) break;
    if (attempt < maxAttempts) console.log('  retrying with stricter preservation prompt...');
  }

  return { ...best!, attempts: history.length, history, costUsd: Number(costUsd.toFixed(3)) };
}
