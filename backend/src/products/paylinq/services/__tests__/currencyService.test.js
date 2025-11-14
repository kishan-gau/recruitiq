import { jest } from '@jest/globals';
import CurrencyService from '../currencyService.js';
import ExchangeRateRepository from '../../repositories/ExchangeRateRepository.js';

// Mock dependencies
jest.mock('../../repositories/ExchangeRateRepository.js');
jest.mock('../../../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}));

jest.mock('../../../../config/database.js', () => ({
  pool: {
    query: jest.fn(),
  }
}));

describe('CurrencyService', () => {
  let currencyService;
  let mockRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = {
      getCurrentRate: jest.fn(),
      getActiveRates: jest.fn(),
      getHistoricalRates: jest.fn(),
      createRate: jest.fn(),
      updateRate: jest.fn(),
      deleteRate: jest.fn(),
      bulkCreateRates: jest.fn(),
      logConversion: jest.fn(),
      getConversionHistory: jest.fn(),
    };
    
    ExchangeRateRepository.mockImplementation(() => mockRepository);
    currencyService = new CurrencyService();
  });

  describe('getExchangeRate', () => {
    const organizationId = 'org-123';
    const effectiveDate = new Date('2025-11-13');

    it('should return rate 1 for same currency', async () => {
      const rate = await currencyService.getExchangeRate(organizationId, 'USD', 'USD', effectiveDate);

      expect(rate).toEqual({
        from_currency: 'USD',
        to_currency: 'USD',
        rate: 1.0,
        source: 'identity',
        effective_from: expect.any(Date),
      });
      expect(mockRepository.getCurrentRate).not.toHaveBeenCalled();
    });

    it('should return cached rate if available', async () => {
      const mockRate = {
        id: 1,
        from_currency: 'USD',
        to_currency: 'SRD',
        rate: 21.5,
        source: 'manual',
        effective_from: effectiveDate,
      };

      mockRepository.getCurrentRate.mockResolvedValue(mockRate);

      // First call - should hit database
      const rate1 = await currencyService.getExchangeRate(organizationId, 'USD', 'SRD', effectiveDate);
      expect(rate1).toEqual(mockRate);
      expect(mockRepository.getCurrentRate).toHaveBeenCalledTimes(1);

      // Second call - should hit cache
      const rate2 = await currencyService.getExchangeRate(organizationId, 'USD', 'SRD', effectiveDate);
      expect(rate2).toEqual(mockRate);
      expect(mockRepository.getCurrentRate).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should invert rate if reverse pair exists', async () => {
      mockRepository.getCurrentRate
        .mockResolvedValueOnce(null) // Direct rate not found
        .mockResolvedValueOnce({ // Reverse rate found
          id: 1,
          from_currency: 'SRD',
          to_currency: 'USD',
          rate: 0.0465,
          source: 'manual',
          effective_from: effectiveDate,
        });

      const rate = await currencyService.getExchangeRate(organizationId, 'USD', 'SRD', effectiveDate);

      expect(rate.from_currency).toBe('USD');
      expect(rate.to_currency).toBe('SRD');
      expect(rate.rate).toBeCloseTo(21.505, 3); // 1 / 0.0465
      expect(rate.source).toBe('manual_inverted');
    });

    it('should triangulate rate via base currency', async () => {
      const { pool } = await import('../../../../config/database.js');
      
      pool.query.mockResolvedValue({
        rows: [{ base_currency: 'SRD' }]
      });

      mockRepository.getCurrentRate
        .mockResolvedValueOnce(null) // Direct USD->EUR not found
        .mockResolvedValueOnce(null) // Reverse EUR->USD not found
        .mockResolvedValueOnce({ // USD->SRD found
          rate: 21.5,
        })
        .mockResolvedValueOnce({ // SRD->EUR found
          rate: 0.047,
        });

      const rate = await currencyService.getExchangeRate(organizationId, 'USD', 'EUR', effectiveDate);

      expect(rate.from_currency).toBe('USD');
      expect(rate.to_currency).toBe('EUR');
      expect(rate.rate).toBeCloseTo(1.0105, 4); // 21.5 * 0.047
      expect(rate.source).toBe('triangulated');
      expect(rate.metadata.via).toBe('SRD');
    });

    it('should throw error if no rate found', async () => {
      mockRepository.getCurrentRate.mockResolvedValue(null);

      await expect(
        currencyService.getExchangeRate(organizationId, 'USD', 'JPY', effectiveDate)
      ).rejects.toThrow('Exchange rate not found for USD to JPY');
    });
  });

  describe('convertAmount', () => {
    const organizationId = 'org-123';

    beforeEach(() => {
      mockRepository.getCurrentRate.mockResolvedValue({
        id: 1,
        from_currency: 'USD',
        to_currency: 'SRD',
        rate: 21.5,
        source: 'manual',
      });
    });

    it('should convert amount correctly', async () => {
      const result = await currencyService.convertAmount({
        organizationId,
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'SRD',
      });

      expect(result.fromAmount).toBe(100);
      expect(result.toAmount).toBe(2150.00);
      expect(result.rate).toBe(21.5);
      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('SRD');
    });

    it('should apply half_up rounding by default', async () => {
      mockRepository.getCurrentRate.mockResolvedValue({
        id: 1,
        rate: 21.555,
        source: 'manual',
      });

      const result = await currencyService.convertAmount({
        organizationId,
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'SRD',
      });

      expect(result.toAmount).toBe(2155.50); // 100 * 21.555 = 2155.5 (half_up)
    });

    it('should log conversion when reference provided', async () => {
      mockRepository.logConversion.mockResolvedValue({
        id: 123,
      });

      const result = await currencyService.convertAmount({
        organizationId,
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'SRD',
        referenceType: 'paycheck',
        referenceId: 'paycheck-456',
        createdBy: 'user-789',
      });

      expect(result.conversionId).toBe(123);
      expect(mockRepository.logConversion).toHaveBeenCalledWith({
        organizationId,
        fromCurrency: 'USD',
        toCurrency: 'SRD',
        fromAmount: 100,
        toAmount: 2150,
        exchangeRateId: 1,
        rateUsed: 21.5,
        referenceType: 'paycheck',
        referenceId: 'paycheck-456',
        metadata: expect.any(Object),
        createdBy: 'user-789',
      });
    });

    it('should not fail if logging fails', async () => {
      mockRepository.logConversion.mockRejectedValue(new Error('Database error'));

      const result = await currencyService.convertAmount({
        organizationId,
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'SRD',
        referenceType: 'paycheck',
        referenceId: 'paycheck-456',
      });

      expect(result.toAmount).toBe(2150.00);
      expect(result.conversionId).toBeUndefined();
    });
  });

  describe('roundAmount', () => {
    it('should round up correctly', () => {
      expect(currencyService.roundAmount(2155.554, 2, 'up')).toBe(2155.56);
      expect(currencyService.roundAmount(2155.551, 2, 'up')).toBe(2155.56);
    });

    it('should round down correctly', () => {
      expect(currencyService.roundAmount(2155.554, 2, 'down')).toBe(2155.55);
      expect(currencyService.roundAmount(2155.559, 2, 'down')).toBe(2155.55);
    });

    it('should round half_up correctly', () => {
      expect(currencyService.roundAmount(2155.555, 2, 'half_up')).toBe(2155.56);
      expect(currencyService.roundAmount(2155.554, 2, 'half_up')).toBe(2155.55);
    });

    it('should round half_down correctly', () => {
      expect(currencyService.roundAmount(2155.555, 2, 'half_down')).toBe(2155.56);
      expect(currencyService.roundAmount(2155.545, 2, 'half_down')).toBe(2155.54);
    });

    it('should round half_even (bankers rounding) correctly', () => {
      expect(currencyService.roundAmount(2155.555, 2, 'half_even')).toBe(2155.56);
      expect(currencyService.roundAmount(2155.565, 2, 'half_even')).toBe(2155.56);
      expect(currencyService.roundAmount(2155.575, 2, 'half_even')).toBe(2155.58);
    });

    it('should handle different decimal places', () => {
      expect(currencyService.roundAmount(2155.5555, 0, 'half_up')).toBe(2156);
      expect(currencyService.roundAmount(2155.5555, 1, 'half_up')).toBe(2155.6);
      expect(currencyService.roundAmount(2155.5555, 3, 'half_up')).toBe(2155.556);
      expect(currencyService.roundAmount(2155.5555, 4, 'half_up')).toBe(2155.5555);
    });
  });

  describe('batchConvert', () => {
    const organizationId = 'org-123';

    beforeEach(() => {
      mockRepository.getCurrentRate
        .mockResolvedValueOnce({
          id: 1,
          rate: 21.5,
          source: 'manual',
        })
        .mockResolvedValueOnce({
          id: 2,
          rate: 0.92,
          source: 'ecb',
        });
    });

    it('should convert multiple amounts successfully', async () => {
      const conversions = [
        { amount: 100, fromCurrency: 'USD', toCurrency: 'SRD' },
        { amount: 200, fromCurrency: 'USD', toCurrency: 'EUR' },
      ];

      const results = await currencyService.batchConvert(organizationId, conversions);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].toAmount).toBe(2150.00);
      expect(results[1].success).toBe(true);
      expect(results[1].toAmount).toBe(184.00);
    });

    it('should handle errors gracefully in batch', async () => {
      mockRepository.getCurrentRate
        .mockResolvedValueOnce({
          id: 1,
          rate: 21.5,
          source: 'manual',
        })
        .mockRejectedValueOnce(new Error('Rate not found'));

      const conversions = [
        { amount: 100, fromCurrency: 'USD', toCurrency: 'SRD' },
        { amount: 200, fromCurrency: 'USD', toCurrency: 'JPY' },
      ];

      const results = await currencyService.batchConvert(organizationId, conversions);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
    });
  });

  describe('createExchangeRate', () => {
    it('should create rate and clear cache', async () => {
      const rateData = {
        organizationId: 'org-123',
        fromCurrency: 'USD',
        toCurrency: 'SRD',
        rate: 21.5,
        createdBy: 'user-123',
      };

      mockRepository.createRate.mockResolvedValue({
        id: 1,
        ...rateData,
      });

      const result = await currencyService.createExchangeRate(rateData);

      expect(result.id).toBe(1);
      expect(mockRepository.createRate).toHaveBeenCalledWith(rateData);
    });
  });

  describe('updateExchangeRate', () => {
    it('should update rate and clear cache', async () => {
      const updateData = {
        rate: 22.0,
        updatedBy: 'user-123',
      };

      mockRepository.updateRate.mockResolvedValue({
        id: 1,
        rate: 22.0,
      });

      const result = await currencyService.updateExchangeRate(1, updateData);

      expect(result.rate).toBe(22.0);
      expect(mockRepository.updateRate).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe('deleteExchangeRate', () => {
    it('should delete rate and clear cache', async () => {
      mockRepository.deleteRate.mockResolvedValue({
        id: 1,
        effective_to: new Date(),
      });

      const result = await currencyService.deleteExchangeRate(1, 'user-123');

      expect(result.id).toBe(1);
      expect(mockRepository.deleteRate).toHaveBeenCalledWith(1, 'user-123');
    });
  });

  describe('getOrCreateOrgConfig', () => {
    it('should return existing config', async () => {
      const { pool } = await import('../../../../config/database.js');
      
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          organization_id: 'org-123',
          base_currency: 'SRD',
          supported_currencies: ['SRD', 'USD'],
        }],
      });

      const config = await currencyService.getOrCreateOrgConfig('org-123');

      expect(config.id).toBe(1);
      expect(config.base_currency).toBe('SRD');
    });

    it('should create default config if not exists', async () => {
      const { pool } = await import('../../../../config/database.js');
      
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // No existing config
        .mockResolvedValueOnce({ // Created config
          rows: [{
            id: 1,
            organization_id: 'org-123',
            base_currency: 'SRD',
            supported_currencies: ['SRD'],
          }],
        });

      const config = await currencyService.getOrCreateOrgConfig('org-123');

      expect(config.base_currency).toBe('SRD');
      expect(pool.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateOrgConfig', () => {
    it('should update organization config', async () => {
      const { pool } = await import('../../../../config/database.js');
      
      const configData = {
        baseCurrency: 'USD',
        supportedCurrencies: ['USD', 'SRD', 'EUR'],
        updatedBy: 'user-123',
      };

      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          organization_id: 'org-123',
          base_currency: 'USD',
          supported_currencies: ['USD', 'SRD', 'EUR'],
        }],
      });

      const config = await currencyService.updateOrgConfig('org-123', configData);

      expect(config.base_currency).toBe('USD');
      expect(config.supported_currencies).toEqual(['USD', 'SRD', 'EUR']);
    });

    it('should throw error if config not found', async () => {
      const { pool } = await import('../../../../config/database.js');
      
      pool.query.mockResolvedValue({ rows: [] });

      await expect(
        currencyService.updateOrgConfig('org-999', {})
      ).rejects.toThrow('Currency config for organization org-999 not found');
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      currencyService.clearCache();
      const stats = currencyService.getCacheStats();
      expect(stats.keys).toBe(0);
    });

    it('should return cache stats', () => {
      const stats = currencyService.getCacheStats();
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
    });
  });
});
