'use client';

import { useEffect, useState } from 'react';
import { prefetchTerminalData, needsInitialLoad, getTerminalCache } from '@/lib/store/terminalCache';

interface TerminalLoadingScreenProps {
  onComplete: () => void;
}

export default function TerminalLoadingScreen({ onComplete }: TerminalLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Initializing...');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if we actually need to load
    if (!needsInitialLoad()) {
      // Cache is still valid, skip loading
      setProgress(100);
      setMessage('Ready');
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
      setMessage('Ready');
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
        background: 'linear-gradient(135deg, #000000 0%, #0a0a0f 50%, #000510 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        opacity: progress === 100 ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: '3rem', position: 'relative' }}>
        <div
          style={{
            fontSize: '3rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00F5FF 0%, #00D4AA 50%, #00F5FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
          }}
        >
          FibAlgo
        </div>
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: '-20px',
            right: '-20px',
            bottom: '-20px',
            background: 'radial-gradient(circle, rgba(0,245,255,0.15) 0%, transparent 70%)',
            filter: 'blur(20px)',
            zIndex: -1,
          }}
        />
      </div>

      {/* Loading indicator */}
      <div style={{ width: '280px', marginBottom: '1.5rem' }}>
        {/* Progress bar background */}
        <div
          style={{
            height: '4px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          {/* Progress bar fill */}
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #00F5FF, #00D4AA)',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
              boxShadow: '0 0 10px rgba(0,245,255,0.5)',
            }}
          />
        </div>
      </div>

      {/* Status message */}
      <div
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '0.875rem',
          fontWeight: 500,
          letterSpacing: '0.02em',
        }}
      >
        {message}
      </div>

      {/* Percentage */}
      <div
        style={{
          color: '#00F5FF',
          fontSize: '0.75rem',
          fontWeight: 600,
          marginTop: '0.5rem',
          opacity: 0.8,
        }}
      >
        {progress}%
      </div>

      {/* Animated background particles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.6; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
      
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            background: 'rgba(0,245,255,0.3)',
            borderRadius: '50%',
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}
