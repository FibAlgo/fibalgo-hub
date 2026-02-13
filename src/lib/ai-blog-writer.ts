/**
 * ═══════════════════════════════════════════════════════════════
 * 🤖 AI BLOG WRITER ENGINE v2 — FULL AUTOPILOT
 * ═══════════════════════════════════════════════════════════════
 * 
 * Fully autonomous blog generation system:
 * - 200+ unique keyword pool across 15 categories
 * - Deep anti-duplication: checks titles, slugs, content fingerprints
 * - Generates 1800-2500 word articles with internal links
 * - AUTO-PUBLISHES immediately (no admin approval needed)
 * - Runs 2x daily via Vercel cron (09:00 + 21:00 UTC)
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { replaceImageMarkers } from './blog-images';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function getAnthropic() {
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

// ══════════════════════════════════════════════════════════════
// AUTHOR — Always FibAlgo Team (honest, no fake personas)
// ══════════════════════════════════════════════════════════════
const AUTHOR = 'FibAlgo Team';

// ══════════════════════════════════════════════════════════════
// 200+ KEYWORD POOL — enough for 3+ years of daily posting
// ══════════════════════════════════════════════════════════════
export const KEYWORD_POOL = [
  // ── Trading Strategies (25) ─────────────────────────────
  { keyword: 'swing trading strategies', category: 'trading strategy', volume: 'high', competition: 'high' },
  { keyword: 'day trading for beginners', category: 'trading strategy', volume: 'very_high', competition: 'high' },
  { keyword: 'scalping trading strategy', category: 'trading strategy', volume: 'high', competition: 'medium' },
  { keyword: 'position trading guide', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'breakout trading strategy', category: 'trading strategy', volume: 'medium', competition: 'medium' },
  { keyword: 'mean reversion trading', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'trend following strategy', category: 'trading strategy', volume: 'medium', competition: 'medium' },
  { keyword: 'momentum trading strategy', category: 'trading strategy', volume: 'medium', competition: 'medium' },
  { keyword: 'price action trading', category: 'trading strategy', volume: 'high', competition: 'high' },
  { keyword: 'supply and demand trading', category: 'trading strategy', volume: 'high', competition: 'medium' },
  { keyword: 'gap trading strategy', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'range trading strategy', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'fade trading strategy', category: 'trading strategy', volume: 'low', competition: 'low' },
  { keyword: 'contrarian trading strategy', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'news based trading strategy', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'grid trading strategy', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'martingale trading strategy risks', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'pairs trading strategy', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'statistical arbitrage trading', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'opening range breakout strategy', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'turtle trading strategy', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'ABCD pattern trading', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'harmonic pattern trading', category: 'trading strategy', volume: 'medium', competition: 'low' },
  { keyword: 'Wyckoff method trading', category: 'trading strategy', volume: 'medium', competition: 'medium' },
  { keyword: 'order flow trading strategy', category: 'trading strategy', volume: 'medium', competition: 'low' },

  // ── Technical Analysis (25) ──────────────────────────────
  { keyword: 'RSI indicator strategy', category: 'technical analysis', volume: 'high', competition: 'medium' },
  { keyword: 'MACD trading strategy', category: 'technical analysis', volume: 'high', competition: 'medium' },
  { keyword: 'Bollinger Bands trading', category: 'technical analysis', volume: 'medium', competition: 'medium' },
  { keyword: 'moving average crossover strategy', category: 'technical analysis', volume: 'high', competition: 'medium' },
  { keyword: 'support and resistance trading', category: 'technical analysis', volume: 'high', competition: 'high' },
  { keyword: 'volume profile trading', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'VWAP trading strategy', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'ichimoku cloud trading', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'divergence trading strategy', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'Elliott Wave theory trading', category: 'technical analysis', volume: 'medium', competition: 'medium' },
  { keyword: 'stochastic oscillator strategy', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'ATR indicator trading', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'ADX indicator strategy', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'CCI indicator trading', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'parabolic SAR strategy', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'Keltner channel trading', category: 'technical analysis', volume: 'low', competition: 'low' },
  { keyword: 'Donchian channel breakout', category: 'technical analysis', volume: 'low', competition: 'low' },
  { keyword: 'on balance volume OBV trading', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'money flow index strategy', category: 'technical analysis', volume: 'low', competition: 'low' },
  { keyword: 'Williams %R indicator', category: 'technical analysis', volume: 'low', competition: 'low' },
  { keyword: 'pivot points trading strategy', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'Heikin Ashi trading strategy', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'Renko chart trading strategy', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'multiple timeframe analysis guide', category: 'technical analysis', volume: 'medium', competition: 'low' },
  { keyword: 'candlestick patterns cheat sheet', category: 'technical analysis', volume: 'high', competition: 'medium' },

  // ── Chart Patterns (15) ──────────────────────────────────
  { keyword: 'head and shoulders pattern trading', category: 'chart patterns', volume: 'high', competition: 'medium' },
  { keyword: 'double top double bottom pattern', category: 'chart patterns', volume: 'medium', competition: 'medium' },
  { keyword: 'triangle pattern trading', category: 'chart patterns', volume: 'medium', competition: 'low' },
  { keyword: 'flag and pennant pattern', category: 'chart patterns', volume: 'medium', competition: 'low' },
  { keyword: 'cup and handle pattern trading', category: 'chart patterns', volume: 'medium', competition: 'low' },
  { keyword: 'wedge pattern trading strategy', category: 'chart patterns', volume: 'medium', competition: 'low' },
  { keyword: 'bullish engulfing pattern', category: 'chart patterns', volume: 'medium', competition: 'low' },
  { keyword: 'doji candlestick meaning', category: 'chart patterns', volume: 'medium', competition: 'low' },
  { keyword: 'morning star evening star pattern', category: 'chart patterns', volume: 'low', competition: 'low' },
  { keyword: 'shooting star hammer candlestick', category: 'chart patterns', volume: 'medium', competition: 'low' },
  { keyword: 'three white soldiers pattern', category: 'chart patterns', volume: 'low', competition: 'low' },
  { keyword: 'channel pattern trading', category: 'chart patterns', volume: 'low', competition: 'low' },
  { keyword: 'inverse head and shoulders', category: 'chart patterns', volume: 'medium', competition: 'low' },
  { keyword: 'broadening pattern trading', category: 'chart patterns', volume: 'low', competition: 'low' },
  { keyword: 'rectangle pattern breakout', category: 'chart patterns', volume: 'low', competition: 'low' },

  // ── Crypto (30) ──────────────────────────────────────────
  { keyword: 'altcoin trading strategy', category: 'crypto', volume: 'high', competition: 'medium' },
  { keyword: 'crypto swing trading', category: 'crypto', volume: 'medium', competition: 'medium' },
  { keyword: 'Bitcoin trading strategies', category: 'crypto', volume: 'very_high', competition: 'high' },
  { keyword: 'Ethereum trading guide', category: 'crypto', volume: 'high', competition: 'medium' },
  { keyword: 'crypto bear market strategy', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'crypto bull market strategy', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'meme coin trading strategy', category: 'crypto', volume: 'high', competition: 'medium' },
  { keyword: 'crypto futures trading guide', category: 'crypto', volume: 'high', competition: 'medium' },
  { keyword: 'crypto leverage trading risks', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'tokenomics analysis guide', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'Solana trading strategy', category: 'crypto', volume: 'high', competition: 'medium' },
  { keyword: 'crypto day trading tips', category: 'crypto', volume: 'high', competition: 'medium' },
  { keyword: 'crypto tax guide for traders', category: 'crypto', volume: 'high', competition: 'medium' },
  { keyword: 'crypto whale tracking strategy', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'crypto arbitrage opportunities', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'crypto market making strategy', category: 'crypto', volume: 'low', competition: 'low' },
  { keyword: 'Layer 2 crypto investing guide', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'NFT trading strategy guide', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'crypto ICO IDO evaluation', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'Bitcoin dominance trading strategy', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'crypto order book analysis', category: 'crypto', volume: 'low', competition: 'low' },
  { keyword: 'crypto funding rate strategy', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'crypto airdrop farming guide', category: 'crypto', volume: 'high', competition: 'medium' },
  { keyword: 'stablecoin yield strategies', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'cross chain bridge guide', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'crypto portfolio tracker tools', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'Bitcoin ETF trading strategy', category: 'crypto', volume: 'high', competition: 'medium' },
  { keyword: 'crypto on chain analysis tools', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'decentralized exchange DEX trading', category: 'crypto', volume: 'medium', competition: 'low' },
  { keyword: 'crypto perpetual futures explained', category: 'crypto', volume: 'medium', competition: 'low' },

  // ── Forex (20) ───────────────────────────────────────────
  { keyword: 'forex trading for beginners', category: 'forex', volume: 'very_high', competition: 'high' },
  { keyword: 'forex scalping strategy', category: 'forex', volume: 'high', competition: 'medium' },
  { keyword: 'forex news trading', category: 'forex', volume: 'medium', competition: 'medium' },
  { keyword: 'forex carry trade strategy', category: 'forex', volume: 'medium', competition: 'low' },
  { keyword: 'currency pair correlation trading', category: 'forex', volume: 'medium', competition: 'low' },
  { keyword: 'forex risk reward ratio', category: 'forex', volume: 'medium', competition: 'low' },
  { keyword: 'best forex pairs to trade', category: 'forex', volume: 'high', competition: 'medium' },
  { keyword: 'forex session times strategy', category: 'forex', volume: 'medium', competition: 'low' },
  { keyword: 'forex lot size calculator guide', category: 'forex', volume: 'medium', competition: 'low' },
  { keyword: 'forex hedging strategy', category: 'forex', volume: 'medium', competition: 'low' },
  { keyword: 'forex pip value explained', category: 'forex', volume: 'medium', competition: 'low' },
  { keyword: 'forex spread trading strategy', category: 'forex', volume: 'low', competition: 'low' },
  { keyword: 'forex breakout strategy London', category: 'forex', volume: 'medium', competition: 'low' },
  { keyword: 'EURUSD trading strategy', category: 'forex', volume: 'high', competition: 'medium' },
  { keyword: 'GBPUSD trading strategy', category: 'forex', volume: 'medium', competition: 'low' },
  { keyword: 'USDJPY trading strategy', category: 'forex', volume: 'medium', competition: 'low' },
  { keyword: 'gold XAUUSD trading strategy', category: 'forex', volume: 'high', competition: 'medium' },
  { keyword: 'forex fundamental analysis guide', category: 'forex', volume: 'medium', competition: 'medium' },
  { keyword: 'forex interest rate impact', category: 'forex', volume: 'medium', competition: 'low' },
  { keyword: 'forex central bank trading', category: 'forex', volume: 'low', competition: 'low' },

  // ── AI & Automation (20) ─────────────────────────────────
  { keyword: 'automated trading systems', category: 'AI & automation', volume: 'high', competition: 'medium' },
  { keyword: 'trading bot strategies', category: 'AI & automation', volume: 'high', competition: 'medium' },
  { keyword: 'backtesting trading strategies', category: 'AI & automation', volume: 'medium', competition: 'medium' },
  { keyword: 'quantitative trading for beginners', category: 'AI & automation', volume: 'medium', competition: 'low' },
  { keyword: 'algorithmic trading Python', category: 'AI & automation', volume: 'high', competition: 'medium' },
  { keyword: 'AI stock prediction accuracy', category: 'AI & automation', volume: 'medium', competition: 'low' },
  { keyword: 'machine learning stock market', category: 'AI & automation', volume: 'high', competition: 'medium' },
  { keyword: 'natural language processing trading', category: 'AI & automation', volume: 'low', competition: 'low' },
  { keyword: 'reinforcement learning trading', category: 'AI & automation', volume: 'low', competition: 'low' },
  { keyword: 'sentiment analysis trading bots', category: 'AI & automation', volume: 'medium', competition: 'low' },
  { keyword: 'high frequency trading explained', category: 'AI & automation', volume: 'medium', competition: 'medium' },
  { keyword: 'AI portfolio management tools', category: 'AI & automation', volume: 'medium', competition: 'low' },
  { keyword: 'neural network price prediction', category: 'AI & automation', volume: 'medium', competition: 'low' },
  { keyword: 'API trading automation guide', category: 'AI & automation', volume: 'medium', competition: 'low' },
  { keyword: 'custom trading indicator development', category: 'AI & automation', volume: 'medium', competition: 'low' },
  { keyword: 'trading algorithm optimization', category: 'AI & automation', volume: 'low', competition: 'low' },
  { keyword: 'paper trading practice guide', category: 'AI & automation', volume: 'medium', competition: 'low' },
  { keyword: 'walk forward analysis trading', category: 'AI & automation', volume: 'low', competition: 'low' },
  { keyword: 'Monte Carlo simulation trading', category: 'AI & automation', volume: 'low', competition: 'low' },
  { keyword: 'market microstructure trading', category: 'AI & automation', volume: 'low', competition: 'low' },

  // ── Trading Psychology (15) ──────────────────────────────
  { keyword: 'trading psychology tips', category: 'psychology', volume: 'high', competition: 'medium' },
  { keyword: 'overcoming trading fear', category: 'psychology', volume: 'medium', competition: 'low' },
  { keyword: 'trading discipline strategies', category: 'psychology', volume: 'medium', competition: 'low' },
  { keyword: 'revenge trading prevention', category: 'psychology', volume: 'medium', competition: 'low' },
  { keyword: 'trading journal guide', category: 'psychology', volume: 'medium', competition: 'low' },
  { keyword: 'emotional trading mistakes', category: 'psychology', volume: 'medium', competition: 'low' },
  { keyword: 'dealing with trading losses', category: 'psychology', volume: 'medium', competition: 'low' },
  { keyword: 'FOMO in trading how to avoid', category: 'psychology', volume: 'medium', competition: 'low' },
  { keyword: 'trading mindset of millionaire traders', category: 'psychology', volume: 'medium', competition: 'low' },
  { keyword: 'overtrading how to stop', category: 'psychology', volume: 'medium', competition: 'low' },
  { keyword: 'trading routine for success', category: 'psychology', volume: 'medium', competition: 'low' },
  { keyword: 'cognitive biases in trading', category: 'psychology', volume: 'medium', competition: 'low' },
  { keyword: 'patience in trading mastery', category: 'psychology', volume: 'low', competition: 'low' },
  { keyword: 'trading burnout prevention', category: 'psychology', volume: 'low', competition: 'low' },
  { keyword: 'confidence building for traders', category: 'psychology', volume: 'low', competition: 'low' },

  // ── Market Analysis (15) ─────────────────────────────────
  { keyword: 'stock market crash protection', category: 'market analysis', volume: 'high', competition: 'medium' },
  { keyword: 'market cycle analysis', category: 'market analysis', volume: 'medium', competition: 'low' },
  { keyword: 'economic indicators for traders', category: 'market analysis', volume: 'medium', competition: 'low' },
  { keyword: 'intermarket analysis guide', category: 'market analysis', volume: 'medium', competition: 'low' },
  { keyword: 'sector rotation strategy', category: 'market analysis', volume: 'medium', competition: 'low' },
  { keyword: 'market breadth indicators', category: 'market analysis', volume: 'medium', competition: 'low' },
  { keyword: 'VIX volatility trading', category: 'market analysis', volume: 'medium', competition: 'low' },
  { keyword: 'COT report trading strategy', category: 'market analysis', volume: 'medium', competition: 'low' },
  { keyword: 'seasonal trading patterns', category: 'market analysis', volume: 'medium', competition: 'low' },
  { keyword: 'dark pool trading analysis', category: 'market analysis', volume: 'medium', competition: 'low' },
  { keyword: 'market sentiment indicators', category: 'market analysis', volume: 'medium', competition: 'medium' },
  { keyword: 'inflation trading strategies', category: 'market analysis', volume: 'medium', competition: 'low' },
  { keyword: 'recession proof trading strategies', category: 'market analysis', volume: 'medium', competition: 'low' },
  { keyword: 'correlation trading strategy stocks', category: 'market analysis', volume: 'low', competition: 'low' },
  { keyword: 'global macro trading strategy', category: 'market analysis', volume: 'medium', competition: 'low' },

  // ── TradingView (15) ─────────────────────────────────────
  { keyword: 'TradingView Pine Script tutorial', category: 'tradingview', volume: 'high', competition: 'medium' },
  { keyword: 'TradingView alerts setup guide', category: 'tradingview', volume: 'medium', competition: 'low' },
  { keyword: 'TradingView vs MetaTrader comparison', category: 'tradingview', volume: 'medium', competition: 'low' },
  { keyword: 'TradingView screener strategies', category: 'tradingview', volume: 'medium', competition: 'low' },
  { keyword: 'TradingView chart patterns detection', category: 'tradingview', volume: 'medium', competition: 'low' },
  { keyword: 'TradingView drawing tools guide', category: 'tradingview', volume: 'medium', competition: 'low' },
  { keyword: 'TradingView replay mode practice', category: 'tradingview', volume: 'low', competition: 'low' },
  { keyword: 'TradingView watchlist organization', category: 'tradingview', volume: 'low', competition: 'low' },
  { keyword: 'TradingView multi chart layout', category: 'tradingview', volume: 'medium', competition: 'low' },
  { keyword: 'TradingView paper trading guide', category: 'tradingview', volume: 'medium', competition: 'low' },
  { keyword: 'TradingView indicator overlay tips', category: 'tradingview', volume: 'low', competition: 'low' },
  { keyword: 'Pine Script custom indicator creation', category: 'tradingview', volume: 'medium', competition: 'low' },
  { keyword: 'TradingView webhook automation', category: 'tradingview', volume: 'medium', competition: 'low' },
  { keyword: 'TradingView social features strategy', category: 'tradingview', volume: 'low', competition: 'low' },
  { keyword: 'TradingView mobile app trading tips', category: 'tradingview', volume: 'medium', competition: 'low' },

  // ── Options (15) ─────────────────────────────────────────
  { keyword: 'options trading for beginners', category: 'options', volume: 'very_high', competition: 'high' },
  { keyword: 'covered call strategy guide', category: 'options', volume: 'high', competition: 'medium' },
  { keyword: 'options Greeks explained', category: 'options', volume: 'medium', competition: 'medium' },
  { keyword: 'iron condor strategy', category: 'options', volume: 'medium', competition: 'low' },
  { keyword: 'options wheel strategy', category: 'options', volume: 'medium', competition: 'low' },
  { keyword: 'cash secured put strategy', category: 'options', volume: 'medium', competition: 'low' },
  { keyword: 'bull call spread strategy', category: 'options', volume: 'medium', competition: 'low' },
  { keyword: 'bear put spread strategy', category: 'options', volume: 'medium', competition: 'low' },
  { keyword: 'straddle strangle strategy', category: 'options', volume: 'medium', competition: 'low' },
  { keyword: 'options implied volatility trading', category: 'options', volume: 'medium', competition: 'low' },
  { keyword: 'options expiration day strategy', category: 'options', volume: 'medium', competition: 'low' },
  { keyword: 'LEAPS options investing', category: 'options', volume: 'medium', competition: 'low' },
  { keyword: 'options assignment risk management', category: 'options', volume: 'low', competition: 'low' },
  { keyword: 'butterfly spread options strategy', category: 'options', volume: 'low', competition: 'low' },
  { keyword: 'calendar spread options strategy', category: 'options', volume: 'low', competition: 'low' },

  // ── Risk Management (12) ─────────────────────────────────
  { keyword: 'position sizing calculator guide', category: 'risk management', volume: 'medium', competition: 'low' },
  { keyword: 'stop loss strategies for traders', category: 'risk management', volume: 'high', competition: 'medium' },
  { keyword: 'trailing stop loss guide', category: 'risk management', volume: 'medium', competition: 'low' },
  { keyword: 'risk of ruin calculator trading', category: 'risk management', volume: 'low', competition: 'low' },
  { keyword: 'Kelly criterion position sizing', category: 'risk management', volume: 'low', competition: 'low' },
  { keyword: 'maximum drawdown management', category: 'risk management', volume: 'medium', competition: 'low' },
  { keyword: 'risk per trade percentage guide', category: 'risk management', volume: 'medium', competition: 'low' },
  { keyword: 'hedging strategies for portfolios', category: 'risk management', volume: 'medium', competition: 'medium' },
  { keyword: 'correlation risk in trading', category: 'risk management', volume: 'low', competition: 'low' },
  { keyword: 'tail risk management trading', category: 'risk management', volume: 'low', competition: 'low' },
  { keyword: 'volatility based position sizing', category: 'risk management', volume: 'low', competition: 'low' },
  { keyword: 'risk management plan template', category: 'risk management', volume: 'medium', competition: 'low' },

  // ── Passive Income & Investing (15) ──────────────────────
  { keyword: 'passive income with trading', category: 'passive income', volume: 'high', competition: 'medium' },
  { keyword: 'dividend investing strategy', category: 'passive income', volume: 'high', competition: 'high' },
  { keyword: 'copy trading guide', category: 'passive income', volume: 'high', competition: 'medium' },
  { keyword: 'crypto staking guide', category: 'passive income', volume: 'high', competition: 'medium' },
  { keyword: 'value investing for beginners', category: 'passive income', volume: 'high', competition: 'high' },
  { keyword: 'growth investing strategy', category: 'passive income', volume: 'medium', competition: 'medium' },
  { keyword: 'index fund investing guide', category: 'passive income', volume: 'high', competition: 'high' },
  { keyword: 'dollar cost averaging strategy', category: 'passive income', volume: 'high', competition: 'medium' },
  { keyword: 'REITs investing for beginners', category: 'passive income', volume: 'medium', competition: 'medium' },
  { keyword: 'bond investing strategy guide', category: 'passive income', volume: 'medium', competition: 'medium' },
  { keyword: 'compound interest investing power', category: 'passive income', volume: 'medium', competition: 'low' },
  { keyword: 'robo advisor vs self investing', category: 'passive income', volume: 'medium', competition: 'low' },
  { keyword: 'retirement portfolio strategy', category: 'passive income', volume: 'medium', competition: 'medium' },
  { keyword: 'ESG investing guide', category: 'passive income', volume: 'medium', competition: 'low' },
  { keyword: 'fractional shares investing', category: 'passive income', volume: 'medium', competition: 'low' },

  // ── Portfolio Management (10) ────────────────────────────
  { keyword: 'portfolio diversification strategy', category: 'portfolio', volume: 'high', competition: 'medium' },
  { keyword: 'asset allocation for traders', category: 'portfolio', volume: 'medium', competition: 'low' },
  { keyword: 'rebalancing portfolio strategy', category: 'portfolio', volume: 'medium', competition: 'low' },
  { keyword: 'hedge fund strategies explained', category: 'portfolio', volume: 'medium', competition: 'medium' },
  { keyword: 'modern portfolio theory practical', category: 'portfolio', volume: 'medium', competition: 'low' },
  { keyword: 'Sharpe ratio portfolio optimization', category: 'portfolio', volume: 'low', competition: 'low' },
  { keyword: 'multi asset portfolio construction', category: 'portfolio', volume: 'medium', competition: 'low' },
  { keyword: 'tactical asset allocation strategy', category: 'portfolio', volume: 'low', competition: 'low' },
  { keyword: 'barbell portfolio strategy', category: 'portfolio', volume: 'low', competition: 'low' },
  { keyword: 'all weather portfolio strategy', category: 'portfolio', volume: 'medium', competition: 'low' },

  // ── Stock Trading (15) ───────────────────────────────────
  { keyword: 'penny stock trading guide', category: 'stocks', volume: 'high', competition: 'high' },
  { keyword: 'blue chip stocks investing', category: 'stocks', volume: 'medium', competition: 'medium' },
  { keyword: 'earnings season trading strategy', category: 'stocks', volume: 'medium', competition: 'low' },
  { keyword: 'pre market trading strategy', category: 'stocks', volume: 'medium', competition: 'low' },
  { keyword: 'after hours trading guide', category: 'stocks', volume: 'medium', competition: 'low' },
  { keyword: 'IPO trading strategy guide', category: 'stocks', volume: 'medium', competition: 'low' },
  { keyword: 'stock screener setup guide', category: 'stocks', volume: 'medium', competition: 'low' },
  { keyword: 'sector ETF trading strategy', category: 'stocks', volume: 'medium', competition: 'low' },
  { keyword: 'short selling stocks guide', category: 'stocks', volume: 'medium', competition: 'medium' },
  { keyword: 'stock market hours trading tips', category: 'stocks', volume: 'medium', competition: 'low' },
  { keyword: 'growth stock picking strategy', category: 'stocks', volume: 'medium', competition: 'medium' },
  { keyword: 'value stock screening criteria', category: 'stocks', volume: 'medium', competition: 'low' },
  { keyword: 'stock buyback impact trading', category: 'stocks', volume: 'low', competition: 'low' },
  { keyword: 'insider trading signals legal', category: 'stocks', volume: 'medium', competition: 'low' },
  { keyword: 'stock split trading strategy', category: 'stocks', volume: 'medium', competition: 'low' },

  // ── DeFi & Web3 (15) ─────────────────────────────────────
  { keyword: 'DeFi lending platforms comparison', category: 'defi', volume: 'medium', competition: 'low' },
  { keyword: 'liquidity pool impermanent loss', category: 'defi', volume: 'medium', competition: 'low' },
  { keyword: 'automated market maker AMM guide', category: 'defi', volume: 'medium', competition: 'low' },
  { keyword: 'DeFi flash loan explained', category: 'defi', volume: 'medium', competition: 'low' },
  { keyword: 'yield aggregator protocols', category: 'defi', volume: 'low', competition: 'low' },
  { keyword: 'DeFi insurance protocols guide', category: 'defi', volume: 'low', competition: 'low' },
  { keyword: 'decentralized derivatives trading', category: 'defi', volume: 'low', competition: 'low' },
  { keyword: 'DAO governance token investing', category: 'defi', volume: 'low', competition: 'low' },
  { keyword: 'real world assets RWA crypto', category: 'defi', volume: 'medium', competition: 'low' },
  { keyword: 'liquid staking derivatives guide', category: 'defi', volume: 'medium', competition: 'low' },
  { keyword: 'DeFi security audit importance', category: 'defi', volume: 'low', competition: 'low' },
  { keyword: 'cross chain DeFi strategies', category: 'defi', volume: 'low', competition: 'low' },
  { keyword: 'DeFi portfolio management tools', category: 'defi', volume: 'low', competition: 'low' },
  { keyword: 'perpetual DEX trading guide', category: 'defi', volume: 'medium', competition: 'low' },
  { keyword: 'restaking protocols explained', category: 'defi', volume: 'medium', competition: 'low' },

  // ── Beginner Guides (15) ─────────────────────────────────
  { keyword: 'how to start trading with 100 dollars', category: 'beginner', volume: 'very_high', competition: 'high' },
  { keyword: 'best books for learning trading', category: 'beginner', volume: 'high', competition: 'medium' },
  { keyword: 'trading account types explained', category: 'beginner', volume: 'medium', competition: 'low' },
  { keyword: 'market order vs limit order', category: 'beginner', volume: 'high', competition: 'medium' },
  { keyword: 'bid ask spread explained', category: 'beginner', volume: 'medium', competition: 'low' },
  { keyword: 'how to read stock charts beginners', category: 'beginner', volume: 'high', competition: 'medium' },
  { keyword: 'trading vs investing differences', category: 'beginner', volume: 'high', competition: 'medium' },
  { keyword: 'what is leverage in trading', category: 'beginner', volume: 'high', competition: 'medium' },
  { keyword: 'margin trading explained simply', category: 'beginner', volume: 'medium', competition: 'low' },
  { keyword: 'best trading platforms comparison', category: 'beginner', volume: 'very_high', competition: 'high' },
  { keyword: 'demo account trading practice', category: 'beginner', volume: 'medium', competition: 'low' },
  { keyword: 'trading terminology glossary', category: 'beginner', volume: 'medium', competition: 'low' },
  { keyword: 'how to choose a broker guide', category: 'beginner', volume: 'high', competition: 'medium' },
  { keyword: 'trading timeframes explained', category: 'beginner', volume: 'medium', competition: 'low' },
  { keyword: 'first trading plan template', category: 'beginner', volume: 'medium', competition: 'low' },
];

// ══════════════════════════════════════════════════════════════
// TOPIC CLUSTER STRATEGY
// Each cluster has a PILLAR topic (comprehensive guide) and 
// CHILD topics that link back to the pillar.
// This improves topical authority and internal linking for SEO.
// ══════════════════════════════════════════════════════════════
interface TopicCluster {
  id: string;
  name: string;
  pillarKeyword: string;       // The main keyword for the pillar article
  pillarSlug: string;          // Expected slug of pillar article
  categories: string[];        // Which keyword categories belong to this cluster
  relatedClusters: string[];   // IDs of related clusters for cross-linking
}

const TOPIC_CLUSTERS: TopicCluster[] = [
  {
    id: 'technical-analysis',
    name: 'Technical Analysis Mastery',
    pillarKeyword: 'technical analysis crypto trading',
    pillarSlug: 'technical-analysis-crypto-trading',
    categories: ['technical analysis', 'chart patterns', 'trading strategy', 'tradingview'],
    relatedClusters: ['risk-management', 'ai-trading'],
  },
  {
    id: 'crypto-trading',
    name: 'Crypto Trading Complete Guide',
    pillarKeyword: 'Bitcoin trading strategies',
    pillarSlug: 'bitcoin-trading-strategies-complete-guide',
    categories: ['crypto', 'defi'],
    relatedClusters: ['technical-analysis', 'risk-management'],
  },
  {
    id: 'forex-mastery',
    name: 'Forex Trading Mastery',
    pillarKeyword: 'forex trading for beginners',
    pillarSlug: 'forex-trading-for-beginners',
    categories: ['forex'],
    relatedClusters: ['technical-analysis', 'risk-management'],
  },
  {
    id: 'ai-trading',
    name: 'AI & Algorithmic Trading',
    pillarKeyword: 'automated trading systems',
    pillarSlug: 'automated-trading-systems',
    categories: ['AI & automation'],
    relatedClusters: ['technical-analysis', 'crypto-trading'],
  },
  {
    id: 'risk-management',
    name: 'Risk Management & Psychology',
    pillarKeyword: 'stop loss strategies for traders',
    pillarSlug: 'stop-loss-strategies-for-traders',
    categories: ['risk management', 'psychology'],
    relatedClusters: ['technical-analysis', 'crypto-trading'],
  },
  {
    id: 'investing',
    name: 'Investing & Portfolio Building',
    pillarKeyword: 'portfolio diversification strategy',
    pillarSlug: 'portfolio-diversification-strategy',
    categories: ['passive income', 'portfolio', 'stocks', 'options'],
    relatedClusters: ['risk-management', 'crypto-trading'],
  },
  {
    id: 'beginner',
    name: 'Trading for Beginners',
    pillarKeyword: 'how to start trading with 100 dollars',
    pillarSlug: 'how-to-start-trading-with-100-dollars',
    categories: ['beginner', 'market analysis'],
    relatedClusters: ['technical-analysis', 'risk-management'],
  },
];

function getClusterForCategory(category: string): TopicCluster | undefined {
  return TOPIC_CLUSTERS.find(c => c.categories.includes(category));
}

// ══════════════════════════════════════════════════════════════
// Internal pages for AI to naturally link to
// ══════════════════════════════════════════════════════════════
const INTERNAL_LINKS = [
  { url: '/library', anchor: "FibAlgo's AI-powered indicators", context: 'indicator features' },
  { url: '/library', anchor: 'our indicator library', context: 'view all indicators' },
  { url: '/library', anchor: 'advanced AI trading tools', context: 'AI tools' },
  { url: '/#pricing', anchor: 'Get Started Free', context: 'pricing plans' },
  { url: '/#pricing', anchor: "FibAlgo's pricing plans", context: 'subscription options' },
  { url: '/#pricing', anchor: 'try FibAlgo risk-free', context: 'free trial' },
  { url: '/about', anchor: 'About FibAlgo', context: 'company info' },
  { url: '/community', anchor: 'FibAlgo trading community', context: 'join traders' },
  { url: '/community', anchor: 'join 10,000+ traders', context: 'community' },
  { url: '/education', anchor: 'our trading education', context: 'more articles' },
];

// ══════════════════════════════════════════════════════════════
// CONTENT FINGERPRINTING — prevents semantic duplication
// ══════════════════════════════════════════════════════════════
function generateContentFingerprint(title: string, keyword: string, tags: string[]): string {
  return `${title.toLowerCase().trim()}|${keyword.toLowerCase().trim()}|${tags.sort().join(',')}`;
}

// ══════════════════════════════════════════════════════════════
// MAIN: Generate + Auto-Publish a blog post
// ══════════════════════════════════════════════════════════════
export async function generateAndAutoPublish(): Promise<{
  success: boolean;
  slug?: string;
  title?: string;
  wordCount?: number;
  keyword?: string;
  error?: string;
}> {
  const supabase = getSupabase();

  try {
    // ── 1. DEEP ANTI-DUPLICATION CHECK ──────────────────────
    const { data: existingPosts } = await supabase
      .from('blog_posts')
      .select('slug, title, target_keyword, tags, content')
      .order('created_at', { ascending: false });

    const existingTopics = (existingPosts || []).map(p => ({
      slug: p.slug,
      title: p.title,
      keyword: p.target_keyword,
      tags: p.tags || [],
      contentPreview: (p.content || '').replace(/<[^>]*>/g, '').slice(0, 200).toLowerCase(),
    }));

    const usedSlugs = new Set(existingTopics.map(p => p.slug));
    const usedTitles = new Set(existingTopics.map(p => p.title.toLowerCase()));
    const usedKeywords = new Set(existingTopics.map(p => p.keyword?.toLowerCase()).filter(Boolean));
    const usedFingerprints = new Set(
      existingTopics.map(p => generateContentFingerprint(p.title, p.keyword || '', p.tags))
    );

    // Static blog posts already covered
    const staticUsed = [
      'fibonacci trading strategy', 'AI trading indicators', 'smart money concepts',
      'risk management crypto trading', 'technical analysis crypto',
      'crypto market sentiment analysis', 'best TradingView indicators',
      'crypto trading mistakes', 'DeFi yield farming', 'Bitcoin halving',
    ];
    staticUsed.forEach(k => usedKeywords.add(k.toLowerCase()));

    const { data: dbKeywords } = await supabase
      .from('blog_keywords')
      .select('keyword')
      .eq('status', 'used');
    (dbKeywords || []).forEach(k => usedKeywords.add(k.keyword.toLowerCase()));

    // ── 2. PICK UNUSED KEYWORD (pool + AI fallback) ────────
    const availableKeywords = KEYWORD_POOL.filter(k =>
      !usedKeywords.has(k.keyword.toLowerCase())
    );

    let chosen: { keyword: string; category: string; volume: string; competition: string };

    if (availableKeywords.length > 0) {
      // Pool'da keyword var — akıllı öncelikleme ile seç
      const prioritized = availableKeywords
        .map(k => {
          const volScore: Record<string, number> = { very_high: 5, high: 4, medium: 3, low: 2 };
          const compScore: Record<string, number> = { low: 4, medium: 2, high: 1 };
          const score = (volScore[k.volume] || 2) + (compScore[k.competition] || 1) + Math.random() * 2;
          return { ...k, score };
        })
        .sort((a, b) => b.score - a.score);
      chosen = prioritized[0];
      console.log(`[AI Blog] Pool keyword: "${chosen.keyword}" (${availableKeywords.length} remaining)`);
    } else {
      // Pool bitti — AI'dan yeni keyword üret
      console.log(`[AI Blog] Pool exhausted (${KEYWORD_POOL.length} used). AI generating fresh keyword...`);
      const anthropic = getAnthropic();
      const usedList = Array.from(usedKeywords).slice(0, 300).join('\n- ');
      const categories = [...new Set(KEYWORD_POOL.map(k => k.category))].join(', ');

      const kwStream = anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 1,
        thinking: { type: 'enabled', budget_tokens: 2000 },
        system: `You are an SEO keyword research expert for a trading/finance blog. Generate ONE unique long-tail keyword that hasn't been used before. Return ONLY valid JSON.`,
        messages: [{
          role: 'user',
          content: `Generate 1 new SEO keyword for a trading/finance blog.

CATEGORIES: ${categories}

ALREADY USED KEYWORDS (DO NOT repeat or rephrase any of these):
- ${usedList}

Requirements:
- Long-tail keyword (3-6 words)
- Related to trading, investing, crypto, forex, stocks, or fintech
- Has real search intent — people actually search for this
- NOT a rephrasing of any used keyword
- English only

Return ONLY this JSON:
{"keyword": "your new keyword here", "category": "closest category", "volume": "medium", "competition": "low"}`
        }],
      });
      const kwResponse = await kwStream.finalMessage();

      // Skip thinking blocks, find the text block
      const kwText = kwResponse.content.find((block: { type: string }) => block.type === 'text');
      if (!kwText || kwText.type !== 'text') {
        return { success: false, error: 'AI keyword generation returned non-text' };
      }
      try {
        let kwJson = kwText.text.trim();
        if (kwJson.startsWith('```json')) kwJson = kwJson.slice(7);
        else if (kwJson.startsWith('```')) kwJson = kwJson.slice(3);
        if (kwJson.endsWith('```')) kwJson = kwJson.slice(0, -3);
        const parsed = JSON.parse(kwJson.trim());
        if (!parsed.keyword || usedKeywords.has(parsed.keyword.toLowerCase())) {
          return { success: false, error: 'AI generated a duplicate keyword, retrying next cycle' };
        }
        chosen = {
          keyword: parsed.keyword,
          category: parsed.category || 'general',
          volume: parsed.volume || 'medium',
          competition: parsed.competition || 'low',
        };
        console.log(`[AI Blog] AI-generated keyword: "${chosen.keyword}" (category: ${chosen.category})`);
      } catch {
        return { success: false, error: 'Failed to parse AI keyword JSON' };
      }
    }

    // ── 3. BUILD CONTEXT ────────────────────────────────────
    const shuffledLinks = [...INTERNAL_LINKS].sort(() => Math.random() - 0.5).slice(0, 4);

    // ── 3b. TOPIC CLUSTER LINKING ───────────────────────────
    const currentCluster = getClusterForCategory(chosen.category);
    
    const { data: recentPublished } = await supabase
      .from('blog_posts')
      .select('slug, title, target_keyword, tags')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(30);

    // Build cluster-aware cross-links
    const allPublished = recentPublished || [];
    
    // Get posts from the same cluster (high priority for linking)
    let clusterPosts: Array<{slug: string; title: string}> = [];
    if (currentCluster) {
      clusterPosts = allPublished
        .filter(p => {
          const pCluster = KEYWORD_POOL.find(k => k.keyword.toLowerCase() === p.target_keyword?.toLowerCase());
          if (!pCluster) return false;
          return currentCluster.categories.includes(pCluster.category);
        })
        .map(p => ({ slug: p.slug, title: p.title }));
    }

    // Get posts from related clusters
    let relatedClusterPosts: Array<{slug: string; title: string}> = [];
    if (currentCluster) {
      const relatedCategories = currentCluster.relatedClusters
        .flatMap(id => TOPIC_CLUSTERS.find(c => c.id === id)?.categories || []);
      relatedClusterPosts = allPublished
        .filter(p => {
          const pCluster = KEYWORD_POOL.find(k => k.keyword.toLowerCase() === p.target_keyword?.toLowerCase());
          if (!pCluster) return false;
          return relatedCategories.includes(pCluster.category);
        })
        .map(p => ({ slug: p.slug, title: p.title }))
        .slice(0, 5);
    }

    const blogCrossLinks = [
      // Cluster posts first (same topic cluster — highest SEO value)
      ...clusterPosts.slice(0, 5),
      // Related cluster posts next
      ...relatedClusterPosts.slice(0, 3),
      // Then remaining recent posts
      ...allPublished
        .filter(p => !clusterPosts.some(cp => cp.slug === p.slug) && !relatedClusterPosts.some(rp => rp.slug === p.slug))
        .slice(0, 5)
        .map(p => ({ slug: p.slug, title: p.title })),
      // Static fallbacks
      { slug: 'fibonacci-trading-strategy-complete-guide', title: 'Fibonacci Trading Strategy Guide' },
      { slug: 'ai-trading-indicators-machine-learning-guide', title: 'AI Trading Indicators Guide' },
      { slug: 'smart-money-concepts-trading', title: 'Smart Money Concepts' },
      { slug: 'risk-management-crypto-trading', title: 'Risk Management in Crypto' },
      { slug: 'technical-analysis-crypto-trading', title: 'Technical Analysis for Crypto' },
      { slug: 'best-tradingview-indicators-2026', title: 'Best TradingView Indicators' },
      { slug: 'crypto-trading-mistakes', title: 'Crypto Trading Mistakes' },
    ];

    const uniqueLinks = new Map<string, string>();
    blogCrossLinks.forEach(l => { if (!uniqueLinks.has(l.slug)) uniqueLinks.set(l.slug, l.title); });
    const blogLinksForAI = Array.from(uniqueLinks.entries())
      .slice(0, 10)
      .map(([slug, title]) => `<a href="/education/${slug}">${title}</a>`)
      .join('\n');

    const existingTitleList = existingTopics
      .slice(0, 50)
      .map(p => `- "${p.title}" [keyword: ${p.keyword || 'N/A'}]`)
      .join('\n');

    // ── 4. ADVANCED AI PROMPT ───────────────────────────────
    const anthropic = getAnthropic();
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const systemPrompt = `You are an editorial writer for FibAlgo (fibalgo.com), an AI-powered trading indicator platform for TradingView. You write as "FibAlgo Team" — a research-oriented editorial voice. You are NOT a person. You do NOT have personal trading experience. You do NOT tell personal stories. You are a research desk that analyzes, explains, and educates.

Today's date: ${currentDate}.

═══ ABSOLUTE RULES ═══
1. Write ONLY in English — no other language ever
2. Article MUST be 2000-2500 words — AIM FOR 2200+ WORDS. Under 1800 words is UNACCEPTABLE. Count carefully.
3. 100% ORIGINAL content — never copy/paraphrase existing articles
4. Every article must have a UNIQUE angle, even on similar topics
5. Target keyword must appear 4-7 times naturally (NOT keyword stuffed)
6. Include LSI (semantically related) keywords throughout
7. Address the reader as "you" — educational but not condescending
8. Use real, verifiable data ONLY — NEVER invent statistics, percentages, or study results. If you don't know the exact number, say so or describe qualitatively
9. Every section must have actionable takeaways
10. End with a brief, natural mention of FibAlgo — 1 sentence max, not salesy
11. Avoid hype language — no "financial suicide", "elite 10%", "game-changer", "explosive gains"

═══ VOICE & TONE — CRITICAL (READ CAREFULLY) ═══
You are an EDITORIAL RESEARCH TEAM, not a person. Follow these rules:

1. NEVER USE FIRST PERSON:
   - NO "I", "me", "my", "I've", "I'm", "my experience"
   - NO "We've seen", "We believe", "In our experience"
   - NO fake personal anecdotes: "I watched a trader...", "Early in my career...", "I remember when..."
   - Instead use: "Traders often find that...", "Research suggests...", "Data shows...", "A common pattern is..."

2. NEVER FAKE PERSONAL STORIES:
   - NO "Three months ago, I watched..."
   - NO "Let me paint you a picture..."
   - NO "After getting burned enough times..."
   - NO "Here's something that'll make you paranoid..."
   - These are obvious AI storytelling patterns. NEVER use them.

3. TONE: Think Bloomberg, Reuters, Investopedia — authoritative journalism:
   - State facts, cite sources, present analysis
   - Use third person: "Traders who use this approach tend to..."
   - Be direct and specific, not dramatic
   - Use conditional language when appropriate: "This tends to work when...", "Evidence suggests..."
   - It's OK to have editorial opinions, but frame them as analysis: "This approach has significant drawbacks" not "I hate this approach"

═══ ARTICLE STRUCTURE ═══
Vary structure across articles. Do NOT repeat the same template. Options:

A. Research Analysis: Present findings → Evidence → Counter-evidence → Practical application → Summary
B. Problem-Solution: Define the problem clearly → Why common solutions fail → What the data says → Better approach → Implementation
C. Comparative Analysis: Method A explained → Method B explained → Data comparison → When each works → Recommendation
D. Progressive Guide: Fundamentals → Intermediate concepts → Advanced application → Edge cases → Checklist
E. Myth vs Reality: Common belief → Why it persists → What research actually shows → Correct approach → Verification methods

Vary section counts (5-8 sections). Each section should have a distinct purpose. No filler.

═══ SOURCES & CREDIBILITY (E-E-A-T) ═══
You MUST include real, verifiable references. This is non-negotiable:

1. CITE REAL SOURCES (3-5 per article):
   - Real books: "Mark Douglas's 'Trading in the Zone' (1999)" / "Edwin Lefevre's 'Reminiscences of a Stock Operator' (1923)"
   - Real institutions with real data: "According to CME Group data...", "The Federal Reserve's FOMC minutes indicate...", "CBOE's VIX index shows..."
   - Real platforms: "TradingView's built-in screener", "Bloomberg Terminal data"
   - Real well-known traders with VERIFIED quotes only — do not invent quotes
   - Academic sources only if you're CERTAIN they exist

2. DATA ANCHORING — use well-known, verifiable facts:
   - "The S&P 500's historical average annual return of roughly 10%"
   - "During the March 2020 COVID crash, the S&P 500 fell 34% in 23 trading days"
   - "The FTX collapse in November 2022 wiped out an estimated $8 billion in customer funds"
   - "Bitcoin's block reward halving occurs approximately every 4 years"

3. NEVER DO:
   - Invent statistics: NO "73% of traders lose money" (unless citing a specific, real source)
   - Make up studies: NO "A 2024 study found that..."
   - Fabricate quotes from real people
   - Claim specific recent prices you can't verify

═══ CONTENT DEPTH ═══
Every section must go beyond the obvious:

TOO SHALLOW: "RSI above 70 means overbought, below 30 means oversold."

GOOD DEPTH: "RSI's default 70/30 thresholds were calibrated for daily stock charts in the 1970s. In trending markets — particularly crypto on lower timeframes — these levels generate frequent false signals. Some traders adjust to 80/20 in strong trends or rely on RSI divergences rather than absolute levels. The indicator's value depends heavily on the asset, timeframe, and market regime."

For every section: if a beginner tutorial already covers it, go deeper or find a less obvious angle.

═══ ANTI-AI-DETECTION — MOST CRITICAL SECTION ═══
Google detects and penalizes AI content. These rules are mandatory:

BANNED WORDS & PHRASES (NEVER use — instant AI detection):
- "comprehensive" / "robust" / "cutting-edge" / "game-changer" / "paradigm"
- "delve" / "delve into" / "deep dive" / "dive into" / "unpack"
- "tapestry" / "multifaceted" / "realm" / "landscape" / "arena" (metaphorical)
- "unleash" / "unlock" / "empower" / "leverage" (as verb meaning "use")
- "seamlessly" / "effortlessly" / "it's worth noting" / "notably"
- "at its core" / "in today's" / "the bottom line is" / "at the end of the day"
- "Whether you're a beginner or..." / "Whether you're new to..."
- "Let's explore" / "Let's dive in" / "Let's break this down"
- "navigate the complexities" / "navigate the world of"
- "In conclusion" / "To sum up" / "In summary" / "Wrapping up"
- "journey" (metaphorical) / "game-changer" / "the landscape"
- "Moreover" / "Furthermore" / "Additionally" as paragraph starters
- "Here's the uncomfortable truth" / "Here's the thing" / "Here's what nobody tells you"
- "Let me be clear" / "Let me paint you a picture" / "Let me explain"
- "The dirty secret" / "The real secret" / "What they don't tell you"
- "Fair warning" / "Spoiler alert" / "Not gonna lie" / "Full disclosure"
- "Here's something that'll..." / "Here's why that matters"
- "If you're like most traders..." / "If you've ever wondered..."
- "The truth is" / "The reality is" / "The fact of the matter"

BANNED PATTERNS (structural AI tells):
- Starting 3+ paragraphs with the same word
- Every section starting with a question
- Numbered "step" lists where every step has exactly the same format
- Perfectly symmetrical section lengths
- Dramatic one-word sentences for effect: "Period." "Full stop."
- Fake enthusiasm: "This is where it gets exciting" / "This is fascinating"
- Fake authority: "After years of..." / "In my decades of..."

WRITING NATURALLY:
- Vary paragraph lengths: some 1 sentence, some 4-5 sentences. Never 5+ paragraphs of similar length in a row.
- Vary sentence length: mix 6-word sentences with 30-word ones
- Start sentences with different words — check every paragraph
- Use concrete, specific language instead of vague adjectives
- Be direct. Say what you mean without dramatic buildup.
- Use parenthetical asides occasionally (like this) for added nuance
- Reference specific numbers, dates, asset names — specificity reads human
- Use em-dashes for interjections — they break up monotonous rhythm
- Occasional sentence fragments are fine. When used sparingly.
- NEVER use emoji in body text — no symbols like ✦ 🎯 ❓ ⚡ 📋 🧭 💡 🔑 anywhere

CTA RULES:
- The final paragraph should naturally mention that FibAlgo offers tools relevant to the article topic
- ONE sentence, woven into the conclusion — not a separate "sales pitch" paragraph
- NEVER start with "Ready to" / "Want to" / "Looking to"
- NEVER use phrases like "take your trading to the next level"
- Example of good CTA: "For traders looking to automate signal detection, platforms like FibAlgo provide TradingView-compatible indicators that handle some of the analysis discussed above."

═══ HTML & FORMATTING RULES ═══
ALLOWED TAGS: <h2>, <h3>, <p>, <strong>, <em>, <ul>, <li>, <ol>, <blockquote>, <a>, <hr>
Do NOT use <h1> tags (title is rendered separately by the app).
Include 5-8 sections with keyword-rich <h2> subheadings.

FORMATTING RULES:
- Use <blockquote> for notable quotes from real people or important principles
- Use <strong> to highlight key terms (2-3 per section, not every sentence)
- Use <ul> or <ol> lists for steps, comparisons, or grouped items — but NOT in every section
- Use <hr> to separate major topic transitions (max 2 per article)
- Use <h3> for sub-sections within an <h2> section when needed

DO NOT USE:
- Any <div> tags with special CSS classes (no callout-insight, callout-pro, callout-warning, callout-example, key-takeaways, section-divider)
- No emoji anywhere in the article — no symbols like ✦ 🎯 ❓ ⚡ 📋 🧭 💡 🔑 ✅ ❌ ⚠️
- No "Key Insight" / "Pro Tip" / "Warning" / "Common Trap" / "Advanced Move" labeled boxes
- No "Key Takeaways" box with emoji heading
- No section divider symbols

The article should look like a Bloomberg or Reuters analysis piece — clean text, clear headings, occasional blockquotes, relevant lists. No decorative elements.

═══ IMAGE MARKERS ═══
Place 4-5 image markers in the article using this format:
<!-- IMAGE: 3-5 word Unsplash search query -->

Rules:
- Place AFTER a </p> tag, never inside a paragraph
- Only after paragraphs with visual or important content
- NOT after the first or last paragraph
- Each query must be UNIQUE — no repeated or similar queries
- Queries must describe concrete, photographable subjects (not abstract concepts)
- Examples: "trading desk multiple monitors", "bitcoin coin wooden table", "stock exchange building exterior", "laptop financial chart screen", "currency exchange rate board"

═══ WRITING STYLE ═══
- PARAGRAPHS: 2-4 sentences each. Vary lengths — some short, some longer. White space matters.
- BOLD: Bold 1-2 key phrases per section for scannability. Do not bold entire sentences.
- SECTION OPENINGS: Vary how each section starts. Some with a direct statement, some with context-setting, some with a data point. NEVER start 3+ sections with questions.
- BLOCKQUOTES: Use for real quotes from real people (traders, authors, researchers). Attribute properly.
- LISTS: Use where naturally appropriate — steps, comparisons, grouped criteria. Not every section needs a list.
- EXAMPLES: Use realistic numbers ($500 account, 2% risk per trade). ALL examples must be clearly hypothetical — use "Suppose...", "Consider a scenario where...", "If a trader enters at..." framing.
- REAL EVENTS ONLY: Reference well-known events (COVID crash March 2020, FTX collapse Nov 2022, GameStop squeeze Jan 2021). NEVER invent events or claim something happened on a specific date.
- NO DRAMATIC STORYTELLING: Do not write "picture this" scenarios, "imagine you're sitting at your desk" setups, or fake personal anecdotes. Present information directly.

═══ ORIGINALITY REQUIREMENTS ═══
- Approach the topic from a UNIQUE angle not covered in existing posts
- Take editorial positions supported by evidence: "This approach has notable drawbacks that are often overlooked" — but frame as analysis, not personal opinion
- Use varied examples — different assets (BTC, ETH, SOL, AAPL, TSLA, EUR/USD, GBP/JPY, gold, S&P 500 futures), different timeframes, different account sizes
- Only reference real, well-known market events — NEVER invent events
- ALL trading examples must be CLEARLY HYPOTHETICAL — use "Suppose...", "Consider a scenario where...", "If a trader enters at..." framing. Never use "Imagine you're..." or "Picture this..." — too dramatic
- Each article should teach something immediately applicable
- Avoid cliched analogies (chess, poker, war). If using analogies, draw from engineering, medicine, statistics, or everyday life
- Vary article format: some data-driven, some comparative, some step-by-step, some myth-busting

═══ SEO REQUIREMENTS ═══
- Title: 50-65 characters, keyword near the beginning. Descriptive, not clickbait.
- NEVER put a year in the title, slug, or meta description — these are evergreen articles
- Meta description: 145-160 characters, includes keyword. Use educational language ("learn", "understand", "analyze"). NEVER promise profits or returns.
- URL slug: lowercase, hyphens, keyword-rich, max 60 chars, NO year
- Include 2-3 internal links to FibAlgo pages + 2-3 cross-links to other blog posts
- Proper heading hierarchy (h2 → h3)

═══ FAQ SECTION ═══
Generate exactly 5 FAQ items. These populate Google's FAQPage rich results.
- Real questions people search for on Google
- Each answer: 2-3 sentences (40-80 words), factual, self-contained
- Include target keyword naturally in at least 2 questions
- Do NOT copy article text verbatim — summarize
- Cover different aspects of the topic

═══ INTERNAL LINKS (include 2-3 naturally) ═══
${shuffledLinks.map(l => `<a href="${l.url}">${l.anchor}</a> — use when discussing: ${l.context}`).join('\n')}

═══ TOPIC CLUSTER STRATEGY (CRITICAL FOR SEO) ═══
This article belongs to the "${currentCluster?.name || 'General'}" topic cluster.
${currentCluster ? `Pillar article: "${currentCluster.pillarKeyword}"
When writing, naturally reference and link to other articles in this cluster (provided in BLOG CROSS-LINKS).
The first 2-3 cross-links below are from the SAME cluster — prioritize linking to these.
This builds topical authority and helps Google understand our content hierarchy.` : 'Link naturally to related articles from the cross-links provided.'}

═══ BLOG CROSS-LINKS — YOU MUST INCLUDE AT LEAST 3 OF THESE LINKS IN YOUR ARTICLE ═══
These are REAL published articles on our blog. You MUST include at least 3 of these as <a href="/education/slug"> links within your article text. Weave them naturally into relevant paragraphs. This is MANDATORY for SEO internal linking.
${blogLinksForAI}

═══ EXISTING POSTS — DO NOT DUPLICATE THESE TOPICS ═══
${existingTitleList || 'No existing posts yet.'}

═══ OUTPUT FORMAT — ABSOLUTE RULES ═══
⚠️ CRITICAL: Your ENTIRE response must be a single JSON object. Nothing else.
❌ DO NOT write any text before the opening {
❌ DO NOT write any text after the closing }
❌ DO NOT wrap in markdown code fences (no \`\`\`json)
❌ DO NOT add explanations, notes, or commentary
✅ Your response starts with { and ends with } — NOTHING ELSE

{
  "title": "Keyword-Rich SEO Title Here (50-65 chars)",
  "slug": "keyword-rich-url-slug-here",
  "description": "Compelling meta description with keyword and hook (145-160 chars)",
  "content": "<h2>First Section</h2><p>Full HTML article with callout divs...</p>",
  "tags": ["primary-keyword", "related-1", "related-2", "related-3", "related-4", "related-5"],
  "readTime": "X min",
  "faq": [
    {"question": "What is [topic]?", "answer": "Concise 2-3 sentence answer here."},
    {"question": "How do you [topic action]?", "answer": "Step-by-step concise answer here."},
    {"question": "Why is [topic] important for traders?", "answer": "Benefit-focused answer here."},
    {"question": "Can beginners use [topic]?", "answer": "Beginner-friendly answer here."},
    {"question": "What are the risks of [topic]?", "answer": "Risk-aware answer here."}
  ]
}

Remember: First character = { , Last character = } , Nothing else.`;

    const userPrompt = `Write a well-researched educational article for this keyword.

Date: ${currentDate}

TARGET KEYWORD: "${chosen.keyword}"
CATEGORY: ${chosen.category}
SEARCH VOLUME: ${chosen.volume}
COMPETITION: ${chosen.competition}

REQUIREMENTS:
1. Completely unique — not similar to any existing post
2. Find a specific, non-obvious angle on "${chosen.keyword}" that adds real value
3. Include hypothetical examples with specific numbers using varied assets (ETH, SOL, AAPL, TSLA, EUR/USD, GBP/JPY, gold, S&P 500 futures — not just BTC)
4. MINIMUM 2000 words, TARGET 2200+. Under 1800 = rejected.
5. Include 3-5 real, verifiable references (books, institutions, known market events)
6. Present clear analytical positions supported by evidence
7. Challenge at least one common misconception with data or reasoning
8. Include at least 3 cross-links from the BLOG CROSS-LINKS list
9. Use one of the structure templates from the system prompt
10. NO first-person language (no I/me/my/we). Write as editorial team.
11. NO emoji anywhere. NO callout boxes. Clean, professional HTML.
12. NO fake personal stories or anecdotes. Present information directly.
13. ENTIRE response = JSON object only. Starts with { ends with }. No markdown fences.`;

    // ── 4b. 3-LAYER RELIABILITY: AI CALL → JSON REPAIR → FULL RETRY ──
    // Layer 1: Strict prompt + direct parse (handles 95%+ of cases)
    // Layer 2: Lightweight JSON repair call (handles broken formatting)
    // Layer 3: Full retry with fresh generation (last resort, guarantees delivery)
    const MAX_ATTEMPTS = 2; // 1 original + 1 full retry max
    let parsed: Record<string, unknown> | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let rawJsonStr = '';

      try {
        console.log(`[AI Blog] ${attempt === 1 ? '🚀 Generating article...' : '🔄 Full retry — generating fresh article...'}`);

        const stream = anthropic.messages.stream({
          model: 'claude-opus-4-20250514',
          max_tokens: 32000,
          temperature: attempt === 1 ? 1 : 0.7,
          thinking: { type: 'enabled', budget_tokens: 16000 },
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });
        const response = await stream.finalMessage();

        // ── 5. PARSE AI RESPONSE ────────────────────────────────
        const aiContent = response.content.find((block: { type: string }) => block.type === 'text');
        if (!aiContent || aiContent.type !== 'text') {
          console.warn(`[AI Blog] Attempt ${attempt}: AI returned non-text response`);
          continue;
        }

        // Log thinking usage
        const thinkingBlocks = response.content.filter((block: { type: string }) => block.type === 'thinking');
        if (thinkingBlocks.length > 0) {
          console.log(`[AI Blog] Claude used ${thinkingBlocks.length} thinking block(s)`);
        }

        rawJsonStr = aiContent.text.trim();

        // Clean markdown fences if present
        rawJsonStr = rawJsonStr.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

        // Try direct parse
        try {
          parsed = JSON.parse(rawJsonStr);
        } catch {
          // Fallback: extract outermost { ... }
          const firstBrace = rawJsonStr.indexOf('{');
          const lastBrace = rawJsonStr.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            try {
              parsed = JSON.parse(rawJsonStr.slice(firstBrace, lastBrace + 1));
            } catch { /* fall through to repair */ }
          }
        }

        // ── Layer 1 success check ──
        if (parsed && parsed.title && parsed.content) {
          console.log(`[AI Blog] ✅ JSON parsed directly on attempt ${attempt}`);
          break;
        }

        // ── Layer 2: Lightweight JSON repair ──
        console.warn(`[AI Blog] ⚠️ Direct parse failed, attempting JSON repair...`);
        console.warn(`[AI Blog] Raw (first 300 chars):`, rawJsonStr.slice(0, 300));

        try {
          const fixStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 16000,
            temperature: 0,
            system: `You are a JSON repair tool. The user gives you broken/malformed JSON. 
Fix it and return ONLY the valid JSON object. 
Rules: First character must be {, last character must be }. 
No markdown, no explanations, no extra text. ONLY the JSON.`,
            messages: [{
              role: 'user',
              content: `Fix this broken JSON. Return ONLY the repaired JSON object:\n\n${rawJsonStr}`
            }],
          });
          const fixResponse = await fixStream.finalMessage();
          const fixContent = fixResponse.content.find((block: { type: string }) => block.type === 'text');

          if (fixContent && fixContent.type === 'text') {
            let fixedStr = fixContent.text.trim();
            fixedStr = fixedStr.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
            const fb = fixedStr.indexOf('{');
            const lb = fixedStr.lastIndexOf('}');
            if (fb !== -1 && lb > fb) fixedStr = fixedStr.slice(fb, lb + 1);
            parsed = JSON.parse(fixedStr);

            if (parsed && parsed.title && parsed.content) {
              console.log(`[AI Blog] ✅ JSON repaired successfully on attempt ${attempt}`);
              break;
            }
          }
        } catch (fixErr) {
          console.warn(`[AI Blog] JSON repair failed on attempt ${attempt}:`, fixErr);
        }

        // Layer 2 failed — if this was attempt 1, loop will do Layer 3 (full retry)
        parsed = null;
        if (attempt < MAX_ATTEMPTS) {
          console.log(`[AI Blog] 🔄 Both parse and repair failed — doing full retry...`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3s cooldown
        }

      } catch (aiErr: unknown) {
        const errMsg = aiErr instanceof Error ? aiErr.message : String(aiErr);
        console.error(`[AI Blog] Attempt ${attempt} API error: ${errMsg}`);

        if (attempt < MAX_ATTEMPTS) {
          // Wait before retry (longer for rate limits)
          const waitMs = errMsg.includes('rate') || errMsg.includes('overloaded') || errMsg.includes('529') ? 15000 : 5000;
          console.log(`[AI Blog] Waiting ${waitMs / 1000}s before full retry...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
        } else {
          return { success: false, error: `AI call error: ${errMsg}` };
        }
      }
    }

    if (!parsed || !parsed.title || !parsed.content) {
      return { success: false, error: 'Failed to generate valid blog post after all attempts' };
    }

    const { title, slug, description, content: rawContent, tags, readTime, faq } = parsed as {
      title: string; slug: string; description: string; content: string;
      tags: string[]; readTime: string; faq: Array<{question: string; answer: string}>;
    };
    if (!title || !slug || !description || !rawContent) {
      return { success: false, error: 'AI response missing required fields' };
    }

    // Validate FAQ array
    let validFaq: Array<{question: string; answer: string}> | null = null;
    if (Array.isArray(faq) && faq.length >= 3) {
      validFaq = faq
        .filter((f: { question?: string; answer?: string }) => f.question && f.answer && f.question.length > 10 && f.answer.length > 20)
        .slice(0, 7); // max 7 FAQ items
      if (validFaq.length < 3) validFaq = null; // need at least 3 valid FAQs
      console.log(`[AI Blog] ${validFaq?.length || 0} valid FAQ items generated`);
    }

    // ── 5b. REPLACE IMAGE MARKERS WITH UNSPLASH PHOTOS ─────
    let content = rawContent;
    try {
      content = await replaceImageMarkers(rawContent, chosen.keyword, chosen.category);
      const figureCount = (content.match(/<figure/gi) || []).length;
      console.log(`[AI Blog] ${figureCount} images placed into "${title}"`);
    } catch (imgErr) {
      console.log(`[AI Blog] Image insertion failed (non-blocking):`, imgErr);
      // Strip leftover markers and continue with text-only
      content = rawContent.replace(/<!--\s*IMAGE:.*?-->/gi, '');
    }

    // ── 6. MULTI-LEVEL DEDUP VALIDATION ─────────────────────
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (usedSlugs.has(cleanSlug)) {
      return { success: false, error: `Duplicate slug: ${cleanSlug}` };
    }
    if (usedTitles.has(title.toLowerCase())) {
      return { success: false, error: `Duplicate title: ${title}` };
    }

    const fingerprint = generateContentFingerprint(title, chosen.keyword, tags || []);
    if (usedFingerprints.has(fingerprint)) {
      return { success: false, error: 'Content fingerprint collision' };
    }

    // Validate cross-links exist (critical for SEO internal linking)
    const crossLinkCount = (content.match(/href="\/education\//gi) || []).length;
    const internalLinkCount = (content.match(/href="\/(library|#pricing|community|about|education)/gi) || []).length;
    console.log(`[AI Blog] 📊 Quality check: ${crossLinkCount} cross-links, ${internalLinkCount} internal links`);
    if (crossLinkCount < 1) {
      console.warn(`[AI Blog] ⚠️ No cross-links found — SEO internal linking missing`);
    }

    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    if (wordCount < 1500) {
      return { success: false, error: `Too short: ${wordCount} words (min 1500)` };
    }

    // ── 7. EXTRACT COVER IMAGE FROM CONTENT ────────────────
    // Find the first <img src="https://..."> in the processed HTML for cover_image
    let coverImage: string | null = null;
    const imgMatch = content.match(/<img\s[^>]*src="(https:\/\/[^"]+)"/i);
    if (imgMatch) {
      coverImage = imgMatch[1];
      console.log(`[AI Blog] Cover image extracted: ${coverImage!.slice(0, 80)}...`);
    } else {
      // Fallback: fetch a cover image from Unsplash based on keyword
      try {
        const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
        if (unsplashKey) {
          const searchQ = encodeURIComponent(chosen.keyword.split(' ').slice(0, 3).join(' ') + ' trading');
          const uRes = await fetch(`https://api.unsplash.com/search/photos?query=${searchQ}&per_page=1&orientation=landscape`, {
            headers: { Authorization: `Client-ID ${unsplashKey}` },
          });
          const uData = await uRes.json();
          if (uData.results?.[0]?.urls?.regular) {
            coverImage = uData.results[0].urls.regular;
            console.log(`[AI Blog] Cover image from Unsplash fallback: ${coverImage!.slice(0, 80)}...`);
          }
        }
      } catch (coverErr) {
        console.log(`[AI Blog] Cover image fallback failed (non-blocking):`, coverErr);
      }
    }

    // ── 8. SAVE + AUTO-PUBLISH ──────────────────────────────
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('blog_posts').insert({
      slug: cleanSlug,
      title,
      description,
      content,
      date: now,
      updated_at: now,
      author: AUTHOR,
      tags: tags || [],
      read_time: readTime || `${Math.ceil(wordCount / 200)} min`,
      status: 'published',
      target_keyword: chosen.keyword,
      meta_title: title,
      meta_description: description,
      cover_image: coverImage,
      word_count: wordCount,
      ai_model: 'claude-opus-4-20250514',
      ai_generated: true,
      published_at: now,
      faq: validFaq,
    });

    if (insertError) {
      if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
        return { success: false, error: `Slug exists: ${cleanSlug}` };
      }
      return { success: false, error: `DB error: ${insertError.message}` };
    }

    // ── 9. MARK KEYWORD AS USED ─────────────────────────────
    await supabase.from('blog_keywords').upsert({
      keyword: chosen.keyword,
      category: chosen.category,
      used_in_slug: cleanSlug,
      search_volume_estimate: chosen.volume,
      competition: chosen.competition,
      status: 'used',
    }, { onConflict: 'keyword' });

    return { success: true, slug: cleanSlug, title, wordCount, keyword: chosen.keyword };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ══════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY
