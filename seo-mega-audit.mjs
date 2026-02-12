#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              FIBALGO SEO MEGA AUDIT — v2.0                     ║
 * ║  Kapsamlı SEO testi: TÜM sayfalar, TÜM kontroller             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Test Kategorileri:
 *  1. Statik sayfalar (homepage, about, education, library, blog,
 *     privacy-policy, terms-of-service) × 6 dil
 *  2. Blog post sayfaları (education/[slug]) — EN + TR
 *  3. Blog category sayfaları (education/category/[cat])
 *  4. Blog listing (/blog) çoklu dil
 *  5. Noindex sayfaları (login, signup, community, terminal, dashboard)
 *  6. Static dosyalar (logo SVG, PNG, favicon, manifest, sw-notifications.js)
 *  7. Redirect kuralları (/en → /, www → non-www)
 *  8. robots.txt içerik kontrolü
 *  9. sitemap.xml içerik kontrolü
 * 10. Structured data (JSON-LD) kontrolleri
 * 11. Security headers
 * 12. OpenGraph image endpoint testi
 *
 * Her sayfa için kontroller:
 *  - HTTP status 200
 *  - <title> var
 *  - <meta name="description"> var
 *  - <link rel="canonical"> var ve locale-aware
 *  - hreflang tag sayısı (31 = 30 dil + x-default)
 *  - x-default hreflang var
 *  - og:title, og:description, og:image, og:locale
 *  - twitter:card
 *  - <h1> var
 *  - Trailing slash kontrolü
 *  - Canonical URL eşleşmesi (requested URL = canonical)
 *  - noindex kontrolü (olması gereken yerlerde var mı)
 */

const BASE = 'https://fibalgo.com';
const LOCALES_TO_TEST = ['en', 'tr', 'es', 'de', 'ja', 'ar'];
const ALL_30_LOCALES = ['en','tr','es','de','fr','it','pt','nl','pl','ru','uk','ar','ja','ko','zh','hi','th','vi','id','ms','sv','da','fi','no','cs','ro','hu','el','he','bn'];

// ──────────────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────────────

let totalTests = 0;
let totalPass = 0;
let totalFail = 0;
const failures = [];

function getUrl(path, locale) {
  if (locale === 'en') return path ? `${BASE}/${path}` : BASE;
  return path ? `${BASE}/${locale}/${path}` : `${BASE}/${locale}`;
}

async function fetchPage(url, followRedirects = true) {
  const opts = { redirect: followRedirects ? 'follow' : 'manual', headers: { 'User-Agent': 'FibAlgo-SEO-Audit/2.0' } };
  try {
    const res = await fetch(url, opts);
    const html = await res.text();
    return { status: res.status, html, headers: res.headers, url: res.url, ok: true };
  } catch (e) {
    return { status: 0, html: '', headers: null, url, ok: false, error: e.message };
  }
}

function check(testName, condition, detail = '') {
  totalTests++;
  if (condition) {
    totalPass++;
    return true;
  } else {
    totalFail++;
    failures.push({ test: testName, detail });
    return false;
  }
}

function extractMeta(html, name) {
  const re = new RegExp(`<meta\\s+(?:name|property)=["']${name}["']\\s+content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  if (m) return m[1];
  // Also try reverse order: content before name
  const re2 = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:name|property)=["']${name}["']`, 'i');
  const m2 = html.match(re2);
  return m2 ? m2[1] : null;
}

