#!/usr/bin/env tsx
import '../lib/env';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { cleanupVehicles, generateMaster } from '../lib/ai/master';
import { verifyPreservation } from '../lib/image/verify';
import { applyLighting } from '../lib/ai/light';
import { reconcileLighting } from '../lib/image/reconcile';
import { composeHero, composeSheet } from '../lib/image/compose';
import { getDesign } from '../lib/designs';
import { totalSpend } from '../lib/ai/fal';
import type { RooflineSegment } from '../lib/types';

/**
 * Renders every asset the static gallery ships with.
 *
 * Masters are cached on disk by content hash, so re-running to add a design or
 * re-compose the sheet costs nothing. The comparison sheet is assembled locally
 * from variants that were already rendered — it needs no API calls of its own.
 */

const OUT = path.join(process.cwd(), 'public', 'gallery');
const CACHE = path.join(process.cwd(), 'out', 'gallery-cache');
const HERO_WIDTH = 2048;

interface HouseSpec {
  slug: string;
  photo: string;
  roofline?: string;
  lastName: string;
  designs: string[];
  frontageFeet?: number;
  /** Run a dedicated vehicle-removal pass before the dusk conversion. */
  hasVehicle?: boolean;
}

const HOUSES: HouseSpec[] = [
  {
    slug: 'payne',
    photo: 'fixtures/houses/house-01.jpg',
    roofline: 'fixtures/houses/house-01.roofline.json',
    lastName: 'Payne',
    frontageFeet: 52,
    designs: [
      'warm-white', 'cool-white', 'candy-cane', 'blue-white', 'red-green',
      'omni-warm', 'omni-cool', 'omni-rgb', 'omni-red-white', 'omni-blue-white', 'omni-red-green',
    ],
  },
  {
    slug: 'alvarez',
    photo: 'fixtures/houses/house-02-car.jpg',
    roofline: 'fixtures/houses/house-02-car.roofline.json',
    lastName: 'Alvarez',
    frontageFeet: 40,
    hasVehicle: true,
    designs: ['warm-white'],
  },
];

/** Designs shown in the 2x2 sheet, composed locally from already-rendered variants. */
const SHEET = ['warm-white', 'candy-cane', 'blue-white', 'red-green'];

export interface GalleryVariant {
  designId: string;
  label: string;
  product: string;
  file: string;
  bulbCount: number;
}

export interface GalleryHouse {
  slug: string;
  lastName: string;
  original: string;
  master: string;
  overlay: string;
  preservation: { score: number; localScore: number; passed: boolean; attempts: number };
  variants: GalleryVariant[];
  sheet?: string;
}

async function masterFor(spec: HouseSpec, original: Buffer) {
  await mkdir(CACHE, { recursive: true });
  const hash = createHash('sha1').update(original).digest('hex').slice(0, 10);
  const cached = path.join(CACHE, `${spec.slug}.${hash}.master.jpg`);
  const meta = path.join(CACHE, `${spec.slug}.${hash}.meta.json`);

  if (existsSync(cached)) {
    // Re-verify rather than trust the stored verdict: thresholds have been
    // recalibrated since some caches were written, and re-scoring is local and free.
    console.log('  master: cached, re-verifying');
    const buffer = await readFile(cached);
    const fresh = await verifyPreservation(original, buffer);
    const report = {
      score: fresh.score,
      localScore: fresh.detail.localScore,
      passed: fresh.passed,
      attempts: existsSync(meta) ? JSON.parse(await readFile(meta, 'utf8')).attempts ?? 1 : 1,
    };
    await writeFile(meta, JSON.stringify(report, null, 2));
    return { buffer, report };
  }

  // Vehicles come out in their own pass: bundling the removal into the relight
  // produced a perfect dusk image with the car still parked across the facade.
  let source = original;
  if (spec.hasVehicle) {
    const cleanPath = path.join(CACHE, `${spec.slug}.${hash}.cleaned.jpg`);
    if (existsSync(cleanPath)) {
      console.log('  cleanup: cached');
      source = await readFile(cleanPath);
    } else {
      console.log('  cleanup: removing vehicles');
      const cleaned = await cleanupVehicles(source);
      source = cleaned.buffer;
      await writeFile(cleanPath, source);
    }
  }

  const outcome = await generateMaster(source, { quality: 'draft', preCleaned: spec.hasVehicle });
  await writeFile(cached, outcome.buffer);

  // Always score against the TRUE original, never the cleaned intermediate.
  // Reconstructing the facade behind a removed vehicle is itself invention, and
  // verifying the dusk pass against the cleaned image would hide exactly that.
  const against = await verifyPreservation(original, outcome.buffer);
  await writeFile(path.join(CACHE, `${spec.slug}.${hash}.overlay.png`), against.overlay);
  const report = {
    score: against.score,
    localScore: against.detail.localScore,
    passed: against.passed,
    attempts: outcome.attempts,
  };
  await writeFile(meta, JSON.stringify(report, null, 2));
  return { buffer: outcome.buffer, report, overlayPath: path.join(CACHE, `${spec.slug}.${hash}.overlay.png`) };
}

