/**
 * Yandex Yazeka AI Search Scraper
 * Puppeteer ile Yandex'in AI aramasından cevap çeker
 */

import puppeteer from 'puppeteer';

async function searchYandexYazeka(query: string): Promise<string | null> {
  console.log(`\n🔍 Yandex Yazeka araması: "${query}"`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--lang=en-US'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    const searchUrl = `https://yandex.com/search/?text=${encodeURIComponent(query)}&lr=21541`;
    console.log(`   📡 URL: ${searchUrl}`);
    
    // Sayfa yükle
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });

    // Captcha sayfasında mıyız kontrol et
    const pageContent = await page.content();
    if (pageContent.includes('CheckboxCaptcha') || pageContent.includes('robot')) {
      console.log(`   🤖 Captcha tespit edildi, bypass...`);
      
      // Checkbox'ı bul ve tıkla
      await page.waitForSelector('.CheckboxCaptcha-Button', { timeout: 5000 }).catch(() => {});
      const checkbox = await page.$('.CheckboxCaptcha-Button');
      if (checkbox) {
        await checkbox.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        console.log(`   ✅ Captcha geçildi!`);
      }
    }

    // AI cevabını bekle - her 500ms kontrol (daha hızlı tespit)
    console.log(`   ⏳ AI cevabı bekleniyor (max 20s)...`);
    
    let aiContent: string | null = null;
    let bestContent: string | null = null; // En uzun cevabı sakla
    let lastLength = 0;
    let stableCount = 0;
    const startTime = Date.now();
    const maxWait = 20000; // Max 20 saniye
    const minWait = 10000; // Minimum 10 saniye bekle (AI yazımı bitsin)
    
    while (Date.now() - startTime < maxWait) {
      await new Promise(r => setTimeout(r, 500)); // Her 500ms kontrol (daha hızlı)
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      try {
        // Birden fazla selector dene - hangisi önce bulunursa
        aiContent = await page.evaluate(() => {
          // Yöntem 1: aria-label (mevcut)
          const ariaElements = document.querySelectorAll('[aria-label]');
          for (const el of ariaElements) {
            const label = el.getAttribute('aria-label') || '';
            if ((label.includes('Neuro') || label.includes('neuro') || label.includes('Shared by')) && label.length > 100) {
              return label;
            }
          }
          
          // Yöntem 2: Neuro snippet container (class bazlı)
          const neuroSnippet = document.querySelector('.NeuroSerpSnippet, .Neuro, [class*="Neuro"]');
          if (neuroSnippet) {
            const text = neuroSnippet.textContent?.trim() || '';
            if (text.length > 100) return text;
          }
          
          // Yöntem 3: data-bem attribute ile YaNeuro
          const bemElements = document.querySelectorAll('[data-bem*="YaNeuro"], [data-bem*="neuro"]');
          for (const el of bemElements) {
            const text = el.textContent?.trim() || '';
            if (text.length > 100) return text;
          }
          
          // Yöntem 4: Organik AI cevap alanı
          const organicAI = document.querySelector('.OrganicNeuro, .organic-neuro, [class*="organic"][class*="neuro"]');
          if (organicAI) {
            const text = organicAI.textContent?.trim() || '';
            if (text.length > 100) return text;
          }
          
          // Yöntem 5: Genel büyük text blokları (AI genellikle ilk büyük blok)
          const serp = document.querySelector('.serp-list, .content__left, .main');
          if (serp) {
            const children = serp.querySelectorAll('div, article, section');
            for (const child of children) {
              const text = child.textContent?.trim() || '';
              // AI cevabı genellikle 200+ karakter ve "AI" veya spesifik içerik içerir
              if (text.length > 200 && text.length < 3000 && 
                  (text.includes('According to') || text.includes('Based on') || 
                   text.includes('MIND') || text.includes('subsea') ||
                   text.includes('marine') || text.includes('market'))) {
                // Bu muhtemelen AI cevabı
                return text.substring(0, 2000); // İlk 2000 karakter
              }
            }
          }
          
          return null;
        });
        
        if (aiContent) {
          // En uzun cevabı sakla (streaming sırasında element değişebilir)
          if (!bestContent || aiContent.length > bestContent.length) {
            bestContent = aiContent;
          }
          
          // Cevap bulundu, ama tamamlanmış mı kontrol et
          if (aiContent.length === lastLength) {
            stableCount++;
            console.log(`   [${elapsed}s] Cevap stabil (${aiContent.length} chars) ${stableCount}/3`);
            if (stableCount >= 3) { // 3x500ms = 1.5s stabil
              // Minimum süre geçti mi kontrol et
              const elapsedMs = Date.now() - startTime;
              if (elapsedMs >= minWait) {
                console.log(`   ✅ AI cevabı tamamlandı! (${elapsed}s, ${bestContent?.length || aiContent.length} chars)`);
                break;
              } else {
                console.log(`   [${elapsed}s] Stabil ama minimum süre bekleniyor...`);
                stableCount = 0; // Reset et, beklemeye devam
              }
            }
          } else {
            stableCount = 0;
            console.log(`   [${elapsed}s] Cevap yükleniyor... (${aiContent.length} chars)`);
            lastLength = aiContent.length;
          }
        } else {
          console.log(`   [${elapsed}s] Bekleniyor...`);
        }
      } catch {
        console.log(`   [${elapsed}s] Sayfa hazır değil...`);
        continue;
      }
    }
    
    if (!bestContent && !aiContent) {
      console.log(`   ❌ 20 saniye içinde AI cevabı bulunamadı!`);
      return null;
    }
    
    // En uzun içeriği döndür
    return bestContent || aiContent;

  } catch (error) {
    console.error(`   ❌ Hata:`, error);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

// Test
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🤖 YANDEX YAZEKA AI SEARCH TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Test sorgusu
  const result = await searchYandexYazeka('MIND marine subsea market conditions and order status');
  
  if (result) {
    console.log('\n   📝 Sonuç:');
    console.log('   ' + '─'.repeat(50));
    console.log(`   ${result.substring(0, 800)}${result.length > 800 ? '...' : ''}`);
    console.log('   ' + '─'.repeat(50));
    console.log(`   📊 Toplam: ${result.length} karakter`);
  }

  console.log('\n✅ Test tamamlandı!');
}

// Export for use in other modules
export { searchYandexYazeka };

main().catch(console.error);