function extractCanonical(html) {
  const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (m) return m[1];
  const m2 = html.match(/<link\s+href=["']([^"']+)["']\s+rel=["']canonical["']/i);
  return m2 ? m2[1] : null;
}

function countHreflang(html) {
  const matches = html.match(/hreflang/gi);
  return matches ? matches.length : 0;
}

function hasXDefault(html) {
  return /hreflang=["']x-default["']/i.test(html);
}

function hasTitle(html) {
  return /<title[^>]*>[^<]+<\/title>/i.test(html);
}

function hasH1(html) {
  return /<h1[\s>]/i.test(html);
}

function hasNoindex(html) {
  return /noindex/i.test(html);
}

function hasTrailingSlash(url) {
  const u = new URL(url);
  return u.pathname.length > 1 && u.pathname.endsWith('/');
}

function extractJsonLd(html) {
  const matches = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!matches) return [];
  return matches.map(m => {
    try {
      const json = m.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      return JSON.parse(json);
    } catch { return null; }
  }).filter(Boolean);
}

// ──────────────────────────────────────────────────────
// TEST RUNNERS
// ──────────────────────────────────────────────────────

async function testIndexablePage(url, label, expectHreflang = true) {
  const { status, html, ok } = await fetchPage(url);
  
  check(`${label}: HTTP 200`, ok && status === 200, `Got ${status}`);
  if (!ok || status !== 200) return;

  check(`${label}: <title>`, hasTitle(html));
  check(`${label}: meta description`, !!extractMeta(html, 'description'));
  check(`${label}: canonical`, !!extractCanonical(html));
  check(`${label}: <h1>`, hasH1(html));
  check(`${label}: og:title`, !!extractMeta(html, 'og:title'));
  check(`${label}: og:description`, !!extractMeta(html, 'og:description'));
  // og:image can be provided via meta tag OR via opengraph-image.tsx file convention
  // Next.js automatically injects og:image from opengraph-image.tsx files
  check(`${label}: og:image`, !!extractMeta(html, 'og:image'));
  check(`${label}: og:locale`, !!extractMeta(html, 'og:locale'));
  check(`${label}: twitter:card`, !!extractMeta(html, 'twitter:card'));
  check(`${label}: no trailing slash`, !hasTrailingSlash(url));
  check(`${label}: NOT noindex`, !hasNoindex(html), 'Page should be indexable');

  if (expectHreflang) {
    const count = countHreflang(html);
    check(`${label}: hreflang ≥ 31`, count >= 31, `Found ${count}`);
    check(`${label}: x-default`, hasXDefault(html));
  }

  // Canonical URL should match requested URL (for locale-aware check)
  // Exception: /blog/* pages intentionally point canonical to /education/* (consolidation)
  const canonical = extractCanonical(html);
  if (canonical) {
    const expectedUrl = url.replace(/\/$/, '');
    const canonicalClean = canonical.replace(/\/$/, '');
    const isBlogToEduCanonical = url.includes('/blog/') && canonicalClean.includes('/education/');
    check(`${label}: canonical matches URL`, canonicalClean === expectedUrl || isBlogToEduCanonical, 
      `canonical=${canonicalClean} vs url=${expectedUrl}`);
  }
}

async function testNoindexPage(url, label) {
  const { status, html, ok } = await fetchPage(url);
  check(`${label}: HTTP 200`, ok && status === 200, `Got ${status}`);
  if (!ok || status !== 200) return;
  
  check(`${label}: HAS noindex`, hasNoindex(html), 'Noindex page should have noindex meta');
}

async function testStaticFile(url, label) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': 'FibAlgo-SEO-Audit/2.0' } });
    check(`${label}: HTTP 200`, res.status === 200, `Got ${res.status}`);
  } catch (e) {
    check(`${label}: reachable`, false, e.message);
  }
}

async function testRedirect(fromUrl, toUrl, label) {
  try {
    const res = await fetch(fromUrl, { redirect: 'manual', headers: { 'User-Agent': 'FibAlgo-SEO-Audit/2.0' } });
    const location = res.headers.get('location') || '';
    const isRedirect = res.status >= 300 && res.status < 400;
    check(`${label}: redirects`, isRedirect, `Got ${res.status}`);
    // Handle both absolute and relative Location headers
    const toPath = new URL(toUrl).pathname;
    const locPath = location.startsWith('http') ? new URL(location).pathname : location;
    check(`${label}: correct target`, 
      locPath.replace(/\/$/, '') === toPath.replace(/\/$/, '') || location === toUrl, 
      `Got ${location}, expected ${toUrl}`);
  } catch (e) {
    check(`${label}: reachable`, false, e.message);
  }
}

// ──────────────────────────────────────────────────────
// MAIN TEST SUITES
// ──────────────────────────────────────────────────────

