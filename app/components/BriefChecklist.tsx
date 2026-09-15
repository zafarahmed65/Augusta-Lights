import { BRIEF } from '@/lib/brief';

/** Their acceptance list, answered point by point. */
export function BriefChecklist() {
  return (
    <ol className="grid gap-2.5 sm:grid-cols-2">
      {BRIEF.map((item, i) => {
        const met = item.status === 'met';
        return (
          <li key={item.requirement}>
            <a
              href={item.href}
              className="card flex h-full gap-3 p-4 transition-colors hover:border-[var(--line-strong)]"
            >
              <span
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold"
                style={{
                  background: met ? 'rgb(74 222 128 / 0.14)' : 'rgb(255 196 107 / 0.16)',
                  color: met ? 'var(--ok)' : 'var(--accent)',
                }}
                aria-hidden="true"
              >
                {met ? '✓' : '!'}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] leading-snug font-medium">
                  {i + 1}. {item.requirement}
                </span>
                <span className="mt-1 block text-[12.5px] leading-relaxed text-[var(--muted)]">
                  {item.evidence}
                </span>
                <span className="mt-1.5 block text-[11px] font-semibold tracking-wide text-[var(--accent)]">
                  {met ? 'Demonstrated' : 'Demonstrated, with a limit'} →
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
