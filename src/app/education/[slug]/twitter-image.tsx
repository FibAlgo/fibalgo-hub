import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FibAlgo Blog Post';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let title = 'FibAlgo Trading Education';
  let category = 'Trading';

  // Fetch post info from DB
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/blog_posts?slug=eq.${slug}&select=title,tags&limit=1`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.[0]) {
          title = data[0].title;
          category = data[0].tags?.[0] || 'Trading';
        }
      }
    }
  } catch { /* fallback */ }

  // Fallback: make title from slug
  if (title === 'FibAlgo Trading Education') {
    title = slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  const displayTitle = title.length > 70 ? title.slice(0, 67) + '...' : title;

  // Fetch logo as base64
  let logoSrc = 'https://fibalgo.com/images/websitelogo.jpg';
  try {
    const logoRes = await fetch(logoSrc);
    if (logoRes.ok) {
      const buf = await logoRes.arrayBuffer();
      const base64 = Buffer.from(buf).toString('base64');
      logoSrc = `data:image/jpeg;base64,${base64}`;
    }
  } catch { /* fallback */ }

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="FibAlgo" width={40} height={40} style={{ borderRadius: '10px', objectFit: 'cover' }} />
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>FibAlgo</div>
          </div>
          <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.5)' }}>fibalgo.com/education</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
