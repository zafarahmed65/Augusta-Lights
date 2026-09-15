import { NextResponse } from 'next/server';
import { revise } from '@/lib/pipeline';

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { instruction } = (await req.json()) as { instruction: string };
  if (!instruction?.trim()) {
    return NextResponse.json({ error: 'instruction is required' }, { status: 400 });
  }
  void revise(id, instruction.slice(0, 600));
  return NextResponse.json({ ok: true });
}
