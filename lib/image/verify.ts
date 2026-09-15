import sharp from 'sharp';
import type { PreservationReport } from '../types';

/**
 * Architectural Preservation Score.
 *
 * The client's stated failure mode is AI tools redesigning the customer's house.
 * Rather than promising that doesn't happen, we measure it: extract edge
 * structure from the original and the edit, and report how much of it survived.
 *
 * Deliberately classical — no model, no API cost, and the number is reproducible,
 * which is the whole point of showing it to a client who has been burned before.
 */

const WORK_WIDTH = 1024;
/** Gradient magnitudes above this percentile count as structural edges. */
const EDGE_PERCENTILE = 0.88;
/**
 * Absolute Sobel-magnitude floor (scale: a hard 0->255 step is ~1020).
 *
 * The percentile alone is not enough. In a photo with large smooth areas — sky,
 * a plain wall — the top 12% of gradients are just sensor and JPEG noise, which
 * then registers as invented structure. The floor keeps only real edges.
 */
const EDGE_FLOOR = 120;
/** Edges may drift this many px (JPEG recompression, resampling) and still match. */
const TOLERANCE_PX = 3;
const DEFAULT_THRESHOLD = 88;
/** Side of the analysis tile, in working pixels. */
const TILE = 64;
/** A tile needs this many original edge pixels before it is judged at all. */
const MIN_TILE_EDGES = 60;
/**
 * ...or this many invented pixels, which catches structure conjured where there
 * was none. Set well above MIN_TILE_EDGES so residual noise cannot trip it.
 */
const MIN_TILE_INVENTED = 220;
/**
 * Connected invented/lost edge runs smaller than this are discarded as texture.
 *
 * Lighting a window creates a scatter of short new edges inside an opening whose
 * outline is unchanged — that is the feature working, not a redesign. The edits
 * the client actually rejects (an added window, an invented roof section) appear
 * as long connected contours. Filtering by component size separates the two.
 */
const MIN_STRUCTURAL_COMPONENT = 140;
/**
 * Worst structural tile must clear this. A global average cannot catch one added
 * window in a whole facade — locally it is catastrophic, globally it is noise —
 * so the local floor is what actually enforces the client's requirement.
 */
const DEFAULT_LOCAL_THRESHOLD = 45;

interface Gray {
  data: Uint8Array;
  width: number;
  height: number;
}

async function toGray(input: Buffer, width: number, height: number): Promise<Gray> {
  // normalise() is load-bearing: the dusk pass deliberately changes global
  // brightness and contrast, which would otherwise shift the percentile cut and
  // report tone changes as structural ones. Stretching both images to the same
  // range first makes the comparison measure geometry, not exposure.
  const { data } = await sharp(input)
    .resize(width, height, { fit: 'fill' })
    .grayscale()
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width, height };
}

/** Sobel gradient magnitude, normalized to 0-255. */
function sobel({ data, width, height }: Gray): Float32Array {
  const mag = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const tl = data[i - width - 1], t = data[i - width], tr = data[i - width + 1];
      const l = data[i - 1], r = data[i + 1];
      const bl = data[i + width - 1], b = data[i + width], br = data[i + width + 1];
      const gx = tl + 2 * l + bl - tr - 2 * r - br;
      const gy = tl + 2 * t + tr - bl - 2 * b - br;
      mag[i] = Math.hypot(gx, gy);
    }
  }
  return mag;
}

/** Percentile cut over the masked region, so the threshold adapts per photo. */
function edgeCut(mag: Float32Array, mask: Uint8Array | null, percentile: number): number {
  const considered: number[] = [];
  for (let i = 0; i < mag.length; i++) if (!mask || mask[i]) considered.push(mag[i]);
  considered.sort((a, b) => a - b);
  return considered[Math.floor(considered.length * percentile)] ?? 0;
}

function binarize(mag: Float32Array, mask: Uint8Array | null, cut: number): Uint8Array {
  const out = new Uint8Array(mag.length);
  for (let i = 0; i < mag.length; i++) out[i] = (!mask || mask[i]) && mag[i] > cut ? 1 : 0;
  return out;
}

