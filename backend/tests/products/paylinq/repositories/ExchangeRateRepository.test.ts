/**
 * ExchangeRateRepository Test Suite
 * 
 * Tests for PayLinQ exchange rate repository following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Database query mocking via dependency injection
 * - Multi-tenant isolation validation
 * - Data layer operations coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ExchangeRateRepository from '../../../../src/products/paylinq/repositories/ExchangeRateRepository.js';

describe('ExchangeRateRepository', () => {
  let repository: any;
  let mockDb: any;

  // Test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testRateId = 1;

  /**
   * Helper to create DB format exchange rate
   */
  const createDbExchangeRate = (overrides: any = {}) => ({
    id: testRateId,
    organization_id: testOrganizationId,
    from_currency: 'USD',
    to_currency: 'SRD',
    rate: 35.50,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    source: 'manual',
    metadata: {},
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    created_by: testUserId,
    updated_by: null,
    ...overrides
  });

  beforeEach(() => {
    // Create mock database with query method
    mockDb = {
      query: jest.fn(),
      connect: jest.fn()
    };
    
    // Inject mock via constructor
    repository = new ExchangeRateRepository(mockDb);
  });

  // ==================== GET CURRENT RATE ====================

  describe('getCurrentRate', () => {
    it('should get current exchange rate with organization isolation', async () => {
      const effectiveDate = new Date('2025-06-15');
      const dbRate = createDbExchangeRate();

      mockDb.query.mockResolvedValue({ rows: [dbRate] });

      const result = await repository.getCurrentRate(
        testOrganizationId,
        'USD',
        'SRD',
        effectiveDate
      );

      expect(result).toEqual(dbRate);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.exchange_rate'),
        [testOrganizationId, 'USD', 'SRD', effectiveDate]
      );
    });

    it('should return null when no rate found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await repository.getCurrentRate(
        testOrganizationId,
        'EUR',
        'SRD'
      );

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.getCurrentRate(testOrganizationId, 'USD', 'SRD')
      ).rejects.toThrow();
    });

    it('should use default effective date if not provided', async () => {
      const dbRate = createDbExchangeRate();
      mockDb.query.mockResolvedValue({ rows: [dbRate] });

      await repository.getCurrentRate(testOrganizationId, 'USD', 'SRD');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          testOrganizationId,
          'USD',
          'SRD',
          expect.any(Date)
        ])
      );
    });
  });

  // ==================== GET ACTIVE RATES ====================

  describe('getActiveRates', () => {
    it('should get all active rates for organization', async () => {
      const dbRates = [
        createDbExchangeRate({ from_currency: 'USD', to_currency: 'SRD' }),
        createDbExchangeRate({ from_currency: 'EUR', to_currency: 'SRD', rate: 38.25 })
      ];

      mockDb.query.mockResolvedValue({ rows: dbRates });

      const result = await repository.getActiveRates(testOrganizationId);

      expect(result).toEqual(dbRates);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1'),
        [testOrganizationId]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('effective_to IS NULL'),
        expect.any(Array)
      );
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.getActiveRates(testOrganizationId)
      ).rejects.toThrow();
    });
  });

  // ==================== GET HISTORICAL RATES ====================

  describe('getHistoricalRates', () => {
    it('should get historical rates without date filters', async () => {
      const dbRates = [createDbExchangeRate()];
      mockDb.query.mockResolvedValue({ rows: dbRates });

      const result = await repository.getHistoricalRates(
        testOrganizationId,
        'USD',
        'SRD'
      );

      expect(result).toEqual(dbRates);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.exchange_rate'),
        expect.arrayContaining([testOrganizationId, 'USD', 'SRD', 100, 0])
      );
    });

    it('should apply start date filter', async () => {
      const startDate = new Date('2025-01-01');
      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.getHistoricalRates(
        testOrganizationId,
        'USD',
        'SRD',
        { startDate }
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('effective_from >= $4'),
        expect.arrayContaining([startDate])
      );
    });

    it('should apply end date filter', async () => {
      const endDate = new Date('2025-12-31');
      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.getHistoricalRates(
        testOrganizationId,
        'USD',
        'SRD',
        { endDate }
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('effective_from <='),
        expect.arrayContaining([endDate])
      );
    });

    it('should apply both date filters', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');
      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.getHistoricalRates(
        testOrganizationId,
        'USD',
        'SRD',
        { startDate, endDate }
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([startDate, endDate])
      );
    });

    it('should apply custom limit and offset', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.getHistoricalRates(
        testOrganizationId,
        'USD',
        'SRD',
        { limit: 50, offset: 10 }
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([50, 10])
      );
    });
  });

  // ==================== CREATE RATE ====================

  describe('createRate', () => {
    it('should create new exchange rate', async () => {
      const rateData = {
        organizationId: testOrganizationId,
        fromCurrency: 'USD',
        toCurrency: 'SRD',
        rate: 35.50,
        effectiveFrom: new Date('2025-01-01'),
        createdBy: testUserId
      };

      const dbRate = createDbExchangeRate();
      mockDb.query.mockResolvedValue({ rows: [dbRate] });

      const result = await repository.createRate(rateData);

      expect(result).toEqual(dbRate);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.exchange_rate'),
        [
          testOrganizationId,
          'USD',
          'SRD',
          35.50,
          rateData.effectiveFrom,
          null,
          'manual',
          {},
          testUserId
        ]
      );
    });

    it('should use default values when not provided', async () => {
      const rateData = {
        organizationId: testOrganizationId,
        fromCurrency: 'USD',
        toCurrency: 'SRD',
        rate: 35.50,
        createdBy: testUserId
      };

      const dbRate = createDbExchangeRate();
      mockDb.query.mockResolvedValue({ rows: [dbRate] });

      await repository.createRate(rateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          testOrganizationId,
          'USD',
          'SRD',
          35.50,
          expect.any(Date), // effectiveFrom default
          null,             // effectiveTo default
          'manual',         // source default
          {},               // metadata default
          testUserId
        ])
      );
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.createRate({
          organizationId: testOrganizationId,
          fromCurrency: 'USD',
          toCurrency: 'SRD',
          rate: 35.50,
          createdBy: testUserId
        })
      ).rejects.toThrow();
    });
  });

  // ==================== UPDATE RATE ====================

  describe('updateRate', () => {
    it('should update exchange rate', async () => {
      const updateData = {
        rate: 36.00,
        effectiveTo: new Date('2025-12-31'),
        metadata: { note: 'Updated rate' },
        updatedBy: testUserId
      };

      const dbRate = createDbExchangeRate(updateData);
      mockDb.query.mockResolvedValue({ rows: [dbRate] });

      const result = await repository.updateRate(testRateId, updateData);

      expect(result).toEqual(dbRate);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.exchange_rate'),
        [36.00, updateData.effectiveTo, updateData.metadata, testUserId, testRateId]
      );
    });

    it('should throw error when rate not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(
        repository.updateRate(testRateId, { rate: 36.00, updatedBy: testUserId })
      ).rejects.toThrow('Exchange rate with id 1 not found');
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.updateRate(testRateId, { rate: 36.00, updatedBy: testUserId })
      ).rejects.toThrow();
    });
  });

  // ==================== DELETE RATE ====================

  describe('deleteRate', () => {
    it('should soft delete exchange rate by setting effective_to', async () => {
      const dbRate = createDbExchangeRate({ effective_to: new Date() });
      mockDb.query.mockResolvedValue({ rows: [dbRate] });

      const result = await repository.deleteRate(testRateId, testUserId);

      expect(result).toEqual(dbRate);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.exchange_rate'),
        [testUserId, testRateId]
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('effective_to = NOW()'),
        expect.any(Array)
      );
    });

    it('should throw error when active rate not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(
        repository.deleteRate(testRateId, testUserId)
      ).rejects.toThrow('Active exchange rate with id 1 not found');
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.deleteRate(testRateId, testUserId)
      ).rejects.toThrow();
    });
  });

  // ==================== BULK CREATE RATES ====================

  describe('bulkCreateRates', () => {
    it('should create multiple exchange rates in transaction', async () => {
      const rates = [
        {
          organizationId: testOrganizationId,
          fromCurrency: 'USD',
          toCurrency: 'SRD',
          rate: 35.50,
          createdBy: testUserId
        },
        {
          organizationId: testOrganizationId,
          fromCurrency: 'EUR',
          toCurrency: 'SRD',
          rate: 38.25,
          createdBy: testUserId
        }
      ];

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [createDbExchangeRate()] }) // INSERT 1
          .mockResolvedValueOnce({ rows: [createDbExchangeRate({ from_currency: 'EUR', rate: 38.25 })] }) // INSERT 2
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn()
      };

      mockDb.connect.mockResolvedValue(mockClient);

      const result = await repository.bulkCreateRates(rates);

      expect(result).toHaveLength(2);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockRejectedValueOnce(new Error('Insert failed')), // INSERT fails
        release: jest.fn()
      };

      mockDb.connect.mockResolvedValue(mockClient);

      await expect(
        repository.bulkCreateRates([
          {
            organizationId: testOrganizationId,
            fromCurrency: 'USD',
            toCurrency: 'SRD',
            rate: 35.50,
            createdBy: testUserId
          }
        ])
      ).rejects.toThrow();

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  // ==================== LOG CONVERSION ====================

  describe('logConversion', () => {
    it('should log currency conversion', async () => {
      const conversionData = {
        organizationId: testOrganizationId,
        fromCurrency: 'USD',
        toCurrency: 'SRD',
        fromAmount: 100.00,
        toAmount: 3550.00,
        exchangeRateId: testRateId,
        rateUsed: 35.50,
        referenceType: 'paycheck',
        referenceId: 12345,
        createdBy: testUserId
      };

      const dbConversion = {
        id: 1,
        ...conversionData,
        conversion_date: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [dbConversion] });

      const result = await repository.logConversion(conversionData);

      expect(result).toEqual(dbConversion);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.currency_conversion'),
        [
          testOrganizationId,
          'USD',
          'SRD',
          100.00,
          3550.00,
          testRateId,
          35.50,
          'paycheck',
          12345,
          {},
          testUserId
        ]
      );
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.logConversion({
          organizationId: testOrganizationId,
          fromCurrency: 'USD',
          toCurrency: 'SRD',
          fromAmount: 100.00,
          toAmount: 3550.00,
          exchangeRateId: testRateId,
          rateUsed: 35.50,
          referenceType: 'paycheck',
          referenceId: 12345,
          createdBy: testUserId
        })
      ).rejects.toThrow();
    });
  });

  // ==================== GET CONVERSION HISTORY ====================

  describe('getConversionHistory', () => {
    it('should get conversion history for reference', async () => {
      const conversions = [
        {
          id: 1,
          from_currency: 'USD',
          to_currency: 'SRD',
          from_amount: 100.00,
          to_amount: 3550.00,
          rate_used: 35.50,
          conversion_date: new Date(),
          metadata: {},
          rate_effective_from: new Date('2025-01-01'),
          rate_source: 'manual'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: conversions });

      const result = await repository.getConversionHistory('paycheck', 12345);

      expect(result).toEqual(conversions);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.currency_conversion'),
        ['paycheck', 12345]
      );
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.getConversionHistory('paycheck', 12345)
      ).rejects.toThrow();
    });
  });

  // ==================== MATERIALIZED VIEWS ====================

  describe('getMaterializedViewStatus', () => {
    it('should get materialized view status', async () => {
      const viewStatus = [
        { view_name: 'active_rates', last_refresh: new Date() }
      ];

      mockDb.query.mockResolvedValue({ rows: viewStatus });

      const result = await repository.getMaterializedViewStatus();

      expect(result).toEqual(viewStatus);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.currency_mv_status')
      );
    });
  });

  describe('refreshMaterializedViews', () => {
    it('should refresh all materialized views', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.refreshMaterializedViews();

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT payroll.refresh_currency_materialized_views()'
      );
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Refresh failed'));

      await expect(
        repository.refreshMaterializedViews()
      ).rejects.toThrow();
    });
  });

  describe('refreshActiveRatesView', () => {
    it('should refresh active rates view', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.refreshActiveRatesView();

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT payroll.refresh_active_rates_mv()'
      );
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Refresh failed'));

      await expect(
        repository.refreshActiveRatesView()
      ).rejects.toThrow();
    });
  });

  // ==================== STATISTICS AND REPORTING ====================

  describe('getConversionStatistics', () => {
    it('should get conversion statistics without filters', async () => {
      const stats = [
        {
          from_currency: 'USD',
          to_currency: 'SRD',
          conversion_day: new Date('2025-01-01'),
          total_conversions: 10,
          total_from_amount: 1000.00,
          total_to_amount: 35500.00,
          avg_rate_used: 35.50,
          min_rate_used: 35.40,
          max_rate_used: 35.60,
          rate_stddev: 0.05,
          paycheck_conversions: 8,
          component_conversions: 2
        }
      ];

      mockDb.query.mockResolvedValue({ rows: stats });

      const result = await repository.getConversionStatistics(testOrganizationId);

      expect(result).toEqual(stats);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.currency_conversion_summary_mv'),
        [testOrganizationId]
      );
    });

    it('should apply date filters', async () => {
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-12-31');

      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.getConversionStatistics(testOrganizationId, {
        fromDate,
        toDate
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('conversion_day >='),
        expect.arrayContaining([testOrganizationId, fromDate, toDate])
      );
    });

    it('should apply currency pair filter', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.getConversionStatistics(testOrganizationId, {
        currencyPair: { from: 'USD', to: 'SRD' }
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([testOrganizationId, 'USD', 'SRD'])
      );
    });
  });

  describe('getRateChangeHistory', () => {
    it('should get rate change history with variance analysis', async () => {
      const history = [
        {
          id: testRateId,
          current_rate: 35.50,
          previous_rate: 35.00,
          rate_change_amount: 0.50,
          rate_change_percentage: 1.43,
          effective_from: new Date('2025-01-01'),
          previous_rate_date: new Date('2024-12-01'),
          active_days: 31,
          source: 'manual'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: history });

      const result = await repository.getRateChangeHistory(
        testOrganizationId,
        'USD',
        'SRD'
      );

      expect(result).toEqual(history);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.exchange_rate_history_mv'),
        [testOrganizationId, 'USD', 'SRD']
      );
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(
        repository.getRateChangeHistory(testOrganizationId, 'USD', 'SRD')
      ).rejects.toThrow();
    });
  });
});
