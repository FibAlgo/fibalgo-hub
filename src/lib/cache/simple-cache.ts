// ═══════════════════════════════════════════════════════════════════════════════
// 🗄️ SIMPLE CACHE FOR API RESPONSES
// Reduces redundant API calls and improves rate limit handling
// ═══════════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly maxSize = 100;

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set a value in cache
   * @param ttlMs - Time to live in milliseconds
   */
  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    // Evict old entries if cache is too large
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Get or compute a value
   */
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttlMs: number = 60000
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      console.log(`📦 Cache hit: ${key}`);
      return cached;
    }

    console.log(`🌐 Cache miss: ${key}`);
    const data = await fetcher();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const apiCache = new SimpleCache();

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 CACHE KEY GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

export const cacheKeys = {
  fearGreed: () => 'market:fear-greed',
  btcPrice: () => 'market:btc-price',
  vix: () => 'market:vix',
  dxy: () => 'market:dxy',
  treasury: () => 'market:treasury',
  centralBank: () => 'market:central-bank',
  events: () => 'market:events',
  assetPrice: (symbol: string) => `asset:${symbol.toLowerCase()}`,
  onChain: () => 'data:onchain',
  fundingRates: () => 'data:funding-rates',
  openInterest: () => 'data:open-interest',
  liquidations: () => 'data:liquidations',
  stablecoin: () => 'data:stablecoin',
  whaleData: () => 'data:whale',
};

// ═══════════════════════════════════════════════════════════════════════════════
// ⏱️ CACHE TTL CONFIGURATIONS (in milliseconds)
// ═══════════════════════════════════════════════════════════════════════════════

export const cacheTTL = {
  marketData: 5 * 60 * 1000,        // 5 minutes for market data
  assetPrices: 1 * 60 * 1000,       // 1 minute for prices
  onChain: 10 * 60 * 1000,          // 10 minutes for on-chain data
  fundingRates: 15 * 60 * 1000,     // 15 minutes (updates every 8h)
  events: 60 * 60 * 1000,           // 1 hour for upcoming events
  centralBank: 24 * 60 * 60 * 1000, // 24 hours for central bank rates
};

export default apiCache;
