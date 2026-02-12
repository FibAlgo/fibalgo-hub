import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FibAlgo – AI-Powered Trading Platform';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  // Load Inter font from Google Fonts (Bold + ExtraBold)
  const [interBold, interExtraBold] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYMZhrib2Bg-4.ttf').then(r => r.arrayBuffer()),
  ]);

  // Fetch logo as base64
  const logoUrl = 'https://fibalgo.com/images/websitelogo.jpg';
  let logoSrc = logoUrl;
  try {
    const logoRes = await fetch(logoUrl);
    if (logoRes.ok) {
      const buf = await logoRes.arrayBuffer();
      logoSrc = `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`;
    }
  } catch { /* fallback */ }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#06060a',
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Large cyan glow — top right */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-100px',
            width: '700px',
            height: '700px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,245,255,0.12) 0%, rgba(0,245,255,0.04) 40%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Purple glow — bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: '-180px',
            left: '-120px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, rgba(139,92,246,0.03) 40%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Subtle center glow behind content */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '800px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(0,245,255,0.05) 0%, transparent 60%)',
            display: 'flex',
          }}
        />

        {/* Logo + Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            marginBottom: '32px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="FibAlgo"
            width={68}
            height={68}
            style={{
              borderRadius: '18px',
              objectFit: 'cover',
              border: '2px solid rgba(0,245,255,0.2)',
              boxShadow: '0 0 40px rgba(0,245,255,0.2), 0 0 80px rgba(0,245,255,0.08)',
            }}
          />
          <span
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-2px',
            }}
          >
            FibAlgo
          </span>
        </div>

        {/* Main headline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '18px',
          }}
        >
          <span
            style={{
              fontSize: '46px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
            }}
          >
            All-in-One
          </span>
          <span
            style={{
              fontSize: '46px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #00F5FF, #8B5CF6)',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-1.5px',
              lineHeight: 1.1,
            }}
          >
            Trading Platform
          </span>
        </div>

        {/* Sub headline */}
        <div
          style={{
            fontSize: '22px',
            fontWeight: 400,
            color: '#8892a4',
            textAlign: 'center',
            maxWidth: '680px',
            lineHeight: 1.5,
            marginBottom: '44px',
            letterSpacing: '0.2px',
            display: 'flex',
          }}
        >
          Education · AI Indicators · Live Terminal · Market Analysis
        </div>

        {/* Feature cards row */}
        <div
          style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
          }}
        >
          {[
            { icon: '📊', label: 'TERMINAL', desc: 'Live Markets', color: '#00F5FF' },
            { icon: '🎓', label: 'EDUCATION', desc: 'Trading Guides', color: '#8B5CF6' },
            { icon: '⚡', label: 'INDICATORS', desc: 'AI-Powered', color: '#F59E0B' },
            { icon: '🔍', label: 'ANALYSIS', desc: 'Market Insights', color: '#10B981' },
          ].map((f) => (
            <div
              key={f.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '20px 28px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.06)',
                minWidth: '140px',
              }}
            >
              <span style={{ fontSize: '28px', display: 'flex' }}>{f.icon}</span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: f.color,
                  letterSpacing: '2.5px',
                }}
              >
                {f.label}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 400,
                  color: '#5a6577',
                }}
              >
                {f.desc}
              </span>
            </div>
          ))}
        </div>

        {/* Gradient accent line — bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #00F5FF, #8B5CF6, #F59E0B, #10B981, transparent)',
            display: 'flex',
          }}
        />

        {/* URL watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '22px',
            right: '40px',
            fontSize: '16px',
            fontWeight: 700,
            color: '#2d3748',
            letterSpacing: '1px',
            display: 'flex',
          }}
        >
          fibalgo.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: interBold, weight: 700, style: 'normal' as const },
        { name: 'Inter', data: interExtraBold, weight: 800, style: 'normal' as const },
      ],
    }
  );
}
