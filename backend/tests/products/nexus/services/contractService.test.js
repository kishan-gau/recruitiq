/**
 * ContractService Unit Tests
 * Tests business logic for employment contract management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import service after mocks
const { default: ContractService } = await import('../../../../src/products/nexus/services/contractService.js');

describe('ContractService', () => {
  let service;
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = 'user-123e4567-e89b-12d3-a456-426614174000';
  const mockEmployeeId = 'emp-123e4567-e89b-12d3-a456-426614174000';
  const mockContractId = 'con-123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContractService();
  });

  describe('createContract', () => {
    it('should create a contract successfully', async () => {
      // Arrange
      const contractData = {
        employee_id: mockEmployeeId,
        contract_type: 'full-time',
        start_date: '2025-01-01',
        job_title: 'Software Engineer',
        salary_amount: 75000,
        work_hours_per_week: 40
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockContractId, ...contractData }] });

      // Act
      const result = await service.createContract(contractData, mockOrganizationId, mockUserId);

      // Assert
      expect(result.id).toBe(mockContractId);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hris.contract'),
        expect.any(Array),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should throw error when employee_id is missing', async () => {
      // Arrange
      const contractData = { contract_type: 'full-time', start_date: '2025-01-01' };

      // Act & Assert
      await expect(
        service.createContract(contractData, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Employee ID is required');
    });

    it('should throw error when contract_type is missing', async () => {
      // Arrange
      const contractData = { employee_id: mockEmployeeId, start_date: '2025-01-01' };

      // Act & Assert
      await expect(
        service.createContract(contractData, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Contract type is required');
    });

    it('should throw error when start_date is missing', async () => {
      // Arrange
      const contractData = { employee_id: mockEmployeeId, contract_type: 'full-time' };

      // Act & Assert
      await expect(
        service.createContract(contractData, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Start date is required');
    });

    it('should use default values for optional fields', async () => {
      // Arrange
      const contractData = {
        employee_id: mockEmployeeId,
        contract_type: 'full-time',
        start_date: '2025-01-01'
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockContractId }] });

      // Act
      await service.createContract(contractData, mockOrganizationId, mockUserId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          mockOrganizationId,
          mockEmployeeId,
          'full-time',
          '2025-01-01',
          null, // end_date default
          'draft', // status default
          null, // job_title default
          null, // department_id default
          null, // location_id default
          null, // salary_amount default
          'EUR', // salary_currency default
          'monthly', // salary_frequency default
          40, // work_hours_per_week default
          null, // probation_period_months default
          null, // notice_period_days default
          null, // terms_and_conditions default
          mockUserId,
          mockUserId
        ]),
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('getContract', () => {
    it('should return contract with employee and department details', async () => {
      // Arrange
      const mockContract = {
        id: mockContractId,
        employee_id: mockEmployeeId,
        employee_name: 'John Doe',
        employee_email: 'john@example.com',
        department_name: 'Engineering',
        location_name: 'Amsterdam'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockContract] });

      // Act
      const result = await service.getContract(mockContractId, mockOrganizationId);

      // Assert
      expect(result).toEqual(mockContract);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN hris.employee'),
        [mockContractId, mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should throw error when contract not found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(
        service.getContract(mockContractId, mockOrganizationId)
      ).rejects.toThrow('Contract not found');
    });
  });

  describe('listContracts', () => {
    it('should return paginated contracts', async () => {
      // Arrange
      const mockContracts = [
        { id: 'con-1', employee_name: 'John Doe' },
        { id: 'con-2', employee_name: 'Jane Smith' }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockContracts })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      // Act
      const result = await service.listContracts({}, mockOrganizationId);

      // Assert
      expect(result.contracts).toEqual(mockContracts);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should filter by employee ID', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listContracts({ employeeId: mockEmployeeId }, mockOrganizationId);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('c.employee_id ='),
        expect.arrayContaining([mockOrganizationId, mockEmployeeId]),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by status', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listContracts({ status: 'active' }, mockOrganizationId);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('c.status ='),
        expect.arrayContaining([mockOrganizationId, 'active']),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by contract type', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listContracts({ contractType: 'full-time' }, mockOrganizationId);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('c.contract_type ='),
        expect.arrayContaining([mockOrganizationId, 'full-time']),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by department', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listContracts({ departmentId: 'dept-123' }, mockOrganizationId);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('c.department_id ='),
        expect.arrayContaining([mockOrganizationId, 'dept-123']),
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('updateContract', () => {
    it('should update contract successfully', async () => {
      // Arrange
      const updateData = {
        status: 'active',
        salary_amount: 80000,
        job_title: 'Senior Software Engineer'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: mockContractId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockContractId, ...updateData }] });

      // Act
      const result = await service.updateContract(mockContractId, updateData, mockOrganizationId, mockUserId);

      // Assert
      expect(result).toMatchObject(updateData);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Contract updated successfully',
        expect.any(Object)
      );
    });

    it('should throw error when contract not found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(
        service.updateContract(mockContractId, {}, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Contract not found');
    });

    it('should return existing contract when no updates provided', async () => {
      // Arrange
      const existingContract = { id: mockContractId, status: 'draft' };
      
      mockQuery
        .mockResolvedValueOnce({ rows: [existingContract] })
        .mockResolvedValueOnce({ rows: [existingContract] });

      // Act
      const result = await service.updateContract(mockContractId, {}, mockOrganizationId, mockUserId);

      // Assert
      expect(result).toEqual(existingContract);
    });
  });

  describe('deleteContract', () => {
    it('should soft delete contract successfully', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: mockContractId }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await service.deleteContract(mockContractId, mockOrganizationId, mockUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('deleted_at = CURRENT_TIMESTAMP'),
        [mockContractId, mockOrganizationId, mockUserId],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should throw error when contract not found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(
        service.deleteContract(mockContractId, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Contract not found');
    });
  });

  describe('getActiveContract', () => {
    it('should return active contract for employee', async () => {
      // Arrange
      const mockActiveContract = {
        id: mockContractId,
        employee_id: mockEmployeeId,
        status: 'active',
        start_date: '2025-01-01',
        end_date: null
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockActiveContract] });

      // Act
      const result = await service.getActiveContract(mockEmployeeId, mockOrganizationId);

      // Assert
      expect(result).toEqual(mockActiveContract);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("c.status = 'active'"),
        [mockEmployeeId, mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should return null when no active contract found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await service.getActiveContract(mockEmployeeId, mockOrganizationId);

      // Assert
      expect(result).toBeNull();
    });

    it('should check date range for active contract', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act
      await service.getActiveContract(mockEmployeeId, mockOrganizationId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('c.start_date <= CURRENT_DATE'),
        expect.any(Array),
        mockOrganizationId,
        expect.any(Object)
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('(c.end_date IS NULL OR c.end_date >= CURRENT_DATE)'),
        expect.any(Array),
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });
});
