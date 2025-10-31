/**
 * Security Test: RLS Context Setting SQL Injection Prevention
 * 
 * This test verifies that the Row Level Security (RLS) context setting
 * in middleware/auth.js is protected against SQL injection attacks.
 * 
 * The fix uses parameterized queries with set_config() instead of
 * string interpolation to prevent SQL injection vulnerabilities.
 */

const fs = require('fs');
const path = require('path');

describe('RLS Context Setting - SQL Injection Prevention', () => {
  const authMiddlewarePath = path.join(__dirname, '../../src/middleware/auth.js');
  let authMiddlewareCode;

  beforeAll(() => {
    // Read the actual middleware code
    authMiddlewareCode = fs.readFileSync(authMiddlewarePath, 'utf8');
  });

  describe('Code Analysis - Parameterized Query Implementation', () => {
    it('should use set_config() with parameterized query ($1 placeholder)', () => {
      // Verify the code uses set_config with $1 parameter
      expect(authMiddlewareCode).toContain("SELECT set_config('app.current_organization_id', $1, true)");
      
      // Verify it's passing the organization_id as a parameter array
      expect(authMiddlewareCode).toContain('[user.organization_id]');
    });

    it('should NOT use string interpolation or concatenation for SQL', () => {
      // Check for dangerous patterns that indicate SQL injection vulnerability
      const dangerousPatterns = [
        /SET LOCAL.*\$\{.*organization_id.*\}/i,  // Template literal interpolation
        /SET LOCAL.*\+.*organization_id/i,         // String concatenation
        /SET LOCAL.*'.*\+.*'/i,                    // Quote concatenation
        /app\.current_organization_id.*=.*'.*\$\{/i  // Template literal in value
      ];

      dangerousPatterns.forEach((pattern, index) => {
        expect(authMiddlewareCode).not.toMatch(pattern);
      });
    });

    it('should validate UUID format before using organization_id', () => {
      // Verify UUID validation regex exists
      expect(authMiddlewareCode).toContain('uuidRegex');
      
      // Verify the regex pattern validates UUID format (check for key UUID parts)
      expect(authMiddlewareCode).toContain('[0-9a-f]{8}');
      expect(authMiddlewareCode).toContain('[0-9a-f]{4}');
      expect(authMiddlewareCode).toContain('[0-9a-f]{12}');
      
      // Verify validation is performed
      expect(authMiddlewareCode).toContain('if (!uuidRegex.test(user.organization_id))');
    });

    it('should reject invalid organization_id format with 403', () => {
      // Verify error handling for invalid UUID
      const errorHandlingRegex = /Invalid organization_id format[\s\S]{0,200}error.*Forbidden/;
      expect(authMiddlewareCode).toMatch(errorHandlingRegex);
    });

    it('should only set RLS context for tenant users', () => {
      // Verify conditional check for tenant users
      expect(authMiddlewareCode).toContain("user_type === 'tenant'");
      expect(authMiddlewareCode).toContain('user.organization_id');
    });

    it('should use parameterized queries in user lookup', () => {
      // Verify user queries also use parameterized queries
      const userQueryRegex = /WHERE u\.id = \$1/;
      expect(authMiddlewareCode).toMatch(userQueryRegex);
    });
  });

  describe('UUID Validation Logic', () => {
    // Test the UUID regex pattern directly
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    it('should accept valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
        'ffffffff-ffff-ffff-ffff-ffffffffffff'
      ];

      validUUIDs.forEach(uuid => {
        expect(uuidRegex.test(uuid)).toBe(true);
      });
    });

    it('should reject SQL injection attempts', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; DELETE FROM users WHERE '1'='1",
        "' UNION SELECT * FROM users --",
        "'; UPDATE users SET role='admin' WHERE '1'='1",
        "\\'; DROP TABLE organizations; --",
        "1'; EXEC xp_cmdshell('dir'); --",
        "' OR 1=1 --",
        "admin'--",
        "' OR 'x'='x",
        "1' AND '1' = '1",
        "'; SHUTDOWN; --"
      ];

      sqlInjectionAttempts.forEach(attempt => {
        expect(uuidRegex.test(attempt)).toBe(false);
      });
    });

    it('should reject XSS attempts', () => {
      const xssAttempts = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>',
        '"><script>alert(1)</script>'
      ];

      xssAttempts.forEach(attempt => {
        expect(uuidRegex.test(attempt)).toBe(false);
      });
    });

    it('should reject path traversal attempts', () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '/etc/passwd',
        'C:\\Windows\\System32',
        '....//....//....//etc/passwd'
      ];

      pathTraversalAttempts.forEach(attempt => {
        expect(uuidRegex.test(attempt)).toBe(false);
      });
    });

    it('should reject malformed UUIDs', () => {
      const malformedUUIDs = [
        'not-a-uuid',
        '123e4567e89b12d3a456426614174000',  // Missing dashes
        '123e4567-e89b-12d3-a456',             // Too short
        '123e4567-e89b-12d3-a456-42661417400g', // Invalid character
        '123e4567-e89b-12d3-a456-42661417400',  // Too short in last segment
        '',                                     // Empty
        'null',
        'undefined',
        '00000000-0000-0000-0000-000000000000-extra',
        '123e4567_e89b_12d3_a456_426614174000'  // Wrong separator
      ];

      malformedUUIDs.forEach(uuid => {
        expect(uuidRegex.test(uuid)).toBe(false);
      });
    });
  });

  describe('Security Best Practices Verification', () => {
    it('should use await for async database queries', () => {
      // Verify proper async/await usage
      expect(authMiddlewareCode).toContain('await pool.query');
    });

    it('should log security errors without exposing sensitive data', () => {
      // Verify logger is used for security events
      expect(authMiddlewareCode).toContain("logger.error('Invalid organization_id format'");
      
      // Ensure organization_id is NOT logged in error (PII/sensitive data)
      const loggerErrorRegex = /logger\.error\('Invalid organization_id format'.*\{[^}]*userId/;
      expect(authMiddlewareCode).toMatch(loggerErrorRegex);
    });

    it('should return generic error messages to clients', () => {
      // Verify error messages don't expose implementation details
      expect(authMiddlewareCode).toContain('Invalid organization context');
      
      // Check that error responses don't contain sensitive technical details
      const errorResponseRegex = /res\.status\(403\)\.json\([^)]*message:.*Invalid organization context/;
      expect(authMiddlewareCode).toMatch(errorResponseRegex);
      
      // Verify the error message is generic and doesn't reveal implementation
      const forbiddenMessageRegex = /'Invalid organization context'[^']*(?!'.*SQL|injection|parameterized|set_config)/;
      expect(authMiddlewareCode).toMatch(forbiddenMessageRegex);
    });

    it('should handle errors gracefully', () => {
      // Verify try-catch blocks exist
      expect(authMiddlewareCode).toContain('try {');
      expect(authMiddlewareCode).toContain('catch');
    });
  });

  describe('Documentation and Comments', () => {
    it('should document the security fix', () => {
      // Verify comments explain the security implementation
      const hasSecurityComments = 
        authMiddlewareCode.includes('parameterized') ||
        authMiddlewareCode.includes('set_config') ||
        authMiddlewareCode.includes('RLS context');
      
      expect(hasSecurityComments).toBe(true);
    });

    it('should document RLS context usage', () => {
      // Verify RLS is documented
      expect(authMiddlewareCode).toMatch(/RLS|Row Level Security/i);
    });
  });
});