interface TileVerdict {
  score: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Per-tile agreement over tiles that actually contain structure. Returns the
 * worst one — the region a reviewer should look at first.
 */
function worstTile(
  matched: Uint8Array,
  invented: Uint8Array,
  lost: Uint8Array,
  edgesA: Uint8Array,
  width: number,
  height: number,
): TileVerdict | null {
  let worst: TileVerdict | null = null;
  for (let ty = 0; ty < height; ty += TILE) {
    for (let tx = 0; tx < width; tx += TILE) {
      const w = Math.min(TILE, width - tx);
      const h = Math.min(TILE, height - ty);
      let m = 0, inv = 0, lo = 0, ref = 0;
      for (let y = ty; y < ty + h; y++) {
        for (let x = tx; x < tx + w; x++) {
          const i = y * width + x;
          m += matched[i];
          inv += invented[i];
          lo += lost[i];
          ref += edgesA[i];
        }
      }
      // Judge a tile only where the original had real structure, or where the
      // edit invented a lot of new structure out of nothing (e.g. into the sky).
      if (ref < MIN_TILE_EDGES && inv < MIN_TILE_INVENTED) continue;
      const denom = m + inv + lo;
      const score = denom === 0 ? 100 : Math.round((m / denom) * 1000) / 10;
      if (!worst || score < worst.score) worst = { score, x: tx, y: ty, w, h };
    }
  }
  return worst;
}

/** Separable max filter — lets an edge match anything within `radius` px. */
function dilate(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const tmp = new Uint8Array(src.length);
  const out = new Uint8Array(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let d = -radius; d <= radius && !v; d++) {
        const nx = x + d;
        if (nx >= 0 && nx < width && src[y * width + nx]) v = 1;
      }
      tmp[y * width + x] = v;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let d = -radius; d <= radius && !v; d++) {
        const ny = y + d;
        if (ny >= 0 && ny < height && tmp[ny * width + x]) v = 1;
      }
      out[y * width + x] = v;
    }
  }
  return out;
}

/**
 * Sky mask, flood-filled down from the top edge of the ORIGINAL photo.
 *
 * The sky is supposed to change completely — that's the dusk conversion working,
 * not an architectural failure. Scoring it would drown out the signal we care
 * about, so it's excluded from the comparison entirely.
 */
