/**
 * Paylinq Pay Component Controller
 * Handles HTTP requests for pay component management (earnings, deductions, benefits)
 */

import PayComponentService from '../services/payComponentService.js';
import logger from '../../../utils/logger.js';

const payComponentService = new PayComponentService();



/**
 * Create a new pay component
 * POST /api/paylinq/pay-components
 */
async function createPayComponent(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    // Pass data directly to service - service DTO handles DB transformation
    const component = await payComponentService.createPayComponent(req.body, organizationId, userId);

    logger.info('Pay component created', {
      organizationId,
      componentId: component.id,
      componentType: component.componentType,
      userId,
    });

    res.status(201).json({
      success: true,
      payComponent: component,
      message: 'Pay component created successfully',
    });
  } catch (error) {
    logger.error('Error creating pay component', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // ValidationError - return structured validation error response
    if (error.constructor.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        error: 'Validation Error',
        message: error.message,
        details: error.details || []
      });
    }

    // ConflictError - resource already exists
    if (error.constructor.name === 'ConflictError' || error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        errorCode: 'CONFLICT',
        error: 'Conflict',
        message: error.message,
      });
    }

    // Default error response
    res.status(400).json({
      success: false,
      errorCode: 'BAD_REQUEST',
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Get all pay components
 * GET /api/paylinq/pay-components
 */
async function getPayComponents(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { componentType, category, includeInactive, page, limit } = req.query;

    // Parse pagination parameters
    const currentPage = Math.max(1, parseInt(page) || 1);
    const itemsPerPage = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 per page
    const offset = (currentPage - 1) * itemsPerPage;

    const filters = {
      componentType,
      category,
      includeInactive: includeInactive === 'true',
      limit: itemsPerPage,
      offset
    };

    const result = await payComponentService.getPayComponentsByOrganization(
      organizationId,
      filters
    );

    // Calculate pagination metadata
    const totalItems = result.total || result.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    res.status(200).json({
      success: true,
      payComponents: result.components || result,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        total: totalItems,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching pay components', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      errorCode: 'INTERNAL_ERROR',
      error: 'Internal Server Error',
      message: 'Failed to fetch pay components',
    });
  }
}

/**
 * Get a single pay component by ID
 * GET /api/paylinq/pay-components/:id
 */
async function getPayComponentById(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { id } = req.params;

    const component = await payComponentService.getPayComponentById(id, organizationId);

    res.status(200).json({
      success: true,
      payComponent: component,
    });
  } catch (error) {
    logger.error('Error fetching pay component', {
      error: error.message,
      componentId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    // ValidationError - invalid UUID format
    if (error.constructor.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        error: 'Validation Error',
        message: error.message,
        details: error.details || []
      });
    }

    // NotFoundError - component doesn't exist
    if (error.constructor.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        error: 'Not Found',
        message: error.message,
      });
    }

    // Default server error
    res.status(500).json({
      success: false,
      errorCode: 'INTERNAL_ERROR',
      error: 'Internal Server Error',
      message: 'Failed to fetch pay component',
    });
  }
}

/**
 * Update a pay component
 * PUT /api/paylinq/pay-components/:id
 */
async function updatePayComponent(req, res, next) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;

    const component = await payComponentService.updatePayComponent(id, req.body, organizationId, userId);

    logger.info('Pay component updated', {
      organizationId,
      componentId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      payComponent: component,
      message: 'Pay component updated successfully',
    });
  } catch (error) {
    // Log error but pass to error handler middleware
    logger.error('Error updating pay component', {
      error: error.message,
      componentId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Pass error to error handler middleware (DO NOT send response here)
    next(error);
  }
}

/**
 * Delete a pay component
 * DELETE /api/paylinq/pay-components/:id
 */
async function deletePayComponent(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;

    const deleted = await payComponentService.deletePayComponent(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Pay component not found',
      });
    }

    logger.info('Pay component deleted', {
      organizationId,
      componentId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Pay component deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting pay component', {
      error: error.message,
      componentId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Handle NotFoundError (component doesn't exist)
    if (error.constructor.name === 'NotFoundError' || error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Pay component not found',
        errorCode: 'NOT_FOUND',
      });
    }

    if (error.message.includes('in use')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete pay component',
    });
  }
}

/**
 * Create custom employee-specific pay component
 * POST /api/paylinq/employees/:employeeId/pay-components
 */
