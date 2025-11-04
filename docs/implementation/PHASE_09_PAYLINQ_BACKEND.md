# Phase 9: Paylinq Product - Backend Implementation

**Duration:** 7 days  
**Dependencies:** Phase 8 (Enhanced Paylinq Database Schema)  
**Team:** Backend Team (4 developers)  
**Status:** Not Started

---

## 📋 Overview

This phase implements the comprehensive enterprise-grade backend for the Paylinq payroll product, including repositories, services, controllers, and routes for all 35 database tables. The implementation covers advanced worker type management, sophisticated tax calculation engine, flexible pay components, time & attendance tracking, work scheduling, payroll processing, reconciliation, and payment processing.

**Implementation Approach:** Build complete service layer for all ERD tables with simplified MVP business logic initially. Complex formula evaluation, advanced tax calculations, and automated scheduling marked as Phase 2 enhancements.

---

## 🎯 Objectives

1. Implement repository layer for all 35 payroll tables
2. Create comprehensive service layer with business logic
3. Implement worker type management services
4. Build sophisticated tax calculation engine (MVP version)
5. Create flexible pay component system
6. Implement time & attendance tracking services
7. Build work scheduling services
8. Implement payroll calculation and processing engine
9. Create reconciliation services
10. Implement payment processing services
11. Create controllers for all endpoints
12. Set up routes with proper middleware and validation
13. Create product configuration with feature tiers
14. Implement integration event handlers
15. Add comprehensive error handling and logging

---

## 📊 Deliverables

### 1. Product Configuration

**File:** `backend/src/products/paylinq/config/product.config.js`

```javascript
/**
 * Paylinq Product Configuration
 */
export default {
  id: 'paylinq',
  name: 'Paylinq',
  displayName: 'Paylinq Payroll',
  version: '1.0.0',
  description: 'Payroll Management System',
  
  routes: {
    prefix: '/api/payroll',
    version: 'v1'
  },
  
  database: {
    schema: 'payroll',
    tables: [
      // Worker Type Management
      'worker_type_template',
      'worker_type',
      
      // Employee & Compensation
      'employee_record',
      'compensation',
      'custom_pay_component',
      
      // Pay Components
      'pay_component',
      'component_formula',
      
      // Tax Engine
      'tax_rule_set',
      'tax_bracket',
      'allowance',
      'deductible_cost_rule',
      
      // Time & Attendance
      'shift_type',
      'time_attendance_event',
      'time_entry',
      'rated_time_line',
      'timesheet',
      
      // Scheduling
      'work_schedule',
      'schedule_change_request',
      
      // Payroll Processing
      'payroll_run',
      'paycheck',
      'payroll_run_component',
      
      // Deductions & Payments
      'employee_deduction',
      'payment_transaction',
      
      // Reconciliation
      'reconciliation',
      'reconciliation_item',
      'payroll_adjustment'
    ]
  },
  
  tiers: {
    starter: {
      name: 'Starter',
      features: [
        'basic_payroll', 
        'timesheets', 
        'direct_deposit',
        'basic_tax_calculation',
        'single_worker_type'
      ],
      limits: {
        maxEmployees: 25,
        maxPayrollRuns: 24,
        maxWorkerTypes: 2,
        maxPayComponents: 10
      }
    },
    professional: {
      name: 'Professional',
      features: [
        'basic_payroll', 
        'timesheets', 
        'direct_deposit', 
        'advanced_tax_calculation',
        'multi_worker_types',
        'custom_pay_components',
        'time_attendance',
        'basic_scheduling',
        'reports',
        'multi_state'
      ],
      limits: {
        maxEmployees: 100,
        maxPayrollRuns: -1,
        maxWorkerTypes: 10,
        maxPayComponents: 50
      }
    },
    enterprise: {
      name: 'Enterprise',
      features: 'all', // Includes reconciliation, formula engine, advanced scheduling
      limits: {
        maxEmployees: -1,
        maxPayrollRuns: -1,
        maxWorkerTypes: -1,
        maxPayComponents: -1
      }
    }
  },
  
  dependencies: ['core'],
  
  integrations: {
    provides: ['payroll.processed'],
    consumes: ['employee.created', 'employee.updated']
  }
};
```

### 2. Repository Layer

**File:** `backend/src/products/paylinq/repositories/payrollRepository.js`

