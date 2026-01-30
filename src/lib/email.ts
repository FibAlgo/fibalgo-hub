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
    subject: "Password Reset Request",
    text: `You requested a password reset for your FibAlgo account. Click this link to reset your password: ${resetLink} - This link expires in 24 hours. If you didn't request this, ignore this email.`,
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
              <h1 style="margin: 0 0 24px; color: #EAECEF; font-size: 20px; font-weight: 600; text-align: center;">Password Reset Request</h1>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                We received a request to reset the password for your FibAlgo account. Click the button below to proceed.
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
                    <p style="margin: 0 0 8px; color: #848E9C; font-size: 12px;">Security Notice:</p>
                    <ul style="margin: 0; padding-left: 16px; color: #848E9C; font-size: 12px; line-height: 1.6;">
                      <li>This link expires in 24 hours</li>
                      <li>If you didn't request this, ignore this email</li>
                      <li>Never share this link with anyone</li>
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
              <p style="margin: 0; color: #474D57; font-size: 12px;">This is an automated message from FibAlgo</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; 2026 FibAlgo. All rights reserved.</p>
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
    subject: "Password Reset Code",
    text: `Your FibAlgo password reset code is: ${code}. This code expires in 10 minutes. If you didn't request this, ignore this email.`,
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
              <h1 style="margin: 0 0 24px; color: #EAECEF; font-size: 20px; font-weight: 600; text-align: center;">Password Reset Code</h1>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7; text-align: center;">
                Use the following code to reset your password:
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
                    <p style="margin: 0 0 8px; color: #848E9C; font-size: 12px;">Security Notice:</p>
                    <ul style="margin: 0; padding-left: 16px; color: #848E9C; font-size: 12px; line-height: 1.6;">
                      <li>This code expires in 10 minutes</li>
                      <li>If you didn't request this, ignore this email</li>
                      <li>Never share this code with anyone</li>
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
              <p style="margin: 0; color: #474D57; font-size: 12px;">This is an automated message from FibAlgo</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; 2026 FibAlgo. All rights reserved.</p>
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
    subject: 'Your password was changed',
    text: `Hi ${displayName}, your FibAlgo account password was changed. If this wasn't you, please reset your password immediately and contact support.`,
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
              <p style="margin: 0; color: #474D57; font-size: 12px;">This is an automated message from FibAlgo</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; 2026 FibAlgo. All rights reserved.</p>
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
    subject: "Verify Your Email Address",
    text: `Welcome to FibAlgo. Please verify your email address by clicking this link: ${verifyLink} - This link will expire in 24 hours.`,
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
              <h1 style="margin: 0 0 24px; color: #EAECEF; font-size: 20px; font-weight: 600; text-align: center;">Verify Your Email Address</h1>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                Thank you for registering with FibAlgo. To complete your account setup and access all features, please verify your email address.
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
                    <p style="margin: 0 0 8px; color: #848E9C; font-size: 12px;">Important:</p>
                    <ul style="margin: 0; padding-left: 16px; color: #848E9C; font-size: 12px; line-height: 1.6;">
                      <li>This link expires in 24 hours</li>
                      <li>If you didn't create an account, ignore this email</li>
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
              <p style="margin: 0; color: #474D57; font-size: 12px;">This is an automated message from FibAlgo</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; 2026 FibAlgo. All rights reserved.</p>
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
              <p style="margin: 0; color: #474D57; font-size: 12px;">This is an automated message from FibAlgo</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; 2026 FibAlgo. All rights reserved.</p>
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
    subject: "Your Email Address Has Been Changed",
    text: `Hello${userName ? ` ${userName}` : ''}, your FibAlgo account email has been changed from ${oldEmail} to ${newEmail}. If you did not make this change, please contact support immediately.`,
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
              <h1 style="margin: 0 0 24px; color: #EAECEF; font-size: 20px; font-weight: 600; text-align: center;">Email Address Changed</h1>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                Your FibAlgo account email address has been successfully changed.
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
              <p style="margin: 0; color: #474D57; font-size: 12px;">This is an automated message from FibAlgo</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; 2026 FibAlgo. All rights reserved.</p>
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
    subject: "Your Email Address Has Been Successfully Updated",
    text: `Hello${userName ? ` ${userName}` : ''}, your FibAlgo account email has been successfully updated to ${newEmail}. You can now use this email to log in. Visit your dashboard: ${dashboardUrl}`,
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
              <h1 style="margin: 0 0 24px; color: #EAECEF; font-size: 20px; font-weight: 600; text-align: center;">Email Successfully Updated</h1>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                Great news! Your FibAlgo account email address has been successfully updated.
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
              <p style="margin: 0; color: #474D57; font-size: 12px;">This is an automated message from FibAlgo</p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; 2026 FibAlgo. All rights reserved.</p>
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
    subject: "Welcome to FibAlgo - The World's Most Advanced Trading Terminal",
    text: `Welcome to FibAlgo${userName ? `, ${userName}` : ''}! You've just joined the world's most advanced trading terminal with cutting-edge Fibonacci-based indicators. Your account is now active. Visit your dashboard: ${dashboardUrl}`,
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
              <p style="margin: 0 0 24px; color: #00F5FF; font-size: 14px; font-weight: 500; text-align: center; text-transform: uppercase; letter-spacing: 1px;">The World's Most Advanced Trading Terminal</p>
              <p style="margin: 0 0 24px; color: #848E9C; font-size: 14px; line-height: 1.7;">
                Hello${userName ? ` ${userName}` : ''},<br><br>
                Congratulations! You've just joined an elite community of traders who use the most powerful Fibonacci-based trading indicators in the market.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #0D2818 0%, #1A3D2E 100%); border: 1px solid #00F5FF; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #00F5FF; font-size: 18px; font-weight: 700;">Your Account is Now Active</p>
                    <p style="margin: 0; color: #848E9C; font-size: 13px;">Access the FibAlgo Terminal and unlock your trading potential</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; color: #EAECEF; font-size: 14px; font-weight: 600;">What makes FibAlgo Terminal special:</p>
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
              <p style="margin: 8px 0 0; color: #474D57; font-size: 12px;">&copy; 2026 FibAlgo. All rights reserved.</p>
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

