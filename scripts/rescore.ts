#!/usr/bin/env tsx
import '../lib/env';
import { readFile, writeFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { verifyPreservation } from '../lib/image/verify';

/**
 * Re-runs the preservation check against renders already on disk.
 *
 * Tuning the metric must not cost API calls — this is what lets the threshold be
 * calibrated against real model output instead of synthetic proxies.
 */
async function main() {
  const dir = process.argv[2] ?? 'out/house-01';
  const files = readdirSync(dir);
  const original = await readFile(path.join(dir, files.find((f) => f.startsWith('00-'))!));
  const master = files.find((f) => f.startsWith('10-master'))!;

  for (const f of files.filter((f) => /^(10-master|20-|30-|40-)/.test(f) && f.endsWith('.jpg'))) {
    const r = await verifyPreservation(original, await readFile(path.join(dir, f)));
    console.log(
      `global ${String(r.score).padStart(5)}  local ${String(r.detail.localScore).padStart(5)}` +
        `  ${r.passed ? 'pass' : 'FAIL'}  inv ${String(r.detail.inventedPixels).padStart(6)}` +
        `  lost ${String(r.detail.lostPixels).padStart(6)}  @${r.detail.workWidth}px  ${f}`,
    );
    if (f === master) await writeFile(path.join(dir, '11-preservation-overlay.png'), r.overlay);
  }
}
main();
