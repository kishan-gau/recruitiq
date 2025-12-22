import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ShiftTradeService from '../../../../../src/products/schedulehub/services/shiftTradeService.js';
import ShiftTradeRepository from '../../../../../src/products/schedulehub/repositories/ShiftTradeRepository.js';
import ShiftService from '../../../../../src/products/schedulehub/services/shiftService.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../../../src/utils/errors.js';

describe('ShiftTradeService', () => {
  let service;
  let mockRepository;
  let mockShiftService;

  // Helper function to generate DB format data (snake_case)
  const createDbShiftTrade = (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    organization_id: 'org-123e4567-e89b-12d3-a456-426614174000',
    from_shift_id: 'shift-123e4567-e89b-12d3-a456-426614174000',
    to_shift_id: 'shift-223e4567-e89b-12d3-a456-426614174001',
    requesting_worker_id: 'worker-123e4567-e89b-12d3-a456-426614174000',
    responding_worker_id: 'worker-223e4567-e89b-12d3-a456-426614174001',
    status: 'pending',
    requested_at: new Date('2025-01-10T09:00:00Z'),
    responded_at: null,
    notes: 'Need to swap shifts for family event',
    manager_notes: null,
    approved_by: null,
    approved_at: null,
    expires_at: new Date('2025-01-15T09:00:00Z'),
    created_at: new Date('2025-01-10T09:00:00Z'),
    updated_at: new Date('2025-01-10T09:00:00Z'),
    ...overrides
  });

  const createShiftData = (overrides = {}) => ({
    id: 'shift-123e4567-e89b-12d3-a456-426614174000',
    organization_id: 'org-123e4567-e89b-12d3-a456-426614174000',
    assigned_worker_id: 'worker-123e4567-e89b-12d3-a456-426614174000',
    shift_date: '2025-01-20',
    start_time: '09:00:00',
    end_time: '17:00:00',
    status: 'scheduled',
    ...overrides
  });

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      findByWorker: jest.fn(),
      findPendingTrades: jest.fn(),
      countActiveTradesForWorker: jest.fn(),
      softDelete: jest.fn()
    };

    mockShiftService = {
      getById: jest.fn()
    };

    service = new ShiftTradeService(mockRepository, mockShiftService);
  });

  describe('requestTrade', () => {
    it('should create shift trade request with valid data', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const requestingWorkerId = 'worker-123e4567-e89b-12d3-a456-426614174000';
      const tradeData = {
        fromShiftId: 'shift-123e4567-e89b-12d3-a456-426614174000',
        toShiftId: 'shift-223e4567-e89b-12d3-a456-426614174001',
        notes: 'Family emergency, need to swap',
        expiresAt: new Date('2025-01-20T23:59:59Z')
      };

      const fromShift = createShiftData({ 
        id: tradeData.fromShiftId,
        assigned_worker_id: requestingWorkerId,
        shift_date: '2025-01-20'
      });
      const toShift = createShiftData({ 
        id: tradeData.toShiftId,
        assigned_worker_id: 'worker-223e4567-e89b-12d3-a456-426614174001',
        shift_date: '2025-01-21'
      });

      const dbTrade = createDbShiftTrade({
        from_shift_id: tradeData.fromShiftId,
        to_shift_id: tradeData.toShiftId,
        requesting_worker_id: requestingWorkerId,
        responding_worker_id: toShift.assigned_worker_id,
        notes: tradeData.notes,
        expires_at: tradeData.expiresAt
      });

      mockShiftService.getById.mockResolvedValueOnce(fromShift);
      mockShiftService.getById.mockResolvedValueOnce(toShift);
      mockRepository.countActiveTradesForWorker.mockResolvedValue(0);
      mockRepository.create.mockResolvedValue(dbTrade);

      const result = await service.requestTrade(tradeData, orgId, requestingWorkerId);

      expect(mockShiftService.getById).toHaveBeenCalledWith(tradeData.fromShiftId, orgId);
      expect(mockShiftService.getById).toHaveBeenCalledWith(tradeData.toShiftId, orgId);
      expect(mockRepository.countActiveTradesForWorker).toHaveBeenCalledWith(requestingWorkerId, orgId);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          from_shift_id: tradeData.fromShiftId,
          to_shift_id: tradeData.toShiftId,
          requesting_worker_id: requestingWorkerId,
          responding_worker_id: toShift.assigned_worker_id,
          notes: tradeData.notes,
          expires_at: tradeData.expiresAt,
          status: 'pending'
        }),
        orgId
      );
      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
    });

    it('should throw ForbiddenError when requesting worker is not assigned to from shift', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const requestingWorkerId = 'worker-123e4567-e89b-12d3-a456-426614174000';
      const tradeData = {
        fromShiftId: 'shift-123e4567-e89b-12d3-a456-426614174000',
        toShiftId: 'shift-223e4567-e89b-12d3-a456-426614174001'
      };

      const fromShift = createShiftData({ 
        id: tradeData.fromShiftId,
        assigned_worker_id: 'different-worker-id' // Different worker assigned
      });

      mockShiftService.getById.mockResolvedValue(fromShift);

      await expect(
        service.requestTrade(tradeData, orgId, requestingWorkerId)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError when worker has too many active trades', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const requestingWorkerId = 'worker-123e4567-e89b-12d3-a456-426614174000';
      const tradeData = {
        fromShiftId: 'shift-123e4567-e89b-12d3-a456-426614174000',
        toShiftId: 'shift-223e4567-e89b-12d3-a456-426614174001'
      };

      const fromShift = createShiftData({ 
        id: tradeData.fromShiftId,
        assigned_worker_id: requestingWorkerId
      });
      const toShift = createShiftData({ id: tradeData.toShiftId });

      mockShiftService.getById.mockResolvedValueOnce(fromShift);
      mockShiftService.getById.mockResolvedValueOnce(toShift);
      mockRepository.countActiveTradesForWorker.mockResolvedValue(5); // Max allowed

      await expect(
        service.requestTrade(tradeData, orgId, requestingWorkerId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('respondToTrade', () => {
    it('should accept trade request', async () => {
      const tradeId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const respondingWorkerId = 'worker-223e4567-e89b-12d3-a456-426614174001';
      const response = 'accept';

      const existingTrade = createDbShiftTrade({
        responding_worker_id: respondingWorkerId,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Not expired
      });

      const updatedTrade = {
        ...existingTrade,
        status: 'accepted',
        responded_at: new Date()
      };

      mockRepository.findById.mockResolvedValue(existingTrade);
      mockRepository.update.mockResolvedValue(updatedTrade);

      const result = await service.respondToTrade(tradeId, response, orgId, respondingWorkerId);

      expect(mockRepository.findById).toHaveBeenCalledWith(tradeId, orgId);
      expect(mockRepository.update).toHaveBeenCalledWith(
        tradeId,
        expect.objectContaining({
          status: 'accepted',
          responded_at: expect.any(Date)
        }),
        orgId
      );
      expect(result.status).toBe('accepted');
    });

    it('should reject trade request', async () => {
      const tradeId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const respondingWorkerId = 'worker-223e4567-e89b-12d3-a456-426614174001';
      const response = 'reject';

      const existingTrade = createDbShiftTrade({
        responding_worker_id: respondingWorkerId,
        status: 'pending'
      });

      const updatedTrade = {
        ...existingTrade,
        status: 'rejected',
        responded_at: new Date()
      };

      mockRepository.findById.mockResolvedValue(existingTrade);
      mockRepository.update.mockResolvedValue(updatedTrade);

      const result = await service.respondToTrade(tradeId, response, orgId, respondingWorkerId);

      expect(result.status).toBe('rejected');
    });

    it('should throw ForbiddenError when worker is not the responding worker', async () => {
      const tradeId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const wrongWorkerId = 'wrong-worker-id';
      const response = 'accept';

      const existingTrade = createDbShiftTrade({
        responding_worker_id: 'worker-223e4567-e89b-12d3-a456-426614174001' // Different worker
      });

      mockRepository.findById.mockResolvedValue(existingTrade);

      await expect(
        service.respondToTrade(tradeId, response, orgId, wrongWorkerId)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError when trade has expired', async () => {
      const tradeId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const respondingWorkerId = 'worker-223e4567-e89b-12d3-a456-426614174001';
      const response = 'accept';

      const expiredTrade = createDbShiftTrade({
        responding_worker_id: respondingWorkerId,
        status: 'pending',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired
      });

      mockRepository.findById.mockResolvedValue(expiredTrade);

      await expect(
        service.respondToTrade(tradeId, response, orgId, respondingWorkerId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('approveOrRejectTrade', () => {
    it('should approve accepted trade request', async () => {
      const tradeId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const managerId = 'manager-123e4567-e89b-12d3-a456-426614174000';
      const action = 'approve';
      const managerNotes = 'Approved due to emergency';

      const acceptedTrade = createDbShiftTrade({
        status: 'accepted',
        responded_at: new Date()
      });

      const approvedTrade = {
        ...acceptedTrade,
        status: 'approved',
        approved_by: managerId,
        approved_at: new Date(),
        manager_notes: managerNotes
      };

      mockRepository.findById.mockResolvedValue(acceptedTrade);
      mockRepository.update.mockResolvedValue(approvedTrade);

      const result = await service.approveOrRejectTrade(tradeId, action, managerNotes, orgId, managerId);

      expect(mockRepository.update).toHaveBeenCalledWith(
        tradeId,
        expect.objectContaining({
          status: 'approved',
          approved_by: managerId,
          approved_at: expect.any(Date),
          manager_notes: managerNotes
        }),
        orgId
      );
      expect(result.status).toBe('approved');
    });

    it('should reject accepted trade request', async () => {
      const tradeId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const managerId = 'manager-123e4567-e89b-12d3-a456-426614174000';
      const action = 'reject';
      const managerNotes = 'Does not meet coverage requirements';

      const acceptedTrade = createDbShiftTrade({
        status: 'accepted'
      });

      const rejectedTrade = {
        ...acceptedTrade,
        status: 'manager_rejected',
        approved_by: managerId,
        approved_at: new Date(),
        manager_notes: managerNotes
      };

      mockRepository.findById.mockResolvedValue(acceptedTrade);
      mockRepository.update.mockResolvedValue(rejectedTrade);

      const result = await service.approveOrRejectTrade(tradeId, action, managerNotes, orgId, managerId);

      expect(result.status).toBe('manager_rejected');
    });

    it('should throw ValidationError when trade is not in accepted status', async () => {
      const tradeId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const managerId = 'manager-123e4567-e89b-12d3-a456-426614174000';

      const pendingTrade = createDbShiftTrade({
        status: 'pending' // Not accepted yet
      });

      mockRepository.findById.mockResolvedValue(pendingTrade);

      await expect(
        service.approveOrRejectTrade(tradeId, 'approve', 'Notes', orgId, managerId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getTradeById', () => {
    it('should return trade when found', async () => {
      const tradeId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const dbTrade = createDbShiftTrade();

      mockRepository.findById.mockResolvedValue(dbTrade);

      const result = await service.getTradeById(tradeId, orgId);

      expect(mockRepository.findById).toHaveBeenCalledWith(tradeId, orgId);
      expect(result).toBeDefined();
      expect(result.status).toBe(dbTrade.status);
      expect(result.requestingWorkerId).toBe(dbTrade.requesting_worker_id);
    });

    it('should throw NotFoundError when trade not found', async () => {
      const tradeId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.getTradeById(tradeId, orgId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getTradesForWorker', () => {
    it('should return trades for worker', async () => {
      const workerId = 'worker-123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const dbTrades = [
        createDbShiftTrade({ requesting_worker_id: workerId }),
        createDbShiftTrade({ responding_worker_id: workerId })
      ];

      mockRepository.findByWorker.mockResolvedValue(dbTrades);

      const result = await service.getTradesForWorker(workerId, orgId);

      expect(mockRepository.findByWorker).toHaveBeenCalledWith(workerId, orgId);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });
  });

  describe('cancelTrade', () => {
    it('should cancel pending trade by requesting worker', async () => {
      const tradeId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const requestingWorkerId = 'worker-123e4567-e89b-12d3-a456-426614174000';

      const pendingTrade = createDbShiftTrade({
        requesting_worker_id: requestingWorkerId,
        status: 'pending'
      });

      const cancelledTrade = {
        ...pendingTrade,
        status: 'cancelled'
      };

      mockRepository.findById.mockResolvedValue(pendingTrade);
      mockRepository.update.mockResolvedValue(cancelledTrade);

      const result = await service.cancelTrade(tradeId, orgId, requestingWorkerId);

      expect(mockRepository.update).toHaveBeenCalledWith(
        tradeId,
        expect.objectContaining({
          status: 'cancelled'
        }),
        orgId
      );
      expect(result.status).toBe('cancelled');
    });

    it('should throw ForbiddenError when worker is not the requesting worker', async () => {
      const tradeId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const wrongWorkerId = 'wrong-worker-id';

      const pendingTrade = createDbShiftTrade({
        requesting_worker_id: 'worker-123e4567-e89b-12d3-a456-426614174000' // Different worker
      });

      mockRepository.findById.mockResolvedValue(pendingTrade);

      await expect(
        service.cancelTrade(tradeId, orgId, wrongWorkerId)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError when trade is not cancellable', async () => {
      const tradeId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const requestingWorkerId = 'worker-123e4567-e89b-12d3-a456-426614174000';

      const approvedTrade = createDbShiftTrade({
        requesting_worker_id: requestingWorkerId,
        status: 'approved' // Cannot cancel approved trade
      });

      mockRepository.findById.mockResolvedValue(approvedTrade);

      await expect(
        service.cancelTrade(tradeId, orgId, requestingWorkerId)
      ).rejects.toThrow(ValidationError);
    });
  });
});