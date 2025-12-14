'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

// Dynamically import the 3D component to avoid SSR issues with Three.js
const EarthGlobeInner = dynamic(
  () => {
    console.log('[EarthGlobe] Starting dynamic import of EarthGlobeInner...');
    return import('@/components/earth-globe-inner').then((mod) => {
      console.log('[EarthGlobe] Dynamic import SUCCESS');
      return mod;
    }).catch((err) => {
      console.error('[EarthGlobe] Dynamic import FAILED:', err);
      throw err;
    });
  },
  {
    ssr: false,
    loading: () => {
      console.log('[EarthGlobe] Showing loading placeholder...');
      return (
        <div
          className="fixed bottom-0 left-0 right-0 pointer-events-none"
          style={{ height: '50vh', zIndex: 0 }}
        />
      );
    },
  }
);

export function EarthGlobe() {
  useEffect(() => {
    console.log('[EarthGlobe] EarthGlobe component mounted');
  }, []);

  return <EarthGlobeInner />;
}
