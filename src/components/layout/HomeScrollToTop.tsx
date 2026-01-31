'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function HomeScrollToTop() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (pathname === '/') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [pathname]);
  return null;
}
