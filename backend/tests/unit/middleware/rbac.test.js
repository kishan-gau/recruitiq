/**
 * Unit tests for RBAC middleware
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ForbiddenError } from '../../../src/utils/errors.js';

// Mock dependencies
const mockQuery = jest.fn();
const mockLogger = {
  logSecurityEvent: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule('../../../src/config/database.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import after mocking
const { requirePermission, requireRole, attachPermissions, hasPermission, hasRole } 
  = await import('../../../src/middleware/rbac.js');

describe('RBAC Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        id: 'user-123',
        organizationId: 'org-456'
      },
      path: '/test',
      method: 'POST'
    };
    res = {};
    next = jest.fn();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('requirePermission', () => {
    it('should allow access when user has required permission', async () => {
      // Mock: User has 'payroll_runs:create' permission
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ name: 'payroll_runs:create' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { name: 'payroll_runs:create', resource: 'payroll_runs', action: 'create', product_slug: 'paylinq' }
          ]
        });

      const middleware = requirePermission('payroll_runs:create');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(); // Called without error
      expect(next).toHaveBeenCalledTimes(1);
      expect(mockLogger.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks required permission', async () => {
      // Mock: User has no permissions
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const middleware = requirePermission('payroll_runs:delete');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(next.mock.calls[0][0].message).toContain('payroll_runs:delete');
      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith('permission_denied', expect.objectContaining({
        userId: 'user-123',
        organizationId: 'org-456',
        requiredPermissions: ['payroll_runs:delete']
      }));
    });

    it('should allow access when user has any of multiple permissions', async () => {
      // Mock: User has 'perm2' out of ['perm1', 'perm2', 'perm3']
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ name: 'perm2' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { name: 'perm2', resource: 'resource', action: 'read', product_slug: null }
          ]
        });

      const middleware = requirePermission(['perm1', 'perm2', 'perm3']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(mockLogger.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should deny access when user has none of multiple permissions', async () => {
      // Mock: User has no matching permissions
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const middleware = requirePermission(['perm1', 'perm2', 'perm3']);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(next.mock.calls[0][0].message).toContain('perm1 or perm2 or perm3');
    });

    it('should require all permissions when requireAll option is true', async () => {
      // Mock: User has only 2 out of 3 required permissions
      mockQuery.mockResolvedValueOnce({
        rows: [
          { name: 'perm1' },
          { name: 'perm2' }
        ]
      });

      const middleware = requirePermission(['perm1', 'perm2', 'perm3'], { requireAll: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(next.mock.calls[0][0].message).toContain('perm1 and perm2 and perm3');
    });

    it('should allow access when user has all required permissions', async () => {
      // Mock: User has all 3 required permissions
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { name: 'perm1' },
            { name: 'perm2' },
            { name: 'perm3' }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            { name: 'perm1', resource: 'r1', action: 'a1', product_slug: null },
            { name: 'perm2', resource: 'r2', action: 'a2', product_slug: null },
            { name: 'perm3', resource: 'r3', action: 'a3', product_slug: null }
          ]
        });

      const middleware = requirePermission(['perm1', 'perm2', 'perm3'], { requireAll: true });
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(mockLogger.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should attach user permissions to request', async () => {
      // Mock permissions query
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ name: 'payroll_runs:create' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { name: 'payroll_runs:create', resource: 'payroll_runs', action: 'create', product_slug: 'paylinq' },
            { name: 'payroll_runs:read', resource: 'payroll_runs', action: 'read', product_slug: 'paylinq' }
          ]
        });

      const middleware = requirePermission('payroll_runs:create');
      await middleware(req, res, next);

      expect(req.userPermissions).toEqual(['payroll_runs:create', 'payroll_runs:read']);
    });
  });

  describe('requireRole', () => {
    it('should allow access when user has required role', async () => {
      // Mock: User has 'org_admin' role
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'org_admin', display_name: 'Organization Administrator' }]
      });

      const middleware = requireRole('org_admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.userRole).toBe('org_admin');
      expect(mockLogger.logSecurityEvent).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks required role', async () => {
      // Mock: User has no matching roles
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const middleware = requireRole('super_admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(next.mock.calls[0][0].message).toContain('super_admin');
      expect(mockLogger.logSecurityEvent).toHaveBeenCalledWith('role_denied', expect.objectContaining({
        userId: 'user-123',
        organizationId: 'org-456',
        requiredRoles: ['super_admin']
      }));
    });

    it('should allow access when user has any of multiple roles', async () => {
      // Mock: User has 'org_admin' out of ['super_admin', 'org_admin', 'manager']
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'org_admin', display_name: 'Organization Administrator' }]
      });

      const middleware = requireRole('super_admin', 'org_admin', 'manager');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.userRole).toBe('org_admin');
    });
  });

  describe('attachPermissions', () => {
    it('should attach permissions and roles to request', async () => {
      // Mock permissions query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { name: 'perm1', resource: 'r1', action: 'a1', product_slug: null },
          { name: 'perm2', resource: 'r2', action: 'a2', product_slug: 'product' }
        ]
      });

      // Mock roles query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { name: 'org_admin', display_name: 'Organization Administrator' },
          { name: 'manager', display_name: 'Manager' }
        ]
      });

      await attachPermissions(req, res, next);

      expect(req.userPermissions).toEqual(['perm1', 'perm2']);
      expect(req.userRoles).toEqual(['org_admin', 'manager']);
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle errors gracefully', async () => {
      // Mock query failure
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await attachPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(mockLogger.error).toHaveBeenCalledWith('Error attaching permissions', expect.any(Object));
    });

    it('should fail if no user in request', async () => {
      req.user = null;

      await attachPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toContain('Authentication required');
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      // Mock: User has permission
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'test:permission' }]
      });

      const result = await hasPermission(req, 'test:permission');

      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', async () => {
      // Mock: User has no permission
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await hasPermission(req, 'test:permission');

      expect(result).toBe(false);
    });

    it('should handle array of permissions', async () => {
      // Mock: User has one of the permissions
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'perm2' }]
      });

      const result = await hasPermission(req, ['perm1', 'perm2', 'perm3']);

      expect(result).toBe(true);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has role', async () => {
      // Mock: User has role
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'org_admin' }]
      });

      const result = await hasRole(req, 'org_admin');

      expect(result).toBe(true);
    });

    it('should return false when user lacks role', async () => {
      // Mock: User has no role
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await hasRole(req, 'super_admin');

      expect(result).toBe(false);
    });

    it('should handle array of roles', async () => {
      // Mock: User has one of the roles
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'manager' }]
      });

      const result = await hasRole(req, ['super_admin', 'org_admin', 'manager']);

      expect(result).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle expired user roles correctly', async () => {
      // Mock: No active roles (all expired)
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const middleware = requireRole('org_admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should filter by organization_id correctly', async () => {
      // Mock: User has permission in their org
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'test:perm' }]
      });

      const middleware = requirePermission('test:perm');
      await middleware(req, res, next);

      // Verify query was called with correct organization_id
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['user-123', 'org-456', expect.any(Array)]),
        'org-456',
        expect.any(Object)
      );
    });
  });
});
