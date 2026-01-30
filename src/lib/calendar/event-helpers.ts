// ═══════════════════════════════════════════════════════════════════
// EVENT ANALYSIS HELPERS
// Quality validation, calculations, and formatting
// ═══════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────
// EVENT TIER CLASSIFICATION
// ───────────────────────────────────────────────────────────────────

export type EventTier = 1 | 2 | 3;

export interface EventClassification {
  tier: EventTier;
  expectedVolatility: 'low' | 'moderate' | 'high' | 'extreme';
  category: string;
  primaryAssets: string[];
  secondaryAssets: string[];
}

const TIER_1_KEYWORDS = [
  'fomc', 'fed rate', 'federal reserve',
  'non-farm', 'nfp', 'payrolls',
  'cpi', 'consumer price',
  'ecb rate', 'ecb decision',
  'boj rate', 'boj decision', 'boj policy',
  'boe rate', 'boe decision',
  'gdp advance', 'gdp preliminary',
  'halving', 'etf approval', 'etf decision'
];

const TIER_2_KEYWORDS = [
  'pce', 'ppi', 'producer price',
  'retail sales',
  'pmi', 'ism manufacturing', 'ism services',
  'jobless claims', 'unemployment claims',
  'earnings aapl', 'earnings nvda', 'earnings msft', 'earnings googl', 'earnings amzn', 'earnings tsla',
  'token unlock', 'major unlock'
];

const TIER_3_KEYWORDS = [
  'housing', 'building permits', 'home sales',
  'consumer confidence', 'sentiment',
  'trade balance',
  'factory orders',
  'durables', 'durable goods'
];

export function classifyEvent(eventName: string): EventClassification {
  const name = eventName.toLowerCase();
  
  // Check Tier 1
  if (TIER_1_KEYWORDS.some(k => name.includes(k))) {
    return {
      tier: 1,
      expectedVolatility: 'high',
      category: getCategoryFromName(name),
      primaryAssets: getPrimaryAssets(name),
      secondaryAssets: getSecondaryAssets(name)
    };
  }
  
  // Check Tier 2
  if (TIER_2_KEYWORDS.some(k => name.includes(k))) {
    return {
      tier: 2,
      expectedVolatility: 'moderate',
      category: getCategoryFromName(name),
      primaryAssets: getPrimaryAssets(name),
      secondaryAssets: getSecondaryAssets(name)
    };
  }
  
  // Check Tier 3
  if (TIER_3_KEYWORDS.some(k => name.includes(k))) {
    return {
      tier: 3,
      expectedVolatility: 'low',
      category: getCategoryFromName(name),
      primaryAssets: getPrimaryAssets(name),
      secondaryAssets: getSecondaryAssets(name)
    };
  }
  
  // Default to Tier 3
  return {
    tier: 3,
    expectedVolatility: 'low',
    category: 'other',
    primaryAssets: ['DXY'],
    secondaryAssets: ['SPX']
  };
}

function getCategoryFromName(name: string): string {
  if (name.includes('payroll') || name.includes('employment') || name.includes('jobless') || name.includes('unemployment')) {
    return 'employment';
  }
  if (name.includes('cpi') || name.includes('ppi') || name.includes('pce') || name.includes('inflation')) {
    return 'inflation';
  }
  if (name.includes('fomc') || name.includes('fed') || name.includes('ecb') || name.includes('boj') || name.includes('boe') || name.includes('rate decision')) {
    return 'central_bank';
  }
  if (name.includes('gdp') || name.includes('pmi') || name.includes('retail') || name.includes('sales')) {
    return 'growth';
  }
  if (name.includes('housing') || name.includes('home') || name.includes('building')) {
    return 'housing';
  }
  if (name.includes('confidence') || name.includes('sentiment')) {
    return 'sentiment';
  }
  if (name.includes('earnings') || name.includes('eps')) {
    return 'earnings';
  }
  if (name.includes('unlock') || name.includes('halving') || name.includes('etf')) {
    return 'crypto';
  }
  return 'other';
}