async function suite1_StaticPages() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SUITE 1: Statik Sayfalar (6 dil × 7 sayfa = 42)    ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const pages = [
    { path: '', name: 'Homepage' },
    { path: 'about', name: 'About' },
    { path: 'education', name: 'Education' },
    { path: 'library', name: 'Library' },
    { path: 'blog', name: 'Blog' },
    { path: 'privacy-policy', name: 'Privacy' },
    { path: 'terms-of-service', name: 'Terms' },
  ];

  for (const page of pages) {
    for (const locale of LOCALES_TO_TEST) {
      const url = getUrl(page.path, locale);
      await testIndexablePage(url, `${page.name} [${locale}]`);
    }
  }
}

async function suite2_BlogPosts() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SUITE 2: Blog/Education Yazıları (EN + TR)          ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // Get a few real slugs from sitemap
  const sitemapRes = await fetchPage(`${BASE}/sitemap.xml`);
  const slugMatches = sitemapRes.html.matchAll(/\/education\/([a-z0-9-]+)<\/loc>/g);
  const slugs = new Set();
  for (const m of slugMatches) {
    if (slugs.size < 5) slugs.add(m[1]);
  }
  
  if (slugs.size === 0) {
    console.log('  ⚠️  Sitemap\'da education yazısı bulunamadı, varsayılan slug\'lar deneniyor...');
    slugs.add('fibonacci-trading-strategy-guide');
    slugs.add('ai-trading-signals-guide');
  }

  for (const slug of slugs) {
    // Test EN
    const enUrl = `${BASE}/education/${slug}`;
    await testIndexablePage(enUrl, `Education [en] ${slug}`, true);

    // Check JSON-LD on EN post
    const { html } = await fetchPage(enUrl);
    if (html) {
      const jsonld = extractJsonLd(html);
      const hasArticle = jsonld.some(j => j['@type'] === 'BlogPosting' || j['@type'] === 'Article');
      check(`Education [en] ${slug}: JSON-LD Article`, hasArticle);
    }

    // Test TR
    const trUrl = `${BASE}/tr/education/${slug}`;
    const trRes = await fetchPage(trUrl);
    if (trRes.status === 200) {
      await testIndexablePage(trUrl, `Education [tr] ${slug}`, true);
    }
  }

  // Also test /blog/[slug] route — should work (old route)
  for (const slug of [...slugs].slice(0, 2)) {
    const blogUrl = `${BASE}/blog/${slug}`;
    const res = await fetchPage(blogUrl);
    check(`Blog route [en] /blog/${slug}: accessible`, res.status === 200, `Got ${res.status}`);
  }
}

async function suite3_CategoryPages() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SUITE 3: Kategori Sayfaları                         ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const categories = ['technical-analysis', 'ai-trading', 'crypto', 'risk-management'];
  
  for (const cat of categories) {
    // Education category
    const eduUrl = `${BASE}/education/category/${cat}`;
    const res = await fetchPage(eduUrl);
    if (res.status === 200) {
      await testIndexablePage(eduUrl, `EduCat [en] ${cat}`, true);
    } else {
      console.log(`  ℹ️  ${eduUrl} → ${res.status} (kategori yok veya boş)`);
    }

    // Blog category
    const blogUrl = `${BASE}/blog/category/${cat}`;
    const blogRes = await fetchPage(blogUrl);
    if (blogRes.status === 200) {
      await testIndexablePage(blogUrl, `BlogCat [en] ${cat}`, true);
    }
  }
}

async function suite4_NoindexPages() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SUITE 4: Noindex Sayfaları (gizli kalması gereken)   ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const noindexPages = [
    { path: 'login', name: 'Login' },
    { path: 'signup', name: 'Signup' },
    { path: 'community', name: 'Community' },
    { path: 'dashboard', name: 'Dashboard' },
    { path: 'terminal', name: 'Terminal' },
  ];

  for (const page of noindexPages) {
    const url = getUrl(page.path, 'en');
    // Dashboard and Terminal may redirect to login, that's fine
    const res = await fetchPage(url);
    if (res.status === 200) {
      await testNoindexPage(url, `Noindex ${page.name}`);
    } else {
      // Redirecting to login is also acceptable for protected pages
      check(`Noindex ${page.name}: protected`, res.status >= 300 || res.status === 200, 
        `Got ${res.status} — protected pages should redirect or show noindex`);
    }
  }
}

