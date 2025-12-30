/**
 * Payslip Template Controller
 * Handles HTTP requests for payslip template management
 */

import payslipTemplateService from '../services/payslipTemplateService.ts';
import payslipPdfService from '../services/payslipPdfService.ts';
import logger from '../../../utils/logger.ts';

/**
 * Get all templates
 * GET /api/paylinq/payslip-templates
 */
async function getTemplates(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { status, layoutType, isDefault } = req.query;

    const filters = { status, layoutType, isDefault };
    const templates = await payslipTemplateService.getTemplates(organizationId, filters);

    res.status(200).json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    logger.error('Error fetching templates', { error: error.message, organizationId: req.user?.organization_id });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch templates',
    });
  }
}

/**
 * Get template by ID
 * GET /api/paylinq/payslip-templates/:id
 */
async function getTemplateById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const template = await payslipTemplateService.getTemplateById(id, organizationId);

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    logger.error('Error fetching template', { error: error.message, templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch template',
    });
  }
}

/**
 * Create template
 * POST /api/paylinq/payslip-templates
 */
async function createTemplate(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;

    const template = await payslipTemplateService.createTemplate(req.body, organizationId, userId);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully',
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message,
      });
    }

    logger.error('Error creating template', { error: error.message, organizationId: req.user?.organization_id });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create template',
    });
  }
}

/**
 * Update template
 * PUT /api/paylinq/payslip-templates/:id
 */
async function updateTemplate(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const template = await payslipTemplateService.updateTemplate(id, req.body, organizationId, userId);

    res.status(200).json({
      success: true,
      data: template,
      message: 'Template updated successfully',
    });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message,
      });
    }

    logger.error('Error updating template', { error: error.message, templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update template',
    });
  }
}

/**
 * Delete template
 * DELETE /api/paylinq/payslip-templates/:id
 */
async function deleteTemplate(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    await payslipTemplateService.deleteTemplate(id, organizationId, userId);

    res.status(200).json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message,
      });
    }

    logger.error('Error deleting template', { error: error.message, templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete template',
    });
  }
}

/**
 * Duplicate template
 * POST /api/paylinq/payslip-templates/:id/duplicate
 */
async function duplicateTemplate(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const template = await payslipTemplateService.duplicateTemplate(id, organizationId, userId);

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template duplicated successfully',
    });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    logger.error('Error duplicating template', { error: error.message, templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to duplicate template',
    });
  }
}

/**
 * Activate template
 * POST /api/paylinq/payslip-templates/:id/activate
 */
async function activateTemplate(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const template = await payslipTemplateService.activateTemplate(id, organizationId, userId);

    res.status(200).json({
      success: true,
      data: template,
      message: 'Template activated successfully',
    });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    logger.error('Error activating template', { error: error.message, templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to activate template',
    });
  }
}

/**
 * Archive template
 * POST /api/paylinq/payslip-templates/:id/archive
 */
async function archiveTemplate(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const template = await payslipTemplateService.archiveTemplate(id, organizationId, userId);

    res.status(200).json({
      success: true,
      data: template,
      message: 'Template archived successfully',
    });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    logger.error('Error archiving template', { error: error.message, templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to archive template',
    });
  }
}

/**
 * Get template assignments
 * GET /api/paylinq/payslip-templates/:id/assignments
 */
async function getTemplateAssignments(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const assignments = await payslipTemplateService.getTemplateAssignments(id, organizationId);

    res.status(200).json({
      success: true,
      data: assignments,
      count: assignments.length,
    });
  } catch (error) {
    logger.error('Error fetching template assignments', { error: error.message, templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch assignments',
    });
  }
}

/**
 * Create assignment
 * POST /api/paylinq/payslip-templates/:id/assignments
 */
async function createAssignment(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id: templateId } = req.params;

    const assignmentData = { ...req.body, templateId };
    const assignment = await payslipTemplateService.createAssignment(assignmentData, organizationId, userId);

    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Assignment created successfully',
    });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'NotFoundError') {
      return res.status(400).json({
        success: false,
        error: error.name,
        message: error.message,
      });
    }

    logger.error('Error creating assignment', { error: error.message, templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create assignment',
    });
  }
}

/**
 * Update assignment
 * PUT /api/paylinq/payslip-templates/:id/assignments/:assignmentId
 */
async function updateAssignment(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { assignmentId } = req.params;

    const assignment = await payslipTemplateService.updateAssignment(assignmentId, req.body, organizationId, userId);

    res.status(200).json({
      success: true,
      data: assignment,
      message: 'Assignment updated successfully',
    });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message,
      });
    }

    logger.error('Error updating assignment', { error: error.message, assignmentId: req.params.assignmentId });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update assignment',
    });
  }
}

/**
 * Delete assignment
 * DELETE /api/paylinq/payslip-templates/:id/assignments/:assignmentId
 */
async function deleteAssignment(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { assignmentId } = req.params;

    await payslipTemplateService.deleteAssignment(assignmentId, organizationId, userId);

    res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting assignment', { error: error.message, assignmentId: req.params.assignmentId });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete assignment',
    });
  }
}

/**
 * Generate preview PDF with sample data
 * POST /api/paylinq/payslip-templates/:id/preview
 */
async function generatePreview(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id: templateId } = req.params;
    const { paycheckId } = req.body;

    // If paycheckId provided, use real data; otherwise use sample data
    let pdfBuffer;
    
    if (paycheckId) {
      // Generate with real paycheck data
      pdfBuffer = await payslipPdfService.generatePayslipPdf(paycheckId, organizationId);
    } else {
      // TODO: Generate with sample data
      // For now, return error asking for paycheck ID
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Preview with sample data coming soon. Please provide a paycheckId to preview with real data.',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.send(pdfBuffer);

  } catch (error) {
    logger.error('Error generating preview', { error: error.message, templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate preview',
    });
  }
}

export default {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  activateTemplate,
  archiveTemplate,
  getTemplateAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  generatePreview,
};
