'use client';

import { useState, useEffect, useCallback } from 'react';

export type ApiStatus = 'connected' | 'disconnected' | 'checking';
export type DataSource = 'edge-config' | 'warframestat' | 'warframe-api' | 'calculated' | null;

export interface UseApiStatusReturn {
  status: ApiStatus;
  source: DataSource;
  responseTime: number | null;
  lastChecked: Date | null;
  checkConnection: () => Promise<void>;
}

const CHECK_INTERVAL = 60 * 1000; // Check every 60 seconds

export function useApiStatus(): UseApiStatusReturn {
  const [status, setStatus] = useState<ApiStatus>('checking');
  const [source, setSource] = useState<DataSource>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkConnection = useCallback(async () => {
    setStatus('checking');

    try {
      const response = await fetch('/api/cetus', {
        method: 'GET',
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        setStatus('connected');
        setSource(data.source || null);
        setResponseTime(data.responseTime || null);
      } else {
        setStatus('disconnected');
        setSource(null);
        setResponseTime(null);
      }
    } catch {
      setStatus('disconnected');
      setSource(null);
      setResponseTime(null);
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
    source,
    responseTime,
    lastChecked,
    checkConnection,
  };
}
