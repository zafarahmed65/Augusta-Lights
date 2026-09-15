import { BeforeAfter } from './components/BeforeAfter';
import { Frame } from './components/Frame';
import { PreservationBadge } from './components/PreservationBadge';
import { Section } from './components/Section';
import { SiteNav, type NavItem } from './components/SiteNav';
import { VariantPicker } from './components/VariantPicker';
import { BriefChecklist } from './components/BriefChecklist';
import { SpecRow } from './components/SpecRow';
import { TryIt } from './components/TryIt';
import { byProduct, houseBySlug, HOUSES } from '@/lib/gallery';

/**
 * The demo: a read-only gallery of finished work.
 *
 * No upload, no options, no Generate — the client opens a link and sees results.
 * Every image is a build artefact, so the page renders with no API key present
 * and a visitor cannot spend anything by opening it.
 */

const NAV: NavItem[] = [
  { id: 'try', label: 'Try your photo' },
  { id: 'proof', label: 'Before / after' },
  { id: 'christmas', label: 'Christmas' },
  { id: 'permanent', label: 'Permanent' },
  { id: 'cleanup', label: 'Vehicles' },
  { id: 'compare', label: 'Compare' },
  { id: 'quality', label: 'Quality control' },
  { id: 'brief', label: 'Your brief' },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="text-[20px] leading-none font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="mt-1.5 text-[11.5px] leading-snug text-[var(--muted)]">{label}</div>
    </div>
  );
}

