'use client';

import { useState } from 'react';
import { PatternSwatch } from './PatternSwatch';
import { ALL_DESIGNS } from '@/lib/designs';
import { asset, dimensions, srcSet, type GalleryVariant } from '@/lib/gallery';
import { Rail } from './Rail';

/**
 * Same house, every lighting option.
 *
 * Crossfading one image in place — rather than tiling thumbnails — is the whole
 * argument: the house, sky and grade hold perfectly still while only the lights
 * change. Every variant is stacked and preloaded so switching is instant, with
 * no flash of loading to break the illusion.
 */
export function VariantPicker({ variants, houseName }: { variants: GalleryVariant[]; houseName: string }) {
  const [active, setActive] = useState(0);
  const current = variants[active];
  if (!current) return null;

  const design = ALL_DESIGNS.find((d) => d.id === current.designId);
  const { w, h } = dimensions(current.file);

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-2xl border border-[var(--line)]"
        style={{ aspectRatio: `${w} / ${h}`, boxShadow: 'var(--shadow)' }}
      >
        {variants.map((v, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={v.designId}
            src={asset(v.file)}
            srcSet={srcSet(v.file)}
            sizes="(min-width: 1160px) 1080px, calc(100vw - 40px)"
            alt={`${houseName} residence with ${v.label} lighting`}
            width={w}
            height={h}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            aria-hidden={i !== active}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-out"
            style={{ opacity: i === active ? 1 : 0 }}
          />
        ))}
        {/* Top-left: the residence name and design label are composited into the
            bottom-left of every render, so a badge there collides with them. */}
        <div className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/65 px-2.5 py-1.5 backdrop-blur-sm">
          <div className="text-[12px] font-semibold">{current.label}</div>
          {design && (
            <div className="text-[10px] text-white/70">
              {current.bulbCount > 0 ? `${current.bulbCount} fixtures · ` : ''}
              {design.spacingInches}&quot; spacing
            </div>
          )}
        </div>
      </div>

      {/* Rail on phones; the Rail component drops its affordances once the chips fit. */}
      <Rail ariaLabel="Lighting designs" className="sm:flex-wrap sm:overflow-visible">
        {variants.map((v, i) => {
          const d = ALL_DESIGNS.find((x) => x.id === v.designId);
          return (
            <button
              key={v.designId}
              type="button"
              aria-pressed={i === active}
              onClick={() => setActive(i)}
              className="chip"
            >
              <span className="text-[12px] font-medium whitespace-nowrap">{v.label}</span>
              {d && <PatternSwatch design={d} dots={6} />}
            </button>
          );
        })}
      </Rail>
    </div>
  );
}
