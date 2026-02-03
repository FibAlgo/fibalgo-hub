import { Resend } from 'resend';

// You'll need to add your Resend API key here or to .env.local
const resend = new Resend('re_123456789'); // Replace with actual Resend API key

// Professional email template functions (same as before)
function getNotificationStyle(type, metadata = {}) {
  switch (type) {
    case 'price_alert':
      return { icon: '●', color: '#00F5FF', bgColor: '#0A2E3D', typeLabel: 'Price Alert' };
    case 'calendar':
      return { icon: '■', color: '#F0B429', bgColor: '#3D320A', typeLabel: 'Economic Calendar' };
    case 'news':
      return { icon: '▲', color: '#E8534C', bgColor: '#3D1A1A', typeLabel: 'Market News' };
    case 'signal':
      const signal = metadata?.signal;
      if (signal === 'STRONG_BUY' || signal === 'BUY') {
        return { icon: '↗', color: '#00C853', bgColor: '#0A2E1A', typeLabel: 'Trading Signal' };
      } else if (signal === 'STRONG_SELL' || signal === 'SELL') {
        return { icon: '↘', color: '#E53935', bgColor: '#3D1A1A', typeLabel: 'Trading Signal' };
      }
      return { icon: '◆', color: '#F0B429', bgColor: '#3D320A', typeLabel: 'Trading Signal' };
    default:
      return { icon: '●', color: '#848E9C', bgColor: '#2B3139', typeLabel: 'Notification' };
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createEmailTemplate(data) {
  const { icon, color, bgColor, typeLabel } = getNotificationStyle(data.type, data.metadata);
  const siteUrl = 'https://fibalgo.com';
  const actionUrl = data.actionUrl ? `${siteUrl}${data.actionUrl}` : `${siteUrl}/terminal`;
  const actionText = data.actionText || 'Open in FibAlgo';
  const prefsUrl = `${siteUrl}/dashboard`;

  return `
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
            <td align="center" style="padding: 0 0 32px;">
              <img src="https://fibalgo.com/logo-white.svg" alt="FibAlgo" style="height: 32px; width: auto;">
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
</html>`;
}

async function sendResendTestEmails() {
  try {
    console.log('🚀 Starting Resend email template tests...\n');

    // 1. News Email Test
    const newsEmailData = {
      type: 'news',
      title: 'Breaking News: Crypto Market Update',
      message: `<strong style="color: #E8534C; text-transform: uppercase; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">Breaking News</strong><br/><br/>Bitcoin surges 15% after major institutional adoption announcement. Market analysts predict continued bullish momentum as regulatory clarity improves.`,
      actionUrl: '/terminal/news',
      actionText: 'View Latest News'
    };

    console.log('📰 Sending News Email via Resend...');
    const newsResult = await resend.emails.send({
      from: 'FibAlgo <noreply@fibalgo.com>',
      to: 'burakbagdatli06@gmail.com',
      subject: 'FibAlgo — Breaking News: Crypto Market Update',
      html: createEmailTemplate(newsEmailData)
    });
    console.log('✅ News email sent! ID:', newsResult.data?.id);

    // Wait 2 seconds between emails
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Signal Email Test
    const signalEmailData = {
      type: 'signal',
      title: 'Trading Signal: BTC/USD',
      message: `A new <strong style="color: #00C853;">Strong Buy</strong> signal has been generated for <strong>BTC/USD</strong>.<br/><br/><div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; margin: 12px 0; border-left: 3px solid #00C853;">Technical analysis shows strong bullish momentum with RSI oversold conditions and breaking key resistance levels. Entry recommended at current levels with tight stop-loss management.</div>`,
      actionUrl: '/terminal/chart?symbol=BTCUSD',
      actionText: 'View Analysis',
      metadata: { signal: 'STRONG_BUY' }
    };

    console.log('📈 Sending Signal Email via Resend...');
    const signalResult = await resend.emails.send({
      from: 'FibAlgo <noreply@fibalgo.com>',
      to: 'burakbagdatli06@gmail.com',
      subject: 'FibAlgo — Trading Signal: BTC/USD',
      html: createEmailTemplate(signalEmailData)
    });
    console.log('✅ Signal email sent! ID:', signalResult.data?.id);

    // Wait 2 seconds between emails
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Quick test email
    console.log('🔍 Sending simple test email via Resend...');
    const testResult = await resend.emails.send({
      from: 'FibAlgo Test <noreply@fibalgo.com>',
      to: 'burakbagdatli06@gmail.com',
      subject: 'FibAlgo Test Email via Resend - ' + new Date().toLocaleString('tr-TR'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #00F5FF;">✅ Resend Email Test</h2>
          <p>Bu email <strong>${new Date().toLocaleString('tr-TR')}</strong> tarihinde Resend API ile gönderildi.</p>
          <p>🎉 Profesyonel email şablonları test ediliyor!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Email delivery via Resend API</p>
        </div>
      `
    });
    console.log('✅ Test email sent! ID:', testResult.data?.id);

    console.log('\n🎉 All Resend emails sent successfully!');
    console.log('📧 Check your inbox: burakbagdatli06@gmail.com');

  } catch (error) {
    console.error('❌ Error sending Resend emails:', error);
    console.log('\n💡 Note: You need to add a valid Resend API key to use this service.');
    console.log('   1. Get your API key from https://resend.com');
    console.log('   2. Add RESEND_API_KEY to your .env.local file');
  }
}

sendResendTestEmails();