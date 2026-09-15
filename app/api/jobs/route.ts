import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { createJob } from '@/lib/jobs';
import { runJob } from '@/lib/pipeline';

export const maxDuration = 300;

/** Long edge the photo is normalised to before it reaches the model. */
const INGEST_WIDTH = 1536;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const photo = form.get('photo');
    if (!(photo instanceof File)) {
      return NextResponse.json({ error: 'A photo is required.' }, { status: 400 });
    }

    // rotate() applies the EXIF orientation and strips metadata, so a phone
    // photo taken in portrait does not reach the model sideways.
    const original = await sharp(Buffer.from(await photo.arrayBuffer()))
      .rotate()
      .resize(INGEST_WIDTH, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 94 })
      .toBuffer();

    const job = await createJob({
      lastName: String(form.get('lastName') ?? '').slice(0, 60),
      designId: String(form.get('designId') ?? 'warm-white'),
      decorations: form.getAll('decorations').map(String),
      placementNotes: String(form.get('placementNotes') ?? '').slice(0, 800),
      frontageFeet: form.get('frontageFeet') ? Number(form.get('frontageFeet')) : undefined,
    });

    // Not awaited: generation takes 1-2 minutes and the client polls the job
    // record for progress instead of holding the request open.
    void runJob(job.id, original);

    return NextResponse.json({ id: job.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
