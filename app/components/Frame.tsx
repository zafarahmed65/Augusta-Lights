import { asset, dimensions, srcSet } from '@/lib/gallery';

/**
 * An image that reserves its exact space before it loads.
 *
 * Explicit width/height plus an aspect-ratio box means the page never reflows
 * as assets arrive — the single biggest thing that makes an image-heavy page
 * feel cheap. Plain <img> rather than next/image on purpose: the optimizer is a
 * server function and this build stays fully static.
 */
export function Frame({
  file,
  alt,
  sizes = '(min-width: 1160px) 1080px, calc(100vw - 40px)',
  priority = false,
  className = '',
}: {
  file: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const { w, h } = dimensions(file);
  return (
    /* next/image is deliberately not used: its optimizer is a server function and
       this build must stay fully static. Responsive sizes come from the build. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(file)}
      srcSet={srcSet(file)}
      sizes={sizes}
      width={w}
      height={h}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      className={`block w-full bg-[var(--surface-2)] ${className}`}
      style={{ aspectRatio: `${w} / ${h}` }}
    />
  );
}