```javascript
/**
 * Payroll Repository
 * Data access layer for payroll operations
 */
import { query } from '../../../shared/database/query.js';
import logger from '../../../shared/utils/logger.js';

class PayrollRepository {
  /**
   * Create employee payroll record
   */
  async createEmployeeRecord(employeeData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.employee_records 
      (organization_id, employee_id, employee_number, pay_frequency, 
       payment_method, currency, status, start_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        organizationId,
        employeeData.employeeId,
        employeeData.employeeNumber,
        employeeData.payFrequency,
        employeeData.paymentMethod,
        employeeData.currency || 'USD',
        'active',
        employeeData.startDate,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.employee_records', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get employee payroll records
   */
  async findByOrganization(organizationId, filters = {}) {
    let whereClause = 'WHERE er.organization_id = $1 AND er.deleted_at IS NULL';
    const params = [organizationId];
    let paramCount = 1;
    
    if (filters.status) {
      paramCount++;
      whereClause += ` AND er.status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.employeeId) {
      paramCount++;
      whereClause += ` AND er.employee_id = $${paramCount}`;
      params.push(filters.employeeId);
    }
    
    const result = await query(
      `SELECT 
        er.*,
        c.compensation_type,
        c.amount as current_compensation
      FROM payroll.employee_records er
      LEFT JOIN payroll.compensation c ON c.employee_record_id = er.id AND c.is_current = true
      ${whereClause}
      ORDER BY er.created_at DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.employee_records' }
    );
    
    return result.rows;
  }

  /**
   * Create payroll run
   */
  async createPayrollRun(runData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.payroll_runs 
      (organization_id, run_number, run_name, pay_period_start, 
       pay_period_end, payment_date, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        organizationId,
        runData.runNumber,
        runData.runName,
        runData.payPeriodStart,
        runData.payPeriodEnd,
        runData.paymentDate,
        'draft',
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.payroll_runs', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Create timesheet
   */
  async createTimesheet(timesheetData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.timesheets 
      (organization_id, employee_record_id, period_start, period_end,
       regular_hours, overtime_hours, pto_hours, sick_hours, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        organizationId,
        timesheetData.employeeRecordId,
        timesheetData.periodStart,
        timesheetData.periodEnd,
        timesheetData.regularHours || 0,
        timesheetData.overtimeHours || 0,
        timesheetData.ptoHours || 0,
        timesheetData.sickHours || 0,
        'draft',
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.timesheets', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get timesheets for approval
   */
  async findTimesheetsForApproval(organizationId, filters = {}) {
    let whereClause = 'WHERE t.organization_id = $1 AND t.deleted_at IS NULL AND t.status = $2';
    const params = [organizationId, filters.status || 'submitted'];
    
    const result = await query(
      `SELECT 
        t.*,
        er.employee_number,
        er.employee_id
      FROM payroll.timesheets t
      INNER JOIN payroll.employee_records er ON er.id = t.employee_record_id
      ${whereClause}
      ORDER BY t.period_start DESC`,
      params,
      organizationId,
      { operation: 'SELECT', table: 'payroll.timesheets' }
    );
    
    return result.rows;
  }

  /**
   * Update timesheet status
   */
  async updateTimesheetStatus(timesheetId, status, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.timesheets 
      SET status = $1, 
          approved_by = $2,
          approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END,
          updated_by = $2,
          updated_at = NOW()
      WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
      RETURNING *`,
      [status, userId, timesheetId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.timesheets', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Create paycheck
   */
  async createPaycheck(paycheckData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.paychecks 
      (organization_id, payroll_run_id, employee_record_id, payment_date,
       pay_period_start, pay_period_end, gross_pay, regular_pay, overtime_pay,
       federal_tax, state_tax, social_security, medicare, net_pay,
       payment_method, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        organizationId,
        paycheckData.payrollRunId,
        paycheckData.employeeRecordId,
        paycheckData.paymentDate,
        paycheckData.payPeriodStart,
        paycheckData.payPeriodEnd,
        paycheckData.grossPay,
        paycheckData.regularPay || 0,
        paycheckData.overtimePay || 0,
        paycheckData.federalTax || 0,
        paycheckData.stateTax || 0,
        paycheckData.socialSecurity || 0,
        paycheckData.medicare || 0,
        paycheckData.netPay,
        paycheckData.paymentMethod,
        'pending',
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.paychecks', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get current compensation for employee
   */
  async findCurrentCompensation(employeeRecordId, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.compensation
      WHERE employee_record_id = $1 
        AND organization_id = $2
        AND is_current = true
        AND deleted_at IS NULL`,
      [employeeRecordId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.compensation' }
    );
    
    return result.rows[0];
  }

  /**
   * Get tax rates
   */
  async findTaxRates(country, state = null) {
    let whereClause = 'WHERE country = $1 AND is_current = true';
    const params = [country];
    
    if (state) {
      whereClause += ' AND state = $2';
      params.push(state);
    }
    
    const result = await query(
      `SELECT * FROM payroll.tax_rates ${whereClause}`,
      params,
      null, // No organization_id for tax rates (global data)
      { operation: 'SELECT', table: 'payroll.tax_rates' }
    );
    
    return result.rows;
  }
}

export default PayrollRepository;
```

**Additional Repository Files** (one per major domain):

- `workerTypeRepository.js` - Worker type templates and assignments
- `taxEngineRepository.js` - Tax rule sets, brackets, allowances
- `payComponentRepository.js` - Pay components, formulas, custom components
- `timeAttendanceRepository.js` - Clock events, time entries, rated lines
- `schedulingRepository.js` - Work schedules, change requests
- `reconciliationRepository.js` - Reconciliation records and items
- `deductionRepository.js` - Employee deductions
- `paymentRepository.js` - Payment transactions

**Example: Worker Type Repository**

**File:** `backend/src/products/paylinq/repositories/workerTypeRepository.js`

```javascript
/**
 * Worker Type Repository
 * Manages worker type templates and employee assignments
 */
import { query } from '../../../shared/database/query.js';

class WorkerTypeRepository {
  /**
   * Create worker type template
   */
  async createTemplate(templateData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.worker_type_template 
      (organization_id, name, code, description, default_pay_frequency,
       default_payment_method, benefits_eligible, overtime_eligible, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        organizationId,
        templateData.name,
        templateData.code,
        templateData.description,
        templateData.defaultPayFrequency,
        templateData.defaultPaymentMethod,
        templateData.benefitsEligible,
        templateData.overtimeEligible,
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.worker_type_template', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Assign worker type to employee
   */
  async assignWorkerType(assignmentData, organizationId, userId) {
    // Set previous assignment to non-current
    await query(
      `UPDATE payroll.worker_type 
      SET is_current = false, effective_to = $1, updated_at = NOW()
      WHERE employee_id = $2 AND organization_id = $3 AND is_current = true`,
      [assignmentData.effectiveFrom, assignmentData.employeeId, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'payroll.worker_type', userId }
    );
    
    // Create new assignment
    const result = await query(
      `INSERT INTO payroll.worker_type 
      (organization_id, employee_id, worker_type_template_id, effective_from, 
       pay_frequency, payment_method, is_current, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, true, $7)
      RETURNING *`,
      [
        organizationId,
        assignmentData.employeeId,
        assignmentData.workerTypeTemplateId,
        assignmentData.effectiveFrom,
        assignmentData.payFrequency, // Optional override
        assignmentData.paymentMethod, // Optional override
        userId
      ],
      organizationId,
      { operation: 'INSERT', table: 'payroll.worker_type', userId }
    );
    
    return result.rows[0];
  }

  /**
   * Get current worker type for employee
   */
  async findCurrentWorkerType(employeeId, organizationId) {
    const result = await query(
      `SELECT wt.*, wtt.name as template_name, wtt.code as template_code,
              wtt.benefits_eligible, wtt.overtime_eligible
      FROM payroll.worker_type wt
      INNER JOIN payroll.worker_type_template wtt ON wtt.id = wt.worker_type_template_id
      WHERE wt.employee_id = $1 
        AND wt.organization_id = $2
        AND wt.is_current = true
        AND wt.deleted_at IS NULL`,
      [employeeId, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'payroll.worker_type' }
    );
    
    return result.rows[0];
  }
}

export default WorkerTypeRepository;
```

**Example: Tax Engine Repository**

**File:** `backend/src/products/paylinq/repositories/taxEngineRepository.js`

```javascript
/**
 * Tax Engine Repository
 * Manages tax calculations including rule sets, brackets, and allowances
 */
import { query } from '../../../shared/database/query.js';

class TaxEngineRepository {
  /**
   * Get applicable tax rule sets
   */
  async findApplicableTaxRuleSets(country, state, locality, effectiveDate, organizationId) {
    const result = await query(
      `SELECT trs.*, 
              COUNT(tb.id) as bracket_count
      FROM payroll.tax_rule_set trs
      LEFT JOIN payroll.tax_bracket tb ON tb.tax_rule_set_id = trs.id
      WHERE trs.organization_id = $1
        AND trs.country = $2
        AND ($3::varchar IS NULL OR trs.state = $3)
        AND ($4::varchar IS NULL OR trs.locality = $4)
        AND trs.effective_from <= $5
        AND (trs.effective_to IS NULL OR trs.effective_to >= $5)
        AND trs.is_active = true
        AND trs.deleted_at IS NULL
      GROUP BY trs.id
      ORDER BY trs.tax_type, trs.effective_from DESC`,
      [organizationId, country, state, locality, effectiveDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.tax_rule_set' }
    );
    
    return result.rows;
  }

  /**
   * Get tax brackets for rule set
   */
  async findTaxBrackets(taxRuleSetId) {
    const result = await query(
      `SELECT * FROM payroll.tax_bracket
      WHERE tax_rule_set_id = $1
      ORDER BY bracket_order ASC`,
      [taxRuleSetId],
      null,
      { operation: 'SELECT', table: 'payroll.tax_bracket' }
    );
    
    return result.rows;
  }

  /**
   * Calculate tax for income using brackets
   * Phase 2 Enhancement: Move to sophisticated tax service with multi-jurisdiction support
   */
  async calculateBracketTax(income, brackets) {
    let totalTax = 0;
    let remainingIncome = income;
    
    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;
      
      const bracketIncome = bracket.income_max 
        ? Math.min(remainingIncome, bracket.income_max - bracket.income_min)
        : remainingIncome;
      
      const bracketTax = (bracketIncome * bracket.rate_percentage / 100) + parseFloat(bracket.fixed_amount);
      totalTax += bracketTax;
      remainingIncome -= bracketIncome;
    }
    
    return totalTax;
  }

  /**
   * Get allowances
   */
  async findApplicableAllowances(country, state, effectiveDate, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.allowance
      WHERE organization_id = $1
        AND country = $2
        AND ($3::varchar IS NULL OR state = $3)
        AND effective_from <= $4
        AND (effective_to IS NULL OR effective_to >= $4)
        AND is_active = true
        AND deleted_at IS NULL`,
      [organizationId, country, state, effectiveDate],
      organizationId,
      { operation: 'SELECT', table: 'payroll.allowance' }
    );
    
    return result.rows;
  }
}

export default TaxEngineRepository;
```

### 3. Service Layer with Business Logic

**File:** `backend/src/products/paylinq/services/payrollService.js`

```javascript
/**
 * Payroll Service
 * Business logic for payroll operations
 */
import Joi from 'joi';
import PayrollRepository from '../repositories/payrollRepository.js';
import { ValidationError, NotFoundError } from '../../../shared/utils/errors.js';
import logger from '../../../shared/utils/logger.js';

class PayrollService {
  constructor(repository = null) {
    this.repository = repository || new PayrollRepository();
  }

  static get createEmployeeRecordSchema() {
    return Joi.object({
      employeeId: Joi.string().uuid().required(),
      employeeNumber: Joi.string().required().trim().max(50),
      payFrequency: Joi.string().valid('weekly', 'bi-weekly', 'semi-monthly', 'monthly').required(),
      paymentMethod: Joi.string().valid('direct_deposit', 'check', 'cash').required(),
      currency: Joi.string().length(3).default('USD'),
      startDate: Joi.date().required(),
      bankName: Joi.string().optional().max(200),
      accountNumber: Joi.string().optional().max(100),
      routingNumber: Joi.string().optional().max(50),
      accountType: Joi.string().valid('checking', 'savings').optional(),
      taxId: Joi.string().optional().max(50),
      taxFilingStatus: Joi.string().valid('single', 'married', 'head_of_household').optional(),
      taxAllowances: Joi.number().integer().min(0).default(0),
      additionalWithholding: Joi.number().min(0).default(0)
    }).options({ stripUnknown: true });
  }

  static get createTimesheetSchema() {
    return Joi.object({
      employeeRecordId: Joi.string().uuid().required(),
      periodStart: Joi.date().required(),
      periodEnd: Joi.date().required().greater(Joi.ref('periodStart')),
      regularHours: Joi.number().min(0).max(168).default(0),
      overtimeHours: Joi.number().min(0).max(80).default(0),
      ptoHours: Joi.number().min(0).default(0),
      sickHours: Joi.number().min(0).default(0),
      notes: Joi.string().optional().max(1000)
    }).options({ stripUnknown: true });
  }

  static get createPayrollRunSchema() {
    return Joi.object({
      runNumber: Joi.string().required().trim().max(50),
      runName: Joi.string().optional().trim().max(200),
      payPeriodStart: Joi.date().required(),
      payPeriodEnd: Joi.date().required().greater(Joi.ref('payPeriodStart')),
      paymentDate: Joi.date().required()
    }).options({ stripUnknown: true });
  }

  /**
   * Create employee payroll record
   */
  async createEmployeeRecord(data, organizationId, userId) {
    try {
      const validated = await this.constructor.createEmployeeRecordSchema.validateAsync(data);
      
      logger.info('Creating employee payroll record', {
        organizationId,
        employeeId: validated.employeeId
      });
      
      const record = await this.repository.createEmployeeRecord(validated, organizationId, userId);
      
      logger.info('Employee payroll record created', {
        id: record.id,
        organizationId
      });
      
      return record;
    } catch (error) {
      if (error.isJoi) {
        throw new ValidationError(error.message);
      }
      logger.error('Failed to create employee record:', error);
      throw error;
    }
  }

  /**
   * Calculate payroll for a run
   */
  async calculatePayroll(payrollRunId, organizationId, userId) {
    try {
      logger.info('Calculating payroll', { payrollRunId, organizationId });
      
      // Get payroll run
      const payrollRun = await this.repository.findPayrollRunById(payrollRunId, organizationId);
      if (!payrollRun) {
        throw new NotFoundError('Payroll run not found');
      }
      
      // Get all active employees
      const employees = await this.repository.findByOrganization(organizationId, { status: 'active' });
      
      const paychecks = [];
      
      for (const employee of employees) {
        // Get timesheets for pay period
        const timesheets = await this.repository.findTimesheets({
          employeeRecordId: employee.id,
          periodStart: payrollRun.pay_period_start,
          periodEnd: payrollRun.pay_period_end,
          status: 'approved'
        }, organizationId);
        
        // Calculate total hours
        const totalRegularHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.regular_hours), 0);
        const totalOvertimeHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.overtime_hours), 0);
        
        // Get compensation
        const compensation = await this.repository.findCurrentCompensation(employee.id, organizationId);
        if (!compensation) continue;
        
        // Calculate gross pay
        let grossPay = 0;
        let regularPay = 0;
        let overtimePay = 0;
        
        if (compensation.compensation_type === 'hourly') {
          regularPay = totalRegularHours * parseFloat(compensation.hourly_rate);
          overtimePay = totalOvertimeHours * parseFloat(compensation.overtime_rate || compensation.hourly_rate * 1.5);
          grossPay = regularPay + overtimePay;
        } else if (compensation.compensation_type === 'salary') {
          grossPay = parseFloat(compensation.pay_period_amount);
          regularPay = grossPay;
        }
        
        // Calculate taxes
        const taxes = await this.calculateTaxes(grossPay, employee, organizationId);
        
        // Calculate net pay
        const netPay = grossPay - taxes.federalTax - taxes.stateTax - taxes.socialSecurity - taxes.medicare;
        
        // Create paycheck
        const paycheck = await this.repository.createPaycheck({
          payrollRunId,
          employeeRecordId: employee.id,
          paymentDate: payrollRun.payment_date,
          payPeriodStart: payrollRun.pay_period_start,
          payPeriodEnd: payrollRun.pay_period_end,
          grossPay,
          regularPay,
          overtimePay,
          federalTax: taxes.federalTax,
          stateTax: taxes.stateTax,
          socialSecurity: taxes.socialSecurity,
          medicare: taxes.medicare,
          netPay,
          paymentMethod: employee.payment_method
        }, organizationId, userId);
        
        paychecks.push(paycheck);
      }
      
      // Update payroll run summary
      await this.updatePayrollRunSummary(payrollRunId, paychecks, organizationId, userId);
      
      logger.info('Payroll calculated', {
        payrollRunId,
        employeeCount: paychecks.length,
        organizationId
      });
      
      return { payrollRun, paychecks };
    } catch (error) {
      logger.error('Failed to calculate payroll:', error);
      throw error;
    }
  }

  /**
   * Calculate taxes for an employee
   */
  async calculateTaxes(grossPay, employee, organizationId) {
    // Simplified tax calculation - in production, use actual tax tables
    const federalTaxRate = 0.12; // 12% federal
    const stateTaxRate = 0.05;   // 5% state (varies by state)
    const socialSecurityRate = 0.062; // 6.2%
    const medicareRate = 0.0145;      // 1.45%
    
    return {
      federalTax: grossPay * federalTaxRate,
      stateTax: grossPay * stateTaxRate,
      socialSecurity: grossPay * socialSecurityRate,
      medicare: grossPay * medicareRate
    };
  }

  /**
   * Update payroll run summary
   */
  async updatePayrollRunSummary(payrollRunId, paychecks, organizationId, userId) {
    const totalEmployees = paychecks.length;
    const totalGrossPay = paychecks.reduce((sum, pc) => sum + parseFloat(pc.gross_pay), 0);
    const totalNetPay = paychecks.reduce((sum, pc) => sum + parseFloat(pc.net_pay), 0);
    const totalTaxes = paychecks.reduce((sum, pc) => 
      sum + parseFloat(pc.federal_tax) + parseFloat(pc.state_tax) + 
      parseFloat(pc.social_security) + parseFloat(pc.medicare), 0);
    
    await this.repository.updatePayrollRunSummary(
      payrollRunId,
      {
        totalEmployees,
        totalGrossPay,
        totalNetPay,
        totalTaxes,
        status: 'calculated',
        calculatedAt: new Date()
      },
      organizationId,
      userId
    );
  }

  /**
   * Approve timesheet
   */
  async approveTimesheet(timesheetId, organizationId, userId) {
    try {
      logger.info('Approving timesheet', { timesheetId, organizationId });
      
      const timesheet = await this.repository.updateTimesheetStatus(
        timesheetId,
        'approved',
        organizationId,
        userId
      );
      
      if (!timesheet) {
        throw new NotFoundError('Timesheet not found');
      }
      
      logger.info('Timesheet approved', { timesheetId });
      return timesheet;
    } catch (error) {
      logger.error('Failed to approve timesheet:', error);
      throw error;
    }
  }
}

