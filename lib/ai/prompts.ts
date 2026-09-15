import type { Design } from '../types';

/**
 * Every prompt in the project lives here, version-tagged.
 *
 * The client's hard acceptance criterion is architectural preservation: "A
 * beautiful image that materially changes the architecture is considered a
 * FAILED rendering." So each prompt is built to (a) frame the job as relighting
 * an existing photograph rather than generating a house, and (b) enumerate the
 * forbidden edits explicitly, because models comply with lists far better than
 * with a general plea to "preserve the architecture".
 */

export const PROMPT_VERSION = 'v1';

/** Named so it can be pasted verbatim into the client proposal. */
const FORBIDDEN = `You must NOT:
- add, remove, resize, reshape, or reposition any window
- add or remove any door
- add, remove, or resize any garage or garage door
- change roof geometry, roof pitch, ridge lines, gables, dormers, or eaves
- invent roof sections or rooflines that are not in the photograph
- alter brick, stone, siding, trim, or any facade material or colour
- add porches, columns, shutters, railings, or any structural element
- move, add, or remove permanent landscaping, mature trees, or flower beds
- change driveway or walkway shape, width, or material
- change the camera angle, lens, framing, crop, or perspective`;

export const MASTER_SYSTEM = `You are a photo retoucher performing a dusk relight on a real photograph of a real customer's home.

This is a retouching job, not an image generation job. The homeowner will compare your output side by side with their own house. Your single most important constraint is that the building must remain pixel-for-pixel the same structure. Change light, colour, and atmosphere only.

${FORBIDDEN}

If any instruction appears to conflict with preserving the architecture, preserve the architecture.`;

export const MASTER_PROMPT = `Relight this photograph to a premium blue-hour dusk, as if shot by an architectural photographer 20 minutes after sunset.

Make exactly these changes:
1. Sky: replace the daytime sky with a deep blue-hour gradient — rich blue overhead falling to a warm amber glow at the horizon, with faint scattered stars. Keep the existing rooflines silhouetted against it exactly as they are.
2. Windows: add a warm interior glow (approximately 2700K) to the windows that ALREADY EXIST in the photograph. Do not add a single new window. Do not illuminate a wall where no window exists. Vary the brightness slightly between windows so it reads as a lived-in home, and leave one or two dark.
3. Driveway and street: remove any parked vehicles, and reconstruct the driveway, paving, and ground beneath them faithfully to the surrounding surface.
4. Clutter: remove trash bins, recycling bins, hoses, and construction debris. Keep permanent features — mailboxes, house numbers, planters, patio furniture that belongs to the home.
5. Grade: apply a clean architectural colour grade — deep shadows that retain detail, neutral whites, gentle contrast. Slight ambient light should still fall on the facade so the materials stay readable.

Critical: do NOT add any decorative, Christmas, string, or landscape lighting anywhere in this image. No bulbs on the roofline. No lights in trees. This is the unlit base plate; lighting is added in a later pass.

The result must be recognisably, unmistakably the same house from the same viewpoint.`;

/** Used on the automatic retry when the preservation score fails. */
export const MASTER_PROMPT_STRICT = `${MASTER_PROMPT}

The previous attempt altered the building's structure and was rejected. Be far more conservative this time. Treat the building's outline, every window opening, and every roof edge as locked and untouchable. If you are uncertain whether something is a real feature of the house, leave it exactly as it appears in the input. Change only sky, light, and colour.`;

function describePattern(design: Design): string {
  if (design.groups.length === 1) {
    return `every bulb the same colour (${design.groups[0][0]})`;
  }
  const runs = design.groups.map(([hex, n]) => `${n} × ${hex}`).join(', then ');
  return `a repeating sequence of ${runs}, repeating along the whole run — do NOT alternate single bulbs`;
}

export interface LightPromptOptions {
  design: Design;
  /** True when a deterministic bulb-position guide is passed as the 2nd image. */
  hasGuide: boolean;
  decorations?: string[];
  placementNotes?: string;
}

export function buildLightPrompt({ design, hasGuide, decorations = [], placementNotes }: LightPromptOptions): string {
  const isOmni = design.product === 'omni';

  const product = isOmni
    ? `Omni permanent architectural lighting: small, discreet fixtures recessed into the eave/soffit line at approximately ${design.spacingInches}-inch spacing. These are NOT exposed Christmas bulbs. The visible effect is a strong architectural WALL WASH — each fixture throws a soft vertical cone of light DOWN the facade. Adjacent cones overlap into a continuous grazing wash that reaches down the wall toward the flower beds and ground. The fixtures themselves should be barely visible; the light on the wall is the product.`
    : `SMD C9 LED Christmas bulbs: faceted, strawberry-shaped bulbs on a black wire, clipped to the fascia at approximately ${design.spacingInches}-inch centres. Each bulb is a distinct, individually visible point of light with a small warm halo, a faint glow on the fascia board directly behind it, and no light spill further down the wall. The spacing must read as evenly measured, not random.`;

  const guide = hasGuide
    ? `\nThe SECOND image is a placement guide: a transparent overlay marking the exact position and colour of every light. Place a real light at each marked point, matching the marked colour precisely. The guide's dots are markers, not artwork — render photorealistic fixtures at those coordinates and do not copy the flat dots themselves. Place lights ONLY where the guide marks them.`
    : `\nInstall along the front-facing roofline only — the fascia and eaves that face the camera. Do not run lights along roof edges that turn away from the camera, and do not outline windows, doors, or the garage.`;

  const decor = decorations.length
    ? `\n\nAlso add these decorative elements, using 5mm mini lights:\n${decorations.map((d) => `- ${d}`).join('\n')}`
    : '';

  const notes = placementNotes?.trim() ? `\n\nInstaller placement notes: ${placementNotes.trim()}` : '';

  return `Add a professional ${design.label} lighting installation to this dusk photograph.

PRODUCT: ${product}

COLOUR PATTERN: ${describePattern(design)}.${design.note ? ` ${design.note}` : ''}
${guide}${decor}${notes}

The lighting must look physically installed and photographically real: correct exposure for a dusk photograph, light falling off naturally with distance, and subtle warm reflections where the light lands on nearby surfaces.

${FORBIDDEN}

Change nothing about the house, the sky, the landscaping, the driveway, or the colour grade. The ONLY difference between the input image and your output is the lighting installation.`;
}

export const LIGHT_SYSTEM = `You are compositing a proposed lighting installation onto a finished dusk photograph of a real home.

The photograph is already colour-graded and final. Your only job is to add the specified lights. The building, sky, landscaping, and grade must come through completely untouched, because this image will be shown side by side with other lighting options of the same house and any drift between them is a visible defect.

${FORBIDDEN}`;

export function buildRevisePrompt(instruction: string): string {
  return `Apply this revision to the image, changing nothing else:

"${instruction.trim()}"

Treat everything not named in that instruction as locked — the house, the sky, the colour grade, the camera angle, and any lighting the instruction does not mention must come through identical.

${FORBIDDEN}`;
}
