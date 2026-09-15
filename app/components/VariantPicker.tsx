'use client';

import { useState } from 'react';
import { PatternSwatch } from './PatternSwatch';
import { ALL_DESIGNS } from '@/lib/designs';
import { asset, type GalleryVariant } from '@/lib/gallery';

/**
 * Same house, every lighting option.
 *
 * Switching the image in place rather than tiling thumbnails is the point: the
 * house, sky and grade hold perfectly still while only the lights change, which
 * is the property the client asked for and the hardest one to achieve.
 */
export function VariantPicker({ variants, houseName }: { variants: GalleryVariant[]; houseName: string }) {
  const [active, setActive] = useState(0);
  const current = variants[active];
  if (!current) return null;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-[var(--line)]">
        {/* All variants are preloaded and stacked so switching is instant and the
            eye can compare without a flash of loading. */}
        <div className="relative">
          {variants.map((v, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={v.designId}
              src={asset(v.file)}
              alt={`${houseName} with ${v.label} lighting`}
              className={i === active ? 'block w-full' : 'absolute inset-0 h-full w-full opacity-0'}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {variants.map((v, i) => {
          const design = ALL_DESIGNS.find((d) => d.id === v.designId);
          return (
            <button
              key={v.designId}
              onClick={() => setActive(i)}
              className="shrink-0 rounded-lg border px-3 py-2.5 text-left"
              style={{
                borderColor: i === active ? 'var(--accent)' : 'var(--line)',
                background: i === active ? 'rgba(255,196,107,0.1)' : 'var(--surface-2)',
              }}
            >
              <div className="text-[12px] font-medium whitespace-nowrap">{v.label}</div>
              {design && (
                <div className="mt-1.5">
                  <PatternSwatch design={design} dots={6} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--muted)]">
        {current.bulbCount > 0
          ? `${current.bulbCount} fixtures placed at ${ALL_DESIGNS.find((d) => d.id === current.designId)?.spacingInches}" spacing. `
          : ''}
        Every option is rendered from one dusk photograph, so only the lighting changes.
      </p>
    </div>
  );
}
