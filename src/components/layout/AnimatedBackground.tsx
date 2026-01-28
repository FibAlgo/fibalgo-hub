'use client';

export default function AnimatedBackground() {
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
          top: '-20%',
          left: '-10%',
          width: '70%',
          height: '70%',
          background: 'radial-gradient(ellipse at center, rgba(0,245,255,0.15) 0%, rgba(0,245,255,0.05) 35%, transparent 65%)',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Main purple glow - top right */}
      <div
        className="neon-orb neon-orb-2"
        style={{
          position: 'absolute',
          top: '-15%',
          right: '-15%',
          width: '65%',
          height: '65%',
          background: 'radial-gradient(ellipse at center, rgba(191,0,255,0.12) 0%, rgba(191,0,255,0.04) 35%, transparent 65%)',
          filter: 'blur(80px)',
        }}
      />
      
      {/* Center blue accent */}
      <div
        className="neon-orb neon-orb-3"
        style={{
          position: 'absolute',
          top: '25%',
          left: '35%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(ellipse at center, rgba(0,168,255,0.1) 0%, rgba(0,168,255,0.03) 35%, transparent 65%)',
          filter: 'blur(100px)',
        }}
      />
      
      {/* Bottom purple gradient */}
      <div
        className="neon-orb neon-orb-4"
        style={{
          position: 'absolute',
          bottom: '-20%',
          left: '15%',
          width: '70%',
          height: '60%',
          background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.1) 0%, rgba(168,85,247,0.03) 35%, transparent 65%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Extra cyan accent - bottom right */}
      <div
        className="neon-orb neon-orb-5"
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '5%',
          width: '45%',
          height: '45%',
          background: 'radial-gradient(ellipse at center, rgba(0,245,255,0.08) 0%, rgba(0,245,255,0.02) 35%, transparent 65%)',
          filter: 'blur(80px)',
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
          animation: floatNeon1 20s ease-in-out infinite;
        }
        .neon-orb-2 {
          animation: floatNeon2 25s ease-in-out infinite;
        }
        .neon-orb-3 {
          animation: floatNeon3 18s ease-in-out infinite;
        }
        .neon-orb-4 {
          animation: floatNeon4 22s ease-in-out infinite;
        }
        .neon-orb-5 {
          animation: floatNeon5 24s ease-in-out infinite;
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
