'use client';

import { useEffect, useLayoutEffect } from 'react';
import { usePathname } from '@/i18n/navigation';

export default function HomeScrollToTop() {
  const pathname = usePathname();
  
  // Use useLayoutEffect to run before browser paint
  useLayoutEffect(() => {
    // Only on home page and only if there's no hash
    if (pathname === '/' && !window.location.hash) {
      // Force scroll to top IMMEDIATELY
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [pathname]);
  
  useEffect(() => {
    // Additional check after mount
    if (pathname === '/' && !window.location.hash) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [pathname]);
  
  return null;
}
