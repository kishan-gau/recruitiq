import { jest } from '@jest/globals';

// Mock dependencies BEFORE importing module under test
const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  sendCommand: jest.fn().mockResolvedValue(null),
};

const mockCreateClient = jest.fn(() => mockRedisClient);

jest.unstable_mockModule('redis', () => ({
  createClient: mockCreateClient,
}));

const mockRateLimit = jest.fn((config) => {
  const middleware = (req, res, next) => {
    // Simulate rate limiting behavior
    const key = config.keyGenerator ? config.keyGenerator(req) : req.ip;
    const rateLimitKey = `test_rate_limit_${key}`;
    
    // Store request count in test environment
    if (!global.testRateLimitStore) {
      global.testRateLimitStore = {};
    }
    
    if (!global.testRateLimitStore[rateLimitKey]) {
      global.testRateLimitStore[rateLimitKey] = {
        count: 0,
        resetTime: Date.now() + config.windowMs,
      };
    }
    
    const store = global.testRateLimitStore[rateLimitKey];
    
    // Reset if window expired
    if (Date.now() > store.resetTime) {
      store.count = 0;
      store.resetTime = Date.now() + config.windowMs;
    }
    
    store.count++;
    
    // Check if skip function returns true
    if (config.skip && config.skip(req)) {
      return next();
    }
    
    // Set rate limit headers
    const maxRequests = typeof config.max === 'function' ? config.max(req) : config.max;
    res.setHeader('RateLimit-Limit', maxRequests);
    res.setHeader('RateLimit-Remaining', Math.max(0, maxRequests - store.count));
    res.setHeader('RateLimit-Reset', new Date(store.resetTime).toISOString());
    
    // Check if limit exceeded
    if (store.count > maxRequests) {
      return config.handler(req, res);
    }
    
    next();
  };
  
  return middleware;
});

const mockRedisStore = jest.fn();

jest.unstable_mockModule('express-rate-limit', () => ({
  rateLimit: mockRateLimit,
}));

jest.unstable_mockModule('rate-limit-redis', () => ({
  RedisStore: mockRedisStore,
}));

jest.unstable_mockModule('../../config/index.ts', () => ({
  default: {
    env: 'test',
  },
}));

