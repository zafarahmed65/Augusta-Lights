import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { RooflineSegment } from './types';

/**
 * Job state on the local filesystem.
 *
 * No database: V1 is an internal tool where the GM downloads a JPEG and attaches
 * it to an estimate, and the client explicitly asked not to build project history
 * or a customer database. Swapping this module for Vercel Blob is the only change
 * needed to deploy to serverless.
 */

export type JobStatus = 'queued' | 'master' | 'verifying' | 'lighting' | 'done' | 'error';

export interface Job {
  id: string;
  createdAt: string;
  lastName: string;
  designId: string;
  decorations: string[];
  placementNotes: string;
  frontageFeet?: number;
  status: JobStatus;
  step: string;
  error?: string;
  preservation?: { score: number; localScore: number; passed: boolean; attempts: number };
  segments?: RooflineSegment[];
  /** Filenames inside the job directory, served via /api/jobs/[id]/file/[name]. */
  files: Partial<Record<'original' | 'master' | 'overlay' | 'guide' | 'hero' | 'sheet', string>>;
  spendUsd: number;
  bulbCount?: number;
}

const ROOT = path.join(process.cwd(), 'out', 'jobs');

export const jobDir = (id: string) => path.join(ROOT, id);

function assertSafeId(id: string) {
  // Ids reach this module straight from the URL; anything but a plain uuid could
  // escape the job directory via ../ when joined into a path.
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('bad job id');
}

export async function createJob(input: Pick<Job, 'lastName' | 'designId' | 'decorations' | 'placementNotes'> & { frontageFeet?: number }): Promise<Job> {
  const id = randomUUID();
  await mkdir(jobDir(id), { recursive: true });
  const job: Job = {
    id,
    createdAt: new Date().toISOString(),
    status: 'queued',
    step: 'Queued',
    files: {},
    spendUsd: 0,
    ...input,
  };
  await saveJob(job);
  return job;
}

export async function saveJob(job: Job): Promise<void> {
  assertSafeId(job.id);
  await mkdir(jobDir(job.id), { recursive: true });
  await writeFile(path.join(jobDir(job.id), 'job.json'), JSON.stringify(job, null, 2));
}

export async function readJob(id: string): Promise<Job | null> {
  assertSafeId(id);
  const file = path.join(jobDir(id), 'job.json');
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function patchJob(id: string, patch: Partial<Job>): Promise<Job> {
  const job = await readJob(id);
  if (!job) throw new Error(`job ${id} not found`);
  const next = { ...job, ...patch };
  await saveJob(next);
  return next;
}

export async function writeJobFile(id: string, name: string, data: Buffer): Promise<string> {
  assertSafeId(id);
  if (!/^[a-z0-9.\-]+$/i.test(name)) throw new Error('bad file name');
  await mkdir(jobDir(id), { recursive: true });
  await writeFile(path.join(jobDir(id), name), data);
  return name;
}

export async function readJobFile(id: string, name: string): Promise<Buffer | null> {
  assertSafeId(id);
  if (!/^[a-z0-9.\-]+$/i.test(name)) return null;
  const file = path.join(jobDir(id), name);
  if (!existsSync(file)) return null;
  return readFile(file);
}
