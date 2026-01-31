// ═══════════════════════════════════════════════════════════════════════════════
// 📈 TRADING VIEW SYMBOL CONVERTER
// Asset isimlerini TradingView sembol formatına dönüştürür
// ═══════════════════════════════════════════════════════════════════════════════

// Kripto: sadece sembol+USD (exchange yok, TradingView kendisi bulur — örn. XMR + USD)
const CRYPTO_SYMBOLS: Record<string, string> = {
  'BTC': 'BTCUSD',
  'BTCUSD': 'BTCUSD',
  'BTCUSDT': 'BTCUSD',
  'ETH': 'ETHUSD',
  'ETHUSD': 'ETHUSD',
  'ETHUSDT': 'ETHUSD',
  'SOL': 'SOLUSD',
  'SOLUSD': 'SOLUSD',
  'BNB': 'BNBUSD',
  'XRP': 'XRPUSD',
  'ADA': 'ADAUSD',
  'DOGE': 'DOGEUSD',
  'DOT': 'DOTUSD',
  'AVAX': 'AVAXUSD',
  'MATIC': 'MATICUSD',
  'LINK': 'LINKUSD',
  'UNI': 'UNIUSD',
  'ATOM': 'ATOMUSD',
  'LTC': 'LTCUSD',
  'SHIB': 'SHIBUSD',
  'TRX': 'TRXUSD',
  'ETC': 'ETCUSD',
  'XLM': 'XLMUSD',
  'NEAR': 'NEARUSD',
  'APT': 'APTUSD',
  'ARB': 'ARBUSD',
  'OP': 'OPUSD',
  'SUI': 'SUIUSD',
  'PEPE': 'PEPEUSD',
  'WIF': 'WIFUSD',
  'BONK': 'BONKUSD',
  'FET': 'FETUSD',
  'RNDR': 'RNDRUSD',
  'IMX': 'IMXUSD',
  'SEI': 'SEIUSD',
  'INJ': 'INJUSD',
  'MEME': 'MEMEUSD',
  'XMR': 'XMRUSD',
  'XMRUSD': 'XMRUSD',
};

const STOCK_EXCHANGES: Record<string, string> = {
  // Tech giants
  'AAPL': 'NASDAQ:AAPL',
  'MSFT': 'NASDAQ:MSFT',
  'GOOGL': 'NASDAQ:GOOGL',
  'GOOG': 'NASDAQ:GOOG',
  'AMZN': 'NASDAQ:AMZN',
  'META': 'NASDAQ:META',
  'NVDA': 'NASDAQ:NVDA',
  'TSLA': 'NASDAQ:TSLA',
  'AMD': 'NASDAQ:AMD',
  'INTC': 'NASDAQ:INTC',
  
  // Crypto-related stocks
  'COIN': 'NASDAQ:COIN',
  'MSTR': 'NASDAQ:MSTR',
  'MARA': 'NASDAQ:MARA',
  'RIOT': 'NASDAQ:RIOT',
  'CLSK': 'NASDAQ:CLSK',
  
  // NYSE majors
  'JPM': 'NYSE:JPM',
  'BAC': 'NYSE:BAC',
  'WFC': 'NYSE:WFC',
  'GS': 'NYSE:GS',
  'MS': 'NYSE:MS',
  'BRK.B': 'NYSE:BRK.B',
  'V': 'NYSE:V',
  'MA': 'NYSE:MA',
  'UNH': 'NYSE:UNH',
  'JNJ': 'NYSE:JNJ',
  'XOM': 'NYSE:XOM',
  'CVX': 'NYSE:CVX',
  'WMT': 'NYSE:WMT',
  'PG': 'NYSE:PG',
  'DIS': 'NYSE:DIS',
  
  // Other tech
  'NFLX': 'NASDAQ:NFLX',
  'CRM': 'NYSE:CRM',
  'ORCL': 'NYSE:ORCL',
  'ADBE': 'NASDAQ:ADBE',
  'PYPL': 'NASDAQ:PYPL',
  'SQ': 'NYSE:SQ',
  'SHOP': 'NYSE:SHOP',
  'UBER': 'NYSE:UBER',
  'LYFT': 'NASDAQ:LYFT',
  'ABNB': 'NASDAQ:ABNB',
  'SNOW': 'NYSE:SNOW',
  'PLTR': 'NYSE:PLTR',
  'NET': 'NYSE:NET',
  'DDOG': 'NASDAQ:DDOG',
  'ZS': 'NASDAQ:ZS',
  'CRWD': 'NASDAQ:CRWD',
  'OKTA': 'NASDAQ:OKTA',
  'MDB': 'NASDAQ:MDB',
  'SBUX': 'NASDAQ:SBUX',
  'NKE': 'NYSE:NKE',
  'MCD': 'NYSE:MCD',
  'HD': 'NYSE:HD',
  'LOW': 'NYSE:LOW',
  'TGT': 'NYSE:TGT',
  'COST': 'NASDAQ:COST',
};

