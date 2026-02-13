import { Resend } from 'resend';

/**
 * Resend (HTTP API) mail sender
 *
 * - From: EMAIL_FROM (recommended: "FibAlgo <noreply@fibalgo.com>")
 * - Reply-To: EMAIL_REPLY_TO (recommended: support@fibalgo.com)
 */
// Placeholder key allows module to load when RESEND_API_KEY is missing (e.g. local dev).
// sendMail() throws before sending if key is not configured.
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'https://fibalgo.com';

const DEFAULT_FROM =
  process.env.EMAIL_FROM ||
  (process.env.SMTP_USER ? `FibAlgo <${process.env.SMTP_USER}>` : 'FibAlgo <noreply@fibalgo.com>');

const DEFAULT_REPLY_TO = process.env.EMAIL_REPLY_TO || undefined;

type LegacyMailOptions = {
  from?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  // nodemailer-specific fields that may exist in this file; we ignore them in Resend mode
  attachments?: unknown[];
};

// ═══════════════════════════════════════════════════════════════
// Rate limiter — Resend allows 2 req/s on Scale plan.
// Token bucket: max 2 tokens, refill 2 per second.
// Mutex-safe: concurrent calls are serialized through a queue.
// ═══════════════════════════════════════════════════════════════
const RATE_LIMIT = {
  maxTokens: 2,
  refillRate: 2, // tokens per second
  tokens: 2,
  lastRefill: Date.now(),
};

/** Mutex queue — ensures only one caller touches the token bucket at a time. */
let _rateLimitQueue: Promise<void> = Promise.resolve();

async function waitForRateLimit(): Promise<void> {
  // Chain onto the previous promise so callers are serialized
  const ticket = _rateLimitQueue.then(() => _consumeToken());
  _rateLimitQueue = ticket.catch(() => {}); // swallow so chain doesn't break
  return ticket;
}

/** Internal: consume one token, waiting if none available. NOT safe to call concurrently — use waitForRateLimit(). */
async function _consumeToken(): Promise<void> {
  const now = Date.now();
  const elapsed = (now - RATE_LIMIT.lastRefill) / 1000;
  RATE_LIMIT.tokens = Math.min(RATE_LIMIT.maxTokens, RATE_LIMIT.tokens + elapsed * RATE_LIMIT.refillRate);
  RATE_LIMIT.lastRefill = now;

  if (RATE_LIMIT.tokens >= 1) {
    RATE_LIMIT.tokens -= 1;
    return;
  }

  // Wait until a token is available
  const waitMs = Math.ceil(((1 - RATE_LIMIT.tokens) / RATE_LIMIT.refillRate) * 1000);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  RATE_LIMIT.tokens = 0;
  RATE_LIMIT.lastRefill = Date.now();
}

const MAX_RETRIES = 4;

async function sendMail(mailOptions: LegacyMailOptions) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const from = (mailOptions.from || DEFAULT_FROM).trim();
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Wait for rate limit token before each attempt
    await waitForRateLimit();

    try {
      const { error } = await resend.emails.send({
        from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        ...(mailOptions.text ? { text: mailOptions.text } : {}),
        ...(mailOptions.html ? { html: mailOptions.html } : {}),
        replyTo: DEFAULT_REPLY_TO,
      } as Parameters<typeof resend.emails.send>[0]);

      if (!error) return; // success

      lastError = error.message;

      // Check if this is a retryable error
      const msg = (error.message || '').toLowerCase();
      const isRetryable = msg.includes('rate') || msg.includes('429') ||
                          msg.includes('too many') || msg.includes('timeout') ||
                          msg.includes('temporarily') || msg.includes('5');

      if (!isRetryable || attempt >= MAX_RETRIES) {
        throw new Error(error.message);
      }

      const backoffMs = Math.min(1000 * Math.pow(2, attempt + 1), 16000); // 2s, 4s, 8s, 16s
      console.warn(`[sendMail] Retryable error to=${mailOptions.to} (attempt ${attempt + 1}/${MAX_RETRIES}): ${error.message}. Retrying in ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    } catch (networkErr) {
      // Catch network / fetch errors (ECONNRESET, ETIMEDOUT, etc.)
      lastError = networkErr instanceof Error ? networkErr.message : String(networkErr);

      if (attempt >= MAX_RETRIES) {
        throw networkErr;
      }

      const backoffMs = Math.min(1000 * Math.pow(2, attempt + 1), 16000);
      console.warn(`[sendMail] Network error to=${mailOptions.to} (attempt ${attempt + 1}/${MAX_RETRIES}): ${lastError}. Retrying in ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw new Error(lastError || 'sendMail failed after all retries');
}

// Email logo HTML - use absolute URL (more compatible than CID across providers)
const EMAIL_LOGO_HTML = `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td align="center" style="padding-bottom: 40px;">
      <img src="${SITE_URL}/logo-white.png" alt="FibAlgo" width="200" style="display: block; width: 200px; height: auto; max-width: 100%;" />
    </td>
  </tr>
</table>`;

// Smaller version for notification emails
const EMAIL_LOGO_SMALL_HTML = `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
  <tr>
    <td align="center" style="padding-bottom: 28px;">
      <img src="${SITE_URL}/logo-white.png" alt="FibAlgo" width="150" style="display: block; width: 150px; height: auto; max-width: 100%;" />
    </td>
  </tr>
</table>`;

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: "FibAlgo — Reset your password",
    text: `You requested a password reset for your FibAlgo account. Use the link below to set a new password. This link expires in 24 hours. If you did not request this, you can safely ignore this email.\n\n${resetLink}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Logo -->
        ${EMAIL_LOGO_HTML}
        <!-- Main Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #1E2329; border-radius: 8px;">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 24px; color: #EAECEF; font-size: 20px; font-weight: 600; text-align: center;">Reset your password</h1>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                We received a request to reset the password for your FibAlgo account. Click the button below to set a new password. This link is valid for 24 hours.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 12px 32px; background: #00F5FF; color: #000000; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 4px;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #2B3139; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px; color: #848E9C; font-size: 12px;">Security</p>
                    <ul style="margin: 0; padding-left: 16px; color: #848E9C; font-size: 12px; line-height: 1.6;">
                      <li>This link expires in 24 hours</li>
                      <li>If you did not request this, you can ignore this email</li>
                      <li>Do not share this link with anyone</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}

// Password reset with 6-digit code (faster than link)
export async function sendPasswordResetCodeEmail(email: string, code: string) {
  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: "FibAlgo — Your password reset code",
    text: `Your FibAlgo password reset code is: ${code}. This code expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Logo -->
        ${EMAIL_LOGO_HTML}
        <!-- Main Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #1E2329; border-radius: 8px;">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 24px; color: #EAECEF; font-size: 20px; font-weight: 600; text-align: center;">Your password reset code</h1>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7; text-align: center;">
                Enter this code in the app to set a new password. It expires in 10 minutes.
              </p>
              <!-- Code Display -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 16px 0 32px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%); padding: 3px; border-radius: 8px;">
                      <div style="background: #1E2329; padding: 16px 32px; border-radius: 6px;">
                        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #00F5FF; font-family: 'Courier New', monospace;">${code}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #2B3139; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px; color: #848E9C; font-size: 12px;">Security</p>
                    <ul style="margin: 0; padding-left: 16px; color: #848E9C; font-size: 12px; line-height: 1.6;">
                      <li>This code expires in 10 minutes</li>
                      <li>If you did not request this, you can ignore this email</li>
                      <li>Do not share this code with anyone</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}