export default function Gallery() {
  const payne = houseBySlug('payne') ?? HOUSES[0];
  const alvarez = houseBySlug('alvarez');
  if (!payne) return null;

  const { christmas, permanent } = byProduct(payne);
  const hero = payne.variants[0]?.file ?? payne.master;

  return (
    <>
      <SiteNav items={NAV} />

      <main id="top" className="mx-auto w-full max-w-[1120px] px-5 pb-20">
        <div className="pt-10 pb-8 sm:pt-14">
          <p className="label">Lighting visualizer · prototype</p>
          <h1 className="mt-3 max-w-[17ch] text-[32px] leading-[1.08] font-semibold tracking-tight sm:text-[46px]">
            One photo of the house. A rendering they can picture.
          </h1>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-[var(--muted)] sm:text-[16px]">
            While the homeowner thinks it over, the GM photographs the house from the truck,
            picks a design, and has a dusk visualization to text over before the conversation
            cools. Everything on this page came out of the pipeline from one daytime photograph —
            the customer&apos;s actual home, left intact.
          </p>
        </div>

        <section id="try" className="scroll-mt-20 pb-10">
          <p className="label">Try it on your own house</p>
          <h2 className="mt-2 text-[21px] font-semibold tracking-tight sm:text-[26px]">
            Upload a photo and watch it run
          </h2>
          <p className="mt-2 mb-4 max-w-[62ch] text-[13.5px] leading-relaxed text-[var(--muted)]">
            The gallery below shows what the pipeline produces. This runs it live on a photograph
            it has never seen, so none of it is cherry-picked. No roofline tracing — an uploaded
            photo takes the unguided path, exactly as a first render would in the field.
          </p>
          <TryIt needsPasscode={Boolean(process.env.TRY_PASSCODE)} />
        </section>

        {/* The slider sits directly under the headline rather than below a stats
            block: on a laptop the fold lands around 860px, and a visual demo that
            shows no image until you scroll has already lost the room. */}
        <section id="proof" className="scroll-mt-20">
          <BeforeAfter before={payne.original} after={hero} priority />
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat value="11" label="Lighting designs, one dusk photo" />
            <Stat value="2048px" label="Ready to text to the customer" />
            <Stat value={payne.preservation.score.toFixed(1)} label="Architecture preserved, measured" />
            <Stat value="~$0.25" label="API cost per consultation" />
          </div>

          <p className="mt-6 max-w-[68ch] text-[14px] leading-relaxed text-[var(--muted)]">
            <span className="font-semibold text-[var(--text)]">That&apos;s my house.</span> The left
            side of the slider is the photograph the salesperson took. Every window, gable, dormer,
            garage door and the stone veneer survives the conversion — that flash of recognition is
            what makes a rendering persuasive rather than merely decorative.
          </p>
        </section>



        {christmas.length > 0 && (
          <Section
            id="christmas"
            eyebrow="Christmas lighting"
            title="Every colour option, one house"
            lede="SMD C9 bulbs on the front-facing roofline at 15-inch spacing. Multicolour designs use repeating groups — two red then two white — because that is how the installation is actually run. Switch between them: only the lights change."
          >
            <VariantPicker variants={christmas} houseName={payne.lastName} />
            <SpecRow
              specs={[
                ['Bulb', 'SMD C9 LED'],
                ['Spacing', '15 inches on centre'],
                ['Coverage', 'Front-facing roofline only'],
                ['Pattern', 'Repeating groups, e.g. 2 red / 2 white'],
              ]}
            />
          </Section>
        )}

        {permanent.length > 0 && (
          <Section
            id="permanent"
            eyebrow="Omni permanent lighting"
            title="Architectural wall wash"
            lede="A different product, and it has to read as one. Fixtures sit recessed in the eave and wash light down the façade rather than appearing as exposed bulbs on the roofline."
          >
            <VariantPicker variants={permanent} houseName={payne.lastName} />
            <SpecRow
              specs={[
                ['Fixture', 'Omni architectural'],
                ['Spacing', '8 inches on centre'],
                ['Effect', 'Vertical wall wash down the façade'],
                ['Options', 'Whites, RGB and paired colours'],
              ]}
            />
          </Section>
        )}

        {alvarez && (
          <Section
            id="cleanup"
            eyebrow="Difficult photograph"
            title="Vehicle removal, and where it stops"
            lede="Shot in flat overcast light with a sedan parked across the façade — the kind of photo a salesperson actually takes. The car comes out and the driveway rebuilds, but anything it was covering has to be invented, because no photograph of it exists."
          >
            <BeforeAfter
              before={alvarez.original}
              after={alvarez.variants[0]?.file ?? alvarez.master}
              beforeLabel="Original photo with vehicle"
              afterLabel="Vehicle removed"
            />

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div>
                <Frame file={alvarez.overlay} alt="Overlay showing invented structure in red where the vehicle stood" />
              </div>
              <div className="space-y-4">
                <PreservationBadge
                  score={alvarez.preservation.score}
                  passed={alvarez.preservation.passed}
                  caption="The check refused this render rather than passing it silently."
                />
                <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">
                  Green is structure that survived; red is structure the model invented. The red
                  maps exactly onto where the car stood — a wall, windows and a garage it had to
                  guess at. The rest of the house is untouched.
                </p>
                <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">
                  <span className="font-semibold text-[var(--text)]">In practice:</span> a car on
                  open driveway removes cleanly. When one covers the façade, the fix costs the
                  salesperson thirty seconds — ask the homeowner to back it out, or step left and
                  reshoot. We would rather flag this than send someone a picture of a house that
                  is not theirs.
                </p>
              </div>
            </div>
          </Section>
        )}

        {payne.sheet && (
          <Section
            id="compare"
            eyebrow="Comparison sheet"
            title="Four options on one page"
            lede="A second downloadable JPEG to leave with the homeowner. All four tiles derive from the same dusk photograph, so the sky and lawn are byte-identical across them and only the lighting differs."
          >
            <Frame file={payne.sheet} alt="Two by two comparison of four lighting designs on the same house" />
            <a className="btn btn-ghost mt-4" href={`/gallery/${payne.sheet}`} download>
              Download the sheet
            </a>
          </Section>
        )}

        <Section
          id="quality"
          eyebrow="Quality control"
          title="Architecture is measured, not promised"
          lede="Every render is compared against the original photograph and scored on how much of the building's structure came through intact. The number is reproducible, which matters to anyone who has been burned by a tool that quietly redesigned a customer's home."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Frame file={payne.overlay} alt="Edge comparison overlay, preserved structure shown in green" />
            <div className="space-y-4">
              <PreservationBadge score={payne.preservation.score} passed={payne.preservation.passed} />
              <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">
                Stated plainly, because it matters more than a marketing number: this reliably
                catches large failures — an invented roof section, a materially changed roofline —
                and reliably passes correct renders. It is a review aid, not a proof. A pass means
                no gross structural change was detected, not that the architecture is certified
                identical.
              </p>
            </div>
          </div>

          <ol className="mt-8 grid gap-2.5 sm:grid-cols-2">
            {[
              ['Convert to dusk', 'Sky, warm window glow, colour grade — once per property.'],
              ['Measure what changed', 'Edge comparison against the original photograph.'],
              ['Trace the roofline', 'Tap along the roof edge on the phone, about ten seconds.'],
              ['Compute the bulbs', 'Every position and colour at real-world spacing.'],
              ['Render and reconcile', 'Lights are added, then held to the dusk photo so nothing drifts.'],
              ['Brand it locally', 'Residence name composited here, never drawn by the model.'],
            ].map(([title, body], i) => (
              <li key={title} className="card flex gap-3 p-3.5">
                <span className="text-[13px] font-semibold text-[var(--accent)] tabular-nums">{i + 1}</span>
                <span>
                  <span className="block text-[13.5px] font-medium">{title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[var(--muted)]">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          id="brief"
          eyebrow="Against your brief"
          title="The eight things the prototype had to show"
          lede="Taken from your own list, in your wording. Seven are demonstrated outright; one is demonstrated with a limit worth knowing about before it surprises a GM in someone's driveway. Each links to the evidence above."
        >
          <BriefChecklist />
        </Section>

        <footer className="border-t border-[var(--line)] pt-6">
          <p className="max-w-[70ch] text-[12px] leading-relaxed text-[var(--muted)]">
            Prototype for Augusta Lights. The houses shown are licensed stock photographs, not
            customer properties — running this on your own difficult set is the obvious next step.
            Every image is a 2048px JPEG produced by the pipeline in this repository; nothing on
            this page is hand-retouched.
          </p>
          <p className="mt-3 max-w-[70ch] text-[12px] leading-relaxed text-[var(--muted)]">
            This page is a static gallery of finished work. It makes no API calls and holds no
            keys, so opening or sharing it costs nothing.
          </p>
        </footer>
      </main>
    </>
  );
}
