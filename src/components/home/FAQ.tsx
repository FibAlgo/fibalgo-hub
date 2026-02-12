'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PLAN_PRICES } from '@/lib/config';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const t = useTranslations('faq');
  const priceVars = { premiumPrice: `€${PLAN_PRICES.premium}`, ultimatePrice: `€${PLAN_PRICES.ultimate}` };
  const faqs = Array.from({ length: 8 }, (_, i) => ({
    question: t(`q${i + 1}`),
    answer: t(`a${i + 1}`, priceVars),
  }));

  return (
    <section
      id="faq"
      style={{
        position: 'relative',
        width: '100%',
        padding: '6rem 0',
        overflow: 'hidden',
      }}
    >
      {/* Background */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(0,245,255,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '896px',
          margin: '0 auto',
          padding: '0 1.5rem',
        }}
      >
        {/* Section Header — profesyonel stil */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
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

        {/* FAQ Accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((faq, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '1rem',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
              }}
            >
              <button
                style={{
                  width: '100%',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span style={{ fontWeight: 600, color: '#FFFFFF', paddingRight: '1rem' }}>{faq.question}</span>
                <ChevronDown
                  style={{
                    width: '20px',
                    height: '20px',
                    color: '#00F5FF',
                    flexShrink: 0,
                    transition: 'transform 0.3s ease',
                    transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>
              <div
                style={{
                  overflow: 'hidden',
                  maxHeight: openIndex === index ? '500px' : '0px',
                  transition: 'max-height 0.3s ease',
                }}
              >
                <div style={{ padding: '0 1.5rem 1.25rem 1.5rem' }}>
                  <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>{t('stillQuestions')}</p>
          <a
            href="/dashboard?tab=support"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#00F5FF',
              textDecoration: 'none',
            }}
          >
            <span>{t('createTicket')}</span>
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
