'use client';

interface SectionDividerProps {
  variant?: 'cyan' | 'purple' | 'gradient';
}

export default function SectionDivider({ variant = 'gradient' }: SectionDividerProps) {
  const getGradient = () => {
    switch (variant) {
      case 'cyan':
        return 'linear-gradient(90deg, transparent 0%, rgba(0,245,255,0.4) 20%, rgba(0,245,255,0.6) 50%, rgba(0,245,255,0.4) 80%, transparent 100%)';
      case 'purple':
        return 'linear-gradient(90deg, transparent 0%, rgba(191,0,255,0.4) 20%, rgba(191,0,255,0.6) 50%, rgba(191,0,255,0.4) 80%, transparent 100%)';
      default:
        return 'linear-gradient(90deg, transparent 0%, rgba(0,245,255,0.5) 25%, rgba(191,0,255,0.5) 75%, transparent 100%)';
    }
  };

  const getGlowColor = () => {
    switch (variant) {
      case 'cyan':
        return 'rgba(0,245,255,0.5)';
      case 'purple':
        return 'rgba(191,0,255,0.5)';
      default:
        return 'rgba(0,245,255,0.3)';
    }
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '1px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem 0',
    }}>
      {/* Main line */}
      <div style={{
        width: '80%',
        maxWidth: '800px',
        height: '1px',
        background: getGradient(),
        position: 'relative',
      }}>
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          inset: '-2px 0',
          background: getGradient(),
          filter: 'blur(4px)',
          opacity: 0.6,
        }} />
        
        {/* Center diamond/dot accent */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%) rotate(45deg)',
          width: '6px',
          height: '6px',
          background: variant === 'purple' ? '#BF00FF' : '#00F5FF',
          boxShadow: `0 0 10px ${getGlowColor()}, 0 0 20px ${getGlowColor()}`,
        }} />
      </div>
    </div>
  );
}
