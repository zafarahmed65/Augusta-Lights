import Link from 'next/link';
import { BeforeAfter } from './components/BeforeAfter';
import { Figure } from './components/Figure';
import { Frame } from './components/Frame';
import { Section } from './components/Section';
import { Shell, type NavItem } from './components/Shell';
import { VariantPicker } from './components/VariantPicker';
import { BriefChecklist } from './components/BriefChecklist';
import { VisitPing } from './components/VisitPing';
import { byProduct, houseBySlug, HOUSES } from '@/lib/gallery';

/**
 * The case study: finished work, every image produced in advance.
 *
 * Statically prerendered, so opening or sharing it runs nothing and costs
 * nothing. The live page is where the pipeline actually executes.
 */

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'christmas', label: 'Christmas' },
  { id: 'permanent', label: 'Permanent' },
  { id: 'cleanup', label: 'Vehicles' },
  { id: 'compare', label: 'Comparison' },
  { id: 'quality', label: 'Quality control' },
  { id: 'brief', label: 'Your brief' },
];

function Spec({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="t-label">{k}</dt>
          <dd className="mt-1.5 text-[13px] leading-snug">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function CaseStudy() {
  const payne = houseBySlug('payne') ?? HOUSES[0];
  const alvarez = houseBySlug('alvarez');
  if (!payne) return null;

  const { christmas, permanent } = byProduct(payne);
  const hero = payne.variants[0]?.file ?? payne.master;

  return (
    <Shell items={NAV} cta={{ href: '/try', label: 'Try your photo' }}>
      <VisitPing page="case study" />
      {/* ---------------- hero ---------------- */}
      <section id="overview" className="scroll-mt-24 pt-10 sm:pt-16">
        <p className="t-label t-label-accent">Case study · rendered in advance</p>
        <h1 className="t-display mt-3 max-w-[16ch]">One photo of the house. A rendering they can picture.</h1>
        <p className="t-lede measure mt-4">
          A GM photographs the home from the truck, picks a design, and has a dusk visualization to
          send before the conversation cools — with the customer&apos;s actual house left intact.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/try" className="btn btn-primary">
            Upload your photo →
          </Link>
          <span className="t-small">
            Runs live on any house. Everything below was rendered in advance.
          </span>
        </div>

        <div className="mt-8">
          <BeforeAfter before={payne.original} after={hero} priority />
        </div>

        <div className="mt-8">
          <Spec
            items={[
              ['Designs', '11 rendered'],
              ['Output', '2048px JPEG'],
              ['Architecture kept', `${payne.preservation.score.toFixed(1)} / 100`],
              ['API cost', '~$0.25 per consultation'],
            ]}
          />
        </div>

        <p className="t-body measure mt-8">
          Every window, gable, dormer, garage door and the stone veneer survives the conversion.
          That recognition is what makes a rendering persuasive rather than decorative — and it is
          the part you said other tools got wrong.
        </p>
      </section>

      {/* ---------------- christmas ---------------- */}
      {christmas.length > 0 && (
        <Section
          id="christmas"
          label="Christmas lighting"
          title="Every colour option, one house"
          lede="Switch between them — the house, sky and grade hold still. Only the lights change."
        >
          <VariantPicker variants={christmas} houseName={payne.lastName} />
          <div className="mt-7">
            <Spec
              items={[
                ['Bulb', 'SMD C9 LED'],
                ['Spacing', '15 inches on centre'],
                ['Coverage', 'Front-facing roofline only'],
                ['Pattern', 'Repeating groups, 2 red / 2 white'],
              ]}
            />
          </div>
        </Section>
      )}

      {/* ---------------- permanent ---------------- */}
      {permanent.length > 0 && (
        <Section
          id="permanent"
          label="Omni permanent"
          title="Architectural wall wash"
          lede="A different product, and it has to read as one — fixtures in the eave washing down the façade, not bulbs on the roofline."
        >
          <VariantPicker variants={permanent} houseName={payne.lastName} />
          <div className="mt-7">
            <Spec
              items={[
                ['Fixture', 'Omni architectural'],
                ['Spacing', '8 inches on centre'],
                ['Effect', 'Vertical wash down the façade'],
                ['Options', 'Whites, RGB, paired colours'],
              ]}
            />
          </div>
        </Section>
      )}

      {/* ---------------- vehicles ---------------- */}
      {alvarez && (
        <Section
          id="cleanup"
          label="Difficult photograph"
          title="Vehicle removal, and where it stops"
          lede="Flat overcast light, sedan parked across the façade. The car comes out and the driveway rebuilds — but whatever it covered has to be invented."
        >
          <BeforeAfter
            before={alvarez.original}
            after={alvarez.variants[0]?.file ?? alvarez.master}
            beforeLabel="Original photo with vehicle"
            afterLabel="Vehicle removed"
          />

          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            <Figure caption="Red is structure the model invented. Green is what it kept.">
              <Frame file={alvarez.overlay} alt="Overlay showing invented structure in red where the vehicle stood" sizes="(min-width: 1024px) 440px, calc(100vw - 40px)" />
            </Figure>
            <div>
              <div className="flex items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[12px] font-bold tabular-nums"
                  style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}
                >
                  {Math.round(alvarez.preservation.score)}
                </span>
                <span className="text-[13.5px] font-semibold" style={{ color: 'var(--bad)' }}>
                  Flagged for review
                </span>
              </div>
              <p className="t-body mt-4">
                The red maps exactly onto where the car stood — a wall, windows and a garage the
                model guessed at. The rest of the house is untouched. The check refused this render
                rather than passing it through.
              </p>
              <p className="t-body mt-3">
                <span className="font-semibold text-[var(--text)]">In practice:</span> a car on open
                driveway removes cleanly. When one covers the façade, the fix costs the salesperson
                thirty seconds — back it out, or step left and reshoot.
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* ---------------- comparison ---------------- */}
      {payne.sheet && (
        <Section
          id="compare"
          label="Comparison sheet"
          title="Four options on one page"
          lede="A second downloadable JPEG. All four derive from the same dusk photograph — the sky and lawn are byte-identical across them."
        >
          <Figure>
            <Frame file={payne.sheet} alt="Two by two comparison of four lighting designs on the same house" />
          </Figure>
          <a className="btn btn-ghost mt-5" href={`/gallery/${payne.sheet}`} download>
            Download the sheet
          </a>
        </Section>
      )}

      {/* ---------------- quality ---------------- */}
      <Section
        id="quality"
        label="Quality control"
        title="Architecture is measured, not promised"
        lede="Every render is scored against the original photograph on how much of the building's structure came through."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Figure caption="Green is preserved structure. The score is the share that survived.">
            <Frame file={payne.overlay} alt="Edge comparison overlay, preserved structure shown in green" sizes="(min-width: 1024px) 440px, calc(100vw - 40px)" />
          </Figure>
          <div>
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[12px] font-bold tabular-nums"
                style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}
              >
                {Math.round(payne.preservation.score)}
              </span>
              <span className="text-[13.5px] font-semibold" style={{ color: 'var(--ok)' }}>
                Architecture preserved
              </span>
            </div>
            <p className="t-body mt-4">
              Stated plainly, because it matters more than a marketing number: this reliably catches
              large failures — an invented roof section, a materially changed roofline — and
              reliably passes correct renders. It is a review aid, not a proof.
            </p>
          </div>
        </div>

        <ol className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {[
            ['Convert to dusk', 'Sky, window glow and grade — once per property.'],
            ['Measure what changed', 'Edge comparison against the original photograph.'],
            ['Trace the roofline', 'Tap along the roof edge, about ten seconds.'],
            ['Compute the bulbs', 'Every position and colour at real-world spacing.'],
            ['Render and reconcile', 'Lights added, then held to the dusk photo so nothing drifts.'],
            ['Brand it locally', 'Residence name composited here, never drawn by the model.'],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span className="t-label pt-[3px] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="block text-[13.5px] font-medium">{title}</span>
                <span className="t-body mt-0.5 block">{body}</span>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {/* ---------------- brief ---------------- */}
      <Section
        id="brief"
        label="Against your brief"
        title="The eight things the prototype had to show"
        lede="Your list, in your wording. Seven demonstrated outright; one with a limit worth knowing before it surprises a GM in a driveway."
      >
        <BriefChecklist />

        <div className="rule mt-12 flex flex-col gap-4 pt-8 sm:flex-row sm:items-center">
          <p className="t-body measure flex-1">
            Everything here was produced in advance. To watch the pipeline run on a photograph it
            has never seen, use the live page.
          </p>
          <Link href="/try" className="btn btn-primary shrink-0">
            Try your own photo →
          </Link>
        </div>

        <p className="t-small mt-8">
          Test photographs are licensed stock, not customer properties. Renders are 2048px JPEGs
          produced by the pipeline in this repository; nothing is hand-retouched.
        </p>
      </Section>
    </Shell>
  );
}
