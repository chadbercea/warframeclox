'use client';

import { usePreventScroll } from '@/hooks/use-prevent-scroll';

/**
 * Client component that prevents scroll on mobile
 * Renders nothing, just applies the scroll prevention effect
 */
export function ScrollLock() {
  usePreventScroll();
  return null;
}
