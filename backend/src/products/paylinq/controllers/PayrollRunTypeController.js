/**
 * Payroll Run Type Controller
 * 
 * REST API endpoints for payroll run type management.
 * Handles CRUD operations for run types with multi-tenant security.
 * 
 * CRITICAL: MULTI-TENANT SECURITY
 * - organizationId extracted from req.user.organizationId
 * - All operations scoped to user's organization
 * 
 * @module products/paylinq/controllers/PayrollRunTypeController
 */

import PayrollRunTypeService from '../services/PayrollRunTypeService.js';
import { mapRunTypesDbToApi, mapRunTypeDbToApi, mapRunTypesToSummary } from '../dto/payrollRunTypeDto.js';
import logger from '../../../utils/logger.js';

const service = new PayrollRunTypeService();

/**
 * List all run types for organization
 * GET /api/paylinq/payroll-run-types
 * Query params: includeInactive (boolean)
 */
export async function listRunTypes(req, res, next) {
  try {
    const organizationId = req.user?.organizationId;
    const includeInactive = req.query.includeInactive === 'true';

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization ID not found in request'
      });
    }

    const runTypes = await service.list(organizationId, includeInactive);

    res.status(200).json({
      success: true,
      payrollRunTypes: runTypes // Resource-specific key
    });

  } catch (error) {
    logger.error('Error listing run types', {
      error: error.message,
      stack: error.stack,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Get run types summary (for dropdowns)
 * GET /api/paylinq/payroll-run-types/summary
 */
export async function getRunTypesSummary(req, res, next) {
  try {
    const organizationId = req.user?.organizationId;
    const includeInactive = req.query.includeInactive === 'true';

    console.log('[DEBUG] getRunTypesSummary - organizationId:', organizationId);
    console.log('[DEBUG] getRunTypesSummary - user:', req.user);

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization ID not found in request'
      });
    }

    const runTypes = await service.list(organizationId, includeInactive);
    console.log('[DEBUG] getRunTypesSummary - runTypes count:', runTypes?.length);
    console.log('[DEBUG] getRunTypesSummary - runTypes:', JSON.stringify(runTypes, null, 2));
    
    const summary = mapRunTypesToSummary(runTypes);
    console.log('[DEBUG] getRunTypesSummary - summary count:', summary?.length);

    res.status(200).json({
      success: true,
      payrollRunTypes: summary
    });

  } catch (error) {
    logger.error('Error getting run types summary', {
      error: error.message,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Get run type by code
 * GET /api/paylinq/payroll-run-types/:typeCode
 */
export async function getRunTypeByCode(req, res, next) {
  try {
    const { typeCode } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization ID not found in request'
      });
    }

    const runType = await service.getByCode(typeCode, organizationId);

    res.status(200).json({
      success: true,
      payrollRunType: runType // Resource-specific key (singular)
    });

  } catch (error) {
    logger.error('Error getting run type by code', {
      error: error.message,
      typeCode: req.params.typeCode,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Get run type by ID
 * GET /api/paylinq/payroll-run-types/id/:id
 */
export async function getRunTypeById(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization ID not found in request'
      });
    }

    const runType = await service.getById(id, organizationId);

    res.status(200).json({
      success: true,
      payrollRunType: runType
    });

  } catch (error) {
    logger.error('Error getting run type by ID', {
      error: error.message,
      id: req.params.id,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Create run type
 * POST /api/paylinq/payroll-run-types
 */
export async function createRunType(req, res, next) {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization ID not found in request'
      });
    }

    if (!userId) {
      return res.status(403).json({
        success: false,
        error: 'User ID not found in request'
      });
    }

    const runType = await service.create(req.body, organizationId, userId);

    res.status(201).json({
      success: true,
      payrollRunType: runType
    });

  } catch (error) {
    logger.error('Error creating run type', {
      error: error.message,
      organizationId: req.user?.organizationId,
      userId: req.user?.id
    });
    next(error);
  }
}

/**
 * Update run type
 * PATCH /api/paylinq/payroll-run-types/:id
 */
export async function updateRunType(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization ID not found in request'
      });
    }

    if (!userId) {
      return res.status(403).json({
        success: false,
        error: 'User ID not found in request'
      });
    }

    const runType = await service.update(id, req.body, organizationId, userId);

    res.status(200).json({
      success: true,
      payrollRunType: runType
    });

  } catch (error) {
    logger.error('Error updating run type', {
      error: error.message,
      id: req.params.id,
      organizationId: req.user?.organizationId,
      userId: req.user?.id
    });
    next(error);
  }
}

/**
 * Delete run type
 * DELETE /api/paylinq/payroll-run-types/:id
 */
export async function deleteRunType(req, res, next) {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization ID not found in request'
      });
    }

    if (!userId) {
      return res.status(403).json({
        success: false,
        error: 'User ID not found in request'
      });
    }

    await service.delete(id, organizationId, userId);

    res.status(200).json({
      success: true,
      message: 'Run type deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting run type', {
      error: error.message,
      id: req.params.id,
      organizationId: req.user?.organizationId,
      userId: req.user?.id
    });
    next(error);
  }
}

/**
 * Resolve allowed components for a run type
 * GET /api/paylinq/payroll-run-types/:typeCode/components
 */
export async function resolveAllowedComponents(req, res, next) {
  try {
    const { typeCode } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization ID not found in request'
      });
    }

    const components = await service.resolveAllowedComponents(typeCode, organizationId);

    res.status(200).json({
      success: true,
      components // Array of component codes
    });

  } catch (error) {
    logger.error('Error resolving allowed components', {
      error: error.message,
      typeCode: req.params.typeCode,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}

/**
 * Validate run type configuration
 * POST /api/paylinq/payroll-run-types/:typeCode/validate
 */
export async function validateRunType(req, res, next) {
  try {
    const { typeCode } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization ID not found in request'
      });
    }

    const validation = await service.validateRunType(typeCode, organizationId);

    res.status(200).json({
      success: true,
      validation
    });

  } catch (error) {
    logger.error('Error validating run type', {
      error: error.message,
      typeCode: req.params.typeCode,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}
