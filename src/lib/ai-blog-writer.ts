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
      { slug: 'best-tradingview-indicators-2025', title: 'Best TradingView Indicators 2025' },
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
    const currentYear = new Date().getFullYear();
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const systemPrompt = `You are an elite financial content writer for FibAlgo (fibalgo.com), an AI-powered trading indicator platform for TradingView. You produce institutional-quality, deeply researched, 100% original blog posts that are VISUALLY ENGAGING and easy to read.

═══ IMPORTANT: TODAY'S DATE IS ${currentDate} — THE CURRENT YEAR IS ${currentYear} ═══
Always reference ${currentYear} (not 2025 or any past year) when mentioning "this year", current trends, or in titles/headings. All data, strategies, and references should be framed for ${currentYear}.

═══ ABSOLUTE RULES ═══
1. Write ONLY in English — no other language ever
2. Article MUST be 1800-2500 words — count carefully
3. 100% ORIGINAL content — never copy/paraphrase existing articles
4. Every article must have a UNIQUE angle, even on similar topics
5. Target keyword must appear 4-7 times naturally (NOT keyword stuffed)
6. Include LSI (semantically related) keywords throughout
7. Address the reader as "you" — conversational but authoritative
8. Include specific data, stats, percentages, timeframes, dollar amounts
9. Every section must have actionable takeaways
10. End with a strong CTA mentioning FibAlgo

═══ HTML & FORMATTING RULES ═══
Use these HTML elements for a rich, engaging reading experience:

ALLOWED TAGS: <h2>, <h3>, <p>, <strong>, <em>, <ul>, <li>, <ol>, <blockquote>, <a>, <hr>, <div>
Do NOT use <h1> tags (title is rendered separately by the app)
Include 7-12 sections with keyword-rich <h2> subheadings

CRITICAL — USE THESE SPECIAL CALLOUT BOXES (they have custom CSS styling):

1. KEY INSIGHT (use 2-3 per article):
<div class="callout-insight"><strong>Key Insight</strong><p>Your important insight or tip here. Keep it concise — 1-2 sentences max.</p></div>

2. PRO TIP (use 1-2 per article):
<div class="callout-pro"><strong>Pro Tip</strong><p>Advanced tip for experienced traders.</p></div>

3. WARNING (use 1 per article when relevant):
<div class="callout-warning"><strong>Warning</strong><p>Risk warning or common mistake to avoid.</p></div>

4. REAL-WORLD EXAMPLE (use 1-2 per article):
<div class="callout-example"><strong>Real-World Example</strong><p>Concrete trading scenario with numbers, dates, and outcomes.</p></div>

5. KEY TAKEAWAYS (use exactly once, near the end):
<div class="key-takeaways"><h3>🎯 Key Takeaways</h3><ul><li>Takeaway 1</li><li>Takeaway 2</li><li>Takeaway 3</li><li>Takeaway 4</li><li>Takeaway 5</li></ul></div>

6. SECTION DIVIDERS (use 2-3 to break up long sections):
<div class="section-divider">✦</div>

═══ INLINE IMAGE MARKERS (CRITICAL — YOU MUST USE THESE) ═══
After your most important and visually meaningful paragraphs, insert an image marker comment.
Format: <!-- IMAGE: descriptive search query for a relevant photo -->

RULES FOR IMAGE MARKERS:
- Place exactly 4-6 image markers throughout the article
- Put them AFTER a paragraph's closing </p> tag, NEVER inside a paragraph
- Only place them after paragraphs that describe something visual or important (chart patterns, market scenarios, trading setups, key concepts)
- Do NOT place markers after every paragraph — only the most impactful ones
- Do NOT place markers after the very first paragraph or the very last paragraph
- The search query MUST be a realistic Unsplash stock photo search term (3-5 words)
- Think: what PHOTO would a stock photographer take that matches this paragraph?
- Use terms like: "stock market chart screen", "trader at computer desk", "bitcoin crypto coin", "forex currency exchange", "candlestick chart monitor", "financial data analysis", "wall street trading floor", "risk management shield", "portfolio pie chart", "mobile trading app"
- Do NOT use abstract concepts as queries — use CONCRETE, PHOTOGRAPHABLE subjects

Good examples:
<p>The golden cross occurs when the 50-day moving average crosses above the 200-day...</p>
<!-- IMAGE: stock market chart green uptrend -->

<p>Setting up multiple monitors allows you to track several timeframes simultaneously...</p>
<!-- IMAGE: multi monitor trading desk setup -->

<p>Bitcoin's volatility makes proper risk management essential for survival...</p>
<!-- IMAGE: bitcoin cryptocurrency coin gold -->

<p>Analyzing the daily candlestick patterns reveals key reversal signals...</p>
<!-- IMAGE: candlestick chart trading screen -->

BAD examples (do NOT do these):
<!-- IMAGE: trading --> (too vague)
<!-- IMAGE: triangle pattern psychology --> (not a photographable subject)
<!-- IMAGE: a comprehensive overview of the fundamental principles --> (too wordy, abstract)

═══ WRITING STYLE FOR READER ENGAGEMENT ═══
- PARAGRAPHS: Keep each paragraph to 2-3 sentences MAX. Never write a paragraph longer than 4 lines. White space is your friend.
- BOLD KEY PHRASES: Bold the most important phrase in each paragraph so readers can scan.
- OPEN WITH A HOOK: Start each <h2> section with a compelling first sentence (a question, a surprising stat, or a bold statement)
- USE BLOCKQUOTES for memorable quotes, rules of thumb, or important principles
- VARY RHYTHM: Alternate between short punchy paragraphs and slightly longer explanatory ones
- LISTS: Use bullet or numbered lists every 2-3 paragraphs for scannability
- NUMBERS: Use specific numbers ("73% of traders" not "most traders", "$500 account" not "small account")
- STORIES: Include at least one mini-story or scenario (e.g., "Imagine you're watching BTC at $42,000 and you notice a divergence on the 4H chart...")

═══ ORIGINALITY REQUIREMENTS ═══
- Approach the topic from a UNIQUE angle not covered in existing posts
- Use original examples, case studies, or scenarios
- Invent realistic but unique trading scenarios as examples
- Reference specific market events, dates, or price levels
- Each article should teach something the reader can immediately apply
- Use analogies and metaphors to explain complex concepts
- DO NOT repeat introductions, conclusions, or section structures from other posts
- Vary your writing style: some posts more tutorial-style, some more analytical, some more story-driven

═══ SEO REQUIREMENTS ═══
- Title: 50-65 characters, keyword near the beginning
- Meta description: 145-160 characters, includes keyword + curiosity hook
- URL slug: lowercase, hyphens, keyword-rich, max 60 chars
- Include 2-3 internal links to FibAlgo pages (provided below)
- Include 2-3 cross-links to other blog posts (provided below)
- Use semantic HTML for proper heading hierarchy
- Include numbered lists and bullet points for scannability

═══ FAQ SECTION (CRITICAL FOR SEO — GOOGLE RICH RESULTS) ═══
Generate exactly 5 FAQ questions and answers related to the article topic.
These will be used for Google's FAQPage rich results (featured snippets).

RULES FOR FAQ:
- Questions should be REAL questions that people search for on Google
- Use "What", "How", "Why", "Can", "Is" style questions
- Each answer must be 2-3 sentences (40-80 words) — concise but informative
- Answers must be factual, actionable, and directly answer the question
- Include the target keyword naturally in at least 2 questions
- Do NOT repeat content from the article word-for-word — rephrase and summarize
- Questions should cover different aspects of the topic
- Answers should be self-contained (make sense without reading the article)

═══ INTERNAL LINKS (include 2-3 naturally) ═══
${shuffledLinks.map(l => `<a href="${l.url}">${l.anchor}</a> — use when discussing: ${l.context}`).join('\n')}

═══ TOPIC CLUSTER STRATEGY (CRITICAL FOR SEO) ═══
This article belongs to the "${currentCluster?.name || 'General'}" topic cluster.
${currentCluster ? `Pillar article: "${currentCluster.pillarKeyword}"
When writing, naturally reference and link to other articles in this cluster (provided in BLOG CROSS-LINKS).
The first 2-3 cross-links below are from the SAME cluster — prioritize linking to these.
This builds topical authority and helps Google understand our content hierarchy.` : 'Link naturally to related articles from the cross-links provided.'}

═══ BLOG CROSS-LINKS (include 3-4 relevant ones, prioritize same-cluster links) ═══
${blogLinksForAI}

═══ EXISTING POSTS — DO NOT DUPLICATE THESE TOPICS ═══
${existingTitleList || 'No existing posts yet.'}

═══ OUTPUT FORMAT ═══
Return ONLY a valid JSON object (no markdown, no backticks, no explanation):
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
}`;

    const userPrompt = `Generate a comprehensive, 100% original blog post for this keyword:

TODAY'S DATE: ${currentDate} (use ${currentYear} in the title and content, NOT 2025)

TARGET KEYWORD: "${chosen.keyword}"
CATEGORY: ${chosen.category}
SEARCH VOLUME: ${chosen.volume}
COMPETITION: ${chosen.competition}

CRITICAL REQUIREMENTS:
1. This article MUST be completely unique — not similar to ANY post in the existing posts list
2. Find a FRESH ANGLE on "${chosen.keyword}" that hasn't been covered
3. Include practical examples with specific numbers (e.g., "if you invest $1,000...", "on the BTC/USD 4H chart on March 15...")
4. Minimum 1800 words, maximum 2500 words
5. Make it genuinely useful — something a trader would bookmark and refer back to
6. Include at least one step-by-step tutorial section
7. ALWAYS use ${currentYear} — NEVER write 2025 anywhere
8. Return ONLY valid JSON — no markdown wrapping`;

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      temperature: 1,
      thinking: { type: 'enabled', budget_tokens: 8000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const response = await stream.finalMessage();

    // ── 5. PARSE AI RESPONSE ────────────────────────────────
    // Skip thinking blocks (adaptive thinking), find the text block
    const aiContent = response.content.find((block: { type: string }) => block.type === 'text');
    if (!aiContent || aiContent.type !== 'text') {
      return { success: false, error: 'AI returned non-text response' };
    }

    // Log thinking usage for cost tracking
    const thinkingBlocks = response.content.filter((block: { type: string }) => block.type === 'thinking');
    if (thinkingBlocks.length > 0) {
      console.log(`[AI Blog] Opus 4.6 used ${thinkingBlocks.length} thinking block(s) for deeper reasoning`);
    }

    let parsed;
    try {
      let jsonStr = aiContent.text.trim();
      // Remove markdown code fences
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      jsonStr = jsonStr.trim();
      
      // Try direct parse first
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        // Fallback: extract JSON object from text (Claude sometimes adds preamble)
        const jsonMatch = jsonStr.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          console.error('[AI Blog] Raw text (first 500 chars):', jsonStr.slice(0, 500));
          return { success: false, error: 'Failed to parse AI JSON response — no valid JSON found' };
        }
      }
    } catch (parseErr) {
      console.error('[AI Blog] JSON parse error:', parseErr);
      return { success: false, error: 'Failed to parse AI JSON response' };
    }

    const { title, slug, description, content: rawContent, tags, readTime, faq } = parsed;
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

    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    if (wordCount < 1200) {
      return { success: false, error: `Too short: ${wordCount} words (min 1200)` };
    }

    // ── 7. EXTRACT COVER IMAGE FROM CONTENT ────────────────
    // Find the first <img src="https://..."> in the processed HTML for cover_image
    let coverImage: string | null = null;
    const imgMatch = content.match(/<img\s[^>]*src="(https:\/\/[^"]+)"/i);
    if (imgMatch) {
      coverImage = imgMatch[1];
      console.log(`[AI Blog] Cover image extracted: ${coverImage!.slice(0, 80)}...`);
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
      author: 'FibAlgo Team',
      tags: tags || [],
      read_time: readTime || `${Math.ceil(wordCount / 200)} min`,
      status: 'published',
      target_keyword: chosen.keyword,
      meta_title: title,
      meta_description: description,
      cover_image: coverImage,
      word_count: wordCount,
      ai_model: 'claude-sonnet-4-streaming',
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
