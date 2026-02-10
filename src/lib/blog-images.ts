/**
 * ═══════════════════════════════════════════════════════════════
 * 🖼️ BLOG IMAGE SERVICE — AI Marker + Unsplash Integration
 * ═══════════════════════════════════════════════════════════════
 * 
 * Claude places <!-- IMAGE: search query --> markers in the HTML.
 * This service finds each marker, searches Unsplash with the
 * query, and replaces the marker with a <figure> element.
 * 
 * Result: Each image is contextually relevant to the paragraph
 * above it because the AI chose where & what to show.
 */

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';

// ═══════════════════════════════════════════════════════════════
// FALLBACK IMAGES (when Unsplash is unavailable)
// ═══════════════════════════════════════════════════════════════
const FALLBACK_IMAGES: { url: string; alt: string; credit: string }[] = [
  { url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80', alt: 'Stock market trading charts on screen', credit: 'Unsplash' },
  { url: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80', alt: 'Cryptocurrency Bitcoin on circuit board', credit: 'Unsplash' },
  { url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80', alt: 'Financial data on trading screen', credit: 'Unsplash' },
  { url: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=800&q=80', alt: 'Stock exchange market display', credit: 'Unsplash' },
  { url: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&q=80', alt: 'Financial analysis and charts', credit: 'Unsplash' },
  { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', alt: 'Market analysis on computer', credit: 'Unsplash' },
];

// ═══════════════════════════════════════════════════════════════
// UNSPLASH API — Fetch a single image by search query
// ═══════════════════════════════════════════════════════════════
interface UnsplashImage {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
}

async function searchUnsplashOne(query: string): Promise<UnsplashImage | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.log('[BlogImages] No UNSPLASH_ACCESS_KEY');
    return null;
  }

  try {
    // Add finance context to improve relevance
    const enhancedQuery = query.match(/trading|chart|market|finance|crypto|forex|stock/i)
      ? query
      : `${query} trading finance`;

    const params = new URLSearchParams({
      query: enhancedQuery,
      per_page: '3',
      orientation: 'landscape',
      content_filter: 'high',
      order_by: 'relevant',  // Most relevant first
    });

    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    if (!res.ok) {
      console.log(`[BlogImages] Unsplash ${res.status} for "${enhancedQuery}"`);
      return null;
    }

    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;

    // Always pick the FIRST result — Unsplash ranks by relevance
    const img = data.results[0];

    return {
      url: img.urls.regular + '&w=800&q=80&fm=webp',
      alt: query, // Use the AI's search query as alt (more relevant than Unsplash's generic alt)
      credit: img.user.name,
      creditUrl: img.user.links.html + '?utm_source=fibalgo&utm_medium=referral',
    };
  } catch (err) {
    console.log(`[BlogImages] Error for "${query}":`, err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// HTML GENERATION: <figure> element
// ═══════════════════════════════════════════════════════════════
function generateFigureHtml(image: UnsplashImage, caption: string): string {
  // Use caption as alt text — it's the AI's contextual description, 
  // much more relevant than Unsplash's generic alt_description
  const safeAlt = caption.replace(/"/g, '&quot;');

  return `<figure class="blog-image-figure">
  <img src="${image.url}" alt="${safeAlt}" loading="lazy" decoding="async" width="800" height="450" />
  <figcaption>${caption} <span class="image-credit">Photo by <a href="${image.creditUrl}" target="_blank" rel="noopener noreferrer">${image.credit}</a> on <a href="https://unsplash.com/?utm_source=fibalgo&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a></span></figcaption>
</figure>`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT: Replace <!-- IMAGE: ... --> markers with photos
// ═══════════════════════════════════════════════════════════════
export async function replaceImageMarkers(
  htmlContent: string,
  keyword: string,
  category: string,
): Promise<string> {
  // Find all <!-- IMAGE: ... --> markers
  const markerRegex = /<!--\s*IMAGE:\s*(.+?)\s*-->/gi;
  const markers: { fullMatch: string; query: string; index: number }[] = [];

  let match;
  while ((match = markerRegex.exec(htmlContent)) !== null) {
    markers.push({
      fullMatch: match[0],
      query: match[1].trim(),
      index: match.index,
    });
  }

  if (markers.length === 0) {
    console.log('[BlogImages] No <!-- IMAGE: --> markers found in content');
    return htmlContent;
  }

  console.log(`[BlogImages] Found ${markers.length} image markers:`);
  markers.forEach((m, i) => console.log(`  ${i + 1}. "${m.query}"`));

  // Fetch an image for each marker (in parallel for speed)
  const usedUrls = new Set<string>();
  let fallbackIdx = 0;

  const imagePromises = markers.map(async (marker) => {
    const img = await searchUnsplashOne(marker.query);
    if (img && !usedUrls.has(img.url)) {
      usedUrls.add(img.url);
      return { marker, image: img };
    }
    // Fallback
    const fb = FALLBACK_IMAGES[fallbackIdx % FALLBACK_IMAGES.length];
    fallbackIdx++;
    return {
      marker,
      image: {
        url: fb.url,
        alt: fb.alt,
        credit: fb.credit,
        creditUrl: 'https://unsplash.com/?utm_source=fibalgo&utm_medium=referral',
      },
    };
  });

  const results = await Promise.all(imagePromises);

  // Replace markers with <figure> elements
  let output = htmlContent;
  // Replace in reverse order to preserve indices
  for (let i = results.length - 1; i >= 0; i--) {
    const { marker, image } = results[i];
    // Use the marker query as a nice caption
    const caption = marker.query
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const figureHtml = generateFigureHtml(image, caption);
    output = output.replace(marker.fullMatch, figureHtml);
  }

  const placed = (output.match(/<figure/gi) || []).length;
  console.log(`[BlogImages] Successfully placed ${placed} images`);

  return output;
}
