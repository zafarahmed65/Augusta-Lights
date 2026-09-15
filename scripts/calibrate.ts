#!/usr/bin/env tsx
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { verifyPreservation } from '../lib/image/verify';

/**
 * Calibration for the preservation score.
 *
 * The number is only useful if it separates "relit the same house" from
 * "redesigned the house". This asserts that ordering against synthetic edits
 * whose ground truth we know, so the threshold isn't guesswork.
 */
async function main() {
  const src = process.argv[2] ?? 'fixtures/houses/test-house.jpg';
  const original = await readFile(src);
  const { width = 0, height = 0 } = await sharp(original).metadata();

  const cases: { name: string; expect: 'pass' | 'fail'; buffer: Buffer }[] = [];

  cases.push({ name: 'identity (same file)', expect: 'pass', buffer: original });

  cases.push({
    name: 'tone only (dusk-like regrade)',
    expect: 'pass',
    buffer: await sharp(original)
      .modulate({ brightness: 0.45, saturation: 0.8 })
      .linear([1, 0.95, 1.25], [-6, -4, 10])
      .jpeg({ quality: 88 })
      .toBuffer(),
  });

  cases.push({
    name: 'jpeg recompression + resize round-trip',
    expect: 'pass',
    buffer: await sharp(original).resize(Math.round(width * 0.8)).jpeg({ quality: 70 }).resize(width, height).jpeg().toBuffer(),
  });

  // The failure the client actually cares about: a window that was never there.
  const fakeWindow = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
       <rect x="${width * 0.55}" y="${height * 0.52}" width="${width * 0.08}" height="${height * 0.15}" fill="#3a4a5a" stroke="#e8e8e8" stroke-width="6"/>
     </svg>`,
  );
  cases.push({
    name: 'ADDED ONE WINDOW',
    expect: 'fail',
    buffer: await sharp(original).composite([{ input: fakeWindow }]).jpeg({ quality: 92 }).toBuffer(),
  });

  // Roof geometry change — their other named failure mode.
  const fakeGable = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
       <polygon points="${width * 0.62},${height * 0.47} ${width * 0.74},${height * 0.30} ${width * 0.86},${height * 0.47}" fill="#5a4636"/>
     </svg>`,
  );
  cases.push({
    name: 'INVENTED A ROOF GABLE',
    expect: 'fail',
    buffer: await sharp(original).composite([{ input: fakeGable }]).jpeg({ quality: 92 }).toBuffer(),
  });

  console.log(`\ncalibrating against ${src}\n`);
  let failures = 0;
  for (const c of cases) {
    const r = await verifyPreservation(original, c.buffer);
    const verdict = r.passed ? 'pass' : 'fail';
    const ok = verdict === c.expect;
    if (!ok) failures++;
    console.log(
      `${ok ? 'OK  ' : 'BAD '} global ${String(r.score).padStart(5)}  local ${String(r.detail.localScore).padStart(5)}` +
        `  ${verdict.padEnd(4)} (want ${c.expect.padEnd(4)})  ${c.name}`,
    );
    await writeFile(`out/calib-${c.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`, r.overlay);
  }
  console.log(`\nthreshold ${cases.length ? (await verifyPreservation(original, original)).threshold : 0} — ${failures === 0 ? 'all cases correctly classified' : `${failures} MISCLASSIFIED`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}
main();
