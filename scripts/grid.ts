#!/usr/bin/env tsx
import sharp from 'sharp';

/**
 * Overlays a percentage grid on an image so roofline coordinates can be read off
 * by eye and written into a *.roofline.json by hand.
 *
 * In the product a GM traces the roofline by tapping the photo; this is the
 * equivalent for building gallery assets headlessly.
 *
 *   npx tsx scripts/grid.ts out/gallery-cache/alvarez.<hash>.master.jpg out/grid.png
 */
async function main() {
  const [src, dest = 'out/grid.png'] = process.argv.slice(2);
  if (!src) {
    console.error('usage: tsx scripts/grid.ts <image> [out.png]');
    process.exit(1);
  }
  const { width: W = 0, height: H = 0 } = await sharp(src).metadata();
  const S = Math.max(1, Math.round(1200 / W));

  let g = '';
  for (let x = 0; x <= 100; x += 5) {
    const px = (x / 100) * W * S;
    const major = x % 10 === 0;
    g += `<line x1="${px}" y1="0" x2="${px}" y2="${H * S}" stroke="#00e5ff" stroke-width="${major ? 1.2 : 0.5}" opacity="${major ? 0.7 : 0.3}"/>`;
    if (major) g += `<text x="${px + 3}" y="15" fill="#00e5ff" font-size="14" font-family="monospace">${x}</text>`;
  }
  for (let y = 0; y <= 100; y += 5) {
    const py = (y / 100) * H * S;
    const major = y % 10 === 0;
    g += `<line x1="0" y1="${py}" x2="${W * S}" y2="${py}" stroke="#ff4fd8" stroke-width="${major ? 1.2 : 0.5}" opacity="${major ? 0.7 : 0.3}"/>`;
    if (major) g += `<text x="3" y="${py - 4}" fill="#ff4fd8" font-size="14" font-family="monospace">${y}</text>`;
  }

  await sharp(src)
    .resize(W * S, H * S)
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${H * S}">${g}</svg>`) }])
    .png()
    .toFile(dest);
  console.log(`${dest} — source ${W}x${H}, grid in percent`);
}
main();
