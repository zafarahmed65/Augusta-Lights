'use client';

import { useEffect, useState } from 'react';
import { Rail } from './Rail';

export interface NavItem {
  id: string;
  label: string;
}

/**
 * Sticky header with scroll-spy.
 *
 * The gallery is long and the client is scanning it, so the nav both orients
 * them and lets them jump straight to the part they care about. IntersectionObserver
 * rather than scroll maths: it stays accurate at any viewport height.
 */
export function SiteNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Band across the upper middle of the viewport: a section counts as current
      // once its heading passes the header, not when it first peeks into view.
      { rootMargin: '-72px 0px -55% 0px', threshold: 0 },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1120px] items-center gap-4 px-5 py-3">
        <a href="#top" className="flex shrink-0 items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight">Augusta Lights</span>
          <span className="hidden text-[10px] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase sm:inline">
            Visualizer
          </span>
        </a>
        <div className="ml-auto min-w-0">
          <Rail ariaLabel="Sections" className="py-0.5">
            {items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={active === item.id ? 'true' : undefined}
                className="rounded-lg px-2.5 py-1.5 text-[12px] whitespace-nowrap transition-colors"
                style={{
                  color: active === item.id ? 'var(--accent)' : 'var(--muted)',
                  background: active === item.id ? 'rgb(255 196 107 / 0.1)' : 'transparent',
                }}
              >
                {item.label}
              </a>
            ))}
          </Rail>
        </div>
      </div>
    </header>
  );
}
