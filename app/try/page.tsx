import type { Metadata } from 'next';
import { Shell } from '../components/Shell';
import { TryIt } from '../components/TryIt';
import { VisitPing } from '../components/VisitPing';

export const metadata: Metadata = {
  title: 'Try your own photo — Augusta Lights Visualizer',
  description: 'Upload a house photograph and watch the lighting pipeline run on it.',
};

/**
 * The live page.
 *
 * Kept separate from the case study on purpose: that page is finished work and
 * costs nothing to open, this one spends real money on every render. Someone
 * browsing results can never trigger one by accident.
 */
export default function TryPage() {
  return (
    <>
      <VisitPing page="try your photo" />
      <Shell back={{ href: '/', label: 'Case study' }}>
        <section className="pt-10 pb-9 sm:pt-16">
          <p className="t-label t-label-accent">Live · runs on upload</p>
          <h1 className="t-display mt-3 max-w-[17ch]">Try it on a house we&apos;ve never seen</h1>
          <p className="t-lede measure mt-4">
            The case study shows what the pipeline produced on our test properties. This runs it on
            whatever you upload, so none of it is chosen after the fact — with no roofline tracing,
            which is the harder, unguided path.
          </p>
        </section>

        <TryIt needsPasscode={Boolean(process.env.TRY_PASSCODE)} />

        <section className="rule mt-14 grid gap-7 pt-9 sm:grid-cols-3">
          {[
            ['What it does', 'Converts the photo to dusk, lights the existing windows, removes vehicles, then adds the design you picked.'],
            ['How long', 'Two model passes, usually two to four minutes. Switching between designs you have already rendered is instant and free.'],
            ['What to expect', 'An unguided first render. In the product the GM traces the roofline in about ten seconds, which sharpens placement considerably.'],
          ].map(([title, body]) => (
            <div key={title}>
              <h2 className="text-[13px] font-semibold">{title}</h2>
              <p className="t-body mt-2">{body}</p>
            </div>
          ))}
        </section>

        <p className="t-small mt-10">
          Uploads are processed and returned to your browser; nothing is stored on a server. Renders
          are capped per visitor because each one costs real money to produce.
        </p>
      </Shell>
    </>
  );
}