export default PayrollService;
```

**Additional Service Files** (comprehensive business logic):

- `workerTypeService.js` - Worker type management
- `taxCalculationService.js` - Tax engine (MVP: simple bracket calculation)
- `payComponentService.js` - Pay component management
- `timeAttendanceService.js` - Clock in/out, time entry management
- `schedulingService.js` - Work schedule management
- `reconciliationService.js` - Payroll reconciliation
- `paymentService.js` - Payment processing
- `formulaEngineService.js` - Formula evaluation (Phase 2: advanced)

**Example: Tax Calculation Service (MVP)**

**File:** `backend/src/products/paylinq/services/taxCalculationService.js`

```javascript
/**
 * Tax Calculation Service (MVP Version)
 * Simple bracket-based tax calculation
 * Phase 2 Enhancement: Multi-jurisdictional, withholding certificates, tax treaties
 */
import TaxEngineRepository from '../repositories/taxEngineRepository.js';
import logger from '../../../shared/utils/logger.js';

class TaxCalculationService {
  constructor(repository = null) {
    this.repository = repository || new TaxEngineRepository();
  }

  /**
   * Calculate taxes for a paycheck (MVP: Simple bracket-based)
   */
  async calculateTaxes(grossPay, employeeRecord, effectiveDate, organizationId) {
    try {
      const taxes = {
        federalIncome: 0,
        stateIncome: 0,
        socialSecurity: 0,
        medicare: 0,
        total: 0
      };

      // Get applicable tax rule sets
      const taxRuleSets = await this.repository.findApplicableTaxRuleSets(
        'USA',
        employeeRecord.state,
        null,
        effectiveDate,
        organizationId
      );

      // Calculate each tax type
      for (const ruleSet of taxRuleSets) {
        const brackets = await this.repository.findTaxBrackets(ruleSet.id);
        const taxAmount = await this.repository.calculateBracketTax(grossPay, brackets);

        switch (ruleSet.tax_type) {
          case 'federal_income':
            taxes.federalIncome = taxAmount;
            break;
          case 'state_income':
            taxes.stateIncome = taxAmount;
            break;
          case 'social_security':
            taxes.socialSecurity = Math.min(taxAmount, ruleSet.annual_cap || Infinity);
            break;
          case 'medicare':
            taxes.medicare = taxAmount;
            break;
        }
      }

      taxes.total = taxes.federalIncome + taxes.stateIncome + taxes.socialSecurity + taxes.medicare;

      logger.info('Taxes calculated', {
        grossPay,
        totalTax: taxes.total,
        employeeId: employeeRecord.employee_id
      });

      return taxes;
    } catch (error) {
      logger.error('Tax calculation failed:', error);
      throw error;
    }
  }

