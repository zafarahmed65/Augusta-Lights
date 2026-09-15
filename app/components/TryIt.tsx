'use client';

import { useRef, useState } from 'react';
import { CHRISTMAS_DESIGNS, PERMANENT_DESIGNS } from '@/lib/designs';
import { PatternSwatch } from './PatternSwatch';
import { Rail } from './Rail';
import { BeforeAfter } from './BeforeAfter';
import type { Design } from '@/lib/types';

interface Result {
  before: string;
  after: string;
  width: number;
  height: number;
  design: string;
  preservation?: { score: number; passed: boolean };
}

const GROUPS: { title: string; note: string; designs: Design[] }[] = [
  { title: 'Christmas lighting', note: 'SMD C9 on the roofline · 15" spacing', designs: CHRISTMAS_DESIGNS },
  { title: 'Omni permanent', note: 'Recessed eave wall wash · 8" spacing', designs: PERMANENT_DESIGNS },
];

const ALL = [...CHRISTMAS_DESIGNS, ...PERMANENT_DESIGNS];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-[12px] font-semibold tracking-wide">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--surface-2)] text-[10px] text-[var(--muted)] tabular-nums">
          {n}
        </span>
        {title}
      </h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/**
 * Run the pipeline on your own photograph.
 *
 * Laid out as a numbered flow with the result given the room it deserves: the
 * render is the thing being judged, so it gets the same large comparison slider
 * as the case study rather than a pair of thumbnails.
 *
 * Renders are cached per design while the same photo is loaded. Comparing options
 * is the obvious thing to do here and every switch back would otherwise be another
 * two model passes for an image already produced.
 */
