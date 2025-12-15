'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  isEnabled: boolean;
  requestPermission: () => Promise<void>;
  toggleNotifications: () => Promise<void>;
}

const STORAGE_KEY = 'warframeclox_notifications_enabled';
const NOTIFICATION_WARNING_TIME = 5 * 60 * 1000; // 5 minutes before transition

const CYCLE_LENGTH = 9000000;  // 150 minutes in ms
const DAY_LENGTH = 6000000;    // 100 minutes in ms
const NIGHT_LENGTH = 3000000;  // 50 minutes in ms

interface CycleData {
  cycleStart: number;
  cycleEnd: number;
  isDay: boolean;
  syncedAt?: number;
  source: string;
}

function calculateCycleState(cycleStart: number) {
  const now = Date.now();
  const elapsed = now - cycleStart;
  const positionInCycle = ((elapsed % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;
  const isDay = positionInCycle < DAY_LENGTH;

  let timeLeftMs: number;
  if (isDay) {
    timeLeftMs = DAY_LENGTH - positionInCycle;
  } else {
    const positionInNight = positionInCycle - DAY_LENGTH;
    timeLeftMs = NIGHT_LENGTH - positionInNight;
  }

  return {
    isDay,
    state: isDay ? 'day' : 'night',
    timeLeftMs,
    nextCycleTime: new Date(now + timeLeftMs),
  };
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [cycleStart, setCycleStart] = useState<number | null>(null);
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

  // Fetch cycle data
  useEffect(() => {
    const fetchCycle = async () => {
      try {
        const response = await fetch('/api/cetus');
        if (response.ok) {
          const data: CycleData = await response.json();
          setCycleStart(data.cycleStart);
        }
      } catch (error) {
        console.error('Failed to fetch cycle data:', error);
      }
    };

    fetchCycle();
    const interval = setInterval(fetchCycle, 5 * 60 * 1000);
    return () => clearInterval(interval);
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
    if (!isEnabled || !isSupported || cycleStart === null) return;

    const checkAndNotify = () => {
      const cycleState = calculateCycleState(cycleStart);
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
  }, [isEnabled, isSupported, cycleStart]);

  return {
    permission,
    isSupported,
    isEnabled,
    requestPermission,
    toggleNotifications,
  };
}
