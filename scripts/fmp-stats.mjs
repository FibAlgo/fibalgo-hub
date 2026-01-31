// Load .env.local if present
import fs from 'fs';
import path from 'path';
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    });
  }
} catch (_) {}

const FMP_API_KEY = process.env.FMP_API_KEY || '';
const BASE = 'https://financialmodelingprep.com/stable/news';

const endpoints = [
  { category: 'forex', url: `${BASE}/forex?limit=200&apikey=${FMP_API_KEY}` },
  { category: 'crypto', url: `${BASE}/crypto?limit=200&apikey=${FMP_API_KEY}` },
  { category: 'stocks', url: `${BASE}/stock?limit=200&apikey=${FMP_API_KEY}` },
];

const now = Date.now();
const lookbackHours = Number(process.env.LOOKBACK_HOURS || 6);
const windowAgo = now - lookbackHours * 60 * 60 * 1000;
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);
const todayStartMs = todayStart.getTime();

// FMP genelde UTC döner; timezone yoksa UTC kabul et (son 6 saat sayımı doğru olsun)
function parseTime(item) {
  let s = item?.publishedDate ?? item?.published_date ?? item?.published_at ?? '';
  if (!s) return null;
  s = String(s).trim();
  if (!/Z|[+-]\d{2}:?\d{2}$/.test(s)) s = s.replace(' ', 'T') + 'Z';
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

async function main() {
  const out = {
    fetchedAt: new Date(now).toISOString(),
    todayStart: new Date(todayStartMs).toISOString(),
    totals: { all: 0, today: 0, lastWindow: 0, lookbackHours },
    byCategory: {},
    sampleBadDates: [],
  };

  for (const ep of endpoints) {
    let arr;
    try {
      const r = await fetch(ep.url, { cache: 'no-store' });
      if (!r.ok) {
        out.byCategory[ep.category] = { error: `HTTP ${r.status}` };
        continue;
      }
      arr = await r.json();
    } catch (e) {
      out.byCategory[ep.category] = { error: String(e?.message || e) };
      continue;
    }

    if (!Array.isArray(arr)) {
      out.byCategory[ep.category] = { error: 'non-array response' };
      continue;
    }

    let all = 0;
    let today = 0;
    let lastWindow = 0;
    let badDateCount = 0;

    for (const item of arr) {
      all++;
      const ts = parseTime(item);
      if (ts == null) {
        badDateCount++;
        if (out.sampleBadDates.length < 5) {
          out.sampleBadDates.push({
            category: ep.category,
            publishedDate: item?.publishedDate ?? null,
            title: item?.title ?? null,
          });
        }
        continue;
      }
      if (ts >= todayStartMs) today++;
      if (ts >= windowAgo) lastWindow++;
    }

    out.byCategory[ep.category] = {
      all,
      today,
      lastWindow,
      lookbackHours,
      badDateCount,
      firstPublished: arr[0]?.publishedDate ?? null,
    };
    out.totals.all += all;
    out.totals.today += today;
    out.totals.lastWindow += lastWindow;
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


