'use client';

import { useRef, useState } from 'react';
import { CHRISTMAS_DESIGNS, PERMANENT_DESIGNS } from '@/lib/designs';
import { PatternSwatch } from './PatternSwatch';
import { Rail } from './Rail';
import { BeforeAfter } from './BeforeAfter';

interface Result {
  before: string;
  after: string;
  width: number;
  height: number;
  design: string;
  preservation?: { score: number; passed: boolean };
}

const GROUPS = [
  { title: 'Christmas · C9 roofline', designs: CHRISTMAS_DESIGNS },
  { title: 'Omni · eave wall wash', designs: PERMANENT_DESIGNS },
];
const ALL = [...CHRISTMAS_DESIGNS, ...PERMANENT_DESIGNS];

/**
 * Run the pipeline on your own photograph.
 *
 * Laid out as a toolbar above a full-width result rather than a tall sidebar
 * beside a small one. The earlier split put the render button below eleven design
 * chips — a primary action two scrolls down — and left a large empty column
 * beside a short result. Everything needed to start now fits above the fold, and
 * the render gets the whole width.
 *
 * Renders are cached per design while the same photo is loaded: comparing options
 * is the obvious thing to do here, and every switch back would otherwise be two
 * more model passes for an image already produced.
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
  const hasPhoto = Boolean(preview);

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
    <div className="space-y-5">
      {/* ------------- toolbar: everything needed to start, above the fold ------------- */}
      <div className="panel p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* photo */}
          <div className="shrink-0">
            <input ref={fileRef} id="try-photo" type="file" accept="image/*" className="hidden" onChange={chooseFile} disabled={busy} />
            <label
              htmlFor="try-photo"
              className="flex h-[92px] w-[132px] cursor-pointer items-center justify-center overflow-hidden rounded-[var(--r-sm)] border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] transition-colors hover:border-[var(--accent)]"
              style={busy ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Your photo" className="h-full w-full object-cover" />
              ) : (
                <span className="px-2 text-center">
                  <span className="block text-[18px] leading-none">＋</span>
                  <span className="mt-1.5 block text-[11px] font-medium">Add photo</span>
                </span>
              )}
            </label>
            <p className="t-small mt-1.5 max-w-[132px] truncate">
              {fileName ?? 'JPEG, PNG, HEIC'}
            </p>
          </div>

          {/* designs */}
          <div className="min-w-0 flex-1 space-y-3">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <div className="t-label mb-1.5">{group.title}</div>
                <Rail ariaLabel={group.title}>
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
                      <span className="flex items-center gap-1.5 text-[11.5px] font-medium whitespace-nowrap">
                        {d.label}
                        {results[d.id] && <span aria-label="already rendered" className="text-[9px] text-[var(--ok)]">●</span>}
                      </span>
                      <PatternSwatch design={d} dots={5} />
                    </button>
                  ))}
                </Rail>
              </div>
            ))}
          </div>

          {/* action */}
          <div className="w-full shrink-0 space-y-2 lg:w-[212px]">
            <input
              className="field"
              placeholder="Surname (optional)"
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
            <button
              className={`btn w-full ${current ? 'btn-ghost' : 'btn-primary'}`}
              onClick={run}
              disabled={busy || !hasPhoto}
            >
              {busy ? 'Processing…' : current ? 'Render again' : `Render ${activeLabel}`}
            </button>
            <p className="t-small leading-snug">
              {!hasPhoto
                ? 'Add a photo to begin.'
                : current
                  ? 'Saved — switching designs is free.'
                  : 'Two passes, 2–4 minutes.'}
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--bad)]">{error}</p>}
      </div>

      {/* ------------- result: full width ------------- */}
      {busy ? (
        <div className="panel grid min-h-[460px] place-items-center p-8 text-center">
          <div>
            <div
              className="mx-auto h-10 w-10 rounded-full border-2 border-[var(--line-strong)] border-t-[var(--accent)]"
              style={{ animation: 'spin .9s linear infinite' }}
              aria-hidden="true"
            />
            <p className="mt-5 text-[15px] font-semibold">Your image is processing</p>
            <p className="mt-1.5 text-[13px] text-[var(--muted)]">{step ?? 'Starting'}…</p>
            <p className="t-small mx-auto mt-4 max-w-[34ch]">
              Two to four minutes. Keep this tab open — the result appears here.
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
          <div className="flex flex-wrap items-center gap-4">
            <a className="btn btn-primary" href={current.after} download={`augusta-${designId}.jpg`}>
              Download JPEG
            </a>
            {current.preservation && (
              <span className="inline-flex items-center gap-2.5 text-[13px] text-[var(--muted)]">
                <span
                  className="grid h-8 w-8 place-items-center rounded-full border text-[11.5px] font-bold tabular-nums"
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
        <div className="panel grid min-h-[460px] place-items-center p-8 text-center">
          <div className="max-w-[46ch]">
            <p className="text-[15px] font-semibold">
              {hasPhoto ? `Ready — press Render ${activeLabel}` : 'Your render appears here'}
            </p>
            <p className="t-body mt-2">
              {hasPhoto
                ? 'No roofline tracing on this path. The pipeline finds the front-facing roofline itself, which is the harder, unguided case.'
                : 'Add a front-facing daylight photo of a house, pick a design, and press render.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
