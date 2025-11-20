import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Create mock service as CLASS with arrow function methods
class MockContractService {
  createContract = jest.fn();
  getContract = jest.fn();
  listContracts = jest.fn();
  updateContract = jest.fn();
  activateContract = jest.fn();
  terminateContract = jest.fn();
  progressSequenceStep = jest.fn();
  getExpiringContracts = jest.fn();
  getEmployeeContracts = jest.fn();
}

// Mock the service module BEFORE importing controller
jest.unstable_mockModule('../../../../src/products/nexus/services/contractService.js', () => ({
  default: MockContractService
}));

// Mock logger
const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import controller AFTER mocking (dynamic import)
const { default: ContractController } = await import('../../../../src/products/nexus/controllers/contractController.js');

describe('ContractController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Create new controller instance (creates new MockContractService)
    controller = new ContractController();

    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request
    mockReq = {
      user: {
        organizationId: 'org-123',
        userId: 'user-123'
      },
      params: {},
      query: {},
      body: {}
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createContract', () => {
    it('should create a contract successfully', async () => {
      const contractData = {
        employeeId: 'emp-123',
        contractType: 'permanent',
        startDate: '2025-01-01',
        endDate: null,
        salary: 75000,
        terms: 'Standard employment terms'
      };

      const createdContract = {
        id: 'contract-123',
        ...contractData,
        organizationId: 'org-123'
      };

      mockReq.body = contractData;
      controller.service.createContract.mockResolvedValue(createdContract);

      await controller.createContract(mockReq, mockRes);

      expect(controller.service.createContract).toHaveBeenCalledWith(
        contractData,
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: createdContract
      });
    });

    it('should handle errors during contract creation', async () => {
      mockReq.body = { employeeId: 'emp-123' };
      controller.service.createContract.mockRejectedValue(new Error('Validation failed'));

      await controller.createContract(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed'
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getContract', () => {
    it('should get a contract by ID successfully', async () => {
      const contract = {
        id: 'contract-123',
        employeeId: 'emp-123',
        contractType: 'permanent'
      };

      mockReq.params = { id: 'contract-123' };
      controller.service.getContract.mockResolvedValue(contract);

      await controller.getContract(mockReq, mockRes);

      expect(controller.service.getContract).toHaveBeenCalledWith('contract-123', 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: contract
      });
    });

    it('should return 404 when contract not found', async () => {
      mockReq.params = { id: 'contract-123' };
      controller.service.getContract.mockRejectedValue(new Error('Contract not found'));

      await controller.getContract(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Contract not found'
      });
    });

    it('should return 500 for other errors', async () => {
      mockReq.params = { id: 'contract-123' };
      controller.service.getContract.mockRejectedValue(new Error('Database error'));

      await controller.getContract(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('listContracts', () => {
    it('should list contracts with filters', async () => {
      const contracts = [
        { id: 'contract-1', contractType: 'permanent' },
        { id: 'contract-2', contractType: 'fixed-term' }
      ];

      mockReq.query = {
        contractType: 'permanent',
        status: 'active',
        limit: '20',
        offset: '0'
      };

      controller.service.listContracts.mockResolvedValue(contracts);

      await controller.listContracts(mockReq, mockRes);

      expect(controller.service.listContracts).toHaveBeenCalledWith(
        { contractType: 'permanent', status: 'active' },
        'org-123',
        { limit: 20, offset: 0 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: contracts
      });
    });

    it('should use default pagination when not provided', async () => {
      mockReq.query = {};
      controller.service.listContracts.mockResolvedValue([]);

      await controller.listContracts(mockReq, mockRes);

      expect(controller.service.listContracts).toHaveBeenCalledWith(
        {},
        'org-123',
        { limit: 50, offset: 0 }
      );
    });

    it('should handle errors during listing', async () => {
      controller.service.listContracts.mockRejectedValue(new Error('Database error'));

      await controller.listContracts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('updateContract', () => {
    it('should update a contract successfully', async () => {
      const updateData = { salary: 85000 };
      const updatedContract = {
        id: 'contract-123',
        salary: 85000
      };

      mockReq.params = { id: 'contract-123' };
      mockReq.body = updateData;
      controller.service.updateContract.mockResolvedValue(updatedContract);

      await controller.updateContract(mockReq, mockRes);

      expect(controller.service.updateContract).toHaveBeenCalledWith(
        'contract-123',
        updateData,
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedContract
      });
    });

    it('should handle errors during update', async () => {
      mockReq.params = { id: 'contract-123' };
      mockReq.body = { salary: 85000 };
      controller.service.updateContract.mockRejectedValue(new Error('Contract not found'));

      await controller.updateContract(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Contract not found'
      });
    });
  });

  describe('activateContract', () => {
    it('should activate a contract successfully', async () => {
      const activatedContract = {
        id: 'contract-123',
        status: 'active',
        activatedAt: '2025-01-01'
      };

      mockReq.params = { id: 'contract-123' };
      controller.service.activateContract.mockResolvedValue(activatedContract);

      await controller.activateContract(mockReq, mockRes);

      expect(controller.service.activateContract).toHaveBeenCalledWith(
        'contract-123',
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: activatedContract
      });
    });

    it('should return 404 when contract not found', async () => {
      mockReq.params = { id: 'contract-123' };
      controller.service.activateContract.mockRejectedValue(new Error('Contract not found'));

      await controller.activateContract(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Contract not found'
      });
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { id: 'contract-123' };
      controller.service.activateContract.mockRejectedValue(new Error('Already active'));

      await controller.activateContract(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Already active'
      });
    });
  });

  describe('terminateContract', () => {
    it('should terminate a contract successfully', async () => {
      const terminatedContract = {
        id: 'contract-123',
        status: 'terminated',
        terminationDate: '2025-12-31'
      };

      mockReq.params = { id: 'contract-123' };
      mockReq.body = {
        terminationDate: '2025-12-31',
        reason: 'End of employment'
      };

      controller.service.terminateContract.mockResolvedValue(terminatedContract);

      await controller.terminateContract(mockReq, mockRes);

      expect(controller.service.terminateContract).toHaveBeenCalledWith(
        'contract-123',
        '2025-12-31',
        'End of employment',
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: terminatedContract
      });
    });

    it('should return 404 when contract not found', async () => {
      mockReq.params = { id: 'contract-123' };
      mockReq.body = { terminationDate: '2025-12-31' };
      controller.service.terminateContract.mockRejectedValue(new Error('Contract not found'));

      await controller.terminateContract(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Contract not found'
      });
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { id: 'contract-123' };
      mockReq.body = { terminationDate: '2025-12-31' };
      controller.service.terminateContract.mockRejectedValue(new Error('Already terminated'));

      await controller.terminateContract(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Already terminated'
      });
    });
  });

  describe('progressSequence', () => {
    it('should progress contract sequence successfully', async () => {
      const progressedContract = {
        id: 'contract-123',
        sequenceStep: 2,
        contractType: 'permanent'
      };

      mockReq.params = { id: 'contract-123' };
      controller.service.progressSequenceStep.mockResolvedValue(progressedContract);

      await controller.progressSequence(mockReq, mockRes);

      expect(controller.service.progressSequenceStep).toHaveBeenCalledWith(
        'contract-123',
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: progressedContract
      });
    });

    it('should return 404 when contract not found', async () => {
      mockReq.params = { id: 'contract-123' };
      controller.service.progressSequenceStep.mockRejectedValue(new Error('Contract not found'));

      await controller.progressSequence(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Contract not found'
      });
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { id: 'contract-123' };
      controller.service.progressSequenceStep.mockRejectedValue(new Error('No next step'));

      await controller.progressSequence(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'No next step'
      });
    });
  });

  describe('getExpiringContracts', () => {
    it('should get expiring contracts with default daysAhead', async () => {
      const expiringContracts = [
        { id: 'contract-1', endDate: '2025-02-15' },
        { id: 'contract-2', endDate: '2025-02-20' }
      ];

      mockReq.query = {};
      controller.service.getExpiringContracts.mockResolvedValue(expiringContracts);

      await controller.getExpiringContracts(mockReq, mockRes);

      expect(controller.service.getExpiringContracts).toHaveBeenCalledWith(30, 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expiringContracts
      });
    });

    it('should get expiring contracts with custom daysAhead', async () => {
      const expiringContracts = [{ id: 'contract-1', endDate: '2025-12-15' }];

      mockReq.query = { daysAhead: '60' };
      controller.service.getExpiringContracts.mockResolvedValue(expiringContracts);

      await controller.getExpiringContracts(mockReq, mockRes);

      expect(controller.service.getExpiringContracts).toHaveBeenCalledWith(60, 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expiringContracts
      });
    });

    it('should handle errors when getting expiring contracts', async () => {
      controller.service.getExpiringContracts.mockRejectedValue(new Error('Query failed'));

      await controller.getExpiringContracts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Query failed'
      });
    });
  });

  describe('getEmployeeContracts', () => {
    it('should get all contracts for an employee', async () => {
      const contracts = [
        { id: 'contract-1', contractType: 'permanent' },
        { id: 'contract-2', contractType: 'fixed-term' }
      ];

      mockReq.params = { employeeId: 'emp-123' };
      controller.service.getEmployeeContracts.mockResolvedValue(contracts);

      await controller.getEmployeeContracts(mockReq, mockRes);

      expect(controller.service.getEmployeeContracts).toHaveBeenCalledWith('emp-123', 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: contracts
      });
    });

    it('should handle errors when getting employee contracts', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      controller.service.getEmployeeContracts.mockRejectedValue(new Error('Employee not found'));

      await controller.getEmployeeContracts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee not found'
      });
    });
  });
});
