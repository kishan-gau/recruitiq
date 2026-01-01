/**
 * Payslip PDF Generation Service
 * 
 * Generates PDF payslips using customizable templates.
 * Supports multiple template designs per organization.
 * 
 * @module products/paylinq/services/payslipPdfService
 */

import PDFDocument from 'pdfkit';
import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

class PayslipPdfService {
  /**
   * Constructor with dependency injection
   * @param {Function} queryFn - Database query function
   * @param {Object} loggerInstance - Logger instance
   */
  constructor(queryFn = null, loggerInstance = null) {
    this.query = queryFn || query;
    this.logger = loggerInstance || logger;
  }

  /**
   * Get the appropriate template for a paycheck
   */
  async getTemplateForPaycheck(paycheckId, organizationId) {
    try {
      // Get paycheck details with employee info
      const paycheckResult = await this.query(
        `SELECT 
          pc.*,
          e.id as employee_id,
          e.employee_number,
          e.first_name,
          e.last_name,
          e.email,
          wps.template_version_id as pay_structure_template_version_id,
          e.worker_type_id
         FROM payroll.paycheck pc
         INNER JOIN hris.employee e ON e.id = pc.employee_id
         LEFT JOIN payroll.worker_pay_structure wps ON wps.employee_id = e.id AND wps.is_current = true
         WHERE pc.id = $1 AND pc.organization_id = $2`,
        [paycheckId, organizationId],
        organizationId,
        { operation: 'SELECT', table: 'payroll.paycheck' }
      );

      if (paycheckResult.rows.length === 0) {
        throw new Error('Paycheck not found');
      }

      const paycheck = paycheckResult.rows[0];

      // Find the best matching template based on priority:
      // 1. Employee-specific assignment
      // 2. Pay structure template assignment
      // 3. Worker type assignment
      // 4. Department assignment
      // 5. Organization default template
      const templateResult = await this.query(
        `SELECT 
          pt.*,
          pta.priority,
          pta.assignment_type
         FROM payroll.payslip_template pt
         LEFT JOIN payroll.payslip_template_assignment pta ON pta.template_id = pt.id
           AND pta.organization_id = pt.organization_id
           AND pta.deleted_at IS NULL
           AND (pta.effective_to IS NULL OR pta.effective_to >= CURRENT_DATE)
           AND pta.effective_from <= CURRENT_DATE
         WHERE pt.organization_id = $1
           AND pt.status = 'active'
           AND pt.deleted_at IS NULL
           AND (
             -- Employee-specific
             (pta.assignment_type = 'employee' AND pta.employee_id = $2)
             -- Pay structure
             OR (pta.assignment_type = 'pay_structure' AND pta.pay_structure_template_id = $3)
             -- Worker type (references hris.worker_type directly)
             OR (pta.assignment_type = 'worker_type' AND pta.worker_type_id = $4)
             -- Organization default
             OR (pta.assignment_type = 'organization')
             -- Template marked as default
             OR (pt.is_default = true AND pta.id IS NULL)
           )
         ORDER BY 
           CASE 
             WHEN pta.assignment_type = 'employee' THEN 1
             WHEN pta.assignment_type = 'pay_structure' THEN 2
             WHEN pta.assignment_type = 'worker_type' THEN 3
             WHEN pta.assignment_type = 'department' THEN 4
             WHEN pta.assignment_type = 'organization' THEN 5
             WHEN pt.is_default = true THEN 6
             ELSE 7
           END,
           pta.priority DESC NULLS LAST,
           pt.created_at DESC
         LIMIT 1`,
        [
          organizationId,
          paycheck.employee_id,
          paycheck.pay_structure_template_version_id,
          paycheck.worker_type_id
        ],
        organizationId,
        { operation: 'SELECT', table: 'payroll.payslip_template' }
      );

      if (templateResult.rows.length === 0) {
        // Return default template configuration if none found
        return this.getDefaultTemplate(organizationId);
      }

      return templateResult.rows[0];
    } catch (error) {
      this.logger.error('Error getting payslip template', { error: error.message, paycheckId, organizationId });
      throw error;
    }
  }

