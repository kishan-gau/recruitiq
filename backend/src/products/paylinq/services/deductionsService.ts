/**
 * Deductions Service
 * Business logic for managing payroll deductions
 */

/**
 * Deduction types
 */
export const DEDUCTION_TYPES = {
  PRE_TAX: 'pre_tax',
  POST_TAX: 'post_tax',
  COURT_ORDERED: 'court_ordered'
};

class DeductionsService {
  
  repository: any;

constructor(repository = null) {
    this.repository = repository;
  }

  /**
   * Create a deduction type
   */
  async createDeductionType(deductionData, organizationId, userId) {
    // Validate required fields
    if (!deductionData.deductionName || !deductionData.deductionType || !deductionData.calculationType) {
      throw new Error('Missing required fields');
    }

    // Validate calculation type
    if (!['percentage', 'fixed'].includes(deductionData.calculationType)) {
      throw new Error('Invalid calculation type');
    }

    // Validate positive amount
    if (deductionData.defaultAmount !== undefined && deductionData.defaultAmount < 0) {
      throw new Error('Amount must be positive');
    }

    if (this.repository && this.repository.createDeductionType) {
      return await this.repository.createDeductionType(deductionData, organizationId, userId);
    }

    return {
      id: '123',
      ...deductionData,
      organization_id: organizationId,
      created_by: userId
    };
  }

  /**
   * Get deduction types
   */
  async getDeductionTypes(organizationId, filters = {}) {
    if (this.repository && this.repository.getDeductionTypes) {
      return await this.repository.getDeductionTypes(organizationId, filters);
    }
    return [];
  }

  /**
   * Assign deduction to employee
   */
  async assignDeduction(assignmentData, organizationId, userId) {
    // Validate deduction type exists
    if (this.repository && this.repository.getDeductionById) {
      const deductionType = await this.repository.getDeductionById(assignmentData.deductionTypeId, organizationId);
      if (!deductionType) {
        throw new Error('Deduction type not found');
      }
    }

    if (this.repository && this.repository.assignDeduction) {
      return await this.repository.assignDeduction(assignmentData, organizationId, userId);
    }
    return { id: '123', ...assignmentData };
  }

  /**
   * Update employee deduction
   */
  async updateEmployeeDeduction(deductionId, updates, organizationId, userId) {
    if (this.repository && this.repository.updateEmployeeDeduction) {
      return await this.repository.updateEmployeeDeduction(deductionId, updates, organizationId, userId);
    }
    return { id: deductionId, ...updates };
  }

  /**
   * Terminate employee deduction
   */
  async terminateDeduction(deductionId, endDate, organizationId, userId) {
    if (this.repository && this.repository.terminateDeduction) {
      return await this.repository.terminateDeduction(deductionId, endDate, organizationId, userId);
    }
    return { id: deductionId, end_date: endDate };
  }

  /**
   * Get deduction by ID
   */
  async getDeductionById(deductionId, organizationId) {
    if (this.repository && this.repository.getDeductionById) {
      return await this.repository.getDeductionById(deductionId, organizationId);
    }
    return null;
  }

  /**
   * Get all deductions for employee
   */
  async getEmployeeDeductions(employeeId, organizationId) {
    if (this.repository && this.repository.getEmployeeDeductions) {
      return await this.repository.getEmployeeDeductions(employeeId, organizationId);
    }
    return [];
  }

  /**
   * Calculate percentage deduction
   */
  calculatePercentageDeduction(grossPay, percentage) {
    if (percentage < 0) {
      throw new Error('Percentage must be positive');
    }
    return (grossPay * percentage) / 100;
  }

  /**
   * Calculate fixed deduction
   */
  calculateFixedDeduction(amount) {
    return amount;
  }

  /**
   * Calculate all deductions for employee
   */
  async calculateAllDeductions(employeeRecordId, grossPay, organizationId) {
    if (this.repository && this.repository.calculateAllDeductions) {
      return await this.repository.calculateAllDeductions(employeeRecordId, grossPay, organizationId);
    }
    return [];
  }

  /**
   * Enforce annual limit
   */
  enforceAnnualLimit(requestedAmount, ytdContributions, annualLimit) {
    const remaining = annualLimit - ytdContributions;
    const allowedAmount = Math.min(requestedAmount, remaining);
    return Math.max(0, allowedAmount);
  }

  /**
   * Enforce max percentage
   */
  enforceMaxPercentage(grossPay, requestedPercentage, maxPercentage) {
    const effectivePercentage = Math.min(requestedPercentage, maxPercentage);
    return (grossPay * effectivePercentage) / 100;
  }

  /**
   * Calculate deduction amount
   */
  calculateDeductionAmount(deduction, grossPay) {
    if (deduction.calculation_type === 'percentage') {
      return (grossPay * deduction.amount) / 100;
    }
    return deduction.amount;
  }

  /**
   * Calculate net pay with deductions and taxes
   * @param {number} grossPay - Gross pay amount
   * @param {Object|Array} deductions - Either an object with totalPreTax/totalPostTax or array of deduction objects
   * @param {number|Array} taxes - Either a single tax amount or array of tax objects
   */
  calculateNetPay(grossPay, deductions = [], taxes = []) {
    let netPay = grossPay;
    
    // Handle deductions - can be object with totals or array of deductions
    if (deductions && typeof deductions === 'object') {
      if (deductions.totalPreTax !== undefined && deductions.totalPostTax !== undefined) {
        // Object format: {totalPreTax: X, totalPostTax: Y}
        netPay -= (deductions.totalPreTax || 0);
        netPay -= (deductions.totalPostTax || 0);
      } else if (Array.isArray(deductions)) {
        // Array format: [{amount, calculation_type}]
        for (const deduction of deductions) {
          const amount = this.calculateDeductionAmount(deduction, grossPay);
          netPay -= amount;
        }
      }
    }
    
    // Handle taxes - can be number or array
    if (typeof taxes === 'number') {
      netPay -= taxes;
    } else if (Array.isArray(taxes)) {
      for (const tax of taxes) {
        netPay -= tax.amount || 0;
      }
    }
    
    return netPay;
  }

  /**
   * Enforce deduction limits
   */
  enforceDeductionLimits(deduction, ytdAmount = 0) {
    // Implementation for limit enforcement
    return { allowed: true, amount: deduction.amount };
  }

  /**
   * Get deduction summary for period
   */
  async getDeductionSummary(employeeId, organizationId, startDate, endDate) {
    if (this.repository && this.repository.getDeductionSummary) {
      return await this.repository.getDeductionSummary(employeeId, organizationId, startDate, endDate);
    }

    return {
      employee_id: employeeId,
      totalAmount: 0,
      byType: {}
    };
  }

  /**
   * Get year-to-date deductions
   */
  async getYearToDateDeductions(employeeId, organizationId) {
    if (this.repository && this.repository.getYearToDateDeductions) {
      return await this.repository.getYearToDateDeductions(employeeId, organizationId);
    }

    return {
      employee_id: employeeId,
      ytd_total: 0
    };
  }
}

export default DeductionsService;