export function TryIt({ needsPasscode }: { needsPasscode: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  const [fileName, setFileName] = useState<string>();
  const [designId, setDesignId] = useState('warm-white');
  const [lastName, setLastName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [step, setStep] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Record<string, Result>>({});

  const current = results[designId];
  const activeLabel = ALL.find((d) => d.id === designId)?.label ?? '';
  const rendered = Object.keys(results).length;

  function chooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setFileName(f.name);
    setResults({}); // a new photo invalidates every saved render
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
          if (msg.done) setResults((prev) => ({ ...prev, [designId]: { ...msg, preservation } }));
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,370px)_minmax(0,1fr)] lg:items-start">
      {/* ---------------- controls ---------------- */}
      <div className="card space-y-6 p-5 lg:sticky lg:top-20">
        <Step n={1} title="Photograph">
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
            className="group relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] transition-colors hover:border-[var(--accent)]"
            style={busy ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Your photo" className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-3 py-2 text-[11px] text-white backdrop-blur-sm">
                  {fileName} · tap to change
                </span>
              </>
            ) : (
              <span className="px-5 text-center">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="mx-auto text-[var(--muted)]" aria-hidden="true">
                  <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3.5 15v3A2.5 2.5 0 0 0 6 20.5h12a2.5 2.5 0 0 0 2.5-2.5v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span className="mt-3 block text-[13.5px] font-medium">Choose a house photo</span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-[var(--muted)]">
                  Front-facing, taken in daylight.<br />JPEG, PNG or HEIC.
                </span>
              </span>
            )}
          </label>
        </Step>

        <Step n={2} title="Lighting design">
          <div className="space-y-4">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[var(--text)]">{group.title}</span>
                  <span className="text-[10.5px] text-[var(--muted)]">{group.note}</span>
                </div>
                <div className="mt-2">
                  <Rail ariaLabel={group.title} className="sm:flex-wrap sm:overflow-visible">
                    {group.designs.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={designId === d.id}
                        disabled={busy}
                        onClick={() => setDesignId(d.id)}
                        className="chip"
                        style={busy ? { opacity: 0.55 } : undefined}
                      >
                        <span className="flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap">
                          {d.label}
                          {results[d.id] && <span aria-label="already rendered" className="text-[9px] text-[var(--ok)]">●</span>}
                        </span>
                        <PatternSwatch design={d} dots={6} />
                      </button>
                    ))}
                  </Rail>
                </div>
              </div>
            ))}
          </div>
        </Step>

        <Step n={3} title="Details">
          <div className="space-y-2.5">
            <input
              className="field"
              placeholder="Customer surname (optional)"
              aria-label="Customer surname"
              value={lastName}
              disabled={busy}
              onChange={(e) => setLastName(e.target.value)}
            />
            {needsPasscode && (
              <input
                className="field"
                placeholder="Passcode"
                aria-label="Passcode"
                value={passcode}
                disabled={busy}
                onChange={(e) => setPasscode(e.target.value)}
              />
            )}
          </div>
        </Step>

        {error && <p className="text-[12.5px] leading-relaxed text-[var(--bad)]">{error}</p>}

        <div className="space-y-2">
          <button
            className={`btn w-full ${current ? 'btn-ghost' : 'btn-primary'}`}
            onClick={run}
            disabled={busy}
          >
            {busy ? 'Processing…' : current ? `Render ${activeLabel} again` : `Render ${activeLabel}`}
          </button>
          <p className="text-[11px] leading-relaxed text-[var(--muted)]">
            {current
              ? 'Already rendered and shown alongside. Switching between saved designs is free; rendering again is two more model passes.'
              : 'Two model passes, usually two to four minutes. Keep this tab open.'}
          </p>
        </div>
      </div>

      {/* ---------------- result ---------------- */}
      <div className="min-h-[420px]">
        {busy ? (
          <div className="card grid min-h-[420px] place-items-center p-8 text-center">
            <div>
              <div
                className="mx-auto h-10 w-10 rounded-full border-2 border-[var(--line-strong)] border-t-[var(--accent)]"
                style={{ animation: 'spin 0.9s linear infinite' }}
                aria-hidden="true"
              />
              <p className="mt-5 text-[15px] font-semibold">Your image is processing</p>
              <p className="mt-1.5 text-[13px] text-[var(--muted)]">{step ?? 'Starting'}…</p>
              <p className="mx-auto mt-4 max-w-[34ch] text-[11.5px] leading-relaxed text-[var(--muted)]">
                Two to four minutes. Please keep this tab open — the result appears here.
              </p>
            </div>
          </div>
        ) : current ? (
          <div className="space-y-4">
            <BeforeAfter
              before={{ src: current.before, width: current.width, height: current.height }}
              after={{ src: current.after, width: current.width, height: current.height }}
              beforeLabel="Your photo"
              afterLabel={`${current.design} visualization`}
            />

            <div className="flex flex-wrap items-center gap-3">
              <a className="btn btn-primary" href={current.after} download={`augusta-${designId}.jpg`}>
                Download JPEG
              </a>
              {current.preservation && (
                <span className="inline-flex items-center gap-2 text-[12.5px] text-[var(--muted)]">
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full border text-[11px] font-bold tabular-nums"
                    style={{
                      borderColor: current.preservation.passed ? 'var(--ok)' : 'var(--bad)',
                      color: current.preservation.passed ? 'var(--ok)' : 'var(--bad)',
                    }}
                  >
                    {Math.round(current.preservation.score)}
                  </span>
                  {current.preservation.passed ? 'No gross structural change detected' : 'Flagged for review'}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="card grid min-h-[420px] place-items-center p-8 text-center">
            <div className="max-w-[44ch]">
              <p className="text-[15px] font-semibold">
                {rendered > 0 ? `${activeLabel} not rendered yet` : 'Your render appears here'}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
                {rendered > 0
                  ? 'Designs marked with a green dot are already saved — pick one of those to see it again instantly, or render this one.'
                  : 'Choose a photo and a design, then press render. No roofline tracing — this is the unguided path, the same one a first render gets in the field.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
