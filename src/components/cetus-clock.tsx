'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getCetusCycleState, syncCetusCycle } from '@/lib/cetus-cycle';
import { calculateCurrentPositions, type DiscPositions } from '@/lib/clock-math';
import { useMouseParallax } from '@/hooks/use-mouse-parallax';

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
  const animationRef = useRef<number | null>(null);
  const starburstRef = useRef<number | null>(null);
  const parallax = useMouseParallax();

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
    };

    initCycle();

    // Re-sync every 5 minutes
    const interval = setInterval(initCycle, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const minDimension = Math.min(vw, vh);
      setSize(minDimension * 0.8);
      setViewportSize({ width: vw, height: vh });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
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
      {/* Full-screen background decorations layer - furthest back */}
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

          {/* Accent dots */}
          <circle cx={bgCenter.x} cy={bgCenter.y - bgRadius * 1.4} r={3} fill={COLORS.goldPrimary} stroke="none" />
          <circle cx={bgCenter.x - bgRadius * 1.5} cy={bgCenter.y} r={3} fill={COLORS.goldPrimary} stroke="none" />
          <circle cx={bgCenter.x + bgRadius * 1.5} cy={bgCenter.y} r={3} fill={COLORS.goldPrimary} stroke="none" />
          <circle cx={bgCenter.x} cy={bgCenter.y + bgRadius * 1.3} r={3} fill={COLORS.goldPrimary} stroke="none" />

          {/* Horizontal accent lines */}
          <line x1={bgCenter.x - bgRadius * 1.2} y1={bgCenter.y} x2={bgCenter.x - bgRadius * 1.45} y2={bgCenter.y} />
          <line x1={bgCenter.x + bgRadius * 1.2} y1={bgCenter.y} x2={bgCenter.x + bgRadius * 1.45} y2={bgCenter.y} />

          {/* Top triangle marker */}
          <path d={`M ${bgCenter.x - 5} ${bgCenter.y - bgRadius * 1.35} L ${bgCenter.x} ${bgCenter.y - bgRadius * 1.4} L ${bgCenter.x + 5} ${bgCenter.y - bgRadius * 1.35} Z`} fill={COLORS.goldPrimary} stroke="none" />
        </g>

        {/* Inner contour - 4px thick line, offset inward by ~8px */}
        <g stroke={COLORS.goldPrimary} strokeWidth={4} fill="none" opacity={0.25}>
          {/* Top arch frame - inner contour (scaled 0.95 toward center) */}
          <path d={`
            M ${bgCenter.x - bgRadius * 1.045} ${bgCenter.y - bgRadius * 0.54}
            Q ${bgCenter.x - bgRadius * 0.76} ${bgCenter.y - bgRadius * 1.235}, ${bgCenter.x} ${bgCenter.y - bgRadius * 1.33}
            Q ${bgCenter.x + bgRadius * 0.76} ${bgCenter.y - bgRadius * 1.235}, ${bgCenter.x + bgRadius * 1.045} ${bgCenter.y - bgRadius * 0.54}
          `} />
          <path d={`
            M ${bgCenter.x - bgRadius * 0.855} ${bgCenter.y - bgRadius * 0.45}
            Q ${bgCenter.x - bgRadius * 0.57} ${bgCenter.y - bgRadius * 1.045}, ${bgCenter.x} ${bgCenter.y - bgRadius * 1.14}
            Q ${bgCenter.x + bgRadius * 0.57} ${bgCenter.y - bgRadius * 1.045}, ${bgCenter.x + bgRadius * 0.855} ${bgCenter.y - bgRadius * 0.45}
          `} />

          {/* Left wing bracket - inner contour */}
          <path d={`
            M ${bgCenter.x - bgRadius * 1.255} ${bgCenter.y - bgRadius * 0.27}
            L ${bgCenter.x - bgRadius * 1.43} ${bgCenter.y}
            L ${bgCenter.x - bgRadius * 1.255} ${bgCenter.y + bgRadius * 0.27}
          `} />

          {/* Right wing bracket - inner contour */}
          <path d={`
            M ${bgCenter.x + bgRadius * 1.255} ${bgCenter.y - bgRadius * 0.27}
            L ${bgCenter.x + bgRadius * 1.43} ${bgCenter.y}
            L ${bgCenter.x + bgRadius * 1.255} ${bgCenter.y + bgRadius * 0.27}
          `} />

          {/* Bottom decorative chevron - inner contour */}
          <path d={`
            M ${bgCenter.x - bgRadius * 0.76} ${bgCenter.y + bgRadius * 1.1}
            L ${bgCenter.x - bgRadius * 0.285} ${bgCenter.y + bgRadius * 1.19}
            L ${bgCenter.x} ${bgCenter.y + bgRadius * 1.235}
            L ${bgCenter.x + bgRadius * 0.285} ${bgCenter.y + bgRadius * 1.19}
            L ${bgCenter.x + bgRadius * 0.76} ${bgCenter.y + bgRadius * 1.1}
          `} />
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
          </g>
        </svg>
      </div>
    </>
  );
}
