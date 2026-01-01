/**
 * Service Worker Registration for PWA
 * Registers the service worker for offline functionality and caching
 */

import { registerSW } from 'virtual:pwa-register';

/**
 * Register the service worker with auto-update
 */
export function registerServiceWorker() {
  // Check if service workers are supported
  if ('serviceWorker' in navigator) {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Show a prompt to the user to refresh the page
        if (confirm('New content available. Reload to update?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log('App ready to work offline');
        // Optionally show a message to the user
        showOfflineReadyMessage();
      },
      onRegistered(registration) {
        console.log('Service Worker registered:', registration);
      },
      onRegisterError(error) {
        console.error('Service Worker registration failed:', error);
      },
    });
  }
}

/**
 * Show a message to the user that the app is ready to work offline
 */
function showOfflineReadyMessage() {
  // You can use your toast notification system here
  // For now, just log to console
  console.info('✅ App is ready to work offline!');
}

/**
 * Unregister service worker (for development/testing)
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('Service Worker unregistered');
  }
}

/**
 * Check if the app is running as a PWA (installed)
 */
export function isPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Show install prompt for PWA
 */
export function setupInstallPrompt() {
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Update UI to notify the user they can install the PWA
    showInstallPromotion();
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
  });

  return {
    showInstallPrompt: async () => {
      if (!deferredPrompt) {
        return false;
      }
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // Clear the deferred prompt
      deferredPrompt = null;
      return outcome === 'accepted';
    },
  };
}

/**
 * Show install promotion UI
 * This should be implemented in your UI layer
 */
function showInstallPromotion() {
  console.info('💡 App can be installed!');
  // Implement your UI logic here to show an install banner/button
}
