'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

// Dynamic imports with ssr: false to prevent hydration mismatch
const AnimatedBackground = dynamic(
  () => import('@/components/layout/AnimatedBackground'),
  { ssr: false }
);

const TradingViewGate = dynamic(
  () => import('@/components/TradingViewGate'),
  { ssr: false }
);

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
        </div>
      </TradingViewGate>
      {isHomePage && <SocialProofNotification />}
    </>
  );
}
