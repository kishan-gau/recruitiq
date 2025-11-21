# Middleware Integration - Centralized RBAC System

**Part of:** [RBAC Implementation Plan](./00-OVERVIEW.md)  
**Version:** 1.0  
**Date:** November 21, 2025

---

## Table of Contents

1. [Enhanced Auth Middleware](#enhanced-auth-middleware)
2. [Permission Enforcement Middleware](#permission-enforcement-middleware)
3. [Integration with Existing Middleware](#integration-with-existing-middleware)
4. [Usage Examples](#usage-examples)
5. [Performance Optimization](#performance-optimization)

---

## Enhanced Auth Middleware

### Updated `auth.js` with RBAC Integration

```javascript
// backend/src/middleware/auth.js

import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import UserRoleService from '../modules/rbac/services/UserRoleService.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const userRoleService = new UserRoleService();

/**
 * Tenant Authentication Middleware
 * Authenticates user and loads their permissions
 */
export async function authenticateTenant(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user with organization info
    const userResult = await query(
      `SELECT 
        u.id, u.email, u.first_name, u.last_name,
        u.organization_id, u.enabled_products, u.product_roles,
        u.is_active, u.employee_id
       FROM hris.user_account u
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.id],
      decoded.organizationId
    );

    if (userResult.rows.length === 0) {
      throw new UnauthorizedError('User not found or inactive');
    }

    const user = userResult.rows[0];

    // Load user's RBAC permissions (cached for request)
    const permissions = await userRoleService.getUserPermissions(
      user.id,
      user.organization_id
    );

    // Attach user to request with RBAC data
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      organizationId: user.organization_id,
      enabledProducts: user.enabled_products || [],
      productRoles: user.product_roles || {},
      employeeId: user.employee_id,
      type: 'tenant',
      // NEW: RBAC permissions
      permissions: permissions.map(p => p.code),
      permissionsDetails: permissions // Full permission objects
    };

    logger.debug('User authenticated', {
      userId: user.id,
      organizationId: user.organization_id,
      permissionCount: permissions.length
    });

    next();
  } catch (error) {
    logger.logSecurityEvent('authentication_failed', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });

    next(new UnauthorizedError('Authentication failed'));
  }
}

/**
 * Platform Authentication Middleware (unchanged)
 */
export async function authenticatePlatform(req, res, next) {
  // Existing implementation for platform users...
  next();
}

/**
 * Require Product Access Middleware (unchanged)
 * Checks if user has access to the product
 */
export function requireProductAccess(product) {
  return (req, res, next) => {
    if (req.user.type !== 'tenant') {
      return next(new ForbiddenError('Platform users cannot access tenant products'));
    }

    if (!req.user.enabledProducts.includes(product)) {
      logger.logSecurityEvent('forbidden_access', {
        userId: req.user.id,
        product,
        enabledProducts: req.user.enabledProducts
      });

      return res.status(403).json({
        success: false,
        error: `Access to ${product} is not enabled for your organization`,
        errorCode: 'PRODUCT_NOT_ENABLED'
      });
    }

    // Attach current product to request
    req.currentProduct = product;
    next();
  };
}

/**
 * DEPRECATED: Legacy Product Role Checking
 * Use requirePermission() instead
 */
export function requireProductRole(product, ...roles) {
  return (req, res, next) => {
    const userRole = req.user.productRoles?.[product];

    if (!userRole || !roles.includes(userRole)) {
      logger.logSecurityEvent('forbidden_access', {
        userId: req.user.id,
        product,
        requiredRoles: roles,
        userRole
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        errorCode: 'FORBIDDEN'
      });
    }

    next();
  };
}

/**
 * NEW: Permission-Based Access Control
 * Checks if user has specific permission(s)
 * @param {...string} permissions - Permission codes (OR logic)
 */
