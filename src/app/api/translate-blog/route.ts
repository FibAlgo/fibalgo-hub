/**
 * ═══════════════════════════════════════════════════════════════
 * 🌍 AUTO BLOG TRANSLATION API
 * ═══════════════════════════════════════════════════════════════
 * 
 * Translates a single blog post into ALL 29 languages in parallel.
 * Called automatically after blog post creation.
 * 
 * POST /api/translate-blog
 * Body: { slug: string, secret?: string }
 * 
 * Also callable via GET with ?slug=xxx for cron/webhook usage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const maxDuration = 800; // 13 min (Vercel Pro with Fluid Compute)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;

const LANGUAGES: Record<string, string> = {
  tr: 'Turkish', es: 'Spanish', de: 'German', fr: 'French', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ru: 'Russian', uk: 'Ukrainian',
  ar: 'Arabic', ja: 'Japanese', ko: 'Korean', zh: 'Chinese (Simplified)',
  hi: 'Hindi', th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay',
  sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', cs: 'Czech',
  ro: 'Romanian', hu: 'Hungarian', el: 'Greek', he: 'Hebrew', bn: 'Bengali',
};

// ─── DeepSeek API ────────────────────────────────────────────

async function callDeepSeek(systemPrompt: string, userContent: string, retries = 3): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: 0.3,
          max_tokens: 8192,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        await new Promise(r => setTimeout(r, 10000 * (attempt + 1)));
        continue;
      }

      if (!response.ok) {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 3000)); continue; }
        return null;
      }

      const data = await response.json();
      let content = data.choices[0].message.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json|html)?\n?/, '').replace(/\n?```$/, '');
      }
      return content;
    } catch {
      if (attempt < retries) { await new Promise(r => setTimeout(r, 3000)); continue; }
      return null;
    }
  }
  return null;
}

// ─── Translation Functions ───────────────────────────────────

// CJK languages (Chinese, Japanese, Korean) don't use spaces between words.
// Space-based word count returns ~40-100 for a full article.
// Use character count for CJK to get accurate word equivalent.
const CJK_LOCALES = new Set(['zh', 'ja', 'ko']);
const CJK_CHAR_REGEX = /[\u3000-\u9fff\uf900-\ufaff\u{20000}-\u{2fa1f}\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff]/gu;

function countWords(text: string, locale: string): number {
  const plain = text.replace(/<[^>]+>/g, '').trim();
  if (!plain) return 0;
  if (CJK_LOCALES.has(locale)) {
    // For CJK: count CJK characters + space-separated non-CJK tokens
    const cjkChars = (plain.match(CJK_CHAR_REGEX) || []).length;
    const nonCjk = plain.replace(CJK_CHAR_REGEX, ' ').split(/\s+/).filter(Boolean).length;
    return cjkChars + nonCjk;
  }
  return plain.split(/\s+/).filter(Boolean).length;
}

function splitContentIntoChunks(html: string, maxWords: number): string[] {
  const wordCount = html.replace(/<[^>]+>/g, '').split(/\s+/).length;
  if (wordCount <= maxWords) return [html];

  const parts = html.split(/(?=<h2[^>]*>)/);
  const chunks: string[] = [];
  let currentChunk = '';
  let currentWords = 0;

  for (const part of parts) {
    const partWords = part.replace(/<[^>]+>/g, '').split(/\s+/).length;
    if (currentWords + partWords > maxWords && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = part;
      currentWords = partWords;
    } else {
      currentChunk += part;
      currentWords += partWords;
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks.length > 0 ? chunks : [html];
}

async function translateOneLocale(
  post: { slug: string; title: string; description: string; content: string; meta_title: string; meta_description: string; faq: unknown[] | null },
  locale: string,
  langName: string,
  supabase: SupabaseClient
): Promise<{ locale: string; success: boolean; wordCount: number }> {
  const isRTL = locale === 'ar' || locale === 'he';

  try {
    // 1. Meta fields
    const metaPrompt = `You are a professional translator for FibAlgo, a fintech/trading web application.
Translate the blog post metadata from English to ${langName} (${locale}).
RULES:
1. Return ONLY valid JSON — no markdown, no explanation.
2. Keep brand names: FibAlgo, TradingView, etc.
3. Keep universal trading terms in English where appropriate for ${langName}.
4. ${isRTL ? 'RTL language.' : ''}
5. meta_title under 60 chars, meta_description under 160 chars.
6. Translate EVERYTHING into ${langName}.`;

    const metaInput = JSON.stringify({
      title: post.title,
      description: post.description,
      meta_title: post.meta_title || post.title,
      meta_description: post.meta_description || post.description,
    });

    const metaResult = await callDeepSeek(metaPrompt, metaInput);
    if (!metaResult) return { locale, success: false, wordCount: 0 };

    let meta: { title: string; description: string; meta_title: string; meta_description: string };
    try { meta = JSON.parse(metaResult); } catch { return { locale, success: false, wordCount: 0 }; }

    // 2. Content
    const contentPrompt = `You are a professional translator for FibAlgo, a fintech/trading web application.
Translate the following blog post HTML content from English to ${langName} (${locale}).
RULES:
1. Return ONLY translated HTML — no markdown, no wrapping.
2. PRESERVE all HTML tags, attributes, classes exactly as-is. Only translate text content.
3. Keep brand names, trading terms commonly left untranslated in ${langName}.
4. Keep URLs, image srcs, data attributes unchanged.
5. ${isRTL ? 'RTL language — just translate text.' : ''}
6. Professional, natural translation — not word-by-word.`;

    const chunks = splitContentIntoChunks(post.content, 1500);
    const translatedChunks: string[] = [];
    for (const chunk of chunks) {
      const result = await callDeepSeek(contentPrompt, chunk);
      if (!result) return { locale, success: false, wordCount: 0 };
      translatedChunks.push(result);
    }
    const translatedContent = translatedChunks.join('\n');

    // 3. FAQ
    let translatedFaq = null;
    if (post.faq && Array.isArray(post.faq) && post.faq.length > 0) {
      const faqPrompt = `Translate FAQ items from English to ${langName} (${locale}).
Return ONLY a valid JSON array with "question" and "answer" keys. No markdown.`;
      const faqResult = await callDeepSeek(faqPrompt, JSON.stringify(post.faq));
      if (faqResult) { try { translatedFaq = JSON.parse(faqResult); } catch { /* skip */ } }
    }

    // 4. Save — CJK-aware word count
    const wordCount = countWords(translatedContent, locale);

    const { error } = await supabase.from('blog_post_translations').upsert({
      slug: post.slug,
      locale,
      title: meta.title,
      description: meta.description,
      content: translatedContent,
      meta_title: meta.meta_title || meta.title,
      meta_description: meta.meta_description || meta.description,
      faq: translatedFaq,
      translation_status: 'completed',
      ai_model: 'deepseek-chat',
      word_count: wordCount,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slug,locale' });

    if (error) return { locale, success: false, wordCount: 0 };
    return { locale, success: true, wordCount };
  } catch {
    // Mark as failed
    try {
      await supabase.from('blog_post_translations').upsert({
        slug: post.slug, locale, title: '', description: '', content: '',
        translation_status: 'failed', updated_at: new Date().toISOString(),
      }, { onConflict: 'slug,locale' });
    } catch { /* ignore upsert failure */ }
    return { locale, success: false, wordCount: 0 };
  }
}

