import nodemailer from "nodemailer";

const smtpPort = parseInt(process.env.SMTP_PORT || "465");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.resend.com",
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // TLS options for better compatibility
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  },
});

const LOGO_URL = process.env.NEXT_PUBLIC_SITE_URL 
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/logo.jpg`
  : "https://fibalgo.com/logo.jpg";

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const mailOptions = {
    from: `"FibAlgo" <${process.env.SMTP_USER}>`,
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <img src="${LOGO_URL}" alt="FibAlgo" style="height: 80px; width: auto;" />
            </td>
          </tr>
        </table>
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

  await transporter.sendMail(mailOptions);
}

// Password reset with 6-digit code (faster than link)
export async function sendPasswordResetCodeEmail(email: string, code: string) {
  const mailOptions = {
    from: `"FibAlgo" <${process.env.SMTP_USER}>`,
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <img src="${LOGO_URL}" alt="FibAlgo" style="height: 80px; width: auto;" />
            </td>
          </tr>
        </table>
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

  await transporter.sendMail(mailOptions);
}

export async function sendPasswordChangedNotification(email: string, name?: string | null) {
  const displayName = name || 'there';
  const mailOptions = {
    from: `"FibAlgo" <${process.env.SMTP_USER}>`,
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <img src="${LOGO_URL}" alt="FibAlgo" style="height: 80px; width: auto;" />
            </td>
          </tr>
        </table>
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

  await transporter.sendMail(mailOptions);
}

export async function sendVerificationEmail(email: string, verifyLink: string) {
  const mailOptions = {
    from: `"FibAlgo" <${process.env.SMTP_USER}>`,
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <img src="${LOGO_URL}" alt="FibAlgo" style="height: 80px; width: auto;" />
            </td>
          </tr>
        </table>
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

  await transporter.sendMail(mailOptions);
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
    from: `"FibAlgo" <${process.env.SMTP_USER}>`,
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <img src="${LOGO_URL}" alt="FibAlgo" style="height: 80px; width: auto;" />
            </td>
          </tr>
        </table>
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

  await transporter.sendMail(mailOptions);
}

// Send email change notification to OLD email
export async function sendEmailChangedNotification(
  oldEmail: string,
  newEmail: string,
  userName?: string
) {
  const mailOptions = {
    from: `"FibAlgo" <${process.env.SMTP_USER}>`,
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <img src="${LOGO_URL}" alt="FibAlgo" style="height: 80px; width: auto;" />
            </td>
          </tr>
        </table>
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

  await transporter.sendMail(mailOptions);
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
    from: `"FibAlgo" <${process.env.SMTP_USER}>`,
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <img src="${LOGO_URL}" alt="FibAlgo" style="height: 80px; width: auto;" />
            </td>
          </tr>
        </table>
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

  await transporter.sendMail(mailOptions);
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
    from: `"FibAlgo" <${process.env.SMTP_USER}>`,
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 40px;">
              <img src="${LOGO_URL}" alt="FibAlgo" style="height: 80px; width: auto;" />
            </td>
          </tr>
        </table>
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

  await transporter.sendMail(mailOptions);
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
      return { icon: '🎯', color: '#00F5FF', bgColor: '#0A2E3D', typeLabel: 'Price Alert' };
    case 'calendar':
      return { icon: '📅', color: '#F0B429', bgColor: '#3D320A', typeLabel: 'Economic Calendar' };
    case 'news':
      return { icon: '📰', color: '#E8534C', bgColor: '#3D1A1A', typeLabel: 'Market News' };
    case 'signal':
      const signal = metadata?.signal as string;
      if (signal === 'STRONG_BUY' || signal === 'BUY') {
        return { icon: '📈', color: '#00C853', bgColor: '#0A2E1A', typeLabel: 'Trading Signal' };
      } else if (signal === 'STRONG_SELL' || signal === 'SELL') {
        return { icon: '📉', color: '#E53935', bgColor: '#3D1A1A', typeLabel: 'Trading Signal' };
      }
      return { icon: '⚡', color: '#F0B429', bgColor: '#3D320A', typeLabel: 'Trading Signal' };
    case 'system':
    default:
      return { icon: '🔔', color: '#848E9C', bgColor: '#2B3139', typeLabel: 'Notification' };
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
      from: `"FibAlgo" <${process.env.SMTP_USER}>`,
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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <img src="${LOGO_URL}" alt="FibAlgo" width="120" height="auto" style="height: 48px; width: auto; display: block;" />
            </td>
          </tr>
        </table>
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
              <p style="margin: 0 0 20px; color: #B7BDC6; font-size: 15px; line-height: 1.6;">
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

    await transporter.sendMail(mailOptions);
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
    title: `Price alert triggered — ${symbol}`,
    message: `Your price alert for <strong style="color: #EAECEF;">${escapeHtml(symbol)}</strong> has been triggered. The price has ${action} (<strong>${escapeHtml(targetDisplay)}</strong>).<br/><br/>Current price: <strong style="color: #00F5FF;">${escapeHtml(currentDisplay)}</strong>`,
    actionUrl: `/terminal/chart?symbol=${encodeURIComponent(symbol)}`,
    actionText: 'View chart'
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
    title: `Economic event in ${minutesUntil} min — ${escapeHtml(eventName)}`,
    message: `Upcoming economic release: <strong style="color: #EAECEF;">${escapeHtml(eventName)}</strong> (${escapeHtml(country)}) in <strong>${minutesUntil} minutes</strong>.<br/><br/>Impact: <strong style="color: ${impactColor};">${impactLabel}</strong>`,
    actionUrl: '/terminal/calendar',
    actionText: 'Open economic calendar'
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
  const emailTitle = isBreaking ? `Breaking: ${categoryLabel}` : `${categoryLabel} — ${safeTitle.slice(0, 50)}${safeTitle.length > 50 ? '…' : ''}`;
  const message = isBreaking
    ? `<strong style="color: #E8534C;">Breaking</strong> — ${safeTitle}`
    : safeTitle;

  return sendNotificationEmail(email, {
    type: 'news',
    title: emailTitle,
    message,
    actionUrl: '/terminal/news',
    actionText: 'Read on FibAlgo'
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
    title: `${signalLabels[signal]} signal — ${safeSymbol}`,
    message: `A <strong style="color: ${signalColors[signal]};">${signalLabels[signal]}</strong> signal was generated for <strong style="color: #EAECEF;">${safeSymbol}</strong>.<br/><br/>${safeSummary}`,
    actionUrl: `/terminal/chart?symbol=${encodeURIComponent(symbol)}`,
    actionText: 'View analysis',
    metadata: { signal }
  });
}
