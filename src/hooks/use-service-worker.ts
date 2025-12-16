'use client';

import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // UNREGISTER all service workers and clear caches to fix stale JS issues
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
          console.log('Service Worker unregistered');
        });
      });

      // Clear all caches
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
            console.log('Cache deleted:', name);
          });
        });
      }
    }
  }, []);
}
