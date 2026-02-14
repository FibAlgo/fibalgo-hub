'use client';

import { useState } from 'react';
import { Check, Zap, Sparkles, Crown, ArrowRight, Loader2, WalletMinimal, CreditCard, Flame, Tag } from 'lucide-react';
import { subscriptionPlans, type SubscriptionPlan } from '@/lib/config';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

// Per-plan color themes (matching Dashboard TradingView Stage 1/2/3 colors)
const planIcons = { basic: Zap, premium: Sparkles, ultimate: Crown };

// Stage 1 — Blue (Basic: locked/free tier)
const BASIC_PRIMARY = '#2962FF';
const BASIC_SECONDARY = '#00BCD4';
// Stage 2 — Amber/Gold (Premium: mid-tier)
const PREMIUM_PRIMARY = '#FFA800';
const PREMIUM_SECONDARY = '#FFD700';
// Stage 3 — Emerald/Green (Ultimate: full access)
const ULTIMATE_PRIMARY = '#10B981';
const ULTIMATE_SECONDARY = '#34D399';

const planColors: Record<string, { primary: string; secondary: string; gradient: string; ctaGradient: string }> = {
  basic: {
    primary: BASIC_PRIMARY,
    secondary: BASIC_SECONDARY,
    gradient: `linear-gradient(135deg, ${BASIC_PRIMARY} 0%, ${BASIC_SECONDARY} 100%)`,
    ctaGradient: 'linear-gradient(135deg, #2962FF 0%, #0091EA 100%)',
  },
  premium: {
    primary: PREMIUM_PRIMARY,
    secondary: PREMIUM_SECONDARY,
    gradient: `linear-gradient(135deg, ${PREMIUM_PRIMARY} 0%, ${PREMIUM_SECONDARY} 100%)`,
    ctaGradient: 'linear-gradient(135deg, #FFA800 0%, #FFD700 100%)',
  },
  ultimate: {
    primary: ULTIMATE_PRIMARY,
    secondary: ULTIMATE_SECONDARY,
    gradient: `linear-gradient(135deg, ${ULTIMATE_PRIMARY} 0%, ${ULTIMATE_SECONDARY} 100%)`,
    ctaGradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  },
};

// İndirim yüzdesi hesaplama
const getDiscountPercent = (original: number, current: number): number => {
  return Math.round(((original - current) / original) * 100);
};

