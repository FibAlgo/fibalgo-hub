import https from 'https';

function fetch(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Googlebot/2.1', 'Accept-Language': 'en' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        const loc = res.headers.location.startsWith('http') ? res.headers.location : 'https://fibalgo.com' + res.headers.location;
        res.on('data', () => {});
        return fetch(loc, maxRedirects - 1).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body, finalUrl: url }));
    }).on('error', reject);
  });
}

async function checkPage(url, label) {
  const r = await fetch(url);
  const issues = [];

  if (r.status !== 200) issues.push('STATUS ' + r.status);

  const canonMatch = r.body.match(/rel="canonical"[^>]*href="([^"]+)"/i);
  const canonical = canonMatch ? canonMatch[1] : null;
  if (!canonical) issues.push('NO CANONICAL');
  else if (canonical.endsWith('/') && canonical.length > 'https://fibalgo.com/'.length) issues.push('TRAILING SLASH: ' + canonical);

  const hreflangs = [...r.body.matchAll(/hreflang="([^"]+)"[^>]*href="([^"]+)"/gi)];
  if (hreflangs.length === 0) {
    issues.push('NO HREFLANG TAGS');
  } else {
    const bad = hreflangs.filter(m => {
      const h = m[2];
      return h.endsWith('/') && h !== 'https://fibalgo.com/' && h !== 'https://fibalgo.com';
    });
    if (bad.length > 0) issues.push(bad.length + ' HREFLANG WITH TRAILING SLASH');
    if (!hreflangs.find(m => m[1] === 'x-default')) issues.push('NO X-DEFAULT');
    if (hreflangs.length < 30) issues.push('ONLY ' + hreflangs.length + ' HREFLANGS (expected 31)');
  }

  const linkHeader = r.headers['link'] || '';
  if (linkHeader.includes('hreflang')) issues.push('HTTP LINK HEADER HAS HREFLANG');

  if (!r.body.match(/<title[^>]*>[^<]+<\/title>/i)) issues.push('NO TITLE');
  if (!r.body.match(/name="description"/)) issues.push('NO META DESCRIPTION');
  if (!r.body.match(/<h1[\s>]/i)) issues.push('NO H1');
  if (!r.body.match(/property="og:title"/)) issues.push('NO OG:TITLE');
  if (!r.body.match(/property="og:description"/)) issues.push('NO OG:DESCRIPTION');
  if (!r.body.match(/property="og:image"/)) issues.push('NO OG:IMAGE');
  if (!r.body.match(/name="twitter:card"/)) issues.push('NO TWITTER:CARD');
  if (r.body.match(/name="robots"[^>]*content="[^"]*noindex/i)) issues.push('NOINDEX');

  const clean = url.replace(/\/$/, '');
  if (canonical && canonical !== clean && !(url === 'https://fibalgo.com' && canonical === 'https://fibalgo.com')) {
    issues.push('CANONICAL MISMATCH: got ' + canonical + ', expected ' + clean);
  }

  return { label, url, issues, hreflangCount: hreflangs.length, canonical, status: r.status };
}

function checkStatic(url) {
  return new Promise(resolve => {
    https.get(url, res => {
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode));
    }).on('error', () => resolve('ERR'));
  });
}

function checkRedirect(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Googlebot/2.1' } }, res => {
      res.on('data', () => {});
      res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location }));
    }).on('error', e => resolve({ status: 'ERR', location: null }));
  });
}

