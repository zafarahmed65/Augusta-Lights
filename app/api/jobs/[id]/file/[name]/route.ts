import { readJobFile } from '@/lib/jobs';

const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png' };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id, name } = await params;
  const data = await readJobFile(id, name).catch(() => null);
  if (!data) return new Response('not found', { status: 404 });
  const ext = name.split('.').pop() ?? '';
  return new Response(new Uint8Array(data), {
    headers: {
      'content-type': TYPES[ext] ?? 'application/octet-stream',
      // Files are rewritten in place on revise, so responses must not be cached.
      'cache-control': 'no-store',
    },
  });
}