function getPrimaryAssets(name: string): string[] {
  if (name.includes('jpy') || name.includes('boj') || name.includes('japan')) {
    return ['USDJPY', 'Nikkei'];
  }
  if (name.includes('eur') || name.includes('ecb') || name.includes('euro')) {
    return ['EURUSD', 'DAX'];
  }
  if (name.includes('gbp') || name.includes('boe') || name.includes('uk') || name.includes('britain')) {
    return ['GBPUSD', 'FTSE'];
  }
  if (name.includes('bitcoin') || name.includes('btc') || name.includes('crypto') || name.includes('halving') || name.includes('etf')) {
    return ['BTC', 'ETH'];
  }
  // Default US events
  return ['DXY', 'SPX', 'TLT'];
}

function getSecondaryAssets(name: string): string[] {
  const category = getCategoryFromName(name);
  
  if (category === 'inflation' || category === 'central_bank') {
    return ['XAUUSD', 'TLT', 'BTC'];
  }
  if (category === 'employment' || category === 'growth') {
    return ['USDJPY', 'XAUUSD'];
  }
  if (category === 'crypto') {
    return ['SPX', 'DXY'];
  }
  return ['XAUUSD'];
}

// ───────────────────────────────────────────────────────────────────
// SURPRISE CALCULATION
// ───────────────────────────────────────────────────────────────────

export type SurpriseCategory = 'big_beat' | 'small_beat' | 'inline' | 'small_miss' | 'big_miss' | 'unknown';
export type SurpriseDirection = 'beat' | 'miss' | 'inline' | 'unknown';

export interface SurpriseResult {
  category: SurpriseCategory;
  percent: number;
  direction: SurpriseDirection;
  description: string;
}

export function calculateSurprise(actual: number, forecast: number): SurpriseResult {
  if (!forecast || forecast === 0 || actual === undefined || actual === null) {
    return {
      category: 'unknown',
      percent: 0,
      direction: 'unknown',
      description: 'Unable to calculate surprise'
    };
  }
  
  const percent = ((actual - forecast) / Math.abs(forecast)) * 100;
  const roundedPercent = Math.round(percent * 100) / 100;
  
  let category: SurpriseCategory;
  let direction: SurpriseDirection;
  let description: string;
  
  if (percent > 15) {
    category = 'big_beat';
    direction = 'beat';
    description = `Strong beat: +${roundedPercent}% vs forecast`;
  } else if (percent > 5) {
    category = 'small_beat';
    direction = 'beat';
    description = `Modest beat: +${roundedPercent}% vs forecast`;
  } else if (percent >= -5) {
    category = 'inline';
    direction = 'inline';
    description = `Inline with expectations: ${roundedPercent > 0 ? '+' : ''}${roundedPercent}%`;
  } else if (percent >= -15) {
    category = 'small_miss';
    direction = 'miss';
    description = `Modest miss: ${roundedPercent}% vs forecast`;
  } else {
    category = 'big_miss';
    direction = 'miss';
    description = `Strong miss: ${roundedPercent}% vs forecast`;
  }
  
  return { category, percent: roundedPercent, direction, description };
}

// ───────────────────────────────────────────────────────────────────
// PRE-EVENT ANALYSIS VALIDATION
// ───────────────────────────────────────────────────────────────────

