/** Shared domain types for the Augusta Lights visualization pipeline. */

export type ProductKind = 'c9' | 'omni' | 'mini';

/** A run of identically-coloured bulbs, e.g. ['#ff2a1f', 2] = two red in a row. */
export type ColorGroup = [hex: string, count: number];

export interface Design {
  id: string;
  label: string;
  product: ProductKind;
  /** Real-world centre-to-centre bulb spacing. C9 ~15", Omni ~8". */
  spacingInches: number;
  /** Repeating pattern. Candy cane is [[red,2],[white,2]] — not alternating singles. */
  groups: ColorGroup[];
  /** Extra prose appended to the lighting prompt for this design. */
  note?: string;
}

/** Normalized image coordinates, 0..1 from top-left. Resolution-independent. */
export interface Point {
  x: number;
  y: number;
}

/**
 * One continuous run of roofline. `included: false` keeps the segment on screen
 * in the editor but omits it from the bulb render — the common correction is
 * dropping a side-facing plane the model picked up.
 */
export interface RooflineSegment {
  id: string;
  points: Point[];
  included: boolean;
}

export type Resolution = '0.5K' | '1K' | '2K' | '4K';

export interface EditRequest {
  prompt: string;
  /** File paths, https URLs, or raw buffers. Non-URLs are uploaded to fal storage. */
  images: (string | Buffer)[];
  resolution?: Resolution;
  systemPrompt?: string;
  seed?: number;
  /** Forces the expensive high-fidelity model regardless of env. */
  quality?: 'draft' | 'final';
}

export interface EditResult {
  buffer: Buffer;
  width: number;
  height: number;
  model: string;
  costUsd: number;
  /** Model's own description of what it did. Useful for debugging refusals. */
  description?: string;
}

export interface PreservationReport {
  /** 0-100. Edge-structure agreement between original and edit. */
  score: number;
  passed: boolean;
  threshold: number;
  /** PNG overlay: green = structure kept, red = structure changed or invented. */
  overlay: Buffer;
  detail: {
    edgeIoU: number;
    originalEdgePixels: number;
    editedEdgePixels: number;
    matchedPixels: number;
    inventedPixels: number;
    lostPixels: number;
    /** Agreement in the worst structural tile — catches localized redesigns. */
    localScore: number;
    localThreshold: number;
    worstRegion: { x: number; y: number; w: number; h: number } | null;
    workWidth: number;
    workHeight: number;
    /** Sizes of every invented edge component, before size filtering. Diagnostic. */
    inventedComponents?: number[];
  };
}
