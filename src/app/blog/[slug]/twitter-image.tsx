import { ImageResponse } from 'next/og';
import { blogPosts } from '@/lib/blog-data';

export const runtime = 'edge';
export const alt = 'FibAlgo Blog Post';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staticPost = blogPosts.find(p => p.slug === slug);

  let title = 'FibAlgo Trading Blog';
  let category = 'Trading';

  if (staticPost) {
    title = staticPost.title;
    category = staticPost.tags?.[0] || 'Trading';
  } else {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${slug}&select=title,tags&limit=1`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          },
        }
      );
      const data = await res.json();
      if (data?.[0]) {
        title = data[0].title;
        category = data[0].tags?.[0] || 'Trading';
      }
    } catch { /* fallback */ }
  }

  const displayTitle = title.length > 70 ? title.slice(0, 67) + '...' : title;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(145deg, #050508 0%, #0a0a1a 40%, #0d1117 100%)', fontFamily: 'sans-serif', padding: '60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-100px', right: '-50px', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,245,255,0.12) 0%, transparent 70%)', display: 'flex' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(135deg, #00f5ff, #8b5cf6)', color: '#000', padding: '8px 20px', borderRadius: '24px', fontSize: '20px', fontWeight: 700, textTransform: 'uppercase' }}>{category}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <div style={{ fontSize: title.length > 50 ? '42px' : '50px', fontWeight: 800, color: '#fff', lineHeight: 1.2, maxWidth: '900px' }}>{displayTitle}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #00f5ff, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 900, color: '#000' }}>F</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>FibAlgo</div>
          </div>
          <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }}>fibalgo.com/blog</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
