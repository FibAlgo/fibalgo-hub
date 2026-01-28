'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface SwipeNavigationOptions {
  onOpenDrawer?: () => void;
  threshold?: number; // Minimum swipe distance in pixels
  requireEdge?: boolean; // Whether swipe must start from edge (default: false)
  edgeThreshold?: number; // Distance from left edge to trigger drawer (only used if requireEdge is true)
  tabOrder?: string[]; // Order of tabs for navigation
}

export function useSwipeNavigation(options: SwipeNavigationOptions = {}) {
  const {
    onOpenDrawer,
    threshold = 50,
    requireEdge = false, // Default: swipe from anywhere
    edgeThreshold = 30,
    tabOrder = [],
  } = options;

  const pathname = usePathname();
  const router = useRouter();
  
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);
  const startedFromEdge = useRef<boolean>(false);

  const getCurrentTabIndex = useCallback(() => {
    if (tabOrder.length === 0) return -1;
    return tabOrder.findIndex(tab => {
      if (tab === '/terminal') {
        return pathname === '/terminal';
      }
      return pathname.startsWith(tab);
    });
  }, [pathname, tabOrder]);

  const handleSwipe = useCallback(() => {
    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = touchEndY.current - touchStartY.current;
    
    // Only handle horizontal swipes (deltaX > deltaY)
    if (Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }
    
    // Check if swipe is long enough
    if (Math.abs(deltaX) < threshold) {
      return;
    }
    
    if (deltaX > 0 && (!requireEdge || startedFromEdge.current)) {
      // Swiped RIGHT - open drawer (from anywhere or edge based on requireEdge)
      onOpenDrawer?.();
    } else if (tabOrder.length > 0) {
      // Page navigation only if tabOrder is provided
      const currentIndex = getCurrentTabIndex();
      
      if (deltaX > 0 && currentIndex > 0) {
        // Swiped RIGHT - previous page
        router.push(tabOrder[currentIndex - 1]);
      } else if (deltaX < 0 && currentIndex < tabOrder.length - 1 && currentIndex >= 0) {
        // Swiped LEFT - next page
        router.push(tabOrder[currentIndex + 1]);
      }
    }
  }, [threshold, getCurrentTabIndex, tabOrder, router, onOpenDrawer]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Don't interfere with scrollable elements, inputs, or bottom navigation
      const target = e.target as HTMLElement;
      if (
        target.closest('.no-swipe') || 
        target.closest('input') || 
        target.closest('textarea') ||
        target.closest('.terminal-bottom-nav') ||
        target.closest('nav') ||
        target.closest('button')
      ) {
        return;
      }
      
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      startedFromEdge.current = touchStartX.current <= edgeThreshold;
      isSwiping.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping.current) return;
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      if (!isSwiping.current) return;
      handleSwipe();
      isSwiping.current = false;
      startedFromEdge.current = false;
    };

    // Only enable on mobile
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleSwipe, edgeThreshold]);

  return {
    currentTabIndex: getCurrentTabIndex(),
    tabOrder,
  };
}
