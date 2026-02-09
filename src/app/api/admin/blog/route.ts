/**
 * ═══════════════════════════════════════════════════════════════
 * 📝 BLOG ADMIN API
 * ═══════════════════════════════════════════════════════════════
 * 
 * Admin endpoints for managing AI-generated blog posts:
 * - GET: List all drafts
 * - POST: Publish / delete / generate new post
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { publishPost, deleteDraft, generateBlogPost, seedKeywords } from '@/lib/ai-blog-writer';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// Verify admin user
async function isAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const token = authHeader.replace('Bearer ', '');
  const supabase = getSupabase();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

// Also allow CRON_SECRET for API access
function hasCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  const admin = await isAdmin(request);
  const cron = hasCronSecret(request);
  if (!admin && !cron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'draft';

  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, description, tags, status, target_keyword, word_count, ai_model, created_at, published_at')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data, count: data?.length || 0 });
}

export async function POST(request: NextRequest) {
  const admin = await isAdmin(request);
  const cron = hasCronSecret(request);
  if (!admin && !cron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, slug } = body;

    switch (action) {
      case 'publish': {
        if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
        const result = await publishPost(slug);
        return NextResponse.json(result);
      }

      case 'publish-all': {
        const supabase = getSupabase();
        const { data: drafts } = await supabase
          .from('blog_posts')
          .select('slug')
          .eq('status', 'draft');

        if (!drafts?.length) {
          return NextResponse.json({ message: 'No drafts to publish' });
        }

        const results = [];
        for (const draft of drafts) {
          const r = await publishPost(draft.slug);
          results.push({ slug: draft.slug, ...r });
        }
        return NextResponse.json({ published: results.filter(r => r.success).length, results });
      }

      case 'delete': {
        if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
        const result = await deleteDraft(slug);
        return NextResponse.json(result);
      }

      case 'generate': {
        const result = await generateBlogPost();
        return NextResponse.json(result);
      }

      case 'seed-keywords': {
        const result = await seedKeywords();
        return NextResponse.json(result);
      }

      case 'update': {
        if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
        const { title, description, content, tags } = body;
        const supabase = getSupabase();
        const updateData: Record<string, unknown> = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (content) {
          updateData.content = content;
          updateData.word_count = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
        }
        if (tags) updateData.tags = tags;

        const { error } = await supabase
          .from('blog_posts')
          .update(updateData)
          .eq('slug', slug);

        if (error) return NextResponse.json({ success: false, error: error.message });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: publish, publish-all, delete, generate, seed-keywords, update' }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
