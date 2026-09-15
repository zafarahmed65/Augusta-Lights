import sharp from 'sharp';

/**
 * Holds the lighting pass to the master.
 *
 * Even with an explicit instruction not to, the model nudges the sky and grade
 * while adding lights. Across a 2x2 comparison sheet that drift is obvious: four
 * tiles that should differ only in bulb colour end up with four different skies.
 *
 * Prompting cannot fully prevent it, so this does not rely on prompting. A
 * lighting pass should brighten pixels where light was added and change nothing
 * else, so the per-pixel luminance INCREASE is used as a mask: the render shows
 * through where it got brighter, and the master is kept verbatim everywhere else.
 * Sky, landscaping, grade and architecture are then identical across variations
 * by construction rather than by instruction.
 */

export interface ReconcileOptions {
  /** Luminance increase (0-255) below which the master is kept unchanged. */
  low?: number;
  /** Increase at which the render fully takes over. */
  high?: number;
  /** Feather radius in px, so light falls off smoothly instead of cutting out. */
  feather?: number;
}

const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Separable box blur over a float mask — feathers the transition. */
function blur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (radius < 1) return src;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const span = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let d = -radius; d <= radius; d++) {
        sum += src[y * width + Math.min(width - 1, Math.max(0, x + d))];
      }
      tmp[y * width + x] = sum / span;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let d = -radius; d <= radius; d++) {
        sum += tmp[Math.min(height - 1, Math.max(0, y + d)) * width + x];
      }
      out[y * width + x] = sum / span;
    }
  }
  return out;
}

export interface ReconcileResult {
  buffer: Buffer;
  /** Share of pixels taken from the render. Sanity check: a roofline run is a
   *  few percent; anything near 1 means the mask failed and drift got through. */
  changedFraction: number;
}

export async function reconcileLighting(
  master: Buffer,
  lit: Buffer,
  opts: ReconcileOptions = {},
): Promise<ReconcileResult> {
  const { low = 10, high = 38, feather = 2 } = opts;

  const meta = await sharp(master).metadata();
  const width = meta.width!;
  const height = meta.height!;

  const [a, b] = await Promise.all([
    sharp(master).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer(),
    sharp(lit).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer(),
  ]);

  const mask = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 3;
    const delta = luma(b[o], b[o + 1], b[o + 2]) - luma(a[o], a[o + 1], a[o + 2]);
    mask[i] = Math.min(1, Math.max(0, (delta - low) / (high - low)));
  }

  const soft = blur(mask, width, height, feather);

  const out = Buffer.allocUnsafe(width * height * 3);
  let changed = 0;
  for (let i = 0; i < width * height; i++) {
    const m = soft[i];
    if (m > 0.02) changed++;
    const o = i * 3;
    for (let c = 0; c < 3; c++) {
      out[o + c] = Math.round(a[o + c] + (b[o + c] - a[o + c]) * m);
    }
  }

  return {
    buffer: await sharp(out, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 }).toBuffer(),
    changedFraction: changed / (width * height),
  };
}
