/**
 * Authentication and authorization types
 */

export interface JWTPayload {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  permissions: string[];
}

export type UserRole = 'admin' | 'owner' | 'recruiter' | 'hiring_manager' | 'interviewer' | 'viewer';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: true;
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}
