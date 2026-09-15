'use client';

import { useCallback, useRef, useState } from 'react';
import { asset, dimensions, srcSet } from '@/lib/gallery';

/**
 * Drag-to-wipe comparison — the most persuasive control in the demo, because it
 * is how a homeowner confirms "that's my house" before looking at the lights.
 *
 * Exposed as a slider role with arrow-key support so it is operable without a
 * pointer, and the handle is a real focus target.
 */
export function BeforeAfter({
  before,
  after,
  beforeLabel = 'Original photo',
  afterLabel = 'Visualization',
  priority = false,
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  priority?: boolean;
}) {
  const [pct, setPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { w, h } = dimensions(after);

  const moveTo = useCallback((clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    setPct(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  return (
    <figure className="m-0">
      <div
        ref={box}
        className="relative touch-none overflow-hidden rounded-2xl border border-[var(--line)] select-none"
        style={{ aspectRatio: `${w} / ${h}`, boxShadow: 'var(--shadow)' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          moveTo(e.clientX);
        }}
        onPointerMove={(e) => dragging && moveTo(e.clientX)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {/* eslint-disable @next/next/no-img-element */}
        <img
          src={asset(after)}
          srcSet={srcSet(after)}
          sizes="(min-width: 1160px) 1080px, calc(100vw - 40px)"
          alt={afterLabel}
          width={w}
          height={h}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className="block h-full w-full object-cover"
        />
        {/* clip-path keeps the before image at full width so it never squashes */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
          <img
            src={asset(before)}
            srcSet={srcSet(before)}
            sizes="(min-width: 1160px) 1080px, calc(100vw - 40px)"
            alt={beforeLabel}
            width={w}
            height={h}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="block h-full w-full object-cover"
          />
        </div>
        {/* eslint-enable @next/next/no-img-element */}

        <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/65 px-2 py-1 text-[10px] font-semibold tracking-[0.12em] backdrop-blur-sm">
          BEFORE
        </span>
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-black/65 px-2 py-1 text-[10px] font-semibold tracking-[0.12em] backdrop-blur-sm">
          AFTER
        </span>

        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/95" style={{ left: `${pct}%` }} />
        <button
          type="button"
          role="slider"
          aria-label="Reveal the original photograph"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setPct((p) => Math.max(0, p - 4));
            if (e.key === 'ArrowRight') setPct((p) => Math.min(100, p + 4));
          }}
          className="absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-lg"
          style={{ left: `${pct}%`, cursor: 'ew-resize' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 6 4 12l5 6M15 6l5 6-5 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <figcaption className="mt-2.5 text-center text-[11px] text-[var(--muted)]">
        Drag the handle, or focus it and use the arrow keys
      </figcaption>
    </figure>
  );
}
