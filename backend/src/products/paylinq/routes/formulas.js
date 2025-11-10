import express from 'express';
import formulaController from '../controllers/formulaController.js';

const router = express.Router();

// All formula routes require authentication

/**
 * @route   POST /api/paylinq/formulas/validate
 * @desc    Validate a formula expression
 * @access  Private
 */
router.post('/validate', formulaController.validateFormula);

/**
 * @route   POST /api/paylinq/formulas/test
 * @desc    Test a formula with sample data
 * @access  Private
 */
router.post('/test', formulaController.testFormula);

/**
 * @route   POST /api/paylinq/formulas/execute
 * @desc    Execute a formula for a pay component
 * @access  Private
 */
router.post('/execute', formulaController.executeFormula);

/**
 * @route   GET /api/paylinq/formulas/variables
 * @desc    Get available formula variables and metadata
 * @access  Private
 */
router.get('/variables', formulaController.getFormulaVariables);

export default router;
