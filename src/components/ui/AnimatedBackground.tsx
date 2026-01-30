'use client';

export default function AnimatedBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {/* Main Cyan Glow */}
      <div
        style={{
          position: 'absolute',
          top: '5%',
          left: '10%',
          width: '1000px',
          height: '1000px',
          background: 'radial-gradient(circle, rgba(0,245,255,0.25) 0%, transparent 60%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'neonFloat1 20s ease-in-out infinite',
        }}
      />
      
      {/* Main Purple Glow */}
      <div
        style={{
          position: 'absolute',
          bottom: '0%',
          right: '5%',
          width: '900px',
          height: '900px',
          background: 'radial-gradient(circle, rgba(191,0,255,0.25) 0%, transparent 60%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'neonFloat2 25s ease-in-out infinite',
        }}
      />
      
      {/* Secondary Cyan Glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(0,245,255,0.18) 0%, transparent 60%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'neonFloat2 18s ease-in-out infinite reverse',
        }}
      />
      
      {/* Secondary Purple Glow */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          right: '50%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(191,0,255,0.15) 0%, transparent 60%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          animation: 'neonFloat1 22s ease-in-out infinite reverse',
        }}
      />
    </div>
  );
}
