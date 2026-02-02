import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: '45.151.248.68',
  port: 465,
  secure: true,
  auth: {
    user: 'noreply@fibalgo.com',
    pass: 'Baba33445566778899*',
  },
  tls: {
    servername: 'mail.fibalgo.com',
    rejectUnauthorized: false,
  },
  debug: true,
  logger: true,
});

async function sendTestEmail() {
  try {
    console.log('Connecting to SMTP server...');
    
    const info = await transporter.sendMail({
      from: '"FibAlgo Test" <noreply@fibalgo.com>',
      to: 'burakbagdatli06@gmail.com',
      subject: 'FibAlgo Test Email',
      text: 'Bu bir test emailidir. Mail sistemi çalışıyor!',
      html: '<h1>Test Email</h1><p>Bu bir test emailidir. Mail sistemi çalışıyor!</p>',
    });

    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

sendTestEmail();
