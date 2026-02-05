'use client';

import { useState } from 'react';
import { Check, Zap, Sparkles, Crown, ArrowRight, Loader2, WalletMinimal, CreditCard, Flame, Tag } from 'lucide-react';
import { subscriptionPlans, type SubscriptionPlan } from '@/lib/config';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Site theme (globals.css): primary #00F5FF, secondary #BF00FF
const planIcons = { basic: Zap, premium: Sparkles, ultimate: Crown };
const PRIMARY = '#00F5FF';
const GRADIENT = 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)';
const SALE_GRADIENT = 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 50%, #FFA500 100%)';

// İndirim yüzdesi hesaplama
const getDiscountPercent = (original: number, current: number): number => {
  return Math.round(((original - current) / original) * 100);
};

export default function Pricing() {
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
      window.location.href = checkoutUrl;
    } else {
      alert('This plan does not have a checkout link configured.');
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
      {/* Background — CTA ile aynı glow (site teması) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '1000px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(0,245,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(191,0,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

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
        {/* Section Header — CTA / IndicatorTabs ile aynı stil */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          {/* Limited Time Sale Banner */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, rgba(255,107,107,0.15) 0%, rgba(255,142,83,0.15) 100%)',
              border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: '9999px',
              padding: '0.5rem 1rem',
              marginBottom: '1.5rem',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            <Flame style={{ width: '16px', height: '16px', color: '#FF6B6B' }} />
            <span style={{ color: '#FF8E53', fontWeight: 600, fontSize: '0.85rem' }}>
              🔥 Limited Time: Up to 50% OFF
            </span>
          </div>
          
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
            Pricing
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
            Choose Your Trading Plan
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
            Start free and upgrade when you&apos;re ready. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards — CTA stats kartları ile aynı bg/border */}
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
            const isPopular = plan.id === 'ultimate';
            const isBasic = plan.id === 'basic';
            const hasDiscount = plan.originalPrice && plan.originalPrice > plan.price;
            const discountPercent = hasDiscount ? getDiscountPercent(plan.originalPrice!, plan.price) : 0;

            return (
              <div
                key={plan.id}
                style={{
                  position: 'relative',
                  background: hasDiscount 
                    ? 'linear-gradient(135deg, rgba(255,107,107,0.05) 0%, rgba(255,255,255,0.03) 50%, rgba(0,245,255,0.05) 100%)'
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isPopular ? 'rgba(255,107,107,0.5)' : hasDiscount ? 'rgba(255,142,83,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '1rem',
                  padding: '2rem',
                  transition: 'all 0.3s ease',
                  transform: isPopular ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isPopular ? '0 0 40px rgba(255,107,107,0.15)' : 'none',
                }}
              >
                {/* Discount Badge */}
                {hasDiscount && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-1rem',
                      right: '1rem',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        boxShadow: '0 4px 15px rgba(255,107,107,0.4)',
                      }}
                    >
                      <Tag style={{ width: '12px', height: '12px' }} />
                      {discountPercent}% OFF
                    </span>
                  </div>
                )}
                
                {isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-1rem',
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: 'linear-gradient(90deg, #FBBF24 0%, #F59E0B 25%, #EF4444 60%, #DC2626 100%)',
                        backgroundSize: '200% 100%',
                        backgroundPosition: '0% 50%',
                        color: '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '4px 14px',
                        borderRadius: '9999px',
                        boxShadow: '0 0 12px rgba(251, 191, 36, 0.5), 0 0 20px rgba(249, 115, 22, 0.4)',
                        animation: 'flameBadgeGlow 1.8s ease-in-out infinite',
                      }}
                    >
                      <Flame style={{ width: '12px', height: '12px' }} />
                      Best Value
                    </span>
                  </div>
                )}

                {/* Icon — tema rengi */}
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '1rem',
                    background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY}88)`,
                    padding: '1px',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: '#0A0A0F',
                      borderRadius: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon style={{ width: '24px', height: '24px', color: PRIMARY }} />
                  </div>
                </div>

                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {plan.name}
                  {plan.id === 'premium' && (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 500, 
                      color: 'rgba(255,255,255,0.5)', 
                      padding: '0.15rem 0.5rem',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '0.25rem',
                    }}>
                      HUB
                    </span>
                  )}
                  {plan.id === 'ultimate' && (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 500, 
                      color: 'rgba(255,255,255,0.5)', 
                      padding: '0.15rem 0.5rem',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '0.25rem',
                    }}>
                      HUB & Indicator
                    </span>
                  )}
                </h3>

                <div style={{ marginBottom: '1.5rem' }}>
                  {plan.price === 0 ? (
                    <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#FFFFFF' }}>Free</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {/* Eski fiyat (üstü çizili) */}
                      {hasDiscount && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '1.25rem',
                              fontWeight: 500,
                              color: 'rgba(255,255,255,0.4)',
                              textDecoration: 'line-through',
                            }}
                          >
                            €{plan.originalPrice}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: '#4ade80',
                              background: 'rgba(74,222,128,0.15)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            SAVE €{(plan.originalPrice! - plan.price).toFixed(0)}
                          </span>
                        </div>
                      )}
                      {/* Yeni fiyat */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                        <span
                          style={{
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            background: hasDiscount 
                              ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 50%, #4ade80 100%)'
                              : GRADIENT,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          €{plan.price}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>/month</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Premium: "All Basic Features" / Ultimate: "Everything in Premium" — özelliklerin üstünde, ikonsuz */}
                {plan.id === 'premium' && plan.features[0] === 'All Basic Features' && (
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    All Basic Features
                  </p>
                )}
                {plan.id === 'ultimate' && plan.features[0] === 'Everything in Premium' && (
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    Everything in Premium
                  </p>
                )}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '2rem' }}>
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
                          marginBottom: '1rem',
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY}88)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          <Check style={{ width: '12px', height: '12px', color: '#0A0A0F' }} />
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>{feature}</span>
                      </li>
                    ))}
                </ul>

                {/* Buttons — CTA ile uyumlu: primary gradient veya secondary outline */}
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loadingPlan === plan.id || isCheckingAuth}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.875rem 1.5rem',
                    borderRadius: '0.75rem',
                    fontWeight: 600,
                    cursor: (loadingPlan === plan.id || isCheckingAuth) ? 'wait' : 'pointer',
                    transition: 'all 0.3s ease',
                    background: isBasic ? 'rgba(255,255,255,0.05)' : GRADIENT,
                    color: isBasic ? '#FFFFFF' : '#0A0A0F',
                    border: isBasic ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    opacity: (loadingPlan === plan.id || isCheckingAuth) ? 0.7 : 1,
                  }}
                >
                  {(loadingPlan === plan.id || isCheckingAuth) ? (
                    <>
                      <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{plan.price === 0 ? 'Get Started Free' : 'Subscribe Now'}</span>
                      <ArrowRight style={{ width: '16px', height: '16px' }} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
            All plans include access to our Telegram community.{' '}
            <a
              href="https://t.me/+gCCSR8OEkGozNWZi"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#00F5FF', textDecoration: 'none' }}
            >
              Join us
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
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', margin: 0 }}>Select payment method</p>
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
                    <div style={{ fontWeight: 700 }}>Crypto payment</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                        Pay with USDT, instant access.
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
                    <div style={{ fontWeight: 800 }}>Credit card</div>
                    <div style={{ color: 'rgba(10,10,15,0.85)', fontSize: '0.9rem' }}>
                        All cards, instant access.
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
