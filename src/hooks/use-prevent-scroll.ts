'use client';

import { useEffect } from 'react';

/**
 * Hook to prevent default scroll/touch behaviors on mobile
 * This prevents the mobile browser URL bar from showing/hiding
 */
export function usePreventScroll() {
  useEffect(() => {
    // Prevent touchmove on document to stop scrolling
    const preventScroll = (e: TouchEvent) => {
      // Allow touch on interactive elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]')
      ) {
        return;
      }
      e.preventDefault();
    };

    // Prevent scroll event
    const preventScrollEvent = (e: Event) => {
      e.preventDefault();
    };

    // Add listeners with passive: false to allow preventDefault
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('scroll', preventScrollEvent, { passive: false });

    // Also prevent on window
    window.addEventListener('scroll', preventScrollEvent, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('scroll', preventScrollEvent);
      window.removeEventListener('scroll', preventScrollEvent);
    };
  }, []);
}