// Get icon and color based on notification type
function getNotificationStyle(type: NotificationType, metadata?: Record<string, unknown>): { icon: string; color: string; bgColor: string } {
  switch (type) {
    case 'price_alert':
      return { icon: '🎯', color: '#00F5FF', bgColor: '#0A3D3D' };
    case 'calendar':
      return { icon: '📅', color: '#FFD700', bgColor: '#3D3A0A' };
    case 'news':
      return { icon: '📰', color: '#FF6B6B', bgColor: '#3D0A0A' };
    case 'signal':
      const signal = metadata?.signal as string;
      if (signal === 'STRONG_BUY' || signal === 'BUY') {
        return { icon: '📈', color: '#00FF88', bgColor: '#0A3D1A' };
      } else if (signal === 'STRONG_SELL' || signal === 'SELL') {
        return { icon: '📉', color: '#FF4444', bgColor: '#3D0A0A' };
      }
      return { icon: '⚡', color: '#FFD700', bgColor: '#3D3A0A' };
    case 'system':
    default:
      return { icon: '🔔', color: '#848E9C', bgColor: '#2B3139' };
  }
}

// Send notification email
export async function sendNotificationEmail(
  email: string,
  data: NotificationEmailData
): Promise<boolean> {
  try {
    const { icon, color, bgColor } = getNotificationStyle(data.type, data.metadata);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fibalgo.com';
    const actionUrl = data.actionUrl ? `${siteUrl}${data.actionUrl}` : `${siteUrl}/terminal`;
    const actionText = data.actionText || 'View in FibAlgo';

    const mailOptions = {
      from: `"FibAlgo Alerts" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `${icon} ${data.title}`,
      text: `${data.title}\n\n${data.message}\n\nView more: ${actionUrl}`,
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
            <td align="center" style="padding-bottom: 32px;">
              <img src="${LOGO_URL}" alt="FibAlgo" style="height: 60px; width: auto;" />
            </td>
          </tr>
        </table>
        <!-- Main Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #1E2329; border-radius: 12px; overflow: hidden;">
          <!-- Colored Header -->
          <tr>
            <td style="background: ${bgColor}; padding: 24px 32px; border-bottom: 1px solid ${color}33;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 32px; line-height: 1;">${icon}</span>
                  </td>
                  <td style="padding-left: 16px;">
                    <h1 style="margin: 0; color: ${color}; font-size: 18px; font-weight: 600;">${data.title}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; color: #EAECEF; font-size: 15px; line-height: 1.7;">
                ${data.message}
              </p>
              <!-- Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: ${color}; color: #000000; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px;">${actionText}</a>
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
              <p style="margin: 0; color: #474D57; font-size: 11px;">
                You're receiving this because you enabled email notifications.
                <a href="${siteUrl}/dashboard" style="color: #00F5FF; text-decoration: none;">Manage preferences</a>
              </p>
              <p style="margin: 8px 0 0; color: #474D57; font-size: 11px;">&copy; 2026 FibAlgo. All rights reserved.</p>
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
    'price_above': 'rose above',
    'price_below': 'fell below',
    'percent_change_up': 'increased by',
    'percent_change_down': 'decreased by'
  };

  const action = alertTypeLabels[alertType] || 'reached';
  const isPercent = alertType.includes('percent');
  const targetDisplay = isPercent ? `${targetValue}%` : `$${targetValue.toLocaleString()}`;

  return sendNotificationEmail(email, {
    type: 'price_alert',
    title: `Price Alert: ${symbol}`,
    message: `<strong>${symbol}</strong> has ${action} your target of <strong>${targetDisplay}</strong>.<br/><br/>Current price: <strong style="color: #00F5FF;">$${currentValue.toLocaleString()}</strong>`,
    actionUrl: `/terminal/chart?symbol=${symbol}`,
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
  const impactEmoji = impact === 'high' ? '🔴' : impact === 'medium' ? '🟡' : '🟢';
  const impactLabel = impact.charAt(0).toUpperCase() + impact.slice(1);

  return sendNotificationEmail(email, {
    type: 'calendar',
    title: `${impactEmoji} Upcoming: ${eventName}`,
    message: `<strong>${eventName}</strong> (${country}) is starting in <strong>${minutesUntil} minutes</strong>.<br/><br/>Impact Level: <strong style="color: ${impact === 'high' ? '#FF4444' : impact === 'medium' ? '#FFD700' : '#00FF88'};">${impactLabel}</strong>`,
    actionUrl: '/terminal/calendar',
    actionText: 'View Calendar'
  });
}

// Send news notification email
export async function sendNewsNotificationEmail(
  email: string,
  title: string,
  category: string,
  isBreaking: boolean
): Promise<boolean> {
  const prefix = isBreaking ? '🚨 BREAKING: ' : '';
  
  return sendNotificationEmail(email, {
    type: 'news',
    title: `${prefix}${category} News`,
    message: isBreaking 
      ? `<strong style="color: #FF6B6B;">BREAKING NEWS</strong><br/><br/>${title}`
      : title,
    actionUrl: '/terminal/news',
    actionText: 'Read Full Story'
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
    'STRONG_BUY': '#00FF88',
    'BUY': '#00F5FF',
    'SELL': '#FFD700',
    'STRONG_SELL': '#FF4444'
  };

  const signalLabels: Record<string, string> = {
    'STRONG_BUY': 'Strong Buy',
    'BUY': 'Buy',
    'SELL': 'Sell',
    'STRONG_SELL': 'Strong Sell'
  };

  return sendNotificationEmail(email, {
    type: 'signal',
    title: `${signalLabels[signal]} Signal: ${symbol}`,
    message: `<strong style="color: ${signalColors[signal]};">${signalLabels[signal].toUpperCase()}</strong> signal detected for <strong>${symbol}</strong><br/><br/>${summary}`,
    actionUrl: `/terminal/chart?symbol=${symbol}`,
    actionText: 'View Analysis',
    metadata: { signal }
  });
}
