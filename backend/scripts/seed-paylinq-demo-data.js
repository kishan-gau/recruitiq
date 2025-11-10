/**
 * Seed Demo Data for Paylinq
 * This script clears existing Paylinq demo data and creates fresh demo data for:
 * - Worker Types
 * - Employee Records
 * - Compensation
 * - Pay Components
 * - Tax Rule Sets & Brackets
 * - Time Entries & Timesheets
 * - Shift Types
 * - Employee Deductions
 * - Payroll Runs & Paychecks
 * - Work Schedules
 */

import pkg from 'pg';
const { Pool } = pkg;
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
loadEnv({ path: join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'recruitiq_dev',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres'
});

/**
 * Clear all Paylinq demo data
 */
async function clearPaylinqDemoData(client) {
  console.log('\n🗑️  Clearing existing Paylinq demo data...\n');

  try {
    // Delete in reverse order of dependencies
    await client.query('DELETE FROM payroll.schedule_change_request');
    console.log('  ✓ Cleared schedule change requests');

    await client.query('DELETE FROM payroll.work_schedule');
    console.log('  ✓ Cleared work schedules');

    await client.query('DELETE FROM payroll.reconciliation_item');
    console.log('  ✓ Cleared reconciliation items');

    await client.query('DELETE FROM payroll.reconciliation');
    console.log('  ✓ Cleared reconciliations');

    await client.query('DELETE FROM payroll.payment_transaction');
    console.log('  ✓ Cleared payment transactions');

    await client.query('DELETE FROM payroll.payroll_run_component');
    console.log('  ✓ Cleared payroll run components');

    await client.query('DELETE FROM payroll.paycheck');
    console.log('  ✓ Cleared paychecks');

    await client.query('DELETE FROM payroll.payroll_run');
    console.log('  ✓ Cleared payroll runs');

    await client.query('DELETE FROM payroll.rated_time_line');
    console.log('  ✓ Cleared rated time lines');

    await client.query('DELETE FROM payroll.timesheet');
    console.log('  ✓ Cleared timesheets');

    await client.query('DELETE FROM payroll.time_entry');
    console.log('  ✓ Cleared time entries');

    await client.query('DELETE FROM payroll.time_attendance_event');
    console.log('  ✓ Cleared time attendance events');

    await client.query('DELETE FROM payroll.employee_deduction');
    console.log('  ✓ Cleared employee deductions');

    await client.query('DELETE FROM payroll.custom_pay_component');
    console.log('  ✓ Cleared custom pay components');

    await client.query('DELETE FROM payroll.component_formula');
    console.log('  ✓ Cleared component formulas');

    await client.query('DELETE FROM payroll.tax_bracket');
    console.log('  ✓ Cleared tax brackets');

    await client.query('DELETE FROM payroll.tax_rule_set');
    console.log('  ✓ Cleared tax rule sets');

    await client.query('DELETE FROM payroll.allowance');
    console.log('  ✓ Cleared allowances');

    await client.query('DELETE FROM payroll.deductible_cost_rule');
    console.log('  ✓ Cleared deductible cost rules');

    await client.query('DELETE FROM payroll.pay_component');
    console.log('  ✓ Cleared pay components');

    await client.query('DELETE FROM payroll.compensation');
    console.log('  ✓ Cleared compensation records');

    await client.query('DELETE FROM payroll.worker_type');
    console.log('  ✓ Cleared worker type assignments');

    await client.query('DELETE FROM payroll.shift_type');
    console.log('  ✓ Cleared shift types');

    await client.query('DELETE FROM payroll.employee_payroll_config');
    console.log('  ✓ Cleared employee payroll configs');

    await client.query('DELETE FROM payroll.worker_type_template');
    console.log('  ✓ Cleared worker type templates');

    console.log('\n✅ Paylinq demo data cleared successfully!\n');
  } catch (error) {
    console.error('❌ Error clearing Paylinq demo data:', error.message);
    throw error;
  }
}

/**
 * Get organization and users for demo data
 */
