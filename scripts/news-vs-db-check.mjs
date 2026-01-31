/**
 * Compare FMP news API (latest dates) vs DB news_analyses (analyzed news).
 * Run: node scripts/news-vs-db-check.mjs
 * Requires: .env.local with FMP_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const NEWS_LOOKBACK_HOURS = 6;
const FMP_BASE_URL = 'https://financialmodelingprep.com/stable/news';

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

// Cron ile aynı limit (25 per category)
const FMP_LIMIT_PER_CATEGORY = 25;

async function fetchFmpNews(apiKey) {
  const all = [];
  const endpoints = [
    { url: `${FMP_BASE_URL}/forex?limit=${FMP_LIMIT_PER_CATEGORY}&apikey=${apiKey}`, category: 'forex' },
    { url: `${FMP_BASE_URL}/crypto?limit=${FMP_LIMIT_PER_CATEGORY}&apikey=${apiKey}`, category: 'crypto' },
    { url: `${FMP_BASE_URL}/stock?limit=${FMP_LIMIT_PER_CATEGORY}&apikey=${apiKey}`, category: 'stocks' },
  ];
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep.url, { cache: 'no-store' });
      if (!r.ok) {
        console.warn(`FMP ${ep.category}: HTTP ${r.status}`);
        continue;
      }
      const data = await r.json();
      if (Array.isArray(data)) {
        data.forEach((item) => all.push({ ...item, _category: ep.category }));
      }
    } catch (e) {
      console.warn(`FMP ${ep.category} error:`, e?.message || e);
    }
  }
  return all;
}

async function main() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found');
    process.exit(1);
  }
  const env = parseDotEnv(fs.readFileSync(envPath, 'utf8'));
  const fmpKey = env.FMP_API_KEY || '';
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const now = Date.now();
  const windowAgo = now - NEWS_LOOKBACK_HOURS * 60 * 60 * 1000;

  console.log('=== FMP News API ===');
  let fmpArticles = [];
  if (fmpKey) {
    fmpArticles = await fetchFmpNews(fmpKey);
  } else {
    console.warn('FMP_API_KEY not set, skipping FMP fetch');
  }

  const fmpTimes = fmpArticles.map((a) => parseTime(a)).filter((t) => t != null);
  const fmpInWindow = fmpTimes.filter((t) => t >= windowAgo).length;
  const fmpNewest = fmpTimes.length ? new Date(Math.max(...fmpTimes)).toISOString() : null;
  const fmpOldest = fmpTimes.length ? new Date(Math.min(...fmpTimes)).toISOString() : null;

  console.log('FMP total articles:', fmpArticles.length);
  console.log('FMP date range:', fmpOldest, '→', fmpNewest);
  console.log(`FMP in last ${NEWS_LOOKBACK_HOURS}h:`, fmpInWindow);
  if (fmpArticles.length > 0) {
    const byCategory = {};
    fmpArticles.forEach((a) => {
      byCategory[a._category] = (byCategory[a._category] || 0) + 1;
    });
    console.log('FMP by category:', byCategory);
  }

  console.log('\n=== DB news_analyses ===');
  let dbNewest = null;
  let dbOldest = null;
  let dbTotal = 0;
  let dbWithAi = 0;
  let dbInWindow = 0;
  let dbSon6hToplam = null;
  let dbSon6hAnaliz = null;

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const windowIso = new Date(windowAgo).toISOString();

    const { data: rows, error } = await supabase
      .from('news_analyses')
      .select('published_at, ai_analysis')
      .order('published_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('DB error:', error.message);
    } else if (rows && rows.length > 0) {
      dbTotal = rows.length;
      dbWithAi = rows.filter((r) => r.ai_analysis != null).length;
      const times = rows.map((r) => new Date(r.published_at).getTime()).filter((t) => !isNaN(t));
      if (times.length) {
        dbNewest = new Date(Math.max(...times)).toISOString();
        dbOldest = new Date(Math.min(...times)).toISOString();
        dbInWindow = times.filter((t) => t >= windowAgo).length;
      }
      console.log('DB total (sample):', dbTotal);
      console.log('DB with ai_analysis:', dbWithAi);
      console.log('DB date range:', dbOldest, '→', dbNewest);
      console.log(`DB in last ${NEWS_LOOKBACK_HOURS}h (sample):`, dbInWindow);
    } else {
      console.log('DB: no rows');
    }

    const { count: dbCount6h, error: err6h } = await supabase
      .from('news_analyses')
      .select('id', { count: 'exact', head: true })
      .gte('published_at', windowIso);
    const { count: dbAnalyzed6h, error: errAnalyzed6h } = await supabase
      .from('news_analyses')
      .select('id', { count: 'exact', head: true })
      .gte('published_at', windowIso)
      .not('ai_analysis', 'is', null);

    dbSon6hToplam = err6h ? null : dbCount6h;
    dbSon6hAnaliz = errAnalyzed6h ? null : dbAnalyzed6h;
  }

  console.log('\n=== Son 6 saat: FMP vs DB (analiz edilen) ===');
  console.log('FMP son 6 saatte dönen haber (cron ile aynı limit 25x3):', fmpInWindow);
  if (dbSon6hToplam != null) {
    console.log('DB son 6 saatte kayıt (toplam):', dbSon6hToplam);
  }
  if (dbSon6hAnaliz != null) {
    console.log('DB son 6 saatte analiz edilmiş (ai_analysis dolu):', dbSon6hAnaliz);
  }
  console.log('');
  if (fmpInWindow !== undefined && dbSon6hAnaliz != null) {
    if (fmpInWindow === 0) {
      console.log('FMP son 6 saatte 0 haber döndü (cron da 0 görüyor). DB:', dbSon6hAnaliz, '— önceki pencerelerden kalmış olabilir.');
    } else if (dbSon6hAnaliz >= fmpInWindow) {
      console.log('Uyuşuyor / fazla: Son 6 saatte FMP\'de', fmpInWindow, 'haber var, DB\'de', dbSon6hAnaliz, 'analiz edilmiş (cron hepsini veya daha fazlasını işlemiş).');
    } else {
      console.log('Fark var: FMP son 6h', fmpInWindow, ', biz analiz etmişiz', dbSon6hAnaliz, '. Cron her çalışmada max 5 haber analiz ediyor; zamanla eşitlenir veya FMP\'de yeniler eklenir.');
    }
  }

  console.log('\n=== Diğer karşılaştırma ===');
  if (fmpNewest && dbNewest) {
    const fmpLatest = new Date(fmpNewest).getTime();
    const dbLatest = new Date(dbNewest).getTime();
    if (fmpLatest > dbLatest) {
      console.log('Fark: FMP\'de DB\'den daha yeni haber var (FMP en son:', fmpNewest, ', DB en son:', dbNewest, ')');
    } else if (dbLatest > fmpLatest) {
      console.log('DB\'de FMP\'den daha yeni kayıt var (cron daha önce işlemiş olabilir).');
    } else {
      console.log('En son tarihler uyumlu.');
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
