import express, { Router } from 'express';
import formulaController from '../controllers/formulaController.ts';
import { requirePermission } from '../../../middleware/auth.ts';

const router: Router = express.Router();

// All formula routes require authentication

/**
 * @route   POST /api/paylinq/formulas/validate
 * @desc    Validate a formula expression
 * @access  Private
 */
router.post(
  '/validate',
  requirePermission('formulas:read'),
  formulaController.validateFormula
);

/**
 * @route   POST /api/paylinq/formulas/test
 * @desc    Test a formula with sample data
 * @access  Private
 */
router.post(
  '/test',
  requirePermission('formulas:read'),
  formulaController.testFormula
);

/**
 * @route   POST /api/paylinq/formulas/execute
 * @desc    Execute a formula for a pay component
 * @access  Private
 */
router.post(
  '/execute',
  requirePermission('payroll:formulas:execute'),
  formulaController.executeFormula
);

/**
 * @route   GET /api/paylinq/formulas/variables
 * @desc    Get available formula variables and metadata
 * @access  Private
 */
router.get(
  '/variables',
  requirePermission('formulas:read'),
  formulaController.getFormulaVariables
);

export default router;
