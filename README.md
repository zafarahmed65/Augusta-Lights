# Augusta Lights — Visualization Pipeline

Turns one phone photo of a customer's home into a realistic dusk render with a proposed
Christmas or Omni permanent lighting installation, without altering the architecture.

## Why this is built the way it is

The client's stated acceptance criterion is architectural preservation: *"A beautiful image
that materially changes the architecture is considered a FAILED rendering."* Three design
decisions follow from that, and each costs nothing in API spend:

1. **The preservation score is measured, not promised.** `lib/image/verify.ts` extracts edge
   structure from the original and the render and reports how much survived, with an overlay
   that marks preserved structure green and invented structure red.
2. **Every variation derives from one dusk master.** The house, sky and colour grade are
   generated once; lighting designs are applied to that fixed image. Consistency across the
   2x2 comparison sheet is guaranteed by construction, not by luck.
3. **Drift is removed, not prompted away.** Even when told not to, the model nudges the
   sky and grade while adding lights, which is glaring across a 2x2 sheet. `lib/image/reconcile.ts`
   uses the per-pixel luminance *increase* as a mask: the render shows through where it got
   brighter, the master is kept verbatim everywhere else. Sky, landscaping and grade are then
   identical across variations by construction.
4. **Bulb placement is computed, not prompted.** `lib/image/guide.ts` walks the traced
   roofline and places every bulb at real-world spacing in the right colour, then hands the
   model an overlay. The model renders lights at given points instead of inventing a layout —
   which is what makes "2 red / 2 white" come out as 2 red / 2 white.

## Pipeline

| Stage | Module | API cost |
|---|---|---|
| S1 dusk master | `lib/ai/master.ts` | 1 call |
| S2 preservation check + auto-retry | `lib/image/verify.ts` | free, local |
| S3 roofline trace | UI | free |
| S4 bulb guide render | `lib/image/guide.ts` | free, local |
| S5 lighting pass | `lib/ai/light.ts` | 1 call per design |
| S6 reconcile against master | `lib/image/reconcile.ts` | free, local |
| S7 branding composite | `lib/image/compose.ts` | free, local |

## Setup

```bash
npm install
cp .env.example .env.local   # add your FAL_KEY
```

## The demo

The deployed page is a **static gallery** — finished work, not a live generator. There is no
upload form and no Generate button, so it renders with no `FAL_KEY` present and a visitor
cannot spend anything by opening it.

The page is fully static — the production build emits prerendered HTML and no server
functions — and ships responsive image sizes (640/1024/1536/full) generated at build time.
`next/image` is deliberately not used: its optimizer is a server function, which would break
that guarantee.

Assets live in `public/gallery/` and are described by `lib/gallery-data.json`, both produced by:

```bash
RESOLUTION=2K npm run gallery
```

Masters are cached in `out/gallery-cache/` by content hash, so re-running to add a design or
re-compose the comparison sheet costs nothing. Useful flags: `npm run gallery -- payne`
(one house), `--designs=warm-white,candy-cane` (a subset), `--master-only` (dusk pass only,
so a roofline can be traced before paying for variants).

The 2x2 comparison sheet costs **zero API calls** — it is composed locally from four variants
already on disk.

## Running the pipeline headlessly

```bash
npm run pipeline -- fixtures/houses/house-01.jpg \
  --designs warm-white,candy-cane \
  --roofline fixtures/houses/house-01.roofline.json
```

Every stage is written to `out/<photo-name>/`. Flags: `--final` (Nano Banana Pro),
`--fresh` (ignore the cached master), `--frontage <ft>` (bulb spacing scale). Set
`MOCK_AI=1` to exercise the pipeline against fixtures without spending.

## Verifying the preservation score

```bash
npm run calibrate
```

Runs synthetic edits with known ground truth and asserts the score classifies them correctly.
Current results on the synthetic fixture:

| Case | Global | Worst region | Verdict |
|---|---|---|---|
| identity | 100 | 100 | pass |
| tone-only regrade | 100 | 100 | pass |
| JPEG + resize round-trip | 100 | 100 | pass |
| one window added | 92.8 | **0** | **fail** |
| roof gable invented | 91.4 | **0** | **fail** |
| *real draft render, house-01* | *97.4* | *52.8* | *pass* |

Note the last two rows: a global average barely moves when a window is fabricated, which is
why the check fails on the *worst region* rather than the mean.

### Known limitation

Those synthetic figures are flattering. The fixtures are flat vector art with no texture and
no lit windows, so any invented edge is unambiguous. On a real photograph the check is
weaker, and it is worth stating plainly:

- **It reliably catches large fabrications** — an invented roof section, a materially changed
  roofline — and it reliably passes correct renders. That covers the failure the client
  actually reported.
- **At draft resolution (~592px) it does not reliably catch a small fabricated window.** Warm
  interior glow is itself a cluster of new edges inside a preserved opening, and at that scale
  it is not separable from a small invented one. Sweeping every threshold confirmed this:
  small tiles report correct renders as failures, large tiles score a sabotaged render
  (79.1) the same as a genuine one (79.0). Component size does not separate them either — the
  genuine master's largest invented component was *larger* than the sabotaged one's.

So the score is a review aid, not a proof. Treat a pass as "no gross structural change
detected" rather than "architecture verified". Re-testing at 2K final resolution, where there
is more edge evidence per feature, is the open question; `scripts/rescore.ts` re-runs the
check against renders already on disk so this costs nothing to investigate.

## Cost control

`lib/ai/fal.ts` is the only module that may import the fal client, so `FAL_KEY` lives in one
place and every call is logged to `out/.spend.json` with a running total. Draft quality
(0.5K, $0.06) is the default everywhere; `final` is opt-in per call.
