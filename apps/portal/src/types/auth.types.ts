/**
 * Authentication Type Definitions
 * Industry-standard type safety for authentication flows
 */

/**
 * Platform user (Portal admin)
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
  userType?: 'platform' | 'tenant';
  mfaEnabled?: boolean;
  lastLogin?: string;
  createdAt?: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Login response from backend
 */
export interface LoginResponse {
  success: boolean;
  user?: User;
  mfaRequired?: boolean;
  mfaToken?: string;
  mfaWarning?: MFAWarning;
  message?: string;
}

/**
 * MFA warning during grace period
 */
export interface MFAWarning {
  message: string;
  gracePeriodEnds: string;
  daysRemaining: number;
}

/**
 * MFA verification request
 */
export interface MFAVerification {
  mfaToken: string;
  token: string;
}

/**
 * MFA setup response
 */
export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes?: string[];
}

/**
 * MFA status
 */
export interface MFAStatus {
  enabled: boolean;
  backupCodesRemaining?: number;
}

/**
 * Authentication context value
 */
export interface AuthContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  mfaWarning: MFAWarning | null;
  dismissMfaWarning: () => void;
  login: (email: string, password: string) => Promise<LoginResponse | User>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

/**
 * Authentication error types
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class MFARequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MFARequiredError';
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class SessionExpiredError extends AuthenticationError {
  constructor() {
    super('Your session has expired. Please log in again.');
    this.name = 'SessionExpiredError';
  }
}
