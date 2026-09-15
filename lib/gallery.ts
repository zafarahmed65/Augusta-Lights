import data from './gallery-data.json';

/**
 * Static gallery manifest, produced by scripts/build-gallery.ts.
 *
 * The page makes no API calls and needs no FAL_KEY: it is finished work, not a
 * live demo, so opening it cannot spend anything.
 */

export interface GalleryVariant {
  designId: string;
  label: string;
  product: string;
  file: string;
  bulbCount: number;
}

export interface GalleryHouse {
  slug: string;
  lastName: string;
  original: string;
  master: string;
  overlay: string;
  preservation: { score: number; localScore: number; passed: boolean; attempts: number };
  variants: GalleryVariant[];
  sheet?: string;
}

type Dims = Record<string, { w: number; h: number }>;

export const HOUSES = data.houses as GalleryHouse[];
export const DIMS = (data.dims ?? {}) as Dims;
export const WIDTHS = (data.widths ?? []) as number[];

export const asset = (file: string) => `/gallery/${file}`;

export const houseBySlug = (slug: string) => HOUSES.find((h) => h.slug === slug);

/** Splits a house's variants into the two product lines the client sells. */
export function byProduct(house: GalleryHouse) {
  return {
    christmas: house.variants.filter((v) => v.product === 'c9'),
    permanent: house.variants.filter((v) => v.product === 'omni'),
  };
}

export function dimensions(file: string) {
  return DIMS[file] ?? { w: 4, h: 3 };
}

/**
 * Builds a srcset from the derivatives the build wrote next to each full-size
 * JPEG. Phones then fetch a 640px file instead of a 2048px one — the difference
 * between a gallery that opens instantly in a driveway and one that does not.
 */
export function srcSet(file: string): string | undefined {
  if (!file.endsWith('.jpg')) return undefined;
  const { w } = dimensions(file);
  const steps = WIDTHS.filter((width) => width < w);
  if (steps.length === 0) return undefined;
  const base = file.replace(/\.jpg$/, '');
  return [...steps.map((width) => `${asset(`${base}-${width}.jpg`)} ${width}w`), `${asset(file)} ${w}w`].join(', ');
}
