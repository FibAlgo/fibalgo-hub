/**
 * TradingView Screenshot Script
 * 
 * GitHub Actions'da çalışır:
 * 1. Puppeteer ile TradingView'i açar
 * 2. Kaydedilmiş session cookie ile giriş yapar
 * 3. FibAlgo PRZ indikatörlü grafiğin ekran görüntüsünü alır
 * 4. Supabase Storage'a yükler
 * 
 * Gerekli ENV:
 *   TRADINGVIEW_SESSION_ID  — TradingView "sessionid" cookie değeri
 *   TRADINGVIEW_CHART_URL   — Paylaşılan grafik URL'si (ör: https://www.tradingview.com/chart/XXXXXX/)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// ── Config ──
const CHART_URL = process.env.TRADINGVIEW_CHART_URL || 'https://www.tradingview.com/chart/';
const SESSION_ID = process.env.TRADINGVIEW_SESSION_ID;
const SESSION_SIGN = process.env.TRADINGVIEW_SESSION_SIGN || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'screenshots';
const FILE_NAME = 'tradingview-chart.png';

// ── Validation ──
if (!SESSION_ID) {
  console.error('❌ TRADINGVIEW_SESSION_ID is required');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
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

async function takeScreenshot() {
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

  const page = await browser.newPage();

  // Viewport — exact container ratio (900:500 = 9:5) × 2x retina
  await page.setViewport({ width: 1800, height: 1000, deviceScaleFactor: 2 });

  // Set TradingView session cookies BEFORE navigation
  console.log('🍪 Session cookie ayarlanıyor...');
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

  // Navigate to chart
  console.log('📊 TradingView grafiği açılıyor:', CHART_URL);
  await page.goto(CHART_URL, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  // Wait for chart canvas to render
  console.log('⏳ Grafik render edilmesi bekleniyor...');
  
  // Wait for the chart canvas to appear
  await page.waitForSelector('canvas', { timeout: 30000 });
  
  // Extra wait for indicators to fully load
  await new Promise((r) => setTimeout(r, 8000));

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
    console.log('📸 Grafik bölgesi ekran görüntüsü alınıyor...');
    screenshotBuffer = await chartContainer.screenshot({ 
      type: 'png',
      captureBeyondViewport: false,
      optimizeForSpeed: false,
    });
  } else {
    console.log('📸 Tam viewport ekran görüntüsü alınıyor...');
    screenshotBuffer = await page.screenshot({ 
      type: 'png',
      fullPage: false,
      captureBeyondViewport: false,
      optimizeForSpeed: false,
    });
  }

  await browser.close();
  console.log('✅ Ekran görüntüsü alındı, boyut:', screenshotBuffer.length, 'bytes');
  return screenshotBuffer;
}

async function uploadToSupabase(buffer) {
  console.log('☁️ Supabase Storage\'a yükleniyor...');
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(FILE_NAME, buffer, {
      contentType: 'image/png',
      upsert: true, // Overwrite existing file
      cacheControl: '300', // 5 min cache
    });

  if (error) {
    console.error('❌ Yükleme hatası:', error.message);
    process.exit(1);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(FILE_NAME);

  console.log('✅ Yükleme başarılı!');
  console.log('🔗 Public URL:', urlData.publicUrl);
  return urlData.publicUrl;
}

// ── Main ──
async function main() {
  console.log('='.repeat(60));
  console.log('FibAlgo TradingView Screenshot');
  console.log('Zaman:', new Date().toISOString());
  console.log('='.repeat(60));

  await ensureBucket();
  const screenshotBuffer = await takeScreenshot();
  const publicUrl = await uploadToSupabase(screenshotBuffer);

  console.log('='.repeat(60));
  console.log('✅ Tamamlandı!');
  console.log('📸 Screenshot URL:', publicUrl);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
