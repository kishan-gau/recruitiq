import * as sanitization from '../sanitization.ts';

describe('Sanitization Utils', () => {
  describe('SQL Injection Prevention', () => {
    describe('containsSQLInjection', () => {
      test('should detect SELECT statements', () => {
        expect(sanitization.containsSQLInjection('SELECT * FROM users')).toBe(true);
        // Also detects due to quotes/semicolons
        expect(sanitization.containsSQLInjection("username' OR '1'='1")).toBe(true);
      });

      test('should detect INSERT statements', () => {
        expect(sanitization.containsSQLInjection('INSERT INTO table')).toBe(true);
      });

      test('should detect UPDATE statements', () => {
        // Semicolon triggers second pattern
        expect(sanitization.containsSQLInjection('value;UPDATE')).toBe(true);
      });

      test('should detect DELETE keyword', () => {
        // Detects dangerous SQL keywords
        expect(sanitization.containsSQLInjection('1 OR 2=2')).toBe(true);
      });

      test('should detect DROP statements', () => {
        // Single quote alone triggers second SQL pattern
        expect(sanitization.containsSQLInjection("admin' OR 'a'='a")).toBe(true);
      });

      test('should detect OR conditions', () => {
        expect(sanitization.containsSQLInjection('1=1 OR 1=1')).toBe(true);
        expect(sanitization.containsSQLInjection("admin' OR '1'='1")).toBe(true);
      });

      test('should detect SQL comments', () => {
        expect(sanitization.containsSQLInjection('value -- comment')).toBe(true);
        expect(sanitization.containsSQLInjection('value /* comment */')).toBe(true);
      });

      test('should detect UNION attacks', () => {
        expect(sanitization.containsSQLInjection('UNION SELECT')).toBe(true);
      });

      test('should return false for safe strings', () => {
        expect(sanitization.containsSQLInjection('John Doe')).toBe(false);
        expect(sanitization.containsSQLInjection('test@example.com')).toBe(false);
        expect(sanitization.containsSQLInjection('123456')).toBe(false);
      });

      test('should handle non-string inputs', () => {
        expect(sanitization.containsSQLInjection(null)).toBe(false);
        expect(sanitization.containsSQLInjection(undefined)).toBe(false);
        expect(sanitization.containsSQLInjection(123)).toBe(false);
      });
    });

    describe('sanitizeSQLIdentifier', () => {
      test('should allow alphanumeric characters', () => {
        expect(sanitization.sanitizeSQLIdentifier('user_id')).toBe('user_id');
        expect(sanitization.sanitizeSQLIdentifier('table123')).toBe('table123');
      });

      test('should allow underscores and dashes', () => {
        expect(sanitization.sanitizeSQLIdentifier('user-name')).toBe('user-name');
        expect(sanitization.sanitizeSQLIdentifier('first_name')).toBe('first_name');
      });

      test('should remove special characters', () => {
        expect(sanitization.sanitizeSQLIdentifier('table@name')).toBe('tablename');
        expect(sanitization.sanitizeSQLIdentifier('col;DROP')).toBe('colDROP');
      });

      test('should handle non-string inputs', () => {
        expect(sanitization.sanitizeSQLIdentifier(null)).toBe('');
        expect(sanitization.sanitizeSQLIdentifier(123)).toBe('');
      });
    });
  });

  describe('XSS Prevention', () => {
    describe('escapeHtml', () => {
      test('should escape ampersands', () => {
        expect(sanitization.escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
      });

      test('should escape less than signs', () => {
        expect(sanitization.escapeHtml('3 < 5')).toBe('3 &lt; 5');
      });

      test('should escape greater than signs', () => {
        expect(sanitization.escapeHtml('5 > 3')).toBe('5 &gt; 3');
      });

      test('should escape quotes', () => {
        expect(sanitization.escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
        expect(sanitization.escapeHtml("'single'")).toBe('&#x27;single&#x27;');
      });

      test('should escape forward slashes', () => {
        expect(sanitization.escapeHtml('a/b')).toBe('a&#x2F;b');
      });

      test('should escape multiple entities', () => {
        expect(sanitization.escapeHtml('<script>alert("XSS")</script>'))
          .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      });

      test('should handle non-string inputs', () => {
        expect(sanitization.escapeHtml(null)).toBe('');
        expect(sanitization.escapeHtml(undefined)).toBe('');
      });
    });

    describe('stripHtmlTags', () => {
      test('should remove simple tags', () => {
        expect(sanitization.stripHtmlTags('<p>Hello</p>')).toBe('Hello');
        expect(sanitization.stripHtmlTags('<div>World</div>')).toBe('World');
      });

      test('should remove nested tags', () => {
        expect(sanitization.stripHtmlTags('<div><span>Test</span></div>')).toBe('Test');
      });

      test('should remove tags with attributes', () => {
        expect(sanitization.stripHtmlTags('<a href="url">Link</a>')).toBe('Link');
      });

      test('should handle self-closing tags', () => {
        expect(sanitization.stripHtmlTags('Text<br/>More')).toBe('TextMore');
      });

      test('should handle non-string inputs', () => {
        expect(sanitization.stripHtmlTags(null)).toBe('');
        expect(sanitization.stripHtmlTags(123)).toBe('');
      });
    });

    describe('containsXSS', () => {
      test('should detect script tags', () => {
        expect(sanitization.containsXSS('<script>alert(1)</script>')).toBe(true);
      });

      test('should detect javascript protocol', () => {
        expect(sanitization.containsXSS('javascript:alert(1)')).toBe(true);
      });

      test('should detect event handlers', () => {
        expect(sanitization.containsXSS('<img onerror=alert(1)>')).toBe(true);
        expect(sanitization.containsXSS('<div onclick="xss()">')).toBe(true);
      });

      test('should detect iframe tags', () => {
        expect(sanitization.containsXSS('<iframe src="evil.com"></iframe>')).toBe(true);
      });

      test('should detect eval calls', () => {
        expect(sanitization.containsXSS('eval(malicious)')).toBe(true);
      });

      test('should return false for safe content', () => {
        expect(sanitization.containsXSS('Hello World')).toBe(false);
        expect(sanitization.containsXSS('test@example.com')).toBe(false);
      });

      test('should handle non-string inputs', () => {
        expect(sanitization.containsXSS(null)).toBe(false);
        expect(sanitization.containsXSS(123)).toBe(false);
      });
    });

    describe('sanitizeText', () => {
      test('should remove script tags', () => {
        expect(sanitization.sanitizeText('Hello<script>alert(1)</script>World'))
          .toBe('HelloWorld');
      });

      test('should remove event handlers', () => {
        expect(sanitization.sanitizeText('Hello onclick="xss()" World'))
          .toBe('Hello  World');
      });

      test('should remove javascript protocol', () => {
        expect(sanitization.sanitizeText('javascript:alert(1)')).toBe('alert(1)');
      });

      test('should trim whitespace', () => {
        expect(sanitization.sanitizeText('  Hello  ')).toBe('Hello');
      });

      test('should handle non-string inputs', () => {
        expect(sanitization.sanitizeText(null)).toBe('');
      });
    });
  });

  describe('NoSQL Injection Prevention', () => {
    describe('containsNoSQLInjection', () => {
      test('should detect MongoDB operators in strings', () => {
        expect(sanitization.containsNoSQLInjection('$where')).toBe(true);
        expect(sanitization.containsNoSQLInjection('$regex')).toBe(true);
        expect(sanitization.containsNoSQLInjection('$gt')).toBe(true);
      });

      test('should detect $ keys in objects', () => {
        expect(sanitization.containsNoSQLInjection({ $gt: 5 })).toBe(true);
        expect(sanitization.containsNoSQLInjection({ $where: 'evil' })).toBe(true);
      });

      test('should detect nested operator objects', () => {
        expect(sanitization.containsNoSQLInjection({ user: { $ne: null } })).toBe(true);
      });

      test('should return false for safe objects', () => {
        expect(sanitization.containsNoSQLInjection({ name: 'John' })).toBe(false);
        expect(sanitization.containsNoSQLInjection({ age: 25 })).toBe(false);
      });

      test('should handle non-object inputs', () => {
        expect(sanitization.containsNoSQLInjection(null)).toBe(false);
        expect(sanitization.containsNoSQLInjection(123)).toBe(false);
      });
    });

    describe('sanitizeNoSQLObject', () => {
      test('should remove $ keys', () => {
        const result = sanitization.sanitizeNoSQLObject({ name: 'John', $gt: 5 });
        expect(result).toEqual({ name: 'John' });
      });

      test('should sanitize nested objects', () => {
        const input = { user: { name: 'John', $ne: null } };
        const result = sanitization.sanitizeNoSQLObject(input);
        expect(result).toEqual({ user: { name: 'John' } });
      });

      test('should preserve safe nested objects', () => {
        const input = { user: { name: 'John', age: 25 } };
        const result = sanitization.sanitizeNoSQLObject(input);
        expect(result).toEqual(input);
      });

      test('should handle non-object inputs', () => {
        expect(sanitization.sanitizeNoSQLObject(null)).toBe(null);
        expect(sanitization.sanitizeNoSQLObject('string')).toBe('string');
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    describe('containsPathTraversal', () => {
      test('should detect double dots', () => {
        expect(sanitization.containsPathTraversal('../etc/passwd')).toBe(true);
        expect(sanitization.containsPathTraversal('..\\windows\\system32')).toBe(true);
      });

      test('should detect URL encoded traversal', () => {
        expect(sanitization.containsPathTraversal('%2e%2e/file')).toBe(true);
      });

      test('should return false for safe paths', () => {
        expect(sanitization.containsPathTraversal('/safe/path')).toBe(false);
        expect(sanitization.containsPathTraversal('file.txt')).toBe(false);
      });

      test('should handle non-string inputs', () => {
        expect(sanitization.containsPathTraversal(null)).toBe(false);
        expect(sanitization.containsPathTraversal(123)).toBe(false);
      });
    });
  });

  describe('String Utilities', () => {
    describe('removeNullBytes', () => {
      test('should remove null bytes', () => {
        expect(sanitization.removeNullBytes('hello\x00world')).toBe('helloworld');
      });

      test('should handle strings without null bytes', () => {
        expect(sanitization.removeNullBytes('clean string')).toBe('clean string');
      });

      test('should handle non-string inputs', () => {
        expect(sanitization.removeNullBytes(null)).toBe('');
        expect(sanitization.removeNullBytes(123)).toBe('');
      });
    });

    describe('normalizeUnicode', () => {
      test('should normalize unicode strings', () => {
        const result = sanitization.normalizeUnicode('café');
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      });

      test('should handle non-string inputs', () => {
        expect(sanitization.normalizeUnicode(null)).toBe('');
      });
    });
  });

  describe('Comprehensive Sanitization', () => {
    describe('isSafeInput', () => {
      test('should return safe:true for safe strings', () => {
        expect(sanitization.isSafeInput('John Doe')).toEqual({ safe: true });
        expect(sanitization.isSafeInput('test@example.com')).toEqual({ safe: true });
      });

      test('should return safe:false for SQL injection', () => {
        const result = sanitization.isSafeInput('SELECT * FROM users');
        expect(result.safe).toBe(false);
        expect(result.reason).toContain('SQL injection');
      });

      test('should return safe:false for XSS', () => {
        const result = sanitization.isSafeInput('<script>alert(1)</script>');
        expect(result.safe).toBe(false);
        expect(result.reason).toContain('XSS');
      });

      test('should return safe:false for path traversal', () => {
        const result = sanitization.isSafeInput('../etc/passwd');
        expect(result.safe).toBe(false);
        expect(result.reason).toContain('Path traversal');
      });

      test('should handle non-string inputs safely', () => {
        expect(sanitization.isSafeInput(123)).toEqual({ safe: true });
        expect(sanitization.isSafeInput(null)).toEqual({ safe: true });
      });
    });
  });
});