async function getDemoOrgAndUsers(client) {
  // Get the demo organization
  const orgResult = await client.query(
    'SELECT id FROM organizations WHERE slug = $1',
    ['demo-techcorp']
  );

  if (orgResult.rows.length === 0) {
    throw new Error('Demo organization not found. Please run seed-demo-data.js first.');
  }

  const organizationId = orgResult.rows[0].id;

  // Get demo users
  const usersResult = await client.query(
    'SELECT id, email, name FROM users WHERE organization_id = $1 AND email LIKE $2',
    [organizationId, '%@demo.com']
  );

  if (usersResult.rows.length === 0) {
    throw new Error('Demo users not found. Please run seed-demo-data.js first.');
  }

  return {
    organizationId,
    users: usersResult.rows
  };
}

/**
 * Create worker type templates
 */
async function createWorkerTypeTemplates(client, organizationId, adminUser) {
  console.log('👷 Creating worker type templates...\n');

  const templates = [
    {
      id: uuidv4(),
      name: 'Full-Time Employee',
      code: 'FTE',
      description: 'Regular full-time employee with full benefits',
      defaultPayFrequency: 'biweekly',
      defaultPaymentMethod: 'direct_deposit',
      benefitsEligible: true,
      overtimeEligible: true,
      ptoEligible: true,
      sickLeaveEligible: true,
      vacationAccrualRate: 3.08 // ~2 weeks/year
    },
    {
      id: uuidv4(),
      name: 'Part-Time Employee',
      code: 'PTE',
      description: 'Part-time employee with limited benefits',
      defaultPayFrequency: 'biweekly',
      defaultPaymentMethod: 'direct_deposit',
      benefitsEligible: false,
      overtimeEligible: true,
      ptoEligible: false,
      sickLeaveEligible: true,
      vacationAccrualRate: 0
    },
    {
      id: uuidv4(),
      name: 'Contractor',
      code: 'CTR',
      description: 'Independent contractor',
      defaultPayFrequency: 'monthly',
      defaultPaymentMethod: 'check',
      benefitsEligible: false,
      overtimeEligible: false,
      ptoEligible: false,
      sickLeaveEligible: false,
      vacationAccrualRate: 0
    }
  ];

  for (const template of templates) {
    await client.query(
      `INSERT INTO payroll.worker_type_template (
        id, organization_id, name, code, description, default_pay_frequency,
        default_payment_method, benefits_eligible, overtime_eligible,
        pto_eligible, sick_leave_eligible, vacation_accrual_rate,
        status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
      [
        template.id, organizationId, template.name, template.code,
        template.description, template.defaultPayFrequency,
        template.defaultPaymentMethod, template.benefitsEligible,
        template.overtimeEligible, template.ptoEligible,
        template.sickLeaveEligible, template.vacationAccrualRate,
        'active', adminUser.id
      ]
    );
    console.log(`  ✓ Created worker type template: ${template.name}`);
  }

  console.log('');
  return templates;
}

/**
 * Create employee records
 */
async function createEmployeeRecords(client, organizationId, users, adminUser) {
  console.log('👤 Creating employee records...\n');

  const employeeRecords = [];
  let empNumber = 1001;

  for (const user of users) {
    const empRecord = {
      id: uuidv4(),
      organizationId,
      employeeId: user.id,
      employeeNumber: `EMP${empNumber++}`,
      payFrequency: 'biweekly',
      paymentMethod: 'direct_deposit',
      currency: 'SRD',
      status: 'active',
      startDate: new Date('2024-01-15'),
      bankName: 'Republic Bank Limited',
      accountNumber: `****${Math.floor(1000 + Math.random() * 9000)}`,
      routingNumber: '123456789',
      accountType: 'checking',
      taxId: `SR${Math.floor(100000000 + Math.random() * 900000000)}`,
      taxFilingStatus: 'single',
      taxAllowances: 1,
      additionalWithholding: 0
    };

    // Insert into hris.employee (SSOT)
    await client.query(
      `INSERT INTO hris.employee (
        id, organization_id, employee_number, status, start_date,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        empRecord.employeeId, empRecord.organizationId, empRecord.employeeNumber,
        empRecord.status, empRecord.startDate, adminUser.id
      ]
    );

    // Insert into payroll.employee_payroll_config (payroll-specific data)
    await client.query(
      `INSERT INTO payroll.employee_payroll_config (
        id, organization_id, employee_id, pay_frequency,
        payment_method, currency, bank_name, account_number,
        routing_number, account_type, tax_id, tax_filing_status,
        tax_allowances, additional_withholding, created_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
      [
        empRecord.id, empRecord.organizationId, empRecord.employeeId,
        empRecord.payFrequency, empRecord.paymentMethod, empRecord.currency,
        empRecord.bankName, empRecord.accountNumber, empRecord.routingNumber,
        empRecord.accountType, empRecord.taxId, empRecord.taxFilingStatus,
        empRecord.taxAllowances, empRecord.additionalWithholding, adminUser.id
      ]
    );

    employeeRecords.push(empRecord);
    console.log(`  ✓ Created employee record: ${empRecord.employeeNumber} (${user.name})`);
  }

  console.log('');
  return employeeRecords;
}

/**
 * Create compensation records
 */
async function createCompensationRecords(client, organizationId, employeeRecords, adminUser) {
  console.log('💰 Creating compensation records...\n');

  const compensationRecords = [];
  const salaries = [85000, 75000, 65000, 95000]; // Different salaries for demo users

  for (let i = 0; i < employeeRecords.length; i++) {
    const empRecord = employeeRecords[i];
    const annualSalary = salaries[i] || 70000;
    const biweeklyAmount = annualSalary / 26; // 26 pay periods per year

    const compensation = {
      id: uuidv4(),
      organizationId,
      employeeRecordId: empRecord.id,
      compensationType: 'salary',
      amount: biweeklyAmount,
      hourlyRate: null,
      overtimeRate: null,
      payPeriodAmount: biweeklyAmount,
      annualAmount: annualSalary,
      effectiveFrom: new Date('2024-01-15'),
      effectiveTo: null,
      isCurrent: true,
      currency: 'SRD'
    };

    await client.query(
      `INSERT INTO payroll.compensation (
        id, organization_id, employee_id, compensation_type,
        amount, hourly_rate, overtime_rate, pay_period_amount,
        annual_amount, effective_from, effective_to, is_current,
        currency, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
      [
        compensation.id, compensation.organizationId, compensation.employeeRecordId,
        compensation.compensationType, compensation.amount, compensation.hourlyRate,
        compensation.overtimeRate, compensation.payPeriodAmount,
        compensation.annualAmount, compensation.effectiveFrom,
        compensation.effectiveTo, compensation.isCurrent, compensation.currency,
        adminUser.id
      ]
    );

    compensationRecords.push(compensation);
    console.log(`  ✓ Created compensation: ${empRecord.employeeNumber} - SRD ${annualSalary}/year`);
  }

  console.log('');
  return compensationRecords;
}

/**
 * Create pay components
 */
async function createPayComponents(client, organizationId, adminUser) {
  console.log('📋 Creating pay components...\n');

  const components = [
    {
      id: uuidv4(),
      code: 'BASE_SALARY',
      name: 'Base Salary',
      type: 'earning',
      category: 'regular_pay',
      calculationType: 'fixed_amount',
      isSystemComponent: true,
      isTaxable: true,
      isRecurring: true
    },
    {
      id: uuidv4(),
      code: 'OVERTIME',
      name: 'Overtime Pay',
      type: 'earning',
      category: 'overtime',
      calculationType: 'hourly_rate',
      defaultRate: 1.5,
      isSystemComponent: true,
      isTaxable: true,
      isRecurring: false
    },
    {
      id: uuidv4(),
      code: 'BONUS',
      name: 'Performance Bonus',
      type: 'earning',
      category: 'bonus',
      calculationType: 'fixed_amount',
      isSystemComponent: false,
      isTaxable: true,
      isRecurring: false
    },
    {
      id: uuidv4(),
      code: 'COMMISSION',
      name: 'Sales Commission',
      type: 'earning',
      category: 'commission',
      calculationType: 'percentage',
      defaultRate: 5.0,
      isSystemComponent: false,
      isTaxable: true,
      isRecurring: false
    },
    {
      id: uuidv4(),
      code: 'HEALTH_INS',
      name: 'Health Insurance',
      type: 'deduction',
      category: 'benefit',
      calculationType: 'fixed_amount',
      defaultAmount: 250.00,
      isSystemComponent: false,
      isTaxable: false,
      isRecurring: true,
      isPreTax: true
    },
    {
      id: uuidv4(),
      code: 'PENSION',
      name: 'Pension Contribution',
      type: 'deduction',
      category: 'pension',
      calculationType: 'percentage',
      defaultRate: 5.0,
      isSystemComponent: false,
      isTaxable: false,
      isRecurring: true,
      isPreTax: true
    },
    {
      id: uuidv4(),
      code: 'WAGE_TAX',
      name: 'Suriname Wage Tax',
      type: 'deduction',
      category: 'tax',
      calculationType: 'formula',
      isSystemComponent: true,
      isTaxable: false,
      isRecurring: true
    },
    {
      id: uuidv4(),
      code: 'AOV',
      name: 'AOV (Social Security)',
      type: 'deduction',
      category: 'tax',
      calculationType: 'percentage',
      defaultRate: 2.0,
      isSystemComponent: true,
      isTaxable: false,
      isRecurring: true
    },
    {
      id: uuidv4(),
      code: 'AWW',
      name: 'AWW (National Insurance)',
      type: 'deduction',
      category: 'tax',
      calculationType: 'percentage',
      defaultRate: 1.5,
      isSystemComponent: true,
      isTaxable: false,
      isRecurring: true
    }
  ];

  for (const component of components) {
    await client.query(
      `INSERT INTO payroll.pay_component (
        id, organization_id, component_code, component_name,
        component_type, category, calculation_type, default_rate,
        default_amount, is_taxable, is_recurring, is_pre_tax,
        is_system_component, applies_to_gross, status,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())`,
      [
        component.id, organizationId, component.code, component.name,
        component.type, component.category, component.calculationType,
        component.defaultRate || null, component.defaultAmount || null,
        component.isTaxable, component.isRecurring, component.isPreTax || false,
        component.isSystemComponent, component.appliesToGross || false, 'active',
        adminUser.id
      ]
    );
    console.log(`  ✓ Created pay component: ${component.name} (${component.type})`);
  }

  console.log('');
  return components;
}

/**
 * Create tax rule sets and brackets (Suriname tax system)
 */
async function createTaxRuleSets(client, organizationId, adminUser) {
  console.log('💸 Creating tax rule sets and brackets...\n');

  // Suriname Wage Tax brackets (progressive)
  const wageTaxRuleSet = {
    id: uuidv4(),
    taxType: 'wage_tax',
    taxName: 'Suriname Wage Tax',
    country: 'SR',
    effectiveFrom: new Date('2024-01-01'),
    calculationMethod: 'bracket'
  };

  await client.query(
    `INSERT INTO payroll.tax_rule_set (
      id, organization_id, tax_type, tax_name, country,
      effective_from, calculation_method, created_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
    [
      wageTaxRuleSet.id, organizationId, wageTaxRuleSet.taxType,
      wageTaxRuleSet.taxName, wageTaxRuleSet.country,
      wageTaxRuleSet.effectiveFrom, wageTaxRuleSet.calculationMethod,
      adminUser.id
    ]
  );
  console.log(`  ✓ Created tax rule set: ${wageTaxRuleSet.taxName}`);

  // Create tax brackets for Suriname Wage Tax
  const brackets = [
    { order: 1, min: 0, max: 2500, rate: 0, fixedAmount: 0 },
    { order: 2, min: 2500, max: 5000, rate: 8, fixedAmount: 0 },
    { order: 3, min: 5000, max: 10000, rate: 15, fixedAmount: 200 },
    { order: 4, min: 10000, max: 25000, rate: 25, fixedAmount: 950 },
    { order: 5, min: 25000, max: null, rate: 36, fixedAmount: 4700 }
  ];

  for (const bracket of brackets) {
    await client.query(
      `INSERT INTO payroll.tax_bracket (
        id, organization_id, tax_rule_set_id, bracket_order,
        income_min, income_max, rate_percentage, fixed_amount,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        uuidv4(), organizationId, wageTaxRuleSet.id, bracket.order,
        bracket.min, bracket.max, bracket.rate, bracket.fixedAmount,
        adminUser.id
      ]
    );
    console.log(`  ✓ Created tax bracket: ${bracket.min} - ${bracket.max || '∞'} @ ${bracket.rate}%`);
  }

  console.log('');
  return [wageTaxRuleSet];
}

