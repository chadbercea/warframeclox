'use client';

import { useEffect } from 'react';

/**
 * Hook to prevent default scroll/touch behaviors on mobile
 * This prevents the mobile browser URL bar from showing/hiding
 */
export function usePreventScroll() {
  useEffect(() => {
    // Prevent ALL touchmove events on document body
    const preventTouchMove = (e: TouchEvent) => {
      // Only allow on interactive elements
      const target = e.target as HTMLElement;
      const isInteractive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[data-allow-scroll]');

      if (!isInteractive) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Prevent touchstart from initiating scroll
    const preventTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[data-allow-scroll]');

      // For non-interactive, we don't prevent default on touchstart
      // (that would break taps) but we track it
      if (!isInteractive && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Force scroll position to 0
    const resetScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
      if (document.documentElement.scrollTop !== 0) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body.scrollTop !== 0) {
        document.body.scrollTop = 0;
      }
    };

    // Add listeners with passive: false to allow preventDefault
    document.addEventListener('touchmove', preventTouchMove, { passive: false });
    document.addEventListener('touchstart', preventTouchStart, { passive: false });
    window.addEventListener('scroll', resetScroll, { passive: true });
    document.addEventListener('scroll', resetScroll, { passive: true });

    // Initial reset
    resetScroll();

    return () => {
      document.removeEventListener('touchmove', preventTouchMove);
      document.removeEventListener('touchstart', preventTouchStart);
      window.removeEventListener('scroll', resetScroll);
      document.removeEventListener('scroll', resetScroll);
    };
  }, []);
}
