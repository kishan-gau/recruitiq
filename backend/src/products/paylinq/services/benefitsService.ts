/**
 * Benefits Service
 * Business logic for managing employee benefits
 */

import PayrollRepository from '../repositories/payrollRepository.js';

/**
 * Benefit types
 */
export const BENEFIT_TYPES = {
  HEALTH_INSURANCE: 'health_insurance',
  DENTAL_INSURANCE: 'dental_insurance',
  VISION_INSURANCE: 'vision_insurance',
  LIFE_INSURANCE: 'life_insurance',
  RETIREMENT_401K: 'retirement_401k',
  HSA: 'hsa',
  FSA: 'fsa'
};

const VALID_PLAN_TYPES = ['health', 'dental', 'vision', 'life', 'retirement', 'hsa', 'fsa', 'wellness'];
const VALID_COVERAGE_LEVELS = ['employee_only', 'employee_spouse', 'employee_children', 'family'];

const COVERAGE_MULTIPLIERS = {
  employee_only: 1,
  employee_spouse: 1.5,
  employee_children: 1.75,
  family: 2
};

class BenefitsService {
  constructor(payrollRepository = null) {
    this.payrollRepository = payrollRepository || new PayrollRepository();
  }

  /**
   * Create a new benefit
   */
  async createBenefit(benefitData, organizationId, userId) {
    // Validate benefit type
    if (!Object.values(BENEFIT_TYPES).includes(benefitData.benefit_type)) {
      throw new Error('Invalid benefit type');
    }

    // Implementation would go here
    return {
      id: '123',
      ...benefitData,
      organization_id: organizationId,
      created_by: userId
    };
  }

  /**
   * Get benefit by ID
   */
  async getBenefitById(benefitId, organizationId) {
    // Implementation would go here
    return null;
  }

  /**
   * Get all benefits for employee
   */
  async getEmployeeBenefits(employeeId, organizationId) {
    // Implementation would go here
    return [];
  }

  /**
   * Calculate benefit deduction
   */
  calculateBenefitDeduction(benefit, grossPay) {
    if (benefit.calculation_type === 'percentage') {
      return (grossPay * benefit.employee_contribution) / 100;
    }
    return benefit.employee_contribution;
  }

  /**
   * Enroll employee in benefit
   */
  async enrollEmployeeBenefit(employeeId, benefitId, options) {
    // Implementation would go here
    return {
      id: '123',
      employee_id: employeeId,
      benefit_id: benefitId,
      ...options,
      status: 'active'
    };
  }

  /**
   * Create a new benefit plan
   */
  async createBenefitPlan(planData, organizationId, userId) {
    // Validate required fields
    if (!planData.planName || !planData.planType || 
        planData.employerCost === undefined || planData.employeeCost === undefined ||
        planData.isActive === undefined) {
      throw new Error('Missing required fields for benefit plan');
    }

    // Validate plan type
    if (!VALID_PLAN_TYPES.includes(planData.planType)) {
      throw new Error(`Invalid plan type: ${planData.planType}`);
    }

    // Validate costs are positive
    if (planData.employerCost < 0 || planData.employeeCost < 0) {
      throw new Error('Benefit costs must be positive');
    }

    return await this.payrollRepository.createBenefitPlan(planData, organizationId, userId);
  }

  /**
   * Update an existing benefit plan
   */
  async updateBenefitPlan(planId, updates, organizationId, userId) {
    return await this.payrollRepository.updateBenefitPlan(planId, updates, organizationId, userId);
  }

  /**
   * Get all benefit plans for an organization
   */
  async getBenefitPlans(organizationId, filters = {}) {
    return await this.payrollRepository.findBenefitPlans(organizationId, filters);
  }

  /**
   * Apply coverage level multiplier to base cost
   */
  applyCoverageLevelMultiplier(baseCost, coverageLevel) {
    const multiplier = COVERAGE_MULTIPLIERS[coverageLevel] || 1;
    return baseCost * multiplier;
  }