(async () => {
  console.log('══════════════════════════════════════════════════════');
  console.log('  FIBALGO.COM — KAPSAMLI SEO FİNAL AUDIT');
  console.log('  ' + new Date().toISOString());
  console.log('══════════════════════════════════════════════════════\n');

  const pages = [
    ['https://fibalgo.com', 'Homepage (EN)'],
    ['https://fibalgo.com/tr', 'Homepage (TR)'],
    ['https://fibalgo.com/es', 'Homepage (ES)'],
    ['https://fibalgo.com/de', 'Homepage (DE)'],
    ['https://fibalgo.com/ja', 'Homepage (JA)'],
    ['https://fibalgo.com/ar', 'Homepage (AR)'],
    ['https://fibalgo.com/about', 'About (EN)'],
    ['https://fibalgo.com/tr/about', 'About (TR)'],
    ['https://fibalgo.com/education', 'Education (EN)'],
    ['https://fibalgo.com/tr/education', 'Education (TR)'],
    ['https://fibalgo.com/library', 'Library (EN)'],
    ['https://fibalgo.com/blog', 'Blog (EN)'],
    ['https://fibalgo.com/tr/blog', 'Blog (TR)'],
  ];

  console.log('─── 1/4  SAYFA SEO (13 sayfa × 12 kontrol = 156 test) ───\n');
  let totalIssues = 0;

  for (const [url, label] of pages) {
    const r = await checkPage(url, label);
    const icon = r.issues.length === 0 ? '✅' : '❌';
    console.log(`${icon} ${label}`);
    console.log(`   canonical: ${r.canonical}`);
    console.log(`   hreflang:  ${r.hreflangCount} tags`);
    if (r.issues.length > 0) {
      r.issues.forEach(i => console.log(`   ⚠️  ${i}`));
      totalIssues += r.issues.length;
    }
  }

  console.log('\n─── 2/4  STATİK DOSYALAR ───\n');
  const statics = [
    'https://fibalgo.com/logo-white.svg',
    'https://fibalgo.com/logo.svg',
    'https://fibalgo.com/logo-white.png',
    'https://fibalgo.com/logo.png',
    'https://fibalgo.com/favicon.ico',
    'https://fibalgo.com/robots.txt',
    'https://fibalgo.com/sitemap.xml',
    'https://fibalgo.com/manifest.webmanifest',
    'https://fibalgo.com/icon-192x192.png',
    'https://fibalgo.com/icon-512x512.png',
    'https://fibalgo.com/apple-touch-icon.png',
    'https://fibalgo.com/sw-notifications.js',
  ];
  for (const url of statics) {
    const s = await checkStatic(url);
    const name = url.replace('https://fibalgo.com/', '');
    const icon = s === 200 ? '✅' : '❌';
    console.log(`${icon} /${name} → ${s}`);
    if (s !== 200) totalIssues++;
  }

  console.log('\n─── 3/4  REDIRECT KONTROLLERI ───\n');
  const redirectTests = [
    ['https://fibalgo.com/en', '/en → / (301/307/308)'],
    ['https://fibalgo.com/en/about', '/en/about → /about'],
    ['https://fibalgo.com/en/education', '/en/education → /education'],
  ];
  for (const [url, desc] of redirectTests) {
    const r = await checkRedirect(url);
    const ok = r.status >= 300 && r.status < 400;
    console.log(`${ok ? '✅' : '⚠️'} ${desc}`);
    console.log(`   ${r.status}${r.location ? ' → ' + r.location : ''}`);
  }

  console.log('\n─── 4/4  ROBOTS.TXT & SITEMAP İÇERİK ───\n');
  const robots = await fetch('https://fibalgo.com/robots.txt');
  const hasAllow = robots.body.includes('Allow');
  const hasSitemap = robots.body.includes('Sitemap');
  const hasDisallow = robots.body.includes('Disallow');
  console.log(`${hasAllow ? '✅' : '❌'} robots.txt has Allow`);
  console.log(`${hasSitemap ? '✅' : '❌'} robots.txt has Sitemap reference`);
  console.log(`${hasDisallow ? '✅' : '⚠️'} robots.txt has Disallow rules`);

  const sitemap = await fetch('https://fibalgo.com/sitemap.xml');
  const urlCount = (sitemap.body.match(/<loc>/g) || []).length;
  const hasEN = sitemap.body.includes('fibalgo.com/about');
  const hasTR = sitemap.body.includes('fibalgo.com/tr');
  console.log(`${urlCount > 0 ? '✅' : '❌'} sitemap.xml: ${urlCount} URLs`);
  console.log(`${hasEN ? '✅' : '❌'} sitemap has EN pages`);
  console.log(`${hasTR ? '✅' : '❌'} sitemap has TR pages`);

  console.log('\n══════════════════════════════════════════════════════');
  if (totalIssues === 0) {
    console.log('  ✅ SONUÇ: SIFIR PROBLEM — SEO TAMAMEN TEMİZ!');
  } else {
    console.log(`  ❌ SONUÇ: ${totalIssues} PROBLEM BULUNDU`);
  }
  console.log('══════════════════════════════════════════════════════');
})();