  /**
   * Get default template configuration
   */
  getDefaultTemplate(organizationId) {
    return {
      id: null,
      organization_id: organizationId,
      template_name: 'Default Template',
      template_code: 'default',
      layout_type: 'standard',
      show_company_logo: false,
      header_color: '#10b981',
      show_employee_info: true,
      show_payment_details: true,
      show_earnings_section: true,
      show_deductions_section: true,
      show_taxes_section: true,
      show_leave_balances: false,
      show_ytd_totals: true,
      show_qr_code: false,
      font_family: 'Helvetica',
      font_size: 10,
      primary_color: '#10b981',
      secondary_color: '#6b7280',
      footer_text: null,
      show_confidentiality_notice: true,
      page_size: 'A4',
      page_orientation: 'portrait',
      currency_display_format: 'SRD #,##0.00',
      date_format: 'MMM dd, yyyy'
    };
  }

  /**
   * Generate PDF for a paycheck
   */
  async generatePayslipPdf(paycheckId, organizationId) {
    try {
      // Get template
      const template = await this.getTemplateForPaycheck(paycheckId, organizationId);

      // Get full paycheck data with components
      const paycheckData = await this.getPaycheckData(paycheckId, organizationId);

      // Generate PDF using template
      const pdfBuffer = await this.createPdf(paycheckData, template);

      // Store template snapshot in paycheck record
      await this.query(
        `UPDATE payroll.paycheck 
         SET payslip_template_id = $1,
             payslip_template_snapshot = $2,
             updated_at = NOW()
         WHERE id = $3 AND organization_id = $4`,
        [template.id, JSON.stringify(template), paycheckId, organizationId]
      );

      return pdfBuffer;
    } catch (error) {
      this.logger.error('Error generating payslip PDF', { error: error.message, paycheckId, organizationId });
      throw error;
    }
  }

  /**
   * Get complete paycheck data including components
   */
  async getPaycheckData(paycheckId, organizationId) {
    // Get paycheck
    const paycheckResult = await this.query(
      `SELECT 
        pc.*,
        e.employee_number,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        pr.run_number,
        pr.run_name,
        pr.run_type
       FROM payroll.paycheck pc
       INNER JOIN hris.employee e ON e.id = pc.employee_id
       INNER JOIN payroll.payroll_run pr ON pr.id = pc.payroll_run_id
       WHERE pc.id = $1 AND pc.organization_id = $2`,
      [paycheckId, organizationId]
    );

    if (paycheckResult.rows.length === 0) {
      throw new Error('Paycheck not found');
    }

    const paycheck = paycheckResult.rows[0];

    // Get component breakdown
    this.logger.debug('Fetching components', { paycheckId, organizationId });
    const componentsResult = await this.query(
      `SELECT 
        component_type,
        component_code,
        component_name,
        units,
        rate,
        amount,
        is_taxable,
        tax_category
       FROM payroll.payroll_run_component
       WHERE paycheck_id = $1 AND organization_id = $2
       ORDER BY 
         CASE component_type
           WHEN 'earning' THEN 1
           WHEN 'tax' THEN 2
           WHEN 'deduction' THEN 3
         END,
         component_name`,
      [paycheckId, organizationId]
    );
    
    this.logger.debug('Components fetched', { count: componentsResult.rows.length, components: componentsResult.rows });

    // Get organization details
    const orgResult = await this.query(
      `SELECT name, logo_url, address, phone, email, website
       FROM organizations
       WHERE id = $1`,
      [organizationId]
    );

    return {
      paycheck,
      components: componentsResult.rows,
      organization: orgResult.rows[0] || {}
    };
  }

