export function Section({
  eyebrow,
  title,
  children,
  note,
}: {
  eyebrow: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-[var(--line)] pt-7">
      <div>
        <div className="label">{eyebrow}</div>
        <h2 className="mt-1 text-[19px] font-semibold tracking-tight">{title}</h2>
        {note && <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{note}</p>}
      </div>
      {children}
    </section>
  );
}
