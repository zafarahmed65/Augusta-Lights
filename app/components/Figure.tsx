/** A framed visual with its caption underneath, in one consistent treatment. */
export function Figure({ caption, children }: { caption?: string; children: React.ReactNode }) {
  return (
    <figure className="m-0">
      <div className="frame">{children}</div>
      {caption && <figcaption className="t-small mt-2.5">{caption}</figcaption>}
    </figure>
  );
}
