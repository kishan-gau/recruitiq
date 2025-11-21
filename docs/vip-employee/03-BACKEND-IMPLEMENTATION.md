# VIP Employee Access Control - Implementation Plan (Part 3: Backend Implementation)

**Part:** 3 of 7  
**Focus:** Backend Services, Middleware & Business Logic  
**Previous:** [Part 2: Database Schema](./02-DATABASE-SCHEMA.md)  
**Next:** [Part 4: API & Routes](./04-API-ROUTES.md)

---

## Backend Implementation Overview

This section details all backend code changes following RecruitIQ standards:
- ✅ Layer Architecture: Routes → Controllers → Services → Repositories
- ✅ Custom Query Wrapper from `config/database.js`
- ✅ Dependency Injection for testability
- ✅ Joi validation schemas
- ✅ DTOs for data transformation
- ✅ Comprehensive error handling

---

## 1. Employee Access Control Service

### File: `backend/src/products/nexus/services/employeeAccessControlService.js`

**New File - Complete Implementation**

```javascript
/**
 * Employee Access Control Service
 * 
 * Manages VIP employee access restrictions and authorization checks
 * Implements granular access control with self-access exceptions
 * 
 * @module products/nexus/services/employeeAccessControlService
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import Joi from 'joi';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError 
} from '../../../utils/errors.js';

class EmployeeAccessControlService {
  constructor() {
    this.logger = logger;
  }

  // ==================== VALIDATION SCHEMAS ====================

  static markAsVIPSchema = Joi.object({
    isVip: Joi.boolean().required(),
    isRestricted: Joi.boolean().required(),
    restrictionLevel: Joi.string()
      .valid('none', 'financial', 'full', 'executive')
      .when('isRestricted', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.valid(null).optional()
      }),
    restrictionReason: Joi.string().trim().max(500).optional(),
    allowedUserIds: Joi.array().items(Joi.string().uuid()).optional(),
    allowedRoleIds: Joi.array().items(Joi.string().uuid()).optional(),
    allowedDepartmentIds: Joi.array().items(Joi.string().uuid()).optional(),
    restrictCompensation: Joi.boolean().optional(),
    restrictPersonalInfo: Joi.boolean().optional(),
    restrictPerformance: Joi.boolean().optional(),
    restrictDocuments: Joi.boolean().optional(),
    restrictTimeOff: Joi.boolean().optional(),
    restrictBenefits: Joi.boolean().optional(),
    restrictAttendance: Joi.boolean().optional()
  });

  static updateAccessControlSchema = Joi.object({
    allowedUserIds: Joi.array().items(Joi.string().uuid()).optional(),
    allowedRoleIds: Joi.array().items(Joi.string().uuid()).optional(),
    allowedDepartmentIds: Joi.array().items(Joi.string().uuid()).optional(),
    restrictCompensation: Joi.boolean().optional(),
    restrictPersonalInfo: Joi.boolean().optional(),
    restrictPerformance: Joi.boolean().optional(),
    restrictDocuments: Joi.boolean().optional(),
    restrictTimeOff: Joi.boolean().optional(),
    restrictBenefits: Joi.boolean().optional(),
    restrictAttendance: Joi.boolean().optional()
  }).min(1);

  // ==================== CORE ACCESS CHECKS ====================

  /**
   * Check if user can access an employee's data
   * 
   * @param {string} employeeId - Employee UUID
   * @param {string} userId - User account UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} accessType - Type of access: general, compensation, personal_info, etc.
   * @param {Object} requestContext - Optional request context (IP, endpoint, etc.)
   * @returns {Promise<Object>} { granted: boolean, reason?: string, logId?: UUID }
   * 
   * @example
   * const result = await service.checkAccess(
   *   'emp-uuid',
   *   'user-uuid',
   *   'org-uuid',
   *   'compensation',
   *   { ip: req.ip, endpoint: req.path }
   * );
   * if (!result.granted) throw new ForbiddenError(result.reason);
   */
  async checkAccess(employeeId, userId, organizationId, accessType = 'general', requestContext = {}) {
    try {
      this.logger.info('Checking employee access', {
        employeeId,
        userId,
        accessType,
        organizationId
      });

      // Step 1: Get user's employee record (for self-access check)
      const userEmployeeId = await this.getUserEmployeeId(userId, organizationId);

      // Step 2: Self-access exception (employees always see their own data)
      if (userEmployeeId === employeeId) {
        this.logger.info('Self-access granted', { employeeId, userId });
        
        // Still log the access for audit trail
        const logId = await this.logAccessAttempt(
          employeeId,
          userId,
          organizationId,
          accessType,
          true, // granted
          'Self-access',
          requestContext
        );

        return { granted: true, reason: 'Self-access', logId };
      }

      // Step 3: Check if employee is restricted
      const employeeCheckSql = `
        SELECT 
          is_restricted,
          restriction_level
        FROM hris.employee
        WHERE id = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;
      const employeeResult = await query(
        employeeCheckSql,
        [employeeId, organizationId],
        organizationId,
        { operation: 'SELECT', table: 'hris.employee' }
      );

      if (employeeResult.rows.length === 0) {
        throw new NotFoundError('Employee not found');
      }

      const employee = employeeResult.rows[0];

      // If employee is not restricted, grant access
      if (!employee.is_restricted) {
        this.logger.info('Employee not restricted, access granted', { employeeId });
        
        // No need to log for non-restricted employees
        return { granted: true, reason: 'Employee not restricted' };
      }

      // Step 4: Check CEO/Owner override (product role)
      const hasOverride = await this.checkCEOOverride(userId, organizationId);
      if (hasOverride) {
        this.logger.info('CEO override granted', { userId, employeeId });
        
        const logId = await this.logAccessAttempt(
          employeeId,
          userId,
          organizationId,
          accessType,
          true,
          'CEO/Owner override',
          requestContext
        );

        return { granted: true, reason: 'CEO/Owner override', logId };
      }

      // Step 5: Get access control rules
      const accessControlSql = `
        SELECT 
          allowed_user_ids,
          allowed_role_ids,
          allowed_department_ids,
          restrict_compensation,
          restrict_personal_info,
          restrict_performance,
          restrict_documents,
          restrict_time_off,
          restrict_benefits,
          restrict_attendance
        FROM hris.employee_access_control
        WHERE employee_id = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;
      const accessControlResult = await query(
        accessControlSql,
        [employeeId, organizationId],
        organizationId,
        { operation: 'SELECT', table: 'hris.employee_access_control' }
      );

      // If no access control rules exist, deny by default
      if (accessControlResult.rows.length === 0) {
        this.logger.warn('No access control rules found for restricted employee', { 
          employeeId 
        });
        
        const logId = await this.logAccessAttempt(
          employeeId,
          userId,
          organizationId,
          accessType,
          false, // denied
          'No access control rules configured',
          requestContext
        );

        return { 
          granted: false, 
          reason: 'Access restricted - no authorization rules configured',
          logId 
        };
      }

      const accessControl = accessControlResult.rows[0];

      // Step 6: Check if data type is restricted
      const isTypeRestricted = this.isDataTypeRestricted(accessType, accessControl);
      if (!isTypeRestricted) {
        this.logger.info('Data type not restricted, access granted', { 
          employeeId, 
          accessType 
        });
        
        return { granted: true, reason: `${accessType} data not restricted` };
      }

      // Step 7: Check if user is in allowed lists
      const userHasAccess = await this.checkUserAuthorization(
        userId,
        organizationId,
        accessControl
      );

      if (userHasAccess) {
        this.logger.info('User authorized via access control rules', { 
          userId, 
          employeeId,
          accessType
        });
        
        const logId = await this.logAccessAttempt(
          employeeId,
          userId,
          organizationId,
          accessType,
          true,
          'Authorized via access control rules',
          requestContext
        );

        return { granted: true, reason: 'Authorized', logId };
      }

      // Step 8: Access denied
      this.logger.warn('Access denied to restricted employee', { 
        userId, 
        employeeId,
        accessType
      });
      
      const logId = await this.logAccessAttempt(
        employeeId,
        userId,
        organizationId,
        accessType,
        false,
        'User not in authorized list',
        requestContext
      );

      return { 
        granted: false, 
        reason: 'Access denied - you are not authorized to view this employee\'s data',
        logId 
      };

    } catch (error) {
      this.logger.error('Error checking employee access', {
        error: error.message,
        employeeId,
        userId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Check if a specific data type is restricted
   * @private
   */
  isDataTypeRestricted(accessType, accessControl) {
    const restrictionMap = {
      'compensation': accessControl.restrict_compensation,
      'personal_info': accessControl.restrict_personal_info,
      'performance': accessControl.restrict_performance,
      'documents': accessControl.restrict_documents,
      'time_off': accessControl.restrict_time_off,
      'benefits': accessControl.restrict_benefits,
      'attendance': accessControl.restrict_attendance,
      'general': false // General profile info never restricted by type
    };

    return restrictionMap[accessType] || false;
  }

  /**
   * Check if user is authorized via allowed lists
   * @private
   */
  async checkUserAuthorization(userId, organizationId, accessControl) {
    // Check direct user access
    if (accessControl.allowed_user_ids && accessControl.allowed_user_ids.includes(userId)) {
      return true;
    }

    // Check role-based access
    if (accessControl.allowed_role_ids && accessControl.allowed_role_ids.length > 0) {
      const userRole = await this.getUserRole(userId, organizationId);
      if (userRole && accessControl.allowed_role_ids.includes(userRole)) {
        return true;
      }
    }

    // Check department-based access
    if (accessControl.allowed_department_ids && accessControl.allowed_department_ids.length > 0) {
      const userDepartmentId = await this.getUserDepartmentId(userId, organizationId);
      if (userDepartmentId && accessControl.allowed_department_ids.includes(userDepartmentId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if user has CEO/Owner override permission
   * @private
   */
  async checkCEOOverride(userId, organizationId) {
    const userSql = `
      SELECT product_roles
      FROM hris.user_account
      WHERE id = $1 
        AND organization_id = $2
        AND deleted_at IS NULL
    `;
    const userResult = await query(
      userSql,
      [userId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.user_account' }
    );

    if (userResult.rows.length === 0) return false;

    const productRoles = userResult.rows[0].product_roles || {};
    const nexusRole = productRoles.nexus;

    // CEO or Owner roles have override
    return nexusRole === 'ceo' || nexusRole === 'owner';
  }

  /**
   * Get user's employee ID
   * @private
   */
  async getUserEmployeeId(userId, organizationId) {
    const userSql = `
      SELECT employee_id
      FROM hris.user_account
      WHERE id = $1 
        AND organization_id = $2
        AND deleted_at IS NULL
    `;
    const userResult = await query(
      userSql,
      [userId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.user_account' }
    );

    return userResult.rows.length > 0 ? userResult.rows[0].employee_id : null;
  }

  /**
   * Get user's role (for role-based access)
   * @private
   */
  async getUserRole(userId, organizationId) {
    const userSql = `
      SELECT product_roles
      FROM hris.user_account
      WHERE id = $1 
        AND organization_id = $2
        AND deleted_at IS NULL
    `;
    const userResult = await query(
      userSql,
      [userId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.user_account' }
    );

    if (userResult.rows.length === 0) return null;

    const productRoles = userResult.rows[0].product_roles || {};
    return productRoles.nexus || null;
  }

  /**
   * Get user's department ID
   * @private
   */
  async getUserDepartmentId(userId, organizationId) {
    const userSql = `
      SELECT e.department_id
      FROM hris.user_account u
      JOIN hris.employee e ON u.employee_id = e.id
      WHERE u.id = $1 
        AND u.organization_id = $2
        AND u.deleted_at IS NULL
        AND e.deleted_at IS NULL
    `;
    const userResult = await query(
      userSql,
      [userId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.user_account' }
    );

    return userResult.rows.length > 0 ? userResult.rows[0].department_id : null;
  }

  // ==================== AUDIT LOGGING ====================

  /**
   * Log access attempt to audit trail
   * @private
   */
  async logAccessAttempt(
    employeeId,
    userId,
    organizationId,
    accessType,
    granted,
    reason,
    context = {}
  ) {
    try {
      const logSql = `
        INSERT INTO hris.restricted_access_log (
          organization_id,
          employee_id,
          user_id,
          access_type,
          access_granted,
          denial_reason,
          endpoint,
          http_method,
          ip_address,
          user_agent,
          accessed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id
      `;

      const values = [
        organizationId,
        employeeId,
        userId,
        accessType,
        granted,
        granted ? null : reason,
        context.endpoint || null,
        context.method || null,
        context.ip || null,
        context.userAgent || null
      ];

      const result = await query(
        logSql,
        values,
        organizationId,
        { operation: 'INSERT', table: 'hris.restricted_access_log' }
      );

      return result.rows[0].id;
    } catch (error) {
      // Log error but don't fail the request
      this.logger.error('Error logging access attempt', {
        error: error.message,
        employeeId,
        userId
      });
      return null;
    }
  }

  // ==================== VIP MANAGEMENT ====================

  /**
   * Mark employee as VIP and configure restrictions
   */
  async markAsVIP(employeeId, vipData, organizationId, userId) {
    try {
      // Validate input
      const validated = await EmployeeAccessControlService.markAsVIPSchema.validateAsync(vipData);

      this.logger.info('Marking employee as VIP', {
        employeeId,
        isVip: validated.isVip,
        isRestricted: validated.isRestricted,
        organizationId,
        userId
      });

      // Step 1: Update employee VIP status
      const updateEmployeeSql = `
        UPDATE hris.employee
        SET 
          is_vip = $1,
          is_restricted = $2,
          restriction_level = $3,
          restricted_by = $4,
          restricted_at = CASE WHEN $2 = TRUE THEN NOW() ELSE NULL END,
          restriction_reason = $5,
          updated_at = NOW(),
          updated_by = $6
        WHERE id = $7
          AND organization_id = $8
          AND deleted_at IS NULL
        RETURNING *
      `;

      const employeeResult = await query(
        updateEmployeeSql,
        [
          validated.isVip,
          validated.isRestricted,
          validated.restrictionLevel || null,
          validated.isRestricted ? userId : null,
          validated.restrictionReason || null,
          userId,
          employeeId,
          organizationId
        ],
        organizationId,
        { operation: 'UPDATE', table: 'hris.employee' }
      );

      if (employeeResult.rows.length === 0) {
        throw new NotFoundError('Employee not found');
      }

      // Step 2: Create or update access control rules (only if restricted)
      if (validated.isRestricted) {
        await this.upsertAccessControl(
          employeeId,
          organizationId,
          userId,
          validated
        );
      } else {
        // Remove access control if no longer restricted
        await this.removeAccessControl(employeeId, organizationId);
      }

      this.logger.info('Employee VIP status updated successfully', {
        employeeId,
        isVip: validated.isVip,
        isRestricted: validated.isRestricted
      });

      return employeeResult.rows[0];

    } catch (error) {
      this.logger.error('Error marking employee as VIP', {
        error: error.message,
        employeeId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Create or update access control rules
   * @private
   */
  async upsertAccessControl(employeeId, organizationId, userId, data) {
    const upsertSql = `
      INSERT INTO hris.employee_access_control (
        organization_id,
        employee_id,
        allowed_user_ids,
        allowed_role_ids,
        allowed_department_ids,
        restrict_compensation,
        restrict_personal_info,
        restrict_performance,
        restrict_documents,
        restrict_time_off,
        restrict_benefits,
        restrict_attendance,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (employee_id, organization_id) 
      DO UPDATE SET
        allowed_user_ids = EXCLUDED.allowed_user_ids,
        allowed_role_ids = EXCLUDED.allowed_role_ids,
        allowed_department_ids = EXCLUDED.allowed_department_ids,
        restrict_compensation = EXCLUDED.restrict_compensation,
        restrict_personal_info = EXCLUDED.restrict_personal_info,
        restrict_performance = EXCLUDED.restrict_performance,
        restrict_documents = EXCLUDED.restrict_documents,
        restrict_time_off = EXCLUDED.restrict_time_off,
        restrict_benefits = EXCLUDED.restrict_benefits,
        restrict_attendance = EXCLUDED.restrict_attendance,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
      RETURNING *
    `;

    const result = await query(
      upsertSql,
      [
        organizationId,
        employeeId,
        data.allowedUserIds || [],
        data.allowedRoleIds || [],
        data.allowedDepartmentIds || [],
        data.restrictCompensation !== undefined ? data.restrictCompensation : true,
        data.restrictPersonalInfo || false,
        data.restrictPerformance || false,
        data.restrictDocuments || false,
        data.restrictTimeOff || false,
        data.restrictBenefits || false,
        data.restrictAttendance || false,
        userId,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'hris.employee_access_control' }
    );

    return result.rows[0];
  }

  /**
   * Remove access control rules
   * @private
   */
  async removeAccessControl(employeeId, organizationId) {
    const deleteSql = `
      DELETE FROM hris.employee_access_control
      WHERE employee_id = $1
        AND organization_id = $2
    `;

    await query(
      deleteSql,
      [employeeId, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'hris.employee_access_control' }
    );
  }

  // ==================== ACCESS CONTROL MANAGEMENT ====================

  /**
   * Update access control rules for a restricted employee
   */
  async updateAccessControl(employeeId, updateData, organizationId, userId) {
    try {
      // Validate input
      const validated = await EmployeeAccessControlService.updateAccessControlSchema.validateAsync(updateData);

      this.logger.info('Updating access control rules', {
        employeeId,
        organizationId,
        userId
      });

      // Check if employee is restricted
      const employeeCheckSql = `
        SELECT is_restricted
        FROM hris.employee
        WHERE id = $1 
          AND organization_id = $2
          AND deleted_at IS NULL
      `;
      const employeeResult = await query(
        employeeCheckSql,
        [employeeId, organizationId],
        organizationId,
        { operation: 'SELECT', table: 'hris.employee' }
      );

      if (employeeResult.rows.length === 0) {
        throw new NotFoundError('Employee not found');
      }

      if (!employeeResult.rows[0].is_restricted) {
        throw new ValidationError('Employee must be marked as restricted before updating access control');
      }

      // Build dynamic UPDATE query
      const fields = [];
      const values = [];
      let paramCount = 0;

      Object.keys(validated).forEach(key => {
        if (validated[key] !== undefined) {
          paramCount++;
          fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(validated[key]);
        }
      });

      // Add updated_at and updated_by
      paramCount++;
      fields.push(`updated_at = NOW()`);
      fields.push(`updated_by = $${paramCount}`);
      values.push(userId);

      // Add WHERE clause parameters
      paramCount++;
      values.push(employeeId);
      const employeeIdParam = paramCount;

      paramCount++;
      values.push(organizationId);
      const orgIdParam = paramCount;

      const updateSql = `
        UPDATE hris.employee_access_control
        SET ${fields.join(', ')}
        WHERE employee_id = $${employeeIdParam}
          AND organization_id = $${orgIdParam}
          AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await query(
        updateSql,
        values,
        organizationId,
        { operation: 'UPDATE', table: 'hris.employee_access_control' }
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Access control rules not found');
      }

      this.logger.info('Access control rules updated successfully', { employeeId });

      return result.rows[0];

    } catch (error) {
      this.logger.error('Error updating access control rules', {
        error: error.message,
        employeeId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Get access control rules for an employee
   */
  async getAccessControl(employeeId, organizationId) {
    const sql = `
      SELECT 
        eac.*,
        e.is_vip,
        e.is_restricted,
        e.restriction_level,
        e.restricted_at,
        e.restriction_reason
      FROM hris.employee_access_control eac
      JOIN hris.employee e ON eac.employee_id = e.id
      WHERE eac.employee_id = $1
        AND eac.organization_id = $2
        AND eac.deleted_at IS NULL
        AND e.deleted_at IS NULL
    `;

    const result = await query(
      sql,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.employee_access_control' }
    );

    return result.rows[0] || null;
  }

  /**
   * Get audit log for an employee
   */
  async getAuditLog(employeeId, organizationId, filters = {}) {
    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 50));
    const offset = (page - 1) * limit;

    let conditions = ['employee_id = $1', 'organization_id = $2'];
    let values = [employeeId, organizationId];
    let paramCount = 2;

    // Add filters
    if (filters.accessType) {
      paramCount++;
      conditions.push(`access_type = $${paramCount}`);
      values.push(filters.accessType);
    }

    if (filters.accessGranted !== undefined) {
      paramCount++;
      conditions.push(`access_granted = $${paramCount}`);
      values.push(filters.accessGranted === 'true' || filters.accessGranted === true);
    }

    if (filters.userId) {
      paramCount++;
      conditions.push(`user_id = $${paramCount}`);
      values.push(filters.userId);
    }

    if (filters.fromDate) {
      paramCount++;
      conditions.push(`accessed_at >= $${paramCount}`);
      values.push(new Date(filters.fromDate));
    }

    if (filters.toDate) {
      paramCount++;
      conditions.push(`accessed_at <= $${paramCount}`);
      values.push(new Date(filters.toDate));
    }

    // Count query
    const countSql = `
      SELECT COUNT(*) as total
      FROM hris.restricted_access_log
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await query(countSql, values, organizationId, {
      operation: 'SELECT',
      table: 'hris.restricted_access_log'
    });
    const total = parseInt(countResult.rows[0].total);

    // Data query with JOIN to get user info
    const dataSql = `
      SELECT 
        ral.*,
        u.email as user_email,
        e.first_name as user_first_name,
        e.last_name as user_last_name
      FROM hris.restricted_access_log ral
      LEFT JOIN hris.user_account u ON ral.user_id = u.id
      LEFT JOIN hris.employee e ON u.employee_id = e.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ral.accessed_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    values.push(limit, offset);

    const dataResult = await query(dataSql, values, organizationId, {
      operation: 'SELECT',
      table: 'hris.restricted_access_log'
    });

    return {
      logs: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Helper: Convert camelCase to snake_case
   * @private
   */
  camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export default EmployeeAccessControlService;
```

**Lines of Code:** ~750  
**Test Coverage Target:** 90%+

---

## 2. Access Control Middleware

### File: `backend/src/middleware/checkEmployeeAccess.js`

**New File - Complete Implementation**

```javascript
/**
 * Employee Access Control Middleware
 * 
 * Middleware to check if the authenticated user can access
 * specific employee data based on VIP restrictions
 * 
 * @module middleware/checkEmployeeAccess
 */

import EmployeeAccessControlService from '../products/nexus/services/employeeAccessControlService.js';
import { ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const accessControlService = new EmployeeAccessControlService();

/**
 * Middleware factory to check employee access
 * 
 * @param {string} accessType - Type of data being accessed
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/employees/:id/compensation', 
 *   authenticate,
 *   checkEmployeeAccess('compensation'),
 *   getCompensation
 * );
 */
export function checkEmployeeAccess(accessType = 'general') {
  return async (req, res, next) => {
    try {
      const employeeId = req.params.id || req.params.employeeId;
      const userId = req.user.id;
      const organizationId = req.user.organizationId;

      if (!employeeId) {
        logger.warn('Employee ID not found in request params');
        return next(); // Continue without check if no employee ID
      }

      logger.debug('Checking employee access via middleware', {
        employeeId,
        userId,
        accessType,
        organizationId,
        endpoint: req.originalUrl
      });

      // Perform access check
      const accessCheck = await accessControlService.checkAccess(
        employeeId,
        userId,
        organizationId,
        accessType,
        {
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('user-agent')
        }
      );

      if (!accessCheck.granted) {
        logger.warn('Employee access denied', {
          employeeId,
          userId,
          accessType,
          reason: accessCheck.reason
        });

        // Return 403 Forbidden (not 404 - don't reveal existence)
        return res.status(403).json({
          success: false,
          error: accessCheck.reason || 'Access denied',
          errorCode: 'EMPLOYEE_ACCESS_DENIED'
        });
      }

      // Access granted - attach log ID for reference
      req.accessLogId = accessCheck.logId;

      logger.debug('Employee access granted', {
        employeeId,
        userId,
        accessType,
        reason: accessCheck.reason
      });

      next();
    } catch (error) {
      logger.error('Error in employee access middleware', {
        error: error.message,
        stack: error.stack,
        employeeId: req.params.id || req.params.employeeId,
        userId: req.user?.id
      });

      // Pass error to error handler
      next(error);
    }
  };
}

/**
 * Middleware to filter restricted employees from list responses
 * 
 * Removes employees from response.data.employees array if user doesn't have access
 * Use this for list endpoints (GET /employees) to silently exclude VIP employees
 * 
 * @example
 * router.get('/employees', 
 *   authenticate,
 *   listEmployees,
 *   filterRestrictedEmployees()
 * );
 */
export function filterRestrictedEmployees() {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organizationId;

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to filter employees
      res.json = async function(data) {
        // Only filter if response has employees array
        if (data.employees && Array.isArray(data.employees)) {
          logger.debug('Filtering restricted employees from list', {
            originalCount: data.employees.length,
            userId,
            organizationId
          });

          // Filter employees based on access
          const filteredEmployees = [];
          for (const employee of data.employees) {
            // Check access for each employee
            const accessCheck = await accessControlService.checkAccess(
              employee.id,
              userId,
              organizationId,
              'general',
              {
                endpoint: req.originalUrl,
                method: req.method,
                ip: req.ip
              }
            );

            if (accessCheck.granted) {
              filteredEmployees.push(employee);
            }
          }

          data.employees = filteredEmployees;

          logger.debug('Employees filtered', {
            originalCount: data.employees.length + (data.employees.length - filteredEmployees.length),
            filteredCount: filteredEmployees.length,
            removedCount: data.employees.length - filteredEmployees.length
          });
        }

        // Call original res.json with filtered data
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Error in filter restricted employees middleware', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      // Don't fail the request, just pass through
      next();
    }
  };
}

export default {
  checkEmployeeAccess,
  filterRestrictedEmployees
};
```

**Lines of Code:** ~200  
**Test Coverage Target:** 85%+

---

## 3. Service Layer Updates

### File: `backend/src/products/nexus/services/employeeService.js`

**Modifications Required**

Add VIP-related methods to the existing EmployeeService:

```javascript
// ==================== ADD TO EXISTING EmployeeService ====================

/**
 * Mark employee as VIP with access restrictions
 * 
 * @param {string} employeeId - Employee UUID
 * @param {Object} vipData - VIP configuration
 * @param {string} organizationId - Organization UUID
 * @param {string} userId - User performing action
 * @returns {Promise<Object>} Updated employee with DTO transformation
 */
async markAsVIP(employeeId, vipData, organizationId, userId) {
  try {
    this.logger.info('Marking employee as VIP via EmployeeService', {
      employeeId,
      organizationId
    });

    // Delegate to access control service
    const accessControlService = new EmployeeAccessControlService();
    const updatedEmployee = await accessControlService.markAsVIP(
      employeeId,
      vipData,
      organizationId,
      userId
    );

    // Transform with DTO
    return mapEmployeeDbToApi(updatedEmployee);
  } catch (error) {
    this.logger.error('Error marking employee as VIP', {
      error: error.message,
      employeeId,
      organizationId
    });
    throw error;
  }
}

/**
 * Get VIP status and access control rules for an employee
 * 
 * @param {string} employeeId - Employee UUID
 * @param {string} organizationId - Organization UUID
 * @returns {Promise<Object>} VIP status and access control configuration
 */
async getVIPStatus(employeeId, organizationId) {
  try {
    // Get employee basic VIP info
    const employeeSql = `
      SELECT 
        id,
        is_vip,
        is_restricted,
        restriction_level,
        restricted_at,
        restricted_by,
        restriction_reason
      FROM hris.employee
      WHERE id = $1
        AND organization_id = $2
        AND deleted_at IS NULL
    `;
    
    const employeeResult = await query(
      employeeSql,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.employee' }
    );

    if (employeeResult.rows.length === 0) {
      throw new NotFoundError('Employee not found');
    }

    const employee = employeeResult.rows[0];

    // If not restricted, return basic info
    if (!employee.is_restricted) {
      return {
        employeeId: employee.id,
        isVip: employee.is_vip,
        isRestricted: false,
        restrictionLevel: null,
        accessControl: null
      };
    }

    // Get access control rules
    const accessControlService = new EmployeeAccessControlService();
    const accessControl = await accessControlService.getAccessControl(
      employeeId,
      organizationId
    );

    return {
      employeeId: employee.id,
      isVip: employee.is_vip,
      isRestricted: employee.is_restricted,
      restrictionLevel: employee.restriction_level,
      restrictedAt: employee.restricted_at,
      restrictedBy: employee.restricted_by,
      restrictionReason: employee.restriction_reason,
      accessControl: accessControl ? {
        allowedUserIds: accessControl.allowed_user_ids || [],
        allowedRoleIds: accessControl.allowed_role_ids || [],
        allowedDepartmentIds: accessControl.allowed_department_ids || [],
        restrictCompensation: accessControl.restrict_compensation,
        restrictPersonalInfo: accessControl.restrict_personal_info,
        restrictPerformance: accessControl.restrict_performance,
        restrictDocuments: accessControl.restrict_documents,
        restrictTimeOff: accessControl.restrict_time_off,
        restrictBenefits: accessControl.restrict_benefits,
        restrictAttendance: accessControl.restrict_attendance
      } : null
    };
  } catch (error) {
    this.logger.error('Error getting VIP status', {
      error: error.message,
      employeeId,
      organizationId
    });
    throw error;
  }
}

/**
 * Remove VIP status and restrictions from employee
 * 
 * @param {string} employeeId - Employee UUID
 * @param {string} organizationId - Organization UUID
 * @param {string} userId - User performing action
 * @returns {Promise<Object>} Updated employee
 */
async removeVIPStatus(employeeId, organizationId, userId) {
  try {
    this.logger.info('Removing VIP status from employee', {
      employeeId,
      organizationId
    });

    // Mark as non-VIP via markAsVIP method
    return await this.markAsVIP(
      employeeId,
      {
        isVip: false,
        isRestricted: false,
        restrictionLevel: null
      },
      organizationId,
      userId
    );
  } catch (error) {
    this.logger.error('Error removing VIP status', {
      error: error.message,
      employeeId,
      organizationId
    });
    throw error;
  }
}

/**
 * List all VIP employees in organization
 * 
 * @param {string} organizationId - Organization UUID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} List of VIP employees
 */
async listVIPEmployees(organizationId, filters = {}) {
  try {
    let conditions = [
      'organization_id = $1',
      'is_vip = TRUE',
      'deleted_at IS NULL'
    ];
    let values = [organizationId];
    let paramCount = 1;

    // Add optional filters
    if (filters.isRestricted !== undefined) {
      paramCount++;
      conditions.push(`is_restricted = $${paramCount}`);
      values.push(filters.isRestricted);
    }

    if (filters.restrictionLevel) {
      paramCount++;
      conditions.push(`restriction_level = $${paramCount}`);
      values.push(filters.restrictionLevel);
    }

    const sql = `
      SELECT 
        id,
        employee_number,
        first_name,
        last_name,
        email,
        job_title,
        department_id,
        is_vip,
        is_restricted,
        restriction_level,
        restricted_at,
        restricted_by
      FROM hris.employee
      WHERE ${conditions.join(' AND ')}
      ORDER BY last_name, first_name
    `;

    const result = await query(
      sql,
      values,
      organizationId,
      { operation: 'SELECT', table: 'hris.employee' }
    );

    // Transform with DTO
    return result.rows.map(emp => mapEmployeeDbToApi(emp));
  } catch (error) {
    this.logger.error('Error listing VIP employees', {
      error: error.message,
      organizationId
    });
    throw error;
  }
}

/**
 * Get audit log for employee access attempts
 * 
 * @param {string} employeeId - Employee UUID
 * @param {string} organizationId - Organization UUID
 * @param {Object} filters - Pagination and filters
 * @returns {Promise<Object>} Audit logs with pagination
 */
async getAccessAuditLog(employeeId, organizationId, filters = {}) {
  try {
    const accessControlService = new EmployeeAccessControlService();
    return await accessControlService.getAuditLog(employeeId, organizationId, filters);
  } catch (error) {
    this.logger.error('Error getting access audit log', {
      error: error.message,
      employeeId,
      organizationId
    });
    throw error;
  }
}

// ==================== END OF ADDITIONS ====================
```

**Changes:**
- ✅ 5 new methods added
- ✅ ~150 lines of code
- ✅ Delegates to EmployeeAccessControlService
- ✅ Uses DTOs for transformation
- ✅ Proper error handling and logging

---

## 4. DTO Updates

### File: `backend/src/products/nexus/dto/employeeDto.js`

**Add VIP Fields to DTO**

```javascript
// ==================== ADD TO EXISTING mapEmployeeDbToApi ====================

export const mapEmployeeDbToApi = (dbEmployee) => {
  if (!dbEmployee) return null;

  return {
    id: dbEmployee.id,
    organizationId: dbEmployee.organization_id,
    employeeNumber: dbEmployee.employee_number,
    
    // Personal Information
    firstName: dbEmployee.first_name,
    middleName: dbEmployee.middle_name,
    lastName: dbEmployee.last_name,
    preferredName: dbEmployee.preferred_name,
    dateOfBirth: dbEmployee.date_of_birth,
    gender: dbEmployee.gender,
    nationality: dbEmployee.nationality,
    
    // Contact Information
    email: dbEmployee.email,
    phone: dbEmployee.phone,
    mobilePhone: dbEmployee.mobile_phone,
    
    // Address
    addressLine1: dbEmployee.address_line1,
    addressLine2: dbEmployee.address_line2,
    city: dbEmployee.city,
    stateProvince: dbEmployee.state_province,
    postalCode: dbEmployee.postal_code,
    country: dbEmployee.country,
    
    // Emergency Contact
    emergencyContactName: dbEmployee.emergency_contact_name,
    emergencyContactRelationship: dbEmployee.emergency_contact_relationship,
    emergencyContactPhone: dbEmployee.emergency_contact_phone,
    
    // Employment Information
    hireDate: dbEmployee.hire_date,
    terminationDate: dbEmployee.termination_date,
    employmentStatus: dbEmployee.employment_status,
    employmentType: dbEmployee.employment_type,
    
    // Organizational Assignment
    departmentId: dbEmployee.department_id,
    locationId: dbEmployee.location_id,
    managerId: dbEmployee.manager_id,
    jobTitle: dbEmployee.job_title,
    
    // Work Schedule
    workSchedule: dbEmployee.work_schedule,
    ftePercentage: dbEmployee.fte_percentage,
    
    // Profile
    profilePhotoUrl: dbEmployee.profile_photo_url,
    bio: dbEmployee.bio,
    skills: dbEmployee.skills || [],
    
    // ===== NEW: VIP FIELDS =====
    isVip: dbEmployee.is_vip || false,
    isRestricted: dbEmployee.is_restricted || false,
    restrictionLevel: dbEmployee.restriction_level || null,
    restrictedBy: dbEmployee.restricted_by || null,
    restrictedAt: dbEmployee.restricted_at || null,
    restrictionReason: dbEmployee.restriction_reason || null,
    
    // Metadata
    createdAt: dbEmployee.created_at,
    updatedAt: dbEmployee.updated_at,
    createdBy: dbEmployee.created_by,
    updatedBy: dbEmployee.updated_by,
    deletedAt: dbEmployee.deleted_at
  };
};

// ==================== ADD TO EXISTING mapEmployeeApiToDb ====================

export const mapEmployeeApiToDb = (apiEmployee) => {
  if (!apiEmployee) return null;

  const dbData = {};

  // ... existing mappings ...

  // ===== NEW: VIP FIELDS =====
  if (apiEmployee.isVip !== undefined) {
    dbData.is_vip = apiEmployee.isVip;
  }
  if (apiEmployee.isRestricted !== undefined) {
    dbData.is_restricted = apiEmployee.isRestricted;
  }
  if (apiEmployee.restrictionLevel !== undefined) {
    dbData.restriction_level = apiEmployee.restrictionLevel;
  }
  if (apiEmployee.restrictedBy !== undefined) {
    dbData.restricted_by = apiEmployee.restrictedBy;
  }
  if (apiEmployee.restrictedAt !== undefined) {
    dbData.restricted_at = apiEmployee.restrictedAt;
  }
  if (apiEmployee.restrictionReason !== undefined) {
    dbData.restriction_reason = apiEmployee.restrictionReason;
  }

  return dbData;
};
```

**Changes:**
- ✅ 6 new fields added to DTO
- ✅ Bidirectional transformation (DB ↔ API)
- ✅ Follows existing DTO patterns

---

## Summary

### Files Created: 2

1. `employeeAccessControlService.js` - Core access control logic (750 LOC)
2. `checkEmployeeAccess.js` - Middleware for route protection (200 LOC)

### Files Modified: 2

1. `employeeService.js` - Added 5 VIP methods (~150 LOC added)
2. `employeeDto.js` - Added VIP field mappings (~30 LOC added)

### Total Code Added: ~1,130 lines

### Test Coverage Requirements

| Component | Target Coverage |
|-----------|----------------|
| EmployeeAccessControlService | 90%+ |
| checkEmployeeAccess middleware | 85%+ |
| EmployeeService VIP methods | 90%+ |
| DTO transformations | 100% |

---

**Status:** Backend Implementation Complete  
**Next Document:** [Part 4: API & Routes](./04-API-ROUTES.md)