// Forex: OANDA:PARITE (TradingView’da OANDA broker ile parite adı)
const FOREX_PAIRS: Record<string, string> = {
  'EURUSD': 'OANDA:EURUSD',
  'EUR/USD': 'OANDA:EURUSD',
  'GBPUSD': 'OANDA:GBPUSD',
  'GBP/USD': 'OANDA:GBPUSD',
  'USDJPY': 'OANDA:USDJPY',
  'USD/JPY': 'OANDA:USDJPY',
  'USDCHF': 'OANDA:USDCHF',
  'USD/CHF': 'OANDA:USDCHF',
  'AUDUSD': 'OANDA:AUDUSD',
  'AUD/USD': 'OANDA:AUDUSD',
  'USDCAD': 'OANDA:USDCAD',
  'USD/CAD': 'OANDA:USDCAD',
  'NZDUSD': 'OANDA:NZDUSD',
  'NZD/USD': 'OANDA:NZDUSD',
  'EURGBP': 'OANDA:EURGBP',
  'EUR/GBP': 'OANDA:EURGBP',
  'EURJPY': 'OANDA:EURJPY',
  'EUR/JPY': 'OANDA:EURJPY',
  'GBPJPY': 'OANDA:GBPJPY',
  'GBP/JPY': 'OANDA:GBPJPY',
  'EURCHF': 'OANDA:EURCHF',
  'EUR/CHF': 'OANDA:EURCHF',
  'AUDJPY': 'OANDA:AUDJPY',
  'AUD/JPY': 'OANDA:AUDJPY',
  'USDTRY': 'OANDA:USDTRY',
  'USD/TRY': 'OANDA:USDTRY',
  'EURTRY': 'OANDA:EURTRY',
  'EUR/TRY': 'OANDA:EURTRY',
  'USDMXN': 'OANDA:USDMXN',
  'USD/MXN': 'OANDA:USDMXN',
  'USDZAR': 'OANDA:USDZAR',
  'USD/ZAR': 'OANDA:USDZAR',
  'USDSGD': 'OANDA:USDSGD',
  'USD/SGD': 'OANDA:USDSGD',
  'USDHKD': 'OANDA:USDHKD',
  'USD/HKD': 'OANDA:USDHKD',
  'USDCNY': 'OANDA:USDCNH',
  'USD/CNY': 'OANDA:USDCNH',
  'USDINR': 'OANDA:USDINR',
  'USD/INR': 'OANDA:USDINR',
  'DXY': 'TVC:DXY',
  'DOLLAR': 'TVC:DXY',
  'USDOLLAR': 'TVC:DXY',
};

// TradingView indeks kodları — exchange:symbol (TradingView sayfalarından doğrulanmış)
const INDEX_SYMBOLS: Record<string, string> = {
  'SPY': 'AMEX:SPY',
  'QQQ': 'NASDAQ:QQQ',
  'DIA': 'AMEX:DIA',
  'IWM': 'AMEX:IWM',
  'SPX': 'TVC:SPX',
  'SP500': 'TVC:SPX',
  'S&P500': 'TVC:SPX',
  'NDX': 'NASDAQ:NDX',
  'NASDAQ': 'NASDAQ:NDX',
  'IXIC': 'TVC:IXIC',
  'DOW': 'DJ:DJI',
  'DJI': 'DJ:DJI',
  'RUT': 'TVC:RUT',
  'VIX': 'CBOE:VIX',
  'FTSE': 'FTSE:UKX',
  'DAX': 'XETR:DAX',
  'CAC': 'EURONEXT:PX1',
  'N225': 'TVC:NI225',
  'NIKKEI': 'TVC:NI225',
  'HSI': 'HSI:HSI',
  'SSEC': 'SSE:000001',
  'KOSPI': 'TVC:KOSPI',
  'ASX': 'ASX:XJO',
  'BVSP': 'BMFBOVESPA:IBOV',
  'IBOV': 'BMFBOVESPA:IBOV',
  'TSX': 'TSX:TSX',
  'GSPTSE': 'TSX:TSX',
  'BIST': 'BIST:XU100',
  'XU100': 'BIST:XU100',
};

