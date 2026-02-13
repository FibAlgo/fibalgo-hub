/**
 * ═══════════════════════════════════════════════════════════════
 * 🖼️ BLOG IMAGE SERVICE — GPT Image + Unsplash Fallback
 * ═══════════════════════════════════════════════════════════════
 * 
 * Priority: GPT Image (gpt-image-1) → Unsplash → Static Fallback
 * 
 * Claude places <!-- IMAGE: detailed description --> markers.
 * This service generates AI images via OpenAI, uploads to Supabase
 * Storage, and replaces markers with <figure> elements.
 * If OpenAI fails, falls back to Unsplash stock photos.
 */

import { createClient } from '@supabase/supabase-js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const BLOG_IMAGES_BUCKET = 'blog-images';

// ═══════════════════════════════════════════════════════════════
// FALLBACK IMAGES (last resort)
// ═══════════════════════════════════════════════════════════════
const FALLBACK_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80', alt: 'Stock market trading charts on screen' },
  { url: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&q=80', alt: 'Cryptocurrency Bitcoin on circuit board' },
  { url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80', alt: 'Financial data on trading screen' },
  { url: 'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=800&q=80', alt: 'Stock exchange market display' },
  { url: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&q=80', alt: 'Financial analysis and charts' },
  { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', alt: 'Market analysis on computer' },
];

// ═══════════════════════════════════════════════════════════════
// IMAGE RESULT TYPE
// ═══════════════════════════════════════════════════════════════
interface BlogImage {
  url: string;
  alt: string;
  source: 'ai' | 'unsplash' | 'fallback';
  credit?: string;
  creditUrl?: string;
}

// ═══════════════════════════════════════════════════════════════
// SUPABASE STORAGE — Ensure bucket exists + upload
// ═══════════════════════════════════════════════════════════════
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase() { return createClient<any>(SUPABASE_URL, SUPABASE_SERVICE_KEY); }

async function ensureBucket(): Promise<void> {
  const sb = getSupabase();
  const { data: buckets } = await sb.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BLOG_IMAGES_BUCKET);
  if (!exists) {
    await sb.storage.createBucket(BLOG_IMAGES_BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    });
    console.log(`[BlogImages] Created bucket: ${BLOG_IMAGES_BUCKET}`);
  }
}

async function uploadToStorage(imageBuffer: Buffer, slug: string, index: number): Promise<string | null> {
  try {
    await ensureBucket();
    const sb = getSupabase();
    const fileName = `${slug}/img-${index}-${Date.now()}.png`;

    const { error } = await sb.storage
      .from(BLOG_IMAGES_BUCKET)
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      });

    if (error) {
      console.log(`[BlogImages] Upload error: ${error.message}`);
      return null;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BLOG_IMAGES_BUCKET}/${fileName}`;
    console.log(`[BlogImages] ✅ Uploaded: ${fileName}`);
    return publicUrl;
  } catch (err) {
    console.log(`[BlogImages] Upload failed:`, err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// GPT IMAGE (gpt-image-1) — AI-generated contextual images
// ═══════════════════════════════════════════════════════════════
async function generateAIImage(
  query: string,
  articleTitle: string,
  slug: string,
  index: number,
): Promise<BlogImage | null> {
  if (!OPENAI_API_KEY) return null;

  try {
    const prompt = [
      `Create a professional financial infographic or trading chart illustration for a blog article.`,
      `Article: "${articleTitle}"`,
      `Scene: ${query}`,
      `Style: Modern, professional, dark theme with blue/teal/green accent colors.`,
      `Clean data visualization style. No text or labels on the image.`,
      `Suitable for a professional trading education website.`,
      `Photorealistic quality, 16:9 aspect ratio composition.`,
    ].join('\n');

    console.log(`[BlogImages] 🎨 Generating AI image ${index + 1}: "${query}"`);

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size: '1536x1024',
        quality: 'medium',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log(`[BlogImages] OpenAI ${res.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      console.log(`[BlogImages] No b64_json in response`);
      return null;
    }

    // Upload to Supabase Storage
    const buffer = Buffer.from(b64, 'base64');
    const publicUrl = await uploadToStorage(buffer, slug, index);
    if (!publicUrl) return null;

    console.log(`[BlogImages] 🎨 AI image ${index + 1} ready`);
    return { url: publicUrl, alt: query, source: 'ai' };
  } catch (err) {
    console.log(`[BlogImages] AI image error:`, err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// UNSPLASH — Fallback stock photos with diversity
// ═══════════════════════════════════════════════════════════════
async function getRecentlyUsedImageUrls(): Promise<Set<string>> {
  try {
    const supabase = getSupabase();
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('content')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(30);

    const usedUrls = new Set<string>();
    if (posts) {
      for (const post of posts) {
        const imgMatches = post.content?.matchAll(/https:\/\/images\.unsplash\.com\/photo-[^"&\s]+/g);
        if (imgMatches) {
          for (const m of imgMatches) usedUrls.add(m[0].split('?')[0]);
        }
      }
    }
    return usedUrls;
  } catch {
    return new Set();
  }
}

async function searchUnsplash(
  query: string,
  recentlyUsed: Set<string>,
  sessionUsed: Set<string>,
): Promise<BlogImage | null> {
  if (!UNSPLASH_ACCESS_KEY) return null;

  try {
    const enhancedQuery = query.match(/trading|chart|market|finance|crypto|forex|stock/i)
      ? query : `${query} trading finance`;

    const randomPage = Math.floor(Math.random() * 5) + 1;
    const params = new URLSearchParams({
      query: enhancedQuery, per_page: '30', page: String(randomPage),
      orientation: 'landscape', content_filter: 'high', order_by: 'relevant',
    });

    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`, 'Accept-Version': 'v1' },
    });
    if (!res.ok) return null;

    let data = await res.json();
    if (!data.results?.length && randomPage > 1) {
      params.set('page', '1');
      const retry = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
        headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`, 'Accept-Version': 'v1' },
      });
      if (!retry.ok) return null;
      data = await retry.json();
      if (!data.results?.length) return null;
    }

    const shuffled = [...data.results].sort(() => Math.random() - 0.5);
    for (const img of shuffled) {
      const baseUrl = (img.urls.raw || img.urls.regular || '').split('?')[0];
      if (!recentlyUsed.has(baseUrl) && !sessionUsed.has(baseUrl)) {
        sessionUsed.add(baseUrl);
        return {
          url: img.urls.regular + '&w=800&q=80&fm=webp',
          alt: query, source: 'unsplash',
          credit: img.user.name,
          creditUrl: img.user.links.html + '?utm_source=fibalgo&utm_medium=referral',
        };
      }
    }

    const img = shuffled[Math.floor(Math.random() * shuffled.length)];
    if (img) {
      sessionUsed.add((img.urls.raw || '').split('?')[0]);
      return {
        url: img.urls.regular + '&w=800&q=80&fm=webp',
        alt: query, source: 'unsplash',
        credit: img.user.name,
        creditUrl: img.user.links.html + '?utm_source=fibalgo&utm_medium=referral',
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// HTML: <figure> element
// ═══════════════════════════════════════════════════════════════
function generateFigureHtml(image: BlogImage, caption: string): string {
  const safeAlt = caption.replace(/"/g, '&quot;');

  // AI images: no caption needed. Unsplash: credit required by license.
  if (image.source === 'unsplash' && image.credit) {
    const creditHtml = `<span class="image-credit">Photo by <a href="${image.creditUrl}" target="_blank" rel="noopener noreferrer">${image.credit}</a> on <a href="https://unsplash.com/?utm_source=fibalgo&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a></span>`;
    return `<figure class="blog-image-figure">
  <img src="${image.url}" alt="${safeAlt}" loading="lazy" decoding="async" width="800" height="450" />
  <figcaption>${creditHtml}</figcaption>
</figure>`;
  }

  return `<figure class="blog-image-figure">
  <img src="${image.url}" alt="${safeAlt}" loading="lazy" decoding="async" width="800" height="450" />
</figure>`;
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT: Replace <!-- IMAGE: ... --> markers
// Priority: GPT Image → Unsplash → Static Fallback
// ═══════════════════════════════════════════════════════════════
export async function replaceImageMarkers(
  htmlContent: string,
  keyword: string,
  _category: string,
): Promise<string> {
  const markerRegex = /<!--\s*IMAGE:\s*(.+?)\s*-->/gi;
  const markers: { fullMatch: string; query: string; index: number }[] = [];

  let match;
  while ((match = markerRegex.exec(htmlContent)) !== null) {
    markers.push({ fullMatch: match[0], query: match[1].trim(), index: match.index });
  }

  if (markers.length === 0) {
    console.log('[BlogImages] No <!-- IMAGE: --> markers found');
    return htmlContent;
  }

  console.log(`[BlogImages] Found ${markers.length} image markers`);
  markers.forEach((m, i) => console.log(`  ${i + 1}. "${m.query}"`));

  const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Prepare Unsplash fallback data
  const recentlyUsed = await getRecentlyUsedImageUrls();
  const sessionUsed = new Set<string>();
  let fallbackIdx = Math.floor(Math.random() * FALLBACK_IMAGES.length);

  // Article title for AI prompt context
  const titleMatch = htmlContent.match(/<h2[^>]*>(.*?)<\/h2>/i);
  const articleTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '') : keyword;

  const useAI = !!OPENAI_API_KEY;
  console.log(`[BlogImages] ${useAI ? '🎨 Using GPT Image (gpt-image-1)' : '📷 Using Unsplash (no OPENAI_API_KEY)'}`);

  const results: { marker: typeof markers[0]; image: BlogImage }[] = [];

  if (useAI) {
    // Sequential for AI to respect rate limits
    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      let image: BlogImage | null = null;

      image = await generateAIImage(marker.query, articleTitle, slug, i);

      if (!image) {
        console.log(`[BlogImages] AI failed for "${marker.query}", trying Unsplash...`);
        image = await searchUnsplash(marker.query, recentlyUsed, sessionUsed);
      }

      if (!image) {
        const fb = FALLBACK_IMAGES[fallbackIdx % FALLBACK_IMAGES.length];
        fallbackIdx++;
        image = { url: fb.url, alt: fb.alt, source: 'fallback' };
      }

      results.push({ marker, image });
    }
  } else {
    // Parallel for Unsplash
    const promises = markers.map(async (marker) => {
      let image: BlogImage | null = await searchUnsplash(marker.query, recentlyUsed, sessionUsed);
      if (!image) {
        const fb = FALLBACK_IMAGES[fallbackIdx % FALLBACK_IMAGES.length];
        fallbackIdx++;
        image = { url: fb.url, alt: fb.alt, source: 'fallback' };
      }
      return { marker, image };
    });
    results.push(...await Promise.all(promises));
  }

  // Replace markers in reverse order
  let output = htmlContent;
  for (let i = results.length - 1; i >= 0; i--) {
    const { marker, image } = results[i];
    const caption = marker.query
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    output = output.replace(marker.fullMatch, generateFigureHtml(image, caption));
  }

  const aiCount = results.filter(r => r.image.source === 'ai').length;
  const unsplashCount = results.filter(r => r.image.source === 'unsplash').length;
  const fbCount = results.filter(r => r.image.source === 'fallback').length;
  console.log(`[BlogImages] ✅ ${results.length} images placed (AI: ${aiCount}, Unsplash: ${unsplashCount}, Fallback: ${fbCount})`);

  return output;
}
