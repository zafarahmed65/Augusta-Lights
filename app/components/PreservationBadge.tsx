'use client';

/**
 * The client's acceptance criterion made visible. Showing the number — and the
 * edge overlay behind it — is the point of difference from every other tool
 * they have tried, so it is surfaced in the UI rather than buried in a log.
 */
export function PreservationBadge({
  score,
  passed,
  overlayUrl,
  onToggleOverlay,
  showingOverlay,
}: {
  score: number;
  passed: boolean;
  overlayUrl?: string;
  onToggleOverlay?: () => void;
  showingOverlay?: boolean;
}) {
  const colour = passed ? 'var(--ok)' : 'var(--bad)';
  return (
    <div className="card flex items-center gap-3 px-3.5 py-3">
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 text-[13px] font-bold"
        style={{ borderColor: colour, color: colour }}
      >
        {Math.round(score)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">
          {passed ? 'Architecture preserved' : 'Architecture may have changed'}
        </div>
        <div className="text-[11px] leading-snug text-[var(--muted)]">
          {passed
            ? 'Windows, roofline and materials match the original photo.'
            : 'Review the highlighted area before sending to the customer.'}
        </div>
      </div>
      {overlayUrl && (
        <button
          onClick={onToggleOverlay}
          className="shrink-0 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-[11px] text-[var(--muted)]"
        >
          {showingOverlay ? 'Hide' : 'Proof'}
        </button>
      )}
    </div>
  );
}
