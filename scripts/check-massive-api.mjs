/**
 * Massive API yetki kontrolü – API anahtarınızın hangi endpoint'lere erişebildiğini test eder.
 * Kullanım: node scripts/check-massive-api.mjs
 * .env.local'dan MASSIVE_API_KEY okunur.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
let key = process.env.MASSIVE_API_KEY || '';
if (!key) {
  try {
    const content = readFileSync(envPath, 'utf8');
    const line = content.split('\n').find((l) => l.startsWith('MASSIVE_API_KEY='));
    if (line) key = line.replace(/^MASSIVE_API_KEY=/, '').replace(/^["']|["']$/g, '').trim();
  } catch (_) {}
}
if (!key) {
  console.error('MASSIVE_API_KEY bulunamadi (.env.local veya env)');
  process.exit(1);
}

const BASE = 'https://api.massive.com';

const endpoints = [
  {
    name: 'Benzinga News (projede kullanılıyor)',
    url: `${BASE}/benzinga/v2/news?apiKey=${key}&limit=1&published=${Math.floor(Date.now() / 1000) - 86400 * 7}&sort=published.desc`,
  },
  {
    name: 'Stocks – Dividends',
    url: `${BASE}/stocks/v1/dividends?apiKey=${key}&limit=1`,
  },
  {
    name: 'Stocks – Trades (AAPL)',
    url: `${BASE}/v3/trades/AAPL?apiKey=${key}&limit=1`,
  },
  {
    name: 'Stocks – Quotes (AAPL)',
    url: `${BASE}/v3/quotes/AAPL?apiKey=${key}&limit=1`,
  },
];

async function check() {
  console.log('Massive API yetki kontrolü\n');
  for (const { name, url } of endpoints) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const status = res.status;
      let detail = '';
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const count = data.results?.length ?? data.count ?? '-';
        detail = count !== '-' ? ` (${count} kayit)` : '';
      } else {
        const text = await res.text();
        if (text.length < 120) detail = ` – ${text}`;
        else detail = ` – ${text.slice(0, 80)}...`;
      }
      const ok = status >= 200 && status < 300;
      console.log(ok ? '  OK' : '  ERISIM YOK', status, name + detail);
    } catch (e) {
      console.log('  HATA', name, '–', e.message);
    }
  }
  console.log('\nOK = Bu endpoint icin yetkiniz var. ERISIM YOK = Planinizda yok veya anahtar gecersiz.');
}

check();
