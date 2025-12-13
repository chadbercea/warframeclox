'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useCacheClear } from '@/hooks/use-cache-clear';

export function Footer() {
  const isOnline = useOnlineStatus();
  const { clearCache, isClearing } = useCacheClear();

  return (
    <footer className="mt-8 text-center text-xs text-muted-foreground space-y-2">
      {!isOnline && (
        <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
          <WifiOff className="w-3 h-3" />
          <span>Offline - using cached data</span>
        </div>
      )}
      <p>Not affiliated with Digital Extremes</p>
      <button
        onClick={clearCache}
        disabled={isClearing}
        className="text-muted-foreground/60 hover:text-muted-foreground underline-offset-2 hover:underline transition-colors disabled:opacity-50"
      >
        {isClearing ? 'Clearing...' : 'Clear cache'}
      </button>
    </footer>
  );
}
