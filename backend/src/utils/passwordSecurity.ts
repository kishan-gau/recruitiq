/**
 * Password Security Utilities
 * 
 * Provides password strength validation and breach checking.
 * Implements NIST SP 800-63B Digital Identity Guidelines.
 * 
 * Features:
 * - Breach password detection (Have I Been Pwned API)
 * - Common password blacklist
 * - Password strength scoring
 * - Password history checking
 * - Entropy calculation
 */

import crypto from 'crypto';
import logger from './logger.ts';

/**
 * Common weak passwords blacklist
 * Based on OWASP and common breach data
 */
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  'Password123',
  'Password123!',
  'admin',
  'admin123',
  'Admin123',
  'Admin123!',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'passw0rd',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
  'welcome',
  'jesus',
  'ninja',
  'mustang',
  'password1',
]);

/**
 * Check if password is in common password list
 * 
 * @param {string} password - Password to check
 * @returns {boolean} True if password is common
 */
export function isCommonPassword(password) {
  if (!password) return true;
  
  // Check exact match
  if (COMMON_PASSWORDS.has(password)) {
    return true;
  }
  
  // Check lowercase match
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return true;
  }
  
  // Check if password contains common words
  const lowerPassword = password.toLowerCase();
  for (const common of COMMON_PASSWORDS) {
    if (lowerPassword.includes(common)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check password against Have I Been Pwned API
 * Uses k-anonymity model: only first 5 chars of SHA-1 hash are sent
 * 
 * @param {string} password - Password to check
 * @returns {Promise<{breached: boolean, count: number}>} Breach status
 */
export async function checkBreachedPassword(password) {
  try {
    // Handle empty or invalid passwords
    if (!password || password.length === 0) {
      // Fail open: treat as not breached to allow validation to handle it
      return { breached: false, count: 0 };
    }
    
    // Generate SHA-1 hash of password
    const hash = crypto.createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();
    
    // Send only first 5 characters (k-anonymity)
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);
    
    // Query Have I Been Pwned API
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          'User-Agent': 'RecruitIQ-Security-Check',
          'Add-Padding': 'true', // Request padding for additional privacy
        },
        timeout: 5000, // 5 second timeout
      }
    );
    
    if (!response.ok) {
      logger.warn('Have I Been Pwned API unavailable', { 
        status: response.status 
      });
      // Fail open: allow password if API is unavailable
      return { breached: false, count: 0 };
    }
    
    const text = await response.text();
    
    // Check if our hash suffix appears in results
    const lines = text.split('\n');
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix === suffix) {
        return { 
          breached: true, 
          count: parseInt(count, 10) 
        };
      }
    }
    
    return { breached: false, count: 0 };
    
  } catch (error) {
    logger.error('Failed to check password breach status', {
      error: error.message,
    });
    
    // Fail open: allow password if check fails
    return { breached: false, count: 0 };
  }
}

/**
 * Calculate password entropy (bits)
 * Higher entropy = stronger password
 * 
 * @param {string} password - Password to analyze
 * @returns {number} Entropy in bits
 */
export function calculatePasswordEntropy(password) {
  if (!password) return 0;
  
  let charsetSize = 0;
  
  // Lowercase letters (26)
  if (/[a-z]/.test(password)) charsetSize += 26;
  
  // Uppercase letters (26)
  if (/[A-Z]/.test(password)) charsetSize += 26;
  
  // Digits (10)
  if (/\d/.test(password)) charsetSize += 10;
  
  // Special characters (32 common ones)
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;
  
  // Entropy = log2(charset^length)
  const entropy = Math.log2(Math.pow(charsetSize, password.length));
  
  return Math.round(entropy);
}

/**
 * Score password strength
 * 
 * @param {string} password - Password to score
 * @returns {Object} Score and feedback
 */
export function scorePasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      strength: 'very-weak',
      feedback: ['Password is required'],
    };
  }
  
  let score = 0;
  const feedback = [];
  
  // Length check
  if (password.length < 8) {
    feedback.push('Password should be at least 8 characters');
  } else if (password.length < 12) {
    score += 1;
    feedback.push('Consider using 12+ characters for better security');
  } else if (password.length < 16) {
    score += 2;
  } else {
    score += 3;
  }
  
  // Character variety
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  
  const variety = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  
  if (variety < 3) {
    feedback.push('Use a mix of uppercase, lowercase, numbers, and symbols');
  }
  
  score += variety;
  
  // Pattern detection
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeated characters (e.g., "aaa")');
  }
  
  if (/^[a-zA-Z]+$/.test(password)) {
    score -= 1;
    feedback.push('Add numbers and symbols');
  }
  
  if (/^[0-9]+$/.test(password)) {
    score -= 2;
    feedback.push('Don\'t use only numbers');
  }
  
  // Sequential patterns
  if (/123|234|345|456|567|678|789|890|abc|bcd|cde|def/i.test(password)) {
    score -= 1;
    feedback.push('Avoid sequential patterns');
  }
  
  // Common passwords
  if (isCommonPassword(password)) {
    score -= 3;
    feedback.push('This is a commonly used password');
  }
  
  // Entropy check
  const entropy = calculatePasswordEntropy(password);
  if (entropy < 30) {
    feedback.push('Password is too predictable');
  }
  
  // Determine strength
  let strength = 'very-weak';
  if (score >= 8) strength = 'very-strong';
  else if (score >= 6) strength = 'strong';
  else if (score >= 4) strength = 'medium';
  else if (score >= 2) strength = 'weak';
  
  return {
    score: Math.max(0, score),
    strength,
    entropy,
    feedback: feedback.length > 0 ? feedback : ['Password looks good'],
  };
}

/**
 * Validate password against security requirements
 * Implements NIST SP 800-63B guidelines
 * 
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Promise<{valid: boolean, errors: string[]}>}
 */
export async function validatePassword(password, options = {}) {
  const {
    minLength = 12,
    maxLength = 128,
    requireUppercase = true,
    requireLowercase = true,
    requireDigits = true,
    requireSpecialChars = true,
    checkBreached = true,
    checkCommon = true,
  } = options;
  
  const errors = [];
  
  // Length check
  if (!password || password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (password && password.length > maxLength) {
    errors.push(`Password must not exceed ${maxLength} characters`);
  }
  
  if (!password) {
    return { valid: false, errors };
  }
  
  // Character requirements
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (requireDigits && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check common passwords
  if (checkCommon && isCommonPassword(password)) {
    errors.push('This password is too common. Please choose a more unique password');
  }
  
  // Check breached passwords
  if (checkBreached && errors.length === 0) {
    try {
      const { breached, count } = await checkBreachedPassword(password);
      if (breached) {
        errors.push(
          `This password has been found in ${count.toLocaleString()} data breaches. ` +
          'Please choose a different password'
        );
      }
    } catch (error) {
      // Log error but don't fail validation
      logger.warn('Could not check password breach status', {
        error: error.message,
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a strong random password
 * 
 * @param {number} length - Password length (minimum 12)
 * @returns {string} Generated password
 */
export function generateStrongPassword(length = 16) {
  const minLength = Math.max(12, length);
  
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + digits + special;
  
  // Ensure at least one of each type
  let password = '';
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += digits[crypto.randomInt(0, digits.length)];
  password += special[crypto.randomInt(0, special.length)];
  
  // Fill remaining with random characters
  for (let i = password.length; i < minLength; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle
  return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
}

export default {
  isCommonPassword,
  checkBreachedPassword,
  calculatePasswordEntropy,
  scorePasswordStrength,
  validatePassword,
  generateStrongPassword,
};
