'use client';

import { useState, useEffect } from 'react';

// Pre-computed star positions with twinkle animation class assignment
// Each star gets a deterministic twinkle class and animation delay
const STARS = [
  { x: 5.2, y: 12.3, size: 1.2, opacity: 0.7, twinkle: 1, delay: 0 },
  { x: 15.8, y: 8.1, size: 0.8, opacity: 0.5, twinkle: 2, delay: 1.2 },
  { x: 23.4, y: 45.2, size: 1.5, opacity: 0.8, twinkle: 3, delay: 2.5 },
  { x: 31.7, y: 22.9, size: 0.6, opacity: 0.4, twinkle: 1, delay: 0.8 },
  { x: 42.1, y: 67.3, size: 1.1, opacity: 0.6, twinkle: 2, delay: 3.1 },
  { x: 55.9, y: 15.7, size: 1.8, opacity: 0.9, twinkle: 3, delay: 1.7 },
  { x: 67.3, y: 82.4, size: 0.9, opacity: 0.5, twinkle: 1, delay: 2.9 },
  { x: 78.6, y: 33.8, size: 1.3, opacity: 0.7, twinkle: 2, delay: 0.3 },
  { x: 89.2, y: 56.1, size: 0.7, opacity: 0.4, twinkle: 3, delay: 4.2 },
  { x: 12.5, y: 78.9, size: 1.6, opacity: 0.8, twinkle: 1, delay: 1.5 },
  { x: 28.3, y: 91.2, size: 1.0, opacity: 0.6, twinkle: 2, delay: 2.1 },
  { x: 36.7, y: 5.4, size: 1.4, opacity: 0.7, twinkle: 3, delay: 0.6 },
  { x: 48.9, y: 38.6, size: 0.5, opacity: 0.3, twinkle: 1, delay: 3.8 },
  { x: 59.1, y: 71.8, size: 1.7, opacity: 0.9, twinkle: 2, delay: 1.1 },
  { x: 72.4, y: 19.3, size: 0.8, opacity: 0.5, twinkle: 3, delay: 2.7 },
  { x: 84.8, y: 44.7, size: 1.2, opacity: 0.6, twinkle: 1, delay: 0.2 },
  { x: 93.6, y: 88.5, size: 1.1, opacity: 0.7, twinkle: 2, delay: 4.5 },
  { x: 7.9, y: 52.6, size: 1.9, opacity: 0.8, twinkle: 3, delay: 1.9 },
  { x: 19.4, y: 29.1, size: 0.6, opacity: 0.4, twinkle: 1, delay: 3.3 },
  { x: 33.2, y: 63.8, size: 1.3, opacity: 0.7, twinkle: 2, delay: 0.7 },
  { x: 44.6, y: 11.5, size: 0.9, opacity: 0.5, twinkle: 3, delay: 2.4 },
  { x: 58.3, y: 84.2, size: 1.5, opacity: 0.8, twinkle: 1, delay: 1.3 },
  { x: 69.7, y: 47.9, size: 0.7, opacity: 0.4, twinkle: 2, delay: 3.6 },
  { x: 81.1, y: 72.3, size: 1.4, opacity: 0.7, twinkle: 3, delay: 0.9 },
  { x: 91.8, y: 26.8, size: 1.0, opacity: 0.6, twinkle: 1, delay: 2.2 },
  { x: 3.6, y: 95.4, size: 1.6, opacity: 0.9, twinkle: 2, delay: 4.1 },
  { x: 16.2, y: 41.7, size: 0.8, opacity: 0.5, twinkle: 3, delay: 1.6 },
  { x: 27.8, y: 18.3, size: 1.2, opacity: 0.6, twinkle: 1, delay: 3.0 },
  { x: 39.4, y: 76.9, size: 1.1, opacity: 0.7, twinkle: 2, delay: 0.4 },
  { x: 52.7, y: 3.8, size: 0.5, opacity: 0.3, twinkle: 3, delay: 2.8 },
  { x: 64.3, y: 59.4, size: 1.8, opacity: 0.8, twinkle: 1, delay: 1.0 },
  { x: 75.9, y: 87.1, size: 0.9, opacity: 0.5, twinkle: 2, delay: 3.9 },
  { x: 88.4, y: 14.6, size: 1.3, opacity: 0.7, twinkle: 3, delay: 0.1 },
  { x: 97.2, y: 68.2, size: 0.7, opacity: 0.4, twinkle: 1, delay: 2.6 },
  { x: 11.8, y: 35.5, size: 1.5, opacity: 0.8, twinkle: 2, delay: 4.4 },
  { x: 24.6, y: 81.9, size: 1.0, opacity: 0.6, twinkle: 3, delay: 1.4 },
  { x: 35.1, y: 49.3, size: 1.4, opacity: 0.7, twinkle: 1, delay: 3.2 },
  { x: 47.5, y: 23.7, size: 0.6, opacity: 0.4, twinkle: 2, delay: 0.5 },
  { x: 61.2, y: 92.6, size: 1.7, opacity: 0.9, twinkle: 3, delay: 2.3 },
  { x: 73.8, y: 7.2, size: 0.8, opacity: 0.5, twinkle: 1, delay: 3.7 },
  { x: 86.3, y: 54.8, size: 1.2, opacity: 0.6, twinkle: 2, delay: 1.8 },
  { x: 95.7, y: 31.4, size: 1.1, opacity: 0.7, twinkle: 3, delay: 4.0 },
  { x: 8.4, y: 66.9, size: 1.9, opacity: 0.8, twinkle: 1, delay: 0.0 },
  { x: 21.9, y: 2.5, size: 0.5, opacity: 0.3, twinkle: 2, delay: 2.0 },
  { x: 32.5, y: 85.7, size: 1.3, opacity: 0.7, twinkle: 3, delay: 3.4 },
  { x: 45.8, y: 42.3, size: 0.9, opacity: 0.5, twinkle: 1, delay: 1.2 },
  { x: 57.4, y: 17.8, size: 1.5, opacity: 0.8, twinkle: 2, delay: 4.3 },
  { x: 68.9, y: 73.5, size: 0.7, opacity: 0.4, twinkle: 3, delay: 0.8 },
  { x: 82.6, y: 98.1, size: 1.4, opacity: 0.7, twinkle: 1, delay: 2.5 },
  { x: 94.1, y: 51.6, size: 1.0, opacity: 0.6, twinkle: 2, delay: 3.5 },
  { x: 4.7, y: 28.2, size: 1.6, opacity: 0.9, twinkle: 3, delay: 1.1 },
  { x: 17.3, y: 74.8, size: 0.8, opacity: 0.5, twinkle: 1, delay: 4.6 },
  { x: 29.8, y: 9.4, size: 1.2, opacity: 0.6, twinkle: 2, delay: 0.3 },
  { x: 41.2, y: 58.7, size: 1.1, opacity: 0.7, twinkle: 3, delay: 2.9 },
  { x: 54.6, y: 36.1, size: 0.6, opacity: 0.4, twinkle: 1, delay: 1.7 },
  { x: 66.1, y: 89.8, size: 1.8, opacity: 0.8, twinkle: 2, delay: 3.1 },
  { x: 77.5, y: 62.4, size: 0.9, opacity: 0.5, twinkle: 3, delay: 0.6 },
  { x: 89.9, y: 21.9, size: 1.3, opacity: 0.7, twinkle: 1, delay: 2.1 },
  { x: 1.4, y: 79.5, size: 0.7, opacity: 0.4, twinkle: 2, delay: 4.2 },
  { x: 13.8, y: 46.1, size: 1.5, opacity: 0.8, twinkle: 3, delay: 1.5 },
  { x: 26.2, y: 13.7, size: 1.0, opacity: 0.6, twinkle: 1, delay: 3.8 },
  { x: 37.6, y: 69.4, size: 1.4, opacity: 0.7, twinkle: 2, delay: 0.9 },
  { x: 49.1, y: 94.9, size: 0.5, opacity: 0.3, twinkle: 3, delay: 2.7 },
  { x: 62.5, y: 25.3, size: 1.7, opacity: 0.9, twinkle: 1, delay: 1.3 },
  { x: 74.9, y: 53.8, size: 0.8, opacity: 0.5, twinkle: 2, delay: 3.6 },
  { x: 87.3, y: 82.4, size: 1.2, opacity: 0.6, twinkle: 3, delay: 0.2 },
  { x: 96.8, y: 39.9, size: 1.1, opacity: 0.7, twinkle: 1, delay: 2.4 },
  { x: 9.2, y: 6.5, size: 1.9, opacity: 0.8, twinkle: 2, delay: 4.5 },
  { x: 22.7, y: 57.2, size: 0.6, opacity: 0.4, twinkle: 3, delay: 1.9 },
  { x: 34.1, y: 32.8, size: 1.3, opacity: 0.7, twinkle: 1, delay: 3.3 },
  { x: 46.5, y: 86.5, size: 0.9, opacity: 0.5, twinkle: 2, delay: 0.7 },
  { x: 59.8, y: 48.1, size: 1.5, opacity: 0.8, twinkle: 3, delay: 2.2 },
  { x: 71.2, y: 16.7, size: 0.7, opacity: 0.4, twinkle: 1, delay: 4.1 },
  { x: 83.7, y: 65.3, size: 1.4, opacity: 0.7, twinkle: 2, delay: 1.6 },
  { x: 92.3, y: 91.8, size: 1.0, opacity: 0.6, twinkle: 3, delay: 3.0 },
  { x: 2.8, y: 43.4, size: 1.6, opacity: 0.9, twinkle: 1, delay: 0.4 },
  { x: 15.4, y: 19.9, size: 0.8, opacity: 0.5, twinkle: 2, delay: 2.8 },
  { x: 28.9, y: 71.6, size: 1.2, opacity: 0.6, twinkle: 3, delay: 1.0 },
  { x: 40.3, y: 97.2, size: 1.1, opacity: 0.7, twinkle: 1, delay: 3.9 },
  { x: 53.8, y: 29.7, size: 0.5, opacity: 0.3, twinkle: 2, delay: 0.1 },
];

