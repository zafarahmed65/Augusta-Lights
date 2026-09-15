import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '../components/SiteNav';
import { TryIt } from '../components/TryIt';

export const metadata: Metadata = {
  title: 'Try your own photo — Augusta Lights Visualizer',
  description: 'Upload a house photograph and watch the lighting pipeline run on it.',
};

/**
 * The live page.
 *
 * Split out from the case study deliberately: that page is finished work and
 * costs nothing to open, this one spends real money on every render. Keeping them
 * apart means a visitor browsing the results can never trigger a render by
 * accident.
 */
export default function TryPage() {
  return (
    <>
      <SiteNav back={{ href: '/', label: 'Case study' }} />

      <main className="mx-auto w-full max-w-[1120px] px-5 pb-20">
        <div className="pt-10 pb-7 sm:pt-14">
          <p className="label">Live · runs on upload</p>
          <h1 className="mt-3 max-w-[20ch] text-[30px] leading-[1.1] font-semibold tracking-tight sm:text-[42px]">
            Try it on a house we&apos;ve never seen
          </h1>
          <p className="mt-4 max-w-[64ch] text-[15px] leading-relaxed text-[var(--muted)]">
            The case study shows what the pipeline produced on our test properties. This runs it
            live on whatever you upload, so none of it is chosen after the fact. Pick a design,
            press render, and the same two passes execute that a GM would get in the field — with
            no roofline tracing, which is the harder, unguided path.
          </p>
        </div>

        <TryIt needsPasscode={Boolean(process.env.TRY_PASSCODE)} />

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            ['What it does', 'Converts the photo to dusk, lights the existing windows, removes vehicles, then adds the lighting design you picked.'],
            ['How long', 'Two model passes, usually two to four minutes. Switching between designs you have already rendered is instant and free.'],
            ['What to expect', 'An unguided first render. In the product the GM traces the roofline in about ten seconds, which sharpens bulb placement considerably.'],
          ].map(([title, body]) => (
            <div key={title} className="card p-4">
              <h2 className="text-[13px] font-semibold">{title}</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted)]">{body}</p>
            </div>
          ))}
        </section>

        <footer className="mt-10 border-t border-[var(--line)] pt-6">
          <p className="max-w-[70ch] text-[12px] leading-relaxed text-[var(--muted)]">
            Uploads are processed and returned to your browser; nothing is stored on a server.
            Renders are capped per visitor because each one costs real money to produce.
          </p>
          <Link href="/" className="btn btn-ghost mt-4">
            ‹ Back to the case study
          </Link>
        </footer>
      </main>
    </>
  );
}
