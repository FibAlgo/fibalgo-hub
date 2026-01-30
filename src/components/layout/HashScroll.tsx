'use client';

import { useEffect } from 'react';

export default function HashScroll() {
  useEffect(() => {
    const scrollToId = (id: string) => {
      if (!id) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const scrollToHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      scrollToId(hash.replace('#', ''));
    };

    const onHashChange = () => scrollToHash();
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (!href.includes('#')) return;

      const url = new URL(href, window.location.href);
      const isSamePage = url.pathname === window.location.pathname;
      if (url.hash !== '#pricing' || !isSamePage) return;

      // Hash already in URL? Force scroll on repeat clicks.
      event.preventDefault();
      window.history.replaceState(null, '', url.hash);
      scrollToId('pricing');
    };

    scrollToHash();
    const timeout = setTimeout(scrollToHash, 300);

    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('click', onClick);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('hashchange', onHashChange);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return null;
}
