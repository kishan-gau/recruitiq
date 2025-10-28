/**
 * Analytics & Telemetry Tracking
 * 
 * This module provides event tracking for user actions and system events.
 * In production, events are sent to analytics backend (e.g., Google Analytics, Mixpanel, Segment)
 * In development, events are logged to console for debugging
 */

const ANALYTICS_ENABLED = import.meta.env.VITE_ANALYTICS_ENABLED !== 'false';
const ANALYTICS_ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT || '/api/analytics/events';
const DEBUG_MODE = import.meta.env.DEV;

// Event categories
export const EventCategory = {
  JOB: 'job',
  CANDIDATE: 'candidate',
  PORTAL: 'portal',
  APPLICATION: 'application',
  USER: 'user',
  SYSTEM: 'system',
};

// Event names for recruiter portal features
export const PortalEvents = {
  JOB_PUBLISHED: 'job_published',
  JOB_UNPUBLISHED: 'job_unpublished',
  JOB_URL_COPIED: 'job_url_copied',
  JOB_PREVIEWED: 'job_previewed',
  PORTAL_SETTINGS_OPENED: 'portal_settings_opened',
  PORTAL_SETTINGS_SAVED: 'portal_settings_saved',
  PORTAL_SETTINGS_CANCELLED: 'portal_settings_cancelled',
  CUSTOM_FIELD_ADDED: 'custom_field_added',
  CUSTOM_FIELD_REMOVED: 'custom_field_removed',
  PUBLIC_JOB_VIEWED: 'public_job_viewed',
  APPLICATION_SUBMITTED: 'application_submitted',
  APPLICATION_TRACKED: 'application_tracked',
};

// Queue for batching events
let eventQueue = [];
let flushTimeout = null;
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds

/**
 * Track an analytics event
 * @param {string} name - Event name (use PortalEvents constants)
 * @param {object} props - Event properties
 * @param {string} category - Event category (use EventCategory constants)
 */
export function trackEvent(name, props = {}, category = EventCategory.SYSTEM) {
  if (!ANALYTICS_ENABLED) {
    return;
  }

  const event = {
    name,
    category,
    timestamp: new Date().toISOString(),
    properties: {
      ...props,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    },
  };

  // Debug logging
  if (DEBUG_MODE) {
    console.debug('[Analytics]', name, event.properties);
  }

  // Add to queue
  eventQueue.push(event);

  // Flush if batch size reached
  if (eventQueue.length >= BATCH_SIZE) {
    flushEvents();
  } else {
    // Schedule flush
    if (flushTimeout) {
      clearTimeout(flushTimeout);
    }
    flushTimeout = setTimeout(flushEvents, FLUSH_INTERVAL);
  }

  // Also send to third-party analytics if available
  sendToThirdParty(name, event.properties);
}

/**
 * Flush queued events to backend
 */
async function flushEvents() {
  if (eventQueue.length === 0) {
    return;
  }

  const events = [...eventQueue];
  eventQueue = [];

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  try {
    await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });
  } catch (error) {
    console.error('[Analytics] Failed to send events:', error);
    // Re-queue events on failure (up to certain limit)
    if (eventQueue.length < 100) {
      eventQueue.push(...events);
    }
  }
}

/**
 * Send event to third-party analytics providers
 */
function sendToThirdParty(eventName, properties) {
  // Google Analytics
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, properties);
  }

  // Mixpanel
  if (typeof window.mixpanel === 'object') {
    window.mixpanel.track(eventName, properties);
  }

  // Segment
  if (typeof window.analytics === 'object') {
    window.analytics.track(eventName, properties);
  }

  // PostHog
  if (typeof window.posthog === 'object') {
    window.posthog.capture(eventName, properties);
  }
}

/**
 * Track page view
 * @param {string} pageName - Page name
 * @param {object} props - Additional properties
 */
export function trackPageView(pageName, props = {}) {
  trackEvent('page_view', {
    page: pageName,
    ...props,
  }, EventCategory.SYSTEM);
}

/**
 * Track job publishing
 */
export function trackJobPublished(jobId, jobTitle) {
  trackEvent(PortalEvents.JOB_PUBLISHED, {
    jobId,
    jobTitle,
  }, EventCategory.JOB);
}

