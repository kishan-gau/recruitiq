import { APIClient } from '../core/client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  [key: string]: any;
}

export interface MFASetupResponse {
  qrCodeUrl: string;
  manualEntryKey: string;
  tempSecret: string;
}

export interface SessionInfo {
  id: string;
  deviceInfo: string;
  location?: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

/**
 * Authentication API methods
 * Handles login, registration, MFA, and session management
 */
export class AuthAPI {
  constructor(private client: APIClient) {}

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials) {
    const response = await this.client.post('/auth/login', credentials, {
      headers: { 'skip-auth': 'true' },
    });

    // Store tokens if provided
    if (response.accessToken || response.token) {
      const token = response.accessToken || response.token;
      this.client.getTokenStorage().setToken(token, response.refreshToken, response.expiresIn);
    }

    return response;
  }

  /**
   * Register new user
   */
  async register(data: RegisterData) {
    const response = await this.client.post('/auth/register', data, {
      headers: { 'skip-auth': 'true' },
    });

    // Store tokens if auto-login is enabled
    if (response.accessToken || response.token) {
      const token = response.accessToken || response.token;
      this.client.getTokenStorage().setToken(token, response.refreshToken, response.expiresIn);
    }

    return response;
  }

  /**
   * Get current user profile
   */
  async getMe() {
    return this.client.get('/auth/me');
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      const refreshToken = this.client.getTokenStorage().getRefreshToken();
      if (refreshToken) {
        await this.client.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      this.client.getTokenStorage().clearTokens();
    }
  }

  // ============================================================================
  // MFA Methods
  // ============================================================================

  /**
   * Get MFA status for current user
   */
  async getMFAStatus() {
    return this.client.get('/auth/mfa/status');
  }

  /**
   * Setup MFA - Generate QR code and secret
   */
  async setupMFA(): Promise<MFASetupResponse> {
    return this.client.post('/auth/mfa/setup');
  }

  /**
   * Verify MFA setup
   */
  async verifyMFASetup(token: string, secret: string) {
    return this.client.post('/auth/mfa/verify-setup', { token, secret });
  }

  /**
   * Verify MFA during login
   */
  async verifyMFA(mfaToken: string, token: string) {
    return this.client.post('/auth/mfa/verify', { mfaToken, token });
  }

  /**
   * Use backup code for login
   */
  async useBackupCode(mfaToken: string, backupCode: string) {
    return this.client.post('/auth/mfa/use-backup-code', { mfaToken, backupCode });
  }

  /**
   * Disable MFA
   */
  async disableMFA(password: string, token: string) {
    return this.client.post('/auth/mfa/disable', { password, token });
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(password: string, token: string) {
    return this.client.post('/auth/mfa/regenerate-backup-codes', { password, token });
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Get active sessions
   */
  async getActiveSessions(): Promise<SessionInfo[]> {
    return this.client.get('/auth/sessions');
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string) {
    return this.client.delete(`/auth/sessions/${sessionId}`);
  }

  /**
   * Revoke all other sessions
   */
  async revokeAllSessions() {
    return this.client.delete('/auth/sessions');
  }
}
