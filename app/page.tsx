'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { CHRISTMAS_DESIGNS, PERMANENT_DESIGNS } from '@/lib/designs';
import { Shell } from './components/Shell';
import { PatternSwatch } from './components/PatternSwatch';

const DECORATIONS = [
  { id: 'tree-wraps', label: 'Tree Wraps', hint: 'Wrap both oak trees in warm white' },
  { id: 'shrubs', label: 'Shrubs / Landscaping', hint: 'Mini lights on three shrubs below left window' },
  { id: 'wreaths', label: 'Wreaths', hint: '48-inch wreath centered above garage' },
  { id: 'ground-stakes', label: 'Ground Stakes', hint: 'Warm-white stakes both sides of driveway' },
];

export default function Home() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  const [product, setProduct] = useState<'christmas' | 'permanent'>('christmas');
  const [designId, setDesignId] = useState('warm-white');
  const [lastName, setLastName] = useState('');
  const [decor, setDecor] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const designs = product === 'christmas' ? CHRISTMAS_DESIGNS : PERMANENT_DESIGNS;

  function switchProduct(next: 'christmas' | 'permanent') {
    setProduct(next);
    setDesignId(next === 'christmas' ? 'warm-white' : 'omni-warm');
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Take or choose a photo of the house first.');
    setBusy(true);
    setError(undefined);

    const form = new FormData();
    form.set('photo', file);
    form.set('lastName', lastName);
    form.set('designId', designId);
    form.set('placementNotes', notes);
    for (const [id, text] of Object.entries(decor)) {
      const label = DECORATIONS.find((d) => d.id === id)!.label;
      form.append('decorations', text.trim() ? `${label}: ${text.trim()}` : label);
    }

    try {
      const res = await fetch('/api/jobs', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not start the render.');
      router.push(`/job/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="space-y-5">
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={pickFile}
            className="hidden"
            id="photo"
          />
          <label
            htmlFor="photo"
            className="card flex h-52 cursor-pointer items-center justify-center overflow-hidden"
          >
            {preview ? (
              // Object URL of a local file; next/image would need a remote loader.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Selected house" className="h-full w-full object-cover" />
            ) : (
              <div className="text-center">
                <div className="text-3xl">📷</div>
                <div className="mt-2 text-sm font-medium">Take or choose a photo</div>
                <div className="mt-1 text-[11px] text-[var(--muted)]">Front-facing view of the house</div>
              </div>
            )}
          </label>
        </div>

        <div>
          <label className="label" htmlFor="lastName">Customer last name</label>
          <input
            id="lastName"
            className="field mt-1.5"
            placeholder="Payne"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div>
          <div className="label">Product</div>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(['christmas', 'permanent'] as const).map((p) => (
              <button
                key={p}
                onClick={() => switchProduct(p)}
                className="rounded-lg border px-3 py-3 text-[13px] font-medium"
                style={{
                  borderColor: product === p ? 'var(--accent)' : 'var(--line)',
                  background: product === p ? 'rgba(255,196,107,0.1)' : 'var(--surface-2)',
                }}
              >
                {p === 'christmas' ? 'Christmas Lights' : 'Omni Permanent'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label">Color / pattern</div>
          <div className="mt-1.5 space-y-2">
            {designs.map((d) => (
              <button
                key={d.id}
                onClick={() => setDesignId(d.id)}
                className="flex w-full items-center justify-between rounded-lg border px-3.5 py-3"
                style={{
                  borderColor: designId === d.id ? 'var(--accent)' : 'var(--line)',
                  background: designId === d.id ? 'rgba(255,196,107,0.1)' : 'var(--surface-2)',
                }}
              >
                <span className="text-[13px] font-medium">{d.label}</span>
                <PatternSwatch design={d} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="label">Decorative elements</div>
          <div className="mt-1.5 space-y-2">
            {DECORATIONS.map((d) => {
              const on = d.id in decor;
              return (
                <div key={d.id} className="card overflow-hidden">
                  <button
                    onClick={() =>
                      setDecor((prev) => {
                        const next = { ...prev };
                        if (on) delete next[d.id];
                        else next[d.id] = '';
                        return next;
                      })
                    }
                    className="flex w-full items-center gap-3 px-3.5 py-3"
                  >
                    <span
                      className="grid h-[18px] w-[18px] place-items-center rounded border text-[11px]"
                      style={{
                        borderColor: on ? 'var(--accent)' : 'var(--line)',
                        background: on ? 'var(--accent)' : 'transparent',
                        color: 'var(--accent-ink)',
                      }}
                    >
                      {on ? '✓' : ''}
                    </span>
                    <span className="text-[13px]">{d.label}</span>
                  </button>
                  {on && (
                    <input
                      className="field rounded-none border-0 border-t text-[14px]"
                      placeholder={d.hint}
                      value={decor[d.id]}
                      onChange={(e) => setDecor((prev) => ({ ...prev, [d.id]: e.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="notes">Placement instructions</label>
          <textarea
            id="notes"
            rows={3}
            className="field mt-1.5 resize-none"
            placeholder="Front roofline only. Skip the lower garage roof."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <div className="text-[13px] text-[var(--bad)]">{error}</div>}

        <button className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? 'Starting…' : 'Generate visualization'}
        </button>
      </div>
    </Shell>
  );
}
