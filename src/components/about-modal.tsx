'use client';

import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '@/hooks/use-sound';
import Link from 'next/link';

// Color tokens matching the design system
const COLORS = {
  goldPrimary: 'var(--color-gold-primary)',
  goldGlow: 'var(--color-gold-glow)',
};

// Font tokens
const FONTS = {
  ailerons: 'var(--font-ailerons), sans-serif',
  notoSans: 'var(--font-noto-sans), sans-serif',
  flareSerif: 'var(--font-flare-serif), serif',
};

// Orokin corner flourish SVG component
function OrokinCorner({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const rotations = {
    'top-left': 0,
    'top-right': 90,
    'bottom-right': 180,
    'bottom-left': 270,
  };

  const positions = {
    'top-left': { top: 0, left: 0 },
    'top-right': { top: 0, right: 0 },
    'bottom-right': { bottom: 0, right: 0 },
    'bottom-left': { bottom: 0, left: 0 },
  };

  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 60 60"
      fill="none"
      className="absolute pointer-events-none"
      style={{
        ...positions[position],
        transform: `rotate(${rotations[position]}deg)`,
      }}
    >
      {/* Outer angular frame */}
      <path
        d="M0 0 L24 0 L24 3 L3 3 L3 24 L0 24 Z"
        fill="url(#orokinGradient)"
        opacity="0.9"
      />
      {/* Inner decorative line */}
      <path
        d="M6 6 L20 6 L20 8 L8 8 L8 20 L6 20 Z"
        fill="url(#orokinGradient)"
        opacity="0.6"
      />
      {/* Diamond accent */}
      <path
        d="M12 12 L16 16 L12 20 L8 16 Z"
        fill="none"
        stroke="#C9A961"
        strokeWidth="1"
        opacity="0.8"
      />
      {/* Small dot accent */}
      <circle cx="12" cy="16" r="1.5" fill="#C9A961" opacity="0.9" />
      {/* Gradient definition */}
      <defs>
        <linearGradient id="orokinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9A961" />
          <stop offset="50%" stopColor="#D4B76A" />
          <stop offset="100%" stopColor="#A88B4A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Orokin divider component
function OrokinDivider() {
  return (
    <div className="relative w-full h-8 my-6 flex items-center justify-center">
      {/* Center diamond */}
      <svg width="200" height="20" viewBox="0 0 200 20" fill="none" className="absolute">
        {/* Left line */}
        <line x1="0" y1="10" x2="70" y2="10" stroke="#C9A961" strokeWidth="1" opacity="0.3" />
        {/* Left inner line */}
        <line x1="30" y1="10" x2="75" y2="10" stroke="#C9A961" strokeWidth="1" opacity="0.5" />
        {/* Center diamond shape */}
        <path d="M85 10 L100 2 L115 10 L100 18 Z" fill="none" stroke="#C9A961" strokeWidth="1.5" />
        <path d="M92 10 L100 5 L108 10 L100 15 Z" fill="#C9A961" opacity="0.3" />
        {/* Right inner line */}
        <line x1="125" y1="10" x2="170" y2="10" stroke="#C9A961" strokeWidth="1" opacity="0.5" />
        {/* Right line */}
        <line x1="130" y1="10" x2="200" y2="10" stroke="#C9A961" strokeWidth="1" opacity="0.3" />
      </svg>
    </div>
  );
}

// Section header with Orokin styling
function OrokinSectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 0 L16 8 L8 16 L0 8 Z" fill="none" stroke="#C9A961" strokeWidth="1" />
        <path d="M8 3 L13 8 L8 13 L3 8 Z" fill="#C9A961" opacity="0.3" />
      </svg>
      <h3
        className="text-lg tracking-wide"
        style={{
          fontFamily: FONTS.flareSerif,
          color: COLORS.goldPrimary,
          textShadow: '0 0 10px rgba(201, 169, 97, 0.3)',
        }}
      >
        {children}
      </h3>
    </div>
  );
}

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const { playSound } = useSound();

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        playSound('menuClose');
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, playSound]);

  const handleBackdropClick = useCallback(() => {
    playSound('menuClose');
    onClose();
  }, [onClose, playSound]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay with void energy effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60]"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backgroundImage: `
                radial-gradient(ellipse at 50% 50%, rgba(201, 169, 97, 0.03) 0%, transparent 50%),
                radial-gradient(ellipse at 20% 80%, rgba(201, 169, 97, 0.02) 0%, transparent 40%),
                radial-gradient(ellipse at 80% 20%, rgba(201, 169, 97, 0.02) 0%, transparent 40%)
              `,
            }}
            onClick={handleBackdropClick}
          />

          {/* Modal container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              duration: 0.35,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="fixed z-[70] flex items-center justify-center"
            style={{
              inset: 0,
              padding: '10vh 10vw',
            }}
            onClick={handleBackdropClick}
          >
            {/* Modal content with Orokin frame */}
            <div
              className="relative w-full h-full overflow-hidden"
              style={{
                maxWidth: '800px',
                maxHeight: '80vh',
                backgroundColor: 'rgba(8, 8, 10, 0.98)',
                border: `2px solid ${COLORS.goldPrimary}`,
                boxShadow: `
                  0 0 60px rgba(201, 169, 97, 0.2),
                  0 0 120px rgba(201, 169, 97, 0.1),
                  inset 0 0 60px rgba(201, 169, 97, 0.03)
                `,
              }}
              onClick={handleContentClick}
            >
              {/* Orokin corner flourishes */}
              <OrokinCorner position="top-left" />
              <OrokinCorner position="top-right" />
              <OrokinCorner position="bottom-left" />
              <OrokinCorner position="bottom-right" />

              {/* Inner border frame */}
              <div
                className="absolute inset-3 pointer-events-none"
                style={{
                  border: '1px solid rgba(201, 169, 97, 0.2)',
                }}
              />

              {/* Animated void energy line at top */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{
                  background: `linear-gradient(90deg,
                    transparent 0%,
                    rgba(201, 169, 97, 0.8) 20%,
                    rgba(201, 169, 97, 1) 50%,
                    rgba(201, 169, 97, 0.8) 80%,
                    transparent 100%
                  )`,
                }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Close button - Orokin styled */}
              <button
                onClick={() => {
                  playSound('menuClose');
                  onClose();
                }}
                className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center transition-all duration-200 z-10 group"
                style={{
                  border: `1px solid rgba(201, 169, 97, 0.5)`,
                  backgroundColor: 'rgba(201, 169, 97, 0.05)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = COLORS.goldPrimary;
                  e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.15)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(201, 169, 97, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(201, 169, 97, 0.5)';
                  e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.05)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                aria-label="Close modal"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={COLORS.goldPrimary}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Scrollable content area with custom scrollbar */}
              <div
                className="h-full overflow-y-auto px-10 py-10 orokin-scroll"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(201, 169, 97, 0.5) rgba(201, 169, 97, 0.1)',
                }}
              >
                {/* Title with Orokin styling */}
                <div className="text-center mb-6 pt-2">
                  {/* Small decorative element above title */}
                  <svg width="40" height="20" viewBox="0 0 40 20" fill="none" className="mx-auto mb-3">
                    <path d="M20 0 L25 10 L20 20 L15 10 Z" fill="none" stroke="#C9A961" strokeWidth="1" />
                    <path d="M20 4 L23 10 L20 16 L17 10 Z" fill="#C9A961" opacity="0.4" />
                    <line x1="0" y1="10" x2="12" y2="10" stroke="#C9A961" strokeWidth="1" opacity="0.5" />
                    <line x1="28" y1="10" x2="40" y2="10" stroke="#C9A961" strokeWidth="1" opacity="0.5" />
                  </svg>

                  <h2
                    className="text-3xl tracking-widest mb-3"
                    style={{
                      fontFamily: FONTS.ailerons,
                      color: COLORS.goldPrimary,
                      textShadow: `0 0 30px rgba(201, 169, 97, 0.5), 0 0 60px rgba(201, 169, 97, 0.2)`,
                      letterSpacing: '0.2em',
                    }}
                  >
                    WARFRAME CLOX
                  </h2>

                  {/* Subtitle divider */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, #C9A961)' }} />
                    <span
                      className="text-xs tracking-[0.3em] opacity-60"
                      style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}
                    >
                      OROKIN ERA TIMEKEEPER
                    </span>
                    <div className="w-16 h-[1px]" style={{ background: 'linear-gradient(90deg, #C9A961, transparent)' }} />
                  </div>
                </div>

                <OrokinDivider />

                {/* Origin Story */}
                <section className="mb-6">
                  <OrokinSectionHeader>The Origin</OrokinSectionHeader>
                  <p
                    className="text-sm leading-relaxed opacity-90 pl-7"
                    style={{
                      fontFamily: FONTS.notoSans,
                      color: '#e5e5e5',
                    }}
                  >
                    Warframe Clox was born from the frustration of farming resources in Cetus
                    while never knowing if it was day or night on the Plains of Eidolon.
                    Tired of sitting at Navigation just to watch for the cycle change,
                    or making guesses based on gut feeling, I built this clock to always
                    know exactly where we stand in the day/night cycle.
                  </p>
                </section>

                <OrokinDivider />

                {/* Design System */}
                <section className="mb-6">
                  <OrokinSectionHeader>Design System</OrokinSectionHeader>
                  <div className="pl-7">
                    <Link
                      href="/design-system"
                      className="flex items-center gap-3 p-3 transition-all duration-200 group"
                      style={{
                        backgroundColor: 'rgba(201, 169, 97, 0.05)',
                        border: `1px solid rgba(201, 169, 97, 0.3)`,
                        boxShadow: '0 0 15px rgba(201, 169, 97, 0.1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = COLORS.goldPrimary;
                        e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.12)';
                        e.currentTarget.style.boxShadow = '0 0 25px rgba(201, 169, 97, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(201, 169, 97, 0.3)';
                        e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.05)';
                        e.currentTarget.style.boxShadow = '0 0 15px rgba(201, 169, 97, 0.1)';
                      }}
                    >
                      {/* Orokin Glyph Icon */}
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={COLORS.goldPrimary}
                        strokeWidth="1.5"
                        className="flex-shrink-0"
                      >
                        <path d="M12 2 L22 12 L12 22 L2 12 Z" />
                        <path d="M12 6 L18 12 L12 18 L6 12 Z" opacity="0.5" />
                        <circle cx="12" cy="12" r="2" fill={COLORS.goldPrimary} stroke="none" />
                      </svg>
                      <div className="flex-1">
                        <span
                          className="text-sm block font-medium"
                          style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}
                        >
                          Orokin Design System
                        </span>
                        <span
                          className="text-xs opacity-60"
                          style={{ fontFamily: FONTS.notoSans, color: '#e5e5e5' }}
                        >
                          Explore our UI components, color palette, typography, and animations
                        </span>
                      </div>
                      {/* Arrow icon */}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={COLORS.goldPrimary}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-50 group-hover:opacity-100 transition-opacity"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </section>

                <OrokinDivider />

                {/* Credits */}
                <section className="mb-6">
                  <OrokinSectionHeader>Credits & Attributions</OrokinSectionHeader>

                  <div className="space-y-3 pl-7">
                    {/* Sound Artist */}
                    <a
                      href="https://new.kasumata.ee/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 transition-all duration-200 group"
                      style={{
                        backgroundColor: 'rgba(201, 169, 97, 0.03)',
                        border: `1px solid rgba(201, 169, 97, 0.15)`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(201, 169, 97, 0.5)';
                        e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.08)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(201, 169, 97, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(201, 169, 97, 0.15)';
                        e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.03)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={COLORS.goldPrimary}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0 opacity-70"
                      >
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                      <div className="flex-1">
                        <span
                          className="text-sm block"
                          style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}
                        >
                          Sound Effects by Kasumata
                        </span>
                        <span
                          className="text-xs opacity-50"
                          style={{ fontFamily: FONTS.notoSans, color: '#e5e5e5' }}
                        >
                          new.kasumata.ee
                        </span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.goldPrimary} strokeWidth="1.5" className="opacity-30">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>

                    {/* 3D Globe */}
                    <a
                      href="https://sketchfab.com/3d-models/earth-hd-ec8ceb85d7094bc19acd3aff4d24682f"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 transition-all duration-200"
                      style={{
                        backgroundColor: 'rgba(201, 169, 97, 0.03)',
                        border: `1px solid rgba(201, 169, 97, 0.15)`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(201, 169, 97, 0.5)';
                        e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.08)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(201, 169, 97, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(201, 169, 97, 0.15)';
                        e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.03)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={COLORS.goldPrimary}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0 opacity-70"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <div className="flex-1">
                        <span
                          className="text-sm block"
                          style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}
                        >
                          Earth HD 3D Model
                        </span>
                        <span
                          className="text-xs opacity-50"
                          style={{ fontFamily: FONTS.notoSans, color: '#e5e5e5' }}
                        >
                          Sketchfab - Free for personal use
                        </span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.goldPrimary} strokeWidth="1.5" className="opacity-30">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>

                    {/* Warframe API */}
                    <a
                      href="https://docs.warframestat.us/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 transition-all duration-200"
                      style={{
                        backgroundColor: 'rgba(201, 169, 97, 0.03)',
                        border: `1px solid rgba(201, 169, 97, 0.15)`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(201, 169, 97, 0.5)';
                        e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.08)';
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(201, 169, 97, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(201, 169, 97, 0.15)';
                        e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.03)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={COLORS.goldPrimary}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0 opacity-70"
                      >
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                      <div className="flex-1">
                        <span
                          className="text-sm block"
                          style={{ fontFamily: FONTS.notoSans, color: COLORS.goldPrimary }}
                        >
                          Warframe Stat API
                        </span>
                        <span
                          className="text-xs opacity-50"
                          style={{ fontFamily: FONTS.notoSans, color: '#e5e5e5' }}
                        >
                          docs.warframestat.us - Real-time cycle data
                        </span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.goldPrimary} strokeWidth="1.5" className="opacity-30">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                </section>

                <OrokinDivider />

                {/* Footer */}
                <div className="text-center pt-2">
                  <p
                    className="text-xs opacity-60 mb-2"
                    style={{ fontFamily: FONTS.notoSans, color: '#e5e5e5' }}
                  >
                    A fan project by{' '}
                    <a
                      href="https://chadbercea.github.io/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: COLORS.goldPrimary }}
                      className="hover:underline"
                    >
                      Chad B
                    </a>
                    {' '}— because Konzu&apos;s early lunch waits for no one.
                  </p>
                  <p
                    className="text-xs opacity-40 mt-3"
                    style={{ fontFamily: FONTS.notoSans, color: '#e5e5e5' }}
                  >
                    Not affiliated with Digital Extremes.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
