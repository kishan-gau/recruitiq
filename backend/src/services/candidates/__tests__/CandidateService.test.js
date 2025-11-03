/**
 * Unit tests for CandidateService
 * Tests business logic in isolation with mocked repositories
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CandidateService } from '../../../services/candidates/CandidateService.js';
import { ValidationError, BusinessRuleError, NotFoundError } from '../../../middleware/errorHandler.js';

// Mock dependencies
jest.mock('../../../repositories/CandidateRepository.js');
jest.mock('../../../models/Organization.js');
jest.mock('../../../utils/logger.js');

describe('CandidateService', () => {
  let candidateService;
  let mockCandidateRepository;
  let mockOrganization;
  let mockUser;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Dynamic imports after mocks are set up
    const Organization = (await import('../../../models/Organization.js')).default;

    // Create service instance
    candidateService = new CandidateService();

    // Mock repository methods
    mockCandidateRepository = candidateService.candidateRepository;
    mockOrganization = Organization;
    
    // Mock user context
    mockUser = {
      id: 'user-123',
      organization_id: 'org-123',
      email: 'test@example.com'
    };
  });

  describe('create', () => {
    it('should create a candidate successfully', async () => {
      const candidateData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        status: 'new'
      };

      const mockOrg = {
        id: 'org-123',
        max_candidates: 100
      };

      const mockCreatedCandidate = {
        id: 'candidate-123',
        ...candidateData,
        organization_id: 'org-123',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock Organization.findById
      mockOrganization.findById = jest.fn().mockResolvedValue(mockOrg);

      // Mock repository methods
      mockCandidateRepository.count = jest.fn().mockResolvedValue(50);
      mockCandidateRepository.findByEmail = jest.fn().mockResolvedValue(null);
      mockCandidateRepository.create = jest.fn().mockResolvedValue(mockCreatedCandidate);

      const result = await candidateService.create(candidateData, mockUser);

      expect(result).toBeDefined();
      expect(result.id).toBe('candidate-123');
      expect(result.email).toBe('john@example.com');
      expect(mockCandidateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com'
        }),
        'org-123'
      );
    });

    it('should throw ValidationError for invalid data', async () => {
      const invalidData = {
        first_name: 'John'
        // Missing required fields
      };

      await expect(candidateService.create(invalidData, mockUser))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw BusinessRuleError when email already exists', async () => {
      const candidateData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'existing@example.com'
      };

      const mockOrg = {
        id: 'org-123',
        max_candidates: 100
      };

      const existingCandidate = {
        id: 'existing-id',
        email: 'existing@example.com'
      };

      mockOrganization.findById = jest.fn().mockResolvedValue(mockOrg);

      mockCandidateRepository.count = jest.fn().mockResolvedValue(50);
      mockCandidateRepository.findByEmail = jest.fn().mockResolvedValue(existingCandidate);

      await expect(candidateService.create(candidateData, mockUser))
        .rejects
        .toThrow(BusinessRuleError);
    });

    it('should throw BusinessRuleError when candidate limit is reached', async () => {
      const candidateData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      };

      const mockOrg = {
        id: 'org-123',
        max_candidates: 100
      };

      mockOrganization.findById = jest.fn().mockResolvedValue(mockOrg);

      mockCandidateRepository.count = jest.fn().mockResolvedValue(100); // At limit

      await expect(candidateService.create(candidateData, mockUser))
        .rejects
        .toThrow(BusinessRuleError);
    });
  });

  describe('getById', () => {
    it('should return candidate by ID', async () => {
      const mockCandidate = {
        id: 'candidate-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        organization_id: 'org-123'
      };

      mockCandidateRepository.findById = jest.fn().mockResolvedValue(mockCandidate);

      const result = await candidateService.getById('candidate-123', mockUser);

      expect(result).toBeDefined();
      expect(result.id).toBe('candidate-123');
      expect(mockCandidateRepository.findById).toHaveBeenCalledWith('candidate-123', 'org-123');
    });

    it('should throw NotFoundError when candidate does not exist', async () => {
      mockCandidateRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(candidateService.getById('non-existent', mockUser))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should include applications when requested', async () => {
      const mockCandidate = {
        id: 'candidate-123',
        first_name: 'John',
        email: 'john@example.com',
        applications: [
          { id: 'app-1', job_title: 'Developer' }
        ]
      };

      mockCandidateRepository.findByIdWithApplications = jest.fn().mockResolvedValue(mockCandidate);

      const result = await candidateService.getById('candidate-123', mockUser, true);

      expect(result.applications).toBeDefined();
      expect(result.applications.length).toBe(1);
      expect(mockCandidateRepository.findByIdWithApplications).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update candidate successfully', async () => {
      const existingCandidate = {
        id: 'candidate-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      };

      const updateData = {
        first_name: 'Jane',
        phone: '+1234567890'
      };

      const updatedCandidate = {
        ...existingCandidate,
        ...updateData,
        updated_at: new Date()
      };

      mockCandidateRepository.findById = jest.fn().mockResolvedValue(existingCandidate);
      mockCandidateRepository.update = jest.fn().mockResolvedValue(updatedCandidate);

      const result = await candidateService.update('candidate-123', updateData, mockUser);

      expect(result.first_name).toBe('Jane');
      expect(result.phone).toBe('+1234567890');
      expect(mockCandidateRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError when updating non-existent candidate', async () => {
      mockCandidateRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(candidateService.update('non-existent', { first_name: 'Jane' }, mockUser))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should validate email uniqueness when updating email', async () => {
      const existingCandidate = {
        id: 'candidate-123',
        email: 'john@example.com'
      };

      const duplicateCandidate = {
        id: 'candidate-456',
        email: 'jane@example.com'
      };

      mockCandidateRepository.findById = jest.fn().mockResolvedValue(existingCandidate);
      mockCandidateRepository.findByEmail = jest.fn().mockResolvedValue(duplicateCandidate);

      await expect(
        candidateService.update('candidate-123', { email: 'jane@example.com' }, mockUser)
      ).rejects.toThrow(BusinessRuleError);
    });
  });

  describe('delete', () => {
    it('should soft delete candidate successfully', async () => {
      const mockCandidate = {
        id: 'candidate-123',
        email: 'john@example.com'
      };

      mockCandidateRepository.findById = jest.fn().mockResolvedValue(mockCandidate);
      mockCandidateRepository.delete = jest.fn().mockResolvedValue(true);

      const result = await candidateService.delete('candidate-123', mockUser);

      expect(result).toBe(true);
      expect(mockCandidateRepository.delete).toHaveBeenCalledWith('candidate-123', 'org-123');
    });

    it('should throw NotFoundError when deleting non-existent candidate', async () => {
      mockCandidateRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(candidateService.delete('non-existent', mockUser))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('search', () => {
    it('should search candidates with filters', async () => {
      const mockSearchResult = {
        candidates: [
          { id: 'candidate-1', first_name: 'John' },
          { id: 'candidate-2', first_name: 'Jane' }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      };

      mockCandidateRepository.search = jest.fn().mockResolvedValue(mockSearchResult);

      const result = await candidateService.search(
        { search: 'John', status: 'new', page: 1, limit: 20 },
        mockUser
      );

      expect(result.candidates).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockCandidateRepository.search).toHaveBeenCalled();
    });
  });

  describe('checkCandidateLimit', () => {
    it('should return limit info when under limit', async () => {
      const mockOrg = {
        id: 'org-123',
        max_candidates: 100
      };

      mockOrganization.findById = jest.fn().mockResolvedValue(mockOrg);

      mockCandidateRepository.count = jest.fn().mockResolvedValue(50);

      const result = await candidateService.checkCandidateLimit(mockUser);

      expect(result.canCreate).toBe(true);
      expect(result.current).toBe(50);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(50);
    });

    it('should throw BusinessRuleError when at limit', async () => {
      const mockOrg = {
        id: 'org-123',
        max_candidates: 100
      };

      mockOrganization.findById = jest.fn().mockResolvedValue(mockOrg);

      mockCandidateRepository.count = jest.fn().mockResolvedValue(100);

      await expect(candidateService.checkCandidateLimit(mockUser))
        .rejects
        .toThrow(BusinessRuleError);
    });
  });

  describe('bulkImport', () => {
    it('should import multiple candidates successfully', async () => {
      const candidatesData = [
        { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' }
      ];

      const mockOrg = {
        id: 'org-123',
        max_candidates: 100
      };

      mockOrganization.findById = jest.fn().mockResolvedValue(mockOrg);

      mockCandidateRepository.count = jest.fn().mockResolvedValue(50);
      mockCandidateRepository.findByEmail = jest.fn().mockResolvedValue(null);
      mockCandidateRepository.create = jest.fn()
        .mockResolvedValueOnce({ id: 'candidate-1', ...candidatesData[0] })
        .mockResolvedValueOnce({ id: 'candidate-2', ...candidatesData[1] });

      const result = await candidateService.bulkImport(candidatesData, mockUser);

      expect(result.success).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle partial failures in bulk import', async () => {
      const candidatesData = [
        { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { first_name: 'Invalid' } // Missing required fields
      ];

      const mockOrg = {
        id: 'org-123',
        max_candidates: 100
      };

      mockOrganization.findById = jest.fn().mockResolvedValue(mockOrg);

      mockCandidateRepository.count = jest.fn().mockResolvedValue(50);
      mockCandidateRepository.findByEmail = jest.fn().mockResolvedValue(null);
      mockCandidateRepository.create = jest.fn()
        .mockResolvedValueOnce({ id: 'candidate-1', ...candidatesData[0] });

      const result = await candidateService.bulkImport(candidatesData, mockUser);

      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBeDefined();
    });
  });
});
