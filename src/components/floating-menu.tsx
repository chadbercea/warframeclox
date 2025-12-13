'use client';

import { useState, useCallback } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useApiStatus } from '@/hooks/use-api-status';

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
const SIDEBAR_HEIGHT = 480;
const POSITION_TOP = 16;
const POSITION_LEFT = 16;

export function FloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { isSupported, isEnabled, permission, toggleNotifications } = useNotifications();
  const { canInstall, install, isInstalled } = usePWAInstall();
  const { status: apiStatus, checkConnection } = useApiStatus();

  const clearCache = useCallback(async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      window.location.reload();
    }
  }, []);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onClick={() => setIsOpen(false)}
      />

      {/* Morphing container - circle to sidebar */}
      <div
        className="fixed z-50 overflow-hidden"
        style={{
          top: POSITION_TOP,
          left: POSITION_LEFT,
          width: isOpen ? SIDEBAR_WIDTH : BUTTON_SIZE,
          height: isOpen ? SIDEBAR_HEIGHT : BUTTON_SIZE,
          borderRadius: isOpen ? 16 : BUTTON_SIZE / 2,
          backgroundColor: 'rgba(10, 10, 12, 0.95)',
          border: `1.5px solid ${COLORS.goldPrimary}`,
          boxShadow: isOpen ? `0 0 24px ${COLORS.goldGlow}` : 'none',
          transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          transformOrigin: 'top left',
        }}
      >
        {/* Hamburger / X button - always in same position */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute flex items-center justify-center transition-all duration-200 hover:scale-105 cursor-pointer"
          style={{
            top: 0,
            left: 0,
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            zIndex: 10,
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

        {/* Sidebar content - fades in when open */}
        <div
          className="absolute left-0 right-0 bottom-0 px-4 pb-4 transition-opacity duration-300"
          style={{
            top: BUTTON_SIZE + 8,
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        >
          {/* App Title */}
          <div className="mb-4 pb-4 border-b" style={{ borderColor: 'rgba(201, 169, 97, 0.3)' }}>
            <h1
              className="text-2xl tracking-wider"
              style={{
                fontFamily: FONTS.ailerons,
                color: COLORS.goldPrimary,
              }}
            >
              WARFRAME CLOX
            </h1>
          </div>

          {/* API Status */}
          <div className="mb-4 pb-4 border-b" style={{ borderColor: 'rgba(201, 169, 97, 0.3)' }}>
            <div
              className="text-xs uppercase tracking-widest mb-3 opacity-60"
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

          {/* Menu Items */}
          <nav>
            <div
              className="text-xs uppercase tracking-widest mb-3 opacity-60"
              style={{
                fontFamily: FONTS.notoSans,
                color: COLORS.goldPrimary,
              }}
            >
              Settings
            </div>

            {/* Notifications Toggle */}
            {isSupported && (
              <button
                onClick={toggleNotifications}
                disabled={permission === 'denied'}
                className="w-full flex items-center justify-between p-3 rounded-lg mb-2 transition-all duration-200"
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
                    {!isEnabled && <line x1="1" y1="1" x2="23" y2="23" />}
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
                    backgroundColor: isEnabled ? COLORS.goldPrimary : 'rgba(201, 169, 97, 0.2)',
                  }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200"
                    style={{
                      backgroundColor: isEnabled ? '#0a0a0c' : COLORS.goldPrimary,
                      transform: isEnabled ? 'translateX(18px)' : 'translateX(2px)',
                    }}
                  />
                </div>
              </button>
            )}

            {/* Permission denied message */}
            {isSupported && permission === 'denied' && (
              <p
                className="text-xs px-3 mb-3 opacity-50"
                style={{
                  fontFamily: FONTS.notoSans,
                  color: COLORS.goldPrimary,
                }}
              >
                Enable in browser settings
              </p>
            )}

            {/* Install PWA */}
            <button
              onClick={install}
              disabled={!canInstall}
              className="w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-all duration-200"
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

            {/* Clear Cache */}
            <button
              onClick={clearCache}
              className="w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-all duration-200"
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
          </nav>

          {/* Footer */}
          <div
            className="absolute bottom-0 left-0 right-0 p-3 border-t"
            style={{ borderColor: 'rgba(201, 169, 97, 0.2)' }}
          >
            <p
              className="text-xs opacity-40 text-center"
              style={{
                fontFamily: FONTS.notoSans,
                color: COLORS.goldPrimary,
              }}
            >
              Plains of Eidolon Cycle Tracker
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
