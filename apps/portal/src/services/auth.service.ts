/**
 * Portal Authentication Service
 * 
 * Wraps PortalAPI authentication methods
 */
import { PortalAPI, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const portalClient = new PortalAPI(apiClient);

export const authService = {
  /**
   * Login to platform admin portal
   */
  async login(email: string, password: string) {
    const response = await portalClient.login(email, password);
    return response;
  },

  /**
   * Logout from platform admin portal
   */
  async logout() {
    const response = await portalClient.logout();
    return response;
  },

  /**
   * Get current authenticated user
   */
  async getMe() {
    const response = await portalClient.getMe();
    return response.user || response.data;
  },

  /**
   * Get MFA status for current user
   */
  async getMFAStatus() {
    const response = await portalClient.getMFAStatus();
    return response;
  },

  /**
   * Initiate MFA setup
   */
  async setupMFA() {
    const response = await portalClient.setupMFA();
    return response;
  },

  /**
   * Verify MFA setup with TOTP token
   */
  async verifyMFASetup(token: string, secret: string) {
    const response = await portalClient.verifyMFASetup(token, secret);
    return response;
  },

  /**
   * Verify MFA during login
   */
  async verifyMFA(mfaToken: string, token: string) {
    const response = await portalClient.verifyMFA(mfaToken, token);
    return response;
  },

  /**
   * Use backup code during login
   */
  async useBackupCode(mfaToken: string, backupCode: string) {
    const response = await portalClient.useBackupCode(mfaToken, backupCode);
    return response;
  },

  /**
   * Disable MFA for current user
   */
  async disableMFA(password: string, token: string) {
    const response = await portalClient.disableMFA(password, token);
    return response;
  },

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(password: string, token: string) {
    const response = await portalClient.regenerateBackupCodes(password, token);
    return response;
  },
};
