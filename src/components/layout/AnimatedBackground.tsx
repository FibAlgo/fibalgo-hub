'use client';

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export default function AnimatedBackground() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Masaüstü: orijinal değerler. Mobil: biraz görünür (orta opacity).
  const orb1 = isMobile
    ? { top: '-15%', left: '0%', w: '70%', h: '70%', bg: 'radial-gradient(ellipse at center, rgba(0,245,255,0.2) 0%, rgba(0,245,255,0.07) 40%, transparent 70%)', blur: '65px' }
    : { top: '-20%', left: '-10%', w: '70%', h: '70%', bg: 'radial-gradient(ellipse at center, rgba(0,245,255,0.15) 0%, rgba(0,245,255,0.05) 35%, transparent 65%)', blur: '80px' };
  const orb2 = isMobile
    ? { top: '-15%', right: '0%', w: '65%', h: '65%', bg: 'radial-gradient(ellipse at center, rgba(191,0,255,0.18) 0%, rgba(191,0,255,0.06) 40%, transparent 70%)', blur: '65px' }
    : { top: '-15%', right: '-15%', w: '65%', h: '65%', bg: 'radial-gradient(ellipse at center, rgba(191,0,255,0.12) 0%, rgba(191,0,255,0.04) 35%, transparent 65%)', blur: '80px' };
  const orb3 = isMobile
    ? { top: '20%', left: '20%', w: '60%', h: '60%', bg: 'radial-gradient(ellipse at center, rgba(0,168,255,0.14) 0%, rgba(0,168,255,0.05) 40%, transparent 70%)', blur: '75px' }
    : { top: '25%', left: '35%', w: '50%', h: '50%', bg: 'radial-gradient(ellipse at center, rgba(0,168,255,0.1) 0%, rgba(0,168,255,0.03) 35%, transparent 65%)', blur: '100px' };
  const orb4 = isMobile
    ? { bottom: '-15%', left: '25%', w: '70%', h: '60%', bg: 'radial-gradient(ellipse at center, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.05) 40%, transparent 70%)', blur: '65px' }
    : { bottom: '-20%', left: '15%', w: '70%', h: '60%', bg: 'radial-gradient(ellipse at center, rgba(168,85,247,0.1) 0%, rgba(168,85,247,0.03) 35%, transparent 65%)', blur: '80px' };
  const orb5 = isMobile
    ? { bottom: '10%', right: '15%', w: '45%', h: '45%', bg: 'radial-gradient(ellipse at center, rgba(0,245,255,0.12) 0%, rgba(0,245,255,0.04) 40%, transparent 70%)', blur: '65px' }
    : { bottom: '10%', right: '5%', w: '45%', h: '45%', bg: 'radial-gradient(ellipse at center, rgba(0,245,255,0.08) 0%, rgba(0,245,255,0.02) 35%, transparent 65%)', blur: '80px' };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        pointerEvents: 'none', 
        overflow: 'hidden', 
        zIndex: 0,
        background: 'linear-gradient(180deg, #050508 0%, #0a0a14 50%, #080810 100%)'
      }}
    >
      {/* Main cyan glow - top left */}
      <div
        className="neon-orb neon-orb-1"
        style={{
          position: 'absolute',
          top: orb1.top,
          left: orb1.left,
          width: orb1.w,
          height: orb1.h,
          background: orb1.bg,
          filter: `blur(${orb1.blur})`,
        }}
      />
      
      {/* Main purple glow - top right */}
      <div
        className="neon-orb neon-orb-2"
        style={{
          position: 'absolute',
          top: orb2.top,
          right: orb2.right,
          width: orb2.w,
          height: orb2.h,
          background: orb2.bg,
          filter: `blur(${orb2.blur})`,
        }}
      />
      
      {/* Center blue accent */}
      <div
        className="neon-orb neon-orb-3"
        style={{
          position: 'absolute',
          top: orb3.top,
          left: orb3.left,
          width: orb3.w,
          height: orb3.h,
          background: orb3.bg,
          filter: `blur(${orb3.blur})`,
        }}
      />
      
      {/* Bottom purple gradient */}
      <div
        className="neon-orb neon-orb-4"
        style={{
          position: 'absolute',
          bottom: orb4.bottom,
          left: orb4.left,
          width: orb4.w,
          height: orb4.h,
          background: orb4.bg,
          filter: `blur(${orb4.blur})`,
        }}
      />

      {/* Extra cyan accent - bottom right */}
      <div
        className="neon-orb neon-orb-5"
        style={{
          position: 'absolute',
          bottom: orb5.bottom,
          right: orb5.right,
          width: orb5.w,
          height: orb5.h,
          background: orb5.bg,
          filter: `blur(${orb5.blur})`,
        }}
      />
      
      {/* Noise texture overlay for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.02,
          background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <style jsx global>{`
        .neon-orb {
          will-change: transform, opacity;
        }
        .neon-orb-1 {
          animation: floatNeon1 4s ease-in-out infinite;
        }
        .neon-orb-2 {
          animation: floatNeon2 5s ease-in-out infinite;
        }
        .neon-orb-3 {
          animation: floatNeon3 3.5s ease-in-out infinite;
        }
        .neon-orb-4 {
          animation: floatNeon4 4.5s ease-in-out infinite;
        }
        .neon-orb-5 {
          animation: floatNeon5 5s ease-in-out infinite;
        }
        
        @keyframes floatNeon1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 1; }
          25% { transform: translate(60px, 40px) scale(1.1); opacity: 0.8; }
          50% { transform: translate(30px, -50px) scale(0.95); opacity: 1; }
          75% { transform: translate(-40px, 20px) scale(1.05); opacity: 0.9; }
        }
        @keyframes floatNeon2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 1; }
          33% { transform: translate(-50px, 30px) scale(1.08); opacity: 0.85; }
          66% { transform: translate(40px, -40px) scale(0.92); opacity: 1; }
        }
        @keyframes floatNeon3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 1; }
          50% { transform: translate(-30px, -30px) scale(1.12); opacity: 0.75; }
        }
        @keyframes floatNeon4 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 1; }
          25% { transform: translate(-50px, -20px) scale(1.05); opacity: 0.9; }
          50% { transform: translate(20px, 40px) scale(0.98); opacity: 0.8; }
          75% { transform: translate(50px, -30px) scale(1.08); opacity: 0.95; }
        }
        @keyframes floatNeon5 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 1; }
          33% { transform: translate(40px, 50px) scale(0.95); opacity: 0.85; }
          66% { transform: translate(-60px, -20px) scale(1.1); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