  /**
   * Get tax summary for year
   */
  async getYearToDateTaxSummary(employeeRecordId, year, organizationId) {
    // Implementation for YTD tax summary
    // Phase 2: Add quarterly projections, tax filing preparation
  }
}

export default TaxCalculationService;
```

**Example: Time Attendance Service**

**File:** `backend/src/products/paylinq/services/timeAttendanceService.js`

```javascript
/**
 * Time Attendance Service
 * Manages clock in/out and time entry processing
 * Phase 2 Enhancement: Biometric integration, GPS verification, automated calculations
 */
import Joi from 'joi';
import TimeAttendanceRepository from '../repositories/timeAttendanceRepository.js';
import { ValidationError, BusinessRuleError } from '../../../shared/utils/errors.js';
import logger from '../../../shared/utils/logger.js';

class TimeAttendanceService {
  constructor(repository = null) {
    this.repository = repository || new TimeAttendanceRepository();
  }

  static get clockInSchema() {
    return Joi.object({
      employeeRecordId: Joi.string().uuid().required(),
      eventType: Joi.string().valid('clock_in').required(),
      locationId: Joi.string().uuid().optional(),
      gpsCoordinates: Joi.object({
        latitude: Joi.number().required(),
        longitude: Joi.number().required()
      }).optional(),
      deviceId: Joi.string().max(100).optional(),
      notes: Joi.string().max(500).optional()
    }).options({ stripUnknown: true });
  }