// ─── Main Handler ────────────────────────────────────────────

async function translateBlogPost(slug: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient<any>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch the post
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('slug, title, description, content, meta_title, meta_description, faq')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !post) {
    return { success: false, error: `Post not found: ${slug}` };
  }

  // Check which locales already have completed translations
  const { data: existing } = await supabase
    .from('blog_post_translations')
    .select('locale')
    .eq('slug', slug)
    .eq('translation_status', 'completed');

  const existingLocales = new Set((existing || []).map((e: { locale: string }) => e.locale));
  const needed = Object.entries(LANGUAGES).filter(([code]) => !existingLocales.has(code));

  if (needed.length === 0) {
    return { success: true, message: 'All translations already exist', translated: 0, failed: 0 };
  }

  // Translate sequentially with 5s delay to avoid DeepSeek rate limits
  const results: { locale: string; success: boolean; wordCount: number }[] = [];
  for (let i = 0; i < needed.length; i++) {
    const [code, name] = needed[i];
    if (i > 0) await new Promise(r => setTimeout(r, 5000));
    console.log(`[Blog Translation] 🔄 ${i + 1}/${needed.length}: ${name} (${code})`);
    const result = await translateOneLocale(post, code, name, supabase);
    results.push(result);
  }

  const translated = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalWords = results.reduce((sum, r) => sum + r.wordCount, 0);
  const failedLocales = results.filter(r => !r.success).map(r => r.locale);
  const completedLocales = results.filter(r => r.success).map(r => r.locale);

  return {
    success: true,
    slug,
    translated,
    failed,
    totalWords,
    completedLocales: completedLocales.length > 0 ? completedLocales : undefined,
    failedLocales: failedLocales.length > 0 ? failedLocales : undefined,
  };
}

// ─── POST handler ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, secret } = body;

    // Auth check: either CRON_SECRET or internal call
    if (CRON_SECRET && secret !== CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    console.log(`[Blog Translation] 🌍 Translating "${slug}" into ${Object.keys(LANGUAGES).length} languages...`);
    const result = await translateBlogPost(slug);
    console.log(`[Blog Translation] ✅ Done: ${result.translated} translated, ${result.failed} failed`);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Blog Translation] Fatal:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

// ─── GET handler (for cron/webhook) ──────────────────────────

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const authHeader = request.headers.get('authorization');

  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!slug) {
    return NextResponse.json({ error: 'slug query param required' }, { status: 400 });
  }

  console.log(`[Blog Translation] 🌍 Translating "${slug}" via GET...`);
  const result = await translateBlogPost(slug);
  return NextResponse.json(result);
}
