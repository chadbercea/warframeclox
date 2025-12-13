'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCetusCycleState, NOTIFICATION_WARNING_TIME } from '@/lib/cetus-cycle';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  isEnabled: boolean;
  requestPermission: () => Promise<void>;
  toggleNotifications: () => Promise<void>;
}

const STORAGE_KEY = 'warframeclox_notifications_enabled';

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const lastNotificationRef = useRef<string | null>(null);
  const warningNotifiedRef = useRef<string | null>(null);

  // Initialize on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission as NotificationPermission);

      // Restore user preference
      const savedPreference = localStorage.getItem(STORAGE_KEY);
      if (savedPreference === 'true' && Notification.permission === 'granted') {
        setIsEnabled(true);
      }
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return;

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);

      if (result === 'granted') {
        setIsEnabled(true);
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  }, [isSupported]);

  const toggleNotifications = useCallback(async () => {
    if (!isSupported) return;

    if (permission !== 'granted') {
      await requestPermission();
      return;
    }

    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem(STORAGE_KEY, String(newState));
  }, [isSupported, permission, isEnabled, requestPermission]);

  // Send notifications at appropriate times
  useEffect(() => {
    if (!isEnabled || !isSupported) return;

    const checkAndNotify = () => {
      const cycleState = getCetusCycleState();
      const cycleKey = `${cycleState.state}-${Math.floor(cycleState.nextCycleTime.getTime() / 60000)}`;
      const warningKey = `warning-${cycleKey}`;

      // Warning notification (5 minutes before transition)
      if (
        cycleState.timeLeftMs <= NOTIFICATION_WARNING_TIME &&
        cycleState.timeLeftMs > NOTIFICATION_WARNING_TIME - 60000 &&
        warningNotifiedRef.current !== warningKey
      ) {
        const nextState = cycleState.isDay ? 'Night' : 'Day';
        new Notification('Cetus Cycle Warning', {
          body: `${nextState} begins in 5 minutes!`,
          icon: cycleState.isDay ? '/moon-icon.svg' : '/sun-icon.svg',
          tag: 'cetus-warning',
          requireInteraction: false,
        });
        warningNotifiedRef.current = warningKey;
      }

      // Transition notification
      if (
        cycleState.timeLeftMs <= 1000 &&
        lastNotificationRef.current !== cycleKey
      ) {
        const currentState = cycleState.isDay ? 'Day' : 'Night';
        new Notification(`Cetus ${currentState} has begun!`, {
          body: `The Plains of Eidolon are now in ${currentState.toLowerCase()} time.`,
          icon: cycleState.isDay ? '/sun-icon.svg' : '/moon-icon.svg',
          tag: 'cetus-transition',
          requireInteraction: false,
        });
        lastNotificationRef.current = cycleKey;
      }
    };

    // Check immediately and then every second
    checkAndNotify();
    const interval = setInterval(checkAndNotify, 1000);

    return () => clearInterval(interval);
  }, [isEnabled, isSupported]);

  return {
    permission,
    isSupported,
    isEnabled,
    requestPermission,
    toggleNotifications,
  };
}
