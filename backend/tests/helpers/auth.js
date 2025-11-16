/**
 * Test Authentication Helpers
 * Utilities for generating and managing test authentication tokens
 */

import jwt from 'jsonwebtoken';

/**
 * Generate a test authentication token
 * @param {Object} user - User object with userId, organizationId, and role
 * @returns {string} JWT token
 */
export function generateAuthToken(user) {
  const { userId, organizationId, role = 'user' } = user;
  
  const payload = {
    userId,
    organizationId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  };

  const secret = process.env.JWT_SECRET || 'test-secret-key';
  
  return jwt.sign(payload, secret);
}

/**
 * Verify a test authentication token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
export function verifyAuthToken(token) {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  return jwt.verify(token, secret);
}

/**
 * Generate admin authentication token
 * @param {Object} user - User object
 * @returns {string} JWT token with admin role
 */
export function generateAdminToken(user) {
  return generateAuthToken({ ...user, role: 'admin' });
}

/**
 * Generate expired authentication token (for testing)
 * @param {Object} user - User object
 * @returns {string} Expired JWT token
 */
export function generateExpiredToken(user) {
  const { userId, organizationId, role = 'user' } = user;
  
  const payload = {
    userId,
    organizationId,
    role,
    iat: Math.floor(Date.now() / 1000) - (60 * 60 * 2), // 2 hours ago
    exp: Math.floor(Date.now() / 1000) - (60 * 60) // 1 hour ago (expired)
  };

  const secret = process.env.JWT_SECRET || 'test-secret-key';
  
  return jwt.sign(payload, secret);
}

/**
 * Create authorization header for tests
 * @param {string} token - JWT token
 * @returns {Object} Headers object with authorization
 */
export function createAuthHeader(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

/**
 * Create mock request with authentication
 * @param {Object} user - User object
 * @param {Object} additionalData - Additional request data
 * @returns {Object} Mock request object
 */
export function createAuthenticatedRequest(user, additionalData = {}) {
  return {
    auth: {
      userId: user.userId,
      organizationId: user.organizationId,
      role: user.role || 'user'
    },
    ...additionalData
  };
}
