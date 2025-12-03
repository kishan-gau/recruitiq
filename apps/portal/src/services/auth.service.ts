/**
 * Portal Authentication Service
 * 
 * Industry-standard authentication service using centralized @recruitiq/api-client
 * 
 * ARCHITECTURE:
 * - Uses PortalAPI from @recruitiq/api-client package
 * - No local authentication logic (API client handles it)
 * - Type-safe with TypeScript interfaces
 * - Follows separation of concerns
 * 
 * SECURITY:
 * - All authentication uses httpOnly cookies (XSS-proof)
 * - CSRF protection via tokens
 * - No token storage in localStorage/sessionStorage
 * 
 * @see FRONTEND_STANDARDS.md - "API Client Integration Standards"
 * @see packages/api-client/src/portal/PortalAPI.ts
 */

import { PortalAPI, APIClient } from '@recruitiq/api-client';
import type {
  User,
  LoginResponse,
  MFASetupResponse,
  MFAStatus,
} from '../types/auth.types';

// Singleton instances
const apiClient = new APIClient();
const portalAPI = new PortalAPI(apiClient);

/**
 * Authentication Service
 * 
 * Wraps PortalAPI authentication methods with Portal-specific type safety
 */
export const authService = {
  // ============================================================================
  // Authentication
  // ============================================================================

  /**
   * Login with email and password
   * 
   * SECURITY: Uses httpOnly cookies, no localStorage
   * 
   * @param email - User email
   * @param password - User password
   * @returns LoginResponse with user data or MFA challenge
   * @throws {Error} If credentials invalid or server error
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await portalAPI.login(email, password);
    return response as LoginResponse;
  },

  /**
   * Logout and clear session
   * 
   * SECURITY: Backend clears httpOnly cookies
   */
  async logout(): Promise<void> {
    await portalAPI.logout();
  },

  /**
   * Get current authenticated user
   * 
   * Uses httpOnly cookies for authentication (sent automatically)
   * 
   * @returns User object if authenticated
   * @throws {Error} If not authenticated
   */
  async getMe(): Promise<User> {
    const user = await portalAPI.getMe();
    return user as User;
  },

  // ============================================================================
  // Multi-Factor Authentication (MFA)
  // ============================================================================

  /**
   * Get MFA status for current user
   * 
   * @returns MFA status (enabled, backup codes remaining, etc.)
   */
  async getMFAStatus(): Promise<MFAStatus> {
    const status = await portalAPI.getMFAStatus();
    return status as MFAStatus;
  },

  /**
   * Setup MFA for current user
   * 
   * @returns MFA setup data (secret, QR code, backup codes)
   */
  async setupMFA(): Promise<MFASetupResponse> {
    const setup = await portalAPI.setupMFA();
    return setup as MFASetupResponse;
  },

  /**
   * Verify MFA setup with TOTP token
   * 
   * @param token - 6-digit TOTP token from authenticator app
   * @param secret - MFA secret from setupMFA()
   * @returns Verification result with backup codes
   */
  async verifyMFASetup(token: string, secret: string): Promise<any> {
    return portalAPI.verifyMFASetup(token, secret);
  },

  /**
   * Verify MFA token during login
   * 
   * @param mfaToken - Temporary MFA token from login response
   * @param token - 6-digit TOTP token from authenticator app
   * @returns User object if verification successful
   */
  async verifyMFA(mfaToken: string, token: string): Promise<User> {
    const response = await portalAPI.verifyMFA(mfaToken, token);
    return response.user as User;
  },

  /**
   * Use backup code instead of MFA token
   * 
   * @param mfaToken - Temporary MFA token from login response
   * @param backupCode - One-time backup code
   * @returns User object if code valid
   */
  async useBackupCode(mfaToken: string, backupCode: string): Promise<User> {
    const response = await portalAPI.useBackupCode(mfaToken, backupCode);
    return response.user as User;
  },

  /**
   * Disable MFA for current user
   * 
   * @param password - User password for confirmation
   * @param token - Current MFA token
   */
  async disableMFA(password: string, token: string): Promise<void> {
    await portalAPI.disableMFA(password, token);
  },

  /**
   * Regenerate backup codes
   * 
   * @param password - User password for confirmation
   * @param token - Current MFA token
   * @returns New backup codes
   */
  async regenerateBackupCodes(password: string, token: string): Promise<string[]> {
    const response = await portalAPI.regenerateBackupCodes(password, token);
    return response.backupCodes || [];
  },
};
