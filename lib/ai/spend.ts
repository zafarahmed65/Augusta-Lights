import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Running total of what the pipeline has spent.
 *
 * On a serverless host the bundle directory is read-only — writing under
 * process.cwd() threw ENOENT on /var/task/out and took the whole render with it.
 * The log is a development convenience, never part of producing an image, so it
 * writes to the temp directory there and every failure is swallowed.
 */

const onServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const SPEND_FILE = onServerless
  ? path.join(os.tmpdir(), 'augusta-spend.json')
  : path.join(process.cwd(), 'out', '.spend.json');

export interface SpendEntry {
  model: string;
  costUsd: number;
  provider: string;
  resolution?: string;
}

interface SpendLog {
  totalUsd: number;
  calls: unknown[];
}

async function read(): Promise<SpendLog> {
  if (!existsSync(SPEND_FILE)) return { totalUsd: 0, calls: [] };
  try {
    return JSON.parse(await readFile(SPEND_FILE, 'utf8'));
  } catch {
    return { totalUsd: 0, calls: [] };
  }
}

/** Records a call. Never throws: accounting must not be able to fail a render. */
export async function recordSpend(entry: SpendEntry): Promise<void> {
  const label = `  $ ${entry.costUsd.toFixed(4)} (${entry.model.split('/').pop()} via ${entry.provider})`;
  try {
    await mkdir(path.dirname(SPEND_FILE), { recursive: true });
    const log = await read();
    log.totalUsd = Number((log.totalUsd + entry.costUsd).toFixed(4));
    log.calls.push({ at: new Date().toISOString(), ...entry });
    await writeFile(SPEND_FILE, JSON.stringify(log, null, 2));
    console.log(`${label} — total $${log.totalUsd.toFixed(2)}`);
  } catch (err) {
    console.log(`${label} — not logged (${(err as Error).message.slice(0, 60)})`);
  }
}

export async function totalSpend(): Promise<number> {
  try {
    return (await read()).totalUsd ?? 0;
  } catch {
    return 0;
  }
}
