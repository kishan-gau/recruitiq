/**
 * RecruitIQ Authentication Service
 * 
 * Wraps RecruitIQAPI authentication methods
 */
import { RecruitIQAPI, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const recruitiqClient = new RecruitIQAPI(apiClient);

export const authService = {
  /**
   * Login to RecruitIQ
   */
  async login(email: string, password: string) {
    const response = await recruitiqClient.login(email, password);
    return response;
  },

  /**
   * Register new user
   */
  async register(data: any) {
    const response = await recruitiqClient.register(data);
    return response;
  },

  /**
   * Logout from RecruitIQ
   */
  async logout() {
    const response = await recruitiqClient.logout();
    return response;
  },

  /**
   * Get current authenticated user
   */
  async getMe() {
    const response = await recruitiqClient.getMe();
    return response.user || response.data;
  },

  /**
   * Get MFA status
   */
  async getMFAStatus() {
    const response = await recruitiqClient.getMFAStatus();
    return response;
  },

  /**
   * Setup MFA
   */
  async setupMFA() {
    const response = await recruitiqClient.setupMFA();
    return response;
  },

  /**
   * Verify MFA setup
   */
  async verifyMFASetup(token: string, secret: string) {
    const response = await recruitiqClient.verifyMFASetup(token, secret);
    return response;
  },

  /**
   * Verify MFA during login
   */
  async verifyMFA(mfaToken: string, token: string) {
    const response = await recruitiqClient.verifyMFA(mfaToken, token);
    return response;
  },

  /**
   * Use backup code during login
   */
  async useBackupCode(mfaToken: string, backupCode: string) {
    const response = await recruitiqClient.useBackupCode(mfaToken, backupCode);
    return response;
  },

  /**
   * Disable MFA
   */
  async disableMFA(password: string, token: string) {
    const response = await recruitiqClient.disableMFA(password, token);
    return response;
  },

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(password: string, token: string) {
    const response = await recruitiqClient.regenerateBackupCodes(password, token);
    return response;
  },

  /**
   * Get active sessions
   */
  async getActiveSessions() {
    const response = await recruitiqClient.getActiveSessions();
    return response.sessions || response.data;
  },

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string) {
    const response = await recruitiqClient.revokeSession(sessionId);
    return response;
  },

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions() {
    const response = await recruitiqClient.revokeAllSessions();
    return response;
  },
};