export default function Pricing() {
  const t = useTranslations('pricing');
  const tc = useTranslations('common');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const supabase = createClient();

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    // Basic plan CTA should take users directly to Terminal (preview allowed)
    if (plan.id === 'basic' || plan.price === 0) {
      window.location.href = '/terminal';
      return;
    }

    // For paid plans, check if user is logged in first
    setIsCheckingAuth(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(window.location.href + '#pricing');
        window.location.href = `/login?returnUrl=${returnUrl}&plan=${plan.id}`;
        return;
      }
      
      // User is logged in, show payment modal
      setSelectedPlan(plan);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      // On error, redirect to login
      window.location.href = '/login';
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const startCardCheckout = async () => {
    if (!selectedPlan) return;

    // CopeCart checkout links
    const checkoutLinks: Record<string, string> = {
      premium: 'https://copecart.com/products/7a66056a/checkout',
      ultimate: 'https://copecart.com/products/58924473/checkout',
    };

    const checkoutUrl = checkoutLinks[selectedPlan.id];
    
    if (checkoutUrl) {
      // Get user ID to pass as metadata so CopeCart IPN can identify the user
      // This solves the email mismatch problem (CopeCart billing email ≠ site email)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Append user ID as metadata — CopeCart sends this back in IPN webhook
          window.location.href = `${checkoutUrl}?metadata=${user.id}`;
        } else {
          window.location.href = checkoutUrl;
        }
      } catch {
        window.location.href = checkoutUrl;
      }
    } else {
      alert(t('alertNoCheckout'));
    }
    
    setShowPaymentModal(false);
  };

  const handleCryptoPayment = () => {
    if (!selectedPlan) return;
    const planParam = encodeURIComponent(selectedPlan.id);
    setShowPaymentModal(false);
    window.location.href = `/crypto-payment?plan=${planParam}`;
  };

  return (
    <section
      id="pricing"
      style={{
        position: 'relative',
        width: '100%',
        padding: '6rem 0',
        overflow: 'hidden',
      }}
    >
      {/* Background — subtle mixed gradient glows */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '1000px', height: '600px', background: 'radial-gradient(circle, rgba(41,98,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '30%', left: '20%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,168,0,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1.5rem',
        }}
      >
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          {/* Sale Banner */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, rgba(255,168,0,0.12) 0%, rgba(255,215,0,0.08) 100%)',
              border: '1px solid rgba(255,168,0,0.25)',
              borderRadius: '9999px',
              padding: '0.5rem 1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <Flame style={{ width: '14px', height: '14px', color: PREMIUM_SECONDARY }} />
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.02em' }}>
              {t('saleBanner')}
            </span>
          </div>
          
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: PREMIUM_PRIMARY,
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
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.6,
              maxWidth: '36rem',
              margin: '0 auto',
            }}
          >
            {t('subtitle')}
          </p>
        </div>

        {/* Pricing Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            width: '100%',
          }}
        >
          {subscriptionPlans.map((plan) => {
            const Icon = planIcons[plan.id as keyof typeof planIcons];
            const colors = planColors[plan.id] || planColors.basic;
            const isPopular = plan.id === 'ultimate';
            const isBasic = plan.id === 'basic';
            const hasDiscount = plan.originalPrice && plan.originalPrice > plan.price;
            const discountPercent = hasDiscount ? getDiscountPercent(plan.originalPrice!, plan.price) : 0;

            return (
              <div
                key={plan.id}
                style={{
                  position: 'relative',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'linear-gradient(145deg, #0c0e1a 0%, #111428 50%, #0f1124 100%)',
                  border: `1px solid rgba(${isPopular ? '16,185,129' : plan.id === 'premium' ? '255,168,0' : '41,98,255'},${isPopular ? '0.35' : '0.15'})`,
                  transition: 'all 0.3s ease',
                  transform: isPopular ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isPopular ? `0 0 40px rgba(16,185,129,0.12), 0 8px 32px rgba(0,0,0,0.3)` : '0 4px 20px rgba(0,0,0,0.2)',
                }}
              >
                {/* Top gradient line — per-plan color */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                  background: `linear-gradient(90deg, transparent, ${colors.primary}, ${colors.secondary}, ${colors.primary}, transparent)`,
                }} />

                {/* Ambient glows — per-plan color */}
                <div style={{ position: 'absolute', top: '-60px', right: '-30px', width: '200px', height: '200px', background: `radial-gradient(circle, ${colors.primary}10 0%, transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-40px', left: '-20px', width: '160px', height: '160px', background: `radial-gradient(circle, ${colors.secondary}0A 0%, transparent 70%)`, pointerEvents: 'none' }} />

                {/* Badges — sticker labels on top of card */}
                {(hasDiscount || isPopular) && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '-1px', 
                    left: 0, right: 0, 
                    display: 'flex', 
                    justifyContent: hasDiscount && isPopular ? 'space-between' : hasDiscount ? 'flex-end' : 'flex-start',
                    padding: '0 1rem',
                    zIndex: 2,
                  }}>
                    {isPopular && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: `linear-gradient(145deg, ${ULTIMATE_PRIMARY}20 0%, ${ULTIMATE_SECONDARY}12 100%)`,
                          color: ULTIMATE_SECONDARY,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '6px 14px',
                          borderRadius: '0 0 10px 10px',
                          border: `1px solid ${ULTIMATE_PRIMARY}35`,
                          borderTop: 'none',
                          boxShadow: `0 4px 16px ${ULTIMATE_PRIMARY}1A`,
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                        }}
                      >
                        <Crown style={{ width: '11px', height: '11px' }} />
                        {t('bestValue')}
                      </span>
                    )}
                    {hasDiscount && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: `linear-gradient(145deg, ${colors.primary}20 0%, ${colors.secondary}12 100%)`,
                          color: colors.secondary,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '6px 14px',
                          borderRadius: '0 0 10px 10px',
                          border: `1px solid ${colors.primary}35`,
                          borderTop: 'none',
                          boxShadow: `0 4px 16px ${colors.primary}1A`,
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                        }}
                      >
                        <Tag style={{ width: '11px', height: '11px' }} />
                        {t('discountOff', { percent: discountPercent })}
                      </span>
                    )}
                  </div>
                )}

                <div style={{ padding: '2rem', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Top section — fixed height so features align across cards */}
                  <div style={{ minHeight: '210px' }}>
                  {/* Icon */}
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '14px',
                      background: `linear-gradient(135deg, ${colors.primary}26 0%, ${colors.secondary}1A 100%)`,
                      border: `1px solid ${colors.primary}33`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 15px ${colors.primary}1A`,
                      marginBottom: '1.5rem',
                    }}
                  >
                    <Icon style={{ width: '24px', height: '24px', color: colors.secondary }} />
                  </div>

                  {/* Plan name + badge */}
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {plan.name}
                    {plan.id === 'premium' && (
                      <span style={{ 
                        fontSize: '0.7rem', fontWeight: 600, color: `${PREMIUM_SECONDARY}CC`, 
                        padding: '0.2rem 0.5rem', background: `${PREMIUM_PRIMARY}1A`,
                        border: `1px solid ${PREMIUM_PRIMARY}26`, borderRadius: '6px',
                      }}>HUB</span>
                    )}
                    {plan.id === 'ultimate' && (
                      <span style={{ 
                        fontSize: '0.7rem', fontWeight: 600, color: `${ULTIMATE_SECONDARY}CC`, 
                        padding: '0.2rem 0.5rem', background: `${ULTIMATE_PRIMARY}1A`,
                        border: `1px solid ${ULTIMATE_PRIMARY}26`, borderRadius: '6px',
                      }}>HUB + Indicators</span>
                    )}
                  </h3>

                  {/* Price */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    {plan.price === 0 ? (
                      <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#FFFFFF' }}>{t('free')}</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {hasDiscount && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.15rem', fontWeight: 500, color: 'rgba(255,255,255,0.35)', textDecoration: 'line-through' }}>
                              €{plan.originalPrice}
                            </span>
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 600, color: colors.secondary,
                              background: `${colors.secondary}1A`, border: `1px solid ${colors.secondary}26`,
                              padding: '2px 7px', borderRadius: '5px',
                            }}>
                              {t('saveAmount', { amount: (plan.originalPrice! - plan.price).toFixed(0) })}
                            </span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                          <span
                            style={{
                              fontSize: '2.5rem',
                              fontWeight: 700,
                              background: colors.gradient,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            €{plan.price}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>{t('perMonth')}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Separator */}
                  <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${colors.primary}26, transparent)`, marginBottom: '1.5rem' }} />
                  </div>

                  {/* Bottom section — features + CTA, flex-grows to fill */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Includes label */}
                  {plan.id === 'basic' && (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', marginBottom: '0.75rem', fontWeight: 500, letterSpacing: '0.02em' }}>
                      {t('includedFeatures')}
                    </p>
                  )}
                  {plan.id === 'premium' && plan.features[0] === 'All Basic Features' && (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', marginBottom: '0.75rem', fontWeight: 500, letterSpacing: '0.02em' }}>
                      {t('allBasicFeatures')}
                    </p>
                  )}
                  {plan.id === 'ultimate' && plan.features[0] === 'Everything in Premium' && (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', marginBottom: '0.75rem', fontWeight: 500, letterSpacing: '0.02em' }}>
                      {t('everythingInPremium')}
                    </p>
                  )}

                  {/* Features */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '2rem', flex: 1 }}>
                    {plan.features
                      .filter(
                        (f) =>
                          !(plan.id === 'premium' && f === 'All Basic Features') &&
                          !(plan.id === 'ultimate' && f === 'Everything in Premium')
                      )
                      .map((feature, i) => (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            marginBottom: '0.85rem',
                          }}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              background: `linear-gradient(135deg, ${colors.primary}26 0%, ${colors.secondary}1A 100%)`,
                              border: `1px solid ${colors.primary}33`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            <Check style={{ width: '12px', height: '12px', color: colors.secondary }} />
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.5 }}>{t(`${plan.id}Features.${i}`)}</span>
                        </li>
                      ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={loadingPlan === plan.id || isCheckingAuth}
                    className="pricing-cta-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '0.875rem 1.5rem',
                      borderRadius: '10px',
                      fontWeight: 650,
                      fontSize: '0.88rem',
                      cursor: (loadingPlan === plan.id || isCheckingAuth) ? 'wait' : 'pointer',
                      transition: 'all 0.2s ease',
                      background: `linear-gradient(145deg, ${colors.primary}18 0%, ${colors.secondary}10 100%)`,
                      color: colors.secondary,
                      border: `1px solid ${colors.primary}40`,
                      boxShadow: `0 4px 20px ${colors.primary}1A, inset 0 1px 0 ${colors.primary}15`,
                      opacity: (loadingPlan === plan.id || isCheckingAuth) ? 0.7 : 1,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {(loadingPlan === plan.id || isCheckingAuth) ? (
                      <>
                        <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                        <span>{tc('processing')}</span>
                      </>
                    ) : (
                      <>
                        <span>{plan.price === 0 ? t('getStartedFree') : t('subscribeNow')}</span>
                        <ArrowRight style={{ width: '16px', height: '16px' }} />
                      </>
                    )}
                  </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
            {t('telegramNote')}{' '}
            <a
              href="https://t.me/+gCCSR8OEkGozNWZi"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#00BCD4', textDecoration: 'none' }}
            >
              {t('joinUs')}
            </a>
          </p>
        </div>
      </div>

        {showPaymentModal && selectedPlan && (
          <>
            <style jsx>{`
              @keyframes modalIn {
                from {
                  opacity: 0;
                  transform: translateY(14px) scale(0.98);
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
            `}</style>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: '1rem',
            }}
            onClick={() => setShowPaymentModal(false)}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '360px',
                background: 'linear-gradient(180deg, rgba(18,16,12,0.98) 0%, rgba(12,10,8,0.99) 100%)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.08)',
                overflow: 'hidden',
                animation: 'modalIn 0.25s ease-out forwards',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent 0%, #F59E0B 50%, transparent 100%)',
                  margin: '-1.5rem -1.5rem 1rem',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: '-36px',
                  left: '50%',
                  width: '180px',
                  height: '90px',
                  background: 'radial-gradient(ellipse, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                <img
                  src="/logo-white.png"
                  alt="FibAlgo"
                  style={{ height: '32px', width: 'auto', display: 'inline-block', opacity: 0.95 }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'inline-block';
                  }}
                />
                <span
                  style={{
                    display: 'none',
                    fontSize: '20px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#F59E0B',
                    marginLeft: '0.5rem',
                  }}
                >
                  FibAlgo
                </span>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', margin: 0 }}>{t('selectPayment')}</p>
                <h3 style={{ color: '#fff', margin: '0.25rem 0 0', fontSize: '1.25rem' }}>{selectedPlan.name}</h3>
              </div>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <button
                  onClick={handleCryptoPayment}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'rgba(245,158,11,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <WalletMinimal style={{ width: '20px', height: '20px', color: '#F59E0B' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{t('cryptoPayment')}</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                        {t('cryptoDesc')}
                    </div>
                  </div>
                  <ArrowRight style={{ width: '16px', height: '16px', color: 'rgba(255,255,255,0.7)' }} />
                </button>

                <button
                  onClick={startCardCheckout}
                  disabled={loadingPlan === selectedPlan.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '12px',
                    background: '#F59E0B',
                    border: '1px solid #F59E0B',
                    color: '#0A0A0F',
                    cursor: loadingPlan === selectedPlan.id ? 'wait' : 'pointer',
                    opacity: loadingPlan === selectedPlan.id ? 0.8 : 1,
                    boxShadow: '0 0 20px rgba(245,158,11,0.3)',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: '#0A0A0F',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CreditCard style={{ width: '20px', height: '20px', color: '#F59E0B' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>{t('creditCard')}</div>
                    <div style={{ color: 'rgba(10,10,15,0.85)', fontSize: '0.9rem' }}>
                        {t('creditCardDesc')}
                    </div>
                  </div>
                  {loadingPlan === selectedPlan.id ? (
                    <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <ArrowRight style={{ width: '16px', height: '16px', color: '#0A0A0F' }} />
                  )}
                </button>
              </div>
            </div>
          </div>
          </>
        )}
    </section>
  );
}
