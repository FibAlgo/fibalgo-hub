/**
 * FMP haber API - son haberin saatini kontrol eder.
 * Kullanım: node scripts/check-fmp-news.mjs
 * .env.local'dan FMP_API_KEY okunur (satir satir parse).
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
let key = process.env.FMP_API_KEY || '';
if (!key) {
  try {
    const content = readFileSync(envPath, 'utf8');
    const line = content.split('\n').find((l) => l.startsWith('FMP_API_KEY='));
    if (line) key = line.replace(/^FMP_API_KEY=/, '').replace(/^["']|["']$/g, '').trim();
  } catch (_) {}
}
if (!key) {
  console.error('FMP_API_KEY bulunamadi (.env.local veya env)');
  process.exit(1);
}

const FMP_BASE = 'https://financialmodelingprep.com/stable/news';
const urls = [
  `${FMP_BASE}/forex?limit=8&apikey=${key}`,
  `${FMP_BASE}/crypto?limit=8&apikey=${key}`,
  `${FMP_BASE}/stock?limit=8&apikey=${key}`,
];

function parseFmpMs(raw) {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!/Z|[+-]\d{2}:?\d{2}$/.test(s)) s = s.replace(/\s+/, 'T') + 'Z';
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

const now = Date.now();
let newest = null;
const all = [];

for (const url of urls) {
  const cat = url.includes('forex') ? 'forex' : url.includes('crypto') ? 'crypto' : 'stock';
  try {
    const r = await fetch(url, { cache: 'no-store' });
    const data = await r.json();
    if (!Array.isArray(data)) {
      console.error(cat, 'array degil:', typeof data);
      continue;
    }
    for (const item of data) {
      const raw = item.publishedDate ?? item.published_at ?? item.publishedAt;
      const ms = parseFmpMs(raw);
      const entry = {
        title: (item.title || '').slice(0, 70),
        category: cat,
        raw,
        ms,
        utc: ms ? new Date(ms).toISOString() : null,
        minutesAgo: ms ? Math.round((now - ms) / 60000) : null,
      };
      all.push(entry);
      if (ms && (!newest || ms > newest.ms)) newest = { ...entry, category: cat };
    }
  } catch (e) {
    console.error(cat, 'fetch error:', e.message);
  }
}

all.sort((a, b) => (b.ms ?? 0) - (a.ms ?? 0));

console.log('--- FMP Haber API - Son gelen haberler ---\n');
if (newest) {
  console.log('En yeni haber:');
  console.log('  Baslik:', newest.title);
  console.log('  Kategori:', newest.category);
  console.log('  FMP raw tarih:', newest.raw);
  console.log('  UTC:', newest.utc);
  console.log('  Yaklasik', newest.minutesAgo, 'dakika once\n');
}
console.log('Son 10 madde (yayin saatine gore):');
all.slice(0, 10).forEach((a, i) => {
  console.log(`  ${i + 1}. [${a.category}] ${a.minutesAgo != null ? a.minutesAgo + ' dk once' : 'tarih yok'} | ${a.title}`);
});
