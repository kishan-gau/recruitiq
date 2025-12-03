/**
 * VIP Employee Service
 * 
 * Business logic for VIP employee management and access control.
 * Implements the core functionality for marking employees as VIP,
 * managing access restrictions, and checking user authorization.
 * 
 * @module products/nexus/services/vipEmployeeService
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import Joi from 'joi';
import { 
  ValidationError, 
  NotFoundError, 
  ForbiddenError 
} from '../../../utils/errors.js';

class VIPEmployeeService {
  constructor(database = null) {
    this.query = database?.query || query;
    this.logger = logger;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Handle errors including Joi validation errors
   * @private
   */
  handleServiceError(error, context) {
    if (error.isJoi) {
      throw new ValidationError('Validation failed', error.details);
    }
    this.logger.error(context.message || 'Service error', {
      error: error.message,
      ...context
    });
    throw error;
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
    restrictionReason: Joi.string().trim().max(500).optional().allow('', null),
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
   */
  async checkAccess(employeeId, userId, organizationId, accessType = 'general', requestContext = {}) {
    try {
      this.logger.info('Checking VIP employee access', {
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
          true,
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
      const employeeResult = await this.query(
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
        this.logger.debug('Employee not restricted, access granted', { employeeId });
        return { granted: true, reason: 'Employee not restricted' };
      }

      // Step 4: Check for admin/HR override via RBAC permissions
      const hasOverride = await this.checkAdminOverride(userId, organizationId);
      if (hasOverride) {
        this.logger.info('Admin/HR override granted', { userId, employeeId });
        
        const logId = await this.logAccessAttempt(
          employeeId,
          userId,
          organizationId,
          accessType,
          true,
          'Admin/HR override',
          requestContext
        );

        return { granted: true, reason: 'Admin/HR override', logId };
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
      const accessControlResult = await this.query(
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
          false,
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
        this.logger.debug('Data type not restricted, access granted', { 
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
      this.logger.error('Error checking VIP employee access', {
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

    // Check role-based access via RBAC
    if (accessControl.allowed_role_ids && accessControl.allowed_role_ids.length > 0) {
      const userRoleIds = await this.getUserRoleIds(userId, organizationId);
      const hasRoleAccess = accessControl.allowed_role_ids.some(roleId => 
        userRoleIds.includes(roleId)
      );
      if (hasRoleAccess) {
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
   * Check if user has admin/HR override permission
   * Uses RBAC system to check for VIP management permissions
   * @private
   */
  async checkAdminOverride(userId, organizationId) {
    const sql = `
      SELECT 1
      FROM public.permissions p
      INNER JOIN public.role_permissions rp ON p.id = rp.permission_id
      INNER JOIN public.roles r ON rp.role_id = r.id
      INNER JOIN public.user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
        AND (r.organization_id = $2 OR r.organization_id IS NULL)
        AND ur.deleted_at IS NULL
        AND r.deleted_at IS NULL
        AND p.name IN ('vip:manage', 'employees:admin', 'admin:full')
      LIMIT 1
    `;
    const result = await this.query(
      sql,
      [userId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'permissions' }
    );

    return result.rows.length > 0;
  }

  /**
   * Get user's employee ID
   * @private
   */
  async getUserEmployeeId(userId, organizationId) {
    const sql = `
      SELECT employee_id
      FROM hris.user_account
      WHERE id = $1 
        AND organization_id = $2
        AND deleted_at IS NULL
    `;
    const result = await this.query(
      sql,
      [userId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.user_account' }
    );

    return result.rows.length > 0 ? result.rows[0].employee_id : null;
  }

  /**
   * Get user's role IDs from RBAC
   * @private
   */
  async getUserRoleIds(userId, organizationId) {
    const sql = `
      SELECT r.id
      FROM public.roles r
      INNER JOIN public.user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
        AND (r.organization_id = $2 OR r.organization_id IS NULL)
        AND ur.deleted_at IS NULL
        AND r.deleted_at IS NULL
    `;
    const result = await this.query(
      sql,
      [userId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'roles' }
    );

    return result.rows.map(row => row.id);
  }

  /**
   * Get user's department ID
   * @private
   */
  async getUserDepartmentId(userId, organizationId) {
    const sql = `
      SELECT e.department_id
      FROM hris.user_account u
      JOIN hris.employee e ON u.employee_id = e.id
      WHERE u.id = $1 
        AND u.organization_id = $2
        AND u.deleted_at IS NULL
        AND e.deleted_at IS NULL
    `;
    const result = await this.query(
      sql,
      [userId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.user_account' }
    );

    return result.rows.length > 0 ? result.rows[0].department_id : null;
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::inet, $10, NOW())
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

      const result = await this.query(
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
      const validated = await VIPEmployeeService.markAsVIPSchema.validateAsync(vipData, {
        abortEarly: false,
        stripUnknown: true
      });

      this.logger.info('Marking employee as VIP', {
        employeeId,
        isVip: validated.isVip,
        isRestricted: validated.isRestricted,
        organizationId,
        userId
      });

      // Check if employee exists
      const checkSql = `
        SELECT id FROM hris.employee
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;
      const checkResult = await this.query(
        checkSql,
        [employeeId, organizationId],
        organizationId,
        { operation: 'SELECT', table: 'hris.employee' }
      );

      if (checkResult.rows.length === 0) {
        throw new NotFoundError('Employee not found');
      }

      // Update employee VIP status
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

      const employeeResult = await this.query(
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

      // Create or update access control rules (only if restricted)
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

      return this.mapEmployeeToVIPResponse(employeeResult.rows[0]);

    } catch (error) {
      this.handleServiceError(error, {
        message: 'Error marking employee as VIP',
        employeeId,
        organizationId
      });
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
        updated_by = EXCLUDED.updated_by,
        deleted_at = NULL
      RETURNING *
    `;

    const result = await this.query(
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
   * Remove access control rules (soft delete)
   * @private
   */
  async removeAccessControl(employeeId, organizationId) {
    const deleteSql = `
      UPDATE hris.employee_access_control
      SET deleted_at = NOW()
      WHERE employee_id = $1
        AND organization_id = $2
        AND deleted_at IS NULL
    `;

    await this.query(
      deleteSql,
      [employeeId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'hris.employee_access_control' }
    );
  }

  // ==================== VIP STATUS RETRIEVAL ====================

  /**
   * Get VIP status for an employee
   */
  async getVIPStatus(employeeId, organizationId) {
    const sql = `
      SELECT 
        e.id,
        e.is_vip,
        e.is_restricted,
        e.restriction_level,
        e.restricted_at,
        e.restricted_by,
        e.restriction_reason,
        u.email as restricted_by_email
      FROM hris.employee e
      LEFT JOIN hris.user_account u ON e.restricted_by = u.id
      WHERE e.id = $1
        AND e.organization_id = $2
        AND e.deleted_at IS NULL
    `;
    
    const result = await this.query(
      sql,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.employee' }
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Employee not found');
    }

    const employee = result.rows[0];

    // Get access control if restricted
    let accessControl = null;
    if (employee.is_restricted) {
      const acResult = await this.getAccessControl(employeeId, organizationId);
      accessControl = acResult;
    }

    return {
      employeeId: employee.id,
      isVip: employee.is_vip,
      isRestricted: employee.is_restricted,
      restrictionLevel: employee.restriction_level,
      restrictedAt: employee.restricted_at,
      restrictedBy: employee.restricted_by,
      restrictedByEmail: employee.restricted_by_email,
      restrictionReason: employee.restriction_reason,
      accessControl: accessControl ? this.mapAccessControlToResponse(accessControl) : null
    };
  }

  /**
   * Get access control rules for an employee
   */
  async getAccessControl(employeeId, organizationId) {
    const sql = `
      SELECT *
      FROM hris.employee_access_control
      WHERE employee_id = $1
        AND organization_id = $2
        AND deleted_at IS NULL
    `;

    const result = await this.query(
      sql,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.employee_access_control' }
    );

    return result.rows[0] || null;
  }

  /**
   * Update access control rules for a restricted employee
   */
  async updateAccessControl(employeeId, updateData, organizationId, userId) {
    try {
      // Validate input
      const validated = await VIPEmployeeService.updateAccessControlSchema.validateAsync(updateData, {
        abortEarly: false,
        stripUnknown: true
      });

      this.logger.info('Updating VIP access control rules', {
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
      const employeeResult = await this.query(
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

      const fieldMapping = {
        allowedUserIds: 'allowed_user_ids',
        allowedRoleIds: 'allowed_role_ids',
        allowedDepartmentIds: 'allowed_department_ids',
        restrictCompensation: 'restrict_compensation',
        restrictPersonalInfo: 'restrict_personal_info',
        restrictPerformance: 'restrict_performance',
        restrictDocuments: 'restrict_documents',
        restrictTimeOff: 'restrict_time_off',
        restrictBenefits: 'restrict_benefits',
        restrictAttendance: 'restrict_attendance'
      };

      Object.keys(validated).forEach(key => {
        if (validated[key] !== undefined && fieldMapping[key]) {
          paramCount++;
          fields.push(`${fieldMapping[key]} = $${paramCount}`);
          values.push(validated[key]);
        }
      });

      if (fields.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      // Add updated_at and updated_by
      fields.push(`updated_at = NOW()`);
      paramCount++;
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

      const result = await this.query(
        updateSql,
        values,
        organizationId,
        { operation: 'UPDATE', table: 'hris.employee_access_control' }
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Access control rules not found');
      }

      this.logger.info('VIP access control rules updated successfully', { employeeId });

      return this.mapAccessControlToResponse(result.rows[0]);

    } catch (error) {
      this.handleServiceError(error, {
        message: 'Error updating VIP access control rules',
        employeeId,
        organizationId
      });
    }
  }

  /**
   * Remove VIP status from an employee
   */
  async removeVIPStatus(employeeId, organizationId, userId) {
    return this.markAsVIP(
      employeeId,
      { isVip: false, isRestricted: false, restrictionLevel: null },
      organizationId,
      userId
    );
  }

  // ==================== LIST OPERATIONS ====================

  /**
   * List all VIP employees in organization
   */
  async listVIPEmployees(organizationId, filters = {}) {
    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
    const offset = (page - 1) * limit;

    let conditions = [
      'e.organization_id = $1',
      'e.is_vip = TRUE',
      'e.deleted_at IS NULL'
    ];
    let values = [organizationId];
    let paramCount = 1;

    // Add optional filters
    if (filters.isRestricted !== undefined) {
      paramCount++;
      conditions.push(`e.is_restricted = $${paramCount}`);
      values.push(filters.isRestricted === 'true' || filters.isRestricted === true);
    }

    if (filters.restrictionLevel) {
      paramCount++;
      conditions.push(`e.restriction_level = $${paramCount}`);
      values.push(filters.restrictionLevel);
    }

    if (filters.search) {
      paramCount++;
      conditions.push(`(
        e.first_name ILIKE $${paramCount} OR 
        e.last_name ILIKE $${paramCount} OR 
        e.email ILIKE $${paramCount} OR
        CONCAT(e.first_name, ' ', e.last_name) ILIKE $${paramCount}
      )`);
      values.push(`%${filters.search}%`);
    }

    // Count query
    const countSql = `
      SELECT COUNT(*) as total
      FROM hris.employee e
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await this.query(countSql, values, organizationId, {
      operation: 'SELECT',
      table: 'hris.employee'
    });
    const total = parseInt(countResult.rows[0].total);

    // Data query
    const dataSql = `
      SELECT 
        e.id,
        e.employee_number,
        e.first_name,
        e.last_name,
        e.email,
        e.job_title,
        e.department_id,
        d.department_name,
        e.is_vip,
        e.is_restricted,
        e.restriction_level,
        e.restricted_at,
        e.restricted_by
      FROM hris.employee e
      LEFT JOIN hris.department d ON e.department_id = d.id AND d.deleted_at IS NULL
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.last_name, e.first_name
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    values.push(limit, offset);

    const dataResult = await this.query(dataSql, values, organizationId, {
      operation: 'SELECT',
      table: 'hris.employee'
    });

    return {
      vipEmployees: dataResult.rows.map(emp => this.mapEmployeeToVIPResponse(emp)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get count of VIP employees
   */
  async getVIPCount(organizationId) {
    const sql = `
      SELECT 
        COUNT(*) FILTER (WHERE is_vip = TRUE) as total_vip,
        COUNT(*) FILTER (WHERE is_vip = TRUE AND is_restricted = TRUE) as restricted,
        COUNT(*) FILTER (WHERE is_vip = TRUE AND is_restricted = FALSE) as unrestricted
      FROM hris.employee
      WHERE organization_id = $1 AND deleted_at IS NULL
    `;

    const result = await this.query(
      sql,
      [organizationId],
      organizationId,
      { operation: 'SELECT', table: 'hris.employee' }
    );

    return {
      totalVip: parseInt(result.rows[0].total_vip) || 0,
      restricted: parseInt(result.rows[0].restricted) || 0,
      unrestricted: parseInt(result.rows[0].unrestricted) || 0
    };
  }

  // ==================== AUDIT LOG ====================

  /**
   * Get audit log for VIP employee access
   */
  async getAuditLog(employeeId, organizationId, filters = {}) {
    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 50));
    const offset = (page - 1) * limit;

    let conditions = ['ral.employee_id = $1', 'ral.organization_id = $2'];
    let values = [employeeId, organizationId];
    let paramCount = 2;

    // Add filters
    if (filters.accessType) {
      paramCount++;
      conditions.push(`ral.access_type = $${paramCount}`);
      values.push(filters.accessType);
    }

    if (filters.accessGranted !== undefined) {
      paramCount++;
      conditions.push(`ral.access_granted = $${paramCount}`);
      values.push(filters.accessGranted === 'true' || filters.accessGranted === true);
    }

    if (filters.userId) {
      paramCount++;
      conditions.push(`ral.user_id = $${paramCount}`);
      values.push(filters.userId);
    }

    if (filters.fromDate) {
      paramCount++;
      conditions.push(`ral.accessed_at >= $${paramCount}`);
      values.push(new Date(filters.fromDate));
    }

    if (filters.toDate) {
      paramCount++;
      conditions.push(`ral.accessed_at <= $${paramCount}`);
      values.push(new Date(filters.toDate));
    }

    // Count query
    const countSql = `
      SELECT COUNT(*) as total
      FROM hris.restricted_access_log ral
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await this.query(countSql, values, organizationId, {
      operation: 'SELECT',
      table: 'hris.restricted_access_log'
    });
    const total = parseInt(countResult.rows[0].total);

    // Data query with user info
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

    const dataResult = await this.query(dataSql, values, organizationId, {
      operation: 'SELECT',
      table: 'hris.restricted_access_log'
    });

    return {
      logs: dataResult.rows.map(log => this.mapAuditLogToResponse(log)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // ==================== RESPONSE MAPPERS ====================

  mapEmployeeToVIPResponse(dbEmployee) {
    if (!dbEmployee) return null;
    return {
      id: dbEmployee.id,
      employeeNumber: dbEmployee.employee_number,
      firstName: dbEmployee.first_name,
      lastName: dbEmployee.last_name,
      email: dbEmployee.email,
      jobTitle: dbEmployee.job_title,
      departmentId: dbEmployee.department_id,
      departmentName: dbEmployee.department_name,
      isVip: dbEmployee.is_vip,
      isRestricted: dbEmployee.is_restricted,
      restrictionLevel: dbEmployee.restriction_level,
      restrictedAt: dbEmployee.restricted_at,
      restrictedBy: dbEmployee.restricted_by
    };
  }

  mapAccessControlToResponse(dbAccessControl) {
    if (!dbAccessControl) return null;
    return {
      id: dbAccessControl.id,
      employeeId: dbAccessControl.employee_id,
      allowedUserIds: dbAccessControl.allowed_user_ids || [],
      allowedRoleIds: dbAccessControl.allowed_role_ids || [],
      allowedDepartmentIds: dbAccessControl.allowed_department_ids || [],
      restrictCompensation: dbAccessControl.restrict_compensation,
      restrictPersonalInfo: dbAccessControl.restrict_personal_info,
      restrictPerformance: dbAccessControl.restrict_performance,
      restrictDocuments: dbAccessControl.restrict_documents,
      restrictTimeOff: dbAccessControl.restrict_time_off,
      restrictBenefits: dbAccessControl.restrict_benefits,
      restrictAttendance: dbAccessControl.restrict_attendance,
      createdAt: dbAccessControl.created_at,
      updatedAt: dbAccessControl.updated_at
    };
  }

  mapAuditLogToResponse(dbLog) {
    if (!dbLog) return null;
    return {
      id: dbLog.id,
      employeeId: dbLog.employee_id,
      userId: dbLog.user_id,
      userEmail: dbLog.user_email,
      userName: dbLog.user_first_name && dbLog.user_last_name 
        ? `${dbLog.user_first_name} ${dbLog.user_last_name}` 
        : null,
      accessType: dbLog.access_type,
      accessGranted: dbLog.access_granted,
      denialReason: dbLog.denial_reason,
      endpoint: dbLog.endpoint,
      httpMethod: dbLog.http_method,
      ipAddress: dbLog.ip_address,
      userAgent: dbLog.user_agent,
      accessedAt: dbLog.accessed_at
    };
  }
}

export default VIPEmployeeService;
