'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMouseParallax } from '@/hooks/use-mouse-parallax';
import { useSound, SoundName } from '@/hooks/use-sound';
import Link from 'next/link';

// Color tokens - mapped from CSS custom properties
const COLORS = {
  goldPrimary: 'var(--color-gold-primary)',
  goldHover: 'var(--color-gold-hover)',
  goldGlow: 'var(--color-gold-glow)',
  backgroundBase: 'var(--color-background-base)',
  spaceBlack: 'var(--color-space-black)',
  nebulaBlue1: 'var(--color-nebula-blue-1)',
  nebulaBlue2: 'var(--color-nebula-blue-2)',
  nebulaBlue3: 'var(--color-nebula-blue-3)',
  nebulaPurple1: 'var(--color-nebula-purple-1)',
  nebulaPurple2: 'var(--color-nebula-purple-2)',
  nebulaPurple3: 'var(--color-nebula-purple-3)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
};

// Font tokens
const FONTS = {
  ailerons: 'var(--font-ailerons), sans-serif',
  notoSans: 'var(--font-noto-sans), sans-serif',
  flareserif: 'var(--font-flareserif), serif',
  geistSans: 'var(--font-geist-sans), sans-serif',
  geistMono: 'var(--font-geist-mono), monospace',
};

// Section wrapper component
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2
        className="text-2xl mb-6 pb-3 border-b"
        style={{
          fontFamily: FONTS.flareserif,
          color: COLORS.goldPrimary,
          borderColor: 'rgba(201, 169, 97, 0.3)',
          letterSpacing: '0.1em',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

// Specimen card wrapper
function Specimen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div
        className="text-xs uppercase tracking-widest mb-2 opacity-60"
        style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}
      >
        {label}
      </div>
      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: 'rgba(10, 10, 12, 0.6)',
          border: '1px solid rgba(201, 169, 97, 0.2)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Color swatch component
function ColorSwatch({ name, value, hex }: { name: string; value: string; hex: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div
        className="w-12 h-12 rounded-lg border"
        style={{
          backgroundColor: value,
          borderColor: 'rgba(201, 169, 97, 0.3)',
          boxShadow: `0 0 12px ${value}`,
        }}
      />
      <div className="flex flex-col">
        <span
          className="text-sm font-medium"
          style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}
        >
          {name}
        </span>
        <span
          className="text-xs opacity-60"
          style={{ fontFamily: FONTS.geistMono, color: COLORS.goldPrimary }}
        >
          {hex}
        </span>
      </div>
    </div>
  );
}

