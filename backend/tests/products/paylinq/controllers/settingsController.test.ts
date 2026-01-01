/**
 * Settings Controller Unit Tests
 * 
 * Tests for PayLinQ settings controller HTTP handlers.
 * Covers request/response handling and error handling.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Mock req/res objects
 * - EXACT method names from controller (verified against source)
 * 
 * VERIFIED METHODS (from source analysis):
 * 1. getSettings(req, res)
 * 2. updateSettings(req, res)
 * 3. getCompanySettings(req, res)
 * 4. updateCompanySettings(req, res)
 * 5. getPayrollSettings(req, res)
 * 6. updatePayrollSettings(req, res)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock logger to prevent console output during tests
jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Import controller after mocking dependencies
const settingsControllerModule = await import('../../../../src/products/paylinq/controllers/settingsController.js');
const {
  getSettings,
  updateSettings,
  getCompanySettings,
  updateCompanySettings,
  getPayrollSettings,
  updatePayrollSettings
} = settingsControllerModule;

describe('Settings Controller', () => {
  let mockReq: any;
  let mockRes: any;

  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testOrgName = 'Test Organization';
  const testOrgEmail = 'test@example.com';

  beforeEach(() => {
    // Setup: Create fresh mock request/response for each test
    mockReq = {
      organizationId: testOrgId,
      organization: {
        name: testOrgName,
        email: testOrgEmail
      },
      body: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // ==================== getSettings ====================

  describe('getSettings', () => {
    it('should return organization settings with company and payroll sections', async () => {
      // Act
      await getSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          company: expect.objectContaining({
            name: testOrgName,
            email: testOrgEmail,
            currency: 'SRD',
            timezone: 'America/Paramaribo',
            dateFormat: 'DD/MM/YYYY',
            language: 'en'
          }),
          payroll: expect.objectContaining({
            payFrequency: 'biweekly',
            payDay: '15',
            thirteenthMonthEnabled: true,
            requireManagerApproval: true,
            requireHRReview: true,
            autoApproveScheduled: false
          })
        })
      });
    });

    it('should handle missing organization data gracefully', async () => {
      // Arrange
      mockReq.organization = undefined;

      // Act
      await getSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          company: expect.objectContaining({
            name: '',
            email: ''
          })
        })
      });
    });

    it('should return 500 on error', async () => {
      // Arrange - Force an error by making organizationId throw
      Object.defineProperty(mockReq, 'organizationId', {
        get() { throw new Error('Test error'); }
      });

      // Act
      await getSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve settings',
        message: 'Test error'
      });
    });
  });

  // ==================== updateSettings ====================

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      // Arrange
      const companySettings = {
        name: 'Updated Company',
        currency: 'EUR'
      };
      const payrollSettings = {
        payFrequency: 'monthly',
        payDay: '1'
      };
      mockReq.body = { company: companySettings, payroll: payrollSettings };

      // Act
      await updateSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Settings updated successfully',
        data: {
          company: companySettings,
          payroll: payrollSettings
        }
      });
    });

    it('should handle partial updates', async () => {
      // Arrange
      mockReq.body = { company: { name: 'New Name' } };

      // Act
      await updateSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Settings updated successfully',
        data: expect.objectContaining({
          company: { name: 'New Name' }
        })
      });
    });

    it('should return 500 on error', async () => {
      // Arrange - Force an error
      Object.defineProperty(mockReq, 'organizationId', {
        get() { throw new Error('Update error'); }
      });

      // Act
      await updateSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update settings',
        message: 'Update error'
      });
    });
  });

  // ==================== getCompanySettings ====================

  describe('getCompanySettings', () => {
    it('should return company settings only', async () => {
      // Act
      await getCompanySettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: testOrgName,
          email: testOrgEmail,
          taxRegistrationNumber: '',
          phone: '',
          address: '',
          currency: 'SRD',
          timezone: 'America/Paramaribo',
          dateFormat: 'DD/MM/YYYY',
          language: 'en'
        })
      });
    });

    it('should handle missing organization data', async () => {
      // Arrange
      mockReq.organization = null;

      // Act
      await getCompanySettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          name: '',
          email: ''
        })
      });
    });

    it('should return 500 on error', async () => {
      // Arrange
      Object.defineProperty(mockReq, 'organization', {
        get() { throw new Error('Company error'); }
      });

      // Act
      await getCompanySettings(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve company settings',
        message: 'Company error'
      });
    });
  });

  // ==================== updateCompanySettings ====================

  describe('updateCompanySettings', () => {
    it('should update company settings successfully', async () => {
      // Arrange
      const companySettings = {
        name: 'New Company Name',
        currency: 'USD',
        timezone: 'America/New_York'
      };
      mockReq.body = companySettings;

      // Act
      await updateCompanySettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Company settings updated successfully',
        data: companySettings
      });
    });

    it('should return 500 on error', async () => {
      // Arrange
      Object.defineProperty(mockReq, 'organizationId', {
        get() { throw new Error('Update company error'); }
      });

      // Act
      await updateCompanySettings(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update company settings',
        message: 'Update company error'
      });
    });
  });

  // ==================== getPayrollSettings ====================

  describe('getPayrollSettings', () => {
    it('should return payroll settings only', async () => {
      // Act
      await getPayrollSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          payFrequency: 'biweekly',
          payDay: '15',
          thirteenthMonthEnabled: true,
          requireManagerApproval: true,
          requireHRReview: true,
          autoApproveScheduled: false
        }
      });
    });

    it('should return 500 on error', async () => {
      // Arrange - Force error by making res.json throw
      mockRes.json.mockImplementationOnce(() => {
        throw new Error('Payroll error');
      });

      // Act
      await getPayrollSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve payroll settings',
        message: 'Payroll error'
      });
    });
  });

  // ==================== updatePayrollSettings ====================

  describe('updatePayrollSettings', () => {
    it('should update payroll settings successfully', async () => {
      // Arrange
      const payrollSettings = {
        payFrequency: 'monthly',
        payDay: '1',
        thirteenthMonthEnabled: false,
        requireManagerApproval: false
      };
      mockReq.body = payrollSettings;

      // Act
      await updatePayrollSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Payroll settings updated successfully',
        data: payrollSettings
      });
    });

    it('should return 500 on error', async () => {
      // Arrange
      Object.defineProperty(mockReq, 'organizationId', {
        get() { throw new Error('Update payroll error'); }
      });

      // Act
      await updatePayrollSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to update payroll settings',
        message: 'Update payroll error'
      });
    });
  });
});
