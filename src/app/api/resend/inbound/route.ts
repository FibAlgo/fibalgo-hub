import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ResendEmailReceivedEvent = {
  type: 'email.received';
  created_at: string;
  data: {
    email_id: string;
    created_at: string;
    from: string; // "Name <email@domain>"
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    message_id?: string;
  };
};

function extractEmailAddress(fromField: string | undefined | null): string | null {
  if (!fromField) return null;
  const m = /<([^>]+)>/.exec(fromField);
  if (m?.[1]) return m[1].trim();
  // fallback: sometimes it's just "email@domain"
  const s = fromField.trim();
  if (s.includes('@') && !s.includes(' ')) return s;
  return null;
}

function clampText(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + '\n\n[truncated]';
}

async function resendApi<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  const res = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Resend API error ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

async function getReceivedEmail(emailId: string): Promise<{ html: string | null; text: string | null; headers?: Record<string, string> }> {
  const out = await resendApi<{ html: string | null; text: string | null; headers?: Record<string, string> }>(`/emails/receiving/${encodeURIComponent(emailId)}`, {
    method: 'GET',
  });
  return out;
}

async function sendForwardEmail(params: {
  to: string;
  fromAddress: string; // e.g. "support@fibalgo.com"
  replyTo?: string | null;
  subject: string;
  html: string;
  text?: string;
}) {
  const fromHeader = `FibAlgo Support <${params.fromAddress}>`;
  const body = {
    from: fromHeader,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    reply_to: params.replyTo ? [params.replyTo] : [],
  };

  await resendApi('/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function POST(req: Request) {
  // 1) Verify webhook signature (Svix)
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) return new NextResponse('RESEND_WEBHOOK_SECRET not configured', { status: 500 });

  const payload = await req.text(); // MUST be raw text
  const headers = {
    'svix-id': req.headers.get('svix-id') || '',
    'svix-timestamp': req.headers.get('svix-timestamp') || '',
    'svix-signature': req.headers.get('svix-signature') || '',
  };

  let event: unknown;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(payload, headers);
  } catch (e) {
    return new NextResponse('Invalid webhook', { status: 400 });
  }

  // 2) Handle inbound email event
  const parsed = event as Partial<ResendEmailReceivedEvent>;
  if (parsed.type !== 'email.received' || !parsed.data?.email_id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supportForwardTo = process.env.SUPPORT_FORWARD_TO;
  if (!supportForwardTo) {
    return new NextResponse('SUPPORT_FORWARD_TO not configured', { status: 500 });
  }

  const toList = Array.isArray(parsed.data.to) ? parsed.data.to : [];
  const lowerTo = toList.map((x) => String(x).toLowerCase());

  // Only forward support/info by default (adjust as needed)
  const shouldForward =
    lowerTo.includes('support@fibalgo.com') || lowerTo.includes('info@fibalgo.com');
  if (!shouldForward) {
    return NextResponse.json({ ok: true, ignored: true, reason: 'not support/info' });
  }

  const originalFrom = extractEmailAddress(parsed.data.from);
  const received = await getReceivedEmail(parsed.data.email_id);

  const originalSubject = (parsed.data.subject || '(no subject)').toString();
  const routedTo = lowerTo.includes('support@fibalgo.com') ? 'support@fibalgo.com' : 'info@fibalgo.com';
  const forwardSubject = `[${routedTo}] ${originalSubject}`;

  const safeText = received.text ? clampText(received.text, 80_000) : null;
  const safeHtml = received.html ? clampText(received.html, 120_000) : null;

  const forwardHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
      <p><strong>Forwarded inbound email</strong></p>
      <p style="margin:0"><strong>To:</strong> ${routedTo}</p>
      <p style="margin:0"><strong>From:</strong> ${parsed.data.from ?? ''}</p>
      <p style="margin:0"><strong>Subject:</strong> ${originalSubject}</p>
      <hr style="margin:16px 0; border:none; border-top:1px solid #e5e7eb;" />
      ${safeHtml ? safeHtml : safeText ? `<pre style="white-space:pre-wrap">${safeText}</pre>` : '<em>(no body)</em>'}
    </div>
  `;

  await sendForwardEmail({
    to: supportForwardTo,
    fromAddress: routedTo, // send from support/info so Gmail can "Reply as" that identity
    replyTo: originalFrom,
    subject: forwardSubject,
    html: forwardHtml,
    text: safeText ?? undefined,
  });

  return NextResponse.json({ ok: true, forwarded: true, to: supportForwardTo, routedTo });
}

