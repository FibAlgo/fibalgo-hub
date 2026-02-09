/**
 * ═══════════════════════════════════════════════════════════════
 * 🖼️ BLOG IMAGE SERVICE — Unsplash Integration
 * ═══════════════════════════════════════════════════════════════
 * 
 * Fetches high-quality, royalty-free images from Unsplash API
 * and inserts them between blog sections for visual engagement.
 * 
 * Features:
 * - Keyword-based image search with trading/finance context
 * - Responsive images with proper alt text (SEO)
 * - <figure> + <figcaption> for semantic HTML
 * - Lazy loading for performance
 * - Fallback to category-based generic images
 * - Rate-limit aware (50 req/hr free, 5000/hr production)
 */

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';

// ═══════════════════════════════════════════════════════════════
// CATEGORY → SEARCH QUERY MAPPING
// Maps blog categories to better Unsplash search terms
// ═══════════════════════════════════════════════════════════════
const CATEGORY_SEARCH_MAP: Record<string, string[]> = {
  'trading strategy': ['stock market trading', 'financial charts', 'trading desk setup', 'market analysis screen'],
  'technical analysis': ['stock chart analysis', 'candlestick chart', 'financial data visualization', 'trading monitor'],
  'chart patterns': ['stock market chart', 'financial graph pattern', 'trading screen', 'data visualization'],
  'crypto': ['bitcoin cryptocurrency', 'blockchain technology', 'crypto trading', 'digital currency'],
  'forex': ['forex trading', 'currency exchange', 'global finance', 'world economy'],
  'AI & automation': ['artificial intelligence technology', 'machine learning', 'algorithmic trading', 'futuristic technology'],
  'psychology': ['meditation focus', 'mindset discipline', 'mental strength', 'chess strategy thinking'],
  'risk management': ['financial security', 'risk analysis', 'shield protection', 'safety vault'],
  'options': ['stock options trading', 'financial derivatives', 'wall street', 'options contract'],
  'market analysis': ['global economy', 'market trends', 'economic data', 'financial newspaper'],
  'tradingview': ['trading platform screen', 'stock chart monitor', 'financial software', 'multi monitor trading'],
  'stocks': ['stock market wall street', 'stock exchange', 'investing stocks', 'bull market'],
  'defi': ['decentralized finance', 'blockchain network', 'digital wallet', 'web3 technology'],
  'beginner': ['learning education', 'student studying', 'financial literacy', 'first steps investing'],
  'passive income': ['passive income wealth', 'financial freedom', 'investment returns', 'money growth'],
  'portfolio': ['investment portfolio', 'asset management', 'financial planning', 'diversification'],
};

