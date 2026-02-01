/**
 * FMP haber API tarih yardımcıları.
 * FMP publishedDate timezone bilgisi vermiyor; UTC kabul edip parse ediyoruz
 * ki 6 saat lookback filtresi doğru çalışsın ve siteye haber düşsün.
 */

/** FMP'den gelen ham tarih string'ini UTC kabul edip ms döndürür. */
export function parseFmpPublishedMs(publishedDate: string | undefined): number | null {
  if (!publishedDate) return null;
  let s = String(publishedDate).trim();
  if (!s) return null;
  // Z veya ±HH:MM yoksa UTC kabul et (Z ekle). Boşlukları T yap (ISO için).
  if (!/Z|[+-]\d{2}:?\d{2}$/.test(s)) {
    s = s.replace(/\s+/, 'T') + 'Z';
  }
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

/** Ham FMP haber maddesinden yayın zamanı (ms). publishedDate / published_at / publishedAt dener. */
export function getFmpArticlePublishedMs(article: Record<string, unknown>): number | null {
  const raw =
    (article.publishedDate as string) ??
    (article.published_at as string) ??
    (article.publishedAt as string);
  return parseFmpPublishedMs(raw ?? undefined);
}

// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// FMP / API event tarihleri (UTC)
// FMP Economic Calendar UTC timezone kullanıyor (resmi dokümantasyon):
// https://site.financialmodelingprep.com/faqs
// "What is the time zone for the Economic Calendar?"
// "The Time Zone for the Economic Calendar events is UTC time zone."
// ═══════════════════════════════════════════════════════════════════

/** Event tarih string'ini (date veya datetime) UTC olarak parse edip ms döndürür. */
export function parseFmpEventDateMs(
  rawDate: string | undefined,
  rawTime?: string | undefined
): number | null {
  if (!rawDate || !String(rawDate).trim()) return null;
  let s = String(rawDate).trim();
  const timePart = rawTime != null && String(rawTime).trim() ? String(rawTime).trim() : null;
  
  // Date ve time'ı birleştir
  if (timePart && !/T|\s/.test(s)) {
    s = s + 'T' + timePart.replace(/\s+/, 'T');
  } else if (!/T|\s/.test(s) && !timePart) {
    s = s + 'T00:00:00';
  } else if (/\s/.test(s) && !/Z|[+-]\d{2}:?\d{2}$/.test(s)) {
    s = s.replace(/\s+/, 'T');
  }
  
  // FMP UTC kullanıyor - 'Z' suffix ekle
  if (!/Z|[+-]\d{2}:?\d{2}$/.test(s)) s = s + 'Z';
  
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

/** Event ham date/time'tan UTC YYYY-MM-DD ve time (HH:mm) döndürür.
 * NOT: Bu fonksiyon UTC değerleri döndürür - client'ta local'e çevrilmeli! */
export function parseFmpEventDateToParts(
  rawDate: string | undefined,
  rawTime?: string | undefined
): { date: string; time?: string } {
  const ms = parseFmpEventDateMs(rawDate, rawTime);
  if (ms == null) return { date: new Date().toISOString().split('T')[0] };
  const d = new Date(ms);
  const iso = d.toISOString();
  const date = iso.split('T')[0];
  const time = iso.split('T')[1]?.slice(0, 5) || undefined;
  return time !== '00:00' ? { date, time } : { date };
}
