import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeNewsWithPerplexity } from '@/lib/ai/perplexity-news-analyzer';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function generateFaId(sourceId: string): string {
  const hash = crypto.createHash('sha256').update(sourceId).digest('hex');
  const numPart = parseInt(hash.substring(0, 8), 16) % 100000000;
  return `fa-${numPart.toString().padStart(8, '0')}`;
}

// GET endpoint for easy testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'unimportant';
  
  let title: string;
  let article: string;
  
  if (type === 'important') {
    title = "Tesla Unveils Optimus Gen 3 Robot at AI Day 2026, Mass Production Begins Q3";
    article = "Tesla CEO Elon Musk announced at the company's AI Day 2026 event that the Optimus humanoid robot Gen 3 will enter mass production in Q3 2026, with an initial price target of $20,000 per unit. Key announcements: FSD v13 achieving 99.99% safety rating, Dojo 2.0 supercomputer, new 4680 battery cells with 50% more range.";
  } else {
    title = "Apple Opens New Retail Store in Downtown Chicago";
    article = "Apple Inc. announced the opening of its newest retail store in downtown Chicago. The store features the company's latest store design with a focus on customer experience and community events. This marks Apple's 30th retail location in Illinois. The store opening ceremony was attended by local officials.";
  }
  
  console.log(`🧪 TEST ANALYZE (GET): Starting analysis for: ${title.substring(0, 50)}`);
  console.log(`📰 Type: ${type}`);

  try {
    const result = await analyzeNewsWithPerplexity({
      title,
      article,
      date: new Date().toISOString(),
      source: 'Test',
      url: ''
    });

    console.log('📊 Analysis result:', {
      should_build_infrastructure: result.stage1.should_build_infrastructure,
      trade_decision: result.stage3.trade_decision,
      importance_score: result.stage3.importance_score,
      total_cost: result.costs.total
    });

    // Save to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const newsId = `test-${Date.now()}`;
    
    const record = {
      news_id: newsId,
      source: 'Test',
      url: '',
      content: title + ' - ' + article,
      published_at: new Date().toISOString(),
      category: result.stage1.category || 'macro',
      sentiment: 'neutral',
      score: result.stage3.importance_score,
      ai_analysis: {
        stage1: result.stage1,
        stage3: result.stage3,
        collectedData: result.collectedData,
        costs: result.costs,
        timing: result.timing,
        analysis_duration_seconds: Math.round(result.timing.totalMs / 1000)
      },
      trading_pairs: [],
      signal: 'NO_TRADE',
      is_breaking: false,
      analyzed_at: new Date().toISOString(),
      time_horizon: 'short',
      risk_mode: 'neutral',
      would_trade: false
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('news_analyses')
      .insert(record)
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save', details: insertError }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: insertedData?.id,
      type,
      should_build_infrastructure: result.stage1.should_build_infrastructure,
      infrastructure_reasoning: result.stage1.infrastructure_reasoning,
      trade_decision: result.stage3.trade_decision,
      importance_score: result.stage3.importance_score,
      title: result.stage1.title,
      cost: result.costs.total
    });

  } catch (error) {
    console.error('Test analyze error:', error);
    return NextResponse.json({ error: 'Analysis failed', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, article, date, source, url } = body;

    if (!title || !article) {
      return NextResponse.json({ error: 'Missing title or article' }, { status: 400 });
    }

    console.log('🧪 TEST ANALYZE: Starting analysis for:', title.substring(0, 50));

    // Analyze with Perplexity AI (3-stage system)
    const result = await analyzeNewsWithPerplexity({
      title,
      article,
      date: date || new Date().toISOString(),
      source: source || 'Test',
      url: url || ''
    });

    console.log('📊 Analysis result:', {
      should_build_infrastructure: result.stage1.should_build_infrastructure,
      trade_decision: result.stage3.trade_decision,
      importance_score: result.stage3.importance_score,
      total_cost: result.costs.total
    });

    // Save to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const faId = generateFaId(`test-${Date.now()}`);
    
    const record = {
      id: faId,
      news_id: `test-${Date.now()}`,
      source: source || 'Test',
      url: url || '',
      content: title + ' - ' + article,
      published_at: date || new Date().toISOString(),
      category: result.stage1.category || 'macro',
      sentiment: 'neutral',
      score: result.stage3.importance_score,
      ai_analysis: {
        stage1: result.stage1,
        stage3: result.stage3,
        collectedData: result.collectedData,
        costs: result.costs,
        timing: result.timing,
        analysis_duration_seconds: Math.round(result.timing.totalMs / 1000)
      },
      trading_pairs: [],
      signal: 'NO_TRADE',
      is_breaking: false,
      analyzed_at: new Date().toISOString(),
      time_horizon: 'short',
      risk_mode: 'neutral',
      would_trade: false
    };

    const { error: insertError } = await supabase
      .from('news_analyses')
      .upsert(record, { onConflict: 'id' });

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save', details: insertError }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: faId,
      should_build_infrastructure: result.stage1.should_build_infrastructure,
      infrastructure_reasoning: result.stage1.infrastructure_reasoning,
      trade_decision: result.stage3.trade_decision,
      importance_score: result.stage3.importance_score,
      title: result.stage1.title,
      cost: result.costs.total
    });

  } catch (error) {
    console.error('Test analyze error:', error);
    return NextResponse.json({ error: 'Analysis failed', details: String(error) }, { status: 500 });
  }
}
