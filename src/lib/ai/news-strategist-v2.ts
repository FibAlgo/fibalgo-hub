/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🧠 ELITE NEWS ANALYSIS SYSTEM - V2 (GPT-5.2 Compatible)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * META-PROMPTING ARCHITECTURE:
 * 
 * STAGE 1: STRATEGIST (GPT-5.2 / o1 / gpt-4o)
 *   - Reads news BODY only (ignores headline)
 *   - Designs analysis framework
 *   - Defines data requirements
 *   - Sets execution constraints
 * 
 * STAGE 2: EXECUTOR (GPT-4o-mini / gpt-4o)
 *   - Follows strategy EXACTLY
 *   - Produces final analysis
 *   - Bound by strategist rules
 * 
 * KEY PRINCIPLES:
 *   - Headline is ignored (may be misleading)
 *   - Epistemic discipline (known vs implied vs unknown)
 *   - No false certainty
 *   - Incremental information assessment
 *   - Cognitive trap avoidance
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface NewsInput {
  id: string;
  headline: string;  // Will be IGNORED by strategist
  body: string;      // ONLY this is analyzed
  source?: string;
  publishedAt?: string;
  tickers?: string[];
}

// Strategist Output Schema
export interface StrategistOutput {
  // 1. Information Classification
  informationNature: {
    classification: 'new_information' | 'confirmation' | 'narrative_reinforcement' | 'speculative_signal' | 'noise';
    confidence: number; // 0-1
    reasoning: string;
  };

  // 2. Market Movement Logic
  marketImpactLogic: {
    shouldMoveMarkets: boolean;
    reasoning: string;
    challengedBeliefs: string[];
    transmissionMechanisms: Array<{
      channel: 'rates' | 'risk_premium' | 'liquidity' | 'sentiment' | 'positioning' | 'fundamentals';
      direction: 'positive' | 'negative' | 'uncertain';
      magnitude: 'negligible' | 'minor' | 'moderate' | 'significant' | 'major';
    }>;
  };

  // 3. Required Data
  requiredData: {
    marketPrices: Array<{
      symbol: string;
      type: 'equity' | 'forex' | 'crypto' | 'commodity' | 'index' | 'bond';
      reason: string;
    }>;
    timeWindows: Array<{
      period: string;
      reason: string;
    }>;
    volatilityMetrics: string[];
    macroInputs: string[];
    positioningProxies: string[];
    historicalComparables: Array<{
      event: string;
      date: string;
      relevance: string;
      transferableLessons: string[];
      nonTransferableAspects: string[];
    }>;
  };

  // 4. Non-Reaction Conditions
  nonReactionConditions: {
    conditions: string[];
    invalidationSignals: string[];
  };

  // 5. Analysis Horizons
  analysisHorizons: {
    immediate: {
      relevant: boolean;
      focus: string[];
      timeframe: string;
    };
    shortTerm: {
      relevant: boolean;
      focus: string[];
      timeframe: string;
    };
    mediumTerm: {
      relevant: boolean;
      focus: string[];
      timeframe: string;
    };
    longTerm: {
      relevant: boolean;
      focus: string[];
      timeframe: string;
      structuralImplications: string[];
    };
  };

  // 6. Historical Comparison Logic
  historicalComparisonLogic: {
    comparisonNeeded: boolean;
    validAnalogCriteria: string[];
    invalidAnalogWarnings: string[];
  };

  // 7. Cognitive Traps
  cognitiveTraps: {
    headlineBias: string;
    confirmationBias: string;
    pricedInRisk: string;
    reflexiveNarrativeRisk: string;
    otherTraps: string[];
  };

  // 8. Output Design
  outputDesign: {
    executiveSummaryFocus: string;
    assetImpactLogic: Array<{
      asset: string;
      impactChain: string;
      confidence: number;
    }>;
    scenarioMatrix: {
      base: { probability: number; description: string; implications: string[] };
      upside: { probability: number; trigger: string; implications: string[] };
      downside: { probability: number; trigger: string; implications: string[] };
    };
    keyMonitoringPoints: string[];
  };

  // 9. Executor Instructions
  executorInstructions: {
    mandatoryTasks: string[];
    forbiddenBehaviors: string[];
    outputConstraints: string[];
    confidenceFloor: number; // Minimum confidence to assert
    absoluteBans: string[];
  };

  // Meta
  epistemicAssessment: {
    known: string[];
    implied: string[];
    unknown: string[];
    incrementalInfoScore: number; // 0-10, how much new info vs market expectations
  };
}

// Executor Output Schema (Final User-Facing)
export interface ExecutorOutput {
  executiveSummary: {
    signal: string; // One sentence
    incrementalVsExpectations: 'significantly_above' | 'above' | 'inline' | 'below' | 'significantly_below';
    overallSentiment: 'strong_bullish' | 'bullish' | 'lean_bullish' | 'neutral' | 'lean_bearish' | 'bearish' | 'strong_bearish';
  };

  assetImpacts: Array<{
    asset: string;
    tradingViewSymbol: string;
    direction: 'long' | 'short' | 'neutral';
    conviction: number; // 1-10
    timeHorizon: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
    rationale: string;
    entryLogic: string;
    invalidation: string;
  }>;

  scenarioAnalysis: {
    base: {
      probability: number;
      description: string;
      assetImplications: Record<string, string>;
    };
    upside: {
      probability: number;
      trigger: string;
      assetImplications: Record<string, string>;
    };
    downside: {
      probability: number;
      trigger: string;
      assetImplications: Record<string, string>;
    };
  };

  pricedInAssessment: {
    score: number; // 1-10 (10 = fully priced in)
    reasoning: string;
    marketPriorBeliefs: string[];
  };

  risksAndInvalidation: {
    keyRisks: string[];
    invalidationPoints: string[];
    blindSpots: string[];
  };

  monitoring: {
    nextDataPoints: string[];
    triggerEvents: string[];
    timeframe: string;
  };

  confidence: {
    overall: number; // 1-10
    dataQuality: number;
    analysisRobustness: number;
    uncertaintyDisclaimer: string;
  };

  meta: {
    analysisTimestamp: string;
    newsCategory: 'macro' | 'company' | 'crypto' | 'geopolitical' | 'regulatory' | 'sentiment' | 'technical';
    primaryAssets: string[];
    secondaryAssets: string[];
  };
}

// Combined Result
export interface AnalysisPipelineResult {
  newsId: string;
  strategy: StrategistOutput;
  analysis: ExecutorOutput;
  qualityMetrics: {
    strategistConfidence: number;
    executorAdherence: number;
    overallQuality: number;
    warnings: string[];
  };
  timing: {
    strategistMs: number;
    executorMs: number;
    totalMs: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGIST PROMPT (GPT-5.2 / o1 / gpt-4o)
// ═══════════════════════════════════════════════════════════════════════════════

const STRATEGIST_SYSTEM_PROMPT = `You are an elite financial analysis strategist operating at institutional level.

CRITICAL RULE:
You must completely ignore the news headline.
Use ONLY the body/content of the news.
Assume the headline may be misleading, exaggerated, or strategically framed.

Your task is NOT to analyze the news.
Your task is to design the optimal analysis framework for this specific news item.

You are accountable for analytical correctness, epistemic discipline,
and preventing false certainty.

---

## STRATEGIST THINKING REQUIREMENTS

Before defining the analysis framework, you must internally determine:

- What is KNOWN with high confidence from the content
- What is IMPLIED but uncertain
- What is UNKNOWN or missing
- Whether this news meaningfully changes the information set available to the market

If the incremental information content is low,
you must explicitly flag this.

---

## WHAT YOU MUST DESIGN

1. Classify the true informational nature of the news:
   - New information
   - Confirmation of expectations
   - Narrative reinforcement
   - Speculative / conditional signaling
   - Noise / low informational value

2. Explain WHY (or IF) this news should move markets at all:
   - What belief, pricing assumption, or positioning it challenges
   - Through which transmission mechanisms (rates, risk, liquidity, sentiment)

3. Define ALL DATA REQUIRED for a correct analysis:
   - Market prices and instruments
   - Relevant time windows
   - Volatility, spreads, positioning proxies
   - Macro / policy / fundamental inputs
   - Comparable historical situations (if justified)

4. Explicitly define WHEN analysis should NOT overreact:
   - Conditions under which this news should have limited or no impact
   - Signals that would invalidate an initial reaction

5. Define analysis horizons:
   - Immediate / headline-driven
   - Short-term (positioning & liquidity)
   - Medium-term (fundamentals / policy)
   - Long-term ONLY if structurally relevant

6. Specify historical comparison logic:
   - Whether comparison is needed
   - What constitutes a valid analog
   - What lessons are transferable vs non-transferable

7. Identify cognitive and market traps:
   - Headline bias
   - Confirmation bias
   - Priced-in risk
   - Reflexive narrative amplification

8. Design the FINAL USER-FACING OUTPUT.
   It MUST include:
   - One-sentence executive signal
   - Incremental info vs expectations
   - Asset-by-asset impact logic
   - Time-horizon differentiation
   - Scenario matrix (base / upside / downside)
   - Priced-in assessment
   - Key risks and invalidation points
   - What to monitor next
   - Confidence level

9. Create STRICT instructions for the execution model:
   - Mandatory tasks
   - Forbidden behaviors
   - Output constraints
   - Absolute ban on investment advice

---

## OUTPUT RULES

- Output valid JSON only
- No commentary outside JSON
- Precision over verbosity
- Explicitly state uncertainty where present

---

## REQUIRED OUTPUT SCHEMA

{
  "informationNature": {
    "classification": "new_information|confirmation|narrative_reinforcement|speculative_signal|noise",
    "confidence": 0.0-1.0,
    "reasoning": "string"
  },
  "marketImpactLogic": {
    "shouldMoveMarkets": boolean,
    "reasoning": "string",
    "challengedBeliefs": ["string"],
    "transmissionMechanisms": [
      {
        "channel": "rates|risk_premium|liquidity|sentiment|positioning|fundamentals",
        "direction": "positive|negative|uncertain",
        "magnitude": "negligible|minor|moderate|significant|major"
      }
    ]
  },
  "requiredData": {
    "marketPrices": [
      {
        "symbol": "TRADINGVIEW_FORMAT",
        "type": "equity|forex|crypto|commodity|index|bond",
        "reason": "string"
      }
    ],
    "timeWindows": [{"period": "string", "reason": "string"}],
    "volatilityMetrics": ["string"],
    "macroInputs": ["string"],
    "positioningProxies": ["string"],
    "historicalComparables": [
      {
        "event": "string",
        "date": "string",
        "relevance": "string",
        "transferableLessons": ["string"],
        "nonTransferableAspects": ["string"]
      }
    ]
  },
  "nonReactionConditions": {
    "conditions": ["string"],
    "invalidationSignals": ["string"]
  },
  "analysisHorizons": {
    "immediate": {"relevant": boolean, "focus": ["string"], "timeframe": "string"},
    "shortTerm": {"relevant": boolean, "focus": ["string"], "timeframe": "string"},
    "mediumTerm": {"relevant": boolean, "focus": ["string"], "timeframe": "string"},
    "longTerm": {"relevant": boolean, "focus": ["string"], "timeframe": "string", "structuralImplications": ["string"]}
  },
  "historicalComparisonLogic": {
    "comparisonNeeded": boolean,
    "validAnalogCriteria": ["string"],
    "invalidAnalogWarnings": ["string"]
  },
  "cognitiveTraps": {
    "headlineBias": "string",
    "confirmationBias": "string",
    "pricedInRisk": "string",
    "reflexiveNarrativeRisk": "string",
    "otherTraps": ["string"]
  },
  "outputDesign": {
    "executiveSummaryFocus": "string",
    "assetImpactLogic": [
      {"asset": "string", "impactChain": "string", "confidence": 0.0-1.0}
    ],
    "scenarioMatrix": {
      "base": {"probability": 0.0-1.0, "description": "string", "implications": ["string"]},
      "upside": {"probability": 0.0-1.0, "trigger": "string", "implications": ["string"]},
      "downside": {"probability": 0.0-1.0, "trigger": "string", "implications": ["string"]}
    },
    "keyMonitoringPoints": ["string"]
  },
  "executorInstructions": {
    "mandatoryTasks": ["string"],
    "forbiddenBehaviors": ["string"],
    "outputConstraints": ["string"],
    "confidenceFloor": 0.0-1.0,
    "absoluteBans": ["This is not investment advice", "No buy/sell recommendations"]
  },
  "epistemicAssessment": {
    "known": ["string"],
    "implied": ["string"],
    "unknown": ["string"],
    "incrementalInfoScore": 0-10
  }
}`;

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTOR PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildExecutorPrompt(strategy: StrategistOutput): string {
  return `You are a precision financial analyst executing a pre-designed analysis framework.

═══════════════════════════════════════════════════════════════════════════════
⚠️ ABSOLUTE CONSTRAINTS (VIOLATION = FAILURE)
═══════════════════════════════════════════════════════════════════════════════

${strategy.executorInstructions.absoluteBans.map(b => `❌ ${b}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
📋 MANDATORY TASKS
═══════════════════════════════════════════════════════════════════════════════

${strategy.executorInstructions.mandatoryTasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
🚫 FORBIDDEN BEHAVIORS
═══════════════════════════════════════════════════════════════════════════════

${strategy.executorInstructions.forbiddenBehaviors.map(b => `• ${b}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
📊 INFORMATION CLASSIFICATION (FROM STRATEGIST)
═══════════════════════════════════════════════════════════════════════════════

Classification: ${strategy.informationNature.classification}
Confidence: ${(strategy.informationNature.confidence * 100).toFixed(0)}%
Reasoning: ${strategy.informationNature.reasoning}

═══════════════════════════════════════════════════════════════════════════════
🎯 MARKET IMPACT LOGIC
═══════════════════════════════════════════════════════════════════════════════

Should Move Markets: ${strategy.marketImpactLogic.shouldMoveMarkets ? 'YES' : 'NO'}
Reasoning: ${strategy.marketImpactLogic.reasoning}

Challenged Beliefs:
${strategy.marketImpactLogic.challengedBeliefs.map(b => `• ${b}`).join('\n')}

Transmission Mechanisms:
${strategy.marketImpactLogic.transmissionMechanisms.map(m => 
  `• ${m.channel}: ${m.direction} (${m.magnitude})`
).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
📈 ASSETS TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════

${strategy.requiredData.marketPrices.map(p => 
  `• ${p.symbol} (${p.type}): ${p.reason}`
).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
⏰ TIME HORIZONS
═══════════════════════════════════════════════════════════════════════════════

${strategy.analysisHorizons.immediate.relevant ? 
  `IMMEDIATE (${strategy.analysisHorizons.immediate.timeframe}):\n${strategy.analysisHorizons.immediate.focus.map(f => `  • ${f}`).join('\n')}` : 
  'IMMEDIATE: Not relevant'}

${strategy.analysisHorizons.shortTerm.relevant ? 
  `\nSHORT-TERM (${strategy.analysisHorizons.shortTerm.timeframe}):\n${strategy.analysisHorizons.shortTerm.focus.map(f => `  • ${f}`).join('\n')}` : 
  '\nSHORT-TERM: Not relevant'}

${strategy.analysisHorizons.mediumTerm.relevant ? 
  `\nMEDIUM-TERM (${strategy.analysisHorizons.mediumTerm.timeframe}):\n${strategy.analysisHorizons.mediumTerm.focus.map(f => `  • ${f}`).join('\n')}` : 
  '\nMEDIUM-TERM: Not relevant'}

${strategy.analysisHorizons.longTerm.relevant ? 
  `\nLONG-TERM (${strategy.analysisHorizons.longTerm.timeframe}):\n${strategy.analysisHorizons.longTerm.focus.map(f => `  • ${f}`).join('\n')}\nStructural: ${strategy.analysisHorizons.longTerm.structuralImplications.join(', ')}` : 
  '\nLONG-TERM: Not structurally relevant'}

═══════════════════════════════════════════════════════════════════════════════
⚠️ COGNITIVE TRAPS TO AVOID
═══════════════════════════════════════════════════════════════════════════════

• HEADLINE BIAS: ${strategy.cognitiveTraps.headlineBias}
• CONFIRMATION BIAS: ${strategy.cognitiveTraps.confirmationBias}
• PRICED-IN RISK: ${strategy.cognitiveTraps.pricedInRisk}
• REFLEXIVE NARRATIVE: ${strategy.cognitiveTraps.reflexiveNarrativeRisk}
${strategy.cognitiveTraps.otherTraps.map(t => `• OTHER: ${t}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
🔍 WHEN NOT TO OVERREACT
═══════════════════════════════════════════════════════════════════════════════

Conditions for limited/no impact:
${strategy.nonReactionConditions.conditions.map(c => `• ${c}`).join('\n')}

Invalidation signals:
${strategy.nonReactionConditions.invalidationSignals.map(s => `• ${s}`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
📜 HISTORICAL CONTEXT
═══════════════════════════════════════════════════════════════════════════════

Comparison Needed: ${strategy.historicalComparisonLogic.comparisonNeeded ? 'YES' : 'NO'}

${strategy.historicalComparisonLogic.comparisonNeeded ? `
Valid Analog Criteria:
${strategy.historicalComparisonLogic.validAnalogCriteria.map(c => `• ${c}`).join('\n')}

Invalid Analog Warnings:
${strategy.historicalComparisonLogic.invalidAnalogWarnings.map(w => `⚠️ ${w}`).join('\n')}

Historical Comparables:
${strategy.requiredData.historicalComparables.map(h => 
  `• ${h.event} (${h.date}): ${h.relevance}
    Transferable: ${h.transferableLessons.join(', ')}
    Non-transferable: ${h.nonTransferableAspects.join(', ')}`
).join('\n\n')}
` : 'No historical comparison required.'}

═══════════════════════════════════════════════════════════════════════════════
📋 EPISTEMIC STATUS
═══════════════════════════════════════════════════════════════════════════════

KNOWN (high confidence):
${strategy.epistemicAssessment.known.map(k => `✓ ${k}`).join('\n')}

IMPLIED (uncertain):
${strategy.epistemicAssessment.implied.map(i => `? ${i}`).join('\n')}

UNKNOWN:
${strategy.epistemicAssessment.unknown.map(u => `✗ ${u}`).join('\n')}

Incremental Information Score: ${strategy.epistemicAssessment.incrementalInfoScore}/10

═══════════════════════════════════════════════════════════════════════════════
🎯 SCENARIO MATRIX (MUST FOLLOW)
═══════════════════════════════════════════════════════════════════════════════

BASE CASE (${(strategy.outputDesign.scenarioMatrix.base.probability * 100).toFixed(0)}%):
${strategy.outputDesign.scenarioMatrix.base.description}
Implications: ${strategy.outputDesign.scenarioMatrix.base.implications.join('; ')}

UPSIDE CASE (${(strategy.outputDesign.scenarioMatrix.upside.probability * 100).toFixed(0)}%):
Trigger: ${strategy.outputDesign.scenarioMatrix.upside.trigger}
Implications: ${strategy.outputDesign.scenarioMatrix.upside.implications.join('; ')}

DOWNSIDE CASE (${(strategy.outputDesign.scenarioMatrix.downside.probability * 100).toFixed(0)}%):
Trigger: ${strategy.outputDesign.scenarioMatrix.downside.trigger}
Implications: ${strategy.outputDesign.scenarioMatrix.downside.implications.join('; ')}

═══════════════════════════════════════════════════════════════════════════════
📝 OUTPUT CONSTRAINTS
═══════════════════════════════════════════════════════════════════════════════

${strategy.executorInstructions.outputConstraints.map(c => `• ${c}`).join('\n')}

Minimum confidence to assert: ${(strategy.executorInstructions.confidenceFloor * 100).toFixed(0)}%

═══════════════════════════════════════════════════════════════════════════════
📤 YOUR OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════════════════════

{
  "executiveSummary": {
    "signal": "One sentence executive signal",
    "incrementalVsExpectations": "significantly_above|above|inline|below|significantly_below",
    "overallSentiment": "strong_bullish|bullish|lean_bullish|neutral|lean_bearish|bearish|strong_bearish"
  },
  "assetImpacts": [
    {
      "asset": "Asset name",
      "tradingViewSymbol": "EXCHANGE:SYMBOL",
      "direction": "long|short|neutral",
      "conviction": 1-10,
      "timeHorizon": "immediate|short_term|medium_term|long_term",
      "rationale": "Why this direction",
      "entryLogic": "When/how to enter",
      "invalidation": "What would invalidate this view"
    }
  ],
  "scenarioAnalysis": {
    "base": {
      "probability": 0.0-1.0,
      "description": "string",
      "assetImplications": {"ASSET": "impact description"}
    },
    "upside": {
      "probability": 0.0-1.0,
      "trigger": "string",
      "assetImplications": {"ASSET": "impact description"}
    },
    "downside": {
      "probability": 0.0-1.0,
      "trigger": "string",
      "assetImplications": {"ASSET": "impact description"}
    }
  },
  "pricedInAssessment": {
    "score": 1-10,
    "reasoning": "string",
    "marketPriorBeliefs": ["string"]
  },
  "risksAndInvalidation": {
    "keyRisks": ["string"],
    "invalidationPoints": ["string"],
    "blindSpots": ["string"]
  },
  "monitoring": {
    "nextDataPoints": ["string"],
    "triggerEvents": ["string"],
    "timeframe": "string"
  },
  "confidence": {
    "overall": 1-10,
    "dataQuality": 1-10,
    "analysisRobustness": 1-10,
    "uncertaintyDisclaimer": "string"
  },
  "meta": {
    "analysisTimestamp": "ISO timestamp",
    "newsCategory": "macro|company|crypto|geopolitical|regulatory|sentiment|technical",
    "primaryAssets": ["string"],
    "secondaryAssets": ["string"]
  }
}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET CONTEXT FETCHER
// ═══════════════════════════════════════════════════════════════════════════════

interface MarketContext {
  fearGreed: { value: number; label: string };
  btc: { price: number; change24h: number };
  vix: number;
  dxy: number;
  timestamp: string;
}

async function fetchMarketContext(): Promise<MarketContext> {
  try {
    const [fgResponse, btcResponse] = await Promise.all([
      fetch('https://api.alternative.me/fng/?limit=1').catch(() => null),
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT').catch(() => null),
    ]);

    let fearGreed = { value: 50, label: 'Neutral' };
    let btc = { price: 0, change24h: 0 };

    if (fgResponse?.ok) {
      const fgData = await fgResponse.json();
      fearGreed = {
        value: parseInt(fgData.data[0].value),
        label: fgData.data[0].value_classification
      };
    }

    if (btcResponse?.ok) {
      const btcData = await btcResponse.json();
      btc = {
        price: parseFloat(btcData.lastPrice),
        change24h: parseFloat(btcData.priceChangePercent)
      };
    }

    return {
      fearGreed,
      btc,
      vix: 18.5, // TODO: Implement real VIX fetch
      dxy: 104.5, // TODO: Implement real DXY fetch
      timestamp: new Date().toISOString()
    };
  } catch {
    return {
      fearGreed: { value: 50, label: 'Neutral' },
      btc: { price: 0, change24h: 0 },
      vix: 18.5,
      dxy: 104.5,
      timestamp: new Date().toISOString()
    };
  }
}

function formatMarketContext(ctx: MarketContext): string {
  return `
═══════════════════════════════════════════════════════════════════════════════
📊 CURRENT MARKET CONTEXT (${ctx.timestamp})
═══════════════════════════════════════════════════════════════════════════════

• Fear & Greed Index: ${ctx.fearGreed.value} (${ctx.fearGreed.label})
• BTC: $${ctx.btc.price.toLocaleString()} (${ctx.btc.change24h >= 0 ? '+' : ''}${ctx.btc.change24h.toFixed(2)}%)
• VIX: ${ctx.vix}
• DXY: ${ctx.dxy}
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

async function retryFetch(
  url: string, 
  options: RequestInit, 
  retries = 3, 
  backoff = 1000
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      if (retries <= 0) throw new Error('Rate limit exceeded after retries');
      const retryAfter = response.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return retryFetch(url, options, retries - 1, backoff * 2);
    }
    
    return response;
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, backoff));
    return retryFetch(url, options, retries - 1, backoff * 2);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUALITY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateStrategyOutput(strategy: StrategistOutput): string[] {
  const warnings: string[] = [];

  // Check required fields
  if (!strategy.informationNature?.classification) {
    warnings.push('Missing information classification');
  }

  if (!strategy.marketImpactLogic?.transmissionMechanisms?.length) {
    warnings.push('No transmission mechanisms defined');
  }

  if (!strategy.requiredData?.marketPrices?.length) {
    warnings.push('No market prices specified');
  }

  if (!strategy.executorInstructions?.mandatoryTasks?.length) {
    warnings.push('No mandatory tasks for executor');
  }

  // Logical checks
  if (strategy.informationNature?.classification === 'noise' && 
      strategy.marketImpactLogic?.shouldMoveMarkets) {
    warnings.push('Contradiction: Classified as noise but should move markets');
  }

  if (strategy.epistemicAssessment?.incrementalInfoScore < 3 && 
      strategy.marketImpactLogic?.shouldMoveMarkets) {
    warnings.push('Low incremental info but expecting market movement');
  }

  return warnings;
}

function validateExecutorOutput(analysis: ExecutorOutput, strategy: StrategistOutput): string[] {
  const warnings: string[] = [];

  // Confidence floor check
  if (analysis.confidence?.overall < strategy.executorInstructions.confidenceFloor * 10) {
    warnings.push('Confidence below strategist floor');
  }

  // Asset coverage check
  const requiredAssets = strategy.requiredData.marketPrices.map(p => p.symbol);
  const analyzedAssets = analysis.assetImpacts.map(a => a.tradingViewSymbol);
  const missingAssets = requiredAssets.filter(a => !analyzedAssets.includes(a));
  if (missingAssets.length > 0) {
    warnings.push(`Missing analysis for: ${missingAssets.join(', ')}`);
  }

  // Scenario probability check
  const totalProb = 
    analysis.scenarioAnalysis.base.probability + 
    analysis.scenarioAnalysis.upside.probability + 
    analysis.scenarioAnalysis.downside.probability;
  if (Math.abs(totalProb - 1) > 0.1) {
    warnings.push(`Scenario probabilities sum to ${(totalProb * 100).toFixed(0)}% (should be ~100%)`);
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

type ModelTier = 'premium' | 'standard' | 'economy';

interface ModelConfig {
  strategist: string;
  executor: string;
  strategistTemp: number;
  executorTemp: number;
  strategistMaxTokens: number;
  executorMaxTokens: number;
}

const MODEL_CONFIGS: Record<ModelTier, ModelConfig> = {
  premium: {
    strategist: 'gpt-4o',       // Best reasoning
    executor: 'gpt-4o',         // Best execution
    strategistTemp: 0.2,
    executorTemp: 0.1,
    strategistMaxTokens: 4000,
    executorMaxTokens: 4000,
  },
  standard: {
    strategist: 'gpt-4o',       // Good reasoning
    executor: 'gpt-4o-mini',    // Fast execution
    strategistTemp: 0.3,
    executorTemp: 0.2,
    strategistMaxTokens: 3000,
    executorMaxTokens: 3000,
  },
  economy: {
    strategist: 'gpt-4o-mini',  // Acceptable reasoning
    executor: 'gpt-4o-mini',    // Fast execution
    strategistTemp: 0.3,
    executorTemp: 0.2,
    strategistMaxTokens: 2500,
    executorMaxTokens: 2500,
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 MAIN ANALYSIS PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnalysisOptions {
  modelTier?: ModelTier;
  includeMarketContext?: boolean;
  skipExecutor?: boolean; // Only run strategist (for debugging)
}

export async function analyzeNewsV2(
  news: NewsInput,
  options: AnalysisOptions = {}
): Promise<AnalysisPipelineResult> {
  const {
    modelTier = 'standard',
    includeMarketContext = true,
    skipExecutor = false,
  } = options;

  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const config = MODEL_CONFIGS[modelTier];
  const startTime = Date.now();
  let strategistEndTime = 0;

  // ══════════════════════════════════════════════════════════════════════════
  // FETCH MARKET CONTEXT
  // ══════════════════════════════════════════════════════════════════════════
  
  let marketContext = '';
  if (includeMarketContext) {
    const ctx = await fetchMarketContext();
    marketContext = formatMarketContext(ctx);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STAGE 1: STRATEGIST
  // ══════════════════════════════════════════════════════════════════════════
  
  // CRITICAL: Only use news body, ignore headline
  const newsBodyOnly = news.body || '';
  if (!newsBodyOnly.trim()) {
    throw new Error('News body is required (headline is intentionally ignored)');
  }

  const strategistInput = `${marketContext}

═══════════════════════════════════════════════════════════════════════════════
📰 NEWS CONTENT (BODY ONLY - HEADLINE IGNORED)
═══════════════════════════════════════════════════════════════════════════════

${newsBodyOnly}

${news.source ? `Source: ${news.source}` : ''}
${news.publishedAt ? `Published: ${news.publishedAt}` : ''}
${news.tickers?.length ? `Related Tickers: ${news.tickers.join(', ')}` : ''}`;

  const strategistResponse = await retryFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.strategist,
      messages: [
        { role: 'system', content: STRATEGIST_SYSTEM_PROMPT },
        { role: 'user', content: strategistInput }
      ],
      temperature: config.strategistTemp,
      max_tokens: config.strategistMaxTokens,
      response_format: { type: 'json_object' }
    }),
  });

  if (!strategistResponse.ok) {
    const error = await strategistResponse.text();
    throw new Error(`Strategist API error: ${error}`);
  }

  const strategistData = await strategistResponse.json();
  const strategyText = strategistData.choices[0]?.message?.content || '{}';
  
  let strategy: StrategistOutput;
  try {
    strategy = JSON.parse(strategyText);
  } catch (e) {
    throw new Error(`Failed to parse strategist output: ${strategyText}`);
  }

  strategistEndTime = Date.now();
  const strategistMs = strategistEndTime - startTime;

  // Validate strategy
  const strategyWarnings = validateStrategyOutput(strategy);

  // If skipExecutor, return early
  if (skipExecutor) {
    return {
      newsId: news.id,
      strategy,
      analysis: {} as ExecutorOutput,
      qualityMetrics: {
        strategistConfidence: strategy.informationNature.confidence,
        executorAdherence: 0,
        overallQuality: strategy.informationNature.confidence,
        warnings: strategyWarnings,
      },
      timing: {
        strategistMs,
        executorMs: 0,
        totalMs: strategistMs,
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STAGE 2: EXECUTOR
  // ══════════════════════════════════════════════════════════════════════════
  
  const executorPrompt = buildExecutorPrompt(strategy);
  
  const executorInput = `${marketContext}

═══════════════════════════════════════════════════════════════════════════════
📰 NEWS CONTENT TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════

${newsBodyOnly}`;

  const executorResponse = await retryFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.executor,
      messages: [
        { role: 'system', content: executorPrompt },
        { role: 'user', content: executorInput }
      ],
      temperature: config.executorTemp,
      max_tokens: config.executorMaxTokens,
      response_format: { type: 'json_object' }
    }),
  });

  if (!executorResponse.ok) {
    const error = await executorResponse.text();
    throw new Error(`Executor API error: ${error}`);
  }

  const executorData = await executorResponse.json();
  const analysisText = executorData.choices[0]?.message?.content || '{}';
  
  let analysis: ExecutorOutput;
  try {
    analysis = JSON.parse(analysisText);
  } catch (e) {
    throw new Error(`Failed to parse executor output: ${analysisText}`);
  }

  const executorMs = Date.now() - strategistEndTime;
  const totalMs = Date.now() - startTime;

  // Validate executor output
  const executorWarnings = validateExecutorOutput(analysis, strategy);
  const allWarnings = [...strategyWarnings, ...executorWarnings];

  // Calculate quality metrics
  const executorAdherence = 1 - (executorWarnings.length * 0.1);
  const overallQuality = (
    strategy.informationNature.confidence * 0.4 +
    executorAdherence * 0.3 +
    (analysis.confidence?.overall || 5) / 10 * 0.3
  );

  return {
    newsId: news.id,
    strategy,
    analysis,
    qualityMetrics: {
      strategistConfidence: strategy.informationNature.confidence,
      executorAdherence: Math.max(0, executorAdherence),
      overallQuality,
      warnings: allWarnings,
    },
    timing: {
      strategistMs,
      executorMs,
      totalMs,
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export interface BatchAnalysisResult {
  results: AnalysisPipelineResult[];
  stats: {
    total: number;
    successful: number;
    failed: number;
    avgStrategistMs: number;
    avgExecutorMs: number;
    avgTotalMs: number;
    tradeable: number;
    bullish: number;
    bearish: number;
    neutral: number;
    highConfidence: number;
    lowIncrementalInfo: number;
  };
  meta: {
    pipeline: string;
    modelTier: ModelTier;
    timestamp: string;
  };
}

export async function analyzeNewsBatchV2(
  newsItems: NewsInput[],
  options: AnalysisOptions = {}
): Promise<BatchAnalysisResult> {
  const results: AnalysisPipelineResult[] = [];
  const failed: string[] = [];

  for (const news of newsItems) {
    try {
      const result = await analyzeNewsV2(news, options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to analyze news ${news.id}:`, error);
      failed.push(news.id);
    }
  }

  // Calculate stats
  const successful = results.length;
  const stats = {
    total: newsItems.length,
    successful,
    failed: failed.length,
    avgStrategistMs: successful > 0 ? results.reduce((s, r) => s + r.timing.strategistMs, 0) / successful : 0,
    avgExecutorMs: successful > 0 ? results.reduce((s, r) => s + r.timing.executorMs, 0) / successful : 0,
    avgTotalMs: successful > 0 ? results.reduce((s, r) => s + r.timing.totalMs, 0) / successful : 0,
    tradeable: results.filter(r => 
      r.analysis.assetImpacts?.some(a => a.direction !== 'neutral' && a.conviction >= 6)
    ).length,
    bullish: results.filter(r => 
      ['strong_bullish', 'bullish', 'lean_bullish'].includes(r.analysis.executiveSummary?.overallSentiment || '')
    ).length,
    bearish: results.filter(r => 
      ['strong_bearish', 'bearish', 'lean_bearish'].includes(r.analysis.executiveSummary?.overallSentiment || '')
    ).length,
    neutral: results.filter(r => 
      r.analysis.executiveSummary?.overallSentiment === 'neutral'
    ).length,
    highConfidence: results.filter(r => 
      (r.analysis.confidence?.overall || 0) >= 7
    ).length,
    lowIncrementalInfo: results.filter(r => 
      r.strategy.epistemicAssessment?.incrementalInfoScore <= 3
    ).length,
  };

  return {
    results,
    stats,
    meta: {
      pipeline: 'meta-prompting-v2',
      modelTier: options.modelTier || 'standard',
      timestamp: new Date().toISOString(),
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  STRATEGIST_SYSTEM_PROMPT,
  buildExecutorPrompt,
  fetchMarketContext,
  validateStrategyOutput,
  validateExecutorOutput,
  MODEL_CONFIGS,
};