export function SpaceBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render a simple black background on server and initial client render
  // This ensures consistent hydration
  if (!mounted) {
    return (
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{
          zIndex: 0,
          backgroundColor: '#000000',
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{
        zIndex: 0,
        backgroundColor: '#000000',
      }}
    >
      {/* Nebula gradients layer */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 80%, #1f1a2e 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 20%, #1a2744 0%, transparent 45%),
            radial-gradient(ellipse 50% 60% at 60% 70%, #2a1f3d 0%, transparent 40%),
            radial-gradient(ellipse 70% 50% at 30% 30%, #243554 0%, transparent 35%)
          `,
          opacity: 0.6,
        }}
      />

      {/* Secondary nebula layer - more subtle */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 40% 30% at 70% 60%, #3a2f4d 0%, transparent 50%),
            radial-gradient(ellipse 35% 45% at 25% 50%, #2d4a6e 0%, transparent 45%)
          `,
          opacity: 0.3,
        }}
      />

      {/* Star field layer with twinkling */}
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <style>
          {`
            @keyframes twinkle-1 {
              0%, 100% { opacity: var(--base-opacity); }
              50% { opacity: calc(var(--base-opacity) * 0.3); }
            }
            @keyframes twinkle-2 {
              0%, 100% { opacity: var(--base-opacity); }
              30% { opacity: calc(var(--base-opacity) * 0.4); }
              70% { opacity: var(--base-opacity); }
            }
            @keyframes twinkle-3 {
              0%, 100% { opacity: var(--base-opacity); }
              25% { opacity: calc(var(--base-opacity) * 1.15); }
              75% { opacity: calc(var(--base-opacity) * 0.5); }
            }
          `}
        </style>
        {STARS.map((star, i) => (
          <circle
            key={i}
            cx={`${star.x}%`}
            cy={`${star.y}%`}
            r={star.size}
            fill="#FFFFFF"
            style={{
              '--base-opacity': star.opacity,
              animation: `twinkle-${star.twinkle} ${star.twinkle === 1 ? 4 : star.twinkle === 2 ? 6 : 8}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </svg>

      {/* Subtle cosmic dust overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, transparent 30%, #000000 100%)
          `,
          opacity: 0.4,
        }}
      />

      {/* CSS Noise texture overlay */}
      <div className="noise-overlay" />
    </div>
  );
}
