'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { Shell } from '@/app/components/Shell';
import { PatternSwatch } from '@/app/components/PatternSwatch';
import { CHRISTMAS_DESIGNS, PERMANENT_DESIGNS } from '@/lib/designs';
import type { Job } from '@/lib/jobs';

export default function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job>();
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: Job) => {
        setJob(j);
        setPicked([j.designId]);
      });
  }, [id]);

  const isPermanent = job?.designId.startsWith('omni');
  const designs = isPermanent ? PERMANENT_DESIGNS : CHRISTMAS_DESIGNS;

  function toggle(designId: string) {
    setPicked((p) =>
      p.includes(designId) ? p.filter((x) => x !== designId) : p.length < 4 ? [...p, designId] : p,
    );
  }

  async function build() {
    setSaving(true);
    await fetch(`/api/jobs/${id}/compare`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ designIds: picked }),
    });
    router.push(`/job/${id}`);
  }

  return (
    <Shell back={`/job/${id}`}>
      <div className="space-y-3">
        <p className="text-[12px] leading-relaxed text-[var(--muted)]">
          Pick four options to show the homeowner. All four are rendered from the same dusk
          photo, so only the lighting changes between them.
        </p>

        <div className="space-y-2">
          {designs.map((d) => {
            const on = picked.includes(d.id);
            const rank = picked.indexOf(d.id) + 1;
            return (
              <button
                key={d.id}
                onClick={() => toggle(d.id)}
                className="flex w-full items-center justify-between rounded-lg border px-3.5 py-3"
                style={{
                  borderColor: on ? 'var(--accent)' : 'var(--line)',
                  background: on ? 'rgba(255,196,107,0.1)' : 'var(--surface-2)',
                }}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="grid h-[18px] w-[18px] place-items-center rounded-full text-[10px] font-bold"
                    style={{
                      background: on ? 'var(--accent)' : 'transparent',
                      border: on ? 'none' : '1px solid var(--line)',
                      color: 'var(--accent-ink)',
                    }}
                  >
                    {on ? rank : ''}
                  </span>
                  <span className="text-[13px] font-medium">{d.label}</span>
                </span>
                <PatternSwatch design={d} />
              </button>
            );
          })}
        </div>

        <button className="btn btn-primary" onClick={build} disabled={picked.length !== 4 || saving}>
          {saving ? 'Rendering…' : `Build comparison sheet (${picked.length}/4)`}
        </button>
      </div>
    </Shell>
  );
}
