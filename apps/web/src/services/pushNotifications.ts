/**
 * Push Notifications Service
 * Manages push notification subscriptions and messaging
 * 
 * Features:
 * - Request notification permission
 * - Subscribe to push notifications
 * - Unsubscribe from notifications
 * - Handle notification preferences
 * 
 * From PWA Proposal Phase 3: Push Notifications
 */

// VAPID public key - TODO: Replace with actual key from backend
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window &&
         'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission denied');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    // Request permission first
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // TODO: Send subscription to backend
    console.log('Push subscription:', subscription);

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      // TODO: Remove subscription from backend
      console.log('Unsubscribed from push');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Failed to get push subscription:', error);
    return null;
  }
}

/**
 * Show a local notification (for testing)
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Notifications not supported');
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    ...options,
  });
}

/**
 * Notification types and their default settings
 */
export const NOTIFICATION_TYPES = {
  SCHEDULE_REMINDER: {
    title: 'Schedule Reminder',
    icon: '/icons/icon-192x192.png',
    tag: 'schedule-reminder',
  },
  PAYROLL: {
    title: 'Payroll Update',
    icon: '/icons/icon-192x192.png',
    tag: 'payroll',
  },
  HR_ANNOUNCEMENT: {
    title: 'HR Announcement',
    icon: '/icons/icon-192x192.png',
    tag: 'hr-announcement',
  },
  ACTION_REQUIRED: {
    title: 'Action Required',
    icon: '/icons/icon-192x192.png',
    tag: 'action-required',
    requireInteraction: true,
  },
} as const;

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  scheduleReminders: boolean;
  payrollUpdates: boolean;
  hrAnnouncements: boolean;
  actionRequired: boolean;
}

const PREFERENCES_KEY = 'notification_preferences';

/**
 * Save notification preferences
 */
export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

/**
 * Load notification preferences
 */
export function loadNotificationPreferences(): NotificationPreferences {
  const stored = localStorage.getItem(PREFERENCES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse notification preferences:', error);
    }
  }

  // Default preferences
  return {
    scheduleReminders: true,
    payrollUpdates: true,
    hrAnnouncements: true,
    actionRequired: true,
  };
}
