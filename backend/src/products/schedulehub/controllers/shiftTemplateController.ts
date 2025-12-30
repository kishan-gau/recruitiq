/**
 * ScheduleHub Shift Template Controller
 * HTTP request handlers for shift template management
 */

import ShiftTemplateService from '../services/shiftTemplateService.ts';
import logger from '../../../utils/logger.ts';

class ShiftTemplateController {
  constructor() {
    this.shiftTemplateService = new ShiftTemplateService();
  }

  /**
   * Create a new shift template
   * POST /api/products/schedulehub/shift-templates
   */
  createTemplate = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      const template = await this.shiftTemplateService.create(
        req.body,
        organizationId,
        userId
      );

      logger.info('Shift template created successfully', {
        templateId: template.id,
        organizationId,
        userId
      });

      res.status(201).json({
        success: true,
        shiftTemplate: template,
        message: 'Shift template created successfully'
      });
    } catch (error) {
      logger.error('Error creating shift template:', {
        error: error.message,
        organizationId: req.user?.organization_id,
        userId: req.user?.id,
        data: req.body
      });
      next(error);
    }
  };

  /**
   * Get all shift templates with filtering and pagination
   * GET /api/products/schedulehub/shift-templates
   */
  getTemplates = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      const templates = await this.shiftTemplateService.getAll(
        organizationId,
        req.query
      );

      res.json({
        success: true,
        shiftTemplates: templates
      });
    } catch (error) {
      logger.error('Error retrieving shift templates:', {
        error: error.message,
        organizationId: req.user?.organization_id,
        userId: req.user?.id,
        filters: req.query
      });
      next(error);
    }
  };

  /**
   * Get shift template by ID with role requirements
   * GET /api/products/schedulehub/shift-templates/:id
   */
  getTemplateById = async (req, res, next) => {
    try {
      console.log('🎯 [CONTROLLER] getTemplateById CALLED');
      const { id } = req.params;
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      console.log('🎯 [CONTROLLER] Calling service with:', { id, organizationId, userId });

      const template = await this.shiftTemplateService.getById(
        id,
        organizationId,
        userId
      );

      res.json({
        success: true,
        shiftTemplate: template
      });
    } catch (error) {
      logger.error('Error retrieving shift template:', {
        error: error.message,
        templateId: req.params.id,
        organizationId: req.user?.organization_id,
        userId: req.user?.id
      });
      next(error);
    }
  };

  /**
   * Update shift template
   * PATCH /api/products/schedulehub/shift-templates/:id
   */
  updateTemplate = async (req, res, next) => {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      const template = await this.shiftTemplateService.update(
        id,
        req.body,
        organizationId,
        userId
      );

      logger.info('Shift template updated successfully', {
        templateId: id,
        organizationId,
        userId
      });

      res.json({
        success: true,
        shiftTemplate: template,
        message: 'Shift template updated successfully'
      });
    } catch (error) {
      logger.error('Error updating shift template:', {
        error: error.message,
        templateId: req.params.id,
        organizationId: req.user?.organization_id,
        userId: req.user?.id,
        data: req.body
      });
      next(error);
    }
  };

  /**
   * Delete shift template (soft delete)
   * DELETE /api/products/schedulehub/shift-templates/:id
   */
  deleteTemplate = async (req, res, next) => {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      await this.shiftTemplateService.delete(id, organizationId, userId);

      logger.info('Shift template deleted successfully', {
        templateId: id,
        organizationId,
        userId
      });

      res.json({
        success: true,
        message: 'Shift template deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting shift template:', {
        error: error.message,
        templateId: req.params.id,
        organizationId: req.user?.organization_id,
        userId: req.user?.id
      });
      next(error);
    }
  };

  /**
   * Get shift template summaries for dropdowns/selection
   * GET /api/products/schedulehub/shift-templates/summaries
   */
  getTemplateSummaries = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      const summaries = await this.shiftTemplateService.getSummaries(
        organizationId,
        userId,
        req.query
      );

      res.json({
        success: true,
        templates: summaries
      });
    } catch (error) {
      logger.error('Error retrieving shift template summaries:', {
        error: error.message,
        organizationId: req.user?.organization_id,
        userId: req.user?.id,
        filters: req.query
      });
      next(error);
    }
  };

  /**
   * Get usage statistics for a shift template
   * GET /api/products/schedulehub/shift-templates/:id/usage
   */
  getTemplateUsage = async (req, res, next) => {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      // Get template with usage statistics (already included in getById)
      const template = await this.shiftTemplateService.getById(
        id,
        organizationId,
        userId
      );

      // Extract just the usage statistics
      const usage = {
        totalSchedules: template.usageStats?.totalSchedules || 0,
        activeSchedules: template.usageStats?.activeSchedules || 0,
        upcomingSchedules: template.usageStats?.upcomingSchedules || 0,
        lastUsed: template.usageStats?.lastUsed || null,
        canDelete: template.usageStats?.canDelete || false
      };

      res.json({
        success: true,
        usage
      });
    } catch (error) {
      logger.error('Error retrieving shift template usage:', {
        error: error.message,
        templateId: req.params.id,
        organizationId: req.user?.organization_id,
        userId: req.user?.id
      });
      next(error);
    }
  };

  /**
   * Validate shift template data without saving
   * POST /api/products/schedulehub/shift-templates/validate
   */
  validateTemplate = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      // Use service validation without saving
      const validation = await this.shiftTemplateService.validateTemplateData(
        req.body,
        organizationId,
        userId
      );

      res.json({
        success: true,
        validation
      });
    } catch (error) {
      // For validation endpoint, we want to return validation errors as success
      // with error details, not as HTTP errors
      if (error.name === 'ValidationError') {
        return res.json({
          success: false,
          validation: {
            isValid: false,
            errors: error.details || [error.message]
          }
        });
      }

      logger.error('Error validating shift template:', {
        error: error.message,
        organizationId: req.user?.organization_id,
        userId: req.user?.id,
        data: req.body
      });
      next(error);
    }
  };

  /**
   * Clone an existing shift template
   * POST /api/products/schedulehub/shift-templates/:id/clone
   */
  cloneTemplate = async (req, res, next) => {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { templateName, description } = req.body;

      // Get existing template
      const existingTemplate = await this.shiftTemplateService.getById(
        id,
        organizationId,
        userId
      );

      // Create clone data
      const cloneData = {
        templateName: templateName || `${existingTemplate.templateName} (Copy)`,
        description: description || existingTemplate.description,
        startTime: existingTemplate.startTime,
        endTime: existingTemplate.endTime,
        duration: existingTemplate.duration,
        totalHours: existingTemplate.totalHours,
        breakMinutes: existingTemplate.breakMinutes,
        shiftType: existingTemplate.shiftType,
        priority: existingTemplate.priority,
        stationId: existingTemplate.stationId,
        minimumStaff: existingTemplate.minimumStaff,
        maximumStaff: existingTemplate.maximumStaff,
        autoApproveTimeOff: existingTemplate.autoApproveTimeOff,
        requiresManagerApproval: existingTemplate.requiresManagerApproval,
        roleRequirements: existingTemplate.roleRequirements?.map(role => ({
          roleId: role.roleId,
          requiredCount: role.requiredCount,
          minimumProficiency: role.minimumProficiency,
          isPrimaryRole: role.isPrimaryRole,
          priority: role.priority
        })) || []
      };

      const clonedTemplate = await this.shiftTemplateService.create(
        cloneData,
        organizationId,
        userId
      );

      logger.info('Shift template cloned successfully', {
        originalTemplateId: id,
        clonedTemplateId: clonedTemplate.id,
        organizationId,
        userId
      });

      res.status(201).json({
        success: true,
        shiftTemplate: clonedTemplate,
        message: 'Shift template cloned successfully'
      });
    } catch (error) {
      logger.error('Error cloning shift template:', {
        error: error.message,
        templateId: req.params.id,
        organizationId: req.user?.organization_id,
        userId: req.user?.id,
        data: req.body
      });
      next(error);
    }
  };
}

export default ShiftTemplateController;