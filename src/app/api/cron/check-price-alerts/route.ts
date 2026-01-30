import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from '@/lib/notifications/sendPushNotification';
import { sendPriceAlertEmailToUser } from '@/lib/notifications/sendEmailNotification';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_NOTIFICATIONS_PER_USER = 20;

// Cleanup old notifications to keep max 20 per user
async function cleanupOldNotifications(userId: string): Promise<void> {
  try {
    const { data: toKeep } = await supabaseAdmin
      .from('notification_history')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_NOTIFICATIONS_PER_USER);

    if (toKeep && toKeep.length >= MAX_NOTIFICATIONS_PER_USER) {
      const keepIds = toKeep.map(n => n.id);
      await supabaseAdmin
        .from('notification_history')
        .delete()
        .eq('user_id', userId)
        .not('id', 'in', `(${keepIds.join(',')})`);
    }
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
  }
}

// Price data sources
const BINANCE_API = 'https://api.binance.com/api/v3';

interface PriceData {
  [symbol: string]: number;
}

// Fetch crypto prices from Binance
async function fetchCryptoPrices(symbols: string[]): Promise<PriceData> {
  const prices: PriceData = {};
  
  try {
    const response = await fetch(`${BINANCE_API}/ticker/price`);
    if (!response.ok) return prices;
    
    const data = await response.json();
    const priceMap = new Map<string, number>(
      data.map((item: { symbol: string; price: string }) => [item.symbol, parseFloat(item.price)])
    );
    
    for (const symbol of symbols) {
      const price = priceMap.get(symbol);
      if (price !== undefined) {
        prices[symbol] = price;
      }
    }
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
  }
  
  return prices;
}

// Fetch forex prices from Yahoo Finance
async function fetchForexPrices(symbols: string[]): Promise<PriceData> {
  const prices: PriceData = {};
  
  try {
    const pricePromises = symbols.map(async (symbol) => {
      // Convert symbol like EUR/USD to EURUSD=X for Yahoo
      const yahooSymbol = symbol.replace('/', '') + '=X';
      
      try {
        const response = await fetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          }
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        const meta = data.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          prices[symbol] = meta.regularMarketPrice;
        }
      } catch (e) {
        console.error(`Error fetching forex price for ${symbol}:`, e);
      }
    });
    
    await Promise.all(pricePromises);
  } catch (error) {
    console.error('Error fetching forex prices:', error);
  }
  
  return prices;
}

// Fetch stock prices from Yahoo Finance
async function fetchStockPrices(symbols: string[]): Promise<PriceData> {
  const prices: PriceData = {};
  
  try {
    const pricePromises = symbols.map(async (symbol) => {
      try {
        const response = await fetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          }
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const meta = data.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          prices[symbol] = meta.regularMarketPrice;
        }
      } catch (e) {
        console.error(`Error fetching stock price for ${symbol}:`, e);
      }
    });
    
    await Promise.all(pricePromises);
  } catch (error) {
    console.error('Error fetching stock prices:', error);
  }
  
  return prices;
}

// Yahoo Finance symbols for commodities
const COMMODITY_YAHOO_SYMBOLS: Record<string, string> = {
  XAUUSD: 'GC=F', XAGUSD: 'SI=F', XPTUSD: 'PL=F', XPDUSD: 'PA=F',
  USOIL: 'CL=F', UKOIL: 'BZ=F', NATGAS: 'NG=F',
  COPPER: 'HG=F',
  WHEAT: 'ZW=F', CORN: 'ZC=F', SOYBEAN: 'ZS=F', COFFEE: 'KC=F',
  SUGAR: 'SB=F', COTTON: 'CT=F', COCOA: 'CC=F'
};

// Fetch commodity prices from Yahoo Finance
async function fetchCommodityPrices(symbols: string[]): Promise<PriceData> {
  const prices: PriceData = {};
  
  try {
    const pricePromises = symbols.map(async (symbol) => {
      const yahooSymbol = COMMODITY_YAHOO_SYMBOLS[symbol];
      if (!yahooSymbol) return;
      
      try {
        const response = await fetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          }
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        const meta = data.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          prices[symbol] = meta.regularMarketPrice;
        }
      } catch (e) {
        console.error(`Error fetching commodity price for ${symbol}:`, e);
      }
    });
    
    await Promise.all(pricePromises);
  } catch (error) {
    console.error('Error fetching commodity prices:', error);
  }
  
  return prices;
}

