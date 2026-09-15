/**
 * A section is a hairline rule, a label, a title and at most one line of context.
 * The visual below it carries the argument — long prose above an image just
 * delays the thing the reader came to look at.
 */
export function Section({
  id,
  label,
  title,
  lede,
  children,
}: {
  id: string;
  label: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rule scroll-mt-24 pt-12 pb-2 sm:pt-16">
      <p className="t-label t-label-accent">{label}</p>
      <h2 className="t-title mt-2.5">{title}</h2>
      {lede && <p className="t-lede measure mt-3">{lede}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}
