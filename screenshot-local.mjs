/**
 * FibAlgo Local Screenshot Runner
 * 
 * Bilgisayarında arka planda çalışır, 3 dakikada bir 12 chart'ın
 * screenshot'ını alıp Supabase'e yükler.
 * 
 * Kullanım:
 *   node screenshot-local.mjs
 * 
 * İlk çalıştırmada .env.local'dan Supabase bilgilerini okur.
 * TRADINGVIEW_SESSION_ID ve TRADINGVIEW_SESSION_SIGN değerleri
 * aşağıda hardcoded — değişirse buradan güncelle.
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── .env.local'dan oku ──
function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local bulunamadı!');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

// ── Config ──
const INTERVAL_MS = 5 * 60 * 1000; // 5 dakika
const BUCKET_NAME = 'screenshots';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// TradingView session — .env.local'a ekle veya burada güncelle
const SESSION_ID = process.env.TRADINGVIEW_SESSION_ID || '';
const SESSION_SIGN = process.env.TRADINGVIEW_SESSION_SIGN || '';

// ── 12 Chart URL (hardcoded — değişiklik olursa buradan güncelle) ──
const CHARTS = {
  'smartTrading-btc':        'https://www.tradingview.com/chart/gB9whvGY/',
  'smartTrading-gold':       'https://www.tradingview.com/chart/3Dol4Kjw/',
  'technicalAnalysis-btc':   'https://www.tradingview.com/chart/MLfyX05E/',
  'technicalAnalysis-gold':  'https://www.tradingview.com/chart/lOQhbZyY/',
  'prz-btc':                 'https://www.tradingview.com/chart/lEy79iTE/',
  'prz-gold':                'https://www.tradingview.com/chart/Zcn43G3n/',
  'pez-btc':                 'https://www.tradingview.com/chart/joZxMv5p/',
  'pez-gold':                'https://www.tradingview.com/chart/WmSJOWCi/',
  'oscillator-btc':          'https://www.tradingview.com/chart/opmlBKVR/',
  'oscillator-gold':         'https://www.tradingview.com/chart/0ZP6u6c7/',
  'screener-btc':            'https://www.tradingview.com/chart/SNXaQ1dR/',
  'screener-gold':           'https://www.tradingview.com/chart/VxispENp/',
};

// ── Validation ──
if (!SESSION_ID) {
  console.error('❌ TRADINGVIEW_SESSION_ID gerekli!');
  console.error('   .env.local dosyasına TRADINGVIEW_SESSION_ID="..." ekle');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase bilgileri eksik! .env.local kontrol et.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const entries = Object.entries(CHARTS);

// ── Screenshot Logic ──
async function takeScreenshot(page, chartUrl, key) {
  await page.goto(chartUrl, { waitUntil: 'networkidle2', timeout: 60000 });

  // Canvas yüklenmesini bekle
  await page.waitForSelector('canvas', { timeout: 30000 });

  // İndikatörlerin tam yüklenmesi için 30s bekle
  await new Promise((r) => setTimeout(r, 30000));

  // UI elementlerini gizle (temiz screenshot)
  await page.evaluate(() => {
    const hide = [
      '.header-chart-panel',
      '.chart-controls-bar',
      '.layout__area--top',
      '.layout__area--left',
      '.layout__area--right',
      '.layout__area--bottom',
      '.tv-side-toolbar',
      '.floating-toolbar-react-widgets',
      '.toast-container',
    ];
    hide.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        /** @type {HTMLElement} */ (el).style.display = 'none';
      });
    });
  });

  await new Promise((r) => setTimeout(r, 2000));

  const container = await page.$('.chart-container')
    || await page.$('.layout__area--center')
    || await page.$('#tv_chart_container');

  const buffer = container
    ? await container.screenshot({ type: 'png', captureBeyondViewport: false })
    : await page.screenshot({ type: 'png', fullPage: false, captureBeyondViewport: false });

  return buffer;
}

async function uploadToSupabase(buffer, compositeKey) {
  const fileName = `chart-${compositeKey}.png`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, buffer, {
      contentType: 'image/png',
      upsert: true,
      cacheControl: '300', // 5 min cache (cron ile senkron)
    });

  if (error) {
    console.error(`  ❌ [${compositeKey}] Upload hatası: ${error.message}`);
    return null;
  }
  return fileName;
}

async function processChart(browser, compositeKey, chartUrl) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1800, height: 1000, deviceScaleFactor: 2 });

  // TradingView cookies
  const cookies = [
    { name: 'sessionid', value: SESSION_ID, domain: '.tradingview.com', path: '/', httpOnly: true, secure: true },
  ];
  if (SESSION_SIGN) {
    cookies.push({ name: 'sessionid_sign', value: SESSION_SIGN, domain: '.tradingview.com', path: '/', httpOnly: true, secure: true });
  }
  await page.setCookie(...cookies);

  const buffer = await takeScreenshot(page, chartUrl, compositeKey);
  const file = await uploadToSupabase(buffer, compositeKey);
  await page.close();

  return { key: compositeKey, success: !!file };
}

// ── Single Cycle ──
let cycleCount = 0;

async function runCycle() {
  cycleCount++;
  const startTime = Date.now();
  const now = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

  console.log(`\n${'━'.repeat(60)}`);
  console.log(`🔄 Cycle #${cycleCount} — ${now}`);
  console.log(`📊 ${entries.length} chart paralel işlenecek...`);
  console.log('━'.repeat(60));

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1800,1000',
      ],
    });

    const settled = await Promise.allSettled(
      entries.map(([key, url]) =>
        processChart(browser, key, url).catch((err) => {
          console.error(`  💥 [${key}] ${err.message}`);
          return { key, success: false };
        })
      )
    );

    const results = settled.map((s, i) => {
      if (s.status === 'fulfilled') return s.value;
      return { key: entries[i][0], success: false };
    });

    const ok = results.filter((r) => r.success).length;
    const fail = results.length - ok;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ ${ok}/${results.length} başarılı${fail > 0 ? ` — ❌ ${fail} hata` : ''} (${elapsed}s)`);

    if (fail > 0) {
      results.filter((r) => !r.success).forEach((r) => console.log(`   ❌ ${r.key}`));
    }
  } catch (err) {
    console.error('💥 Cycle hatası:', err.message);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ── Loop ──
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  FibAlgo Local Screenshot Runner                         ║');
  console.log('║  12 chart • 5 dakika interval • Supabase upload          ║');
  console.log('║  Durdurmak için: Ctrl+C                                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📡 Supabase: ${SUPABASE_URL}`);
  console.log(`🍪 Session: ${SESSION_ID.slice(0, 8)}...${SESSION_ID.slice(-4)}`);
  console.log(`⏱️  Interval: ${INTERVAL_MS / 1000}s (${INTERVAL_MS / 60000} dakika)\n`);

  // İlk cycle hemen çalışsın
  await runCycle();

  // Sonra her 3 dakikada bir
  setInterval(async () => {
    await runCycle();
  }, INTERVAL_MS);
}

main().catch((err) => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
