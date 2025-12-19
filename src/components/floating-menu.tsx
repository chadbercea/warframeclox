'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/hooks/use-notifications';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useApiStatus } from '@/hooks/use-api-status';
import { useSound } from '@/hooks/use-sound';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useToast } from '@/contexts/toast-context';
import { AboutModal } from '@/components/about-modal';

// Color tokens matching the design system
const COLORS = {
  goldPrimary: 'var(--color-gold-primary)',
  goldGlow: 'var(--color-gold-glow)',
};

// Font tokens
const FONTS = {
  ailerons: 'var(--font-ailerons), sans-serif',
  notoSans: 'var(--font-noto-sans), sans-serif',
};

// Dimensions
const BUTTON_SIZE = 48;
const SIDEBAR_WIDTH = 280;
const POSITION_TOP = 16;
const POSITION_LEFT = 16;
const PANEL_GAP = 10;

// Animation timing (in seconds for framer-motion)
const PANEL_1_DELAY = 0; // Panel 1 starts immediately
const PANEL_2_DELAY = 0.5; // 500ms after Panel 1 completes
const PANEL_3_DELAY = 0.1; // 100ms after Panel 2 starts

// Slide animation duration
const SLIDE_DURATION = 0.35;

export function FloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [panel1Complete, setPanel1Complete] = useState(false);
  const [panel2Visible, setPanel2Visible] = useState(false);
  const [panel3Visible, setPanel3Visible] = useState(false);

  // For close sequence
  const [isClosing, setIsClosing] = useState(false);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // About modal state
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Refs for measuring panel heights
  const panel1Ref = useRef<HTMLDivElement>(null);
  const panel2Ref = useRef<HTMLDivElement>(null);
  const [panel1Height, setPanel1Height] = useState(0);
  const [panel2Height, setPanel2Height] = useState(0);

  const { isSupported, isEnabled: notificationsEnabled, permission, toggleNotifications } = useNotifications();
  const { canInstall, install, isInstalled } = usePWAInstall();
  const { status: apiStatus, source: apiSource, checkConnection } = useApiStatus();
  const { playSound, isEnabled: soundEnabled, toggleSound } = useSound();
  const { isEnabled: reduceMotionEnabled, toggleReduceMotion } = useReduceMotion();
  const { showToast } = useToast();

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  const handleOpenAbout = useCallback(() => {
    playSound('menuOpen');
    setIsAboutOpen(true);
  }, [playSound]);

  const handleCloseAbout = useCallback(() => {
    setIsAboutOpen(false);
  }, []);

  const handleShare = useCallback(async () => {
    const shareUrl = 'https://www.warframeclox.com';
    const shareText = 'Behold, Tenno—the Unum\'s light measured in mortal time. Know when day yields to night on the Plains. The Eidolons stir at dusk.';
    const shareContent = `${shareText}\n\n${shareUrl}`;

    try {
      await navigator.clipboard.writeText(shareContent);
      showToast({
        title: 'LINK COPIED',
        message: 'Share link has been copied to your clipboard.',
        icon: 'sun',
      });
    } catch (err) {
      showToast({
        title: 'COPY FAILED',
        message: 'Unable to copy link to clipboard.',
        icon: 'moon',
      });
    }
  }, [showToast]);

  // Measure panel heights after animations complete
  useEffect(() => {
    if (isOpen && panel1Ref.current) {
      // Wait for Panel 1 CSS transition to complete (350ms)
      const timer = setTimeout(() => {
        if (panel1Ref.current) {
          setPanel1Height(panel1Ref.current.offsetHeight);
        }
      }, 350);
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      setPanel1Height(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (panel2Visible && panel2Ref.current) {
      setPanel2Height(panel2Ref.current.offsetHeight);
    } else if (!panel2Visible) {
      setPanel2Height(0);
    }
  }, [panel2Visible]);

  const clearCache = useCallback(async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      window.location.reload();
    }
  }, []);

  // Handle open sequence
  const handleOpen = useCallback(() => {
    playSound('menuOpen');
    setIsOpen(true);
    setIsClosing(false);

    // Panel 1 animation completes, trigger Panel 2 after 100ms
    setTimeout(() => {
      setPanel1Complete(true);
      setPanel2Visible(true);

      // Panel 3 appears 100ms after Panel 2 starts
      setTimeout(() => {
        setPanel3Visible(true);
      }, 100);
    }, 350 + 100); // Panel 1 animation (350ms) + 100ms wait
  }, [playSound]);

  // Handle close sequence
  const handleClose = useCallback(() => {
    playSound('menuClose');
    setIsClosing(true);

    // Step 1: Panel 3 slides up
    setPanel3Visible(false);

    // Step 2: After Panel 3 completes, Panel 2 slides up
    setTimeout(() => {
      setPanel2Visible(false);

      // Step 3: After Panel 2 completes, Panel 1 closes
      setTimeout(() => {
        setPanel1Complete(false);
        setIsOpen(false);
        setIsClosing(false);
      }, SLIDE_DURATION * 1000);
    }, SLIDE_DURATION * 1000);
  }, [playSound]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [isOpen, handleOpen, handleClose]);

  const handleBackdropClick = useCallback(() => {
    if (isOpen && !isClosing) {
      handleClose();
    }
  }, [isOpen, isClosing, handleClose]);

  // Calculate positions for stacked panels (dynamic based on measured heights)
  const panel2Top = POSITION_TOP + panel1Height + PANEL_GAP;
  const panel3Top = panel2Top + panel2Height + PANEL_GAP;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onClick={handleBackdropClick}
      />

      {/* Panel 1 - Settings (Morphing container) - front layer */}
      <div
        ref={panel1Ref}
        className="fixed z-50"
        style={{
          top: POSITION_TOP,
          left: POSITION_LEFT,
          width: isOpen ? SIDEBAR_WIDTH : BUTTON_SIZE,
          height: isOpen ? 'auto' : BUTTON_SIZE,
          minHeight: BUTTON_SIZE,
          borderRadius: isOpen ? 16 : BUTTON_SIZE / 2,
          backgroundColor: 'rgba(10, 10, 12, 0.95)',
          border: `1.5px solid ${COLORS.goldPrimary}`,
          boxShadow: isOpen ? `0 0 24px ${COLORS.goldGlow}` : 'none',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          transformOrigin: 'top left',
          overflow: 'hidden',
        }}
      >
        {/* Hamburger / X button - always in same position */}
        <button
          onClick={handleToggle}
          disabled={isClosing}
          className="absolute flex items-center justify-center transition-all duration-200 hover:scale-105 cursor-pointer"
          style={{
            top: 0,
            left: 0,
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            zIndex: 10,
            opacity: isClosing ? 0.5 : 1,
          }}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          {/* Hamburger Icon - transforms to X */}
          <div className="w-5 h-4 flex flex-col justify-between relative">
            <span
              className="block h-[1.5px] rounded-full transition-all duration-300 origin-center"
              style={{
                backgroundColor: COLORS.goldPrimary,
                transform: isOpen ? 'translateY(7px) rotate(45deg)' : 'none',
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
              className="block h-[1.5px] rounded-full transition-all duration-300 origin-center"
              style={{
                backgroundColor: COLORS.goldPrimary,
                transform: isOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
              }}
            />
          </div>
        </button>

        {/* Panel 1 Content - Settings */}
        <div
          className="px-4 pb-4 pt-12 transition-opacity duration-300"
          style={{
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        >
          {/* App Title */}
          <div className="mb-3 pb-3 border-b w-full" style={{ borderColor: 'rgba(201, 169, 97, 0.3)' }}>
            <h1
              className="whitespace-nowrap text-center"
              style={{
                fontFamily: FONTS.ailerons,
                color: COLORS.goldPrimary,
                fontSize: '2rem',
                letterSpacing: '0.08em',
              }}
            >
              WARFRAME CLOCX
            </h1>
          </div>

          {/* Notifications Toggle */}
          {isSupported && (
            <button
              onClick={() => {
                toggleNotifications();
                // Show toast for notification toggle (will show opposite state since toggle happens first)
                showToast({
                  title: notificationsEnabled ? 'NOTIFICATIONS DISABLED' : 'NOTIFICATIONS ENABLED',
                  message: notificationsEnabled
                    ? 'Browser notifications have been turned off.'
                    : 'You will receive browser alerts before cycle transitions.',
                  icon: notificationsEnabled ? 'moon' : 'sun',
                });
              }}
              disabled={permission === 'denied'}
              className="w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200"
              style={{
                backgroundColor: 'rgba(201, 169, 97, 0.05)',
                border: `1px solid transparent`,
                opacity: permission === 'denied' ? 0.4 : 1,
                cursor: permission === 'denied' ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (permission !== 'denied') {
                  e.currentTarget.style.borderColor = COLORS.goldPrimary;
                  e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.05)';
              }}
            >
              <div className="flex items-center gap-3">
                {/* Bell Icon */}
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
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  {!notificationsEnabled && <line x1="1" y1="1" x2="23" y2="23" />}
                </svg>
                <span
                  className="text-sm"
                  style={{
                    fontFamily: FONTS.notoSans,
                    color: COLORS.goldPrimary,
                  }}
                >
                  Notifications
                </span>
              </div>
              {/* Toggle Switch */}
              <div
                className="w-9 h-5 rounded-full relative transition-colors duration-200"
                style={{
                  backgroundColor: notificationsEnabled ? COLORS.goldPrimary : 'rgba(100, 100, 100, 0.3)',
                }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
                  style={{
                    backgroundColor: notificationsEnabled ? '#0a0a0c' : 'rgba(150, 150, 150, 0.8)',
                    transform: notificationsEnabled ? 'translateX(18px)' : 'translateX(2px)',
                  }}
                />
              </div>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => {
              toggleSound();
              // Show toast for sound toggle (will show opposite state since toggle happens first)
              showToast({
                title: soundEnabled ? 'SOUND DISABLED' : 'SOUND ENABLED',
                message: soundEnabled
                  ? 'Audio effects have been muted.'
                  : 'You will hear audio cues during cycle transitions.',
                icon: soundEnabled ? 'moon' : 'sun',
              });
            }}
            className="w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 mt-2"
            style={{
              backgroundColor: 'rgba(201, 169, 97, 0.05)',
              border: `1px solid transparent`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = COLORS.goldPrimary;
              e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.05)';
            }}
          >
            <div className="flex items-center gap-3">
              {/* Speaker Icon */}
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
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                {soundEnabled ? (
                  <>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </>
                ) : (
                  <line x1="1" y1="1" x2="23" y2="23" />
                )}
              </svg>
              <span
                className="text-sm"
                style={{
                  fontFamily: FONTS.notoSans,
                  color: COLORS.goldPrimary,
                }}
              >
                Sound
              </span>
            </div>
            {/* Toggle Switch */}
            <div
              className="w-9 h-5 rounded-full relative transition-colors duration-200"
              style={{
                backgroundColor: soundEnabled ? COLORS.goldPrimary : 'rgba(100, 100, 100, 0.3)',
              }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
                style={{
                  backgroundColor: soundEnabled ? '#0a0a0c' : 'rgba(150, 150, 150, 0.8)',
                  transform: soundEnabled ? 'translateX(18px)' : 'translateX(2px)',
                }}
              />
            </div>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 mt-2"
            style={{
              backgroundColor: 'rgba(201, 169, 97, 0.05)',
              border: `1px solid transparent`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = COLORS.goldPrimary;
              e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.05)';
            }}
          >
            <div className="flex items-center gap-3">
              {/* Fullscreen Icon */}
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
                {isFullscreen ? (
                  <>
                    <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                    <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                    <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                    <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                  </>
                ) : (
                  <>
                    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                  </>
                )}
              </svg>
              <span
                className="text-sm"
                style={{
                  fontFamily: FONTS.notoSans,
                  color: COLORS.goldPrimary,
                }}
              >
                Full Screen
              </span>
            </div>
            {/* Toggle Switch */}
            <div
              className="w-9 h-5 rounded-full relative transition-colors duration-200"
              style={{
                backgroundColor: isFullscreen ? COLORS.goldPrimary : 'rgba(100, 100, 100, 0.3)',
              }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
                style={{
                  backgroundColor: isFullscreen ? '#0a0a0c' : 'rgba(150, 150, 150, 0.8)',
                  transform: isFullscreen ? 'translateX(18px)' : 'translateX(2px)',
                }}
              />
            </div>
          </button>

          {/* Reduce Motion Toggle */}
          <button
            onClick={toggleReduceMotion}
            className="w-full flex items-center justify-between p-2 rounded-lg transition-all duration-200 mt-2"
            style={{
              backgroundColor: 'rgba(201, 169, 97, 0.05)',
              border: `1px solid transparent`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = COLORS.goldPrimary;
              e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.05)';
            }}
          >
            <div className="flex items-center gap-3">
              {/* Motion Icon */}
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
                {reduceMotionEnabled ? (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </>
                ) : (
                  <>
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </>
                )}
              </svg>
              <span
                className="text-sm"
                style={{
                  fontFamily: FONTS.notoSans,
                  color: COLORS.goldPrimary,
                }}
              >
                Reduce Motion
              </span>
            </div>
            {/* Toggle Switch */}
            <div
              className="w-9 h-5 rounded-full relative transition-colors duration-200"
              style={{
                backgroundColor: reduceMotionEnabled ? COLORS.goldPrimary : 'rgba(100, 100, 100, 0.3)',
              }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
                style={{
                  backgroundColor: reduceMotionEnabled ? '#0a0a0c' : 'rgba(150, 150, 150, 0.8)',
                  transform: reduceMotionEnabled ? 'translateX(18px)' : 'translateX(2px)',
                }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Panel 2 - Install (Slides from behind Panel 1) */}
      <AnimatePresence>
        {panel2Visible && (
          <motion.div
            ref={panel2Ref}
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{
              duration: SLIDE_DURATION,
              ease: [0.4, 0, 0.2, 1]
            }}
            className="fixed z-40"
            style={{
              top: panel2Top,
              left: POSITION_LEFT,
              width: SIDEBAR_WIDTH,
              borderRadius: 16,
              backgroundColor: 'rgba(10, 10, 12, 0.95)',
              border: `1.5px solid ${COLORS.goldPrimary}`,
              boxShadow: `0 0 24px ${COLORS.goldGlow}`,
            }}
          >
            <div className="p-3">
              {/* Install PWA */}
              <button
                onClick={install}
                disabled={!canInstall}
                className="w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(201, 169, 97, 0.05)',
                  border: `1px solid transparent`,
                  opacity: canInstall ? 1 : 0.4,
                  cursor: canInstall ? 'pointer' : 'not-allowed',
                }}
                title={
                  isInstalled
                    ? 'App is already installed'
                    : !canInstall
                    ? 'Install not available - try opening in Chrome or Safari'
                    : 'Install app to your device'
                }
                onMouseEnter={(e) => {
                  if (canInstall) {
                    e.currentTarget.style.borderColor = COLORS.goldPrimary;
                    e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.05)';
                }}
              >
                {/* Download/Check Icon */}
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
                  {isInstalled ? (
                    <path d="M20 6L9 17l-5-5" />
                  ) : (
                    <>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </>
                  )}
                </svg>
                <span
                  className="text-sm"
                  style={{
                    fontFamily: FONTS.notoSans,
                    color: COLORS.goldPrimary,
                  }}
                >
                  {isInstalled ? 'App Installed' : 'Install App'}
                </span>
              </button>

              {/* About Button */}
              <button
                onClick={handleOpenAbout}
                className="w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 mt-2"
                style={{
                  backgroundColor: 'rgba(201, 169, 97, 0.05)',
                  border: `1px solid transparent`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = COLORS.goldPrimary;
                  e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.05)';
                }}
              >
                {/* Info Icon */}
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span
                  className="text-sm"
                  style={{
                    fontFamily: FONTS.notoSans,
                    color: COLORS.goldPrimary,
                  }}
                >
                  About
                </span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 mt-2"
                style={{
                  backgroundColor: 'rgba(201, 169, 97, 0.05)',
                  border: `1px solid transparent`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = COLORS.goldPrimary;
                  e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.05)';
                }}
              >
                {/* Share Icon */}
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
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span
                  className="text-sm"
                  style={{
                    fontFamily: FONTS.notoSans,
                    color: COLORS.goldPrimary,
                  }}
                >
                  Share
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel 3 - API + Cache (Slides from behind Panel 2) */}
      <AnimatePresence>
        {panel3Visible && (
          <motion.div
            initial={{ y: -150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -150, opacity: 0 }}
            transition={{
              duration: SLIDE_DURATION,
              ease: [0.4, 0, 0.2, 1]
            }}
            className="fixed z-[35]"
            style={{
              top: panel3Top,
              left: POSITION_LEFT,
              width: SIDEBAR_WIDTH,
              borderRadius: 16,
              backgroundColor: 'rgba(10, 10, 12, 0.95)',
              border: `1.5px solid ${COLORS.goldPrimary}`,
              boxShadow: `0 0 24px ${COLORS.goldGlow}`,
            }}
          >
            <div className="p-3">
              {/* API Status */}
              <div className="mb-3 pb-3 border-b" style={{ borderColor: 'rgba(201, 169, 97, 0.3)' }}>
                <div
                  className="text-xs uppercase tracking-widest mb-2 opacity-60"
                  style={{
                    fontFamily: FONTS.notoSans,
                    color: COLORS.goldPrimary,
                  }}
                >
                  API Status
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Status Dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          apiStatus === 'connected'
                            ? '#22c55e'
                            : apiStatus === 'checking'
                            ? '#eab308'
                            : '#ef4444',
                        boxShadow:
                          apiStatus === 'connected'
                            ? '0 0 8px #22c55e'
                            : apiStatus === 'checking'
                            ? '0 0 8px #eab308'
                            : '0 0 8px #ef4444',
                      }}
                    />
                    <div className="flex flex-col">
                      <span
                        className="text-sm"
                        style={{
                          fontFamily: FONTS.notoSans,
                          color: COLORS.goldPrimary,
                        }}
                      >
                        {apiStatus === 'connected'
                          ? 'Connected'
                          : apiStatus === 'checking'
                          ? 'Checking...'
                          : 'Disconnected'}
                      </span>
                      {apiStatus === 'connected' && apiSource && (
                        <span
                          className="text-xs opacity-60"
                          style={{
                            fontFamily: FONTS.notoSans,
                            color: COLORS.goldPrimary,
                          }}
                        >
                          {apiSource === 'direct-api' && 'via your browser'}
                          {apiSource === 'edge-config' && 'synced via server'}
                          {apiSource === 'warframestat' && 'via warframestat.us'}
                          {apiSource === 'warframe-api' && 'via Warframe API'}
                          {apiSource === 'localStorage' && 'from saved data'}
                          {apiSource === 'calculated' && 'using local calc'}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Reconnect Button */}
                  <button
                    onClick={checkConnection}
                    disabled={apiStatus === 'checking'}
                    className="p-1.5 rounded transition-all duration-200"
                    style={{
                      opacity: apiStatus === 'checking' ? 0.4 : 1,
                      cursor: apiStatus === 'checking' ? 'not-allowed' : 'pointer',
                    }}
                    title="Check connection"
                    onMouseEnter={(e) => {
                      if (apiStatus !== 'checking') {
                        e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* Refresh Icon */}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={COLORS.goldPrimary}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={apiStatus === 'checking' ? 'animate-spin' : ''}
                    >
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Clear Cache */}
              <button
                onClick={clearCache}
                className="w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(201, 169, 97, 0.05)',
                  border: `1px solid transparent`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = COLORS.goldPrimary;
                  e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.backgroundColor = 'rgba(201, 169, 97, 0.05)';
                }}
              >
                {/* Refresh Icon */}
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
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                <span
                  className="text-sm"
                  style={{
                    fontFamily: FONTS.notoSans,
                    color: COLORS.goldPrimary,
                  }}
                >
                  Clear Cache
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={handleCloseAbout} />
    </>
  );
}
