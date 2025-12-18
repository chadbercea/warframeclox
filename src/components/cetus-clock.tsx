'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getCetusCycleState, syncCetusCycle } from '@/lib/cetus-cycle';
import { calculateCurrentPositions, type DiscPositions } from '@/lib/clock-math';
import { useMouseParallax } from '@/hooks/use-mouse-parallax';
import { useSound } from '@/hooks/use-sound';
import { useToast } from '@/contexts/toast-context';
import { motion, AnimatePresence } from 'framer-motion';

// Color tokens - mapped from CSS custom properties
// See globals.css for token definitions
const COLORS = {
  goldPrimary: 'var(--color-gold-primary)',     // Circle strokes, disc fills, frame lines
  goldGlow: 'var(--color-gold-glow)',           // Disc glow, text glow, shadows
  textSecondary: 'var(--color-text-secondary)', // Cycle label (Day/Night)
};

// Font tokens
const FONTS = {
  ailerons: 'var(--font-ailerons), sans-serif',     // Clock numbers
  notoSans: 'var(--font-noto-sans), sans-serif',    // DAY/NIGHT label
  flareserif: 'var(--font-flareserif), serif',      // Plains of Eidolon title
};

// Circle radii as percentages of the container
const OUTER_RADIUS = 45; // percentage
const MIDDLE_RADIUS = 40;
const INNER_RADIUS = 35;

// Stroke widths
const OUTER_STROKE = 2;
const MIDDLE_STROKE = 1.5;
const INNER_STROKE = 1;

// Disc sizes as percentages of container
const DISC_SIZE = 2;
const INNER_DISC_SIZE = 1.2; // Smaller for seconds disc (less jarring when fast)

// Gap around disc on track circle (in degrees)
const DISC_GAP_DEGREES = 8;

// Cycle durations in minutes
const DAY_DURATION_MINUTES = 100;
const NIGHT_DURATION_MINUTES = 50;

