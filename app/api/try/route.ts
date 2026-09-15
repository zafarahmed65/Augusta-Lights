import sharp from 'sharp';
import { generateMaster } from '@/lib/ai/master';
import { applyLighting } from '@/lib/ai/light';
import { reconcileLighting } from '@/lib/image/reconcile';
import { composeHero } from '@/lib/image/compose';
import { getDesign } from '@/lib/designs';
import { notifyRender, visitorFrom } from '@/lib/notify';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/** Long edge the upload is normalised to before it reaches the model. */
const INGEST_WIDTH = 1280;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/**
 * Per-IP budget.
 *
 * This endpoint spends real money on every call, and the page it serves is a
 * public link. In-memory state resets when the instance recycles, so this is a
 * speed bump rather than a guarantee — the passcode is the actual lock.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 4;
const hits = new Map<string, number[]>();

function overBudget(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(req: Request) {
  const passcode = process.env.TRY_PASSCODE;
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: 'Expected a form upload.' }, { status: 400 });

  if (passcode && String(form.get('passcode') ?? '') !== passcode) {
    return Response.json({ error: 'That passcode is not right.' }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (overBudget(ip)) {
    return Response.json(
      { error: 'That is four renders in an hour from this address — the cap for the demo.' },
      { status: 429 },
    );
  }

  const photo = form.get('photo');
  if (!(photo instanceof File)) return Response.json({ error: 'A photo is required.' }, { status: 400 });
  if (photo.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: 'That photo is over 12MB. Try a smaller one.' }, { status: 413 });
  }

  const designId = String(form.get('designId') ?? 'warm-white');
  const visitor = visitorFrom(req, 'try your photo');
  const lastName = String(form.get('lastName') ?? '').slice(0, 40);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Newline-delimited JSON rather than a single response: the two model calls
      // take two to four minutes, and a silent connection that long looks broken
      // on a phone. Streaming also sidesteps shared job state on serverless.
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      try {
        const design = getDesign(designId);

        /*
         * Normalise whatever arrived to JPEG before anything else touches it.
         * sharp decodes HEIC (what an iPhone shoots by default), webp, png and
         * tiff, and rotate() applies the EXIF orientation so a portrait photo
         * does not reach the model sideways. A decode failure is a bad file, not
         * a pipeline fault, so it gets its own message.
         */
        let original: Buffer;
        try {
          original = await sharp(Buffer.from(await photo.arrayBuffer()))
            .rotate()
            .resize(INGEST_WIDTH, undefined, { withoutEnlargement: true })
            .jpeg({ quality: 92 })
            .toBuffer();
        } catch {
          send({
            error:
              'That file could not be read as an image. JPEG, PNG, HEIC and WebP all work — ' +
              'if it came from a screenshot tool or a messaging app, try the original photo.',
          });
          return;
        }

        send({ step: 'Converting the photo to dusk' });
        const master = await generateMaster(original, { quality: 'draft', maxAttempts: 1 });
        send({
          step: 'Checking the architecture',
          preservation: {
            score: master.report.score,
            passed: master.report.passed,
            localScore: master.report.detail.localScore,
          },
        });

        send({ step: `Adding ${design.label} lighting` });
        const { width = 0, height = 0 } = await sharp(master.buffer).metadata();
        const lit = await applyLighting({ master: master.buffer, design, width, height, quality: 'draft' });
        const reconciled = await reconcileLighting(master.buffer, lit.edit.buffer);

        const hero = await composeHero(reconciled.buffer, {
          lastName,
          designLabel: design.label,
          targetWidth: 1600,
        });

        void notifyRender(visitor, design.label, true);

        const jpeg = (b: Buffer) => `data:image/jpeg;base64,${b.toString('base64')}`;
        send({
          done: true,
          before: jpeg(original),
          after: jpeg(hero),
          overlay: `data:image/png;base64,${master.report.overlay.toString('base64')}`,
          design: design.label,
          costUsd: Number((master.costUsd + lit.edit.costUsd).toFixed(3)),
        });
      } catch (err) {
        const raw = (err as Error).message;
        // Translate the one failure a visitor can actually act on. Everything
        // else passes through so it stays debuggable.
        const friendly = /answered in text instead of returning an image/.test(raw)
          ? 'The model described the edit instead of producing it — an intermittent fault we retry three times. Press render again; it usually works on the next try.'
          : raw;
        void notifyRender(visitor, designId, false, raw.slice(0, 120));
        send({ error: friendly });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' },
  });
}
