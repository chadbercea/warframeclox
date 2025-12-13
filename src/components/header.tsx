'use client';

import { Bell, BellOff, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import { usePWAInstall } from '@/hooks/use-pwa-install';

export function Header() {
  const { isSupported, isEnabled, permission, toggleNotifications } = useNotifications();
  const { canInstall, install } = usePWAInstall();

  return (
    <header className="w-full py-4 px-4">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          Warframe Clox
        </h1>

        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          {canInstall && (
            <Button
              variant="ghost"
              size="icon"
              onClick={install}
              title="Install App"
              className="text-muted-foreground hover:text-foreground"
            >
              <Download className="w-5 h-5" />
            </Button>
          )}

          {/* Notifications Toggle */}
          {isSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleNotifications}
              title={
                permission === 'denied'
                  ? 'Notifications blocked - enable in browser settings'
                  : isEnabled
                  ? 'Disable notifications'
                  : 'Enable notifications'
              }
              className={`${
                permission === 'denied'
                  ? 'text-muted-foreground/50 cursor-not-allowed'
                  : isEnabled
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              disabled={permission === 'denied'}
            >
              {isEnabled ? (
                <Bell className="w-5 h-5" />
              ) : (
                <BellOff className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
