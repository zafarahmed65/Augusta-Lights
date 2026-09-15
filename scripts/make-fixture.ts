#!/usr/bin/env tsx
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import type { RooflineSegment } from '../lib/types';

/**
 * Synthetic test house, used only to smoke-test the pipeline's plumbing before
 * real photographs arrive. Not representative of output quality.
 */
const W = 1400;
const H = 933;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7fb3e8"/><stop offset="100%" stop-color="#d8e9f7"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect y="620" width="${W}" height="313" fill="#6f8f5a"/>
  <polygon points="0,700 1400,700 1400,933 200,933" fill="#8d8d8d"/>
  <rect x="300" y="430" width="800" height="270" fill="#a8704f"/>
  <polygon points="270,440 700,250 1130,440" fill="#5a4636"/>
  <polygon points="470,440 620,350 770,440" fill="#5a4636"/>
  <rect x="820" y="470" width="230" height="230" fill="#c9c9c9"/>
  <rect x="360" y="480" width="110" height="140" fill="#3a4a5a"/>
  <rect x="520" y="480" width="110" height="140" fill="#3a4a5a"/>
  <rect x="680" y="480" width="90" height="220" fill="#4a3526"/>
  <ellipse cx="180" cy="560" rx="90" ry="120" fill="#3f6b32"/>
  <rect x="600" y="740" width="260" height="110" rx="18" fill="#22304a"/>
  <rect x="640" y="700" width="170" height="55" rx="14" fill="#2c3d5c"/>
  <circle cx="665" cy="855" r="26" fill="#161616"/><circle cx="800" cy="855" r="26" fill="#161616"/>
</svg>`;

const roofline: RooflineSegment[] = [
  { id: 'main-left', included: true, points: [{ x: 270 / W, y: 440 / H }, { x: 700 / W, y: 250 / H }] },
  { id: 'main-right', included: true, points: [{ x: 700 / W, y: 250 / H }, { x: 1130 / W, y: 440 / H }] },
  { id: 'dormer', included: true, points: [{ x: 470 / W, y: 440 / H }, { x: 620 / W, y: 350 / H }, { x: 770 / W, y: 440 / H }] },
];

async function main() {
  await sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toFile('fixtures/houses/test-house.jpg');
  await writeFile('fixtures/houses/test-house.roofline.json', JSON.stringify(roofline, null, 2));
  console.log('wrote fixtures/houses/test-house.jpg + .roofline.json');
}

main();