/**
 * Track job unpublishing
 */
export function trackJobUnpublished(jobId, jobTitle) {
  trackEvent(PortalEvents.JOB_UNPUBLISHED, {
    jobId,
    jobTitle,
  }, EventCategory.JOB);
}

/**
 * Track public job URL copied
 */
export function trackJobUrlCopied(jobId, jobTitle) {
  trackEvent(PortalEvents.JOB_URL_COPIED, {
    jobId,
    jobTitle,
  }, EventCategory.JOB);
}

/**
 * Track job preview opened
 */
export function trackJobPreviewed(jobId, jobTitle) {
  trackEvent(PortalEvents.JOB_PREVIEWED, {
    jobId,
    jobTitle,
  }, EventCategory.JOB);
}

/**
 * Track portal settings modal opened
 */
export function trackPortalSettingsOpened(jobId) {
  trackEvent(PortalEvents.PORTAL_SETTINGS_OPENED, {
    jobId,
  }, EventCategory.PORTAL);
}

/**
 * Track portal settings saved
 */
export function trackPortalSettingsSaved(jobId, settings) {
  trackEvent(PortalEvents.PORTAL_SETTINGS_SAVED, {
    jobId,
    hasCompanyName: !!settings.companyName,
    hasCompanyLogo: !!settings.companyLogo,
    salaryPublic: settings.salaryPublic,
    customFieldCount: settings.customFields?.length || 0,
  }, EventCategory.PORTAL);
}

/**
 * Track portal settings cancelled
 */
export function trackPortalSettingsCancelled(jobId) {
  trackEvent(PortalEvents.PORTAL_SETTINGS_CANCELLED, {
    jobId,
  }, EventCategory.PORTAL);
}

/**
 * Track custom field added
 */
export function trackCustomFieldAdded(jobId, fieldType) {
  trackEvent(PortalEvents.CUSTOM_FIELD_ADDED, {
    jobId,
    fieldType,
  }, EventCategory.PORTAL);
}

/**
 * Track custom field removed
 */
export function trackCustomFieldRemoved(jobId, fieldType) {
  trackEvent(PortalEvents.CUSTOM_FIELD_REMOVED, {
    jobId,
    fieldType,
  }, EventCategory.PORTAL);
}

/**
 * Track public job page viewed (by candidates)
 */
export function trackPublicJobViewed(jobId, referrer = null) {
  trackEvent(PortalEvents.PUBLIC_JOB_VIEWED, {
    jobId,
    referrer: referrer || document.referrer,
  }, EventCategory.APPLICATION);
}

/**
 * Track application submitted
 */
export function trackApplicationSubmitted(jobId, source = 'public-portal') {
  trackEvent(PortalEvents.APPLICATION_SUBMITTED, {
    jobId,
    source,
  }, EventCategory.APPLICATION);
}

/**
 * Track application status checked
 */
export function trackApplicationTracked(trackingCode) {
  trackEvent(PortalEvents.APPLICATION_TRACKED, {
    trackingCode,
  }, EventCategory.APPLICATION);
}

/**
 * Track user action (generic)
 */
export function trackUserAction(action, props = {}) {
  trackEvent(action, props, EventCategory.USER);
}

/**
 * Track error
 */
export function trackError(error, context = {}) {
  trackEvent('error', {
    message: error.message,
    stack: error.stack,
    ...context,
  }, EventCategory.SYSTEM);
}

/**
 * Flush all pending events (call on page unload)
 */
export function flushAnalytics() {
  flushEvents();
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushAnalytics);
  window.addEventListener('pagehide', flushAnalytics);
}

export default {
  trackEvent,
  trackPageView,
  trackJobPublished,
  trackJobUnpublished,
  trackJobUrlCopied,
  trackJobPreviewed,
  trackPortalSettingsOpened,
  trackPortalSettingsSaved,
  trackPortalSettingsCancelled,
  trackCustomFieldAdded,
  trackCustomFieldRemoved,
  trackPublicJobViewed,
  trackApplicationSubmitted,
  trackApplicationTracked,
  trackUserAction,
  trackError,
  flushAnalytics,
  EventCategory,
  PortalEvents,
}
