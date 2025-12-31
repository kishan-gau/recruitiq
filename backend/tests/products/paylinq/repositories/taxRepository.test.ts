/**
 * TaxRepository Test Suite
 * 
 * Tests for PayLinQ tax repository following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Database query mocking via pool.query
 * - Valid UUID v4 formats
 * - Data layer operations coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock pool before importing TaxRepository
const mockQuery = jest.fn();
jest.mock('../../../../src/config/database.js', () => ({
  default: { query: mockQuery }
}));

import TaxRepository from '../../../../src/products/paylinq/repositories/taxRepository.js';

describe('TaxRepository', () => {
  let repository: any;

  // Valid UUID v4 test constants
  const testJurisdictionId = '123e4567-e89b-12d3-a456-426614174000';
  const testTaxRateId = '223e4567-e89b-12d3-a456-426614174001';

  /**
   * Helper to create DB format tax rate (snake_case)
   */
  const createDbTaxRate = (overrides: any = {}) => ({
    id: testTaxRateId,
    jurisdiction_id: testJurisdictionId,
    tax_type: 'income',
    rate: 0.25,
    effective_from: new Date('2024-01-01'),
    effective_to: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    ...overrides
  });

  /**
   * Helper to create DB format jurisdiction (snake_case)
   */
  const createDbJurisdiction = (overrides: any = {}) => ({
    id: testJurisdictionId,
    jurisdiction_name: 'California',
    jurisdiction_type: 'state',
    country: 'US',
    state: 'CA',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    ...overrides
  });

  beforeEach(() => {
    mockQuery.mockClear();
    repository = new TaxRepository();
  });

  // ==================== GET TAX RATES ====================

  describe('getTaxRates', () => {
    it('should retrieve tax rates for jurisdiction on effective date', async () => {
      const effectiveDate = new Date('2024-06-15');
      const dbTaxRate = createDbTaxRate();

      mockQuery.mockResolvedValue({ rows: [dbTaxRate] });

      const result = await repository.getTaxRates(testJurisdictionId, effectiveDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(dbTaxRate);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM tax_rates'),
        [testJurisdictionId, effectiveDate]
      );
    });

    it('should return multiple tax rates for different tax types', async () => {
      const effectiveDate = new Date('2024-06-15');
      const taxRates = [
        createDbTaxRate({ id: testTaxRateId, tax_type: 'income', rate: 0.25 }),
        createDbTaxRate({ id: '323e4567-e89b-12d3-a456-426614174002', tax_type: 'social_security', rate: 0.062 }),
        createDbTaxRate({ id: '423e4567-e89b-12d3-a456-426614174003', tax_type: 'medicare', rate: 0.0145 })
      ];

      mockQuery.mockResolvedValue({ rows: taxRates });

      const result = await repository.getTaxRates(testJurisdictionId, effectiveDate);

      expect(result).toHaveLength(3);
      expect(result[0].tax_type).toBe('income');
      expect(result[1].tax_type).toBe('social_security');
      expect(result[2].tax_type).toBe('medicare');
    });

    it('should return empty array when no tax rates found', async () => {
      const effectiveDate = new Date('2024-06-15');

      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getTaxRates(testJurisdictionId, effectiveDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should filter by effective date range', async () => {
      const effectiveDate = new Date('2024-06-15');
      const dbTaxRate = createDbTaxRate({
        effective_from: new Date('2024-01-01'),
        effective_to: new Date('2024-12-31')
      });

      mockQuery.mockResolvedValue({ rows: [dbTaxRate] });

      await repository.getTaxRates(testJurisdictionId, effectiveDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('effective_from <= $2'),
        [testJurisdictionId, effectiveDate]
      );
    });

    it('should order results by tax_type and created_at', async () => {
      const effectiveDate = new Date('2024-06-15');
      
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.getTaxRates(testJurisdictionId, effectiveDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY tax_type, created_at DESC'),
        [testJurisdictionId, effectiveDate]
      );
    });

    it('should accept valid UUID for jurisdiction ID', async () => {
      const effectiveDate = new Date('2024-06-15');

      mockQuery.mockResolvedValue({ rows: [] });

      await repository.getTaxRates(testJurisdictionId, effectiveDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [testJurisdictionId, effectiveDate]
      );
    });

    it('should handle null effective_to dates', async () => {
      const effectiveDate = new Date('2024-06-15');
      const dbTaxRate = createDbTaxRate({
        effective_to: null
      });

      mockQuery.mockResolvedValue({ rows: [dbTaxRate] });

      const result = await repository.getTaxRates(testJurisdictionId, effectiveDate);

      expect(result[0].effective_to).toBeNull();
    });
  });

  // ==================== GET ALL JURISDICTIONS ====================

  describe('getAllJurisdictions', () => {
    it('should retrieve all jurisdictions', async () => {
      const jurisdictions = [
        createDbJurisdiction({ id: testJurisdictionId, jurisdiction_name: 'California' }),
        createDbJurisdiction({ id: '323e4567-e89b-12d3-a456-426614174002', jurisdiction_name: 'New York' })
      ];

      mockQuery.mockResolvedValue({ rows: jurisdictions });

      const result = await repository.getAllJurisdictions();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM tax_jurisdictions')
      );
    });

    it('should return empty array when no jurisdictions exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getAllJurisdictions();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should order results by jurisdiction_name', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.getAllJurisdictions();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY jurisdiction_name')
      );
    });

    it('should include all jurisdiction fields', async () => {
      const jurisdiction = createDbJurisdiction({
        jurisdiction_name: 'California',
        jurisdiction_type: 'state',
        country: 'US',
        state: 'CA'
      });

      mockQuery.mockResolvedValue({ rows: [jurisdiction] });

      const result = await repository.getAllJurisdictions();

      expect(result[0]).toHaveProperty('jurisdiction_name');
      expect(result[0]).toHaveProperty('jurisdiction_type');
      expect(result[0]).toHaveProperty('country');
      expect(result[0]).toHaveProperty('state');
    });
  });

  // ==================== GET JURISDICTION BY ID ====================

  describe('getJurisdictionById', () => {
    it('should retrieve jurisdiction by ID', async () => {
      const dbJurisdiction = createDbJurisdiction();

      mockQuery.mockResolvedValue({ rows: [dbJurisdiction] });

      const result = await repository.getJurisdictionById(testJurisdictionId);

      expect(result).toBeDefined();
      expect(result).toEqual(dbJurisdiction);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM tax_jurisdictions'),
        [testJurisdictionId]
      );
    });

    it('should return undefined when jurisdiction not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.getJurisdictionById(testJurisdictionId);

      expect(result).toBeUndefined();
    });

    it('should filter by exact ID match', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.getJurisdictionById(testJurisdictionId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [testJurisdictionId]
      );
    });

    it('should accept valid UUID for jurisdiction ID', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.getJurisdictionById(testJurisdictionId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [testJurisdictionId]
      );
    });

    it('should return single row (not array)', async () => {
      const dbJurisdiction = createDbJurisdiction();

      mockQuery.mockResolvedValue({ rows: [dbJurisdiction] });

      const result = await repository.getJurisdictionById(testJurisdictionId);

      // Should return the object directly, not wrapped in array
      expect(Array.isArray(result)).toBe(false);
      expect(result).toEqual(dbJurisdiction);
    });
  });
});
