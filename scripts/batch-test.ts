#!/usr/bin/env tsx
import '../lib/env';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { generateMaster } from '../lib/ai/master';
import { applyLighting } from '../lib/ai/light';
import { reconcileLighting } from '../lib/image/reconcile';
import { getDesign } from '../lib/designs';
import { provider } from '../lib/ai/edit';
import { totalSpend } from '../lib/ai/fal';

/**
 * Runs several photographs through the dusk pass and reports how each scored.
 *
 * The point is breadth, not polish: does the pipeline hold up on architecture it
 * has never seen — different rooflines, materials, occlusion — rather than on the
 * one house the prompts were tuned against.
 *
 *   npx tsx scripts/batch-test.ts h1-gray-twostory h2-modern-brick
 */
const OUT = 'out/batch';
const INGEST_WIDTH = 1536;

async function main() {
  const args = process.argv.slice(2);
  // --design applies lighting with NO traced roofline, which is exactly what an
  // uploaded photo gets: the visitor never traces anything.
  const designId = args.find((a) => a.startsWith('--design='))?.slice(9);
  const names = args.filter((a) => !a.startsWith('--'));
  if (names.length === 0) {
    console.error('usage: tsx scripts/batch-test.ts <fixture-name> [...]');
    process.exit(1);
  }
  await mkdir(OUT, { recursive: true });
  const start = await totalSpend();
  console.log(`\nprovider: ${provider()} · ${names.length} photo(s)\n`);

  const rows: string[] = [];
  for (const name of names) {
    const original = await sharp(await readFile(`fixtures/houses/${name}.jpg`))
      .rotate()
      .resize(INGEST_WIDTH, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 94 })
      .toBuffer();
    await writeFile(path.join(OUT, `${name}-before.jpg`), original);

    process.stdout.write(`${name}\n`);
    try {
      // One attempt only: this measures the pipeline's hit rate on unseen houses,
      // and a retry would hide how often the first pass is good enough.
      const r = await generateMaster(original, { quality: 'draft', maxAttempts: 1 });
      await writeFile(path.join(OUT, `${name}-after.jpg`), r.buffer);
      await writeFile(path.join(OUT, `${name}-overlay.png`), r.report.overlay);
      let extra = '';
      if (designId) {
        const design = getDesign(designId);
        const { width: mw = 0, height: mh = 0 } = await sharp(r.buffer).metadata();
        const lit = await applyLighting({ master: r.buffer, design, width: mw, height: mh, quality: 'draft' });
        const rec = await reconcileLighting(r.buffer, lit.edit.buffer);
        await writeFile(path.join(OUT, `${name}-lit.jpg`), rec.buffer);
        extra = `  +${design.label} $${lit.edit.costUsd.toFixed(3)}`;
      }
      const { width, height } = await sharp(r.buffer).metadata();
      rows.push(
        `${name.padEnd(20)} ${String(r.report.score).padStart(5)}  local ${String(r.report.detail.localScore).padStart(5)}  ` +
          `${r.report.passed ? 'PASS' : 'FAIL'}  ${width}x${height}  $${r.costUsd.toFixed(3)}${extra}`,
      );
    } catch (err) {
      rows.push(`${name.padEnd(20)} ERROR: ${(err as Error).message.slice(0, 80)}`);
    }
  }

  console.log('\n=== results ===');
  console.log('photo                globl  local        verdict  output      cost');
  for (const r of rows) console.log(r);
  console.log(`\nbatch cost: $${((await totalSpend()) - start).toFixed(3)} · outputs in ${OUT}/`);
}
main().catch((e) => { console.error(e); process.exit(1); });
