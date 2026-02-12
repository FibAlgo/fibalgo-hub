'use client';

import { useState, useEffect } from 'react';
import MasaustuSignalsPage from '@/components/signals/MasaustuSignalsPage';
// import MobilSignalsPage from '@/components/signals/MobilSignalsPage'; // TODO: Mobil versiyon

export default function SignalsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hydration fix
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // TODO: Mobil için ayrı component
  // if (isMobile) {
  //   return <MobilSignalsPage />;
  // }

  return <MasaustuSignalsPage />;
}
