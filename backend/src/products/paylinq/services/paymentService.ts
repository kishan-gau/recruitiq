/**
 * Payment Service
 * 
 * Business logic layer for payment transaction processing and management.
 * Handles payment initiation, status tracking, retry logic, and reconciliation.
 * 
 * MVP Version: Payment transaction logging and tracking
 * Phase 2: Direct ACH initiation, real-time payment status, fraud detection, automated retry
 * 
 * @module products/paylinq/services/paymentService
 */

import Joi from 'joi';
import PaymentRepository from '../repositories/paymentRepository.ts';
import logger from '../../../utils/logger.ts';
import { ValidationError, NotFoundError, ConflictError  } from '../../../middleware/errorHandler.ts';

class PaymentService {
  constructor() {
    this.paymentRepository = new PaymentRepository();
  }

  // ==================== VALIDATION SCHEMAS ====================

  paymentTransactionSchema = Joi.object({
    paycheckId: Joi.string().uuid().required(),
    payrollRunId: Joi.string().uuid().required(),
    employeeRecordId: Joi.string().uuid().required(),
    paymentMethod: Joi.string().valid('ach', 'wire', 'check', 'cash', 'card').required(),
    paymentAmount: Joi.number().min(0).required(),
    paymentDate: Joi.date().allow(null),
    scheduledDate: Joi.date().required(),
    transactionReference: Joi.string().max(100).allow(null, ''),
    bankAccountNumber: Joi.string().max(50).allow(null, ''),
    routingNumber: Joi.string().max(20).allow(null, ''),
    currency: Joi.string().length(3).default('SRD'),
    processorName: Joi.string().max(100).allow(null, ''),
    processorTransactionId: Joi.string().max(100).allow(null, ''),
    notes: Joi.string().max(500).allow(null, '')
  });

  // ==================== PAYMENT TRANSACTIONS ====================

