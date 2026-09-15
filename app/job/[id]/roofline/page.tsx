'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useRef, useState } from 'react';
import { Shell } from '@/app/components/Shell';
import type { Job } from '@/lib/jobs';
import type { Point, RooflineSegment } from '@/lib/types';

/**
 * Tap-to-trace roofline correction.
 *
 * The client asked for a way to fix a bad roofline in 10-20 seconds on a phone,
 * explicitly not a Photoshop-style editor. Tapping along the roof edge is faster
 * than correcting a wrong detection, needs no model call, and produces the exact
 * polyline the bulb renderer consumes. Segments can be toggled off rather than
 * deleted, since the usual correction is dropping a side-facing plane.
 */
export default function RooflinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job>();
  const [segments, setSegments] = useState<RooflineSegment[]>([]);
  const [current, setCurrent] = useState<Point[]>([]);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    fetch(`/api/jobs/${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: Job) => {
        setJob(j);
        setSegments(j.segments ?? []);
      });
  }, [id]);

  function tap(e: React.PointerEvent<HTMLDivElement>) {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCurrent((pts) => [
      ...pts,
      { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height },
    ]);
  }

  function finishSegment() {
    if (current.length < 2) return;
    setSegments((s) => [...s, { id: `seg-${Date.now()}`, points: current, included: true }]);
    setCurrent([]);
  }

  async function apply() {
    const all = current.length >= 2
      ? [...segments, { id: `seg-${Date.now()}`, points: current, included: true }]
      : segments;
    setSaving(true);
    await fetch(`/api/jobs/${id}/roofline`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ segments: all }),
    });
    router.push(`/job/${id}`);
  }

  const src = job?.files.master
    ? `/api/jobs/${id}/file/${job.files.master}`
    : job?.files.original
      ? `/api/jobs/${id}/file/${job.files.original}`
      : undefined;

  const toPath = (pts: Point[]) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${(p.x * 100).toFixed(2)},${(p.y * 100).toFixed(2)}`).join(' ');

  return (
    <Shell back={`/job/${id}`}>
      <div className="space-y-3">
        <p className="text-[12px] leading-relaxed text-[var(--muted)]">
          Tap along the front-facing roof edge. Tap <b className="text-[var(--text)]">End line</b> to
          finish a run and start another for a separate gable.
        </p>

        <div className="relative overflow-hidden rounded-xl border border-[var(--line)]" onPointerDown={tap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={src} alt="House" className="block w-full touch-none select-none" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            {segments.filter((s) => s.included).map((s) => (
              <path key={s.id} d={toPath(s.points)} fill="none" stroke="#ffc46b" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
            ))}
            {current.length > 0 && (
              <path d={toPath(current)} fill="none" stroke="#4ade80" strokeWidth="0.6" strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" />
            )}
          </svg>
          {/* Dots are drawn outside the SVG so they stay circular regardless of
              the image's aspect ratio, which preserveAspectRatio="none" distorts. */}
          {current.map((p, i) => (
            <span
              key={i}
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/40 bg-[var(--ok)]"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button className="btn btn-ghost" onClick={() => setCurrent((p) => p.slice(0, -1))} disabled={!current.length}>
            Undo
          </button>
          <button className="btn btn-ghost" onClick={finishSegment} disabled={current.length < 2}>
            End line
          </button>
          <button className="btn btn-ghost" onClick={() => { setSegments([]); setCurrent([]); }}>
            Clear
          </button>
        </div>

        {segments.length > 0 && (
          <div className="card divide-y divide-[var(--line)]">
            {segments.map((s, i) => (
              <button
                key={s.id}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-[13px]"
                onClick={() =>
                  setSegments((all) => all.map((x) => (x.id === s.id ? { ...x, included: !x.included } : x)))
                }
              >
                <span>Run {i + 1} · {s.points.length} points</span>
                <span style={{ color: s.included ? 'var(--accent)' : 'var(--muted)' }}>
                  {s.included ? 'Included' : 'Skipped'}
                </span>
              </button>
            ))}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={apply}
          disabled={saving || (!segments.length && current.length < 2)}
        >
          {saving ? 'Applying…' : 'Apply and re-render lights'}
        </button>
        <p className="text-center text-[11px] text-[var(--muted)]">
          Only the lighting is redone. The dusk photo stays exactly as it is.
        </p>
      </div>
    </Shell>
  );
}
