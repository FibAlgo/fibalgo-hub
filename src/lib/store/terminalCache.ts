'use client';

// Terminal data cache with localStorage persistence
const CACHE_KEY = 'terminal_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export interface TerminalCacheData {
  news?: {
    items: unknown[];
    timestamp: number;
    period?: string; // 24h | 7d | 30d - cache only valid for this period
  };
  calendar?: {
    events: unknown[];
    timestamp: number;
  };
  markets?: {
    forex: unknown[];
    crypto: unknown[];
    indices: unknown[];
    commodities: unknown[];
    timestamp: number;
  };
  sentiment?: {
    data: unknown;
    timestamp: number;
    period?: string; // 24h | 7d | 30d
  };
  trendingTopics?: {
    topics: unknown[];
    timestamp: number;
  };
  initialized?: boolean;
  lastFullLoad?: number;
}

// Get cache from localStorage
export function getTerminalCache(): TerminalCacheData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

// Set cache to localStorage
export function setTerminalCache(data: Partial<TerminalCacheData>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const existing = getTerminalCache() || {};
    const updated = { ...existing, ...data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

// Check if cache is valid (not expired)
export function isCacheValid(timestamp?: number): boolean {
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_EXPIRY;
}

// Check if full initial load was done recently
export function needsInitialLoad(): boolean {
  const cache = getTerminalCache();
  if (!cache?.initialized || !cache?.lastFullLoad) return true;
  // Re-initialize after 5 minutes
  return Date.now() - cache.lastFullLoad > CACHE_EXPIRY;
}

// Mark initial load as complete
export function markInitialized(): void {
  setTerminalCache({ 
    initialized: true, 
    lastFullLoad: Date.now() 
  });
}

// Clear all cache
export function clearTerminalCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}

// Prefetch all terminal data
export async function prefetchTerminalData(
  onProgress?: (progress: number, message: string) => void
): Promise<void> {
  const totalSteps = 5;
  let completed = 0;
  
  const updateProgress = (message: string) => {
    completed++;
    onProgress?.(Math.round((completed / totalSteps) * 100), message);
  };

  try {
    // Fetch all data in parallel
    const [newsRes, calendarRes, sentimentRes, marketsRes] = await Promise.allSettled([
      // News
      fetch('/api/news?limit=10000').then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setTerminalCache({
            news: { items: data.news || [], timestamp: Date.now() }
          });
        }
        updateProgress('News loaded');
      }),
      
      // Calendar
      (() => {
        // Prefetch calendar with SMALL range to avoid rate-limit + huge payload (no default 1y range)
        const toLocalDateString = (d: Date): string => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };
        const now = new Date();
        const from = toLocalDateString(now);
        const toDate = new Date(now);
        toDate.setDate(toDate.getDate() + 7);
        const to = toLocalDateString(toDate);
        const url = `/api/calendar?from=${from}&to=${to}&type=all`;
        return fetch(url);
      })().then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setTerminalCache({
            calendar: { events: data.events || data || [], timestamp: Date.now() }
          });
        }
        updateProgress('Calendar loaded');
      }),
      
      // Sentiment
      fetch('/api/news/sentiment').then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setTerminalCache({
            sentiment: { data, timestamp: Date.now() }
          });
        }
        updateProgress('Sentiment loaded');
      }),
      
      // Markets (forex, crypto, etc.)
      Promise.all([
        fetch('/api/forex').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/commodities').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/indices').then(r => r.ok ? r.json() : { data: [] }),
      ]).then(([forex, commodities, indices]) => {
        setTerminalCache({
          markets: {
            forex: forex.data || [],
            crypto: [],
            indices: indices.data || [],
            commodities: commodities.data || [],
            timestamp: Date.now()
          }
        });
        updateProgress('Markets loaded');
      }),
    ]);

    // Extract trending topics from news if available
    const cache = getTerminalCache();
    if (cache?.news?.items) {
      const topicCounts: Record<string, number> = {};
      (cache.news.items as Array<{ category?: string; content?: string }>).forEach((item) => {
        if (item.category) {
          topicCounts[item.category] = (topicCounts[item.category] || 0) + 1;
        }
      });
      
      const topics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic, count], index) => ({ topic, count, rank: index + 1 }));
      
      setTerminalCache({
        trendingTopics: { topics, timestamp: Date.now() }
      });
    }
    updateProgress('Trends analyzed');

    // Mark as fully initialized
    markInitialized();
    
  } catch (error) {
    console.error('Error prefetching terminal data:', error);
    // Still mark as initialized to prevent infinite loading
    markInitialized();
  }
}
