'use client';

import dynamic from 'next/dynamic';

// Dynamically import the 3D component to avoid SSR issues with Three.js
const EarthGlobeInner = dynamic(
  () => import('@/components/earth-globe-inner'),
  {
    ssr: false,
    loading: () => (
      <div
        className="fixed bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: '50vh', zIndex: 0 }}
      />
    ),
  }
);

export function EarthGlobe() {
  return <EarthGlobeInner />;
}
