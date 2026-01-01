/**
 * Component Controller
 * 
 * HTTP layer for payroll component endpoints
 * Handles component breakdown retrieval for paychecks
 * 
 * @module controllers/paylinq/componentController
 */

import PayrollRepository from '../../products/paylinq/repositories/payrollRepository.js';
import { mapComponentsDbToApi } from '../../dto/componentDto.js';
import logger from '../../utils/logger.js';
import { NotFoundError } from '../../middleware/errorHandler.js';

const payrollRepository = new PayrollRepository();

/**
 * GET /api/paylinq/paychecks/:id/components
 * Get detailed component breakdown for a paycheck
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next middleware
 */
export async function getPaycheckComponents(req, res, next) {
  try {
    const { id: paycheckId } = req.params;
    const organizationId = req.user.organizationId;

    logger.info('Fetching paycheck components', {
      paycheckId,
      organizationId,
      userId: req.user.userId
    });

    // Verify paycheck exists and belongs to organization
    const paycheck = await payrollRepository.findPaycheckById(paycheckId, organizationId);
    
    if (!paycheck) {
      throw new NotFoundError('Paycheck not found');
    }

    // Get components
    const dbComponents = await payrollRepository.getPaycheckComponents(paycheckId, organizationId);

    // Map to API format
    const apiComponents = mapComponentsDbToApi(dbComponents);

    // Group components by type
    const earnings = apiComponents.filter(c => c.componentType === 'earning');
    const taxes = apiComponents.filter(c => c.componentType === 'tax');
    const deductions = apiComponents.filter(c => c.componentType === 'deduction');

    // Calculate summary
    const totalEarnings = earnings.reduce((sum, c) => sum + c.amount, 0);
    const totalTaxes = taxes.reduce((sum, c) => sum + c.amount, 0);
    const totalDeductions = deductions.reduce((sum, c) => sum + c.amount, 0);

    // Extract tax-free and taxable amounts from calculation metadata
    let totalTaxFree = 0;
    let totalTaxable = 0;

    earnings.forEach(earning => {
      const taxCalc = earning.calculationMetadata?.taxCalculation;
      if (taxCalc) {
        totalTaxFree += taxCalc.taxFreeAllowance || 0;
        totalTaxable += taxCalc.taxableIncome || 0;
      }
    });

    const summary = {
      totalEarnings,
      totalTaxFree,
      totalTaxable,
      totalTaxes,
      totalDeductions,
      netPay: totalEarnings - totalTaxes - totalDeductions
    };

    res.status(200).json({
      success: true,
      components: {
        earnings,
        taxes,
        deductions,
        summary
      }
    });

    logger.info('Paycheck components retrieved successfully', {
      paycheckId,
      componentCount: apiComponents.length,
      organizationId
    });

  } catch (error) {
    logger.error('Error fetching paycheck components', {
      error: error.message,
      paycheckId: req.params.id,
      organizationId: req.user?.organizationId
    });
    next(error);
  }
}
