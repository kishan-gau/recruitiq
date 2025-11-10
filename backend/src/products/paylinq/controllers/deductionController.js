/**
 * Paylinq Deduction Controller
 * Handles HTTP requests for employee deduction management
 */

import taxCalculationService from '../services/taxCalculationService.js';
import logger from '../../../utils/logger.js';
import { mapDeductionApiToDb } from '../utils/dtoMapper.js';

/**
 * Create a deduction
 * POST /api/paylinq/deductions
 */
async function createDeduction(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    // Map API field names to database schema names
    const deductionData = mapDeductionApiToDb(req.body);

    const deduction = await taxCalculationService.createDeduction(
      deductionData,
      organizationId,
      userId
    );

    logger.info('Deduction created', {
      organizationId,
      deductionId: deduction.id,
      employeeId: deduction.employee_id,
      userId,
    });

    res.status(201).json({
      success: true,
      deduction: deduction,
      message: 'Deduction created successfully',
    });
  } catch (error) {
    logger.error('Error creating deduction', {
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
 * Get all deductions
 * GET /api/paylinq/deductions
 */
async function getDeductions(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId, deductionType, status } = req.query;

    const filters = {
      employeeId,
      deductionType,
      status,
    };

    const deductions = await taxCalculationService.getDeductionsByOrganization(
      organizationId,
      filters
    );

    res.status(200).json({
      success: true,
      deductions: deductions,
      count: deductions.length,
    });
  } catch (error) {
    logger.error('Error fetching deductions', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch deductions',
    });
  }
}

/**
 * Get deductions for an employee
 * GET /api/paylinq/employees/:employeeId/deductions
 */
async function getEmployeeDeductions(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId } = req.params;
    const { includeInactive } = req.query;

    const deductions = await taxCalculationService.getDeductionsByEmployee(
      employeeId,
      organizationId,
      includeInactive === 'true'
    );

    res.status(200).json({
      success: true,
      deductions: deductions,
      count: deductions.length,
    });
  } catch (error) {
    logger.error('Error fetching employee deductions', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch employee deductions',
    });
  }
}

/**
 * Get a single deduction by ID
 * GET /api/paylinq/deductions/:id
 */
async function getDeductionById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const deduction = await taxCalculationService.getDeductionById(id, organizationId);

    if (!deduction) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Deduction not found',
      });
    }

    res.status(200).json({
      success: true,
      deduction: deduction,
    });
  } catch (error) {
    logger.error('Error fetching deduction', {
      error: error.message,
      deductionId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch deduction',
    });
  }
}

/**
 * Update a deduction
 * PUT /api/paylinq/deductions/:id
 */
async function updateDeduction(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    // Map API field names to database schema names
    const updateData = mapDeductionApiToDb(req.body);

    const deduction = await taxCalculationService.updateDeduction(
      id,
      organizationId,
      updateData,
      userId
    );

    if (!deduction) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Deduction not found',
      });
    }

    logger.info('Deduction updated', {
      organizationId,
      deductionId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      deduction: deduction,
      message: 'Deduction updated successfully',
    });
  } catch (error) {
    logger.error('Error updating deduction', {
      error: error.message,
      deductionId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Handle NotFoundError specifically
    if (error.name === 'NotFoundError' || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
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
 * Delete a deduction
 * DELETE /api/paylinq/deductions/:id
 */
async function deleteDeduction(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const deleted = await taxCalculationService.deleteDeduction(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Deduction not found',
      });
    }

    logger.info('Deduction deleted', {
      organizationId,
      deductionId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Deduction deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting deduction', {
      error: error.message,
      deductionId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Handle NotFoundError specifically
    if (error.name === 'NotFoundError' || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete deduction',
    });
  }
}

export default {
  createDeduction,
  getDeductions,
  getEmployeeDeductions,
  getDeductionById,
  updateDeduction,
  deleteDeduction,
};
