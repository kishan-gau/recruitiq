/**
 * Password Utility Module
 * 
 * Provides password hashing, verification, complexity validation, and strength assessment
 * using bcryptjs for secure hashing and custom validation rules.
 * 
 * @module src/utils/password
 * @requires bcryptjs
 * @requires src/utils/errors
 */

import bcrypt from 'bcryptjs';
import { ValidationError } from './errors.js';

/**
 * Password strength assessment result
 */
export interface PasswordStrength {
  /** Strength level: weak, fair, good, strong, very_strong */
  level: 'weak' | 'fair' | 'good' | 'strong' | 'very_strong';
  /** Numeric score (0-100) */
  score: number;
  /** Detailed feedback messages */
  feedback: string[];
  /** Flag indicating if password meets minimum requirements */
  meetsRequirements: boolean;
}

/**
 * Password requirements configuration
 */
interface PasswordRequirements {
  /** Minimum password length */
  minLength: number;
  /** Maximum password length */
  maxLength: number;
  /** Require at least one lowercase letter */
  requireLowercase: boolean;
  /** Require at least one uppercase letter */
  requireUppercase: boolean;
  /** Require at least one number */
  requireNumber: boolean;
  /** Require at least one special character */
  requireSpecial: boolean;
  /** List of disallowed substrings (case-insensitive) */
  blacklist: string[];
}

/**
 * Default password requirements (follows OWASP guidelines)
 */
const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 12,
  maxLength: 128,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecial: true,
  blacklist: [
    'password',
    '12345678',
    'qwerty',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    'master',
    'sunshine'
  ]
};

/**
 * Number of salt rounds for bcryptjs (NIST recommendation: 10-12)
 * Higher = slower = more secure, but more resource intensive
 * 10 is industry standard for bcryptjs
 */
const SALT_ROUNDS = 10;

/**
 * Special characters allowed in passwords
 */
const SPECIAL_CHAR_PATTERN = /[@$!%*?&\-_+=]/;

/**
 * Hashes a plaintext password using bcryptjs
 * 
 * Performs computational work to make brute-force attacks expensive.
 * Never returns plaintext password - only the hash can be verified later.
 * 
 * @param plaintext - Plaintext password to hash
 * @param requirements - Optional custom password requirements (uses defaults if not provided)
 * @returns Promise resolving to bcryptjs hash
 * @throws {ValidationError} If password doesn't meet requirements
 * 
 * @example
 * const hash = await hashPassword('MyS3cur3P@ssw0rd!');
 * // Store hash in database, never store plaintext
 */
export async function hashPassword(
  plaintext: string,
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): Promise<string> {
  // 1. Validate input
  if (!plaintext || typeof plaintext !== 'string') {
    throw new ValidationError('Password is required');
  }

  // 2. Validate complexity first (fail fast before expensive hashing)
  validatePasswordComplexity(plaintext, requirements);

  // 3. Hash the password
  // bcryptjs.hash is non-blocking and returns a Promise
  // SALT_ROUNDS determines the computational cost (10 iterations of Blowfish)
  try {
    const hash = await bcrypt.hash(plaintext, SALT_ROUNDS);
    return hash;
  } catch (_error) {
    throw new Error(`Failed to hash password: ${(error as Error).message}`);
  }
}

/**
 * Verifies a plaintext password against a bcryptjs hash
 * 
 * Uses constant-time comparison to prevent timing attacks.
 * bcryptjs.compare is cryptographically safe.
 * 
 * @param plaintext - Plaintext password to verify
 * @param hash - Bcryptjs hash from database
 * @returns Promise resolving to true if password matches, false otherwise
 * 
 * @example
 * const isValid = await verifyPassword('MyS3cur3P@ssw0rd!', storedHash);
 * if (isValid) {
 *   // Authentication successful
 * } else {
 *   // Authentication failed
 * }
 */
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  // 1. Validate inputs
  if (!plaintext || typeof plaintext !== 'string') {
    return false;
  }

  if (!hash || typeof hash !== 'string') {
    return false;
  }

  // 2. Verify using bcryptjs (constant-time comparison)
  try {
    const isMatch = await bcrypt.compare(plaintext, hash);
    return isMatch;
  } catch (_error) {
    // Catch bcryptjs errors (invalid hash format, etc.)
    return false;
  }
}

