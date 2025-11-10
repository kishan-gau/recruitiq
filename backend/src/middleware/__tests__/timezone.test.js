/**
 * Timezone Middleware Tests
 * 
 * Tests for timezone context middleware
 */

import { timezoneMiddleware, timezoneHeaderMiddleware } from '../timezone.js';

describe('Timezone Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null,
      organization: null,
      get: function(header) {
        return this.headers[header.toLowerCase()];
      }
    };
    
    res = {
      set: jest.fn()
    };
    
    next = jest.fn();
  });

  describe('timezoneMiddleware', () => {
    it('should default to UTC when no timezone provided', () => {
      timezoneMiddleware(req, res, next);
      
      expect(req.timezone).toBe('UTC');
      expect(req.timezoneSource).toBe('default');
      expect(next).toHaveBeenCalled();
    });

    it('should use X-Timezone header when provided', () => {
      req.headers['x-timezone'] = 'America/New_York';
      
      timezoneMiddleware(req, res, next);
      
      expect(req.timezone).toBe('America/New_York');
      expect(req.timezoneSource).toBe('header');
      expect(next).toHaveBeenCalled();
    });

    it('should use user timezone when available', () => {
      req.user = { timezone: 'America/Los_Angeles' };
      
      timezoneMiddleware(req, res, next);
      
      expect(req.timezone).toBe('America/Los_Angeles');
      expect(req.timezoneSource).toBe('user');
      expect(next).toHaveBeenCalled();
    });

    it('should use organization timezone when available', () => {
      req.organization = { timezone: 'America/Chicago' };
      
      timezoneMiddleware(req, res, next);
      
      expect(req.timezone).toBe('America/Chicago');
      expect(req.timezoneSource).toBe('organization');
      expect(next).toHaveBeenCalled();
    });

    it('should respect timezone precedence: header > user > organization > default', () => {
      // Set all sources
      req.headers['x-timezone'] = 'America/New_York';
      req.user = { timezone: 'America/Los_Angeles' };
      req.organization = { timezone: 'America/Chicago' };
      
      timezoneMiddleware(req, res, next);
      
      // Header should win
      expect(req.timezone).toBe('America/New_York');
      expect(req.timezoneSource).toBe('header');
    });

    it('should fallback through precedence chain', () => {
      // Only organization provided
      req.organization = { timezone: 'America/Chicago' };
      
      timezoneMiddleware(req, res, next);
      
      expect(req.timezone).toBe('America/Chicago');
      expect(req.timezoneSource).toBe('organization');
    });

    it('should reject invalid timezone from header', () => {
      req.headers['x-timezone'] = 'Invalid/Timezone';
      
      timezoneMiddleware(req, res, next);
      
      // Should fallback to UTC
      expect(req.timezone).toBe('UTC');
      expect(req.timezoneSource).toBe('default');
    });

    it('should reject invalid timezone from user', () => {
      req.user = { timezone: 'Invalid/Timezone' };
      
      timezoneMiddleware(req, res, next);
      
      // Should fallback to UTC
      expect(req.timezone).toBe('UTC');
      expect(req.timezoneSource).toBe('default');
    });

    it('should reject invalid timezone from organization', () => {
      req.organization = { timezone: 'Invalid/Timezone' };
      
      timezoneMiddleware(req, res, next);
      
      // Should fallback to UTC
      expect(req.timezone).toBe('UTC');
      expect(req.timezoneSource).toBe('default');
    });

    it('should handle missing timezone field in user', () => {
      req.user = { id: 1, name: 'Test User' };
      
      timezoneMiddleware(req, res, next);
      
      expect(req.timezone).toBe('UTC');
      expect(req.timezoneSource).toBe('default');
    });

    it('should handle missing timezone field in organization', () => {
      req.organization = { id: 1, name: 'Test Org' };
      
      timezoneMiddleware(req, res, next);
      
      expect(req.timezone).toBe('UTC');
      expect(req.timezoneSource).toBe('default');
    });
  });

  describe('timezoneHeaderMiddleware', () => {
    it('should set X-Timezone response header', () => {
      req.timezone = 'America/New_York';
      req.timezoneSource = 'header';
      
      timezoneHeaderMiddleware(req, res, next);
      
      expect(res.set).toHaveBeenCalledWith('X-Timezone', 'America/New_York');
      expect(res.set).toHaveBeenCalledWith('X-Timezone-Source', 'header');
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing timezone', () => {
      // No timezone set
      timezoneHeaderMiddleware(req, res, next);
      
      expect(res.set).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle typical API request flow', () => {
      // Simulate authenticated user with organization
      req.headers['x-timezone'] = 'America/New_York';
      req.user = { id: 1, timezone: 'America/Los_Angeles' };
      req.organization = { id: 1, timezone: 'America/Chicago' };
      
      // Run middleware chain
      timezoneMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      next.mockClear();
      
      timezoneHeaderMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      
      // Verify timezone context
      expect(req.timezone).toBe('America/New_York');
      expect(req.timezoneSource).toBe('header');
      
      // Verify response headers
      expect(res.set).toHaveBeenCalledWith('X-Timezone', 'America/New_York');
      expect(res.set).toHaveBeenCalledWith('X-Timezone-Source', 'header');
    });

    it('should handle unauthenticated request', () => {
      // No user or organization
      timezoneMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      next.mockClear();
      
      timezoneHeaderMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      
      // Should default to UTC
      expect(req.timezone).toBe('UTC');
      expect(req.timezoneSource).toBe('default');
      
      // Should still set headers
      expect(res.set).toHaveBeenCalledWith('X-Timezone', 'UTC');
      expect(res.set).toHaveBeenCalledWith('X-Timezone-Source', 'default');
    });

    it('should handle mobile app with user preference', () => {
      // Mobile app sends header with user's device timezone
      req.headers['x-timezone'] = 'Asia/Tokyo';
      req.user = { id: 1, timezone: 'America/New_York' };
      req.organization = { id: 1, timezone: 'UTC' };
      
      timezoneMiddleware(req, res, next);
      
      // Should respect mobile app's request
      expect(req.timezone).toBe('Asia/Tokyo');
      expect(req.timezoneSource).toBe('header');
    });

    it('should handle organization-wide operations', () => {
      // No header, user timezone present but organization operation
      req.user = { id: 1, timezone: 'America/Los_Angeles' };
      req.organization = { id: 1, timezone: 'America/Chicago' };
      
      timezoneMiddleware(req, res, next);
      
      // User timezone takes precedence, but app can use req.organization.timezone
      // for organization-wide operations
      expect(req.timezone).toBe('America/Los_Angeles');
      expect(req.organization.timezone).toBe('America/Chicago');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed timezone strings', () => {
      req.headers['x-timezone'] = 'America/New_York; DROP TABLE users;';
      
      timezoneMiddleware(req, res, next);
      
      // Should fallback to UTC
      expect(req.timezone).toBe('UTC');
      expect(req.timezoneSource).toBe('default');
      expect(next).toHaveBeenCalled();
    });

    it('should handle empty timezone strings', () => {
      req.headers['x-timezone'] = '';
      req.user = { timezone: '' };
      req.organization = { timezone: '' };
      
      timezoneMiddleware(req, res, next);
      
      expect(req.timezone).toBe('UTC');
      expect(req.timezoneSource).toBe('default');
    });

    it('should continue even if error occurs', () => {
      // Simulate error in middleware
      req.user = { get timezone() { throw new Error('DB error'); } };
      
      // Should not throw
      expect(() => {
        timezoneMiddleware(req, res, next);
      }).not.toThrow();
      
      // Should default to UTC and continue
      expect(req.timezone).toBe('UTC');
      expect(next).toHaveBeenCalled();
    });
  });
});
