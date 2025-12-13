'use client';

import { useState, useEffect, useCallback } from 'react';

export type ApiStatus = 'connected' | 'disconnected' | 'checking';

export interface UseApiStatusReturn {
  status: ApiStatus;
  lastChecked: Date | null;
  checkConnection: () => Promise<void>;
}

const CHECK_INTERVAL = 60 * 1000; // Check every 60 seconds

export function useApiStatus(): UseApiStatusReturn {
  const [status, setStatus] = useState<ApiStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnection = useCallback(async () => {
    setStatus('checking');

    try {
      const response = await fetch('/api/cetus', {
        method: 'GET',
        cache: 'no-store',
      });

      if (response.ok) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch {
      setStatus('disconnected');
    }

    setLastChecked(new Date());
  }, []);

  // Initial check and periodic checks
  useEffect(() => {
    checkConnection();

    const interval = setInterval(checkConnection, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    status,
    lastChecked,
    checkConnection,
  };
}
