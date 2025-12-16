'use client';

import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    // Service worker disabled - just clean up any existing ones
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });

      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    }
  }, []);
}
