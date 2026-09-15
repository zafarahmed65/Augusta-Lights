import Link from 'next/link';

export function Shell({ children, back }: { children: React.ReactNode; back?: string }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[520px] px-4 pb-10">
      <header className="flex items-center gap-3 py-5">
        {back && (
          <Link href={back} className="text-[var(--muted)] text-xl leading-none" aria-label="Back">
            ‹
          </Link>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight">Augusta Lights</span>
          <span className="label">Visualizer</span>
        </div>
      </header>
      {children}
    </div>
  );
}
