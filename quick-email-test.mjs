import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: '45.151.248.68',
  port: 465,
  secure: true,
  auth: { 
    user: 'noreply@fibalgo.com', 
    pass: 'Baba33445566778899*' 
  },
  tls: { 
    servername: 'mail.fibalgo.com', 
    rejectUnauthorized: false 
  }
});

console.log('🔍 Testing email delivery...');

const testEmail = {
  from: 'FibAlgo Test <noreply@fibalgo.com>',
  to: 'burakbagdatli06@gmail.com',
  subject: '📧 FibAlgo Email Test - ' + new Date().toLocaleString('tr-TR'),
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #00F5FF;">✅ Email System Test</h2>
      <p>Bu email <strong>${new Date().toLocaleString('tr-TR')}</strong> tarihinde gönderildi.</p>
      <p>Eğer bu email'i görüyorsan, email sistemi çalışıyor!</p>
      <hr>
      <p><strong>Test Details:</strong></p>
      <ul>
        <li>From: noreply@fibalgo.com</li>
        <li>To: burakbagdatli06@gmail.com</li>
        <li>Server: 45.151.248.68:465</li>
        <li>Time: ${new Date().toISOString()}</li>
      </ul>
      <p style="color: #666; font-size: 12px;">Lütfen spam/junk klasörünü de kontrol et!</p>
    </div>
  `
};

try {
  const result = await transporter.sendMail(testEmail);
  console.log('✅ Email sent successfully!');
  console.log('📧 Message ID:', result.messageId);
  console.log('🎯 Delivered to:', testEmail.to);
  console.log('\n💡 Check these locations:');
  console.log('   📥 Main inbox');
  console.log('   📧 Spam/Junk folder');
  console.log('   🗂️ Promotions tab (if using Gmail)');
  console.log('   ⚡ Updates tab (if using Gmail)');
} catch (error) {
  console.error('❌ Error:', error.message);
}