// TradingView emtia kodları — gerçek futures/CFD exchange:symbol
const COMMODITY_SYMBOLS: Record<string, string> = {
  'GOLD': 'TVC:GOLD',
  'XAU': 'TVC:GOLD',
  'XAUUSD': 'TVC:GOLD',
  'SILVER': 'TVC:SILVER',
  'XAG': 'TVC:SILVER',
  'XAGUSD': 'TVC:SILVER',
  'PLATINUM': 'NYMEX:PL1!',
  'XPTUSD': 'NYMEX:PL1!',
  'PALLADIUM': 'NYMEX:PA1!',
  'XPDUSD': 'NYMEX:PA1!',
  'OIL': 'NYMEX:CL1!',
  'CRUDE': 'NYMEX:CL1!',
  'WTI': 'NYMEX:CL1!',
  'USOIL': 'NYMEX:CL1!',
  'BRENT': 'NYMEX:BZ1!',
  'UKOIL': 'NYMEX:BZ1!',
  'NATGAS': 'NYMEX:NG1!',
  'GAS': 'NYMEX:NG1!',
  'COPPER': 'COMEX:HG1!',
  'WHEAT': 'CBOT:ZW1!',
  'CORN': 'CBOT:ZC1!',
  'SOYBEAN': 'CBOT:ZS1!',
  'COFFEE': 'ICEUS:KC1!',
  'SUGAR': 'ICEUS:SB1!',
  'COTTON': 'ICEUS:CT1!',
  'COCOA': 'ICEUS:CC1!',
};

export type TradingViewCategory = 'crypto' | 'forex' | 'stocks' | 'commodities' | 'indices';

/**
 * Convert asset name to TradingView symbol
 * @param asset - Asset name like "BTC", "AAPL", "EURUSD"
 * @param category - Optional: crypto|forex|stocks|commodities|indices (widget’tan gelirse doğru fallback)
 * @returns TradingView: crypto BINANCE:XXXUSDT, forex OANDA:PARITE, stocks/indices/commodities ilgili exchange
 */
