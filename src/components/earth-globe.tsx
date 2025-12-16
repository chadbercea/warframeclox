'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Log immediately when this module loads
console.log('[EarthGlobe] Module loaded');

type LoadState = 'loading' | 'success' | 'error';

// Dynamically import the 3D component to avoid SSR issues with Three.js
const EarthGlobeInner = dynamic(
  () => {
    console.log('[EarthGlobe] Starting dynamic import...');
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
    loading: () => null, // We handle loading UI ourselves
  }
);

export function EarthGlobe() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    console.log('[EarthGlobe] Component mounted, loadState:', loadState);
  }, [loadState]);

  // Callback for inner component to report status
  const onLoadSuccess = () => {
    console.log('[EarthGlobe] Model loaded successfully');
    setLoadState('success');
  };

  const onLoadError = (error: string) => {
    console.error('[EarthGlobe] Model load error:', error);
    setLoadState('error');
    setErrorMsg(error);
  };

  const onLoadProgress = (percent: number) => {
    console.log('[EarthGlobe] Load progress:', percent + '%');
  };

  return (
    <>
      {/* Loading indicator - always rendered by wrapper, not inner component */}
      {loadState !== 'success' && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50"
          style={{ pointerEvents: 'none' }}
        >
          {loadState === 'loading' && (
            <>
              {/* Orokin spinner */}
              <div className="relative w-16 h-16">
                <div
                  className="absolute inset-0 rounded-full border-2 border-amber-500/30"
                  style={{
                    boxShadow: '0 0 10px rgba(217, 164, 65, 0.3), inset 0 0 10px rgba(217, 164, 65, 0.1)',
                  }}
                />
                <div
                  className="absolute inset-0 animate-spin"
                  style={{ animationDuration: '2s' }}
                >
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-amber-400 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)' }}
                  />
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-amber-400 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)' }}
                  />
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-4 bg-amber-400 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)' }}
                  />
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-1 w-4 bg-amber-400 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)' }}
                  />
                </div>
                <div
                  className="absolute inset-3 rounded-full border border-amber-400/50 animate-spin"
                  style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"
                    style={{ boxShadow: '0 0 12px rgba(217, 164, 65, 1)' }}
                  />
                </div>
              </div>
              <div
                className="text-amber-400/80 text-xs font-mono tracking-wider"
                style={{ textShadow: '0 0 8px rgba(217, 164, 65, 0.5)' }}
              >
                LOADING EARTH...
              </div>
            </>
          )}

          {loadState === 'error' && (
            <div className="flex flex-col items-center gap-2 p-4 bg-red-950/80 border border-red-500/50 rounded">
              <div
                className="w-12 h-12 rounded-full border-2 border-red-500 flex items-center justify-center"
                style={{ boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)' }}
              >
                <span className="text-red-500 text-2xl font-bold">!</span>
              </div>
              <div className="text-red-400 text-xs font-mono tracking-wider text-center">
                FAILED TO LOAD 3D MODEL
              </div>
              <div className="text-red-300/70 text-xs font-mono text-center max-w-48">
                {errorMsg}
              </div>
            </div>
          )}
        </div>
      )}

      {/* The actual 3D component */}
      <EarthGlobeInner
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        onLoadProgress={onLoadProgress}
      />
    </>
  );
}
