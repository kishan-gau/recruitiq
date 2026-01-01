/**
 * Paylinq Payment Controller
 * Handles HTTP requests for payment transaction management
 */

import PaymentService from '../services/paymentService.js';
import { mapApiToDb } from '../utils/dtoMapper.js';
import logger from '../../../utils/logger.js';

const paymentService = new PaymentService();

/**
 * Create a payment transaction
 * POST /api/paylinq/payments
 */
async function createPayment(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const paymentData = mapApiToDb(req.body);

    const payment = await paymentService.createPayment(paymentData, organizationId, userId);

    logger.info('Payment created', {
      organizationId,
      paymentId: payment.id,
      paycheckId: payment.paycheckId,
      userId,
    });

    res.status(201).json({
      success: true,
      payment: payment,
      message: 'Payment created successfully',
    });
  } catch (_error) {
    logger.error('Error creating payment', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Get all payments
 * GET /api/paylinq/payments
 */
async function getPayments(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { paycheckId, employeeId, status, startDate, endDate } = req.query;

    const filters = {
      paycheckId,
      employeeId,
      status,
      startDate,
      endDate,
    };

    const payments = await paymentService.getPaymentsByOrganization(organizationId, filters);

    res.status(200).json({
      success: true,
      payments: payments,
      count: payments.length,
    });
  } catch (_error) {
    logger.error('Error fetching payments', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch payments',
    });
  }
}

/**
 * Get a single payment by ID
 * GET /api/paylinq/payments/:id
 */
async function getPaymentById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const payment = await paymentService.getPaymentById(id, organizationId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Payment not found',
      });
    }

    res.status(200).json({
      success: true,
      payment: payment,
    });
  } catch (_error) {
    logger.error('Error fetching payment', {
      error: error.message,
      paymentId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch payment',
    });
  }
}

/**
 * Get payments for an employee
 * GET /api/paylinq/employees/:employeeId/payments
 */
async function getEmployeePayments(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId } = req.params;
    const { startDate, endDate, limit } = req.query;

    const filters = {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 50,
    };

    const payments = await paymentService.getPaymentsByEmployee(employeeId, organizationId, filters);

    res.status(200).json({
      success: true,
      payments: payments,
      count: payments.length,
    });
  } catch (_error) {
    logger.error('Error fetching employee payments', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch employee payments',
    });
  }
}

/**
 * Update payment status
 * PUT /api/paylinq/payments/:id
 */
async function updatePayment(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const updateData = mapApiToDb(req.body);

    const payment = await paymentService.updatePayment(id, updateData, organizationId, userId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Payment not found',
      });
    }

    logger.info('Payment updated', {
      organizationId,
      paymentId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      payment: payment,
      message: 'Payment updated successfully',
    });
  } catch (_error) {
    logger.error('Error updating payment', {
      error: error.message,
      paymentId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Process a payment
 * POST /api/paylinq/payments/:id/process
 */
async function processPayment(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const payment = await paymentService.processPayment(id, organizationId, userId);

    logger.info('Payment processed', {
      organizationId,
      paymentId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      payment: payment,
      message: 'Payment processed successfully',
    });
  } catch (_error) {
    logger.error('Error processing payment', {
      error: error.message,
      paymentId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('status')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Retry a failed payment
 * POST /api/paylinq/payments/:id/retry
 */
async function retryPayment(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const payment = await paymentService.retryPayment(id, organizationId, userId);

    logger.info('Payment retry initiated', {
      organizationId,
      paymentId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      payment: payment,
      message: 'Payment retry initiated successfully',
    });
  } catch (_error) {
    logger.error('Error retrying payment', {
      error: error.message,
      paymentId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('retry limit') || error.message.includes('status')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Cancel a payment
 * POST /api/paylinq/payments/:id/cancel
 */
async function cancelPayment(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    const payment = await paymentService.cancelPayment(id, organizationId, userId, reason);

    logger.info('Payment cancelled', {
      organizationId,
      paymentId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      payment: payment,
      message: 'Payment cancelled successfully',
    });
  } catch (_error) {
    logger.error('Error cancelling payment', {
      error: error.message,
      paymentId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('cannot be cancelled')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Get pending payments
 * GET /api/paylinq/payments/pending
 */
async function getPendingPayments(req, res) {
  try {
    const { organization_id: organizationId } = req.user;

    const payments = await paymentService.getPendingPayments(organizationId);

    res.status(200).json({
      success: true,
      payments: payments,
      count: payments.length,
    });
  } catch (_error) {
    logger.error('Error fetching pending payments', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch pending payments',
    });
  }
}

/**
 * Delete a payment
 * DELETE /api/paylinq/payments/:id
 */
async function deletePayment(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const deleted = await paymentService.deletePayment(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Payment not found',
      });
    }

    logger.info('Payment deleted', {
      organizationId,
      paymentId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (_error) {
    logger.error('Error deleting payment', {
      error: error.message,
      paymentId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('cannot be deleted')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete payment',
    });
  }
}

export default {
  createPayment,
  getPayments,
  getPaymentById,
  getEmployeePayments,
  updatePayment,
  processPayment,
  retryPayment,
  cancelPayment,
  getPendingPayments,
  deletePayment,
};
