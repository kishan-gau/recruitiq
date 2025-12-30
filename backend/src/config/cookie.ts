/**
 * Centralized Cookie Configuration
 * Single source of truth for cookie settings across all auth controllers
 * 
 * Benefits:
 * - DRY principle: no duplication in auth controllers
 * - Easy maintenance: change cookie settings in ONE place
 * - Consistent behavior: all cookies use same security settings
 * - Environment-aware: automatically adjusts for dev/prod
 */

import config from './index.ts';

/**
 * Get cookie configuration based on token type
 * 
 * @param {string} type - Cookie type: 'access', 'refresh', or 'platform_access', 'platform_refresh'
 * @param {Object} options - Optional overrides
 * @returns {Object} Cookie configuration object
 */
export function getCookieConfig(type = 'access', options = {}) {
  // Base configuration (common to all cookies)
  const baseConfig = {
    httpOnly: true, // Prevent XSS attacks
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/'
  };

  // Only add domain if it's not empty (for same-origin cookies, omit domain entirely)
  if (config.cookie.domain && config.cookie.domain.trim() !== '') {
    baseConfig.domain = config.cookie.domain;
  }

  // Token-specific configurations
  const typeConfigs = {
    // Tenant access token (short-lived)
    access: {
      maxAge: 15 * 60 * 1000 // 15 minutes
    },
    
    // Tenant refresh token (long-lived, supports "remember me")
    refresh: {
      maxAge: options.rememberMe 
        ? 30 * 24 * 60 * 60 * 1000  // 30 days
        : 7 * 24 * 60 * 60 * 1000   // 7 days
    },
    
    // Platform access token (short-lived)
    platform_access: {
      maxAge: 15 * 60 * 1000 // 15 minutes
    },
    
    // Platform refresh token (long-lived)
    platform_refresh: {
      maxAge: options.rememberMe 
        ? 30 * 24 * 60 * 60 * 1000  // 30 days
        : 7 * 24 * 60 * 60 * 1000   // 7 days
    }
  };

  // Merge base config with type-specific config and any overrides
  return {
    ...baseConfig,
    ...typeConfigs[type],
    ...options
  };
}

/**
 * Get tenant access token cookie configuration
 * @param {Object} options - Optional overrides
 */
export function getTenantAccessCookieConfig(options = {}) {
  return getCookieConfig('access', options);
}

/**
 * Get tenant refresh token cookie configuration
 * @param {boolean} rememberMe - Whether to extend expiration
 * @param {Object} options - Optional overrides
 */
export function getTenantRefreshCookieConfig(rememberMe = false, options = {}) {
  return getCookieConfig('refresh', { rememberMe, ...options });
}

/**
 * Get platform access token cookie configuration
 * @param {Object} options - Optional overrides
 */
export function getPlatformAccessCookieConfig(options = {}) {
  return getCookieConfig('platform_access', options);
}

/**
 * Get platform refresh token cookie configuration
 * @param {boolean} rememberMe - Whether to extend expiration
 * @param {Object} options - Optional overrides
 */
export function getPlatformRefreshCookieConfig(rememberMe = false, options = {}) {
  return getCookieConfig('platform_refresh', { rememberMe, ...options });
}

/**
 * Clear cookie configuration (for logout)
 * Returns config that clears the cookie by setting maxAge to 0
 * 
 * @param {string} type - Cookie type
 */
export function getClearCookieConfig(type = 'access') {
  return {
    ...getCookieConfig(type),
    maxAge: 0,
    expires: new Date(0) // Set to epoch for immediate expiration
  };
}

export default {
  getCookieConfig,
  getTenantAccessCookieConfig,
  getTenantRefreshCookieConfig,
  getPlatformAccessCookieConfig,
  getPlatformRefreshCookieConfig,
  getClearCookieConfig
};