/**
 * Create shift types
 */
async function createShiftTypes(client, organizationId, adminUser) {
  console.log('⏰ Creating shift types...\n');

  const shifts = [
    {
      id: uuidv4(),
      name: 'Morning Shift',
      code: 'MORNING',
      startTime: '08:00:00',
      endTime: '16:00:00',
      durationHours: 8,
      isOvernight: false,
      breakDurationMinutes: 60,
      isPaidBreak: false,
      shiftDifferentialRate: 0
    },
    {
      id: uuidv4(),
      name: 'Afternoon Shift',
      code: 'AFTERNOON',
      startTime: '16:00:00',
      endTime: '00:00:00',
      durationHours: 8,
      isOvernight: true,
      breakDurationMinutes: 60,
      isPaidBreak: false,
      shiftDifferentialRate: 10 // 10% premium
    },
    {
      id: uuidv4(),
      name: 'Night Shift',
      code: 'NIGHT',
      startTime: '00:00:00',
      endTime: '08:00:00',
      durationHours: 8,
      isOvernight: false,
      breakDurationMinutes: 60,
      isPaidBreak: true,
      shiftDifferentialRate: 15 // 15% premium
    }
  ];

  for (const shift of shifts) {
    await client.query(
      `INSERT INTO payroll.shift_type (
        id, organization_id, shift_name, shift_code, start_time,
        end_time, duration_hours, is_overnight, break_duration_minutes,
        is_paid_break, shift_differential_rate, status,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
      [
        shift.id, organizationId, shift.name, shift.code, shift.startTime,
        shift.endTime, shift.durationHours, shift.isOvernight,
        shift.breakDurationMinutes, shift.isPaidBreak,
        shift.shiftDifferentialRate, 'active', adminUser.id
      ]
    );
    console.log(`  ✓ Created shift type: ${shift.name} (${shift.startTime} - ${shift.endTime})`);
  }

  console.log('');
  return shifts;
}

/**
 * Create time entries for current pay period
 */
async function createTimeEntries(client, organizationId, employeeRecords, shifts, adminUser) {
  console.log('⏱️  Creating time entries...\n');

  const timeEntries = [];
  const today = new Date();
  const morningShift = shifts.find(s => s.code === 'MORNING');

  // Create 10 days of time entries for each employee
  for (const empRecord of employeeRecords) {
    for (let i = 0; i < 10; i++) {
      const entryDate = new Date(today);
      entryDate.setDate(entryDate.getDate() - i);

      // Skip weekends
      if (entryDate.getDay() === 0 || entryDate.getDay() === 6) continue;

      const clockIn = new Date(entryDate);
      clockIn.setHours(8, 0, 0);
      const clockOut = new Date(entryDate);
      clockOut.setHours(17, 0, 0);

      const timeEntry = {
        id: uuidv4(),
        organizationId,
        employeeRecordId: empRecord.id,
        entryDate,
        clockIn,
        clockOut,
        workedHours: 8,
        regularHours: 8,
        overtimeHours: 0,
        breakHours: 1,
        shiftTypeId: morningShift.id,
        entryType: 'regular',
        status: 'approved',
        approvedBy: adminUser.id,
        approvedAt: new Date()
      };

      await client.query(
        `INSERT INTO payroll.time_entry (
          id, organization_id, employee_id, entry_date,
          clock_in, clock_out, worked_hours, regular_hours,
          overtime_hours, break_hours, shift_type_id, entry_type,
          status, approved_by, approved_at, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())`,
        [
          timeEntry.id, timeEntry.organizationId, timeEntry.employeeRecordId,
          timeEntry.entryDate, timeEntry.clockIn, timeEntry.clockOut,
          timeEntry.workedHours, timeEntry.regularHours, timeEntry.overtimeHours,
          timeEntry.breakHours, timeEntry.shiftTypeId, timeEntry.entryType,
          timeEntry.status, timeEntry.approvedBy, timeEntry.approvedAt,
          adminUser.id
        ]
      );

      timeEntries.push(timeEntry);
    }
    console.log(`  ✓ Created time entries for: ${empRecord.employeeNumber}`);
  }

  console.log('');
  return timeEntries;
}

/**
 * Create employee deductions
 */
async function createEmployeeDeductions(client, organizationId, employeeRecords, adminUser) {
  console.log('📉 Creating employee deductions...\n');

  const deductions = [];

  // Add health insurance deduction for some employees
  for (let i = 0; i < 2; i++) {
    const empRecord = employeeRecords[i];
    const deduction = {
      id: uuidv4(),
      organizationId,
      employeeRecordId: empRecord.id,
      deductionType: 'benefit',
      deductionName: 'Health Insurance Premium',
      deductionCode: 'HEALTH_INS',
      calculationType: 'fixed_amount',
      deductionAmount: 250.00,
      isPreTax: true,
      isRecurring: true,
      frequency: 'per_payroll',
      effectiveFrom: new Date('2024-01-15'),
      priority: 1
    };

    await client.query(
      `INSERT INTO payroll.employee_deduction (
        id, organization_id, employee_id, deduction_type,
        deduction_name, deduction_code, calculation_type,
        deduction_amount, is_pre_tax, is_recurring, frequency,
        effective_from, priority, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
      [
        deduction.id, deduction.organizationId, deduction.employeeRecordId,
        deduction.deductionType, deduction.deductionName, deduction.deductionCode,
        deduction.calculationType, deduction.deductionAmount, deduction.isPreTax,
        deduction.isRecurring, deduction.frequency, deduction.effectiveFrom,
        deduction.priority, adminUser.id
      ]
    );

    deductions.push(deduction);
    console.log(`  ✓ Created deduction: ${empRecord.employeeNumber} - ${deduction.deductionName}`);
  }

  console.log('');
  return deductions;
}

/**
 * Create a payroll run with paychecks
 */
async function createPayrollRun(client, organizationId, employeeRecords, compensationRecords, adminUser) {
  console.log('💵 Creating payroll run and paychecks...\n');

  const today = new Date();
  const periodStart = new Date(today);
  periodStart.setDate(1); // First of month
  const periodEnd = new Date(today);
  periodEnd.setDate(15); // Mid-month
  const paymentDate = new Date(today);
  paymentDate.setDate(20); // Payment on 20th

  // Create payroll run
  const payrollRun = {
    id: uuidv4(),
    organizationId,
    runNumber: `PR-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
    runName: `Payroll - ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`,
    payPeriodStart: periodStart,
    payPeriodEnd: periodEnd,
    paymentDate: paymentDate,
    totalEmployees: employeeRecords.length,
    status: 'calculated'
  };

  await client.query(
    `INSERT INTO payroll.payroll_run (
      id, organization_id, run_number, run_name, pay_period_start,
      pay_period_end, payment_date, total_employees, status,
      created_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
    [
      payrollRun.id, payrollRun.organizationId, payrollRun.runNumber,
      payrollRun.runName, payrollRun.payPeriodStart, payrollRun.payPeriodEnd,
      payrollRun.paymentDate, payrollRun.totalEmployees, payrollRun.status,
      adminUser.id
    ]
  );
  console.log(`  ✓ Created payroll run: ${payrollRun.runNumber}`);

  // Create paychecks for each employee
  const paychecks = [];
  let totalGross = 0;
  let totalNet = 0;
  let totalTaxes = 0;
  let totalDeductions = 0;

  for (let i = 0; i < employeeRecords.length; i++) {
    const empRecord = employeeRecords[i];
    const compensation = compensationRecords[i];

    // Calculate pay components
    const grossPay = compensation.payPeriodAmount;
    const wageTax = grossPay * 0.15; // Simplified 15%
    const aovTax = grossPay * 0.02;
    const awwTax = grossPay * 0.015;
    const healthIns = i < 2 ? 250.00 : 0; // First two employees have health insurance
    const netPay = grossPay - wageTax - aovTax - awwTax - healthIns;

    const paycheck = {
      id: uuidv4(),
      organizationId,
      payrollRunId: payrollRun.id,
      employeeRecordId: empRecord.id,
      paymentDate: paymentDate,
      payPeriodStart: periodStart,
      payPeriodEnd: periodEnd,
      grossPay,
      regularPay: grossPay,
      overtimePay: 0,
      bonusPay: 0,
      commissionPay: 0,
      wageTax,
      aovTax,
      awwTax,
      preTaxDeductions: healthIns,
      postTaxDeductions: 0,
      netPay,
      paymentMethod: 'direct_deposit',
      status: 'approved'
    };

    await client.query(
      `INSERT INTO payroll.paycheck (
        id, organization_id, payroll_run_id, employee_id,
        payment_date, pay_period_start, pay_period_end, gross_pay,
        regular_pay, overtime_pay, bonus_pay, commission_pay,
        wage_tax, aov_tax, aww_tax, pre_tax_deductions,
        post_tax_deductions, net_pay, payment_method, status,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())`,
      [
        paycheck.id, paycheck.organizationId, paycheck.payrollRunId,
        paycheck.employeeRecordId, paycheck.paymentDate,
        paycheck.payPeriodStart, paycheck.payPeriodEnd, paycheck.grossPay,
        paycheck.regularPay, paycheck.overtimePay, paycheck.bonusPay,
        paycheck.commissionPay, paycheck.wageTax, paycheck.aovTax,
        paycheck.awwTax, paycheck.preTaxDeductions, paycheck.postTaxDeductions,
        paycheck.netPay, paycheck.paymentMethod, paycheck.status, adminUser.id
      ]
    );

    paychecks.push(paycheck);
    totalGross += grossPay;
    totalNet += netPay;
    totalTaxes += (wageTax + aovTax + awwTax);
    totalDeductions += healthIns;

    console.log(`  ✓ Created paycheck: ${empRecord.employeeNumber} - Net: SRD ${netPay.toFixed(2)}`);
  }

  // Update payroll run totals
  await client.query(
    `UPDATE payroll.payroll_run
     SET total_gross_pay = $1, total_net_pay = $2, total_taxes = $3, total_deductions = $4, updated_at = NOW()
     WHERE id = $5`,
    [totalGross, totalNet, totalTaxes, totalDeductions, payrollRun.id]
  );

  console.log(`\n  📊 Payroll Run Totals:`);
  console.log(`     Gross Pay: SRD ${totalGross.toFixed(2)}`);
  console.log(`     Total Taxes: SRD ${totalTaxes.toFixed(2)}`);
  console.log(`     Total Deductions: SRD ${totalDeductions.toFixed(2)}`);
  console.log(`     Net Pay: SRD ${totalNet.toFixed(2)}\n`);

  return { payrollRun, paychecks };
}

/**
 * Main seeding function
 */
async function seedPaylinqDemoData() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting Paylinq demo data seeding...');
    console.log('━'.repeat(60));

    await client.query('BEGIN');

    // Clear existing demo data
    await clearPaylinqDemoData(client);

    // Get organization and users
    const { organizationId, users } = await getDemoOrgAndUsers(client);
    const adminUser = users.find(u => u.email === 'admin@demo.com') || users[0];

    console.log(`📍 Organization ID: ${organizationId}`);
    console.log(`👤 Admin User: ${adminUser.name}\n`);

    // Create demo data
    const workerTypeTemplates = await createWorkerTypeTemplates(client, organizationId, adminUser);
    const employeeRecords = await createEmployeeRecords(client, organizationId, users, adminUser);
    const compensationRecords = await createCompensationRecords(client, organizationId, employeeRecords, adminUser);
    const payComponents = await createPayComponents(client, organizationId, adminUser);
    const taxRuleSets = await createTaxRuleSets(client, organizationId, adminUser);
    const shiftTypes = await createShiftTypes(client, organizationId, adminUser);
    const timeEntries = await createTimeEntries(client, organizationId, employeeRecords, shiftTypes, adminUser);
    const employeeDeductions = await createEmployeeDeductions(client, organizationId, employeeRecords, adminUser);
    const { payrollRun, paychecks } = await createPayrollRun(client, organizationId, employeeRecords, compensationRecords, adminUser);

    await client.query('COMMIT');

    console.log('━'.repeat(60));
    console.log('✅ Paylinq demo data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`  Worker Type Templates: ${workerTypeTemplates.length}`);
    console.log(`  Employee Records: ${employeeRecords.length}`);
    console.log(`  Compensation Records: ${compensationRecords.length}`);
    console.log(`  Pay Components: ${payComponents.length}`);
    console.log(`  Tax Rule Sets: ${taxRuleSets.length}`);
    console.log(`  Shift Types: ${shiftTypes.length}`);
    console.log(`  Time Entries: ${timeEntries.length}`);
    console.log(`  Employee Deductions: ${employeeDeductions.length}`);
    console.log(`  Payroll Runs: 1`);
    console.log(`  Paychecks: ${paychecks.length}\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding Paylinq demo data:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run the script
 */
async function main() {
  try {
    await seedPaylinqDemoData();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  main();
}

export { seedPaylinqDemoData };