// Yahoo Finance symbols for indices
const INDEX_YAHOO_SYMBOLS: Record<string, string> = {
  SPX: '^GSPC', DJI: '^DJI', IXIC: '^IXIC', RUT: '^RUT',
  FTSE: '^FTSE', DAX: '^GDAXI', CAC: '^FCHI', N225: '^N225',
  HSI: '^HSI', SSEC: '000001.SS', KOSPI: '^KS11', ASX: '^AXJO',
  BVSP: '^BVSP', TSX: '^GSPTSE', BIST: 'XU100.IS'
};

// Fetch index prices from Yahoo Finance
async function fetchIndexPrices(symbols: string[]): Promise<PriceData> {
  const prices: PriceData = {};
  
  try {
    const pricePromises = symbols.map(async (symbol) => {
      const yahooSymbol = INDEX_YAHOO_SYMBOLS[symbol];
      if (!yahooSymbol) return;
      
      try {
        const response = await fetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          }
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        const meta = data.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          prices[symbol] = meta.regularMarketPrice;
        }
      } catch (e) {
        console.error(`Error fetching index price for ${symbol}:`, e);
      }
    });
    
    await Promise.all(pricePromises);
  } catch (error) {
    console.error('Error fetching index prices:', error);
  }
  
  return prices;
}

// Check if alert should trigger
function shouldTrigger(alert: {
  alert_type: string;
  target_value: number;
  current_value: number | null;
}, currentPrice: number): boolean {
  const { alert_type, target_value, current_value } = alert;
  
  switch (alert_type) {
    case 'price_above':
      return currentPrice >= target_value;
    
    case 'price_below':
      return currentPrice <= target_value;
    
    case 'percent_change_up':
      if (!current_value) return false;
      const upChange = ((currentPrice - current_value) / current_value) * 100;
      return upChange >= target_value;
    
    case 'percent_change_down':
      if (!current_value) return false;
      const downChange = ((current_value - currentPrice) / current_value) * 100;
      return downChange >= target_value;
    
    case 'volume_spike':
      // Would need volume data - skip for now
      return false;
    
    case 'breakout_up':
    case 'breakout_down':
      // Would need historical data - skip for now
      return false;
    
    default:
      return false;
  }
}

// Create notification for triggered alert
async function createNotification(
  userId: string,
  alert: {
    id: string;
    symbol: string;
    asset_name: string;
    alert_type: string;
    target_value: number;
  },
  triggeredPrice: number
) {
  const alertTypeLabels: Record<string, string> = {
    'price_above': 'rose above',
    'price_below': 'fell below',
    'percent_change_up': 'increased by',
    'percent_change_down': 'decreased by'
  };

  const action = alertTypeLabels[alert.alert_type] || 'reached';
  const isPercent = alert.alert_type.includes('percent');
  const targetDisplay = isPercent ? `${alert.target_value}%` : `$${alert.target_value.toLocaleString()}`;

  const title = `🎯 Price Alert: ${alert.symbol}`;
  const message = `${alert.asset_name || alert.symbol} ${action} ${targetDisplay}. Current price: $${triggeredPrice.toLocaleString()}`;

  await supabaseAdmin
    .from('notification_history')
    .insert({
      user_id: userId,
      notification_type: 'price_alert',
      title,
      message,
      icon: 'target',
      action_url: '/terminal/markets',
      related_id: alert.id,
      related_type: 'price_alert',
      metadata: {
        symbol: alert.symbol,
        alert_type: alert.alert_type,
        target_value: alert.target_value,
        triggered_value: triggeredPrice
      }
    });

  // Send push notification
  await sendPushToUser(userId, {
    title,
    body: message,
    tag: `price-alert-${alert.id}`,
    url: `/terminal/chart?symbol=${alert.symbol}`,
    requireInteraction: true
  });

  // Send email notification
  await sendPriceAlertEmailToUser(
    userId,
    alert.symbol,
    alert.alert_type,
    alert.target_value,
    triggeredPrice
  );

  // Cleanup old notifications (keep max 20 per user)
  await cleanupOldNotifications(userId);
}