export function CetusClock() {
  const [size, setSize] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [positions, setPositions] = useState<DiscPositions>({ outer: 0, middle: 0, inner: 0 });
  const [cycleStartTimestamp, setCycleStartTimestamp] = useState<number | null>(null);
  const [isDay, setIsDay] = useState(true);
  const [timeLeft, setTimeLeft] = useState('--:--');
  const [starburstRotation, setStarburstRotation] = useState(0);
  const [outerRingRotation, setOuterRingRotation] = useState(0);
  const animationRef = useRef<number | null>(null);
  const starburstRef = useRef<number | null>(null);
  const outerRingRef = useRef<number | null>(null);
  const prevIsDayRef = useRef<boolean | null>(null);
  const hasInitializedRef = useRef(false);
  const parallax = useMouseParallax();
  const { playSound } = useSound();
  const { showToast } = useToast();

  // Track if initial toast has been shown
  const hasShownInitialToastRef = useRef(false);

  // Sync with API and get cycle data
  useEffect(() => {
    const initCycle = async () => {
      await syncCetusCycle();
      const state = getCetusCycleState();
      setIsDay(state.isDay);

      // Calculate when current cycle started
      const cycleDuration = state.isDay ? DAY_DURATION_MINUTES : NIGHT_DURATION_MINUTES;
      const cycleDurationMs = cycleDuration * 60 * 1000;
      const elapsed = (state.percentComplete / 100) * cycleDurationMs;
      const cycleStart = Date.now() - elapsed;
      setCycleStartTimestamp(cycleStart);

      // Show initial load toast with current cycle status (only once)
      if (!hasShownInitialToastRef.current) {
        hasShownInitialToastRef.current = true;
        showToast({
          title: state.isDay ? 'Day on the Plains' : 'Night on the Plains',
          message: `${state.timeLeftFormatted} remaining until ${state.isDay ? 'nightfall' : 'dawn'}.`,
          icon: state.isDay ? 'sun' : 'moon',
          duration: 6000,
        });
      }
    };

    initCycle();

    // Re-sync every 5 minutes
    const interval = setInterval(initCycle, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [showToast]);

  // Animation loop using requestAnimationFrame
  const animate = useCallback(() => {
    if (cycleStartTimestamp === null) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const cycleDuration = isDay ? DAY_DURATION_MINUTES : NIGHT_DURATION_MINUTES;
    const newPositions = calculateCurrentPositions(cycleStartTimestamp, cycleDuration);
    setPositions(newPositions);

    // Check for cycle transition and update time display
    const state = getCetusCycleState();
    setTimeLeft(state.timeLeftFormatted);

    if (state.isDay !== isDay) {
      setIsDay(state.isDay);
      // Reset cycle start for new cycle
      const newCycleDuration = state.isDay ? DAY_DURATION_MINUTES : NIGHT_DURATION_MINUTES;
      const newCycleDurationMs = newCycleDuration * 60 * 1000;
      const elapsed = (state.percentComplete / 100) * newCycleDurationMs;
      setCycleStartTimestamp(Date.now() - elapsed);
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [cycleStartTimestamp, isDay]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Play sound and show toast when cycle transitions from day to night or night to day
  useEffect(() => {
    // Skip if not yet initialized (prevents sound/toast on initial page load)
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      prevIsDayRef.current = isDay;
      return;
    }

    // Only trigger if there was a real transition
    if (prevIsDayRef.current !== null && prevIsDayRef.current !== isDay) {
      console.log('[CetusClock] Cycle transition detected:', prevIsDayRef.current ? 'day' : 'night', '->', isDay ? 'day' : 'night');
      playSound('cycleTransition');

      // Show toast notification for cycle transition (always show, independent of browser notifications)
      showToast({
        title: isDay ? 'The Light Returns' : 'The Long Dark Begins',
        message: isDay
          ? 'Unum\'s radiance graces the Plains once more. The Eidolons retreat to slumber beneath the waters.'
          : 'The Sentient spirits rise from their ancient tombs. Tread carefully, Tenno—the night belongs to the Eidolons.',
        icon: isDay ? 'sun' : 'moon',
        duration: 10000,
      });
    }
    prevIsDayRef.current = isDay;
  }, [isDay, playSound, showToast]);

  // Slow counter-clockwise starburst rotation (120 seconds per full rotation)
  useEffect(() => {
    const rotateStarburst = () => {
      setStarburstRotation(prev => (prev - 0.05) % 360); // -0.05 degrees per frame ≈ 120s per rotation
      starburstRef.current = requestAnimationFrame(rotateStarburst);
    };
    starburstRef.current = requestAnimationFrame(rotateStarburst);
    return () => {
      if (starburstRef.current) {
        cancelAnimationFrame(starburstRef.current);
      }
    };
  }, []);

  // Very slow clockwise outer ring rotation (180 seconds per full rotation)
  useEffect(() => {
    const rotateOuterRing = () => {
      setOuterRingRotation(prev => (prev + 0.033) % 360); // +0.033 degrees per frame ≈ 180s per rotation
      outerRingRef.current = requestAnimationFrame(rotateOuterRing);
    };
    outerRingRef.current = requestAnimationFrame(rotateOuterRing);
    return () => {
      if (outerRingRef.current) {
        cancelAnimationFrame(outerRingRef.current);
      }
    };
  }, []);

  // Responsive sizing - only update on actual device orientation/size changes, not URL bar
  useEffect(() => {
    // Store initial dimensions to detect real size changes vs URL bar changes
    let lastWidth = 0;
    let lastHeight = 0;

    const updateSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Only update if width changed (orientation) or height changed significantly (>100px)
      // Small height changes are likely URL bar show/hide
      const widthChanged = Math.abs(vw - lastWidth) > 10;
      const heightChangedSignificantly = Math.abs(vh - lastHeight) > 100;

      if (widthChanged || heightChangedSignificantly || lastWidth === 0) {
        lastWidth = vw;
        lastHeight = vh;
        const minDimension = Math.min(vw, vh);
        setSize(minDimension * 0.8);
        setViewportSize({ width: vw, height: vh });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Also handle orientation change explicitly
    window.addEventListener('orientationchange', () => {
      // Force update after orientation change
      lastWidth = 0;
      lastHeight = 0;
      setTimeout(updateSize, 100);
    });

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  if (size === 0) return null;

  const center = size / 2;
  const outerR = (size * OUTER_RADIUS) / 100;
  const middleR = (size * MIDDLE_RADIUS) / 100;
  const innerR = (size * INNER_RADIUS) / 100;

  // Disc sizes
  const discR = (size * DISC_SIZE) / 100;
  const innerDiscR = (size * INNER_DISC_SIZE) / 100;

  // Calculate disc positions on their respective circle paths
  // Angle 0 is at 12 o'clock, rotating clockwise
  const angleToPosition = (degrees: number, radius: number) => {
    const radians = ((degrees - 90) * Math.PI) / 180; // -90 to start at top
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians),
    };
  };

  const outerPos = angleToPosition(positions.outer, outerR);
  const middlePos = angleToPosition(positions.middle, middleR);
  const innerPos = angleToPosition(positions.inner, innerR);

  // Helper to create arc path with gap around disc position
  const createArcWithGap = (radius: number, discAngle: number) => {
    const gapHalf = DISC_GAP_DEGREES / 2;
    const startAngle = discAngle + gapHalf;
    const endAngle = discAngle - gapHalf + 360;

    // Convert to radians (SVG uses standard math coordinates)
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const startX = center + radius * Math.cos(startRad);
    const startY = center + radius * Math.sin(startRad);
    const endX = center + radius * Math.cos(endRad);
    const endY = center + radius * Math.sin(endRad);

    // Large arc flag is 1 because we want the longer arc (360 - gap degrees)
    return `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`;
  };

  // Background decorations use viewport dimensions from state
  const bgCenter = { x: viewportSize.width / 2, y: viewportSize.height / 2 };
  const bgRadius = Math.min(viewportSize.width, viewportSize.height) * 0.35; // Base radius for decorations

  return (
    <>
      {/* Layer 4 (Part 1): Deep background layer - furthest back with glow effect */}
      {viewportSize.width > 0 && (
      <svg
        width={viewportSize.width}
        height={viewportSize.height}
        viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -1,
          transform: `perspective(1000px) translate3d(${parallax.background.translateX * 0.3}px, ${parallax.background.translateY * 0.3}px, -100px) rotateX(${parallax.background.rotateX * 0.3}deg) rotateY(${parallax.background.rotateY * 0.3}deg)`,
          transition: 'transform 0.2s ease-out',
          transformOrigin: 'center center',
        }}
      >
        {/* Deep layer glow filter */}
        <defs>
          <filter id="deepGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer ethereal ring - very far back with heavy blur */}
        <circle
          cx={bgCenter.x}
          cy={bgCenter.y}
          r={bgRadius * 2.2}
          fill="none"
          stroke={COLORS.goldPrimary}
          strokeWidth={2}
          opacity={0.08}
          filter="url(#deepGlow)"
          style={{
            transform: `rotate(${-outerRingRotation * 0.5}deg)`,
            transformOrigin: `${bgCenter.x}px ${bgCenter.y}px`,
          }}
        />

        {/* Secondary ethereal ring */}
        <circle
          cx={bgCenter.x}
          cy={bgCenter.y}
          r={bgRadius * 2.0}
          fill="none"
          stroke={COLORS.goldPrimary}
          strokeWidth={1}
          strokeDasharray={`${bgRadius * 0.2} ${bgRadius * 0.4}`}
          opacity={0.06}
          filter="url(#deepGlow)"
          style={{
            transform: `rotate(${outerRingRotation * 0.3}deg)`,
            transformOrigin: `${bgCenter.x}px ${bgCenter.y}px`,
          }}
        />

        {/* Radial gradient glow effect in center */}
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={COLORS.goldPrimary} stopOpacity="0.05" />
            <stop offset="70%" stopColor={COLORS.goldPrimary} stopOpacity="0.02" />
            <stop offset="100%" stopColor={COLORS.goldPrimary} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle
          cx={bgCenter.x}
          cy={bgCenter.y}
          r={bgRadius * 1.5}
          fill="url(#centerGlow)"
        />
      </svg>
      )}

      {/* Full-screen background decorations layer - main geometric layer */}
      {viewportSize.width > 0 && (
      <svg
        width={viewportSize.width}
        height={viewportSize.height}
        viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          transform: `perspective(1000px) translate3d(${parallax.background.translateX}px, ${parallax.background.translateY}px, ${parallax.background.translateZ}px) rotateX(${parallax.background.rotateX}deg) rotateY(${parallax.background.rotateY}deg)`,
          transition: 'transform 0.15s ease-out',
          transformOrigin: 'center center',
        }}
      >
        {/* SVG filter definitions for glow effects */}
        <defs>
          <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="subtleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Radiating starburst lines - Orokin alien aesthetic - slow counter-clockwise rotation */}
        <g
          stroke={COLORS.goldPrimary}
          strokeWidth={1}
          fill="none"
          opacity={0.15}
          style={{
            transform: `rotate(${starburstRotation}deg)`,
            transformOrigin: `${bgCenter.x}px ${bgCenter.y}px`,
          }}
        >
          {[
            // Long rays - sparse, dramatic
            { angle: 15, start: 1.6, end: 2.8 },
            { angle: 35, start: 1.5, end: 2.4 },
            { angle: 55, start: 1.7, end: 3.0 },
            { angle: 75, start: 1.55, end: 2.3 },
            { angle: 105, start: 1.6, end: 2.6 },
            { angle: 125, start: 1.5, end: 2.2 },
            { angle: 145, start: 1.65, end: 2.8 },
            { angle: 165, start: 1.55, end: 2.4 },
            { angle: 195, start: 1.6, end: 2.7 },
            { angle: 215, start: 1.5, end: 2.3 },
            { angle: 235, start: 1.7, end: 2.9 },
            { angle: 255, start: 1.55, end: 2.4 },
            { angle: 285, start: 1.6, end: 2.5 },
            { angle: 305, start: 1.5, end: 2.2 },
            { angle: 325, start: 1.65, end: 2.6 },
            { angle: 345, start: 1.55, end: 2.5 },
            // Medium rays
            { angle: 5, start: 1.5, end: 2.0 },
            { angle: 25, start: 1.6, end: 2.1 },
            { angle: 45, start: 1.55, end: 2.0 },
            { angle: 65, start: 1.5, end: 1.9 },
            { angle: 85, start: 1.6, end: 2.2 },
            { angle: 95, start: 1.5, end: 2.0 },
            { angle: 115, start: 1.55, end: 2.0 },
            { angle: 135, start: 1.6, end: 2.1 },
            { angle: 155, start: 1.5, end: 2.0 },
            { angle: 175, start: 1.55, end: 2.1 },
            { angle: 185, start: 1.5, end: 1.9 },
            { angle: 205, start: 1.6, end: 2.0 },
            { angle: 225, start: 1.55, end: 2.0 },
            { angle: 245, start: 1.5, end: 2.1 },
            { angle: 265, start: 1.6, end: 2.0 },
            { angle: 275, start: 1.5, end: 1.9 },
            { angle: 295, start: 1.55, end: 2.0 },
            { angle: 315, start: 1.6, end: 2.2 },
            { angle: 335, start: 1.5, end: 2.0 },
            { angle: 355, start: 1.55, end: 2.0 },
          ].map(({ angle, start, end }, i) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const x1 = bgCenter.x + bgRadius * start * Math.cos(rad);
            const y1 = bgCenter.y + bgRadius * start * Math.sin(rad);
            const x2 = bgCenter.x + bgRadius * end * Math.cos(rad);
            const y2 = bgCenter.y + bgRadius * end * Math.sin(rad);
            return <line key={`ray-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>

        {/* Layer 1: Outer Ring - Orokin architectural ring with slow clockwise rotation */}
        <g
          stroke={COLORS.goldPrimary}
          strokeWidth={1}
          fill="none"
          opacity={0.3}
          style={{
            transform: `rotate(${outerRingRotation}deg)`,
            transformOrigin: `${bgCenter.x}px ${bgCenter.y}px`,
          }}
        >
          {/* Main outer ring circle */}
          <circle
            cx={bgCenter.x}
            cy={bgCenter.y}
            r={bgRadius * 1.7}
            strokeDasharray={`${bgRadius * 0.3} ${bgRadius * 0.08} ${bgRadius * 0.1} ${bgRadius * 0.08}`}
          />

          {/* Secondary ring with different dash pattern */}
          <circle
            cx={bgCenter.x}
            cy={bgCenter.y}
            r={bgRadius * 1.75}
            strokeDasharray={`${bgRadius * 0.05} ${bgRadius * 0.15}`}
            opacity={0.6}
          />

          {/* Orokin notches/brackets around the ring */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const innerRadius = bgRadius * 1.65;
            const outerRadius = bgRadius * 1.8;
            const x1 = bgCenter.x + innerRadius * Math.cos(rad);
            const y1 = bgCenter.y + innerRadius * Math.sin(rad);
            const x2 = bgCenter.x + outerRadius * Math.cos(rad);
            const y2 = bgCenter.y + outerRadius * Math.sin(rad);

            // Create small bracket shapes at each position
            const perpRad = rad + Math.PI / 2;
            const bracketWidth = bgRadius * 0.03;

            return (
              <g key={`notch-${angle}`}>
                {/* Radial line */}
                <line x1={x1} y1={y1} x2={x2} y2={y2} />
                {/* Inner bracket arms */}
                <line
                  x1={x1 + bracketWidth * Math.cos(perpRad)}
                  y1={y1 + bracketWidth * Math.sin(perpRad)}
                  x2={x1}
                  y2={y1}
                />
                <line
                  x1={x1 - bracketWidth * Math.cos(perpRad)}
                  y1={y1 - bracketWidth * Math.sin(perpRad)}
                  x2={x1}
                  y2={y1}
                />
              </g>
            );
          })}

          {/* Arc segments between notches - creates Orokin architectural feel */}
          {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map((angle) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const arcRadius = bgRadius * 1.72;
            const startX = bgCenter.x + arcRadius * Math.cos(rad - 0.08);
            const startY = bgCenter.y + arcRadius * Math.sin(rad - 0.08);
            const endX = bgCenter.x + arcRadius * Math.cos(rad + 0.08);
            const endY = bgCenter.y + arcRadius * Math.sin(rad + 0.08);

            return (
              <path
                key={`arc-${angle}`}
                d={`M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`}
                strokeWidth={2}
                opacity={0.8}
              />
            );
          })}

          {/* Diamond markers at cardinal points - with glow effect */}
          {[0, 90, 180, 270].map((angle) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const markerRadius = bgRadius * 1.82;
            const cx = bgCenter.x + markerRadius * Math.cos(rad);
            const cy = bgCenter.y + markerRadius * Math.sin(rad);
            const diamondSize = 5;

            return (
              <path
                key={`diamond-${angle}`}
                d={`M ${cx} ${cy - diamondSize} l ${diamondSize} ${diamondSize} l -${diamondSize} ${diamondSize} l -${diamondSize} -${diamondSize} z`}
                fill={COLORS.goldPrimary}
                stroke="none"
                opacity={1}
                filter="url(#subtleGlow)"
              />
            );
          })}
        </g>

        {/* Warframe-style geometric frame decorations - outer thin line */}
        <g stroke={COLORS.goldPrimary} strokeWidth={1} fill="none" opacity={0.4}>
          {/* Top arch frame - outer */}
          <path d={`
            M ${bgCenter.x - bgRadius * 1.1} ${bgCenter.y - bgRadius * 0.6}
            Q ${bgCenter.x - bgRadius * 0.8} ${bgCenter.y - bgRadius * 1.3}, ${bgCenter.x} ${bgCenter.y - bgRadius * 1.4}
            Q ${bgCenter.x + bgRadius * 0.8} ${bgCenter.y - bgRadius * 1.3}, ${bgCenter.x + bgRadius * 1.1} ${bgCenter.y - bgRadius * 0.6}
          `} />
          <path d={`
            M ${bgCenter.x - bgRadius * 0.9} ${bgCenter.y - bgRadius * 0.5}
            Q ${bgCenter.x - bgRadius * 0.6} ${bgCenter.y - bgRadius * 1.1}, ${bgCenter.x} ${bgCenter.y - bgRadius * 1.2}
            Q ${bgCenter.x + bgRadius * 0.6} ${bgCenter.y - bgRadius * 1.1}, ${bgCenter.x + bgRadius * 0.9} ${bgCenter.y - bgRadius * 0.5}
          `} />

          {/* Left wing bracket - outer */}
          <path d={`
            M ${bgCenter.x - bgRadius * 1.3} ${bgCenter.y - bgRadius * 0.3}
            L ${bgCenter.x - bgRadius * 1.5} ${bgCenter.y}
            L ${bgCenter.x - bgRadius * 1.3} ${bgCenter.y + bgRadius * 0.3}
          `} />
          <line x1={bgCenter.x - bgRadius * 1.2} y1={bgCenter.y - bgRadius * 0.5} x2={bgCenter.x - bgRadius * 1.3} y2={bgCenter.y - bgRadius * 0.3} />
          <line x1={bgCenter.x - bgRadius * 1.2} y1={bgCenter.y + bgRadius * 0.5} x2={bgCenter.x - bgRadius * 1.3} y2={bgCenter.y + bgRadius * 0.3} />

          {/* Right wing bracket - outer */}
          <path d={`
            M ${bgCenter.x + bgRadius * 1.3} ${bgCenter.y - bgRadius * 0.3}
            L ${bgCenter.x + bgRadius * 1.5} ${bgCenter.y}
            L ${bgCenter.x + bgRadius * 1.3} ${bgCenter.y + bgRadius * 0.3}
          `} />
          <line x1={bgCenter.x + bgRadius * 1.2} y1={bgCenter.y - bgRadius * 0.5} x2={bgCenter.x + bgRadius * 1.3} y2={bgCenter.y - bgRadius * 0.3} />
          <line x1={bgCenter.x + bgRadius * 1.2} y1={bgCenter.y + bgRadius * 0.5} x2={bgCenter.x + bgRadius * 1.3} y2={bgCenter.y + bgRadius * 0.3} />

          {/* Bottom decorative chevron - outer */}
          <path d={`
            M ${bgCenter.x - bgRadius * 0.8} ${bgCenter.y + bgRadius * 1.15}
            L ${bgCenter.x - bgRadius * 0.3} ${bgCenter.y + bgRadius * 1.25}
            L ${bgCenter.x} ${bgCenter.y + bgRadius * 1.3}
            L ${bgCenter.x + bgRadius * 0.3} ${bgCenter.y + bgRadius * 1.25}
            L ${bgCenter.x + bgRadius * 0.8} ${bgCenter.y + bgRadius * 1.15}
          `} />

          {/* Corner radiating lines */}
          <line x1={bgCenter.x - bgRadius * 1.1} y1={bgCenter.y - bgRadius * 0.9} x2={bgCenter.x - bgRadius * 1.5} y2={bgCenter.y - bgRadius * 1.3} />
          <line x1={bgCenter.x - bgRadius * 1.0} y1={bgCenter.y - bgRadius * 1.0} x2={bgCenter.x - bgRadius * 1.3} y2={bgCenter.y - bgRadius * 1.4} />
          <line x1={bgCenter.x + bgRadius * 1.1} y1={bgCenter.y - bgRadius * 0.9} x2={bgCenter.x + bgRadius * 1.5} y2={bgCenter.y - bgRadius * 1.3} />
          <line x1={bgCenter.x + bgRadius * 1.0} y1={bgCenter.y - bgRadius * 1.0} x2={bgCenter.x + bgRadius * 1.3} y2={bgCenter.y - bgRadius * 1.4} />
          <line x1={bgCenter.x - bgRadius * 1.1} y1={bgCenter.y + bgRadius * 0.9} x2={bgCenter.x - bgRadius * 1.5} y2={bgCenter.y + bgRadius * 1.3} />
          <line x1={bgCenter.x - bgRadius * 1.0} y1={bgCenter.y + bgRadius * 1.0} x2={bgCenter.x - bgRadius * 1.3} y2={bgCenter.y + bgRadius * 1.4} />
          <line x1={bgCenter.x + bgRadius * 1.1} y1={bgCenter.y + bgRadius * 0.9} x2={bgCenter.x + bgRadius * 1.5} y2={bgCenter.y + bgRadius * 1.3} />
          <line x1={bgCenter.x + bgRadius * 1.0} y1={bgCenter.y + bgRadius * 1.0} x2={bgCenter.x + bgRadius * 1.3} y2={bgCenter.y + bgRadius * 1.4} />

          {/* Accent dots - with glow */}
          <circle cx={bgCenter.x} cy={bgCenter.y - bgRadius * 1.4} r={3} fill={COLORS.goldPrimary} stroke="none" filter="url(#subtleGlow)" />
          <circle cx={bgCenter.x - bgRadius * 1.5} cy={bgCenter.y} r={3} fill={COLORS.goldPrimary} stroke="none" filter="url(#subtleGlow)" />
          <circle cx={bgCenter.x + bgRadius * 1.5} cy={bgCenter.y} r={3} fill={COLORS.goldPrimary} stroke="none" filter="url(#subtleGlow)" />
          <circle cx={bgCenter.x} cy={bgCenter.y + bgRadius * 1.3} r={3} fill={COLORS.goldPrimary} stroke="none" filter="url(#subtleGlow)" />

          {/* Horizontal accent lines */}
          <line x1={bgCenter.x - bgRadius * 1.2} y1={bgCenter.y} x2={bgCenter.x - bgRadius * 1.45} y2={bgCenter.y} />
          <line x1={bgCenter.x + bgRadius * 1.2} y1={bgCenter.y} x2={bgCenter.x + bgRadius * 1.45} y2={bgCenter.y} />

          {/* Top triangle marker - with glow */}
          <path d={`M ${bgCenter.x - 5} ${bgCenter.y - bgRadius * 1.35} L ${bgCenter.x} ${bgCenter.y - bgRadius * 1.4} L ${bgCenter.x + 5} ${bgCenter.y - bgRadius * 1.35} Z`} fill={COLORS.goldPrimary} stroke="none" filter="url(#subtleGlow)" />
        </g>

        {/* Inner contour - 10px thick line, close to thin outer line - inverse parallax */}
        <g
          stroke={COLORS.goldPrimary}
          strokeWidth={10}
          fill="none"
          opacity={0.15}
          style={{
            transform: `translate(${-parallax.background.translateX * 1.5}px, ${-parallax.background.translateY * 1.5}px)`,
            transition: 'transform 0.2s ease-out',
          }}
        >
          {/* Top arch frame - inner contour (scaled 0.98 toward center - much closer) */}
          <path d={`
            M ${bgCenter.x - bgRadius * 1.08} ${bgCenter.y - bgRadius * 0.57}
            Q ${bgCenter.x - bgRadius * 0.78} ${bgCenter.y - bgRadius * 1.27}, ${bgCenter.x} ${bgCenter.y - bgRadius * 1.37}
            Q ${bgCenter.x + bgRadius * 0.78} ${bgCenter.y - bgRadius * 1.27}, ${bgCenter.x + bgRadius * 1.08} ${bgCenter.y - bgRadius * 0.57}
          `} />
          <path d={`
            M ${bgCenter.x - bgRadius * 0.88} ${bgCenter.y - bgRadius * 0.48}
            Q ${bgCenter.x - bgRadius * 0.59} ${bgCenter.y - bgRadius * 1.08}, ${bgCenter.x} ${bgCenter.y - bgRadius * 1.18}
            Q ${bgCenter.x + bgRadius * 0.59} ${bgCenter.y - bgRadius * 1.08}, ${bgCenter.x + bgRadius * 0.88} ${bgCenter.y - bgRadius * 0.48}
          `} />

          {/* Left wing bracket - inner contour */}
          <path d={`
            M ${bgCenter.x - bgRadius * 1.28} ${bgCenter.y - bgRadius * 0.29}
            L ${bgCenter.x - bgRadius * 1.48} ${bgCenter.y}
            L ${bgCenter.x - bgRadius * 1.28} ${bgCenter.y + bgRadius * 0.29}
          `} />

          {/* Right wing bracket - inner contour */}
          <path d={`
            M ${bgCenter.x + bgRadius * 1.28} ${bgCenter.y - bgRadius * 0.29}
            L ${bgCenter.x + bgRadius * 1.48} ${bgCenter.y}
            L ${bgCenter.x + bgRadius * 1.28} ${bgCenter.y + bgRadius * 0.29}
          `} />

          {/* Bottom decorative chevron - inner contour */}
          <path d={`
            M ${bgCenter.x - bgRadius * 0.78} ${bgCenter.y + bgRadius * 1.13}
            L ${bgCenter.x - bgRadius * 0.29} ${bgCenter.y + bgRadius * 1.23}
            L ${bgCenter.x} ${bgCenter.y + bgRadius * 1.28}
            L ${bgCenter.x + bgRadius * 0.29} ${bgCenter.y + bgRadius * 1.23}
            L ${bgCenter.x + bgRadius * 0.78} ${bgCenter.y + bgRadius * 1.13}
          `} />
        </g>

        {/* Layer 2: Corner Accents - Art Deco meets sci-fi brackets in viewport corners */}
        <g stroke={COLORS.goldPrimary} fill="none" opacity={1}>
          {/* Top-left corner accent */}
          <g>
            {/* Main bracket structure - thick */}
            <path
              d={`
                M ${viewportSize.width * 0.02} ${viewportSize.height * 0.15}
                L ${viewportSize.width * 0.02} ${viewportSize.height * 0.05}
                L ${viewportSize.width * 0.05} ${viewportSize.height * 0.02}
                L ${viewportSize.width * 0.15} ${viewportSize.height * 0.02}
              `}
              strokeWidth={4}
            />
            {/* Inner parallel line - thin, closer to thick line */}
            <path
              d={`
                M ${viewportSize.width * 0.028} ${viewportSize.height * 0.14}
                L ${viewportSize.width * 0.028} ${viewportSize.height * 0.055}
                L ${viewportSize.width * 0.055} ${viewportSize.height * 0.028}
                L ${viewportSize.width * 0.14} ${viewportSize.height * 0.028}
              `}
              strokeWidth={1}
              opacity={0.8}
            />
            {/* Diagonal accent line pointing toward center */}
            <line
              x1={viewportSize.width * 0.06}
              y1={viewportSize.height * 0.06}
              x2={viewportSize.width * 0.12}
              y2={viewportSize.height * 0.12}
              strokeWidth={1}
              opacity={0.6}
            />
            {/* Small accent dots */}
            <circle cx={viewportSize.width * 0.02} cy={viewportSize.height * 0.05} r={3} fill={COLORS.goldPrimary} stroke="none" opacity={1} />
            <circle cx={viewportSize.width * 0.05} cy={viewportSize.height * 0.02} r={3} fill={COLORS.goldPrimary} stroke="none" opacity={1} />
          </g>

          {/* Top-right corner accent (mirrored) */}
          <g>
            <path
              d={`
                M ${viewportSize.width * 0.98} ${viewportSize.height * 0.15}
                L ${viewportSize.width * 0.98} ${viewportSize.height * 0.05}
                L ${viewportSize.width * 0.95} ${viewportSize.height * 0.02}
                L ${viewportSize.width * 0.85} ${viewportSize.height * 0.02}
              `}
              strokeWidth={4}
            />
            <path
              d={`
                M ${viewportSize.width * 0.972} ${viewportSize.height * 0.14}
                L ${viewportSize.width * 0.972} ${viewportSize.height * 0.055}
                L ${viewportSize.width * 0.945} ${viewportSize.height * 0.028}
                L ${viewportSize.width * 0.86} ${viewportSize.height * 0.028}
              `}
              strokeWidth={1}
              opacity={0.8}
            />
            <line
              x1={viewportSize.width * 0.94}
              y1={viewportSize.height * 0.06}
              x2={viewportSize.width * 0.88}
              y2={viewportSize.height * 0.12}
              strokeWidth={1}
              opacity={0.6}
            />
            <circle cx={viewportSize.width * 0.98} cy={viewportSize.height * 0.05} r={3} fill={COLORS.goldPrimary} stroke="none" opacity={1} />
            <circle cx={viewportSize.width * 0.95} cy={viewportSize.height * 0.02} r={3} fill={COLORS.goldPrimary} stroke="none" opacity={1} />
          </g>

          {/* Bottom-left corner accent */}
          <g>
            <path
              d={`
                M ${viewportSize.width * 0.02} ${viewportSize.height * 0.85}
                L ${viewportSize.width * 0.02} ${viewportSize.height * 0.95}
                L ${viewportSize.width * 0.05} ${viewportSize.height * 0.98}
                L ${viewportSize.width * 0.15} ${viewportSize.height * 0.98}
              `}
              strokeWidth={4}
            />
            <path
              d={`
                M ${viewportSize.width * 0.028} ${viewportSize.height * 0.86}
                L ${viewportSize.width * 0.028} ${viewportSize.height * 0.945}
                L ${viewportSize.width * 0.055} ${viewportSize.height * 0.972}
                L ${viewportSize.width * 0.14} ${viewportSize.height * 0.972}
              `}
              strokeWidth={1}
              opacity={0.8}
            />
            <line
              x1={viewportSize.width * 0.06}
              y1={viewportSize.height * 0.94}
              x2={viewportSize.width * 0.12}
              y2={viewportSize.height * 0.88}
              strokeWidth={1}
              opacity={0.6}
            />
            <circle cx={viewportSize.width * 0.02} cy={viewportSize.height * 0.95} r={3} fill={COLORS.goldPrimary} stroke="none" opacity={1} />
            <circle cx={viewportSize.width * 0.05} cy={viewportSize.height * 0.98} r={3} fill={COLORS.goldPrimary} stroke="none" opacity={1} />
          </g>

          {/* Bottom-right corner accent (mirrored) */}
          <g>
            <path
              d={`
                M ${viewportSize.width * 0.98} ${viewportSize.height * 0.85}
                L ${viewportSize.width * 0.98} ${viewportSize.height * 0.95}
                L ${viewportSize.width * 0.95} ${viewportSize.height * 0.98}
                L ${viewportSize.width * 0.85} ${viewportSize.height * 0.98}
              `}
              strokeWidth={4}
            />
            <path
              d={`
                M ${viewportSize.width * 0.972} ${viewportSize.height * 0.86}
                L ${viewportSize.width * 0.972} ${viewportSize.height * 0.945}
                L ${viewportSize.width * 0.945} ${viewportSize.height * 0.972}
                L ${viewportSize.width * 0.86} ${viewportSize.height * 0.972}
              `}
              strokeWidth={1}
              opacity={0.8}
            />
            <line
              x1={viewportSize.width * 0.94}
              y1={viewportSize.height * 0.94}
              x2={viewportSize.width * 0.88}
              y2={viewportSize.height * 0.88}
              strokeWidth={1}
              opacity={0.6}
            />
            <circle cx={viewportSize.width * 0.98} cy={viewportSize.height * 0.95} r={3} fill={COLORS.goldPrimary} stroke="none" opacity={1} />
            <circle cx={viewportSize.width * 0.95} cy={viewportSize.height * 0.98} r={3} fill={COLORS.goldPrimary} stroke="none" opacity={1} />
          </g>
        </g>

        {/* Layer 3: Orokin Glyphs - Abstract Tenno-inspired symbols scattered around frame */}
        <g stroke={COLORS.goldPrimary} fill="none" opacity={0.225}>
          {/* Glyph definitions - abstract geometric symbols inspired by Warframe aesthetics */}
          {/* Glyph 1: Top-left area - Diamond with internal cross */}
          <g transform={`translate(${bgCenter.x - bgRadius * 1.4}, ${bgCenter.y - bgRadius * 0.8}) rotate(-15)`}>
            <path d="M 0 -12 L 12 0 L 0 12 L -12 0 Z" strokeWidth={1.5} />
            <line x1="0" y1="-6" x2="0" y2="6" strokeWidth={1} />
            <line x1="-6" y1="0" x2="6" y2="0" strokeWidth={1} />
          </g>

          {/* Glyph 2: Top-right area - Triangle with dot */}
          <g transform={`translate(${bgCenter.x + bgRadius * 1.35}, ${bgCenter.y - bgRadius * 0.9}) rotate(20)`}>
            <path d="M 0 -10 L 10 8 L -10 8 Z" strokeWidth={1.5} />
            <circle cx="0" cy="2" r="2" fill={COLORS.goldPrimary} stroke="none" />
          </g>

          {/* Glyph 3: Left side - Concentric arcs (Void portal style) */}
          <g transform={`translate(${bgCenter.x - bgRadius * 1.6}, ${bgCenter.y + bgRadius * 0.3}) rotate(-5)`}>
            <path d="M -8 0 A 8 8 0 0 1 8 0" strokeWidth={1} />
            <path d="M -12 0 A 12 12 0 0 1 12 0" strokeWidth={1} opacity={0.7} />
            <circle cx="0" cy="0" r="2" fill={COLORS.goldPrimary} stroke="none" />
          </g>

          {/* Glyph 4: Right side - Hexagonal shape */}
          <g transform={`translate(${bgCenter.x + bgRadius * 1.55}, ${bgCenter.y + bgRadius * 0.2}) rotate(10)`}>
            <path d="M 0 -10 L 9 -5 L 9 5 L 0 10 L -9 5 L -9 -5 Z" strokeWidth={1.5} />
            <path d="M 0 -5 L 4.5 -2.5 L 4.5 2.5 L 0 5 L -4.5 2.5 L -4.5 -2.5 Z" strokeWidth={1} opacity={0.6} />
          </g>

          {/* Glyph 5: Bottom-left - Crescent with star point */}
          <g transform={`translate(${bgCenter.x - bgRadius * 1.2}, ${bgCenter.y + bgRadius * 1.0}) rotate(25)`}>
            <path d="M -8 -6 A 10 10 0 0 0 -8 6" strokeWidth={1.5} />
            <path d="M -4 0 L 8 0 M 4 -4 L 4 4" strokeWidth={1} />
          </g>

          {/* Glyph 6: Bottom-right - Eye symbol (Tenno vision) */}
          <g transform={`translate(${bgCenter.x + bgRadius * 1.25}, ${bgCenter.y + bgRadius * 0.95}) rotate(-20)`}>
            <ellipse cx="0" cy="0" rx="12" ry="6" strokeWidth={1.5} />
            <circle cx="0" cy="0" r="3" fill={COLORS.goldPrimary} stroke="none" />
            <line x1="-15" y1="0" x2="-12" y2="0" strokeWidth={1} />
            <line x1="12" y1="0" x2="15" y2="0" strokeWidth={1} />
          </g>

          {/* Glyph 7: Top area - Arrow/chevron pointing down */}
          <g transform={`translate(${bgCenter.x + bgRadius * 0.5}, ${bgCenter.y - bgRadius * 1.5}) rotate(5)`}>
            <path d="M -8 -4 L 0 6 L 8 -4" strokeWidth={1.5} fill="none" />
            <path d="M -5 -6 L 0 0 L 5 -6" strokeWidth={1} opacity={0.6} />
          </g>

          {/* Glyph 8: Left-top area - Spiral fragment */}
          <g transform={`translate(${bgCenter.x - bgRadius * 0.6}, ${bgCenter.y - bgRadius * 1.45}) rotate(-10)`}>
            <path d="M 0 0 Q 6 -3 8 -8 Q 10 -14 4 -16" strokeWidth={1.5} fill="none" />
            <circle cx="0" cy="0" r="2" fill={COLORS.goldPrimary} stroke="none" />
          </g>

          {/* Glyph 9: Bottom center-left - Cross with angled ends */}
          <g transform={`translate(${bgCenter.x - bgRadius * 0.4}, ${bgCenter.y + bgRadius * 1.35}) rotate(0)`}>
            <line x1="0" y1="-10" x2="0" y2="10" strokeWidth={1.5} />
            <line x1="-10" y1="0" x2="10" y2="0" strokeWidth={1.5} />
            <line x1="-3" y1="-10" x2="3" y2="-10" strokeWidth={1} />
            <line x1="-3" y1="10" x2="3" y2="10" strokeWidth={1} />
          </g>

          {/* Glyph 10: Bottom center-right - Interlocked triangles */}
          <g transform={`translate(${bgCenter.x + bgRadius * 0.45}, ${bgCenter.y + bgRadius * 1.4}) rotate(15)`}>
            <path d="M 0 -8 L 7 4 L -7 4 Z" strokeWidth={1.5} />
            <path d="M 0 8 L -7 -4 L 7 -4 Z" strokeWidth={1} opacity={0.5} />
          </g>

          {/* Additional smaller glyphs for organic scatter effect */}
          {/* Small dot clusters */}
          <g opacity={0.4}>
            <circle cx={bgCenter.x - bgRadius * 1.5} cy={bgCenter.y - bgRadius * 0.4} r={2} fill={COLORS.goldPrimary} stroke="none" />
            <circle cx={bgCenter.x - bgRadius * 1.48} cy={bgCenter.y - bgRadius * 0.35} r={1.5} fill={COLORS.goldPrimary} stroke="none" />
            <circle cx={bgCenter.x - bgRadius * 1.52} cy={bgCenter.y - bgRadius * 0.32} r={1} fill={COLORS.goldPrimary} stroke="none" />

            <circle cx={bgCenter.x + bgRadius * 1.45} cy={bgCenter.y - bgRadius * 0.5} r={2} fill={COLORS.goldPrimary} stroke="none" />
            <circle cx={bgCenter.x + bgRadius * 1.42} cy={bgCenter.y - bgRadius * 0.55} r={1.5} fill={COLORS.goldPrimary} stroke="none" />

            <circle cx={bgCenter.x - bgRadius * 0.9} cy={bgCenter.y + bgRadius * 1.25} r={2} fill={COLORS.goldPrimary} stroke="none" />
            <circle cx={bgCenter.x + bgRadius * 0.85} cy={bgCenter.y + bgRadius * 1.3} r={1.5} fill={COLORS.goldPrimary} stroke="none" />
          </g>
        </g>
      </svg>
      )}

      {/* Clock container - 3D scene with layered parallax */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: size,
          height: size,
          zIndex: 1,
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Circles layer - middle depth */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
          style={{
            transform: `translate3d(${parallax.circles.translateX}px, ${parallax.circles.translateY}px, ${parallax.circles.translateZ}px) rotateX(${parallax.circles.rotateX}deg) rotateY(${parallax.circles.rotateY}deg)`,
            transition: 'transform 0.15s ease-out',
            transformOrigin: 'center center',
          }}
        >
          {/* Outer track - arc with gap around disc */}
          <path
            d={createArcWithGap(outerR, positions.outer)}
            fill="none"
            stroke={COLORS.goldPrimary}
            strokeWidth={OUTER_STROKE}
          />
          {/* Middle track - arc with gap around disc */}
          <path
            d={createArcWithGap(middleR, positions.middle)}
            fill="none"
            stroke={COLORS.goldPrimary}
            strokeWidth={MIDDLE_STROKE}
          />
          {/* Inner track - arc with gap around disc (softer to match disc) */}
          <path
            d={createArcWithGap(innerR, positions.inner)}
            fill="none"
            stroke={COLORS.goldPrimary}
            strokeWidth={INNER_STROKE}
            opacity={0.2}
            filter="url(#innerDiscGlow)"
          />

          {/* Outer disc - fill: --color-gold-primary */}
          <circle
            cx={outerPos.x}
            cy={outerPos.y}
            r={discR}
            fill={COLORS.goldPrimary}
          />

          {/* Middle disc - fill: --color-gold-primary */}
          <circle
            cx={middlePos.x}
            cy={middlePos.y}
            r={discR}
            fill={COLORS.goldPrimary}
          />

          {/* Inner disc (seconds) - smaller, softer, with glow */}
          <defs>
            <filter id="innerDiscGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={innerPos.x}
            cy={innerPos.y}
            r={innerDiscR}
            fill={COLORS.goldPrimary}
            opacity={0.2}
            filter="url(#innerDiscGlow)"
          />
        </svg>

        {/* Text layer - front, closest to viewer */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
          style={{
            transform: `translate3d(${parallax.text.translateX}px, ${parallax.text.translateY}px, ${parallax.text.translateZ}px) rotateX(${parallax.text.rotateX}deg) rotateY(${parallax.text.rotateY}deg)`,
            transition: 'transform 0.15s ease-out',
            transformOrigin: 'center center',
          }}
        >
          {/* Plains of Eidolon title - Flareserif font */}
          <text
            x={center}
            y={center - size * 0.09}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={COLORS.goldPrimary}
            fontSize={size * 0.032}
            fontFamily={FONTS.flareserif}
            fontWeight={700}
            letterSpacing="0.12em"
          >
            PLAINS OF EIDOLON
          </text>

          {/* Time countdown - Ailerons font */}
          <text
            x={center}
            y={center + size * 0.02}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={COLORS.goldPrimary}
            fontSize={size * 0.14}
            fontFamily={FONTS.ailerons}
            fontWeight={400}
            letterSpacing="0.15em"
          >
            {timeLeft}
          </text>

          {/* Day/Night indicator with Orokin lines */}
          <g>
            {/* Left decorative line */}
            <line
              x1={center - size * 0.18}
              y1={center + size * 0.11}
              x2={center - size * 0.06}
              y2={center + size * 0.11}
              stroke={COLORS.goldPrimary}
              strokeWidth={1}
              opacity={0.6}
            />
            {/* Left diamond accent */}
            <path
              d={`M ${center - size * 0.19} ${center + size * 0.11} l -3 -3 l -3 3 l 3 3 z`}
              fill={COLORS.goldPrimary}
              opacity={0.6}
            />

            {/* Day/Night label - Noto Sans font */}
            <text
              x={center}
              y={center + size * 0.115}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={COLORS.textSecondary}
              fontSize={size * 0.028}
              fontFamily={FONTS.notoSans}
              fontWeight={700}
              letterSpacing="0.2em"
            >
              {isDay ? 'DAY' : 'NIGHT'}
            </text>

            {/* Right decorative line */}
            <line
              x1={center + size * 0.06}
              y1={center + size * 0.11}
              x2={center + size * 0.18}
              y2={center + size * 0.11}
              stroke={COLORS.goldPrimary}
              strokeWidth={1}
              opacity={0.6}
            />
            {/* Right diamond accent */}
            <path
              d={`M ${center + size * 0.19} ${center + size * 0.11} l 3 -3 l 3 3 l -3 3 z`}
              fill={COLORS.goldPrimary}
              opacity={0.6}
            />

            {/* Orokin Day/Night Icon - 40x40 centered below label */}
            {(() => {
              const iconSize = 40;
              const iconX = center - iconSize / 2;
              const iconY = center + size * 0.145;

              // Ray animation variants with staggered timing
              const rayVariants = {
                initial: { scale: 0, opacity: 0 },
                animate: (i: number) => ({
                  scale: 1,
                  opacity: 1,
                  transition: {
                    delay: i * 0.04,
                    duration: 0.25,
                    ease: 'easeOut' as const,
                  },
                }),
                exit: (i: number) => ({
                  scale: 0,
                  opacity: 0,
                  transition: {
                    delay: (7 - i) * 0.03,
                    duration: 0.2,
                    ease: 'easeIn' as const,
                  },
                }),
              };

              // Sun center variants
              const sunCenterVariants = {
                initial: { scale: 0.5, opacity: 0 },
                animate: {
                  scale: 1,
                  opacity: 1,
                  transition: { duration: 0.3, ease: 'easeOut' as const },
                },
                exit: {
                  scale: 0.8,
                  opacity: 0,
                  transition: { duration: 0.25, ease: 'easeIn' as const },
                },
              };

              // Moon variants
              const moonVariants = {
                initial: { scale: 0.6, opacity: 0, rotate: -30 },
                animate: {
                  scale: 1,
                  opacity: 1,
                  rotate: 0,
                  transition: { duration: 0.4, ease: 'easeOut' as const, delay: 0.1 },
                },
                exit: {
                  scale: 0.6,
                  opacity: 0,
                  rotate: 30,
                  transition: { duration: 0.3, ease: 'easeIn' as const },
                },
              };

              // Ray line data for staggered animation
              const rays = [
                { x1: 32, y1: 8, x2: 32, y2: 16 },
                { x1: 32, y1: 48, x2: 32, y2: 56 },
                { x1: 8, y1: 32, x2: 16, y2: 32 },
                { x1: 48, y1: 32, x2: 56, y2: 32 },
                { x1: 14.5, y1: 14.5, x2: 20.2, y2: 20.2 },
                { x1: 43.8, y1: 43.8, x2: 49.5, y2: 49.5 },
                { x1: 14.5, y1: 49.5, x2: 20.2, y2: 43.8 },
                { x1: 43.8, y1: 20.2, x2: 49.5, y2: 14.5 },
              ];

              return (
                <svg
                  x={iconX}
                  y={iconY}
                  width={iconSize}
                  height={iconSize}
                  viewBox="0 0 64 64"
                  overflow="visible"
                >
                  <AnimatePresence mode="wait">
                    {isDay ? (
                      /* Sun icon - circle with rays */
                      <motion.g
                        key="sun"
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        {/* Sun center */}
                        <motion.circle
                          cx="32"
                          cy="32"
                          r="10"
                          fill={COLORS.goldPrimary}
                          variants={sunCenterVariants}
                        />
                        {/* Sun rays - staggered animation */}
                        <g stroke={COLORS.goldPrimary} strokeWidth="2.5" strokeLinecap="round">
                          {rays.map((ray, i) => (
                            <motion.line
                              key={i}
                              x1={ray.x1}
                              y1={ray.y1}
                              x2={ray.x2}
                              y2={ray.y2}
                              variants={rayVariants}
                              custom={i}
                              style={{ originX: '32px', originY: '32px' }}
                            />
                          ))}
                        </g>
                      </motion.g>
                    ) : (
                      /* Crescent moon icon */
                      <motion.path
                        key="moon"
                        d="M 38 16 
                           C 28 16, 20 24, 20 32 
                           C 20 40, 28 48, 38 48 
                           C 32 44, 28 38, 28 32 
                           C 28 26, 32 20, 38 16 Z"
                        fill={COLORS.goldPrimary}
                        variants={moonVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        style={{ originX: '32px', originY: '32px' }}
                      />
                    )}
                  </AnimatePresence>
                </svg>
              );
            })()}
          </g>
        </svg>
      </div>
    </>
  );
}
