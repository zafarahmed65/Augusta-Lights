/**
 * The client's own prototype acceptance list, verbatim from their brief.
 *
 * They said the paid prototype is how they will decide, and then listed exactly
 * what it has to demonstrate. Answering that list point by point — including the
 * one that comes with a caveat — is more useful to them than a generic showcase.
 */

export type BriefStatus = 'met' | 'caveat';

export interface BriefItem {
  /** Their wording, not ours. */
  requirement: string;
  status: BriefStatus;
  /** What was actually produced, and where on this page to look. */
  evidence: string;
  href: string;
}

export const BRIEF: BriefItem[] = [
  {
    requirement: 'Preserve the original architecture',
    status: 'met',
    evidence: 'Scored against the original photograph on every render, with the edge overlay shown.',
    href: '#quality',
  },
  {
    requirement: 'Convert the property realistically to dusk',
    status: 'met',
    evidence: 'Blue-hour sky, warm horizon and an architectural colour grade, produced once per property.',
    href: '#proof',
  },
  {
    requirement: 'Remove a vehicle if present',
    status: 'caveat',
    evidence: 'Removed, and the driveway rebuilt — but a car covering the façade forces the model to invent what was behind it, and the check flags that.',
    href: '#cleanup',
  },
  {
    requirement: 'Illuminate existing windows without inventing new ones',
    status: 'met',
    evidence: 'Warm interior glow on the windows already in the photograph, varied so it reads as lived-in.',
    href: '#proof',
  },
  {
    requirement: 'Identify and render the front-facing roofline',
    status: 'met',
    evidence: 'Traced on the phone in about ten seconds, then every bulb position is computed from it. Front-facing only — no window, door or garage outlining.',
    href: '#christmas',
  },
  {
    requirement: 'Apply realistic warm-white C9 Christmas lighting',
    status: 'met',
    evidence: 'SMD C9 bulbs clipped to the fascia at 15-inch spacing, 50 on this roofline.',
    href: '#christmas',
  },
  {
    requirement: 'Produce at least one alternate colour pattern',
    status: 'met',
    evidence: 'Ten alternates: four more Christmas designs and six Omni, all from the same dusk photograph.',
    href: '#compare',
  },
  {
    requirement: 'Demonstrate realistic Omni permanent-light wall wash',
    status: 'met',
    evidence: 'Fixtures recessed into the eave at 8-inch spacing, washing the façade rather than reading as exposed bulbs.',
    href: '#permanent',
  },
];
