/**
 * FormulaController Test Suite
 * 
 * Tests for PayLinQ formula controller following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Controller layer HTTP handling tests
 * - Request/response mocking
 * - Error handling validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as formulaController from '../../../../src/products/paylinq/controllers/formulaController.js';

describe('FormulaController', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    // Mock request object
    req = {
      body: {},
      params: {},
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organization_id: '123e4567-e89b-12d3-a456-426614174000'
      }
    };

    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // ==================== VALIDATE FORMULA ====================

  describe('validateFormula', () => {
    it('should return 400 when formula is missing', async () => {
      req.body = {};

      await formulaController.validateFormula(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
          message: 'Formula is required'
        })
      );
    });

    it('should return 400 when formula is empty string', async () => {
      req.body = { formula: '   ' };

      await formulaController.validateFormula(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Formula is required'
        })
      );
    });

    it('should return 400 when formula is not a string', async () => {
      req.body = { formula: 123 };

      await formulaController.validateFormula(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should return 200 with validation result for valid formula', async () => {
      req.body = { formula: 'gross_pay * 0.10' };

      await formulaController.validateFormula(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Formula validation completed'
        })
      );
    });
  });

  // ==================== TEST FORMULA ====================

  describe('testFormula', () => {
    it('should return 400 when formula is missing', async () => {
      req.body = {};

      await formulaController.testFormula(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation Error',
          message: 'Formula is required'
        })
      );
    });

    it('should return 400 when formula is empty', async () => {
      req.body = { formula: '' };

      await formulaController.testFormula(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 200 with test result for valid formula', async () => {
      req.body = { formula: 'gross_pay * 0.10' };

      await formulaController.testFormula(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Formula test completed'
        })
      );
    });
  });

  // ==================== EXECUTE FORMULA ====================

  describe('executeFormula', () => {
    it('should return 400 when componentId is missing', async () => {
      req.body = { variables: { gross_pay: 5000 } };

      await formulaController.executeFormula(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Component ID is required'
        })
      );
    });

    it('should return 400 when variables are missing', async () => {
      req.body = { componentId: '123e4567-e89b-12d3-a456-426614174000' };

      await formulaController.executeFormula(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Variables object is required'
        })
      );
    });

    it('should return 401 when organization_id is missing from user', async () => {
      req.user = { id: '123e4567-e89b-12d3-a456-426614174000' }; // No organization_id
      req.body = {
        componentId: '123e4567-e89b-12d3-a456-426614174000',
        variables: { gross_pay: 5000, hours_worked: 160 }
      };

      await formulaController.executeFormula(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unauthorized'
        })
      );
    });
  });

  // ==================== GET FORMULA VARIABLES ====================

  describe('getFormulaVariables', () => {
    it('should return 200 with list of available variables', async () => {
      await formulaController.getFormulaVariables(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        })
      );
    });
  });
});
