/**
 * Password Security Tests
 * 
 * Tests the password validation, breach checking, and strength scoring
 * functionality implemented in utils/passwordSecurity.js
 */

import {
  isCommonPassword,
  checkBreachedPassword,
  calculatePasswordEntropy,
  scorePasswordStrength,
  validatePassword,
  generateStrongPassword,
} from '../src/utils/passwordSecurity.js';

describe('Password Security', () => {
  describe('isCommonPassword', () => {
    it('should detect exact match common passwords', () => {
      expect(isCommonPassword('password')).toBe(true);
      expect(isCommonPassword('password123')).toBe(true);
      expect(isCommonPassword('admin')).toBe(true);
      expect(isCommonPassword('123456')).toBe(true);
    });

    it('should detect case-insensitive matches', () => {
      expect(isCommonPassword('Password')).toBe(true);
      expect(isCommonPassword('PASSWORD')).toBe(true);
      expect(isCommonPassword('Admin')).toBe(true);
    });

    it('should detect common words in passwords', () => {
      expect(isCommonPassword('password!')).toBe(true);
      expect(isCommonPassword('my_password_123')).toBe(true);
      expect(isCommonPassword('admin2024')).toBe(true);
    });

    it('should accept strong unique passwords', () => {
      expect(isCommonPassword('xK9$mP2#nL4@qW8!')).toBe(false);
      expect(isCommonPassword('Tr0ub4dor&3-ComplexPass')).toBe(false);
    });
  });

  describe('calculatePasswordEntropy', () => {
    it('should calculate entropy for different character sets', () => {
      // Only lowercase (26 chars): ~28 bits for 6 chars
      const lowercase = calculatePasswordEntropy('abcdef');
      expect(lowercase).toBeGreaterThan(25);
      expect(lowercase).toBeLessThan(32);

      // Lowercase + uppercase (52 chars): higher entropy
      const mixed = calculatePasswordEntropy('AbCdEf');
      expect(mixed).toBeGreaterThan(lowercase);

      // All character types (94 chars): highest entropy
      const complex = calculatePasswordEntropy('A1!bcd');
      expect(complex).toBeGreaterThan(mixed);
    });

    it('should give higher entropy for longer passwords', () => {
      const short = calculatePasswordEntropy('Ab1!');
      const medium = calculatePasswordEntropy('Ab1!2@3#');
      const long = calculatePasswordEntropy('Ab1!2@3#4$5%6^');

      expect(short).toBeLessThan(medium);
      expect(medium).toBeLessThan(long);
    });
  });

  describe('scorePasswordStrength', () => {
    it('should score very weak passwords', () => {
      const result = scorePasswordStrength('123');
      expect(result.strength).toBe('very-weak');
      expect(result.score).toBeLessThan(3);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should score weak passwords', () => {
      const result = scorePasswordStrength('password');
      expect(result.strength).toBe('very-weak'); // Common password penalty
      expect(result.feedback).toContain('This is a commonly used password');
    });

    it('should score medium passwords', () => {
      const result = scorePasswordStrength('Password123');
      expect(result.strength).toMatch(/weak|medium/);
    });

    it('should score strong passwords', () => {
      const result = scorePasswordStrength('Tr0ub4dor&3-ComplexP@ss');
      expect(result.strength).toMatch(/strong|very-strong/);
      expect(result.entropy).toBeGreaterThan(60);
    });

    it('should detect repeated characters', () => {
      const result = scorePasswordStrength('Passssword123!');
      expect(result.feedback.some(f => f.includes('repeated'))).toBe(true);
    });

    it('should detect sequential patterns', () => {
      const result = scorePasswordStrength('Abc123def!');
      expect(result.feedback.some(f => f.includes('sequential'))).toBe(true);
    });
  });

  describe('checkBreachedPassword', () => {
    it('should detect commonly breached passwords', async () => {
      // 'password' is in millions of breaches
      const result = await checkBreachedPassword('password');
      expect(result.breached).toBe(true);
      expect(result.count).toBeGreaterThan(1000000);
    }, 10000); // 10 second timeout for API call

    it('should not flag unique strong passwords', async () => {
      // Very unlikely to be breached
      const result = await checkBreachedPassword('xK9$mP2#nL4@qW8!zT5&yR7%');
      expect(result.breached).toBe(false);
      expect(result.count).toBe(0);
    }, 10000);

    it('should handle API failures gracefully (fail open)', async () => {
      // Mock API failure by using invalid input
      const result = await checkBreachedPassword('');
      expect(result).toBeDefined();
      expect(result.breached).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should enforce minimum length', async () => {
      const result = await validatePassword('Short1!', {
        minLength: 12,
        checkBreached: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters long');
    });

    it('should enforce maximum length', async () => {
      const longPassword = 'A'.repeat(130) + '1!';
      const result = await validatePassword(longPassword, {
        maxLength: 128,
        checkBreached: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceed 128'))).toBe(true);
    });

    it('should require uppercase letters', async () => {
      const result = await validatePassword('lowercase123!', {
        requireUppercase: true,
        checkBreached: false,
        checkCommon: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letters', async () => {
      const result = await validatePassword('UPPERCASE123!', {
        requireLowercase: true,
        checkBreached: false,
        checkCommon: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require digits', async () => {
      const result = await validatePassword('NoDigitsHere!', {
        requireDigits: true,
        checkBreached: false,
        checkCommon: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special characters', async () => {
      const result = await validatePassword('NoSpecialChars123', {
        requireSpecialChars: true,
        checkBreached: false,
        checkCommon: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common passwords', async () => {
      const result = await validatePassword('password123', {
        checkCommon: true,
        checkBreached: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('too common'))).toBe(true);
    });

    it('should reject breached passwords', async () => {
      const result = await validatePassword('P@ssw0rd', {
        checkBreached: true,
        checkCommon: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('data breaches'))).toBe(true);
    }, 10000);

    it('should accept strong valid passwords', async () => {
      const result = await validatePassword('MyStr0ng!P@ssw0rd2024', {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSpecialChars: true,
        checkCommon: true,
        checkBreached: false, // Skip for speed
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('generateStrongPassword', () => {
    it('should generate passwords of requested length', () => {
      const password = generateStrongPassword(16);
      expect(password.length).toBe(16);
    });

    it('should enforce minimum length of 12', () => {
      const password = generateStrongPassword(8);
      expect(password.length).toBeGreaterThanOrEqual(12);
    });

    it('should include all character types', () => {
      const password = generateStrongPassword(20);
      
      expect(/[a-z]/.test(password)).toBe(true); // Lowercase
      expect(/[A-Z]/.test(password)).toBe(true); // Uppercase
      expect(/\d/.test(password)).toBe(true); // Digits
      expect(/[^a-zA-Z0-9]/.test(password)).toBe(true); // Special chars
    });

    it('should generate unique passwords', () => {
      const password1 = generateStrongPassword(16);
      const password2 = generateStrongPassword(16);
      
      expect(password1).not.toBe(password2);
    });

    it('should pass its own validation', async () => {
      const password = generateStrongPassword(16);
      
      const result = await validatePassword(password, {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSpecialChars: true,
        checkCommon: true,
        checkBreached: false, // Skip for speed
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('NIST SP 800-63B Compliance', () => {
    it('should enforce 12+ character minimum (NIST guideline)', async () => {
      const result = await validatePassword('Short1!', {
        minLength: 12,
        checkBreached: false,
      });
      expect(result.valid).toBe(false);
    });

    it('should check against breach databases', async () => {
      const result = await validatePassword('P@ssw0rd', {
        checkBreached: true,
      });
      expect(result.valid).toBe(false);
    }, 10000);

    it('should reject common passwords from blacklist', async () => {
      const result = await validatePassword('password123!', {
        checkCommon: true,
        checkBreached: false,
      });
      expect(result.valid).toBe(false);
    });

    it('should not impose composition rules too strictly', async () => {
      // NIST recommends against overly strict composition rules
      // But we still require basic variety for security
      const result = await validatePassword('MySecurePassphrase2024!', {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSpecialChars: true,
        checkBreached: false,
        checkCommon: false,
      });
      expect(result.valid).toBe(true);
    });
  });
});
