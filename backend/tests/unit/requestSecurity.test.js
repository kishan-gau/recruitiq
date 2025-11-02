/**
 * Request Security Middleware Tests
 * 
 * Tests input validation, sanitization, and security pattern detection
 */

import express from 'express';
import request from 'supertest';
import {
  sanitizeHTML,
  sanitizeQueryParams,
  validateRequestBody,
  validateQueryParams,
  validateUrlParams,
  secureRequest,
  blockFilePathInjection,
} from '../../src/middleware/requestSecurity.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

describe('Request Security Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('sanitizeHTML', () => {
    it('should escape HTML entities', () => {
      expect(sanitizeHTML('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      
      expect(sanitizeHTML('<img src=x onerror=alert(1)>'))
        .toContain('&lt;img');
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeHTML(123)).toBe(123);
      expect(sanitizeHTML(null)).toBe(null);
      expect(sanitizeHTML(undefined)).toBe(undefined);
    });
  });

  describe('sanitizeQueryParams', () => {
    it('should strip control characters from strings', () => {
      const params = { name: 'test\x00\x01value' };
      const result = sanitizeQueryParams(params);
      expect(result.name).not.toContain('\x00');
      expect(result.name).not.toContain('\x01');
    });

    it('should reject dangerous patterns in values', () => {
      const params = { query: "'; DROP TABLE users--" };
      expect(() => sanitizeQueryParams(params)).toThrow('disallowed characters');
    });

    it('should skip dangerous keys', () => {
      const params = { 'key; DROP TABLE': 'value' };
      const result = sanitizeQueryParams(params);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle arrays when allowed', () => {
      const params = { tags: ['tag1', 'tag2'] };
      const result = sanitizeQueryParams(params, { allowArrays: true });
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });

    it('should reject arrays when not allowed', () => {
      const params = { tags: ['tag1', 'tag2'] };
      const result = sanitizeQueryParams(params, { allowArrays: false });
      expect(result.tags).toBeUndefined();
    });
  });

  describe('validateRequestBody middleware', () => {
    beforeEach(() => {
      app.post('/test', validateRequestBody(), (req, res) => {
        res.json({ body: req.body });
      });
      app.use(errorHandler);
    });

    it('should allow safe input', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: 'John Doe', age: 30 })
        .expect(200);

      expect(response.body.body.name).toBe('John Doe');
      expect(response.body.body.age).toBe(30);
    });

    it('should reject SQL injection patterns', async () => {
      await request(app)
        .post('/test')
        .send({ name: "'; DROP TABLE users--" })
        .expect(400);
    });

    it('should reject XSS patterns', async () => {
      await request(app)
        .post('/test')
        .send({ content: '<script>alert(1)</script>' })
        .expect(400);
    });

    it('should reject command injection patterns', async () => {
      await request(app)
        .post('/test')
        .send({ cmd: 'test; rm -rf /' })
        .expect(400);
    });

    it('should reject NoSQL injection patterns', async () => {
      await request(app)
        .post('/test')
        .send({ query: { $gt: '' } })
        .expect(400);
    });

    it('should reject prototype pollution attempts', async () => {
      await request(app)
        .post('/test')
        .send({ __proto__: { admin: true } })
        .expect(400);

      await request(app)
        .post('/test')
        .send({ constructor: { prototype: { admin: true } } })
        .expect(400);
    });

    it('should reject deeply nested objects', async () => {
      const deepObject = { a: { b: { c: { d: { e: { f: { g: 'too deep' } } } } } } };
      
      await request(app)
        .post('/test')
        .send(deepObject)
        .expect(400);
    });

    it('should strip control characters', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: 'John\x00Doe\x01Test' })
        .expect(200);

      expect(response.body.body.name).not.toContain('\x00');
      expect(response.body.body.name).not.toContain('\x01');
    });
  });

  describe('validateQueryParams middleware', () => {
    beforeEach(() => {
      app.get('/test', validateQueryParams(), (req, res) => {
        res.json({ query: req.query });
      });
      app.use(errorHandler);
    });

    it('should allow safe query parameters', async () => {
      const response = await request(app)
        .get('/test?name=John&age=30')
        .expect(200);

      expect(response.body.query.name).toBe('John');
      expect(response.body.query.age).toBe('30');
    });

    it('should reject SQL injection in query params', async () => {
      await request(app)
        .get('/test?id=1 OR 1=1')
        .expect(400);
    });

    it('should reject XSS in query params', async () => {
      await request(app)
        .get('/test?msg=<script>alert(1)</script>')
        .expect(400);
    });
  });

  describe('validateUrlParams middleware', () => {
    beforeEach(() => {
      app.get('/test/:id', validateUrlParams(), (req, res) => {
        res.json({ params: req.params });
      });
      app.use(errorHandler);
    });

    it('should allow safe URL parameters', async () => {
      const response = await request(app)
        .get('/test/123')
        .expect(200);

      expect(response.body.params.id).toBe('123');
    });

    it('should reject path traversal attempts', async () => {
      await request(app)
        .get('/test/../../../etc/passwd')
        .expect(400);
    });

    it('should reject SQL injection in URL params', async () => {
      await request(app)
        .get("/test/1' OR '1'='1")
        .expect(400);
    });
  });

  describe('secureRequest combined middleware', () => {
    beforeEach(() => {
      app.post('/test/:id', secureRequest(), (req, res) => {
        res.json({
          params: req.params,
          query: req.query,
          body: req.body,
        });
      });
      app.use(errorHandler);
    });

    it('should validate all request components', async () => {
      const response = await request(app)
        .post('/test/123?filter=active')
        .send({ name: 'John' })
        .expect(200);

      expect(response.body.params.id).toBe('123');
      expect(response.body.query.filter).toBe('active');
      expect(response.body.body.name).toBe('John');
    });

    it('should reject attacks in any component', async () => {
      // Attack in body
      await request(app)
        .post('/test/123')
        .send({ name: "'; DROP TABLE--" })
        .expect(400);

      // Attack in query
      await request(app)
        .post('/test/123?filter=<script>alert(1)</script>')
        .send({ name: 'John' })
        .expect(400);

      // Attack in URL params
      await request(app)
        .post('/test/../../../etc/passwd')
        .send({ name: 'John' })
        .expect(400);
    });
  });

  describe('blockFilePathInjection middleware', () => {
    beforeEach(() => {
      app.post('/test', blockFilePathInjection(), (req, res) => {
        res.json({ body: req.body });
      });
      app.use(errorHandler);
    });

    it('should allow safe file paths', async () => {
      const response = await request(app)
        .post('/test')
        .send({ file: 'uploads/documents/resume.pdf' })
        .expect(200);

      expect(response.body.body.file).toBe('uploads/documents/resume.pdf');
    });

    it('should block /etc/passwd access attempts', async () => {
      await request(app)
        .post('/test')
        .send({ file: '/etc/passwd' })
        .expect(400);
    });

    it('should block Windows system paths', async () => {
      await request(app)
        .post('/test')
        .send({ file: 'C:\\Windows\\System32\\config' })
        .expect(400);
    });

    it('should block directory traversal', async () => {
      await request(app)
        .post('/test')
        .send({ file: '../../../etc/passwd' })
        .expect(400);

      await request(app)
        .post('/test')
        .send({ file: '..\\..\\..\\Windows\\System32' })
        .expect(400);
    });

    it('should block /proc and /sys access', async () => {
      await request(app)
        .post('/test')
        .send({ file: '/proc/self/environ' })
        .expect(400);

      await request(app)
        .post('/test')
        .send({ file: '/sys/class/net' })
        .expect(400);
    });
  });

  describe('Security Pattern Detection', () => {
    beforeEach(() => {
      app.post('/test', validateRequestBody(), (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandler);
    });

    it('should detect SQL tautologies', async () => {
      await request(app)
        .post('/test')
        .send({ query: "1=1" })
        .expect(400);

      await request(app)
        .post('/test')
        .send({ query: "' OR '1'='1" })
        .expect(400);
    });

    it('should detect SQL UNION attacks', async () => {
      await request(app)
        .post('/test')
        .send({ query: "1 UNION SELECT * FROM users" })
        .expect(400);
    });

    it('should detect JavaScript event handlers', async () => {
      await request(app)
        .post('/test')
        .send({ html: '<div onclick="alert(1)">Click</div>' })
        .expect(400);

      await request(app)
        .post('/test')
        .send({ html: '<img onerror="alert(1)" src=x>' })
        .expect(400);
    });

    it('should detect JavaScript URI schemes', async () => {
      await request(app)
        .post('/test')
        .send({ link: 'javascript:alert(1)' })
        .expect(400);

      await request(app)
        .post('/test')
        .send({ link: 'vbscript:msgbox(1)' })
        .expect(400);
    });

    it('should detect data URIs with HTML', async () => {
      await request(app)
        .post('/test')
        .send({ src: 'data:text/html,<script>alert(1)</script>' })
        .expect(400);
    });

    it('should detect MongoDB operators', async () => {
      await request(app)
        .post('/test')
        .send({ filter: { price: { $gt: 0 } } })
        .expect(400);

      await request(app)
        .post('/test')
        .send({ filter: { email: { $regex: '.*' } } })
        .expect(400);
    });

    it('should detect shell meta-characters', async () => {
      const shellChars = [';', '|', '&', '`', '$', '(', ')', '<', '>'];
      
      for (const char of shellChars) {
        await request(app)
          .post('/test')
          .send({ cmd: `test${char}malicious` })
          .expect(400);
      }
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      app.post('/test', secureRequest(), (req, res) => {
        res.json({ body: req.body });
      });
      app.use(errorHandler);
    });

    it('should handle empty objects', async () => {
      const response = await request(app)
        .post('/test')
        .send({})
        .expect(200);

      expect(response.body.body).toEqual({});
    });

    it('should handle null values', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: null, age: null })
        .expect(200);

      expect(response.body.body.name).toBeNull();
      expect(response.body.body.age).toBeNull();
    });

    it('should handle arrays', async () => {
      const response = await request(app)
        .post('/test')
        .send({ tags: ['tag1', 'tag2', 'tag3'] })
        .expect(200);

      expect(response.body.body.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should handle numbers and booleans', async () => {
      const response = await request(app)
        .post('/test')
        .send({ age: 30, active: true, score: 95.5 })
        .expect(200);

      expect(response.body.body.age).toBe(30);
      expect(response.body.body.active).toBe(true);
      expect(response.body.body.score).toBe(95.5);
    });

    it('should handle Unicode characters', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: '日本語', emoji: '🎉' })
        .expect(200);

      expect(response.body.body.name).toBe('日本語');
      expect(response.body.body.emoji).toBe('🎉');
    });
  });
});
