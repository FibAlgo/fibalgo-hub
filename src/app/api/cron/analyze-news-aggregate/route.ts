import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ═══════════════════════════════════════════════════════════════════════════
// KATMAN 1 — SYSTEM PROMPT
// Karakter & Disiplin – Değişmez
// Kurumsal Makro Stratejist
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are a senior institutional macro strategist.

You analyze aggregated financial news flows across daily, weekly, and monthly horizons.

Your job is NOT to predict markets, but to:
- Identify regime shifts
- Detect changes in risk appetite and liquidity
- Distinguish signal from noise
- Assess whether narratives are strengthening, weakening, or fading

You think in terms of:
- Positioning
- Capital flows
- Risk regimes
- Macro dominance vs micro relevance

ABSOLUTE RULES:
- Respond ONLY with valid JSON
- Follow the schema EXACTLY
- No storytelling, no hype, no speculation
- Never invent facts
- If information is mixed or unclear, be neutral
- No markdown, no explanations, no commentary`;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getDateRange(periodType: 'daily' | 'weekly' | 'monthly'): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (periodType === 'daily') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (periodType === 'weekly') {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(now.getDate() + mondayOffset);
    start.setHours(0, 0, 0, 0);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH NEWS FROM DATABASE
// ═══════════════════════════════════════════════════════════════════════════

async function fetchNewsFromDB(
  supabase: any,
  startDate: string,
  endDate: string,
  limit: number = 50
): Promise<any[]> {
  const { data, error } = await supabase
    .from('news_analyses')
    .select('title, source, summary, sentiment, score, trading_pairs, analyzed_at')
    .gte('analyzed_at', startDate)
    .lte('analyzed_at', endDate + 'T23:59:59.999Z')
    .order('analyzed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch news:', error);
    return [];
  }

  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYZE NEWS AGGREGATE WITH DEEPSEEK
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeNewsAggregate(
  dailyNews: any[],
  weeklyNews: any[],
  monthlyNews: any[],
  periodType: string
): Promise<any> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  // Format news for prompt
  const formatNewsBlock = (news: any[]): string => {
    if (news.length === 0) return 'No news available for this period.';
    return news.map(n => {
      const pairs = n.trading_pairs?.map((p: any) => p.symbol || p).join(', ');
      return `- [${n.sentiment?.toUpperCase() || 'N/A'}] ${n.title} (${n.source}) - Score: ${n.score}/10${pairs ? ` | Assets: ${pairs}` : ''}`;
    }).join('\n');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // KATMAN 2 — USER PROMPT
  // Toplu Haber Analizi Görevi
  // ═══════════════════════════════════════════════════════════════════════════

  const userPrompt = `Analyze the following aggregated financial news.

The data contains DAILY, WEEKLY, and MONTHLY news summaries pulled from an API.

Your task:
- Synthesize the information, not summarize headlines
- Identify dominant macro themes
- Assess risk regime and capital flow implications
- Determine whether markets are in:
  - Transition
  - Consolidation
  - Trend reinforcement
  - Distribution

Do NOT generate trade signals.
Do NOT provide price predictions.

NEWS INPUT:

Daily News (${dailyNews.length} items):
${formatNewsBlock(dailyNews)}

Weekly News (${weeklyNews.length} items):
${formatNewsBlock(weeklyNews)}

Monthly News (${monthlyNews.length} items):
${formatNewsBlock(monthlyNews)}

Respond with this exact JSON schema:

{
  "marketRegime": "risk-on" | "risk-off" | "neutral" | "transition",
  "macroBias": "bullish" | "bearish" | "neutral",
  "confidence": <integer 1-10>,
  "dominantThemes": [
    {
      "theme": "<string>",
      "direction": "strengthening" | "weakening" | "stable",
      "timeframe": "daily" | "weekly" | "monthly",
      "macroRelevance": "high" | "medium" | "low"
    }
  ],
  "liquidityCondition": "tightening" | "easing" | "stable" | "unclear",
  "volatilityRegime": "rising" | "falling" | "stable" | "elevated",
  "positioningImplication": "<concise assessment of how institutional positioning is likely adjusting>",
  "riskAssessment": "<key systemic or macro risks currently dominant. Empty string if none>",
  "assetsInFocus": ["<UPPERCASE SYMBOLS>"],
  "actionability": "low" | "medium" | "high",
  "notes": "<max 2 sentences. Institutional tone. Focus on what matters, not what is loud.>"
}`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.15,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in DeepSeek response');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('DeepSeek analysis failed:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  try {
    // Verify cron authentication (handles x-vercel-cron, Bearer token, query param, user-agent)
    const { verifyCronAuth } = await import('@/lib/api/auth');
    const cronAuth = verifyCronAuth(request);
    if (!cronAuth.authorized) {
      console.warn('[Cron] Unauthorized access attempt to analyze-news-aggregate');
      return NextResponse.json({ error: cronAuth.error }, { status: cronAuth.statusCode || 401 });
    }

    const url = new URL(request.url);
    const periodType = (url.searchParams.get('period') || 'daily') as 'daily' | 'weekly' | 'monthly';
    const forceRefresh = url.searchParams.get('force') === 'true';

    if (!['daily', 'weekly', 'monthly'].includes(periodType)) {
      return NextResponse.json({ error: 'Invalid period type' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get date range for requested period
    const { start, end } = getDateRange(periodType);
    const startDate = formatDate(start);
    const endDate = formatDate(end);

    // Check if analysis already exists
    if (!forceRefresh) {
      const { data: existing } = await supabase
        .from('news_aggregate_analyses')
        .select('*')
        .eq('period_type', periodType)
        .eq('period_start', startDate)
        .single();

      if (existing) {
        return NextResponse.json({
          success: true,
          cached: true,
          analysis: existing
        });
      }
    }

    // Fetch news for all timeframes
    console.log(`Fetching news for aggregate analysis: ${periodType}`);
    
    // Daily: today's news
    const today = new Date();
    const dailyStart = formatDate(today);
    const dailyNews = await fetchNewsFromDB(supabase, dailyStart, dailyStart, 30);
    
    // Weekly: this week's news
    const weekRange = getDateRange('weekly');
    const weeklyNews = await fetchNewsFromDB(supabase, formatDate(weekRange.start), formatDate(weekRange.end), 50);
    
    // Monthly: this month's news
    const monthRange = getDateRange('monthly');
    const monthlyNews = await fetchNewsFromDB(supabase, formatDate(monthRange.start), formatDate(monthRange.end), 100);

    const totalNews = dailyNews.length + weeklyNews.length + monthlyNews.length;
    console.log(`Found ${dailyNews.length} daily, ${weeklyNews.length} weekly, ${monthlyNews.length} monthly news`);

    if (totalNews === 0) {
      // Create neutral analysis if no news
      const neutralAnalysis = {
        marketRegime: 'neutral',
        macroBias: 'neutral',
        confidence: 5,
        dominantThemes: [],
        liquidityCondition: 'unclear',
        volatilityRegime: 'stable',
        positioningImplication: 'Insufficient data for positioning assessment.',
        riskAssessment: '',
        assetsInFocus: [],
        actionability: 'low',
        notes: 'No news data available for analysis. Markets may be in low-information regime.'
      };

      const { data: inserted } = await supabase
        .from('news_aggregate_analyses')
        .upsert({
          period_type: periodType,
          period_start: startDate,
          period_end: endDate,
          market_regime: neutralAnalysis.marketRegime,
          macro_bias: neutralAnalysis.macroBias,
          confidence: neutralAnalysis.confidence,
          dominant_themes: neutralAnalysis.dominantThemes,
          liquidity_condition: neutralAnalysis.liquidityCondition,
          volatility_regime: neutralAnalysis.volatilityRegime,
          positioning_implication: neutralAnalysis.positioningImplication,
          risk_assessment: neutralAnalysis.riskAssessment,
          assets_in_focus: neutralAnalysis.assetsInFocus,
          actionability: neutralAnalysis.actionability,
          notes: neutralAnalysis.notes,
          news_count: 0,
          model_used: 'deepseek-chat',
          analyzed_at: new Date().toISOString()
        }, { onConflict: 'period_type,period_start' })
        .select()
        .single();

      return NextResponse.json({
        success: true,
        noNews: true,
        analysis: inserted || neutralAnalysis
      });
    }

    // Analyze with OpenAI
    console.log('Analyzing news aggregate with DeepSeek...');
    const analysis = await analyzeNewsAggregate(dailyNews, weeklyNews, monthlyNews, periodType);

    // Save to database
    const { data: inserted, error: insertError } = await supabase
      .from('news_aggregate_analyses')
      .upsert({
        period_type: periodType,
        period_start: startDate,
        period_end: endDate,
        market_regime: analysis.marketRegime,
        macro_bias: analysis.macroBias,
        confidence: analysis.confidence,
        dominant_themes: analysis.dominantThemes || [],
        liquidity_condition: analysis.liquidityCondition,
        volatility_regime: analysis.volatilityRegime,
        positioning_implication: analysis.positioningImplication,
        risk_assessment: analysis.riskAssessment || '',
        assets_in_focus: analysis.assetsInFocus || [],
        actionability: analysis.actionability,
        notes: analysis.notes,
        news_count: totalNews,
        model_used: 'deepseek-chat',
        analyzed_at: new Date().toISOString()
      }, { onConflict: 'period_type,period_start' })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Return analysis even if database save fails (table might not exist yet)
      return NextResponse.json({
        success: true,
        warning: 'Analysis generated but not saved to database. Run migration to create table.',
        periodType,
        startDate,
        endDate,
        newsCount: {
          daily: dailyNews.length,
          weekly: weeklyNews.length,
          monthly: monthlyNews.length,
          total: totalNews
        },
        analysis: {
          id: null,
          period_type: periodType,
          period_start: startDate,
          period_end: endDate,
          market_regime: analysis.marketRegime,
          macro_bias: analysis.macroBias,
          confidence: analysis.confidence,
          dominant_themes: analysis.dominantThemes || [],
          liquidity_condition: analysis.liquidityCondition,
          volatility_regime: analysis.volatilityRegime,
          positioning_implication: analysis.positioningImplication,
          risk_assessment: analysis.riskAssessment || '',
          assets_in_focus: analysis.assetsInFocus || [],
          actionability: analysis.actionability,
          notes: analysis.notes,
          news_count: totalNews,
          analyzed_at: new Date().toISOString()
        }
      });
    }

    // Cleanup old analyses (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    await supabase
      .from('news_aggregate_analyses')
      .delete()
      .lt('analyzed_at', thirtyDaysAgo.toISOString());

    return NextResponse.json({
      success: true,
      periodType,
      startDate,
      endDate,
      newsCount: {
        daily: dailyNews.length,
        weekly: weeklyNews.length,
        monthly: monthlyNews.length,
        total: totalNews
      },
      analysis: inserted
    });

  } catch (error) {
    console.error('News aggregate analysis error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