async function suite5_StaticFiles() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SUITE 5: Statik Dosyalar                            ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const files = [
    { url: `${BASE}/logo.svg`, name: 'Logo SVG' },
    { url: `${BASE}/logo-white.svg`, name: 'Logo White SVG' },
    { url: `${BASE}/images/websitelogo.jpg`, name: 'Website Logo JPG' },
    { url: `${BASE}/favicon.ico`, name: 'Favicon' },
    { url: `${BASE}/icon-192x192.png`, name: 'Icon 192' },
    { url: `${BASE}/icon-512x512.png`, name: 'Icon 512' },
    { url: `${BASE}/favicon-32.png`, name: 'Favicon 32' },
    { url: `${BASE}/apple-touch-icon.png`, name: 'Apple Touch Icon' },
    { url: `${BASE}/manifest.webmanifest`, name: 'Manifest' },
    { url: `${BASE}/sw-notifications.js`, name: 'SW Notifications JS' },
    { url: `${BASE}/robots.txt`, name: 'Robots.txt' },
    { url: `${BASE}/sitemap.xml`, name: 'Sitemap.xml' },
    { url: `${BASE}/opengraph-image`, name: 'OG Image root' },
  ];

  for (const f of files) {
    await testStaticFile(f.url, f.name);
  }
}

async function suite6_Redirects() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SUITE 6: Redirect Kuralları                         ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // /en → / (locale prefix removal for default locale)
  await testRedirect(`${BASE}/en`, BASE, '/en → /');
  await testRedirect(`${BASE}/en/about`, `${BASE}/about`, '/en/about → /about');
  await testRedirect(`${BASE}/en/education`, `${BASE}/education`, '/en/education → /education');

  // Legacy redirects from next.config.js
  const legacyRedirects = [
    { from: '/contact', to: '/about' },
    { from: '/support', to: '/about' },
    { from: '/encyclopedia', to: '/education' },
  ];
  for (const r of legacyRedirects) {
    await testRedirect(`${BASE}${r.from}`, `${BASE}${r.to}`, `${r.from} → ${r.to}`);
  }
}

async function suite7_RobotsTxt() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SUITE 7: robots.txt İçerik Kontrolü                 ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const { html: robots } = await fetchPage(`${BASE}/robots.txt`);
  
  check('robots.txt: Allow /', robots.includes('Allow: /'));
  check('robots.txt: Disallow /api/', robots.includes('Disallow: /api/'));
  check('robots.txt: Disallow /admin/', robots.includes('Disallow: /admin/'));
  check('robots.txt: Disallow /dashboard/', robots.includes('Disallow: /dashboard/'));
  check('robots.txt: Disallow /terminal/', robots.includes('Disallow: /terminal/'));
  check('robots.txt: Disallow /login', robots.includes('Disallow: /login'));
  check('robots.txt: Disallow /signup', robots.includes('Disallow: /signup'));
  check('robots.txt: Disallow /community', robots.includes('Disallow: /community'));
  check('robots.txt: Sitemap ref', robots.includes('Sitemap: https://fibalgo.com/sitemap.xml'));
  
  // Check locale-specific disallows
  check('robots.txt: Disallow /tr/login', robots.includes('/tr/login'));
  check('robots.txt: Disallow /tr/signup', robots.includes('/tr/signup'));
  check('robots.txt: Disallow /tr/dashboard', robots.includes('/tr/dashboard'));
}