// Fallback images when Unsplash is unavailable (from Unsplash free license)
const FALLBACK_IMAGES: { url: string; alt: string; credit: string }[] = [
  { url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80', alt: 'Stock market trading charts on screen', credit: 'Unsplash' },
  { url: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80', alt: 'Cryptocurrency Bitcoin on circuit board', credit: 'Unsplash' },
  { url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80', alt: 'Financial data on trading screen', credit: 'Unsplash' },
  { url: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=800&q=80', alt: 'Stock exchange market display', credit: 'Unsplash' },
  { url: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&q=80', alt: 'Financial analysis and charts', credit: 'Unsplash' },
  { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', alt: 'Market analysis on computer', credit: 'Unsplash' },
];

// ═══════════════════════════════════════════════════════════════
// UNSPLASH API — Fetch images
// ═══════════════════════════════════════════════════════════════
interface UnsplashImage {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
  width: number;
  height: number;
}

async function searchUnsplash(query: string, count: number = 3): Promise<UnsplashImage[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.log('[BlogImages] No UNSPLASH_ACCESS_KEY, using fallbacks');
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      per_page: String(Math.min(count * 2, 10)), // Fetch extra for variety
      orientation: 'landscape',
      content_filter: 'high', // Safe content only
    });

    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!res.ok) {
      console.log(`[BlogImages] Unsplash API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.results || data.results.length === 0) return [];

    // Shuffle and pick unique images
    const shuffled = data.results.sort(() => Math.random() - 0.5);

    return shuffled.slice(0, count).map((img: {
      urls: { regular: string };
      alt_description: string | null;
      description: string | null;
      user: { name: string; links: { html: string } };
      width: number;
      height: number;
    }) => ({
      url: img.urls.regular + '&w=800&q=80&fm=webp', // Optimize: 800px wide, quality 80, WebP
      alt: img.alt_description || img.description || query,
      credit: img.user.name,
      creditUrl: img.user.links.html + '?utm_source=fibalgo&utm_medium=referral',
      width: img.width,
      height: img.height,
    }));
  } catch (err) {
    console.log(`[BlogImages] Unsplash fetch error:`, err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN: Fetch images for a blog post
// ═══════════════════════════════════════════════════════════════
export async function fetchBlogImages(
  keyword: string,
  category: string,
  sectionTitles: string[],
): Promise<UnsplashImage[]> {
  // Build search queries from keyword, category, and section titles
  const queries: string[] = [];

  // Primary: use the main keyword
  queries.push(`${keyword} finance trading`);

  // Secondary: category-based queries
  const catQueries = CATEGORY_SEARCH_MAP[category.toLowerCase()] || CATEGORY_SEARCH_MAP['trading strategy']!;
  queries.push(catQueries[Math.floor(Math.random() * catQueries.length)]);

  // Tertiary: from section titles (pick 1-2 interesting ones)
  const interestingSections = sectionTitles
    .filter(t => t.length > 10 && t.length < 60)
    .slice(1, 3); // Skip first (intro), take 2
  interestingSections.forEach(t => {
    // Extract key concept from h2 title
    const cleaned = t.replace(/[^a-zA-Z\s]/g, '').trim();
    queries.push(`${cleaned} trading finance`);
  });

  // Deduplicate and limit
  const uniqueQueries = [...new Set(queries)].slice(0, 3);
  
  // Fetch 1 image per query (3 total max)
  const allImages: UnsplashImage[] = [];
  for (const q of uniqueQueries) {
    const imgs = await searchUnsplash(q, 1);
    allImages.push(...imgs);
  }

  // If Unsplash returned nothing, use fallbacks
  if (allImages.length === 0) {
    console.log('[BlogImages] Using fallback images');
    const shuffled = [...FALLBACK_IMAGES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map(f => ({
      url: f.url,
      alt: f.alt,
      credit: f.credit,
      creditUrl: 'https://unsplash.com/?utm_source=fibalgo&utm_medium=referral',
      width: 800,
      height: 450,
    }));
  }

  return allImages;
}

// ═══════════════════════════════════════════════════════════════
// HTML GENERATION: Create <figure> elements for blog content
// ═══════════════════════════════════════════════════════════════
export function generateImageHtml(image: UnsplashImage, caption?: string): string {
  const safeAlt = (image.alt || 'Trading chart illustration').replace(/"/g, '&quot;');
  const safeCaption = caption || safeAlt;
  
  return `<figure class="blog-image-figure">
  <img src="${image.url}" alt="${safeAlt}" loading="lazy" decoding="async" width="800" height="450" />
  <figcaption>${safeCaption} <span class="image-credit">Photo by <a href="${image.creditUrl}" target="_blank" rel="noopener noreferrer">${image.credit}</a> on <a href="https://unsplash.com/?utm_source=fibalgo&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a></span></figcaption>
</figure>`;
}

// ═══════════════════════════════════════════════════════════════
// INSERT IMAGES INTO BLOG HTML
// Places images after every 2-3 <h2> sections for optimal flow
// ═══════════════════════════════════════════════════════════════
export function insertImagesIntoContent(
  htmlContent: string,
  images: UnsplashImage[],
  sectionTitles: string[],
): string {
  if (images.length === 0) return htmlContent;

  const lines = htmlContent.split('\n');
  const result: string[] = [];
  let h2Count = 0;
  let imageIndex = 0;
  
  // Determine insertion points: after h2 sections (every 2-3 sections)
  // For 3 images in a ~10-section article, insert after sections 2, 5, 8
  const totalH2 = lines.filter(l => l.trim().startsWith('<h2>')).length;
  const insertionGap = Math.max(2, Math.floor(totalH2 / (images.length + 1)));
  
  let paragraphsAfterH2 = 0;
  let pendingImage: UnsplashImage | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('<h2>')) {
      h2Count++;
      paragraphsAfterH2 = 0;

      // Check if we should insert an image before this h2
      if (pendingImage && h2Count > 1) {
        const caption = sectionTitles[h2Count - 2] 
          ? `Visual guide: ${sectionTitles[h2Count - 2].replace(/<[^>]+>/g, '')}`
          : undefined;
        result.push(generateImageHtml(pendingImage, caption));
        pendingImage = null;
      }
    }

    if (line.startsWith('<p>')) {
      paragraphsAfterH2++;
    }

    result.push(lines[i]);

    // Schedule image insertion after the Nth h2's content
    if (line.startsWith('<h2>') && imageIndex < images.length) {
      if (h2Count > 0 && h2Count % insertionGap === 0) {
        pendingImage = images[imageIndex];
        imageIndex++;
      }
    }

    // Insert pending image after 2-3 paragraphs in the section
    if (pendingImage && paragraphsAfterH2 >= 2 && line.startsWith('</p>')) {
      // Check if next line is NOT another paragraph (natural break)
      const nextLine = lines[i + 1]?.trim() || '';
      if (!nextLine.startsWith('<p>') || paragraphsAfterH2 >= 3) {
        const caption = sectionTitles[h2Count - 1]
          ? `${sectionTitles[h2Count - 1].replace(/<[^>]+>/g, '')} — Visual overview`
          : undefined;
        result.push(generateImageHtml(pendingImage, caption));
        pendingImage = null;
      }
    }
  }

  // Insert any remaining image at the end (before conclusion if possible)
  if (pendingImage) {
    // Find the last h2 (likely conclusion) and insert before it
    let insertPos = result.length - 1;
    for (let j = result.length - 1; j > result.length - 30; j--) {
      if (result[j]?.trim().startsWith('<h2>')) {
        insertPos = j;
        break;
      }
    }
    result.splice(insertPos, 0, generateImageHtml(pendingImage));
  }

  return result.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// EXTRACT SECTION TITLES from HTML content
// ═══════════════════════════════════════════════════════════════
export function extractSectionTitles(htmlContent: string): string[] {
  const matches = htmlContent.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  return matches.map(m => m.replace(/<[^>]+>/g, '').trim());
}
