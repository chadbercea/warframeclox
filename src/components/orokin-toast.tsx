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
  const duration = toast.duration || 5000;
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
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="relative overflow-hidden pointer-events-auto"
      style={{
        background: 'linear-gradient(135deg, rgba(10, 10, 12, 0.95) 0%, rgba(20, 18, 24, 0.95) 100%)',
        border: `1px solid ${COLORS.goldPrimary}`,
        borderRadius: '2px',
        minWidth: '280px',
        maxWidth: '360px',
        boxShadow: `0 0 20px ${COLORS.goldGlow}, inset 0 0 30px rgba(0, 0, 0, 0.5)`,
      }}
    >
      {/* Corner accents */}
      <svg
        className="absolute top-0 left-0 w-4 h-4"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M0 0 L16 0 L16 2 L2 2 L2 16 L0 16 Z"
          fill={COLORS.goldPrimary}
        />
      </svg>
      <svg
        className="absolute top-0 right-0 w-4 h-4"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M16 0 L0 0 L0 2 L14 2 L14 16 L16 16 Z"
          fill={COLORS.goldPrimary}
        />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-4 h-4"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M0 16 L16 16 L16 14 L2 14 L2 0 L0 0 Z"
          fill={COLORS.goldPrimary}
        />
      </svg>
      <svg
        className="absolute bottom-0 right-0 w-4 h-4"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path
          d="M16 16 L0 16 L0 14 L14 14 L14 0 L16 0 Z"
          fill={COLORS.goldPrimary}
        />
      </svg>

      {/* Content */}
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center"
          style={{
            border: `1px solid ${COLORS.goldPrimary}`,
            borderRadius: '2px',
            background: 'rgba(201, 169, 97, 0.1)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
            {toast.icon === 'sun' ? (
              <>
                <circle cx="32" cy="32" r="10" fill={COLORS.goldPrimary} />
                <g stroke={COLORS.goldPrimary} strokeWidth="2.5" strokeLinecap="round">
                  <line x1="32" y1="8" x2="32" y2="16" />
                  <line x1="32" y1="48" x2="32" y2="56" />
                  <line x1="8" y1="32" x2="16" y2="32" />
                  <line x1="48" y1="32" x2="56" y2="32" />
                  <line x1="14.5" y1="14.5" x2="20.2" y2="20.2" />
                  <line x1="43.8" y1="43.8" x2="49.5" y2="49.5" />
                  <line x1="14.5" y1="49.5" x2="20.2" y2="43.8" />
                  <line x1="43.8" y1="20.2" x2="49.5" y2="14.5" />
                </g>
              </>
            ) : (
              <path
                d="M 38 16 C 28 16, 20 24, 20 32 C 20 40, 28 48, 38 48 C 32 44, 28 38, 28 32 C 28 26, 32 20, 38 16 Z"
                fill={COLORS.goldPrimary}
              />
            )}
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3
            style={{
              fontFamily: FONTS.flareserif,
              color: COLORS.goldPrimary,
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              marginBottom: '4px',
            }}
          >
            {toast.title}
          </h3>
          <p
            style={{
              fontFamily: FONTS.notoSans,
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '12px',
              lineHeight: 1.4,
            }}
          >
            {toast.message}
          </p>
        </div>
      </div>

      {/* Decay progress bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: 'rgba(201, 169, 97, 0.2)',
        }}
      >
        <motion.div
          className="h-full"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${COLORS.goldPrimary} 0%, rgba(201, 169, 97, 0.6) 100%)`,
            boxShadow: `0 0 8px ${COLORS.goldGlow}`,
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
      style={{ maxWidth: '400px' }}
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
