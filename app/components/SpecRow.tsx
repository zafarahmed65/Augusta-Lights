/**
 * Compact product facts under each lighting section.
 *
 * The client specified their installation precisely — bulb type, spacing, what is
 * and is not included by default — so the demo states those back rather than
 * leaving them to be inferred from a picture.
 */
export function SpecRow({ specs }: { specs: [label: string, value: string][] }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {specs.map(([label, value]) => (
        <div key={label} className="card px-3.5 py-3">
          <dt className="text-[10.5px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            {label}
          </dt>
          <dd className="mt-1.5 text-[12.5px] leading-snug">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