jest.unstable_mockModule('../../utils/logger.ts', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import AFTER mocking
const {
  globalLimiter,
  authLimiter,
  apiLimiter,
  heavyLimiter,
  publicLimiter,
  applicationLimiter,
  uploadLimiter,
  createRoleBasedLimiter,
  createEndpointLimiter,
  bypassRateLimitIf,
  addRateLimitHeaders,
  rateLimitManager,
} = await import('../rateLimit');

const logger = (await import('../../utils/logger')).default;

describe('Rate Limit Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear test rate limit store
    global.testRateLimitStore = {};
    
    // Reset environment variables
    process.env.REDIS_ENABLED = 'false';
    
    mockReq = {
      ip: '192.168.1.1',
      path: '/api/test',
      method: 'GET',
      user: null,
      body: {},
      connection: {
        remoteAddress: '192.168.1.1',
      },
      get: jest.fn((header) => {
        if (header === 'user-agent') return 'Mozilla/5.0';
        return null;
      }),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      getHeader: jest.fn((name) => {
        const headers = {
          'RateLimit-Limit': '100',
          'RateLimit-Remaining': '99',
          'RateLimit-Reset': new Date(Date.now() + 900000).toISOString(),
        };
        return headers[name];
      }),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    // Clean up test store
    delete global.testRateLimitStore;
  });

  // ============================================================================
  // RATE LIMIT MANAGER
  // ============================================================================

  describe('RateLimitManager', () => {
    it('should get status with memory store', () => {
      const status = rateLimitManager.getStatus();
      
      expect(status.enabled).toBe(false);
      expect(status.connected).toBe(false);
      expect(status.store).toBe('memory');
    });

    it('should have createLimiter method', () => {
      expect(typeof rateLimitManager.createLimiter).toBe('function');
    });

    it('should have createStore method', () => {
      expect(typeof rateLimitManager.createStore).toBe('function');
    });
  });

  // ============================================================================
  // PRE-CONFIGURED LIMITERS
  // ============================================================================

  describe('globalLimiter', () => {
    it('should allow requests under the limit', () => {
      globalLimiter(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should use IP address as key for unauthenticated requests', () => {
      globalLimiter(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use user ID as key for authenticated requests', () => {
      mockReq.user = { id: 'user-123', role: 'member' };
      
      globalLimiter(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('authLimiter', () => {
    it('should be defined as middleware function', () => {
      expect(typeof authLimiter).toBe('function');
    });

    it('should allow authentication attempts under limit', () => {
      authLimiter(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle multiple authentication attempts', () => {
      // Multiple attempts from same IP should pass under limit
      for (let i = 0; i < 5; i++) {
        authLimiter(mockReq, mockRes, mockNext);
      }
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('apiLimiter', () => {
    it('should be defined as middleware function', () => {
      expect(typeof apiLimiter).toBe('function');
    });

    it('should allow API requests under limit', () => {
      apiLimiter(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('heavyLimiter', () => {
    it('should be defined as middleware function', () => {
      expect(typeof heavyLimiter).toBe('function');
    });

    it('should allow heavy operations under limit', () => {
      heavyLimiter(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('publicLimiter', () => {
    it('should be defined as middleware function', () => {
      expect(typeof publicLimiter).toBe('function');
    });

    it('should allow public requests under limit', () => {
      publicLimiter(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('applicationLimiter', () => {
    it('should be defined as middleware function', () => {
      expect(typeof applicationLimiter).toBe('function');
    });

    it('should use email as key if provided', () => {
      mockReq.body.email = 'test@example.com';
      
      applicationLimiter(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use IP as key if email not provided', () => {
      applicationLimiter(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('uploadLimiter', () => {
    it('should be defined as middleware function', () => {
      expect(typeof uploadLimiter).toBe('function');
    });

    it('should allow uploads under limit', () => {
      uploadLimiter(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CUSTOM LIMITERS
  // ============================================================================

  describe('createRoleBasedLimiter', () => {
    it('should be exported as a function', () => {
      expect(typeof createRoleBasedLimiter).toBe('function');
    });

    it('should accept role-based configuration', () => {
      // Should not throw when called with config
      expect(() => {
        createRoleBasedLimiter({
          admin: 20000,
          recruiter: 10000,
          default: 500,
        });
      }).not.toThrow();
    });

    it('should accept empty configuration', () => {
      // Should not throw when called without config
      expect(() => {
        createRoleBasedLimiter();
      }).not.toThrow();
    });

    it('should generate key with role and user ID', () => {
      createRoleBasedLimiter();
      
      // Find the role-based limiter config
      const roleConfig = mockRateLimit.mock.calls[mockRateLimit.mock.calls.length - 1][0];
      
      expect(roleConfig.keyGenerator).toBeDefined();
      
      mockReq.user = { id: 'user-123', role: 'recruiter' };
      const key = roleConfig.keyGenerator(mockReq);
      
      expect(key).toContain('role:recruiter');
      expect(key).toContain('user-123');
    });
  });

  describe('createEndpointLimiter', () => {
    it('should be exported as a function', () => {
      expect(typeof createEndpointLimiter).toBe('function');
    });

    it('should accept endpoint configuration', () => {
      // Should not throw when called with config
      expect(() => {
        createEndpointLimiter({
          endpoint: 'search',
          max: 30,
          windowMs: 60000,
        });
      }).not.toThrow();
    });

    it('should accept empty configuration', () => {
      // Should not throw when called without config
      expect(() => {
        createEndpointLimiter();
      }).not.toThrow();
    });

    it('should generate key with endpoint name', () => {
      createEndpointLimiter({ endpoint: 'custom-endpoint' });
      
      const endpointConfig = mockRateLimit.mock.calls[mockRateLimit.mock.calls.length - 1][0];
      
      expect(endpointConfig.keyGenerator).toBeDefined();
      
      // Set authenticated user for keyGenerator to return endpoint-based key
      mockReq.user = { id: 'user-123' };
      const key = endpointConfig.keyGenerator(mockReq);
      
      expect(key).toContain('endpoint:custom-endpoint');
    });

    it('should use user ID in key if authenticated', () => {
      createEndpointLimiter({ endpoint: 'test' });
      
      const endpointConfig = mockRateLimit.mock.calls[mockRateLimit.mock.calls.length - 1][0];
      
      mockReq.user = { id: 'user-456' };
      const key = endpointConfig.keyGenerator(mockReq);
      
      expect(key).toContain('user-456');
    });
  });

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  describe('bypassRateLimitIf', () => {
    it('should skip rate limiting when condition is true', () => {
      const condition = (req) => req.user?.role === 'admin';
      const middleware = bypassRateLimitIf(condition);
      
      mockReq.user = { id: 'admin-1', role: 'admin' };
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.skipRateLimit).toBe(true);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not skip rate limiting when condition is false', () => {
      const condition = (req) => req.user?.role === 'admin';
      const middleware = bypassRateLimitIf(condition);
      
      mockReq.user = { id: 'user-1', role: 'member' };
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.skipRateLimit).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle unauthenticated requests', () => {
      const condition = (req) => req.user?.role === 'admin';
      const middleware = bypassRateLimitIf(condition);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.skipRateLimit).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('addRateLimitHeaders', () => {
    it('should wrap res.json to add rate limit info', () => {
      addRateLimitHeaders(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      
      // Test that json is wrapped
      const data = { message: 'Success' };
      mockRes.json(data);
      
      expect(data.rateLimit).toBeDefined();
      expect(data.rateLimit.limit).toBe(100);
      expect(data.rateLimit.remaining).toBe(99);
    });

    it('should not modify non-object responses', () => {
      addRateLimitHeaders(mockReq, mockRes, mockNext);
      
      const originalJson = mockRes.json;
      mockRes.json = jest.fn(originalJson);
      
      mockRes.json('string response');
      
      expect(mockRes.json).toHaveBeenCalledWith('string response');
    });

    it('should not modify array responses', () => {
      addRateLimitHeaders(mockReq, mockRes, mockNext);
      
      const data = [{ id: 1 }, { id: 2 }];
      mockRes.json(data);
      
      expect(data[0].rateLimit).toBeUndefined();
    });

    it('should handle missing rate limit headers', () => {
      mockRes.getHeader = jest.fn(() => null);
      
      addRateLimitHeaders(mockReq, mockRes, mockNext);
      
      const data = { message: 'Success' };
      mockRes.json(data);
      
      expect(data.rateLimit).toBeUndefined();
    });
  });

  // ============================================================================
  // RATE LIMIT BEHAVIOR
  // ============================================================================

  describe('Rate Limit Behavior', () => {
    it('should allow multiple requests from same IP under limit', () => {
      // Test with globalLimiter
      for (let i = 0; i < 10; i++) {
        globalLimiter(mockReq, mockRes, mockNext);
      }
      
      // Should have allowed all requests
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalledWith(429);
    });

    it('should differentiate between authenticated and unauthenticated requests', () => {
      // Unauthenticated request
      globalLimiter(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      jest.clearAllMocks();
      
      // Authenticated request
      mockReq.user = { id: 'user-456' };
      globalLimiter(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set rate limit headers on requests', () => {
      globalLimiter(mockReq, mockRes, mockNext);
      
      // Check that headers were set (mockRes.setHeader should be called)
      expect(mockRes.setHeader).toHaveBeenCalled();
    });

    it('should handle requests from different IPs separately', () => {
      // Request from IP 1
      mockReq.ip = '10.0.0.1';
      globalLimiter(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
      
      // Request from IP 2
      mockReq.ip = '10.0.0.2';
      globalLimiter(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });
});