  /**
   * Clock in employee
   */
  async clockIn(data, organizationId, userId) {
    try {
      const validated = await this.constructor.clockInSchema.validateAsync(data);

      // Check if already clocked in
      const existingEvent = await this.repository.findOpenClockEvent(
        validated.employeeRecordId,
        organizationId
      );

      if (existingEvent) {
        throw new BusinessRuleError('Employee is already clocked in');
      }

      // Create clock in event
      const event = await this.repository.createTimeEvent({
        ...validated,
        eventTimestamp: new Date()
      }, organizationId, userId);

      logger.info('Employee clocked in', {
        employeeRecordId: validated.employeeRecordId,
        eventId: event.id
      });

      return event;
    } catch (error) {
      if (error.isJoi) {
        throw new ValidationError(error.message);
      }
      throw error;
    }
  }

  /**
   * Clock out and create time entry
   */
  async clockOut(data, organizationId, userId) {
    // Find matching clock in
    const clockInEvent = await this.repository.findOpenClockEvent(
      data.employeeRecordId,
      organizationId
    );

    if (!clockInEvent) {
      throw new BusinessRuleError('No open clock-in found');
    }

    // Create clock out event
    const clockOutEvent = await this.repository.createTimeEvent({
      employeeRecordId: data.employeeRecordId,
      eventType: 'clock_out',
      eventTimestamp: new Date(),
      ...data
    }, organizationId, userId);

    // Calculate hours
    const totalHours = this.calculateHoursBetween(
      clockInEvent.event_timestamp,
      clockOutEvent.event_timestamp
    );

    // Create time entry
    const timeEntry = await this.repository.createTimeEntry({
      employeeRecordId: data.employeeRecordId,
      entryDate: clockOutEvent.event_timestamp,
      clockIn: clockInEvent.event_timestamp,
      clockOut: clockOutEvent.event_timestamp,
      totalHours,
      entryType: 'regular',
      status: 'submitted'
    }, organizationId, userId);

    logger.info('Employee clocked out', {
      employeeRecordId: data.employeeRecordId,
      hours: totalHours
    });

    return { clockOutEvent, timeEntry };
  }

  /**
   * Calculate hours between timestamps
   */
  calculateHoursBetween(start, end) {
    const diffMs = new Date(end) - new Date(start);
    return (diffMs / (1000 * 60 * 60)).toFixed(2);
  }

  /**
   * Approve time entry and create rated time lines
   */
  async approveTimeEntry(timeEntryId, organizationId, userId) {
    // Get time entry
    const timeEntry = await this.repository.findTimeEntryById(timeEntryId, organizationId);

    // Get employee's custom pay components
    const payComponents = await this.repository.findEmployeePayComponents(
      timeEntry.employee_record_id,
      organizationId
    );

    // Create rated time lines (MVP: simple rate application)
    // Phase 2: Apply shift differentials, formulas, complex rate rules
    for (const component of payComponents) {
      if (component.calculation_type === 'hourly_rate') {
        await this.repository.createRatedTimeLine({
          timeEntryId: timeEntry.id,
          payComponentId: component.id,
          hours: timeEntry.worked_hours,
          rate: component.custom_rate || component.default_rate,
          amount: timeEntry.worked_hours * (component.custom_rate || component.default_rate)
        }, organizationId);
      }
    }

    // Update time entry status
    await this.repository.updateTimeEntryStatus(
      timeEntryId,
      'approved',
      organizationId,
      userId
    );

    return timeEntry;
  }
}

export default TimeAttendanceService;
```

**Example: Reconciliation Service**

**File:** `backend/src/products/paylinq/services/reconciliationService.js`

```javascript
/**
 * Reconciliation Service
 * Payroll reconciliation and variance tracking
 * Phase 2 Enhancement: Automated bank reconciliation, GL integration
 */
import ReconciliationRepository from '../repositories/reconciliationRepository.js';
import { ValidationError } from '../../../shared/utils/errors.js';
import logger from '../../../shared/utils/logger.js';

class ReconciliationService {
  constructor(repository = null) {
    this.repository = repository || new ReconciliationRepository();
  }