export function requirePermission(...permissions) {
  return (req, res, next) => {
    if (req.user.type !== 'tenant') {
      return next(new ForbiddenError('Platform users require different permissions'));
    }

    // Check if user has at least one of the required permissions
    const hasPermission = permissions.some(perm => 
      req.user.permissions.includes(perm)
    );

    if (!hasPermission) {
      logger.logSecurityEvent('forbidden_access', {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        requiredPermissions: permissions,
        userPermissions: req.user.permissions,
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        errorCode: 'FORBIDDEN',
        requiredPermissions: permissions
      });
    }

    next();
  };
}

/**
 * NEW: Require ALL Permissions (AND logic)
 * User must have ALL specified permissions
 */
export function requireAllPermissions(...permissions) {
  return (req, res, next) => {
    if (req.user.type !== 'tenant') {
      return next(new ForbiddenError('Platform users require different permissions'));
    }

    // Check if user has ALL required permissions
    const hasAllPermissions = permissions.every(perm => 
      req.user.permissions.includes(perm)
    );

    if (!hasAllPermissions) {
      const missingPermissions = permissions.filter(
        perm => !req.user.permissions.includes(perm)
      );

      logger.logSecurityEvent('forbidden_access', {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        requiredPermissions: permissions,
        missingPermissions,
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        errorCode: 'FORBIDDEN',
        missingPermissions
      });
    }

    next();
  };
}

/**
 * NEW: Optional Permission Check
 * Attaches permission status to request but doesn't block
 */
export function checkPermission(...permissions) {
  return (req, res, next) => {
    req.hasPermission = permissions.some(perm => 
      req.user?.permissions?.includes(perm)
    );
    next();
  };
}

/**
 * Platform Role Checking (unchanged)
 */
export function requirePlatformRole(...roles) {
  return (req, res, next) => {
    if (req.user.type !== 'platform') {
      return next(new ForbiddenError('Tenant users cannot access platform features'));
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        errorCode: 'FORBIDDEN'
      });
    }

    next();
  };
}

/**
 * Platform Permission Checking (unchanged)
 */
export function requirePlatformPermission(...permissions) {
  return (req, res, next) => {
    if (req.user.type !== 'platform') {
      return next(new ForbiddenError('Tenant users cannot access platform features'));
    }

    const hasPermission = permissions.some(perm => 
      req.user.permissions?.includes(perm)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        errorCode: 'FORBIDDEN'
      });
    }

    next();
  };
}

// Export all middleware
export default {
  authenticateTenant,
  authenticatePlatform,
  requireProductAccess,
  requireProductRole, // Deprecated
  requirePermission,
  requireAllPermissions,
  checkPermission,
  requirePlatformRole,
  requirePlatformPermission
};
```

---

## Permission Enforcement Middleware

### RBAC-Specific Middleware

```javascript
// backend/src/modules/rbac/middleware/rbacEnforcement.js

import UserRoleService from '../services/UserRoleService.js';
import { ForbiddenError } from '../../../utils/errors.js';
import logger from '../../../utils/logger.js';

const userRoleService = new UserRoleService();

/**
 * Require RBAC Management Permission
 * Users must have 'rbac:manage' permission to access RBAC admin routes
 */
export function requireRBACManagement(req, res, next) {
  if (!req.user.permissions.includes('rbac:manage')) {
    logger.logSecurityEvent('forbidden_access', {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      attemptedAction: 'rbac_management',
      path: req.path
    });

    return res.status(403).json({
      success: false,
      error: 'RBAC management permission required',
      errorCode: 'RBAC_MANAGEMENT_REQUIRED'
    });
  }

  next();
}

/**
 * Require User Management Permission
 * Users must have 'user:edit' or 'rbac:assign' permission
 */
export function requireUserManagement(req, res, next) {
  const hasPermission = ['user:edit', 'rbac:assign'].some(perm => 
    req.user.permissions.includes(perm)
  );

  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      error: 'User management permission required',
      errorCode: 'USER_MANAGEMENT_REQUIRED'
    });
  }

  next();
}

/**
 * Prevent System Role Modification
 * Ensures system roles cannot be modified or deleted
 */
