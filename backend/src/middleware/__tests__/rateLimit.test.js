import request from 'supertest';
import express from 'express';
import {
  globalLimiter,
  authLimiter,
  publicLimiter,
  applicationLimiter,
  createRoleBasedLimiter,
  createEndpointLimiter,
  bypassRateLimitIf,
  addRateLimitHeaders,
} from '../rateLimit.js';

describe('Rate Limiting Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(addRateLimitHeaders);
  });

  describe('Global Rate Limiter', () => {
    beforeEach(() => {
      app.use('/api', globalLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow requests within limit', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    it('should block requests exceeding limit', async () => {
      // Make requests up to the limit
      const limit = 100;
      for (let i = 0; i < limit; i++) {
        await request(app).get('/api/test');
      }

      // Next request should be rate limited
      const response = await request(app)
        .get('/api/test')
        .expect(429);

      expect(response.body.error).toBe('Rate Limit Exceeded');
      expect(response.body.retryAfter).toBeDefined();
    }, 30000); // Longer timeout for this test

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Auth Rate Limiter', () => {
    beforeEach(() => {
      app.post('/auth/login', authLimiter, (req, res) => {
        // Simulate failed login
        if (req.body.password !== 'correct') {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.json({ success: true, token: 'fake-token' });
      });
    });

    it('should allow few login attempts', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'test', password: 'wrong' })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should rate limit after multiple failed attempts', async () => {
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({ username: 'test', password: 'wrong' });
      }

      // 6th attempt should be rate limited
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'test', password: 'wrong' })
        .expect(429);

      expect(response.body.error).toBe('Rate Limit Exceeded');
    }, 15000);

    it('should not count successful logins against limit', async () => {
      // This test verifies skipSuccessfulRequests works
      // Make 5 successful logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({ username: 'test', password: 'correct' })
          .expect(200);
      }

      // Should still allow more requests (because successful ones don't count)
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'test', password: 'correct' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Public Rate Limiter', () => {
    beforeEach(() => {
      app.get('/public/jobs', publicLimiter, (req, res) => {
        res.json({ jobs: [] });
      });
    });

    it('should allow requests within public limit', async () => {
      const response = await request(app)
        .get('/public/jobs')
        .expect(200);

      expect(response.body.jobs).toBeDefined();
    });

    it('should rate limit public endpoints', async () => {
      // Make requests up to limit (50)
      for (let i = 0; i < 50; i++) {
        await request(app).get('/public/jobs');
      }

      // Next request should be blocked
      await request(app)
        .get('/public/jobs')
        .expect(429);
    }, 30000);
  });

  describe('Application Rate Limiter', () => {
    beforeEach(() => {
      app.post('/apply', applicationLimiter, (req, res) => {
        res.json({ success: true, applicationId: '123' });
      });
    });

    it('should allow application submissions within limit', async () => {
      const response = await request(app)
        .post('/apply')
        .send({ email: 'test@example.com', resume: 'data' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should rate limit by email if provided', async () => {
      // Make 5 applications with same email
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/apply')
          .send({ email: 'same@example.com', resume: 'data' });
      }

      // 6th application should be blocked
      await request(app)
        .post('/apply')
        .send({ email: 'same@example.com', resume: 'data' })
        .expect(429);
    }, 15000);

    it('should allow different emails', async () => {
      // Make 5 applications with different emails
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/apply')
          .send({ email: `user${i}@example.com`, resume: 'data' })
          .expect(200);
      }
    });
  });

  describe('Role-Based Rate Limiter', () => {
    let roleLimiter;

    beforeEach(() => {
      roleLimiter = createRoleBasedLimiter({
        admin: 100,
        user: 10,
        default: 5,
        windowMs: 60 * 1000, // 1 minute for testing
      });

      app.use((req, res, next) => {
        // Mock authentication
        if (req.get('Authorization')) {
          const role = req.get('X-User-Role') || 'user';
          req.user = { id: 'test-user-id', role };
        }
        next();
      });

      app.get('/api/data', roleLimiter, (req, res) => {
        res.json({ data: 'test' });
      });
    });

    it('should apply different limits for different roles', async () => {
      // Admin should have higher limit
      const adminResponse = await request(app)
        .get('/api/data')
        .set('Authorization', 'Bearer token')
        .set('X-User-Role', 'admin')
        .expect(200);

      expect(parseInt(adminResponse.headers['ratelimit-limit'])).toBeGreaterThan(10);

      // User should have lower limit
      const userResponse = await request(app)
        .get('/api/data')
        .set('Authorization', 'Bearer token')
        .set('X-User-Role', 'user')
        .expect(200);

      expect(parseInt(userResponse.headers['ratelimit-limit'])).toBeLessThan(100);
    });

    it('should use default limit for unknown roles', async () => {
      const response = await request(app)
        .get('/api/data')
        .set('Authorization', 'Bearer token')
        .set('X-User-Role', 'unknown')
        .expect(200);

      expect(parseInt(response.headers['ratelimit-limit'])).toBe(5);
    });
  });

  describe('Custom Endpoint Limiter', () => {
    let searchLimiter;

    beforeEach(() => {
      searchLimiter = createEndpointLimiter({
        endpoint: 'search',
        windowMs: 60 * 1000,
        max: 10,
        message: 'Search rate limit exceeded',
      });

      app.use((req, res, next) => {
        req.user = { id: 'test-user-id' };
        next();
      });

      app.get('/search', searchLimiter, (req, res) => {
        res.json({ results: [] });
      });
    });

    it('should apply custom limits to endpoint', async () => {
      const response = await request(app)
        .get('/search')
        .expect(200);

      expect(response.body.results).toBeDefined();
      expect(response.headers['ratelimit-limit']).toBe('10');
    });

    it('should rate limit endpoint separately', async () => {
      // Make 10 search requests
      for (let i = 0; i < 10; i++) {
        await request(app).get('/search');
      }

      // 11th should be blocked
      const response = await request(app)
        .get('/search')
        .expect(429);

      expect(response.body.message).toBe('Search rate limit exceeded');
    }, 15000);
  });

  describe('Bypass Rate Limiting', () => {
    let limiter;

    beforeEach(() => {
      const bypassForAdmin = bypassRateLimitIf((req) => {
        return req.user?.role === 'admin';
      });

      limiter = createEndpointLimiter({
        endpoint: 'test',
        max: 5,
        windowMs: 60 * 1000,
      });

      app.use((req, res, next) => {
        if (req.get('Authorization')) {
          const role = req.get('X-User-Role');
          req.user = { id: 'test-user-id', role };
        }
        next();
      });

      app.get('/api/test', bypassForAdmin, limiter, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should bypass rate limiting for admins', async () => {
      // Make 10 requests as admin (limit is 5, but should bypass)
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/test')
          .set('Authorization', 'Bearer token')
          .set('X-User-Role', 'admin')
          .expect(200);
      }
    });

    it('should not bypass rate limiting for regular users', async () => {
      // Make 5 requests as user
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/api/test')
          .set('Authorization', 'Bearer token')
          .set('X-User-Role', 'user');
      }

      // 6th should be blocked
      await request(app)
        .get('/api/test')
        .set('Authorization', 'Bearer token')
        .set('X-User-Role', 'user')
        .expect(429);
    }, 15000);
  });

  describe('Rate Limit Headers in Response', () => {
    beforeEach(() => {
      app.use(globalLimiter);
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
    });

    it('should include rate limit info in JSON response', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.rateLimit).toBeDefined();
      expect(response.body.rateLimit.limit).toBeDefined();
      expect(response.body.rateLimit.remaining).toBeDefined();
      expect(response.body.rateLimit.reset).toBeDefined();
    });
  });

  describe('Rate Limit Error Response', () => {
    beforeEach(() => {
      const strictLimiter = createEndpointLimiter({
        endpoint: 'strict',
        max: 1,
        windowMs: 60 * 1000,
      });

      app.use((req, res, next) => {
        req.user = { id: 'test-user-id' };
        next();
      });

      app.get('/strict', strictLimiter, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should return 429 with proper error structure', async () => {
      // First request succeeds
      await request(app).get('/strict').expect(200);

      // Second request should be rate limited
      const response = await request(app)
        .get('/strict')
        .expect(429);

      expect(response.body).toMatchObject({
        error: 'Rate Limit Exceeded',
        message: expect.any(String),
        retryAfter: expect.any(Number),
        limit: 1,
        windowMs: 60000,
      });
    });

    it('should include Retry-After header', async () => {
      // First request succeeds
      await request(app).get('/strict').expect(200);

      // Second request should be rate limited
      const response = await request(app)
        .get('/strict')
        .expect(429);

      expect(response.headers['retry-after']).toBeDefined();
    });
  });
});