export async function sendPasswordChangedNotification(email: string, name?: string | null) {
  const displayName = name || 'there';
  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: 'FibAlgo — Your password was changed',
    text: `Hi ${displayName}, the password for your FibAlgo account was changed. If you did not make this change, please reset your password and contact support.`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Logo -->
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #1E2329; border-radius: 8px;">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; color: #EAECEF; font-size: 20px; font-weight: 600; text-align: center;">Password Changed</h1>
              <p style="margin: 0 0 20px; color: #848E9C; font-size: 14px; line-height: 1.7;">Hi ${displayName},</p>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                Your FibAlgo account password was changed. If you did not make this change, reset your password immediately and contact support.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #2B3139; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px; color: #848E9C; font-size: 12px;">Security Notice:</p>
                    <ul style="margin: 0; padding-left: 16px; color: #848E9C; font-size: 12px; line-height: 1.6;">
                      <li>If this wasn’t you, reset your password right away</li>
                      <li>Contact support if you need help securing your account</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}

export async function sendVerificationEmail(email: string, verifyLink: string) {
  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: "FibAlgo — Verify your email address",
    text: `Welcome to FibAlgo. Please verify your email address by clicking the link below. This link expires in 24 hours.\n\n${verifyLink}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Logo -->
        ${EMAIL_LOGO_HTML}
        <!-- Main Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #1E2329; border-radius: 8px;">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 24px; color: #EAECEF; font-size: 20px; font-weight: 600; text-align: center;">Verify your email address</h1>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                Thank you for signing up for FibAlgo. Click the button below to verify your email and complete your account setup. This link expires in 24 hours.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${verifyLink}" target="_blank" style="display: inline-block; padding: 12px 32px; background: #00F5FF; color: #000000; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 4px;">Verify Email</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #2B3139; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px; color: #848E9C; font-size: 12px;">Note</p>
                    <ul style="margin: 0; padding-left: 16px; color: #848E9C; font-size: 12px; line-height: 1.6;">
                      <li>This link expires in 24 hours</li>
                      <li>If you did not create an account, you can ignore this email</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}

// Generate 6-digit verification code (cryptographically secure)
export function generateVerificationCode(): string {
  // 🔒 SECURITY: Use crypto.randomInt instead of Math.random for security
  const crypto = require('crypto');
  return crypto.randomInt(100000, 999999).toString();
}

// Send verification code for email/password change
export async function sendVerificationCodeEmail(
  email: string, 
  code: string, 
  type: 'email-change' | 'password-change',
  userName?: string,
  newEmail?: string
) {
  const isEmailChange = type === 'email-change';
  const title = isEmailChange ? 'Email Change Verification' : 'Password Change Verification';
  const description = isEmailChange 
    ? 'You requested to change your email address. Use the verification code below to confirm this action.'
    : 'You requested to change your password. Use the verification code below to confirm this action.';

  const newEmailSection = isEmailChange && newEmail ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #2B3139; border-radius: 4px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; text-align: center;">
                    <p style="margin: 0 0 4px; color: #848E9C; font-size: 12px;">New email address:</p>
                    <p style="margin: 0; color: #00F5FF; font-size: 16px; font-weight: 600;">${newEmail}</p>
                  </td>
                </tr>
              </table>
  ` : '';

  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: `${title}`,
    text: `Your FibAlgo verification code is: ${code}. This code expires in 3 minutes. If you didn't request this, ignore this email.`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Logo -->
        ${EMAIL_LOGO_HTML}
        <!-- Main Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #1E2329; border-radius: 8px;">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 24px; color: #EAECEF; font-size: 20px; font-weight: 600; text-align: center;">${title}</h1>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                ${description}
              </p>
              ${newEmailSection}
              <!-- Verification Code -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <div style="display: inline-block; background: #2B3139; border: 1px solid #00F5FF; border-radius: 8px; padding: 16px 32px;">
                      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #00F5FF;">${code}</span>
                    </div>
                  </td>
                </tr>
              </table>
              <!-- Security Notice -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #2B3139; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px; color: #848E9C; font-size: 12px;">Security Notice:</p>
                    <ul style="margin: 0; padding-left: 16px; color: #848E9C; font-size: 12px; line-height: 1.6;">
                      <li>This code expires in 3 minutes</li>
                      <li>Never share this code with anyone</li>
                      <li>FibAlgo will never ask for this code</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}

