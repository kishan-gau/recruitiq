/**
 * Compliance Service
 * Business logic for payroll compliance and regulatory requirements
 */

import ComplianceRepository from '../repositories/complianceRepository.js';
import PayrollRepository from '../repositories/payrollRepository.js';
import {
  mapComplianceRuleToDto,
  mapComplianceRulesToDto,
  mapComplianceViolationToDto,
  mapComplianceViolationsToDto,
  mapAuditLogToDto,
  mapAuditLogsToDto
} from '../dto/complianceDto.js';

class ComplianceService {
  constructor(complianceRepository = null, payrollRepository = null) {
    this.complianceRepository = complianceRepository || new ComplianceRepository();
    this.payrollRepository = payrollRepository || new PayrollRepository();
  }

  /**
   * Create a new compliance rule
   */
  async createComplianceRule(ruleData, organizationId, userId) {
    // Validate required fields
    if (!ruleData.ruleName || !ruleData.ruleType || !ruleData.description || 
        ruleData.isActive === undefined || !ruleData.effectiveDate) {
      throw new Error('Missing required fields for compliance rule');
    }

    // Validate rule type enum
    const validRuleTypes = ['wage_law', 'overtime_law', 'tax_law', 'benefits_law', 'deduction_law'];
    if (!validRuleTypes.includes(ruleData.ruleType)) {
      throw new Error(`Invalid rule type: ${ruleData.ruleType}`);
    }

    const result = await this.complianceRepository.createComplianceRule(ruleData, organizationId, userId);
    return mapComplianceRuleToDto(result);
  }

  /**
   * Update an existing compliance rule
   */
  async updateComplianceRule(ruleId, updates, organizationId, userId) {
    const result = await this.complianceRepository.updateComplianceRule(ruleId, updates, organizationId, userId);
    return mapComplianceRuleToDto(result);
  }

  /**
   * Get all compliance rules for an organization
   */
  async getComplianceRules(organizationId, filters = {}) {
    const result = await this.complianceRepository.findComplianceRulesByType(organizationId, filters);
    return mapComplianceRulesToDto(result);
  }

  /**
   * Run a compliance check for a specific rule
   */
  async runComplianceCheck(ruleId, organizationId, userId) {
    const rule = await this.complianceRepository.findById(ruleId);
    
    if (!rule) {
      throw new Error(`Compliance rule not found: ${ruleId}`);
    }

    const employees = await this.payrollRepository.findByOrganization(organizationId);
    let violationsFound = 0;
    let recordsChecked = 0;

    if (rule.rule_type === 'wage_law') {
      for (const employee of employees) {
        const compensation = await this.payrollRepository.findCurrentCompensation(employee.employee_id);
        if (!compensation) continue; // Skip employees without compensation
        
        recordsChecked++;
        
        if (compensation.pay_period === 'hour' && compensation.pay_rate < rule.threshold) {
          await this.complianceRepository.createComplianceViolation({
            ruleId,
            employeeId: employee.employee_id,
            violationType: 'below_minimum_wage',
            severity: 'high',
            description: `Pay rate $${compensation.pay_rate} below threshold $${rule.threshold}`
          }, organizationId, userId);
          violationsFound++;
        }
      }
    } else if (rule.rule_type === 'overtime_law') {
      for (const employee of employees) {
        const timesheets = await this.payrollRepository.findTimesheets(employee.employee_id, organizationId);
        if (!timesheets || timesheets.length === 0) continue;
        
        for (const timesheet of timesheets) {
          recordsChecked++;
          
          if (timesheet.total_hours > rule.threshold && timesheet.overtime_hours === 0) {
            await this.complianceRepository.createComplianceViolation({
              ruleId,
              employeeId: employee.employee_id,
              violationType: 'missing_overtime_pay',
              severity: 'high',
              description: `Worked ${timesheet.total_hours} hours with no overtime pay`
            }, organizationId, userId);
            violationsFound++;
          }
        }
      }
    }

    const checkResult = {
      checkStatus: violationsFound > 0 ? 'failed' : 'passed',
      recordsChecked,
      violationsFound
    };

    await this.complianceRepository.createComplianceCheck({
      ruleId,
      ...checkResult
    }, organizationId, userId);

    return checkResult;
  }

  /**
   * Run all active compliance checks for an organization
   */
  async runAllComplianceChecks(organizationId, userId) {
    const rules = await this.complianceRepository.findComplianceRulesByType(organizationId, { is_active: true });
    const checks = [];

    for (const rule of rules) {
      if (rule.is_active) {
        const checkResult = await this.runComplianceCheck(rule.id, organizationId, userId);
        checks.push({
          ruleId: rule.id,
          ...checkResult
        });
      }
    }

    return {
      totalChecks: checks.length,
      checks
    };
  }

