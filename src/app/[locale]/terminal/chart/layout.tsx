'use client';

export default function ChartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          #chart-layout-wrapper {
            position: fixed !important;
            top: var(--content-top-offset, 64px) !important;
            left: 0 !important;
            right: 0 !important;
            bottom: var(--terminal-bottom-nav-height, 60px) !important;
            z-index: 40 !important;
            background: #0A0A0B !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
        }
      `}</style>
        <div id="chart-layout-wrapper" style={{ 
          width: '100%', 
          height: 'calc(100dvh - var(--content-top-offset, 64px) - var(--terminal-bottom-nav-height, 60px))' 
        }}>
        {children}
      </div>
    </>
  );
}
