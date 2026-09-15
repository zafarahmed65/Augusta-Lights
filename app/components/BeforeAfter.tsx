'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { asset, dimensions, srcSet } from '@/lib/gallery';

/**
 * Accepts either a gallery file name — resolved to its responsive sources — or a
 * ready-made src such as a data URL, so the live page can show a real render in
 * the same control the case study uses.
 */
export interface ImageSource {
  src: string;
  srcSet?: string;
  width: number;
  height: number;
}

function resolve(input: string | ImageSource): ImageSource {
  if (typeof input !== 'string') return input;
  const { w, h } = dimensions(input);
  return { src: asset(input), srcSet: srcSet(input), width: w, height: h };
}

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
  before: string | ImageSource;
  after: string | ImageSource;
  beforeLabel?: string;
  afterLabel?: string;
  priority?: boolean;
}) {
  const [pct, setPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [hinting, setHinting] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const hinted = useRef(false);
  const a = resolve(after);
  const b = resolve(before);
  const { width: w, height: h } = a;

  /**
   * Sweep the handle once when the comparison scrolls into view.
   *
   * A static divider down the middle of a photograph does not announce itself as
   * draggable — people read it as a design element and move on, missing the whole
   * point of the comparison. One short sweep on first sight shows the image
   * changing underneath it. It runs once, never during a drag, and not at all for
   * anyone who asked for reduced motion.
   */
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || hinted.current) return;
        hinted.current = true;
        observer.disconnect();

        const frames: [number, number][] = [
          [260, 66],
          [560, 36],
          [900, 50],
        ];
        setHinting(true);
        const timers = frames.map(([at, value]) => setTimeout(() => setPct(value), at));
        timers.push(setTimeout(() => setHinting(false), 1250));
      },
      { threshold: 0.45 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const moveTo = useCallback((clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    hinted.current = true;
    setHinting(false);
    setPct(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  return (
    <figure className="m-0">
      <div
        ref={box}
        className="frame relative touch-none select-none"
        style={{ aspectRatio: `${w} / ${h}` }}
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
          src={a.src}
          srcSet={a.srcSet}
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
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 ${100 - pct}% 0 0)`,
            transition: hinting ? 'clip-path 320ms cubic-bezier(.4,0,.2,1)' : undefined,
          }}
        >
          <img
            src={b.src}
            srcSet={b.srcSet}
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

        <span className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/65 px-2 py-1 text-[10px] font-semibold tracking-[0.12em] text-white backdrop-blur-sm">
          BEFORE
        </span>
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-black/65 px-2 py-1 text-[10px] font-semibold tracking-[0.12em] text-white backdrop-blur-sm">
          AFTER
        </span>

        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/95"
          style={{ left: `${pct}%`, transition: hinting ? 'left 320ms cubic-bezier(.4,0,.2,1)' : undefined }}
        />
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
          style={{
            left: `${pct}%`,
            cursor: 'ew-resize',
            transition: hinting ? 'left 320ms cubic-bezier(.4,0,.2,1)' : undefined,
          }}
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
