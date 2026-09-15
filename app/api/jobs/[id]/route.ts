import { NextResponse } from 'next/server';
import { readJob } from '@/lib/jobs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await readJob(id).catch(() => null);
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(job, { headers: { 'cache-control': 'no-store' } });
}
