'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { Shell } from '@/app/components/Shell';
import { BeforeAfter } from '@/app/components/BeforeAfter';
import { PreservationBadge } from '@/app/components/PreservationBadge';
import type { Job } from '@/lib/jobs';

const STEPS = ['Converting to dusk', 'Checking architecture', 'Adding lighting', 'Ready'];

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<Job>();
  const [overlay, setOverlay] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const res = await fetch(`/api/jobs/${id}`, { cache: 'no-store' });
      if (!alive || !res.ok) return;
      setJob(await res.json());
    };
    tick();
    // Polling rather than SSE: generation runs 1-2 minutes, and a poll survives
    // the connection drops that happen on a phone in a driveway.
    const timer = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [id]);

  if (!job) {
    return (
      <Shell back="/">
        <div className="pulse text-sm text-[var(--muted)]">Loading…</div>
      </Shell>
    );
  }

  const file = (name?: string) => (name ? `/api/jobs/${id}/file/${name}` : undefined);
  const working = job.status !== 'done' && job.status !== 'error';

  async function send(path: string, body: unknown) {
    setSending(true);
    await fetch(`/api/jobs/${id}/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setJob((j) => (j ? { ...j, status: 'lighting', step: 'Working…' } : j));
    setSending(false);
  }

  return (
    <Shell back="/">
      <div className="space-y-4">
        {job.status === 'error' && (
          <div className="card border-[var(--bad)] px-4 py-3 text-[13px]">
            <div className="font-semibold text-[var(--bad)]">Render failed</div>
            <div className="mt-1 text-[var(--muted)]">{job.error}</div>
          </div>
        )}

        {working && (
          <div className="card px-4 py-4">
            <div className="pulse text-[13px] font-medium">{job.step}…</div>
            <div className="mt-3 space-y-1.5">
              {STEPS.map((s) => {
                const done = STEPS.indexOf(job.step) > STEPS.indexOf(s) || job.status === 'done';
                const now = job.step === s;
                return (
                  <div key={s} className="flex items-center gap-2 text-[12px]">
                    <span style={{ color: done ? 'var(--ok)' : now ? 'var(--accent)' : 'var(--muted)' }}>
                      {done ? '●' : now ? '◐' : '○'}
                    </span>
                    <span style={{ color: now ? 'var(--text)' : 'var(--muted)' }}>{s}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-[var(--muted)]">
              Usually about a minute. You can leave this screen open.
            </p>
          </div>
        )}

        {job.files.hero && !working && (
          <>
            {overlay && job.files.overlay ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={file(job.files.overlay)}
                alt="Preservation proof overlay"
                className="w-full rounded-xl border border-[var(--line)]"
              />
            ) : (
              <BeforeAfter before={file(job.files.original)!} after={file(job.files.hero)!} />
            )}

            {job.preservation && (
              <PreservationBadge
                score={job.preservation.score}
                passed={job.preservation.passed}
                overlayUrl={file(job.files.overlay)}
                showingOverlay={overlay}
                onToggleOverlay={() => setOverlay((v) => !v)}
              />
            )}

            <div className="flex gap-2 text-[11px] text-[var(--muted)]">
              {job.bulbCount ? <span>{job.bulbCount} bulbs placed</span> : null}
              <span className="ml-auto">${job.spendUsd.toFixed(2)} API</span>
            </div>

            <a className="btn btn-primary" href={file(job.files.hero)} download={`${job.lastName || 'residence'}-lighting.jpg`}>
              Download JPEG
            </a>

            <div className="grid grid-cols-2 gap-2">
              <Link className="btn btn-ghost" href={`/job/${id}/roofline`}>Fix roofline</Link>
              <Link className="btn btn-ghost" href={`/job/${id}/compare`}>Compare 4</Link>
            </div>

            <div className="card px-3.5 py-3">
              <div className="label">Revise</div>
              <textarea
                rows={2}
                className="field mt-1.5 resize-none text-[14px]"
                placeholder="Remove lights from the lower garage roof."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
              <button
                className="btn btn-ghost mt-2"
                disabled={!instruction.trim() || sending}
                onClick={() => {
                  send('revise', { instruction });
                  setInstruction('');
                }}
              >
                Apply revision
              </button>
            </div>

            {job.files.sheet && (
              <a className="btn btn-ghost" href={file(job.files.sheet)} download={`${job.lastName || 'residence'}-options.jpg`}>
                Download comparison sheet
              </a>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