  /**
   * Get compliance violations with optional filters
   */
  async getComplianceViolations(organizationId, filters = {}) {
    const result = await this.complianceRepository.findComplianceViolations(organizationId, filters);
    return mapComplianceViolationsToDto(result);
  }

  /**
   * Resolve a compliance violation
   */
  async resolveViolation(violationId, resolutionNotes, organizationId, userId) {
    if (!resolutionNotes || resolutionNotes.trim() === '') {
      throw new Error('Resolution notes are required');
    }

    const result = await this.complianceRepository.updateComplianceViolation(violationId, {
      status: 'resolved',
      resolution_notes: resolutionNotes
    }, organizationId, userId);
    return mapComplianceViolationToDto(result);
  }

  /**
   * Escalate violation severity
   */
  async escalateViolation(violationId, severity, organizationId, userId) {
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      throw new Error(`Invalid severity level: ${severity}`);
    }

    const result = await this.complianceRepository.updateComplianceViolation(violationId, {
      severity
    }, organizationId, userId);
    return mapComplianceViolationToDto(result);
  }

  /**
   * Get compliance dashboard summary
   */
  async getComplianceDashboard(organizationId) {
    const openViolations = await this.complianceRepository.getOpenViolationCount(organizationId);
    const recentViolations = await this.complianceRepository.findComplianceViolations(organizationId, { limit: 10 });
    const recentChecks = await this.complianceRepository.findComplianceChecks(organizationId, { limit: 10 });

    const highSeverityCount = recentViolations.filter(v => v.severity === 'high').length;

    return {
      openViolations,
      highSeverityCount,
      recentChecks
    };
  }

  /**
   * Generate compliance report for a period
   */
  async getComplianceReport(startDate, endDate, organizationId) {
    const checks = await this.complianceRepository.findComplianceChecks(organizationId, {
      startDate,
      endDate
    });
    
    const violations = await this.complianceRepository.findComplianceViolations(organizationId, {
      startDate,
      endDate
    });

    const passedChecks = checks.filter(c => c.check_status === 'passed').length;
    const totalChecks = checks.length;
    const complianceRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;

    return {
      period: {
        startDate,
        endDate
      },
      totalChecks,
      totalViolations: violations.length,
      complianceRate
    };
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(auditData, organizationId) {
    const validEntityTypes = ['payroll_run', 'paycheck', 'tax_filing', 'compliance_rule', 'violation'];
    
    if (!validEntityTypes.includes(auditData.entityType)) {
      throw new Error(`Invalid entity type: ${auditData.entityType}`);
    }

    const result = await this.complianceRepository.createAuditLog(auditData, organizationId);
    return mapAuditLogToDto(result);
  }

  /**
   * Get audit trail for an entity
   */
  async getAuditTrail(entityType, entityId, organizationId, filters = {}) {
    const result = await this.complianceRepository.findAuditLogs(entityType, entityId, organizationId, filters);
    return mapAuditLogsToDto(result);
  }

  /**
   * Validate minimum wage compliance (synchronous helper)
   */
  validateMinimumWage(wage, minimumWage) {
    return wage >= minimumWage;
  }

  /**
   * Validate overtime compliance (synchronous helper)
   */
  validateOvertimeCompliance(totalHours, overtimeHours, overtimeThreshold = 40) {
    if (totalHours > overtimeThreshold) {
      const expectedOvertimeHours = totalHours - overtimeThreshold;
      // Has violation if overtime hours not recorded when expected
      return overtimeHours < expectedOvertimeHours;
    }
    return false; // No violation
  }

  /**
   * Legacy method for backward compatibility
   */
  async validatePayrollCompliance(payrollRunId, organizationId) {
    return {
      isCompliant: true,
      issues: [],
      warnings: []
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  checkMinimumWage(hourlyRate, jurisdiction) {
    const minimumWages = {
      federal: 7.25,
      california: 16.00,
      newyork: 15.00
    };
    
    const minWage = minimumWages[jurisdiction] || minimumWages.federal;
    return hourlyRate >= minWage;
  }

  /**
   * Legacy method for backward compatibility
   */
  async generateComplianceReport(organizationId, period) {
    return {
      period,
      complianceScore: 100,
      issues: [],
      recommendations: []
    };
  }
}

export default ComplianceService;
