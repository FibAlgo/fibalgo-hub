'use client';

import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, ShieldCheck, WalletMinimal, MessageCircle, Clock, Upload, Loader2, X } from 'lucide-react';

const PRIMARY = '#00F5FF';
const AMBER = '#F59E0B';
const BG_GRADIENT = 'linear-gradient(180deg, #0B0C14 0%, #0A0A0F 45%, #09090C 100%)';

// Crypto payment prices in USD
const CRYPTO_PRICES: Record<string, number> = {
  premium: 24.99,
  ultimate: 49.99,
};

export default function CryptoPaymentPage() {
  const t = useTranslations('cryptoPayment');
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const [txHash, setTxHash] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : t('yourPlan');
  const planPrice = plan ? CRYPTO_PRICES[plan.toLowerCase()] : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG_GRADIENT,
        color: '#FFFFFF',
        padding: '80px 16px 48px',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Hero */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '28px 24px',
            background: 'linear-gradient(135deg, rgba(0,245,255,0.08), rgba(245,158,11,0.08))',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
            marginBottom: '24px',
          }}
        >
          <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(0,245,255,0.15) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', bottom: '-80px', left: '-40px', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%)' }} />

          <div style={{ position: 'relative', zIndex: 2, display: 'grid', gap: '14px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', width: 'fit-content' }}>
              <WalletMinimal style={{ width: 16, height: 16, color: PRIMARY }} />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>{t('badge')}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', margin: 0, letterSpacing: '-0.01em' }}>
              {t('title')}
            </h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', maxWidth: '640px', lineHeight: 1.6 }}>
              {t('subtitle')}
            </p>
            <div className="hero-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'rgba(0,245,255,0.1)',
                  border: '1px solid rgba(0,245,255,0.25)',
                }}
              >
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{t('selectedPlan')}</span>
                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{planLabel}</span>
                {planPrice && (
                  <>
                    <span style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />
                    <span style={{ fontWeight: 700, color: '#4ade80', fontSize: '15px' }}>${planPrice}</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: PRIMARY,
                  color: '#0A0A0F',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 0 22px rgba(0,245,255,0.35)',
                }}
              >
                {t('paidAlready')}
                <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        </div>

        {/* Step 1 – Payment details */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(0,245,255,0.08), rgba(245,158,11,0.08))',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '18px 16px',
            boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
            marginBottom: '14px',
            display: 'grid',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(0,245,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WalletMinimal style={{ width: 18, height: 18, color: PRIMARY }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>{t('step1Title')}</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem' }}>{t('step1Desc')}</div>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '10px 12px',
              }}
            >
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>{t('wallet')}</div>
              <div style={{ fontWeight: 700, marginTop: '4px', wordBreak: 'break-all' }}>TCsUntniY8e3jpQC3b1avbZr1BTa8Niv9j</div>
            </div>
            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '10px 12px',
              }}
            >
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>{t('network')}</div>
              <div style={{ fontWeight: 700, marginTop: '4px' }}>{t('trc20Only')}</div>
            </div>
          </div>
        </div>

        {/* Proof modal trigger only */}

        {/* Steps 2+ */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {[
            {
              title: t('step2Title'),
              desc: t('step2Desc'),
              icon: <MessageCircle style={{ width: 18, height: 18, color: PRIMARY }} />,
            },
            {
              title: t('step3Title'),
              desc: t('step3Desc'),
              icon: <Clock style={{ width: 18, height: 18, color: PRIMARY }} />,
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(0,0,0,0.05))',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(0,245,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>{item.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div
          style={{
            marginTop: '22px',
            padding: '16px',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div className="action-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <Link
              href="/dashboard?tab=support"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 14px',
                borderRadius: '10px',
                background: PRIMARY,
                color: '#0A0A0F',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {t('contactSupport')}
              <ArrowRight style={{ width: 16, height: 16 }} />
            </Link>
            <Link
              href="/#pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#FFFFFF',
                textDecoration: 'none',
              }}
            >
              {t('backToPricing')}
            </Link>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}>
              {t('needHelp')}
            </div>
          </div>
        </div>
      </div>
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'linear-gradient(135deg, rgba(0,245,255,0.08), rgba(245,158,11,0.08))',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '18px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Upload style={{ width: 18, height: 18, color: PRIMARY }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{t('submitProof')}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>{t('proofSubtitle')}</div>
              </div>
            </div>

            <label style={{ display: 'grid', gap: '6px', marginBottom: '10px' }}>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>{t('txHashLabel')}</span>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder={t('txHashPlaceholder')}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: '#0A0A0F',
                  color: '#fff',
                }}
                required
              />
            </label>

            <label style={{ display: 'grid', gap: '6px', marginBottom: '10px' }}>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>{t('proofScreenshot')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ color: '#fff' }}
                required
              />
            </label>

            {error && <div style={{ color: '#f87171', fontSize: '0.9rem', marginBottom: '6px' }}>{error}</div>}
            {status && <div style={{ color: '#34d399', fontSize: '0.9rem', marginBottom: '6px' }}>{status}</div>}

            <button
              onClick={async () => {
                setError(null);
                setStatus(null);
                if (!txHash.trim() || !file) {
                  setError(t('txAndProofRequired'));
                  return;
                }
                setSubmitting(true);
                try {
                  const body = new FormData();
                  body.append('txHash', txHash.trim());
                  body.append('file', file);
                  if (plan) body.append('plan', plan);
                  const res = await fetch('/api/crypto-payments', { method: 'POST', body });
                  const json = await res.json();
                  if (!res.ok) {
                    setError(json.error || t('failedToSubmit'));
                  } else {
                    setStatus(t('submittedSuccess'));
                    setTxHash('');
                    setFile(null);
                  }
                } catch (err) {
                  setError(t('somethingWrong'));
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                width: 'fit-content',
                padding: '11px 16px',
                borderRadius: '12px',
                border: 'none',
                background: PRIMARY,
                color: '#0A0A0F',
                fontWeight: 800,
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.8 : 1,
              }}
            >
              {submitting ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Upload style={{ width: 16, height: 16 }} />}
              <span>{t('sendProof')}</span>
            </button>
          </div>
        </div>
      )}
      <style jsx>{`
        @media (max-width: 640px) {
          .hero-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .hero-actions > * {
            width: 100%;
          }
          .action-row {
            flex-direction: column;
            align-items: stretch;
          }
          .action-row > * {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