async function main() {
  const args = process.argv.slice(2);
  const only = args.find((a) => !a.startsWith('--'));
  const masterOnly = args.includes('--master-only');
  const designFilter = args.find((a) => a.startsWith('--designs='))?.slice(10).split(',');
  await mkdir(OUT, { recursive: true });
  const start = await totalSpend();
  const houses: GalleryHouse[] = [];

  for (const spec of HOUSES) {
    if (only && spec.slug !== only) continue;
    console.log(`\n=== ${spec.slug} ===`);
    const original = await readFile(spec.photo);
    const hash = createHash('sha1').update(original).digest('hex').slice(0, 10);

    await sharp(original).resize(HERO_WIDTH, undefined, { withoutEnlargement: false })
      .jpeg({ quality: 88 }).toFile(path.join(OUT, `${spec.slug}-original.jpg`));

    const { buffer: master, report } = await masterFor(spec, original);
    console.log(`  preservation ${report.score} / local ${report.localScore} ${report.passed ? 'PASS' : 'FAIL'}`);
    await sharp(master).resize(HERO_WIDTH).jpeg({ quality: 88 }).toFile(path.join(OUT, `${spec.slug}-master.jpg`));

    const overlaySrc = path.join(CACHE, `${spec.slug}.${hash}.overlay.png`);
    if (existsSync(overlaySrc)) {
      // WebP rather than PNG: the overlay is 1.2MB as PNG and 149KB as WebP with
      // no visible difference, and this page is opened on phones.
      await sharp(overlaySrc).resize(1200).webp({ quality: 82 }).toFile(path.join(OUT, `${spec.slug}-overlay.webp`));
    }

    const { width = 0, height = 0 } = await sharp(master).metadata();
    let segments: RooflineSegment[] | undefined;
    if (spec.roofline && existsSync(spec.roofline)) {
      segments = JSON.parse(await readFile(spec.roofline, 'utf8'));
    }

    const variants: GalleryVariant[] = [];
    const rendered = new Map<string, Buffer>();
    const wanted = masterOnly ? [] : spec.designs.filter((d) => !designFilter || designFilter.includes(d));

    for (const designId of wanted) {
      const design = getDesign(designId);
      const file = `${spec.slug}-${designId}.jpg`;
      const target = path.join(OUT, file);
      const cacheHit = path.join(CACHE, `${spec.slug}.${hash}.${designId}.jpg`);

      let lit: Buffer;
      let bulbCount = 0;
      if (existsSync(cacheHit)) {
        console.log(`  ${design.label}: cached`);
        lit = await readFile(cacheHit);
      } else {
        console.log(`  ${design.label}`);
        const res = await applyLighting({
          master, design, width, height, segments,
          frontageFeet: spec.frontageFeet, quality: 'draft',
        });
        bulbCount = res.bulbCount;
        const rec = await reconcileLighting(master, res.edit.buffer);
        console.log(`    reconciled, ${(rec.changedFraction * 100).toFixed(1)}% from render`);
        lit = rec.buffer;
        await writeFile(cacheHit, lit);
      }

      rendered.set(designId, lit);
      const hero = await composeHero(lit, {
        lastName: spec.lastName, designLabel: design.label, targetWidth: HERO_WIDTH,
      });
      await writeFile(target, hero);
      variants.push({ designId, label: design.label, product: design.product, file, bulbCount });
    }

    // Composed from variants already on disk — no API calls.
    let sheet: string | undefined;
    const sheetTiles = SHEET.filter((d) => rendered.has(d));
    if (sheetTiles.length === 4) {
      const buf = await composeSheet(
        sheetTiles.map((d) => ({ label: getDesign(d).label, image: rendered.get(d)! })),
        spec.lastName, HERO_WIDTH,
      );
      sheet = `${spec.slug}-sheet.jpg`;
      await writeFile(path.join(OUT, sheet), buf);
      console.log(`  sheet: composed locally from ${sheetTiles.length} variants (free)`);
    }

    houses.push({
      slug: spec.slug,
      lastName: spec.lastName,
      original: `${spec.slug}-original.jpg`,
      master: `${spec.slug}-master.jpg`,
      overlay: `${spec.slug}-overlay.webp`,
      preservation: report,
      variants,
      sheet,
    });
  }

  const manifest = path.join(process.cwd(), 'lib', 'gallery-data.json');
  const existing = existsSync(manifest) ? JSON.parse(await readFile(manifest, 'utf8')) : { houses: [] };
  const merged = [...houses, ...existing.houses.filter((h: GalleryHouse) => !houses.some((n) => n.slug === h.slug))];
  await writeFile(manifest, JSON.stringify({ houses: merged, builtAt: new Date().toISOString() }, null, 2));

  const spent = (await totalSpend()) - start;
  console.log(`\nthis run: $${spent.toFixed(2)} | session total: $${(await totalSpend()).toFixed(2)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
