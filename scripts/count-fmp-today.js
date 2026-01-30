// FMP bugün kaç haber döndü? (API'den canlı çekip publishedDate = bugün UTC sayar)
// Proje kökünden: node scripts/count-fmp-today.js

try {
  const fs = require('fs');
  const envPath = require('path').join(__dirname, '..', '.env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  env.split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
} catch (e) {}

// Cron route ile aynı fallback (sadece sayım için)
const FMP_API_KEY = process.env.FMP_API_KEY || 'mYPnFxJ5sBZfuurNLmdSkJLCGVbyFQte';
const FMP_BASE = 'https://financialmodelingprep.com/stable/news';

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function main() {
  const endpoints = [
    `${FMP_BASE}/forex?limit=50&apikey=${FMP_API_KEY}`,
    `${FMP_BASE}/crypto?limit=50&apikey=${FMP_API_KEY}`,
    `${FMP_BASE}/stock?limit=50&apikey=${FMP_API_KEY}`,
  ];

  const all = [];
  for (const url of endpoints) {
    const data = await fetchJson(url);
    all.push(...data);
  }

  const byUrl = new Map();
  all.forEach((a) => {
    if (a.url && !byUrl.has(a.url)) byUrl.set(a.url, a);
  });
  const unique = Array.from(byUrl.values());

  const todayUtc = new Date().toISOString().slice(0, 10);
  const yesterdayUtc = new Date(Date.now() - 864e5).toISOString().slice(0, 10);

  const todayCount = unique.filter((a) => (a.publishedDate || '').slice(0, 10) === todayUtc).length;
  const yesterdayCount = unique.filter((a) => (a.publishedDate || '').slice(0, 10) === yesterdayUtc).length;

  console.log('--- FMP haber sayıları (API’den çekilen son 50’şer / kategori) ---');
  console.log('Bugün (UTC ' + todayUtc + '):', todayCount);
  console.log('Dün (UTC):', yesterdayCount);
  console.log('Toplam benzersiz makale (çekilen):', unique.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
