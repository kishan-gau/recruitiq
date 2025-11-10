/**
 * Paylinq Reports Controller
 * Handles HTTP requests for payroll reports and analytics
 */

import payrollService from '../services/payrollService.js';
import timeAttendanceService from '../services/timeAttendanceService.js';
import taxCalculationService from '../services/taxCalculationService.js';
import logger from '../../../utils/logger.js';

/**
 * Get payroll summary report
 * GET /api/paylinq/reports/payroll-summary
 */
async function getPayrollSummaryReport(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { startDate, endDate, groupBy } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'startDate and endDate are required',
      });
    }

    // Get payroll runs in date range
    const payrollRuns = await payrollService.getPayrollRunsByOrganization(organizationId, {
      startDate,
      endDate,
      status: 'finalized',
    });

    // Aggregate payroll data
    const summary = {
      totalRuns: payrollRuns.length,
      totalEmployees: 0,
      totalGross: 0,
      totalTaxes: 0,
      totalDeductions: 0,
      totalNet: 0,
      periodStart: startDate,
      periodEnd: endDate,
      runs: payrollRuns.map((run) => ({
        id: run.id,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        employeeCount: run.employeeCount || 0,
        totalGross: parseFloat(run.totalGross || 0),
        totalTaxes: parseFloat(run.totalTaxes || 0),
        totalDeductions: parseFloat(run.totalDeductions || 0),
        totalNet: parseFloat(run.totalNet || 0),
      })),
    };

    // Calculate totals
    summary.runs.forEach((run) => {
      summary.totalEmployees += run.employeeCount;
      summary.totalGross += run.totalGross;
      summary.totalTaxes += run.totalTaxes;
      summary.totalDeductions += run.totalDeductions;
      summary.totalNet += run.totalNet;
    });

    logger.info('Payroll summary report generated', {
      organizationId,
      startDate,
      endDate,
      totalRuns: summary.totalRuns,
    });

    res.status(200).json({
      success: true,
      summary: summary,
    });
  } catch (error) {
    logger.error('Error generating payroll summary report', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate payroll summary report',
    });
  }
}

/**
 * Get employee earnings report
 * GET /api/paylinq/reports/employee-earnings
 */
async function getEmployeeEarningsReport(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'startDate and endDate are required',
      });
    }

    const filters = { startDate, endDate };
    let report;

    if (employeeId) {
      // Single employee report
      const paychecks = await payrollService.getPaychecksByEmployee(
        employeeId,
        organizationId,
        filters
      );

      const totalGross = paychecks.reduce((sum, pc) => sum + parseFloat(pc.grossPay || 0), 0);
      const totalTaxes = paychecks.reduce((sum, pc) => sum + parseFloat(pc.totalTaxes || 0), 0);
      const totalDeductions = paychecks.reduce(
        (sum, pc) => sum + parseFloat(pc.totalDeductions || 0),
        0
      );
      const totalNet = paychecks.reduce((sum, pc) => sum + parseFloat(pc.netPay || 0), 0);

      report = {
        employeeId,
        periodStart: startDate,
        periodEnd: endDate,
        paycheckCount: paychecks.length,
        totalGross,
        totalTaxes,
        totalDeductions,
        totalNet,
        paychecks: paychecks.map((pc) => ({
          id: pc.id,
          payDate: pc.payDate,
          grossPay: parseFloat(pc.grossPay || 0),
          totalTaxes: parseFloat(pc.totalTaxes || 0),
          totalDeductions: parseFloat(pc.totalDeductions || 0),
          netPay: parseFloat(pc.netPay || 0),
        })),
      };
    } else {
      // All employees report
      const paychecks = await payrollService.getPaychecksByOrganization(organizationId, filters);

      // Group by employee
      const employeeMap = {};
      paychecks.forEach((pc) => {
        if (!employeeMap[pc.employeeId]) {
          employeeMap[pc.employeeId] = {
            employeeId: pc.employeeId,
            employeeName: pc.employeeName || 'Unknown',
            paycheckCount: 0,
            totalGross: 0,
            totalTaxes: 0,
            totalDeductions: 0,
            totalNet: 0,
          };
        }

        const emp = employeeMap[pc.employeeId];
        emp.paycheckCount++;
        emp.totalGross += parseFloat(pc.grossPay || 0);
        emp.totalTaxes += parseFloat(pc.totalTaxes || 0);
        emp.totalDeductions += parseFloat(pc.totalDeductions || 0);
        emp.totalNet += parseFloat(pc.netPay || 0);
      });

      report = {
        periodStart: startDate,
        periodEnd: endDate,
        employeeCount: Object.keys(employeeMap).length,
        employees: Object.values(employeeMap),
      };
    }

    logger.info('Employee earnings report generated', {
      organizationId,
      employeeId: employeeId || 'all',
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      report: report,
    });
  } catch (error) {
    logger.error('Error generating employee earnings report', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate employee earnings report',
    });
  }
}

