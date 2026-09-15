import sharp from 'sharp';

/**
 * Verifies the 2x2 sheet shows one house under four lighting options rather than
 * four subtly different houses, by sampling regions no lighting should touch.
 *
 * Note: sharp's stats() and metadata() report on the INPUT image and ignore
 * queued operations, so each crop must be materialised to a buffer before it is
 * measured. Calling .extract().stats() silently returns whole-image statistics.
 */

const F = process.argv[2];
const W = 2048, gap = 16;
const header = Math.round(W * 0.055);
const cw = Math.floor((W - gap * 3) / 2);
const ch = Math.round((cw * 3) / 4);
const lh = Math.round(cw * 0.085);
const NAMES = ['Warm White', 'Candy Cane', 'Blue/White', 'Red/Green'];
const SPOTS: [string, number, number, number, number][] = [
  ['sky', 60, 30, 240, 90],
  ['lawn', 80, 620, 260, 70],
  ['driveway', 760, 640, 200, 60],
];

async function main() {
  for (const [label, dx, dy, w, h] of SPOTS) {
    const means: string[] = [];
    for (let i = 0; i < 4; i++) {
      const left = gap + (i % 2) * (cw + gap) + dx;
      const top = header + gap + Math.floor(i / 2) * (ch + lh + gap) + dy;
      const crop = await sharp(F).extract({ left, top, width: w, height: h }).toBuffer();
      const st = await sharp(crop).stats();
      means.push(st.channels.slice(0, 3).map((c) => Math.round(c.mean)).join(','));
    }
    const uniq = new Set(means);
    console.log(
      label.padEnd(9),
      means.map((m, i) => `${NAMES[i]}=${m}`).join('  '),
      uniq.size === 1 ? ' -> IDENTICAL' : ` -> ${uniq.size} variants`,
    );
  }
}
main();