export async function preventSystemRoleModification(req, res, next) {
  try {
    const roleId = req.params.id || req.params.roleId;
    
    if (!roleId) {
      return next();
    }

    // Check if role is a system role
    const { default: Role } = await import('../models/Role.js');
    const role = await Role.findById(roleId, req.user.organizationId);

    if (role && role.is_system) {
      logger.logSecurityEvent('forbidden_access', {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        attemptedAction: 'modify_system_role',
        roleId,
        roleName: role.name
      });

      return res.status(403).json({
        success: false,
        error: 'System roles cannot be modified',
        errorCode: 'SYSTEM_ROLE_PROTECTED'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate Product Context
 * Ensures product parameter is valid and user has access
 */
export function validateProductContext(req, res, next) {
  const product = req.body.product || req.query.product || req.params.product;

  if (product) {
    const validProducts = ['paylinq', 'nexus', 'schedulehub', 'recruitiq'];
    
    if (!validProducts.includes(product)) {
      return res.status(400).json({
        success: false,
        error: `Invalid product: ${product}`,
        errorCode: 'INVALID_PRODUCT'
      });
    }

    // Check if user has access to this product
    if (!req.user.enabledProducts.includes(product)) {
      return res.status(403).json({
        success: false,
        error: `Access to ${product} is not enabled`,
        errorCode: 'PRODUCT_NOT_ENABLED'
      });
    }
  }

  next();
}

/**
 * Cache User Permissions
 * Caches permissions in Redis for performance
 */
export async function cacheUserPermissions(req, res, next) {
  // TODO: Implement Redis caching
  // For now, permissions are loaded once per request in authenticateTenant
  next();
}

export default {
  requireRBACManagement,
  requireUserManagement,
  preventSystemRoleModification,
  validateProductContext,
  cacheUserPermissions
};
```

---

## Integration with Existing Middleware

### Middleware Stack Patterns

#### Pattern 1: Product Route with Permission Check

```javascript
// backend/src/products/paylinq/routes/payroll-runs.js

import express from 'express';
import { authenticateTenant, requireProductAccess, requirePermission } from '../../../middleware/auth.js';
import {
  listPayrollRuns,
  getPayrollRun,
  createPayrollRun,
  approvePayrollRun,
  processPayrollRun,
  deletePayrollRun
} from '../controllers/payrollRunController.js';

const router = express.Router();

// Apply authentication and product access to all routes
router.use(authenticateTenant);
router.use(requireProductAccess('paylinq'));

// List/View - Requires 'payroll:run:view'
router.get('/', requirePermission('payroll:run:view'), listPayrollRuns);
router.get('/:id', requirePermission('payroll:run:view'), getPayrollRun);

// Create - Requires 'payroll:run:create'
router.post('/', requirePermission('payroll:run:create'), createPayrollRun);

// Approve - Requires 'payroll:run:approve' (higher permission)
router.post('/:id/approve', requirePermission('payroll:run:approve'), approvePayrollRun);

// Process - Requires 'payroll:run:process' (highest permission)
router.post('/:id/process', requirePermission('payroll:run:process'), processPayrollRun);

// Delete - Requires 'payroll:run:delete'
router.delete('/:id', requirePermission('payroll:run:delete'), deletePayrollRun);

export default router;
```

#### Pattern 2: RBAC Admin Routes

```javascript
// backend/src/modules/rbac/routes/index.js

import express from 'express';
import { authenticateTenant, requirePermission } from '../../../middleware/auth.js';
import { requireRBACManagement, preventSystemRoleModification } from '../middleware/rbacEnforcement.js';
import roleRoutes from './roleRoutes.js';
import permissionRoutes from './permissionRoutes.js';
import userRoleRoutes from './userRoleRoutes.js';

const router = express.Router();

// Apply authentication to all RBAC routes
router.use(authenticateTenant);

// Permission routes - View only
router.use('/permissions', requirePermission('rbac:view'), permissionRoutes);

// Role routes - Require RBAC management
router.use('/roles', requireRBACManagement, preventSystemRoleModification, roleRoutes);

// User-role assignment routes
router.use('/user-roles', requirePermission('rbac:assign'), userRoleRoutes);

export default router;
```

#### Pattern 3: Conditional Permission Check

```javascript
// backend/src/products/nexus/routes/employees.js

import express from 'express';
import { authenticateTenant, requireProductAccess, requirePermission, checkPermission } from '../../../middleware/auth.js';
import { listEmployees, getEmployee, updateEmployee } from '../controllers/employeeController.js';

const router = express.Router();

router.use(authenticateTenant);
router.use(requireProductAccess('nexus'));

// List - Everyone can view
router.get('/', requirePermission('employee:view'), listEmployees);

// Get single - Everyone can view, but attach edit permission status
router.get('/:id', 
  requirePermission('employee:view'),
  checkPermission('employee:edit'), // Attaches req.hasPermission
  getEmployee
);

// Update - Requires edit permission
router.patch('/:id', requirePermission('employee:edit'), updateEmployee);

export default router;
```

---

## Usage Examples

### Example 1: PayLinQ Payroll Management

```javascript
// backend/src/products/paylinq/routes/routes.js

import express from 'express';
import { authenticateTenant, requireProductAccess, requirePermission } from '../../../middleware/auth.js';

const router = express.Router();

// Apply to all PayLinQ routes
router.use(authenticateTenant);
router.use(requireProductAccess('paylinq'));

// Payroll Runs
import payrollRunRoutes from './payroll-runs.js';
router.use('/payroll-runs', payrollRunRoutes);

// Pay Components
import componentRoutes from './components.js';
router.use('/components', 
  requirePermission('payroll:component:view', 'payroll:component:manage'),
  componentRoutes
);

// Workers
import workerRoutes from './workers.js';
router.use('/workers', requirePermission('payroll:worker:view'), workerRoutes);

// Time Entries
import timeEntryRoutes from './time-entries.js';
router.use('/time-entries', requirePermission('payroll:time:view'), timeEntryRoutes);

// Reports (requires special permission)
import reportRoutes from './reports.js';
router.use('/reports', requirePermission('payroll:reports:view'), reportRoutes);

// Settings (admin only)
import settingsRoutes from './settings.js';
router.use('/settings', requirePermission('payroll:settings:manage'), settingsRoutes);

export default router;
```

### Example 2: Nexus HR Management

```javascript
// backend/src/products/nexus/routes/index.js

import express from 'express';
import { authenticateTenant, requireProductAccess, requirePermission } from '../../../middleware/auth.js';

const router = express.Router();

router.use(authenticateTenant);
router.use(requireProductAccess('nexus'));

// Employees
import employeeRoutes from './employees.js';
router.use('/employees', requirePermission('employee:view'), employeeRoutes);

// Attendance
import attendanceRoutes from './attendance.js';
router.use('/attendance', requirePermission('attendance:view'), attendanceRoutes);

// Time Off
import timeOffRoutes from './time-off.js';
router.use('/time-off', requirePermission('timeoff:view'), timeOffRoutes);

// Benefits
import benefitRoutes from './benefits.js';
router.use('/benefits', requirePermission('benefits:view'), benefitRoutes);

// Documents
import documentRoutes from './documents.js';
router.use('/documents', requirePermission('documents:view'), documentRoutes);

// Departments & Locations
import departmentRoutes from './departments.js';
import locationRoutes from './locations.js';
router.use('/departments', requirePermission('dept:view'), departmentRoutes);
router.use('/locations', requirePermission('location:view'), locationRoutes);

// Reports
import reportRoutes from './reports.js';
router.use('/reports', requirePermission('hris:reports:view'), reportRoutes);

export default router;
```

### Example 3: RBAC Admin Interface

```javascript
// backend/src/modules/rbac/routes/roleRoutes.js

import express from 'express';
import { requirePermission } from '../../../middleware/auth.js';
import { preventSystemRoleModification } from '../middleware/rbacEnforcement.js';
import {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions
} from '../controllers/roleController.js';

const router = express.Router();

// List/View - Requires 'rbac:view'
router.get('/', requirePermission('rbac:view'), listRoles);
router.get('/:id', requirePermission('rbac:view'), getRole);

// Create - Requires 'rbac:manage'
router.post('/', requirePermission('rbac:manage'), createRole);

// Update - Requires 'rbac:manage' + prevent system role modification
router.patch('/:id', 
  requirePermission('rbac:manage'),
  preventSystemRoleModification,
  updateRole
);

// Delete - Requires 'rbac:manage' + prevent system role modification
router.delete('/:id',
  requirePermission('rbac:manage'),
  preventSystemRoleModification,
  deleteRole
);

// Assign permissions - Requires 'rbac:manage'
router.post('/:id/permissions',
  requirePermission('rbac:manage'),
  preventSystemRoleModification,
  assignPermissions
);

export default router;
```

---

## Performance Optimization

### Permission Caching Strategy

```javascript
// backend/src/modules/rbac/utils/permissionCache.js

import Redis from 'ioredis';
import logger from '../../../utils/logger.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

const CACHE_TTL = 300; // 5 minutes

/**
 * Get user permissions from cache or database
 */
export async function getCachedPermissions(userId, organizationId, product = null) {
  const cacheKey = `user:${userId}:org:${organizationId}:product:${product || 'all'}:permissions`;

  try {
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug('Permission cache hit', { userId, organizationId });
      return JSON.parse(cached);
    }

    // Cache miss - load from database
    const UserRoleService = (await import('../services/UserRoleService.js')).default;
    const service = new UserRoleService();
    const permissions = await service.getUserPermissions(userId, organizationId, product);

    // Cache for 5 minutes
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(permissions));

    logger.debug('Permission cache miss - loaded from database', { userId, organizationId });
    return permissions;
  } catch (error) {
    logger.error('Permission cache error', {
      error: error.message,
      userId,
      organizationId
    });

    // Fallback to database on cache error
    const UserRoleService = (await import('../services/UserRoleService.js')).default;
    const service = new UserRoleService();
    return await service.getUserPermissions(userId, organizationId, product);
  }
}

/**
 * Invalidate user permission cache
 */
export async function invalidateUserPermissions(userId, organizationId) {
  const patterns = [
    `user:${userId}:org:${organizationId}:product:*:permissions`
  ];

  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.debug('Permission cache invalidated', { userId, organizationId, keyCount: keys.length });
    }
  }
}

/**
 * Invalidate all permissions for an organization
 */
export async function invalidateOrganizationPermissions(organizationId) {
  const pattern = `user:*:org:${organizationId}:product:*:permissions`;
  const keys = await redis.keys(pattern);
  
  if (keys.length > 0) {
    await redis.del(...keys);
    logger.info('Organization permission cache invalidated', { organizationId, keyCount: keys.length });
  }
}

export default {
  getCachedPermissions,
  invalidateUserPermissions,
  invalidateOrganizationPermissions
};
```

### Cache Integration in Middleware

```javascript
// backend/src/middleware/auth.js (updated)

import { getCachedPermissions } from '../modules/rbac/utils/permissionCache.js';

export async function authenticateTenant(req, res, next) {
  try {
    // ... existing auth logic ...

    // Load user's RBAC permissions (WITH CACHING)
    const permissions = await getCachedPermissions(
      user.id,
      user.organization_id,
      req.currentProduct || null
    );

    req.user = {
      // ... existing user data ...
      permissions: permissions.map(p => p.code),
      permissionsDetails: permissions
    };

    next();
  } catch (error) {
    next(new UnauthorizedError('Authentication failed'));
  }
}
```

### Cache Invalidation Triggers

```javascript
// backend/src/modules/rbac/services/RoleService.js (updated)

import { invalidateOrganizationPermissions } from '../utils/permissionCache.js';

async function assignPermissions(roleId, permissionIds, organizationId, userId) {
  // ... existing logic ...

  // Invalidate cache for all users in organization
  await invalidateOrganizationPermissions(organizationId);

  return true;
}
```

---

**Next:** [04-FRONTEND-PACKAGE.md](./04-FRONTEND-PACKAGE.md)
