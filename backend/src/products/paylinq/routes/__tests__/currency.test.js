import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import currencyRoutes from '../currency.js';
import CurrencyService from '../../services/currencyService.js';

// Mock the CurrencyService
jest.mock('../../services/currencyService.js');

// Mock middleware
const mockAuthMiddleware = jest.fn((req, res, next) => {
  req.user = {
    userId: 'user-123',
    organizationId: 'org-123',
  };
  next();
});

const mockPermissionMiddleware = jest.fn((permission) => (req, res, next) => next());

jest.mock('../../../../middleware/auth.js', () => ({
  authenticateTenant: mockAuthMiddleware,
  requirePermission: mockPermissionMiddleware,
}));

jest.mock('../../../../middleware/validation.js', () => ({
  validateRequest: jest.fn((schema) => (req, res, next) => next()),
}));

describe('Currency API Routes', () => {
  let app;
  let mockCurrencyService;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/currency', currencyRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrencyService = {
      getActiveRates: jest.fn(),
      getExchangeRate: jest.fn(),
      getHistoricalRates: jest.fn(),
      createExchangeRate: jest.fn(),
      updateExchangeRate: jest.fn(),
      deleteExchangeRate: jest.fn(),
      bulkImportRates: jest.fn(),
      convertAmount: jest.fn(),
      getConversionHistory: jest.fn(),
      getOrCreateOrgConfig: jest.fn(),
      updateOrgConfig: jest.fn(),
      getCacheStats: jest.fn(),
      clearCache: jest.fn(),
    };

    CurrencyService.mockImplementation(() => mockCurrencyService);
  });

  describe('GET /api/currency/', () => {
    it('should return all active exchange rates', async () => {
      const mockRates = [
        { id: 1, from_currency: 'USD', to_currency: 'SRD', rate: 21.5 },
        { id: 2, from_currency: 'EUR', to_currency: 'SRD', rate: 23.5 },
      ];

      mockCurrencyService.getActiveRates.mockResolvedValue(mockRates);

      const response = await request(app)
        .get('/api/currency/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRates);
      expect(response.body.count).toBe(2);
      expect(mockCurrencyService.getActiveRates).toHaveBeenCalledWith('org-123');
    });

    it('should handle errors gracefully', async () => {
      mockCurrencyService.getActiveRates.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/currency/')
        .expect(500);

      expect(response.body.success).toBeFalsy();
    });
  });

  describe('GET /api/currency/current/:from/:to', () => {
    it('should return current exchange rate', async () => {
      const mockRate = {
        id: 1,
        from_currency: 'USD',
        to_currency: 'SRD',
        rate: 21.5,
        source: 'manual',
      };

      mockCurrencyService.getExchangeRate.mockResolvedValue(mockRate);

      const response = await request(app)
        .get('/api/currency/current/USD/SRD')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRate);
      expect(mockCurrencyService.getExchangeRate).toHaveBeenCalledWith(
        'org-123',
        'USD',
        'SRD',
        expect.any(Date)
      );
    });

    it('should accept date query parameter', async () => {
      mockCurrencyService.getExchangeRate.mockResolvedValue({
        rate: 21.5,
      });

      await request(app)
        .get('/api/currency/current/USD/SRD?date=2025-11-01')
        .expect(200);

      expect(mockCurrencyService.getExchangeRate).toHaveBeenCalledWith(
        'org-123',
        'USD',
        'SRD',
        expect.any(Date)
      );
    });

    it('should return 404 if rate not found', async () => {
      mockCurrencyService.getExchangeRate.mockRejectedValue(
        new Error('Exchange rate not found for USD to JPY')
      );

      const response = await request(app)
        .get('/api/currency/current/USD/JPY')
        .expect(500);

      expect(response.body.success).toBeFalsy();
    });
  });

  describe('GET /api/currency/historical/:from/:to', () => {
    it('should return historical rates', async () => {
      const mockRates = [
        { id: 2, rate: 21.8, effective_from: '2025-11-10' },
        { id: 1, rate: 21.5, effective_from: '2025-11-01' },
      ];

      mockCurrencyService.getHistoricalRates.mockResolvedValue(mockRates);

      const response = await request(app)
        .get('/api/currency/historical/USD/SRD')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRates);
      expect(response.body.count).toBe(2);
    });

    it('should accept pagination parameters', async () => {
      mockCurrencyService.getHistoricalRates.mockResolvedValue([]);

      await request(app)
        .get('/api/currency/historical/USD/SRD?limit=50&offset=25')
        .expect(200);

      expect(mockCurrencyService.getHistoricalRates).toHaveBeenCalledWith(
        'org-123',
        'USD',
        'SRD',
        expect.objectContaining({
          limit: 50,
          offset: 25,
        })
      );
    });

    it('should accept date range parameters', async () => {
      mockCurrencyService.getHistoricalRates.mockResolvedValue([]);

      await request(app)
        .get('/api/currency/historical/USD/SRD?startDate=2025-11-01&endDate=2025-11-15')
        .expect(200);

      expect(mockCurrencyService.getHistoricalRates).toHaveBeenCalledWith(
        'org-123',
        'USD',
        'SRD',
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });
  });

  describe('POST /api/currency/', () => {
    it('should create new exchange rate', async () => {
      const newRate = {
        fromCurrency: 'USD',
        toCurrency: 'SRD',
        rate: 21.5,
        source: 'manual',
      };

      const createdRate = {
        id: 1,
        ...newRate,
        organizationId: 'org-123',
      };

      mockCurrencyService.createExchangeRate.mockResolvedValue(createdRate);

      const response = await request(app)
        .post('/api/currency/')
        .send(newRate)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdRate);
      expect(mockCurrencyService.createExchangeRate).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-123',
          ...newRate,
          createdBy: 'user-123',
        })
      );
    });
  });

  describe('PUT /api/currency/:id', () => {
    it('should update exchange rate', async () => {
      const updateData = {
        rate: 22.0,
      };

      const updatedRate = {
        id: 1,
        rate: 22.0,
      };

      mockCurrencyService.updateExchangeRate.mockResolvedValue(updatedRate);

      const response = await request(app)
        .put('/api/currency/1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedRate);
      expect(mockCurrencyService.updateExchangeRate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          ...updateData,
          updatedBy: 'user-123',
        })
      );
    });
  });

  describe('DELETE /api/currency/:id', () => {
    it('should delete exchange rate', async () => {
      const deletedRate = {
        id: 1,
        effective_to: new Date(),
      };

      mockCurrencyService.deleteExchangeRate.mockResolvedValue(deletedRate);

      const response = await request(app)
        .delete('/api/currency/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockCurrencyService.deleteExchangeRate).toHaveBeenCalledWith(1, 'user-123');
    });
  });

  describe('POST /api/currency/bulk-import', () => {
    it('should bulk import exchange rates', async () => {
      const rates = [
        { fromCurrency: 'USD', toCurrency: 'SRD', rate: 21.5 },
        { fromCurrency: 'EUR', toCurrency: 'SRD', rate: 23.5 },
      ];

      const createdRates = [
        { id: 1, ...rates[0] },
        { id: 2, ...rates[1] },
      ];

      mockCurrencyService.bulkImportRates.mockResolvedValue(createdRates);

      const response = await request(app)
        .post('/api/currency/bulk-import')
        .send({ rates })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(mockCurrencyService.bulkImportRates).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            organizationId: 'org-123',
            createdBy: 'user-123',
          }),
        ])
      );
    });
  });

  describe('POST /api/currency/convert', () => {
    it('should convert amount', async () => {
      const conversionRequest = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'SRD',
      };

      const conversionResult = {
        fromAmount: 100,
        toAmount: 2150,
        rate: 21.5,
        fromCurrency: 'USD',
        toCurrency: 'SRD',
      };

      mockCurrencyService.convertAmount.mockResolvedValue(conversionResult);

      const response = await request(app)
        .post('/api/currency/convert')
        .send(conversionRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(conversionResult);
      expect(mockCurrencyService.convertAmount).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-123',
          ...conversionRequest,
          createdBy: 'user-123',
        })
      );
    });

    it('should accept optional rounding parameters', async () => {
      mockCurrencyService.convertAmount.mockResolvedValue({
        fromAmount: 100,
        toAmount: 2155.56,
        rate: 21.5556,
      });

      await request(app)
        .post('/api/currency/convert')
        .send({
          amount: 100,
          fromCurrency: 'USD',
          toCurrency: 'SRD',
          roundingMethod: 'half_up',
          decimalPlaces: 2,
        })
        .expect(200);

      expect(mockCurrencyService.convertAmount).toHaveBeenCalledWith(
        expect.objectContaining({
          roundingMethod: 'half_up',
          decimalPlaces: 2,
        })
      );
    });
  });

  describe('GET /api/currency/conversions/:type/:id', () => {
    it('should return conversion history', async () => {
      const mockHistory = [
        {
          id: 1,
          from_currency: 'USD',
          to_currency: 'SRD',
          from_amount: 100,
          to_amount: 2150,
          conversion_date: new Date(),
        },
      ];

      mockCurrencyService.getConversionHistory.mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/currency/conversions/paycheck/paycheck-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHistory);
      expect(mockCurrencyService.getConversionHistory).toHaveBeenCalledWith(
        'paycheck',
        'paycheck-123'
      );
    });
  });

  describe('GET /api/currency/config', () => {
    it('should return organization currency config', async () => {
      const mockConfig = {
        id: 1,
        organization_id: 'org-123',
        base_currency: 'SRD',
        supported_currencies: ['SRD', 'USD'],
      };

      mockCurrencyService.getOrCreateOrgConfig.mockResolvedValue(mockConfig);

      const response = await request(app)
        .get('/api/currency/config')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockConfig);
    });
  });

  describe('PUT /api/currency/config', () => {
    it('should update organization currency config', async () => {
      const updateData = {
        baseCurrency: 'USD',
        supportedCurrencies: ['USD', 'SRD', 'EUR'],
      };

      const updatedConfig = {
        id: 1,
        organization_id: 'org-123',
        base_currency: 'USD',
        supported_currencies: ['USD', 'SRD', 'EUR'],
      };

      mockCurrencyService.updateOrgConfig.mockResolvedValue(updatedConfig);

      const response = await request(app)
        .put('/api/currency/config')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedConfig);
      expect(mockCurrencyService.updateOrgConfig).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          ...updateData,
          updatedBy: 'user-123',
        })
      );
    });
  });

  describe('GET /api/currency/cache/stats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        keys: 10,
        hits: 50,
        misses: 5,
        ksize: 1024,
        vsize: 8192,
      };

      mockCurrencyService.getCacheStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/api/currency/cache/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });
  });

  describe('POST /api/currency/cache/clear', () => {
    it('should clear cache', async () => {
      mockCurrencyService.clearCache.mockReturnValue();

      const response = await request(app)
        .post('/api/currency/cache/clear')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockCurrencyService.clearCache).toHaveBeenCalled();
    });
  });
});
