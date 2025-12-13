'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getCetusCycleState, syncCetusCycle, formatNextCycleTime, type CetusCycleState } from '@/lib/cetus-cycle';
import { Sun, Moon } from 'lucide-react';

export function CetusCycleCard() {
  const [cycleState, setCycleState] = useState<CetusCycleState | null>(null);
  const [mounted, setMounted] = useState(false);

  const updateCycleState = useCallback(() => {
    setCycleState(getCetusCycleState());
  }, []);

  useEffect(() => {
    setMounted(true);

    // Initial sync with API
    syncCetusCycle().then(() => {
      updateCycleState();
    });

    // Update display every second
    const displayInterval = setInterval(updateCycleState, 1000);

    // Sync with API every 5 minutes
    const syncInterval = setInterval(() => {
      syncCetusCycle();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(displayInterval);
      clearInterval(syncInterval);
    };
  }, [updateCycleState]);

  // Prevent hydration mismatch
  if (!mounted || !cycleState) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">
            <div className="h-16 bg-muted rounded mb-4"></div>
            <div className="h-8 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { isDay, timeLeftFormatted, nextCycleTime, percentComplete } = cycleState;

  return (
    <Card
      className={`w-full max-w-md mx-auto overflow-hidden transition-colors duration-500 ${
        isDay
          ? 'bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800'
          : 'bg-gradient-to-br from-slate-900 to-indigo-950 border-indigo-800'
      }`}
    >
      <CardContent className="p-8">
        {/* Cycle State Icon and Text */}
        <div className="flex flex-col items-center mb-6">
          <div className={`p-4 rounded-full mb-4 ${
            isDay
              ? 'bg-amber-400/20 text-amber-600 dark:text-amber-400'
              : 'bg-indigo-400/20 text-indigo-200'
          }`}>
            {isDay ? (
              <Sun className="w-16 h-16" strokeWidth={1.5} />
            ) : (
              <Moon className="w-16 h-16" strokeWidth={1.5} />
            )}
          </div>
          <h2 className={`text-4xl font-bold tracking-wide ${
            isDay
              ? 'text-amber-800 dark:text-amber-200'
              : 'text-indigo-100'
          }`}>
            {isDay ? 'DAY' : 'NIGHT'}
          </h2>
          <p className={`text-sm mt-1 ${
            isDay
              ? 'text-amber-600/70 dark:text-amber-400/70'
              : 'text-indigo-300/70'
          }`}>
            Plains of Eidolon
          </p>
        </div>

        {/* Countdown Timer */}
        <div className="text-center mb-6">
          <p className={`text-sm uppercase tracking-wider mb-2 ${
            isDay
              ? 'text-amber-700/60 dark:text-amber-300/60'
              : 'text-indigo-300/60'
          }`}>
            Time Remaining
          </p>
          <p className={`text-5xl font-mono font-bold tabular-nums ${
            isDay
              ? 'text-amber-900 dark:text-amber-100'
              : 'text-white'
          }`}>
            {timeLeftFormatted}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className={`h-2 rounded-full overflow-hidden ${
            isDay
              ? 'bg-amber-200 dark:bg-amber-900/50'
              : 'bg-indigo-900/50'
          }`}>
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isDay
                  ? 'bg-amber-500'
                  : 'bg-indigo-400'
              }`}
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Next Cycle Info */}
        <div className="text-center">
          <p className={`text-sm ${
            isDay
              ? 'text-amber-700/70 dark:text-amber-300/70'
              : 'text-indigo-300/70'
          }`}>
            {isDay ? 'Night' : 'Day'} begins at{' '}
            <span className="font-semibold">
              {formatNextCycleTime(nextCycleTime)}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
