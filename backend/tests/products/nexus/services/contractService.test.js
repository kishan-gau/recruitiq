/**
 * ContractService Unit Tests
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockContractRepository = {
  findById: jest.fn(),
  findByEmployee: jest.fn(),
  findActiveByEmployee: jest.fn(),
  findAll: jest.fn(),
  findExpiring: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  updateStep: jest.fn()
};

const mockEmployeeRepository = {
  findById: jest.fn()
};

const mockEventBus = {
  publish: jest.fn()
};

jest.unstable_mockModule('../../../src/products/nexus/repositories/contractRepository.js', () => ({
  default: jest.fn(() => mockContractRepository)
}));

jest.unstable_mockModule('../../../src/products/nexus/repositories/employeeRepository.js', () => ({
  default: jest.fn(() => mockEmployeeRepository)
}));

jest.unstable_mockModule('../../../src/shared/events/eventBus.js', () => ({
  default: mockEventBus
}));

const { default: ContractService } = await import('../../../src/products/nexus/services/contractService.js');

describe('ContractService', () => {
  let service;
  const organizationId = 'org-123';
  const userId = 'user-456';

  beforeEach(() => {
    service = new ContractService();
    jest.clearAllMocks();
  });

  describe('createContract', () => {
    const validContractData = {
      employeeId: 'emp-123',
      contractType: 'permanent',
      startDate: new Date('2024-01-01'),
      endDate: null,
      jobTitle: 'Software Engineer',
      salary: 75000,
      currency: 'USD',
      workingHoursPerWeek: 40
    };

    it('should create contract successfully', async () => {
      mockEmployeeRepository.findById.mockResolvedValue({ id: 'emp-123', firstName: 'John' });
      mockContractRepository.findActiveByEmployee.mockResolvedValue([]);
      mockContractRepository.create.mockResolvedValue({
        id: 'contract-new',
        ...validContractData,
        status: 'draft'
      });

      const result = await service.createContract(validContractData, organizationId, userId);

      expect(mockEmployeeRepository.findById).toHaveBeenCalledWith('emp-123', organizationId);
      expect(mockContractRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...validContractData, status: 'draft' }),
        organizationId,
        userId
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'nexus.contract.created',
        expect.objectContaining({ contractId: 'contract-new' })
      );
      expect(result.id).toBe('contract-new');
    });

    it('should throw error if validation fails', async () => {
      const invalidData = { employeeId: 'emp-123' }; // Missing required fields

      await expect(
        service.createContract(invalidData, organizationId, userId)
      ).rejects.toThrow('Validation error');
    });

    it('should throw error if employee not found', async () => {
      mockEmployeeRepository.findById.mockResolvedValue(null);

      await expect(
        service.createContract(validContractData, organizationId, userId)
      ).rejects.toThrow('Employee not found');
    });

    it('should throw error if start date is after end date', async () => {
      mockEmployeeRepository.findById.mockResolvedValue({ id: 'emp-123' });
      
      const invalidDates = {
        ...validContractData,
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01')
      };

      await expect(
        service.createContract(invalidDates, organizationId, userId)
      ).rejects.toThrow('Start date must be before end date');
    });

    it('should throw error if dates overlap with active contract', async () => {
      mockEmployeeRepository.findById.mockResolvedValue({ id: 'emp-123' });
      mockContractRepository.findActiveByEmployee.mockResolvedValue([
        {
          id: 'existing-contract',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      ]);

      const overlappingContract = {
        ...validContractData,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2025-06-01')
      };

      await expect(
        service.createContract(overlappingContract, organizationId, userId)
      ).rejects.toThrow('Contract dates overlap with existing active contract');
    });
  });

  describe('activateContract', () => {
    it('should activate draft contract', async () => {
      const draftContract = {
        id: 'contract-1',
        status: 'draft',
        employeeId: 'emp-123'
      };

      mockContractRepository.findById.mockResolvedValue(draftContract);
      mockContractRepository.updateStatus.mockResolvedValue({
        ...draftContract,
        status: 'active'
      });

      const result = await service.activateContract('contract-1', organizationId, userId);

      expect(mockContractRepository.updateStatus).toHaveBeenCalledWith(
        'contract-1',
        'active',
        organizationId,
        userId
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'nexus.contract.activated',
        expect.objectContaining({ contractId: 'contract-1' })
      );
      expect(result.status).toBe('active');
    });

    it('should throw error if contract already active', async () => {
      mockContractRepository.findById.mockResolvedValue({
        id: 'contract-1',
        status: 'active'
      });

      await expect(
        service.activateContract('contract-1', organizationId, userId)
      ).rejects.toThrow('Contract is already active');
    });

    it('should throw error if contract is terminated', async () => {
      mockContractRepository.findById.mockResolvedValue({
        id: 'contract-1',
        status: 'terminated'
      });

      await expect(
        service.activateContract('contract-1', organizationId, userId)
      ).rejects.toThrow('Cannot activate terminated contract');
    });
  });

  describe('terminateContract', () => {
    it('should terminate active contract', async () => {
      const activeContract = {
        id: 'contract-1',
        status: 'active',
        employeeId: 'emp-123'
      };

      mockContractRepository.findById.mockResolvedValue(activeContract);
      mockContractRepository.updateStatus.mockResolvedValue({
        ...activeContract,
        status: 'terminated'
      });
      mockContractRepository.update.mockResolvedValue(activeContract);

      const terminationDate = '2024-12-31';
      const reason = 'Resignation';

      const result = await service.terminateContract(
        'contract-1',
        terminationDate,
        reason,
        organizationId,
        userId
      );

      expect(mockContractRepository.updateStatus).toHaveBeenCalledWith(
        'contract-1',
        'terminated',
        organizationId,
        userId
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'nexus.contract.terminated',
        expect.objectContaining({
          contractId: 'contract-1',
          terminationDate,
          reason
        })
      );
    });

    it('should throw error if termination date not provided', async () => {
      mockContractRepository.findById.mockResolvedValue({
        id: 'contract-1',
        status: 'active'
      });

      await expect(
        service.terminateContract('contract-1', null, 'reason', organizationId, userId)
      ).rejects.toThrow('Termination date is required');
    });
  });

  describe('progressSequenceStep', () => {
    it('should progress to next sequence step', async () => {
      const contract = {
        id: 'contract-1',
        employeeId: 'emp-123',
        sequencePolicyId: 'policy-1',
        currentStepNumber: 1
      };

      mockContractRepository.findById.mockResolvedValue(contract);
      mockContractRepository.updateStep.mockResolvedValue({
        ...contract,
        currentStepNumber: 2
      });

      const result = await service.progressSequenceStep('contract-1', organizationId, userId);

      expect(mockContractRepository.updateStep).toHaveBeenCalledWith(
        'contract-1',
        2,
        organizationId,
        userId
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'nexus.contract.sequence.progressed',
        expect.objectContaining({
          contractId: 'contract-1',
          previousStep: 1,
          newStep: 2
        })
      );
      expect(result.currentStepNumber).toBe(2);
    });

    it('should throw error if contract not part of sequence', async () => {
      mockContractRepository.findById.mockResolvedValue({
        id: 'contract-1',
        sequencePolicyId: null
      });

      await expect(
        service.progressSequenceStep('contract-1', organizationId, userId)
      ).rejects.toThrow('Contract is not part of a sequence');
    });
  });

  describe('getExpiringContracts', () => {
    it('should retrieve contracts expiring soon', async () => {
      const expiringContracts = [
        { id: 'contract-1', endDate: '2024-06-15', daysUntilExpiry: 10 },
        { id: 'contract-2', endDate: '2024-06-20', daysUntilExpiry: 15 }
      ];

      mockContractRepository.findExpiring.mockResolvedValue(expiringContracts);

      const result = await service.getExpiringContracts(30, organizationId);

      expect(mockContractRepository.findExpiring).toHaveBeenCalledWith(30, organizationId);
      expect(result).toEqual(expiringContracts);
      expect(result).toHaveLength(2);
    });
  });
});