  /**
   * Start reconciliation process
   */
  async startReconciliation(payrollRunId, reconciliationType, organizationId, userId) {
    try {
      // Get payroll run
      const payrollRun = await this.repository.findPayrollRunById(payrollRunId, organizationId);

      // Calculate expected amounts
      const expectedAmount = await this.calculateExpectedAmount(
        payrollRun,
        reconciliationType,
        organizationId
      );

      // Create reconciliation record
      const reconciliation = await this.repository.createReconciliation({
        payrollRunId,
        reconciliationType,
        reconciliationDate: new Date(),
        periodStart: payrollRun.pay_period_start,
        periodEnd: payrollRun.pay_period_end,
        expectedAmount,
        status: 'pending'
      }, organizationId, userId);

      logger.info('Reconciliation started', {
        reconciliationId: reconciliation.id,
        payrollRunId,
        type: reconciliationType
      });

      return reconciliation;
    } catch (error) {
      logger.error('Failed to start reconciliation:', error);
      throw error;
    }
  }

  /**
   * Record actual amount and identify discrepancies
   */
  async recordActualAmount(reconciliationId, actualAmount, organizationId, userId) {
    const reconciliation = await this.repository.findReconciliationById(
      reconciliationId,
      organizationId
    );

    const varianceAmount = actualAmount - reconciliation.expected_amount;
    const hasDiscrepancy = Math.abs(varianceAmount) > 0.01; // Tolerance: 1 cent

    // Update reconciliation
    await this.repository.updateReconciliation(
      reconciliationId,
      {
        actualAmount,
        varianceAmount,
        hasDiscrepancy,
        status: hasDiscrepancy ? 'discrepancy' : 'completed'
      },
      organizationId,
      userId
    );

    // If discrepancy, create reconciliation items for investigation
    if (hasDiscrepancy) {
      await this.identifyDiscrepancyItems(reconciliation, actualAmount, organizationId);
    }

    logger.info('Actual amount recorded', {
      reconciliationId,
      variance: varianceAmount,
      hasDiscrepancy
    });

    return reconciliation;
  }

  /**
   * Calculate expected amount based on reconciliation type
   */
  async calculateExpectedAmount(payrollRun, reconciliationType, organizationId) {
    switch (reconciliationType) {
      case 'bank':
        return payrollRun.total_net_pay;
      case 'tax':
        return payrollRun.total_taxes;
      case 'gl':
        return payrollRun.total_gross_pay;
      default:
        return 0;
    }
  }

  /**
   * Identify specific discrepancy items
   * Phase 2: Automated discrepancy detection algorithms
   */
  async identifyDiscrepancyItems(reconciliation, actualAmount, organizationId) {
    // MVP: Create single discrepancy item
    // Phase 2: Detailed line-by-line comparison
    await this.repository.createReconciliationItem({
      reconciliationId: reconciliation.id,
      itemType: 'payroll_run',
      expectedAmount: reconciliation.expected_amount,
      actualAmount,
      varianceAmount: actualAmount - reconciliation.expected_amount,
      status: 'open',
      notes: 'Variance requires investigation'
    }, organizationId);
  }
}

