import { notifyStatus, notifyVisit, visitorFrom } from '@/lib/notify';

export const dynamic = 'force-dynamic';

/**
 * Visit beacon.
 *
 * Both pages are static, so nothing server-side runs when someone opens one.
 * This is the smallest dynamic hook that keeps it that way: the page pings here
 * once per browser session and the pages themselves stay prerendered.
 */

/** Obvious crawlers — no point emailing about Googlebot. */
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headlesschrome|lighthouse|preview/i;

/** Health check: does this deployment actually have the mail settings? */
export async function GET() {
  const status = notifyStatus();
  return Response.json({
    email: status.configured ? 'configured' : 'NOT configured',
    missing: status.missing,
    hint: status.configured
      ? 'Visits will send email.'
      : 'Add these in Vercel, then redeploy — variables are bound at deploy time.',
  });
}

export async function POST(req: Request) {
  try {
    const { page } = (await req.json().catch(() => ({ page: '/' }))) as { page?: string };
    const visitor = visitorFrom(req, page ?? '/');

    if (visitor.userAgent && BOT.test(visitor.userAgent)) {
      return Response.json({ ok: true, skipped: 'bot' });
    }

    const status = notifyStatus();
    if (!status.configured) {
      console.warn('visit not emailed — missing:', status.missing.join(', '));
      return Response.json({ ok: true, emailed: false, missing: status.missing });
    }
    /*
     * Awaited deliberately.
     *
     * Serverless freezes the execution context the moment the handler returns,
     * so a fire-and-forget promise is killed before SMTP finishes its handshake.
     * That is why this worked locally, where the process keeps running, and sent
     * nothing once deployed. The beacon is fired with keepalive and its response
     * is ignored, so waiting a second here costs the visitor nothing.
     */
    const failure = await notifyVisit(visitor);
    return Response.json({ ok: true, emailed: !failure, ...(failure ? { error: failure } : {}) });
  } catch (err) {
    // A beacon must never break the page, but say what went wrong when asked.
    return Response.json({ ok: true, emailed: false, error: (err as Error).message.slice(0, 160) });
  }
}
