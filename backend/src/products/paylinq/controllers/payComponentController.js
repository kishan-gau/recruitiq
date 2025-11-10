/**
 * Paylinq Pay Component Controller
 * Handles HTTP requests for pay component management (earnings, deductions, benefits)
 */

import payComponentService from '../services/payComponentService.js';
import logger from '../../../utils/logger.js';
import { mapPayComponentApiToDb, mapPayComponentDbToApi, mapPayComponentDbArrayToApi } from '../utils/dtoMapper.js';



/**
 * Create a new pay component
 * POST /api/paylinq/pay-components
 */
async function createPayComponent(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    // Map API field names to database schema names
    const componentData = mapPayComponentApiToDb(req.body);

    const component = await payComponentService.createPayComponent(componentData, organizationId, userId);

    logger.info('Pay component created', {
      organizationId,
      componentId: component.id,
      componentType: component.componentType,
      userId,
    });

    res.status(201).json({
      success: true,
      data: mapPayComponentDbToApi(component),
      message: 'Pay component created successfully',
    });
  } catch (error) {
    logger.error('Error creating pay component', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('already exists')) {
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
 * Get all pay components
 * GET /api/paylinq/pay-components
 */
async function getPayComponents(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { componentType, category, includeInactive } = req.query;

    const filters = {
      componentType,
      category,
      includeInactive: includeInactive === 'true',
    };

    const components = await payComponentService.getPayComponentsByOrganization(
      organizationId,
      filters
    );

    res.status(200).json({
      success: true,
      data: mapPayComponentDbArrayToApi(components),
      count: components.length,
    });
  } catch (error) {
    logger.error('Error fetching pay components', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
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
      data: mapPayComponentDbToApi(component),
    });
  } catch (error) {
    logger.error('Error fetching pay component', {
      error: error.message,
      componentId: req.params.id,
      organizationId: req.user?.organization_id,
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
      message: 'Failed to fetch pay component',
    });
  }
}

/**
 * Update a pay component
 * PUT /api/paylinq/pay-components/:id
 */
async function updatePayComponent(req, res) {
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
      data: mapPayComponentDbToApi(component),
      message: 'Pay component updated successfully',
    });
  } catch (error) {
    logger.error('Error updating pay component', {
      error: error.message,
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

    // Map field names and normalize values
    const mappedData = mapPayComponentApiToDb(req.body);
    const componentData = {
      ...mappedData,
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
};