export default ReconciliationService;
```

---

## 🔍 Detailed Tasks

### Task 9.1: Create Comprehensive Repository Layer (2 days)

**Assignee:** Backend Developer 1 + Backend Developer 2

**Actions:**
1. ✅ Create `payrollRepository.js` (base payroll operations)
2. ✅ Create `workerTypeRepository.js` (worker type management)
3. ✅ Create `taxEngineRepository.js` (tax calculations)
4. ✅ Create `payComponentRepository.js` (pay components and formulas)
5. ✅ Create `timeAttendanceRepository.js` (time tracking)
6. ✅ Create `schedulingRepository.js` (work schedules)
7. ✅ Create `reconciliationRepository.js` (reconciliation)
8. ✅ Create `deductionRepository.js` (employee deductions)
9. ✅ Create `paymentRepository.js` (payment transactions)
10. ✅ Implement CRUD methods for all 35 tables
11. ✅ Use custom query wrapper for all queries
12. ✅ Add organization_id filtering and multi-tenancy
13. ✅ Implement complex queries with joins
14. ✅ Add proper error handling and logging

**Standards:** Follow BACKEND_STANDARDS.md, DATABASE_STANDARDS.md

### Task 9.2: Create Comprehensive Service Layer (2.5 days)

**Assignee:** Backend Developer 2 + Backend Developer 3

**Actions:**
1. ✅ Create `payrollService.js` (core payroll operations)
2. ✅ Create `workerTypeService.js` (worker type management)
3. ✅ Create `taxCalculationService.js` (MVP: simple bracket calculation)
4. ✅ Create `payComponentService.js` (pay component management)
5. ✅ Create `timeAttendanceService.js` (clock in/out, time entries)
6. ✅ Create `schedulingService.js` (work schedule management)
7. ✅ Create `reconciliationService.js` (payroll reconciliation)
8. ✅ Create `paymentService.js` (payment processing)
9. ✅ Create `formulaEngineService.js` (MVP: simple arithmetic only)
10. ✅ Implement all business logic methods
11. ✅ Add Joi validation schemas for all inputs
12. ✅ Implement payroll calculation engine
13. ✅ Implement tax calculation logic (bracket-based MVP)
14. ✅ Add comprehensive error handling
15. ✅ Add business rule validation
16. ✅ Mark Phase 2 enhancements in code comments

**Standards:** Follow BACKEND_STANDARDS.md

**Phase 2 Enhancements Noted:**
- Complex formula evaluation with conditional logic
- Multi-jurisdictional tax calculation
- Automated scheduling algorithms
- Biometric time tracking integration
- Automated bank reconciliation

### Task 9.3: Create Controllers for All Endpoints (1.5 days)

**Assignee:** Backend Developer 3 + Backend Developer 4

**Actions:**
1. ✅ Create `workerTypeController.js` (worker type endpoints)
2. ✅ Create `employeeRecordController.js` (employee payroll records)
3. ✅ Create `compensationController.js` (compensation management)
4. ✅ Create `payComponentController.js` (pay components)
5. ✅ Create `timeAttendanceController.js` (clock in/out, time entries)
6. ✅ Create `timesheetController.js` (timesheet management)
7. ✅ Create `scheduleController.js` (work schedules)
8. ✅ Create `payrollRunController.js` (payroll processing)
9. ✅ Create `paycheckController.js` (paycheck management)
10. ✅ Create `deductionController.js` (deduction management)
11. ✅ Create `reconciliationController.js` (reconciliation)
12. ✅ Create `taxRateController.js` (tax configuration)
13. ✅ Create `reportsController.js` (payroll reports)
14. ✅ Follow standard controller pattern
15. ✅ Add proper request/response handling
16. ✅ Add error handling with appropriate HTTP codes
17. ✅ Add comprehensive logging
18. ✅ Add input validation

**Standards:** Follow BACKEND_STANDARDS.md, API_STANDARDS.md

### Task 9.4: Create Routes with Middleware (1 day)

**Assignee:** Backend Developer 1

**Actions:**
1. ✅ Create route files for all endpoints
2. ✅ Apply middleware (auth, validation, access control)
3. ✅ Create routes index file
4. ✅ Document all routes

**Standards:** Follow API_STANDARDS.md

### Task 9.5: Create Product Config (0.25 days)

**Assignee:** Backend Developer 2

**Actions:**
1. ✅ Create `product.config.js`
2. ✅ Define tiers and features
3. ✅ Configure routes and database
4. ✅ Define integrations

**Standards:** Follow standards

### Task 9.6: Implement Integration Event Handlers (0.5 days)

**Assignee:** Backend Developer 2

**Actions:**
1. ✅ Create event handler for `employee.created` from HRIS
2. ✅ Create event handler for `employee.updated` from HRIS
3. ✅ Auto-create payroll employee records from HRIS events
4. ✅ Sync employee changes to payroll
5. ✅ Emit `payroll.processed` events

**Standards:** Follow BACKEND_STANDARDS.md

### Task 9.7: Write Comprehensive Tests (1.5 days)

**Assignee:** QA + Backend Team

**Actions:**
1. ✅ Unit tests for all 9 repository files (90%+ coverage)
2. ✅ Unit tests for all 9 service files (90%+ coverage)
3. ✅ Integration tests for all controllers
4. ✅ Test payroll calculation engine
5. ✅ Test tax calculation logic (bracket-based)
6. ✅ Test time attendance workflows
7. ✅ Test reconciliation logic
8. ✅ Test formula engine (MVP simple arithmetic)
9. ✅ Test worker type management
10. ✅ Test payment processing flows

**Standards:** Follow TESTING_STANDARDS.md

### Task 9.8: Create API Documentation (0.5 days)

**Assignee:** Backend Developer 4

**Actions:**
1. ✅ Document all API endpoints
2. ✅ Add OpenAPI/Swagger spec
3. ✅ Create Postman collection
4. ✅ Document request/response examples
5. ✅ Document error codes

**Standards:** Follow DOCUMENTATION_STANDARDS.md

---

## 🚀 Phase 2 Enhancements

The following features are implemented with **simplified MVP logic**, with full sophistication planned for Phase 2:

### Formula Engine
- **MVP:** Simple arithmetic evaluation: `(hours * rate)`, `(base * 1.5)`
- **Phase 2:** Full expression parser with:
  - Conditional logic (if/then/else)
  - Function library (round, max, min, sum, avg)
  - Variable substitution from multiple data sources
  - Validation and testing interface
  - Formula versioning and audit trail

### Tax Calculation Engine
- **MVP:** Bracket-based progressive tax, simple lookups
- **Phase 2:** Advanced features:
  - Multi-jurisdictional calculation (federal + state + local simultaneously)
  - W-4 withholding certificate processing
  - Tax treaty processing for international workers
  - Quarterly tax projections
  - What-if scenario modeling
  - Integration with tax filing services

### Time & Attendance
- **MVP:** Manual clock in/out, basic time entry
- **Phase 2:** Advanced features:
  - Biometric device integration
  - GPS location verification
  - Real-time labor cost tracking
  - Overtime prediction and alerts
  - Integration with physical time clocks
  - Mobile app synchronization
  - Geofencing for remote workers

### Work Scheduling
- **MVP:** Basic schedule creation and change requests
- **Phase 2:** Advanced features:
  - Automated schedule generation based on rules
  - Shift optimization algorithms
  - Labor demand forecasting
  - Employee availability matching
  - Shift swapping marketplace
  - Conflict detection and auto-resolution
  - Schedule template library

### Reconciliation
- **MVP:** Manual reconciliation with variance tracking
- **Phase 2:** Advanced features:
  - Automated bank reconciliation via API
  - GL integration with journal entry generation
  - Benefits provider reconciliation
  - Tax filing reconciliation
  - Automated discrepancy detection with ML
  - Reconciliation workflow automation
  - Audit report generation

### Payment Processing
- **MVP:** Basic payment transaction logging
- **Phase 2:** Advanced features:
  - Direct ACH payment initiation
  - Real-time payment status tracking
  - Failed payment retry logic
  - Payment method verification
  - Fraud detection integration
  - International payment support

---

## 📋 Standards Compliance Checklist

- [ ] Code follows BACKEND_STANDARDS.md layer architecture
- [ ] All queries use custom query wrapper
- [ ] Joi validation for all inputs
- [ ] Tests achieve 90%+ coverage
- [ ] Documentation complete
- [ ] API follows REST conventions
- [ ] Error handling comprehensive
- [ ] Logging structured and informative

---

## 🎯 Success Criteria

Phase 9 is complete when:

1. ✅ **All 9 repository files created** - Worker types, tax engine, pay components, time attendance, scheduling, reconciliation, etc.
2. ✅ **All 9 service files implemented** - Business logic for all 35 tables
3. ✅ **Worker type management works** - Templates and employee assignments
4. ✅ **Tax calculation engine functional** - MVP bracket-based calculation
5. ✅ **Pay component system operational** - Standard and custom components
6. ✅ **Time attendance tracking works** - Clock in/out, time entries, rated lines
7. ✅ **Scheduling system functional** - Work schedules and change requests
8. ✅ **Payroll calculation accurate** - Gross to net calculation with all components
9. ✅ **Reconciliation system operational** - Variance tracking and discrepancy management
10. ✅ **Payment processing implemented** - Transaction logging and tracking
11. ✅ **Formula engine MVP works** - Simple arithmetic evaluation
12. ✅ **All controllers and routes created** - 13+ controller files
13. ✅ **Product config complete** - Tier definitions and feature flags
14. ✅ **Integration events working** - HRIS integration handlers
15. ✅ **All tests pass** - 90%+ coverage across all layers
16. ✅ **Integration tests verify flows** - End-to-end payroll processing
17. ✅ **API documentation complete** - OpenAPI spec and Postman collection
18. ✅ **Code review approved** - Team sign-off
19. ✅ **Phase 2 enhancements documented** - Clear MVP vs advanced feature separation
10. ✅ API documented

---

## 📤 Outputs

### Configuration Files
- [ ] `backend/src/products/paylinq/config/product.config.js` - Product configuration with tiers

### Repository Layer (9 files)
- [ ] `backend/src/products/paylinq/repositories/payrollRepository.js` - Core payroll operations
- [ ] `backend/src/products/paylinq/repositories/workerTypeRepository.js` - Worker type management
- [ ] `backend/src/products/paylinq/repositories/taxEngineRepository.js` - Tax calculations
- [ ] `backend/src/products/paylinq/repositories/payComponentRepository.js` - Pay components
- [ ] `backend/src/products/paylinq/repositories/timeAttendanceRepository.js` - Time tracking
- [ ] `backend/src/products/paylinq/repositories/schedulingRepository.js` - Work schedules
- [ ] `backend/src/products/paylinq/repositories/reconciliationRepository.js` - Reconciliation
- [ ] `backend/src/products/paylinq/repositories/deductionRepository.js` - Employee deductions
- [ ] `backend/src/products/paylinq/repositories/paymentRepository.js` - Payment transactions

### Service Layer (9 files)
- [ ] `backend/src/products/paylinq/services/payrollService.js` - Payroll processing
- [ ] `backend/src/products/paylinq/services/workerTypeService.js` - Worker type logic
- [ ] `backend/src/products/paylinq/services/taxCalculationService.js` - Tax calculation (MVP)
- [ ] `backend/src/products/paylinq/services/payComponentService.js` - Pay component management
- [ ] `backend/src/products/paylinq/services/timeAttendanceService.js` - Time attendance
- [ ] `backend/src/products/paylinq/services/schedulingService.js` - Schedule management
- [ ] `backend/src/products/paylinq/services/reconciliationService.js` - Reconciliation logic
- [ ] `backend/src/products/paylinq/services/paymentService.js` - Payment processing
- [ ] `backend/src/products/paylinq/services/formulaEngineService.js` - Formula evaluation (MVP)

### Controller Layer (13+ files)
- [ ] `backend/src/products/paylinq/controllers/workerTypeController.js`
- [ ] `backend/src/products/paylinq/controllers/employeeRecordController.js`
- [ ] `backend/src/products/paylinq/controllers/compensationController.js`
- [ ] `backend/src/products/paylinq/controllers/payComponentController.js`
- [ ] `backend/src/products/paylinq/controllers/timeAttendanceController.js`
- [ ] `backend/src/products/paylinq/controllers/timesheetController.js`
- [ ] `backend/src/products/paylinq/controllers/scheduleController.js`
- [ ] `backend/src/products/paylinq/controllers/payrollRunController.js`
- [ ] `backend/src/products/paylinq/controllers/paycheckController.js`
- [ ] `backend/src/products/paylinq/controllers/deductionController.js`
- [ ] `backend/src/products/paylinq/controllers/reconciliationController.js`
- [ ] `backend/src/products/paylinq/controllers/taxRateController.js`
- [ ] `backend/src/products/paylinq/controllers/reportsController.js`

### Routes Layer
- [ ] `backend/src/products/paylinq/routes/*.js` - Route files for all endpoints
- [ ] `backend/src/products/paylinq/routes/index.js` - Routes index

### Integration Event Handlers
- [ ] `backend/src/products/paylinq/events/hrissEventHandlers.js` - HRIS integration handlers

### Tests (90%+ coverage)
- [ ] `backend/tests/unit/products/paylinq/repositories/*.test.js` - Repository unit tests (9 files)
- [ ] `backend/tests/unit/products/paylinq/services/*.test.js` - Service unit tests (9 files)
- [ ] `backend/tests/integration/products/paylinq/controllers/*.test.js` - Controller integration tests (13+ files)
- [ ] `backend/tests/integration/products/paylinq/payroll-processing.test.js` - End-to-end payroll test
- [ ] `backend/tests/integration/products/paylinq/tax-calculation.test.js` - Tax calculation test
- [ ] `backend/tests/integration/products/paylinq/time-attendance.test.js` - Time tracking test
- [ ] `backend/tests/integration/products/paylinq/reconciliation.test.js` - Reconciliation test

### Documentation
- [ ] `docs/api/paylinq-api.md` - API documentation
- [ ] `docs/api/paylinq-openapi.yaml` - OpenAPI specification
- [ ] `docs/api/Paylinq.postman_collection.json` - Postman collection
- [ ] `docs/paylinq/payroll-calculation-logic.md` - Payroll calculation documentation
- [ ] `docs/paylinq/tax-calculation-logic.md` - Tax calculation documentation
- [ ] `docs/paylinq/time-attendance-workflows.md` - Time attendance workflows
- [ ] `docs/paylinq/mvp-vs-phase2.md` - Feature implementation roadmap

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tax calculation errors | **Critical** | Thorough testing against official IRS tables; CPA review; external audit |
| Payroll calculation bugs | **Critical** | Comprehensive test cases; manual verification; parallel run with existing system |
| Formula execution security vulnerabilities | **High** | Sandboxed execution; input validation; no eval() in MVP; code review |
| Performance with large payrolls (1000+ employees) | **High** | Query optimization; indexed queries; batch processing; background jobs |
| Time attendance calculation errors | **Medium** | Automated test coverage; edge case testing; rounding validation |
| Reconciliation discrepancies | **High** | Thorough testing; variance tolerance configuration; audit trail |
| Compliance violations (FLSA, state laws) | **Critical** | Legal review; compliance officer; regular audits; documentation |
| Complex service dependencies | **Medium** | Clear service boundaries; dependency injection; comprehensive integration tests |
| Scope creep into Phase 2 features | **High** | Strict MVP definition; Phase 2 features clearly marked in code; code review enforcement |

---

## 🔗 Related Phases

- **Previous:** [Phase 8: Paylinq Product - Database](./PHASE_08_PAYLINQ_DATABASE.md)
- **Next:** [Phase 10: Paylinq Product - Testing](./PHASE_10_PAYLINQ_TESTING.md)
- **Related:** [Phase 4: RecruitIQ Product Restructuring](./PHASE_04_RECRUITIQ_RESTRUCTURING.md)

---

## ⏭️ Next Phase

**[Phase 10: Paylinq Product - Testing](./PHASE_10_PAYLINQ_TESTING.md)**

Upon completion of Phase 9, proceed to Phase 10 for comprehensive testing of the Paylinq product.

---

**Phase Owner:** Backend Team Lead + Senior Backend Developers  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start  
**Complexity:** High (Enterprise-grade backend with 35 tables, 9 repositories, 9 services, 13+ controllers)  
**Approach:** Hybrid (Full service layer for all ERD tables; simplified MVP business logic; Phase 2 advanced features documented)
