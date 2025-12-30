/**
 * Payslip Template Service
 * 
 * Business logic for payslip template management and assignments.
 * Handles template resolution, priority-based selection, and CRUD operations.
 * 
 * @module products/paylinq/services/payslipTemplateService
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import Joi from 'joi';
import { ValidationError, NotFoundError } from '../../../middleware/errorHandler.js';

class PayslipTemplateService {
  // Validation schemas
  templateSchema = Joi.object({
    templateName: Joi.string().required().max(100),
    templateCode: Joi.string().required().max(50).pattern(/^[a-z0-9_-]+$/),
    description: Joi.string().allow('', null),
    layoutType: Joi.string().valid('standard', 'compact', 'detailed', 'custom').default('standard'),
    showCompanyLogo: Joi.boolean().default(true),
    companyLogoUrl: Joi.string().uri().allow('', null),
    headerText: Joi.string().allow('', null),
    headerColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#10b981'),
    showEmployeeInfo: Joi.boolean().default(true),
    showPaymentDetails: Joi.boolean().default(true),
    showEarningsSection: Joi.boolean().default(true),
    showDeductionsSection: Joi.boolean().default(true),
    showTaxesSection: Joi.boolean().default(true),
    showLeaveBalances: Joi.boolean().default(false),
    showYtdTotals: Joi.boolean().default(true),
    showQrCode: Joi.boolean().default(false),
    customSections: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      content: Joi.string().required(),
      order: Joi.number().integer().min(0)
    })).allow(null),
    fieldConfiguration: Joi.object().allow(null),
    fontFamily: Joi.string().default('Arial'),
    fontSize: Joi.number().integer().min(6).max(20).default(10),
    primaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#10b981'),
    secondaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6b7280'),
    footerText: Joi.string().allow('', null),
    showConfidentialityNotice: Joi.boolean().default(true),
    confidentialityText: Joi.string().allow('', null),
    pageSize: Joi.string().valid('A4', 'Letter', 'Legal').default('A4'),
    pageOrientation: Joi.string().valid('portrait', 'landscape').default('portrait'),
    language: Joi.string().default('en'),
    currencyDisplayFormat: Joi.string().default('SRD #,##0.00'),
    dateFormat: Joi.string().default('MMM dd, yyyy'),
    displayRules: Joi.object().allow(null)
  });

  assignmentSchema = Joi.object({
    templateId: Joi.string().uuid().required(),
    assignmentType: Joi.string().valid('organization', 'worker_type', 'department', 'employee', 'pay_structure').required(),
    workerTypeId: Joi.string().uuid().when('assignmentType', { is: 'worker_type', then: Joi.required(), otherwise: Joi.allow(null) }),
    departmentId: Joi.string().uuid().when('assignmentType', { is: 'department', then: Joi.required(), otherwise: Joi.allow(null) }),
    employeeId: Joi.string().uuid().when('assignmentType', { is: 'employee', then: Joi.required(), otherwise: Joi.allow(null) }),
    payStructureTemplateId: Joi.string().uuid().when('assignmentType', { is: 'pay_structure', then: Joi.required(), otherwise: Joi.allow(null) }),
    priority: Joi.number().integer().min(0).max(100).default(0),
    effectiveFrom: Joi.date().required(),
    effectiveTo: Joi.date().allow(null).greater(Joi.ref('effectiveFrom'))
  });

  /**
   * Get all templates for organization
   */
  async getTemplates(organizationId, filters = {}) {
    try {
      const { status, layoutType, isDefault } = filters;
      
      let whereClauses = ['pt.organization_id = $1', 'pt.deleted_at IS NULL'];
      let params = [organizationId];
      let paramIndex = 2;

      if (status) {
        whereClauses.push(`pt.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (layoutType) {
        whereClauses.push(`pt.layout_type = $${paramIndex}`);
        params.push(layoutType);
        paramIndex++;
      }

      if (isDefault !== undefined) {
        whereClauses.push(`pt.is_default = $${paramIndex}`);
        params.push(isDefault);
        paramIndex++;
      }

      const result = await query(
        `SELECT 
          pt.*,
          COUNT(DISTINCT pta.id) as assignment_count
         FROM payroll.payslip_template pt
         LEFT JOIN payroll.payslip_template_assignment pta 
           ON pta.template_id = pt.id AND pta.deleted_at IS NULL
         WHERE ${whereClauses.join(' AND ')}
         GROUP BY pt.id
         ORDER BY pt.is_default DESC, pt.created_at DESC`,
        params
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching payslip templates', { error: error.message, organizationId });
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId, organizationId) {
    try {
      const result = await query(
        `SELECT pt.*
         FROM payroll.payslip_template pt
         WHERE pt.id = $1 AND pt.organization_id = $2 AND pt.deleted_at IS NULL`,
        [templateId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Template not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching template by ID', { error: error.message, templateId, organizationId });
      throw error;
    }
  }

  /**
   * Create new template
   */
  async createTemplate(templateData, organizationId, userId) {
    try {
      const { error, value } = this.templateSchema.validate(templateData);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Check if template code already exists
      const existing = await query(
        `SELECT id FROM payroll.payslip_template 
         WHERE organization_id = $1 AND template_code = $2 AND deleted_at IS NULL`,
        [organizationId, value.templateCode]
      );

      if (existing.rows.length > 0) {
        throw new ValidationError('Template code already exists');
      }

      // If setting as default, unset current default
      if (value.isDefault) {
        await query(
          `UPDATE payroll.payslip_template 
           SET is_default = false, updated_at = NOW() 
           WHERE organization_id = $1 AND is_default = true`,
          [organizationId]
        );
      }

      const result = await query(
        `INSERT INTO payroll.payslip_template (
          organization_id, template_name, template_code, description,
          layout_type, show_company_logo, company_logo_url, header_text, header_color,
          show_employee_info, show_payment_details, show_earnings_section,
          show_deductions_section, show_taxes_section, show_leave_balances,
          show_ytd_totals, show_qr_code, custom_sections, field_configuration,
          font_family, font_size, primary_color, secondary_color,
          footer_text, show_confidentiality_notice, confidentiality_text,
          page_size, page_orientation, language, currency_display_format,
          date_format, display_rules, status, is_default, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33, $34, $35
        ) RETURNING *`,
        [
          organizationId,
          value.templateName,
          value.templateCode,
          value.description,
          value.layoutType,
          value.showCompanyLogo,
          value.companyLogoUrl,
          value.headerText,
          value.headerColor,
          value.showEmployeeInfo,
          value.showPaymentDetails,
          value.showEarningsSection,
          value.showDeductionsSection,
          value.showTaxesSection,
          value.showLeaveBalances,
          value.showYtdTotals,
          value.showQrCode,
          value.customSections ? JSON.stringify(value.customSections) : null,
          value.fieldConfiguration ? JSON.stringify(value.fieldConfiguration) : null,
          value.fontFamily,
          value.fontSize,
          value.primaryColor,
          value.secondaryColor,
          value.footerText,
          value.showConfidentialityNotice,
          value.confidentialityText,
          value.pageSize,
          value.pageOrientation,
          value.language,
          value.currencyDisplayFormat,
          value.dateFormat,
          value.displayRules ? JSON.stringify(value.displayRules) : null,
          'draft',
          value.isDefault || false,
          userId
        ]
      );

      logger.info('Created payslip template', { templateId: result.rows[0].id, organizationId, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating template', { error: error.message, organizationId, userId });
      throw error;
    }
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, updates, organizationId, userId) {
    try {
      const template = await this.getTemplateById(templateId, organizationId);

      // Validate updates
      const { error, value } = this.templateSchema.validate({ ...template, ...updates }, { allowUnknown: true });
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // If changing code, check uniqueness
      if (updates.templateCode && updates.templateCode !== template.template_code) {
        const existing = await query(
          `SELECT id FROM payroll.payslip_template 
           WHERE organization_id = $1 AND template_code = $2 AND id != $3 AND deleted_at IS NULL`,
          [organizationId, updates.templateCode, templateId]
        );

        if (existing.rows.length > 0) {
          throw new ValidationError('Template code already exists');
        }
      }

      // If setting as default, unset current default
      if (updates.isDefault === true && !template.is_default) {
        await query(
          `UPDATE payroll.payslip_template 
           SET is_default = false, updated_at = NOW() 
           WHERE organization_id = $1 AND is_default = true AND id != $2`,
          [organizationId, templateId]
        );
      }

      const setClauses = [];
      const params = [];
      let paramIndex = 1;

      const updateableFields = {
        templateName: 'template_name',
        templateCode: 'template_code',
        description: 'description',
        layoutType: 'layout_type',
        showCompanyLogo: 'show_company_logo',
        companyLogoUrl: 'company_logo_url',
        headerText: 'header_text',
        headerColor: 'header_color',
        showEmployeeInfo: 'show_employee_info',
        showPaymentDetails: 'show_payment_details',
        showEarningsSection: 'show_earnings_section',
        showDeductionsSection: 'show_deductions_section',
        showTaxesSection: 'show_taxes_section',
        showLeaveBalances: 'show_leave_balances',
        showYtdTotals: 'show_ytd_totals',
        showQrCode: 'show_qr_code',
        customSections: 'custom_sections',
        fieldConfiguration: 'field_configuration',
        fontFamily: 'font_family',
        fontSize: 'font_size',
        primaryColor: 'primary_color',
        secondaryColor: 'secondary_color',
        footerText: 'footer_text',
        showConfidentialityNotice: 'show_confidentiality_notice',
        confidentialityText: 'confidentiality_text',
        pageSize: 'page_size',
        pageOrientation: 'page_orientation',
        language: 'language',
        currencyDisplayFormat: 'currency_display_format',
        dateFormat: 'date_format',
        displayRules: 'display_rules',
        status: 'status',
        isDefault: 'is_default'
      };

      for (const [camelKey, snakeKey] of Object.entries(updateableFields)) {
        if (updates[camelKey] !== undefined) {
          let valueToSet = updates[camelKey];
          
          // Handle JSONB fields
          if (['customSections', 'fieldConfiguration', 'displayRules'].includes(camelKey) && valueToSet !== null) {
            valueToSet = JSON.stringify(valueToSet);
          }
          
          setClauses.push(`${snakeKey} = $${paramIndex}`);
          params.push(valueToSet);
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        return template;
      }

      setClauses.push(`updated_at = NOW()`);
      setClauses.push(`updated_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;

      params.push(templateId);
      params.push(organizationId);

      const result = await query(
        `UPDATE payroll.payslip_template 
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex - 1} AND organization_id = $${paramIndex} AND deleted_at IS NULL
         RETURNING *`,
        params
      );

      logger.info('Updated payslip template', { templateId, organizationId, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating template', { error: error.message, templateId, organizationId });
      throw error;
    }
  }

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(templateId, organizationId, userId) {
    try {
      const template = await this.getTemplateById(templateId, organizationId);

      // Check if template is in use
      const inUse = await query(
        `SELECT COUNT(*) as count FROM payroll.paycheck 
         WHERE payslip_template_id = $1`,
        [templateId]
      );

      if (parseInt(inUse.rows[0].count) > 0) {
        throw new ValidationError('Cannot delete template that has been used in paychecks. Consider archiving instead.');
      }

      await query(
        `UPDATE payroll.payslip_template 
         SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
         WHERE id = $2 AND organization_id = $3`,
        [userId, templateId, organizationId]
      );

      logger.info('Deleted payslip template', { templateId, organizationId, userId });
      return { success: true };
    } catch (error) {
      logger.error('Error deleting template', { error: error.message, templateId, organizationId });
      throw error;
    }
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(templateId, organizationId, userId) {
    try {
      const template = await this.getTemplateById(templateId, organizationId);

      // Create new template with copied settings
      const newTemplate = {
        ...template,
        templateName: `${template.template_name} (Copy)`,
        templateCode: `${template.template_code}_copy_${Date.now()}`,
        isDefault: false,
        status: 'draft'
      };

      delete newTemplate.id;
      delete newTemplate.created_at;
      delete newTemplate.updated_at;
      delete newTemplate.created_by;
      delete newTemplate.updated_by;
      delete newTemplate.assignment_count;

      return await this.createTemplate(newTemplate, organizationId, userId);
    } catch (error) {
      logger.error('Error duplicating template', { error: error.message, templateId, organizationId });
      throw error;
    }
  }

  /**
   * Activate template
   */
  async activateTemplate(templateId, organizationId, userId) {
    try {
      return await this.updateTemplate(templateId, { status: 'active' }, organizationId, userId);
    } catch (error) {
      logger.error('Error activating template', { error: error.message, templateId, organizationId });
      throw error;
    }
  }

  /**
   * Archive template
   */
  async archiveTemplate(templateId, organizationId, userId) {
    try {
      return await this.updateTemplate(templateId, { status: 'archived' }, organizationId, userId);
    } catch (error) {
      logger.error('Error archiving template', { error: error.message, templateId, organizationId });
      throw error;
    }
  }

  /**
   * Get template assignments
   */
  async getTemplateAssignments(templateId, organizationId) {
    try {
      const result = await query(
        `SELECT 
          pta.*,
          wt.type_name as worker_type_name,
          e.first_name || ' ' || e.last_name as employee_name,
          pst.template_name as pay_structure_name
         FROM payroll.payslip_template_assignment pta
         LEFT JOIN payroll.worker_type wt ON wt.id = pta.worker_type_id
         LEFT JOIN hris.employee e ON e.id = pta.employee_id
         LEFT JOIN payroll.pay_structure_template pst ON pst.id = pta.pay_structure_template_id
         WHERE pta.template_id = $1 
           AND pta.organization_id = $2 
           AND pta.deleted_at IS NULL
         ORDER BY pta.priority DESC, pta.created_at DESC`,
        [templateId, organizationId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching template assignments', { error: error.message, templateId, organizationId });
      throw error;
    }
  }

  /**
   * Create assignment
   */
  async createAssignment(assignmentData, organizationId, userId) {
    try {
      const { error, value } = this.assignmentSchema.validate(assignmentData);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Verify template exists
      await this.getTemplateById(value.templateId, organizationId);

      const result = await query(
        `INSERT INTO payroll.payslip_template_assignment (
          organization_id, template_id, assignment_type,
          worker_type_id, department_id, employee_id, pay_structure_template_id,
          priority, effective_from, effective_to, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          organizationId,
          value.templateId,
          value.assignmentType,
          value.workerTypeId,
          value.departmentId,
          value.employeeId,
          value.payStructureTemplateId,
          value.priority,
          value.effectiveFrom,
          value.effectiveTo,
          userId
        ]
      );

      logger.info('Created template assignment', { assignmentId: result.rows[0].id, templateId: value.templateId, organizationId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating assignment', { error: error.message, organizationId });
      throw error;
    }
  }

  /**
   * Update assignment
   */
  async updateAssignment(assignmentId, updates, organizationId, userId) {
    try {
      const setClauses = [];
      const params = [];
      let paramIndex = 1;

      const updateableFields = ['priority', 'effectiveFrom', 'effectiveTo'];
      const dbFields = ['priority', 'effective_from', 'effective_to'];

      updateableFields.forEach((field, index) => {
        if (updates[field] !== undefined) {
          setClauses.push(`${dbFields[index]} = $${paramIndex}`);
          params.push(updates[field]);
          paramIndex++;
        }
      });

      if (setClauses.length === 0) {
        throw new ValidationError('No fields to update');
      }

      setClauses.push(`updated_at = NOW()`);
      setClauses.push(`updated_by = $${paramIndex}`);
      params.push(userId);
      paramIndex++;

      params.push(assignmentId);
      params.push(organizationId);

      const result = await query(
        `UPDATE payroll.payslip_template_assignment 
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex - 1} AND organization_id = $${paramIndex} AND deleted_at IS NULL
         RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Assignment not found');
      }

      logger.info('Updated template assignment', { assignmentId, organizationId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating assignment', { error: error.message, assignmentId, organizationId });
      throw error;
    }
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(assignmentId, organizationId, userId) {
    try {
      await query(
        `UPDATE payroll.payslip_template_assignment 
         SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
         WHERE id = $2 AND organization_id = $3`,
        [userId, assignmentId, organizationId]
      );

      logger.info('Deleted template assignment', { assignmentId, organizationId });
      return { success: true };
    } catch (error) {
      logger.error('Error deleting assignment', { error: error.message, assignmentId, organizationId });
      throw error;
    }
  }
}

export default PayslipTemplateService;