async function suite8_SitemapXml() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SUITE 8: sitemap.xml İçerik Kontrolü                ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const { html: sitemap } = await fetchPage(`${BASE}/sitemap.xml`);
  
  // Must have key pages
  check('sitemap: has homepage', sitemap.includes(`${BASE}</loc>`) || sitemap.includes(`${BASE}/</loc>`));
  check('sitemap: has /about', sitemap.includes('/about</loc>'));
  check('sitemap: has /education', sitemap.includes('/education</loc>'));
  check('sitemap: has /library', sitemap.includes('/library</loc>'));
  check('sitemap: has /blog', sitemap.includes('/blog</loc>'));
  check('sitemap: has /privacy-policy', sitemap.includes('/privacy-policy</loc>'));
  check('sitemap: has /terms-of-service', sitemap.includes('/terms-of-service</loc>'));
  
  // Must have TR versions
  check('sitemap: has /tr/', sitemap.includes('/tr/'));
  check('sitemap: has /tr/about', sitemap.includes('/tr/about'));
  check('sitemap: has /tr/education', sitemap.includes('/tr/education'));
  
  // Must NOT have noindex pages
  check('sitemap: NO /login', !sitemap.includes('/login</loc>'));
  check('sitemap: NO /signup', !sitemap.includes('/signup</loc>'));
  check('sitemap: NO /community', !sitemap.includes('/community</loc>'));
  check('sitemap: NO /dashboard', !sitemap.includes('/dashboard</loc>'));
  check('sitemap: NO /terminal', !sitemap.includes('/terminal</loc>'));

  // Must have hreflang alternates
  check('sitemap: has hreflang', /hreflang/i.test(sitemap));
  check('sitemap: has x-default', sitemap.includes('x-default'));

  // URL count
  const urlCount = (sitemap.match(/<url>/g) || []).length;
  check('sitemap: >100 URLs', urlCount > 100, `Found ${urlCount} URLs`);
  console.log(`  ℹ️  Sitemap toplam URL sayısı: ${urlCount}`);

  // Check education posts in sitemap
  const eduPosts = (sitemap.match(/\/education\/[a-z0-9-]+<\/loc>/g) || []);
  console.log(`  ℹ️  Education yazı URL sayısı: ${eduPosts.length}`);
  check('sitemap: has education posts', eduPosts.length > 10, `Found ${eduPosts.length}`);
}

async function suite9_StructuredData() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SUITE 9: Structured Data (JSON-LD)                   ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // Homepage JSON-LD
  const { html: homeHtml } = await fetchPage(BASE);
  const homeJsonLd = extractJsonLd(homeHtml);
  check('Homepage: has JSON-LD', homeJsonLd.length > 0, `Found ${homeJsonLd.length} blocks`);
  
  const types = homeJsonLd.map(j => j['@type']).flat();
  check('Homepage: Organization schema', types.includes('Organization'));
  check('Homepage: WebSite schema', types.includes('WebSite'));
  
  // Education listing page JSON-LD
  const { html: eduHtml } = await fetchPage(`${BASE}/education`);
  const eduJsonLd = extractJsonLd(eduHtml);
  const eduTypes = eduJsonLd.map(j => j['@type']).flat();
  check('Education: has JSON-LD', eduJsonLd.length > 0);
  check('Education: CollectionPage schema', eduTypes.includes('CollectionPage'));
  check('Education: BreadcrumbList schema', eduTypes.includes('BreadcrumbList'));
}

async function suite10_SecurityHeaders() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SUITE 10: Security & Performance Headers             ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const res = await fetch(BASE, { redirect: 'follow', headers: { 'User-Agent': 'FibAlgo-SEO-Audit/2.0' } });
  const h = res.headers;
  
  check('Header: X-Frame-Options or CSP', !!h.get('x-frame-options') || (h.get('content-security-policy') || '').includes('frame'));
  check('Header: X-Content-Type-Options', h.get('x-content-type-options') === 'nosniff');
  check('Header: Strict-Transport-Security', !!h.get('strict-transport-security'));
  check('Header: Content-Type', (h.get('content-type') || '').includes('text/html'));
}

