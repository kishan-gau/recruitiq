import { useEffect, useState } from 'react';

import { offlineQueue, QueuedAction } from '@/services/offlineStorage';

/**
 * Hook to track online/offline status
 * 
 * Features:
 * - Monitors network connectivity
 * - Triggers sync when coming back online
 * - Provides offline indicator
 * 
 * From PWA Proposal Phase 3: Offline Functionality
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Network: Back online');
      setIsOnline(true);
      setWasOffline(true);
      
      // Trigger background sync if supported
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then((registration) => {
          return registration.sync.register('sync-offline-queue');
        }).catch((err) => {
          console.error('Background sync registration failed:', err);
        });
      }
    };

    const handleOffline = () => {
      console.log('Network: Offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Reset wasOffline flag after a short delay
  useEffect(() => {
    if (wasOffline && isOnline) {
      const timer = setTimeout(() => {
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline]);

  return { isOnline, wasOffline };
}

/**
 * Hook to manage offline queue sync
 */
export function useOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  /**
   * Sync offline queue with server
   */
  const syncQueue = async () => {
    setIsSyncing(true);
    setSyncStatus(null);

    try {
      const result = await offlineQueue.processQueue(async (action: QueuedAction) => {
        // Process each queued action based on type
        switch (action.type) {
          case 'clock-in':
          case 'clock-out':
            // TODO: Call clock-in/out API
            console.log('Syncing clock action:', action);
            break;
            
          case 'time-off-request':
            // TODO: Call time-off request API
            console.log('Syncing time-off request:', action);
            break;
            
          case 'profile-update':
            // TODO: Call profile update API
            console.log('Syncing profile update:', action);
            break;
            
          default:
            console.warn('Unknown action type:', action.type);
        }
      });

      setSyncStatus(result);
      console.log('Offline queue synced:', result);
    } catch (error) {
      console.error('Failed to sync offline queue:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return { syncQueue, isSyncing, syncStatus };
}

/**
 * Hook to manage offline data caching
 */
export function useOfflineCache() {
  const [cacheStatus, setCacheStatus] = useState<'idle' | 'caching' | 'cached'>('idle');

  /**
   * Cache data for offline use
   */
  const cacheData = async (type: 'payslips' | 'schedules', data: any) => {
    setCacheStatus('caching');
    
    try {
      // Import storage modules dynamically to avoid circular deps
      const { payslipStorage, scheduleStorage } = await import('@/services/offlineStorage');
      
      if (type === 'payslips') {
        await payslipStorage.savePayslip(data);
      } else if (type === 'schedules') {
        await scheduleStorage.saveSchedule(data);
      }
      
      setCacheStatus('cached');
      
      // Reset status after delay
      setTimeout(() => setCacheStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to cache data:', error);
      setCacheStatus('idle');
    }
  };

  return { cacheData, cacheStatus };
}
