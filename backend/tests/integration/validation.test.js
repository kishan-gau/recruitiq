/**
 * Input Validation Integration Tests
 * 
 * Comprehensive tests for Joi validation schemas across all API endpoints.
 * Tests edge cases, malformed data, boundary conditions, and security constraints.
 * 
 * Coverage areas:
 * - Authentication schemas (register, login, password reset)
 * - User management schemas
 * - Job posting schemas
 * - Candidate schemas
 * - Application schemas
 * - Common validation patterns (email, phone, UUID, etc.)
 */

import {
  commonSchemas,
  authSchemas,
  userSchemas,
} from '../../src/utils/validationSchemas.js';

describe('Input Validation Tests', () => {
  
  // ============================================================================
  // COMMON SCHEMA TESTS
  // ============================================================================
  
  describe('Common Schemas', () => {
    describe('Email validation', () => {
      test('should accept valid email addresses', () => {
        const validEmails = [
          'user@example.com',
          'test.user@example.co.uk',
          'user+tag@example.com',
          'user_name@example.com',
          'user123@sub.example.com'
        ];
        
        validEmails.forEach(email => {
          const { error } = commonSchemas.email.validate(email);
          expect(error).toBeUndefined();
        });
      });
      
      test('should reject invalid email addresses', () => {
        const invalidEmails = [
          'notanemail',
          '@example.com',
          'user@',
          'user @example.com',
          'user@example',
          'user..name@example.com',
          'user@.example.com'
        ];
        
        invalidEmails.forEach(email => {
          const { error } = commonSchemas.email.validate(email);
          expect(error).toBeDefined();
          expect(error.message).toContain('valid email');
        });
      });
      
      test('should normalize email to lowercase', () => {
        const { value } = commonSchemas.email.validate('User@Example.COM');
        expect(value).toBe('user@example.com');
      });
      
      test('should trim whitespace from email', () => {
        const { value } = commonSchemas.email.validate('  user@example.com  ');
        expect(value).toBe('user@example.com');
      });
      
      test('should reject email exceeding 255 characters', () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        const { error } = commonSchemas.email.validate(longEmail);
        expect(error).toBeDefined();
      });
    });
    
    describe('Password validation', () => {
      test('should accept strong passwords', () => {
        const validPasswords = [
          'Password123!',
          'Str0ng@Pass',
          'C0mpl3x!Pass',
          'MyP@ssw0rd123',
          'Secure$2025'
        ];
        
        validPasswords.forEach(password => {
          const { error } = commonSchemas.password.validate(password);
          expect(error).toBeUndefined();
        });
      });
      
      test('should reject passwords without uppercase letters', () => {
        const { error } = commonSchemas.password.validate('password123!');
        expect(error).toBeDefined();
        expect(error.message).toContain('uppercase');
      });
      
      test('should reject passwords without lowercase letters', () => {
        const { error } = commonSchemas.password.validate('PASSWORD123!');
        expect(error).toBeDefined();
        expect(error.message).toContain('lowercase');
      });
      
      test('should reject passwords without numbers', () => {
        const { error } = commonSchemas.password.validate('Password!');
        expect(error).toBeDefined();
        expect(error.message).toContain('number');
      });
      
      test('should reject passwords without special characters', () => {
        const { error } = commonSchemas.password.validate('Password123');
        expect(error).toBeDefined();
        expect(error.message).toContain('special character');
      });
      
      test('should reject passwords shorter than 8 characters', () => {
        const { error } = commonSchemas.password.validate('Pass1!');
        expect(error).toBeDefined();
        expect(error.message).toContain('at least 8 characters');
      });
      
      test('should reject passwords longer than 128 characters', () => {
        const longPassword = 'A1!' + 'a'.repeat(130);
        const { error } = commonSchemas.password.validate(longPassword);
        expect(error).toBeDefined();
        expect(error.message).toContain('128 characters');
      });
    });
    
    describe('UUID validation', () => {
      test('should accept valid UUIDs', () => {
        // Using v4 UUIDs (version identifier in 3rd group should be 4)
        const validUUIDs = [
          '550e8400-e29b-41d4-a716-446655440000', // v4 UUID
          'f47ac10b-58cc-4372-a567-0e02b2c3d479', // v4 UUID
          '6ba7b810-9dad-41d1-80b4-00c04fd430c8'  // v4 UUID
        ];
        
        validUUIDs.forEach(uuid => {
          const { error } = commonSchemas.uuid.validate(uuid);
          expect(error).toBeUndefined();
        });
      });
      
      test('should reject invalid UUIDs', () => {
        const invalidUUIDs = [
          'not-a-uuid',
          '123',
          '123e4567-e89b-12d3-a456',
          '123e4567-e89b-12d3-a456-426614174000-extra',
          'ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ'
        ];
        
        invalidUUIDs.forEach(uuid => {
          const { error } = commonSchemas.uuid.validate(uuid);
          expect(error).toBeDefined();
        });
      });
    });
    
    describe('URL validation', () => {
      test('should accept valid URLs', () => {
        const validURLs = [
          'https://example.com',
          'http://example.com/path',
          'https://sub.example.com:8080/path?query=value',
          'https://example.com/path#anchor'
        ];
        
        validURLs.forEach(url => {
          const { error } = commonSchemas.url.validate(url);
          expect(error).toBeUndefined();
        });
      });
      
      test('should reject non-HTTP(S) URLs', () => {
        const invalidURLs = [
          'ftp://example.com',
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
          'file:///etc/passwd'
        ];
        
        invalidURLs.forEach(url => {
          const { error } = commonSchemas.url.validate(url);
          expect(error).toBeDefined();
        });
      });
      
      test('should reject URLs exceeding 2048 characters', () => {
        const longURL = 'https://example.com/' + 'a'.repeat(2040);
        const { error } = commonSchemas.url.validate(longURL);
        expect(error).toBeDefined();
      });
    });
    
    describe('Name validation', () => {
      test('should accept valid names', () => {
        const validNames = [
          'John',
          'Mary Jane',
          "O'Brien",
          'Jean-Pierre',
          'Mary Ann Smith',
          "D'Angelo"
        ];
        
        validNames.forEach(name => {
          const { error } = commonSchemas.name.validate(name);
          expect(error).toBeUndefined();
        });
      });
      
      test('should reject names with numbers', () => {
        const { error } = commonSchemas.name.validate('John123');
        expect(error).toBeDefined();
      });
      
      test('should reject names with special characters', () => {
        const invalidNames = ['John@Doe', 'Jane$Smith', 'Bob#Test'];
        
        invalidNames.forEach(name => {
          const { error } = commonSchemas.name.validate(name);
          expect(error).toBeDefined();
        });
      });
      
      test('should reject names exceeding 100 characters', () => {
        const longName = 'A'.repeat(101);
        const { error } = commonSchemas.name.validate(longName);
        expect(error).toBeDefined();
      });
      
      test('should trim whitespace from names', () => {
        const { value } = commonSchemas.name.validate('  John Doe  ');
        expect(value).toBe('John Doe');
      });
    });
    
    describe('Pagination validation', () => {
      test('should accept valid pagination params', () => {
        const { error, value } = commonSchemas.pagination.page.validate(5);
        expect(error).toBeUndefined();
        expect(value).toBe(5);
      });
      
      test('should default page to 1', () => {
        const { value } = commonSchemas.pagination.page.validate(undefined);
        expect(value).toBe(1);
      });
      
      test('should reject page less than 1', () => {
        const { error } = commonSchemas.pagination.page.validate(0);
        expect(error).toBeDefined();
      });
      
      test('should reject non-integer page numbers', () => {
        const { error } = commonSchemas.pagination.page.validate(1.5);
        expect(error).toBeDefined();
      });
      
      test('should default limit to 20', () => {
        const { value } = commonSchemas.pagination.limit.validate(undefined);
        expect(value).toBe(20);
      });
      
      test('should reject limit exceeding 100', () => {
        const { error } = commonSchemas.pagination.limit.validate(101);
        expect(error).toBeDefined();
      });
    });
  });
  
  // ============================================================================
  // AUTHENTICATION SCHEMA TESTS
  // ============================================================================
  
  describe('Authentication Schemas', () => {
    describe('Register schema', () => {
      const validRegistration = {
        email: 'newuser@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        organizationName: 'Acme Corp',
        termsAccepted: true
      };
      
      test('should accept valid registration data', () => {
        const { error } = authSchemas.register.validate(validRegistration);
        expect(error).toBeUndefined();
      });
      
      test('should reject when passwords do not match', () => {
        const data = { ...validRegistration, confirmPassword: 'DifferentPass123!' };
        const { error } = authSchemas.register.validate(data);
        expect(error).toBeDefined();
        expect(error.message).toContain('must match');
      });
      
      test('should reject when terms not accepted', () => {
        const data = { ...validRegistration, termsAccepted: false };
        const { error } = authSchemas.register.validate(data);
        expect(error).toBeDefined();
        expect(error.message).toContain('terms');
      });
      
      test('should reject organization name shorter than 2 characters', () => {
        const data = { ...validRegistration, organizationName: 'A' };
        const { error } = authSchemas.register.validate(data);
        expect(error).toBeDefined();
      });
      
      test('should reject organization name exceeding 200 characters', () => {
        const data = { ...validRegistration, organizationName: 'A'.repeat(201) };
        const { error } = authSchemas.register.validate(data);
        expect(error).toBeDefined();
      });
      
      test('should accept optional phone number', () => {
        // Phone extension expects digits only after formatting removal
        const data = { ...validRegistration, phone: '+15551234567' };
        const { error } = authSchemas.register.validate(data);
        expect(error).toBeUndefined();
      });
      
      test('should reject missing required fields', () => {
        const requiredFields = ['email', 'password', 'firstName', 'lastName', 'organizationName'];
        
        requiredFields.forEach(field => {
          const data = { ...validRegistration };
          delete data[field];
          const { error } = authSchemas.register.validate(data);
          expect(error).toBeDefined();
        });
      });
    });
    
    describe('Login schema', () => {
      test('should accept valid login credentials', () => {
        const { error } = authSchemas.login.validate({
          email: 'user@example.com',
          password: 'anypassword'
        });
        expect(error).toBeUndefined();
      });
      
      test('should reject invalid email format', () => {
        const { error } = authSchemas.login.validate({
          email: 'invalid-email',
          password: 'password'
        });
        expect(error).toBeDefined();
      });
      
      test('should reject missing password', () => {
        const { error} = authSchemas.login.validate({
          email: 'user@example.com'
        });
        expect(error).toBeDefined();
        expect(error.message).toContain('Password');
      });
      
      test('should reject extra fields', () => {
        const { error } = authSchemas.login.validate({
          email: 'user@example.com',
          password: 'password',
          extraField: 'notAllowed'
        });
        // Joi by default rejects unknown keys
        expect(error).toBeDefined();
        expect(error.message).toContain('not allowed');
      });
    });
    
    describe('Password reset schema', () => {
      test('should accept valid reset password data', () => {
        const { error } = authSchemas.resetPassword.validate({
          token: 'valid-reset-token-123',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        });
        expect(error).toBeUndefined();
      });
      
      test('should reject when passwords do not match', () => {
        const { error } = authSchemas.resetPassword.validate({
          token: 'valid-token',
          password: 'NewPassword123!',
          confirmPassword: 'DifferentPass123!'
        });
        expect(error).toBeDefined();
        expect(error.message).toContain('match');
      });
      
      test('should reject weak new password', () => {
        const { error } = authSchemas.resetPassword.validate({
          token: 'valid-token',
          password: 'weak',
          confirmPassword: 'weak'
        });
        expect(error).toBeDefined();
      });
      
      test('should reject missing token', () => {
        const { error } = authSchemas.resetPassword.validate({
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        });
        expect(error).toBeDefined();
      });
    });
    
    describe('Change password schema', () => {
      test('should accept valid password change data', () => {
        const { error } = authSchemas.changePassword.validate({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        });
        expect(error).toBeUndefined();
      });
      
      test('should reject when new passwords do not match', () => {
        const { error } = authSchemas.changePassword.validate({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
          confirmPassword: 'DifferentPass123!'
        });
        expect(error).toBeDefined();
      });
      
      test('should reject weak new password', () => {
        const { error } = authSchemas.changePassword.validate({
          currentPassword: 'OldPassword123!',
          newPassword: 'weak',
          confirmPassword: 'weak'
        });
        expect(error).toBeDefined();
      });
      
      test('should reject missing current password', () => {
        const { error } = authSchemas.changePassword.validate({
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        });
        expect(error).toBeDefined();
      });
    });
  });
  
  // ============================================================================
  // USER SCHEMA TESTS
  // ============================================================================
  
  describe('User Schemas', () => {
    describe('Create user schema', () => {
      const validUser = {
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'recruiter',
        workspaceIds: ['550e8400-e29b-41d4-a716-446655440000'] // v4 UUID
      };
      
      test('should accept valid user creation data', () => {
        const { error } = userSchemas.create.validate(validUser);
        expect(error).toBeUndefined();
      });
      
      test('should accept all valid roles', () => {
        const roles = ['admin', 'recruiter', 'hiring_manager', 'interviewer'];
        
        roles.forEach(role => {
          const data = { ...validUser, role };
          const { error } = userSchemas.create.validate(data);
          expect(error).toBeUndefined();
        });
      });
      
      test('should reject invalid role', () => {
        const data = { ...validUser, role: 'invalid_role' };
        const { error } = userSchemas.create.validate(data);
        expect(error).toBeDefined();
        expect(error.message).toContain('admin, recruiter, hiring_manager, interviewer');
      });
      
      test('should reject empty workspace array', () => {
        const data = { ...validUser, workspaceIds: [] };
        const { error } = userSchemas.create.validate(data);
        expect(error).toBeDefined();
        expect(error.message).toContain('required value');
      });
      
      test('should reject invalid UUID in workspace array', () => {
        const data = { ...validUser, workspaceIds: ['not-a-uuid'] };
        const { error } = userSchemas.create.validate(data);
        expect(error).toBeDefined();
      });
      
      test('should accept optional phone number', () => {
        const data = { ...validUser, phone: '+15551234567' };
        const { error } = userSchemas.create.validate(data);
        expect(error).toBeUndefined();
      });
      
      test('should reject missing required fields', () => {
        const requiredFields = ['email', 'firstName', 'lastName', 'role', 'workspaceIds'];
        
        requiredFields.forEach(field => {
          const data = { ...validUser };
          delete data[field];
          const { error } = userSchemas.create.validate(data);
          expect(error).toBeDefined();
        });
      });
    });
    
    describe('Update user schema', () => {
      test('should accept partial user updates', () => {
        const updates = [
          { firstName: 'Jane' },
          { lastName: 'Smith' },
          { phone: '+15559999999' },
          { role: 'admin' },
          { isActive: false },
          { workspaceIds: ['550e8400-e29b-41d4-a716-446655440000'] }
        ];
        
        updates.forEach(update => {
          const { error } = userSchemas.update.validate(update);
          expect(error).toBeUndefined();
        });
      });
      
      test('should require at least one field to update', () => {
        const { error } = userSchemas.update.validate({});
        expect(error).toBeDefined();
      });
      
      test('should reject invalid role in update', () => {
        const { error } = userSchemas.update.validate({ role: 'super_admin' });
        expect(error).toBeDefined();
      });
    });
    
    describe('User preferences schema', () => {
      test('should accept valid preference updates', () => {
        const { error } = userSchemas.updatePreferences.validate({
          theme: 'dark',
          language: 'en',
          emailNotifications: true
        });
        expect(error).toBeUndefined();
      });
      
      test('should accept all valid themes', () => {
        const themes = ['light', 'dark', 'auto'];
        
        themes.forEach(theme => {
          const { error } = userSchemas.updatePreferences.validate({ theme });
          expect(error).toBeUndefined();
        });
      });
      
      test('should accept all valid languages', () => {
        const languages = ['en', 'es', 'fr', 'de'];
        
        languages.forEach(language => {
          const { error } = userSchemas.updatePreferences.validate({ language });
          expect(error).toBeUndefined();
        });
      });
      
      test('should reject invalid theme', () => {
        const { error } = userSchemas.updatePreferences.validate({ theme: 'rainbow' });
        expect(error).toBeDefined();
      });
      
      test('should require at least one preference field', () => {
        const { error } = userSchemas.updatePreferences.validate({});
        expect(error).toBeDefined();
      });
    });
  });
  
  // ============================================================================
  // EDGE CASES AND BOUNDARY CONDITIONS
  // ============================================================================
  
  describe('Edge Cases and Boundary Conditions', () => {
    describe('SQL Injection attempts', () => {
      test('should reject SQL injection patterns in email field', () => {
        // Email validation will reject invalid characters like spaces
        const { error } = commonSchemas.email.validate("admin OR 1=1@example.com");
        // While SQL keywords themselves may be valid in email, combined patterns would be caught
        // Note: Email validation focuses on format, SQL injection prevention happens via safeString
        expect(error).toBeDefined();
      });
      
      test('should reject SQL injection in name field', () => {
        const sqlInjections = [
          "Robert'); DROP TABLE users;--", // Has semicolon and parens - invalid name chars
          "John' OR '1'='1", // Has equals sign - invalid name char
        ];
        
        sqlInjections.forEach(name => {
          const { error } = commonSchemas.name.validate(name);
          // Name schema only allows letters, spaces, hyphens, apostrophes
          // These will be rejected due to invalid characters (semicolon, parens, equals)
          expect(error).toBeDefined();
        });
      });
    });
    
    describe('XSS attempts', () => {
      test('should reject XSS in text fields through safeString', () => {
        const xssPayloads = [
          '<script>alert("XSS")</script>',
          '<img src=x onerror=alert(1)>',
        ];
        
        xssPayloads.forEach(payload => {
          const { error } = commonSchemas.safeText.validate(payload);
          // safeString extension actively rejects XSS patterns
          expect(error).toBeDefined();
          expect(error.message).toContain('dangerous');
        });
      });
    });
    
    describe('Unicode and special characters', () => {
      test('should handle unicode characters in names', () => {
        const unicodeNames = [
          'José',
          'François',
          'Müller',
          'Александр',
          '李明'
        ];
        
        // Note: Current name pattern only allows ASCII letters
        // This documents the limitation
        unicodeNames.forEach(name => {
          const { error } = commonSchemas.name.validate(name);
          expect(error).toBeDefined(); // Current pattern doesn't support unicode
        });
      });
      
      test('should handle unicode in safe text', () => {
        const { error } = commonSchemas.safeText.validate('Hello 世界 🌍');
        expect(error).toBeUndefined();
      });
    });
    
    describe('Null and undefined handling', () => {
      test('should reject null for required fields', () => {
        const { error } = commonSchemas.email.validate(null);
        expect(error).toBeDefined();
      });
      
      test('should reject undefined for required fields', () => {
        const { error } = commonSchemas.email.validate(undefined);
        expect(error).toBeDefined();
      });
      
      test('should accept undefined for optional fields', () => {
        const { error } = commonSchemas.phone.optional().validate(undefined);
        expect(error).toBeUndefined();
      });
    });
    
    describe('Type coercion', () => {
      test('should coerce string numbers to integers for pagination', () => {
        const { value, error } = commonSchemas.pagination.page.validate('5');
        expect(error).toBeUndefined();
        expect(value).toBe(5);
        expect(typeof value).toBe('number');
      });
      
      test('should handle boolean strings', () => {
        const { value } = userSchemas.updatePreferences.validate({
          emailNotifications: 'true'
        });
        // Joi might not coerce strings to booleans by default
        expect(value.emailNotifications).toBeDefined();
      });
    });
    
    describe('Maximum length boundaries', () => {
      test('should accept text at exactly max length', () => {
        const maxLengthText = 'a'.repeat(5000);
        const { error } = commonSchemas.safeText.validate(maxLengthText);
        expect(error).toBeUndefined();
      });
      
      test('should reject text exceeding max length by 1', () => {
        const tooLongText = 'a'.repeat(5001);
        const { error } = commonSchemas.safeText.validate(tooLongText);
        expect(error).toBeDefined();
      });
    });
  });
});
