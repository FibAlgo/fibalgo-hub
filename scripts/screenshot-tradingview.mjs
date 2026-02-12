/**
 * TradingView Multi-Screenshot Script
 * 
 * GitHub Actions'da çalışır:
 * 1. Puppeteer ile TradingView'i açar
 * 2. 6 farklı indikatör grafiğinin ekran görüntüsünü alır
 * 3. Her birini Supabase Storage'a yükler
 * 
 * Gerekli ENV:
 *   TRADINGVIEW_SESSION_ID     — TradingView "sessionid" cookie değeri
 *   TRADINGVIEW_CHART_URLS     — JSON: {"pez":"https://...","prz":"https://...",...}
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * 
 * Opsiyonel (fallback):
 *   TRADINGVIEW_CHART_URL      — Tek URL (eski uyumluluk)
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// ── Config ──
const SESSION_ID = process.env.TRADINGVIEW_SESSION_ID;
const SESSION_SIGN = process.env.TRADINGVIEW_SESSION_SIGN || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'screenshots';

// 6 indicator chart URLs from JSON env
const CHART_URLS_RAW = process.env.TRADINGVIEW_CHART_URLS || '{}';
let CHART_MAP = {};
try {
  CHART_MAP = JSON.parse(CHART_URLS_RAW);
} catch {
  console.error('❌ TRADINGVIEW_CHART_URLS JSON parse hatası');
}

// Fallback: eski tek-URL formatı → smartTrading olarak kullan
if (Object.keys(CHART_MAP).length === 0 && process.env.TRADINGVIEW_CHART_URL) {
  CHART_MAP = { smartTrading: process.env.TRADINGVIEW_CHART_URL };
}

const VALID_KEYS = ['pez', 'prz', 'screener', 'smartTrading', 'oscillator', 'technicalAnalysis'];

// ── Validation ──
if (!SESSION_ID) {
  console.error('❌ TRADINGVIEW_SESSION_ID is required');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}
if (Object.keys(CHART_MAP).length === 0) {
  console.error('❌ No chart URLs configured. Set TRADINGVIEW_CHART_URLS or TRADINGVIEW_CHART_URL');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET_NAME);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10 MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    });
    if (error) {
      console.error('❌ Bucket oluşturulamadı:', error.message);
      process.exit(1);
    }
    console.log('✅ Bucket oluşturuldu:', BUCKET_NAME);
  } else {
    console.log('✅ Bucket mevcut:', BUCKET_NAME);
  }
}

async function takeScreenshot(page, chartUrl, key) {
  console.log(`📊 [${key}] TradingView grafiği açılıyor:`, chartUrl);
  await page.goto(chartUrl, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  // Wait for chart canvas to render
  console.log(`⏳ [${key}] Grafik render edilmesi bekleniyor...`);
  
  // Wait for the chart canvas to appear
  await page.waitForSelector('canvas', { timeout: 30000 });
  
  // Extra wait for indicators & overlays to fully load (30s)
  console.log(`⏳ [${key}] 30 saniye bekleniyor (indikatörlerin yüklenmesi için)...`);
  await new Promise((r) => setTimeout(r, 30000));

  // Hide UI elements for cleaner screenshot
  await page.evaluate(() => {
    // Hide header, toolbar, watchlist sidebar, status bar etc.
    const selectorsToHide = [
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
    selectorsToHide.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        /** @type {HTMLElement} */ (el).style.display = 'none';
      });
    });
  });

  // Wait for chart to re-layout after hiding UI elements
  await new Promise((r) => setTimeout(r, 2000));

  // Find the chart container and screenshot it
  const chartContainer = await page.$('.chart-container') 
    || await page.$('.layout__area--center')
    || await page.$('#tv_chart_container');

  let screenshotBuffer;
  if (chartContainer) {
    console.log(`📸 [${key}] Grafik bölgesi ekran görüntüsü alınıyor...`);
    screenshotBuffer = await chartContainer.screenshot({ 
      type: 'png',
      captureBeyondViewport: false,
      optimizeForSpeed: false,
    });
  } else {
    console.log(`📸 [${key}] Tam viewport ekran görüntüsü alınıyor...`);
    screenshotBuffer = await page.screenshot({ 
      type: 'png',
      fullPage: false,
      captureBeyondViewport: false,
      optimizeForSpeed: false,
    });
  }

  console.log(`✅ [${key}] Ekran görüntüsü alındı, boyut:`, screenshotBuffer.length, 'bytes');
  return screenshotBuffer;
}

async function uploadToSupabase(buffer, key) {
  const fileName = `chart-${key}.png`;
  console.log(`☁️ [${key}] Supabase Storage'a yükleniyor... (${fileName})`);
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, buffer, {
      contentType: 'image/png',
      upsert: true, // Overwrite existing file
      cacheControl: '300', // 5 min cache
    });

  if (error) {
    console.error(`❌ [${key}] Yükleme hatası:`, error.message);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  console.log(`✅ [${key}] Yükleme başarılı!`);
  console.log(`🔗 [${key}] Public URL:`, urlData.publicUrl);
  return urlData.publicUrl;
}

/**
 * Tek bir chart için: page aç → cookie set → navigate → 30s bekle → screenshot → upload
 * Her chart kendi page'inde paralel çalışır.
 */
async function processChart(browser, key, chartUrl) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1800, height: 1000, deviceScaleFactor: 2 });

  // Set TradingView session cookies
  const cookies = [
    {
      name: 'sessionid',
      value: SESSION_ID,
      domain: '.tradingview.com',
      path: '/',
      httpOnly: true,
      secure: true,
    },
  ];
  if (SESSION_SIGN) {
    cookies.push({
      name: 'sessionid_sign',
      value: SESSION_SIGN,
      domain: '.tradingview.com',
      path: '/',
      httpOnly: true,
      secure: true,
    });
  }
  await page.setCookie(...cookies);

  // Take screenshot
  const buffer = await takeScreenshot(page, chartUrl, key);

  // Upload
  const url = await uploadToSupabase(buffer, key);

  await page.close();
  return { key, success: true, url };
}

// ── Main ──
async function main() {
  console.log('='.repeat(60));
  console.log('FibAlgo TradingView PARALLEL Screenshot');
  console.log('Zaman:', new Date().toISOString());
  console.log('Charts:', Object.keys(CHART_MAP).join(', '));
  console.log('='.repeat(60));

  await ensureBucket();

  // Launch browser ONCE — her chart kendi tab'ında paralel çalışır
  console.log('🚀 Puppeteer başlatılıyor...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1800,1000',
    ],
  });

  const entries = Object.entries(CHART_MAP).filter(([key]) => VALID_KEYS.includes(key));
  console.log(`🔀 ${entries.length} chart PARALEL olarak işleniyor...`);

  // Tüm chart'ları paralel olarak işle
  const settled = await Promise.allSettled(
    entries.map(([key, chartUrl]) =>
      processChart(browser, key, chartUrl).catch((err) => {
        console.error(`💥 [${key}] Hata:`, err.message);
        return { key, success: false, error: err.message };
      })
    )
  );

  const results = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    return { key: entries[i][0], success: false, error: s.reason?.message || 'Unknown error' };
  });

  await browser.close();

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Tamamlandı!');
  console.log('Sonuçlar:');
  for (const r of results) {
    console.log(`  ${r.success ? '✅' : '❌'} ${r.key}: ${r.success ? r.url : r.error}`);
  }
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
