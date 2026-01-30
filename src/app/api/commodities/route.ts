import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/api/auth';

// Yahoo Finance symbols for commodities
const commodities = [
  // Precious Metals
  { symbol: 'XAUUSD', yahooSymbol: 'GC=F', name: 'Gold', unit: 'oz', category: 'metal' },
  { symbol: 'XAGUSD', yahooSymbol: 'SI=F', name: 'Silver', unit: 'oz', category: 'metal' },
  { symbol: 'XPTUSD', yahooSymbol: 'PL=F', name: 'Platinum', unit: 'oz', category: 'metal' },
  { symbol: 'XPDUSD', yahooSymbol: 'PA=F', name: 'Palladium', unit: 'oz', category: 'metal' },
  // Energy
  { symbol: 'USOIL', yahooSymbol: 'CL=F', name: 'Crude Oil WTI', unit: 'bbl', category: 'energy' },
  { symbol: 'UKOIL', yahooSymbol: 'BZ=F', name: 'Brent Crude', unit: 'bbl', category: 'energy' },
  { symbol: 'NATGAS', yahooSymbol: 'NG=F', name: 'Natural Gas', unit: 'MMBtu', category: 'energy' },
  // Industrial Metals
  { symbol: 'COPPER', yahooSymbol: 'HG=F', name: 'Copper', unit: 'lb', category: 'metal' },
  // Agricultural
  { symbol: 'WHEAT', yahooSymbol: 'ZW=F', name: 'Wheat', unit: 'bu', category: 'agriculture' },
  { symbol: 'CORN', yahooSymbol: 'ZC=F', name: 'Corn', unit: 'bu', category: 'agriculture' },
  { symbol: 'SOYBEAN', yahooSymbol: 'ZS=F', name: 'Soybeans', unit: 'bu', category: 'agriculture' },
  { symbol: 'COFFEE', yahooSymbol: 'KC=F', name: 'Coffee', unit: 'lb', category: 'agriculture' },
  { symbol: 'SUGAR', yahooSymbol: 'SB=F', name: 'Sugar', unit: 'lb', category: 'agriculture' },
  { symbol: 'COTTON', yahooSymbol: 'CT=F', name: 'Cotton', unit: 'lb', category: 'agriculture' },
  { symbol: 'COCOA', yahooSymbol: 'CC=F', name: 'Cocoa', unit: 'ton', category: 'agriculture' },
];

