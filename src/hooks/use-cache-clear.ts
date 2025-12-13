'use client';

import { useCallback, useState } from 'react';

export function useCacheClear() {
  const [isClearing, setIsClearing] = useState(false);

  const clearCache = useCallback(async () => {
    if (typeof window === 'undefined') return;

    setIsClearing(true);

    try {
      // Delete all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));

      // Unregister service worker
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));

      // Clear localStorage
      localStorage.clear();

      // Reload the page to get fresh content
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      setIsClearing(false);
    }
  }, []);

  return { clearCache, isClearing };
}
