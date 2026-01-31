/**
 * FMP haber API: dün ve bugün (UTC) kaç haber dönmüş, günde ortalama ne kadar?
 * Çalıştır: node scripts/fmp-news-by-day.mjs
 * .env.local'de FMP_API_KEY gerekli
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://financialmodelingprep.com/stable/news';
const LIMIT = 250; // kategori başına max (FMP limiti ne ise o kadar döner)

function parseDotEnv(content) {
  const out = {};
  for (const line of String(content || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function parseTime(item) {
  const s = item?.publishedDate ?? item?.published_at ?? '';
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

function toUtcDateString(ms) {
  const d = new Date(ms);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function main() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local bulunamadı');
    process.exit(1);
  }
  const env = parseDotEnv(fs.readFileSync(envPath, 'utf8'));
  const apiKey = env.FMP_API_KEY || '';
  if (!apiKey) {
    console.error('FMP_API_KEY .env.local içinde yok');
    process.exit(1);
  }

  const endpoints = [
    { category: 'forex', url: `${BASE}/forex?limit=${LIMIT}&apikey=${apiKey}` },
    { category: 'crypto', url: `${BASE}/crypto?limit=${LIMIT}&apikey=${apiKey}` },
    { category: 'stocks', url: `${BASE}/stock?limit=${LIMIT}&apikey=${apiKey}` },
  ];

  const all = [];
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep.url, { cache: 'no-store' });
      if (!r.ok) {
        console.warn(ep.category, 'HTTP', r.status);
        continue;
      }
      const data = await r.json();
      if (Array.isArray(data)) {
        data.forEach((item) => all.push({ ...item, _category: ep.category }));
      }
    } catch (e) {
      console.warn(ep.category, e?.message || e);
    }
  }

  const byDay = {};
  let badDate = 0;
  for (const item of all) {
    const ms = parseTime(item);
    if (ms == null) {
      badDate++;
      continue;
    }
    const day = toUtcDateString(ms);
    byDay[day] = (byDay[day] || 0) + 1;
  }

  const now = new Date();
  const todayUtc = toUtcDateString(now.getTime());
  const yesterdayUtc = toUtcDateString(now.getTime() - 24 * 60 * 60 * 1000);

  const days = Object.keys(byDay).sort();
  const total = days.reduce((s, d) => s + byDay[d], 0);

  console.log('=== FMP News API (limit=' + LIMIT + ' per category) ===');
  console.log('Toplam dönen haber:', all.length, '(tarihi parse edilemeyen:', badDate + ')');
  console.log('Tarih aralığı (dönenler):', days[0] || '-', '→', days[days.length - 1] || '-');
  console.log('');
  console.log('Günlük dağılım (UTC):');
  days.forEach((d) => {
    const label = d === todayUtc ? ' [BUGÜN]' : d === yesterdayUtc ? ' [DÜN]' : '';
    console.log('  ', d, ':', byDay[d], label);
  });
  console.log('');
  console.log('Dün (UTC', yesterdayUtc + '):', byDay[yesterdayUtc] ?? 0);
  console.log('Bugün (UTC', todayUtc + '):', byDay[todayUtc] ?? 0);
  console.log('Dün + Bugün toplam:', (byDay[yesterdayUtc] ?? 0) + (byDay[todayUtc] ?? 0));
  if (days.length > 0) {
    const avgPerDay = (total / days.length).toFixed(1);
    console.log('Ortalama (dönen günlerde) günde:', avgPerDay, 'haber');
  }
  console.log('');
  console.log('Not: API kategori başına en fazla', LIMIT, 'haber döndürüyor. Gerçek günlük toplam daha fazla olabilir.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
