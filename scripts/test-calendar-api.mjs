/**
 * FMP takvim API testi — kaç event dönüyor?
 * Çalıştır: node scripts/test-calendar-api.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvLocal() {
  try {
    const content = readFileSync(join(root, '.env.local'), 'utf8');
    const keyLine = content.split('\n').find((l) => l.startsWith('FMP_API_KEY='));
    if (keyLine) {
      const value = keyLine.replace(/^FMP_API_KEY=/, '').trim().replace(/^["']|["']$/g, '');
      return value;
    }
  } catch (e) {
    console.error('.env.local okunamadı:', e.message);
  }
  return null;
}

const apiKey = loadEnvLocal();
if (!apiKey) {
  console.error('FMP_API_KEY .env.local içinde yok.');
  process.exit(1);
}

const from = '2025-01-20';
const to = '2025-02-10';

async function test(name, url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const raw = await res.json().catch(() => null);
    const isArray = Array.isArray(raw);
    const data = isArray ? raw : (raw?.data ?? []);
    const count = Array.isArray(data) ? data.length : 0;
    console.log(`${name}: HTTP ${res.status}, ${count} event (raw isArray: ${isArray})`);
    if (!res.ok && raw && typeof raw === 'object') {
      console.log('  Response:', JSON.stringify(raw).slice(0, 300));
    }
    if (count > 0 && data[0]) {
      console.log('  İlk event keys:', Object.keys(data[0]).join(', '));
    }
    return { ok: res.ok, count, raw };
  } catch (e) {
    console.log(`${name}: HATA`, e.message);
    return { ok: false, count: 0, error: e.message };
  }
}

console.log('FMP Takvim API testi (from=%s to=%s)\n', from, to);

const stableUrl = `https://financialmodelingprep.com/stable/economic-calendar?from=${from}&to=${to}&apikey=${apiKey}`;
const v3Url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${apiKey}`;

await test('Stable economic-calendar', stableUrl);
console.log('');
await test('v3 economic_calendar', v3Url);

console.log('\n--- Bitti ---');
