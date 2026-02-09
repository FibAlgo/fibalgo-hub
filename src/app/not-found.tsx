import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 – Page Not Found',
  description: 'The page you are looking for does not exist. Browse FibAlgo\'s AI trading indicators, blog, and community.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050508',
        color: '#FFFFFF',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <span
          style={{
            fontSize: 'clamp(5rem, 15vw, 10rem)',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00F5FF 0%, #8B5CF6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
          }}
        >
          404
        </span>
      </div>

      <h1
        style={{
          fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
          fontWeight: 700,
          marginBottom: '1rem',
          letterSpacing: '-0.02em',
        }}
      >
        Page Not Found
      </h1>

      <p
        style={{
          fontSize: '1.05rem',
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.6,
          maxWidth: '28rem',
          marginBottom: '2.5rem',
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Let&apos;s get you back on track.
      </p>

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '3rem',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: 'linear-gradient(135deg, #00F5FF, #00C4CC)',
            color: '#000',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.95rem',
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
        >
          Back to Home
        </Link>
        <Link
          href="/blog"
          style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.95rem',
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
        >
          Read Our Blog
        </Link>
      </div>

      <nav
        aria-label="Popular pages"
        style={{
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {[
          { label: 'AI Indicators', href: '/library' },
          { label: 'Pricing', href: '/#pricing' },
          { label: 'About Us', href: '/about' },
          { label: 'Community', href: '/community' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              color: 'rgba(0,245,255,0.7)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
