'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = {
  goldPrimary: 'var(--color-gold-primary)',
  goldGlow: 'var(--color-gold-glow)',
};

const FONTS = {
  flareserif: 'var(--font-flareserif), serif',
  notoSans: 'var(--font-noto-sans), sans-serif',
};

export interface ToastData {
  id: string;
  title: string;
  message: string;
  icon: 'sun' | 'moon';
  duration?: number;
}

interface OrokinToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function OrokinToast({ toast, onDismiss }: OrokinToastProps) {
  const duration = toast.duration || 10000;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + duration;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const newProgress = (remaining / duration) * 100;
      setProgress(newProgress);

      if (remaining > 0) {
        requestAnimationFrame(updateProgress);
      } else {
        onDismiss(toast.id);
      }
    };

    const frameId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(frameId);
  }, [duration, onDismiss, toast.id]);

  return (
    <motion.div
      initial={{ x: 300, opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 300, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="relative overflow-hidden pointer-events-auto"
      style={{
        background: 'linear-gradient(135deg, rgba(8, 8, 10, 0.98) 0%, rgba(18, 16, 22, 0.98) 50%, rgba(12, 10, 16, 0.98) 100%)',
        border: `2px solid ${COLORS.goldPrimary}`,
        borderRadius: '4px',
        minWidth: '320px',
        maxWidth: '400px',
        boxShadow: `
          0 0 30px ${COLORS.goldGlow},
          0 0 60px rgba(201, 169, 97, 0.15),
          inset 0 0 40px rgba(0, 0, 0, 0.6),
          inset 0 1px 0 rgba(201, 169, 97, 0.2)
        `,
      }}
    >
      {/* Decorative top border line with glow */}
      <div
        className="absolute top-0 left-4 right-4 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${COLORS.goldPrimary} 20%, ${COLORS.goldPrimary} 80%, transparent 100%)`,
          boxShadow: `0 0 10px ${COLORS.goldGlow}`,
        }}
      />

      {/* Enhanced corner accents - Orokin style brackets */}
      <svg
        className="absolute top-0 left-0 w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M0 0 L24 0 L24 3 L3 3 L3 24 L0 24 Z"
          fill={COLORS.goldPrimary}
        />
        <path
          d="M6 6 L18 6 L18 8 L8 8 L8 18 L6 18 Z"
          fill={COLORS.goldPrimary}
          opacity={0.5}
        />
      </svg>
      <svg
        className="absolute top-0 right-0 w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M24 0 L0 0 L0 3 L21 3 L21 24 L24 24 Z"
          fill={COLORS.goldPrimary}
        />
        <path
          d="M18 6 L6 6 L6 8 L16 8 L16 18 L18 18 Z"
          fill={COLORS.goldPrimary}
          opacity={0.5}
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M0 24 L24 24 L24 21 L3 21 L3 0 L0 0 Z"
          fill={COLORS.goldPrimary}
        />
        <path
          d="M6 18 L18 18 L18 16 L8 16 L8 6 L6 6 Z"
          fill={COLORS.goldPrimary}
          opacity={0.5}
        />
      </svg>
      <svg
        className="absolute bottom-0 right-0 w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M24 24 L0 24 L0 21 L21 21 L21 0 L24 0 Z"
          fill={COLORS.goldPrimary}
        />
        <path
          d="M18 18 L6 18 L6 16 L16 16 L16 6 L18 6 Z"
          fill={COLORS.goldPrimary}
          opacity={0.5}
        />
      </svg>

      {/* Decorative side accents */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${COLORS.goldPrimary} 30%, ${COLORS.goldPrimary} 70%, transparent 100%)`,
          boxShadow: `0 0 8px ${COLORS.goldGlow}`,
        }}
      />
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${COLORS.goldPrimary} 30%, ${COLORS.goldPrimary} 70%, transparent 100%)`,
          boxShadow: `0 0 8px ${COLORS.goldGlow}`,
        }}
      />

      {/* Content */}
      <div className="flex items-start gap-4 p-5 pt-6">
        {/* Enhanced Icon - More prominent with glow */}
        <div
          className="flex-shrink-0 w-14 h-14 flex items-center justify-center relative"
          style={{
            border: `2px solid ${COLORS.goldPrimary}`,
            borderRadius: '4px',
            background: 'linear-gradient(135deg, rgba(201, 169, 97, 0.15) 0%, rgba(201, 169, 97, 0.05) 100%)',
            boxShadow: `
              0 0 20px ${COLORS.goldGlow},
              inset 0 0 15px rgba(201, 169, 97, 0.1)
            `,
          }}
        >
          {/* Icon glow backdrop */}
          <div
            className="absolute inset-0 rounded"
            style={{
              background: `radial-gradient(circle at center, ${COLORS.goldGlow} 0%, transparent 70%)`,
              opacity: 0.5,
            }}
          />
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none" className="relative z-10">
            <defs>
              <filter id="iconGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {toast.icon === 'sun' ? (
              <g filter="url(#iconGlow)">
                <circle cx="32" cy="32" r="12" fill={COLORS.goldPrimary} />
                <g stroke={COLORS.goldPrimary} strokeWidth="3" strokeLinecap="round">
                  <line x1="32" y1="4" x2="32" y2="14" />
                  <line x1="32" y1="50" x2="32" y2="60" />
                  <line x1="4" y1="32" x2="14" y2="32" />
                  <line x1="50" y1="32" x2="60" y2="32" />
                  <line x1="12" y1="12" x2="19" y2="19" />
                  <line x1="45" y1="45" x2="52" y2="52" />
                  <line x1="12" y1="52" x2="19" y2="45" />
                  <line x1="45" y1="19" x2="52" y2="12" />
                </g>
              </g>
            ) : (
              <g filter="url(#iconGlow)">
                <path
                  d="M 40 12 C 26 12, 16 22, 16 34 C 16 46, 26 56, 40 56 C 32 50, 26 42, 26 34 C 26 26, 32 18, 40 12 Z"
                  fill={COLORS.goldPrimary}
                />
                {/* Moon glow accent */}
                <circle cx="22" cy="28" r="2" fill={COLORS.goldPrimary} opacity={0.6} />
                <circle cx="28" cy="44" r="1.5" fill={COLORS.goldPrimary} opacity={0.4} />
              </g>
            )}
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3
            style={{
              fontFamily: FONTS.flareserif,
              color: COLORS.goldPrimary,
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              marginBottom: '6px',
              textShadow: `0 0 10px ${COLORS.goldGlow}`,
              textTransform: 'uppercase',
            }}
          >
            {toast.title}
          </h3>
          <p
            style={{
              fontFamily: FONTS.notoSans,
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '13px',
              lineHeight: 1.5,
              letterSpacing: '0.02em',
            }}
          >
            {toast.message}
          </p>
        </div>
      </div>

      {/* Decorative bottom line above progress bar */}
      <div
        className="absolute bottom-3 left-4 right-4 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(201, 169, 97, 0.3) 20%, rgba(201, 169, 97, 0.3) 80%, transparent 100%)`,
        }}
      />

      {/* Decay progress bar - enhanced */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1.5"
        style={{
          background: 'rgba(201, 169, 97, 0.15)',
        }}
      >
        <motion.div
          className="h-full"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${COLORS.goldPrimary} 0%, rgba(201, 169, 97, 0.8) 50%, rgba(201, 169, 97, 0.6) 100%)`,
            boxShadow: `0 0 12px ${COLORS.goldGlow}, 0 0 4px ${COLORS.goldPrimary}`,
          }}
        />
      </div>
    </motion.div>
  );
}

// Toast container that renders in bottom-right
interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function OrokinToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed bottom-4 right-4 flex flex-col gap-3 z-50 pointer-events-none"
      style={{ maxWidth: '420px' }}
    >
      <AnimatePresence mode="sync">
        {toasts.map((toast) => (
          <OrokinToast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Hook for managing toasts
export function useOrokinToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
