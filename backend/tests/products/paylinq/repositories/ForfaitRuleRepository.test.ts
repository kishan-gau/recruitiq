/**
 * ForfaitRuleRepository Unit Tests
 * 
 * Tests for forfait rule data access layer.
 * Covers CRUD operations, filtering, and multi-tenant security.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards (docs/TESTING_STANDARDS.md)
 * - TypeScript with proper types
 * - Jest imports from @jest/globals
 * - Dependency injection pattern
 * - Arrange-Act-Assert structure
 * - EXACT method names from repository (verified against source)
 * - Valid UUID v4 formats
 * 
 * VERIFIED METHODS:
 * 1. findAll(organizationId, filters)
 * 2. findById(id, organizationId)
 * 3. findActiveRulesBySourceComponent(sourceComponentId, effectiveDate, organizationId)
 * 4. create(ruleData, organizationId, userId)
 * 5. update(id, updates, organizationId, userId)
 * 6. softDelete(id, organizationId, userId)
 * 7. exists(sourceComponentId, forfaitComponentId, effectiveFrom, organizationId)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ForfaitRuleRepository from '../../../../src/products/paylinq/repositories/ForfaitRuleRepository.js';

describe('ForfaitRuleRepository', () => {
  let repository: ForfaitRuleRepository;
  let mockQuery: jest.Mock;
  
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testRuleId = '323e4567-e89b-12d3-a456-426614174002';
  const testSourceComponentId = '423e4567-e89b-12d3-a456-426614174003';
  const testForfaitComponentId = '523e4567-e89b-12d3-a456-426614174004';

  beforeEach(() => {
    mockQuery = jest.fn();
    repository = new ForfaitRuleRepository({ query: mockQuery });
  });

  describe('findAll', () => {
    it('should return all forfait rules for organization', async () => {
      const dbRules = [
        { id: testRuleId, forfait_percentage: 10.0, organization_id: testOrgId },
        { id: '623e4567-e89b-12d3-a456-426614174005', forfait_percentage: 15.0, organization_id: testOrgId }
      ];
      
      mockQuery.mockResolvedValue({ rows: dbRules });
      const result = await repository.findAll(testOrgId);

      expect(result).toEqual(dbRules);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM forfait_rules fr'),
        [testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'forfait_rules' }
      );
    });

    it('should filter by active status', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await repository.findAll(testOrgId, { isActive: true });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND fr.is_active = $2'),
        [testOrgId, true],
        testOrgId,
        expect.any(Object)
      );
    });

    it('should filter by source component ID', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await repository.findAll(testOrgId, { sourceComponentId: testSourceComponentId });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND fr.source_component_id = $2'),
        [testOrgId, testSourceComponentId],
        testOrgId,
        expect.any(Object)
      );
    });

    it('should filter by effective date', async () => {
      const effectiveDate = new Date('2025-06-15');
      mockQuery.mockResolvedValue({ rows: [] });
      await repository.findAll(testOrgId, { effectiveDate });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND fr.effective_from <= $2'),
        expect.arrayContaining([testOrgId, effectiveDate]),
        testOrgId,
        expect.any(Object)
      );
    });
  });

  describe('findById', () => {
    it('should return forfait rule by ID', async () => {
      const dbRule = { id: testRuleId, organization_id: testOrgId };
      mockQuery.mockResolvedValue({ rows: [dbRule] });

      const result = await repository.findById(testRuleId, testOrgId);

      expect(result).toEqual(dbRule);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE fr.id = $1'),
        [testRuleId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'forfait_rules' }
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await repository.findById(testRuleId, testOrgId);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create forfait rule', async () => {
      const ruleData = {
        sourceComponentId: testSourceComponentId,
        forfaitComponentId: testForfaitComponentId,
        forfaitPercentage: 10.0,
        effectiveFrom: '2025-01-01',
        isActive: true
      };
      
      const dbRule = { id: testRuleId, ...ruleData };
      mockQuery.mockResolvedValue({ rows: [dbRule] });

      const result = await repository.create(ruleData, testOrgId, testUserId);

      expect(result).toEqual(dbRule);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO forfait_rules'),
        expect.arrayContaining([testOrgId, testSourceComponentId, testForfaitComponentId]),
        testOrgId,
        { operation: 'INSERT', table: 'forfait_rules' }
      );
    });
  });

  describe('update', () => {
    it('should update forfait rule', async () => {
      const updates = { forfaitPercentage: 12.0, isActive: false };
      const dbRule = { id: testRuleId, ...updates };
      mockQuery.mockResolvedValue({ rows: [dbRule] });

      const result = await repository.update(testRuleId, updates, testOrgId, testUserId);

      expect(result).toEqual(dbRule);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE forfait_rules'),
        expect.any(Array),
        testOrgId,
        { operation: 'UPDATE', table: 'forfait_rules' }
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await repository.update(testRuleId, {}, testOrgId, testUserId);
      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should soft delete forfait rule', async () => {
      const dbRule = { id: testRuleId, deleted_at: new Date(), deleted_by: testUserId };
      mockQuery.mockResolvedValue({ rows: [dbRule] });

      const result = await repository.softDelete(testRuleId, testOrgId, testUserId);

      expect(result).toEqual(dbRule);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE forfait_rules'),
        expect.arrayContaining([testUserId, testRuleId, testOrgId]),
        testOrgId,
        { operation: 'DELETE', table: 'forfait_rules' }
      );
    });
  });

  describe('exists', () => {
    it('should return true when rule exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ exists: true }] });
      
      const result = await repository.exists(
        testSourceComponentId,
        testForfaitComponentId,
        new Date('2025-01-01'),
        testOrgId
      );

      expect(result).toBe(true);
    });

    it('should return false when rule does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [{ exists: false }] });
      
      const result = await repository.exists(
        testSourceComponentId,
        testForfaitComponentId,
        new Date('2025-01-01'),
        testOrgId
      );

      expect(result).toBe(false);
    });
  });
});
