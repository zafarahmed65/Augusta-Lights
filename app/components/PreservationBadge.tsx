/**
 * The client's acceptance criterion, made visible.
 *
 * Showing the number — and saying plainly what it does and does not establish —
 * is the point of difference from every tool they have been burned by.
 */
export function PreservationBadge({
  score,
  passed,
  caption,
}: {
  score: number;
  passed: boolean;
  caption?: string;
}) {
  const colour = passed ? 'var(--ok)' : 'var(--bad)';
  return (
    <div className="card flex items-center gap-4 p-4">
      <div
        className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 text-[15px] font-bold tabular-nums"
        style={{ borderColor: colour, color: colour }}
      >
        {Math.round(score)}
      </div>
      <div className="min-w-0">
        <div className="text-[14px] font-semibold" style={{ color: colour }}>
          {passed ? 'Architecture preserved' : 'Flagged for review'}
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted)]">
          {caption ??
            (passed
              ? 'Windows, roofline and materials match the original photograph.'
              : 'Structure was detected that is not in the original photograph.')}
        </p>
      </div>
    </div>
  );
}
