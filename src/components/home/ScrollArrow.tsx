'use client';

import { ChevronDown } from 'lucide-react';

export default function ScrollArrow() {
  return (
    <a
      href="#features"
      aria-label="Scroll down"
      onClick={(e) => {
        e.preventDefault();
        const el = document.getElementById('features');
        if (!el) return;
        const targetTop = el.getBoundingClientRect().top + window.scrollY;
        const start = window.scrollY;
        const distance = targetTop - start;
        const duration = 700;
        let startTime: number | null = null;
        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const step = (timestamp: number) => {
          if (startTime === null) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          window.scrollTo(0, start + distance * easeOutCubic(progress));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }}
      className="hero-scroll-arrow"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '0.5rem',
        color: 'rgba(255,255,255,0.25)',
        transition: 'color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
    >
      <ChevronDown size={22} strokeWidth={2} />
    </a>
  );
}
