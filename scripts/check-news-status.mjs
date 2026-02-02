// Haber analiz durumu kontrolü
const CRON_SECRET = process.env.CRON_SECRET || 'fibalgo-cron-secret-2026';

async function check() {
  console.log('News analiz durumu kontrol ediliyor...\n');
  try {
    const res = await fetch('http://localhost:3000/api/cron/analyze-news', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    if (data.message === 'All news already analyzed') {
      console.log('\n✅ Tüm haberler analiz edilmiş.');
    } else if (data.analyzed !== undefined) {
      console.log(`\n📊 Bu run: ${data.analyzed} analiz, ${data.inserted || 0} yeni insert`);
    }
  } catch (e) {
    console.error('Hata:', e.message);
  }
}

check();
