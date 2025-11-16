/**
 * Authentication Configuration
 * 
 * Defines separate authentication configurations for platform and tenant users
 * to enable SSO (Single Sign-On) for tenant apps while keeping platform isolated
 * 
 * Key Concepts:
 * - Platform users: Portal admins, no SSO (isolated domain)
 * - Tenant users: Product users (PayLinQ, Nexus, RecruitIQ), SSO enabled (shared domain)
 * 
 * SSO Implementation:
 * - Tenant apps share cookies via .recruitiq.com domain (leading dot = all subdomains)
 * - Platform app uses portal.recruitiq.com domain (isolated, no SSO)
 * - Different cookie names prevent conflicts
 */

export const AUTH_CONFIG = {
  // Platform authentication (Portal, License Manager)
  // No SSO - isolated from tenant applications
  platform: {
    cookieName: 'platform_access_token',
    refreshCookieName: 'platform_refresh_token',
    // Domain: undefined in dev (localhost), portal.recruitiq.com in production
    domain: process.env.PLATFORM_COOKIE_DOMAIN || undefined,
    sameSite: 'strict', // Strict - no cross-site requests needed
    path: '/',
    accessTokenExpiry: '15m', // 15 minutes
    refreshTokenExpiry: '7d', // 7 days
  },
  
  // Tenant authentication (PayLinQ, Nexus, RecruitIQ, ScheduleHub)
  // SSO enabled - shared session across tenant apps
  tenant: {
    cookieName: 'tenant_access_token',
    refreshCookieName: 'tenant_refresh_token',
    // Domain: undefined in dev (localhost), .recruitiq.com in production (SSO)
    // Leading dot allows all subdomains: paylinq.recruitiq.com, nexus.recruitiq.com, etc.
    domain: process.env.TENANT_COOKIE_DOMAIN || undefined,
    sameSite: 'lax', // Lax - allows cross-subdomain navigation (SSO requirement)
    path: '/',
    accessTokenExpiry: '15m', // 15 minutes
    refreshTokenExpiry: '7d', // 7 days (30d if rememberMe)
  },
  
  // JWT configuration
  jwt: {
    accessTokenSecret: process.env.JWT_SECRET,
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
    algorithm: 'HS256',
  },
  
  // Session configuration
  session: {
    absoluteTimeout: 24 * 60 * 60 * 1000, // 24 hours
    inactivityTimeout: 15 * 60 * 1000, // 15 minutes
  },
};

/**
 * Get cookie options for access token
 * @param {string} userType - 'platform' or 'tenant'
 * @returns {object} Cookie options for res.cookie()
 */
export function getAccessTokenCookieOptions(userType = 'tenant') {
  const config = AUTH_CONFIG[userType];
  
  return {
    httpOnly: true, // SECURITY: Prevents JavaScript access (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: config.sameSite,
    domain: config.domain,
    path: config.path,
    maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
  };
}

/**
 * Get cookie options for refresh token
 * @param {string} userType - 'platform' or 'tenant'
 * @param {boolean} rememberMe - Extended expiry if true
 * @returns {object} Cookie options for res.cookie()
 */
export function getRefreshTokenCookieOptions(userType = 'tenant', rememberMe = false) {
  const config = AUTH_CONFIG[userType];
  
  // Tenant users can have 30-day refresh tokens if rememberMe
  const maxAge = userType === 'tenant' && rememberMe
    ? 30 * 24 * 60 * 60 * 1000 // 30 days
    : 7 * 24 * 60 * 60 * 1000; // 7 days
  
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: config.sameSite,
    domain: config.domain,
    path: config.path,
    maxAge,
  };
}

/**
 * Get cookie clear options (for logout)
 * @param {string} userType - 'platform' or 'tenant'
 * @returns {object} Cookie options for res.clearCookie()
 */
export function getCookieClearOptions(userType = 'tenant') {
  const config = AUTH_CONFIG[userType];
  
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: config.sameSite,
    domain: config.domain,
    path: config.path,
  };
}

export default AUTH_CONFIG;
