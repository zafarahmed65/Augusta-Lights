import data from './gallery-data.json';

/**
 * Static gallery manifest.
 *
 * Produced by scripts/build-gallery.ts and read at build time. The gallery makes
 * no API calls and needs no FAL_KEY — it is finished work, not a live demo, so a
 * visitor cannot spend anything by opening it.
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

export const HOUSES = data.houses as GalleryHouse[];
export const BUILT_AT = data.builtAt as string;

export const asset = (file: string) => `/gallery/${file}`;

export const houseBySlug = (slug: string) => HOUSES.find((h) => h.slug === slug);

/** Splits a house's variants into the two product lines the client sells. */
export function byProduct(house: GalleryHouse) {
  return {
    christmas: house.variants.filter((v) => v.product === 'c9'),
    permanent: house.variants.filter((v) => v.product === 'omni'),
  };
}
