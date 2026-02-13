/**
 * ═══════════════════════════════════════════════════════════════
 * 🤖 AI BLOG WRITER ENGINE v4 — FREE-FORM AUTOPILOT
 * ═══════════════════════════════════════════════════════════════
 * 
 * Opus 4 picks its own topic, keyword, and angle.
 * No hardcoded keyword pool. No rigid category system.
 * The AI sees all existing posts and decides what's missing.
 * 
 * Focus: engaging, readable, low-bounce-rate content that
 * keeps users on the site. FibAlgo is a Fibonacci/AI trading
 * indicator platform — content should serve that audience.
 * 
 * Runs 2x daily via Vercel cron (09:00 + 21:00 UTC)
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { replaceImageMarkers } from './blog-images';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

function getAnthropic() {
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

const AUTHOR = 'FibAlgo Team';

// Internal pages the AI can link to
const INTERNAL_PAGES = [
  { url: '/library', text: 'FibAlgo indicator library' },
  { url: '/#pricing', text: 'FibAlgo pricing plans' },
  { url: '/about', text: 'About FibAlgo' },
  { url: '/community', text: 'FibAlgo trading community' },
  { url: '/education', text: 'more trading articles' },
];

// ══════════════════════════════════════════════════════════════
// MAIN: Generate + Auto-Publish a blog post
// ══════════════════════════════════════════════════════════════
export async function generateAndAutoPublish(): Promise<{
  success: boolean;
  slug?: string;
  title?: string;
  wordCount?: number;
  keyword?: string;
  error?: string;
}> {
  const supabase = getSupabase();

  try {
    // ── 1. GET ALL EXISTING POSTS ───────────────────────────
    const { data: existingPosts } = await supabase
      .from('blog_posts')
      .select('slug, title, target_keyword, tags')
      .order('created_at', { ascending: false });

    const posts = existingPosts || [];
    const existingList = posts
      .slice(0, 80)
      .map(p => `- "${p.title}" [keyword: ${p.target_keyword || 'N/A'}, tags: ${(p.tags || []).join(', ')}]`)
      .join('\n');

    const usedSlugs = new Set(posts.map(p => p.slug));
    const usedTitles = new Set(posts.map(p => p.title.toLowerCase()));

    // Published posts for cross-linking
    const blogLinks = posts
      .slice(0, 15)
      .map(p => `<a href="/education/${p.slug}">${p.title}</a>`)
      .join('\n');

    const internalLinks = INTERNAL_PAGES
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(l => `<a href="${l.url}">${l.text}</a>`)
      .join('\n');

    // ── 2. AI GENERATES EVERYTHING ──────────────────────────
    const anthropic = getAnthropic();
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const systemPrompt = `You are the editorial team at FibAlgo (fibalgo.com) — an AI-powered Fibonacci trading indicator platform for TradingView. Today is ${currentDate}.

YOUR JOB: Pick a trading topic that will attract readers and keep them engaged, then write an outstanding article about it.

═══ WHAT IS FIBALGO? ═══
FibAlgo makes AI-powered indicators for TradingView that help traders with:
- Fibonacci-based entry/exit signals
- Smart money concept detection  
- AI-driven market analysis
- Multi-timeframe confluence alerts

Your content should naturally serve this audience: traders interested in Fibonacci, technical analysis, smart money, AI trading, crypto, forex, and stocks.

═══ TOPIC SELECTION — YOU DECIDE ═══
Look at the existing posts below and pick a topic that:
1. Hasn't been covered yet (or find a genuinely different angle)
2. People actually search for — think about what a trader would Google
3. Is interesting enough that someone would read the whole thing
4. Naturally connects to FibAlgo's domain (Fibonacci, indicators, technical analysis, smart money, trading psychology, crypto/forex/stock strategies)

Prioritize topics around: Fibonacci techniques, technical indicators, smart money concepts, trading setups, chart patterns, and AI-assisted trading. These are our bread and butter. But don't force it — if a compelling angle on risk management or trading psychology fits, go for it.

═══ WRITING STYLE — THE MOST IMPORTANT PART ═══
The #1 problem: readers bounce. They leave after 30 seconds. Fix this.

How to keep readers:
- Open with something unexpected — a surprising stat, a counterintuitive claim, a real market event that hooks attention
- Every section should make them want to read the next one. Use mini-cliffhangers between sections: "But this only works under one condition..."
- Be specific. "RSI above 70" is boring. "RSI hit 94 on Tesla the day before it dropped 12% in January 2021" is interesting.
- Use real market examples — COVID crash (March 2020), GameStop squeeze (Jan 2021), FTX collapse (Nov 2022), Bitcoin halvings, specific stock moves. Real events are more engaging than theory.
- Write like you're explaining to a smart friend, not lecturing a classroom
- Vary the rhythm. Short punchy sentences. Then a longer one that builds the idea out with more nuance and detail. Fragment for emphasis. Then back to normal.
- Include actionable takeaways — "here's what this means for your next trade" moments
- Challenge conventional wisdom when you can back it up. Traders love "what you've been told is wrong" angles.
- Use em-dashes, parenthetical asides (like this), and the occasional rhetorical question to keep the reading experience dynamic
- NO wall-of-text paragraphs. 2-4 sentences max per paragraph. White space is your friend.

What NOT to do:
- No first person (no I/me/my/we) — write as the FibAlgo editorial team  
- No fake personal stories or anecdotes
- No invented statistics or fabricated studies — only use real, verifiable data
- No emoji anywhere in the article body
- No "comprehensive guide" / "delve into" / "game-changer" / "landscape" / "navigate" / "unlock" / "seamlessly" / "at its core" — these are AI-detection red flags
- No "Let's dive in" / "In conclusion" / "Whether you're a beginner or..." / "Here's the thing" — also red flags
- No decorative div boxes, callout boxes, or tip/warning boxes
- No dramatic storytelling ("Picture this...", "Imagine you're...")
- Don't start 3+ sections with questions
- Don't make every section the same length
- No "Moreover" / "Furthermore" / "Additionally" as paragraph starters

═══ SOURCES & CREDIBILITY ═══
Include 3-5 real, verifiable references per article:
- Real books (Mark Douglas, Van Tharp, Edwin Lefevre, etc.)
- Real institutions (CME, CBOE, Federal Reserve, etc.)
- Real market events with correct dates
- Real trading platforms (TradingView, Bloomberg, etc.)
NEVER invent statistics, studies, or quotes.

═══ HTML FORMAT ═══
Use: <h2>, <h3>, <p>, <strong>, <em>, <ul>, <li>, <ol>, <blockquote>, <a>, <hr>
No <h1>. No <div>. No emoji symbols. No class attributes.
5-8 sections with <h2> subheadings.
Bold 1-2 key phrases per section for scannability.

═══ IMAGE MARKERS (CRITICAL — READ CAREFULLY) ═══
Images are NOT decoration. They are VISUAL TOOLS that help the reader understand concepts.
An AI image generator (GPT Image) will create exactly what you describe. Be PRECISE.

WHEN to place an image:
- When COMPARING two things (before vs after, strategy A vs B, winning vs losing)
- When showing DATA (performance breakdown, win rates, risk/reward ratios)
- When explaining a PROCESS (entry rules, step-by-step flow, decision tree)
- When illustrating a CHART PATTERN (specific setup, indicator signal, price action)
- When a concept is hard to grasp with text alone

FORMAT (two parts separated by |||):
<!-- IMAGE: [detailed AI prompt for image generation] ||| [short user-friendly caption] -->

The LEFT side of ||| is the detailed visual description sent to AI image generator. Be VERY specific.
The RIGHT side of ||| is a short, clean caption the reader sees. Write it naturally, like a textbook figure caption.

Place after a </p> tag, not inside paragraphs. 4-5 per article.

GOOD examples:
- <!-- IMAGE: Side-by-side comparison chart: left panel shows a losing trade entering at 61.8% Fibonacci retracement with a red arrow and stop loss hit, right panel shows a winning trade entering at 38.2% with volume confirmation bar highlighted in green, dark theme ||| Comparison of entry points: 61.8% failure vs 38.2% success with volume confirmation -->
- <!-- IMAGE: Horizontal bar chart comparing win rates of different Fibonacci levels: 23.6% at 58%, 38.2% at 62%, 50% at 61%, 61.8% at 49%, 78.6% at 44%, bars colored gradient from green to red, dark background ||| Win rates by Fibonacci level — 38.2% leads at 62% -->
- <!-- IMAGE: Three-zone diagram of Fibonacci retracement: Zone 1 (0-38.2%) labeled Strong Trend in green, Zone 2 (38.2-61.8%) labeled Decision Zone in yellow, Zone 3 (61.8-100%) labeled Reversal Zone in red, candlestick chart overlay, dark theme ||| The 3-zone Fibonacci framework: trend continuation, decision, and reversal zones -->
- <!-- IMAGE: Step-by-step flowchart showing trade entry decision: Check volume then multi-timeframe alignment then sweep and reclaim then enter position, connected boxes with arrows, professional dark blue theme ||| Trade entry decision flowchart -->

BAD examples:
- <!-- IMAGE: trading chart ||| Chart --> (both sides too vague)
- <!-- IMAGE: stock market ||| Market --> (generic)

Each image must ADD INFORMATION the reader cannot get from text alone.

═══ INTERNAL LINKS ═══
Weave 2-3 of these naturally into your text:
${internalLinks}

═══ CROSS-LINKS TO OTHER BLOG POSTS (INCLUDE AT LEAST 3) ═══
${blogLinks || 'No existing posts yet.'}

═══ EXISTING POSTS — DO NOT REPEAT THESE ═══
${existingList || 'No existing posts yet.'}

═══ SEO ═══
Title (50-65 chars): Keyword in first 4-5 words. Use numbers, power words, or curiosity hooks.
- GOOD: "Fibonacci Confluence: 3 Setups That Filter 80% of False Signals"
- GOOD: "Why Most RSI Strategies Fail — and What Actually Works"
- BAD: "A Guide to Technical Analysis" (boring, no hook)
- NO year in title, slug, or description

Meta description (145-160 chars): Front-load value in first 60 chars (mobile-visible). End with action trigger. Be specific.

Slug: keyword-rich, lowercase, hyphens, max 60 chars, no year.

═══ WORD COUNT ═══
Target: 1500-2500 words. Minimum 1200. Quality over quantity — say what needs to be said, no filler.

═══ CTA ═══
One natural sentence in the conclusion mentioning FibAlgo's tools. Not salesy. Not "Ready to..." or "take your trading to the next level."

═══ FAQ ═══
5 FAQ items for Google rich results. Real questions people search for. 2-3 sentence answers each.

═══ OUTPUT ═══
Your ENTIRE response must be a single JSON object. Nothing else. No markdown fences. Starts with { ends with }.

{
  "topic_rationale": "1-2 sentences explaining why you chose this topic and angle",
  "target_keyword": "the primary SEO keyword you're targeting",
  "title": "SEO-Optimized Click-Worthy Title (50-65 chars)",
  "slug": "keyword-rich-url-slug",
  "description": "Compelling meta description (145-160 chars)",
  "content": "<h2>...</h2><p>Full HTML article...</p>",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
  "readTime": "X min",
  "faq": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ]
}`;

    const userPrompt = `Review the existing posts, pick the most valuable topic that's missing, and write an outstanding article.

Remember:
- YOU choose the topic and keyword — pick something traders actually search for
- Make it engaging enough that readers stay on the page (low bounce rate is the goal)
- Include at least 3 cross-links to existing blog posts  
- Include 2-3 internal links to FibAlgo pages
- 2000-2500 words, real references, no AI cliches
- Output ONLY the JSON object`;

    // ── 3. CALL AI WITH RETRY ────────────────────────────────
    const MAX_ATTEMPTS = 2;
    let parsed: Record<string, unknown> | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`[AI Blog] ${attempt === 1 ? '🚀 Generating article (AI picks topic)...' : '🔄 Retrying...'}`);

        const stream = anthropic.messages.stream({
          model: 'claude-opus-4-20250514',
          max_tokens: 32000,
          temperature: 1,
          thinking: { type: 'enabled', budget_tokens: 16000 },
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });
        const response = await stream.finalMessage();

        const aiContent = response.content.find((block: { type: string }) => block.type === 'text');
        if (!aiContent || aiContent.type !== 'text') {
          console.warn(`[AI Blog] Attempt ${attempt}: non-text response`);
          continue;
        }

        const thinkingBlocks = response.content.filter((block: { type: string }) => block.type === 'thinking');
        if (thinkingBlocks.length > 0) {
          console.log(`[AI Blog] Claude used ${thinkingBlocks.length} thinking block(s)`);
        }

        let rawJson = aiContent.text.trim();
        rawJson = rawJson.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

        // Try direct parse
        try {
          parsed = JSON.parse(rawJson);
        } catch {
          const fb = rawJson.indexOf('{');
          const lb = rawJson.lastIndexOf('}');
          if (fb !== -1 && lb > fb) {
            try { parsed = JSON.parse(rawJson.slice(fb, lb + 1)); } catch { /* fall through */ }
          }
        }

        if (parsed && parsed.title && parsed.content) {
          console.log(`[AI Blog] ✅ Parsed on attempt ${attempt}`);
          break;
        }

        // JSON repair with Sonnet
        console.warn(`[AI Blog] ⚠️ Direct parse failed, repairing...`);
        try {
          const fixStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 16000,
            temperature: 0,
            system: 'Fix this broken JSON. Return ONLY the valid JSON object. No markdown, no explanation.',
            messages: [{ role: 'user', content: rawJson }],
          });
          const fixResp = await fixStream.finalMessage();
          const fixText = fixResp.content.find((b: { type: string }) => b.type === 'text');
          if (fixText && fixText.type === 'text') {
            let fixed = fixText.text.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
            const f = fixed.indexOf('{'), l = fixed.lastIndexOf('}');
            if (f !== -1 && l > f) fixed = fixed.slice(f, l + 1);
            parsed = JSON.parse(fixed);
            if (parsed?.title && parsed?.content) {
              console.log(`[AI Blog] ✅ JSON repaired on attempt ${attempt}`);
              break;
            }
          }
        } catch (fixErr) {
          console.warn(`[AI Blog] Repair failed:`, fixErr);
        }

        parsed = null;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[AI Blog] Attempt ${attempt} error: ${msg}`);
        if (attempt < MAX_ATTEMPTS) {
          const wait = msg.includes('rate') || msg.includes('529') ? 15000 : 5000;
          await new Promise(r => setTimeout(r, wait));
        } else {
          return { success: false, error: `AI error: ${msg}` };
        }
      }
    }

    if (!parsed || !parsed.title || !parsed.content) {
      return { success: false, error: 'Failed to generate valid article' };
    }

    // ── 4. EXTRACT & VALIDATE ────────────────────────────────
    const { title, slug, description, content: rawContent, tags, readTime, faq, target_keyword, topic_rationale } = parsed as {
      title: string; slug: string; description: string; content: string;
      tags: string[]; readTime: string; target_keyword: string; topic_rationale: string;
      faq: Array<{ question: string; answer: string }>;
    };

    if (!title || !slug || !description || !rawContent) {
      return { success: false, error: 'Missing required fields in AI response' };
    }

    const chosenKeyword = target_keyword || tags?.[0] || title.toLowerCase().slice(0, 50);
    console.log(`[AI Blog] 📝 Topic: "${title}"`);
    console.log(`[AI Blog] 🎯 Keyword: "${chosenKeyword}"`);
    if (topic_rationale) console.log(`[AI Blog] 💡 Rationale: ${topic_rationale}`);

    // Validate FAQ
    let validFaq: Array<{ question: string; answer: string }> | null = null;
    if (Array.isArray(faq) && faq.length >= 3) {
      validFaq = faq
        .filter(f => f.question && f.answer && f.question.length > 10 && f.answer.length > 20)
        .slice(0, 7);
      if (validFaq.length < 3) validFaq = null;
      console.log(`[AI Blog] ${validFaq?.length || 0} valid FAQ items`);
    }

    // ── 5. REPLACE IMAGE MARKERS ─────────────────────────────
    let content = rawContent;
    try {
      content = await replaceImageMarkers(rawContent, chosenKeyword, tags?.[0] || 'trading');
      const figCount = (content.match(/<figure/gi) || []).length;
      console.log(`[AI Blog] 🖼️ ${figCount} images placed`);
    } catch {
      content = rawContent.replace(/<!--\s*IMAGE:.*?-->/gi, '');
    }

    // ── 6. DEDUP CHECK ───────────────────────────────────────
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (usedSlugs.has(cleanSlug)) {
      return { success: false, error: `Duplicate slug: ${cleanSlug}` };
    }
    if (usedTitles.has(title.toLowerCase())) {
      return { success: false, error: `Duplicate title: ${title}` };
    }

    // Quality metrics
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
    const crossLinks = (content.match(/href="\/education\//gi) || []).length;
    const internalLinkCount = (content.match(/href="\/(library|#pricing|community|about|education)/gi) || []).length;
    console.log(`[AI Blog] 📊 ${wordCount} words, ${crossLinks} cross-links, ${internalLinkCount} internal links`);

    if (wordCount < 1200) {
      return { success: false, error: `Too short: ${wordCount} words` };
    }

    // ── 7. EXTRACT COVER IMAGE ───────────────────────────────
    let coverImage: string | null = null;
    const imgMatch = content.match(/<img\s[^>]*src="(https:\/\/[^"]+)"/i);
    if (imgMatch) {
      coverImage = imgMatch[1];
    } else {
      try {
        const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
        if (unsplashKey) {
          const q = encodeURIComponent(chosenKeyword.split(' ').slice(0, 3).join(' ') + ' trading');
          const res = await fetch(`https://api.unsplash.com/search/photos?query=${q}&per_page=1&orientation=landscape`, {
            headers: { Authorization: `Client-ID ${unsplashKey}` },
          });
          const data = await res.json();
          if (data.results?.[0]?.urls?.regular) {
            coverImage = data.results[0].urls.regular;
          }
        }
      } catch { /* non-blocking */ }
    }

    // ── 8. SAVE & PUBLISH ────────────────────────────────────
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('blog_posts').insert({
      slug: cleanSlug,
      title,
      description,
      content,
      date: now,
      updated_at: now,
      author: AUTHOR,
      tags: tags || [],
      read_time: readTime || `${Math.ceil(wordCount / 200)} min`,
      status: 'published',
      target_keyword: chosenKeyword,
      meta_title: title,
      meta_description: description,
      cover_image: coverImage,
      word_count: wordCount,
      ai_model: 'claude-opus-4-20250514',
      ai_generated: true,
      published_at: now,
      faq: validFaq,
    });

    if (insertError) {
      if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
        return { success: false, error: `Slug exists: ${cleanSlug}` };
      }
      return { success: false, error: `DB error: ${insertError.message}` };
    }

    // Mark keyword used
    await supabase.from('blog_keywords').upsert({
      keyword: chosenKeyword,
      category: tags?.[0] || 'general',
      used_in_slug: cleanSlug,
      search_volume_estimate: 'ai_selected',
      competition: 'ai_selected',
      status: 'used',
    }, { onConflict: 'keyword' });

    console.log(`[AI Blog] ✅ Published: "${title}" (${wordCount} words)`);
    return { success: true, slug: cleanSlug, title, wordCount, keyword: chosenKeyword };

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ══════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY
// ══════════════════════════════════════════════════════════════
export const KEYWORD_POOL: Array<{ keyword: string; category: string; volume: string; competition: string }> = [];
export const generateBlogPost = generateAndAutoPublish;
export const generateAndPublish = generateAndAutoPublish;