// ══════════════════════════════════════════════════════════════
export const generateBlogPost = generateAndAutoPublish;
export const generateAndPublish = generateAndAutoPublish;

export async function publishPost(slug: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('blog_posts')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('slug', slug);
  return { success: !error, error: error?.message };
}

export async function getDraftPosts() {
  const supabase = getSupabase();
  const { data } = await supabase.from('blog_posts')
    .select('*').eq('status', 'draft')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function deleteDraft(slug: string) {
  const supabase = getSupabase();
  const { data: post } = await supabase.from('blog_posts')
    .select('target_keyword').eq('slug', slug).single();
  if (post?.target_keyword) {
    await supabase.from('blog_keywords')
      .update({ status: 'available', used_in_slug: null })
      .eq('keyword', post.target_keyword);
  }
  const { error } = await supabase.from('blog_posts').delete().eq('slug', slug);
  return { success: !error, error: error?.message };
}

export async function seedKeywords() {
  const supabase = getSupabase();
  let inserted = 0, skipped = 0;
  for (const kw of KEYWORD_POOL) {
    const { error } = await supabase.from('blog_keywords').upsert({
      keyword: kw.keyword, category: kw.category,
      search_volume_estimate: kw.volume, competition: kw.competition,
      status: 'available',
    }, { onConflict: 'keyword' });
    if (error) skipped++; else inserted++;
  }
  return { inserted, skipped };
}

export async function getBlogStats() {
  const supabase = getSupabase();
  const [
    { count: totalPosts },
    { count: publishedPosts },
    { data: usedKw },
  ] = await Promise.all([
    supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
    supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('blog_keywords').select('keyword').eq('status', 'used'),
  ]);
  return {
    totalKeywords: KEYWORD_POOL.length,
    usedKeywords: usedKw?.length || 0,
    remainingKeywords: KEYWORD_POOL.length - (usedKw?.length || 0),
    totalPosts: totalPosts || 0,
    publishedPosts: publishedPosts || 0,
    estimatedDaysLeft: Math.floor((KEYWORD_POOL.length - (usedKw?.length || 0)) / 2),
  };
}