/**
 * Validates password complexity against requirements
 * 
 * Enforces minimum length, character type requirements, and checks blacklist.
 * Called automatically by hashPassword, but can be used independently for:
 * - Real-time password strength UI feedback
 * - Pre-validation before hashing
 * - Custom validation logic
 * 
 * @param password - Password to validate
 * @param requirements - Custom password requirements (uses defaults if not provided)
 * @throws {ValidationError} If password fails any requirement
 * 
 * @example
 * try {
 *   validatePasswordComplexity('weak');
 * } catch (_error) {
 *   console.error(error.message); // "Password must be at least 12 characters"
 * }
 */
export function validatePasswordComplexity(
  password: string,
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): void {
  // 1. Type check
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required');
  }

  // 2. Length validation
  if (password.length < requirements.minLength) {
    throw new ValidationError(
      `Password must be at least ${requirements.minLength} characters`
    );
  }

  if (password.length > requirements.maxLength) {
    throw new ValidationError(
      `Password cannot exceed ${requirements.maxLength} characters`
    );
  }

  // 3. Character type validation
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    throw new ValidationError(
      'Password must contain at least one lowercase letter'
    );
  }

  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    throw new ValidationError(
      'Password must contain at least one uppercase letter'
    );
  }

  if (requirements.requireNumber && !/\d/.test(password)) {
    throw new ValidationError('Password must contain at least one number');
  }

  if (requirements.requireSpecial && !SPECIAL_CHAR_PATTERN.test(password)) {
    throw new ValidationError(
      'Password must contain at least one special character (@$!%*?&-_+=)'
    );
  }

  // 4. Blacklist validation (case-insensitive)
  const lowerPassword = password.toLowerCase();
  for (const blacklistedTerm of requirements.blacklist) {
    if (lowerPassword.includes(blacklistedTerm.toLowerCase())) {
      throw new ValidationError(`Password contains disallowed term: ${blacklistedTerm}`);
    }
  }
}

/**
 * Assesses password strength with detailed feedback
 * 
 * Provides strength scoring (0-100) and actionable feedback for password UI.
 * Useful for:
 * - Real-time strength meter in signup/password change forms
 * - User guidance on password improvements
 * - Quality-of-password metrics
 * 
 * Does NOT throw - returns strength object with details
 * 
 * @param password - Password to assess
 * @param requirements - Custom password requirements (uses defaults if not provided)
 * @returns PasswordStrength object with level, score, and feedback
 * 
 * @example
 * const strength = validatePasswordStrength('MyPassword123!');
 * console.log(strength.level);    // "strong"
 * console.log(strength.score);    // 85
 * console.log(strength.feedback); // ["Consider using more special characters"]
 */