  /**
   * Initiate payment transaction
   * @param {Object} transactionData - Payment transaction data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User initiating the payment
   * @returns {Promise<Object>} Created payment transaction
   */
  async initiatePayment(transactionData, organizationId, userId) {
    const { error, value } = this.paymentTransactionSchema.validate(transactionData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Validate payment method requirements
    if (value.paymentMethod === 'ach' || value.paymentMethod === 'wire') {
      if (!value.bankAccountNumber || !value.routingNumber) {
        throw new Error('Bank account number and routing number are required for ACH/wire payments');
      }
    }

    try {
      const transaction = await this.paymentRepository.createPaymentTransaction(
        value,
        organizationId,
        userId
      );

      logger.info('Payment transaction initiated', {
        transactionId: transaction.id,
        paymentMethod: transaction.payment_method,
        paymentAmount: transaction.payment_amount,
        scheduledDate: transaction.scheduled_date,
        organizationId
      });

      return transaction;
    } catch (err) {
      logger.error('Error initiating payment', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get payment transactions
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Payment transactions
   */
  async getPaymentTransactions(organizationId, filters = {}) {
    try {
      return await this.paymentRepository.findPaymentTransactions(filters, organizationId);
    } catch (err) {
      logger.error('Error fetching payment transactions', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get payment transaction by ID
   * @param {string} transactionId - Payment transaction UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Payment transaction
   */
  async getPaymentTransactionById(transactionId, organizationId) {
    try {
      const transaction = await this.paymentRepository.findPaymentTransactionById(
        transactionId,
        organizationId
      );

      if (!transaction) {
        throw new NotFoundError('Payment transaction not found');
      }

      return transaction;
    } catch (err) {
      logger.error('Error fetching payment transaction', { error: err.message, transactionId });
      throw err;
    }
  }

  /**
   * Update payment status
   * @param {string} transactionId - Payment transaction UUID
   * @param {string} status - New payment status
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User updating the status
   * @param {Object} additionalData - Additional status data
   * @returns {Promise<Object>} Updated payment transaction
   */
  async updatePaymentStatus(transactionId, status, organizationId, userId, additionalData = {}) {
    try {
      const validStatuses = ['pending', 'processing', 'processed', 'failed', 'cancelled', 'reconciled'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid payment status: ${status}`);
      }

      const transaction = await this.paymentRepository.updatePaymentStatus(
        transactionId,
        status,
        organizationId,
        userId,
        additionalData
      );

      logger.info('Payment status updated', {
        transactionId,
        oldStatus: transaction.payment_status,
        newStatus: status,
        organizationId
      });

      return transaction;
    } catch (err) {
      logger.error('Error updating payment status', { error: err.message, transactionId });
      throw err;
    }
  }

  /**
   * Process payment (MVP - status update only)
   * @param {string} transactionId - Payment transaction UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User processing the payment
   * @returns {Promise<Object>} Processed payment transaction
   */
  async processPayment(transactionId, organizationId, userId) {
    try {
      // MVP: Simply update status to processed
      // Phase 2: Integrate with actual payment processor (ACH, wire transfer, etc.)
      
      const transaction = await this.getPaymentTransactionById(transactionId, organizationId);

      if (transaction.payment_status !== 'pending') {
        throw new Error(`Cannot process payment with status: ${transaction.payment_status}`);
      }

      const processed = await this.updatePaymentStatus(
        transactionId,
        'processed',
        organizationId,
        userId,
        {
          processorTransactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      );

      logger.info('Payment processed', {
        transactionId,
        paymentAmount: processed.payment_amount,
        organizationId
      });

      return processed;
    } catch (err) {
      logger.error('Error processing payment', { error: err.message, transactionId });
      throw err;
    }
  }

  /**
   * Handle payment failure
   * @param {string} transactionId - Payment transaction UUID
   * @param {string} failureReason - Reason for failure
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User recording the failure
   * @returns {Promise<Object>} Updated payment transaction
   */
  async handlePaymentFailure(transactionId, failureReason, organizationId, userId) {
    try {
      const transaction = await this.paymentRepository.recordPaymentFailure(
        transactionId,
        failureReason,
        organizationId,
        userId
      );

      logger.warn('Payment failed', {
        transactionId,
        failureReason,
        retryCount: transaction.retry_count,
        organizationId
      });

      return transaction;
    } catch (err) {
      logger.error('Error handling payment failure', { error: err.message, transactionId });
      throw err;
    }
  }

  /**
   * Retry failed payment
   * @param {string} transactionId - Payment transaction UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User retrying the payment
   * @returns {Promise<Object>} Retried payment transaction
   */
  async retryPayment(transactionId, organizationId, userId) {
    try {
      const transaction = await this.getPaymentTransactionById(transactionId, organizationId);

      if (transaction.payment_status !== 'failed') {
        throw new Error('Can only retry failed payments');
      }

      const maxRetries = 3;
      if (transaction.retry_count >= maxRetries) {
        throw new Error(`Maximum retry attempts (${maxRetries}) reached`);
      }

      // Reset to pending for retry
      const retried = await this.updatePaymentStatus(
        transactionId,
        'pending',
        organizationId,
        userId
      );

      logger.info('Payment retry initiated', {
        transactionId,
        retryCount: transaction.retry_count + 1,
        organizationId
      });

      // Attempt to process again
      return await this.processPayment(transactionId, organizationId, userId);
    } catch (err) {
      logger.error('Error retrying payment', { error: err.message, transactionId });
      throw err;
    }
  }

  /**
   * Reconcile payment
   * @param {string} transactionId - Payment transaction UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User reconciling the payment
   * @returns {Promise<Object>} Reconciled payment transaction
   */
  async reconcilePayment(transactionId, organizationId, userId) {
    try {
      const transaction = await this.paymentRepository.reconcilePayment(
        transactionId,
        organizationId,
        userId
      );

      logger.info('Payment reconciled', {
        transactionId,
        reconciledBy: userId,
        organizationId
      });

      return transaction;
    } catch (err) {
      logger.error('Error reconciling payment', { error: err.message, transactionId });
      throw err;
    }
  }

  /**
   * Get pending payments
   * @param {string} organizationId - Organization UUID
   * @param {Date} scheduledBefore - Optional scheduled date filter
   * @returns {Promise<Array>} Pending payment transactions
   */
  async getPendingPayments(organizationId, scheduledBefore = null) {
    try {
      return await this.paymentRepository.findPendingPayments(organizationId, scheduledBefore);
    } catch (err) {
      logger.error('Error fetching pending payments', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get payment statistics for payroll run
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Payment statistics
   */
  async getPaymentStatistics(payrollRunId, organizationId) {
    try {
      const stats = await this.paymentRepository.getPaymentStatistics(payrollRunId, organizationId);
      const methodBreakdown = await this.paymentRepository.getPaymentMethodBreakdown(
        payrollRunId,
        organizationId
      );

      return {
        ...stats,
        methodBreakdown
      };
    } catch (err) {
      logger.error('Error fetching payment statistics', { error: err.message, payrollRunId });
      throw err;
    }
  }

  /**
   * Bulk initiate payments for payroll run
   * @param {Array} transactions - Array of transaction objects
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User initiating the payments
   * @returns {Promise<Array>} Creation results
   */
  async bulkInitiatePayments(transactions, organizationId, userId) {
    try {
      const results = [];

      for (const transaction of transactions) {
        try {
          const result = await this.initiatePayment(transaction, organizationId, userId);
          results.push({ success: true, data: result });
        } catch (err) {
          results.push({
            success: false,
            error: err.message,
            paycheckId: transaction.paycheckId
          });
        }
      }

      logger.info('Bulk payment initiation completed', {
        total: transactions.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        organizationId
      });

      return results;
    } catch (err) {
      logger.error('Error in bulk payment initiation', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Process scheduled payments (cron job helper)
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - System user ID
   * @returns {Promise<Object>} Processing results
   */
  async processScheduledPayments(organizationId, userId) {
    try {
      const today = new Date();
      const pendingPayments = await this.getPendingPayments(organizationId, today);

      const results = {
        total: pendingPayments.length,
        processed: 0,
        failed: 0,
        errors: []
      };

      for (const payment of pendingPayments) {
        try {
          await this.processPayment(payment.id, organizationId, userId);
          results.processed++;
        } catch (err) {
          results.failed++;
          results.errors.push({
            transactionId: payment.id,
            error: err.message
          });
          
          await this.handlePaymentFailure(
            payment.id,
            err.message,
            organizationId,
            userId
          );
        }
      }

      logger.info('Scheduled payments processed', {
        ...results,
        organizationId
      });

      return results;
    } catch (err) {
      logger.error('Error processing scheduled payments', { error: err.message, organizationId });
      throw err;
    }
  }
}

export default PaymentService;
