'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Horizontal rail that says so.
 *
 * A row clipped flush at the container edge reads as "that's all of them", not
 * "there is more to the right". This measures actual overflow and only then shows
 * an edge fade and a tap target, on the side that has more content — so the
 * affordance is never a decoration that lies when everything already fits.
 */
export function Rail({
  children,
  ariaLabel,
  className = '',
}: {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 2px tolerance: sub-pixel layout leaves a fractional remainder at the ends.
    setMore({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    // Overflow changes with viewport width and with fonts finishing loading.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [measure]);

  const nudge = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        role="group"
        aria-label={ariaLabel}
        className={`rail ${more.right ? 'rail-fade-right' : ''} ${more.left ? 'rail-fade-left' : ''} ${className}`}
      >
        {children}
      </div>

      {(['left', 'right'] as const).map((side) =>
        more[side] ? (
          <button
            key={side}
            type="button"
            aria-label={side === 'right' ? 'Scroll right for more' : 'Scroll left'}
            onClick={() => nudge(side === 'right' ? 1 : -1)}
            className="absolute top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--text)] shadow-md"
            style={{ [side]: -2 } as React.CSSProperties}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d={side === 'right' ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'}
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null,
      )}
    </div>
  );
}
