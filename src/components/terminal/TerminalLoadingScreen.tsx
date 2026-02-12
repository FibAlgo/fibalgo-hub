'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { prefetchTerminalData, needsInitialLoad, getTerminalCache } from '@/lib/store/terminalCache';

interface TerminalLoadingScreenProps {
  onComplete: () => void;
}

export default function TerminalLoadingScreen({ onComplete }: TerminalLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const t = useTranslations('terminalLoading');

  useEffect(() => {
    // Check if we actually need to load
    if (!needsInitialLoad()) {
      // Cache is still valid, skip loading
      setProgress(100);
      setMessage(t('ready'));
      setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 300);
      return;
    }

    // Start prefetching
    prefetchTerminalData((prog, msg) => {
      setProgress(prog);
      setMessage(msg);
    }).then(() => {
      setProgress(100);
      setMessage(t('ready'));
      // Small delay before hiding for smooth transition
      setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 500);
    });
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 30%, #0f0f0f 50%, #0a0a0a 70%, #000000 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        opacity: progress === 100 ? 0 : 1,
        transition: 'opacity 0.5s ease',
        overflow: 'hidden',
      }}
    >
      {/* Background Pattern */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.03) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(0, 245, 255, 0.02) 0%, transparent 50%)',
          animation: 'backgroundShift 20s ease-in-out infinite',
        }}
      />

      {/* Animated Grid */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          animation: 'gridMove 30s linear infinite',
        }}
      />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo Container */}
        <div style={{ marginBottom: '3rem', position: 'relative' }}>
          {/* Logo Background Glow */}
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              left: '-30px',
              right: '-30px',
              bottom: '-30px',
              background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, rgba(0,245,255,0.04) 50%, transparent 70%)',
              filter: 'blur(25px)',
              zIndex: -1,
              animation: 'logoGlow 3s ease-in-out infinite alternate',
            }}
          />
          
          {/* FibAlgo White Logo */}
          <img
            src="/logo-white.svg"
            alt="FibAlgo"
            style={{
              height: '80px',
              width: 'auto',
              filter: 'drop-shadow(0 0 15px rgba(245,158,11,0.15))',
              animation: 'logoFloat 4s ease-in-out infinite',
            }}
          />
        </div>

        {/* Loading Progress Container */}
        <div style={{ width: '100%', maxWidth: '320px', marginBottom: '2rem', position: 'relative' }}>
          {/* Progress Label */}
          <div
            style={{
              color: 'rgba(245,158,11,0.9)',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
              textAlign: 'center',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {t('sentimentLoaded')}
          </div>

          {/* Progress Bar Background */}
          <div
            style={{
              height: '6px',
              background: 'linear-gradient(90deg, rgba(245,158,11,0.1) 0%, rgba(0,245,255,0.1) 100%)',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid rgba(245,158,11,0.2)',
              position: 'relative',
            }}
          >
            {/* Progress Bar Fill */}
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #F59E0B 0%, #EF4444 50%, #00F5FF 100%)',
                borderRadius: '6px',
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 15px rgba(245,158,11,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Progress Bar Shimmer Effect */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '1rem',
            fontWeight: 500,
            marginBottom: '0.5rem',
            textAlign: 'center',
            letterSpacing: '0.02em',
          }}
        >
          {message}
        </div>

        {/* Percentage */}
        <div
          style={{
            color: '#F59E0B',
            fontSize: '1.5rem',
            fontWeight: 700,
            textShadow: '0 0 10px rgba(245,158,11,0.5)',
          }}
        >
          {progress}%
        </div>
      </div>

      {/* Floating Particles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${4 + (i % 3) * 2}px`,
            height: `${4 + (i % 3) * 2}px`,
            background: i % 2 === 0 
              ? 'rgba(245,158,11,0.2)' 
              : 'rgba(0,245,255,0.15)',
            borderRadius: '50%',
            left: `${10 + (i * 8) % 80}%`,
            top: `${15 + (i % 4) * 20}%`,
            animation: `float ${4 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}

      {/* Enhanced Animations and Styles */}
      <style jsx>{`
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        
        @keyframes logoGlow {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.05); }
        }
        
        @keyframes backgroundShift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-10px, -5px); }
          50% { transform: translate(5px, -10px); }
          75% { transform: translate(-5px, 5px); }
        }
        
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0) rotate(0deg); 
            opacity: 0.4; 
          }
          50% { 
            transform: translateY(-15px) rotate(180deg); 
            opacity: 0.8; 
          }
        }
        
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        /* Mobile Responsiveness */
        @media (max-width: 640px) {
          img {
            height: 60px !important;
          }
        }

        @media (max-width: 480px) {
          .loading-container {
            max-width: 280px !important;
            margin: 0 20px !important;
          }
          
          img {
            height: 50px !important;
          }
        }
      `}</style>
    </div>
  );
}
