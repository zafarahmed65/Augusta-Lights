'use client';

import { useRef, useState } from 'react';
import { CHRISTMAS_DESIGNS, PERMANENT_DESIGNS } from '@/lib/designs';
import { PatternSwatch } from './PatternSwatch';
import { Rail } from './Rail';
import type { Design } from '@/lib/types';

interface Result {
  before: string;
  after: string;
  design: string;
  preservation?: { score: number; passed: boolean };
}

const GROUPS: { title: string; note: string; designs: Design[] }[] = [
  {
    title: 'Christmas lighting',
    note: 'SMD C9 bulbs on the front-facing roofline, 15" spacing',
    designs: CHRISTMAS_DESIGNS,
  },
  {
    title: 'Omni permanent lighting',
    note: 'Recessed eave fixtures washing down the façade, 8" spacing',
    designs: PERMANENT_DESIGNS,
  },
];

/**
 * Run the pipeline on your own photograph.
 *
 * Renders are cached per design for as long as the same photo is loaded. Picking
 * a design you have already rendered shows the saved image instead of calling the
 * model again — switching back and forth to compare options is the natural thing
 * to do here, and every one of those calls costs real money.
 */
export function TryIt({ needsPasscode }: { needsPasscode: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  const [designId, setDesignId] = useState('warm-white');
  const [lastName, setLastName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [step, setStep] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  /** Keyed by design id, cleared whenever a different photo is chosen. */
  const [results, setResults] = useState<Record<string, Result>>({});

  const current = results[designId];
  const allDesigns = [...CHRISTMAS_DESIGNS, ...PERMANENT_DESIGNS];
  const activeLabel = allDesigns.find((d) => d.id === designId)?.label ?? '';

  function chooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    // A new photo invalidates every saved render.
    setResults({});
    setError(undefined);
  }

  async function run() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Choose a photo of a house first.');
    setBusy(true);
    setError(undefined);
    setStep('Uploading');

    const body = new FormData();
    body.set('photo', file);
    body.set('designId', designId);
    body.set('lastName', lastName);
    if (passcode) body.set('passcode', passcode);

    let preservation: Result['preservation'];
    try {
      const res = await fetch('/api/try', { method: 'POST', body });
      if (!res.ok || !res.body) {
        const msg = await res.json().catch(() => ({ error: 'That did not work.' }));
        throw new Error(msg.error ?? 'That did not work.');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.error) throw new Error(msg.error);
          if (msg.preservation) preservation = msg.preservation;
          if (msg.step) setStep(msg.step);
          if (msg.done) {
            const saved: Result = { ...msg, preservation };
            setResults((prev) => ({ ...prev, [designId]: saved }));
          }
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setStep(undefined);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <input
            ref={fileRef}
            id="try-photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={chooseFile}
            disabled={busy}
          />
          <label
            htmlFor="try-photo"
            className="flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)]"
            style={busy ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Your photo" className="h-full w-full object-cover" />
            ) : (
              <span className="px-4 text-center">
                <span className="block text-[22px]">📷</span>
                <span className="mt-1.5 block text-[13px] font-medium">Choose a house photo</span>
                <span className="mt-1 block text-[11px] text-[var(--muted)]">
                  Front-facing, daylight. JPEG, PNG or HEIC.
                </span>
              </span>
            )}
          </label>

          <div>
            <label className="label" htmlFor="try-name">Surname (optional)</label>
            <input
              id="try-name"
              className="field mt-1.5"
              placeholder="Payne"
              value={lastName}
              disabled={busy}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          {needsPasscode && (
            <div>
              <label className="label" htmlFor="try-code">Passcode</label>
              <input
                id="try-code"
                className="field mt-1.5"
                value={passcode}
                disabled={busy}
                onChange={(e) => setPasscode(e.target.value)}
              />
            </div>
          )}

          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="label">{group.title}</div>
              <p className="mt-1 text-[11px] text-[var(--muted)]">{group.note}</p>
              <div className="mt-2">
                <Rail ariaLabel={group.title} className="sm:flex-wrap sm:overflow-visible">
                  {group.designs.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={designId === d.id}
                      disabled={busy}
                      onClick={() => setDesignId(d.id)}
                      className="chip relative"
                      style={busy ? { opacity: 0.55 } : undefined}
                    >
                      <span className="flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap">
                        {d.label}
                        {results[d.id] && (
                          <span
                            title="Already rendered"
                            aria-label="Already rendered"
                            className="text-[10px] text-[var(--ok)]"
                          >
                            ●
                          </span>
                        )}
                      </span>
                      <PatternSwatch design={d} dots={6} />
                    </button>
                  ))}
                </Rail>
              </div>
            </div>
          ))}

          {error && <p className="text-[12.5px] leading-relaxed text-[var(--bad)]">{error}</p>}

          {current ? (
            <>
              <button className="btn btn-ghost w-full" onClick={run} disabled={busy}>
                Render {activeLabel} again
              </button>
              <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                This design is already rendered and shown on the right — switching between saved
                designs is free. Rendering again costs another two model passes.
              </p>
            </>
          ) : (
            <>
              <button className="btn btn-primary w-full" onClick={run} disabled={busy}>
                {busy ? 'Processing…' : `Render ${activeLabel}`}
              </button>
              <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                Two model passes, usually two to four minutes. Keep this tab open.
              </p>
            </>
          )}
        </div>

        <div className="min-h-[260px] rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
          {busy ? (
            <div className="grid h-full place-items-center px-6 text-center">
              <div>
                <div
                  className="mx-auto h-9 w-9 rounded-full border-2 border-[var(--line-strong)] border-t-[var(--accent)]"
                  style={{ animation: 'spin 0.9s linear infinite' }}
                  aria-hidden="true"
                />
                <p className="mt-4 text-[13px] font-medium">Your image is processing</p>
                <p className="mt-1.5 text-[12px] text-[var(--muted)]">{step ?? 'Starting'}…</p>
                <p className="mt-3 text-[11px] text-[var(--muted)]">
                  This takes two to four minutes. Please keep this tab open.
                </p>
              </div>
            </div>
          ) : current ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Your photo', current.before],
                  [current.design, current.after],
                ].map(([label, src]) => (
                  <figure key={label} className="m-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={label} className="w-full rounded-lg border border-[var(--line)]" />
                    <figcaption className="mt-1.5 text-[11px] text-[var(--muted)]">{label}</figcaption>
                  </figure>
                ))}
              </div>
              {current.preservation && (
                <p className="text-[12px] text-[var(--muted)]">
                  Architecture score{' '}
                  <b style={{ color: current.preservation.passed ? 'var(--ok)' : 'var(--bad)' }}>
                    {Math.round(current.preservation.score)}
                  </b>{' '}
                  — {current.preservation.passed ? 'no gross structural change detected' : 'flagged for review'}
                </p>
              )}
              <a className="btn btn-ghost" href={current.after} download={`augusta-${designId}.jpg`}>
                Download JPEG
              </a>
            </div>
          ) : (
            <div className="grid h-full place-items-center px-4 text-center">
              <p className="max-w-[46ch] text-[12.5px] leading-relaxed text-[var(--muted)]">
                {Object.keys(results).length > 0
                  ? `${activeLabel} has not been rendered for this photo yet. Designs marked with a green dot are saved — pick one of those to see it again for free.`
                  : 'Your render appears here. No roofline tracing — this is the unguided path, the same one a first upload gets in the field.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
