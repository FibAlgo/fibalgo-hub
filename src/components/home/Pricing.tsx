'use client';

import { useState } from 'react';
import { Check, Zap, Sparkles, Crown, ArrowRight, Loader2 } from 'lucide-react';
import { subscriptionPlans, type SubscriptionPlan } from '@/lib/config';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Site theme (globals.css): primary #00F5FF, secondary #BF00FF
const planIcons = { basic: Zap, premium: Sparkles, ultimate: Crown };
const PRIMARY = '#00F5FF';
const GRADIENT = 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)';

export default function Pricing() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    // Basic plan CTA should take users directly to Terminal (preview allowed)
    if (plan.id === 'basic' || plan.price === 0) {
      window.location.href = '/terminal';
      return;
    }

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Redirect to signup with plan
      window.location.href = `/signup?plan=${plan.id}`;
      return;
    }

    setLoadingPlan(plan.id);

    try {
      // Get polarProductId from plan config
      const productId = plan.polarProductId;
      
      if (!productId) {
        console.error('No product ID found for plan:', plan.id);
        alert('Bu plan için ödeme sistemi henüz yapılandırılmamış.');
        setLoadingPlan(null);
        return;
      }

      console.log('Creating checkout for:', { planId: plan.id, productId, userId: user.id });
      
      const response = await fetch('/api/polar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Checkout API error:', data);
        alert('Ödeme sayfası oluşturulamadı: ' + (data.error || 'Bilinmeyen hata'));
        setLoadingPlan(null);
        return;
      }

      if (data.checkoutUrl) {
        console.log('Redirecting to checkout:', data.checkoutUrl);
        window.location.href = data.checkoutUrl;
      } else {
        console.error('No checkout URL returned:', data);
        alert('Ödeme URL\'si alınamadı.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Bir hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    } finally {
      setLoadingPlan(null);
    }
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
            Start free and upgrade when you're ready. No hidden fees, cancel anytime.
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

            return (
              <div
                key={plan.id}
                style={{
                  position: 'relative',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isPopular ? 'rgba(0,245,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '1rem',
                  padding: '2rem',
                  transition: 'all 0.3s ease',
                  transform: isPopular ? 'scale(1.02)' : 'scale(1)',
                }}
              >
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
                        display: 'inline-block',
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
                      Most Popular
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

                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                  {plan.name}
                </h3>

                <div style={{ marginBottom: '1.5rem' }}>
                  {plan.price === 0 ? (
                    <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#FFFFFF' }}>Free</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                      <span
                        style={{
                          fontSize: '2.5rem',
                          fontWeight: 700,
                          background: GRADIENT,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        ${plan.price}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>/month</span>
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
                  disabled={loadingPlan === plan.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.875rem 1.5rem',
                    borderRadius: '0.75rem',
                    fontWeight: 600,
                    cursor: loadingPlan === plan.id ? 'wait' : 'pointer',
                    transition: 'all 0.3s ease',
                    background: isBasic ? 'rgba(255,255,255,0.05)' : GRADIENT,
                    color: isBasic ? '#FFFFFF' : '#0A0A0F',
                    border: isBasic ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    opacity: loadingPlan === plan.id ? 0.7 : 1,
                  }}
                >
                  {loadingPlan === plan.id ? (
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
    </section>
  );
}