async function suite11_CrossLocaleConsistency() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SUITE 11: Cross-Locale Tutarlılık                    ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // Test that TR pages have TR-specific canonical, not EN canonical
  const trPages = [
    { path: 'about', name: 'About TR' },
    { path: 'education', name: 'Education TR' },
    { path: 'library', name: 'Library TR' },
    { path: 'blog', name: 'Blog TR' },
  ];

  for (const page of trPages) {
    const trUrl = `${BASE}/tr/${page.path}`;
    const { html } = await fetchPage(trUrl);
    const canonical = extractCanonical(html);
    if (canonical) {
      check(`${page.name}: canonical has /tr/`, canonical.includes('/tr/'), 
        `canonical=${canonical}`);
    }
  }

  // Test that EN pages do NOT have /en/ in canonical
  const enPages = [
    { path: 'about', name: 'About EN' },
    { path: 'education', name: 'Education EN' },
    { path: 'library', name: 'Library EN' },
  ];

  for (const page of enPages) {
    const enUrl = `${BASE}/${page.path}`;
    const { html } = await fetchPage(enUrl);
    const canonical = extractCanonical(html);
    if (canonical) {
      check(`${page.name}: canonical NO /en/`, !canonical.includes('/en/'), 
        `canonical=${canonical}`);
    }
  }

  // Check that all tested pages have different og:locale for different locales
  const enHome = await fetchPage(BASE);
  const trHome = await fetchPage(`${BASE}/tr`);
  const enLocale = extractMeta(enHome.html, 'og:locale');
  const trLocale = extractMeta(trHome.html, 'og:locale');
  check('OG locale: EN ≠ TR', enLocale !== trLocale, `EN=${enLocale}, TR=${trLocale}`);
  check('OG locale: EN = en_US', enLocale === 'en_US', `Got ${enLocale}`);
  check('OG locale: TR = tr_TR', trLocale === 'tr_TR', `Got ${trLocale}`);
}

async function suite12_OGImageEndpoints() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  SUITE 12: OpenGraph Image Endpoints                  ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  // Root OG image
  const rootOg = await fetch(`${BASE}/opengraph-image`, { redirect: 'follow' });
  check('Root OG Image: HTTP 200', rootOg.status === 200, `Got ${rootOg.status}`);
  const rootCt = rootOg.headers.get('content-type') || '';
  check('Root OG Image: is image', rootCt.includes('image'), `Content-Type: ${rootCt}`);

  // Locale OG image (just test EN)
  const localeOg = await fetch(`${BASE}/en/opengraph-image`, { redirect: 'follow' });
  // It may redirect, that's fine
  check('Locale OG Image: accessible', localeOg.status === 200 || localeOg.status === 308, `Got ${localeOg.status}`);
}

// ──────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     FIBALGO SEO MEGA AUDIT — v2.0                              ║');
  console.log('║     Target: https://fibalgo.com                                ║');
  console.log('║     Date: ' + new Date().toISOString().slice(0, 19) + '                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  await suite1_StaticPages();
  await suite2_BlogPosts();
  await suite3_CategoryPages();
  await suite4_NoindexPages();
  await suite5_StaticFiles();
  await suite6_Redirects();
  await suite7_RobotsTxt();
  await suite8_SitemapXml();
  await suite9_StructuredData();
  await suite10_SecurityHeaders();
  await suite11_CrossLocaleConsistency();
  await suite12_OGImageEndpoints();

  // ──────── SONUÇ RAPORU ────────
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                        SONUÇ RAPORU                            ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Toplam Test:  ${String(totalTests).padStart(4)}                                          ║`);
  console.log(`║  ✅ Başarılı:  ${String(totalPass).padStart(4)}                                          ║`);
  console.log(`║  ❌ Başarısız: ${String(totalFail).padStart(4)}                                          ║`);
  console.log('╠══════════════════════════════════════════════════════════════════╣');

  if (failures.length === 0) {
    console.log('║                                                                ║');
    console.log('║   🎉🎉🎉  SIFIR PROBLEM — SEO TAMAMEN TEMİZ!  🎉🎉🎉       ║');
    console.log('║                                                                ║');
  } else {
    console.log('║  BAŞARISIZ TESTLER:                                            ║');
    for (const f of failures) {
      const line = `  ❌ ${f.test}`;
      console.log(`║${line.padEnd(64)}║`);
      if (f.detail) {
        const detLine = `     → ${f.detail}`;
        console.log(`║${detLine.padEnd(64)}║`);
      }
    }
  }
  console.log('╚══════════════════════════════════════════════════════════════════╝');

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });
