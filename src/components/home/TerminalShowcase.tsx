'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowRight, TrendingUp, TrendingDown, Brain, AlertTriangle, 
  Timer, CheckCircle, ChevronDown, ChevronUp, Lightbulb, Users, 
  Sparkles, Calendar, BarChart3, Info, Loader2, Clock, Target, 
  Shield, ChevronLeft, ChevronRight, Zap, Activity, RefreshCw, Search,
  ArrowUp, ArrowDown
} from 'lucide-react';
import { getCategoryColors, getCategoryLabel } from '@/lib/utils/news-categories';

// ═══════════════════════════════════════════════════════════════════
// SHARED DATA & CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const CHART_W = 420;
const CHART_H = 200;
const CHART_PAD = { top: 20, right: 50, bottom: 20, left: 10 };

type TooltipAnchor = {
  x: number;
  y: number;
  w: number;
  h: number;
  cW: number;
  cH: number;
  key: string;
};

const TOOLTIP_PADDING = 12;
const DEFAULT_TOOLTIP_SIZE = { width: 280, height: 160 };

const getTooltipAnchor = (el: HTMLElement, container: HTMLElement, key: string): TooltipAnchor => {
  const rect = el.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  return {
    x: rect.left - cRect.left + rect.width / 2,
    y: rect.top - cRect.top,
    w: rect.width,
    h: rect.height,
    cW: cRect.width,
    cH: cRect.height,
    key,
  };
};

const getAutoTooltipStyle = (anchor: TooltipAnchor, size = DEFAULT_TOOLTIP_SIZE) => {
  const { x, y, h, cW, cH } = anchor;
  const maxWidth = Math.max(200, cW - TOOLTIP_PADDING * 2);
  const maxHeight = Math.max(120, cH - TOOLTIP_PADDING * 2);
  const availableTop = Math.max(0, y - TOOLTIP_PADDING);
  const availableBottom = Math.max(0, cH - (y + h) - TOOLTIP_PADDING);
  const placeAbove = availableTop >= size.height || availableTop >= availableBottom;
  const heightLimit = Math.max(
    120,
    Math.min(maxHeight, placeAbove ? availableTop || maxHeight : availableBottom || maxHeight)
  );
  const scale = Math.min(1, maxWidth / size.width, heightLimit / size.height);

  const left = Math.max(
    TOOLTIP_PADDING + (size.width * scale) / 2,
    Math.min(x, cW - TOOLTIP_PADDING - (size.width * scale) / 2)
  );

  let top = placeAbove ? y - TOOLTIP_PADDING : y + h + TOOLTIP_PADDING;
  if (placeAbove) {
    top = Math.max(top, size.height * scale + TOOLTIP_PADDING);
  } else {
    top = Math.min(top, cH - size.height * scale - TOOLTIP_PADDING);
  }

  return {
    left,
    top,
    transform: placeAbove
      ? `translate(-50%, -100%) scale(${scale})`
      : `translate(-50%, 0) scale(${scale})`,
    transformOrigin: placeAbove ? '50% 100%' : '50% 0%',
    width: size.width,
    maxHeight: size.height,
  } as const;
};

// News feed items — category values match API/terminal/news (same news type = same category)
const NEWS_FEED = [
  { 
    time: '18h ago', source: 'FibAlgo', category: 'macro',
    title: 'META Beats Q4 Estimates: Revenue $59.89B, EPS $8.88', 
    sentiment: 'bullish' as const, conviction: 8,
    aiSummary: '(1) META delivered a strong earnings beat with revenue and EPS exceeding estimates...',
    assets: ['NASDAQ:META'], isBreaking: true, isMain: true 
  },
  { 
    time: '18h ago', source: 'FibAlgo', category: 'stocks',
    title: 'Securitize Files S-4 Registration for CEPT SPAC Merger', 
    sentiment: 'neutral' as const, conviction: 7,
    aiSummary: '(1) Insufficient actionable data for trade execution...',
    assets: ['NASDAQ:CEPT'], isBreaking: false, isMain: false 
  },
  { 
    time: '18h ago', source: 'FibAlgo', category: 'stocks',
    title: 'HWBK Reports 36% YoY EPS Growth; Sales Up 12.17%', 
    sentiment: 'neutral' as const, conviction: 5,
    aiSummary: '(1) Despite strong fundamental metrics...',
    assets: ['NASDAQ:HWBK'], isBreaking: false, isMain: false 
  },
];

// Calendar events for demo
const CALENDAR_EVENTS = [
  { id: 1, time: '08:30', country: 'USD', name: 'Initial Jobless Claims', impact: 'high' as const, prev: '215K', forecast: '220K', actual: '218K', hoursUntil: 2 },
  { id: 2, time: '10:00', country: 'USD', name: 'Existing Home Sales', impact: 'medium' as const, prev: '4.38M', forecast: '4.20M', actual: '—', hoursUntil: 4 },
  { id: 3, time: '14:00', country: 'USD', name: 'FOMC Minutes', impact: 'high' as const, prev: '—', forecast: '—', actual: '—', hoursUntil: 8 },
];

// Breaking news table demo — category values must match API/terminal/news (same news = same category)
const BREAKING_NEWS_DEMO = [
  { id: 1, timeDisplay: 'NOW', isVeryRecent: true, sentiment: 'bullish' as const, content: 'Fed signals potential rate cut in Q2; markets rally.', category: 'macro' as const },
  { id: 2, timeDisplay: '2m', isVeryRecent: true, sentiment: 'bearish' as const, content: 'US CPI comes in hotter than expected; DXY spikes.', category: 'macro' as const },
  { id: 3, timeDisplay: '8m', isVeryRecent: false, sentiment: 'bullish' as const, content: 'META beats Q4 estimates; revenue and EPS above consensus.', category: 'macro' as const },
  { id: 4, timeDisplay: '12m', isVeryRecent: false, sentiment: 'neutral' as const, content: 'ECB keeps rates unchanged; Lagarde cites data dependency.', category: 'macro' as const },
  { id: 5, timeDisplay: '18m', isVeryRecent: false, sentiment: 'bearish' as const, content: 'Oil slides on demand concerns; WTI below $72.', category: 'commodities' as const },
];

// Market Sentiment demo (terminal/news style)
const SENTIMENT_DEMO = {
  sentimentScore: 42,
  bullish: 28,
  bearish: 12,
  neutral: 10,
  total: 50,
  avgNewsScore: 7,
  breakingCount: 5,
};

const SENTIMENT_TOOLTIPS: Record<string, { title: string; shortDesc: string; description: string }> = {
  score: { title: 'Sentiment Score', shortDesc: 'Aggregate mood', description: 'Aggregate market mood from -100 (bearish) to +100 (bullish). Derived from AI analysis of recent news.' },
  bar: { title: 'Score Gauge', shortDesc: 'Visual position', description: 'Visual position of the score. Green = bullish, red = bearish, amber = mixed.' },
  bullish: { title: 'Bullish Count', shortDesc: 'Buy / Long signals', description: 'Number of news items with bullish AI signal (buy/long). Percentage of total.' },
  bearish: { title: 'Bearish Count', shortDesc: 'Sell / Short signals', description: 'Number of news items with bearish AI signal (sell/short).' },
  neutral: { title: 'Neutral Count', shortDesc: 'No direction', description: 'News with no clear directional signal.' },
  impact: { title: 'Impact & Breaking', shortDesc: 'Impact score', description: 'Average impact score of news (1–10) and count of breaking headlines.' },
};

// Trending topics demo (terminal/news style)
const TRENDING_TOPICS_DEMO = [
  { rank: 1, topic: 'Fed', count: 24 },
  { rank: 2, topic: 'CPI', count: 18 },
  { rank: 3, topic: 'Earnings', count: 15 },
  { rank: 4, topic: 'Rate', count: 12 },
  { rank: 5, topic: 'Inflation', count: 11 },
  { rank: 6, topic: 'DXY', count: 9 },
  { rank: 7, topic: 'Gold', count: 8 },
  { rank: 8, topic: 'FOMC', count: 7 },
  { rank: 9, topic: 'Oil', count: 6 },
  { rank: 10, topic: 'ECB', count: 5 },
];

const TRENDING_TOOLTIPS: Record<string, { title: string; shortDesc: string; description: string }> = {
  header: { title: 'Trend Topics', shortDesc: 'From headlines', description: 'Most frequent terms in recent news. Extracted from AI-analyzed headlines; click to filter news by topic.' },
  rank: { title: 'Rank', shortDesc: '#1–10', description: 'Position by mention count. Top 3 often highlighted in cyan.' },
  topic: { title: 'Topic', shortDesc: 'Keyword', description: 'Single word or ticker. Click to search news feed for this term.' },
  mentions: { title: 'Mentions', shortDesc: 'Count', description: 'How many headlines mention this topic in the selected period.' },
};

// Markets page demo — mock data (terminal/markets layout)
type MarketTabId = 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices';
interface MarketCoin {
  symbol: string;
  name: string;
  logo: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
}
interface MarketForex {
  symbol: string;
  name: string;
  baseLogo: string;
  quoteLogo: string;
  price: number;
  change24h: number;
  volume24h: number;
}
interface MarketStock {
  symbol: string;
  name: string;
  logo: string;
  price: number;
  change24h: number;
  high24h: number;
  volume24h: number;
  marketCap: number;
}
interface MarketCommodity {
  symbol: string;
  name: string;
  category: string;
  unit: string;
  logo: string;
  price: number;
  change24h: number;
}
interface MarketIndex {
  symbol: string;
  name: string;
  flagImage: string;
  price: number;
  change24h: number;
  high24h: number;
}

// Image URLs: CoinGecko (crypto), flagcdn (forex/indices), Clearbit (stocks), ui-avatars (commodities)
const MARKETS_DEMO = {
  coins: [
    { symbol: 'BTC', name: 'Bitcoin', logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', price: 97250, change24h: 2.34, volume24h: 42e9, marketCap: 1.92e12, high24h: 98500, low24h: 94800 },
    { symbol: 'ETH', name: 'Ethereum', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', price: 3580, change24h: -0.82, volume24h: 18e9, marketCap: 430e9, high24h: 3680, low24h: 3520 },
    { symbol: 'SOL', name: 'Solana', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', price: 228, change24h: 5.12, volume24h: 4.2e9, marketCap: 105e9, high24h: 235, low24h: 218 },
    { symbol: 'XRP', name: 'XRP', logo: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white.png', price: 2.48, change24h: 1.05, volume24h: 2.1e9, marketCap: 142e9, high24h: 2.52, low24h: 2.42 },
    { symbol: 'BNB', name: 'BNB', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', price: 685, change24h: -0.45, volume24h: 1.8e9, marketCap: 102e9, high24h: 692, low24h: 678 },
  ] as MarketCoin[],
  forex: [
    { symbol: 'EUR/USD', name: 'Euro / US Dollar', baseLogo: 'https://flagcdn.com/w40/eu.png', quoteLogo: 'https://flagcdn.com/w40/us.png', price: 1.08452, change24h: 0.12, volume24h: 1.2e12 },
    { symbol: 'GBP/USD', name: 'British Pound / USD', baseLogo: 'https://flagcdn.com/w40/gb.png', quoteLogo: 'https://flagcdn.com/w40/us.png', price: 1.26580, change24h: -0.08, volume24h: 580e9 },
    { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', baseLogo: 'https://flagcdn.com/w40/us.png', quoteLogo: 'https://flagcdn.com/w40/jp.png', price: 149.852, change24h: 0.35, volume24h: 420e9 },
  ] as MarketForex[],
  stocks: [
    { symbol: 'AAPL', name: 'Apple Inc.', logo: 'https://logo.clearbit.com/apple.com', price: 228.45, change24h: 0.92, high24h: 230.10, volume24h: 52e9, marketCap: 3.5e12 },
    { symbol: 'META', name: 'Meta Platforms', logo: 'https://logo.clearbit.com/meta.com', price: 652.30, change24h: 2.15, high24h: 658.00, volume24h: 18e9, marketCap: 1.68e12 },
    { symbol: 'NVDA', name: 'NVIDIA Corp', logo: 'https://logo.clearbit.com/nvidia.com', price: 138.20, change24h: -0.55, high24h: 140.50, volume24h: 45e9, marketCap: 3.4e12 },
  ] as MarketStock[],
  commodities: [
    { symbol: 'XAUUSD', name: 'Gold', category: 'Metals', unit: 'oz', logo: 'https://ui-avatars.com/api/?name=Au&background=FFD700&color=000&size=64', price: 2654.80, change24h: 0.42 },
    { symbol: 'XAGUSD', name: 'Silver', category: 'Metals', unit: 'oz', logo: 'https://ui-avatars.com/api/?name=Ag&background=C0C0C0&color=333&size=64', price: 31.25, change24h: -0.15 },
    { symbol: 'USOIL', name: 'Crude Oil WTI', category: 'Energy', unit: 'bbl', logo: 'https://ui-avatars.com/api/?name=WTI&background=8B4513&color=fff&size=64', price: 72.40, change24h: 1.20 },
  ] as MarketCommodity[],
  indices: [
    { symbol: 'SPX', name: 'S&P 500', flagImage: 'https://flagcdn.com/w40/us.png', price: 5850.25, change24h: 0.38, high24h: 5862.00 },
    { symbol: 'IXIC', name: 'NASDAQ', flagImage: 'https://flagcdn.com/w40/us.png', price: 18250.50, change24h: 0.52, high24h: 18280.00 },
    { symbol: 'DJI', name: 'Dow Jones', flagImage: 'https://flagcdn.com/w40/us.png', price: 42150.80, change24h: -0.12, high24h: 42200.00 },
  ] as MarketIndex[],
  fearGreedIndex: { value: 52, classification: 'Neutral' as const },
};

const MARKETS_TOOLTIPS: Record<string, { title: string; shortDesc: string; description: string }> = {
  header: { title: 'All Markets', shortDesc: 'Live prices', description: 'Single view for Crypto, Forex, Stocks, Commodities and Indices. Live prices and 24h change with sortable columns.' },
  tabs: { title: 'Asset Tabs', shortDesc: 'Switch category', description: 'Switch between Crypto, Forex, Stocks, Commodities and Indices. Each tab shows relevant columns and overview stats.' },
  search: { title: 'Search & Refresh', shortDesc: 'Filter and update', description: 'Search assets by name or symbol. Refresh button fetches latest data from the API.' },
  table: { title: 'Market Table', shortDesc: 'Sortable list', description: 'All assets with price, 24h change, volume and optional 24h range. Click column headers to sort.' },
  sort: { title: 'Sortable Columns', shortDesc: 'Click to sort', description: 'Click any column header to sort by that field. Toggle ascending/descending with repeated clicks.' },
  divider: { title: 'Resizable Layout', shortDesc: 'Drag to resize', description: 'Drag the divider to change the table vs indicators panel width. Helps focus on data or context.' },
  overview: { title: 'Market Overview', shortDesc: 'Tab-specific stats', description: 'Summary stats for the active tab: market cap, volume, dominance (crypto), or key instruments.' },
  fearGreed: { title: 'Fear & Greed Index', shortDesc: 'Crypto sentiment', description: 'Alternative.me Fear & Greed Index (0–100). Extreme Fear to Extreme Greed. Shown for Crypto tab only.' },
  topGainers: { title: 'Top Gainers', shortDesc: 'Best performers', description: 'Assets with highest 24h gain in the current tab. Quick scan for momentum.' },
  topLosers: { title: 'Top Losers', shortDesc: 'Worst performers', description: 'Assets with largest 24h decline. Useful for risk or mean-reversion ideas.' },
};

// Full news data for expanded card
const FULL_NEWS_DATA = {
  time: '14h ago', source: 'FibAlgo', speed: '38 sec', category: 'macro', isBreaking: true,
  title: 'META Beats Q4 Estimates: Revenue $59.89B, EPS $8.88 vs Forecasts',
  sentiment: 'bullish' as const, conviction: 8, tradeType: 'SWING', marketRegime: 'RISK-ON',
  position: { direction: 'LONG', asset: 'NASDAQ:META', confidence: 72, type: 'SWING TRADING' },
  aiAnalysis: '(1) META delivered a strong earnings beat with revenue and EPS exceeding estimates, accompanied by robust Q1 2026 guidance that surpasses consensus, creating a favorable setup for swing trading the post-earnings momentum over 3-5 trading days...',
  newsAnalysis: 'Meta Platforms reported strong Q4 2025 earnings after market close on January 28, 2026, beating both revenue ($59.89B vs $58.30B estimate) and EPS ($8.88 vs $8.16 estimate) expectations...',
  keyRisk: 'Elevated capex guidance of $115-135B for 2026 significantly exceeds expectations and could trigger profit-taking...',
  researchQueries: [
    'META historical price and volume data for 5 days pre-earnings',
    'META implied volatility and options chain data around earnings',
    'META forward guidance or management commentary on capex plans',
  ],
  marketImpact: 'Significant', riskMode: 'ELEVATED', infoQuality: 'VERIFIED',
  priceMove: [0, 0.8, 1.5, 2.2, 3.1, 2.8, 3.5, 4.2, 3.8, 4.5, 5.1, 4.8, 5.5],
};

// Full event data for expanded card (Post-Event Card - matching real calendar page)
const FULL_EVENT_DATA = {
  name: 'US Core CPI (YoY)',
  country: 'US',
  tier: 1 as const,
  releasedAgo: '18m ago',
  actual: '2.9%',
  forecast: '3.0%',
  previous: '3.2%',
  outcome: 'BEAT EXPECTATIONS' as const,
  aiInstantAnalysis: 'US Core CPI came in at 2.9% vs 3.0% f\'cast — slight beat. Inflation trend easing.',
  urgency: 5,
  marketImpact: 5,
  scenarios: [
    { label: 'BIG BEAT', description: '', color: '#22C55E' },
    { label: 'SMALL BEAT', description: '', color: '#4ADE80' },
    { label: 'INLINE', description: '', color: '#6B7280' },
    { label: 'SMALL MISS', description: '', color: '#F87171' },
    { label: 'BIG MISS', description: '', color: '#EF4444' },
  ],
  tradeSetups: {
    bullish: {
      trigger: 'If follow-through above 5850',
      asset: 'SPX',
      entry: '5840',
      stop: '5790 (-0.9%)',
      target: '5920 (+1.4%)',
      rr: '1.5:1',
      invalidation: 'Break below 5820',
    },
    bearish: {
      trigger: 'If reversal',
      asset: 'SPX',
      entry: 'On break',
      stop: '5880',
      target: '5780',
      rr: '1:1',
      invalidation: 'Reclaim 5840',
    },
  },
  alternativeTrades: {
    ifBeat: ['LONG DXY', 'SHORT XAUUSD'],
    ifMiss: ['SHORT DXY', 'LONG XAUUSD'],
  },
  marketImplications: [
    { asset: 'SPX', impact: 'Initial pop on beat' },
    { asset: 'DXY', impact: 'Mixed' },
    { asset: 'XAUUSD', impact: 'Pressure' },
  ],
  summary: 'Core CPI beat supports soft-landing narrative. Equities may extend gains near-term; watch for follow-through. Demo — connect OpenAI for full analysis.',
};

// Calendar events for demo - matching real calendar page style
const UPCOMING_EVENTS = [
  { 
    id: 1, 
    name: 'FOMC Rate Decision', 
    country: 'US', 
    tier: 1 as const, 
    hoursUntil: 4, 
    conviction: 6, 
    expected: '5.50%', 
    previous: '5.50%',
    aiReady: true,
    isMain: true,
  },
  { 
    id: 2, 
    name: 'US Initial Jobless Claims', 
    country: 'US', 
    tier: 2 as const, 
    hoursUntil: 22, 
    conviction: 5, 
    expected: '220K', 
    previous: '218K',
    aiReady: true,
    isMain: false,
  },
  { 
    id: 3, 
    name: 'US Retail Sales (MoM)', 
    country: 'US', 
    tier: 2 as const, 
    hoursUntil: 12, 
    conviction: 6, 
    expected: '0.3%', 
    previous: '0.2%',
    aiReady: false,
    isLive: true,
    isMain: false,
  },
];

// Explanation texts for news highlights
const NEWS_EXPLANATIONS: Record<string, { title: string; description: string; detail: string }> = {
  'highlight-header': { title: 'News Source & Speed', description: 'Real-time news tracking', detail: 'FibAlgo monitors news sources 24/7 and analyzes each story in seconds.' },
  'highlight-title': { title: 'AI-Generated Headline', description: 'Optimized for clarity', detail: 'Our AI creates a clear, actionable headline that captures the market-moving essence.' },
  'highlight-signal': { title: 'Trading Signal', description: 'Direction & confidence', detail: 'The AI determines whether news is Bullish, Bearish, or Neutral. Conviction shows confidence.' },
  'highlight-ai': { title: 'AI Analysis Summary', description: 'Deep market intelligence', detail: 'Synthesizes news with market data, technical analysis, and historical patterns.' },
  'highlight-position': { title: 'Recommended Position', description: 'Actionable trade idea', detail: 'AI suggests a specific position: Long or Short, the asset, confidence, and trading style.' },
  'highlight-metrics': { title: 'Risk Metrics', description: 'Know before you trade', detail: 'Market Impact, Risk Mode, and Info Quality help assess the trade setup.' },
  'highlight-fullbtn': { title: 'Full Analysis', description: 'Deep dive available', detail: 'Reveals complete analysis including detailed breakdown and research data.' },
  'highlight-news-analysis': { title: 'Detailed News Breakdown', description: 'Complete context', detail: 'Thorough analysis covering implications for different trading styles.' },
  'highlight-key-risk': { title: 'Key Risk Factor', description: 'What could go wrong', detail: 'The most important risk that could invalidate this trade.' },
  'highlight-research': { title: 'AI Research Data', description: 'Real-time web search', detail: 'AI searched the web for specific data points to inform its decision.' },
  'highlight-asset-btn': { title: 'View Chart', description: 'One-click access', detail: 'Click to instantly open the chart for this asset.' },
};

// Explanation texts for event highlights  
const EVENT_EXPLANATIONS: Record<string, { title: string; description: string; detail: string }> = {
  'highlight-header': { title: 'Event Result', description: 'Actual vs Expectations', detail: 'Shows the released data compared to forecast and previous values. Green indicates a beat.' },
  'highlight-ai-analysis': { title: 'AI Instant Analysis', description: 'Real-time interpretation', detail: 'AI instantly interprets the data release and provides actionable market context.' },
  'highlight-urgency': { title: 'Urgency & Impact', description: 'Trade timing signals', detail: 'Urgency shows how quickly you should act. Market Impact indicates potential price movement.' },
  'highlight-scenarios': { title: 'Scenario Analysis', description: 'Outcome mapping', detail: 'AI maps 5 possible outcomes from BIG BEAT to BIG MISS with expected market reactions.' },
  'highlight-bullish': { title: 'Bullish Trade Setup', description: 'If data beats', detail: 'Complete trade setup with trigger, entry, stop loss, target, and risk/reward ratio.' },
  'highlight-bearish': { title: 'Bearish Trade Setup', description: 'If data misses', detail: 'Opposite direction trade with specific levels and invalidation conditions.' },
  'highlight-alternatives': { title: 'Alternative Trades', description: 'Correlated assets', detail: 'Secondary trade ideas based on beat/miss outcomes in correlated markets.' },
  'highlight-implications': { title: 'Market Implications', description: 'Cross-asset impact', detail: 'How the data release affects different asset classes like stocks, dollar, and gold.' },
  'highlight-summary': { title: 'Summary', description: 'Key takeaway', detail: 'Concise summary of the overall market implications and recommended action.' },
  'highlight-live-event': { title: 'Live Event', description: 'Awaiting data release', detail: 'Events in live window are about to release data. AI is ready to analyze the moment data drops.' },
  'highlight-live-scenarios': { title: 'Pre-Event Scenarios', description: 'Prepared outcomes', detail: 'AI has pre-analyzed all possible outcomes so you can react instantly when data releases.' },
  'highlight-live-bullish': { title: 'Bullish Setup Ready', description: 'If data beats', detail: 'Trade setup prepared for bullish scenario. Entry, stop, and target levels are pre-calculated.' },
  'highlight-live-bearish': { title: 'Bearish Setup Ready', description: 'If data misses', detail: 'Trade setup prepared for bearish scenario. Ready to execute on miss confirmation.' },
  'highlight-upcoming': { title: 'Upcoming Events', description: 'High-impact schedule', detail: 'Pre-analyzed events with AI-ready trade setups. Click to see scenarios and trade plans.' },
  'highlight-upcoming-scenarios': { title: 'FOMC Scenarios', description: 'Rate decision outcomes', detail: 'AI maps hawkish vs dovish scenarios and their market implications.' },
  'highlight-upcoming-bullish': { title: 'Bullish FOMC Setup', description: 'If dovish', detail: 'Complete trade setup if Fed signals pause or rate cuts.' },
  'highlight-upcoming-bearish': { title: 'Bearish FOMC Setup', description: 'If hawkish', detail: 'Trade setup if Fed maintains hawkish stance or surprises with hike.' },
};

// Live event data (Pre-Event Card style)
const LIVE_EVENT_DATA = {
  name: 'US Retail Sales (MoM)',
  country: 'US',
  tier: 2 as const,
  minutesUntil: 12,
  forecast: '0.3%',
  previous: '0.2%',
  conviction: 6,
  strategy: 'Wait And React',
  description: 'Event in live window, awaiting data release.',
  scenarios: [
    { label: 'BIG BEAT', color: '#22C55E' },
    { label: 'SMALL BEAT', color: '#4ADE80' },
    { label: 'INLINE', color: '#6B7280' },
    { label: 'SMALL MISS', color: '#F87171' },
    { label: 'BIG MISS', color: '#EF4444' },
  ],
  tradeSetups: {
    bullish: { trigger: 'If beat > 0.5%', asset: 'SPX', entry: '5840', stop: '5790', target: '5920', rr: '1.6:1', invalidation: 'Break below 5800' },
    bearish: { trigger: 'If miss < 0%', asset: 'SPX', entry: 'On break', stop: '5880', target: '5750', rr: '1.3:1', invalidation: 'Reclaim 5850' },
  },
  alternativeTrades: { ifBeat: ['LONG DXY', 'SHORT XAUUSD'], ifMiss: ['SHORT DXY', 'LONG XAUUSD'] },
};

// Upcoming events data
const UPCOMING_EVENTS_DATA = {
  name: 'FOMC Rate Decision',
  country: 'US',
  tier: 1 as const,
  hoursUntil: 4,
  expected: '5.50%',
  previous: '5.50%',
  conviction: 6,
  strategy: 'Wait And React',
  aiReady: true,
  scenarios: [
    { label: 'BIG BEAT', description: 'Hawkish hold', color: '#22C55E' },
    { label: 'SMALL BEAT', description: '—', color: '#4ADE80' },
    { label: 'INLINE', description: 'As expected', color: '#6B7280' },
    { label: 'SMALL MISS', description: '—', color: '#F87171' },
    { label: 'BIG MISS', description: 'Dovish cut', color: '#EF4444' },
  ],
  tradeSetups: {
    bullish: { trigger: 'If Fed signals pause', asset: 'LONG SPX', entry: 'Current', stop: '-1.5%', target: '+2%', rr: '1.3:1', invalidation: 'Break below support' },
    bearish: { trigger: 'If Fed stays hawkish', asset: 'SHORT DXY', entry: 'On strength', stop: '-0.5%', target: '+1%', rr: '2:1', invalidation: 'DXY fails 104' },
  },
  alternativeTrades: { ifBeat: ['SHORT DXY', 'LONG XAUUSD'], ifMiss: ['LONG DXY', 'SHORT XAUUSD'] },
};

// ═══════════════════════════════════════════════════════════════════
// CHART HELPERS
// ═══════════════════════════════════════════════════════════════════

function generateGoldCandles(count: number, basePrice: number) {
  const candles: { o: number; h: number; l: number; c: number }[] = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 12;
    const volatility = Math.random() * 8 + 4;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    candles.push({ o: open, h: high, l: low, c: close });
    price = close;
  }
  return candles;
}

function generateMetaCandles(priceMove: number[], basePrice: number) {
  const candles: { o: number; h: number; l: number; c: number }[] = [];
  let price = basePrice;
  for (let i = 0; i < priceMove.length; i++) {
    const move = priceMove[i] - (priceMove[i - 1] || 0);
    const volatility = Math.abs(move) * 25 + 12;
    const open = price;
    const close = price + (move / 100) * basePrice;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    candles.push({ o: open, h: high, l: low, c: close });
    price = close;
  }
  return candles;
}

// ═══════════════════════════════════════════════════════════════════
// NEWS DEMO COMPONENT
// ═══════════════════════════════════════════════════════════════════

type NewsPhase = 
  | 'terminal' | 'news-click' | 'news-expand'
  | 'highlight-header' | 'highlight-title' | 'highlight-signal' | 'highlight-ai'
  | 'highlight-position' | 'highlight-metrics' | 'highlight-fullbtn'
  | 'full-analysis-open' | 'highlight-news-analysis' | 'highlight-key-risk'
  | 'highlight-research' | 'highlight-asset-btn'
  | 'chart-loading' | 'chart-animate';

function NewsDemo({ isActive, isInView = false }: { isActive: boolean; isInView?: boolean }) {
  const [phase, setPhase] = useState<NewsPhase>('terminal');
  const [goldCandles] = useState(() => generateGoldCandles(20, 2650));
  const [metaCandles] = useState(() => generateMetaCandles(FULL_NEWS_DATA.priceMove, 650));
  const [highlightScale, setHighlightScale] = useState(1);
  const [scrollY, setScrollY] = useState(0);
  const [newsHighlight, setNewsHighlight] = useState(-1);
  const [calendarHighlight, setCalendarHighlight] = useState(-1);
  const [calendarMinimized, setCalendarMinimized] = useState(false);
  const [candleProgress, setCandleProgress] = useState(0);
  const [chartSymbol, setChartSymbol] = useState('XAUUSD');
  const [autoTooltip, setAutoTooltip] = useState<TooltipAnchor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isTerminalView = phase === 'terminal' || phase === 'news-click';
  const isExpanded = !isTerminalView && !['chart-loading', 'chart-animate'].includes(phase);
  const isFullAnalysisOpen = ['full-analysis-open', 'highlight-news-analysis', 'highlight-key-risk', 'highlight-research', 'highlight-asset-btn'].includes(phase);
  const isHighlighting = phase.startsWith('highlight-');
  const isChartPhase = phase === 'chart-loading' || phase === 'chart-animate';
  const currentExplanation = NEWS_EXPLANATIONS[phase] || null;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const highlightWithZoom = useCallback(async (targetPhase: NewsPhase, readTime: number = 2500) => {
    setPhase(targetPhase);
    setHighlightScale(1.02);
    await delay(150);
    setHighlightScale(1.04);
    await delay(readTime);
    setHighlightScale(1.02);
    await delay(150);
    setHighlightScale(1);
    await delay(200);
  }, []);

  const animateCandles = useCallback(() => new Promise<void>(resolve => {
    const duration = 2500;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      setCandleProgress(1 - Math.pow(1 - progress, 3));
      if (progress < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  }), []);

  useEffect(() => {
    if (!isActive || !isInView) {
      setPhase('terminal');
      setHighlightScale(1);
      setScrollY(0);
      setNewsHighlight(-1);
      setCalendarHighlight(-1);
      setCandleProgress(0);
      setChartSymbol('XAUUSD');
      setAutoTooltip(null);
      return;
    }

    let isCancelled = false;
    const safeDelay = (ms: number) => new Promise<void>(resolve => {
      const timer = setTimeout(() => { if (!isCancelled) resolve(); }, ms);
      if (isCancelled) clearTimeout(timer);
    });

    const runSequence = async () => {
      if (isCancelled) return;
      setPhase('terminal');
      setHighlightScale(1);
      setScrollY(0);
      setNewsHighlight(-1);
      setCalendarHighlight(-1);
      setCandleProgress(0);
      setChartSymbol('XAUUSD');

      await safeDelay(200);
      if (isCancelled) return;

      for (let i = 0; i < NEWS_FEED.length; i++) {
        if (isCancelled) return;
        setNewsHighlight(i);
        await safeDelay(120);
      }
      await safeDelay(150);
      if (isCancelled) return;

      for (let i = 0; i < CALENDAR_EVENTS.length; i++) {
        if (isCancelled) return;
        setCalendarHighlight(i);
        await safeDelay(120);
      }
      await safeDelay(200);
      if (isCancelled) return;

      setPhase('news-click');
      setNewsHighlight(0);
      await safeDelay(200);
      if (isCancelled) return;

      setPhase('news-expand');
      await safeDelay(300);
      if (isCancelled) return;

      await highlightWithZoom('highlight-header', 2500);
      if (isCancelled) return;
      await highlightWithZoom('highlight-title', 2500);
      if (isCancelled) return;
      await highlightWithZoom('highlight-signal', 3000);
      if (isCancelled) return;
      await highlightWithZoom('highlight-ai', 3500);
      if (isCancelled) return;
      
      setScrollY(100);
      await safeDelay(400);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-position', 3000);
      if (isCancelled) return;
      await highlightWithZoom('highlight-metrics', 3000);
      if (isCancelled) return;
      
      setScrollY(180);
      await safeDelay(400);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-fullbtn', 2000);
      if (isCancelled) return;
      
      setPhase('full-analysis-open');
      await safeDelay(600);
      if (isCancelled) return;
      
      setScrollY(320);
      await safeDelay(400);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-news-analysis', 4000);
      if (isCancelled) return;
      
      setScrollY(480);
      await safeDelay(400);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-key-risk', 3500);
      if (isCancelled) return;
      
      setScrollY(620);
      await safeDelay(400);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-research', 3500);
      if (isCancelled) return;
      
      setScrollY(780);
      await safeDelay(400);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-asset-btn', 2500);
      if (isCancelled) return;
      
      setPhase('chart-loading');
      setChartSymbol('NASDAQ:META');
      await safeDelay(1500);
      if (isCancelled) return;
      
      setPhase('chart-animate');
      await animateCandles();
      await safeDelay(2500);
      if (isCancelled) return;
      
      setPhase('terminal');
      setChartSymbol('XAUUSD');
      setCandleProgress(0);
    };

    runSequence();
    const interval = setInterval(runSequence, 50000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isActive, isInView, highlightWithZoom, animateCandles]);

  useEffect(() => {
    if (!currentExplanation) {
      setAutoTooltip(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const key = phase.startsWith('highlight-') ? phase : 'news-default';
    const el = container.querySelector<HTMLElement>(`[data-tooltip-key="${key}"]`);
    if (!el) {
      setAutoTooltip(null);
      return;
    }
    setAutoTooltip(getTooltipAnchor(el, container, key));
  }, [currentExplanation, phase]);

  // Chart calculations
  const goldPrices = goldCandles.flatMap(c => [c.h, c.l]);
  const goldMin = Math.min(...goldPrices) - 5;
  const goldMax = Math.max(...goldPrices) + 5;
  const goldRange = goldMax - goldMin || 1;
  const goldCandleWidth = (CHART_W - CHART_PAD.left - CHART_PAD.right) / goldCandles.length;

  const visibleMetaCandles = metaCandles.slice(0, Math.max(1, Math.floor(candleProgress * metaCandles.length)));
  const metaPrices = metaCandles.flatMap(c => [c.h, c.l]);
  const metaMin = Math.min(...metaPrices) - 5;
  const metaMax = Math.max(...metaPrices) + 5;
  const metaRange = metaMax - metaMin || 1;
  const metaCandleWidth = (CHART_W - CHART_PAD.left - CHART_PAD.right) / metaCandles.length;

  const getHighlightStyle = (targetPhase: NewsPhase) => {
    const isActivePhase = phase === targetPhase;
    return {
      transform: isActivePhase ? `scale(${highlightScale})` : 'scale(1)',
      boxShadow: isActivePhase ? '0 0 0 2px rgba(255,255,255,0.9), 0 0 30px rgba(255,255,255,0.3)' : 'none',
      transition: 'transform 0.2s ease, box-shadow 0.3s ease, opacity 0.3s ease',
      position: 'relative' as const,
      zIndex: isActivePhase ? 100 : 1,
      opacity: isHighlighting && !isActivePhase ? 0.15 : 1,
    };
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '540px', position: 'relative', minHeight: 0 }}>
      {/* Main content: grid (left + chart) — fills space when calendar minimized */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '340px 1fr', gridTemplateRows: '1fr', position: 'relative' }}>
      {/* Explanation Panel */}
      {currentExplanation && autoTooltip && (
        <div
          style={{
            position: 'absolute',
            ...getAutoTooltipStyle(autoTooltip),
            background: '#0a0a0f',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '16px',
            zIndex: 200,
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info style={{ width: 16, height: 16, color: '#fff' }} />
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{currentExplanation.title}</h4>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '2px 0 0 0' }}>{currentExplanation.description}</p>
            </div>
          </div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 0 12px 0' }} />
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{currentExplanation.detail}</p>
        </div>
      )}

      {/* Dimming overlay */}
      {isHighlighting && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, pointerEvents: 'none' }} />}

      {/* Left Panel: News Feed */}
      <div style={{ 
        borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        position: isExpanded ? 'absolute' : 'relative', inset: isExpanded ? 0 : 'auto',
        zIndex: isExpanded ? 70 : (isHighlighting ? 60 : 1), background: isExpanded ? '#08080c' : 'transparent',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>TERMINAL</span>
        </div>

        {isTerminalView && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {NEWS_FEED.map((news, i) => (
              <div key={i} style={{
                padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: newsHighlight === i ? (news.isMain ? 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, transparent 50%)' : 'rgba(255,255,255,0.02)') : 'transparent',
                borderLeft: news.isMain ? '3px solid #EF4444' : '3px solid transparent',
                transition: 'all 0.3s ease', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem' }}>{news.time}</span>
                  <span style={{ color: '#00E5FF', fontSize: '0.6rem', fontWeight: 600 }}>{news.source}</span>
                  <span style={{ background: getCategoryColors(news.category).bg, color: getCategoryColors(news.category).text, padding: '1px 5px', borderRadius: '3px', fontSize: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>{getCategoryLabel(news.category)}</span>
                  {news.isBreaking && (
                    <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '1px 5px', borderRadius: '3px', fontSize: '0.45rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#EF4444' }} />BREAKING
                    </span>
                  )}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.72rem', fontWeight: 600, margin: '0 0 6px 0', lineHeight: 1.3 }}>{news.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: news.sentiment === 'bullish' ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)', border: `1px solid ${news.sentiment === 'bullish' ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)'}`, padding: '2px 6px', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 600, color: news.sentiment === 'bullish' ? '#22C55E' : '#9CA3AF', textTransform: 'uppercase' }}>
                    {news.sentiment === 'bullish' && <TrendingUp size={9} />}
                    {news.sentiment.toUpperCase()}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '1px' }}>
                      {[...Array(10)].map((_, j) => (
                        <div key={j} style={{ width: '3px', height: '8px', borderRadius: '1px', background: j < news.conviction ? '#22C55E' : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                    <span style={{ color: '#22C55E', fontSize: '0.55rem', fontWeight: 600 }}>{news.conviction}/10</span>
                  </div>
                  <span style={{ marginLeft: 'auto', background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.25)', color: '#00E676', padding: '2px 6px', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 600 }}>{news.assets[0]}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isExpanded && (
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(-${scrollY}px)`, transition: 'transform 0.4s ease', padding: '16px' }}>
              <div data-tooltip-key="news-default" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, transparent 50%)', border: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #EF4444', borderRadius: '8px', overflow: 'visible' }}>
                {/* Header */}
                <div data-tooltip-key="highlight-header" style={{ ...getHighlightStyle('highlight-header'), padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', borderRadius: '6px', background: phase === 'highlight-header' ? '#0d0d12' : 'transparent' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{FULL_NEWS_DATA.time}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
                  <span style={{ color: '#00E5FF', fontWeight: 700, fontSize: '0.75rem' }}>{FULL_NEWS_DATA.source}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>speed= {FULL_NEWS_DATA.speed}</span>
                  <span style={{ background: getCategoryColors(FULL_NEWS_DATA.category).bg, color: getCategoryColors(FULL_NEWS_DATA.category).text, padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>{getCategoryLabel(FULL_NEWS_DATA.category)}</span>
                </div>

                {/* Title */}
                <div data-tooltip-key="highlight-title" style={{ ...getHighlightStyle('highlight-title'), padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', background: phase === 'highlight-title' ? '#0d0d12' : 'transparent' }}>
                  <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.4, margin: 0 }}>{FULL_NEWS_DATA.title}</p>
                </div>

                {/* Analysis Section */}
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '14px' }}>
                  {/* Signal Row */}
                  <div data-tooltip-key="highlight-signal" style={{ ...getHighlightStyle('highlight-signal'), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', padding: '8px', borderRadius: '6px', background: phase === 'highlight-signal' ? '#0d0d12' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <TrendingUp style={{ width: 22, height: 22, color: '#22C55E' }} />
                      <span style={{ color: '#22C55E', fontSize: '0.9rem', fontWeight: 700 }}>Bullish News</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginLeft: '8px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', textTransform: 'uppercase' }}>CONVICTION</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[...Array(10)].map((_, i) => <div key={i} style={{ width: '5px', height: '14px', borderRadius: '1px', background: i < FULL_NEWS_DATA.conviction ? '#22C55E' : 'rgba(255,255,255,0.1)' }} />)}
                        </div>
                        <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 700 }}>{FULL_NEWS_DATA.conviction}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(78,205,196,0.15)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', color: '#4ECDC4', fontWeight: 600 }}><Timer style={{ width: 10, height: 10 }} />{FULL_NEWS_DATA.tradeType}</span>
                    </div>
                  </div>

                  {/* AI Agent Box */}
                  <div data-tooltip-key="highlight-ai" style={{ ...getHighlightStyle('highlight-ai'), background: phase === 'highlight-ai' ? '#0d0d12' : 'linear-gradient(135deg, rgba(0,229,255,0.06) 0%, rgba(0,184,212,0.02) 100%)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '6px', padding: '12px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <Brain style={{ width: 14, height: 14, color: '#00E5FF' }} />
                      <span style={{ color: '#00E5FF', fontSize: '0.75rem', fontWeight: 700 }}>FIBALGO AGENT</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', lineHeight: 1.5, margin: 0 }}>{FULL_NEWS_DATA.aiAnalysis.slice(0, 280)}...</p>
                  </div>

                  {/* Position Card */}
                  <div data-tooltip-key="highlight-position" style={{ ...getHighlightStyle('highlight-position'), background: phase === 'highlight-position' ? '#0d0d12' : 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.25)', borderRadius: '6px', padding: '10px 12px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp style={{ width: 18, height: 18, color: '#00E676' }} />
                      <span style={{ color: '#00E676', fontWeight: 700, fontSize: '0.85rem' }}>{FULL_NEWS_DATA.position.direction} {FULL_NEWS_DATA.position.asset}</span>
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>{FULL_NEWS_DATA.position.confidence}%</span>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div data-tooltip-key="highlight-metrics" style={{ ...getHighlightStyle('highlight-metrics'), display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px', padding: '4px', borderRadius: '6px', background: phase === 'highlight-metrics' ? '#0d0d12' : 'transparent' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', textTransform: 'uppercase', marginBottom: '6px' }}>MARKET IMPACT</div>
                      <span style={{ color: '#F59E0B', fontSize: '0.65rem', fontWeight: 600 }}>{FULL_NEWS_DATA.marketImpact}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', textTransform: 'uppercase', marginBottom: '6px' }}>RISK MODE</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                        <AlertTriangle style={{ width: 12, height: 12, color: '#F59E0B' }} />
                        <span style={{ color: '#F59E0B', fontSize: '0.65rem', fontWeight: 600 }}>{FULL_NEWS_DATA.riskMode}</span>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', textTransform: 'uppercase', marginBottom: '6px' }}>INFO QUALITY</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                        <CheckCircle style={{ width: 12, height: 12, color: '#22C55E' }} />
                        <span style={{ color: '#22C55E', fontSize: '0.65rem', fontWeight: 600 }}>{FULL_NEWS_DATA.infoQuality}</span>
                      </div>
                    </div>
                  </div>

                  {/* Full Analysis Button */}
                  <button data-tooltip-key="highlight-fullbtn" style={{ ...getHighlightStyle('highlight-fullbtn'), display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', background: phase === 'highlight-fullbtn' ? '#0d0d12' : 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '4px', marginBottom: '10px' }}>
                    {isFullAnalysisOpen ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                    {isFullAnalysisOpen ? 'Hide Analysis' : 'Full Analysis'}
                  </button>

                  {/* Expanded Full Analysis */}
                  {isFullAnalysisOpen && (
                    <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div data-tooltip-key="highlight-news-analysis" style={{ ...getHighlightStyle('highlight-news-analysis'), marginBottom: '14px', padding: '10px', borderRadius: '6px', background: phase === 'highlight-news-analysis' ? '#0d0d12' : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                          <Lightbulb style={{ width: 12, height: 12, color: '#F59E0B' }} />
                          <span style={{ color: '#F59E0B', fontSize: '0.7rem', fontWeight: 600 }}>News Analysis</span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', lineHeight: 1.5, margin: 0 }}>{FULL_NEWS_DATA.newsAnalysis}</p>
                      </div>

                      <div data-tooltip-key="highlight-key-risk" style={{ ...getHighlightStyle('highlight-key-risk'), marginBottom: '14px', padding: '10px', borderRadius: '6px', background: phase === 'highlight-key-risk' ? '#0d0d12' : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                          <AlertTriangle style={{ width: 12, height: 12, color: '#EF4444' }} />
                          <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 600 }}>Key Risk</span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', lineHeight: 1.5, margin: 0 }}>{FULL_NEWS_DATA.keyRisk}</p>
                      </div>

                      <div data-tooltip-key="highlight-research" style={{ ...getHighlightStyle('highlight-research'), padding: '10px', borderRadius: '6px', background: phase === 'highlight-research' ? '#0d0d12' : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                          <Users style={{ width: 12, height: 12, color: '#00E5FF' }} />
                          <span style={{ color: '#00E5FF', fontSize: '0.7rem', fontWeight: 600 }}>Research Data</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {FULL_NEWS_DATA.researchQueries.map((query, i) => (
                            <div key={i} style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '4px', padding: '8px 10px' }}>
                              <span style={{ color: '#00E5FF', fontSize: '0.7rem' }}>{i + 1}. {query}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer - Asset Button */}
                <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button data-tooltip-key="highlight-asset-btn" style={{ ...getHighlightStyle('highlight-asset-btn'), background: phase === 'highlight-asset-btn' ? '#0d0d12' : 'rgba(0,230,118,0.08)', color: '#00E676', padding: '7px 14px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(0,230,118,0.25)', cursor: 'pointer' }}>
                    ▲ {FULL_NEWS_DATA.position.asset}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Chart */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', position: isChartPhase ? 'absolute' : 'relative', inset: isChartPhase ? 0 : 'auto', zIndex: isChartPhase ? 80 : 1, background: isChartPhase ? '#08080c' : 'transparent' }}>
        <div style={{ flex: 1, padding: '12px 16px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <BarChart3 size={14} style={{ color: 'rgba(0,245,255,0.7)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live Chart</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{chartSymbol}</span>
            {chartSymbol === 'XAUUSD' && <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f59e0b' }}>${goldCandles[goldCandles.length - 1]?.c.toFixed(2)}</span>}
            {chartSymbol === 'NASDAQ:META' && phase === 'chart-animate' && visibleMetaCandles.length > 0 && <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#22c55e' }}>${visibleMetaCandles[visibleMetaCandles.length - 1]?.c.toFixed(2)}</span>}
          </div>

          {phase === 'chart-loading' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 10 }}>
              <Loader2 style={{ width: 40, height: 40, color: '#00E5FF', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginTop: '12px' }}>Loading NASDAQ:META...</p>
            </div>
          )}

          <svg width="100%" height="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="xMidYMid meet">
            {[0, 1, 2, 3].map(i => {
              const y = CHART_PAD.top + (i / 3) * (CHART_H - CHART_PAD.top - CHART_PAD.bottom);
              const priceRange = chartSymbol === 'XAUUSD' ? goldRange : metaRange;
              const priceMax = chartSymbol === 'XAUUSD' ? goldMax : metaMax;
              const price = priceMax - (i / 3) * priceRange;
              return (
                <g key={i}>
                  <line x1={CHART_PAD.left} y1={y} x2={CHART_W - CHART_PAD.right} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <text x={CHART_W - CHART_PAD.right + 6} y={y + 3} fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">${price.toFixed(0)}</text>
                </g>
              );
            })}
            {chartSymbol === 'XAUUSD' && goldCandles.map((c, i) => {
              const x = CHART_PAD.left + (i + 0.5) * goldCandleWidth;
              const priceToY = (price: number) => CHART_PAD.top + ((goldMax - price) / goldRange) * (CHART_H - CHART_PAD.top - CHART_PAD.bottom);
              const yHigh = priceToY(c.h), yLow = priceToY(c.l), yOpen = priceToY(c.o), yClose = priceToY(c.c);
              const bullish = c.c >= c.o;
              const color = bullish ? '#22c55e' : '#ef4444';
              return (
                <g key={i}>
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" />
                  <rect x={x - goldCandleWidth * 0.3} y={Math.min(yOpen, yClose)} width={goldCandleWidth * 0.6} height={Math.max(2, Math.abs(yClose - yOpen))} fill={color} rx="1" />
                </g>
              );
            })}
            {chartSymbol === 'NASDAQ:META' && phase === 'chart-animate' && visibleMetaCandles.map((c, i) => {
              const x = CHART_PAD.left + (i + 0.5) * metaCandleWidth;
              const priceToY = (price: number) => CHART_PAD.top + ((metaMax - price) / metaRange) * (CHART_H - CHART_PAD.top - CHART_PAD.bottom);
              const yHigh = priceToY(c.h), yLow = priceToY(c.l), yOpen = priceToY(c.o), yClose = priceToY(c.c);
              const bullish = c.c >= c.o;
              const color = bullish ? '#22c55e' : '#ef4444';
              return (
                <g key={i}>
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.5" />
                  <rect x={x - metaCandleWidth * 0.35} y={Math.min(yOpen, yClose)} width={metaCandleWidth * 0.7} height={Math.max(2, Math.abs(yClose - yOpen))} fill={color} rx="1" />
                </g>
              );
            })}
          </svg>

          {phase === 'chart-animate' && (
            <div style={{ position: 'absolute', top: '60px', left: '30px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '12px 16px', opacity: candleProgress > 0.1 ? 1 : 0 }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>News Impact</div>
              <div style={{ fontSize: '0.9rem', color: '#22C55E', fontWeight: 700 }}>▲ BULLISH +{FULL_NEWS_DATA.priceMove[FULL_NEWS_DATA.priceMove.length - 1]}%</div>
            </div>
          )}
        </div>
      </div>

      </div>
      {/* Economic Calendar — Windows-style minimize/maximize; content fills when minimized */}
      <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)', overflow: 'hidden', transition: 'height 0.25s ease' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: calendarMinimized ? '8px 14px' : '10px 14px 0 14px',
            cursor: 'pointer',
            minHeight: '40px',
          }}
          onClick={() => calendarMinimized && setCalendarMinimized(false)}
        >
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase', textShadow: '0 0 6px rgba(255,255,255,0.08)' }}>Economic Calendar</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setCalendarMinimized(!calendarMinimized); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title={calendarMinimized ? 'Büyüt' : 'Aşağı al'}
            aria-label={calendarMinimized ? 'Büyüt' : 'Aşağı al'}
          >
            {calendarMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        {!calendarMinimized && (
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px 14px 14px 14px' }}>
            {CALENDAR_EVENTS.map((evt, i) => (
              <div key={i} style={{ flexShrink: 0, width: '170px', background: calendarHighlight >= i ? 'linear-gradient(180deg, rgba(239,68,68,0.08) 0%, rgba(0,0,0,0.3) 100%)' : 'rgba(255,255,255,0.02)', border: calendarHighlight >= i ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '8px 10px' }}>
                {evt.actual !== '—' && <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff', fontSize: '0.5rem', fontWeight: 700, padding: '2px 5px', borderRadius: '3px', marginBottom: '4px' }}>LIVE</span>}
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.58rem', marginBottom: '2px' }}>{evt.time}</div>
                <div style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600, marginBottom: '2px', lineHeight: 1.25 }}>{evt.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem', marginBottom: '5px' }}>{evt.country}</div>
                <div style={{ display: 'flex', gap: '6px', fontSize: '0.55rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Prev: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{evt.prev}</span></span>
                  <span style={{ color: 'rgba(0,245,255,0.6)' }}>Fcst: <span style={{ color: '#00F5FF' }}>{evt.forecast}</span></span>
                  <span style={{ color: 'rgba(34,197,94,0.7)' }}>Actual: <span style={{ color: evt.actual !== '—' ? '#22C55E' : 'rgba(255,255,255,0.3)', fontWeight: evt.actual !== '—' ? 700 : 400 }}>{evt.actual}</span></span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.52rem', fontWeight: 600, color: evt.impact === 'high' ? '#EF4444' : evt.impact === 'medium' ? '#F59E0B' : '#22C55E', textTransform: 'uppercase' }}>{evt.impact}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EVENT DEMO COMPONENT - Post-Event Card Style (matching screenshots)
// ═══════════════════════════════════════════════════════════════════

type EventPhase = 
  | 'terminal' | 'event-click' | 'event-expand'
  | 'highlight-header' | 'highlight-ai-analysis' | 'highlight-urgency'
  | 'highlight-scenarios' | 'highlight-bullish' | 'highlight-bearish'
  | 'highlight-alternatives' | 'highlight-implications' | 'highlight-summary'
  | 'highlight-live-event' | 'highlight-live-scenarios' | 'highlight-live-bullish' | 'highlight-live-bearish'
  | 'highlight-upcoming' | 'highlight-upcoming-scenarios' | 'highlight-upcoming-bullish' | 'highlight-upcoming-bearish';

function EventDemo({ isActive, isInView = false }: { isActive: boolean; isInView?: boolean }) {
  const [phase, setPhase] = useState<EventPhase>('terminal');
  const [goldCandles] = useState(() => generateGoldCandles(20, 2650));
  const [highlightScale, setHighlightScale] = useState(1);
  const [scrollY, setScrollY] = useState(0);
  const [eventHighlight, setEventHighlight] = useState(-1);
  const [calendarMinimized, setCalendarMinimized] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showLiveDetails, setShowLiveDetails] = useState(false);
  const [showUpcomingDetails, setShowUpcomingDetails] = useState(false);
  const [autoTooltip, setAutoTooltip] = useState<TooltipAnchor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);

  const isTerminalView = phase === 'terminal' || phase === 'event-click';
  const isExpanded = !isTerminalView;
  const isHighlighting = phase.startsWith('highlight-');
  const currentExplanation = EVENT_EXPLANATIONS[phase] || null;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  /** Vurgulanan öğeyi viewport ortasına getirir (ölçüme dayalı). Layout tamamlanana kadar birkaç frame bekler. */
  const scrollToCenter = useCallback((phaseId: string): Promise<void> => {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!scrollContentRef.current || !scrollContainerRef.current) {
              resolve();
              return;
            }
            const el = scrollContentRef.current.querySelector(`[data-scroll-to="${phaseId}"]`);
            if (!el) {
              resolve();
              return;
            }
            const contentRect = scrollContentRef.current.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const offsetInContent = elRect.top - contentRect.top;
            const viewportHeight = scrollContainerRef.current.offsetHeight;
            const center = viewportHeight / 2;
            const elHeight = (el as HTMLElement).offsetHeight;
            const targetScroll = offsetInContent - center + elHeight / 2;
            setScrollY(Math.max(0, Math.round(targetScroll)));
            resolve();
          });
        });
      });
    });
  }, []);

  const highlightWithZoom = useCallback(async (targetPhase: EventPhase, readTime: number = 2500) => {
    setPhase(targetPhase);
    setHighlightScale(1.02);
    await delay(150);
    setHighlightScale(1.04);
    await delay(readTime);
    setHighlightScale(1.02);
    await delay(150);
    setHighlightScale(1);
    await delay(200);
  }, []);

  useEffect(() => {
    if (!isActive || !isInView) {
      setPhase('terminal');
      setHighlightScale(1);
      setScrollY(0);
      setEventHighlight(-1);
      setShowDetails(false);
      setShowLiveDetails(false);
      setShowUpcomingDetails(false);
      setAutoTooltip(null);
      return;
    }

    let isCancelled = false;
    const safeDelay = (ms: number) => new Promise<void>(resolve => {
      const timer = setTimeout(() => { if (!isCancelled) resolve(); }, ms);
      if (isCancelled) clearTimeout(timer);
    });

    const runSequence = async () => {
      if (isCancelled) return;
      setPhase('terminal');
      setHighlightScale(1);
      setScrollY(0);
      setEventHighlight(-1);
      setShowDetails(false);
      setShowLiveDetails(false);
      setShowUpcomingDetails(false);

      await safeDelay(800);
      if (isCancelled) return;

      // Highlight bottom event cards
      for (let i = 0; i < CALENDAR_EVENTS.length; i++) {
        if (isCancelled) return;
        setEventHighlight(i);
        await safeDelay(400);
      }
      await safeDelay(600);
      if (isCancelled) return;

      // Click on first event
      setPhase('event-click');
      setEventHighlight(0);
      await safeDelay(500);
      if (isCancelled) return;

      // Expand to Post-Event Card
      setPhase('event-expand');
      await safeDelay(700);
      if (isCancelled) return;

      // Highlight sections
      await highlightWithZoom('highlight-header', 3000);
      if (isCancelled) return;
      await highlightWithZoom('highlight-ai-analysis', 3000);
      if (isCancelled) return;
      await highlightWithZoom('highlight-urgency', 2500);
      if (isCancelled) return;
      
      // Click Show Full Analysis — sonra her blok ortada vurgulanacak
      setShowDetails(true);
      await safeDelay(700);
      if (isCancelled) return;

      await scrollToCenter('highlight-scenarios');
      await safeDelay(900);
      if (isCancelled) return;
      await highlightWithZoom('highlight-scenarios', 3500);
      if (isCancelled) return;

      await scrollToCenter('highlight-bullish');
      await safeDelay(900);
      if (isCancelled) return;
      await highlightWithZoom('highlight-bullish', 3500);
      if (isCancelled) return;

      await scrollToCenter('highlight-bearish');
      await safeDelay(900);
      if (isCancelled) return;
      await highlightWithZoom('highlight-bearish', 3500);
      if (isCancelled) return;

      await scrollToCenter('highlight-alternatives');
      await safeDelay(900);
      if (isCancelled) return;
      await highlightWithZoom('highlight-alternatives', 3000);
      if (isCancelled) return;

      await scrollToCenter('highlight-implications');
      await safeDelay(900);
      if (isCancelled) return;
      await highlightWithZoom('highlight-implications', 3000);
      if (isCancelled) return;

      await scrollToCenter('highlight-summary');
      await safeDelay(900);
      if (isCancelled) return;
      await highlightWithZoom('highlight-summary', 3000);
      if (isCancelled) return;
      
      // Live Event: her vurguyu viewport ortasına getir (ölçüme dayalı scrollToCenter)
      await scrollToCenter('highlight-live-event');
      await safeDelay(900);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-live-event', 2500);
      if (isCancelled) return;
      
      setShowLiveDetails(true);
      await safeDelay(700);
      if (isCancelled) return;
      
      await scrollToCenter('highlight-live-scenarios');
      await safeDelay(900);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-live-scenarios', 2500);
      if (isCancelled) return;
      
      await scrollToCenter('highlight-live-bullish');
      await safeDelay(900);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-live-bullish', 2500);
      if (isCancelled) return;
      
      await scrollToCenter('highlight-live-bearish');
      await safeDelay(900);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-live-bearish', 2500);
      if (isCancelled) return;
      
      await scrollToCenter('highlight-upcoming');
      await safeDelay(900);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-upcoming', 2500);
      if (isCancelled) return;
      
      setShowUpcomingDetails(true);
      await safeDelay(700);
      if (isCancelled) return;
      
      await scrollToCenter('highlight-upcoming-scenarios');
      await safeDelay(900);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-upcoming-scenarios', 2500);
      if (isCancelled) return;
      
      await scrollToCenter('highlight-upcoming-bullish');
      await safeDelay(900);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-upcoming-bullish', 2500);
      if (isCancelled) return;
      
      await scrollToCenter('highlight-upcoming-bearish');
      await safeDelay(900);
      if (isCancelled) return;
      
      await highlightWithZoom('highlight-upcoming-bearish', 2500);
      if (isCancelled) return;
      
      await safeDelay(1500);
      if (isCancelled) return;
      
      // Return to terminal
      setPhase('terminal');
      setScrollY(0);
      setShowDetails(false);
      setShowLiveDetails(false);
      setShowUpcomingDetails(false);
    };

    runSequence();
    const interval = setInterval(runSequence, 100000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isActive, isInView, highlightWithZoom, scrollToCenter]);

  useEffect(() => {
    if (!currentExplanation) {
      setAutoTooltip(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const key = phase.startsWith('highlight-') ? phase : 'event-default';
    const el = container.querySelector<HTMLElement>(`[data-tooltip-key="${key}"]`);
    if (!el) {
      setAutoTooltip(null);
      return;
    }
    setAutoTooltip(getTooltipAnchor(el, container, key));
  }, [currentExplanation, phase]);

  // Chart calculations
  const goldPrices = goldCandles.flatMap(c => [c.h, c.l]);
  const goldMin = Math.min(...goldPrices) - 5;
  const goldMax = Math.max(...goldPrices) + 5;
  const goldRange = goldMax - goldMin || 1;
  const goldCandleWidth = (CHART_W - CHART_PAD.left - CHART_PAD.right) / goldCandles.length;

  const getHighlightStyle = (targetPhase: EventPhase) => {
    const isActivePhase = phase === targetPhase;
    return {
      transform: isActivePhase ? `scale(${highlightScale})` : 'scale(1)',
      boxShadow: isActivePhase ? '0 0 0 2px rgba(255,255,255,0.9), 0 0 30px rgba(255,255,255,0.3)' : 'none',
      transition: 'transform 0.2s ease, box-shadow 0.3s ease, opacity 0.3s ease',
      position: 'relative' as const,
      zIndex: isActivePhase ? 100 : 1,
      opacity: isHighlighting && !isActivePhase ? 0.7 : 1,
    };
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '540px', position: 'relative', minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '340px 1fr', gridTemplateRows: '1fr', position: 'relative' }}>
      {/* Explanation Panel */}
      {currentExplanation && autoTooltip && (
        <div
          style={{
            position: 'absolute',
            ...getAutoTooltipStyle(autoTooltip),
            background: '#0a0a0f',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            padding: '16px',
            zIndex: 200,
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info style={{ width: 16, height: 16, color: '#fff' }} />
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{currentExplanation.title}</h4>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '2px 0 0 0' }}>{currentExplanation.description}</p>
            </div>
          </div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 0 12px 0' }} />
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{currentExplanation.detail}</p>
        </div>
      )}

      {/* Hafif arka plan karartması — içerik okunabilir kalsın */}
      {isHighlighting && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 50, pointerEvents: 'none' }} />}

      {/* Left Panel: News Feed or Expanded Event */}
      <div style={{ 
        borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        position: isExpanded ? 'absolute' : 'relative', inset: isExpanded ? 0 : 'auto',
        zIndex: isExpanded ? 70 : (isHighlighting ? 60 : 1), background: isExpanded ? '#08080c' : 'transparent',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>TERMINAL</span>
        </div>

        {/* Terminal View: Compact News Feed */}
        {isTerminalView && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {NEWS_FEED.map((news, i) => (
              <div key={i} style={{
                padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'transparent',
                borderLeft: news.isMain ? '3px solid #EF4444' : '3px solid transparent',
                transition: 'all 0.3s ease', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem' }}>{news.time}</span>
                  <span style={{ color: '#00E5FF', fontSize: '0.6rem', fontWeight: 600 }}>{news.source}</span>
                  <span style={{ background: getCategoryColors(news.category).bg, color: getCategoryColors(news.category).text, padding: '1px 5px', borderRadius: '3px', fontSize: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>{getCategoryLabel(news.category)}</span>
                  {news.isBreaking && (
                    <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '1px 5px', borderRadius: '3px', fontSize: '0.45rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#EF4444' }} />BREAKING
                    </span>
                  )}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.72rem', fontWeight: 600, margin: '0 0 6px 0', lineHeight: 1.3 }}>{news.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: news.sentiment === 'bullish' ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)', border: `1px solid ${news.sentiment === 'bullish' ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)'}`, padding: '2px 6px', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 600, color: news.sentiment === 'bullish' ? '#22C55E' : '#9CA3AF', textTransform: 'uppercase' }}>
                    {news.sentiment === 'bullish' && <TrendingUp size={9} />}
                    {news.sentiment.toUpperCase()}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '1px' }}>
                      {[...Array(10)].map((_, j) => (
                        <div key={j} style={{ width: '3px', height: '8px', borderRadius: '1px', background: j < news.conviction ? '#22C55E' : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                    <span style={{ color: '#22C55E', fontSize: '0.55rem', fontWeight: 600 }}>{news.conviction}/10</span>
                  </div>
                  <span style={{ marginLeft: 'auto', background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.25)', color: '#00E676', padding: '2px 6px', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 600 }}>{news.assets[0]}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expanded Event View - Post-Event Card Style */}
        {isExpanded && (
          <div ref={scrollContainerRef} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div ref={scrollContentRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(-${scrollY}px)`, transition: 'transform 0.8s ease-out', padding: '16px' }}>
              <div data-tooltip-key="event-default" style={{ background: 'linear-gradient(180deg, rgba(34,197,94,0.08) 0%, #0A0A0F 30%)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', overflow: 'visible' }}>
                
                {/* Header - Post Event Style with Icon */}
                <div data-tooltip-key="highlight-header" style={{ ...getHighlightStyle('highlight-header'), padding: '16px', borderRadius: phase === 'highlight-header' ? '12px' : '12px 12px 0 0', background: phase === 'highlight-header' ? 'rgba(34,197,94,0.1)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    {/* Green Icon */}
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <TrendingUp size={24} style={{ color: '#22C55E' }} />
                    </div>
                    {/* Event Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 500 }}>{FULL_EVENT_DATA.country}</span>
                        <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{FULL_EVENT_DATA.name}</span>
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#22C55E', padding: '4px 10px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>
                        <TrendingUp size={12} />{FULL_EVENT_DATA.outcome}
                      </span>
                    </div>
                    {/* Just Released Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 12px', borderRadius: '20px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.5s infinite' }} />
                      <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 700 }}>JUST RELEASED • {FULL_EVENT_DATA.releasedAgo}</span>
                    </div>
                  </div>
                  
                  {/* Actual / Forecast / Previous Boxes */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <div style={{ flex: 1, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '4px' }}>ACTUAL</div>
                      <div style={{ color: '#22C55E', fontSize: '1.5rem', fontWeight: 700 }}>{FULL_EVENT_DATA.actual}</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '4px' }}>FORECAST</div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.5rem', fontWeight: 700 }}>{FULL_EVENT_DATA.forecast}</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '4px' }}>PREVIOUS</div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.5rem', fontWeight: 700 }}>{FULL_EVENT_DATA.previous}</div>
                    </div>
                  </div>
                </div>

                {/* AI Instant Analysis Box */}
                <div data-tooltip-key="highlight-ai-analysis" style={{ ...getHighlightStyle('highlight-ai-analysis'), margin: '0 16px', padding: '14px', background: phase === 'highlight-ai-analysis' ? 'rgba(0,128,128,0.2)' : 'linear-gradient(135deg, rgba(0,128,128,0.15) 0%, rgba(0,80,80,0.1) 100%)', border: '1px solid rgba(0,180,180,0.3)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Brain size={14} style={{ color: '#00CED1' }} />
                    <span style={{ color: '#00CED1', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px' }}>AI INSTANT ANALYSIS</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>{FULL_EVENT_DATA.aiInstantAnalysis}</p>
                </div>

                {/* Urgency + Market Impact Row */}
                <div data-tooltip-key="highlight-urgency" style={{ ...getHighlightStyle('highlight-urgency'), padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '24px', borderRadius: '6px', background: phase === 'highlight-urgency' ? '#0d0d12' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={14} style={{ color: '#F59E0B' }} />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>Urgency</span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[...Array(10)].map((_, j) => (
                        <div key={j} style={{ width: '6px', height: '14px', borderRadius: '2px', background: j < FULL_EVENT_DATA.urgency ? '#F59E0B' : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>Market Impact</span>
                    <span style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{FULL_EVENT_DATA.marketImpact}/10</span>
                  </div>
                </div>

                {/* Show Full Analysis Button */}
                <button style={{ width: 'calc(100% - 32px)', margin: '0 16px 16px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showDetails ? 'Hide Details' : 'Show Full Analysis'}
                </button>

                {/* Full Analysis Content */}
                {showDetails && (
                  <>
                    {/* SCENARIO ANALYSIS */}
                    <div data-scroll-to="highlight-scenarios" data-tooltip-key="highlight-scenarios" style={{ ...getHighlightStyle('highlight-scenarios'), padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', background: phase === 'highlight-scenarios' ? '#0d0d12' : 'transparent' }}>
                      <div style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.5px' }}>SCENARIO ANALYSIS</div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {FULL_EVENT_DATA.scenarios.map((scenario, i) => (
                          <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px 8px', borderTop: `3px solid ${scenario.color}` }}>
                            <div style={{ color: scenario.color, fontSize: '0.6rem', fontWeight: 700, textAlign: 'center' }}>{scenario.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* TRADE SETUPS */}
                    <div style={{ padding: '12px 16px 0' }}>
                      <div style={{ color: '#22C55E', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>TRADE SETUPS</div>
                    </div>

                    {/* BULLISH */}
                    <div data-scroll-to="highlight-bullish" data-tooltip-key="highlight-bullish" style={{ ...getHighlightStyle('highlight-bullish'), margin: '12px 16px', padding: '14px', background: phase === 'highlight-bullish' ? '#0d0d12' : 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />
                          <span style={{ color: '#22C55E', fontSize: '0.8rem', fontWeight: 700 }}>BULLISH</span>
                        </div>
                        <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 600 }}>R/R {FULL_EVENT_DATA.tradeSetups.bullish.rr}</span>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Trigger: </span>
                        <span style={{ color: '#fff', fontSize: '0.75rem' }}>{FULL_EVENT_DATA.tradeSetups.bullish.trigger}</span>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Entry: </span>
                        <span style={{ color: '#fff', fontSize: '0.75rem' }}>{FULL_EVENT_DATA.tradeSetups.bullish.entry}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}> | </span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Stop: </span>
                        <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{FULL_EVENT_DATA.tradeSetups.bullish.stop}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}> | </span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Target: </span>
                        <span style={{ color: '#22C55E', fontSize: '0.75rem' }}>{FULL_EVENT_DATA.tradeSetups.bullish.target}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={12} style={{ color: '#F59E0B' }} />
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontStyle: 'italic' }}>{FULL_EVENT_DATA.tradeSetups.bullish.invalidation}</span>
                      </div>
                    </div>

                    {/* BEARISH */}
                    <div data-scroll-to="highlight-bearish" data-tooltip-key="highlight-bearish" style={{ ...getHighlightStyle('highlight-bearish'), margin: '0 16px 12px', padding: '14px', background: phase === 'highlight-bearish' ? '#0d0d12' : 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
                          <span style={{ color: '#EF4444', fontSize: '0.8rem', fontWeight: 700 }}>BEARISH</span>
                        </div>
                        <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 600 }}>R/R {FULL_EVENT_DATA.tradeSetups.bearish.rr}</span>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Trigger: </span>
                        <span style={{ color: '#fff', fontSize: '0.75rem' }}>{FULL_EVENT_DATA.tradeSetups.bearish.trigger}</span>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Entry: </span>
                        <span style={{ color: '#fff', fontSize: '0.75rem' }}>{FULL_EVENT_DATA.tradeSetups.bearish.entry}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}> | </span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Stop: </span>
                        <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{FULL_EVENT_DATA.tradeSetups.bearish.stop}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}> | </span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Target: </span>
                        <span style={{ color: '#22C55E', fontSize: '0.75rem' }}>{FULL_EVENT_DATA.tradeSetups.bearish.target}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={12} style={{ color: '#F59E0B' }} />
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontStyle: 'italic' }}>{FULL_EVENT_DATA.tradeSetups.bearish.invalidation}</span>
                      </div>
                    </div>

                    {/* ALTERNATIVE TRADES */}
                    <div data-scroll-to="highlight-alternatives" data-tooltip-key="highlight-alternatives" style={{ ...getHighlightStyle('highlight-alternatives'), padding: '12px 16px', borderRadius: '6px', background: phase === 'highlight-alternatives' ? '#0d0d12' : 'transparent' }}>
                      <div style={{ color: '#A78BFA', fontSize: '0.75rem', fontWeight: 700, marginBottom: '10px' }}>ALTERNATIVE TRADES</div>
                      <div style={{ display: 'flex', gap: '24px' }}>
                        <div>
                          <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 600 }}>IF BEAT: </span>
                          {FULL_EVENT_DATA.alternativeTrades.ifBeat.map((trade, i) => (
                            <span key={i} style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 600, marginLeft: '8px' }}>{trade}</span>
                          ))}
                        </div>
                        <div>
                          <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 600 }}>IF MISS: </span>
                          {FULL_EVENT_DATA.alternativeTrades.ifMiss.map((trade, i) => (
                            <span key={i} style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 600, marginLeft: '8px' }}>{trade}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* MARKET IMPLICATIONS */}
                    <div data-scroll-to="highlight-implications" data-tooltip-key="highlight-implications" style={{ ...getHighlightStyle('highlight-implications'), padding: '12px 16px', borderRadius: '6px', background: phase === 'highlight-implications' ? '#0d0d12' : 'transparent' }}>
                      <div style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 700, marginBottom: '10px' }}>MARKET IMPLICATIONS</div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {FULL_EVENT_DATA.marketImplications.map((impl, i) => (
                          <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px' }}>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem', marginBottom: '4px' }}>{impl.asset}</div>
                            <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>{impl.impact}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SUMMARY */}
                    <div data-scroll-to="highlight-summary" data-tooltip-key="highlight-summary" style={{ ...getHighlightStyle('highlight-summary'), margin: '12px 16px 16px', padding: '14px', background: phase === 'highlight-summary' ? 'rgba(139,92,246,0.15)' : 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.05) 100%)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px' }}>
                      <div style={{ color: '#A78BFA', fontSize: '0.7rem', fontWeight: 700, marginBottom: '8px' }}>SUMMARY</div>
                      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{FULL_EVENT_DATA.summary}</p>
                    </div>
                  </>
                )}
              </div>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* LIVE NOW — AWAITING DATA Section */}
              {/* ════════════════════════════════════════════════════════════ */}
              <div data-scroll-to="highlight-live-event" data-tooltip-key="highlight-live-event" style={{ ...getHighlightStyle('highlight-live-event'), marginTop: '24px', background: '#0A0A0F', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '12px', overflow: 'visible' }}>
                {/* Section Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>LIVE NOW — AWAITING DATA</span>
                  <span style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', padding: '3px 10px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>DEMO</span>
                </div>
                
                {/* Live Event Card */}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 500 }}>{LIVE_EVENT_DATA.country}</span>
                        <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{LIVE_EVENT_DATA.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Forecast: <span style={{ color: '#00F5FF' }}>{LIVE_EVENT_DATA.forecast}</span></span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>Previous: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{LIVE_EVENT_DATA.previous}</span></span>
                        <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#F59E0B', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>TIER {LIVE_EVENT_DATA.tier}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>Conviction</span>
                          <span style={{ color: '#F59E0B', fontSize: '0.7rem', fontWeight: 600 }}>{LIVE_EVENT_DATA.conviction}/10</span>
                        </div>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', margin: 0 }}>{LIVE_EVENT_DATA.description}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '6px 12px', borderRadius: '20px', flexShrink: 0 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', animation: 'pulse 1.5s infinite' }} />
                      <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 700 }}>LIVE — DATA IN {LIVE_EVENT_DATA.minutesUntil} MIN</span>
                    </div>
                  </div>
                  
                  {/* Show scenarios button */}
                  <button style={{ marginTop: '12px', padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {showLiveDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showLiveDetails ? 'Hide scenarios & trade setup' : 'Show scenarios & trade setup'}
                  </button>

                  {/* Live Event Details */}
                  {showLiveDetails && (
                    <>
                      {/* SCENARIO ANALYSIS */}
                      <div data-scroll-to="highlight-live-scenarios" data-tooltip-key="highlight-live-scenarios" style={{ ...getHighlightStyle('highlight-live-scenarios'), marginTop: '16px', padding: '14px', background: phase === 'highlight-live-scenarios' ? '#0d0d12' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                        <div style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px' }}>SCENARIO ANALYSIS</div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {LIVE_EVENT_DATA.scenarios.map((scenario, i) => (
                            <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px 8px', borderTop: `3px solid ${scenario.color}` }}>
                              <div style={{ color: scenario.color, fontSize: '0.6rem', fontWeight: 700, textAlign: 'center' }}>{scenario.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* TRADE SETUPS */}
                      <div style={{ marginTop: '12px', color: '#22C55E', fontSize: '0.75rem', fontWeight: 700 }}>TRADE SETUPS</div>

                      {/* BULLISH */}
                      <div data-scroll-to="highlight-live-bullish" data-tooltip-key="highlight-live-bullish" style={{ ...getHighlightStyle('highlight-live-bullish'), marginTop: '10px', padding: '14px', background: phase === 'highlight-live-bullish' ? '#0d0d12' : 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />
                            <span style={{ color: '#22C55E', fontSize: '0.8rem', fontWeight: 700 }}>BULLISH</span>
                          </div>
                          <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 600 }}>R/R {LIVE_EVENT_DATA.tradeSetups.bullish.rr}</span>
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Trigger: </span>
                          <span style={{ color: '#fff', fontSize: '0.75rem' }}>{LIVE_EVENT_DATA.tradeSetups.bullish.trigger}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Entry: </span><span style={{ color: '#fff' }}>{LIVE_EVENT_DATA.tradeSetups.bullish.entry}</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>|</span>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Stop: </span><span style={{ color: '#EF4444' }}>{LIVE_EVENT_DATA.tradeSetups.bullish.stop}</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>|</span>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Target: </span><span style={{ color: '#22C55E' }}>{LIVE_EVENT_DATA.tradeSetups.bullish.target}</span>
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={11} style={{ color: '#F59E0B' }} />
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontStyle: 'italic' }}>{LIVE_EVENT_DATA.tradeSetups.bullish.invalidation}</span>
                        </div>
                      </div>

                      {/* BEARISH */}
                      <div data-scroll-to="highlight-live-bearish" data-tooltip-key="highlight-live-bearish" style={{ ...getHighlightStyle('highlight-live-bearish'), marginTop: '10px', padding: '14px', background: phase === 'highlight-live-bearish' ? '#0d0d12' : 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
                            <span style={{ color: '#EF4444', fontSize: '0.8rem', fontWeight: 700 }}>BEARISH</span>
                          </div>
                          <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 600 }}>R/R {LIVE_EVENT_DATA.tradeSetups.bearish.rr}</span>
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Trigger: </span>
                          <span style={{ color: '#fff', fontSize: '0.75rem' }}>{LIVE_EVENT_DATA.tradeSetups.bearish.trigger}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Entry: </span><span style={{ color: '#fff' }}>{LIVE_EVENT_DATA.tradeSetups.bearish.entry}</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>|</span>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Stop: </span><span style={{ color: '#EF4444' }}>{LIVE_EVENT_DATA.tradeSetups.bearish.stop}</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>|</span>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Target: </span><span style={{ color: '#22C55E' }}>{LIVE_EVENT_DATA.tradeSetups.bearish.target}</span>
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={11} style={{ color: '#F59E0B' }} />
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontStyle: 'italic' }}>{LIVE_EVENT_DATA.tradeSetups.bearish.invalidation}</span>
                        </div>
                      </div>

                      {/* ALTERNATIVE TRADES */}
                      <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                        <div style={{ color: '#A78BFA', fontSize: '0.7rem', fontWeight: 700, marginBottom: '8px' }}>ALTERNATIVE TRADES</div>
                        <div style={{ display: 'flex', gap: '20px' }}>
                          <div>
                            <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 600 }}>IF BEAT: </span>
                            {LIVE_EVENT_DATA.alternativeTrades.ifBeat.map((t, i) => <span key={i} style={{ color: '#22C55E', fontSize: '0.7rem', marginLeft: '6px' }}>{t}</span>)}
                          </div>
                          <div>
                            <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 600 }}>IF MISS: </span>
                            {LIVE_EVENT_DATA.alternativeTrades.ifMiss.map((t, i) => <span key={i} style={{ color: '#EF4444', fontSize: '0.7rem', marginLeft: '6px' }}>{t}</span>)}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ════════════════════════════════════════════════════════════ */}
              {/* UPCOMING HIGH-IMPACT EVENTS Section */}
              {/* ════════════════════════════════════════════════════════════ */}
              <div data-scroll-to="highlight-upcoming" data-tooltip-key="highlight-upcoming" style={{ ...getHighlightStyle('highlight-upcoming'), marginTop: '24px', marginBottom: '20px' }}>
                {/* Section Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Target size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>UPCOMING HIGH-IMPACT EVENTS</span>
                  <span style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '3px 10px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>DEMO</span>
                </div>
                
                {/* Upcoming Event Card */}
                <div style={{ background: '#0A0A0F', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 500 }}>{UPCOMING_EVENTS_DATA.country}</span>
                        <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{UPCOMING_EVENTS_DATA.name}</span>
                        <span style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>TIER {UPCOMING_EVENTS_DATA.tier}</span>
                        {UPCOMING_EVENTS_DATA.aiReady && (
                          <span style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)', color: '#00F5FF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Brain size={10} />AI READY
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <Clock size={13} style={{ color: '#F59E0B' }} />
                        <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 600 }}>{UPCOMING_EVENTS_DATA.hoursUntil} hours until release</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>Conviction</span>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {[...Array(10)].map((_, j) => (
                              <div key={j} style={{ width: '5px', height: '12px', borderRadius: '1px', background: j < UPCOMING_EVENTS_DATA.conviction ? '#F59E0B' : 'rgba(255,255,255,0.1)' }} />
                            ))}
                          </div>
                          <span style={{ color: '#F59E0B', fontSize: '0.7rem', fontWeight: 600 }}>{UPCOMING_EVENTS_DATA.conviction}/10</span>
                        </div>
                        <span style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)', color: '#00F5FF', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Target size={11} />{UPCOMING_EVENTS_DATA.strategy}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem' }}>Expected</div>
                      <div style={{ color: '#00F5FF', fontSize: '1.25rem', fontWeight: 700 }}>{UPCOMING_EVENTS_DATA.expected}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>prev: {UPCOMING_EVENTS_DATA.previous}</div>
                    </div>
                  </div>

                  {/* Show scenarios button */}
                  <button style={{ marginTop: '12px', padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {showUpcomingDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showUpcomingDetails ? 'Hide scenarios & trade setup' : 'Show scenarios & trade setup'}
                  </button>

                  {/* Upcoming Event Details */}
                  {showUpcomingDetails && (
                    <>
                      {/* SCENARIO ANALYSIS */}
                      <div data-scroll-to="highlight-upcoming-scenarios" data-tooltip-key="highlight-upcoming-scenarios" style={{ ...getHighlightStyle('highlight-upcoming-scenarios'), marginTop: '16px', padding: '14px', background: phase === 'highlight-upcoming-scenarios' ? '#0d0d12' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                        <div style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 700, marginBottom: '12px' }}>SCENARIO ANALYSIS</div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {UPCOMING_EVENTS_DATA.scenarios.map((scenario, i) => (
                            <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px 6px', borderTop: `3px solid ${scenario.color}` }}>
                              <div style={{ color: scenario.color, fontSize: '0.55rem', fontWeight: 700, textAlign: 'center', marginBottom: '2px' }}>{scenario.label}</div>
                              {scenario.description && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.5rem', textAlign: 'center' }}>{scenario.description}</div>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* TRADE SETUPS */}
                      <div style={{ marginTop: '12px', color: '#22C55E', fontSize: '0.75rem', fontWeight: 700 }}>TRADE SETUPS</div>

                      {/* BULLISH */}
                      <div data-scroll-to="highlight-upcoming-bullish" data-tooltip-key="highlight-upcoming-bullish" style={{ ...getHighlightStyle('highlight-upcoming-bullish'), marginTop: '10px', padding: '14px', background: phase === 'highlight-upcoming-bullish' ? '#0d0d12' : 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />
                            <span style={{ color: '#22C55E', fontSize: '0.8rem', fontWeight: 700 }}>BULLISH</span>
                          </div>
                          <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 600 }}>R/R {UPCOMING_EVENTS_DATA.tradeSetups.bullish.rr}</span>
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Trigger: </span>
                          <span style={{ color: '#fff', fontSize: '0.75rem' }}>{UPCOMING_EVENTS_DATA.tradeSetups.bullish.trigger}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Entry: </span><span style={{ color: '#fff' }}>{UPCOMING_EVENTS_DATA.tradeSetups.bullish.entry}</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>|</span>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Stop: </span><span style={{ color: '#EF4444' }}>{UPCOMING_EVENTS_DATA.tradeSetups.bullish.stop}</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>|</span>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Target: </span><span style={{ color: '#22C55E' }}>{UPCOMING_EVENTS_DATA.tradeSetups.bullish.target}</span>
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={11} style={{ color: '#F59E0B' }} />
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontStyle: 'italic' }}>{UPCOMING_EVENTS_DATA.tradeSetups.bullish.invalidation}</span>
                        </div>
                      </div>

                      {/* BEARISH */}
                      <div data-scroll-to="highlight-upcoming-bearish" data-tooltip-key="highlight-upcoming-bearish" style={{ ...getHighlightStyle('highlight-upcoming-bearish'), marginTop: '10px', padding: '14px', background: phase === 'highlight-upcoming-bearish' ? '#0d0d12' : 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
                            <span style={{ color: '#EF4444', fontSize: '0.8rem', fontWeight: 700 }}>BEARISH</span>
                          </div>
                          <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 600 }}>R/R {UPCOMING_EVENTS_DATA.tradeSetups.bearish.rr}</span>
                        </div>
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Trigger: </span>
                          <span style={{ color: '#fff', fontSize: '0.75rem' }}>{UPCOMING_EVENTS_DATA.tradeSetups.bearish.trigger}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Entry: </span><span style={{ color: '#fff' }}>{UPCOMING_EVENTS_DATA.tradeSetups.bearish.entry}</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>|</span>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Stop: </span><span style={{ color: '#EF4444' }}>{UPCOMING_EVENTS_DATA.tradeSetups.bearish.stop}</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>|</span>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Target: </span><span style={{ color: '#22C55E' }}>{UPCOMING_EVENTS_DATA.tradeSetups.bearish.target}</span>
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={11} style={{ color: '#F59E0B' }} />
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontStyle: 'italic' }}>{UPCOMING_EVENTS_DATA.tradeSetups.bearish.invalidation}</span>
                        </div>
                      </div>

                      {/* ALTERNATIVE TRADES */}
                      <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                        <div style={{ color: '#A78BFA', fontSize: '0.7rem', fontWeight: 700, marginBottom: '8px' }}>ALTERNATIVE TRADES</div>
                        <div style={{ display: 'flex', gap: '20px' }}>
                          <div>
                            <span style={{ color: '#22C55E', fontSize: '0.7rem', fontWeight: 600 }}>IF BEAT: </span>
                            {UPCOMING_EVENTS_DATA.alternativeTrades.ifBeat.map((t, i) => <span key={i} style={{ color: '#22C55E', fontSize: '0.7rem', marginLeft: '6px' }}>{t}</span>)}
                          </div>
                          <div>
                            <span style={{ color: '#EF4444', fontSize: '0.7rem', fontWeight: 600 }}>IF MISS: </span>
                            {UPCOMING_EVENTS_DATA.alternativeTrades.ifMiss.map((t, i) => <span key={i} style={{ color: '#EF4444', fontSize: '0.7rem', marginLeft: '6px' }}>{t}</span>)}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Chart */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, padding: '12px 16px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <BarChart3 size={14} style={{ color: 'rgba(0,245,255,0.7)' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live Chart</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>XAUUSD</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f59e0b' }}>${goldCandles[goldCandles.length - 1]?.c.toFixed(2)}</span>
          </div>
          <svg width="100%" height="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="xMidYMid meet">
            {[0, 1, 2, 3].map(i => {
              const y = CHART_PAD.top + (i / 3) * (CHART_H - CHART_PAD.top - CHART_PAD.bottom);
              const price = goldMax - (i / 3) * goldRange;
              return (
                <g key={i}>
                  <line x1={CHART_PAD.left} y1={y} x2={CHART_W - CHART_PAD.right} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <text x={CHART_W - CHART_PAD.right + 6} y={y + 3} fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">${price.toFixed(0)}</text>
                </g>
              );
            })}
            {goldCandles.map((c, i) => {
              const x = CHART_PAD.left + (i + 0.5) * goldCandleWidth;
              const priceToY = (price: number) => CHART_PAD.top + ((goldMax - price) / goldRange) * (CHART_H - CHART_PAD.top - CHART_PAD.bottom);
              const yHigh = priceToY(c.h), yLow = priceToY(c.l), yOpen = priceToY(c.o), yClose = priceToY(c.c);
              const bullish = c.c >= c.o;
              const color = bullish ? '#22c55e' : '#ef4444';
              return (
                <g key={i}>
                  <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" />
                  <rect x={x - goldCandleWidth * 0.3} y={Math.min(yOpen, yClose)} width={goldCandleWidth * 0.6} height={Math.max(2, Math.abs(yClose - yOpen))} fill={color} rx="1" />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      </div>
      {/* Economic Calendar Strip — Windows-style minimize/maximize */}
      <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)', overflow: 'hidden', transition: 'height 0.25s ease' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: calendarMinimized ? '8px 14px' : '10px 14px 0 14px',
            cursor: 'pointer',
            minHeight: '40px',
          }}
          onClick={() => calendarMinimized && setCalendarMinimized(false)}
        >
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase', textShadow: '0 0 6px rgba(255,255,255,0.08)' }}>Economic Calendar</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setCalendarMinimized(!calendarMinimized); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title={calendarMinimized ? 'Büyüt' : 'Aşağı al'}
            aria-label={calendarMinimized ? 'Büyüt' : 'Aşağı al'}
          >
            {calendarMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        {!calendarMinimized && (
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px 14px 14px 14px' }}>
            {CALENDAR_EVENTS.map((evt, i) => (
              <div 
                key={i} 
                style={{ 
                  flexShrink: 0, 
                  width: '170px', 
                  background: eventHighlight === i ? 'linear-gradient(180deg, rgba(0,245,255,0.12) 0%, rgba(0,0,0,0.3) 100%)' : 'rgba(255,255,255,0.02)', 
                  border: eventHighlight === i ? '2px solid rgba(0,245,255,0.5)' : '1px solid rgba(255,255,255,0.06)', 
                  borderRadius: '8px', 
                  padding: '8px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: eventHighlight === i ? '0 0 20px rgba(0,245,255,0.3)' : 'none',
                }}
              >
                {evt.actual !== '—' && <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff', fontSize: '0.5rem', fontWeight: 700, padding: '2px 5px', borderRadius: '3px', marginBottom: '4px' }}>LIVE</span>}
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.58rem', marginBottom: '2px' }}>{evt.time}</div>
                <div style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600, marginBottom: '2px', lineHeight: 1.25 }}>{evt.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem', marginBottom: '5px' }}>{evt.country}</div>
                <div style={{ display: 'flex', gap: '6px', fontSize: '0.55rem', flexWrap: 'wrap' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Prev: <span style={{ color: 'rgba(255,255,255,0.8)' }}>{evt.prev}</span></span>
                  <span style={{ color: 'rgba(0,245,255,0.6)' }}>Fcst: <span style={{ color: '#00F5FF' }}>{evt.forecast}</span></span>
                  <span style={{ color: 'rgba(34,197,94,0.7)' }}>Actual: <span style={{ color: evt.actual !== '—' ? '#22C55E' : 'rgba(255,255,255,0.3)', fontWeight: evt.actual !== '—' ? 700 : 400 }}>{evt.actual}</span></span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.52rem', fontWeight: 600, color: evt.impact === 'high' ? '#EF4444' : evt.impact === 'medium' ? '#F59E0B' : '#22C55E', textTransform: 'uppercase' }}>{evt.impact}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BREAKING DEMO — terminal/news breaking news table with animations
// ═══════════════════════════════════════════════════════════════════

const BREAKING_EXPLANATIONS: Record<number, { title: string; description: string; detail: string }> = {
  0: { title: 'Breaking News', description: 'Live feed', detail: 'High-impact headlines in real time. AI sentiment (bullish/bearish) and category tags help you act fast.' },
  1: { title: 'Time & Urgency', description: 'Recency matters', detail: 'NOW and URGENT mark just-released items. Older items show minutes or hours ago.' },
  2: { title: 'AI Sentiment', description: 'Bullish / Bearish', detail: 'AI assigns direction from analysis. Green = bullish, red = bearish, gray = neutral.' },
  3: { title: 'Headline & Category', description: 'Context at a glance', detail: 'Click a row to open full analysis and chart. Categories: FOMC, CPI, STOCKS, etc.' },
};

function BreakingDemo({ isActive, isInView = false }: { isActive: boolean; isInView?: boolean }) {
  const [highlightRow, setHighlightRow] = useState(-1);
  const [phase, setPhase] = useState(0);
  const currentExplanation = BREAKING_EXPLANATIONS[phase] ?? null;
  const [autoTooltip, setAutoTooltip] = useState<TooltipAnchor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isActive || !isInView) {
      setHighlightRow(-1);
      setPhase(0);
      setAutoTooltip(null);
      return;
    }
    let cancelled = false;
    const delay = (ms: number) => new Promise<void>(r => { const t = setTimeout(() => { if (!cancelled) r(); }, ms); if (cancelled) clearTimeout(t); });

    const run = async () => {
      await delay(1200);
      if (cancelled) return;
      setPhase(0);
      setHighlightRow(-1);
      await delay(600);
      for (let i = 0; i < BREAKING_NEWS_DEMO.length; i++) {
        if (cancelled) return;
        setHighlightRow(i);
        setPhase(i === 0 ? 0 : i <= 2 ? 1 : i === 3 ? 2 : 3);
        await delay(2200);
      }
      if (cancelled) return;
      setHighlightRow(-1);
      setPhase(3);
      await delay(2500);
    };
    run();
    const interval = setInterval(run, 35000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isActive, isInView]);

  useEffect(() => {
    if (!currentExplanation) {
      setAutoTooltip(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const key = highlightRow >= 0 ? `breaking-row-${highlightRow}` : 'breaking-header';
    const el = container.querySelector<HTMLElement>(`[data-tooltip-key="${key}"]`);
    if (!el) {
      setAutoTooltip(null);
      return;
    }
    setAutoTooltip(getTooltipAnchor(el, container, key));
  }, [currentExplanation, highlightRow]);

  // Same categories/colors as terminal/news (shared: getCategoryColors)
  const getCategoryStyle = (cat: string) => getCategoryColors(cat);

  return (
    <div ref={containerRef} style={{ height: '540px', position: 'relative', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', width: '100%', paddingLeft: '24px', paddingRight: '24px', boxSizing: 'border-box' }}>
      {currentExplanation && autoTooltip && (
        <div style={{ position: 'absolute', ...getAutoTooltipStyle(autoTooltip), background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', zIndex: 200, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Info style={{ width: 16, height: 16, color: '#fff' }} />
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{currentExplanation.title}</h4>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '2px 0 0 0' }}>{currentExplanation.description}</p>
            </div>
          </div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 0 12px 0' }} />
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{currentExplanation.detail}</p>
        </div>
      )}

      {/* Breaking News tablosu — sayfayı kaplasın */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
        <div style={{ width: '100%', maxWidth: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', background: '#0D0D0D', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(180,30,30,0.08) 0%, rgba(120,20,20,0.04) 50%, rgba(180,30,30,0.1) 100%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: 0, left: '-100%', width: '300%', height: '100%', background: 'linear-gradient(90deg, transparent 0%, transparent 30%, rgba(255,60,60,0.06) 40%, rgba(255,80,80,0.12) 50%, rgba(255,60,60,0.06) 60%, transparent 70%, transparent 100%)', animation: 'redSweep 12s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200,40,40,0.08) 0%, transparent 60%)', animation: 'softPulse 6s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />

        <div data-tooltip-key="breaking-header" style={{ background: 'linear-gradient(90deg, #DC2626 0%, #B91C1C 100%)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px rgba(255,255,255,0.8)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Breaking News</span>
            <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '3px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>{BREAKING_NEWS_DEMO.length} LIVE</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div style={{ maxHeight: '360px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
          {BREAKING_NEWS_DEMO.map((item, index) => {
            const isHighlight = highlightRow === index;
            const catStyle = getCategoryStyle(item.category);
            return (
              <div
                key={item.id}
                data-tooltip-key={`breaking-row-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  borderBottom: index < BREAKING_NEWS_DEMO.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  background: isHighlight ? 'rgba(0,245,255,0.12)' : item.isVeryRecent ? 'rgba(220,38,38,0.08)' : 'transparent',
                  boxShadow: isHighlight ? '0 0 0 2px rgba(0,245,255,0.5)' : 'none',
                }}
              >
                <div style={{
                  width: '80px', minWidth: '80px', padding: '12px 14px', borderRight: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: item.isVeryRecent ? 'rgba(220,38,38,0.15)' : 'rgba(0,0,0,0.2)',
                }}>
                  <span style={{ color: item.isVeryRecent ? '#EF4444' : 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>{item.timeDisplay}</span>
                  {item.isVeryRecent && <span style={{ color: '#EF4444', fontSize: '0.55rem', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>URGENT</span>}
                </div>
                <div style={{
                  width: '44px', minWidth: '44px', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRight: '1px solid rgba(255,255,255,0.06)',
                  background: item.sentiment === 'bullish' ? 'rgba(34,197,94,0.08)' : item.sentiment === 'bearish' ? 'rgba(239,68,68,0.08)' : 'transparent',
                }}>
                  {item.sentiment === 'bullish' && <TrendingUp size={18} color="#22C55E" strokeWidth={2.5} />}
                  {item.sentiment === 'bearish' && <TrendingDown size={18} color="#EF4444" strokeWidth={2.5} />}
                  {item.sentiment === 'neutral' && <Activity size={16} color="rgba(255,255,255,0.3)" />}
                </div>
                <div style={{ flex: 1, padding: '12px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ color: '#fff', fontSize: '0.85rem', lineHeight: 1.45, fontWeight: item.isVeryRecent ? 600 : 500 }}>{item.content}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ background: catStyle.bg, color: catStyle.text, padding: '3px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>{getCategoryLabel(item.category)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', color: 'rgba(255,255,255,0.2)' }}>
                  <ChevronRight size={18} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 1 }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Updated in real-time • Last 24 hours</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>
            <RefreshCw size={12} /> Auto-refresh
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SENTIMENT DEMO — Market Sentiment indicator, animasyonlu + tooltipli
// ═══════════════════════════════════════════════════════════════════

function SentimentDemo({ isActive, isInView = false }: { isActive: boolean; isInView?: boolean }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [highlight, setHighlight] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipAnchor | null>(null);
  const [autoTooltip, setAutoTooltip] = useState<TooltipAnchor | null>(null);
  const [isMobileSentiment, setIsMobileSentiment] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const check = () => setIsMobileSentiment(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!isActive || !isInView) {
      setAnimatedScore(0);
      setHighlight(null);
      setTooltip(null);
      setAutoTooltip(null);
      return;
    }
    let cancelled = false;
    const delay = (ms: number) => new Promise<void>(r => { const t = setTimeout(() => { if (!cancelled) r(); }, ms); if (cancelled) clearTimeout(t); });

    const run = async () => {
      await delay(800);
      if (cancelled) return;
      for (let s = 0; s <= SENTIMENT_DEMO.sentimentScore; s += 2) {
        if (cancelled) return;
        setAnimatedScore(s);
        await delay(40);
      }
      setAnimatedScore(SENTIMENT_DEMO.sentimentScore);

      const steps: { key: string; ms: number }[] = [
        { key: 'score', ms: 2800 },
        { key: 'bar', ms: 2200 },
        { key: 'bullish', ms: 2200 },
        { key: 'bearish', ms: 2200 },
        { key: 'neutral', ms: 2200 },
        { key: 'impact', ms: 2500 },
      ];
      for (const step of steps) {
        if (cancelled) return;
        setHighlight(step.key);
        await delay(step.ms);
      }
      setHighlight(null);
      await delay(1500);
    };
    run();
    const interval = setInterval(run, 22000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isActive, isInView, isMobileSentiment]);

  const scoreColor = animatedScore > 25 ? '#22C55E' : animatedScore < -25 ? '#EF4444' : '#F59E0B';
  const scoreLabel = animatedScore > 50 ? 'Very Bullish' : animatedScore > 25 ? 'Bullish' : animatedScore < -50 ? 'Very Bearish' : animatedScore < -25 ? 'Bearish' : 'Mixed';
  const barLeft = ((animatedScore + 100) / 200) * 100;

  const showTooltip = (key: string, e: React.SyntheticEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;
    setTooltip(getTooltipAnchor(e.currentTarget as HTMLElement, container, key));
  };
  const hideTooltip = () => setTooltip(null);

  useEffect(() => {
    if (!highlight || tooltip) {
      setAutoTooltip(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-tooltip-key="${highlight}"]`);
    if (!el) {
      setAutoTooltip(null);
      return;
    }
    setAutoTooltip(getTooltipAnchor(el, container, highlight));
  }, [highlight, tooltip]);

  return (
    <div
      ref={containerRef}
      data-sentiment-slide
      onPointerDown={(e) => {
        if (!isMobileSentiment) return;
        if (!tooltip) return;
        const t = e.target as HTMLElement | null;
        if (t?.closest('[data-tooltip-key]')) return;
        setTooltip(null);
      }}
      style={{ height: '540px', position: 'relative', display: 'flex', flexDirection: 'column', padding: '16px' }}
    >
      <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(10,10,15,0.98) 100%)', position: 'relative', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
        <div style={{ position: 'absolute', inset: 0, background: animatedScore > 25 ? 'radial-gradient(ellipse at 30% 50%, rgba(34,197,94,0.06) 0%, transparent 50%)' : animatedScore < -25 ? 'radial-gradient(ellipse at 30% 50%, rgba(239,68,68,0.06) 0%, transparent 50%)' : 'radial-gradient(ellipse at 30% 50%, rgba(245,158,11,0.06) 0%, transparent 50%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(59,130,246,0.3) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} color="#A78BFA" />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Market Sentiment</h3>
          </div>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '4px' }}>
            {(['24h', '7d', '30d'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: period === p ? 'rgba(139,92,246,0.3)' : 'transparent', color: period === p ? '#A78BFA' : 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}>{p}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flex: 1, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          {/* Sol: Skor + bar */}
          <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              data-tooltip-key="score"
              onMouseEnter={(e) => showTooltip('score', e)}
              onMouseLeave={hideTooltip}
              onPointerDown={(e) => {
                if (!isMobileSentiment) return;
                e.preventDefault();
                e.stopPropagation();
                showTooltip('score', e);
              }}
              title={SENTIMENT_TOOLTIPS.score.description}
              style={{
                background: animatedScore > 25 ? 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)' : animatedScore < -25 ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)' : 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
                border: `1px solid ${highlight === 'score' ? 'rgba(0,245,255,0.5)' : animatedScore > 25 ? 'rgba(34,197,94,0.3)' : animatedScore < -25 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                borderRadius: '14px',
                padding: '1rem',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: highlight === 'score' ? '0 0 0 2px rgba(0,245,255,0.4)' : 'none',
                transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
              }}
            >
              <div style={{ fontSize: '2.75rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{animatedScore > 0 ? '+' : ''}{animatedScore}</div>
              <div style={{ marginTop: '4px', fontSize: '0.85rem', fontWeight: 700, color: scoreColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{scoreLabel}</div>
            </div>

            <div
              data-tooltip-key="bar"
              onMouseEnter={(e) => showTooltip('bar', e)}
              onMouseLeave={hideTooltip}
              title={SENTIMENT_TOOLTIPS.bar.description}
              style={{ padding: '0 4px', position: 'relative', outline: highlight === 'bar' ? '2px solid rgba(0,245,255,0.5)' : 'none', outlineOffset: 4, borderRadius: 8, transition: 'outline 0.3s ease' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}><span>Bearish</span><span>Bullish</span></div>
              <div style={{ height: '10px', borderRadius: '5px', background: 'linear-gradient(90deg, #EF4444 0%, #F59E0B 50%, #22C55E 100%)', position: 'relative', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
                <div style={{ position: 'absolute', top: '-4px', left: `${barLeft}%`, transform: 'translateX(-50%)', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', transition: 'left 0.4s ease-out' }}>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '8px', height: '8px', borderRadius: '50%', background: scoreColor }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)' }}><span>-100</span><span>0</span><span>+100</span></div>
            </div>
          </div>

          {/* Sağ: 4 kart */}
          <div style={{ flex: 1, minWidth: '260px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {[
              { key: 'bullish', Icon: TrendingUp, color: '#22C55E', value: SENTIMENT_DEMO.bullish, pct: Math.round((SENTIMENT_DEMO.bullish / SENTIMENT_DEMO.total) * 100), barW: (SENTIMENT_DEMO.bullish / SENTIMENT_DEMO.total) * 100, label: 'Bullish' },
              { key: 'bearish', Icon: TrendingDown, color: '#EF4444', value: SENTIMENT_DEMO.bearish, pct: Math.round((SENTIMENT_DEMO.bearish / SENTIMENT_DEMO.total) * 100), barW: (SENTIMENT_DEMO.bearish / SENTIMENT_DEMO.total) * 100, label: 'Bearish' },
              { key: 'neutral', Icon: Activity, color: '#F59E0B', value: SENTIMENT_DEMO.neutral, pct: Math.round((SENTIMENT_DEMO.neutral / SENTIMENT_DEMO.total) * 100), barW: (SENTIMENT_DEMO.neutral / SENTIMENT_DEMO.total) * 100, label: 'Neutral' },
              { key: 'impact', Icon: Zap, color: '#8B5CF6', value: SENTIMENT_DEMO.avgNewsScore, extra: `/10 • ${SENTIMENT_DEMO.breakingCount} Breaking`, label: 'Impact Score' },
            ].map(({ key, Icon, color, value, pct, barW, label, extra }) => (
              <div
                key={key}
                data-tooltip-key={key}
                onMouseEnter={(e) => showTooltip(key, e)}
                onMouseLeave={hideTooltip}
                title={SENTIMENT_TOOLTIPS[key]?.description}
                style={{
                  background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
                  border: `1px solid ${highlight === key ? 'rgba(0,245,255,0.5)' : color + '30'}`,
                  borderRadius: '12px',
                  padding: '1rem',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: highlight === key ? '0 0 0 2px rgba(0,245,255,0.3)' : 'none',
                  transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Icon size={16} color={color} />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 500 }}>{label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</span>
                  {pct != null && <span style={{ fontSize: '0.8rem', color: color + 'cc' }}>{pct}%</span>}
                  {extra && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{extra}</span>}
                </div>
                {barW != null && (
                  <div style={{ marginTop: '8px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${barW}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.8s ease-out' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Floating tooltip — otomatik konum */}
        {tooltip && SENTIMENT_TOOLTIPS[tooltip.key] && (
          <div
            style={{
              position: 'absolute',
              ...getAutoTooltipStyle(tooltip),
              background: '#0a0a0f',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '16px',
              zIndex: 300,
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Info style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{SENTIMENT_TOOLTIPS[tooltip.key].title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '2px 0 0 0' }}>{SENTIMENT_TOOLTIPS[tooltip.key].shortDesc}</p>
              </div>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 0 12px 0' }} />
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{SENTIMENT_TOOLTIPS[tooltip.key].description}</p>
          </div>
        )}
        {/* Animasyon sırasında vurgulanan bölüm — otomatik konum */}
        {highlight && !tooltip && autoTooltip && SENTIMENT_TOOLTIPS[highlight] && (
          <div
            style={{
              position: 'absolute',
              ...getAutoTooltipStyle(autoTooltip),
              background: '#0a0a0f',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '16px',
              zIndex: 250,
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Info style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{SENTIMENT_TOOLTIPS[highlight].title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '2px 0 0 0' }}>{SENTIMENT_TOOLTIPS[highlight].shortDesc}</p>
              </div>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 0 12px 0' }} />
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{SENTIMENT_TOOLTIPS[highlight].description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TRENDING DEMO — Trend Topics indikatörü, animasyonlu + tooltipli
// ═══════════════════════════════════════════════════════════════════

function TrendingDemo({ isActive, isInView = false }: { isActive: boolean; isInView?: boolean }) {
  const [highlightRow, setHighlightRow] = useState(-1);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipAnchor | null>(null);
  const [autoTooltip, setAutoTooltip] = useState<TooltipAnchor | null>(null);
  const [isMobileTrending, setIsMobileTrending] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const check = () => setIsMobileTrending(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!isActive || !isInView) {
      setHighlightRow(-1);
      setHighlight(null);
      setTooltip(null);
      setAutoTooltip(null);
      return;
    }
    let cancelled = false;
    const delay = (ms: number) => new Promise<void>(r => { const t = setTimeout(() => { if (!cancelled) r(); }, ms); if (cancelled) clearTimeout(t); });

    const run = async () => {
      await delay(1000);
      if (cancelled) return;
      setHighlight('header');
      setHighlightRow(-1);
      await delay(2500);
      if (cancelled) return;
      setHighlight('rank');
      for (let i = 0; i < TRENDING_TOPICS_DEMO.length; i++) {
        if (cancelled) return;
        setHighlightRow(i);
        setHighlight(i <= 2 ? 'rank' : i === 3 ? 'topic' : i === 5 ? 'mentions' : null);
        await delay(2000);
      }
      if (cancelled) return;
      setHighlightRow(-1);
      setHighlight('mentions');
      await delay(2200);
    };
    run();
    const interval = setInterval(run, 32000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isActive, isInView, isMobileTrending]);

  const showTooltip = (key: string, e: React.SyntheticEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;
    setTooltip(getTooltipAnchor(e.currentTarget as HTMLElement, container, key));
  };
  const hideTooltip = () => setTooltip(null);

  useEffect(() => {
    if (!highlight || tooltip) {
      setAutoTooltip(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-tooltip-key="${highlight}"]`);
    if (!el) {
      setAutoTooltip(null);
      return;
    }
    setAutoTooltip(getTooltipAnchor(el, container, highlight));
  }, [highlight, tooltip]);

  const tooltipBoxStyle = {
    width: '280px',
    background: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
  };

  return (
    <div
      ref={containerRef}
      data-trending-slide
      onPointerDown={(e) => {
        if (!isMobileTrending) return;
        if (!tooltip) return;
        const t = e.target as HTMLElement | null;
        if (t?.closest('[data-tooltip-key]')) return;
        // Satırların tooltip-key'i yok; onların üstüne tıklamak tooltip açıyor (aşağıda).
        setTooltip(null);
      }}
      style={{ height: '540px', position: 'relative', display: 'flex', flexDirection: 'column', padding: '16px' }}
    >
      <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, rgba(15,15,20,0.98) 0%, rgba(10,10,15,0.98) 100%)', position: 'relative', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
        <div
          data-tooltip-key="header"
          onMouseEnter={(e) => showTooltip('header', e)}
          onMouseLeave={hideTooltip}
          onPointerDown={(e) => {
            if (!isMobileTrending) return;
            e.preventDefault();
            e.stopPropagation();
            showTooltip('header', e);
          }}
          style={{ marginBottom: '1.25rem', position: 'relative', zIndex: 1, outline: highlight === 'header' ? '2px solid rgba(0,245,255,0.5)' : 'none', outlineOffset: 6, borderRadius: 8, transition: 'outline 0.3s ease' }}
        >
          <h3 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={24} color="#00F5FF" />
            Trend Topics
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto' }}>
          {TRENDING_TOPICS_DEMO.map((topic, index) => {
            const isHighlight = highlightRow === index;
            return (
              <div
                key={topic.topic}
                onMouseEnter={(e) => showTooltip(index <= 2 ? 'rank' : index === 3 ? 'topic' : 'mentions', e)}
                onMouseLeave={hideTooltip}
                onPointerDown={(e) => {
                  if (!isMobileTrending) return;
                  e.preventDefault();
                  e.stopPropagation();
                  showTooltip(index <= 2 ? 'rank' : index === 3 ? 'topic' : 'mentions', e);
                }}
                title={TRENDING_TOOLTIPS.mentions.description}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '12px 16px',
                  background: isHighlight ? 'rgba(0,245,255,0.08)' : 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  border: `1px solid ${isHighlight ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: isHighlight ? '0 0 0 2px rgba(0,245,255,0.2)' : 'none',
                }}
              >
                <span
                  data-tooltip-key="rank"
                  style={{
                    color: topic.rank <= 3 ? '#00F5FF' : 'rgba(255,255,255,0.5)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    minWidth: '36px',
                  }}
                >
                  #{topic.rank}
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{topic.topic}</span>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '2px' }}>
                    {topic.count} mentions
                  </div>
                </div>
                <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
              </div>
            );
          })}
        </div>

        {/* Tooltip — otomatik konum */}
        {tooltip && TRENDING_TOOLTIPS[tooltip.key] && (
          <div
            style={{
              ...tooltipBoxStyle,
              position: 'absolute',
              ...getAutoTooltipStyle(tooltip),
              zIndex: 300,
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Info style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{TRENDING_TOOLTIPS[tooltip.key].title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '2px 0 0 0' }}>{TRENDING_TOOLTIPS[tooltip.key].shortDesc}</p>
              </div>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 0 12px 0' }} />
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{TRENDING_TOOLTIPS[tooltip.key].description}</p>
          </div>
        )}
        {highlight && !tooltip && autoTooltip && TRENDING_TOOLTIPS[highlight] && (
          <div
            style={{
              ...tooltipBoxStyle,
              position: 'absolute',
              ...getAutoTooltipStyle(autoTooltip),
              zIndex: 250,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Info style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{TRENDING_TOOLTIPS[highlight].title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '2px 0 0 0' }}>{TRENDING_TOOLTIPS[highlight].shortDesc}</p>
              </div>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 0 12px 0' }} />
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{TRENDING_TOOLTIPS[highlight].description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MARKETS DEMO — Terminal/Markets page: tabs, table, resizable divider, overview, gainers/losers
// ═══════════════════════════════════════════════════════════════════

function MarketsDemo({ isActive, isInView = false }: { isActive: boolean; isInView?: boolean }) {
  const [activeTab, setActiveTab] = useState<MarketTabId>('crypto');
  const [highlight, setHighlight] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipAnchor | null>(null);
  const [autoTooltip, setAutoTooltip] = useState<TooltipAnchor | null>(null);
  const [tableWidth] = useState(52);
  const [isMobileMarkets, setIsMobileMarkets] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mobil algılama
  useEffect(() => {
    const check = () => setIsMobileMarkets(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const formatPrice = (p: number) => p >= 1000 ? `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : p >= 1 ? `$${p.toFixed(2)}` : `$${p.toFixed(4)}`;
  const formatVol = (v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${v.toLocaleString()}`;

  useEffect(() => {
    if (!isActive || !isInView) {
      setHighlight(null);
      setTooltip(null);
      setAutoTooltip(null);
      if (!isActive || !isInView) setActiveTab('crypto');
      return;
    }
    let cancelled = false;
    const delay = (ms: number) => new Promise<void>(r => { const t = setTimeout(() => { if (!cancelled) r(); }, ms); if (cancelled) clearTimeout(t); });

    const run = async () => {
      const steps: { key: string; ms: number }[] = [
        { key: 'header', ms: 2200 },
        { key: 'tabs', ms: 2200 },
        { key: 'search', ms: 2000 },
        { key: 'table', ms: 2500 },
        { key: 'sort', ms: 2200 },
        { key: 'divider', ms: 2000 },
        { key: 'overview', ms: 2500 },
        { key: 'fearGreed', ms: 2500 },
        { key: 'topGainers', ms: 2200 },
        { key: 'topLosers', ms: 2200 },
      ];
      for (const step of steps) {
        if (cancelled) return;
        setHighlight(step.key);
        if (step.key === 'tabs') setActiveTab('forex');
        if (step.key === 'overview') setActiveTab('crypto');
        await delay(step.ms);
      }
      setHighlight(null);
      setActiveTab('crypto');
      await delay(1500);
    };
    run();
    const interval = setInterval(run, 32000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isActive, isInView, isMobileMarkets]);

  const showTooltip = (key: string, e: React.SyntheticEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container) return;
    setTooltip(getTooltipAnchor(e.currentTarget as HTMLElement, container, key));
  };
  const hideTooltip = () => setTooltip(null);

  useEffect(() => {
    if (!highlight || tooltip) {
      setAutoTooltip(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-tooltip-key="${highlight}"]`);
    if (!el) {
      setAutoTooltip(null);
      return;
    }
    setAutoTooltip(getTooltipAnchor(el, container, highlight));
  }, [highlight, tooltip]);

  const boxStyle = { width: '280px', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' };
  const coins = MARKETS_DEMO.coins;
  const forex = MARKETS_DEMO.forex;
  const stocks = MARKETS_DEMO.stocks;
  const commodities = MARKETS_DEMO.commodities;
  const indices = MARKETS_DEMO.indices;
  const fearGreed = MARKETS_DEMO.fearGreedIndex;
  const currentTabData = activeTab === 'crypto' ? coins : activeTab === 'forex' ? forex : activeTab === 'stocks' ? stocks : activeTab === 'commodities' ? commodities : indices;
  const gainers = [...currentTabData].sort((a: { change24h: number }, b: { change24h: number }) => b.change24h - a.change24h).slice(0, 3);
  const losers = [...currentTabData].sort((a: { change24h: number }, b: { change24h: number }) => a.change24h - b.change24h).slice(0, 3);
  const totalCap = coins.reduce((a, c) => a + c.marketCap, 0);
  const totalVol = coins.reduce((a, c) => a + c.volume24h, 0);
  const btcCap = coins.find(c => c.symbol === 'BTC')?.marketCap ?? 0;

  return (
    <div
      ref={containerRef}
      data-markets-slide
      onPointerDown={(e) => {
        if (!isMobileMarkets) return;
        if (!tooltip) return;
        const t = e.target as HTMLElement | null;
        if (t?.closest('[data-tooltip-key]')) return;
        setTooltip(null);
      }}
      style={{ height: '540px', position: 'relative', display: 'flex', flexDirection: 'column', padding: '16px', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}
    >
      <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0A0A0B', display: 'flex', flexDirection: 'column', padding: '12px', position: 'relative' }}>
        {/* Dim overlay when highlighting */}
        {highlight && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 40, pointerEvents: 'none' }} />}

        {/* Header */}
        <div
          data-tooltip-key="header"
          onMouseEnter={(e) => showTooltip('header', e)}
          onMouseLeave={hideTooltip}
          onPointerDown={(e) => {
            if (!isMobileMarkets) return;
            e.preventDefault();
            e.stopPropagation();
            showTooltip('header', e);
          }}
          style={{
            marginBottom: isMobileMarkets ? '6px' : '10px',
            outline: highlight === 'header' ? '2px solid rgba(0,245,255,0.5)' : 'none',
            outlineOffset: 4,
            borderRadius: 8,
            transition: 'outline 0.3s ease',
            position: 'relative',
            zIndex: 50,
          }}
        >
          <h1 style={{ color: '#fff', fontSize: isMobileMarkets ? '0.95rem' : '1.15rem', fontWeight: 700, margin: 0 }}>All Markets</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: isMobileMarkets ? '0.65rem' : '0.75rem' }}>{isMobileMarkets ? 'Crypto, Forex, Stocks & More' : 'Live prices for Crypto, Forex, Stocks, Commodities & Indices'}</p>
        </div>

        {/* Tabs + Search */}
        <div style={{ display: 'flex', alignItems: 'center', flexDirection: isMobileMarkets ? 'column' : 'row', gap: isMobileMarkets ? '6px' : 0, marginBottom: isMobileMarkets ? '6px' : '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 50, paddingBottom: isMobileMarkets ? '6px' : 0 }}>
          {!isMobileMarkets && <div
            data-tooltip-key="search"
            onMouseEnter={(e) => showTooltip('search', e)}
            onMouseLeave={hideTooltip}
            style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center', paddingBottom: '8px', outline: highlight === 'search' ? '2px solid rgba(0,245,255,0.5)' : 'none', outlineOffset: 4, borderRadius: 6 }}
          >
            <Search size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
            <input type="text" placeholder="Search..." readOnly style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: '0.75rem', width: 140 }} />
            <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px', cursor: 'pointer' }}><RefreshCw size={14} color="rgba(255,255,255,0.5)" /></button>
          </div>}
          <div
            data-tooltip-key="tabs"
            onMouseEnter={(e) => showTooltip('tabs', e)}
            onMouseLeave={hideTooltip}
            onPointerDown={(e) => {
              if (!isMobileMarkets) return;
              e.preventDefault();
              e.stopPropagation();
              showTooltip('tabs', e);
            }}
            style={{ display: 'flex', flexWrap: isMobileMarkets ? 'wrap' : 'nowrap', justifyContent: isMobileMarkets ? 'center' : 'flex-start', gap: isMobileMarkets ? '2px' : 0, outline: highlight === 'tabs' ? '2px solid rgba(0,245,255,0.5)' : 'none', outlineOffset: 4, borderRadius: 6, width: isMobileMarkets ? '100%' : 'auto' }}
          >
            {(['crypto', 'forex', 'stocks', 'commodities', 'indices'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: isMobileMarkets ? '5px 8px' : '8px 12px',
                  border: 'none',
                  borderBottomWidth: isMobileMarkets ? 0 : 2,
                  borderBottomStyle: isMobileMarkets ? 'none' : 'solid',
                  borderBottomColor: activeTab === tab ? '#00F5FF' : 'transparent',
                  background: isMobileMarkets && activeTab === tab ? 'rgba(0,245,255,0.15)' : 'transparent',
                  color: activeTab === tab ? '#00F5FF' : 'rgba(255,255,255,0.5)',
                  fontWeight: 500,
                  fontSize: isMobileMarkets ? '0.65rem' : '0.75rem',
                  cursor: 'pointer',
                  borderRadius: isMobileMarkets ? '6px' : 0,
                }}
              >
                {isMobileMarkets ? tab.charAt(0).toUpperCase() + tab.slice(1, 3) : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Main: Table | Divider | Panel */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', minHeight: 0, position: 'relative', zIndex: 50 }}>
          {/* Table — mobilde tam genişlik */}
          <div
            data-tooltip-key="table"
            onMouseEnter={(e) => showTooltip('table', e)}
            onMouseLeave={hideTooltip}
            onPointerDown={(e) => {
              if (!isMobileMarkets) return;
              e.preventDefault();
              e.stopPropagation();
              showTooltip('table', e);
            }}
            style={{
              width: isMobileMarkets ? '100%' : `${tableWidth}%`,
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              outline: highlight === 'table' || highlight === 'sort' ? '2px solid rgba(0,245,255,0.5)' : 'none',
              outlineOffset: 2,
            }}
          >
            {activeTab === 'crypto' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobileMarkets ? '24px 1.5fr 1fr 0.8fr' : '36px 1.6fr 0.9fr 0.7fr 0.9fr 0.9fr', padding: isMobileMarkets ? '6px 8px' : '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontSize: isMobileMarkets ? '0.6rem' : '0.7rem', fontWeight: 600 }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)' }}>#</div>
                  <div data-tooltip-key="sort" onMouseEnter={(e) => showTooltip('sort', e)} onMouseLeave={hideTooltip} style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Name</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>Price</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>24h %</div>
                  {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>Volume</div>}
                  {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>24h Range</div>}
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {coins.map((coin, i) => (
                    <div key={coin.symbol} style={{ display: 'grid', gridTemplateColumns: isMobileMarkets ? '24px 1.5fr 1fr 0.8fr' : '36px 1.6fr 0.9fr 0.7fr 0.9fr 0.9fr', padding: isMobileMarkets ? '6px 8px' : '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{i + 1}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobileMarkets ? 4 : 8 }}>
                        {coin.logo ? <img src={coin.logo} alt={coin.symbol} style={{ width: isMobileMarkets ? 20 : 28, height: isMobileMarkets ? 20 : 28, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div style={{ width: isMobileMarkets ? 20 : 28, height: isMobileMarkets ? 20 : 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{isMobileMarkets ? coin.symbol : coin.name}</div>
                          {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{coin.symbol}</div>}
                        </div>
                      </div>
                      <div style={{ color: '#fff', fontWeight: 600, textAlign: 'right', fontFamily: 'monospace', fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{formatPrice(coin.price)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, color: coin.change24h >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600, fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>
                        {coin.change24h >= 0 ? <ArrowUp size={isMobileMarkets ? 10 : 12} /> : <ArrowDown size={isMobileMarkets ? 10 : 12} />}
                        {Math.abs(coin.change24h).toFixed(2)}%
                      </div>
                      {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }}>{formatVol(coin.volume24h)}</div>}
                      {!isMobileMarkets && <div style={{ paddingLeft: 8 }}>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${((coin.price - coin.low24h) / (coin.high24h - coin.low24h)) * 100}%`, background: coin.change24h >= 0 ? '#22C55E' : '#EF4444', borderRadius: 2 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>{formatPrice(coin.low24h)} {formatPrice(coin.high24h)}</div>
                      </div>}
                    </div>
                  ))}
                </div>
              </>
            ) : activeTab === 'forex' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobileMarkets ? '24px 1.5fr 1fr 0.8fr' : '36px 1.8fr 1fr 0.8fr 1fr', padding: isMobileMarkets ? '6px 8px' : '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontSize: isMobileMarkets ? '0.6rem' : '0.7rem', fontWeight: 600 }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)' }}>#</div>
                  <div data-tooltip-key="sort" onMouseEnter={(e) => showTooltip('sort', e)} onMouseLeave={hideTooltip} style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Pair</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>Price</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>24h %</div>
                  {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>Volume</div>}
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {forex.map((pair, i) => (
                    <div key={pair.symbol} style={{ display: 'grid', gridTemplateColumns: isMobileMarkets ? '24px 1.5fr 1fr 0.8fr' : '36px 1.8fr 1fr 0.8fr 1fr', padding: isMobileMarkets ? '6px 8px' : '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{i + 1}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobileMarkets ? 4 : 8 }}>
                        {!isMobileMarkets && <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                          {pair.baseLogo && <img src={pair.baseLogo} alt="" style={{ width: 24, height: 18, borderRadius: 2, objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                          {pair.quoteLogo && <img src={pair.quoteLogo} alt="" style={{ width: 24, height: 18, borderRadius: 2, objectFit: 'cover', marginLeft: -6, border: '2px solid #0A0A0B' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                        </div>}
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{pair.symbol}</div>
                          {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{pair.name}</div>}
                        </div>
                      </div>
                      <div style={{ color: '#fff', fontWeight: 600, textAlign: 'right', fontFamily: 'monospace', fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{pair.symbol.includes('JPY') ? pair.price.toFixed(3) : pair.price.toFixed(5)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, color: pair.change24h >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600, fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>
                        {pair.change24h >= 0 ? <ArrowUp size={isMobileMarkets ? 10 : 12} /> : <ArrowDown size={isMobileMarkets ? 10 : 12} />}
                        {Math.abs(pair.change24h).toFixed(2)}%
                      </div>
                      {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }}>{formatVol(pair.volume24h)}</div>}
                    </div>
                  ))}
                </div>
              </>
            ) : activeTab === 'stocks' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobileMarkets ? '24px 1.5fr 1fr 0.8fr' : '36px 1.8fr 1fr 0.8fr 1fr', padding: isMobileMarkets ? '6px 8px' : '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontSize: isMobileMarkets ? '0.6rem' : '0.7rem', fontWeight: 600 }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)' }}>#</div>
                  <div data-tooltip-key="sort" onMouseEnter={(e) => showTooltip('sort', e)} onMouseLeave={hideTooltip} style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Company</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>Price</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>24h %</div>
                  {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>24h High</div>}
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {stocks.map((stock, i) => (
                    <div key={stock.symbol} style={{ display: 'grid', gridTemplateColumns: isMobileMarkets ? '24px 1.5fr 1fr 0.8fr' : '36px 1.8fr 1fr 0.8fr 1fr', padding: isMobileMarkets ? '6px 8px' : '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{i + 1}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobileMarkets ? 4 : 8 }}>
                        {stock.logo ? (
                          <div style={{ width: isMobileMarkets ? 20 : 28, height: isMobileMarkets ? 20 : 28, borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: isMobileMarkets ? 2 : 4 }}>
                            <img src={stock.logo} alt={stock.symbol} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        ) : <div style={{ width: isMobileMarkets ? 20 : 28, height: isMobileMarkets ? 20 : 28, borderRadius: 6, background: 'rgba(255,255,255,0.1)' }} />}
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{stock.symbol}</div>
                          {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{stock.name}</div>}
                        </div>
                      </div>
                      <div style={{ color: '#fff', fontWeight: 600, textAlign: 'right', fontFamily: 'monospace', fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>${stock.price.toFixed(2)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, color: stock.change24h >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600, fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>
                        {stock.change24h >= 0 ? <ArrowUp size={isMobileMarkets ? 10 : 12} /> : <ArrowDown size={isMobileMarkets ? 10 : 12} />}
                        {Math.abs(stock.change24h).toFixed(2)}%
                      </div>
                      {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }}>${stock.high24h.toFixed(2)}</div>}
                    </div>
                  ))}
                </div>
              </>
            ) : activeTab === 'commodities' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobileMarkets ? '24px 1.5fr 1fr 0.8fr' : '36px 1.8fr 1fr 0.8fr 1fr', padding: isMobileMarkets ? '6px 8px' : '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontSize: isMobileMarkets ? '0.6rem' : '0.7rem', fontWeight: 600 }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)' }}>#</div>
                  <div data-tooltip-key="sort" onMouseEnter={(e) => showTooltip('sort', e)} onMouseLeave={hideTooltip} style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Commodity</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>Price</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>24h %</div>
                  {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>Unit</div>}
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {commodities.map((comm, i) => (
                    <div key={comm.symbol} style={{ display: 'grid', gridTemplateColumns: isMobileMarkets ? '24px 1.5fr 1fr 0.8fr' : '36px 1.8fr 1fr 0.8fr 1fr', padding: isMobileMarkets ? '6px 8px' : '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{i + 1}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobileMarkets ? 4 : 8 }}>
                        {comm.logo ? <img src={comm.logo} alt={comm.name} style={{ width: isMobileMarkets ? 20 : 28, height: isMobileMarkets ? 20 : 28, borderRadius: '50%', objectFit: 'cover', background: 'rgba(255,255,255,0.1)' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div style={{ width: isMobileMarkets ? 20 : 28, height: isMobileMarkets ? 20 : 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />}
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{comm.name}</div>
                          {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{comm.category}</div>}
                        </div>
                      </div>
                      <div style={{ color: '#fff', fontWeight: 600, textAlign: 'right', fontFamily: 'monospace', fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>${comm.price.toFixed(2)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, color: comm.change24h >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600, fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>
                        {comm.change24h >= 0 ? <ArrowUp size={isMobileMarkets ? 10 : 12} /> : <ArrowDown size={isMobileMarkets ? 10 : 12} />}
                        {Math.abs(comm.change24h).toFixed(2)}%
                      </div>
                      {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right', fontSize: '0.75rem' }}>per {comm.unit}</div>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobileMarkets ? '24px 1.5fr 1fr 0.8fr' : '36px 1.8fr 1fr 0.8fr 1fr', padding: isMobileMarkets ? '6px 8px' : '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', fontSize: isMobileMarkets ? '0.6rem' : '0.7rem', fontWeight: 600 }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)' }}>#</div>
                  <div data-tooltip-key="sort" onMouseEnter={(e) => showTooltip('sort', e)} onMouseLeave={hideTooltip} style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Index</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>Price</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>24h %</div>
                  {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>24h High</div>}
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {indices.map((idx, i) => (
                    <div key={idx.symbol} style={{ display: 'grid', gridTemplateColumns: isMobileMarkets ? '24px 1.5fr 1fr 0.8fr' : '36px 1.8fr 1fr 0.8fr 1fr', padding: isMobileMarkets ? '6px 8px' : '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{i + 1}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobileMarkets ? 4 : 8 }}>
                        {idx.flagImage ? <img src={idx.flagImage} alt={idx.symbol} style={{ width: isMobileMarkets ? 20 : 28, height: isMobileMarkets ? 14 : 20, borderRadius: 2, objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div style={{ width: isMobileMarkets ? 20 : 28, height: isMobileMarkets ? 14 : 20, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />}
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{idx.symbol}</div>
                          {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>{idx.name}</div>}
                        </div>
                      </div>
                      <div style={{ color: '#fff', fontWeight: 600, textAlign: 'right', fontFamily: 'monospace', fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>{idx.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, color: idx.change24h >= 0 ? '#22C55E' : '#EF4444', fontWeight: 600, fontSize: isMobileMarkets ? '0.7rem' : '0.8rem' }}>
                        {idx.change24h >= 0 ? <ArrowUp size={isMobileMarkets ? 10 : 12} /> : <ArrowDown size={isMobileMarkets ? 10 : 12} />}
                        {Math.abs(idx.change24h).toFixed(2)}%
                      </div>
                      {!isMobileMarkets && <div style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.75rem' }}>{idx.high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Divider — mobilde gizli */}
          {!isMobileMarkets && (
            <div
              data-tooltip-key="divider"
              onMouseEnter={(e) => showTooltip('divider', e)}
              onMouseLeave={hideTooltip}
              style={{ width: 10, cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, outline: highlight === 'divider' ? '2px solid rgba(0,245,255,0.5)' : 'none', outlineOffset: 2, borderRadius: 4 }}
            >
              <div style={{ width: 4, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }} />
            </div>
          )}

          {/* Indicators Panel — mobilde gizli */}
          {!isMobileMarkets && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, overflow: 'auto' }}>
            <div
              data-tooltip-key="overview"
              onMouseEnter={(e) => showTooltip('overview', e)}
              onMouseLeave={hideTooltip}
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '12px',
                outline: highlight === 'overview' ? '2px solid rgba(0,245,255,0.5)' : 'none',
                outlineOffset: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#00F5FF', fontWeight: 600, fontSize: '0.8rem' }}>
                <Activity size={16} />
                {activeTab === 'crypto' ? 'Crypto Market Overview' : activeTab === 'forex' ? 'Forex Market Overview' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Overview`}
              </div>
              {activeTab === 'crypto' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, marginBottom: 6, fontSize: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Total Market Cap</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>${(totalCap / 1e12).toFixed(2)}T</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, marginBottom: 6, fontSize: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>24h Volume</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>${(totalVol / 1e9).toFixed(2)}B</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, marginBottom: 6, fontSize: '0.75rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>BTC Dominance</span>
                    <span style={{ color: '#F7931A', fontWeight: 600 }}>{totalCap ? ((btcCap / totalCap) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div
                    data-tooltip-key="fearGreed"
                    onMouseEnter={(e) => showTooltip('fearGreed', e)}
                    onMouseLeave={hideTooltip}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      background: fearGreed.value <= 45 ? 'rgba(249, 115, 22, 0.15)' : fearGreed.value <= 55 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      borderRadius: 8,
                      border: `1px solid ${fearGreed.value <= 45 ? 'rgba(249,115,22,0.3)' : fearGreed.value <= 55 ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`,
                      outline: highlight === 'fearGreed' ? '2px solid rgba(0,245,255,0.5)' : 'none',
                      outlineOffset: 2,
                    }}
                  >
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Fear & Greed</span>
                      <div style={{ color: '#fff', fontSize: '0.7rem', textTransform: 'capitalize' }}>{fearGreed.classification}</div>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{fearGreed.value}</div>
                  </div>
                </>
              )}
              {activeTab === 'forex' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.75rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Pairs Tracked</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{forex.length}</span>
                </div>
              )}
              {activeTab === 'stocks' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.75rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Stocks Tracked</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{stocks.length}</span>
                </div>
              )}
              {activeTab === 'commodities' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.75rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Commodities Tracked</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{commodities.length}</span>
                </div>
              )}
              {activeTab === 'indices' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.75rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Indices Tracked</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{indices.length}</span>
                </div>
              )}
            </div>

            <div
              data-tooltip-key="topGainers"
              onMouseEnter={(e) => showTooltip('topGainers', e)}
              onMouseLeave={hideTooltip}
              style={{
                background: 'rgba(34, 197, 94, 0.05)',
                borderRadius: 10,
                border: '1px solid rgba(34, 197, 94, 0.2)',
                padding: '10px',
                outline: highlight === 'topGainers' ? '2px solid rgba(0,245,255,0.5)' : 'none',
                outlineOffset: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: '#22C55E', fontWeight: 600, fontSize: '0.8rem' }}>
                <TrendingUp size={14} /> Top Gainers
              </div>
              {gainers.map((item: { symbol: string; name?: string; change24h: number; logo?: string; baseLogo?: string; flagImage?: string }) => (
                <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {'logo' in item && item.logo && <img src={item.logo} alt={item.symbol} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    {'baseLogo' in item && item.baseLogo && <img src={item.baseLogo} alt="" style={{ width: 22, height: 16, borderRadius: 2, objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    {'flagImage' in item && item.flagImage && <img src={item.flagImage} alt="" style={{ width: 22, height: 16, borderRadius: 2, objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem' }}>{item.symbol}</div>
                      {'name' in item && item.name && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>{item.name}</div>}
                    </div>
                  </div>
                  <span style={{ color: '#22C55E', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 2 }}><ArrowUp size={10} />+{item.change24h.toFixed(2)}%</span>
                </div>
              ))}
            </div>

            <div
              data-tooltip-key="topLosers"
              onMouseEnter={(e) => showTooltip('topLosers', e)}
              onMouseLeave={hideTooltip}
              style={{
                background: 'rgba(239, 68, 68, 0.05)',
                borderRadius: 10,
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '10px',
                outline: highlight === 'topLosers' ? '2px solid rgba(0,245,255,0.5)' : 'none',
                outlineOffset: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: '#EF4444', fontWeight: 600, fontSize: '0.8rem' }}>
                <TrendingDown size={14} /> Top Losers
              </div>
              {losers.map((item: { symbol: string; name?: string; change24h: number; logo?: string; baseLogo?: string; flagImage?: string }) => (
                <div key={item.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {'logo' in item && item.logo && <img src={item.logo} alt={item.symbol} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    {'baseLogo' in item && item.baseLogo && <img src={item.baseLogo} alt="" style={{ width: 22, height: 16, borderRadius: 2, objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    {'flagImage' in item && item.flagImage && <img src={item.flagImage} alt="" style={{ width: 22, height: 16, borderRadius: 2, objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.75rem' }}>{item.symbol}</div>
                      {'name' in item && item.name && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>{item.name}</div>}
                    </div>
                  </div>
                  <span style={{ color: '#EF4444', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 2 }}><ArrowDown size={10} />{item.change24h.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* Tooltip — otomatik konum */}
        {tooltip && MARKETS_TOOLTIPS[tooltip.key] && (
          <div
            style={{
              ...boxStyle,
              position: 'absolute',
              ...getAutoTooltipStyle(tooltip),
              zIndex: 300,
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Info size={16} color="#fff" /></div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{MARKETS_TOOLTIPS[tooltip.key].title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '2px 0 0 0' }}>{MARKETS_TOOLTIPS[tooltip.key].shortDesc}</p>
              </div>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 12px 0' }} />
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{MARKETS_TOOLTIPS[tooltip.key].description}</p>
          </div>
        )}
        {/* Fixed explanation during animation — otomatik konum */}
        {highlight && !tooltip && autoTooltip && MARKETS_TOOLTIPS[highlight] && (
          <div
            style={{
              ...boxStyle,
              position: 'absolute',
              ...getAutoTooltipStyle(autoTooltip),
              zIndex: 250,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Info size={16} color="#fff" /></div>
              <div>
                <h4 style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{MARKETS_TOOLTIPS[highlight].title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '2px 0 0 0' }}>{MARKETS_TOOLTIPS[highlight].shortDesc}</p>
              </div>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 12px 0' }} />
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{MARKETS_TOOLTIPS[highlight].description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SHOWCASE COMPONENT WITH SLIDER
// ═══════════════════════════════════════════════════════════════════

const HUB_MOBILE_BREAKPOINT = 768;

export default function TerminalShowcase() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const hubNavRef = useRef<HTMLElement>(null);
  const hubTabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        setIsInView(!!e?.isIntersecting);
      },
      { threshold: 0.15, rootMargin: '0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < HUB_MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const nav = hubNavRef.current;
    const btn = hubTabRefs.current[activeSlide];
    if (!nav || !btn) return;
    const target = btn.offsetLeft - (nav.clientWidth - btn.offsetWidth) / 2;
    const maxScroll = nav.scrollWidth - nav.clientWidth;
    nav.scrollTo({
      left: Math.max(0, Math.min(target, maxScroll)),
      behavior: 'smooth',
    });
  }, [activeSlide, isMobile]);

  const goPrevSlide = () => {
    if (activeSlide > 0) setActiveSlide(activeSlide - 1);
  };
  const goNextSlide = () => {
    if (activeSlide < 5) setActiveSlide(activeSlide + 1);
  };

  const slides = [
    { id: 'news', label: 'AI News Analysis', icon: <Sparkles size={14} /> },
    { id: 'events', label: 'Event Calendar', icon: <Calendar size={14} /> },
    { id: 'breaking', label: 'Breaking', icon: <Zap size={14} /> },
    { id: 'sentiment', label: 'Market Sentiment', icon: <BarChart3 size={14} /> },
    { id: 'trending', label: 'Trending Topics', icon: <TrendingUp size={14} /> },
    { id: 'markets', label: 'All Markets', icon: <Activity size={14} /> },
  ];

  // iOS/Safari'de IntersectionObserver bazı durumlarda geç tetiklenebiliyor.
  // Mobilde aktif slide kullanıcı ekranındayken animasyonları garanti etmek için "in view" varsayıyoruz.
  const effectiveInView = isMobile ? true : isInView;

  return (
    <section ref={sectionRef} id="hub" style={{ position: 'relative', width: '100%', maxWidth: '100vw', padding: '5rem 0 6rem', overflow: 'hidden', overflowX: 'hidden', clipPath: 'inset(0)' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '1100px', height: '700px', background: 'radial-gradient(ellipse 50% 40%, rgba(0,245,255,0.03) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem', overflowX: 'hidden', boxSizing: 'border-box' }}>
        {/* Header */}
        {/* Bölüm başlığı — profesyonel stil (fotoğraftaki gibi) */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(0,245,255,0.85)',
              margin: '0 0 0.75rem 0',
            }}
          >
            FibAlgo Hub
          </p>
          <h2
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: '0 0 0.75rem 0',
            }}
          >
            See How AI Analyzes Markets in Real-Time
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.6,
              maxWidth: '36rem',
              margin: '0 auto',
            }}
          >
            Watch breaking news and economic events get analyzed instantly.
          </p>
        </div>

        {/* Tab bar — mobilde IndicatorTabs ile aynı: sade oklar + kaydırılabilir menü */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '0.35rem' : '0',
            marginBottom: '1.5rem',
            padding: isMobile ? '0 0.15rem' : '0',
          }}
        >
          {isMobile && activeSlide > 0 && (
            <button
              type="button"
              aria-label="Önceki sekme"
              onClick={goPrevSlide}
              style={{
                flexShrink: 0,
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
          )}

          <div
            style={{
              flex: isMobile ? '1' : 'none',
              minWidth: 0,
              maxWidth: isMobile ? (activeSlide === 0 || activeSlide === slides.length - 1 ? 'calc(100% - 1.75rem)' : 'calc(100% - 3.25rem)') : 'none',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <nav
              ref={hubNavRef}
              role="tablist"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: isMobile ? '6px 8px' : '6px',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: isMobile ? '12px' : '12px',
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                maxWidth: '100%',
              }}
              className="hub-slide-nav"
            >
              {slides.map((slide, i) => {
                const isActive = activeSlide === i;
                return (
                  <span key={slide.id} style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                    {i > 0 && (
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: isMobile ? '0.8rem' : '0.875rem', padding: '0 3px', userSelect: 'none' }}>–</span>
                    )}
                    <button
                      ref={(el) => { hubTabRefs.current[i] = el; }}
                      role="tab"
                      aria-selected={isActive}
                      type="button"
                      onClick={() => setActiveSlide(i)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: isMobile ? '9px 14px' : '10px 18px',
                        flexShrink: 0,
                        background: isActive ? 'rgba(0,245,255,0.08)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: isActive ? 'rgba(0,245,255,0.95)' : 'rgba(255,255,255,0.5)',
                        fontSize: isMobile ? '0.85rem' : '0.875rem',
                        fontWeight: isActive ? 600 : 500,
                        letterSpacing: '-0.01em',
                        cursor: 'pointer',
                        transition: 'color 0.2s ease, background 0.2s ease',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                        }
                      }}
                    >
                      {slide.label}
                    </button>
                  </span>
                );
              })}
            </nav>
          </div>

          {isMobile && activeSlide < slides.length - 1 && (
            <button
              type="button"
              aria-label="Sonraki sekme"
              onClick={goNextSlide}
              style={{
                flexShrink: 0,
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
            >
              <ChevronRight size={18} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Upcoming — minimal */}
        <div style={{
          textAlign: 'center',
          marginBottom: '1.5rem',
          paddingTop: '0.5rem',
        }}>
          <div style={{
            width: '24px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.4), transparent)',
            margin: '0 auto 0.75rem',
          }} />
          <p style={{
            fontSize: '0.68rem',
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            margin: 0,
          }}>
            Coming soon
          </p>
          <p style={{
            fontSize: '0.8rem',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.5)',
            margin: '0.25rem 0 0 0',
            letterSpacing: '0.02em',
          }}>
            Agent <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 0.25rem' }}>·</span> Community <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span> Signals <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span> Education
          </p>
        </div>

        {/* Terminal Window — taşma konteyneri kaydırmasın diye maxWidth ve overflow */}
        <div style={{ 
          background: 'linear-gradient(180deg, #0d0d12 0%, #08080c 100%)', 
          borderRadius: '12px', 
          border: '1px solid rgba(255,255,255,0.08)', 
          overflow: 'hidden',
          overflowX: 'hidden',
          maxWidth: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
          clipPath: 'inset(0 round 12px)',
        }}>
          {/* Window header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840' }} />
            </div>
            <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>FibAlgo Hub</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Live</span>
            </div>
          </div>

          {/* Slides Container — mobilde sadece aktif slide render edilir (taşma önlenir) */}
          <div style={{ position: 'relative', overflow: 'hidden', width: '100%', minWidth: 0 }}>
            {isMobile ? (
              // MOBİL: Sadece aktif slide render edilir — kesinlikle taşma olmaz
              <div style={{ width: '100%' }}>
                {activeSlide === 0 && <NewsDemo isActive={true} isInView={effectiveInView} />}
                {activeSlide === 1 && <EventDemo isActive={true} isInView={effectiveInView} />}
                {activeSlide === 2 && <BreakingDemo isActive={true} isInView={effectiveInView} />}
                {activeSlide === 3 && <SentimentDemo isActive={true} isInView={effectiveInView} />}
                {activeSlide === 4 && <TrendingDemo isActive={true} isInView={effectiveInView} />}
                {activeSlide === 5 && <MarketsDemo isActive={true} isInView={effectiveInView} />}
              </div>
            ) : (
              // MASAÜSTÜ: Flex + translateX ile kaydırma
              <div style={{ 
                display: 'flex', 
                transition: 'transform 0.5s ease',
                transform: `translateX(-${activeSlide * 100}%)`,
                width: '100%',
                minWidth: 0,
              }}>
                <div style={{ minWidth: '100%', width: '100%', flexShrink: 0 }}>
                  <NewsDemo key={`news-${activeSlide}`} isActive={activeSlide === 0} isInView={effectiveInView} />
                </div>
                <div style={{ minWidth: '100%', width: '100%', flexShrink: 0 }}>
                  <EventDemo key={`event-${activeSlide}`} isActive={activeSlide === 1} isInView={effectiveInView} />
                </div>
                <div style={{ minWidth: '100%', width: '100%', flexShrink: 0 }}>
                  <BreakingDemo key={`breaking-${activeSlide}`} isActive={activeSlide === 2} isInView={effectiveInView} />
                </div>
                <div style={{ minWidth: '100%', width: '100%', flexShrink: 0 }}>
                  <SentimentDemo key={`sentiment-${activeSlide}`} isActive={activeSlide === 3} isInView={effectiveInView} />
                </div>
                <div style={{ minWidth: '100%', width: '100%', flexShrink: 0 }}>
                  <TrendingDemo key={`trending-${activeSlide}`} isActive={activeSlide === 4} isInView={effectiveInView} />
                </div>
                <div style={{ minWidth: '100%', width: '100%', flexShrink: 0 }}>
                  <MarketsDemo key={`markets-${activeSlide}`} isActive={activeSlide === 5} isInView={effectiveInView} />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link href="/terminal" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.75rem', borderRadius: '10px', background: 'linear-gradient(135deg, #00f5ff 0%, #00a8ff 100%)', color: '#000', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none', boxShadow: '0 0 20px rgba(0,245,255,0.2)' }}>
            Launch FibAlgo Hub
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* Animations + slide nav scrollbar hide */}
      <style>{`
        .hub-slide-nav::-webkit-scrollbar {
          display: none;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes redSweep {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(33%); }
        }
        @keyframes softPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