export function validatePasswordStrength(
  password: string,
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;
  let meetsRequirements = true;

  // Guard against null/undefined
  if (!password || typeof password !== 'string') {
    return {
      level: 'weak',
      score: 0,
      feedback: ['Password is required'],
      meetsRequirements: false
    };
  }

  // 1. Check requirements compliance and calculate base score
  const passwordLength = password.length;

  // Length scoring (0-30 points)
  if (passwordLength < requirements.minLength) {
    feedback.push(
      `Password should be at least ${requirements.minLength} characters (${requirements.minLength - passwordLength} more needed)`
    );
    meetsRequirements = false;
    score += Math.min(20, (passwordLength / requirements.minLength) * 20);
  } else if (passwordLength >= requirements.minLength && passwordLength <= 15) {
    score += 20;
  } else if (passwordLength > 15 && passwordLength <= 20) {
    score += 25;
  } else {
    score += 30; // Max length bonus
  }

  // Lowercase check (0-20 points)
  if (!/[a-z]/.test(password)) {
    feedback.push('Add lowercase letters for better security');
    meetsRequirements = meetsRequirements && !requirements.requireLowercase;
    score += 0;
  } else {
    score += 20;
  }

  // Uppercase check (0-20 points)
  if (!/[A-Z]/.test(password)) {
    feedback.push('Add uppercase letters for better security');
    meetsRequirements = meetsRequirements && !requirements.requireUppercase;
    score += 0;
  } else {
    score += 20;
  }

  // Number check (0-15 points)
  if (!/\d/.test(password)) {
    feedback.push('Add numbers for better security');
    meetsRequirements = meetsRequirements && !requirements.requireNumber;
    score += 0;
  } else {
    score += 15;
  }

  // Special character check (0-15 points)
  if (!SPECIAL_CHAR_PATTERN.test(password)) {
    feedback.push('Add special characters (@$!%*?&-_+=) for better security');
    meetsRequirements = meetsRequirements && !requirements.requireSpecial;
    score += 0;
  } else {
    // Bonus for multiple special characters
    const specialCharCount = (password.match(SPECIAL_CHAR_PATTERN) || []).length;
    score += Math.min(15, 10 + specialCharCount * 2);
  }

  // 2. Blacklist check (penalty)
  const lowerPassword = password.toLowerCase();
  for (const blacklistedTerm of requirements.blacklist) {
    if (lowerPassword.includes(blacklistedTerm.toLowerCase())) {
      feedback.push(`Avoid common words like "${blacklistedTerm}"`);
      meetsRequirements = false;
      score = Math.max(0, score - 30); // Significant penalty
    }
  }

  // 3. Entropy bonus (for mixed patterns)
  const hasSequential = /012|123|234|345|456|567|678|789|890|abc|bcd|cde|def/.test(
    password.toLowerCase()
  );
  if (hasSequential) {
    feedback.push('Avoid sequential characters (like 123 or abc)');
    score = Math.max(0, score - 10);
  }

  const hasRepeated = /(.)\1{2,}/.test(password);
  if (hasRepeated) {
    feedback.push('Avoid repeating characters');
    score = Math.max(0, score - 10);
  }

  // 4. Determine strength level based on score and requirements
  let level: 'weak' | 'fair' | 'good' | 'strong' | 'very_strong';

  if (!meetsRequirements) {
    level = 'weak';
  } else if (score < 30) {
    level = 'weak';
  } else if (score < 50) {
    level = 'fair';
  } else if (score < 70) {
    level = 'good';
  } else if (score < 85) {
    level = 'strong';
  } else {
    level = 'very_strong';
  }

  // 5. Add positive feedback
  if (level === 'very_strong') {
    feedback.push('Excellent password strength!');
  } else if (level === 'strong') {
    feedback.push('Strong password');
  }

  return {
    level,
    score: Math.min(100, score),
    feedback,
    meetsRequirements
  };
}

/**
 * Checks if a password hash is safe (properly formatted bcryptjs hash)
 * 
 * Validates hash format before comparison operations.
 * Bcryptjs hashes follow format: $2a$10$... (version $rounds$salt$hash)
 * 
 * @param hash - Hash to validate
 * @returns true if hash appears to be valid bcryptjs format
 * 
 * @example
 * const isValid = isValidHash(storedHash);
 * if (!isValid) {
 *   console.error('Corrupted password hash in database');
 * }
 */
export function isValidHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }

  // Bcryptjs hashes start with $2a$, $2b$, $2x$, or $2y$ followed by cost and salt
  // Format: $2a$10$22 chars salt + 31 chars hash = 60 total characters
  const bcryptRegex = /^\$2[aby]\$\d{2}\$.{53}$/;

  return bcryptRegex.test(hash);
}

/**
 * Generates password requirements with custom settings
 * 
 * Factory function to create custom password policies for different contexts:
 * - Admin accounts (strict requirements)
 * - Regular users (standard requirements)
 * - Service accounts (flexible requirements)
 * 
 * @param overrides - Custom requirement overrides
 * @returns Merged requirements object
 * 
 * @example
 * // Strict admin requirements
 * const adminReqs = createPasswordRequirements({ minLength: 16 });
 * 
 * // Flexible service account
 * const serviceReqs = createPasswordRequirements({
 *   minLength: 20,
 *   requireSpecial: false
 * });
 */
export function createPasswordRequirements(
  overrides: Partial<PasswordRequirements> = {}
): PasswordRequirements {
  return {
    ...DEFAULT_REQUIREMENTS,
    ...overrides
  };
}

export { DEFAULT_REQUIREMENTS, SALT_ROUNDS, SPECIAL_CHAR_PATTERN };