// TradingView logos for commodities that work, custom SVG for others
const commodityLogos: Record<string, string> = {
  // Precious Metals - TradingView works
  XAUUSD: 'https://s3-symbol-logo.tradingview.com/metal/gold--big.svg',
  XAGUSD: 'https://s3-symbol-logo.tradingview.com/metal/silver--big.svg',
  XPTUSD: 'https://s3-symbol-logo.tradingview.com/metal/platinum--big.svg',
  XPDUSD: 'https://s3-symbol-logo.tradingview.com/metal/palladium--big.svg',
  // Energy - TradingView works
  USOIL: 'https://s3-symbol-logo.tradingview.com/crude-oil--big.svg',
  UKOIL: 'https://s3-symbol-logo.tradingview.com/crude-oil--big.svg',
  NATGAS: 'https://s3-symbol-logo.tradingview.com/natural-gas--big.svg',
  // Industrial Metals - TradingView works
  COPPER: 'https://s3-symbol-logo.tradingview.com/metal/copper--big.svg',
  ALUMINUM: 'https://s3-symbol-logo.tradingview.com/metal/aluminum--big.svg',
  // Agricultural - Custom SVG icons (TradingView doesn't have these)
  WHEAT: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23DAA520'/%3E%3Cpath d='M50 85 L50 40' stroke='%23228B22' stroke-width='4'/%3E%3Cellipse cx='50' cy='35' rx='8' ry='15' fill='%23F4A460'/%3E%3Cellipse cx='38' cy='42' rx='6' ry='12' fill='%23F4A460' transform='rotate(-20 38 42)'/%3E%3Cellipse cx='62' cy='42' rx='6' ry='12' fill='%23F4A460' transform='rotate(20 62 42)'/%3E%3Cellipse cx='35' cy='55' rx='5' ry='10' fill='%23F4A460' transform='rotate(-30 35 55)'/%3E%3Cellipse cx='65' cy='55' rx='5' ry='10' fill='%23F4A460' transform='rotate(30 65 55)'/%3E%3C/svg%3E",
  CORN: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23FFD700'/%3E%3Cellipse cx='50' cy='50' rx='18' ry='35' fill='%23FFA500'/%3E%3Ccircle cx='42' cy='30' r='4' fill='%23FFEC8B'/%3E%3Ccircle cx='50' cy='28' r='4' fill='%23FFEC8B'/%3E%3Ccircle cx='58' cy='30' r='4' fill='%23FFEC8B'/%3E%3Ccircle cx='40' cy='42' r='4' fill='%23FFEC8B'/%3E%3Ccircle cx='50' cy='40' r='4' fill='%23FFEC8B'/%3E%3Ccircle cx='60' cy='42' r='4' fill='%23FFEC8B'/%3E%3Ccircle cx='42' cy='54' r='4' fill='%23FFEC8B'/%3E%3Ccircle cx='50' cy='52' r='4' fill='%23FFEC8B'/%3E%3Ccircle cx='58' cy='54' r='4' fill='%23FFEC8B'/%3E%3Ccircle cx='44' cy='66' r='4' fill='%23FFEC8B'/%3E%3Ccircle cx='50' cy='64' r='4' fill='%23FFEC8B'/%3E%3Ccircle cx='56' cy='66' r='4' fill='%23FFEC8B'/%3E%3Cpath d='M30 20 Q35 35 50 45' stroke='%23228B22' stroke-width='3' fill='none'/%3E%3Cpath d='M70 20 Q65 35 50 45' stroke='%23228B22' stroke-width='3' fill='none'/%3E%3C/svg%3E",
  SOYBEAN: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2390EE90'/%3E%3Cellipse cx='40' cy='45' rx='12' ry='18' fill='%23556B2F' transform='rotate(-15 40 45)'/%3E%3Cellipse cx='60' cy='55' rx='12' ry='18' fill='%23556B2F' transform='rotate(15 60 55)'/%3E%3Cellipse cx='50' cy='40' rx='10' ry='15' fill='%236B8E23'/%3E%3C/svg%3E",
  COFFEE: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%236F4E37'/%3E%3Cellipse cx='50' cy='50' rx='25' ry='32' fill='%238B7355'/%3E%3Cpath d='M50 22 Q48 50 50 78' stroke='%234A3728' stroke-width='4' fill='none'/%3E%3Cellipse cx='50' cy='50' rx='20' ry='28' fill='none' stroke='%23A0826D' stroke-width='2'/%3E%3C/svg%3E",
  SUGAR: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%23FFFAF0'/%3E%3Crect x='25' y='35' width='22' height='22' rx='3' fill='%23FFF' stroke='%23DDD' stroke-width='2'/%3E%3Crect x='53' y='35' width='22' height='22' rx='3' fill='%23FFF' stroke='%23DDD' stroke-width='2'/%3E%3Crect x='39' y='50' width='22' height='22' rx='3' fill='%23F8F8F8' stroke='%23DDD' stroke-width='2'/%3E%3C/svg%3E",
  COTTON: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2387CEEB'/%3E%3Ccircle cx='50' cy='42' r='14' fill='%23FFFAFA'/%3E%3Ccircle cx='36' cy='50' r='12' fill='%23FFF'/%3E%3Ccircle cx='64' cy='50' r='12' fill='%23FFF'/%3E%3Ccircle cx='42' cy='62' r='11' fill='%23FFFAFA'/%3E%3Ccircle cx='58' cy='62' r='11' fill='%23FFFAFA'/%3E%3Cpath d='M50 72 L50 90' stroke='%23228B22' stroke-width='4' fill='none'/%3E%3C/svg%3E",
  COCOA: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%238B4513'/%3E%3Cellipse cx='50' cy='50' rx='22' ry='35' fill='%23D2691E'/%3E%3Cpath d='M35 30 Q50 50 35 70' stroke='%238B4513' stroke-width='3' fill='none'/%3E%3Cpath d='M65 30 Q50 50 65 70' stroke='%238B4513' stroke-width='3' fill='none'/%3E%3C/svg%3E",
};

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const { success, reset } = await checkRateLimit(`public:${clientIP}:commodities`, 'general');
    if (!success) {
      return NextResponse.json({
        error: 'Too many requests',
        retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : 60,
      }, { status: 429 });
    }

    // Fetch all commodity prices from Yahoo Finance in parallel
    const commoditiesData = await Promise.all(
      commodities.map(async (commodity, index) => {
        try {
          const response = await fetch(
            `https://query2.finance.yahoo.com/v8/finance/chart/${commodity.yahooSymbol}?interval=1d&range=1d`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
              next: { revalidate: 60 }
            }
          );
          
          if (!response.ok) {
            console.error(`Failed to fetch ${commodity.yahooSymbol}`);
            return null;
          }
          
          const data = await response.json();
          const result = data.chart?.result?.[0];
          const meta = result?.meta;
          
          if (!meta) return null;
          
          const currentPrice = meta.regularMarketPrice || 0;
          const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
          const changePercent = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
          
          return {
            symbol: commodity.symbol,
            name: commodity.name,
            unit: commodity.unit,
            category: commodity.category,
            logo: commodityLogos[commodity.symbol] || '',
            price: currentPrice,
            change24h: changePercent,
            high24h: meta.regularMarketDayHigh || currentPrice * 1.01,
            low24h: meta.regularMarketDayLow || currentPrice * 0.99,
            rank: index + 1,
          };
        } catch (error) {
          console.error(`Error fetching ${commodity.symbol}:`, error);
          return null;
        }
      })
    );
    
    // Filter out failed requests
    const validData = commoditiesData.filter(c => c !== null);
    
    return NextResponse.json({ commodities: validData });
  } catch (error) {
    console.error('Error fetching commodities data:', error);
    return NextResponse.json({ error: 'Failed to fetch commodities data' }, { status: 500 });
  }
}
