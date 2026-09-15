'use client';

import { useRef, useState } from 'react';
import { CHRISTMAS_DESIGNS, PERMANENT_DESIGNS } from '@/lib/designs';
import { PatternSwatch } from './PatternSwatch';
import { Rail } from './Rail';

const DESIGNS = [...CHRISTMAS_DESIGNS, ...PERMANENT_DESIGNS];

interface Result {
  before: string;
  after: string;
  overlay: string;
  design: string;
  preservation?: { score: number; passed: boolean };
}

/**
 * Run the pipeline on your own photograph.
 *
 * The gallery proves the output; this proves it is not a reel of cherry-picked
 * images. Progress is streamed because the two model calls take two to four
 * minutes and a silent wait that long reads as broken.
 */
export function TryIt({ needsPasscode }: { needsPasscode: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  const [designId, setDesignId] = useState('warm-white');
  const [lastName, setLastName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [step, setStep] = useState<string>();
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Result>();
  const [busy, setBusy] = useState(false);

  async function run() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Choose a photo of a house first.');
    setBusy(true);
    setError(undefined);
    setResult(undefined);
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

      // Newline-delimited JSON; a chunk can split mid-line, so hold the remainder.
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
          if (msg.done) setResult({ ...msg, preservation });
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
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <input
            ref={fileRef}
            id="try-photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPreview(URL.createObjectURL(f));
              setResult(undefined);
            }}
          />
          <label
            htmlFor="try-photo"
            className="flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)]"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Your photo" className="h-full w-full object-cover" />
            ) : (
              <span className="px-4 text-center">
                <span className="block text-[22px]">📷</span>
                <span className="mt-1.5 block text-[13px] font-medium">Choose a house photo</span>
                <span className="mt-1 block text-[11px] text-[var(--muted)]">
                  Front-facing, taken in daylight
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
                onChange={(e) => setPasscode(e.target.value)}
              />
            </div>
          )}

          <div>
            <div className="label">Design</div>
            <div className="mt-1.5">
              <Rail ariaLabel="Designs" className="sm:flex-wrap sm:overflow-visible">
                {DESIGNS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={designId === d.id}
                    onClick={() => setDesignId(d.id)}
                    className="chip"
                  >
                    <span className="text-[12px] font-medium whitespace-nowrap">{d.label}</span>
                    <PatternSwatch design={d} dots={6} />
                  </button>
                ))}
              </Rail>
            </div>
          </div>

          {error && <p className="text-[12.5px] text-[var(--bad)]">{error}</p>}

          <button className="btn btn-primary w-full" onClick={run} disabled={busy}>
            {busy ? (step ?? 'Working…') : 'Render my photo'}
          </button>
          <p className="text-[11px] leading-relaxed text-[var(--muted)]">
            Two model passes, usually two to four minutes. Keep this tab open.
          </p>
        </div>

        <div className="min-h-[220px] rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
          {result ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Your photo', result.before],
                  [result.design, result.after],
                ].map(([label, src]) => (
                  <figure key={label} className="m-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={label} className="w-full rounded-lg border border-[var(--line)]" />
                    <figcaption className="mt-1.5 text-[11px] text-[var(--muted)]">{label}</figcaption>
                  </figure>
                ))}
              </div>
              {result.preservation && (
                <p className="text-[12px] text-[var(--muted)]">
                  Architecture score{' '}
                  <b style={{ color: result.preservation.passed ? 'var(--ok)' : 'var(--bad)' }}>
                    {Math.round(result.preservation.score)}
                  </b>{' '}
                  — {result.preservation.passed ? 'no gross structural change detected' : 'flagged for review'}
                </p>
              )}
              <a className="btn btn-ghost" href={result.after} download="augusta-lights.jpg">
                Download JPEG
              </a>
            </div>
          ) : (
            <div className="grid h-full place-items-center px-4 text-center">
              <p className="text-[12.5px] leading-relaxed text-[var(--muted)]">
                {busy
                  ? `${step ?? 'Working'}…`
                  : 'Your render appears here. No roofline tracing — this is the unguided path, the same one a first-time upload gets.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
