'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ShareButtonsProps {
  url: string;
  title: string;
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  const t = useTranslations('blog');
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      label: '𝕏',
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      bg: 'rgba(255,255,255,0.06)',
      hoverBg: 'rgba(255,255,255,0.12)',
      color: '#fff',
    },
    {
      label: 'in',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      bg: 'rgba(10,102,194,0.12)',
      hoverBg: 'rgba(10,102,194,0.25)',
      color: '#0A66C2',
    },
    {
      label: '📧',
      href: `mailto:?subject=${encodedTitle}&body=Check out this article: ${encodedUrl}`,
      bg: 'rgba(0,245,255,0.06)',
      hoverBg: 'rgba(0,245,255,0.15)',
      color: '#00F5FF',
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{
        fontSize: '0.73rem',
        color: 'rgba(255,255,255,0.35)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginRight: '0.25rem',
      }}>
        {t('shareLabel')}
      </span>
      {shareLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${link.label}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: link.bg,
            border: '1px solid rgba(255,255,255,0.08)',
            color: link.color,
            fontSize: '0.85rem',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'background 0.2s, border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = link.hoverBg;
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = link.bg;
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
          }}
        >
          {link.label}
        </a>
      ))}
      <button
        onClick={handleCopy}
        aria-label="Copy link"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
          color: copied ? '#10B981' : 'rgba(255,255,255,0.5)',
          fontSize: '0.85rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {copied ? '✓' : '🔗'}
      </button>
    </div>
  );
}