/**
 * Get tax liability report
 * GET /api/paylinq/reports/tax-liability
 */
async function getTaxLiabilityReport(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { startDate, endDate, taxType } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'startDate and endDate are required',
      });
    }

    // Get all paychecks in date range
    const paychecks = await payrollService.getPaychecksByOrganization(organizationId, {
      startDate,
      endDate,
      status: 'paid',
    });

    // Aggregate tax data (MVP: simplified aggregation)
    const taxMap = {};

    paychecks.forEach((pc) => {
      const taxes = [
        { type: 'income_tax', amount: parseFloat(pc.incomeTax || 0) },
        { type: 'social_security', amount: parseFloat(pc.socialSecurity || 0) },
        { type: 'medicare', amount: parseFloat(pc.medicare || 0) },
      ];

      taxes.forEach((tax) => {
        if (tax.amount > 0) {
          if (!taxMap[tax.type]) {
            taxMap[tax.type] = {
              taxType: tax.type,
              totalAmount: 0,
              paycheckCount: 0,
            };
          }
          taxMap[tax.type].totalAmount += tax.amount;
          taxMap[tax.type].paycheckCount++;
        }
      });
    });

    const report = {
      periodStart: startDate,
      periodEnd: endDate,
      totalPaychecks: paychecks.length,
      taxes: Object.values(taxMap),
      totalTaxLiability: Object.values(taxMap).reduce((sum, t) => sum + t.totalAmount, 0),
    };

    // Filter by tax type if specified
    if (taxType) {
      report.taxes = report.taxes.filter((t) => t.taxType === taxType);
    }

    logger.info('Tax liability report generated', {
      organizationId,
      startDate,
      endDate,
      totalTaxLiability: report.totalTaxLiability,
    });

    res.status(200).json({
      success: true,
      report: report,
    });
  } catch (error) {
    logger.error('Error generating tax liability report', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate tax liability report',
    });
  }
}

/**
 * Get time attendance report
 * GET /api/paylinq/reports/time-attendance
 */
async function getTimeAttendanceReport(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { employeeId, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'startDate and endDate are required',
      });
    }

    const filters = { employeeId, startDate, endDate, status: 'approved' };
    const timeEntries = await timeAttendanceService.getTimeEntriesByOrganization(
      organizationId,
      filters
    );

    // Aggregate time data
    const employeeMap = {};

    timeEntries.forEach((entry) => {
      if (!employeeMap[entry.employeeId]) {
        employeeMap[entry.employeeId] = {
          employeeId: entry.employeeId,
          employeeName: entry.employeeName || 'Unknown',
          totalRegularHours: 0,
          totalOvertimeHours: 0,
          totalHours: 0,
          entryCount: 0,
        };
      }

      const emp = employeeMap[entry.employeeId];
      emp.totalRegularHours += parseFloat(entry.regularHours || 0);
      emp.totalOvertimeHours += parseFloat(entry.overtimeHours || 0);
      emp.totalHours += parseFloat(entry.hoursWorked || 0);
      emp.entryCount++;
    });

    const report = {
      periodStart: startDate,
      periodEnd: endDate,
      employeeCount: Object.keys(employeeMap).length,
      totalEntries: timeEntries.length,
      employees: Object.values(employeeMap),
      summary: {
        totalRegularHours: Object.values(employeeMap).reduce(
          (sum, e) => sum + e.totalRegularHours,
          0
        ),
        totalOvertimeHours: Object.values(employeeMap).reduce(
          (sum, e) => sum + e.totalOvertimeHours,
          0
        ),
        totalHours: Object.values(employeeMap).reduce((sum, e) => sum + e.totalHours, 0),
      },
    };

    logger.info('Time attendance report generated', {
      organizationId,
      startDate,
      endDate,
      totalEntries: report.totalEntries,
    });

    res.status(200).json({
      success: true,
      report: report,
    });
  } catch (error) {
    logger.error('Error generating time attendance report', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate time attendance report',
    });
  }
}

