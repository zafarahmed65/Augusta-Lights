'use client';

import { useRef, useState } from 'react';

/** Drag-to-wipe comparison. The single most persuasive control in the app: it is
 *  how a homeowner confirms "that's my house" before looking at the lights. */
export function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [pct, setPct] = useState(55);
  const box = useRef<HTMLDivElement>(null);

  function move(clientX: number) {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    setPct(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }

  return (
    <div
      ref={box}
      className="relative touch-none overflow-hidden rounded-xl border border-[var(--line)] select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && move(e.clientX)}
    >
      {/* eslint-disable @next/next/no-img-element */}
      <img src={after} alt="With lighting" className="block w-full" />
      {/* clip-path rather than a width-clipped wrapper: the before image stays at
          full container width, so it never squashes as the handle moves, and no
          measurement of the container is needed during render. */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
        <img src={before} alt="Original photo" className="block h-full w-full object-cover" />
      </div>
      {/* eslint-enable @next/next/no-img-element */}
      <div className="absolute inset-y-0 w-0.5 bg-white/90" style={{ left: `${pct}%` }}>
        <div className="absolute top-1/2 left-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[11px] text-black shadow">
          ◂▸
        </div>
      </div>
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] tracking-wider">
        BEFORE
      </span>
      <span className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] tracking-wider">
        AFTER
      </span>
    </div>
  );
}
