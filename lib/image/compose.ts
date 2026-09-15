import sharp, { type OverlayOptions } from 'sharp';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * S6 — branding.
 *
 * Text and logo are composited locally, never rendered by the image model. Models
 * mangle small type, and "THE PAYNE RESIDENCE" spelled wrong on a customer's
 * visualization is worse than no branding at all. The client also asked for
 * something architectural rather than an advertisement, so this stays to a thin
 * letterspaced caption over a soft gradient scrim.
 */

const LOGO_PATH = path.join(process.cwd(), 'public', 'brand', 'logo.png');
const FONT_STACK = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/** "Payne" -> "THE PAYNE RESIDENCE". Blank surname yields no caption. */
export function residenceName(lastName: string): string {
  const clean = lastName.trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  return `THE ${clean.toUpperCase()} RESIDENCE`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

export interface HeroOptions {
  lastName: string;
  /** Long edge of the output. The client's hero spec is ~2K. */
  targetWidth?: number;
  designLabel?: string;
}

export async function composeHero(image: Buffer, opts: HeroOptions): Promise<Buffer> {
  const targetWidth = opts.targetWidth ?? 2048;

  // Resize to a buffer first, then measure it. sharp's metadata() reports the
  // SOURCE dimensions even with a resize queued, so measuring the pipeline
  // directly sizes the caption overlay to the input and lands it in the corner
  // at the wrong scale.
  const resized = await sharp(image).resize(targetWidth, undefined, { withoutEnlargement: false }).toBuffer();
  const { width = targetWidth, height = Math.round((targetWidth * 3) / 4) } = await sharp(resized).metadata();
  const base = sharp(resized);

  const caption = residenceName(opts.lastName);
  const pad = Math.round(width * 0.035);
  const fontSize = Math.round(width * 0.019);
  const scrimHeight = Math.round(height * 0.18);

  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
       <defs>
         <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stop-color="#000" stop-opacity="0"/>
           <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
         </linearGradient>
       </defs>
       <rect x="0" y="${height - scrimHeight}" width="${width}" height="${scrimHeight}" fill="url(#scrim)"/>
       ${
         caption
           ? `<text x="${pad}" y="${height - pad}" font-family="${FONT_STACK}" font-size="${fontSize}"
                    letter-spacing="${(fontSize * 0.28).toFixed(1)}" fill="#ffffff" fill-opacity="0.94">${escapeXml(caption)}</text>`
           : ''
       }
       ${
         opts.designLabel
           ? `<text x="${pad}" y="${height - pad - fontSize * 1.9}" font-family="${FONT_STACK}"
                    font-size="${Math.round(fontSize * 0.68)}" letter-spacing="${(fontSize * 0.2).toFixed(1)}"
                    fill="#ffffff" fill-opacity="0.62">${escapeXml(opts.designLabel.toUpperCase())}</text>`
           : ''
       }
     </svg>`,
  );

  const layers: OverlayOptions[] = [{ input: overlay, top: 0, left: 0 }];

  // The client supplies the logo; the pipeline works without it rather than
  // blocking on an asset that has not arrived.
  if (existsSync(LOGO_PATH)) {
    const logoWidth = Math.round(width * 0.11);
    const logo = await sharp(LOGO_PATH).resize(logoWidth).png().toBuffer();
    const { height: lh = 0 } = await sharp(logo).metadata();
    layers.push({ input: logo, top: height - pad - lh, left: width - pad - logoWidth });
  }

  return base.composite(layers).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
}

export interface SheetTile {
  label: string;
  image: Buffer;
}

/**
 * 2x2 comparison sheet. Every tile is the same house from the same master, which
 * is what makes the grid read as four options rather than four houses.
 */
export async function composeSheet(tiles: SheetTile[], lastName: string, targetWidth = 2048): Promise<Buffer> {
  const gap = Math.round(targetWidth * 0.008);
  const headerHeight = Math.round(targetWidth * 0.055);
  const cellWidth = Math.floor((targetWidth - gap * 3) / 2);
  const cellHeight = Math.round((cellWidth * 3) / 4);
  const labelHeight = Math.round(cellWidth * 0.085);

  const cells = await Promise.all(
    tiles.slice(0, 4).map(async (t) => {
      const img = await sharp(t.image).resize(cellWidth, cellHeight, { fit: 'cover' }).toBuffer();
      const label = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${cellWidth}" height="${labelHeight}">
           <rect width="${cellWidth}" height="${labelHeight}" fill="#0d0f14"/>
           <text x="${Math.round(cellWidth * 0.035)}" y="${Math.round(labelHeight * 0.66)}"
                 font-family="${FONT_STACK}" font-size="${Math.round(labelHeight * 0.38)}"
                 letter-spacing="${(labelHeight * 0.09).toFixed(1)}" fill="#ffffff"
                 fill-opacity="0.9">${escapeXml(t.label.toUpperCase())}</text>
         </svg>`,
      );
      return sharp({ create: { width: cellWidth, height: cellHeight + labelHeight, channels: 3, background: '#0d0f14' } })
        .composite([{ input: img, top: 0, left: 0 }, { input: label, top: cellHeight, left: 0 }])
        .png()
        .toBuffer();
    }),
  );

  const cellTotal = cellHeight + labelHeight;
  const sheetHeight = headerHeight + cellTotal * 2 + gap * 3;
  const caption = residenceName(lastName);

  const header = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${headerHeight}">
       <rect width="${targetWidth}" height="${headerHeight}" fill="#0d0f14"/>
       <text x="${gap}" y="${Math.round(headerHeight * 0.62)}" font-family="${FONT_STACK}"
             font-size="${Math.round(headerHeight * 0.3)}" letter-spacing="${(headerHeight * 0.07).toFixed(1)}"
             fill="#ffffff" fill-opacity="0.92">${escapeXml(caption || 'LIGHTING OPTIONS')}</text>
       <text x="${targetWidth - gap}" y="${Math.round(headerHeight * 0.62)}" text-anchor="end"
             font-family="${FONT_STACK}" font-size="${Math.round(headerHeight * 0.22)}"
             letter-spacing="${(headerHeight * 0.05).toFixed(1)}" fill="#ffffff"
             fill-opacity="0.5">AUGUSTA LIGHTS</text>
     </svg>`,
  );

  const layers: OverlayOptions[] = [{ input: header, top: 0, left: 0 }];
  cells.forEach((input, i) => {
    layers.push({
      input,
      left: gap + (i % 2) * (cellWidth + gap),
      top: headerHeight + gap + Math.floor(i / 2) * (cellTotal + gap),
    });
  });

  return sharp({ create: { width: targetWidth, height: sheetHeight, channels: 3, background: '#0d0f14' } })
    .composite(layers)
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();
}
