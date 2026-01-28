'use client';

import { useState } from 'react';
import { Check, Sparkles, Zap, Crown, ArrowRight, Loader2 } from 'lucide-react';
import { subscriptionPlans, type SubscriptionPlan } from '@/lib/config';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const planIcons = {
  basic: Zap,
  premium: Sparkles,
  ultimate: Crown,
};

const planColors = {
  basic: '#60A5FA',
  premium: '#00F5FF',
  ultimate: '#A855F7',
};

export default function Pricing() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (plan.price === 0) {
      window.location.href = '/signup';
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
      {/* Background */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '25%',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(191,0,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: '25%',
          width: '500px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(0,245,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Container */}
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
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              marginBottom: '1.5rem',
            }}
          >
            <Crown style={{ width: '16px', height: '16px', color: '#FFD700' }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Simple Pricing</span>
          </div>
          <h2
            style={{
              fontSize: 'clamp(1.875rem, 5vw, 3rem)',
              fontWeight: 700,
              color: '#FFFFFF',
              marginBottom: '1rem',
              lineHeight: 1.2,
            }}
          >
            Choose Your
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Trading Plan
            </span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '42rem', margin: '0 auto' }}>
            Start free and upgrade when you're ready. No hidden fees, cancel anytime.
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
            const color = planColors[plan.id as keyof typeof planColors];
            const isPopular = plan.id === 'ultimate';
            
            return (
              <div
                key={plan.id}
                style={{
                  position: 'relative',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isPopular ? 'rgba(0,245,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '1rem',
                  padding: '2rem',
                  transform: isPopular ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-1rem',
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
                        padding: '0.25rem 1rem',
                        borderRadius: '9999px',
                      }}
                    >
                      <span style={{ color: '#0A0A0F', fontSize: '0.875rem', fontWeight: 600 }}>Most Popular</span>
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '1rem',
                    background: `linear-gradient(135deg, ${color}, ${color}88)`,
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
                    <Icon style={{ width: '24px', height: '24px', color: color }} />
                  </div>
                </div>

                {/* Plan Name */}
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                  {plan.name}
                </h3>

                {/* Price */}
                <div style={{ marginBottom: '1.5rem' }}>
                  {plan.price === 0 ? (
                    <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#FFFFFF' }}>Free</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                      <span
                        style={{
                          fontSize: '2.5rem',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)',
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

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '2rem' }}>
                  {plan.features.map((feature, i) => (
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
                          background: `linear-gradient(135deg, ${color}, ${color}88)`,
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

                {/* CTA Button */}
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
                    background: isPopular ? 'linear-gradient(135deg, #00F5FF 0%, #BF00FF 100%)' : 'rgba(255,255,255,0.05)',
                    color: isPopular ? '#0A0A0F' : '#FFFFFF',
                    border: isPopular ? 'none' : '1px solid rgba(255,255,255,0.2)',
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

        {/* Bottom Note */}
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
            All plans include access to our Telegram community.{' '}
            <Link href="#faq" style={{ color: '#00F5FF', textDecoration: 'none' }}>
              View FAQ
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
