/**
 * News analysis test — rastgele bir haber ile analiz çağrısı.
 * Önce: npm run dev (veya yarn dev)
 * Sonra: node scripts/test-news-analysis.mjs
 */

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

const RANDOM_NEWS = [
  {
    headline: 'Fed keeps rates unchanged at 5.25-5.50%, signals one cut in 2025',
    body: 'The Federal Reserve left interest rates unchanged on Wednesday and signaled one rate cut in 2025. Chair Powell said inflation has eased but more confidence is needed. Markets rallied on the dovish tone; S&P 500 and Nasdaq closed higher.',
  },
  {
    headline: 'US CPI rises 0.3% MoM in January, core at 3.9% YoY',
    body: 'U.S. consumer prices rose 0.3% in January from December, and 3.1% from a year ago. Core CPI was 3.9% year-over-year. Treasury yields jumped and the dollar strengthened as traders scaled back rate-cut bets.',
  },
  {
    headline: 'Apple reports Q4 earnings beat, iPhone revenue up 6%',
    body: 'Apple reported quarterly earnings that beat estimates. EPS came in at $1.64 vs consensus $1.61. iPhone revenue increased 6% year-over-year. The company issued cautious guidance for the current quarter. Shares rose in after-hours trading.',
  },
];

async function main() {
  const news = RANDOM_NEWS[Math.floor(Math.random() * RANDOM_NEWS.length)];
  console.log('Testing news analysis with:');
  console.log('  Headline:', news.headline);
  console.log('  Body (first 80 chars):', news.body.slice(0, 80) + '...');
  console.log('');

  const url = `${BASE}/api/dev/test-news-analysis`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ news }),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error('API error:', res.status, data);
      process.exit(1);
    }

    if (data.parseError) {
      console.log('❌ PARSE ERROR still present.');
      console.log('   stage1Title:', data.stage1Title);
      console.log('   stage1AnalysisSnippet:', data.stage1AnalysisSnippet);
    } else {
      console.log('✅ No parse error. Analysis completed successfully.');
      console.log('   stage1Title:', data.stage1Title);
      console.log('   stage1AnalysisSnippet:', (data.stage1AnalysisSnippet || '').slice(0, 150) + '...');
    }
    console.log('   Timing (ms):', data.timing?.totalMs ?? 'N/A');
  } catch (err) {
    console.error('Request failed:', err.message);
    if (err.message?.includes('fetch') || err.message?.includes('ECONNREFUSED')) {
      console.error('Make sure dev server is running: npm run dev');
    }
    process.exit(1);
  }
}

main();
