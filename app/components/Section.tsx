export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-[var(--line)] py-12 sm:py-16">
      <div className="mb-6 max-w-[62ch]">
        <p className="label">{eyebrow}</p>
        <h2 className="mt-2 text-[24px] leading-tight font-semibold tracking-tight sm:text-[30px]">{title}</h2>
        {lede && <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted)] sm:text-[15px]">{lede}</p>}
      </div>
      {children}
    </section>
  );
}
