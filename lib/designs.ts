import type { Design } from './types';

/**
 * Augusta Lights product catalogue.
 *
 * Patterns are data, not prose. The client's complaint about existing tools is
 * that they assume every multicolour install alternates bulb-by-bulb; real
 * installs use repeating groups (2 red / 2 white). `groups` encodes that, and
 * lib/image/guide.ts walks it to place actual bulbs.
 */

const WARM_WHITE = '#ffcf8f';
const COOL_WHITE = '#eaf2ff';
const RED = '#ff2a1f';
const GREEN = '#1fbf3a';
const BLUE = '#2b6bff';
const ARCH_WARM = '#ffd9a8';
const ARCH_COOL = '#dcebff';

/** SMD C9 LED, ~15" spacing, front-facing roofline only by default. */
export const CHRISTMAS_DESIGNS: Design[] = [
  {
    id: 'warm-white',
    label: 'Warm White',
    product: 'c9',
    spacingInches: 15,
    groups: [[WARM_WHITE, 1]],
    note: 'Classic warm white C9. The best seller — this is the safe, premium look.',
  },
  {
    id: 'cool-white',
    label: 'Cool White',
    product: 'c9',
    spacingInches: 15,
    groups: [[COOL_WHITE, 1]],
    note: 'Crisp cool white C9, slightly blue-leaning.',
  },
  {
    id: 'candy-cane',
    label: 'Candy Cane',
    product: 'c9',
    spacingInches: 15,
    groups: [[RED, 2], [WARM_WHITE, 2]],
    note: 'Repeating groups of two red then two white. Never alternate single bulbs.',
  },
  {
    id: 'blue-white',
    label: 'Blue / White',
    product: 'c9',
    spacingInches: 15,
    groups: [[BLUE, 2], [COOL_WHITE, 2]],
    note: 'Repeating groups of two blue then two white.',
  },
  {
    id: 'red-green',
    label: 'Red / Green',
    product: 'c9',
    spacingInches: 15,
    groups: [[RED, 2], [GREEN, 2]],
    note: 'Traditional repeating groups of two red then two green.',
  },
];

/** Omni permanent architectural lighting, ~8" spacing, wall-wash rather than point sources. */
export const PERMANENT_DESIGNS: Design[] = [
  {
    id: 'omni-warm',
    label: 'Warm Architectural White',
    product: 'omni',
    spacingInches: 8,
    groups: [[ARCH_WARM, 1]],
  },
  {
    id: 'omni-cool',
    label: 'Cool Architectural White',
    product: 'omni',
    spacingInches: 8,
    groups: [[ARCH_COOL, 1]],
  },
  {
    id: 'omni-rgb',
    label: 'RGB / Rainbow',
    product: 'omni',
    spacingInches: 8,
    groups: [['#ff2a1f', 1], ['#ff9a1f', 1], ['#ffe81f', 1], ['#1fbf3a', 1], ['#2b6bff', 1], ['#8b3bff', 1]],
    note: 'Smooth rainbow progression across the façade, one hue per fixture.',
  },
  {
    id: 'omni-red-white',
    label: 'Red / White',
    product: 'omni',
    spacingInches: 8,
    groups: [[RED, 2], [ARCH_WARM, 2]],
  },
  {
    id: 'omni-blue-white',
    label: 'Blue / White',
    product: 'omni',
    spacingInches: 8,
    groups: [[BLUE, 2], [ARCH_COOL, 2]],
  },
  {
    id: 'omni-red-green',
    label: 'Red / Green',
    product: 'omni',
    spacingInches: 8,
    groups: [[RED, 2], [GREEN, 2]],
  },
];

export const ALL_DESIGNS = [...CHRISTMAS_DESIGNS, ...PERMANENT_DESIGNS];

export function getDesign(id: string): Design {
  const found = ALL_DESIGNS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown design "${id}". Known: ${ALL_DESIGNS.map((d) => d.id).join(', ')}`);
  return found;
}

/** Expands the repeating groups into a flat colour sequence of `count` bulbs. */
export function expandPattern(design: Design, count: number): string[] {
  const cycle: string[] = [];
  for (const [hex, n] of design.groups) {
    for (let i = 0; i < n; i++) cycle.push(hex);
  }
  return Array.from({ length: count }, (_, i) => cycle[i % cycle.length]);
}
