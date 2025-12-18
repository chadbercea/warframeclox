'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'warframeclox_reduce_motion';

export function useReduceMotion() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const enabled = saved === 'true';
    setIsEnabled(enabled);
  }, []);

  const toggleReduceMotion = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      window.location.reload();
      return next;
    });
  }, []);

  return { isEnabled, toggleReduceMotion };
}

// Utility to read current state from localStorage (for non-React contexts)
export function getReduceMotionEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}
