/**
 * PayslipPdfService Test Suite
 * 
 * Tests for PayLinQ payslip PDF generation service following TESTING_STANDARDS.md:
 * - ES modules with @jest/globals
 * - Focus on testable business logic
 * 
 * NOTE: Service currently exports singleton instance. For better testability,
 * should be refactored to export class with DI pattern.
 * 
 * VERIFIED METHODS (from grep analysis):
 * 1. getTemplateForPaycheck(paycheckId, organizationId)
 * 2. generatePayslipPdf(paycheckId, organizationId)
 * 3. getPaycheckData(paycheckId, organizationId)
 * 4. createPdf(data, template)
 * 5. getDefaultTemplate() - Helper
 * 6. formatCurrency(amount) - Helper
 * 7. formatDate(date, format) - Helper
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import PayslipPdfService from '../../../../src/products/paylinq/services/payslipPdfService.js';

describe('PayslipPdfService', () => {
  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testPaycheckId = '223e4567-e89b-12d3-a456-426614174001';

  // NOTE: Service is a singleton, so we test it directly
  // For better testability, service should be refactored to export class

  // ==================== Helper Methods (Pure Logic - Fully Testable) ====================

  describe('formatCurrency', () => {
    it('should format positive amount with SRD currency', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(1234.56);

      // Assert
      expect(result).toContain('1,234.56');
      expect(result).toContain('SRD');
    });

    it('should format zero amount', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(0);

      // Assert
      expect(result).toContain('0.00');
    });

    it('should format negative amount', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(-500.25);

      // Assert
      expect(result).toContain('500.25');
      expect(result).toContain('-'); // Should show negative sign
    });

    it('should handle null amount as zero', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(null as any);

      // Assert
      expect(result).toContain('0.00');
    });

    it('should handle undefined amount as zero', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(undefined as any);

      // Assert
      expect(result).toContain('0.00');
    });

    it('should format large amounts with proper thousands separators', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(1234567.89);

      // Assert
      expect(result).toContain('1,234,567.89');
    });

    it('should always show two decimal places', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(100);

      // Assert
      expect(result).toContain('100.00');
    });

    it('should round to two decimal places', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(123.456);

      // Assert
      expect(result).toContain('123.46'); // Rounded up
    });
  });

  describe('formatDate', () => {
    it('should format date with default format', () => {
      // Arrange
      const date = new Date('2025-01-15T12:00:00Z');

      // Act
      const result = PayslipPdfService.formatDate(date);

      // Assert
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2025');
    });

    it('should format date with MMM YYYY format', () => {
      // Arrange
      const date = new Date('2025-01-15T12:00:00Z');

      // Act
      const result = PayslipPdfService.formatDate(date, 'MMM YYYY');

      // Assert
      expect(result).toContain('Jan');
      expect(result).toContain('2025');
      expect(result).not.toContain('15'); // Day not included in this format
    });

    it('should return N/A for null date', () => {
      // Act
      const result = PayslipPdfService.formatDate(null);

      // Assert
      expect(result).toBe('N/A');
    });

    it('should return N/A for undefined date', () => {
      // Act
      const result = PayslipPdfService.formatDate(undefined as any);

      // Assert
      expect(result).toBe('N/A');
    });

    it('should handle string date input', () => {
      // Arrange
      const dateString = '2025-06-30';

      // Act
      const result = PayslipPdfService.formatDate(dateString as any);

      // Assert
      expect(result).toContain('Jun');
      expect(result).toContain('30');
      expect(result).toContain('2025');
    });

    it('should format different months correctly', () => {
      // Arrange
      const dates = [
        { date: new Date('2025-01-01'), month: 'Jan' },
        { date: new Date('2025-02-01'), month: 'Feb' },
        { date: new Date('2025-03-01'), month: 'Mar' },
        { date: new Date('2025-04-01'), month: 'Apr' },
        { date: new Date('2025-05-01'), month: 'May' },
        { date: new Date('2025-06-01'), month: 'Jun' },
        { date: new Date('2025-07-01'), month: 'Jul' },
        { date: new Date('2025-08-01'), month: 'Aug' },
        { date: new Date('2025-09-01'), month: 'Sep' },
        { date: new Date('2025-10-01'), month: 'Oct' },
        { date: new Date('2025-11-01'), month: 'Nov' },
        { date: new Date('2025-12-01'), month: 'Dec' }
      ];

      // Act & Assert
      dates.forEach(({ date, month }) => {
        const result = PayslipPdfService.formatDate(date);
        expect(result).toContain(month);
      });
    });

    it('should format year-end date correctly', () => {
      // Arrange
      const date = new Date('2025-12-31T23:59:59Z');

      // Act
      const result = PayslipPdfService.formatDate(date);

      // Assert
      expect(result).toContain('Dec');
      expect(result).toContain('31');
      expect(result).toContain('2025');
    });

    it('should format year-start date correctly', () => {
      // Arrange
      const date = new Date('2025-01-01T00:00:00Z');

      // Act
      const result = PayslipPdfService.formatDate(date);

      // Assert
      expect(result).toContain('Jan');
      expect(result).toContain('1');
      expect(result).toContain('2025');
    });

    it('should handle leap year date', () => {
      // Arrange
      const date = new Date('2024-02-29T12:00:00Z');

      // Act
      const result = PayslipPdfService.formatDate(date);

      // Assert
      expect(result).toContain('Feb');
      expect(result).toContain('29');
      expect(result).toContain('2024');
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return default template configuration', () => {
      // Act
      const template = PayslipPdfService.getDefaultTemplate();

      // Assert
      expect(template).toHaveProperty('template_name', 'Default Template');
      expect(template).toHaveProperty('template_code', 'default');
      expect(template).toHaveProperty('layout_type', 'standard');
      // Note: status is not included in the default template
    });

    it('should have proper display settings', () => {
      // Act
      const template = PayslipPdfService.getDefaultTemplate();

      // Assert
      expect(template.show_company_logo).toBe(false); // Default is false
      expect(template.show_employee_info).toBe(true);
      expect(template.show_payment_details).toBe(true);
      expect(template.show_earnings_section).toBe(true);
      expect(template.show_deductions_section).toBe(true);
      expect(template.show_taxes_section).toBe(true);
      expect(template.show_ytd_totals).toBe(true);
      expect(template.show_leave_balances).toBe(false);
      expect(template.show_qr_code).toBe(false);
    });

    it('should have proper styling settings', () => {
      // Act
      const template = PayslipPdfService.getDefaultTemplate();

      // Assert
      expect(template.font_family).toBe('Helvetica'); // Default is Helvetica
      expect(template.font_size).toBe(10);
      expect(template.primary_color).toBe('#10b981');
      expect(template.secondary_color).toBe('#6b7280');
    });

    it('should have proper page settings', () => {
      // Act
      const template = PayslipPdfService.getDefaultTemplate();

      // Assert
      expect(template.page_size).toBe('A4');
      expect(template.page_orientation).toBe('portrait');
    });

    it('should have proper format settings', () => {
      // Act
      const template = PayslipPdfService.getDefaultTemplate();

      // Assert
      expect(template.currency_display_format).toBe('SRD #,##0.00');
      expect(template.date_format).toBe('MMM dd, yyyy');
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle very small currency amounts', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(0.01);

      // Assert
      expect(result).toContain('0.01');
    });

    it('should handle very large currency amounts', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(999999999.99);

      // Assert
      expect(result).toContain('999,999,999.99');
    });

    it('should handle fractional cents in currency', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(123.456);

      // Assert
      // Should round to 2 decimal places
      expect(result).toMatch(/123\.4[56]/);
    });

    it('should handle dates far in the past', () => {
      // Arrange
      const date = new Date('2000-01-01T00:00:00Z');

      // Act
      const result = PayslipPdfService.formatDate(date);

      // Assert
      expect(result).toContain('Jan');
      expect(result).toContain('1');
      expect(result).toContain('2000');
    });

    it('should handle dates far in the future', () => {
      // Arrange
      const date = new Date('2099-12-31T23:59:59Z');

      // Act
      const result = PayslipPdfService.formatDate(date);

      // Assert
      expect(result).toContain('Dec');
      expect(result).toContain('31');
      expect(result).toContain('2099');
    });

    it('should handle invalid date string gracefully', () => {
      // Arrange
      const invalidDate = 'not-a-date';

      // Act
      const result = PayslipPdfService.formatDate(invalidDate as any);

      // Assert
      // Will create an Invalid Date object, which toString includes 'Invalid'
      expect(result).toBeTruthy();
    });

    it('should format zero as currency properly', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(0.00);

      // Assert
      expect(result).toContain('0.00');
    });

    it('should handle negative zero', () => {
      // Act
      const result = PayslipPdfService.formatCurrency(-0);

      // Assert
      expect(result).toContain('0.00');
      expect(result).not.toContain('-'); // Negative zero should be formatted as zero
    });
  });

  // ==================== Template Configuration Tests ====================

  describe('Template Configuration', () => {
    it('should provide consistent default template', () => {
      // Act
      const template1 = PayslipPdfService.getDefaultTemplate();
      const template2 = PayslipPdfService.getDefaultTemplate();

      // Assert
      expect(template1).toEqual(template2);
    });

    it('should include all required template fields', () => {
      // Act
      const template = PayslipPdfService.getDefaultTemplate();

      // Assert
      const requiredFields = [
        'template_name',
        'template_code',
        'layout_type',
        // Note: 'status' is not included in the default template
        'show_company_logo',
        'show_employee_info',
        'show_payment_details',
        'show_earnings_section',
        'show_deductions_section',
        'show_taxes_section',
        'show_ytd_totals',
        'show_leave_balances',
        'show_qr_code',
        'font_family',
        'font_size',
        'primary_color',
        'secondary_color',
        'page_size',
        'page_orientation',
        'currency_display_format',
        'date_format'
      ];

      requiredFields.forEach(field => {
        expect(template).toHaveProperty(field);
      });
    });

    it('should have valid color codes in default template', () => {
      // Act
      const template = PayslipPdfService.getDefaultTemplate();

      // Assert
      expect(template.primary_color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(template.secondary_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should have valid page size in default template', () => {
      // Act
      const template = PayslipPdfService.getDefaultTemplate();

      // Assert
      expect(['A4', 'Letter', 'Legal']).toContain(template.page_size);
    });

    it('should have valid page orientation in default template', () => {
      // Act
      const template = PayslipPdfService.getDefaultTemplate();

      // Assert
      expect(['portrait', 'landscape']).toContain(template.page_orientation);
    });

    it('should have valid layout type in default template', () => {
      // Act
      const template = PayslipPdfService.getDefaultTemplate();

      // Assert
      expect(['standard', 'compact', 'detailed', 'custom']).toContain(template.layout_type);
    });

    it('should have reasonable font size in default template', () => {
      // Act
      const template = PayslipPdfService.getDefaultTemplate();

      // Assert
      expect(template.font_size).toBeGreaterThanOrEqual(6);
      expect(template.font_size).toBeLessThanOrEqual(20);
    });
  });

  // ==================== Format Consistency Tests ====================

  describe('Format Consistency', () => {
    it('should format same amount consistently', () => {
      // Act
      const result1 = PayslipPdfService.formatCurrency(1234.56);
      const result2 = PayslipPdfService.formatCurrency(1234.56);

      // Assert
      expect(result1).toBe(result2);
    });

    it('should format same date consistently', () => {
      // Arrange
      const date = new Date('2025-01-15T12:00:00Z');

      // Act
      const result1 = PayslipPdfService.formatDate(date);
      const result2 = PayslipPdfService.formatDate(date);

      // Assert
      expect(result1).toBe(result2);
    });

    it('should format equivalent dates consistently', () => {
      // Arrange
      const date1 = new Date('2025-01-15T00:00:00Z');
      const date2 = new Date('2025-01-15T23:59:59Z');

      // Act
      const result1 = PayslipPdfService.formatDate(date1);
      const result2 = PayslipPdfService.formatDate(date2);

      // Assert
      // Both should format to same date string (excluding time)
      expect(result1).toBe(result2);
    });
  });
});
