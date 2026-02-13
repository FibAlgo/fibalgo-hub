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
// MARKET CONTEXT: Live data for contextual content
// ══════════════════════════════════════════════════════════════
async function getMarketContext(): Promise<string> {
  try {
    // Fear & Greed Index (alternative.me — free, no key)
    const fgRes = await fetch('https://api.alternative.me/fng/?limit=1', { signal: AbortSignal.timeout(5000) });
    const fgData = await fgRes.json();
    const fgValue = fgData?.data?.[0]?.value || 'N/A';
    const fgLabel = fgData?.data?.[0]?.value_classification || 'N/A';

    // BTC price from CoinGecko (free, no key)
    const btcRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true', { signal: AbortSignal.timeout(5000) });
    const btcData = await btcRes.json();
    const btcPrice = btcData?.bitcoin?.usd ? `$${Math.round(btcData.bitcoin.usd).toLocaleString()}` : 'N/A';
    const btcChange = btcData?.bitcoin?.usd_24h_change ? `${btcData.bitcoin.usd_24h_change.toFixed(1)}%` : 'N/A';
    const ethPrice = btcData?.ethereum?.usd ? `$${Math.round(btcData.ethereum.usd).toLocaleString()}` : 'N/A';

    // DXY / VIX from a simple proxy — skip if unavailable
    let marketSentiment = 'neutral';
    const fgNum = parseInt(fgValue);
    if (fgNum <= 25) marketSentiment = 'extreme fear — bearish';
    else if (fgNum <= 40) marketSentiment = 'fear — cautious';
    else if (fgNum <= 60) marketSentiment = 'neutral';
    else if (fgNum <= 75) marketSentiment = 'greed — bullish';
    else marketSentiment = 'extreme greed — euphoric';

    return `LIVE MARKET SNAPSHOT (use this to make your content timely and relevant):
- Crypto Fear & Greed Index: ${fgValue}/100 (${fgLabel})
- Market Sentiment: ${marketSentiment}
- BTC: ${btcPrice} (24h: ${btcChange})
- ETH: ${ethPrice}
Adjust your tone and topic selection to match current market conditions. In fear markets, write about risk management, defensive strategies, accumulation. In greed markets, write about taking profits, overtrading prevention, euphoria traps.`;
  } catch (err) {
    console.log('[AI Blog] Market context fetch failed, continuing without it');
    return '';
  }
}

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
      .select('slug, title, target_keyword, tags, content')
      .order('created_at', { ascending: false });

    const posts = existingPosts || [];
    
    // Include H2 structure so AI can avoid repeating patterns
    const existingList = posts
      .slice(0, 80)
      .map(p => {
        const h2s = (p.content || '').match(/<h2[^>]*>(.*?)<\/h2>/gi)?.map(
          (h: string) => h.replace(/<[^>]*>/g, '').trim()
        ) || [];
        const h2Summary = h2s.length > 0 ? ` | H2s: ${h2s.join(' → ')}` : '';
        return `- "${p.title}" [keyword: ${p.target_keyword || 'N/A'}${h2Summary}]`;
      })
      .join('\n');

    const usedSlugs = new Set(posts.map(p => p.slug));
    const usedTitles = new Set(posts.map(p => p.title.toLowerCase()));

    // Published posts for cross-linking
    const blogLinks = posts
      .slice(0, 15)
      .map(p => `<a href="/education/${p.slug}">${p.title}</a>`)
      .join('\n');

    const allInternalLinks = INTERNAL_PAGES
      .map(l => `<a href="${l.url}">${l.text}</a>`)
      .join('\n');

    // ── 2. AI GENERATES EVERYTHING ──────────────────────────
    const anthropic = getAnthropic();
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Fetch live market data for contextual content
    const marketContext = await getMarketContext();
    console.log('[AI Blog] Market context:', marketContext ? 'loaded' : 'unavailable');

    const systemPrompt = `You are the editorial team at FibAlgo (fibalgo.com) — an AI-powered Fibonacci trading indicator platform for TradingView. Today is ${currentDate}.
${marketContext ? `\n═══ MARKET CONTEXT ═══\n${marketContext}\n` : ''}
YOUR JOB: Pick a trading topic that will attract readers and keep them engaged, then write an outstanding article about it.

═══ WHAT IS FIBALGO? ═══
FibAlgo makes AI-powered indicators for TradingView that help traders with Fibonacci-based signals, smart money detection, AI-driven analysis, and multi-timeframe confluence alerts.

═══ TOPIC SELECTION — COMPLETE FREEDOM ═══
Look at the existing posts and pick something DIFFERENT. Not just a different keyword — a different angle, tone, and structure.

Wide range of topics is welcome: technical indicators, Fibonacci, chart patterns, trading psychology, risk management, crypto strategies, forex, stocks, options, macro analysis, market structure, volatility, backtesting, journaling, position sizing, market microstructure, intermarket analysis, algorithmic trading, sector rotation, sentiment analysis — anything a serious trader would search for.

CRITICAL: Check the existing post titles AND their H2 structures below. Do NOT repeat the same structural formula.

═══ WRITING STYLE — THE MOST IMPORTANT PART ═══
Keep readers on the page. Here's how:

- Open with something unexpected — but VARY your openings. Some options:
  * A counterintuitive claim backed by data
  * A real market event that illustrates your thesis
  * A common misconception you're about to demolish
  * A provocative question (but only sometimes)
  * A concrete before/after scenario
  DO NOT always start with "The $X Billion..." — that's a pattern now. Mix it up.

- Be specific with examples. Real tickers, real dates, real price levels.
- Use real market events when they fit (COVID crash, GameStop, FTX, halvings, flash crashes)
- Write like you're talking to a smart friend, not lecturing
- Vary sentence length. Short. Then longer and more complex. Fragment for emphasis.
- Include actionable takeaways — concrete things a trader can do tomorrow
- Challenge conventional wisdom when you can back it up

STRUCTURE VARIETY — THIS IS CRITICAL:
Every article must have a DIFFERENT structure. Do NOT fall into this pattern:
  "Why Traditional X Fails" → "The X System" → "Common Mistakes" → "Action Plan"
That's boring and repetitive. Instead:

Sometimes structure it as:
- Chronological case study → lessons → application
- Problem → wrong solutions people try → right solution
- Myth 1 → Myth 2 → Myth 3 → What actually works
- "3 setups" or "5 rules" format — straight to the point
- Historical deep dive → modern application
- Comparison format (Strategy A vs Strategy B with data)
- Story of a specific trade → general principles extracted
- Controversial thesis → evidence → counterarguments → conclusion

Vary the number of H2 sections too (4-8 is fine). Not every article needs 10+ sections.

TITLE FORMAT — VARY IT:
Do NOT always use "Topic: The X System/Method/Playbook" format.
Mix these formats:
- "Why X Fails (and What Works Instead)"
- "3 Fibonacci Setups That Actually Filter False Signals"
- "The Overlooked Indicator That Predicted Every 2024 Crash"
- "Stop Using RSI Wrong — Here's What the Data Shows"
- "What 10,000 Backtested Trades Reveal About MACD"
- Simple and direct: "Fibonacci Extensions: Beyond the Basics"

What NOT to do:
- No first person (no I/me/my/we) — write as the FibAlgo editorial team  
- No fake stories or invented statistics
- No emoji anywhere in the article body
- No "comprehensive guide" / "delve into" / "game-changer" / "landscape" / "navigate" / "unlock" / "seamlessly" / "at its core"
- No "Let's dive in" / "In conclusion" / "Whether you're a beginner or..." / "Here's the thing"
- No decorative div boxes, callout boxes, or tip/warning boxes
- No "Picture this..." / "Imagine you're..."
- Don't overuse "here's" — max 2-3 times per article
- Don't start 3+ sections with questions
- Don't make every section the same length
- No "Moreover" / "Furthermore" / "Additionally" as paragraph starters
- AVOID repeating phrases like "smart money", "liquidity hunt", "institutional" excessively across articles — use the specific terminology relevant to YOUR chosen topic

═══ SOURCES & CREDIBILITY (ZERO HALLUCINATION POLICY) ═══
Include 3-5 real, verifiable references per article:
- Real books (Mark Douglas, Van Tharp, Edwin Lefevre, etc.)
- Real institutions (CME, CBOE, Federal Reserve, etc.)
- Real market events with correct dates and prices
- Real trading platforms (TradingView, Bloomberg, etc.)

CRITICAL: If you are not 100% certain about a statistic, price, date, or study — DO NOT USE IT.
Instead, reference the methodology or general finding from well-known sources like CME Group, Investopedia, or BIS (Bank for International Settlements).
Example: Instead of inventing "a 2023 JPMorgan study showed 73% of..." → write "According to CME Group's methodology for measuring institutional order flow..."
NEVER fabricate numbers, percentages, study results, or book quotes. If in doubt, use qualitative statements.

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

STYLE CONSISTENCY: All image prompts MUST include the phrase "Professional minimalist dark theme, fintech style, high-contrast UI" to ensure visual brand consistency across the entire site.

ALT TEXT & SEO: The caption (right side of |||) will automatically become the image's alt attribute for Google Images SEO and accessibility. Make it descriptive and keyword-relevant — not generic like "Chart" or "Diagram".

Each image must ADD INFORMATION the reader cannot get from text alone.

═══ INTERNAL LINKS ═══
Below are ALL FibAlgo internal pages. Pick ONLY the 2-3 that are most relevant to YOUR article's topic. Do NOT force irrelevant links:
${allInternalLinks}

═══ CROSS-LINKS TO OTHER BLOG POSTS (INCLUDE AT LEAST 3) ═══
${blogLinks || 'No existing posts yet.'}

═══ EXISTING POSTS — DO NOT REPEAT THESE ═══
${existingList || 'No existing posts yet.'}

═══ SEO ═══
Title (50-65 chars): Keyword in first 4-5 words. Hook the reader. NO colon-subtitle format every time — vary it.
Meta description (145-160 chars): Front-load value in first 60 chars. Be specific.
Slug: keyword-rich, lowercase, hyphens, max 60 chars, no year.

SEMANTIC SEO (LSI KEYWORDS):
After choosing your target_keyword, identify at least 5 related semantic concepts that searchers would expect to find in an article about this topic. Weave these naturally throughout the text — do not keyword-stuff.
Example: if target_keyword is "fibonacci retracement", LSI concepts might include: golden ratio, support resistance levels, pullback trading, trend continuation, extension levels.

SEARCH INTENT:
Determine the user intent for your topic: Informational (learning a concept), Comparative (comparing strategies/tools), or Actionable (step-by-step execution). Match the article structure to the intent:
- Informational → explain deeply with examples and data
- Comparative → use tables, pros/cons, side-by-side analysis
- Actionable → numbered steps, checklists, concrete rules

═══ WORD COUNT ═══
Target: 1500-2500 words. Minimum 1200. Quality over quantity — say what needs to be said, no filler.
IMPORTANT: Avoid unnecessary padding. Every sentence should earn its place. This also prevents the JSON response from being cut off due to token limits.

═══ FIBALGO INTEGRATION ═══
In one section of the article (preferably where it naturally fits — not just the conclusion), mention a SPECIFIC FibAlgo feature that directly relates to the article's topic:
- If about Fibonacci → mention FibAlgo's AI-powered Fibonacci signal detection
- If about multi-timeframe → mention FibAlgo's multi-timeframe confluence alerts
- If about smart money → mention FibAlgo's institutional flow detection
- If about risk management → mention FibAlgo's position sizing tools
Make it feel like a natural recommendation, not an ad. One sentence is enough. Never use "Ready to..." or "take your trading to the next level."

═══ FAQ ═══
5 FAQ items for Google rich results. Real questions people search for.
Each answer MUST be concise: 1-2 sentences, maximum 200 characters. Google favors short, direct FAQ answers.

═══ OUTPUT ═══
Your ENTIRE response must be a single JSON object. Nothing else. No markdown fences. Starts with { ends with }.

{
  "topic_rationale": "Why you chose this topic + what user need it serves (informational/comparative/actionable)",
  "target_keyword": "the primary SEO keyword you're targeting",
  "lsi_keywords": ["semantic concept 1", "semantic concept 2", "concept 3", "concept 4", "concept 5"],
  "search_intent": "informational | comparative | actionable",
  "title": "SEO-Optimized Click-Worthy Title (50-65 chars)",
  "slug": "keyword-rich-url-slug",
  "description": "Compelling meta description (145-160 chars)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],
  "readTime": "X min",
  "faq": [
    {"question": "Real question people search for?", "answer": "Concise answer, max 200 characters."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ],
  "content": "<h2>...</h2><p>Full HTML article — this field MUST be last</p>"
}`;

    const userPrompt = `Review the existing posts (including their H2 structures), then:
1. Pick a topic that's genuinely different — not just a different keyword on the same "smart money / liquidity hunt" theme
2. Use a DIFFERENT article structure than the existing posts — look at their H2 patterns and do something new
3. Use a DIFFERENT opening style — not "$X billion..." every time
4. Use a DIFFERENT title format — not always "Topic: The X System/Method"

Write an outstanding, engaging article. Output ONLY the JSON object.`;

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
    const { title, slug, description, content: rawContent, tags, readTime, faq, target_keyword, topic_rationale, lsi_keywords, search_intent } = parsed as {
      title: string; slug: string; description: string; content: string;
      tags: string[]; readTime: string; target_keyword: string; topic_rationale: string;
      lsi_keywords?: string[]; search_intent?: string;
      faq: Array<{ question: string; answer: string }>;
    };

    if (!title || !slug || !description || !rawContent) {
      return { success: false, error: 'Missing required fields in AI response' };
    }

    const chosenKeyword = target_keyword || tags?.[0] || title.toLowerCase().slice(0, 50);
    console.log(`[AI Blog] 📝 Topic: "${title}"`);
    console.log(`[AI Blog] 🎯 Keyword: "${chosenKeyword}"`);
    if (topic_rationale) console.log(`[AI Blog] 💡 Rationale: ${topic_rationale}`);
    if (search_intent) console.log(`[AI Blog] 🔍 Intent: ${search_intent}`);
    if (lsi_keywords?.length) console.log(`[AI Blog] 🏷️ LSI: ${lsi_keywords.join(', ')}`);

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
