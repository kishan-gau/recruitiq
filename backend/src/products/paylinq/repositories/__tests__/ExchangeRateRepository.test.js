import { jest } from '@jest/globals';
import ExchangeRateRepository from '../ExchangeRateRepository.js';

// Mock dependencies
const mockQuery = jest.fn();
const mockConnect = jest.fn();
const mockRelease = jest.fn();
const mockClient = {
  query: jest.fn(),
  release: mockRelease,
};

jest.mock('../../../../config/database.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
  }
}));

jest.mock('../../../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('ExchangeRateRepository', () => {
  let repository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(mockClient);
    repository = new ExchangeRateRepository();
  });

  describe('getCurrentRate', () => {
    const organizationId = 'org-123';
    const effectiveDate = new Date('2025-11-13');

    it('should return current rate for currency pair', async () => {
      const mockRate = {
        id: 1,
        organization_id: organizationId,
        from_currency: 'USD',
        to_currency: 'SRD',
        rate: 21.5,
        effective_from: new Date('2025-11-01'),
        effective_to: null,
        source: 'manual',
      };

      mockQuery.mockResolvedValue({ rows: [mockRate] });

      const rate = await repository.getCurrentRate(organizationId, 'USD', 'SRD', effectiveDate);

      expect(rate).toEqual(mockRate);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [organizationId, 'USD', 'SRD', effectiveDate]
      );
    });

    it('should return null if no rate found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const rate = await repository.getCurrentRate(organizationId, 'USD', 'JPY', effectiveDate);

      expect(rate).toBeNull();
    });

    it('should return most recent rate when multiple exist', async () => {
      const rates = [
        {
          id: 2,
          rate: 21.8,
          effective_from: new Date('2025-11-10'),
        },
        {
          id: 1,
          rate: 21.5,
          effective_from: new Date('2025-11-01'),
        },
      ];

      mockQuery.mockResolvedValue({ rows: [rates[0]] });

      const rate = await repository.getCurrentRate(organizationId, 'USD', 'SRD', effectiveDate);

      expect(rate.id).toBe(2);
      expect(rate.rate).toBe(21.8);
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        repository.getCurrentRate(organizationId, 'USD', 'SRD', effectiveDate)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getActiveRates', () => {
    const organizationId = 'org-123';

    it('should return all active rates', async () => {
      const mockRates = [
        { id: 1, from_currency: 'USD', to_currency: 'SRD', rate: 21.5 },
        { id: 2, from_currency: 'EUR', to_currency: 'SRD', rate: 23.5 },
      ];

      mockQuery.mockResolvedValue({ rows: mockRates });

      const rates = await repository.getActiveRates(organizationId);

      expect(rates).toHaveLength(2);
      expect(rates).toEqual(mockRates);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('effective_to IS NULL'),
        [organizationId]
      );
    });

    it('should return empty array if no active rates', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const rates = await repository.getActiveRates(organizationId);

      expect(rates).toEqual([]);
    });
  });

  describe('getHistoricalRates', () => {
    const organizationId = 'org-123';

    it('should return historical rates with default pagination', async () => {
      const mockRates = [
        { id: 3, rate: 22.0, effective_from: new Date('2025-11-10') },
        { id: 2, rate: 21.8, effective_from: new Date('2025-11-05') },
        { id: 1, rate: 21.5, effective_from: new Date('2025-11-01') },
      ];

      mockQuery.mockResolvedValue({ rows: mockRates });

      const rates = await repository.getHistoricalRates(organizationId, 'USD', 'SRD');

      expect(rates).toHaveLength(3);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY effective_from DESC'),
        expect.arrayContaining([organizationId, 'USD', 'SRD', 100, 0])
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-11-01');
      const endDate = new Date('2025-11-15');

      mockQuery.mockResolvedValue({ rows: [] });

      await repository.getHistoricalRates(organizationId, 'USD', 'SRD', {
        startDate,
        endDate,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('effective_from >='),
        expect.arrayContaining([organizationId, 'USD', 'SRD', startDate, endDate])
      );
    });

    it('should apply custom limit and offset', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.getHistoricalRates(organizationId, 'USD', 'SRD', {
        limit: 50,
        offset: 25,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([50, 25])
      );
    });
  });

  describe('createRate', () => {
    const rateData = {
      organizationId: 'org-123',
      fromCurrency: 'USD',
      toCurrency: 'SRD',
      rate: 21.5,
      effectiveFrom: new Date('2025-11-13'),
      source: 'manual',
      createdBy: 'user-123',
    };

    it('should create new exchange rate', async () => {
      const mockCreatedRate = {
        id: 1,
        ...rateData,
        created_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockCreatedRate] });

      const rate = await repository.createRate(rateData);

      expect(rate.id).toBe(1);
      expect(rate.rate).toBe(21.5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.exchange_rate'),
        expect.arrayContaining([
          rateData.organizationId,
          rateData.fromCurrency,
          rateData.toCurrency,
          rateData.rate,
        ])
      );
    });

    it('should use default values for optional fields', async () => {
      const minimalData = {
        organizationId: 'org-123',
        fromCurrency: 'USD',
        toCurrency: 'SRD',
        rate: 21.5,
        createdBy: 'user-123',
      };

      mockQuery.mockResolvedValue({
        rows: [{
          ...minimalData,
          id: 1,
          effective_from: expect.any(Date),
          effective_to: null,
          source: 'manual',
          metadata: {},
        }],
      });

      const rate = await repository.createRate(minimalData);

      expect(rate.source).toBe('manual');
      expect(rate.effective_to).toBeNull();
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValue(new Error('Duplicate key violation'));

      await expect(
        repository.createRate(rateData)
      ).rejects.toThrow('Duplicate key violation');
    });
  });

  describe('updateRate', () => {
    const updateData = {
      rate: 22.0,
      updatedBy: 'user-123',
    };

    it('should update exchange rate', async () => {
      const mockUpdatedRate = {
        id: 1,
        rate: 22.0,
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdatedRate] });

      const rate = await repository.updateRate(1, updateData);

      expect(rate.rate).toBe(22.0);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.exchange_rate'),
        expect.arrayContaining([updateData.rate, updateData.updatedBy, 1])
      );
    });

    it('should throw error if rate not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        repository.updateRate(999, updateData)
      ).rejects.toThrow('Exchange rate with id 999 not found');
    });

    it('should update only provided fields', async () => {
      const partialUpdate = {
        effectiveTo: new Date('2025-12-31'),
        updatedBy: 'user-123',
      };

      mockQuery.mockResolvedValue({
        rows: [{
          id: 1,
          rate: 21.5, // Unchanged
          effective_to: partialUpdate.effectiveTo,
        }],
      });

      const rate = await repository.updateRate(1, partialUpdate);

      expect(rate.rate).toBe(21.5);
      expect(rate.effective_to).toEqual(partialUpdate.effectiveTo);
    });
  });

  describe('deleteRate', () => {
    it('should soft delete rate by setting effective_to', async () => {
      const mockDeletedRate = {
        id: 1,
        effective_to: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockDeletedRate] });

      const rate = await repository.deleteRate(1, 'user-123');

      expect(rate.id).toBe(1);
      expect(rate.effective_to).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.exchange_rate'),
        expect.arrayContaining(['user-123', 1])
      );
    });

    it('should throw error if active rate not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        repository.deleteRate(999, 'user-123')
      ).rejects.toThrow('Active exchange rate with id 999 not found');
    });
  });

  describe('bulkCreateRates', () => {
    const rates = [
      {
        organizationId: 'org-123',
        fromCurrency: 'USD',
        toCurrency: 'SRD',
        rate: 21.5,
        createdBy: 'user-123',
      },
      {
        organizationId: 'org-123',
        fromCurrency: 'EUR',
        toCurrency: 'SRD',
        rate: 23.5,
        createdBy: 'user-123',
      },
    ];

    it('should create multiple rates in transaction', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, ...rates[0] }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, ...rates[1] }] })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const createdRates = await repository.bulkCreateRates(rates);

      expect(createdRates).toHaveLength(2);
      expect(createdRates[0].id).toBe(1);
      expect(createdRates[1].id).toBe(2);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // First insert
        .mockRejectedValueOnce(new Error('Constraint violation')) // Second insert fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(
        repository.bulkCreateRates(rates)
      ).rejects.toThrow('Constraint violation');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('logConversion', () => {
    const conversionData = {
      organizationId: 'org-123',
      fromCurrency: 'USD',
      toCurrency: 'SRD',
      fromAmount: 100,
      toAmount: 2150,
      exchangeRateId: 1,
      rateUsed: 21.5,
      referenceType: 'paycheck',
      referenceId: 'paycheck-456',
      metadata: { test: 'data' },
      createdBy: 'user-123',
    };

    it('should log currency conversion', async () => {
      const mockConversion = {
        id: 1,
        ...conversionData,
        conversion_date: new Date(),
      };

      mockQuery.mockResolvedValue({ rows: [mockConversion] });

      const conversion = await repository.logConversion(conversionData);

      expect(conversion.id).toBe(1);
      expect(conversion.from_amount).toBe(100);
      expect(conversion.to_amount).toBe(2150);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.currency_conversion'),
        expect.arrayContaining([
          conversionData.organizationId,
          conversionData.fromCurrency,
          conversionData.toCurrency,
          conversionData.fromAmount,
          conversionData.toAmount,
        ])
      );
    });

    it('should handle logging errors', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.logConversion(conversionData)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getConversionHistory', () => {
    it('should return conversion history for reference', async () => {
      const mockHistory = [
        {
          id: 2,
          from_currency: 'USD',
          to_currency: 'SRD',
          from_amount: 100,
          to_amount: 2150,
          rate_used: 21.5,
          conversion_date: new Date('2025-11-13'),
          rate_effective_from: new Date('2025-11-01'),
          rate_source: 'manual',
        },
        {
          id: 1,
          from_currency: 'EUR',
          to_currency: 'SRD',
          from_amount: 50,
          to_amount: 1175,
          rate_used: 23.5,
          conversion_date: new Date('2025-11-12'),
          rate_effective_from: new Date('2025-11-01'),
          rate_source: 'ecb',
        },
      ];

      mockQuery.mockResolvedValue({ rows: mockHistory });

      const history = await repository.getConversionHistory('paycheck', 'paycheck-123');

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.currency_conversion'),
        ['paycheck', 'paycheck-123']
      );
    });

    it('should return empty array if no history', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const history = await repository.getConversionHistory('paycheck', 'paycheck-999');

      expect(history).toEqual([]);
    });
  });
});
