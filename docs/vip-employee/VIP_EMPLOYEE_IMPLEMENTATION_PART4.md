# VIP Employee Feature - Implementation Plan Part 4

**Backend Routes & Controllers**

---

## Table of Contents

1. [Routes Implementation](#routes-implementation)
2. [Controllers Implementation](#controllers-implementation)
3. [Integration with Existing Endpoints](#integration-with-existing-endpoints)
4. [Error Handling](#error-handling)

---

## 1. Routes Implementation

### 1.1 VIP Employee Routes

**File:** `backend/src/products/nexus/routes/vipEmployees.js`

```javascript
import express from 'express';
import * as vipEmployeeController from '../controllers/vipEmployeeController.js';
import { authenticate } from '../../../middleware/auth.js';
import { requireRole } from '../../../middleware/rbac.js';
import { checkFeature } from '../../../middleware/features.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Check if VIP employee feature is enabled
router.use(checkFeature('nexus.vip_employees'));

/**
 * @route   GET /api/products/nexus/vip-employees
 * @desc    List VIP employees with filters
 * @access  Private (admin, hr_manager, manager)
 */
router.get(
  '/',
  requireRole('admin', 'hr_manager', 'manager'),
  vipEmployeeController.listVIPEmployees
);

/**
 * @route   GET /api/products/nexus/vip-employees/count
 * @desc    Get count of VIP employees
 * @access  Private (admin, hr_manager)
 */
router.get(
  '/count',
  requireRole('admin', 'hr_manager'),
  vipEmployeeController.getVIPEmployeesCount
);

/**
 * @route   GET /api/products/nexus/vip-employees/:employeeId
 * @desc    Get VIP employee details
 * @access  Private (admin, hr_manager, manager)
 */
router.get(
  '/:employeeId',
  requireRole('admin', 'hr_manager', 'manager'),
  vipEmployeeController.getVIPEmployee
);

/**
 * @route   POST /api/products/nexus/vip-employees/:employeeId
 * @desc    Mark employee as VIP
 * @access  Private (admin, hr_manager)
 */
router.post(
  '/:employeeId',
  requireRole('admin', 'hr_manager'),
  vipEmployeeController.markAsVIP
);

/**
 * @route   PATCH /api/products/nexus/vip-employees/:employeeId
 * @desc    Update VIP employee settings
 * @access  Private (admin, hr_manager)
 */
router.patch(
  '/:employeeId',
  requireRole('admin', 'hr_manager'),
  vipEmployeeController.updateVIPEmployee
);

/**
 * @route   DELETE /api/products/nexus/vip-employees/:employeeId
 * @desc    Remove VIP status from employee
 * @access  Private (admin, hr_manager)
 */
router.delete(
  '/:employeeId',
  requireRole('admin', 'hr_manager'),
  vipEmployeeController.removeVIPStatus
);

/**
 * @route   GET /api/products/nexus/vip-employees/:employeeId/audit-log
 * @desc    Get VIP employee audit log
 * @access  Private (admin, hr_manager)
 */
router.get(
  '/:employeeId/audit-log',
  requireRole('admin', 'hr_manager'),
  vipEmployeeController.getVIPAuditLog
);

/**
 * @route   POST /api/products/nexus/vip-employees/:employeeId/access-request
 * @desc    Request access to VIP employee data
 * @access  Private (authenticated)
 */
router.post(
  '/:employeeId/access-request',
  vipEmployeeController.requestVIPAccess
);

/**
 * @route   POST /api/products/nexus/vip-employees/access-requests/:requestId/approve
 * @desc    Approve VIP employee access request
 * @access  Private (admin, hr_manager)
 */
router.post(
  '/access-requests/:requestId/approve',
  requireRole('admin', 'hr_manager'),
  vipEmployeeController.approveAccessRequest
);

/**
 * @route   POST /api/products/nexus/vip-employees/access-requests/:requestId/reject
 * @desc    Reject VIP employee access request
 * @access  Private (admin, hr_manager)
 */
router.post(
  '/access-requests/:requestId/reject',
  requireRole('admin', 'hr_manager'),
  vipEmployeeController.rejectAccessRequest
);

export default router;
```

### 1.2 Register Routes in Nexus Product

**File:** `backend/src/products/nexus/index.js`

```javascript
// ... existing imports
import vipEmployeesRoutes from './routes/vipEmployees.js';

// ... existing code

// Register routes
router.use('/locations', locationsRoutes);
router.use('/departments', departmentsRoutes);
router.use('/employees', employeesRoutes);
router.use('/vip-employees', vipEmployeesRoutes); // ✅ ADD THIS LINE
// ... other routes

export default {
  config: {
    name: 'Nexus',
    slug: 'nexus',
    version: '1.2.0', // Increment version
    description: 'HRIS and Workspace Management with VIP Employee Support',
    features: [
      'employee-management',
      'attendance-tracking',
      'vip-employees', // ✅ ADD THIS FEATURE
      // ... other features
    ]
  },
  routes: router,
  middleware: [],
  hooks: {
    onLoad: async () => {
      logger.info('Nexus product loaded with VIP employee support');
    },
    onUnload: async () => {
      logger.info('Nexus product unloaded');
    }
  }
};
```

---

## 2. Controllers Implementation

### 2.1 VIP Employee Controller

**File:** `backend/src/products/nexus/controllers/vipEmployeeController.js`

```javascript
import VIPEmployeeService from '../services/VIPEmployeeService.js';
import VIPAccessService from '../services/VIPAccessService.js';
import logger from '../../../utils/logger.js';

/**
 * List VIP employees with filters
 */
export async function listVIPEmployees(req, res, next) {
  try {
    const { organizationId } = req.user;
    const filters = {
      search: req.query.search,
      department: req.query.department,
      location: req.query.location,
      tier: req.query.tier,
      isActive: req.query.isActive,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await VIPEmployeeService.list(organizationId, filters);

    return res.status(200).json({
      success: true,
      vipEmployees: result.employees,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error listing VIP employees', {
      error: error.message,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Get count of VIP employees
 */
export async function getVIPEmployeesCount(req, res, next) {
  try {
    const { organizationId } = req.user;
    
    const count = await VIPEmployeeService.getCount(organizationId);

    return res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    logger.error('Error getting VIP employees count', {
      error: error.message,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Get VIP employee details
 */
export async function getVIPEmployee(req, res, next) {
  try {
    const { employeeId } = req.params;
    const { organizationId, id: userId } = req.user;

    // Check if user has access
    const hasAccess = await VIPAccessService.hasAccess(
      employeeId,
      userId,
      organizationId
    );

    if (!hasAccess) {
      // Log unauthorized access attempt
      logger.logSecurityEvent('vip_employee_unauthorized_access', {
        employeeId,
        userId,
        organizationId,
        ip: req.ip
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied to VIP employee data',
        errorCode: 'VIP_ACCESS_DENIED',
        message: 'Please request access to view this VIP employee'
      });
    }

    const vipEmployee = await VIPEmployeeService.getByEmployeeId(
      employeeId,
      organizationId
    );

    // Log access
    await VIPAccessService.logAccess(
      employeeId,
      userId,
      'view',
      { ip: req.ip },
      organizationId
    );

    return res.status(200).json({
      success: true,
      vipEmployee
    });
  } catch (error) {
    logger.error('Error getting VIP employee', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Mark employee as VIP
 */
export async function markAsVIP(req, res, next) {
  try {
    const { employeeId } = req.params;
    const { organizationId, id: userId } = req.user;
    const vipData = {
      tier: req.body.tier || 'standard',
      reason: req.body.reason,
      restrictedAccess: req.body.restrictedAccess || true,
      customPermissions: req.body.customPermissions || {},
      notes: req.body.notes
    };

    const vipEmployee = await VIPEmployeeService.markAsVIP(
      employeeId,
      vipData,
      organizationId,
      userId
    );

    return res.status(201).json({
      success: true,
      vipEmployee,
      message: 'Employee marked as VIP successfully'
    });
  } catch (error) {
    logger.error('Error marking employee as VIP', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Update VIP employee settings
 */
export async function updateVIPEmployee(req, res, next) {
  try {
    const { employeeId } = req.params;
    const { organizationId, id: userId } = req.user;
    const updates = {
      tier: req.body.tier,
      reason: req.body.reason,
      restrictedAccess: req.body.restrictedAccess,
      customPermissions: req.body.customPermissions,
      notes: req.body.notes
    };

    const vipEmployee = await VIPEmployeeService.update(
      employeeId,
      updates,
      organizationId,
      userId
    );

    return res.status(200).json({
      success: true,
      vipEmployee,
      message: 'VIP employee updated successfully'
    });
  } catch (error) {
    logger.error('Error updating VIP employee', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Remove VIP status from employee
 */
export async function removeVIPStatus(req, res, next) {
  try {
    const { employeeId } = req.params;
    const { organizationId, id: userId } = req.user;
    const { reason } = req.body;

    await VIPEmployeeService.removeVIPStatus(
      employeeId,
      reason,
      organizationId,
      userId
    );

    return res.status(200).json({
      success: true,
      message: 'VIP status removed successfully'
    });
  } catch (error) {
    logger.error('Error removing VIP status', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Get VIP employee audit log
 */
export async function getVIPAuditLog(req, res, next) {
  try {
    const { employeeId } = req.params;
    const { organizationId } = req.user;
    const filters = {
      actionType: req.query.actionType,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50
    };

    const result = await VIPAccessService.getAuditLog(
      employeeId,
      organizationId,
      filters
    );

    return res.status(200).json({
      success: true,
      auditLog: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error getting VIP audit log', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Request access to VIP employee data
 */
export async function requestVIPAccess(req, res, next) {
  try {
    const { employeeId } = req.params;
    const { organizationId, id: userId } = req.user;
    const { reason, accessDuration } = req.body;

    const accessRequest = await VIPAccessService.requestAccess(
      employeeId,
      userId,
      reason,
      accessDuration,
      organizationId
    );

    return res.status(201).json({
      success: true,
      accessRequest,
      message: 'Access request submitted successfully'
    });
  } catch (error) {
    logger.error('Error requesting VIP access', {
      error: error.message,
      employeeId: req.params.employeeId,
      userId: req.user?.id,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Approve VIP employee access request
 */
export async function approveAccessRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    const { organizationId, id: approverId } = req.user;
    const { grantedDuration, notes } = req.body;

    await VIPAccessService.approveRequest(
      requestId,
      approverId,
      grantedDuration,
      notes,
      organizationId
    );

    return res.status(200).json({
      success: true,
      message: 'Access request approved successfully'
    });
  } catch (error) {
    logger.error('Error approving access request', {
      error: error.message,
      requestId: req.params.requestId,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Reject VIP employee access request
 */
export async function rejectAccessRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    const { organizationId, id: reviewerId } = req.user;
    const { reason } = req.body;

    await VIPAccessService.rejectRequest(
      requestId,
      reviewerId,
      reason,
      organizationId
    );

    return res.status(200).json({
      success: true,
      message: 'Access request rejected'
    });
  } catch (error) {
    logger.error('Error rejecting access request', {
      error: error.message,
      requestId: req.params.requestId,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}
```

---

## 3. Integration with Existing Endpoints

### 3.1 Employee List Endpoint Enhancement

**File:** `backend/src/products/nexus/controllers/employeeController.js`

```javascript
// Existing listEmployees function - ADD VIP masking

export async function listEmployees(req, res, next) {
  try {
    const { organizationId, id: userId } = req.user;
    const filters = {
      search: req.query.search,
      department: req.query.department,
      status: req.query.status,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await EmployeeService.list(organizationId, filters);

    // ✅ ADD: Mask VIP employees for users without access
    const maskedEmployees = await Promise.all(
      result.employees.map(async (employee) => {
        // Check if employee is VIP
        const isVIP = await VIPEmployeeService.isVIP(
          employee.id,
          organizationId
        );

        if (!isVIP) {
          return employee; // Not VIP, return as-is
        }

        // Check if user has access
        const hasAccess = await VIPAccessService.hasAccess(
          employee.id,
          userId,
          organizationId
        );

        if (hasAccess) {
          return { ...employee, isVIP: true }; // User has access
        }

        // Mask VIP employee data
        return {
          id: employee.id,
          firstName: '[RESTRICTED]',
          lastName: '[RESTRICTED]',
          email: '[RESTRICTED]',
          phone: null,
          department: employee.department,
          position: '[RESTRICTED]',
          isVIP: true,
          vipRestricted: true
        };
      })
    );

    return res.status(200).json({
      success: true,
      employees: maskedEmployees,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error listing employees', {
      error: error.message,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}
```

### 3.2 Employee Details Endpoint Enhancement

**File:** `backend/src/products/nexus/controllers/employeeController.js`

```javascript
// Existing getEmployee function - ADD VIP check

export async function getEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user;

    const employee = await EmployeeService.getById(id, organizationId);

    // ✅ ADD: Check VIP status and access
    const isVIP = await VIPEmployeeService.isVIP(id, organizationId);

    if (isVIP) {
      const hasAccess = await VIPAccessService.hasAccess(
        id,
        userId,
        organizationId
      );

      if (!hasAccess) {
        // Log unauthorized access attempt
        logger.logSecurityEvent('vip_employee_unauthorized_access', {
          employeeId: id,
          userId,
          organizationId,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          error: 'Access denied to VIP employee data',
          errorCode: 'VIP_ACCESS_DENIED',
          isVIP: true,
          message: 'This employee is marked as VIP. Please request access.'
        });
      }

      // Log authorized access
      await VIPAccessService.logAccess(
        id,
        userId,
        'view',
        { ip: req.ip },
        organizationId
      );

      employee.isVIP = true;
    }

    return res.status(200).json({
      success: true,
      employee
    });
  } catch (error) {
    logger.error('Error getting employee', {
      error: error.message,
      employeeId: req.params.id,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}
```

---

## 4. Error Handling

### 4.1 Custom Error Classes

**File:** `backend/src/utils/errors.js` (add to existing)

```javascript
// ... existing error classes

/**
 * VIP Access Denied Error
 */
export class VIPAccessDeniedError extends ApplicationError {
  constructor(message = 'Access to VIP employee data denied', details = null) {
    super(message, 403, 'VIP_ACCESS_DENIED');
    this.details = details;
    this.isVIPRestricted = true;
  }
}

/**
 * VIP Employee Not Found Error
 */
export class VIPEmployeeNotFoundError extends ApplicationError {
  constructor(message = 'VIP employee not found') {
    super(message, 404, 'VIP_EMPLOYEE_NOT_FOUND');
  }
}

/**
 * VIP Access Request Error
 */
export class VIPAccessRequestError extends ApplicationError {
  constructor(message, statusCode = 400) {
    super(message, statusCode, 'VIP_ACCESS_REQUEST_ERROR');
  }
}
```

### 4.2 Error Handler Enhancement

**File:** `backend/src/middleware/errorHandler.js` (add to existing)

```javascript
// ... existing error handling

// ✅ ADD: VIP-specific error handling
if (err instanceof VIPAccessDeniedError) {
  return res.status(403).json({
    success: false,
    error: err.message,
    errorCode: 'VIP_ACCESS_DENIED',
    isVIPRestricted: true,
    details: err.details
  });
}

if (err instanceof VIPEmployeeNotFoundError) {
  return res.status(404).json({
    success: false,
    error: err.message,
    errorCode: 'VIP_EMPLOYEE_NOT_FOUND'
  });
}

if (err instanceof VIPAccessRequestError) {
  return res.status(err.statusCode).json({
    success: false,
    error: err.message,
    errorCode: 'VIP_ACCESS_REQUEST_ERROR'
  });
}

// ... rest of error handling
```

---

## Summary

### Routes Created
✅ `/api/products/nexus/vip-employees` - Complete CRUD operations
✅ `/api/products/nexus/vip-employees/:id/audit-log` - Audit logging
✅ `/api/products/nexus/vip-employees/:id/access-request` - Access control
✅ VIP access approval/rejection endpoints

### Controllers Implemented
✅ `vipEmployeeController.js` - All VIP operations
✅ Enhanced existing employee endpoints with VIP checks
✅ Proper error handling and security logging

### Security Features
✅ Role-based access control
✅ Feature flag checking
✅ Audit logging for all VIP access
✅ Data masking for unauthorized users

### Next Steps
- Part 5: Frontend Implementation (React Components)
- Part 6: Testing Strategy
- Part 7: Migration & Deployment

**Status:** Routes & Controllers Complete ✓

---

**Document:** VIP Employee Implementation Part 4  
**Created:** November 21, 2025  
**Version:** 1.0.0
