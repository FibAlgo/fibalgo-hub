'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// AnimatedBackground is purely decorative — safe to skip SSR
const AnimatedBackground = dynamic(
  () => import('@/components/layout/AnimatedBackground'),
  { ssr: false }
);

// TradingViewGate wraps children but is SSR-safe:
// when !isMounted it returns <>{children}</> so content renders on server
// We MUST keep ssr: true so children appear in the initial HTML for Google
import TradingViewGate from '@/components/TradingViewGate';

const SocialProofNotification = dynamic(
  () => import('@/components/home/SocialProofNotification'),
  { ssr: false }
);

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <>
      <AnimatedBackground />
      <TradingViewGate>
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', margin: 0, padding: 0 }}>
          {children}
          {isHomePage && <SocialProofNotification />}
        </div>
      </TradingViewGate>
    </>
  );
}