// Interactive toggle switch specimen
function ToggleSpecimen() {
  const [enabled, setEnabled] = useState(false);

  return (
    <button
      onClick={() => setEnabled(!enabled)}
      className="flex items-center gap-3"
    >
      <div
        className="w-9 h-5 rounded-full relative transition-colors duration-200"
        style={{
          backgroundColor: enabled ? COLORS.goldPrimary : 'rgba(201, 169, 97, 0.2)',
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
          style={{
            backgroundColor: enabled ? '#0a0a0c' : COLORS.goldPrimary,
            transform: enabled ? 'translateX(18px)' : 'translateX(2px)',
          }}
        />
      </div>
      <span
        className="text-sm"
        style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}
      >
        {enabled ? 'Enabled' : 'Disabled'}
      </span>
    </button>
  );
}

// Animated sun/moon icon
function DayNightIcon({ isDay }: { isDay: boolean }) {
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

  const sunCenterVariants = {
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' as const } },
    exit: { scale: 0.8, opacity: 0, transition: { duration: 0.25, ease: 'easeIn' as const } },
  };

  const moonVariants = {
    initial: { scale: 0.6, opacity: 0, rotate: -30 },
    animate: { scale: 1, opacity: 1, rotate: 0, transition: { duration: 0.4, ease: 'easeOut' as const, delay: 0.1 } },
    exit: { scale: 0.6, opacity: 0, rotate: 30, transition: { duration: 0.3, ease: 'easeIn' as const } },
  };

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
    <svg width={64} height={64} viewBox="0 0 64 64" overflow="visible">
      <AnimatePresence mode="wait">
        {isDay ? (
          <motion.g key="sun" initial="initial" animate="animate" exit="exit">
            <motion.circle cx="32" cy="32" r="10" fill={COLORS.goldPrimary} variants={sunCenterVariants} />
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
          <motion.path
            key="moon"
            d="M 38 16 C 28 16, 20 24, 20 32 C 20 40, 28 48, 38 48 C 32 44, 28 38, 28 32 C 28 26, 32 20, 38 16 Z"
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
}

// Parallax demo box
function ParallaxDemo() {
  const parallax = useMouseParallax();

  return (
    <div
      className="relative h-48 rounded-lg overflow-hidden"
      style={{
        perspective: '1000px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Background layer */}
      <div
        className="absolute inset-4 rounded flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(201, 169, 97, 0.1)',
          border: '1px solid rgba(201, 169, 97, 0.2)',
          transform: `translate3d(${parallax.background.translateX}px, ${parallax.background.translateY}px, ${parallax.background.translateZ}px) rotateX(${parallax.background.rotateX}deg) rotateY(${parallax.background.rotateY}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        <span className="text-xs opacity-40" style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}>
          BACKGROUND LAYER
        </span>
      </div>

      {/* Middle layer */}
      <div
        className="absolute inset-8 rounded flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(201, 169, 97, 0.15)',
          border: '1px solid rgba(201, 169, 97, 0.3)',
          transform: `translate3d(${parallax.circles.translateX}px, ${parallax.circles.translateY}px, ${parallax.circles.translateZ}px) rotateX(${parallax.circles.rotateX}deg) rotateY(${parallax.circles.rotateY}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        <span className="text-xs opacity-60" style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}>
          MIDDLE LAYER
        </span>
      </div>

      {/* Front layer */}
      <div
        className="absolute inset-12 rounded flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(201, 169, 97, 0.2)',
          border: '1px solid rgba(201, 169, 97, 0.5)',
          transform: `translate3d(${parallax.text.translateX}px, ${parallax.text.translateY}px, ${parallax.text.translateZ}px) rotateX(${parallax.text.rotateX}deg) rotateY(${parallax.text.rotateY}deg)`,
          transition: 'transform 0.15s ease-out',
        }}
      >
        <span className="text-sm font-bold" style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}>
          FRONT LAYER
        </span>
      </div>

      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-xs opacity-40" style={{ fontFamily: FONTS.geistMono, color: COLORS.goldPrimary }}>
          Move your mouse to see parallax effect
        </span>
      </div>
    </div>
  );
}

// Sound buttons
function SoundDemo() {
  const { playSound, isEnabled, toggleSound } = useSound();

  const sounds: { name: SoundName; label: string }[] = [
    { name: 'cycleTransition', label: 'Cycle Transition' },
    { name: 'menuOpen', label: 'Menu Open' },
    { name: 'menuClose', label: 'Menu Close' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={toggleSound} className="flex items-center gap-2">
          <div
            className="w-9 h-5 rounded-full relative transition-colors duration-200"
            style={{ backgroundColor: isEnabled ? COLORS.goldPrimary : 'rgba(201, 169, 97, 0.2)' }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
              style={{
                backgroundColor: isEnabled ? '#0a0a0c' : COLORS.goldPrimary,
                transform: isEnabled ? 'translateX(18px)' : 'translateX(2px)',
              }}
            />
          </div>
          <span className="text-sm" style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}>
            Sound {isEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {sounds.map(({ name, label }) => (
          <button
            key={name}
            onClick={() => playSound(name)}
            className="px-4 py-2 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: 'rgba(201, 169, 97, 0.1)',
              border: '1px solid rgba(201, 169, 97, 0.3)',
              fontFamily: FONTS.notoSans,
              color: COLORS.goldPrimary,
              fontSize: '0.875rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.2)';
              e.currentTarget.style.borderColor = COLORS.goldPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(201, 169, 97, 0.3)';
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Orokin spinner component
function OrokinSpinner({ size = 64 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full border-2 border-amber-500/30"
        style={{ boxShadow: '0 0 10px rgba(217, 164, 65, 0.3), inset 0 0 10px rgba(217, 164, 65, 0.1)' }}
      />
      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 bg-amber-400 rounded-full"
          style={{ width: size * 0.0625, height: size * 0.25, boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)' }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-amber-400 rounded-full"
          style={{ width: size * 0.0625, height: size * 0.25, boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)' }}
        />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-amber-400 rounded-full"
          style={{ height: size * 0.0625, width: size * 0.25, boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)' }}
        />
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-amber-400 rounded-full"
          style={{ height: size * 0.0625, width: size * 0.25, boxShadow: '0 0 8px rgba(217, 164, 65, 0.8)' }}
        />
      </div>
      <div
        className="absolute rounded-full border border-amber-400/50 animate-spin"
        style={{
          inset: size * 0.1875,
          animationDuration: '1.5s',
          animationDirection: 'reverse',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="rounded-full bg-amber-300 animate-pulse"
          style={{ width: size * 0.125, height: size * 0.125, boxShadow: '0 0 12px rgba(217, 164, 65, 1)' }}
        />
      </div>
    </div>
  );
}

// Orokin Glyphs SVG specimens
function OrokinGlyphs() {
  const glyphs = [
    { name: 'Diamond Cross', path: <><path d="M 0 -12 L 12 0 L 0 12 L -12 0 Z" strokeWidth={1.5} /><line x1="0" y1="-6" x2="0" y2="6" strokeWidth={1} /><line x1="-6" y1="0" x2="6" y2="0" strokeWidth={1} /></> },
    { name: 'Triangle Dot', path: <><path d="M 0 -10 L 10 8 L -10 8 Z" strokeWidth={1.5} /><circle cx="0" cy="2" r="2" fill="currentColor" stroke="none" /></> },
    { name: 'Void Portal', path: <><path d="M -8 0 A 8 8 0 0 1 8 0" strokeWidth={1} /><path d="M -12 0 A 12 12 0 0 1 12 0" strokeWidth={1} opacity={0.7} /><circle cx="0" cy="0" r="2" fill="currentColor" stroke="none" /></> },
    { name: 'Hexagon', path: <><path d="M 0 -10 L 9 -5 L 9 5 L 0 10 L -9 5 L -9 -5 Z" strokeWidth={1.5} /><path d="M 0 -5 L 4.5 -2.5 L 4.5 2.5 L 0 5 L -4.5 2.5 L -4.5 -2.5 Z" strokeWidth={1} opacity={0.6} /></> },
    { name: 'Crescent Star', path: <><path d="M -8 -6 A 10 10 0 0 0 -8 6" strokeWidth={1.5} /><path d="M -4 0 L 8 0 M 4 -4 L 4 4" strokeWidth={1} /></> },
    { name: 'Tenno Eye', path: <><ellipse cx="0" cy="0" rx="12" ry="6" strokeWidth={1.5} /><circle cx="0" cy="0" r="3" fill="currentColor" stroke="none" /><line x1="-15" y1="0" x2="-12" y2="0" strokeWidth={1} /><line x1="12" y1="0" x2="15" y2="0" strokeWidth={1} /></> },
    { name: 'Chevron', path: <><path d="M -8 -4 L 0 6 L 8 -4" strokeWidth={1.5} fill="none" /><path d="M -5 -6 L 0 0 L 5 -6" strokeWidth={1} opacity={0.6} /></> },
    { name: 'Spiral', path: <><path d="M 0 0 Q 6 -3 8 -8 Q 10 -14 4 -16" strokeWidth={1.5} fill="none" /><circle cx="0" cy="0" r="2" fill="currentColor" stroke="none" /></> },
    { name: 'Cardinal Cross', path: <><line x1="0" y1="-10" x2="0" y2="10" strokeWidth={1.5} /><line x1="-10" y1="0" x2="10" y2="0" strokeWidth={1.5} /><line x1="-3" y1="-10" x2="3" y2="-10" strokeWidth={1} /><line x1="-3" y1="10" x2="3" y2="10" strokeWidth={1} /></> },
    { name: 'Star of David', path: <><path d="M 0 -8 L 7 4 L -7 4 Z" strokeWidth={1.5} /><path d="M 0 8 L -7 -4 L 7 -4 Z" strokeWidth={1} opacity={0.5} /></> },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {glyphs.map(({ name, path }) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <svg
            width={48}
            height={48}
            viewBox="-20 -20 40 40"
            stroke={COLORS.goldPrimary}
            fill="none"
            style={{ color: COLORS.goldPrimary }}
          >
            {path}
          </svg>
          <span className="text-xs text-center" style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary, opacity: 0.6 }}>
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}

// Star twinkle demo
function TwinkleDemo() {
  return (
    <div className="relative h-32 rounded-lg overflow-hidden" style={{ backgroundColor: '#000000' }}>
      <svg className="absolute inset-0 w-full h-full">
        {/* Twinkle animation 1 - 4s */}
        <circle cx="15%" cy="30%" r="2" fill="#FFFFFF" className="star-twinkle-1" style={{ '--star-base-opacity': 0.8 } as React.CSSProperties} />
        <circle cx="25%" cy="70%" r="1.5" fill="#FFFFFF" className="star-twinkle-1" style={{ '--star-base-opacity': 0.6, animationDelay: '1s' } as React.CSSProperties} />

        {/* Twinkle animation 2 - 6s */}
        <circle cx="45%" cy="40%" r="2.5" fill="#FFFFFF" className="star-twinkle-2" style={{ '--star-base-opacity': 0.9 } as React.CSSProperties} />
        <circle cx="55%" cy="80%" r="1" fill="#FFFFFF" className="star-twinkle-2" style={{ '--star-base-opacity': 0.5, animationDelay: '2s' } as React.CSSProperties} />

        {/* Twinkle animation 3 - 8s */}
        <circle cx="75%" cy="25%" r="1.8" fill="#FFFFFF" className="star-twinkle-3" style={{ '--star-base-opacity': 0.7 } as React.CSSProperties} />
        <circle cx="85%" cy="60%" r="2.2" fill="#FFFFFF" className="star-twinkle-3" style={{ '--star-base-opacity': 0.8, animationDelay: '3s' } as React.CSSProperties} />
      </svg>

      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-8">
        <span className="text-xs" style={{ fontFamily: FONTS.geistMono, color: COLORS.goldPrimary, opacity: 0.5 }}>4s cycle</span>
        <span className="text-xs" style={{ fontFamily: FONTS.geistMono, color: COLORS.goldPrimary, opacity: 0.5 }}>6s cycle</span>
        <span className="text-xs" style={{ fontFamily: FONTS.geistMono, color: COLORS.goldPrimary, opacity: 0.5 }}>8s cycle</span>
      </div>
    </div>
  );
}

// Rotating rings demo
function RotatingRingsDemo() {
  const [rotation1, setRotation1] = useState(0);
  const [rotation2, setRotation2] = useState(0);

  useEffect(() => {
    let animationId: number;
    const animate = () => {
      setRotation1(prev => (prev - 0.3) % 360); // Counter-clockwise
      setRotation2(prev => (prev + 0.2) % 360); // Clockwise
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="relative h-48 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', borderRadius: '0.5rem' }}>
      <svg width={180} height={180} viewBox="0 0 180 180">
        {/* Outer ring - counter-clockwise */}
        <circle
          cx={90}
          cy={90}
          r={80}
          fill="none"
          stroke={COLORS.goldPrimary}
          strokeWidth={1}
          strokeDasharray="20 10 5 10"
          opacity={0.4}
          style={{ transform: `rotate(${rotation1}deg)`, transformOrigin: '90px 90px' }}
        />

        {/* Middle ring - clockwise */}
        <circle
          cx={90}
          cy={90}
          r={60}
          fill="none"
          stroke={COLORS.goldPrimary}
          strokeWidth={1.5}
          strokeDasharray="30 8"
          opacity={0.3}
          style={{ transform: `rotate(${rotation2}deg)`, transformOrigin: '90px 90px' }}
        />

        {/* Inner static ring */}
        <circle cx={90} cy={90} r={40} fill="none" stroke={COLORS.goldPrimary} strokeWidth={2} opacity={0.5} />

        {/* Center dot */}
        <circle cx={90} cy={90} r={4} fill={COLORS.goldPrimary} />
      </svg>

      <div className="absolute bottom-2 text-xs text-center" style={{ fontFamily: FONTS.geistMono, color: COLORS.goldPrimary, opacity: 0.5 }}>
        Outer: 120s/rotation | Inner: 180s/rotation
      </div>
    </div>
  );
}

// Menu animation preview
function MenuAnimationDemo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative h-64 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', overflow: 'visible' }}>
      {/* Simulated panels */}
      <div className="absolute top-4 left-4" style={{ zIndex: 10 }}>
        {/* Panel 1 */}
        <div
          className="relative transition-all duration-300 ease-out"
          style={{
            width: isOpen ? 200 : 48,
            height: isOpen ? 100 : 48,
            borderRadius: isOpen ? 12 : 24,
            backgroundColor: 'rgba(10, 10, 12, 0.95)',
            border: `1.5px solid ${COLORS.goldPrimary}`,
            boxShadow: isOpen ? `0 0 16px ${COLORS.goldGlow}` : 'none',
          }}
        >
          {/* Hamburger/X icon */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute top-0 left-0 w-12 h-12 flex items-center justify-center cursor-pointer z-10"
            style={{ touchAction: 'manipulation' }}
          >
            <div className="w-4 h-3 flex flex-col justify-between">
              <span
                className="block h-[1.5px] rounded-full transition-all duration-300"
                style={{
                  backgroundColor: COLORS.goldPrimary,
                  transform: isOpen ? 'translateY(5px) rotate(45deg)' : 'none',
                }}
              />
              <span
                className="block h-[1.5px] rounded-full transition-all duration-300"
                style={{
                  backgroundColor: COLORS.goldPrimary,
                  opacity: isOpen ? 0 : 1,
                }}
              />
              <span
                className="block h-[1.5px] rounded-full transition-all duration-300"
                style={{
                  backgroundColor: COLORS.goldPrimary,
                  transform: isOpen ? 'translateY(-5px) rotate(-45deg)' : 'none',
                }}
              />
            </div>
          </button>
        </div>

        {/* Panel 2 - slides from behind */}
        <motion.div
          initial={false}
          animate={{
            y: isOpen ? 0 : -60,
            opacity: isOpen ? 1 : 0,
          }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1], delay: isOpen ? 0.15 : 0 }}
          style={{
            marginTop: 8,
            width: 200,
            height: 48,
            borderRadius: 12,
            backgroundColor: 'rgba(10, 10, 12, 0.95)',
            border: `1.5px solid ${COLORS.goldPrimary}`,
            boxShadow: `0 0 16px ${COLORS.goldGlow}`,
          }}
        />

        {/* Panel 3 - slides from behind panel 2 */}
        <motion.div
          initial={false}
          animate={{
            y: isOpen ? 0 : -100,
            opacity: isOpen ? 1 : 0,
          }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1], delay: isOpen ? 0.25 : 0 }}
          style={{
            marginTop: 8,
            width: 200,
            height: 48,
            borderRadius: 12,
            backgroundColor: 'rgba(10, 10, 12, 0.95)',
            border: `1.5px solid ${COLORS.goldPrimary}`,
            boxShadow: `0 0 16px ${COLORS.goldGlow}`,
          }}
        />
      </div>

      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-xs" style={{ fontFamily: FONTS.geistMono, color: COLORS.goldPrimary, opacity: 0.5 }}>
          Click hamburger to toggle animation
        </span>
      </div>
    </div>
  );
}

// Corner bracket specimen
function CornerBrackets() {
  return (
    <div className="relative h-32 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100">
        {/* Top-left corner */}
        <g stroke={COLORS.goldPrimary} fill="none">
          <path d="M 4 30 L 4 10 L 10 4 L 30 4" strokeWidth={3} />
          <path d="M 6 28 L 6 11 L 11 6 L 28 6" strokeWidth={1} opacity={0.8} />
          <circle cx={4} cy={10} r={2} fill={COLORS.goldPrimary} stroke="none" />
          <circle cx={10} cy={4} r={2} fill={COLORS.goldPrimary} stroke="none" />
        </g>

        {/* Top-right corner */}
        <g stroke={COLORS.goldPrimary} fill="none">
          <path d="M 196 30 L 196 10 L 190 4 L 170 4" strokeWidth={3} />
          <path d="M 194 28 L 194 11 L 189 6 L 172 6" strokeWidth={1} opacity={0.8} />
          <circle cx={196} cy={10} r={2} fill={COLORS.goldPrimary} stroke="none" />
          <circle cx={190} cy={4} r={2} fill={COLORS.goldPrimary} stroke="none" />
        </g>

        {/* Bottom-left corner */}
        <g stroke={COLORS.goldPrimary} fill="none">
          <path d="M 4 70 L 4 90 L 10 96 L 30 96" strokeWidth={3} />
          <path d="M 6 72 L 6 89 L 11 94 L 28 94" strokeWidth={1} opacity={0.8} />
          <circle cx={4} cy={90} r={2} fill={COLORS.goldPrimary} stroke="none" />
          <circle cx={10} cy={96} r={2} fill={COLORS.goldPrimary} stroke="none" />
        </g>

        {/* Bottom-right corner */}
        <g stroke={COLORS.goldPrimary} fill="none">
          <path d="M 196 70 L 196 90 L 190 96 L 170 96" strokeWidth={3} />
          <path d="M 194 72 L 194 89 L 189 94 L 172 94" strokeWidth={1} opacity={0.8} />
          <circle cx={196} cy={90} r={2} fill={COLORS.goldPrimary} stroke="none" />
          <circle cx={190} cy={96} r={2} fill={COLORS.goldPrimary} stroke="none" />
        </g>

        {/* Center text */}
        <text x="100" y="50" textAnchor="middle" dominantBaseline="middle" fill={COLORS.goldPrimary} fontSize="8" fontFamily={FONTS.notoSans} opacity={0.6}>
          VIEWPORT CORNER ACCENTS
        </text>
      </svg>
    </div>
  );
}

// Button specimens
function ButtonSpecimens() {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Primary Orokin button */}
      <button
        className="px-6 py-2.5 rounded-lg transition-all duration-200"
        style={{
          backgroundColor: 'rgba(201, 169, 97, 0.15)',
          border: `1.5px solid ${COLORS.goldPrimary}`,
          fontFamily: FONTS.notoSans,
          color: COLORS.goldPrimary,
          boxShadow: `0 0 12px ${COLORS.goldGlow}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.25)';
          e.currentTarget.style.boxShadow = `0 0 20px ${COLORS.goldGlow}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.15)';
          e.currentTarget.style.boxShadow = `0 0 12px ${COLORS.goldGlow}`;
        }}
      >
        Primary Action
      </button>

      {/* Secondary/Ghost button */}
      <button
        className="px-6 py-2.5 rounded-lg transition-all duration-200"
        style={{
          backgroundColor: 'transparent',
          border: `1px solid rgba(201, 169, 97, 0.3)`,
          fontFamily: FONTS.notoSans,
          color: COLORS.goldPrimary,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.1)';
          e.currentTarget.style.borderColor = COLORS.goldPrimary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(201, 169, 97, 0.3)';
        }}
      >
        Secondary
      </button>

      {/* Icon button */}
      <button
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
        style={{
          backgroundColor: 'rgba(201, 169, 97, 0.1)',
          border: `1px solid ${COLORS.goldPrimary}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.2)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.1)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={COLORS.goldPrimary} strokeWidth={1.5}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* Disabled state */}
      <button
        className="px-6 py-2.5 rounded-lg opacity-40 cursor-not-allowed"
        style={{
          backgroundColor: 'rgba(201, 169, 97, 0.05)',
          border: `1px solid rgba(201, 169, 97, 0.2)`,
          fontFamily: FONTS.notoSans,
          color: COLORS.goldPrimary,
        }}
        disabled
      >
        Disabled
      </button>
    </div>
  );
}

// Main design system page component
export default function DesignSystemPage() {
  const [dayNightDemo, setDayNightDemo] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Override the global scroll lock styles for this page
  useEffect(() => {
    // Store original styles
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const originalHtmlOverflow = htmlEl.style.overflow;
    const originalBodyOverflow = bodyEl.style.overflow;
    const originalBodyPosition = bodyEl.style.position;

    // Enable scrolling for this page
    htmlEl.style.overflow = 'auto';
    bodyEl.style.overflow = 'auto';
    bodyEl.style.position = 'relative';

    return () => {
      // Restore original styles when leaving page
      htmlEl.style.overflow = originalHtmlOverflow;
      bodyEl.style.overflow = originalBodyOverflow;
      bodyEl.style.position = originalBodyPosition;
    };
  }, []);

  return (
    <div
      className="min-h-screen overflow-y-auto"
      style={{
        backgroundColor: COLORS.spaceBlack,
        color: COLORS.textPrimary,
        minHeight: '100vh',
        overflowY: 'auto',
      }}
      suppressHydrationWarning
    >
      {/* Background effects - only render after mount to avoid hydration mismatch from browser extensions */}
      {mounted && (
        <>
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 20% 80%, #1f1a2e 0%, transparent 50%),
                radial-gradient(ellipse 60% 40% at 80% 20%, #1a2744 0%, transparent 45%)
              `,
              opacity: 0.4,
            }}
          />
          <div className="noise-overlay" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-6 text-sm transition-opacity hover:opacity-80"
            style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to App
          </Link>

          <h1
            className="text-4xl mb-4"
            style={{
              fontFamily: FONTS.ailerons,
              color: COLORS.goldPrimary,
              letterSpacing: '0.15em',
              textShadow: `0 0 20px ${COLORS.goldGlow}`,
            }}
          >
            OROKIN DESIGN SYSTEM
          </h1>
          <p
            className="text-lg opacity-70"
            style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}
          >
            A comprehensive showcase of design tokens, components, and interactions inspired by Warframe&apos;s Orokin aesthetic.
          </p>
        </header>

        {/* Color Palette Section */}
        <Section title="COLOR PALETTE">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Specimen label="Gold Accent Colors">
              <ColorSwatch name="Gold Primary" value="#C9A961" hex="#C9A961" />
              <ColorSwatch name="Gold Hover" value="#D4B76A" hex="#D4B76A" />
              <div className="mt-2">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-12 h-12 rounded-lg"
                    style={{
                      backgroundColor: 'rgba(201, 169, 97, 0.3)',
                      border: '1px solid rgba(201, 169, 97, 0.5)',
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium" style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}>Gold Glow</span>
                    <span className="text-xs opacity-60" style={{ fontFamily: FONTS.geistMono, color: COLORS.goldPrimary }}>rgba(201, 169, 97, 0.3)</span>
                  </div>
                </div>
              </div>
            </Specimen>

            <Specimen label="Background Colors">
              <ColorSwatch name="Background Base" value="#0a0a0c" hex="#0a0a0c" />
              <ColorSwatch name="Space Black" value="#000000" hex="#000000" />
            </Specimen>

            <Specimen label="Nebula Blues">
              <ColorSwatch name="Nebula Blue 1" value="#1a2744" hex="#1a2744" />
              <ColorSwatch name="Nebula Blue 2" value="#243554" hex="#243554" />
              <ColorSwatch name="Nebula Blue 3" value="#2d4a6e" hex="#2d4a6e" />
            </Specimen>

            <Specimen label="Nebula Purples">
              <ColorSwatch name="Nebula Purple 1" value="#1f1a2e" hex="#1f1a2e" />
              <ColorSwatch name="Nebula Purple 2" value="#2a1f3d" hex="#2a1f3d" />
              <ColorSwatch name="Nebula Purple 3" value="#3a2f4d" hex="#3a2f4d" />
            </Specimen>
          </div>
        </Section>

        {/* Typography Section */}
        <Section title="TYPOGRAPHY">
          <div className="space-y-6">
            <Specimen label="Ailerons - Display / Clock Numbers">
              <div style={{ fontFamily: FONTS.ailerons, color: COLORS.goldPrimary }}>
                <div className="text-5xl mb-2" style={{ letterSpacing: '0.15em' }}>12:34:56</div>
                <div className="text-2xl" style={{ letterSpacing: '0.1em' }}>WARFRAME CLOX</div>
              </div>
            </Specimen>

            <Specimen label="Flareserif 821 Bold - Titles">
              <div style={{ fontFamily: FONTS.flareserif, color: COLORS.goldPrimary, fontWeight: 700 }}>
                <div className="text-3xl mb-2" style={{ letterSpacing: '0.12em' }}>PLAINS OF EIDOLON</div>
                <div className="text-xl" style={{ letterSpacing: '0.1em' }}>Cetus Day/Night Cycle</div>
              </div>
            </Specimen>

            <Specimen label="Noto Sans - UI Labels & Body">
              <div style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}>
                <div className="text-lg mb-2 font-bold">Notifications Enabled</div>
                <div className="text-sm opacity-80">The Orokin aesthetic combines ancient gold tones with futuristic geometric patterns, creating a visual language that feels both timeless and alien.</div>
              </div>
            </Specimen>

            <Specimen label="Geist Mono - Technical / Code">
              <div style={{ fontFamily: FONTS.geistMono, color: COLORS.goldPrimary }}>
                <div className="text-sm mb-2">--color-gold-primary: #C9A961;</div>
                <div className="text-xs opacity-60">Connected via warframestat.us | Last sync: 5 min ago</div>
              </div>
            </Specimen>
          </div>
        </Section>

        {/* Geometric Elements Section */}
        <Section title="GEOMETRIC ELEMENTS">
          <Specimen label="Orokin Glyphs">
            <OrokinGlyphs />
          </Specimen>

          <Specimen label="Corner Brackets">
            <CornerBrackets />
          </Specimen>

          <Specimen label="Loading Spinner">
            <div className="flex items-center gap-8">
              <OrokinSpinner size={48} />
              <OrokinSpinner size={64} />
              <OrokinSpinner size={80} />
            </div>
          </Specimen>
        </Section>

        {/* Animation Section */}
        <Section title="ANIMATIONS">
          <Specimen label="Star Twinkle Effects">
            <TwinkleDemo />
          </Specimen>

          <Specimen label="Rotating Rings">
            <RotatingRingsDemo />
          </Specimen>

          <Specimen label="3D Parallax Layers">
            <ParallaxDemo />
          </Specimen>

          <Specimen label="Day/Night Icon Transition">
            <div className="flex items-center gap-6">
              <DayNightIcon isDay={dayNightDemo} />
              <button
                onClick={() => setDayNightDemo(!dayNightDemo)}
                className="px-4 py-2 rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(201, 169, 97, 0.1)',
                  border: '1px solid rgba(201, 169, 97, 0.3)',
                  fontFamily: FONTS.notoSans,
                  color: COLORS.goldPrimary,
                }}
              >
                Toggle {dayNightDemo ? 'Night' : 'Day'}
              </button>
            </div>
          </Specimen>
        </Section>

        {/* UI Components Section */}
        <Section title="UI COMPONENTS">
          <Specimen label="Buttons">
            <ButtonSpecimens />
          </Specimen>

          <Specimen label="Toggle Switch">
            <ToggleSpecimen />
          </Specimen>

          <Specimen label="Menu Animation">
            <MenuAnimationDemo />
          </Specimen>
        </Section>

        {/* Interactive Elements Section */}
        <Section title="INTERACTIVE ELEMENTS">
          <Specimen label="Sound Effects">
            <SoundDemo />
          </Specimen>

          <Specimen label="Status Indicators">
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: '#22c55e', boxShadow: '0 0 8px #22c55e' }}
                />
                <span className="text-sm" style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}>Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: '#eab308', boxShadow: '0 0 8px #eab308' }}
                />
                <span className="text-sm" style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}>Checking</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: '#ef4444', boxShadow: '0 0 8px #ef4444' }}
                />
                <span className="text-sm" style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}>Disconnected</span>
              </div>
            </div>
          </Specimen>
        </Section>

        {/* Footer */}
        <footer
          className="mt-16 pt-8 border-t text-center"
          style={{ borderColor: 'rgba(201, 169, 97, 0.2)' }}
        >
          <p
            className="text-sm opacity-60"
            style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}
          >
            Warframe Clox Design System &bull; Inspired by Digital Extremes&apos; Orokin aesthetic
          </p>
        </footer>
      </div>
    </div>
  );
}
