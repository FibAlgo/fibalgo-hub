'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { PointerEvent } from 'react';
import { useTranslations, useLocale } from 'next-intl';

const RTL_LOCALES = ['ar', 'he'];

const REVIEWER_NAMES = [
  'Michael R.',
  'James T.',
  'David L.',
  'Sarah K.',
  'Thomas M.',
  'Mark V.',
  'Carlos P.',
  'Liam O.',
];

export default function Trustpilot() {
  const t = useTranslations('trustpilot');
  const locale = useLocale();
  const isRTL = RTL_LOCALES.includes(locale);
  const reviews = Array.from({ length: 8 }, (_, i) => ({
    name: REVIEWER_NAMES[i],
    country: t(`review${i + 1}Country`),
    review: t(`review${i + 1}Text`),
    date: t(`review${i + 1}Date`),
  }));
  const [isMobile, setIsMobile] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const touchContainerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragStartIndex = useRef(0);
  const isHorizontalSwipe = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cardWidth = isMobile ? 300 : 350;
  const gap = 24;
  const maxIndex = Math.max(0, reviews.length - (isMobile ? 1 : 3));
  const step = cardWidth + gap;

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  // Auto-slide effect
  useEffect(() => {
    if (isDragging) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % (maxIndex + 1 || 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [isMobile, isDragging, maxIndex]);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartIndex.current = currentIndex;
    isHorizontalSwipe.current = false;
    setDragDelta(0);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX.current;
    setDragDelta(dx);
  };

  const endDrag = () => {
    if (!isDragging) return;
    const deltaIndex = Math.round(dragDelta / step);
    const nextIndex = Math.min(maxIndex, Math.max(0, dragStartIndex.current - deltaIndex));
    setCurrentIndex(nextIndex);
    setDragDelta(0);
    setIsDragging(false);
    isHorizontalSwipe.current = false;
  };

  // Native touch handlers — attached via useEffect with { passive: false } so preventDefault works
  const touchStateRef = useRef({ dragging: false, delta: 0, startIdx: 0 });

  useEffect(() => {
    const el = touchContainerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      dragStartX.current = touch.clientX;
      dragStartY.current = touch.clientY;
      isHorizontalSwipe.current = false;
      touchStateRef.current.dragging = true;
      touchStateRef.current.delta = 0;
      touchStateRef.current.startIdx = currentIndex;
      setIsDragging(true);
      setDragDelta(0);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStateRef.current.dragging) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartX.current;
      const dy = touch.clientY - dragStartY.current;

      if (!isHorizontalSwipe.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        if (Math.abs(dx) > Math.abs(dy)) {
          isHorizontalSwipe.current = true;
        } else {
          touchStateRef.current.dragging = false;
          setIsDragging(false);
          setDragDelta(0);
          return;
        }
      }

      if (isHorizontalSwipe.current) {
        e.preventDefault(); // This works because { passive: false }
        touchStateRef.current.delta = dx;
        setDragDelta(dx);
      }
    };

    const onTouchEnd = () => {
      if (!touchStateRef.current.dragging) return;
      const d = touchStateRef.current.delta;
      if (Math.abs(d) > 10) {
        const direction = d > 0 ? -1 : 1;
        setCurrentIndex((prev) => Math.min(maxIndex, Math.max(0, touchStateRef.current.startIdx + direction)));
      }
      touchStateRef.current.dragging = false;
      touchStateRef.current.delta = 0;
      isHorizontalSwipe.current = false;
      setDragDelta(0);
      setIsDragging(false);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [currentIndex, maxIndex]);

  return (
    <section
      id="reviews"
      style={{
        padding: isMobile ? '4rem 1rem' : '6rem 2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header — profesyonel stil */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(0,245,255,0.85)',
              margin: '0 0 0.75rem 0',
            }}
          >
            {t('badge')}
          </p>
          <h2
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: '0 0 0.75rem 0',
            }}
          >
            {t('title')}
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.6,
              maxWidth: '36rem',
              margin: '0 auto',
            }}
          >
            {t('subtitle')}
          </p>
        </div>

        {/* Trustpilot Rating Banner */}
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '16px',
            padding: isMobile ? '1.5rem' : '2rem',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Trustpilot Banner with Rating */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            {/* Rating Display */}
            <a
              href="https://www.trustpilot.com/review/fibalgo.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                gap: isMobile ? '0.75rem' : '1.5rem',
                textDecoration: 'none',
                padding: '1rem 2rem',
                background: 'rgba(0,182,122,0.08)',
                borderRadius: '12px',
                border: '1px solid rgba(0,182,122,0.2)',
                direction: 'ltr',
              }}
            >
              {/* Official Trustpilot Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Trustpilot Star + Text Logo */}
                <svg width="220" height="54" viewBox="0 0 200 50" fill="none">
                  {/* Star */}
                  <path d="M25 5L29.635 18.235H43.5L32.4325 26.53L37.0675 39.765L25 31.47L12.9325 39.765L17.5675 26.53L6.5 18.235H20.365L25 5Z" fill="#00B67A"/>
                  {/* Trustpilot Text */}
                  <text x="52" y="33" fill="white" fontSize="22" fontFamily="Arial, sans-serif" fontWeight="700">Trustpilot</text>
                </svg>
              </div>
              
              {/* Rating - Official Trustpilot Stars */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {/* Official Trustpilot star style - green boxes with star shape */}
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} width="28" height="28" viewBox="0 0 32 32" fill="none">
                      <rect width="32" height="32" fill={i < 5 ? '#00B67A' : '#DCDCE6'}/>
                      <path d="M16 6L18.9389 13.5279H26.5L20.2806 18.4721L23.2195 26L16 21.0557L8.78053 26L11.7194 18.4721L5.5 13.5279H13.0611L16 6Z" fill="white"/>
                    </svg>
                  ))}
                </div>
                <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#FFFFFF' }}>4.8</span>
                <span style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }}>/ 5</span>
              </div>
              
              {/* Excellent text */}
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00B67A' }}>
                &quot;{t('excellent')}&quot;
              </span>
            </a>
            
            {/* Reviews Slider */}
            <div
              ref={touchContainerRef}
              style={{ 
                width: '100%', 
                overflow: 'hidden',
                position: 'relative',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
            >
              <div 
                ref={sliderRef}
                style={{
                  display: 'flex',
                  gap: `${gap}px`,
                  transition: isDragging ? 'none' : 'transform 0.5s ease-in-out',
                  transform: `translateX(${-(currentIndex * (cardWidth + gap)) + dragDelta}px)`,
                  direction: 'ltr',
                }}
              >
                {reviews.map((review, index) => (
                  <div 
                    key={index}
                    style={{
                      flex: `0 0 ${cardWidth}px`,
                      background: 'rgba(0,182,122,0.05)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      border: '1px solid rgba(0,182,122,0.2)',
                      direction: isRTL ? 'rtl' : 'ltr',
                    }}
                  >
                    {/* Stars */}
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '0.75rem' }}>
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} width="20" height="20" viewBox="0 0 32 32" fill="none">
                          <rect width="32" height="32" fill="#00B67A"/>
                          <path d="M16 6L18.9389 13.5279H26.5L20.2806 18.4721L23.2195 26L16 21.0557L8.78053 26L11.7194 18.4721L5.5 13.5279H13.0611L16 6Z" fill="white"/>
                        </svg>
                      ))}
                    </div>
                    
                    {/* Review Text */}
                    <p style={{ 
                      color: 'rgba(255,255,255,0.9)', 
                      fontSize: '0.95rem', 
                      lineHeight: 1.6, 
                      marginBottom: '1rem',
                      minHeight: '80px',
                    }}>
                      &quot;{review.review}&quot;
                    </p>
                    
                    {/* Reviewer Info */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      borderTop: '1px solid rgba(255,255,255,0.1)',
                      paddingTop: '0.75rem',
                    }}>
                      <div>
                        <p style={{ color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          {review.name}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                          {review.country}
                        </p>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                        {review.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Slider Dots */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '8px', 
                marginTop: '1.5rem' 
              }}>
                {[...Array(maxIndex + 1)].map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Go to slide ${i + 1}`}
                    onClick={() => setCurrentIndex(i)}
                    style={{
                      width: currentIndex === i ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      backgroundColor: currentIndex === i ? '#00B67A' : 'rgba(255,255,255,0.2)',
                      backgroundClip: 'content-box',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      padding: '12px 0',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a
            href="https://www.trustpilot.com/review/fibalgo.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid rgba(0,182,122,0.5)',
              borderRadius: '8px',
              color: '#00B67A',
              fontSize: '0.9rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            {t('seeAll')}
          </a>
        </div>
      </div>
    </section>
  );
}
