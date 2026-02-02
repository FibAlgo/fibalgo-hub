// Full local test of analyzeNewsWithPerplexity
// This mimics what the cron does

import { readFileSync } from 'fs';

// Read .env.local
const envContent = readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
const env = {};
for (const line of envLines) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
  }
}

// Set env vars
process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
process.env.PERPLEXITY_API_KEY = env.PERPLEXITY_API_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
process.env.FMP_API_KEY = env.FMP_API_KEY;

console.log('Environment loaded');
console.log('OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);

// Now import and test
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = 'gpt-5.2';

// Simplified Stage 1 prompt (similar to actual)
const STAGE_1_PROMPT = `You are an investor specializing in analyzing financial news.

NEWS DATE: {NEWS_DATE}

NEWS ARTICLE:
{NEWS_ARTICLE}

IMPORTANT: Respond with valid JSON only, no markdown.

Analyze this news and respond in this exact JSON format:
{
  "title": "Concise headline (max 100 chars)",
  "analysis": "Your analysis of the news",
  "should_build_infrastructure": true or false,
  "infrastructure_reasoning": "Why trading should or should not be pursued",
  "category": "stocks" (or forex/crypto/commodities/indices/macro/earnings),
  "affected_assets": ["AAPL"] or [],
  "fmp_requests": [],
  "required_web_metrics": [],
  "required_data": []
}

Respond ONLY with valid JSON, no other text.`;

async function testAnalysis() {
  // Sample news like what Benzinga would send
  const news = {
    title: "Tesla Cybertruck deliveries surge 40% in January as EV competition heats up",
    article: "Tesla Inc (NASDAQ: TSLA) reported a significant 40% increase in Cybertruck deliveries for January 2026, according to registration data analyzed by automotive research firm Experian. The surge comes amid intensifying competition in the electric vehicle market, with legacy automakers like Ford and GM ramping up their EV offerings. Analysts at Morgan Stanley maintained their Overweight rating on Tesla, citing the Cybertruck's strong initial reception despite production challenges.",
    date: new Date().toISOString(),
    source: "benzinga newsdesk"
  };

  const formattedDate = new Date(news.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const prompt = STAGE_1_PROMPT
    .replace('{NEWS_DATE}', formattedDate)
    .replace('{NEWS_ARTICLE}', news.article);

  console.log('\n=== Testing Stage 1 Analysis ===');
  console.log('News:', news.title);
  console.log('Prompt length:', prompt.length, 'chars');

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: 2000,
        reasoning_effort: 'high',
      }),
    });

    console.log('\n=== API Response ===');
    console.log('Status:', res.status, res.statusText);

    if (!res.ok) {
      const errText = await res.text();
      console.log('Error:', errText);
      return;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('\nUsage:', JSON.stringify(data.usage));
    console.log('\n=== Raw Content ===');
    console.log('Length:', content.length);
    console.log('First 200 chars:', JSON.stringify(content.slice(0, 200)));
    console.log('\nFull content:');
    console.log(content);

    // Try parsing
    console.log('\n=== Parse Attempt ===');
    try {
      const parsed = JSON.parse(content);
      console.log('SUCCESS! Title:', parsed.title);
      console.log('Category:', parsed.category);
      console.log('Should build:', parsed.should_build_infrastructure);
    } catch (e) {
      console.log('PARSE FAILED:', e.message);
      
      // Try extracting JSON
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const extracted = JSON.parse(match[0]);
          console.log('Extracted JSON works! Title:', extracted.title);
        } catch (e2) {
          console.log('Extracted also failed');
        }
      }
    }

  } catch (error) {
    console.error('Request error:', error);
  }
}

testAnalysis();
