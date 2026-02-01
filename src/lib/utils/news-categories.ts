/**
 * Shared news category colors and labels.
 * Used by terminal/news and home (TerminalShowcase) so charts and metrics stay aligned.
 * Categories must match API /api/news/sentiment categoryBreakdown: crypto, forex, stocks, commodities, indices.
 * Optional: macro, earnings (terminal/news display).
 */

export const NEWS_CATEGORIES = ['crypto', 'forex', 'stocks', 'commodities', 'indices'] as const;
export type NewsCategoryKey = (typeof NEWS_CATEGORIES)[number] | 'macro' | 'earnings' | 'general';

export function getCategoryColors(category?: string | null): { bg: string; text: string } {
  switch (category?.toLowerCase()) {
    case 'crypto':
    case 'cryptocurrency':
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' };
    case 'forex':
      return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' };
    case 'stocks':
      return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E' };
    case 'commodities':
      return { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7' };
    case 'indices':
      return { bg: 'rgba(20, 184, 166, 0.15)', text: '#14B8A6' };
    case 'earnings':
      return { bg: 'rgba(236, 72, 153, 0.15)', text: '#EC4899' };
    case 'macro':
      return { bg: 'rgba(6, 182, 212, 0.15)', text: '#06B6D4' };
    default:
      return { bg: 'rgba(0, 229, 255, 0.1)', text: '#00E5FF' };
  }
}

/** Display label for category (e.g. for badges). */
export function getCategoryLabel(category?: string | null): string {
  if (!category) return 'General';
  const c = category.toLowerCase();
  if (c === 'cryptocurrency') return 'Crypto';
  if (c === 'central banks' || c === 'fomc' || c === 'cpi') return 'Macro';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Tek kaynak: Aynı haber hem terminal (News & Tweets) hem /terminal/news'de aynı kategoriyi göstersin.
 * Öncelik: AI stage1.category → item.category → 'general'. "cryptocurrency" → "crypto" normalize.
 * Herhangi haber objesini kabul eder (NewsItem, API response vb.).
 */
export function getCanonicalCategory(item: unknown): string {
  if (!item || typeof item !== 'object') return 'general';
  const o = item as Record<string, unknown>;
  const ai = o.aiAnalysis as Record<string, unknown> | undefined;
  const stage1 = ai?.stage1 as Record<string, unknown> | undefined;
  const raw =
    (stage1?.category ?? o.category ?? 'general')?.toString().trim() || 'general';
  const lower = raw.toLowerCase();
  if (lower === 'cryptocurrency') return 'crypto';
  return lower || 'general';
}
