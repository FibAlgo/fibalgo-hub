// ═══════════════════════════════════════════════════════════════════════════════
// 📈 TRADING VIEW SYMBOL CONVERTER
// Asset isimlerini TradingView sembol formatına dönüştürür
// ═══════════════════════════════════════════════════════════════════════════════

// Known symbol mappings
const CRYPTO_SYMBOLS: Record<string, string> = {
  'BTC': 'BINANCE:BTCUSDT',
  'BTCUSD': 'BINANCE:BTCUSDT',
  'BTCUSDT': 'BINANCE:BTCUSDT',
  'ETH': 'BINANCE:ETHUSDT',
  'ETHUSD': 'BINANCE:ETHUSDT',
  'ETHUSDT': 'BINANCE:ETHUSDT',
  'SOL': 'BINANCE:SOLUSDT',
  'SOLUSD': 'BINANCE:SOLUSDT',
  'BNB': 'BINANCE:BNBUSDT',
  'XRP': 'BINANCE:XRPUSDT',
  'ADA': 'BINANCE:ADAUSDT',
  'DOGE': 'BINANCE:DOGEUSDT',
  'DOT': 'BINANCE:DOTUSDT',
  'AVAX': 'BINANCE:AVAXUSDT',
  'MATIC': 'BINANCE:MATICUSDT',
  'LINK': 'BINANCE:LINKUSDT',
  'UNI': 'BINANCE:UNIUSDT',
  'ATOM': 'BINANCE:ATOMUSDT',
  'LTC': 'BINANCE:LTCUSDT',
  'SHIB': 'BINANCE:SHIBUSDT',
  'TRX': 'BINANCE:TRXUSDT',
  'ETC': 'BINANCE:ETCUSDT',
  'XLM': 'BINANCE:XLMUSDT',
  'NEAR': 'BINANCE:NEARUSDT',
  'APT': 'BINANCE:APTUSDT',
  'ARB': 'BINANCE:ARBUSDT',
  'OP': 'BINANCE:OPUSDT',
  'SUI': 'BINANCE:SUIUSDT',
  'PEPE': 'BINANCE:PEPEUSDT',
  'WIF': 'BINANCE:WIFUSDT',
  'BONK': 'BINANCE:BONKUSDT',
  'FET': 'BINANCE:FETUSDT',
  'RNDR': 'BINANCE:RNDRUSDT',
  'IMX': 'BINANCE:IMXUSDT',
  'SEI': 'BINANCE:SEIUSDT',
  'INJ': 'BINANCE:INJUSDT',
  'MEME': 'BINANCE:MEMEUSDT',
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
};

const FOREX_PAIRS: Record<string, string> = {
  'EURUSD': 'FX:EURUSD',
  'EUR/USD': 'FX:EURUSD',
  'GBPUSD': 'FX:GBPUSD',
  'GBP/USD': 'FX:GBPUSD',
  'USDJPY': 'FX:USDJPY',
  'USD/JPY': 'FX:USDJPY',
  'USDCHF': 'FX:USDCHF',
  'USD/CHF': 'FX:USDCHF',
  'AUDUSD': 'FX:AUDUSD',
  'AUD/USD': 'FX:AUDUSD',
  'USDCAD': 'FX:USDCAD',
  'USD/CAD': 'FX:USDCAD',
  'NZDUSD': 'FX:NZDUSD',
  'NZD/USD': 'FX:NZDUSD',
  'EURGBP': 'FX:EURGBP',
  'EUR/GBP': 'FX:EURGBP',
  'EURJPY': 'FX:EURJPY',
  'EUR/JPY': 'FX:EURJPY',
  'GBPJPY': 'FX:GBPJPY',
  'GBP/JPY': 'FX:GBPJPY',
  'DXY': 'TVC:DXY',
  'DOLLAR': 'TVC:DXY',
  'USDOLLAR': 'TVC:DXY',
};

const INDEX_SYMBOLS: Record<string, string> = {
  'SPY': 'AMEX:SPY',
  'QQQ': 'NASDAQ:QQQ',
  'DIA': 'AMEX:DIA',
  'IWM': 'AMEX:IWM',
  'SPX': 'SP:SPX',
  'SP500': 'SP:SPX',
  'S&P500': 'SP:SPX',
  'NDX': 'NASDAQ:NDX',
  'NASDAQ': 'NASDAQ:NDX',
  'DOW': 'DJ:DJI',
  'DJI': 'DJ:DJI',
  'VIX': 'CBOE:VIX',
  'FTSE': 'FOREXCOM:UKXGBP',
  'DAX': 'XETR:DAX',
  'NIKKEI': 'INDEX:NKY',
};

const COMMODITY_SYMBOLS: Record<string, string> = {
  'GOLD': 'TVC:GOLD',
  'XAU': 'TVC:GOLD',
  'XAUUSD': 'TVC:GOLD',
  'SILVER': 'TVC:SILVER',
  'XAG': 'TVC:SILVER',
  'XAGUSD': 'TVC:SILVER',
  'OIL': 'TVC:USOIL',
  'CRUDE': 'TVC:USOIL',
  'WTI': 'TVC:USOIL',
  'BRENT': 'TVC:UKOIL',
  'NATGAS': 'NYMEX:NG1!',
  'GAS': 'NYMEX:NG1!',
  'COPPER': 'TVC:COPPER',
};

/**
 * Convert asset name to TradingView symbol
 * @param asset - Asset name like "BTC", "AAPL", "EURUSD"
 * @returns TradingView formatted symbol like "BINANCE:BTCUSDT"
 */
export function assetToTradingViewSymbol(asset: string): string | null {
  if (!asset) return null;
  
  // Normalize input
  const normalized = asset.toUpperCase().trim().replace(/\s+/g, '');
  
  // Check if already in TradingView format
  if (normalized.includes(':')) {
    return asset;
  }
  
  // Check crypto symbols
  if (CRYPTO_SYMBOLS[normalized]) {
    return CRYPTO_SYMBOLS[normalized];
  }
  
  // Check if it's a crypto with USDT suffix
  const withoutUSD = normalized.replace(/USD$/, '').replace(/USDT$/, '');
  if (CRYPTO_SYMBOLS[withoutUSD]) {
    return CRYPTO_SYMBOLS[withoutUSD];
  }
  
  // Check stock symbols
  if (STOCK_EXCHANGES[normalized]) {
    return STOCK_EXCHANGES[normalized];
  }
  
  // Check forex pairs
  if (FOREX_PAIRS[normalized]) {
    return FOREX_PAIRS[normalized];
  }
  
  // Check index symbols
  if (INDEX_SYMBOLS[normalized]) {
    return INDEX_SYMBOLS[normalized];
  }
  
  // Check commodities
  if (COMMODITY_SYMBOLS[normalized]) {
    return COMMODITY_SYMBOLS[normalized];
  }
  
  // Fallback: try NASDAQ for unknown symbols (common for US stocks)
  if (/^[A-Z]{1,5}$/.test(normalized)) {
    return `NASDAQ:${normalized}`;
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
