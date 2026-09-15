import type { Design } from '@/lib/types';

/**
 * Previews the design's actual repeating group, so Candy Cane reads as
 * 2 red / 2 white in the picker exactly as it will on the roof.
 */
export function PatternSwatch({ design, dots = 8 }: { design: Design; dots?: number }) {
  const cycle = design.groups.flatMap(([hex, n]) => Array.from({ length: n }, () => hex));
  const sequence = Array.from({ length: dots }, (_, i) => cycle[i % cycle.length]);
  return (
    <span className="flex gap-[3px]">
      {sequence.map((hex, i) => (
        <span key={i} className="h-2 w-2 rounded-full" style={{ background: hex }} />
      ))}
    </span>
  );
}
