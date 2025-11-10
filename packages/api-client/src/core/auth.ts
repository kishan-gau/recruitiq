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
    // Fetch CSRF token before login (required for cookie-based auth)
    let csrfToken: string | undefined;
    try {
      const csrfResponse = await this.client.get('/csrf-token', {
        headers: { 'skip-auth': 'true' },
      });
      csrfToken = csrfResponse.csrfToken;
      
      // Store CSRF token for future requests
      if (csrfToken) {
        this.client.getTokenStorage().setCsrfToken(csrfToken);
      }
    } catch (error) {
      console.warn('Failed to fetch CSRF token, attempting login without it:', error);
    }

    const response = await this.client.post('/auth/tenant/login', credentials, {
      headers: {
        'skip-auth': 'true',
        ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
      },
    });

    // SECURITY: Tokens are now in httpOnly cookies set by backend
    // No need to store them client-side (prevents XSS attacks)

    return response;
  }

  /**
   * Register new user
   */
  async register(data: RegisterData) {
    // Fetch CSRF token before registration (required for cookie-based auth)
    let csrfToken: string | undefined;
    try {
      const csrfResponse = await this.client.get('/csrf-token', {
        headers: { 'skip-auth': 'true' },
      });
      csrfToken = csrfResponse.csrfToken;
      
      // Store CSRF token for future requests
      if (csrfToken) {
        this.client.getTokenStorage().setCsrfToken(csrfToken);
      }
    } catch (error) {
      console.warn('Failed to fetch CSRF token, attempting registration without it:', error);
    }

    const response = await this.client.post('/auth/tenant/register', data, {
      headers: {
        'skip-auth': 'true',
        ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
      },
    });

    // SECURITY: Tokens are now in httpOnly cookies set by backend
    // No need to store them client-side

    return response;
  }

  /**
   * Get current user profile
   */
  async getMe() {
    return this.client.get('/auth/tenant/me');
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      // Call backend to revoke refresh token and clear cookies
      await this.client.post('/auth/tenant/logout', {});
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      // Clear any client-side state (though tokens are in httpOnly cookies)
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
    return this.client.get('/auth/tenant/sessions');
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string) {
    return this.client.delete(`/auth/tenant/sessions/${sessionId}`);
  }

  /**
   * Revoke all other sessions
   */
  async revokeAllSessions() {
    return this.client.post('/auth/tenant/revoke-all-sessions', {});
  }
}
