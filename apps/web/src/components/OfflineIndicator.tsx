import { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

import { useOnlineStatus, useOfflineSync } from '@/hooks/useOffline';

/**
 * Offline Indicator Banner
 * Shows when user is offline and provides sync status
 * 
 * Features:
 * - Displays offline status
 * - Shows "Back online" notification
 * - Manual sync button
 * - Sync progress indicator
 * 
 * From PWA Proposal Phase 3: Offline Functionality
 */
export default function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const { syncQueue, isSyncing, syncStatus } = useOfflineSync();
  const [showBanner, setShowBanner] = useState(false);

  // Show banner when offline or when just came back online
  useEffect(() => {
    if (!isOnline || wasOffline) {
      setShowBanner(true);
    } else {
      // Hide banner after a delay when online
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline) {
      syncQueue();
    }
  }, [wasOffline, isOnline, syncQueue]);

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 safe-area-inset-top">
      {!isOnline ? (
        // Offline banner
        <div className="bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">You are offline</span>
        </div>
      ) : wasOffline ? (
        // Back online banner
        <div className="bg-green-500 text-white px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              <span className="text-sm font-medium">Back online</span>
            </div>
            
            {isSyncing ? (
              <div className="flex items-center gap-2 text-sm">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Syncing...</span>
              </div>
            ) : syncStatus ? (
              <div className="text-sm">
                {syncStatus.success > 0 && (
                  <span>{syncStatus.success} synced</span>
                )}
                {syncStatus.failed > 0 && (
                  <span className="ml-2">{syncStatus.failed} failed</span>
                )}
              </div>
            ) : (
              <button
                onClick={syncQueue}
                className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 
                         rounded text-sm font-medium touch-manipulation"
              >
                <RefreshCw className="h-3 w-3" />
                Sync now
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
