import { BeforeAfter } from './components/BeforeAfter';
import { PreservationBadge } from './components/PreservationBadge';
import { VariantPicker } from './components/VariantPicker';
import { Section } from './components/Section';
import { asset, byProduct, houseBySlug, HOUSES } from '@/lib/gallery';

/**
 * The demo. A static gallery of finished work — no upload, no options, no
 * Generate. Every image is a build artefact, so the page renders with no API key
 * present and a visitor cannot spend anything by opening it.
 */
export default function Gallery() {
  const payne = houseBySlug('payne') ?? HOUSES[0];
  const alvarez = houseBySlug('alvarez');
  if (!payne) return null;

  const { christmas, permanent } = byProduct(payne);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[560px] px-4 pb-16">
      <header className="py-6">
        <div className="flex items-baseline gap-2">
          <span className="text-[16px] font-semibold tracking-tight">Augusta Lights</span>
          <span className="label">Visualizer</span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--muted)]">
          One photograph of a customer&apos;s home becomes a dusk visualization of the lighting
          we would install — without redesigning their house. Everything below was produced by
          the pipeline from a single daytime photo.
        </p>
      </header>

      <Section
        eyebrow="Start here"
        title="That&apos;s my house"
        note="Drag the handle. The photograph on the left is what the homeowner took. Every window, gable, dormer, garage door and the stone veneer survives the conversion."
      >
        <BeforeAfter before={asset(payne.original)} after={asset(payne.variants[0]?.file ?? payne.master)} />
      </Section>

      {christmas.length > 0 && (
        <Section
          eyebrow="Christmas lighting"
          title="Every colour option, same house"
          note="SMD C9 bulbs on the front-facing roofline at 15-inch spacing. Multicolour designs use repeating groups — two red then two white — not alternating single bulbs."
        >
          <VariantPicker variants={christmas} houseName={payne.lastName} />
        </Section>
      )}

      {permanent.length > 0 && (
        <Section
          eyebrow="Omni permanent lighting"
          title="Architectural wall wash"
          note="Fixtures recessed into the eave at 8-inch spacing, washing light down the façade rather than reading as exposed bulbs. The same house again, unchanged."
        >
          <VariantPicker variants={permanent} houseName={payne.lastName} />
        </Section>
      )}

      {alvarez && (
        <Section
          eyebrow="Difficult photograph"
          title="Vehicle removed, façade rebuilt"
          note="The car overlaps the house, so removing it means reconstructing the porch and wall behind it — not just patching driveway. Shot in flat overcast light, the kind of photo a salesperson actually takes."
        >
          <BeforeAfter
            before={asset(alvarez.original)}
            after={asset(alvarez.variants[0]?.file ?? alvarez.master)}
          />
        </Section>
      )}

      {payne.sheet && (
        <Section
          eyebrow="Comparison sheet"
          title="Four options on one page"
          note="A separate downloadable JPEG for the homeowner to consider. All four tiles derive from the same dusk photograph: the sky and lawn are byte-identical across them, so only the lighting differs."
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset(payne.sheet)}
            alt="Two by two comparison of four lighting designs"
            className="w-full rounded-xl border border-[var(--line)]"
          />
          <a className="btn btn-ghost mt-3" href={asset(payne.sheet)} download>
            Download comparison sheet
          </a>
        </Section>
      )}

      <Section
        eyebrow="Quality control"
        title="Architecture is measured, not promised"
        note="Every render is compared against the original photograph. Green is structure that survived; red is structure that changed. The score is the share of the building's edges that came through intact."
      >
        <PreservationBadge score={payne.preservation.score} passed={payne.preservation.passed} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset(payne.overlay)}
          alt="Edge comparison overlay showing preserved structure in green"
          className="mt-3 w-full rounded-xl border border-[var(--line)]"
        />
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--muted)]">
          Stated plainly: this reliably catches large failures — an invented roof section, a
          materially changed roofline — and reliably passes correct renders. It is a review
          aid, not a proof. A pass means no gross structural change was detected, not that the
          architecture is certified identical.
        </p>
      </Section>

      <Section
        eyebrow="How it works"
        title="One master, many options"
        note="The photograph is converted to dusk once — sky, window glow, vehicle removal, colour grade — and that single image is reused for every lighting design. Consistency between options is guaranteed by construction rather than by asking the model nicely."
      >
        <ol className="space-y-2 text-[13px] text-[var(--muted)]">
          {[
            'Convert the photo to blue-hour dusk and clean it up',
            'Measure what changed against the original',
            'Trace the front-facing roofline on the phone, about ten seconds',
            'Compute every bulb position and colour at real-world spacing',
            'Render the lights, then hold the result to the dusk master',
            'Composite the residence name and logo locally, never by the model',
          ].map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="text-[var(--accent)] tabular-nums">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <footer className="mt-10 border-t border-[var(--line)] pt-5 text-[11px] leading-relaxed text-[var(--muted)]">
        Prototype for Augusta Lights. Test photographs are licensed stock, not customer
        properties. Renders are 2048px JPEGs produced by the pipeline in this repository.
      </footer>
    </div>
  );
}