async function skyMask(original: Buffer, width: number, height: number): Promise<Uint8Array> {
  const { data } = await sharp(original)
    .resize(width, height, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const isSkyLike = (i: number) => {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const bright = max > 140;
    const blueish = b >= r && b >= g - 5;
    const washedOut = max - min < 40;
    return bright && (blueish || washedOut);
  };

  const sky = new Uint8Array(width * height);
  const queue: number[] = [];
  for (let x = 0; x < width; x++) {
    if (isSkyLike(x)) {
      sky[x] = 1;
      queue.push(x);
    }
  }
  // 4-connected flood fill downward from the top row.
  while (queue.length) {
    const i = queue.pop()!;
    const x = i % width;
    const y = (i / width) | 0;
    const neighbours = [
      x > 0 ? i - 1 : -1,
      x < width - 1 ? i + 1 : -1,
      y > 0 ? i - width : -1,
      y < height - 1 ? i + width : -1,
    ];
    for (const n of neighbours) {
      if (n >= 0 && !sky[n] && isSkyLike(n)) {
        sky[n] = 1;
        queue.push(n);
      }
    }
  }
  return sky;
}

/**
 * Zeroes 8-connected components smaller than `minSize`, keeping only changes at
 * architectural scale. Iterative flood fill — the recursive form blows the stack
 * on a full-width roofline contour.
 */
function dropSmallComponents(src: Uint8Array, width: number, height: number, minSize: number): Uint8Array {
  const out = new Uint8Array(src);
  const seen = new Uint8Array(src.length);
  const stack: number[] = [];
  for (let start = 0; start < src.length; start++) {
    if (!out[start] || seen[start]) continue;
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    const component: number[] = [];
    while (stack.length) {
      const i = stack.pop()!;
      component.push(i);
      const x = i % width;
      const y = (i / width) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (out[n] && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
    }
    if (component.length < minSize) for (const i of component) out[i] = 0;
  }
  return out;
}

function countBits(a: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) n += a[i];
  return n;
}

async function buildOverlay(
  edited: Buffer,
  width: number,
  height: number,
  matched: Uint8Array,
  invented: Uint8Array,
  lost: Uint8Array,
  worst: TileVerdict | null,
): Promise<Buffer> {
  // Read a single grey channel and expand to RGB by hand. Chaining
  // toColourspace() after grayscale() does not reliably restore three channels.
  const { data: grey } = await sharp(edited)
    .resize(width, height, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const o = i * 3;
    if (invented[i]) {
      rgb[o] = 255; rgb[o + 1] = 40; rgb[o + 2] = 40;      // red — structure that wasn't there
    } else if (lost[i]) {
      rgb[o] = 255; rgb[o + 1] = 190; rgb[o + 2] = 40;     // amber — structure that vanished
    } else if (matched[i]) {
      rgb[o] = 40; rgb[o + 1] = 230; rgb[o + 2] = 120;     // green — structure preserved
    } else {
      const dim = grey[i] * 0.45;
      rgb[o] = dim; rgb[o + 1] = dim; rgb[o + 2] = dim;
    }
  }
  const png = sharp(Buffer.from(rgb), { raw: { width, height, channels: 3 } }).png();
  if (!worst) return png.toBuffer();

  // Box the worst region so a reviewer's eye lands on the problem immediately.
  const box = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
       <rect x="${worst.x}" y="${worst.y}" width="${worst.w}" height="${worst.h}"
             fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="6 4"/>
       <text x="${worst.x}" y="${Math.max(12, worst.y - 5)}" font-family="monospace" font-size="13"
             fill="#ffffff">worst ${worst.score}</text>
     </svg>`,
  );
  return sharp(await png.toBuffer()).composite([{ input: box }]).png().toBuffer();
}

export async function verifyPreservation(
  original: Buffer,
  edited: Buffer,
  threshold = DEFAULT_THRESHOLD,
  localThreshold = DEFAULT_LOCAL_THRESHOLD,
): Promise<PreservationReport> {
  const [metaA, metaB] = await Promise.all([sharp(original).metadata(), sharp(edited).metadata()]);

  // Compare at the NARROWER of the two images, capped at WORK_WIDTH.
  //
  // Draft renders come back at 512px against a 1280px original. Upsampling the
  // render to meet the original cannot restore stucco, shingle and siding detail,
  // so that texture reads as "lost structure" and tanks the score on a render
  // whose architecture is actually intact. Measuring at the lower resolution
  // compares like with like and leaves the score measuring geometry.
  const width = Math.min(WORK_WIDTH, metaA.width!, metaB.width!);
  const height = Math.max(1, Math.round((metaA.height! / metaA.width!) * width));

  const sky = await skyMask(original, width, height);
  const ground = new Uint8Array(width * height);
  for (let i = 0; i < ground.length; i++) ground[i] = sky[i] ? 0 : 1;

  const [grayA, grayB] = await Promise.all([toGray(original, width, height), toGray(edited, width, height)]);
  const magA = sobel(grayA);
  const magB = sobel(grayB);

  // Both images are edge-extracted over the full frame at the same percentile,
  // so identical inputs score exactly 100 and the two edge sets are comparable.
  // The sky asymmetry is applied later, to `lost` only.
  const edgesA = binarize(magA, null, Math.max(EDGE_FLOOR, edgeCut(magA, null, EDGE_PERCENTILE)));
  const edgesB = binarize(magB, null, Math.max(EDGE_FLOOR, edgeCut(magB, null, EDGE_PERCENTILE)));

  const dilA = dilate(edgesA, width, height, TOLERANCE_PX);
  const dilB = dilate(edgesB, width, height, TOLERANCE_PX);

  const matched = new Uint8Array(edgesB.length);
  const invented = new Uint8Array(edgesB.length);
  const lost = new Uint8Array(edgesA.length);
  for (let i = 0; i < edgesB.length; i++) {
    // Invention is judged everywhere: a roof section conjured against the sky is
    // the client's canonical complaint.
    if (edgesB[i]) (dilA[i] ? matched : invented)[i] = 1;
    // Loss is judged on the ground only: the daytime sky is *supposed* to be
    // replaced, so clouds vanishing is the feature working, not a defect.
    if (edgesA[i] && !dilB[i] && ground[i]) lost[i] = 1;
  }

  // Only architectural-scale changes count. Without this the warm window glow —
  // an explicitly requested feature — reads as invented structure and sinks the
  // score on an otherwise perfect render.
  const inventedBig = dropSmallComponents(invented, width, height, MIN_STRUCTURAL_COMPONENT);
  const lostBig = dropSmallComponents(lost, width, height, MIN_STRUCTURAL_COMPONENT);

  const m = countBits(matched);
  const inv = countBits(inventedBig);
  const lo = countBits(lostBig);
  const edgeIoU = m + inv + lo === 0 ? 1 : m / (m + inv + lo);
  const globalScore = Math.round(edgeIoU * 1000) / 10;

  const worst = worstTile(matched, inventedBig, lostBig, edgesA, width, height);
  const localScore = worst?.score ?? 100;

  // Headline number is the global agreement, but a single ruined region fails
  // the render outright — that is the acceptance criterion the client stated.
  const passed = globalScore >= threshold && localScore >= localThreshold;

  return {
    score: globalScore,
    passed,
    threshold,
    overlay: await buildOverlay(edited, width, height, matched, inventedBig, lostBig, worst),
    detail: {
      edgeIoU,
      originalEdgePixels: countBits(edgesA),
      editedEdgePixels: countBits(edgesB),
      matchedPixels: m,
      inventedPixels: inv,
      lostPixels: lo,
      localScore,
      localThreshold,
      worstRegion: worst ? { x: worst.x, y: worst.y, w: worst.w, h: worst.h } : null,
      workWidth: width,
      workHeight: height,
    },
  };
}
