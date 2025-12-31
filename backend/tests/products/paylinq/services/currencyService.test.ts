/**
 * CurrencyService Test Suite
 * 
 * Tests for PayLinQ currency service following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Dependency injection pattern  
 * - Caching behavior validation
 * - Exchange rate calculations
 * - Batch conversion operations
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import CurrencyService from '../../../../src/products/paylinq/services/currencyService.js';

describe('CurrencyService', () => {
  let service: any;
  let mockRepository: any;
  let mockApprovalService: any;
  let mockRedisClient: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';

  /**
   * Helper to create DB format exchange rate (snake_case)
   */
  const createDbExchangeRate = (overrides: any = {}) => ({
    id: '323e4567-e89b-12d3-a456-426614174002',
    organization_id: testOrganizationId,
    from_currency: 'USD',
    to_currency: 'EUR',
    rate: 0.85,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    source: 'manual',
    is_active: true,
    created_at: new Date('2025-01-01'),
    created_by: testUserId,
    ...overrides
  });

  beforeEach(() => {
    // Create comprehensive mock repository
    mockRepository = {
      getCurrentRate: jest.fn(),
      createRate: jest.fn(),
      updateRate: jest.fn(),
      getRateHistory: jest.fn(),
      deactivateRate: jest.fn()
    };

    mockApprovalService = {
      createApprovalRequest: jest.fn(),
      getApprovalStatus: jest.fn()
    };

    // Create mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      on: jest.fn()
    };

    // Mock environment variables for testing
    process.env.USE_REDIS_CACHE = 'false'; // Disable Redis for unit tests
    process.env.USE_MATERIALIZED_VIEWS = 'false';
    process.env.USE_APPROVAL_WORKFLOW = 'false';

    // Inject mocks (note: CurrencyService doesn't have standard DI, needs refactoring)
    service = new CurrencyService();
    service.repository = mockRepository;
    service.approvalService = mockApprovalService;
    service.redisClient = null; // Disable Redis for tests
  });

  afterEach(() => {
    // Clear cache after each test
    if (service.cache) {
      service.cache.flushAll();
    }
  });

  // ==================== EXCHANGE RATE RETRIEVAL ====================

  describe('getExchangeRate', () => {
    it('should return rate 1.0 for same currency', async () => {
      const result = await service.getExchangeRate(
        testOrganizationId,
        'USD',
        'USD',
        new Date()
      );

      expect(result.rate).toBe(1.0);
      expect(result.from_currency).toBe('USD');
      expect(result.to_currency).toBe('USD');
      expect(result.source).toBe('identity');
      expect(mockRepository.getCurrentRate).not.toHaveBeenCalled();
    });

    it('should get exchange rate from repository when not cached', async () => {
      const dbRate = createDbExchangeRate({
        from_currency: 'USD',
        to_currency: 'EUR',
        rate: 0.85
      });

      mockRepository.getCurrentRate.mockResolvedValue(dbRate);

      const result = await service.getExchangeRate(
        testOrganizationId,
        'USD',
        'EUR',
        new Date()
      );

      expect(result).toEqual(dbRate);
      expect(mockRepository.getCurrentRate).toHaveBeenCalledWith(
        testOrganizationId,
        'USD',
        'EUR',
        expect.any(Date)
      );
    });

    it('should cache exchange rate after first retrieval', async () => {
      const dbRate = createDbExchangeRate();
      mockRepository.getCurrentRate.mockResolvedValue(dbRate);

      // First call - should hit repository
      await service.getExchangeRate(testOrganizationId, 'USD', 'EUR');
      expect(mockRepository.getCurrentRate).toHaveBeenCalledTimes(1);

      // Second call - should hit cache
      await service.getExchangeRate(testOrganizationId, 'USD', 'EUR');
      expect(mockRepository.getCurrentRate).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should invert rate when direct rate not found', async () => {
      // No direct USD→EUR rate
      mockRepository.getCurrentRate.mockResolvedValueOnce(null);
      
      // But EUR→USD rate exists
      mockRepository.getCurrentRate.mockResolvedValueOnce(
        createDbExchangeRate({
          from_currency: 'EUR',
          to_currency: 'USD',
          rate: 1.18 // EUR to USD
        })
      );

      const result = await service.getExchangeRate(
        testOrganizationId,
        'USD',
        'EUR'
      );

      // Should invert: 1 / 1.18 ≈ 0.8475
      expect(result.from_currency).toBe('USD');
      expect(result.to_currency).toBe('EUR');
      expect(result.rate).toBeCloseTo(0.8475, 4);
      expect(result.source).toContain('inverted');
    });

    it('should throw error when no rate found', async () => {
      mockRepository.getCurrentRate.mockResolvedValue(null);

      await expect(
        service.getExchangeRate(testOrganizationId, 'USD', 'XXX')
      ).rejects.toThrow();
    });
  });

  // ==================== CURRENCY CONVERSION ====================

  describe('convertAmount', () => {
    it('should convert amount using exchange rate', async () => {
      const dbRate = createDbExchangeRate({
        from_currency: 'USD',
        to_currency: 'EUR',
        rate: 0.85
      });

      mockRepository.getCurrentRate.mockResolvedValue(dbRate);

      const result = await service.convertAmount(
        testOrganizationId,
        100, // $100 USD
        'USD',
        'EUR'
      );

      expect(result.convertedAmount).toBeCloseTo(85.0, 2); // €85
      expect(result.fromAmount).toBe(100);
      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('EUR');
      expect(result.rate).toBe(0.85);
    });

    it('should return same amount for same currency', async () => {
      const result = await service.convertAmount(
        testOrganizationId,
        100,
        'USD',
        'USD'
      );

      expect(result.convertedAmount).toBe(100);
      expect(result.rate).toBe(1.0);
      expect(mockRepository.getCurrentRate).not.toHaveBeenCalled();
    });

    it('should handle negative amounts', async () => {
      const dbRate = createDbExchangeRate({ rate: 0.85 });
      mockRepository.getCurrentRate.mockResolvedValue(dbRate);

      const result = await service.convertAmount(
        testOrganizationId,
        -100,
        'USD',
        'EUR'
      );

      expect(result.convertedAmount).toBeCloseTo(-85.0, 2);
    });

    it('should handle zero amount', async () => {
      const dbRate = createDbExchangeRate({ rate: 0.85 });
      mockRepository.getCurrentRate.mockResolvedValue(dbRate);

      const result = await service.convertAmount(
        testOrganizationId,
        0,
        'USD',
        'EUR'
      );

      expect(result.convertedAmount).toBe(0);
    });
  });

  // ==================== BATCH OPERATIONS ====================

  describe('convertBatch', () => {
    it('should convert multiple amounts in parallel', async () => {
      const amounts = [
        { amount: 100, fromCurrency: 'USD', toCurrency: 'EUR' },
        { amount: 200, fromCurrency: 'USD', toCurrency: 'GBP' },
        { amount: 300, fromCurrency: 'EUR', toCurrency: 'USD' }
      ];

      mockRepository.getCurrentRate
        .mockResolvedValueOnce(createDbExchangeRate({ 
          from_currency: 'USD', 
          to_currency: 'EUR', 
          rate: 0.85 
        }))
        .mockResolvedValueOnce(createDbExchangeRate({ 
          from_currency: 'USD', 
          to_currency: 'GBP', 
          rate: 0.73 
        }))
        .mockResolvedValueOnce(createDbExchangeRate({ 
          from_currency: 'EUR', 
          to_currency: 'USD', 
          rate: 1.18 
        }));

      const results = await service.convertBatch(testOrganizationId, amounts);

      expect(results).toHaveLength(3);
      expect(results[0].convertedAmount).toBeCloseTo(85.0, 2);
      expect(results[1].convertedAmount).toBeCloseTo(146.0, 2);
      expect(results[2].convertedAmount).toBeCloseTo(354.0, 2);
    });

    it('should handle partial failures in batch', async () => {
      const amounts = [
        { amount: 100, fromCurrency: 'USD', toCurrency: 'EUR' },
        { amount: 200, fromCurrency: 'USD', toCurrency: 'INVALID' }
      ];

      mockRepository.getCurrentRate
        .mockResolvedValueOnce(createDbExchangeRate({ rate: 0.85 }))
        .mockRejectedValueOnce(new Error('Currency not found'));

      const results = await service.convertBatch(testOrganizationId, amounts);

      expect(results[0].success).toBe(true);
      expect(results[0].convertedAmount).toBeCloseTo(85.0, 2);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
    });
  });

  // ==================== RATE MANAGEMENT ====================

  describe('createExchangeRate', () => {
    it('should create new exchange rate', async () => {
      const rateData = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        rate: 0.85,
        effectiveFrom: new Date('2025-01-01'),
        source: 'manual'
      };

      const dbRate = createDbExchangeRate(rateData);
      mockRepository.createRate.mockResolvedValue(dbRate);

      const result = await service.createExchangeRate(
        rateData,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(dbRate);
      expect(mockRepository.createRate).toHaveBeenCalledWith(
        expect.objectContaining({
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          rate: 0.85
        }),
        testOrganizationId,
        testUserId
      );
    });

    it('should clear cache when creating new rate', async () => {
      const dbRate = createDbExchangeRate();
      mockRepository.createRate.mockResolvedValue(dbRate);
      
      const cacheKey = `rate:${testOrganizationId}:USD:EUR`;
      service.cache.set(cacheKey, { rate: 0.80 }); // Old cached rate

      await service.createExchangeRate(
        { fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.85 },
        testOrganizationId,
        testUserId
      );

      // Cache should be cleared
      expect(service.cache.get(cacheKey)).toBeUndefined();
    });

    it('should validate rate is positive', async () => {
      await expect(
        service.createExchangeRate(
          { fromCurrency: 'USD', toCurrency: 'EUR', rate: -0.85 },
          testOrganizationId,
          testUserId
        )
      ).rejects.toThrow(/positive/);
    });

    it('should validate currency codes are different', async () => {
      await expect(
        service.createExchangeRate(
          { fromCurrency: 'USD', toCurrency: 'USD', rate: 1.0 },
          testOrganizationId,
          testUserId
        )
      ).rejects.toThrow(/same currency/);
    });
  });

  describe('updateExchangeRate', () => {
    it('should update existing exchange rate', async () => {
      const rateId = '423e4567-e89b-12d3-a456-426614174003';
      const updates = {
        rate: 0.87,
        effectiveFrom: new Date('2025-02-01')
      };

      const updatedRate = createDbExchangeRate({ rate: 0.87 });
      mockRepository.updateRate.mockResolvedValue(updatedRate);

      const result = await service.updateExchangeRate(
        rateId,
        updates,
        testOrganizationId,
        testUserId
      );

      expect(result.rate).toBe(0.87);
      expect(mockRepository.updateRate).toHaveBeenCalledWith(
        rateId,
        updates,
        testOrganizationId,
        testUserId
      );
    });

    it('should clear cache when updating rate', async () => {
      const rateId = '423e4567-e89b-12d3-a456-426614174003';
      const updatedRate = createDbExchangeRate({ rate: 0.87 });
      mockRepository.updateRate.mockResolvedValue(updatedRate);
      
      const cacheKey = `rate:${testOrganizationId}:USD:EUR`;
      service.cache.set(cacheKey, { rate: 0.85 }); // Old cached rate

      await service.updateExchangeRate(
        rateId,
        { rate: 0.87 },
        testOrganizationId,
        testUserId
      );

      // Cache should be cleared
      expect(service.cache.get(cacheKey)).toBeUndefined();
    });
  });

  describe('deactivateExchangeRate', () => {
    it('should deactivate exchange rate', async () => {
      const rateId = '423e4567-e89b-12d3-a456-426614174003';
      mockRepository.deactivateRate.mockResolvedValue(true);

      const result = await service.deactivateExchangeRate(
        rateId,
        testOrganizationId,
        testUserId
      );

      expect(result).toBe(true);
      expect(mockRepository.deactivateRate).toHaveBeenCalledWith(
        rateId,
        testOrganizationId,
        testUserId
      );
    });

    it('should clear cache when deactivating rate', async () => {
      const rateId = '423e4567-e89b-12d3-a456-426614174003';
      mockRepository.deactivateRate.mockResolvedValue(true);
      
      const cacheKey = `rate:${testOrganizationId}:USD:EUR`;
      service.cache.set(cacheKey, { rate: 0.85 });

      await service.deactivateExchangeRate(
        rateId,
        testOrganizationId,
        testUserId
      );

      expect(service.cache.get(cacheKey)).toBeUndefined();
    });
  });

  // ==================== RATE HISTORY ====================

  describe('getRateHistory', () => {
    it('should return rate history for currency pair', async () => {
      const mockHistory = [
        createDbExchangeRate({ 
          rate: 0.87, 
          effective_from: new Date('2025-02-01') 
        }),
        createDbExchangeRate({ 
          rate: 0.85, 
          effective_from: new Date('2025-01-01'),
          effective_to: new Date('2025-01-31')
        })
      ];

      mockRepository.getRateHistory.mockResolvedValue(mockHistory);

      const result = await service.getRateHistory(
        testOrganizationId,
        'USD',
        'EUR',
        { startDate: new Date('2025-01-01'), endDate: new Date('2025-02-28') }
      );

      expect(result).toEqual(mockHistory);
      expect(result).toHaveLength(2);
      expect(mockRepository.getRateHistory).toHaveBeenCalledWith(
        testOrganizationId,
        'USD',
        'EUR',
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        })
      );
    });
  });

  // ==================== CACHE MANAGEMENT ====================

  describe('clearCache', () => {
    it('should clear all cached rates', () => {
      service.cache.set('rate:org1:USD:EUR', { rate: 0.85 });
      service.cache.set('rate:org1:USD:GBP', { rate: 0.73 });

      service.clearCache();

      expect(service.cache.get('rate:org1:USD:EUR')).toBeUndefined();
      expect(service.cache.get('rate:org1:USD:GBP')).toBeUndefined();
    });

    it('should clear specific currency pair from cache', () => {
      service.cache.set(`rate:${testOrganizationId}:USD:EUR`, { rate: 0.85 });
      service.cache.set(`rate:${testOrganizationId}:USD:GBP`, { rate: 0.73 });

      service.clearCacheForPair(testOrganizationId, 'USD', 'EUR');

      expect(service.cache.get(`rate:${testOrganizationId}:USD:EUR`)).toBeUndefined();
      expect(service.cache.get(`rate:${testOrganizationId}:USD:GBP`)).toBeDefined();
    });
  });
});