// Send email change notification to OLD email
export async function sendEmailChangedNotification(
  oldEmail: string,
  newEmail: string,
  userName?: string
) {
  const mailOptions = {
    from: DEFAULT_FROM,
    to: oldEmail,
    subject: "FibAlgo — Your email address was changed",
    text: `Hello${userName ? ` ${userName}` : ''}, the email address for your FibAlgo account was changed to ${newEmail}. If you did not make this change, please contact support.`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Logo -->
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #1E2329; border-radius: 8px;">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 24px; color: #EAECEF; font-size: 20px; font-weight: 600; text-align: center;">Email address changed</h1>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                The email address for your FibAlgo account was changed. If you did not make this change, please contact support.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #2B3139; border-radius: 4px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 8px; color: #848E9C; font-size: 12px;">Previous email:</p>
                    <p style="margin: 0 0 16px; color: #EAECEF; font-size: 14px;">${oldEmail}</p>
                    <p style="margin: 0 0 8px; color: #848E9C; font-size: 12px;">New email:</p>
                    <p style="margin: 0; color: #00F5FF; font-size: 14px; font-weight: 600;">${newEmail}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #3D2A2A; border: 1px solid #F87171; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: #F87171; font-size: 12px; font-weight: 600;">Security Alert</p>
                    <p style="margin: 8px 0 0; color: #FCA5A5; font-size: 12px; line-height: 1.6;">
                      If you did not make this change, your account may be compromised. Please contact our support team immediately.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}

// Send email change success notification to NEW email
export async function sendEmailChangeSuccessNotification(
  newEmail: string,
  userName?: string
) {
  const dashboardUrl = process.env.NEXT_PUBLIC_SITE_URL 
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
    : "https://fibalgo.com/dashboard";

  const mailOptions = {
    from: DEFAULT_FROM,
    to: newEmail,
    subject: "FibAlgo — Email address updated",
    text: `Hello${userName ? ` ${userName}` : ''}, the email address for your FibAlgo account is now ${newEmail}. You can use it to sign in. Dashboard: ${dashboardUrl}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Logo -->
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #1E2329; border-radius: 8px;">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 24px; color: #EAECEF; font-size: 20px; font-weight: 600; text-align: center;">Email address updated</h1>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                The email address for your FibAlgo account has been updated. You can now sign in with this address.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #1A3D2E 0%, #0D2818 100%); border: 1px solid #00F5FF; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #848E9C; font-size: 12px;">Your new email address:</p>
                    <p style="margin: 0; color: #00F5FF; font-size: 16px; font-weight: 600;">${newEmail}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                You can now use this email address to log in to your FibAlgo account. All future communications will be sent to this email.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #00F5FF 0%, #00C8FF 100%); color: #000000; font-weight: 600; font-size: 14px; padding: 14px 48px; border-radius: 6px; text-decoration: none;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}

// Send welcome email after email verification
export async function sendWelcomeEmail(
  email: string,
  userName?: string
) {
  const dashboardUrl = process.env.NEXT_PUBLIC_SITE_URL 
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
    : "https://fibalgo.com/dashboard";

  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: "FibAlgo — Welcome",
    text: `Welcome to FibAlgo${userName ? `, ${userName}` : ''}. Your account is active. Sign in and explore the terminal: ${dashboardUrl}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Logo -->
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #1E2329; border-radius: 8px;">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px; color: #EAECEF; font-size: 26px; font-weight: 700; text-align: center;">Welcome to FibAlgo</h1>
              <p style="margin: 0 0 24px; color: #00F5FF; font-size: 14px; font-weight: 500; text-align: center; letter-spacing: 0.5px;">Trading terminal with Fibonacci-based analysis</p>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                Your FibAlgo account is ready. You can now access the terminal, set up alerts, and use our tools for your trading decisions.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #0D2818 0%, #1A3D2E 100%); border: 1px solid #00F5FF; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #00F5FF; font-size: 18px; font-weight: 700;">Your account is active</p>
                    <p style="margin: 0; color: #848E9C; font-size: 13px;">Sign in to access the FibAlgo terminal</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; color: #EAECEF; font-size: 14px; font-weight: 600;">What you can do:</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px; background: #2B3139; border-radius: 6px; margin-bottom: 12px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: #00F5FF; border-radius: 50%; text-align: center; line-height: 24px; color: #000; font-weight: bold; font-size: 12px;">1</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 4px; color: #EAECEF; font-size: 14px; font-weight: 600;">Professional-Grade Indicators</p>
                          <p style="margin: 0; color: #848E9C; font-size: 12px;">Advanced Fibonacci algorithms trusted by professional traders worldwide</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background: #2B3139; border-radius: 6px; margin-bottom: 12px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: #00F5FF; border-radius: 50%; text-align: center; line-height: 24px; color: #000; font-weight: bold; font-size: 12px;">2</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 4px; color: #EAECEF; font-size: 14px; font-weight: 600;">Seamless TradingView Integration</p>
                          <p style="margin: 0; color: #848E9C; font-size: 12px;">Connect directly with TradingView for real-time market analysis</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background: #2B3139; border-radius: 6px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <span style="display: inline-block; width: 24px; height: 24px; background: #00F5FF; border-radius: 50%; text-align: center; line-height: 24px; color: #000; font-weight: bold; font-size: 12px;">3</span>
                        </td>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 4px; color: #EAECEF; font-size: 14px; font-weight: 600;">FibAlgo Terminal Dashboard</p>
                          <p style="margin: 0; color: #848E9C; font-size: 12px;">Your command center for managing indicators, subscriptions, and settings</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #00F5FF 0%, #00C8FF 100%); color: #000000; font-weight: 600; font-size: 14px; padding: 14px 48px; border-radius: 6px; text-decoration: none;">Access FibAlgo Terminal</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #848E9C; font-size: 12px;">Welcome to the future of trading</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}

// Send access-granted email for crypto payments
export async function sendCryptoAccessEmail(
  email: string,
  userName?: string,
  plan?: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibalgo.com';
  const dashboardUrl = `${baseUrl}/dashboard`;
  const libraryUrl = `${baseUrl}/library`;

  const nicePlan = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'your plan';

  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: 'FibAlgo — TradingView access is live',
    text: `Your TradingView indicators are now unlocked${userName ? `, ${userName}` : ''}. ${nicePlan} is active. Open the terminal: ${dashboardUrl}. For indicator details visit the library: ${libraryUrl}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #12151c; border-radius: 10px; border: 1px solid #1f2530; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; color: #EAECEF; font-size: 24px; font-weight: 700; text-align: center;">TradingView access granted</h1>
              <p style="margin: 0 0 10px; color: #00F5FF; font-size: 14px; font-weight: 600; text-align: center;">${nicePlan} indicators are unlocked</p>
              <p style="margin: 0 0 18px; color: #9CA3AF; font-size: 14px; line-height: 1.7; text-align: center;">
                Hello${userName ? ` ${userName}` : ''}, your TradingView indicators are now active. Add your TradingView username in FibAlgo Terminal and start using all indicators immediately.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 18px;">
                <tr>
                  <td style="padding: 14px 16px; background: linear-gradient(135deg, #0E1A26 0%, #0B2A33 100%); border: 1px solid #00F5FF; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; color: #EAECEF; font-size: 14px; font-weight: 600;">Ready to apply the indicators</p>
                    <p style="margin: 6px 0 0; color: #9CA3AF; font-size: 12px;">Manage your TradingView access and alerts inside the terminal</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 18px;">
                <tr>
                  <td style="padding: 12px 14px; background: #1B202A; border-radius: 6px; color: #EAECEF; font-size: 13px; line-height: 1.6;">
                    <strong style="color: #00F5FF;">Next steps:</strong><br>
                    • Open FibAlgo Terminal and add your TradingView username under Settings.<br>
                    • Load the FibAlgo indicators on your TradingView charts.<br>
                    • Review the Library to see usage tips and strategy notes.
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 14px;">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #00F5FF 0%, #00C8FF 100%); color: #000; font-weight: 700; font-size: 14px; padding: 14px 44px; border-radius: 8px; text-decoration: none;">Open FibAlgo Terminal</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${libraryUrl}" style="display: inline-block; background: #1B202A; color: #EAECEF; font-weight: 600; font-size: 13px; padding: 12px 30px; border-radius: 8px; border: 1px solid #2A313D; text-decoration: none;">View Indicator Library</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 0; color: #4B5563; font-size: 12px; text-align: center;">If you need anything, reply to this email — we usually respond fast.</p>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION EMAIL SYSTEM
// ═══════════════════════════════════════════════════════════════

export type NotificationType = 'price_alert' | 'calendar' | 'news' | 'signal' | 'system';

interface NotificationEmailData {
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, unknown>;
}

/** Escape user content for safe use in HTML to avoid broken layout and XSS */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Get icon and color based on notification type
function getNotificationStyle(type: NotificationType, metadata?: Record<string, unknown>): { icon: string; color: string; bgColor: string; typeLabel: string } {
  switch (type) {
    case 'price_alert':
      return { icon: '●', color: '#00F5FF', bgColor: '#0A2E3D', typeLabel: 'Price Alert' };
    case 'calendar':
      return { icon: '■', color: '#F0B429', bgColor: '#3D320A', typeLabel: 'Economic Calendar' };
    case 'news':
      return { icon: '▲', color: '#E8534C', bgColor: '#3D1A1A', typeLabel: 'Market News' };
    case 'signal':
      const signal = metadata?.signal as string;
      if (signal === 'STRONG_BUY' || signal === 'BUY') {
        return { icon: '↗', color: '#00C853', bgColor: '#0A2E1A', typeLabel: 'Trading Signal' };
      } else if (signal === 'STRONG_SELL' || signal === 'SELL') {
        return { icon: '↘', color: '#E53935', bgColor: '#3D1A1A', typeLabel: 'Trading Signal' };
      }
      return { icon: '◆', color: '#F0B429', bgColor: '#3D320A', typeLabel: 'Trading Signal' };
    case 'system':
    default:
      return { icon: '●', color: '#848E9C', bgColor: '#2B3139', typeLabel: 'Notification' };
  }
}

// Send notification email — professional layout and copy
export async function sendNotificationEmail(
  email: string,
  data: NotificationEmailData
): Promise<boolean> {
  try {
    const { icon, color, bgColor, typeLabel } = getNotificationStyle(data.type, data.metadata);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibalgo.com';
    const actionUrl = data.actionUrl ? `${siteUrl}${data.actionUrl}` : `${siteUrl}/terminal`;
    const actionText = data.actionText || 'Open in FibAlgo';
    const prefsUrl = `${siteUrl}/dashboard`;

    const mailOptions = {
      from: DEFAULT_FROM,
      to: email,
      subject: `FibAlgo — ${data.title}`,
      text: [
        data.title,
        '',
        typeLabel,
        '',
        data.message.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        '',
        actionText + ': ' + actionUrl,
        '',
        '— FibAlgo',
        'Manage notification preferences: ' + prefsUrl,
      ].join('\n'),
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(data.title)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0D0D0D; -webkit-font-smoothing: antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #0D0D0D;">
    <tr>
      <td style="padding: 32px 24px 40px;">
        <!-- Header -->
        ${EMAIL_LOGO_SMALL_HTML}
        <!-- Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #1A1D21; border-radius: 12px; overflow: hidden; border: 1px solid #2B3139;">
          <tr>
            <td style="background: ${bgColor}; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06);">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 24px; line-height: 1;">${icon}</span>
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <p style="margin: 0 0 2px; color: rgba(255,255,255,0.6); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${typeLabel}</p>
                    <h1 style="margin: 0; color: ${color}; font-size: 17px; font-weight: 600; line-height: 1.3;">${escapeHtml(data.title)}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 20px; color: #FFFFFF; font-size: 15px; line-height: 1.6;">
                ${data.message}
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <a href="${actionUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; background: ${color}; color: #000; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px;">${actionText}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!-- Footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 16px 0;">
              <p style="margin: 0; color: #5C6370; font-size: 12px;">
                You received this email because you have notifications enabled in your FibAlgo account.
              </p>
              <p style="margin: 8px 0 0;">
                <a href="${prefsUrl}" style="color: #00F5FF; text-decoration: none; font-size: 12px;">Manage notification preferences</a>
              </p>
              <p style="margin: 20px 0 0; color: #3E434A; font-size: 11px;">&copy; ${new Date().getFullYear()} FibAlgo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    };

    await sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending notification email:', error);
    return false;
  }
}

// Send price alert email
export async function sendPriceAlertEmail(
  email: string,
  symbol: string,
  alertType: string,
  targetValue: number,
  currentValue: number
): Promise<boolean> {
  const alertTypeLabels: Record<string, string> = {
    'price_above': 'reached or exceeded your target',
    'price_below': 'fell to or below your target',
    'percent_change_up': 'increased by your specified percentage',
    'percent_change_down': 'decreased by your specified percentage'
  };
  const action = alertTypeLabels[alertType] || 'triggered your alert';
  const isPercent = alertType.includes('percent');
  const targetDisplay = isPercent ? `${targetValue}%` : `$${targetValue.toLocaleString()}`;
  const currentDisplay = `$${currentValue.toLocaleString()}`;

  return sendNotificationEmail(email, {
    type: 'price_alert',
    title: `Price Alert: ${symbol}`,
    message: `Your price alert for <strong>${escapeHtml(symbol)}</strong> has been triggered.<br/><br/><div style="background: rgba(0, 245, 255, 0.05); padding: 16px; border-radius: 8px; border-left: 3px solid #00F5FF;">The price has ${action} <strong>${escapeHtml(targetDisplay)}</strong><br/>Current price: <strong style="color: #00F5FF;">${escapeHtml(currentDisplay)}</strong></div>`,
    actionUrl: `/terminal/chart?symbol=${encodeURIComponent(symbol)}`,
    actionText: 'View Chart'
  });
}

// Send calendar reminder email
export async function sendCalendarReminderEmail(
  email: string,
  eventName: string,
  country: string,
  impact: string,
  minutesUntil: number
): Promise<boolean> {
  const impactLabel = impact.charAt(0).toUpperCase() + impact.slice(1);
  const impactColor = impact === 'high' ? '#E53935' : impact === 'medium' ? '#F0B429' : '#00C853';

  return sendNotificationEmail(email, {
    type: 'calendar',
    title: `Economic Calendar: ${escapeHtml(eventName)}`,
    message: `An important economic event is starting in <strong>${minutesUntil} minutes</strong>.<br/><br/><div style="background: rgba(240, 180, 41, 0.05); padding: 16px; border-radius: 8px; border-left: 3px solid ${impactColor};"><strong style="color: #EAECEF;">${escapeHtml(eventName)}</strong><br/>Country: ${escapeHtml(country)}<br/>Impact Level: <strong style="color: ${impactColor};">${impactLabel}</strong></div>`,
    actionUrl: '/terminal/calendar',
    actionText: 'View Economic Calendar'
  });
}

// Display labels for news categories (backend may send macro, central_bank, etc.)
const NEWS_CATEGORY_LABELS: Record<string, string> = {
  crypto: 'Cryptocurrency',
  cryptocurrency: 'Cryptocurrency',
  forex: 'Forex',
  stocks: 'Stocks',
  equities: 'Stocks',
  commodities: 'Commodities',
  indices: 'Indices',
  economic: 'Economic / Macro',
  macro: 'Economic / Macro',
  central_bank: 'Central Bank',
  fed: 'Central Bank',
  ecb: 'Central Bank',
  geopolitical: 'Geopolitical',
  politics: 'Geopolitical',
  general: 'General'
};

// Send news notification email
export async function sendNewsNotificationEmail(
  email: string,
  title: string,
  category: string,
  isBreaking: boolean
): Promise<boolean> {
  const categoryLabel = NEWS_CATEGORY_LABELS[category?.toLowerCase()] || category?.charAt(0).toUpperCase() + (category?.slice(1) || '');
  const safeTitle = escapeHtml(title);
  const emailTitle = isBreaking ? `Breaking News: ${categoryLabel}` : `${categoryLabel} Market Update`;
  const message = isBreaking
    ? `<strong style="color: #E8534C; text-transform: uppercase; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">Breaking News</strong><br/><br/>${safeTitle}`
    : `A new ${categoryLabel.toLowerCase()} update is available:<br/><br/>${safeTitle}`;

  return sendNotificationEmail(email, {
    type: 'news',
    title: emailTitle,
    message,
    actionUrl: '/terminal/news',
    actionText: 'View Latest News'
  });
}

// Send signal notification email
export async function sendSignalNotificationEmail(
  email: string,
  signal: 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL',
  symbol: string,
  summary: string
): Promise<boolean> {
  const signalColors: Record<string, string> = {
    'STRONG_BUY': '#00C853',
    'BUY': '#00E5FF',
    'SELL': '#F0B429',
    'STRONG_SELL': '#E53935'
  };
  const signalLabels: Record<string, string> = {
    'STRONG_BUY': 'Strong Buy',
    'BUY': 'Buy',
    'SELL': 'Sell',
    'STRONG_SELL': 'Strong Sell'
  };
  const safeSymbol = escapeHtml(symbol);
  const safeSummary = escapeHtml(summary);

  return sendNotificationEmail(email, {
    type: 'signal',
    title: `Trading Signal: ${safeSymbol}`,
    message: `A new <strong style="color: ${signalColors[signal]};">${signalLabels[signal]}</strong> signal has been generated for <strong>${safeSymbol}</strong>.<br/><br/><div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; margin: 12px 0; border-left: 3px solid ${signalColors[signal]};">${safeSummary}</div>`,
    actionUrl: `/terminal/chart?symbol=${encodeURIComponent(symbol)}`,
    actionText: 'View Analysis',
    metadata: { signal }
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
//  SUBSCRIPTION LIFECYCLE EMAILS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send email when a subscription is activated (payment.made / payment.trial)
 */
export async function sendSubscriptionActivatedEmail(
  email: string,
  userName?: string,
  plan?: string,
  expiresAt?: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibalgo.com';
  const dashboardUrl = `${baseUrl}/dashboard`;
  const nicePlan = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Premium';
  const expiryText = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '30 days from now';

  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: `FibAlgo — ${nicePlan} Plan Activated`,
    text: `Hello${userName ? ` ${userName}` : ''}, your FibAlgo ${nicePlan} Plan is now active. Your access is valid until ${expiryText}. Visit your dashboard: ${dashboardUrl}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #12151c; border-radius: 10px; border: 1px solid #1f2530; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; color: #EAECEF; font-size: 24px; font-weight: 700; text-align: center;">Subscription Activated 🎉</h1>
              <p style="margin: 0 0 24px; color: #00F5FF; font-size: 14px; font-weight: 600; text-align: center;">${nicePlan} Plan is now active</p>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                Thank you for subscribing to FibAlgo. Your <strong style="color: #EAECEF;">${nicePlan} Plan</strong> has been successfully activated.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px; background: linear-gradient(135deg, #0D2818 0%, #1A3D2E 100%); border: 1px solid #00F5FF; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 6px; color: #00F5FF; font-size: 18px; font-weight: 700;">${nicePlan} Plan</p>
                    <p style="margin: 0; color: #9CA3AF; font-size: 13px;">Active until ${expiryText}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px; background: #1B202A; border-radius: 6px; color: #EAECEF; font-size: 13px; line-height: 1.7;">
                    <strong style="color: #00F5FF;">What's included:</strong><br>
                    • Full access to the FibAlgo Terminal<br>
                    • Advanced Fibonacci-based indicators and analysis<br>
                    • Real-time alerts and notifications<br>
                    ${plan === 'ultimate' ? '• TradingView indicator access (granted separately)<br>' : ''}
                    • Priority support
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #00F5FF 0%, #00C8FF 100%); color: #000000; font-weight: 600; font-size: 14px; padding: 14px 48px; border-radius: 6px; text-decoration: none;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}


/**
 * Send email when payment fails and user is downgraded to basic
 */
export async function sendPaymentFailedEmail(
  email: string,
  userName?: string,
  previousPlan?: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibalgo.com';
  const pricingUrl = `${baseUrl}/pricing`;
  const nicePlan = previousPlan ? previousPlan.charAt(0).toUpperCase() + previousPlan.slice(1) : 'paid';

  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: 'FibAlgo — Payment Failed',
    text: `Hello${userName ? ` ${userName}` : ''}, your recent payment for FibAlgo ${nicePlan} Plan could not be processed. Your account has been downgraded to the Basic plan. To restore your access, please update your payment method: ${pricingUrl}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #12151c; border-radius: 10px; border: 1px solid #1f2530; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; color: #EAECEF; font-size: 24px; font-weight: 700; text-align: center;">Payment Failed</h1>
              <p style="margin: 0 0 24px; color: #F0B429; font-size: 14px; font-weight: 600; text-align: center;">Your subscription has been downgraded</p>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                We were unable to process your payment for the <strong style="color: #EAECEF;">${nicePlan} Plan</strong>. As a result, your account has been automatically downgraded to the <strong style="color: #EAECEF;">Basic Plan</strong>.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px; background: linear-gradient(135deg, #2A1A0A 0%, #3D2A0E 100%); border: 1px solid #F0B429; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 6px; color: #F0B429; font-size: 16px; font-weight: 700;">${nicePlan} → Basic</p>
                    <p style="margin: 0; color: #9CA3AF; font-size: 13px;">Your premium features are no longer available</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                If you believe this is an error, please check your payment method and try again. You can resubscribe at any time to restore your access.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${pricingUrl}" style="display: inline-block; background: linear-gradient(135deg, #00F5FF 0%, #00C8FF 100%); color: #000000; font-weight: 600; font-size: 14px; padding: 14px 48px; border-radius: 6px; text-decoration: none;">Resubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}


/**
 * Send email when a refund is processed
 */
export async function sendRefundProcessedEmail(
  email: string,
  userName?: string,
  plan?: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibalgo.com';
  const pricingUrl = `${baseUrl}/pricing`;
  const nicePlan = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'paid';

  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: 'FibAlgo — Refund Processed',
    text: `Hello${userName ? ` ${userName}` : ''}, your refund for FibAlgo ${nicePlan} Plan has been processed. Your account has been moved to the Basic plan. You can resubscribe anytime: ${pricingUrl}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #12151c; border-radius: 10px; border: 1px solid #1f2530; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; color: #EAECEF; font-size: 24px; font-weight: 700; text-align: center;">Refund Processed</h1>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; font-weight: 600; text-align: center;">Your subscription has been cancelled</p>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                Your refund for the <strong style="color: #EAECEF;">${nicePlan} Plan</strong> has been processed. Your account has been moved to the <strong style="color: #EAECEF;">Basic Plan</strong>.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px; background: #1B202A; border: 1px solid #2B3139; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 6px; color: #EAECEF; font-size: 16px; font-weight: 700;">Refund Completed</p>
                    <p style="margin: 0; color: #9CA3AF; font-size: 13px;">The refund will appear in your account within 5–10 business days</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                We're sorry to see you go. If you change your mind, you're always welcome to resubscribe.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${pricingUrl}" style="display: inline-block; background: linear-gradient(135deg, #00F5FF 0%, #00C8FF 100%); color: #000000; font-weight: 600; font-size: 14px; padding: 14px 48px; border-radius: 6px; text-decoration: none;">View Plans</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}


/**
 * Send email when a subscription is cancelled (user keeps access until period ends)
 */
export async function sendSubscriptionCancelledEmail(
  email: string,
  userName?: string,
  plan?: string,
  accessUntil?: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibalgo.com';
  const dashboardUrl = `${baseUrl}/dashboard`;
  const nicePlan = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'paid';
  const accessUntilText = accessUntil
    ? new Date(accessUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'the end of your current billing period';

  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: 'FibAlgo — Subscription Cancelled',
    text: `Hello${userName ? ` ${userName}` : ''}, your FibAlgo ${nicePlan} Plan subscription has been cancelled. You will continue to have access until ${accessUntilText}. After that, your account will be moved to the Basic plan.`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #12151c; border-radius: 10px; border: 1px solid #1f2530; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; color: #EAECEF; font-size: 24px; font-weight: 700; text-align: center;">Subscription Cancelled</h1>
              <p style="margin: 0 0 24px; color: #F0B429; font-size: 14px; font-weight: 600; text-align: center;">Your renewal has been stopped</p>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                Your <strong style="color: #EAECEF;">${nicePlan} Plan</strong> subscription has been cancelled. You will still have full access to all your ${nicePlan} features until the end of your current period.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px; background: linear-gradient(135deg, #2A1A0A 0%, #3D2A0E 100%); border: 1px solid #F0B429; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 6px; color: #F0B429; font-size: 16px; font-weight: 700;">Access until ${accessUntilText}</p>
                    <p style="margin: 0; color: #9CA3AF; font-size: 13px;">After this date, your account will be moved to Basic</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                You can continue using all features of your ${nicePlan} Plan until your access expires. If you change your mind, you can resubscribe at any time.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #00F5FF 0%, #00C8FF 100%); color: #000000; font-weight: 600; font-size: 14px; padding: 14px 48px; border-radius: 6px; text-decoration: none;">Go to Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}


/**
 * Send email when subscription expires (cron auto-downgrade)
 */
export async function sendSubscriptionExpiredEmail(
  email: string,
  userName?: string,
  previousPlan?: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibalgo.com';
  const pricingUrl = `${baseUrl}/pricing`;
  const nicePlan = previousPlan ? previousPlan.charAt(0).toUpperCase() + previousPlan.slice(1) : 'paid';

  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: 'FibAlgo — Subscription Expired',
    text: `Hello${userName ? ` ${userName}` : ''}, your FibAlgo ${nicePlan} Plan has expired. Your account has been moved to the Basic plan. Resubscribe anytime: ${pricingUrl}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #12151c; border-radius: 10px; border: 1px solid #1f2530; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; color: #EAECEF; font-size: 24px; font-weight: 700; text-align: center;">Subscription Expired</h1>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; font-weight: 600; text-align: center;">Your ${nicePlan} Plan access has ended</p>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                Your <strong style="color: #EAECEF;">${nicePlan} Plan</strong> subscription has expired and your account has been moved to the <strong style="color: #EAECEF;">Basic Plan</strong>.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px; background: #1B202A; border: 1px solid #2B3139; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 6px; color: #EAECEF; font-size: 16px; font-weight: 700;">${nicePlan} → Basic</p>
                    <p style="margin: 0; color: #9CA3AF; font-size: 13px;">Premium features are no longer available</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                Want to continue using FibAlgo with full access? Resubscribe to restore all your premium features instantly.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${pricingUrl}" style="display: inline-block; background: linear-gradient(135deg, #00F5FF 0%, #00C8FF 100%); color: #000000; font-weight: 600; font-size: 14px; padding: 14px 48px; border-radius: 6px; text-decoration: none;">Resubscribe Now</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}


/**
 * Send email when admin revokes TradingView access
 */
export async function sendTradingViewRevokedEmail(
  email: string,
  userName?: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibalgo.com';
  const supportUrl = `${baseUrl}/contact`;

  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: 'FibAlgo — TradingView Access Removed',
    text: `Hello${userName ? ` ${userName}` : ''}, your TradingView indicator access has been removed as your subscription no longer includes TradingView access. If you have questions, contact us: ${supportUrl}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #12151c; border-radius: 10px; border: 1px solid #1f2530; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; color: #EAECEF; font-size: 24px; font-weight: 700; text-align: center;">TradingView Access Removed</h1>
              <p style="margin: 0 0 24px; color: #E53935; font-size: 14px; font-weight: 600; text-align: center;">Your indicator access has been revoked</p>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                Your TradingView indicator access has been removed. This typically happens when your subscription changes and the new plan does not include TradingView integration.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px; background: linear-gradient(135deg, #2A0A0A 0%, #3D0E0E 100%); border: 1px solid #E53935; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 6px; color: #E53935; font-size: 16px; font-weight: 700;">Access Revoked</p>
                    <p style="margin: 0; color: #9CA3AF; font-size: 13px;">FibAlgo indicators are no longer available on your TradingView account</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                To regain TradingView indicator access, upgrade to the Ultimate Plan. If you believe this was done in error, please contact our support team.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${supportUrl}" style="display: inline-block; background: linear-gradient(135deg, #00F5FF 0%, #00C8FF 100%); color: #000000; font-weight: 600; font-size: 14px; padding: 14px 48px; border-radius: 6px; text-decoration: none;">Contact Support</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}


/**
 * Send email when admin manually downgrades user to basic
 */
export async function sendAdminDowngradeEmail(
  email: string,
  userName?: string,
  previousPlan?: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibalgo.com';
  const pricingUrl = `${baseUrl}/pricing`;
  const supportUrl = `${baseUrl}/dashboard/support`;
  const nicePlan = previousPlan ? previousPlan.charAt(0).toUpperCase() + previousPlan.slice(1) : 'paid';

  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: 'FibAlgo — Subscription Updated to Basic',
    text: `Hello${userName ? ` ${userName}` : ''}, your FibAlgo subscription has been updated. Your account is now on the Basic plan. If you have questions, contact our support team: ${supportUrl}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #12151c; border-radius: 10px; border: 1px solid #1f2530; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; color: #EAECEF; font-size: 24px; font-weight: 700; text-align: center;">Subscription Updated</h1>
              <p style="margin: 0 0 24px; color: #F0B429; font-size: 14px; font-weight: 600; text-align: center;">Your plan has been changed to Basic</p>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                Your FibAlgo subscription has been updated by our team. Your account has been moved from <strong style="color: #EAECEF;">${nicePlan} Plan</strong> to the <strong style="color: #EAECEF;">Basic Plan</strong>.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px; background: linear-gradient(135deg, #2A1A0A 0%, #3D2A0E 100%); border: 1px solid #F0B429; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 6px; color: #F0B429; font-size: 16px; font-weight: 700;">${nicePlan} → Basic</p>
                    <p style="margin: 0; color: #9CA3AF; font-size: 13px;">Premium features are no longer available</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                If you have any questions about this change, please contact our support team. You can also resubscribe at any time to restore your premium access.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${supportUrl}" style="display: inline-block; background: linear-gradient(135deg, #00F5FF 0%, #00C8FF 100%); color: #000000; font-weight: 600; font-size: 14px; padding: 14px 36px; border-radius: 6px; text-decoration: none;">Contact Support</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${pricingUrl}" style="display: inline-block; background: transparent; color: #00F5FF; font-weight: 600; font-size: 13px; padding: 10px 36px; border-radius: 6px; text-decoration: none; border: 1px solid #00F5FF;">View Plans</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Automated message</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}


/**
 * Send email when admin replies to a support ticket
 */
export async function sendTicketReplyEmail(
  email: string,
  userName?: string,
  ticketSubject?: string,
  replyMessage?: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibalgo.com';
  const supportUrl = `${baseUrl}/dashboard/support`;
  const safeSubject = ticketSubject || 'Your Support Ticket';
  // Truncate very long messages for email preview
  const previewMessage = replyMessage
    ? (replyMessage.length > 500 ? replyMessage.substring(0, 500) + '...' : replyMessage)
    : '';

  const mailOptions = {
    from: DEFAULT_FROM,
    to: email,
    subject: `FibAlgo Support — Re: ${safeSubject}`,
    text: `Hello${userName ? ` ${userName}` : ''}, FibAlgo Support has replied to your ticket "${safeSubject}". Message: ${previewMessage}. View the full conversation: ${supportUrl}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        ${EMAIL_LOGO_HTML}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #12151c; border-radius: 10px; border: 1px solid #1f2530; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; color: #EAECEF; font-size: 24px; font-weight: 700; text-align: center;">New Reply from Support</h1>
              <p style="margin: 0 0 24px; color: #00F5FF; font-size: 14px; font-weight: 600; text-align: center;">Re: ${safeSubject}</p>
              <p style="margin: 0 0 16px; color: #9CA3AF; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                Our support team has responded to your ticket:
              </p>
              ${previewMessage ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px; background: #1B202A; border-left: 3px solid #00F5FF; border-radius: 0 6px 6px 0;">
                    <p style="margin: 0 0 6px; color: #00F5FF; font-size: 12px; font-weight: 600;">FibAlgo Support</p>
                    <p style="margin: 0; color: #EAECEF; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${previewMessage}</p>
                  </td>
                </tr>
              </table>
              ` : ''}
              <p style="margin: 0 0 24px; color: #9CA3AF; font-size: 13px; line-height: 1.6;">
                Log in to your dashboard to view the full conversation and reply.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${supportUrl}" style="display: inline-block; background: linear-gradient(135deg, #00F5FF 0%, #00C8FF 100%); color: #000000; font-weight: 600; font-size: 14px; padding: 14px 48px; border-radius: 6px; text-decoration: none;">View Conversation</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding: 24px 0 0;">
              <p style="margin: 0; color: #474D57; font-size: 12px;">FibAlgo — Support Team</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; ${new Date().getFullYear()} FibAlgo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  await sendMail(mailOptions);
}