export function assetToTradingViewSymbol(asset: string, category?: TradingViewCategory): string | null {
  if (!asset) return null;
  
  const normalized = asset.toUpperCase().trim().replace(/\s+/g, '').replace(/\//g, '');
  
  if (normalized.includes(':')) {
    const [providerRaw, symbolRaw] = normalized.split(':', 2);
    const provider = (providerRaw || '').trim();
    const symPart = (symbolRaw || '').trim();
    const sym = symPart.replace(/\//g, '').replace(/[^A-Z0-9.]/g, '');

    // Forex: OANDA parite adı
    if (provider === 'OANDA' || provider === 'FX' || provider === 'FX_IDC' || provider === 'FOREX' || provider === 'FOREXCOM') {
      const clean = sym.replace(/[^A-Z0-9]/g, '');
      if (clean.length >= 6) return `OANDA:${clean}`;
      return clean ? `OANDA:${clean}` : null;
    }

    // BINANCE/COINBASE vb. crypto: exchange kaldır, sadece sembol+USD (TradingView bulur)
    if (['BINANCE', 'COINBASE', 'KRAKEN', 'OKX', 'BYBIT', 'BITSTAMP', 'GEMINI'].includes(provider)) {
      const base = sym.replace(/USDT$/g, '').replace(/USD$/g, '').replace(/USDC$/g, '');
      if (/^[A-Z]{6}$/.test(base) && !CRYPTO_SYMBOLS[base]) return `OANDA:${base}`; // forex yanlışlıkla
      if (base.length >= 2) return `${base}USD`;
    }

    // Known TV providers (crypto değilse), keep as-is
    if (['NASDAQ', 'NYSE', 'AMEX', 'TVC', 'CBOE', 'SP', 'DJ', 'INDEX', 'XETR', 'NYMEX', 'COMEX', 'OANDA', 'EURONEXT', 'CBOT', 'ICE', 'ICEUS', 'FTSE', 'HSI', 'SSE', 'BMFBOVESPA', 'BIST'].includes(provider)) {
      return `${provider}:${symPart}`;
    }

    // Unknown provider: drop provider and continue normalization as bare symbol
    return assetToTradingViewSymbol(sym, category);
  }
  
  // Check crypto symbols
  if (CRYPTO_SYMBOLS[normalized]) {
    return CRYPTO_SYMBOLS[normalized];
  }
  
  // Check if it's a crypto/stock/index with USD/USDT suffix (e.g. AAPLUSD -> AAPL)
  const withoutUSD = normalized.replace(/USD$/, '').replace(/USDT$/, '');
  if (CRYPTO_SYMBOLS[withoutUSD]) {
    return CRYPTO_SYMBOLS[withoutUSD];
  }
  if (STOCK_EXCHANGES[withoutUSD]) {
    return STOCK_EXCHANGES[withoutUSD];
  }
  if (INDEX_SYMBOLS[withoutUSD]) {
    return INDEX_SYMBOLS[withoutUSD];
  }

  // Check stock symbols (exact) — stocks’e dokunma
  if (STOCK_EXCHANGES[normalized]) {
    return STOCK_EXCHANGES[normalized];
  }
  
  // Check forex pairs → OANDA:PARITE
  if (FOREX_PAIRS[normalized]) {
    return FOREX_PAIRS[normalized];
  }

  // Önce emtia: COFFEE, COTTON, SUGAR, COCOA 6 harf olduğu için forex sanılıyordu
  if (COMMODITY_SYMBOLS[normalized]) {
    return COMMODITY_SYMBOLS[normalized];
  }

  // Check index symbols
  if (INDEX_SYMBOLS[normalized]) {
    return INDEX_SYMBOLS[normalized];
  }

  // Generic forex: 6 harfli parite → OANDA (sadece gerçek parite; emtia değilse)
  if (/^[A-Z]{6}$/.test(normalized)) {
    return `OANDA:${normalized}`;
  }

  // FMP-style commodity codes -> TradingView
  if (normalized === 'GCUSD') return 'TVC:GOLD';
  if (normalized === 'CLUSD') return 'NYMEX:CL1!';
  if (normalized === 'SIUSD') return 'TVC:SILVER';
  if (normalized === 'PLUSD') return 'NYMEX:PL1!';
  if (normalized === 'PAUSD') return 'NYMEX:PA1!';
  
  // Crypto fallback: listede yoksa sadece sembol+USD (TradingView kendisi bulur)
  if (category === 'crypto' && /^[A-Z0-9]{2,10}$/.test(normalized)) {
    return `${normalized}USD`;
  }
  
  // Fallback: bilinmeyen US hisse benzeri → NASDAQ (sadece category yok veya stocks ise)
  if (!category || category === 'stocks') {
    if (/^[A-Z]{1,5}$/.test(normalized)) {
      return `NASDAQ:${normalized}`;
    }
  }

  return null;
}

/**
 * Get chart URL for TradingView
 */
export function getTradingViewChartUrl(symbol: string): string {
  const tvSymbol = assetToTradingViewSymbol(symbol);
  if (!tvSymbol) return '';
  return `https://www.tradingview.com/chart/?symbol=${tvSymbol.replace(':', '%3A')}`;
}

/**
 * Extract assets from text and convert to TradingView symbols
 */
export function extractTradingViewSymbols(text: string): string[] {
  const symbols: string[] = [];
  
  // Common patterns
  const patterns = [
    /\b([A-Z]{2,5})\b/g,  // Stock tickers
    /\$([A-Z]{2,5})\b/g,  // $AAPL format
    /\b([A-Z]{3,4})(?:USD|USDT)?\b/g,  // Crypto like BTCUSD
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const symbol = match[1];
      const tvSymbol = assetToTradingViewSymbol(symbol);
      if (tvSymbol && !symbols.includes(tvSymbol)) {
        symbols.push(tvSymbol);
      }
    }
  });
  
  return symbols.slice(0, 5); // Max 5 symbols
}

export default assetToTradingViewSymbol;