  /**
   * Create PDF document
   */
  async createPdf(data, template) {
    return new Promise((resolve, reject) => {
      try {
        const { paycheck, components, organization } = data;
        
        this.logger.debug('Creating PDF', { 
          paycheckId: paycheck.id, 
          templateType: template.layout_type,
          componentsCount: components?.length || 0
        });
        
        // Create PDF document
        const doc = new PDFDocument({
          size: template.page_size || 'A4',
          layout: template.page_orientation || 'portrait',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        // Collect PDF data
        const chunks = [];
        doc.on('data', chunk => {
          chunks.push(chunk);
          this.logger.debug('PDF chunk received', { size: chunk.length });
        });
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          this.logger.info('PDF generation complete', { bufferSize: buffer.length });
          resolve(buffer);
        });
        doc.on('error', (err) => {
          this.logger.error('PDF generation error', { error: err.message });
          reject(err);
        });

        // Render PDF based on layout type
        switch (template.layout_type) {
          case 'compact':
            this.renderCompactLayout(doc, data, template);
            break;
          case 'detailed':
            this.renderDetailedLayout(doc, data, template);
            break;
          case 'custom':
            this.renderCustomLayout(doc, data, template);
            break;
          default:
            this.renderStandardLayout(doc, data, template);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Render standard layout - Table format inspired by Namidi payslip structure
   */
  renderStandardLayout(doc, data, template) {
    const { paycheck, components, organization } = data;
    const primaryColor = template.primary_color || '#10b981';
    
    // Page dimensions
    const leftMargin = 50;
    const rightMargin = 545;
    const contentWidth = rightMargin - leftMargin;
    
    // Column positions for table (adjusted for better spacing)
    const col1X = leftMargin + 10;        // Component name
    const col2X = leftMargin + 250;       // Earnings 
    const col3X = leftMargin + 355;       // Deductions
    const col4X = leftMargin + 420;       // Net (within rightMargin - 125)

    // Header
    this.renderHeader(doc, organization, template);

    // Title
    doc.fontSize(26)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('PAYSLIP', leftMargin, 110, { width: contentWidth, align: 'center' });

    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#64748b')
       .text(paycheck.run_name || `Payroll ${this.formatDate(paycheck.pay_period_start, 'MMM YYYY')}`, 
             leftMargin, 142, { width: contentWidth, align: 'center' });

    doc.y = 170;

    // Employee Information - Clean grid
    if (template.show_employee_info !== false) {
      const infoY = doc.y;
      const labelWidth = 80;
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#64748b');
      
      doc.text('Name:', col1X, infoY, { width: labelWidth });
      doc.text('Employee #:', col1X, infoY + 16, { width: labelWidth });
      
      doc.text('Pay Period:', col2X, infoY, { width: labelWidth });
      doc.text('Payment Date:', col2X, infoY + 16, { width: labelWidth });
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#0f172a');
      
      doc.text(`${paycheck.first_name} ${paycheck.last_name}`, col1X + labelWidth, infoY);
      doc.text(paycheck.employee_number, col1X + labelWidth, infoY + 16);
      
      doc.font('Helvetica')
         .text(`${this.formatDate(paycheck.pay_period_start)} - ${this.formatDate(paycheck.pay_period_end)}`, 
               col2X + labelWidth, infoY);
      doc.text(this.formatDate(paycheck.payment_date), col2X + labelWidth, infoY + 16);
      
      doc.y = infoY + 42;
    }

    // Main table separator
    doc.moveDown(1);
    doc.moveTo(leftMargin, doc.y)
       .lineTo(rightMargin, doc.y)
       .strokeColor('#334155')
       .lineWidth(2)
       .stroke();
    
    doc.moveDown(0.5);

    // TABLE HEADER
    const headerY = doc.y;
    doc.rect(leftMargin, headerY, contentWidth, 28)
       .fillAndStroke('#f8fafc', '#e2e8f0');
    
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#475569');
    
    doc.text('Component', col1X, headerY + 10);
    doc.text('Earnings', col2X - 10, headerY + 10, { width: 90, align: 'right' });
    doc.text('Deductions', col3X - 10, headerY + 10, { width: 90, align: 'right' });
    doc.text('Net', col4X - 10, headerY + 10, { width: 80, align: 'right' });
    
    doc.y = headerY + 28;

    // Calculate totals
    const earnings = components.filter(c => c.component_type === 'earning');
    const taxes = components.filter(c => c.component_type === 'tax');
    const deductions = components.filter(c => c.component_type === 'deduction');
    const totalTaxes = taxes.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalDeductions = deductions.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

    let currentY = doc.y + 8;
    const rowHeight = 20;

    // EARNINGS ROWS
    if (earnings.length > 0) {
      earnings.forEach((e, index) => {
        // Alternating row background
        if (index % 2 === 0) {
          doc.rect(leftMargin, currentY - 2, contentWidth, rowHeight)
             .fillOpacity(0.3)
             .fill('#f8fafc')
             .fillOpacity(1);
        }
        
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#0f172a')
           .text(e.component_name, col1X, currentY);
        
        doc.fillColor('#059669')
           .text(this.formatCurrency(e.amount), col2X - 10, currentY, { width: 90, align: 'right' });
        
        currentY += rowHeight;
      });
    }

    // DEDUCTIONS & TAXES ROWS
    const allDeductions = [...taxes, ...deductions];
    if (allDeductions.length > 0) {
      allDeductions.forEach((d, index) => {
        // Alternating row background
        const rowIndex = earnings.length + index;
        if (rowIndex % 2 === 0) {
          doc.rect(leftMargin, currentY - 2, contentWidth, rowHeight)
             .fillOpacity(0.3)
             .fill('#f8fafc')
             .fillOpacity(1);
        }
        
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#0f172a')
           .text(d.component_name, col1X, currentY);
        
        doc.fillColor('#dc2626')
           .text(this.formatCurrency(d.amount), col3X - 10, currentY, { width: 90, align: 'right' });
        
        currentY += rowHeight;
      });
    }

    // SUBTOTAL LINE
    currentY += 8;
    doc.moveTo(leftMargin, currentY)
       .lineTo(rightMargin, currentY)
       .strokeColor('#94a3b8')
       .lineWidth(1.5)
       .stroke();
    
    currentY += 12;
    
    // SUBTOTAL ROW
    doc.rect(leftMargin, currentY - 3, contentWidth, 24)
       .fillOpacity(0.5)
       .fill('#f1f5f9')
       .fillOpacity(1);
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#0f172a')
       .text('SUBTOTAL', col1X, currentY);
    
    doc.fillColor('#059669')
       .text(this.formatCurrency(paycheck.gross_pay), col2X, currentY, 
             { width: 80, align: 'right' });
    
    doc.fillColor('#dc2626')
       .text(this.formatCurrency(totalTaxes + totalDeductions), col3X, currentY, 
             { width: 80, align: 'right' });
    
    doc.fillColor('#0f172a')
       .text(this.formatCurrency(paycheck.net_pay), col4X, currentY, 
             { width: 70, align: 'right' });
    
    currentY += 32;

    // FINAL TOTAL SECTION
    doc.moveTo(leftMargin, currentY)
       .lineTo(rightMargin, currentY)
       .strokeColor('#475569')
       .lineWidth(2)
       .stroke();
    
    currentY += 12;
    
    const totalBoxY = currentY;
    doc.rect(leftMargin, totalBoxY, contentWidth, 50)
       .fillAndStroke(primaryColor, primaryColor);
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text('NET PAY', col1X + 10, totalBoxY + 16);
    
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .fillColor('#ffffff')
       .text(this.formatCurrency(paycheck.net_pay), leftMargin + 10, totalBoxY + 16, 
             { width: contentWidth - 20, align: 'right' });

    // Footer
    if (template.show_confidentiality_notice !== false) {
      doc.y = totalBoxY + 60;
      this.renderFooter(doc, template);
    }
  }

  /**
   * Render compact layout (simplified for space efficiency)
   */
  renderCompactLayout(doc, data, template) {
    const { paycheck, components, organization } = data;
    
    // Compact header
    doc.fontSize(16).fillColor(template.primary_color || '#10b981')
       .text('PAYSLIP', 50, 50, { align: 'center' });
    
    doc.fontSize(9).fillColor('#333')
       .text(`${paycheck.first_name} ${paycheck.last_name} | ${paycheck.employee_number}`, { align: 'center' })
       .text(`Pay Period: ${this.formatDate(paycheck.pay_period_start)} - ${this.formatDate(paycheck.pay_period_end)}`, { align: 'center' });

    doc.moveDown(1);

    // Compact table format
    let y = doc.y;
    const lineHeight = 15;

    // Earnings
    doc.fontSize(9).fillColor('#666').text('EARNINGS', 50, y);
    y += lineHeight;
    
    const earnings = components.filter(c => c.component_type === 'earning');
    earnings.forEach(e => {
      doc.fontSize(8).fillColor('#333').text(e.component_name, 60, y);
      doc.text(this.formatCurrency(e.amount), 400, y, { align: 'right', width: 150 });
      y += lineHeight;
    });

    doc.fontSize(9).font('Helvetica-Bold').text('Gross Pay', 60, y);
    doc.text(this.formatCurrency(paycheck.gross_pay), 400, y, { align: 'right', width: 150 });
    y += lineHeight * 1.5;

    // Deductions
    doc.fontSize(9).font('Helvetica').fillColor('#666').text('DEDUCTIONS', 50, y);
    y += lineHeight;

    const deductions = components.filter(c => c.component_type !== 'earning');
    deductions.forEach(d => {
      doc.fontSize(8).fillColor('#333').text(d.component_name, 60, y);
      doc.text(this.formatCurrency(d.amount), 400, y, { align: 'right', width: 150 });
      y += lineHeight;
    });

    y += lineHeight * 0.5;

    // Net Pay
    doc.fontSize(12).font('Helvetica-Bold').fillColor(template.primary_color || '#10b981')
       .text('NET PAY', 50, y);
    doc.text(this.formatCurrency(paycheck.net_pay), 400, y, { align: 'right', width: 150 });
  }

  /**
   * Render detailed layout (with extra information)
   */
  renderDetailedLayout(doc, data, template) {
    // Start with standard layout
    this.renderStandardLayout(doc, data, template);

    // Add YTD totals if enabled
    if (template.show_ytd_totals !== false) {
      doc.addPage();
      doc.fontSize(14).fillColor(template.primary_color || '#10b981')
         .text('Year-to-Date Summary', 50, 50);
      doc.moveDown(1);
      // YTD data would be calculated and displayed here
      doc.fontSize(10).fillColor('#666')
         .text('YTD totals will be available in the next release', 50, doc.y);
    }
  }

  /**
   * Render custom layout (uses custom_sections from template)
   */
  renderCustomLayout(doc, data, template) {
    // Render standard as base, then add custom sections
    this.renderStandardLayout(doc, data, template);

    if (template.custom_sections && Array.isArray(template.custom_sections)) {
      template.custom_sections
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .forEach(section => {
          doc.moveDown(1);
          doc.fontSize(12).fillColor(template.primary_color || '#10b981')
             .text(section.title || 'Custom Section', 50, doc.y);
          doc.fontSize(10).fillColor('#333')
             .text(section.content || '', 50, doc.y + 5);
        });
    }
  }

  /**
   * Helper: Render header
   */
  renderHeader(doc, organization, template) {
    if (template.show_company_logo && organization.logo_url) {
      // Logo would be rendered here if we have the file
      // doc.image(logoPath, 50, 30, { width: 100 });
    }

    doc.fontSize(12)
       .fillColor('#333')
       .text(organization.name || 'Company Name', 50, 40);

    if (organization.address || organization.phone) {
      doc.fontSize(8)
         .fillColor('#666')
         .text([organization.address, organization.phone].filter(Boolean).join(' | '), 50, 60);
    }

    // Draw line
    doc.moveTo(50, 90)
       .lineTo(doc.page.width - 50, 90)
       .strokeColor('#e5e7eb')
       .stroke();
  }

  /**
   * Helper: Render section
   */
  renderSection(doc, title, items, template) {
    const startY = doc.y;

    doc.fontSize(11)
       .fillColor(template.primary_color || '#10b981')
       .text(title.toUpperCase(), 50, startY);

    doc.moveDown(0.5);

    let y = doc.y;
    const lineHeight = 20;

    items.forEach(item => {
      const font = item.isTotal ? 'Helvetica-Bold' : 'Helvetica';
      const fontSize = item.isTotal ? 11 : 9;

      doc.font(font).fontSize(fontSize).fillColor('#333');
      doc.text(item.label, 60, y);
      
      if (item.details) {
        doc.fontSize(8).fillColor('#666').text(item.details, 250, y);
      }
      
      doc.font(font).fontSize(fontSize).fillColor('#333');
      doc.text(item.value, 400, y, { align: 'right', width: 150 });

      y += lineHeight;
    });

    doc.moveDown(1);
  }

  /**
   * Helper: Render net pay
   */
  renderNetPay(doc, netPay, template) {
    const y = doc.y;
    
    // Draw border
    doc.rect(50, y, doc.page.width - 100, 40)
       .fillAndStroke(template.primary_color || '#10b981', template.primary_color || '#10b981')
       .fillOpacity(0.1);

    doc.fillOpacity(1)
       .fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(template.primary_color || '#10b981')
       .text('NET PAY', 60, y + 12);

    doc.text(this.formatCurrency(netPay), 400, y + 12, { align: 'right', width: 140 });

    doc.moveDown(2);
  }

  /**
   * Helper: Render footer
   */
  renderFooter(doc, template) {
    const footerY = doc.page.height - 80;

    doc.fontSize(8)
       .fillColor('#666')
       .text(
         template.confidentiality_text || 
         'This payslip is confidential. Please keep it secure and do not share with unauthorized persons.',
         50,
         footerY,
         { align: 'center', width: doc.page.width - 100 }
       );

    if (template.footer_text) {
      doc.fontSize(7)
         .text(template.footer_text, 50, footerY + 20, { align: 'center', width: doc.page.width - 100 });
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-SR', {
      style: 'currency',
      currency: 'SRD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  /**
   * Format date for display
   */
  formatDate(date, format = 'default') {
    if (!date) return 'N/A';
    const d = new Date(date);
    
    if (format === 'MMM YYYY') {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      });
    }
    
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

// Export class for dependency injection and testing
export default PayslipPdfService;
