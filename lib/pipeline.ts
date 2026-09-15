import sharp from 'sharp';
import { generateMaster } from './ai/master';
import { applyLighting, reviseImage } from './ai/light';
import { composeHero, composeSheet } from './image/compose';
import { getDesign } from './designs';
import { patchJob, readJob, readJobFile, writeJobFile } from './jobs';
import type { RooflineSegment } from './types';

/**
 * Server-side orchestration of a job.
 *
 * Stages write progress back to the job record as they complete, so the client
 * can poll a plain JSON file rather than hold a connection open for two minutes.
 */

const HERO_WIDTH = 2048;

async function dimensions(image: Buffer) {
  const { width = 0, height = 0 } = await sharp(image).metadata();
  return { width, height };
}

/** S1 -> S6. Fire-and-forget; every failure lands on the job record. */
export async function runJob(id: string, original: Buffer, quality: 'draft' | 'final' = 'draft') {
  try {
    await writeJobFile(id, 'original.jpg', original);
    await patchJob(id, { status: 'master', step: 'Converting to dusk', files: { original: 'original.jpg' } });

    const master = await generateMaster(original, { quality });
    await writeJobFile(id, 'master.jpg', master.buffer);
    await writeJobFile(id, 'overlay.png', master.report.overlay);

    const job = await patchJob(id, {
      status: 'lighting',
      step: 'Adding lighting',
      preservation: {
        score: master.report.score,
        localScore: master.report.detail.localScore,
        passed: master.report.passed,
        attempts: master.attempts,
      },
      files: { original: 'original.jpg', master: 'master.jpg', overlay: 'overlay.png' },
    });

    await lightAndCompose(id, master.buffer, job.segments);
  } catch (err) {
    await patchJob(id, { status: 'error', step: 'Failed', error: (err as Error).message });
  }
}

/**
 * S4 -> S6 against the existing master. This is what a roofline correction
 * re-runs: the expensive dusk pass is already done and stays untouched, so a fix
 * costs one call instead of a full regeneration.
 */
export async function lightAndCompose(id: string, master: Buffer, segments?: RooflineSegment[]) {
  const job = await readJob(id);
  if (!job) throw new Error('job not found');
  const design = getDesign(job.designId);
  const { width, height } = await dimensions(master);

  const { edit, guide, bulbCount } = await applyLighting({
    master,
    design,
    width,
    height,
    segments,
    decorations: job.decorations,
    placementNotes: job.placementNotes,
    frontageFeet: job.frontageFeet,
  });

  if (guide) await writeJobFile(id, 'guide.png', guide);
  const hero = await composeHero(edit.buffer, {
    lastName: job.lastName,
    designLabel: design.label,
    targetWidth: HERO_WIDTH,
  });
  await writeJobFile(id, 'hero.jpg', hero);

  await patchJob(id, {
    status: 'done',
    step: 'Ready',
    bulbCount,
    spendUsd: Number((job.spendUsd + edit.costUsd).toFixed(3)),
    files: { ...job.files, ...(guide ? { guide: 'guide.png' } : {}), hero: 'hero.jpg' },
  });
}

/** Re-runs lighting after the GM corrects the traced roofline. */
export async function relight(id: string, segments: RooflineSegment[]) {
  try {
    await patchJob(id, { status: 'lighting', step: 'Applying corrected roofline', segments });
    const master = await readJobFile(id, 'master.jpg');
    if (!master) throw new Error('no master to relight — run the job first');
    await lightAndCompose(id, master, segments);
  } catch (err) {
    await patchJob(id, { status: 'error', step: 'Failed', error: (err as Error).message });
  }
}

/** Natural-language revision applied to the current hero. */
export async function revise(id: string, instruction: string) {
  try {
    await patchJob(id, { status: 'lighting', step: 'Applying revision' });
    const job = await readJob(id);
    const current = await readJobFile(id, 'hero.jpg');
    if (!job || !current) throw new Error('nothing to revise yet');

    const edit = await reviseImage(current, instruction);
    const hero = await composeHero(edit.buffer, {
      lastName: job.lastName,
      designLabel: getDesign(job.designId).label,
      targetWidth: HERO_WIDTH,
    });
    await writeJobFile(id, 'hero.jpg', hero);
    await patchJob(id, {
      status: 'done',
      step: 'Ready',
      spendUsd: Number((job.spendUsd + edit.costUsd).toFixed(3)),
    });
  } catch (err) {
    await patchJob(id, { status: 'error', step: 'Failed', error: (err as Error).message });
  }
}

/**
 * 2x2 comparison sheet. Each variant is lit from the SAME master, so the house,
 * sky, landscaping and grade are identical across all four by construction.
 */
export async function buildSheet(id: string, designIds: string[]) {
  try {
    await patchJob(id, { status: 'lighting', step: 'Rendering comparison options' });
    const job = await readJob(id);
    const master = await readJobFile(id, 'master.jpg');
    if (!job || !master) throw new Error('no master — run the job first');
    const { width, height } = await dimensions(master);

    let spend = job.spendUsd;
    const tiles = [];
    for (const designId of designIds.slice(0, 4)) {
      const design = getDesign(designId);
      await patchJob(id, { step: `Rendering ${design.label}` });
      const { edit } = await applyLighting({
        master,
        design,
        width,
        height,
        segments: job.segments,
        frontageFeet: job.frontageFeet,
      });
      spend += edit.costUsd;
      tiles.push({ label: design.label, image: edit.buffer });
    }

    const sheet = await composeSheet(tiles, job.lastName, HERO_WIDTH);
    await writeJobFile(id, 'sheet.jpg', sheet);
    const latest = await readJob(id);
    await patchJob(id, {
      status: 'done',
      step: 'Ready',
      spendUsd: Number(spend.toFixed(3)),
      files: { ...latest!.files, sheet: 'sheet.jpg' },
    });
  } catch (err) {
    await patchJob(id, { status: 'error', step: 'Failed', error: (err as Error).message });
  }
}