export interface ValidationError {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

export function validatePreEventAnalysis(analysis: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Rule 1: Tier 1 event + very low conviction + no trade is OK
  // (Pre-event conviction is typically lower)
  
  // Rule 2: High conviction + no trade = inconsistent
  if (analysis.preEventStrategy?.conviction >= 7 && !analysis.tradeSetup?.hasTrade) {
    errors.push({
      code: 'HIGH_CONVICTION_NO_TRADE',
      message: 'High conviction (7+) but no trade recommended - inconsistent',
      severity: 'warning'
    });
  }
  
  // Rule 3: Trade exists but no entry condition
  if (analysis.tradeSetup?.hasTrade && !analysis.tradeSetup?.entryCondition) {
    errors.push({
      code: 'TRADE_WITHOUT_ENTRY_CONDITION',
      message: 'Trade recommended but no entry condition specified',
      severity: 'error'
    });
  }
  
  // Rule 4: Should have 5 scenarios
  const scenarios = analysis.scenarios ? Object.keys(analysis.scenarios) : [];
  const expectedScenarios = ['bigBeat', 'smallBeat', 'inline', 'smallMiss', 'bigMiss'];
  const missingScenarios = expectedScenarios.filter(s => !scenarios.includes(s));
  
  if (missingScenarios.length > 0) {
    errors.push({
      code: 'MISSING_SCENARIOS',
      message: `Missing scenarios: ${missingScenarios.join(', ')}`,
      severity: 'error'
    });
  }
  
  // Rule 5: Trade with no stop loss
  if (analysis.tradeSetup?.hasTrade && !analysis.tradeSetup?.stopLoss) {
    errors.push({
      code: 'TRADE_WITHOUT_STOP_LOSS',
      message: 'Trade recommended but no stop loss specified',
      severity: 'error'
    });
  }
  
  // Rule 6: Conviction out of range
  const conviction = analysis.preEventStrategy?.conviction;
  if (conviction !== undefined && (conviction < 1 || conviction > 10)) {
    errors.push({
      code: 'INVALID_CONVICTION',
      message: `Conviction ${conviction} is outside valid range (1-10)`,
      severity: 'error'
    });
  }
  
  // Rule 7: Invalid recommended approach
  const validApproaches = ['position_before', 'wait_and_react', 'fade_move', 'no_trade'];
  if (analysis.preEventStrategy?.recommendedApproach && 
      !validApproaches.includes(analysis.preEventStrategy.recommendedApproach)) {
    errors.push({
      code: 'INVALID_APPROACH',
      message: `Invalid recommended approach: ${analysis.preEventStrategy.recommendedApproach}`,
      severity: 'error'
    });
  }
  
  return errors;
}

// ───────────────────────────────────────────────────────────────────
// POST-EVENT ANALYSIS VALIDATION
// ───────────────────────────────────────────────────────────────────

export function validatePostEventAnalysis(analysis: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Rule 1: Big surprise + low conviction = questionable
  const surpriseCategory = analysis.resultAnalysis?.surpriseCategory;
  const conviction = analysis.tradeRecommendation?.conviction;
  
  if ((surpriseCategory === 'big_beat' || surpriseCategory === 'big_miss') && conviction < 5) {
    errors.push({
      code: 'BIG_SURPRISE_LOW_CONVICTION',
      message: 'Big surprise but low conviction - may be missing an opportunity',
      severity: 'warning'
    });
  }
  
  // Rule 2: Immediate urgency + no trade = inconsistent
  if (analysis.tradeRecommendation?.urgency === 'immediate' && !analysis.tradeSetup?.hasTrade) {
    errors.push({
      code: 'IMMEDIATE_URGENCY_NO_TRADE',
      message: 'Immediate urgency but no trade recommended - inconsistent',
      severity: 'warning'
    });
  }
  
  // Rule 3: Trade with poor R/R = questionable
  if (analysis.tradeSetup?.hasTrade && analysis.tradeSetup?.riskReward === 'poor') {
    errors.push({
      code: 'TRADE_WITH_POOR_RR',
      message: 'Trade recommended with poor risk/reward - should reconsider',
      severity: 'warning'
    });
  }
  
  // Rule 4: High conviction + no trade
  if (conviction >= 8 && !analysis.tradeSetup?.hasTrade) {
    errors.push({
      code: 'HIGH_CONVICTION_NO_TRADE',
      message: 'Very high conviction (8+) but no trade - inconsistent',
      severity: 'warning'
    });
  }
  
  // Rule 5: Trade without stop loss
  if (analysis.tradeSetup?.hasTrade && !analysis.tradeSetup?.stopLoss) {
    errors.push({
      code: 'TRADE_WITHOUT_STOP_LOSS',
      message: 'Trade recommended but no stop loss specified',
      severity: 'error'
    });
  }
  
  // Rule 6: Invalid urgency
  const validUrgencies = ['immediate', 'soon', 'patient'];
  if (analysis.tradeRecommendation?.urgency && 
      !validUrgencies.includes(analysis.tradeRecommendation.urgency)) {
    errors.push({
      code: 'INVALID_URGENCY',
      message: `Invalid urgency: ${analysis.tradeRecommendation.urgency}`,
      severity: 'error'
    });
  }
  
  // Rule 7: Invalid trade action
  const validActions = ['trade_continuation', 'fade_move', 'wait_confirmation', 'no_trade'];
  if (analysis.tradeRecommendation?.action && 
      !validActions.includes(analysis.tradeRecommendation.action)) {
    errors.push({
      code: 'INVALID_ACTION',
      message: `Invalid trade action: ${analysis.tradeRecommendation.action}`,
      severity: 'error'
    });
  }
  
  return errors;
}

// ───────────────────────────────────────────────────────────────────
// SCENARIO TEMPLATES
// ───────────────────────────────────────────────────────────────────

export interface ScenarioTemplate {
  threshold: string;
  typicalProbability: string;
  typicalReaction: Record<string, string>;
  typicalDuration: string;
}

export const SCENARIO_TEMPLATES: Record<string, Record<SurpriseCategory, ScenarioTemplate>> = {
  nfp: {
    big_beat: {
      threshold: '> +20% (e.g., 216K vs 180K forecast)',
      typicalProbability: '15%',
      typicalReaction: { DXY: '+0.8%', SPX: '+0.5%', XAUUSD: '-1.0%', TLT: '-1.5%' },
      typicalDuration: '4-6 hours'
    },
    small_beat: {
      threshold: '+5% to +20% vs forecast',
      typicalProbability: '25%',
      typicalReaction: { DXY: '+0.4%', SPX: '+0.3%', XAUUSD: '-0.4%', TLT: '-0.5%' },
      typicalDuration: '2-4 hours'
    },
    inline: {
      threshold: '-5% to +5% vs forecast',
      typicalProbability: '30%',
      typicalReaction: { DXY: '±0.2%', SPX: '±0.1%', XAUUSD: '±0.2%', TLT: '±0.2%' },
      typicalDuration: '1-2 hours'
    },
    small_miss: {
      threshold: '-5% to -20% vs forecast',
      typicalProbability: '20%',
      typicalReaction: { DXY: '-0.4%', SPX: '-0.3%', XAUUSD: '+0.5%', TLT: '+0.5%' },
      typicalDuration: '2-4 hours'
    },
    big_miss: {
      threshold: '< -20% vs forecast',
      typicalProbability: '10%',
      typicalReaction: { DXY: '-0.8%', SPX: '-0.6%', XAUUSD: '+1.2%', TLT: '+1.5%' },
      typicalDuration: '4-8 hours'
    },
    unknown: {
      threshold: 'N/A',
      typicalProbability: '0%',
      typicalReaction: {},
      typicalDuration: 'N/A'
    }
  },
  cpi: {
    big_beat: {
      threshold: '> +0.2% above forecast (hot inflation)',
      typicalProbability: '15%',
      typicalReaction: { DXY: '+0.6%', TLT: '-1.5%', SPX: '-0.8%', XAUUSD: '-0.5%' },
      typicalDuration: '4-8 hours'
    },
    small_beat: {
      threshold: '+0.1% above forecast',
      typicalProbability: '25%',
      typicalReaction: { DXY: '+0.3%', TLT: '-0.5%', SPX: '-0.3%', XAUUSD: '-0.2%' },
      typicalDuration: '2-4 hours'
    },
    inline: {
      threshold: 'Within ±0.1% of forecast',
      typicalProbability: '35%',
      typicalReaction: { DXY: '±0.1%', TLT: '±0.2%', SPX: '±0.2%', XAUUSD: '±0.1%' },
      typicalDuration: '1-2 hours'
    },
    small_miss: {
      threshold: '-0.1% below forecast (cool inflation)',
      typicalProbability: '20%',
      typicalReaction: { DXY: '-0.3%', TLT: '+0.8%', SPX: '+0.5%', XAUUSD: '+0.3%' },
      typicalDuration: '2-4 hours'
    },
    big_miss: {
      threshold: '> -0.2% below forecast',
      typicalProbability: '5%',
      typicalReaction: { DXY: '-0.6%', TLT: '+1.5%', SPX: '+1.0%', XAUUSD: '+0.8%' },
      typicalDuration: '4-8 hours'
    },
    unknown: {
      threshold: 'N/A',
      typicalProbability: '0%',
      typicalReaction: {},
      typicalDuration: 'N/A'
    }
  }
};

export function getScenarioTemplate(eventType: string): Record<SurpriseCategory, ScenarioTemplate> | null {
  const type = eventType.toLowerCase();
  
  if (type.includes('nfp') || type.includes('payroll') || type === 'employment') {
    return SCENARIO_TEMPLATES.nfp;
  }
  if (type.includes('cpi') || type === 'inflation') {
    return SCENARIO_TEMPLATES.cpi;
  }
  
  return null;
}

// ───────────────────────────────────────────────────────────────────
// FORMATTING HELPERS
// ───────────────────────────────────────────────────────────────────

export function formatHistoricalDataBlock(history: any[]): string {
  if (!history || history.length === 0) {
    return 'No historical data available for this event.';
  }
  
  return history.map(h => {
    const reactions = h.market_reaction ? Object.entries(h.market_reaction)
      .map(([asset, change]) => `${asset} ${change}`)
      .join(', ') : 'No reaction data';
    
    const surprise = h.surprise_percent 
      ? (h.surprise_percent > 0 ? '+' : '') + h.surprise_percent.toFixed(1) + '%'
      : 'N/A';
    
    return `[${h.event_date?.split('T')[0]}] Forecast: ${h.forecast ?? 'N/A'} | Actual: ${h.actual ?? 'N/A'} | Surprise: ${surprise}
             Reaction: ${reactions}
             Duration: ${h.reaction_duration || 'N/A'}`;
  }).join('\n\n');
}

export function formatAffectedAssetsBlock(assets: Record<string, any>): string {
  if (!assets || Object.keys(assets).length === 0) {
    return 'No asset data available.';
  }
  
  return Object.entries(assets).map(([symbol, data]: [string, any]) => {
    return `${symbol}:
- Price: $${data.price ?? 'N/A'}
- 24h Change: ${data.change24h ?? 0}%
- Current Positioning: ${data.positioning || 'neutral'}
- Key Levels: Support ${data.support || 'N/A'} | Resistance ${data.resistance || 'N/A'}`;
  }).join('\n\n');
}

export function formatComponentBreakdown(components: any, eventType: string): string {
  if (!components || Object.keys(components).length === 0) {
    return 'No component breakdown available.';
  }
  
  const lines: string[] = [];
  
  if (eventType === 'employment' || eventType === 'nfp') {
    lines.push('NFP Components:');
    if (components.headline !== undefined) {
      const beat = components.headline > (components.headlineForecast || 0);
      lines.push(`- Headline: ${components.headline}K (vs ${components.headlineForecast || 'N/A'}K forecast) ${beat ? '✅ BEAT' : '❌ MISS'}`);
    }
    if (components.unemployment !== undefined) {
      const better = parseFloat(components.unemployment) <= parseFloat(components.unemploymentForecast || '100');
      lines.push(`- Unemployment: ${components.unemployment}% (vs ${components.unemploymentForecast || 'N/A'}% forecast) ${better ? '✅ BETTER' : '⚠️ WORSE'}`);
    }
    if (components.wageGrowth !== undefined) {
      const hot = parseFloat(components.wageGrowth) > parseFloat(components.wageForecast || '0');
      lines.push(`- Avg Hourly Earnings: ${components.wageGrowth}% MoM (vs ${components.wageForecast || 'N/A'}% forecast) ${hot ? '⚠️ HOT' : '✅ COOL'}`);
    }
    if (components.participation !== undefined) {
      lines.push(`- Participation Rate: ${components.participation}% ${components.participationChange ? `(${components.participationChange})` : ''}`);
    }
    if (components.revision !== undefined) {
      const bullish = components.revision > 0;
      lines.push(`- Prior Revision: ${components.revision > 0 ? '+' : ''}${components.revision}K ${bullish ? '✅ BULLISH' : '❌ BEARISH'}`);
    }
  } else if (eventType === 'inflation' || eventType === 'cpi') {
    lines.push('CPI Components:');
    if (components.headline !== undefined) lines.push(`- Headline CPI: ${components.headline}% YoY ${components.headlineBeat ? '✅' : '❌'}`);
    if (components.core !== undefined) lines.push(`- Core CPI: ${components.core}% YoY ${components.coreBeat ? '✅' : '❌'}`);
    if (components.mom !== undefined) lines.push(`- MoM: ${components.mom}%`);
    if (components.shelter !== undefined) lines.push(`- Shelter: ${components.shelter}%`);
    if (components.energy !== undefined) lines.push(`- Energy: ${components.energy}%`);
    if (components.services !== undefined) lines.push(`- Services: ${components.services}%`);
  } else {
    // Generic format
    for (const [key, value] of Object.entries(components)) {
      lines.push(`- ${key}: ${value}`);
    }
  }
  
  return lines.join('\n');
}

// ───────────────────────────────────────────────────────────────────
// TIME HELPERS
// ───────────────────────────────────────────────────────────────────

export function getTimeUntilEvent(eventDate: string | Date): {
  hours: number;
  minutes: number;
  isUpcoming: boolean;
  label: string;
} {
  const event = new Date(eventDate);
  const now = new Date();
  
  const diffMs = event.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffMinutes = (diffMs / (1000 * 60)) % 60;
  
  const isUpcoming = diffMs > 0;
  
  let label: string;
  if (!isUpcoming) {
    const hoursAgo = Math.abs(diffHours);
    if (hoursAgo < 1) {
      label = `${Math.abs(Math.round(diffMinutes))} minutes ago`;
    } else {
      label = `${Math.round(hoursAgo)} hours ago`;
    }
  } else if (diffHours < 1) {
    label = `In ${Math.round(diffMinutes)} minutes`;
  } else if (diffHours < 24) {
    label = `In ${Math.round(diffHours)} hours`;
  } else {
    label = `In ${Math.round(diffHours / 24)} days`;
  }
  
  return {
    hours: Math.round(diffHours),
    minutes: Math.round(diffMinutes),
    isUpcoming,
    label
  };
}

export function shouldAnalyzePreEvent(eventDate: string | Date): boolean {
  const { hours, isUpcoming } = getTimeUntilEvent(eventDate);
  
  // Analyze if event is between 1-24 hours away
  return isUpcoming && hours >= 1 && hours <= 24;
}

export function shouldAnalyzePostEvent(eventDate: string | Date): boolean {
  const { hours, isUpcoming } = getTimeUntilEvent(eventDate);
  
  // Analyze if event was within last 2 hours
  return !isUpcoming && Math.abs(hours) <= 2;
}