/**
 * Get deductions report
 * GET /api/paylinq/reports/deductions
 */
async function getDeductionsReport(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { startDate, endDate, deductionType } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'startDate and endDate are required',
      });
    }

    const filters = { deductionType, status: 'active' };
    const deductions = await taxCalculationService.getDeductionsByOrganization(
      organizationId,
      filters
    );

    // Group by deduction type
    const typeMap = {};

    deductions.forEach((ded) => {
      const type = ded.deductionType;
      if (!typeMap[type]) {
        typeMap[type] = {
          deductionType: type,
          count: 0,
          totalAmount: 0,
          employees: [],
        };
      }

      typeMap[type].count++;
      typeMap[type].totalAmount += parseFloat(ded.amount || 0);
      if (!typeMap[type].employees.includes(ded.employeeId)) {
        typeMap[type].employees.push(ded.employeeId);
      }
    });

    // Calculate employee counts
    Object.values(typeMap).forEach((t) => {
      t.employeeCount = t.employees.length;
      delete t.employees; // Don't send employee IDs in response
    });

    const report = {
      periodStart: startDate,
      periodEnd: endDate,
      totalDeductions: deductions.length,
      deductionTypes: Object.values(typeMap),
      totalAmount: Object.values(typeMap).reduce((sum, t) => sum + t.totalAmount, 0),
    };

    logger.info('Deductions report generated', {
      organizationId,
      startDate,
      endDate,
      totalDeductions: report.totalDeductions,
    });

    res.status(200).json({
      success: true,
      report: report,
    });
  } catch (error) {
    logger.error('Error generating deductions report', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate deductions report',
    });
  }
}

/**
 * Get worker type distribution report
 * GET /api/paylinq/reports/worker-type-distribution
 */
async function getWorkerTypeDistributionReport(req, res) {
  try {
    const { organization_id: organizationId } = req.user;

    const employees = await payrollService.getEmployeesByOrganization(organizationId, {
      includeInactive: false,
    });

    // Group by worker type
    const workerTypeMap = {};

    employees.forEach((emp) => {
      const workerType = emp.workerTypeName || 'Unassigned';
      if (!workerTypeMap[workerType]) {
        workerTypeMap[workerType] = {
          workerType,
          employeeCount: 0,
          employees: [],
        };
      }

      workerTypeMap[workerType].employeeCount++;
      workerTypeMap[workerType].employees.push({
        id: emp.id,
        name: emp.fullName || `${emp.firstName} ${emp.lastName}`,
        status: emp.status,
      });
    });

    const report = {
      totalEmployees: employees.length,
      workerTypes: Object.values(workerTypeMap),
      workerTypeCount: Object.keys(workerTypeMap).length,
    };

    logger.info('Worker type distribution report generated', {
      organizationId,
      totalEmployees: report.totalEmployees,
      workerTypeCount: report.workerTypeCount,
    });

    res.status(200).json({
      success: true,
      report: report,
    });
  } catch (error) {
    logger.error('Error generating worker type distribution report', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate worker type distribution report',
    });
  }
}

export default {
  getPayrollSummaryReport,
  getEmployeeEarningsReport,
  getTaxLiabilityReport,
  getTimeAttendanceReport,
  getDeductionsReport,
  getWorkerTypeDistributionReport,
};