async function createEmployeePayComponent(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { employeeId } = req.params;

    // Pass data directly to service - service DTO handles transformation
    const componentData = {
      ...req.body,
      employeeId,
      organizationId,
      createdBy: userId,
    };

    const component = await payComponentService.createEmployeePayComponent(componentData);

    logger.info('Employee pay component created', {
      organizationId,
      employeeId,
      componentId: component.id,
      userId,
    });

    res.status(201).json({
      success: true,
      component: component,
      message: 'Employee pay component created successfully',
    });
  } catch (error) {
    logger.error('Error creating employee pay component', {
      error: error.message,
      employeeId: req.params.employeeId,
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
 * Get pay components for an employee
 * GET /api/paylinq/employees/:employeeId/pay-components
 */
async function getEmployeePayComponents(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { employeeId } = req.params;

    const components = await payComponentService.getPayComponentsByEmployee(
      employeeId,
      organizationId
    );

    res.status(200).json({
      success: true,
      components: components,
      count: components.length,
    });
  } catch (error) {
    logger.error('Error fetching employee pay components', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch employee pay components',
    });
  }
}

/**
 * Update employee pay component
 * PUT /api/paylinq/employees/:employeeId/pay-components/:id
 */
async function updateEmployeePayComponent(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { employeeId, id } = req.params;

    const component = await payComponentService.updateEmployeePayComponent(
      id,
      organizationId,
      req.body,
      userId
    );

    if (!component) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Employee pay component not found',
      });
    }

    logger.info('Employee pay component updated', {
      organizationId,
      employeeId,
      componentId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      component: component,
      message: 'Employee pay component updated successfully',
    });
  } catch (error) {
    logger.error('Error updating employee pay component', {
      error: error.message,
      employeeId: req.params.employeeId,
      componentId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.constructor.name === 'NotFoundError') {
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
 * Delete employee pay component
 * DELETE /api/paylinq/employees/:employeeId/pay-components/:id
 */
async function deleteEmployeePayComponent(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { employeeId, id } = req.params;

    const deleted = await payComponentService.deleteEmployeePayComponent(
      id,
      organizationId,
      userId
    );

    logger.info('Employee pay component deleted', {
      organizationId,
      employeeId,
      componentId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Employee pay component deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting employee pay component', {
      error: error.message,
      employeeId: req.params.employeeId,
      componentId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.constructor.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete employee pay component',
    });
  }
}

// ==================== EMPLOYEE COMPONENT ASSIGNMENTS (NEW SYSTEM) ====================

/**
 * Assign component to employee with rich configuration
 * POST /api/paylinq/pay-components/employees/:employeeId/assignments
 */
async function assignComponentToEmployee(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { employeeId } = req.params;

    const assignment = await payComponentService.assignComponentToEmployee(
      { ...req.body, employeeId },
      organizationId,
      userId
    );

    logger.info('Component assigned to employee', {
      organizationId,
      employeeId,
      assignmentId: assignment.id,
      userId,
    });

    res.status(201).json({
      success: true,
      assignment: assignment,
      message: 'Component assigned to employee successfully',
    });
  } catch (error) {
    logger.error('Error assigning component to employee', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message === 'Pay component not found') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error.constructor.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        error: 'Validation Error',
        message: error.message,
        details: error.details || []
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to assign component to employee',
    });
  }
}

/**
 * Get employee component assignments
 * GET /api/paylinq/pay-components/employees/:employeeId/assignments
 */
async function getEmployeeComponentAssignments(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { employeeId } = req.params;

    const assignments = await payComponentService.getEmployeeComponentAssignments(
      employeeId,
      organizationId,
      req.query
    );

    res.status(200).json({
      success: true,
      assignments: assignments,
      count: assignments.length,
    });
  } catch (error) {
    logger.error('Error fetching employee component assignments', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch employee component assignments',
    });
  }
}

/**
 * Update employee component assignment
 * PATCH /api/paylinq/pay-components/employees/:employeeId/assignments/:assignmentId
 */
async function updateEmployeeComponentAssignment(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { assignmentId } = req.params;

    const updated = await payComponentService.updateEmployeeComponentAssignment(
      assignmentId,
      req.body,
      organizationId,
      userId
    );

    logger.info('Component assignment updated', {
      organizationId,
      assignmentId,
      userId,
    });

    res.status(200).json({
      success: true,
      assignment: updated,
      message: 'Component assignment updated successfully',
    });
  } catch (error) {
    logger.error('Error updating component assignment', {
      error: error.message,
      assignmentId: req.params.assignmentId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message === 'Component assignment not found') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update component assignment',
    });
  }
}

/**
 * Remove employee component assignment
 * DELETE /api/paylinq/pay-components/employees/:employeeId/assignments/:assignmentId
 */
async function removeEmployeeComponentAssignment(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { assignmentId } = req.params;

    await payComponentService.removeEmployeeComponentAssignment(
      assignmentId,
      organizationId,
      userId
    );

    logger.info('Component assignment removed', {
      organizationId,
      assignmentId,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Component assignment removed successfully',
    });
  } catch (error) {
    logger.error('Error removing component assignment', {
      error: error.message,
      assignmentId: req.params.assignmentId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to remove component assignment',
    });
  }
}

export default {
  createPayComponent,
  getPayComponents,
  getPayComponentById,
  updatePayComponent,
  deletePayComponent,
  createEmployeePayComponent,
  getEmployeePayComponents,
  updateEmployeePayComponent,
  deleteEmployeePayComponent,
  assignComponentToEmployee,
  getEmployeeComponentAssignments,
  updateEmployeeComponentAssignment,
  removeEmployeeComponentAssignment,
};
