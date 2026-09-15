import nodemailer from 'nodemailer';

/**
 * Email notifications for demo activity.
 *
 * Entirely optional: with no SMTP configuration the functions below do nothing.
 * Nothing here may ever throw into a request — a notification failing must not
 * cost someone the render they are waiting on.
 */

export interface VisitInfo {
  page: string;
  city?: string;
  region?: string;
  country?: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
}

const configured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.NOTIFY_EMAIL);

/**
 * Which notification settings this deployment can see. Names only, never values.
 *
 * Vercel binds environment variables at deploy time, so adding them without
 * redeploying leaves the function blind to them — and because a missing config
 * exits silently by design, that looks identical to "email is broken".
 */
export function notifyStatus() {
  const missing = (['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'NOTIFY_EMAIL'] as const).filter(
    (k) => !process.env[k],
  );
  return { configured: missing.length === 0, missing };
}

function transport() {
  const port = Number(process.env.SMTP_PORT ?? 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function placeOf(v: VisitInfo): string {
  const parts = [v.city, v.region, v.country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'location unknown';
}

/** Reads whatever the platform knows about the caller. Vercel supplies these free. */
export function visitorFrom(req: Request, page: string): VisitInfo {
  const h = (name: string) => req.headers.get(name) ?? undefined;
  const decode = (s?: string) => {
    if (!s) return undefined;
    // Vercel percent-encodes city names with non-ASCII characters.
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  return {
    page,
    city: decode(h('x-vercel-ip-city')),
    region: decode(h('x-vercel-ip-country-region')),
    country: h('x-vercel-ip-country'),
    ip: h('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: h('user-agent') ?? undefined,
    referrer: h('referer') ?? undefined,
  };
}

async function send(subject: string, lines: [string, string | undefined][]) {
  if (!configured()) return;
  const rows = lines
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 14px 4px 0;color:#667;font:13px system-ui;white-space:nowrap">${label}</td>` +
        `<td style="padding:4px 0;color:#111;font:13px system-ui">${String(value).replace(/</g, '&lt;')}</td></tr>`,
    )
    .join('');

  await transport().sendMail({
    from: `Augusta Lights Demo <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject,
    html: `<div style="font:14px system-ui"><table style="border-collapse:collapse">${rows}</table></div>`,
  });
}

/** Someone opened the demo. */
export async function notifyVisit(v: VisitInfo): Promise<void> {
  try {
    await send(`Demo opened — ${placeOf(v)}`, [
      ['Page', v.page],
      ['Location', placeOf(v)],
      ['IP', v.ip],
      ['Came from', v.referrer],
      ['Device', v.userAgent],
      ['Time', new Date().toLocaleString('en-US', { timeZoneName: 'short' })],
    ]);
  } catch (err) {
    console.warn('visit notification failed:', (err as Error).message.slice(0, 120));
  }
}

/** Someone actually rendered a photo — worth knowing separately from a visit. */
export async function notifyRender(v: VisitInfo, design: string, ok: boolean, detail?: string): Promise<void> {
  try {
    await send(`Demo render ${ok ? 'completed' : 'failed'} — ${placeOf(v)}`, [
      ['Design', design],
      ['Result', ok ? 'completed' : `failed — ${detail ?? 'unknown'}`],
      ['Location', placeOf(v)],
      ['IP', v.ip],
      ['Time', new Date().toLocaleString('en-US', { timeZoneName: 'short' })],
    ]);
  } catch (err) {
    console.warn('render notification failed:', (err as Error).message.slice(0, 120));
  }
}
