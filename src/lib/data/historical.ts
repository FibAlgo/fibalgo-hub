/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📜 HISTORICAL ANALOGS DATABASE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Historical market events and their outcomes for pattern matching:
 * - Fed rate decisions
 * - CPI surprises
 * - Earnings reactions by sector
 * - Geopolitical events
 * - Black swan events
 * 
 * Used by AI to provide historical context for current news
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface HistoricalEvent {
  id: string;
  date: string;
  category: 'fed' | 'cpi' | 'earnings' | 'geopolitical' | 'technical' | 'black_swan';
  title: string;
  description: string;
  context: string;
  marketConditions: {
    vix: number;
    spyLevel: number;
    trend: 'bullish' | 'bearish' | 'sideways';
    sentiment: string;
  };
  outcome: {
    immediate: string; // Same day
    shortTerm: string; // 1 week
    mediumTerm: string; // 1 month
  };
  priceImpact: {
    spy1d: number; // % change
    spy1w: number;
    spy1m: number;
    sector?: string;
    sectorImpact?: number;
  };
  lessons: string[];
  tags: string[];
}

export interface HistoricalAnalog {
  event: HistoricalEvent;
  similarity: number; // 0-100
  matchReasons: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORICAL EVENTS DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

export const HISTORICAL_EVENTS: HistoricalEvent[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // FED EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'fed-pivot-2023',
    date: '2023-12-13',
    category: 'fed',
    title: 'Fed Signals Rate Cuts in 2024',
    description: 'Fed holds rates steady and signals 75bps of cuts in 2024, surprising markets with dovish pivot',
    context: 'Inflation had been declining, market expected hawkish hold. Fed surprised with dovish dot plot.',
    marketConditions: { vix: 12.5, spyLevel: 469, trend: 'bullish', sentiment: 'cautiously optimistic' },
    outcome: {
      immediate: 'SPY +1.4%, massive rally in growth stocks, yields plunged',
      shortTerm: 'Santa rally continued, SPY +3% in following week',
      mediumTerm: 'New all-time highs in January, SPY +5%'
    },
    priceImpact: { spy1d: 1.4, spy1w: 3.0, spy1m: 5.0 },
    lessons: [
      'Fed pivots can trigger massive rallies',
      'Growth stocks outperform when rates expected to fall',
      'Market can rally even from already elevated levels'
    ],
    tags: ['fed', 'dovish', 'pivot', 'rate cuts', 'santa rally']
  },
  {
    id: 'fed-50bp-hike-2022-sep',
    date: '2022-09-21',
    category: 'fed',
    title: 'Fed Hikes 75bps, Hawkish Guidance',
    description: 'Third consecutive 75bp hike with hawkish Powell press conference',
    context: 'Inflation sticky at 8%+, market hoped for pivot signals. Got hawkish surprise instead.',
    marketConditions: { vix: 26, spyLevel: 385, trend: 'bearish', sentiment: 'fearful' },
    outcome: {
      immediate: 'SPY -1.7%, initial rally reversed on hawkish presser',
      shortTerm: 'Continued selloff, SPY -5% to October lows',
      mediumTerm: 'October bottom, then Q4 rally +8%'
    },
    priceImpact: { spy1d: -1.7, spy1w: -5.0, spy1m: -3.0 },
    lessons: [
      'Hawkish Fed surprises can trigger extended selloffs',
      'Powell press conference often more important than decision',
      'Capitulation selling can mark bottoms'
    ],
    tags: ['fed', 'hawkish', 'rate hike', '75bp', 'bearish']
  },
  {
    id: 'fed-emergency-cut-2020',
    date: '2020-03-03',
    category: 'fed',
    title: 'Fed Emergency 50bp Rate Cut',
    description: 'First emergency rate cut since 2008 as COVID fears mount',
    context: 'COVID spreading globally, markets volatile. Fed acted between meetings.',
    marketConditions: { vix: 33, spyLevel: 310, trend: 'bearish', sentiment: 'panicked' },
    outcome: {
      immediate: 'SPY -2.8%, market interpreted as Fed seeing worse data',
      shortTerm: 'Massive selloff continued, -12% in week',
      mediumTerm: 'March 23 bottom at -34%, then historic rally'
    },
    priceImpact: { spy1d: -2.8, spy1w: -12.0, spy1m: -25.0 },
    lessons: [
      'Emergency cuts can scare markets more than help',
      'Fed action alone cannot stop panic selloffs',
      'Fiscal policy needed alongside monetary policy in crises'
    ],
    tags: ['fed', 'emergency cut', 'covid', 'panic', 'crisis']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CPI / INFLATION EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'cpi-hot-june-2022',
    date: '2022-06-10',
    category: 'cpi',
    title: 'CPI Hits 9.1% - 40-Year High',
    description: 'June CPI comes in at 9.1%, highest since 1981, way above expectations',
    context: 'Market expected 8.8%, got 9.1%. Energy prices spiking.',
    marketConditions: { vix: 28, spyLevel: 390, trend: 'bearish', sentiment: 'fearful' },
    outcome: {
      immediate: 'SPY -2.9%, massive gap down',
      shortTerm: 'Continued lower, hit June lows',
      mediumTerm: 'This was near the CPI peak, market bottomed in October'
    },
    priceImpact: { spy1d: -2.9, spy1w: -5.8, spy1m: -2.0 },
    lessons: [
      'Hot CPI prints can cause immediate selloffs',
      'Peak inflation readings often mark turning points',
      'Worst CPI print was near market bottom'
    ],
    tags: ['cpi', 'inflation', 'hot', 'surprise', 'bearish']
  },
  {
    id: 'cpi-cool-nov-2022',
    date: '2022-11-10',
    category: 'cpi',
    title: 'CPI Cools More Than Expected',
    description: 'October CPI at 7.7% vs 7.9% expected, first major cooling sign',
    context: 'Market desperate for inflation peak confirmation. Got it.',
    marketConditions: { vix: 23, spyLevel: 380, trend: 'sideways', sentiment: 'hopeful' },
    outcome: {
      immediate: 'SPY +5.5%, biggest CPI day rally ever',
      shortTerm: 'Rally continued, +8% in month',
      mediumTerm: 'Established uptrend into 2023'
    },
    priceImpact: { spy1d: 5.5, spy1w: 4.0, spy1m: 8.0 },
    lessons: [
      'Cool CPI can trigger explosive rallies',
      'Market was heavily positioned for bad news',
      'First signs of trend change are most powerful'
    ],
    tags: ['cpi', 'inflation', 'cool', 'surprise', 'bullish', 'massive rally']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EARNINGS EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'nvidia-ai-earnings-2023',
    date: '2023-05-24',
    category: 'earnings',
    title: 'NVDA Massive Beat on AI Demand',
    description: 'NVIDIA beats by 18%, raises guidance by 50%, AI demand exploding',
    context: 'ChatGPT launched 6 months prior. AI hype building but skepticism remained.',
    marketConditions: { vix: 17, spyLevel: 417, trend: 'bullish', sentiment: 'cautious' },
    outcome: {
      immediate: 'NVDA +24%, biggest single-day gain for mega cap',
      shortTerm: 'AI rally broadened, MSFT, GOOGL followed',
      mediumTerm: 'NVDA +50% in next month, AI theme dominated'
    },
    priceImpact: { spy1d: 0.9, spy1w: 1.5, spy1m: 4.0, sector: 'semiconductors', sectorImpact: 15 },
    lessons: [
      'Paradigm shift earnings can have outsized impact',
      'One company can lift entire sector',
      'AI theme had real fundamental backing'
    ],
    tags: ['earnings', 'nvidia', 'ai', 'beat', 'guidance', 'semiconductor']
  },
  {
    id: 'meta-cost-cuts-2023',
    date: '2023-02-01',
    category: 'earnings',
    title: 'META Year of Efficiency Announced',
    description: 'Meta beats, announces $40B buyback and cost discipline focus',
    context: 'META had fallen 77% from highs, Zuckerberg criticized for metaverse spending.',
    marketConditions: { vix: 18, spyLevel: 412, trend: 'bullish', sentiment: 'skeptical on META' },
    outcome: {
      immediate: 'META +23%, largest single-day gain ever',
      shortTerm: 'Continued rally, +30% in month',
      mediumTerm: 'META tripled from lows by year end'
    },
    priceImpact: { spy1d: 1.5, spy1w: 2.0, spy1m: 3.5, sector: 'tech', sectorImpact: 8 },
    lessons: [
      'Cost discipline announcements highly valued',
      'Beaten down stocks have most upside on good news',
      'Capital return programs signal confidence'
    ],
    tags: ['earnings', 'meta', 'cost cuts', 'buyback', 'turnaround']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GEOPOLITICAL EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'russia-ukraine-invasion-2022',
    date: '2022-02-24',
    category: 'geopolitical',
    title: 'Russia Invades Ukraine',
    description: 'Full-scale Russian invasion of Ukraine begins',
    context: 'Buildup of troops for weeks, market somewhat prepared but still shocked.',
    marketConditions: { vix: 30, spyLevel: 420, trend: 'bearish', sentiment: 'fearful' },
    outcome: {
      immediate: 'SPY -1.3% initially, then rallied +1.5% intraday (buy the invasion)',
      shortTerm: 'Volatile, ended week flat',
      mediumTerm: 'March selloff on oil spike, then recovery'
    },
    priceImpact: { spy1d: 1.5, spy1w: 0.5, spy1m: -3.0, sector: 'energy', sectorImpact: 15 },
    lessons: [
      'Geopolitical events often "buy the news"',
      'Energy/defense sectors outperform during conflicts',
      'Initial panic often reversed quickly'
    ],
    tags: ['geopolitical', 'war', 'russia', 'ukraine', 'oil', 'defense']
  },
  {
    id: 'us-china-pelosi-taiwan-2022',
    date: '2022-08-02',
    category: 'geopolitical',
    title: 'Pelosi Visits Taiwan',
    description: 'US House Speaker visits Taiwan despite China warnings',
    context: 'China threatened military response, markets feared escalation.',
    marketConditions: { vix: 22, spyLevel: 412, trend: 'bullish', sentiment: 'nervous' },
    outcome: {
      immediate: 'SPY -0.3%, modest decline',
      shortTerm: 'China conducted military exercises, market shrugged off',
      mediumTerm: 'No lasting impact, rally continued'
    },
    priceImpact: { spy1d: -0.3, spy1w: 0.8, spy1m: -4.0 },
    lessons: [
      'Geopolitical tensions often priced in advance',
      'Actual event often less impactful than fear',
      'Taiwan tensions create buying opportunities'
    ],
    tags: ['geopolitical', 'china', 'taiwan', 'tensions']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BLACK SWAN / CRISIS EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'svb-collapse-2023',
    date: '2023-03-10',
    category: 'black_swan',
    title: 'Silicon Valley Bank Collapses',
    description: 'Second largest bank failure in US history, contagion fears',
    context: 'Rate hikes caused unrealized losses in bond portfolios, bank run ensued.',
    marketConditions: { vix: 23, spyLevel: 385, trend: 'sideways', sentiment: 'nervous' },
    outcome: {
      immediate: 'SPY -1.4%, banking sector -5%',
      shortTerm: 'Fed backstop announced Sunday, market stabilized',
      mediumTerm: 'Banking crisis contained, SPY recovered +5%'
    },
    priceImpact: { spy1d: -1.4, spy1w: -4.5, spy1m: 3.0, sector: 'financials', sectorImpact: -15 },
    lessons: [
      'Bank runs can happen suddenly in digital age',
      'Fed/government intervention can stop contagion',
      'Crisis creates opportunity in quality names'
    ],
    tags: ['black swan', 'banking', 'crisis', 'svb', 'fed intervention']
  },
  {
    id: 'covid-crash-2020',
    date: '2020-03-16',
    category: 'black_swan',
    title: 'COVID Market Crash - Black Monday',
    description: 'SPY drops 12% in single day, circuit breakers triggered',
    context: 'Pandemic spreading, lockdowns beginning, economic shutdown fears.',
    marketConditions: { vix: 82, spyLevel: 240, trend: 'bearish', sentiment: 'panic' },
    outcome: {
      immediate: 'SPY -12%, worst day since 1987',
      shortTerm: 'Continued lower, bottomed March 23 at -34%',
      mediumTerm: 'Fed bazooka + fiscal stimulus triggered massive rally'
    },
    priceImpact: { spy1d: -12.0, spy1w: -15.0, spy1m: 12.0 },
    lessons: [
      'VIX 80+ signals maximum fear and often bottom',
      'Unprecedented events require unprecedented response',
      'Fastest bear market followed by fastest recovery'
    ],
    tags: ['black swan', 'covid', 'crash', 'panic', 'circuit breaker']
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TECHNICAL EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'spy-200ma-breakdown-2022',
    date: '2022-04-21',
    category: 'technical',
    title: 'SPY Breaks Below 200-Day MA',
    description: 'SPY decisively breaks below 200-day moving average',
    context: 'Fed hawkish pivot, inflation concerns mounting.',
    marketConditions: { vix: 25, spyLevel: 438, trend: 'bearish', sentiment: 'worried' },
    outcome: {
      immediate: 'SPY -2.8%, accelerated selling',
      shortTerm: 'Continued lower, no bounce at key level',
      mediumTerm: 'Bear market confirmed, -25% total decline'
    },
    priceImpact: { spy1d: -2.8, spy1w: -5.0, spy1m: -10.0 },
    lessons: [
      '200-day MA breakdown signals regime change',
      'Failed technical levels can accelerate selling',
      'Trend followers amplify moves'
    ],
    tags: ['technical', '200ma', 'breakdown', 'bear market']
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// FIND SIMILAR HISTORICAL EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export function findHistoricalAnalogs(
  currentEvent: {
    category: string;
    keywords: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    vix?: number;
    marketTrend?: 'bullish' | 'bearish' | 'sideways';
  },
  maxResults: number = 5
): HistoricalAnalog[] {
  const analogs: HistoricalAnalog[] = [];
  
  for (const event of HISTORICAL_EVENTS) {
    let similarity = 0;
    const matchReasons: string[] = [];
    
    // Category match (high weight)
    if (event.category === currentEvent.category) {
      similarity += 40;
      matchReasons.push(`Same category: ${event.category}`);
    } else if (
      (event.category === 'fed' && currentEvent.category === 'macro') ||
      (event.category === 'cpi' && currentEvent.category === 'macro')
    ) {
      similarity += 20;
      matchReasons.push('Related macro category');
    }
    
    // Keyword match
    const eventText = `${event.title} ${event.description} ${event.tags.join(' ')}`.toLowerCase();
    let keywordMatches = 0;
    for (const keyword of currentEvent.keywords) {
      if (eventText.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    }
    const keywordScore = Math.min(30, keywordMatches * 10);
    if (keywordScore > 0) {
      similarity += keywordScore;
      matchReasons.push(`${keywordMatches} keyword matches`);
    }
    
    // Sentiment match
    const eventSentiment = event.priceImpact.spy1d > 0 ? 'positive' : 
                          event.priceImpact.spy1d < 0 ? 'negative' : 'neutral';
    if (eventSentiment === currentEvent.sentiment) {
      similarity += 15;
      matchReasons.push(`Similar sentiment: ${currentEvent.sentiment}`);
    }
    
    // VIX environment match
    if (currentEvent.vix) {
      const vixDiff = Math.abs(event.marketConditions.vix - currentEvent.vix);
      if (vixDiff < 5) {
        similarity += 10;
        matchReasons.push(`Similar VIX environment (~${event.marketConditions.vix})`);
      }
    }
    
    // Market trend match
    if (currentEvent.marketTrend && event.marketConditions.trend === currentEvent.marketTrend) {
      similarity += 5;
      matchReasons.push(`Same market trend: ${currentEvent.marketTrend}`);
    }
    
    if (similarity >= 20) {
      analogs.push({
        event,
        similarity: Math.min(100, similarity),
        matchReasons
      });
    }
  }
  
  // Sort by similarity and return top results
  return analogs
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET EVENTS BY CATEGORY
// ═══════════════════════════════════════════════════════════════════════════════

export function getEventsByCategory(category: HistoricalEvent['category']): HistoricalEvent[] {
  return HISTORICAL_EVENTS.filter(e => e.category === category);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET RECENT SIMILAR OUTCOMES
// ═══════════════════════════════════════════════════════════════════════════════

export function getAverageOutcome(
  category: HistoricalEvent['category'],
  sentiment: 'positive' | 'negative' | 'neutral'
): {
  avg1d: number;
  avg1w: number;
  avg1m: number;
  sampleSize: number;
  events: string[];
} {
  const relevantEvents = HISTORICAL_EVENTS.filter(e => {
    if (e.category !== category) return false;
    const eventSentiment = e.priceImpact.spy1d > 1 ? 'positive' : 
                          e.priceImpact.spy1d < -1 ? 'negative' : 'neutral';
    return eventSentiment === sentiment;
  });
  
  if (relevantEvents.length === 0) {
    return { avg1d: 0, avg1w: 0, avg1m: 0, sampleSize: 0, events: [] };
  }
  
  const avg1d = relevantEvents.reduce((sum, e) => sum + e.priceImpact.spy1d, 0) / relevantEvents.length;
  const avg1w = relevantEvents.reduce((sum, e) => sum + e.priceImpact.spy1w, 0) / relevantEvents.length;
  const avg1m = relevantEvents.reduce((sum, e) => sum + e.priceImpact.spy1m, 0) / relevantEvents.length;
  
  return {
    avg1d,
    avg1w,
    avg1m,
    sampleSize: relevantEvents.length,
    events: relevantEvents.map(e => e.title)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT HISTORICAL CONTEXT FOR AI
// ═══════════════════════════════════════════════════════════════════════════════

export function formatHistoricalContext(analogs: HistoricalAnalog[]): string {
  if (analogs.length === 0) {
    return 'No directly comparable historical events found.';
  }
  
  let context = '## Historical Analogs\n\n';
  
  for (const analog of analogs) {
    const e = analog.event;
    context += `### ${e.title} (${e.date})\n`;
    context += `**Similarity:** ${analog.similarity}%\n`;
    context += `**Match reasons:** ${analog.matchReasons.join(', ')}\n\n`;
    context += `**What happened:** ${e.description}\n`;
    context += `**Context:** ${e.context}\n\n`;
    context += `**Outcome:**\n`;
    context += `- Immediate: ${e.outcome.immediate}\n`;
    context += `- 1 Week: ${e.outcome.shortTerm}\n`;
    context += `- 1 Month: ${e.outcome.mediumTerm}\n\n`;
    context += `**Price Impact:** 1D: ${e.priceImpact.spy1d > 0 ? '+' : ''}${e.priceImpact.spy1d}%, `;
    context += `1W: ${e.priceImpact.spy1w > 0 ? '+' : ''}${e.priceImpact.spy1w}%, `;
    context += `1M: ${e.priceImpact.spy1m > 0 ? '+' : ''}${e.priceImpact.spy1m}%\n\n`;
    context += `**Lessons:** ${e.lessons.join(' • ')}\n\n`;
    context += '---\n\n';
  }
  
  return context;
}
