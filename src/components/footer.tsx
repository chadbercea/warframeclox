'use client';

import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';

export function Footer() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <footer className="mt-8 text-center text-xs text-muted-foreground">
      <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
        <WifiOff className="w-3 h-3" />
        <span>Offline - using cached data</span>
      </div>
    </footer>
  );
}