export async function publishPost(slug: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('blog_posts')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('slug', slug);
  return { success: !error, error: error?.message };
}

export async function getDraftPosts() {
  const supabase = getSupabase();
  const { data } = await supabase.from('blog_posts')
    .select('*').eq('status', 'draft')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function deleteDraft(slug: string) {
  const supabase = getSupabase();
  const { data: post } = await supabase.from('blog_posts')
    .select('target_keyword').eq('slug', slug).single();
  if (post?.target_keyword) {
    await supabase.from('blog_keywords')
      .update({ status: 'available', used_in_slug: null })
      .eq('keyword', post.target_keyword);
  }
  const { error } = await supabase.from('blog_posts').delete().eq('slug', slug);
  return { success: !error, error: error?.message };
}

export async function seedKeywords() {
  return { inserted: 0, skipped: 0, message: 'v4: AI picks its own keywords — no pool needed' };
}

export async function getBlogStats() {
  const supabase = getSupabase();
  const [
    { count: totalPosts },
    { count: publishedPosts },
    { data: usedKw },
  ] = await Promise.all([
    supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
    supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('blog_keywords').select('keyword').eq('status', 'used'),
  ]);
  return {
    totalKeywords: 'unlimited (AI-selected)',
    usedKeywords: usedKw?.length || 0,
    remainingKeywords: 'unlimited',
    totalPosts: totalPosts || 0,
    publishedPosts: publishedPosts || 0,
    estimatedDaysLeft: 'unlimited',
  };
}
