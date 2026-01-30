/**
 * Test script for news analysis pipeline
 * Run with: npx tsx src/scripts/test-pipeline.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=["']?(.+?)["']?$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

async function supabaseQuery(table: string, query: string = '') {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  return response.json();
}

async function supabaseUpdate(table: string, id: string, data: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

// Simple pipeline test without full module import
async function testAnalyzeNews(newsBody: string) {
  console.log('\n📰 Testing news analysis pipeline...');
  console.log('News body:', newsBody.substring(0, 100) + '...');

  // Call Strategist
  console.log('\n🧠 Step 1: Calling Strategist (GPT-4o)...');
  const strategistStart = Date.now();
  
  const strategistResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `You are a financial news strategist. Analyze the news and output a JSON with:
{
  "requiredData": {
    "marketPrices": [{"symbol": "BTCUSDT", "type": "crypto", "reason": "..."}],
    "macroInputs": ["VIX", "Fear & Greed"],
    "positioningProxies": []
  },
  "informationNature": { "classification": "...", "confidence": 0.8 },
  "marketImpactLogic": { "shouldMoveMarkets": true, "reasoning": "..." }
}`
        },
        { role: 'user', content: newsBody }
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    }),
  });

  if (!strategistResponse.ok) {
    throw new Error(`Strategist error: ${await strategistResponse.text()}`);
  }

  const strategistData = await strategistResponse.json();
  const strategistOutput = JSON.parse(strategistData.choices[0].message.content);
  console.log(`✅ Strategist completed in ${Date.now() - strategistStart}ms`);
  console.log('Required data:', JSON.stringify(strategistOutput.requiredData, null, 2));

  // Simulate data fetch
  console.log('\n📊 Step 2: Fetching market data...');
  const fetchStart = Date.now();
  
  // Fetch VIX
  let vix = 0;
  try {
    const vixRes = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d');
    if (vixRes.ok) {
      const vixData = await vixRes.json();
      vix = vixData.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
    }
  } catch {}
  
  // Fetch Fear & Greed
  let fearGreed = 0;
  try {
    const fgRes = await fetch('https://api.alternative.me/fng/?limit=1');
    if (fgRes.ok) {
      const fgData = await fgRes.json();
      fearGreed = parseInt(fgData.data[0].value);
    }
  } catch {}

  console.log(`✅ Data fetch completed in ${Date.now() - fetchStart}ms`);
  console.log(`  VIX: ${vix}, Fear & Greed: ${fearGreed}`);

  // Call Executor
  console.log('\n🎯 Step 3: Calling Executor (GPT-4o)...');
  const executorStart = Date.now();

  const executorResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: `You are a trading signal generator. Based on the news and market data, output JSON:
{
  "executiveSummary": "One sentence signal",
  "signal": {
    "direction": "BUY|SELL|STRONG_BUY|STRONG_SELL|NO_TRADE",
    "primaryAsset": "BTCUSDT",
    "conviction": 1-10,
    "wouldTrade": true/false,
    "rationale": "..."
  },
  "timing": { "timeHorizon": "short|swing|macro", "urgency": "hours|days" },
  "riskAssessment": { "keyRisk": "...", "invalidation": "..." },
  "marketContext": { "riskMode": "risk-on|risk-off|neutral" },
  "scenarioMatrix": {
    "base": { "probability": 60, "description": "..." },
    "upside": { "probability": 25, "trigger": "..." },
    "downside": { "probability": 15, "trigger": "..." }
  },
  "noveltyScore": { "pricedInLevel": 1-10, "isBreakingNews": false },
  "confidenceLevel": 1-10
}`
        },
        { 
          role: 'user', 
          content: `NEWS: ${newsBody}\n\nMARKET DATA: VIX=${vix}, Fear&Greed=${fearGreed}\n\nSTRATEGIST GUIDANCE: ${JSON.stringify(strategistOutput)}`
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    }),
  });

  if (!executorResponse.ok) {
    throw new Error(`Executor error: ${await executorResponse.text()}`);
  }

  const executorData = await executorResponse.json();
  const executorOutput = JSON.parse(executorData.choices[0].message.content);
  console.log(`✅ Executor completed in ${Date.now() - executorStart}ms`);

  return {
    strategist: strategistOutput,
    executor: executorOutput,
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 NEWS ANALYSIS PIPELINE TEST');
  console.log('═══════════════════════════════════════════════════════════════');

  // Check env
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found');
    process.exit(1);
  }
  console.log('✅ Environment variables loaded');

  // Get last 5 news
  console.log('\n📥 Fetching last 5 news from database...');
  const newsItems = await supabaseQuery(
    'news_analyses',
    '?select=id,title,category,published_at&order=published_at.desc&limit=5'
  );

  if (!newsItems || newsItems.length === 0) {
    console.error('❌ No news found');
    process.exit(1);
  }

  console.log(`Found ${newsItems.length} news items:\n`);
  newsItems.forEach((n: { category: string; title: string }, i: number) => {
    console.log(`${i + 1}. [${n.category}] ${n.title.substring(0, 60)}...`);
  });

  // Analyze each news
  for (let i = 0; i < newsItems.length; i++) {
    const news = newsItems[i];
    console.log(`\n${'═'.repeat(65)}`);
    console.log(`📰 ANALYZING NEWS ${i + 1}/${newsItems.length}`);
    console.log(`${'═'.repeat(65)}`);
    console.log(`Title: ${news.title}`);
    console.log(`Category: ${news.category}`);

    try {
      const result = await testAnalyzeNews(news.title);
      
      // Map to DB format
      const signal = result.executor.signal || {};
      const dbUpdate = {
        sentiment: signal.direction === 'STRONG_BUY' || signal.direction === 'BUY' ? 'bullish' :
                   signal.direction === 'STRONG_SELL' || signal.direction === 'SELL' ? 'bearish' : 'neutral',
        score: signal.conviction || 5,
        summary: result.executor.executiveSummary || '',
        risk: result.executor.riskAssessment?.keyRisk || '',
        signal: signal.direction || 'NO_TRADE',
        would_trade: signal.wouldTrade || false,
        time_horizon: result.executor.timing?.timeHorizon === 'immediate' ? 'short' :
                      result.executor.timing?.timeHorizon || 'short',
        risk_mode: result.executor.marketContext?.riskMode || 'neutral',
        is_breaking: result.executor.noveltyScore?.isBreakingNews || false,
        ai_analysis: {
          ...result.executor,
          strategist: result.strategist,
        },
        analyzed_at: new Date().toISOString(),
      };

      // Update database
      console.log('\n💾 Updating database...');
      const updateResult = await supabaseUpdate('news_analyses', news.id, dbUpdate);
      
      // Summary
      console.log('\n📊 RESULT:');
      console.log(`  Signal: ${dbUpdate.signal}`);
      console.log(`  Conviction: ${dbUpdate.score}/10`);
      console.log(`  Would Trade: ${dbUpdate.would_trade}`);
      console.log(`  Time Horizon: ${dbUpdate.time_horizon}`);
      console.log(`  Risk Mode: ${dbUpdate.risk_mode}`);
      console.log(`  Summary: ${dbUpdate.summary.substring(0, 100)}...`);
      console.log('✅ Database updated');

    } catch (error) {
      console.error(`❌ Error analyzing news:`, error);
    }

    // Rate limit protection
    if (i < newsItems.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next analysis...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ PIPELINE TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
