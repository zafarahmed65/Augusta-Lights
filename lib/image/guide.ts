import sharp from 'sharp';
import type { Design, Point, RooflineSegment } from '../types';
import { expandPattern } from '../designs';

/**
 * Deterministic bulb placement guide.
 *
 * This is the piece that makes colour patterns exact. Instead of asking the
 * model to understand "two red then two white" — which it gets wrong constantly,
 * and which is the client's specific complaint about existing tools — we compute
 * every bulb position and colour ourselves and hand the model an overlay. Its
 * job drops from "design an installation" to "render lights at these points",
 * which is a far more reliable ask.
 *
 * Spacing is real-world: C9 at ~15", Omni at ~8".
 */

/** Typical front elevation width, used to convert real inches to pixels. */
const DEFAULT_FRONTAGE_FEET = 48;

export interface GuideOptions {
  segments: RooflineSegment[];
  design: Design;
  width: number;
  height: number;
  /** Override when the house is visibly wider or narrower than a typical frontage. */
  frontageFeet?: number;
}

function toPixels(p: Point, width: number, height: number) {
  return { x: p.x * width, y: p.y * height };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Walks a polyline placing a point every `spacing` px of arc length. */
export function sampleAlongPolyline(
  pts: { x: number; y: number }[],
  spacing: number,
): { x: number; y: number }[] {
  if (pts.length < 2 || spacing <= 0) return [];
  const out: { x: number; y: number }[] = [pts[0]];
  let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = distance(a, b);
    if (len === 0) continue;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    let travelled = spacing - carry;
    while (travelled <= len) {
      out.push({ x: a.x + ux * travelled, y: a.y + uy * travelled });
      travelled += spacing;
    }
    carry = len - (travelled - spacing);
  }
  return out;
}

/** Horizontal extent of the included roofline, in pixels — our scale reference. */
function horizontalExtent(segments: RooflineSegment[], width: number, height: number): number {
  const xs = segments
    .filter((s) => s.included)
    .flatMap((s) => s.points.map((p) => toPixels(p, width, height).x));
  if (xs.length < 2) return width * 0.8;
  return Math.max(...xs) - Math.min(...xs);
}

export interface BulbPlacement {
  x: number;
  y: number;
  hex: string;
}

/** Computes every bulb position and colour. Exported so the UI can preview it. */
export function planBulbs({ segments, design, width, height, frontageFeet }: GuideOptions): BulbPlacement[] {
  const frontage = frontageFeet ?? DEFAULT_FRONTAGE_FEET;
  if (!Number.isFinite(frontage) || frontage <= 0) {
    throw new Error(`frontageFeet must be a positive number, got ${frontageFeet}`);
  }
  const extentPx = horizontalExtent(segments, width, height);
  const pixelsPerFoot = extentPx / frontage;
  const spacingPx = Math.max(4, (design.spacingInches / 12) * pixelsPerFoot);

  // The colour cycle runs continuously across segment boundaries, the way a real
  // strand does — it does not restart at each gable.
  const perSegment = segments
    .filter((s) => s.included && s.points.length >= 2)
    .map((s) => sampleAlongPolyline(s.points.map((p) => toPixels(p, width, height)), spacingPx));

  const total = perSegment.reduce((n, s) => n + s.length, 0);
  const colours = expandPattern(design, total);

  const out: BulbPlacement[] = [];
  let i = 0;
  for (const seg of perSegment) {
    for (const pt of seg) out.push({ x: pt.x, y: pt.y, hex: colours[i++] });
  }
  return out;
}

/**
 * Renders the guide as a transparent PNG.
 *
 * Uses plain stacked circles rather than SVG blur filters — librsvg's filter
 * support is inconsistent, and a halo built from concentric low-opacity discs
 * renders identically everywhere.
 */
export async function renderGuide(opts: GuideOptions): Promise<Buffer> {
  const { width, height, design, segments } = opts;
  const bulbs = planBulbs(opts);
  const isOmni = design.product === 'omni';
  const core = isOmni ? 3 : 4;

  const wire = segments
    .filter((s) => s.included && s.points.length >= 2)
    .map((s) => {
      const d = s.points
        .map((p, i) => {
          const { x, y } = toPixels(p, width, height);
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
      return `<path d="${d}" fill="none" stroke="#101010" stroke-opacity="0.55" stroke-width="1.5"/>`;
    })
    .join('');

  /*
   * Markers are hollow rings, never filled discs.
   *
   * The first version drew an opaque coloured disc wrapped in soft halos, which
   * looks exactly like a lit bulb — so the model copied the marker straight into
   * the output instead of rendering a fixture. Saturated colours were worst: reds
   * came through as flat matte dots sitting on the roof tiles with no glow, while
   * the warm-white ones (which read as light) were rendered properly and moved
   * down onto the fascia. A ring cannot be mistaken for a light, so it is used as
   * a position-and-colour reference and nothing else.
   */
  const marks = bulbs
    .map(({ x, y, hex }) => {
      const cx = x.toFixed(1);
      const cy = y.toFixed(1);
      // Omni fixtures wash downward; a short tick shows the intended direction.
      const wash = isOmni
        ? `<line x1="${cx}" y1="${(y + core).toFixed(1)}" x2="${cx}" y2="${(y + core * 7).toFixed(1)}" stroke="${hex}" stroke-width="1" opacity="0.4"/>`
        : '';
      return (
        wash +
        `<circle cx="${cx}" cy="${cy}" r="${core * 1.5}" fill="none" stroke="${hex}" stroke-width="1.6" opacity="0.95"/>` +
        `<circle cx="${cx}" cy="${cy}" r="0.9" fill="${hex}" opacity="0.9"/>`
      );
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${wire}${marks}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Guide composited over the master — what actually gets sent to the model. */
export async function renderGuideOnMaster(master: Buffer, opts: GuideOptions): Promise<Buffer> {
  const guide = await renderGuide(opts);
  return sharp(master)
    .resize(opts.width, opts.height, { fit: 'fill' })
    .composite([{ input: guide, top: 0, left: 0 }])
    .jpeg({ quality: 95 })
    .toBuffer();
}
