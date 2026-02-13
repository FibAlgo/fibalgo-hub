/**
 * ═══════════════════════════════════════════════════════════════
 * 🖼️ BLOG IMAGE SERVICE — AI Marker + Unsplash Integration
 * ═══════════════════════════════════════════════════════════════
 * 
 * Claude places <!-- IMAGE: search query --> markers in the HTML.
 * This service finds each marker, searches Unsplash with the
 * query, and replaces the marker with a <figure> element.
 * 
 * DIVERSITY: Uses random page selection + randomized result picking
 * + tracks recently used image URLs to avoid repetition across posts.
 */

import { createClient } from '@supabase/supabase-js';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
// RECENTLY USED IMAGE TRACKING — Prevent same images across posts
// ═══════════════════════════════════════════════════════════════
async function getRecentlyUsedImageUrls(): Promise<Set<string>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient<any>(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    // Get last 30 posts' content and scan for image URLs
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('content')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(30);

    const usedUrls = new Set<string>();
    if (posts) {
      for (const post of posts) {
        // Extract all Unsplash image URLs from content
        const imgMatches = post.content?.matchAll(/https:\/\/images\.unsplash\.com\/photo-[^"&\s]+/g);
        if (imgMatches) {
          for (const m of imgMatches) {
            // Store base URL without size/quality params for comparison
            const baseUrl = m[0].split('?')[0];
            usedUrls.add(baseUrl);
          }
        }
      }
    }
    console.log(`[BlogImages] Tracking ${usedUrls.size} recently used image URLs`);
    return usedUrls;
  } catch (err) {
    console.log('[BlogImages] Could not fetch recent images:', err);
    return new Set();
  }
}

// ═══════════════════════════════════════════════════════════════
// UNSPLASH API — Fetch image with DIVERSITY (random page + random pick)
// ═══════════════════════════════════════════════════════════════
interface UnsplashImage {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
}

async function searchUnsplashOne(
  query: string,
  recentlyUsed: Set<string>,
  sessionUsed: Set<string>,
): Promise<UnsplashImage | null> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.log('[BlogImages] No UNSPLASH_ACCESS_KEY');
    return null;
  }

  try {
    // Add finance context only if query doesn't already have it
    const enhancedQuery = query.match(/trading|chart|market|finance|crypto|forex|stock/i)
      ? query
      : `${query} trading finance`;

    // Random page (1-5) to get different results each time
    const randomPage = Math.floor(Math.random() * 5) + 1;

    const params = new URLSearchParams({
      query: enhancedQuery,
      per_page: '30',          // Fetch 30 results for a wide pool
      page: String(randomPage), // Random page for diversity
      orientation: 'landscape',
      content_filter: 'high',
      order_by: 'relevant',
    });

    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    if (!res.ok) {
      console.log(`[BlogImages] Unsplash ${res.status} for "${enhancedQuery}" (page ${randomPage})`);
      return null;
    }

    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      // If random page had no results, try page 1
      if (randomPage > 1) {
        console.log(`[BlogImages] Page ${randomPage} empty, trying page 1`);
        params.set('page', '1');
        const retryRes = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
            'Accept-Version': 'v1',
          },
        });
        if (!retryRes.ok) return null;
        const retryData = await retryRes.json();
        if (!retryData.results || retryData.results.length === 0) return null;
        data.results = retryData.results;
      } else {
        return null;
      }
    }

    // Shuffle results for randomness
    const shuffled = [...data.results].sort(() => Math.random() - 0.5);

    // Pick the first result that hasn't been used recently or in this session
    for (const img of shuffled) {
      const baseUrl = img.urls.raw?.split('?')[0] || img.urls.regular?.split('?')[0] || '';
      if (!recentlyUsed.has(baseUrl) && !sessionUsed.has(baseUrl)) {
        sessionUsed.add(baseUrl);
        return {
          url: img.urls.regular + '&w=800&q=80&fm=webp',
          alt: query,
          credit: img.user.name,
          creditUrl: img.user.links.html + '?utm_source=fibalgo&utm_medium=referral',
        };
      }
    }

    // If all are used, just pick a random one (better than nothing)
    const randomIdx = Math.floor(Math.random() * shuffled.length);
    const img = shuffled[randomIdx];
    const baseUrl = img.urls.raw?.split('?')[0] || img.urls.regular?.split('?')[0] || '';
    sessionUsed.add(baseUrl);

    return {
      url: img.urls.regular + '&w=800&q=80&fm=webp',
      alt: query,
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

  // Fetch recently used images from DB to avoid repetition
  const recentlyUsed = await getRecentlyUsedImageUrls();
  const sessionUsed = new Set<string>(); // Track within this single post too

  // Fetch an image for each marker (in parallel for speed)
  let fallbackIdx = Math.floor(Math.random() * FALLBACK_IMAGES.length); // Random fallback start

  const imagePromises = markers.map(async (marker) => {
    const img = await searchUnsplashOne(marker.query, recentlyUsed, sessionUsed);
    if (img) {
      return { marker, image: img };
    }
    // Fallback — cycle through with random start
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