  /**
   * Enroll employee in benefit plan
   */
  async enrollEmployee(enrollmentData, organizationId, userId) {
    // Extract data from enrollmentData
    const { employeeRecordId, benefitPlanId, coverageLevel } = enrollmentData;

    // Validate coverage level
    if (!VALID_COVERAGE_LEVELS.includes(coverageLevel)) {
      throw new Error(`Invalid coverage level: ${coverageLevel}`);
    }

    // Get plan details to calculate employee cost
    const plan = await this.payrollRepository.findBenefitPlanById(benefitPlanId, organizationId);
    if (!plan) {
      throw new Error(`Benefit plan not found: ${benefitPlanId}`);
    }

    // Calculate employee cost based on coverage level
    const employeeCost = this.applyCoverageLevelMultiplier(plan.employee_cost, coverageLevel);

    const enrollment = {
      ...enrollmentData,
      employee_cost: employeeCost
    };

    return await this.payrollRepository.createBenefitEnrollment(
      enrollment,
      organizationId,
      userId
    );
  }


  /**
   * Unenroll employee from benefit plan
   */
  async unenrollEmployee(enrollmentId, terminationDate, organizationId, userId) {
    return await this.payrollRepository.updateBenefitEnrollment(enrollmentId, {
      status: 'inactive',
      termination_date: terminationDate
    }, organizationId, userId);
  }

  /**
   * Get active enrollments for employee
   */
  async getEmployeeEnrollments(employeeId, organizationId) {
    return await this.payrollRepository.findBenefitEnrollments(employeeId, organizationId);
  }

  /**
   * Calculate total benefit costs for employee
   */
  async calculateBenefitCosts(employeeId, organizationId) {
    const enrollments = await this.payrollRepository.findBenefitEnrollments(employeeId, organizationId);
    
    if (enrollments.length === 0) {
      return {
        totalEmployeeCost: 0,
        totalEmployerCost: 0,
        totalCost: 0,
        benefits: []
      };
    }

    let totalEmployeeCost = 0;
    let totalEmployerCost = 0;
    const benefits = [];

    for (const enrollment of enrollments) {
      const employeeCost = enrollment.employee_cost || 0;
      const employerCost = enrollment.employer_cost || 0;

      totalEmployeeCost += employeeCost;
      totalEmployerCost += employerCost;

      benefits.push({
        planId: enrollment.plan_id,
        employeeCost,
        employerCost,
        coverageLevel: enrollment.coverage_level
      });
    }

    return {
      totalEmployeeCost,
      totalEmployerCost,
      totalCost: totalEmployeeCost + totalEmployerCost,
      benefits
    };
  }

  /**
   * Calculate total benefit costs for organization
   */
  async calculateOrganizationBenefitCosts(organizationId) {
    const allEnrollments = await this.payrollRepository.findAllBenefitEnrollments(organizationId);
    
    let totalEmployeeCost = 0;
    let totalEmployerCost = 0;

    for (const enrollment of allEnrollments) {
      totalEmployeeCost += enrollment.employee_cost || 0;
      totalEmployerCost += enrollment.employer_cost || 0;
    }

    return {
      totalEmployeeCost,
      totalEmployerCost,
      totalCost: totalEmployeeCost + totalEmployerCost,
      enrollmentCount: allEnrollments.length
    };
  }

  /**
   * Get benefit utilization report
   */
  async getBenefitUtilizationReport(organizationId) {
    const plans = await this.payrollRepository.findBenefitPlans(organizationId);
    const allEnrollments = await this.payrollRepository.findAllBenefitEnrollments(organizationId);

    const planReports = plans.map(plan => {
      const enrollments = allEnrollments.filter(e => e.benefit_plan_id === plan.id);
      return {
        planId: plan.id,
        planName: plan.plan_name,
        planType: plan.plan_type,
        enrollmentCount: enrollments.length,
        totalCost: enrollments.reduce((sum, e) => {
          return sum + (e.employee_cost || 0) + (e.employer_cost || 0);
        }, 0)
      };
    });

    return {
      plans: planReports,
      totalEnrollments: allEnrollments.length
    };
  }

  /**
   * Get benefit cost summary by plan type
   */
  async getBenefitCostSummary(organizationId) {
    const allEnrollments = await this.payrollRepository.findAllBenefitEnrollments(organizationId);

    const summary = {};

    for (const enrollment of allEnrollments) {
      const planType = enrollment.plan_type;
      
      if (!summary[planType]) {
        summary[planType] = {
          planType: planType,
          totalEmployeeCost: 0,
          totalEmployerCost: 0,
          enrollmentCount: 0
        };
      }

      summary[planType].totalEmployeeCost += enrollment.employee_cost || 0;
      summary[planType].totalEmployerCost += enrollment.employer_cost || 0;
      summary[planType].enrollmentCount += 1;
    }

    return {
      byType: summary
    };
  }
}

export default BenefitsService;
