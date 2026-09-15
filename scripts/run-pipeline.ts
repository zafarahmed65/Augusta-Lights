#!/usr/bin/env tsx
import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { generateMaster } from '../lib/ai/master';
import { applyLighting } from '../lib/ai/light';
import { getDesign } from '../lib/designs';
import { totalSpend, isMock } from '../lib/ai/fal';
import type { RooflineSegment } from '../lib/types';

/**
 * Phase 1 harness: runs one photograph through the whole pipeline and writes
 * every intermediate to disk so prompts can be iterated without any UI.
 *
 *   npx tsx scripts/run-pipeline.ts fixtures/houses/house-01.jpg \
 *     --designs warm-white,candy-cane --roofline fixtures/houses/house-01.roofline.json
 *
 * Defaults to draft quality at 0.5K ($0.06/call). Add --final for 2K deliverables.
 */

interface Args {
  photo: string;
  designs: string[];
  roofline?: string;
  final: boolean;
  frontageFeet?: number;
  fresh: boolean;
}

function parseArgs(argv: string[]): Args {
  const positional = argv.filter((a) => !a.startsWith('--'));
  const flag = (name: string): string | undefined => {
    const inline = argv.find((a) => a.startsWith(`--${name}=`));
    if (inline) return inline.slice(name.length + 3);
    const at = argv.indexOf(`--${name}`);
    if (at === -1) return undefined; // guard: argv[-1 + 1] is the positional arg
    const next = argv[at + 1];
    return next && !next.startsWith('--') ? next : undefined;
  };
  if (!positional[0]) {
    console.error('usage: tsx scripts/run-pipeline.ts <photo> [--designs a,b] [--roofline f.json] [--final] [--fresh]');
    process.exit(1);
  }
  return {
    photo: positional[0],
    designs: (flag('designs') ?? 'warm-white').split(',').map((s) => s.trim()).filter(Boolean),
    roofline: flag('roofline'),
    final: argv.includes('--final'),
    frontageFeet: flag('frontage') ? Number(flag('frontage')) : undefined,
    fresh: argv.includes('--fresh'),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const quality = args.final ? ('final' as const) : ('draft' as const);

  const original = await readFile(args.photo);
  const meta = await sharp(original).metadata();
  const slug = path.basename(args.photo).replace(/\.[^.]+$/, '');
  const outDir = path.join('out', slug);
  await mkdir(outDir, { recursive: true });

  const startSpend = await totalSpend();
  console.log(`\n${slug} — ${meta.width}x${meta.height} — ${quality}${isMock() ? ' [MOCK]' : ''}`);
  await writeFile(path.join(outDir, '00-original.jpg'), original);

  // --- S1/S2: dusk master, cached by photo content -------------------------
  // Masters are the expensive part and are reused across every design, so a
  // re-run to tweak lighting prompts costs nothing.
  const hash = createHash('sha1').update(original).digest('hex').slice(0, 8);
  const masterPath = path.join(outDir, `10-master.${hash}.${quality}.jpg`);

  let master: Buffer;
  if (!args.fresh && existsSync(masterPath)) {
    master = await readFile(masterPath);
    console.log('\n[S1] master — cached');
  } else {
    console.log('\n[S1] dusk master');
    const outcome = await generateMaster(original, { quality });
    master = outcome.buffer;
    await writeFile(masterPath, master);
    await writeFile(path.join(outDir, '11-preservation-overlay.png'), outcome.report.overlay);
    await writeFile(
      path.join(outDir, '12-preservation.json'),
      JSON.stringify({ score: outcome.report.score, passed: outcome.report.passed, threshold: outcome.report.threshold, attempts: outcome.attempts, history: outcome.history, detail: outcome.report.detail }, null, 2),
    );
    if (!outcome.report.passed) {
      console.log('  ! master did not clear the preservation threshold — inspect 11-preservation-overlay.png');
    }
  }

  const masterMeta = await sharp(master).metadata();
  const width = masterMeta.width!;
  const height = masterMeta.height!;

  // --- S3: roofline --------------------------------------------------------
  let segments: RooflineSegment[] | undefined;
  if (args.roofline && existsSync(args.roofline)) {
    segments = JSON.parse(await readFile(args.roofline, 'utf8'));
    const n = segments!.filter((s) => s.included).length;
    console.log(`\n[S3] roofline — ${n} included segment(s) from ${args.roofline}`);
  } else {
    console.log('\n[S3] roofline — none supplied, model will place lights unguided');
  }

  // --- S4/S5/S6: one lighting pass per design ------------------------------
  for (const [i, designId] of args.designs.entries()) {
    const design = getDesign(designId);
    console.log(`\n[S5] ${design.label}`);
    const { edit, guide } = await applyLighting({
      master, design, width, height, segments,
      frontageFeet: args.frontageFeet, quality,
    });
    const n = String(20 + i * 10).padStart(2, '0');
    if (guide) await writeFile(path.join(outDir, `${n}-${designId}-guide.png`), guide);
    await writeFile(path.join(outDir, `${n}-${designId}.jpg`), edit.buffer);
    if (edit.description) console.log(`  model: ${edit.description.slice(0, 160)}`);
  }

  const spent = (await totalSpend()) - startSpend;
  console.log(`\ndone — ${outDir}`);
  console.log(`this run: $${spent.toFixed(3)} | session total: $${(await totalSpend()).toFixed(2)}\n`);
}

main().catch((err) => {
  console.error(`\n${err.message}\n`);
  process.exit(1);
});
