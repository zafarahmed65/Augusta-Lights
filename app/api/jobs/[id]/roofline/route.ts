import { NextResponse } from 'next/server';
import { relight } from '@/lib/pipeline';
import type { RooflineSegment } from '@/lib/types';

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { segments } = (await req.json()) as { segments: RooflineSegment[] };
  if (!Array.isArray(segments)) {
    return NextResponse.json({ error: 'segments must be an array' }, { status: 400 });
  }
  void relight(id, segments);
  return NextResponse.json({ ok: true });
}
