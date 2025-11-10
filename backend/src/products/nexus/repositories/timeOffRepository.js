/**
 * TimeOffRepository
 * Data access layer for time-off requests and balances
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { mapDbToApi, mapApiToDb } from '../../../utils/dtoMapper.js';

class TimeOffRepository {
  constructor() {
    this.requestTable = 'hris.time_off_request';
    this.balanceTable = 'hris.employee_time_off_balance';
    this.typeTable = 'hris.time_off_type';
    this.accrualTable = 'hris.time_off_accrual_history';
    this.logger = logger;
  }

  // ========== TIME OFF TYPES ==========

  /**
   * Find all time-off types
   */
  async findAllTypes(organizationId) {
    try {
      const sql = `
        SELECT * FROM ${this.typeTable}
        WHERE organization_id = $1 AND deleted_at IS NULL AND is_active = true
        ORDER BY type_name
      `;

      const result = await query(sql, [organizationId], organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding time-off types', { organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find time-off type by ID
   */
  async findTypeById(id, organizationId) {
    try {
      const sql = `
        SELECT * FROM ${this.typeTable}
        WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      `;

      const result = await query(sql, [id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding time-off type', { id, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Create time-off type
   */
  async createType(typeData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(typeData);

      const sql = `
        INSERT INTO ${this.typeTable} (
          organization_id, type_code, type_name, description,
          is_paid, requires_approval, max_days_per_request, max_consecutive_days,
          accrual_enabled, accrual_rules,
          allow_carryover, max_carryover_days, carryover_expiry_months,
          is_active, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

      const params = [
        organizationId,
        dbData.type_code,
        dbData.type_name,
        dbData.description || null,
        dbData.is_paid !== undefined ? dbData.is_paid : true,
        dbData.requires_approval !== undefined ? dbData.requires_approval : true,
        dbData.max_days_per_request || null,
        dbData.max_consecutive_days || null,
        dbData.accrual_enabled || false,
        dbData.accrual_rules ? JSON.stringify(dbData.accrual_rules) : '{}',
        dbData.allow_carryover || false,
        dbData.max_carryover_days || null,
        dbData.carryover_expiry_months || null,
        dbData.is_active !== undefined ? dbData.is_active : true,
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating time-off type', { typeData, organizationId, error: error.message });
      throw error;
    }
  }

  // ========== TIME OFF BALANCES ==========

  /**
   * Find employee balance
   */
  async findBalance(employeeId, typeId, year, organizationId) {
    try {
      const sql = `
        SELECT b.*,
               t.type_name,
               t.type_code
        FROM ${this.balanceTable} b
        LEFT JOIN ${this.typeTable} t ON b.time_off_type_id = t.id
        WHERE b.employee_id = $1 
          AND b.time_off_type_id = $2
          AND b.year = $3
          AND b.organization_id = $4
      `;

      const result = await query(sql, [employeeId, typeId, year, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding balance', { employeeId, typeId, year, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find all balances for employee
   */
  async findBalancesByEmployee(employeeId, year, organizationId) {
    try {
      const sql = `
        SELECT b.*,
               t.type_name,
               t.type_code,
               t.is_paid
        FROM ${this.balanceTable} b
        LEFT JOIN ${this.typeTable} t ON b.time_off_type_id = t.id
        WHERE b.employee_id = $1 
          AND b.year = $2
          AND b.organization_id = $3
        ORDER BY t.type_name
      `;

      const result = await query(sql, [employeeId, year, organizationId], organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding balances by employee', { employeeId, year, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Create or update balance
   */
  async upsertBalance(balanceData, organizationId) {
    try {
      const dbData = mapApiToDb(balanceData);

      const sql = `
        INSERT INTO ${this.balanceTable} (
          organization_id, employee_id, time_off_type_id, year,
          total_allocated, total_accrued, total_used, total_pending, current_balance,
          carried_over_from_previous_year, carryover_expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (organization_id, employee_id, time_off_type_id, year)
        DO UPDATE SET
          total_allocated = EXCLUDED.total_allocated,
          total_accrued = EXCLUDED.total_accrued,
          total_used = EXCLUDED.total_used,
          total_pending = EXCLUDED.total_pending,
          current_balance = EXCLUDED.current_balance,
          updated_at = NOW()
        RETURNING *
      `;

      const params = [
        organizationId,
        dbData.employee_id,
        dbData.time_off_type_id,
        dbData.year,
        dbData.total_allocated || 0,
        dbData.total_accrued || 0,
        dbData.total_used || 0,
        dbData.total_pending || 0,
        dbData.current_balance || 0,
        dbData.carried_over_from_previous_year || 0,
        dbData.carryover_expires_at || null
      ];

      const result = await query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error upserting balance', { balanceData, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Update balance amounts
   */
  async updateBalance(employeeId, typeId, year, updates, organizationId) {
    try {
      const sql = `
        UPDATE ${this.balanceTable}
        SET
          total_used = COALESCE($1, total_used),
          total_pending = COALESCE($2, total_pending),
          current_balance = COALESCE($3, current_balance),
          updated_at = NOW()
        WHERE employee_id = $4
          AND time_off_type_id = $5
          AND year = $6
          AND organization_id = $7
        RETURNING *
      `;

      const params = [
        updates.totalUsed,
        updates.totalPending,
        updates.currentBalance,
        employeeId,
        typeId,
        year,
        organizationId
      ];

      const result = await query(sql, params, organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating balance', { employeeId, typeId, year, updates, organizationId, error: error.message });
      throw error;
    }
  }

  // ========== TIME OFF REQUESTS ==========

  /**
   * Find request by ID
   */
  async findRequestById(id, organizationId) {
    try {
      const sql = `
        SELECT r.*,
               e.first_name || ' ' || e.last_name as employee_name,
               e.email as employee_email,
               t.type_name,
               t.is_paid,
               a.first_name || ' ' || a.last_name as approver_name
        FROM ${this.requestTable} r
        LEFT JOIN hris.employee e ON r.employee_id = e.id
        LEFT JOIN ${this.typeTable} t ON r.time_off_type_id = t.id
        LEFT JOIN hris.employee a ON r.approver_id = a.id
        WHERE r.id = $1 
          AND r.organization_id = $2
          AND r.deleted_at IS NULL
      `;

      const result = await query(sql, [id, organizationId], organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error finding request by ID', { id, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Find all requests
   */
  async findAllRequests(filters = {}, organizationId, options = {}) {
    try {
      const { limit = 50, offset = 0, orderBy = 'r.created_at DESC' } = options;

      let sql = `
        SELECT r.*,
               e.first_name || ' ' || e.last_name as employee_name,
               t.type_name,
               t.is_paid
        FROM ${this.requestTable} r
        LEFT JOIN hris.employee e ON r.employee_id = e.id
        LEFT JOIN ${this.typeTable} t ON r.time_off_type_id = t.id
        WHERE r.organization_id = $1 AND r.deleted_at IS NULL
      `;

      const params = [organizationId];
      let paramIndex = 2;

      if (filters.employeeId) {
        sql += ` AND r.employee_id = $${paramIndex}`;
        params.push(filters.employeeId);
        paramIndex++;
      }

      if (filters.status) {
        sql += ` AND r.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.timeOffTypeId) {
        sql += ` AND r.time_off_type_id = $${paramIndex}`;
        params.push(filters.timeOffTypeId);
        paramIndex++;
      }

      if (filters.startDate && filters.endDate) {
        sql += ` AND (r.start_date BETWEEN $${paramIndex} AND $${paramIndex + 1})`;
        params.push(filters.startDate, filters.endDate);
        paramIndex += 2;
      }

      sql += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params, organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error finding all requests', { filters, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Create time-off request
   */
  async createRequest(requestData, organizationId, userId) {
    try {
      const dbData = mapApiToDb(requestData);

      const sql = `
        INSERT INTO ${this.requestTable} (
          organization_id, employee_id, time_off_type_id,
          start_date, end_date, total_days, reason,
          status, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const params = [
        organizationId,
        dbData.employee_id,
        dbData.time_off_type_id,
        dbData.start_date,
        dbData.end_date,
        dbData.total_days,
        dbData.reason || null,
        dbData.status || 'pending',
        userId,
        userId
      ];

      const result = await query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating request', { requestData, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Update request status
   */
  async updateRequestStatus(id, status, approverId, rejectionReason, organizationId, userId) {
    try {
      const sql = `
        UPDATE ${this.requestTable}
        SET
          status = $1,
          approver_id = $2,
          approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END,
          rejection_reason = $3,
          updated_by = $4,
          updated_at = NOW()
        WHERE id = $5
          AND organization_id = $6
          AND deleted_at IS NULL
        RETURNING *
      `;

      const params = [status, approverId, rejectionReason, userId, id, organizationId];
      const result = await query(sql, params, organizationId);
      return result.rows[0] ? mapDbToApi(result.rows[0]) : null;
    } catch (error) {
      this.logger.error('Error updating request status', { id, status, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Delete request
   */
  async deleteRequest(id, organizationId, userId) {
    try {
      const sql = `
        UPDATE ${this.requestTable}
        SET deleted_at = NOW(), updated_by = $1, updated_at = NOW()
        WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
        RETURNING id
      `;

      const result = await query(sql, [userId, id, organizationId], organizationId);
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error('Error deleting request', { id, organizationId, error: error.message });
      throw error;
    }
  }

  // ========== ACCRUAL HISTORY ==========

  /**
   * Create accrual history entry
   */
  async createAccrualHistory(accrualData, organizationId) {
    try {
      const dbData = mapApiToDb(accrualData);

      const sql = `
        INSERT INTO ${this.accrualTable} (
          organization_id, employee_id, time_off_type_id, balance_id,
          accrual_date, accrual_amount, accrual_reason, balance_after_accrual
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const params = [
        organizationId,
        dbData.employee_id,
        dbData.time_off_type_id,
        dbData.balance_id,
        dbData.accrual_date,
        dbData.accrual_amount,
        dbData.accrual_reason || null,
        dbData.balance_after_accrual
      ];

      const result = await query(sql, params, organizationId);
      return mapDbToApi(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating accrual history', { accrualData, organizationId, error: error.message });
      throw error;
    }
  }

  /**
   * Get accrual history for employee
   */
  async getAccrualHistory(employeeId, typeId, organizationId, limit = 50) {
    try {
      const sql = `
        SELECT * FROM ${this.accrualTable}
        WHERE employee_id = $1 
          AND time_off_type_id = $2
          AND organization_id = $3
        ORDER BY accrual_date DESC
        LIMIT $4
      `;

      const result = await query(sql, [employeeId, typeId, organizationId, limit], organizationId);
      return result.rows.map(row => mapDbToApi(row));
    } catch (error) {
      this.logger.error('Error getting accrual history', { employeeId, typeId, organizationId, error: error.message });
      throw error;
    }
  }
}

export default TimeOffRepository;
