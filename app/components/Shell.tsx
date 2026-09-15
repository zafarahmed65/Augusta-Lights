'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Rail } from './Rail';

export interface NavItem {
  id: string;
  label: string;
}

/**
 * Application shell.
 *
 * A fixed rail of sections on the left is what separates a tool from a landing
 * page: the whole scope is visible at once and any part is one click away. Below
 * the breakpoint it collapses to a sticky scrolling bar, which is the same
 * information in the space a phone actually has.
 */
/** Wordmark stacks in the sidebar and sits inline on the mobile bar. */
function Wordmark({ stacked = false }: { stacked?: boolean }) {
  return (
    <Link
      href="/"
      className={stacked ? 'block' : 'flex items-baseline gap-2'}
      aria-label="Augusta Lights — case study"
    >
      <span className="block text-[15px] font-semibold tracking-tight whitespace-nowrap">
        Augusta Lights
      </span>
      <span className={stacked ? 't-label mt-1 block' : 't-label'}>Visualizer</span>
    </Link>
  );
}

export function Shell({
  items = [],
  cta,
  back,
  wide = false,
  children,
}: {
  items?: NavItem[];
  cta?: { href: string; label: string };
  back?: { href: string; label: string };
  /** Wider measure for tool screens, where the work needs the room. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // A section counts as current once its heading clears the header, not when
      // it first peeks into view.
      { rootMargin: '-96px 0px -55% 0px', threshold: 0 },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <div className="lg:flex">
      {/* ---- desktop sidebar ---- */}
      <aside
        className="hidden lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-[var(--line)] lg:px-6 lg:py-7"
        style={{ width: 'var(--sidebar)', position: 'sticky', top: 0 }}
      >
        <Wordmark stacked />

        {items.length > 0 && (
          <nav aria-label="Sections" className="mt-9 flex flex-col gap-0.5">
            {items.map((item) => {
              const on = active === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-current={on ? 'true' : undefined}
                  className="rounded-[var(--r-sm)] px-2.5 py-[7px] text-[13px] transition-colors"
                  style={{
                    color: on ? 'var(--text)' : 'var(--muted)',
                    background: on ? 'var(--surface-2)' : 'transparent',
                  }}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        )}

        {back && (
          <Link href={back.href} className="mt-9 text-[13px] text-[var(--muted)] transition-colors hover:text-[var(--text)]">
            ‹ {back.label}
          </Link>
        )}

        <div className="mt-auto pt-8">
          {cta && (
            <Link href={cta.href} className="btn btn-primary w-full">
              {cta.label}
            </Link>
          )}
          <p className="t-small mt-4">Prototype · Augusta Lights</p>
        </div>
      </aside>

      {/* ---- mobile bar ---- */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_90%,transparent)] backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Wordmark />
          <div className="ml-auto flex min-w-0 items-center gap-2">
            {back && (
              <Link href={back.href} className="shrink-0 text-[12px] whitespace-nowrap text-[var(--muted)]">
                ‹ {back.label}
              </Link>
            )}
            {cta && (
              <Link href={cta.href} className="btn btn-primary shrink-0 px-3 py-2 text-[12px]">
                {cta.label}
              </Link>
            )}
          </div>
        </div>
        {items.length > 0 && (
          <div className="px-4 pb-2.5">
            <Rail ariaLabel="Sections">
              {items.map((item) => {
                const on = active === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    aria-current={on ? 'true' : undefined}
                    className="rounded-[var(--r-sm)] px-2.5 py-1.5 text-[12px] whitespace-nowrap"
                    style={{
                      color: on ? 'var(--text)' : 'var(--muted)',
                      background: on ? 'var(--surface-2)' : 'transparent',
                    }}
                  >
                    {item.label}
                  </a>
                );
              })}
            </Rail>
          </div>
        )}
      </header>

      <main className="min-w-0 flex-1">
        <div className={`mx-auto w-full px-5 pb-24 lg:px-12 ${wide ? 'max-w-[1240px]' : 'max-w-[920px]'}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
