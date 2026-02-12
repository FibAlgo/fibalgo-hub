'use client';

import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

interface HeroCtaProps {
  label: string;
  moneyBack: string;
}

export default function HeroCta({ label, moneyBack }: HeroCtaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
      <Link
        href="/#pricing"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: 'clamp(0.875rem, 2vw, 1rem) clamp(1.5rem, 4vw, 2rem)',
          borderRadius: '9999px',
          background: 'linear-gradient(90deg, #67E8F9 0%, #22D3EE 35%, #06B6D4 70%, #0891B2 100%)',
          color: '#000',
          fontWeight: 600,
          fontSize: 'clamp(0.9375rem, 2.2vw, 1rem)',
          textDecoration: 'none',
          transition: 'opacity 0.2s, transform 0.2s',
          boxShadow: '0 0 24px rgba(34,211,238,0.4), 0 0 48px rgba(6,182,212,0.2)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9';
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {label}
        <ArrowRight size={20} strokeWidth={2.5} color="#000" />
      </Link>
      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
        {moneyBack}
      </span>
    </div>
  );
}
