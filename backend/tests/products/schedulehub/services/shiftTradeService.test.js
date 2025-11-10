/**
 * Shift Trade Service Tests
 * Unit tests for ShiftTradeService business logic
 */

import ShiftTradeService from '../../../../src/products/schedulehub/services/shiftTradeService.js';
import pool from '../../../../src/config/database.js';
import { 
  createMockSwapOffer, 
  createMockSwapRequest,
  createMockShift,
  createMockPool 
} from '../factories/testData.js';

describe('ShiftTradeService', () => {
  let service;
  let mockPool;
  const organizationId = 'org-123';
  const userId = 'user-456';

  beforeEach(() => {
    service = new ShiftTradeService();
    mockPool = createMockPool();
    pool.query = mockPool.query;
  });

  describe('createSwapOffer', () => {
    test('should create open swap offer', async () => {
      const offerData = {
        offeredShiftId: 'shift-123',
        offeringWorkerId: 'worker-123',
        swapType: 'open',
        reason: 'Personal commitment'
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockShift()] }) // Get shift
          .mockResolvedValueOnce({ rows: [createMockSwapOffer(offerData)] }) // Create offer
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.createSwapOffer(offerData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.swap_type).toBe('open');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should create direct swap offer', async () => {
      const offerData = {
        offeredShiftId: 'shift-123',
        offeringWorkerId: 'worker-123',
        swapType: 'direct',
        targetWorkerId: 'worker-456',
        reason: 'Swap with coworker'
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockShift()] }) // Get shift
          .mockResolvedValueOnce({ rows: [createMockSwapOffer(offerData)] }) // Create offer
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.createSwapOffer(offerData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.swap_type).toBe('direct');
      expect(result.data.target_worker_id).toBe('worker-456');
    });

    test('should create trade swap offer', async () => {
      const offerData = {
        offeredShiftId: 'shift-123',
        offeringWorkerId: 'worker-123',
        swapType: 'trade',
        requestedShiftId: 'shift-456',
        reason: 'Trade shifts'
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockShift()] }) // Get offered shift
          .mockResolvedValueOnce({ rows: [createMockShift()] }) // Get requested shift
          .mockResolvedValueOnce({ rows: [createMockSwapOffer(offerData)] }) // Create offer
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.createSwapOffer(offerData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.swap_type).toBe('trade');
      expect(result.data.requested_shift_id).toBeDefined();
    });

    test('should validate swap type enum', async () => {
      const invalidData = {
        offeredShiftId: 'shift-123',
        offeringWorkerId: 'worker-123',
        swapType: 'invalid_type'
      };

      await expect(
        service.createSwapOffer(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate direct swap has target worker', async () => {
      const invalidData = {
        offeredShiftId: 'shift-123',
        offeringWorkerId: 'worker-123',
        swapType: 'direct'
        // Missing targetWorkerId
      };

      await expect(
        service.createSwapOffer(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate trade swap has requested shift', async () => {
      const invalidData = {
        offeredShiftId: 'shift-123',
        offeringWorkerId: 'worker-123',
        swapType: 'trade'
        // Missing requestedShiftId
      };

      await expect(
        service.createSwapOffer(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should not allow swapping completed shifts', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockShift({ status: 'completed' })] }),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      await expect(
        service.createSwapOffer({
          offeredShiftId: 'shift-123',
          offeringWorkerId: 'worker-123',
          swapType: 'open'
        }, organizationId, userId)
      ).rejects.toThrow('Cannot swap completed shift');
    });
  });

  describe('requestSwap', () => {
    test('should create swap request for open offer', async () => {
      const offerId = 'offer-123';
      const requestingWorkerId = 'worker-456';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSwapOffer({ swap_type: 'open', status: 'pending' })] }) // Get offer
          .mockResolvedValueOnce({ rows: [createMockSwapRequest()] }) // Create request
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.requestSwap(offerId, requestingWorkerId, organizationId, null, userId);

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should create swap request with trade offer', async () => {
      const offerId = 'offer-123';
      const requestingWorkerId = 'worker-456';
      const offeredShiftId = 'shift-789';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSwapOffer({ swap_type: 'trade', status: 'pending' })] }) // Get offer
          .mockResolvedValueOnce({ rows: [createMockShift()] }) // Validate offered shift
          .mockResolvedValueOnce({ rows: [createMockSwapRequest()] }) // Create request
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.requestSwap(offerId, requestingWorkerId, organizationId, offeredShiftId, userId);

      expect(result.success).toBe(true);
    });

    test('should not allow requesting completed offer', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSwapOffer({ status: 'completed' })] }),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      await expect(
        service.requestSwap('offer-123', 'worker-456', organizationId, null, userId)
      ).rejects.toThrow('Offer is no longer available');
    });

    test('should validate trade requires offered shift', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSwapOffer({ swap_type: 'trade' })] }),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      await expect(
        service.requestSwap('offer-123', 'worker-456', organizationId, null, userId)
      ).rejects.toThrow('Trade swaps require an offered shift');
    });
  });

  describe('acceptSwapRequest', () => {
    test('should accept swap request without approval', async () => {
      const requestId = 'request-123';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSwapRequest({ status: 'pending' })] }) // Get request
          .mockResolvedValueOnce({ rows: [createMockSwapOffer()] }) // Get offer
          .mockResolvedValueOnce({ rows: [createMockSwapRequest({ status: 'accepted' })] }) // Update request
          .mockResolvedValueOnce({ rows: [createMockSwapOffer({ status: 'completed' })] }) // Update offer
          .mockResolvedValueOnce({ rows: [createMockShift()] }) // Update shift assignment
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.acceptSwapRequest(requestId, organizationId, false, userId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('completed');
    });

    test('should accept swap request with approval required', async () => {
      const requestId = 'request-123';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSwapRequest()] }) // Get request
          .mockResolvedValueOnce({ rows: [createMockSwapOffer()] }) // Get offer
          .mockResolvedValueOnce({ rows: [createMockSwapRequest({ status: 'accepted' })] }) // Update request
          .mockResolvedValueOnce({ rows: [createMockSwapOffer({ status: 'pending_approval' })] }) // Update offer
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.acceptSwapRequest(requestId, organizationId, true, userId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('pending manager approval');
    });

    test('should not accept already accepted request', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSwapRequest({ status: 'accepted' })] }),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      await expect(
        service.acceptSwapRequest('request-123', organizationId, false, userId)
      ).rejects.toThrow('already been accepted');
    });
  });

  describe('approveSwap', () => {
    test('should approve swap and execute transfer', async () => {
      const offerId = 'offer-123';
      const requestId = 'request-123';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSwapOffer({ status: 'pending_approval' })] }) // Get offer
          .mockResolvedValueOnce({ rows: [createMockSwapRequest()] }) // Get request
          .mockResolvedValueOnce({ rows: [createMockSwapOffer({ status: 'completed' })] }) // Update offer
          .mockResolvedValueOnce({ rows: [createMockShift()] }) // Update shift
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.approveSwap(offerId, requestId, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('approved');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scheduling.shifts'),
        expect.anything()
      );
    });

    test('should not approve already completed swap', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSwapOffer({ status: 'completed' })] }),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      await expect(
        service.approveSwap('offer-123', 'request-123', organizationId, userId)
      ).rejects.toThrow('already been completed');
    });
  });

  describe('getOpenOffers', () => {
    test('should return open marketplace offers', async () => {
      const mockOffers = [
        createMockSwapOffer({ swap_type: 'open', status: 'pending' }),
        createMockSwapOffer({ swap_type: 'open', status: 'pending' })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockOffers });

      const result = await service.getOpenOffers(organizationId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.every(o => o.status === 'pending')).toBe(true);
    });

    test('should filter by date range', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.getOpenOffers(organizationId, '2024-01-01', '2024-01-31');

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('shift_date >=');
      expect(queryCall[0]).toContain('shift_date <=');
    });

    test('should filter by role', async () => {
      const roleId = 'role-123';
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.getOpenOffers(organizationId, null, null, roleId);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('role_id');
      expect(queryCall[1]).toContain(roleId);
    });
  });

  describe('cancelOffer', () => {
    test('should cancel pending offer', async () => {
      const offerId = 'offer-123';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSwapOffer({ status: 'pending' })] }) // Get offer
          .mockResolvedValueOnce({ rows: [createMockSwapOffer({ status: 'cancelled' })] }) // Update offer
          .mockResolvedValueOnce({ rows: [] }) // Reject pending requests
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      const result = await service.cancelOffer(offerId, organizationId);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('cancelled');
    });

    test('should not cancel completed offer', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createMockSwapOffer({ status: 'completed' })] }),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValueOnce(mockClient);

      await expect(
        service.cancelOffer('offer-123', organizationId)
      ).rejects.toThrow('Cannot cancel completed swap');
    });
  });
});
