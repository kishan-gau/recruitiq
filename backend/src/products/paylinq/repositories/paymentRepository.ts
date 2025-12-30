/**
 * Payment Repository
 * 
 * Data access layer for payment transaction tracking and management.
 * Supports payment processing, status tracking, and reconciliation.
 * 
 * MVP Version: Payment transaction logging and tracking
 * Phase 2: Direct ACH initiation, real-time payment status, fraud detection
 * 
 * @module products/paylinq/repositories/paymentRepository
 */

import { query  } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class PaymentRepository {
  
  query: any;

constructor(database = null) {
    this.query = database?.query || query;
  }

  /**
   * Create payment transaction
   * @param {Object} transactionData - Payment transaction data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the transaction
   * @returns {Promise<Object>} Created payment transaction
   */
  async createPaymentTransaction(transactionData, organizationId, userId) {
    const result = await this.query(
      `INSERT INTO payroll.payment_transaction 
      (organization_id, paycheck_id, payroll_run_id, employee_id,
       payment_method, payment_amount, payment_date, scheduled_date,
       transaction_reference, bank_account_number, routing_number,
       payment_status, currency, processor_name, processor_transaction_id,
       notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        organizationId,
        transactionData.paycheckId,
        transactionData.payrollRunId,
        transactionData.employeeId,
        transactionData.paymentMethod, // 'ach', 'wire', 'check', 'cash', 'card'
        transactionData.paymentAmount,
        transactionData.paymentDate,
        transactionData.scheduledDate,
        transactionData.transactionReference,
        transactionData.bankAccountNumber,
        transactionData.routingNumber,
        transactionData.paymentStatus || 'pending',
        transactionData.currency || 'SRD',
        transactionData.processorName,
        transactionData.processorTransactionId,
        transactionData.notes,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.payment_transaction', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find payment transactions by criteria
   * @param {Object} criteria - Search criteria
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Payment transactions
   */
  async findPaymentTransactions(criteria, organizationId) {
    let whereClause = 'WHERE pt.organization_id = $1 AND pt.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (criteria.paycheckId) {
      paramCount++;
      whereClause += ` AND pt.paycheck_id = $${paramCount}`;
      params.push(criteria.paycheckId);
    }
    
    if (criteria.payrollRunId) {
      paramCount++;
      whereClause += ` AND pt.payroll_run_id = $${paramCount}`;
      params.push(criteria.payrollRunId);
    }
    
    if (criteria.employeeId) {
      paramCount++;
      whereClause += ` AND pt.employee_id = $${paramCount}`;
      params.push(criteria.employeeId);
    }
    
    if (criteria.paymentMethod) {
      paramCount++;
      whereClause += ` AND pt.payment_method = $${paramCount}`;
      params.push(criteria.paymentMethod);
    }
    
    if (criteria.paymentStatus) {
      paramCount++;
      whereClause += ` AND pt.payment_status = $${paramCount}`;
      params.push(criteria.paymentStatus);
    }
    
    if (criteria.fromDate) {
      paramCount++;
      whereClause += ` AND pt.payment_date >= $${paramCount}`;
      params.push(criteria.fromDate);
    }
    
    if (criteria.toDate) {
      paramCount++;
      whereClause += ` AND pt.payment_date <= $${paramCount}`;
      params.push(criteria.toDate);
    }
    
    const result = await this.query(
      `SELECT pt.*,
              e.employee_number,
              e.id as employee_id,
              e.first_name,
              e.last_name,
              pr.run_number
       FROM payroll.payment_transaction pt
       LEFT JOIN hris.employee e ON e.id = pt.employee_id
       LEFT JOIN payroll.payroll_run pr ON pr.id = pt.payroll_run_id
       ${whereClause}
       ORDER BY pt.payment_date DESC, pt.created_at DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.payment_transaction' }
    );
    
    return result.rows;
  }

  /**
   * Find payment transaction by ID
   * @param {string} transactionId - Payment transaction UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Payment transaction or null
   */
  async findPaymentTransactionById(transactionId, organizationId) {
    const result = await this.query(
      `SELECT pt.*,
              e.employee_number,
              e.first_name,
              e.last_name,
              pc.net_pay as paycheck_amount
       FROM payroll.payment_transaction pt
       LEFT JOIN hris.employee e ON e.id = pt.employee_id
       LEFT JOIN payroll.paycheck pc ON pc.id = pt.paycheck_id
       WHERE pt.id = $1 AND pt.organization_id = $2 AND pt.deleted_at IS NULL`,
      [transactionId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.payment_transaction' }
    );
    
    return result.rows[0] || null;
  }

  /**
   * Update payment status
   * @param {string} transactionId - Payment transaction UUID
   * @param {string} status - New payment status
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @param {Object} additionalData - Additional status data
   * @returns {Promise<Object>} Updated payment transaction
   */
  async updatePaymentStatus(transactionId, status, organizationId, userId, additionalData = {}) {
    const setClause = ['payment_status = $1'];
    const params = [status];
    let paramCount = 1;
    
    // Update timestamps based on status
    if (status === 'processed') {
      setClause.push('processed_at = NOW()');
      if (additionalData.processorTransactionId) {
        paramCount++;
        setClause.push(`processor_transaction_id = $${paramCount}`);
        params.push(additionalData.processorTransactionId);
      }
    } else if (status === 'failed') {
      setClause.push('failed_at = NOW()');
      if (additionalData.failureReason) {
        paramCount++;
        setClause.push(`failure_reason = $${paramCount}`);
        params.push(additionalData.failureReason);
      }
      if (additionalData.retryCount !== undefined) {
        paramCount++;
        setClause.push(`retry_count = $${paramCount}`);
        params.push(additionalData.retryCount);
      }
    } else if (status === 'reconciled') {
      setClause.push('reconciled_at = NOW()');
      paramCount++;
      setClause.push(`reconciled_by = $${paramCount}`);
      params.push(userId);
    }
    
    paramCount++;
    params.push(userId);
    setClause.push(`updated_by = $${paramCount}`);
    setClause.push('updated_at = NOW()');
    
    paramCount++;
    params.push(transactionId);
    paramCount++;
    params.push(organizationId);
    
    const result = await this.query(
      `UPDATE payroll.payment_transaction 
       SET ${setClause.join(', ')}
       WHERE id = $${paramCount - 1} AND organization_id = $${paramCount} AND deleted_at IS NULL
       RETURNING *`,
      params,
      organizationId,
      { operation: 'UPDATE', table: 'payroll.payment_transaction', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Record payment failure
   * @param {string} transactionId - Payment transaction UUID
   * @param {string} failureReason - Reason for failure
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User recording the failure
   * @returns {Promise<Object>} Updated payment transaction
   */
  async recordPaymentFailure(transactionId, failureReason, organizationId, userId) {
    const result = await this.query(
      `UPDATE payroll.payment_transaction 
       SET payment_status = 'failed',
           failure_reason = $1,
           failed_at = NOW(),
           retry_count = COALESCE(retry_count, 0) + 1,
           updated_by = $2,
           updated_at = NOW()
       WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [failureReason, userId, transactionId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.payment_transaction', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Find pending payments
   * @param {string} organizationId - Organization UUID
   * @param {Date} scheduledBefore - Optional scheduled date filter
   * @returns {Promise<Array>} Pending payment transactions
   */
  async findPendingPayments(organizationId, scheduledBefore = null) {
    let whereClause = `WHERE pt.organization_id = $1 
                       AND pt.payment_status = 'pending'
                       AND pt.deleted_at IS NULL`;
    const params = [organizationId];
    let paramCount = 1;
    
    if (scheduledBefore) {
      paramCount++;
      whereClause += ` AND pt.scheduled_date <= $${paramCount}`;
      params.push(scheduledBefore);
    }
    
    const result = await this.query(
      `SELECT pt.*,
              e.employee_number,
              e.first_name,
              e.last_name,
              pc.net_pay
       FROM payroll.payment_transaction pt
       LEFT JOIN hris.employee e ON e.id = pt.employee_id
       LEFT JOIN payroll.paycheck pc ON pc.id = pt.paycheck_id
       ${whereClause}
       ORDER BY pt.scheduled_date ASC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.payment_transaction' }
    );
    
    return result.rows;
  }

  /**
   * Find payments by employee
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Payment transactions
   */
  async findPaymentsByEmployee(employeeId, organizationId, filters = {}) {
    let whereClause = `WHERE pt.employee_id = $1 
                       AND pt.organization_id = $2
                       AND pt.deleted_at IS NULL`;
    const params = [employeeId, organizationId];
    let paramCount = 2;
    
    if (filters.paymentStatus) {
      paramCount++;
      whereClause += ` AND pt.payment_status = $${paramCount}`;
      params.push(filters.paymentStatus);
    }
    
    if (filters.fromDate) {
      paramCount++;
      whereClause += ` AND pt.payment_date >= $${paramCount}`;
      params.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      paramCount++;
      whereClause += ` AND pt.payment_date <= $${paramCount}`;
      params.push(filters.toDate);
    }
    
    const result = await this.query(
      `SELECT pt.*,
              pr.run_number,
              pr.pay_period_start,
              pr.pay_period_end
       FROM payroll.payment_transaction pt
       LEFT JOIN payroll.payroll_run pr ON pr.id = pt.payroll_run_id
       ${whereClause}
       ORDER BY pt.payment_date DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.payment_transaction' }
    );
    
    return result.rows;
  }

  /**
   * Reconcile payment
   * @param {string} transactionId - Payment transaction UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User reconciling the payment
   * @returns {Promise<Object>} Updated payment transaction
   */
  async reconcilePayment(transactionId, organizationId, userId) {
    return this.updatePaymentStatus(transactionId, 'reconciled', organizationId, userId);
  }

  /**
   * Get payment statistics for payroll run
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Payment statistics
   */
  async getPaymentStatistics(payrollRunId, organizationId) {
    const result = await this.query(
      `SELECT 
        COUNT(pt.id) as total_payments,
        COUNT(CASE WHEN pt.payment_status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN pt.payment_status = 'processed' THEN 1 END) as processed_payments,
        COUNT(CASE WHEN pt.payment_status = 'failed' THEN 1 END) as failed_payments,
        COUNT(CASE WHEN pt.payment_status = 'reconciled' THEN 1 END) as reconciled_payments,
        COALESCE(SUM(pt.payment_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN pt.payment_status = 'processed' THEN pt.payment_amount END), 0) as processed_amount,
        COALESCE(SUM(CASE WHEN pt.payment_status = 'failed' THEN pt.payment_amount END), 0) as failed_amount
       FROM payroll.payment_transaction pt
       WHERE pt.payroll_run_id = $1
         AND pt.organization_id = $2
         AND pt.deleted_at IS NULL`,
      [payrollRunId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.payment_transaction' }
    );
    
    return result.rows[0];
  }

  /**
   * Get payment method breakdown
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Payment method breakdown
   */
  async getPaymentMethodBreakdown(payrollRunId, organizationId) {
    const result = await this.query(
      `SELECT 
        pt.payment_method,
        COUNT(pt.id) as payment_count,
        COALESCE(SUM(pt.payment_amount), 0) as total_amount
       FROM payroll.payment_transaction pt
       WHERE pt.payroll_run_id = $1
         AND pt.organization_id = $2
         AND pt.deleted_at IS NULL
       GROUP BY pt.payment_method
       ORDER BY total_amount DESC`,
      [payrollRunId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.payment_transaction' }
    );
    
    return result.rows;
  }

  /**
   * Get failed payments requiring retry
   * @param {string} organizationId - Organization UUID
   * @param {number} maxRetries - Maximum retry count
   * @returns {Promise<Array>} Failed payments eligible for retry
   */
  async getFailedPaymentsForRetry(organizationId, maxRetries = 3) {
    const result = await this.query(
      `SELECT pt.*,
              e.employee_number,
              e.first_name,
              e.last_name,
              pc.net_pay
       FROM payroll.payment_transaction pt
       LEFT JOIN hris.employee e ON e.id = pt.employee_id
       LEFT JOIN payroll.paycheck pc ON pc.id = pt.paycheck_id
       WHERE pt.organization_id = $1
         AND pt.payment_status = 'failed'
         AND COALESCE(pt.retry_count, 0) < $2
         AND pt.deleted_at IS NULL
       ORDER BY pt.failed_at ASC`,
      [organizationId, maxRetries],
      organizationId,
      { operation: 'SELECT', table: 'payroll.payment_transaction' }
    );
    
    return result.rows;
  }

  /**
   * Bulk create payment transactions
   * @param {Array} transactions - Array of transaction objects
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the transactions
   * @returns {Promise<Array>} Created payment transactions
   */
  async bulkCreatePaymentTransactions(transactions, organizationId, userId) {
    const results = [];
    
    for (const transaction of transactions) {
      const result = await this.createPaymentTransaction(transaction, organizationId, userId);
      results.push(result);
    }
    
    return results;
  }
}

export default PaymentRepository;