// This cron runs every minute to check price alerts
export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    
    // Fetch all active alerts
    const { data: alerts, error: alertsError } = await supabaseAdmin
      .from('price_alerts')
      .select('*')
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.' + now.toISOString());

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      return NextResponse.json({ error: alertsError.message }, { status: 500 });
    }

    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active alerts',
        checked: 0,
        triggered: 0
      });
    }

    // Group alerts by asset type
    const cryptoAlerts = alerts.filter(a => a.asset_type === 'crypto');
    const forexAlerts = alerts.filter(a => a.asset_type === 'forex');
    const stockAlerts = alerts.filter(a => a.asset_type === 'stocks');
    const commodityAlerts = alerts.filter(a => a.asset_type === 'commodities');
    const indexAlerts = alerts.filter(a => a.asset_type === 'indices');

    // Fetch prices
    const cryptoSymbols = [...new Set(cryptoAlerts.map(a => a.symbol))];
    const forexSymbols = [...new Set(forexAlerts.map(a => a.symbol))];
    const stockSymbols = [...new Set(stockAlerts.map(a => a.symbol))];
    const commoditySymbols = [...new Set(commodityAlerts.map(a => a.symbol))];
    const indexSymbols = [...new Set(indexAlerts.map(a => a.symbol))];

    const [cryptoPrices, forexPrices, stockPrices, commodityPrices, indexPrices] = await Promise.all([
      cryptoSymbols.length > 0 ? fetchCryptoPrices(cryptoSymbols) : {} as PriceData,
      forexSymbols.length > 0 ? fetchForexPrices(forexSymbols) : {} as PriceData,
      stockSymbols.length > 0 ? fetchStockPrices(stockSymbols) : {} as PriceData,
      commoditySymbols.length > 0 ? fetchCommodityPrices(commoditySymbols) : {} as PriceData,
      indexSymbols.length > 0 ? fetchIndexPrices(indexSymbols) : {} as PriceData
    ]);

    const allPrices: PriceData = { 
      ...cryptoPrices, 
      ...forexPrices, 
      ...stockPrices,
      ...commodityPrices,
      ...indexPrices
    };

    let triggeredCount = 0;
    const triggeredAlerts: string[] = [];

    // Check each alert
    for (const alert of alerts) {
      const currentPrice = allPrices[alert.symbol as string];
      
      if (!currentPrice) {
        // Update current_value even if we don't have price (for tracking)
        continue;
      }

      // Check cooldown for repeating alerts
      if (alert.repeat_alert && alert.last_triggered_at) {
        const lastTriggered = new Date(alert.last_triggered_at);
        const cooldownMs = (alert.cooldown_minutes || 60) * 60 * 1000;
        if (now.getTime() - lastTriggered.getTime() < cooldownMs) {
          continue; // Still in cooldown
        }
      }

      // Check if alert should trigger
      if (shouldTrigger(alert, currentPrice)) {
        triggeredCount++;
        triggeredAlerts.push(alert.symbol);

        // Create notification
        await createNotification(alert.user_id, alert, currentPrice);

        // Update alert status
        const updateData: Record<string, unknown> = {
          triggered_at: now.toISOString(),
          triggered_value: currentPrice,
          current_value: currentPrice,
          updated_at: now.toISOString()
        };

        if (alert.repeat_alert) {
          updateData.last_triggered_at = now.toISOString();
        } else {
          updateData.status = 'triggered';
        }

        await supabaseAdmin
          .from('price_alerts')
          .update(updateData)
          .eq('id', alert.id);

        console.log(`Alert triggered: ${alert.symbol} @ ${currentPrice}`);
      } else {
        // Just update current price for tracking
        await supabaseAdmin
          .from('price_alerts')
          .update({ 
            current_value: currentPrice,
            updated_at: now.toISOString()
          })
          .eq('id', alert.id);
      }
    }

    // Clean up expired alerts
    await supabaseAdmin
      .from('price_alerts')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expires_at', now.toISOString());

    return NextResponse.json({
      success: true,
      checked: alerts.length,
      triggered: triggeredCount,
      triggeredAlerts,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('Price alerts cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
