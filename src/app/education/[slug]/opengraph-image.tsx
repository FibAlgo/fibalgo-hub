import { ImageResponse } from 'next/og';
import { blogPosts } from '@/lib/blog-data';

export const runtime = 'edge';
export const alt = 'FibAlgo Blog Post';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Try static posts first
  const staticPost = blogPosts.find(p => p.slug === slug);

  let title = 'FibAlgo Trading Blog';
  let category = 'Trading';
  let readTime = '10 min';

  if (staticPost) {
    title = staticPost.title;
    category = staticPost.tags?.[0] || 'Trading';
    readTime = staticPost.readTime;
  } else {
    // Try DB post
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${slug}&select=title,tags,read_time&limit=1`,
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
        readTime = data[0].read_time || '10 min';
      }
    } catch {
      // Fallback to generic
    }
  }

  // Truncate title if too long
  const displayTitle = title.length > 70 ? title.slice(0, 67) + '...' : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(145deg, #050508 0%, #0a0a1a 40%, #0d1117 100%)',
          fontFamily: 'sans-serif',
          padding: '60px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-50px',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,245,255,0.12) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        {/* Bottom glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '-40px',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Top bar: Category + Read time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #00f5ff, #8b5cf6)',
              color: '#000',
              padding: '8px 20px',
              borderRadius: '24px',
              fontSize: '20px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            {category}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '20px',
            }}
          >
            📖 {readTime} read
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: title.length > 50 ? '42px' : '50px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.2,
              letterSpacing: '-0.5px',
              maxWidth: '900px',
            }}
          >
            {displayTitle}
          </div>
        </div>

        {/* Bottom bar: Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #00f5ff, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 900,
                color: '#000',
              }}
            >
              F
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              FibAlgo
            </div>
          </div>
          <div
            style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            fibalgo.com/education
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
