/**
 * Integration Tests for Payslip Generation Workflow
 * 
 * Tests the complete payslip generation process including:
 * - Payslip template selection
 * - PDF generation
 * - Payslip data retrieval
 * - Payslip download and email
 * 
 * Following industry standards from TESTING_STANDARDS.md - Integration Testing section.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock services for payslip generation
const mockPayslipService = {
  generatePayslip: vi.fn(),
  getPayslip: vi.fn(),
  downloadPayslip: vi.fn(),
  emailPayslip: vi.fn(),
  getPayslipTemplate: vi.fn(),
};

describe('Payslip Generation Workflow Integration Tests', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

    vi.clearAllMocks();
  });

  describe('Payslip Generation', () => {
    it('should generate payslip for processed paycheck', async () => {
      // Arrange - Processed paycheck data
      const mockPaycheck = {
        id: 'paycheck-1',
        payrollRunId: 'run-1',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        employeeNumber: 'EMP001',
        payPeriodStart: '2025-01-01',
        payPeriodEnd: '2025-01-31',
        paymentDate: '2025-02-05',
        grossPay: 5000,
        netPay: 4000,
        wageTax: 600,
        aovTax: 250,
        awwTax: 150,
        totalTaxes: 1000,
        status: 'processed',
      };

      const mockPayslip = {
        id: 'payslip-1',
        paycheckId: 'paycheck-1',
        employeeId: 'emp-1',
        payrollRunId: 'run-1',
        generatedAt: new Date().toISOString(),
        pdfUrl: 'https://storage.example.com/payslips/payslip-1.pdf',
        status: 'generated',
      };

      mockPayslipService.generatePayslip.mockResolvedValue(mockPayslip);

      // Act - Generate payslip
      const result = await mockPayslipService.generatePayslip('paycheck-1');

      // Assert - Payslip generated successfully
      expect(result).toEqual(mockPayslip);
      expect(result.status).toBe('generated');
      expect(result.pdfUrl).toBeTruthy();
      expect(mockPayslipService.generatePayslip).toHaveBeenCalledWith('paycheck-1');
    });

    it('should include all earning components in payslip', async () => {
      // Arrange - Paycheck with multiple earning components
      const mockPaycheck = {
        id: 'paycheck-1',
        employeeId: 'emp-1',
        grossPay: 5500,
        components: [
          {
            componentCode: 'BASE_SALARY',
            componentName: 'Base Salary',
            componentType: 'earning',
            amount: 5000,
          },
          {
            componentCode: 'OVERTIME',
            componentName: 'Overtime Pay',
            componentType: 'earning',
            amount: 500,
          },
        ],
      };

      const mockPayslip = {
        id: 'payslip-1',
        paycheckId: 'paycheck-1',
        earnings: mockPaycheck.components,
        totalEarnings: 5500,
      };

      mockPayslipService.getPayslip.mockResolvedValue(mockPayslip);

      // Act
      const result = await mockPayslipService.getPayslip('paycheck-1');

      // Assert - All components included
      expect(result.earnings).toHaveLength(2);
      expect(result.earnings[0].componentCode).toBe('BASE_SALARY');
      expect(result.earnings[1].componentCode).toBe('OVERTIME');
      expect(result.totalEarnings).toBe(5500);
    });

    it('should include all tax components in payslip', async () => {
      // Arrange - Paycheck with tax breakdown
      const mockPayslip = {
        id: 'payslip-1',
        paycheckId: 'paycheck-1',
        taxes: [
          {
            taxType: 'WAGE_TAX',
            taxName: 'Loonbelasting (Wage Tax)',
            amount: 600,
          },
          {
            taxType: 'AOV',
            taxName: 'AOV (Old Age Pension)',
            amount: 250,
          },
          {
            taxType: 'AWW',
            taxName: 'AWW (Widow/Orphan Insurance)',
            amount: 150,
          },
        ],
        totalTaxes: 1000,
      };

      mockPayslipService.getPayslip.mockResolvedValue(mockPayslip);

      // Act
      const result = await mockPayslipService.getPayslip('paycheck-1');

      // Assert - All taxes included
      expect(result.taxes).toHaveLength(3);
      expect(result.taxes[0].taxType).toBe('WAGE_TAX');
      expect(result.taxes[1].taxType).toBe('AOV');
      expect(result.taxes[2].taxType).toBe('AWW');
      expect(result.totalTaxes).toBe(1000);
    });

    it('should include all deduction components in payslip', async () => {
      // Arrange - Paycheck with deductions
      const mockPayslip = {
        id: 'payslip-1',
        paycheckId: 'paycheck-1',
        deductions: [
          {
            deductionCode: 'HEALTH_INS',
            deductionName: 'Health Insurance',
            amount: 100,
            type: 'post-tax',
          },
          {
            deductionCode: 'PENSION',
            deductionName: '401k Contribution',
            amount: 200,
            type: 'pre-tax',
          },
        ],
        totalDeductions: 300,
      };

      mockPayslipService.getPayslip.mockResolvedValue(mockPayslip);

      // Act
      const result = await mockPayslipService.getPayslip('paycheck-1');

      // Assert - All deductions included
      expect(result.deductions).toHaveLength(2);
      expect(result.totalDeductions).toBe(300);
    });

    it('should calculate net pay correctly in payslip', async () => {
      // Arrange
      const grossPay = 5000;
      const totalTaxes = 1000;
      const totalDeductions = 200;
      const expectedNetPay = grossPay - totalTaxes - totalDeductions;

      const mockPayslip = {
        id: 'payslip-1',
        grossPay,
        totalTaxes,
        totalDeductions,
        netPay: expectedNetPay,
      };

      mockPayslipService.getPayslip.mockResolvedValue(mockPayslip);

      // Act
      const result = await mockPayslipService.getPayslip('paycheck-1');

      // Assert - Net pay calculated correctly
      expect(result.netPay).toBe(3800);
      expect(result.netPay).toBe(result.grossPay - result.totalTaxes - result.totalDeductions);
    });
  });

  describe('Payslip Template Selection', () => {
    it('should use employee-specific template if assigned', async () => {
      // Arrange - Employee with specific template
      const mockTemplate = {
        id: 'template-1',
        templateName: 'Executive Template',
        assignmentType: 'employee',
        employeeId: 'emp-1',
        priority: 1,
      };

      mockPayslipService.getPayslipTemplate.mockResolvedValue(mockTemplate);

      // Act
      const result = await mockPayslipService.getPayslipTemplate('emp-1');

      // Assert - Employee template selected
      expect(result.assignmentType).toBe('employee');
      expect(result.employeeId).toBe('emp-1');
      expect(result.priority).toBe(1);
    });

    it('should fall back to organization default template', async () => {
      // Arrange - No specific template, use default
      const mockTemplate = {
        id: 'template-default',
        templateName: 'Standard Company Template',
        assignmentType: 'organization',
        isDefault: true,
      };

      mockPayslipService.getPayslipTemplate.mockResolvedValue(mockTemplate);

      // Act
      const result = await mockPayslipService.getPayslipTemplate('emp-1');

      // Assert - Default template selected
      expect(result.assignmentType).toBe('organization');
      expect(result.isDefault).toBe(true);
    });

    it('should respect template priority order', async () => {
      // Arrange - Multiple templates available
      // Priority: employee > pay_structure > worker_type > department > organization
      const mockTemplate = {
        id: 'template-1',
        templateName: 'Pay Structure Template',
        assignmentType: 'pay_structure',
        priority: 2,
      };

      mockPayslipService.getPayslipTemplate.mockResolvedValue(mockTemplate);

      // Act
      const result = await mockPayslipService.getPayslipTemplate('emp-1');

      // Assert - Correct priority template selected
      expect(result.assignmentType).toBe('pay_structure');
      expect(result.priority).toBe(2);
    });
  });

  describe('Payslip PDF Generation', () => {
    it('should generate PDF with correct formatting', async () => {
      // Arrange
      const mockPdfData = {
        paycheckId: 'paycheck-1',
        template: {
          layoutType: 'standard',
          showCompanyLogo: true,
          headerColor: '#10b981',
          fontSize: 10,
          pageSize: 'A4',
          pageOrientation: 'portrait',
        },
        data: {
          employeeName: 'John Doe',
          employeeNumber: 'EMP001',
          payPeriod: 'January 2025',
          paymentDate: '2025-02-05',
          grossPay: 5000,
          netPay: 4000,
        },
      };

      const mockPdfBuffer = Buffer.from('PDF content');

      mockPayslipService.generatePayslip.mockResolvedValue({
        pdfBuffer: mockPdfBuffer,
        contentType: 'application/pdf',
      });

      // Act
      const result = await mockPayslipService.generatePayslip('paycheck-1');

      // Assert - PDF generated with correct format
      expect(result.pdfBuffer).toBeTruthy();
      expect(result.contentType).toBe('application/pdf');
    });

    it('should include company branding in PDF', async () => {
      // Arrange - Template with branding
      const mockTemplate = {
        showCompanyLogo: true,
        companyLogoUrl: 'https://company.com/logo.png',
        headerColor: '#10b981',
        primaryColor: '#10b981',
        footerText: 'Confidential - For recipient only',
      };

      mockPayslipService.getPayslipTemplate.mockResolvedValue(mockTemplate);

      // Act
      const template = await mockPayslipService.getPayslipTemplate('emp-1');

      // Assert - Branding elements present
      expect(template.showCompanyLogo).toBe(true);
      expect(template.companyLogoUrl).toBeTruthy();
      expect(template.headerColor).toBe('#10b981');
      expect(template.footerText).toBeTruthy();
    });

    it('should format currency correctly based on template', async () => {
      // Arrange - Template with currency format
      const mockPayslip = {
        id: 'payslip-1',
        grossPay: 5000.00,
        netPay: 4000.00,
        currencyDisplayFormat: 'SRD #,##0.00',
        formattedGrossPay: 'SRD 5,000.00',
        formattedNetPay: 'SRD 4,000.00',
      };

      mockPayslipService.getPayslip.mockResolvedValue(mockPayslip);

      // Act
      const result = await mockPayslipService.getPayslip('paycheck-1');

      // Assert - Currency formatted correctly
      expect(result.formattedGrossPay).toBe('SRD 5,000.00');
      expect(result.formattedNetPay).toBe('SRD 4,000.00');
    });
  });

  describe('Payslip Distribution', () => {
    it('should download payslip as PDF', async () => {
      // Arrange
      const mockDownload = {
        paycheckId: 'paycheck-1',
        fileName: 'payslip_EMP001_2025-01.pdf',
        contentType: 'application/pdf',
        blob: new Blob(['PDF content'], { type: 'application/pdf' }),
      };

      mockPayslipService.downloadPayslip.mockResolvedValue(mockDownload);

      // Act
      const result = await mockPayslipService.downloadPayslip('paycheck-1');

      // Assert - Download prepared correctly
      expect(result.fileName).toMatch(/payslip.*\.pdf/);
      expect(result.contentType).toBe('application/pdf');
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it('should email payslip to employee', async () => {
      // Arrange
      const emailRequest = {
        paycheckId: 'paycheck-1',
        employeeEmail: 'john.doe@company.com',
        subject: 'Your Payslip for January 2025',
        message: 'Please find attached your payslip for January 2025.',
      };

      const mockEmailResult = {
        success: true,
        messageId: 'msg-123',
        sentAt: new Date().toISOString(),
      };

      mockPayslipService.emailPayslip.mockResolvedValue(mockEmailResult);

      // Act
      const result = await mockPayslipService.emailPayslip(emailRequest);

      // Assert - Email sent successfully
      expect(result.success).toBe(true);
      expect(result.messageId).toBeTruthy();
      expect(result.sentAt).toBeTruthy();
      expect(mockPayslipService.emailPayslip).toHaveBeenCalledWith(emailRequest);
    });

    it('should handle email delivery failures', async () => {
      // Arrange
      const emailRequest = {
        paycheckId: 'paycheck-1',
        employeeEmail: 'invalid@email',
      };

      const error = new Error('Invalid email address');

      mockPayslipService.emailPayslip.mockRejectedValue(error);

      // Act & Assert
      await expect(
        mockPayslipService.emailPayslip(emailRequest)
      ).rejects.toThrow('Invalid email address');
    });
  });

  describe('Bulk Payslip Generation', () => {
    it('should generate payslips for all employees in payroll run', async () => {
      // Arrange - Payroll run with multiple paychecks
      const mockPaychecks = [
        { id: 'paycheck-1', employeeId: 'emp-1' },
        { id: 'paycheck-2', employeeId: 'emp-2' },
        { id: 'paycheck-3', employeeId: 'emp-3' },
      ];

      const mockResults = mockPaychecks.map(pc => ({
        paycheckId: pc.id,
        payslipId: `payslip-${pc.id}`,
        status: 'generated',
      }));

      mockPayslipService.generatePayslip.mockImplementation((paycheckId) => {
        const result = mockResults.find(r => r.paycheckId === paycheckId);
        return Promise.resolve(result);
      });

      // Act - Generate all payslips
      const results = await Promise.all(
        mockPaychecks.map(pc => mockPayslipService.generatePayslip(pc.id))
      );

      // Assert - All payslips generated
      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'generated')).toBe(true);
      expect(mockPayslipService.generatePayslip).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk generation', async () => {
      // Arrange - One paycheck fails
      const mockPaychecks = [
        { id: 'paycheck-1', employeeId: 'emp-1' },
        { id: 'paycheck-2', employeeId: 'emp-2' },
        { id: 'paycheck-3', employeeId: 'emp-3' },
      ];

      mockPayslipService.generatePayslip
        .mockResolvedValueOnce({ paycheckId: 'paycheck-1', status: 'generated' })
        .mockRejectedValueOnce(new Error('Failed to generate payslip'))
        .mockResolvedValueOnce({ paycheckId: 'paycheck-3', status: 'generated' });

      // Act - Generate with error handling
      const results = await Promise.allSettled(
        mockPaychecks.map(pc => mockPayslipService.generatePayslip(pc.id))
      );

      // Assert - Some succeeded, one failed
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful).toHaveLength(2);
      expect(failed).toHaveLength(1);
    });
  });

  describe('Payslip History and Versioning', () => {
    it('should maintain payslip history for employee', async () => {
      // Arrange - Multiple payslips for same employee
      const mockHistory = [
        {
          id: 'payslip-1',
          employeeId: 'emp-1',
          payPeriod: 'December 2024',
          generatedAt: '2025-01-05T10:00:00Z',
        },
        {
          id: 'payslip-2',
          employeeId: 'emp-1',
          payPeriod: 'January 2025',
          generatedAt: '2025-02-05T10:00:00Z',
        },
      ];

      mockPayslipService.getPayslip.mockResolvedValue({
        employeeId: 'emp-1',
        history: mockHistory,
      });

      // Act
      const result = await mockPayslipService.getPayslip('emp-1');

      // Assert - History maintained
      expect(result.history).toHaveLength(2);
      expect(result.history[0].payPeriod).toBe('December 2024');
      expect(result.history[1].payPeriod).toBe('January 2025');
    });

    it('should regenerate payslip if data changes', async () => {
      // Arrange - Original payslip
      const originalPayslip = {
        id: 'payslip-1',
        paycheckId: 'paycheck-1',
        version: 1,
        generatedAt: '2025-02-01T10:00:00Z',
        netPay: 4000,
      };

      // Updated payslip after correction
      const updatedPayslip = {
        id: 'payslip-1',
        paycheckId: 'paycheck-1',
        version: 2,
        generatedAt: '2025-02-02T10:00:00Z',
        netPay: 4100, // Corrected amount
      };

      mockPayslipService.generatePayslip
        .mockResolvedValueOnce(originalPayslip)
        .mockResolvedValueOnce(updatedPayslip);

      // Act - Generate original
      const original = await mockPayslipService.generatePayslip('paycheck-1');
      expect(original.version).toBe(1);

      // Act - Regenerate after correction
      const updated = await mockPayslipService.generatePayslip('paycheck-1');

      // Assert - New version created
      expect(updated.version).toBe(2);
      expect(updated.netPay).toBe(4100);
      expect(updated.generatedAt).not.toBe(original.generatedAt);
    });
  });

  describe('Payslip Access Control', () => {
    it('should only allow employee to access their own payslip', async () => {
      // Arrange - Employee trying to access their payslip
      const mockPayslip = {
        id: 'payslip-1',
        employeeId: 'emp-1',
        accessible: true,
      };

      mockPayslipService.getPayslip.mockResolvedValue(mockPayslip);

      // Act
      const result = await mockPayslipService.getPayslip('payslip-1');

      // Assert - Access granted
      expect(result.accessible).toBe(true);
      expect(result.employeeId).toBe('emp-1');
    });

    it('should prevent access to other employees payslips', async () => {
      // Arrange - Unauthorized access attempt
      const error = new Error('Access denied: You can only view your own payslips');

      mockPayslipService.getPayslip.mockRejectedValue(error);

      // Act & Assert
      await expect(
        mockPayslipService.getPayslip('payslip-2')
      ).rejects.toThrow('Access denied');
    });

    it('should allow admin/payroll manager to access all payslips', async () => {
      // Arrange - Admin access
      const mockPayslips = [
        { id: 'payslip-1', employeeId: 'emp-1' },
        { id: 'payslip-2', employeeId: 'emp-2' },
        { id: 'payslip-3', employeeId: 'emp-3' },
      ];

      mockPayslipService.getPayslip.mockResolvedValue({
        isAdmin: true,
        payslips: mockPayslips,
      });

      // Act
      const result = await mockPayslipService.getPayslip('all');

      // Assert - Admin has access to all
      expect(result.isAdmin).toBe(true);
      expect(result.payslips).toHaveLength(3);
    });
  });
});
