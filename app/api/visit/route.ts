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
    // Not awaited: the visitor should never wait on an SMTP round trip.
    void notifyVisit(visitor);
  } catch {
    /* a beacon must never surface an error to the page */
  }
  return Response.json({ ok: true, emailed: true });
}
