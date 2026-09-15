import { NextResponse } from 'next/server';
import { buildSheet } from '@/lib/pipeline';

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { designIds } = (await req.json()) as { designIds: string[] };
  if (!Array.isArray(designIds) || designIds.length === 0) {
    return NextResponse.json({ error: 'designIds is required' }, { status: 400 });
  }
  void buildSheet(id, designIds);
  return NextResponse.json({ ok: true });
}
