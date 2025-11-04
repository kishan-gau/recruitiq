# Phase 12: Nexus Product - HRIS Backend Implementation

**Duration:** 7 days  
**Dependencies:** Phase 11  
**Team:** Backend Team (4 developers)  
**Status:** Not Started

---

## 📋 Overview

This phase implements the comprehensive backend for the Nexus HRIS product, aligned with the enterprise database schema from Phase 11. The implementation includes repositories, services, controllers, and routes for all 30+ tables covering user account management, employee lifecycle, contract management with sequence-based workflows, rule engine for policy automation, enhanced leave management with accrual tracking, attendance management, performance reviews, benefits administration, and document management. The architecture follows a hybrid approach with full database structure support and simplified MVP business logic, with Phase 2 enhancements clearly documented.

---

## 🎯 Objectives

1. Implement comprehensive repository layer for all 30+ HRIS tables from Phase 11
2. Create service layer with business logic for all modules
3. Implement user account management (separate from employee records)
4. Implement employee lifecycle management with contract sequences
5. Create contract management service with sequence-based workflows
6. Implement rule engine service for policy automation (JSON-based, MVP simple execution)
7. Create enhanced leave management with accrual rules and balance tracking
8. Implement attendance tracking and management
9. Create performance review workflows with goals and feedback
10. Implement benefits administration and enrollment
11. Create document management system
12. Implement organizational structure management (departments, locations, positions)
13. Set up routes with proper middleware and validation
14. Create comprehensive product configuration
15. Document Phase 2 enhancements for advanced features

---

## 📊 Key Deliverables

### 1. Product Configuration

**File:** `backend/src/products/nexus/config/product.config.js`

```javascript
/**
 * Nexus Product Configuration
 */
export default {
  id: 'nexus',
  name: 'Nexus',
  displayName: 'Nexus HRIS',
  version: '1.0.0',
  description: 'Human Resource Information System',
  
  routes: {
    prefix: '/api/hris',
    version: 'v1'
  },
  
  database: {
    schema: 'hris',
    tables: [
      // Core Employee Management (Phase 11)
      'user_accounts',
      'employees',
      'employee_contacts',
      'emergency_contacts',
      
      // Organizational Structure
      'departments',
      'locations',
      'positions',
      'job_levels',
      
      // Contract Management (Sequence-based)
      'contract_sequence_policies',
      'contract_sequence_steps',
      'contracts',
      
      // Leave Management (Enhanced)
      'leave_policies',
      'leave_balances',
      'leave_requests',
      'leave_request_approvals',
      
      // Attendance Management
      'attendance_records',
      
      // Performance Management
      'performance_reviews',
      'review_templates',
      'goals',
      'competencies',
      'competency_ratings',
      
      // Benefits
      'benefits',
      'benefit_enrollments',
      
      // Document Management
      'documents',
      'document_templates',
      
      // Rule Engine (JSON-based)
      'rules',
      'rule_execution_logs'
    ]
  },
  
  tiers: {
    starter: {
      name: 'Starter',
      features: ['employee_management', 'user_accounts', 'basic_leave', 'documents'],
      limits: {
        maxEmployees: 25,
        maxDocuments: 100,
        maxContractSequences: 3,
        maxRules: 5
      }
    },
    professional: {
      name: 'Professional',
      features: [
        'employee_management', 'user_accounts', 'contract_management', 
        'enhanced_leave', 'attendance', 'documents', 'performance_reviews', 
        'goals', 'org_chart', 'basic_rules'
      ],
      limits: {
        maxEmployees: 100,
        maxDocuments: 1000,
        maxContractSequences: 10,
        maxRules: 20
      }
    },
    enterprise: {
      name: 'Enterprise',
      features: 'all',
      limits: {
        maxEmployees: -1,
        maxDocuments: -1,
        maxContractSequences: -1,
        maxRules: -1
      }
    }
  },
  
  dependencies: ['core'],
  
  integrations: {
    provides: ['employee.created', 'employee.updated', 'employee.terminated'],
    consumes: ['candidate.hired']
  }
};
```

### 2. Employee Service (Business Logic)

**File:** `backend/src/products/nexus/services/employeeService.js`

```javascript
/**
 * Employee Service
 * Business logic for employee management
 */
import Joi from 'joi';
import EmployeeRepository from '../repositories/employeeRepository.js';
import { ValidationError, NotFoundError } from '../../../shared/utils/errors.js';
import logger from '../../../shared/utils/logger.js';
import { publishEvent } from '../../core/services/integrationBus.js';

class EmployeeService {
  constructor(repository = null) {
    this.repository = repository || new EmployeeRepository();
  }

  static get createEmployeeSchema() {
    return Joi.object({
      employeeNumber: Joi.string().required().trim().max(50),
      firstName: Joi.string().required().trim().max(100),
      middleName: Joi.string().optional().trim().max(100),
      lastName: Joi.string().required().trim().max(100),
      preferredName: Joi.string().optional().trim().max(100),
      email: Joi.string().email().required(),
      personalEmail: Joi.string().email().optional(),
      phone: Joi.string().optional().max(50),
      hireDate: Joi.date().required(),
      employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'intern', 'temporary').required(),
      jobTitle: Joi.string().required().trim().max(200),
      departmentId: Joi.string().uuid().optional(),
      managerId: Joi.string().uuid().optional(),
      locationId: Joi.string().uuid().optional(),
      workLocationType: Joi.string().valid('on-site', 'remote', 'hybrid').optional(),
      dateOfBirth: Joi.date().optional(),
      gender: Joi.string().optional().max(50),
      maritalStatus: Joi.string().optional().max(50),
      nationality: Joi.string().optional().max(100),
      addressLine1: Joi.string().optional().max(255),
      addressLine2: Joi.string().optional().max(255),
      city: Joi.string().optional().max(100),
      state: Joi.string().optional().max(100),
      postalCode: Joi.string().optional().max(20),
      country: Joi.string().optional().max(100),
      emergencyContactName: Joi.string().optional().max(200),
      emergencyContactRelationship: Joi.string().optional().max(100),
      emergencyContactPhone: Joi.string().optional().max(50)
    }).options({ stripUnknown: true });
  }

  /**
   * Create new employee
   */
  async createEmployee(data, organizationId, userId) {
    try {
      const validated = await this.constructor.createEmployeeSchema.validateAsync(data);
      
      logger.info('Creating employee', {
        organizationId,
        employeeNumber: validated.employeeNumber
      });
      
      const employee = await this.repository.createEmployee(validated, organizationId, userId);
      
      // Publish event for integration
      await publishEvent('employee.created', {
        employeeId: employee.id,
        organizationId,
        employeeNumber: employee.employee_number,
        email: employee.email,
        hireDate: employee.hire_date
      });
      
      // Initialize time off balances
      await this.initializeTimeOffBalances(employee.id, organizationId);
      
      logger.info('Employee created', {
        id: employee.id,
        organizationId
      });
      
      return employee;
    } catch (error) {
      if (error.isJoi) {
        throw new ValidationError(error.message);
      }
      logger.error('Failed to create employee:', error);
      throw error;
    }
  }

  /**
   * Initialize time off balances for new employee
   */
  async initializeTimeOffBalances(employeeId, organizationId) {
    const policies = await this.repository.findActivePolicies(organizationId);
    const currentYear = new Date().getFullYear();
    
    for (const policy of policies) {
      await this.repository.createTimeOffBalance({
        employeeId,
        policyId: policy.id,
        availableBalance: policy.accrual_amount || 0,
        year: currentYear
      }, organizationId);
    }
  }

  /**
   * Terminate employee
   */
  async terminateEmployee(employeeId, terminationData, organizationId, userId) {
    try {
      logger.info('Terminating employee', { employeeId, organizationId });
      
      const employee = await this.repository.updateEmployee(
        employeeId,
        {
          employmentStatus: 'terminated',
          terminationDate: terminationData.terminationDate
        },
        organizationId,
        userId
      );
      
      if (!employee) {
        throw new NotFoundError('Employee not found');
      }
      
      // Publish event for integration
      await publishEvent('employee.terminated', {
        employeeId: employee.id,
        organizationId,
        terminationDate: terminationData.terminationDate,
        reason: terminationData.reason
      });
      
      logger.info('Employee terminated', { employeeId });
      return employee;
    } catch (error) {
      logger.error('Failed to terminate employee:', error);
      throw error;
    }
  }

  /**
   * Get organizational chart
   */
  async getOrganizationalChart(organizationId) {
    const employees = await this.repository.findByOrganization(organizationId, { status: 'active' });
    
    // Build hierarchy
    const employeeMap = new Map();
    employees.forEach(emp => employeeMap.set(emp.id, { ...emp, reports: [] }));
    
    const roots = [];
    employeeMap.forEach(emp => {
      if (emp.manager_id && employeeMap.has(emp.manager_id)) {
        employeeMap.get(emp.manager_id).reports.push(emp);
      } else {
        roots.push(emp);
      }
    });
    
    return roots;
  }
}

export default EmployeeService;
```

### 3. Time Off Service

**File:** `backend/src/products/nexus/services/timeOffService.js`

```javascript
/**
 * Time Off Service
 * Business logic for time off management
 */
import Joi from 'joi';
import TimeOffRepository from '../repositories/timeOffRepository.js';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../shared/utils/errors.js';
import logger from '../../../shared/utils/logger.js';

class TimeOffService {
  constructor(repository = null) {
    this.repository = repository || new TimeOffRepository();
  }

  static get createTimeOffRequestSchema() {
    return Joi.object({
      employeeId: Joi.string().uuid().required(),
      policyId: Joi.string().uuid().required(),
      startDate: Joi.date().required(),
      endDate: Joi.date().required().greater(Joi.ref('startDate')),
      totalDays: Joi.number().positive().required(),
      requestNote: Joi.string().optional().max(1000)
    }).options({ stripUnknown: true });
  }

  /**
   * Create time off request
   */
  async createTimeOffRequest(data, organizationId, userId) {
    try {
      const validated = await this.constructor.createTimeOffRequestSchema.validateAsync(data);
      
      logger.info('Creating time off request', {
        organizationId,
        employeeId: validated.employeeId
      });
      
      // Get policy
      const policy = await this.repository.findPolicyById(validated.policyId, organizationId);
      if (!policy) {
        throw new NotFoundError('Time off policy not found');
      }
      
      // Check balance
      const balance = await this.repository.findBalance(
        validated.employeeId,
        validated.policyId,
        new Date().getFullYear(),
        organizationId
      );
      
      if (!balance || balance.available_balance < validated.totalDays) {
        throw new BusinessRuleError('Insufficient time off balance');
      }
      
      // Check minimum notice
      const daysUntilStart = Math.ceil((new Date(validated.startDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilStart < policy.min_notice_days) {
        throw new BusinessRuleError(`Minimum ${policy.min_notice_days} days notice required`);
      }
      
      // Create request
      const request = await this.repository.createTimeOffRequest(validated, organizationId, userId);
      
      // Update balance (mark as pending)
      await this.repository.updateBalance(
        balance.id,
        {
          pendingBalance: parseFloat(balance.pending_balance) + validated.totalDays
        },
        organizationId
      );
      
      logger.info('Time off request created', {
        id: request.id,
        organizationId
      });
      
      return request;
    } catch (error) {
      if (error.isJoi) {
        throw new ValidationError(error.message);
      }
      logger.error('Failed to create time off request:', error);
      throw error;
    }
  }

  /**
   * Approve time off request
   */
  async approveTimeOffRequest(requestId, organizationId, userId) {
    try {
      logger.info('Approving time off request', { requestId, organizationId });
      
      const request = await this.repository.findRequestById(requestId, organizationId);
      if (!request) {
        throw new NotFoundError('Time off request not found');
      }
      
      if (request.status !== 'pending') {
        throw new BusinessRuleError(`Cannot approve request with status: ${request.status}`);
      }
      
      // Update request status
      const approved = await this.repository.updateRequestStatus(
        requestId,
        'approved',
        userId,
        organizationId
      );
      
      // Update balance
      const balance = await this.repository.findBalance(
        request.employee_id,
        request.policy_id,
        new Date(request.start_date).getFullYear(),
        organizationId
      );
      
      await this.repository.updateBalance(
        balance.id,
        {
          availableBalance: parseFloat(balance.available_balance) - parseFloat(request.total_days),
          pendingBalance: parseFloat(balance.pending_balance) - parseFloat(request.total_days),
          usedBalance: parseFloat(balance.used_balance) + parseFloat(request.total_days)
        },
        organizationId
      );
      
      logger.info('Time off request approved', { requestId });
      return approved;
    } catch (error) {
      logger.error('Failed to approve time off request:', error);
      throw error;
    }
  }

  /**
   * Accrual processing for time off balances
   */
  async processAccruals(organizationId) {
    logger.info('Processing time off accruals', { organizationId });
    
    const policies = await this.repository.findActivePolicies(organizationId);
    const currentYear = new Date().getFullYear();
    const today = new Date();
    
    for (const policy of policies) {
      if (policy.accrual_method === 'none') continue;
      
      const balances = await this.repository.findBalancesByPolicy(policy.id, currentYear, organizationId);
      
      for (const balance of balances) {
        if (!balance.next_accrual_date || new Date(balance.next_accrual_date) > today) {
          continue;
        }
        
        // Calculate new balance
        const newAvailable = Math.min(
          parseFloat(balance.available_balance) + parseFloat(policy.accrual_amount),
          parseFloat(policy.max_balance)
        );
        
        // Calculate next accrual date
        let nextAccrualDate = new Date(balance.next_accrual_date);
        if (policy.accrual_method === 'monthly') {
          nextAccrualDate.setMonth(nextAccrualDate.getMonth() + 1);
        } else if (policy.accrual_method === 'per-pay-period') {
          nextAccrualDate.setDate(nextAccrualDate.getDate() + 14); // Assuming bi-weekly
        }
        
        await this.repository.updateBalance(
          balance.id,
          {
            availableBalance: newAvailable,
            lastAccrualDate: today,
            nextAccrualDate
          },
          organizationId
        );
      }
    }
    
    logger.info('Time off accruals processed', { organizationId });
  }
}

export default TimeOffService;
```

### 4. Repository Layer Examples

**Key Repository Files for Phase 11 Schema**

#### userAccountRepository.js
```javascript
/**
 * User Account Repository
 * Manages user_accounts (separate from employees)
 */
import BaseRepository from '../../../shared/repositories/baseRepository.js';
import logger from '../../../shared/utils/logger.js';

class UserAccountRepository extends BaseRepository {
  constructor() {
    super('hris', 'user_accounts');
  }

  /**
   * Create user account
   */
  async createUserAccount(data, organizationId, userId) {
    const query = `
      INSERT INTO hris.user_accounts (
        organization_id, username, email, password_hash, 
        is_active, last_login_at, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await this.executeQuery(
      query,
      [
        organizationId, data.username, data.email, data.passwordHash,
        data.isActive !== false, null, userId
      ]
    );
    
    return result.rows[0];
  }

  /**
   * Find by username
   */
  async findByUsername(username, organizationId) {
    const query = `
      SELECT * FROM hris.user_accounts
      WHERE username = $1 AND organization_id = $2 AND is_active = true
    `;
    
    const result = await this.executeQuery(query, [username, organizationId]);
    return result.rows[0];
  }

  /**
   * Update last login
   */
  async updateLastLogin(userAccountId, organizationId) {
    const query = `
      UPDATE hris.user_accounts
      SET last_login_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `;
    
    const result = await this.executeQuery(query, [userAccountId, organizationId]);
    return result.rows[0];
  }
}

export default UserAccountRepository;
```

#### contractRepository.js
```javascript
/**
 * Contract Repository
 * Manages contract sequences and contracts
 */
import BaseRepository from '../../../shared/repositories/baseRepository.js';
import logger from '../../../shared/utils/logger.js';

class ContractRepository extends BaseRepository {
  constructor() {
    super('hris', 'contracts');
  }

  /**
   * Find contract sequence policy
   */
  async findSequencePolicy(policyId, organizationId) {
    const query = `
      SELECT csp.*, 
             json_agg(
               json_build_object(
                 'id', css.id,
                 'step_number', css.step_number,
                 'contract_type', css.contract_type,
                 'duration_months', css.duration_months,
                 'auto_renew', css.auto_renew,
                 'next_step_id', css.next_step_id
               ) ORDER BY css.step_number
             ) as steps
      FROM hris.contract_sequence_policies csp
      LEFT JOIN hris.contract_sequence_steps css ON css.policy_id = csp.id
      WHERE csp.id = $1 AND csp.organization_id = $2 AND csp.is_active = true
      GROUP BY csp.id
    `;
    
    const result = await this.executeQuery(query, [policyId, organizationId]);
    return result.rows[0];
  }

  /**
   * Create contract
   */
  async createContract(data, organizationId, userId) {
    const query = `
      INSERT INTO hris.contracts (
        organization_id, employee_id, sequence_policy_id, sequence_step_id,
        contract_number, contract_type, start_date, end_date, status,
        terms_json, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await this.executeQuery(
      query,
      [
        organizationId, data.employeeId, data.sequencePolicyId, data.sequenceStepId,
        data.contractNumber, data.contractType, data.startDate, data.endDate,
        data.status || 'draft', JSON.stringify(data.terms || {}), userId
      ]
    );
    
    return result.rows[0];
  }

  /**
   * Find active contract for employee
   */
  async findActiveContract(employeeId, organizationId) {
    const query = `
      SELECT c.*, 
             csp.sequence_name,
             css.step_number,
             css.next_step_id
      FROM hris.contracts c
      LEFT JOIN hris.contract_sequence_policies csp ON c.sequence_policy_id = csp.id
      LEFT JOIN hris.contract_sequence_steps css ON c.sequence_step_id = css.id
      WHERE c.employee_id = $1 
        AND c.organization_id = $2 
        AND c.status = 'active'
        AND c.start_date <= CURRENT_DATE
        AND (c.end_date IS NULL OR c.end_date >= CURRENT_DATE)
      ORDER BY c.start_date DESC
      LIMIT 1
    `;
    
    const result = await this.executeQuery(query, [employeeId, organizationId]);
    return result.rows[0];
  }

  /**
   * Get contracts nearing expiry
   */
  async findExpiringContracts(daysAhead, organizationId) {
    const query = `
      SELECT c.*, 
             e.first_name, e.last_name, e.employee_number,
             css.next_step_id, css.auto_renew
      FROM hris.contracts c
      JOIN hris.employees e ON c.employee_id = e.id
      LEFT JOIN hris.contract_sequence_steps css ON c.sequence_step_id = css.id
      WHERE c.organization_id = $1
        AND c.status = 'active'
        AND c.end_date IS NOT NULL
        AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * $2
      ORDER BY c.end_date ASC
    `;
    
    const result = await this.executeQuery(query, [organizationId, daysAhead]);
    return result.rows;
  }
}

export default ContractRepository;
```

#### ruleEngineRepository.js
```javascript
/**
 * Rule Engine Repository
 * Manages JSON-based policy rules
 */
import BaseRepository from '../../../shared/repositories/baseRepository.js';
import logger from '../../../shared/utils/logger.js';

class RuleEngineRepository extends BaseRepository {
  constructor() {
    super('hris', 'rules');
  }

  /**
   * Create rule
   */
  async createRule(data, organizationId, userId) {
    const query = `
      INSERT INTO hris.rules (
        organization_id, rule_name, rule_type, description,
        conditions_json, actions_json, priority, is_active,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const result = await this.executeQuery(
      query,
      [
        organizationId, data.ruleName, data.ruleType, data.description,
        JSON.stringify(data.conditions || {}), JSON.stringify(data.actions || {}),
        data.priority || 0, data.isActive !== false, userId
      ]
    );
    
    return result.rows[0];
  }

  /**
   * Find applicable rules for type
   */
  async findApplicableRules(ruleType, organizationId) {
    const query = `
      SELECT * FROM hris.rules
      WHERE organization_id = $1 
        AND rule_type = $2 
        AND is_active = true
      ORDER BY priority DESC
    `;
    
    const result = await this.executeQuery(query, [organizationId, ruleType]);
    return result.rows;
  }

  /**
   * Log rule execution
   */
  async logExecution(ruleId, entityType, entityId, inputData, outputData, status, errorMessage, organizationId) {
    const query = `
      INSERT INTO hris.rule_execution_logs (
        organization_id, rule_id, entity_type, entity_id,
        input_data_json, output_data_json, execution_status, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await this.executeQuery(
      query,
      [
        organizationId, ruleId, entityType, entityId,
        JSON.stringify(inputData || {}), JSON.stringify(outputData || {}),
        status, errorMessage
      ]
    );
    
    return result.rows[0];
  }

  /**
   * Get execution history for entity
   */
  async findExecutionHistory(entityType, entityId, organizationId, limit = 50) {
    const query = `
      SELECT rel.*, r.rule_name, r.rule_type
      FROM hris.rule_execution_logs rel
      JOIN hris.rules r ON rel.rule_id = r.id
      WHERE rel.organization_id = $1
        AND rel.entity_type = $2
        AND rel.entity_id = $3
      ORDER BY rel.executed_at DESC
      LIMIT $4
    `;
    
    const result = await this.executeQuery(query, [organizationId, entityType, entityId, limit]);
    return result.rows;
  }
}

export default RuleEngineRepository;
```

#### attendanceRepository.js
```javascript
/**
 * Attendance Repository
 * Manages attendance records
 */
import BaseRepository from '../../../shared/repositories/baseRepository.js';

class AttendanceRepository extends BaseRepository {
  constructor() {
    super('hris', 'attendance_records');
  }

  /**
   * Create attendance record
   */
  async createAttendanceRecord(data, organizationId, userId) {
    const query = `
      INSERT INTO hris.attendance_records (
        organization_id, employee_id, attendance_date, status,
        clock_in_time, clock_out_time, total_hours, notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const result = await this.executeQuery(
      query,
      [
        organizationId, data.employeeId, data.attendanceDate, data.status,
        data.clockInTime, data.clockOutTime, data.totalHours, data.notes, userId
      ]
    );
    
    return result.rows[0];
  }

  /**
   * Find records for date range
   */
  async findByDateRange(employeeId, startDate, endDate, organizationId) {
    const query = `
      SELECT * FROM hris.attendance_records
      WHERE employee_id = $1 
        AND organization_id = $2
        AND attendance_date BETWEEN $3 AND $4
      ORDER BY attendance_date DESC
    `;
    
    const result = await this.executeQuery(query, [employeeId, organizationId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Calculate attendance summary
   */
  async getAttendanceSummary(employeeId, month, year, organizationId) {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'present') as present_days,
        COUNT(*) FILTER (WHERE status = 'absent') as absent_days,
        COUNT(*) FILTER (WHERE status = 'late') as late_days,
        COUNT(*) FILTER (WHERE status = 'half-day') as half_days,
        COALESCE(SUM(total_hours), 0) as total_hours
      FROM hris.attendance_records
      WHERE employee_id = $1 
        AND organization_id = $2
        AND EXTRACT(MONTH FROM attendance_date) = $3
        AND EXTRACT(YEAR FROM attendance_date) = $4
    `;
    
    const result = await this.executeQuery(query, [employeeId, organizationId, month, year]);
    return result.rows[0];
  }
}

export default AttendanceRepository;
```

### 5. Service Layer Examples

**Key Service Files for Phase 11 Features**

#### contractManagementService.js
```javascript
/**
 * Contract Management Service
 * Handles contract lifecycle with sequence-based workflows
 */
import Joi from 'joi';
import ContractRepository from '../repositories/contractRepository.js';
import EmployeeRepository from '../repositories/employeeRepository.js';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../../shared/utils/errors.js';
import logger from '../../../shared/utils/logger.js';

class ContractManagementService {
  constructor(contractRepo = null, employeeRepo = null) {
    this.contractRepository = contractRepo || new ContractRepository();
    this.employeeRepository = employeeRepo || new EmployeeRepository();
  }

  static get createContractSchema() {
    return Joi.object({
      employeeId: Joi.string().uuid().required(),
      sequencePolicyId: Joi.string().uuid().required(),
      contractType: Joi.string().valid('probation', 'fixed-term', 'permanent', 'temporary', 'internship').required(),
      startDate: Joi.date().required(),
      durationMonths: Joi.number().positive().optional(),
      terms: Joi.object().optional()
    }).options({ stripUnknown: true });
  }

  /**
   * Create initial contract (MVP: Simple contract generation)
   * Phase 2: Add approval workflow, digital signatures, template engine
   */
  async createInitialContract(data, organizationId, userId) {
    try {
      const validated = await this.constructor.createContractSchema.validateAsync(data);
      
      logger.info('Creating initial contract', {
        organizationId,
        employeeId: validated.employeeId
      });
      
      // Get sequence policy
      const policy = await this.contractRepository.findSequencePolicy(
        validated.sequencePolicyId,
        organizationId
      );
      
      if (!policy || !policy.steps || policy.steps.length === 0) {
        throw new NotFoundError('Contract sequence policy not found or has no steps');
      }
      
      // Get first step
      const firstStep = policy.steps.find(s => s.step_number === 1);
      if (!firstStep) {
        throw new BusinessRuleError('Sequence policy has no initial step');
      }
      
      // Calculate end date
      const startDate = new Date(validated.startDate);
      const endDate = validated.durationMonths || firstStep.duration_months
        ? new Date(startDate.setMonth(startDate.getMonth() + (validated.durationMonths || firstStep.duration_months)))
        : null;
      
      // Generate contract number
      const contractNumber = await this.generateContractNumber(organizationId);
      
      // Create contract
      const contract = await this.contractRepository.createContract({
        employeeId: validated.employeeId,
        sequencePolicyId: validated.sequencePolicyId,
        sequenceStepId: firstStep.id,
        contractNumber,
        contractType: validated.contractType,
        startDate: validated.startDate,
        endDate,
        status: 'draft',
        terms: validated.terms || {}
      }, organizationId, userId);
      
      logger.info('Initial contract created', {
        id: contract.id,
        contractNumber: contract.contract_number,
        organizationId
      });
      
      return contract;
    } catch (error) {
      if (error.isJoi) {
        throw new ValidationError(error.message);
      }
      logger.error('Failed to create initial contract:', error);
      throw error;
    }
  }

  /**
   * Process contract renewal (MVP: Simple step progression)
   * Phase 2: Add complex renewal rules, manager approvals, negotiation workflows
   */
  async processContractRenewal(contractId, organizationId, userId) {
    try {
      logger.info('Processing contract renewal', { contractId, organizationId });
      
      const currentContract = await this.contractRepository.findById(contractId, organizationId);
      if (!currentContract) {
        throw new NotFoundError('Contract not found');
      }
      
      if (currentContract.status !== 'active') {
        throw new BusinessRuleError('Only active contracts can be renewed');
      }
      
      // Check if contract has next step
      if (!currentContract.next_step_id) {
        throw new BusinessRuleError('Contract sequence has no next step (may be final step)');
      }
      
      // Get next step details
      const policy = await this.contractRepository.findSequencePolicy(
        currentContract.sequence_policy_id,
        organizationId
      );
      
      const nextStep = policy.steps.find(s => s.id === currentContract.next_step_id);
      if (!nextStep) {
        throw new NotFoundError('Next step not found in sequence');
      }
      
      // Calculate new dates
      const newStartDate = currentContract.end_date 
        ? new Date(new Date(currentContract.end_date).getTime() + 86400000) // Next day
        : new Date();
      
      const newEndDate = nextStep.duration_months
        ? new Date(newStartDate.setMonth(newStartDate.getMonth() + nextStep.duration_months))
        : null;
      
      // Generate new contract number
      const contractNumber = await this.generateContractNumber(organizationId);
      
      // Create renewed contract
      const renewedContract = await this.contractRepository.createContract({
        employeeId: currentContract.employee_id,
        sequencePolicyId: currentContract.sequence_policy_id,
        sequenceStepId: nextStep.id,
        contractNumber,
        contractType: nextStep.contract_type,
        startDate: newStartDate,
        endDate: newEndDate,
        status: 'draft',
        terms: currentContract.terms_json || {}
      }, organizationId, userId);
      
      logger.info('Contract renewed', {
        oldContractId: contractId,
        newContractId: renewedContract.id,
        organizationId
      });
      
      return renewedContract;
    } catch (error) {
      logger.error('Failed to process contract renewal:', error);
      throw error;
    }
  }

  /**
   * Check contracts nearing expiry and handle auto-renewals
   */
  async checkExpiringContracts(organizationId, daysAhead = 30) {
    logger.info('Checking expiring contracts', { organizationId, daysAhead });
    
    const expiringContracts = await this.contractRepository.findExpiringContracts(
      daysAhead,
      organizationId
    );
    
    const results = {
      totalExpiring: expiringContracts.length,
      autoRenewed: 0,
      requiresAction: []
    };
    
    for (const contract of expiringContracts) {
      if (contract.auto_renew && contract.next_step_id) {
        try {
          // Auto-renew contract
          await this.processContractRenewal(contract.id, organizationId, 'system');
          results.autoRenewed++;
        } catch (error) {
          logger.error('Auto-renewal failed', { contractId: contract.id, error });
          results.requiresAction.push({
            contractId: contract.id,
            employeeNumber: contract.employee_number,
            reason: 'Auto-renewal failed'
          });
        }
      } else {
        results.requiresAction.push({
          contractId: contract.id,
          employeeNumber: contract.employee_number,
          endDate: contract.end_date,
          reason: contract.next_step_id ? 'Manual renewal required' : 'Final contract in sequence'
        });
      }
    }
    
    logger.info('Expiring contracts processed', results);
    return results;
  }

  /**
   * Generate unique contract number
   */
  async generateContractNumber(organizationId) {
    const prefix = 'CNT';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}-${random}`;
  }
}

export default ContractManagementService;
```

#### ruleEngineService.js
```javascript
/**
 * Rule Engine Service
 * JSON-based policy automation (MVP: Simple condition evaluation)
 * Phase 2: Add complex operators, nested conditions, external data sources
 */
import Joi from 'joi';
import RuleEngineRepository from '../repositories/ruleEngineRepository.js';
import { ValidationError } from '../../../shared/utils/errors.js';
import logger from '../../../shared/utils/logger.js';

class RuleEngineService {
  constructor(repository = null) {
    this.repository = repository || new RuleEngineRepository();
  }

  static get createRuleSchema() {
    return Joi.object({
      ruleName: Joi.string().required().trim().max(200),
      ruleType: Joi.string().required().valid('leave_approval', 'attendance_policy', 'performance_trigger', 'benefit_eligibility'),
      description: Joi.string().optional().max(1000),
      conditions: Joi.object().required(),
      actions: Joi.object().required(),
      priority: Joi.number().integer().default(0),
      isActive: Joi.boolean().default(true)
    }).options({ stripUnknown: true });
  }

  /**
   * Create rule (MVP: Store JSON conditions/actions)
   */
  async createRule(data, organizationId, userId) {
    try {
      const validated = await this.constructor.createRuleSchema.validateAsync(data);
      
      logger.info('Creating rule', {
        organizationId,
        ruleName: validated.ruleName,
        ruleType: validated.ruleType
      });
      
      const rule = await this.repository.createRule(validated, organizationId, userId);
      
      logger.info('Rule created', { id: rule.id, organizationId });
      return rule;
    } catch (error) {
      if (error.isJoi) {
        throw new ValidationError(error.message);
      }
      logger.error('Failed to create rule:', error);
      throw error;
    }
  }

  /**
   * Execute rules for entity (MVP: Simple condition matching)
   * Phase 2: Add complex expression evaluation, async actions, rule chaining
   */
  async executeRules(ruleType, entityType, entityId, contextData, organizationId) {
    try {
      logger.info('Executing rules', {
        ruleType,
        entityType,
        entityId,
        organizationId
      });
      
      const rules = await this.repository.findApplicableRules(ruleType, organizationId);
      const executionResults = [];
      
      for (const rule of rules) {
        try {
          // MVP: Simple condition evaluation
          const conditionsMet = this.evaluateConditions(rule.conditions_json, contextData);
          
          if (conditionsMet) {
            // Execute actions
            const actionResults = await this.executeActions(rule.actions_json, contextData, organizationId);
            
            // Log success
            await this.repository.logExecution(
              rule.id,
              entityType,
              entityId,
              contextData,
              actionResults,
              'success',
              null,
              organizationId
            );
            
            executionResults.push({
              ruleId: rule.id,
              ruleName: rule.rule_name,
              status: 'success',
              actions: actionResults
            });
          }
        } catch (error) {
          // Log failure
          await this.repository.logExecution(
            rule.id,
            entityType,
            entityId,
            contextData,
            null,
            'failed',
            error.message,
            organizationId
          );
          
          executionResults.push({
            ruleId: rule.id,
            ruleName: rule.rule_name,
            status: 'failed',
            error: error.message
          });
          
          logger.error('Rule execution failed', {
            ruleId: rule.id,
            error: error.message
          });
        }
      }
      
      logger.info('Rules executed', {
        totalRules: rules.length,
        triggered: executionResults.filter(r => r.status === 'success').length,
        organizationId
      });
      
      return executionResults;
    } catch (error) {
      logger.error('Failed to execute rules:', error);
      throw error;
    }
  }

  /**
   * Evaluate conditions (MVP: Simple equality checks)
   * Phase 2: Add operators (>, <, >=, <=, in, not in), logical operators (AND, OR, NOT)
   */
  evaluateConditions(conditions, contextData) {
    if (!conditions || typeof conditions !== 'object') {
      return true;
    }
    
    // MVP: Simple field equality checks
    for (const [field, expectedValue] of Object.entries(conditions)) {
      const actualValue = this.getNestedValue(contextData, field);
      
      if (actualValue !== expectedValue) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Execute actions (MVP: Simple property setting)
   * Phase 2: Add notifications, workflow triggers, external integrations
   */
  async executeActions(actions, contextData, organizationId) {
    const results = {};
    
    if (!actions || typeof actions !== 'object') {
      return results;
    }
    
    // MVP: Return action definitions (actual execution happens in calling service)
    for (const [actionType, actionData] of Object.entries(actions)) {
      results[actionType] = actionData;
    }
    
    return results;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(entityType, entityId, organizationId, limit = 50) {
    return this.repository.findExecutionHistory(entityType, entityId, organizationId, limit);
  }
}

export default RuleEngineService;
```

#### attendanceService.js
```javascript
/**
 * Attendance Service
 * Manages employee attendance records
 */
import Joi from 'joi';
import AttendanceRepository from '../repositories/attendanceRepository.js';
import { ValidationError } from '../../../shared/utils/errors.js';
import logger from '../../../shared/utils/logger.js';

class AttendanceService {
  constructor(repository = null) {
    this.repository = repository || new AttendanceRepository();
  }

  static get createAttendanceSchema() {
    return Joi.object({
      employeeId: Joi.string().uuid().required(),
      attendanceDate: Joi.date().required(),
      status: Joi.string().valid('present', 'absent', 'late', 'half-day', 'leave').required(),
      clockInTime: Joi.string().optional(),
      clockOutTime: Joi.string().optional(),
      totalHours: Joi.number().optional(),
      notes: Joi.string().optional().max(500)
    }).options({ stripUnknown: true });
  }

  /**
   * Record attendance
   */
  async recordAttendance(data, organizationId, userId) {
    try {
      const validated = await this.constructor.createAttendanceSchema.validateAsync(data);
      
      logger.info('Recording attendance', {
        organizationId,
        employeeId: validated.employeeId,
        date: validated.attendanceDate
      });
      
      const record = await this.repository.createAttendanceRecord(validated, organizationId, userId);
      
      logger.info('Attendance recorded', { id: record.id, organizationId });
      return record;
    } catch (error) {
      if (error.isJoi) {
        throw new ValidationError(error.message);
      }
      logger.error('Failed to record attendance:', error);
      throw error;
    }
  }

  /**
   * Get attendance summary
   */
  async getAttendanceSummary(employeeId, month, year, organizationId) {
    const summary = await this.repository.getAttendanceSummary(
      employeeId,
      month,
      year,
      organizationId
    );
    
    return summary;
  }

  /**
   * Calculate attendance percentage
   */
  async calculateAttendancePercentage(employeeId, startDate, endDate, organizationId) {
    const records = await this.repository.findByDateRange(
      employeeId,
      startDate,
      endDate,
      organizationId
    );
    
    const workingDays = records.length;
    const presentDays = records.filter(r => 
      ['present', 'late', 'half-day'].includes(r.status)
    ).length;
    
    const percentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;
    
    return {
      workingDays,
      presentDays,
      absentDays: workingDays - presentDays,
      percentage: parseFloat(percentage.toFixed(2))
    };
  }
}

export default AttendanceService;
```

---

## � Phase 2 Enhancements

This section documents advanced features to be implemented after the MVP is stable.

### Contract Management Advanced Features

**1. Multi-Level Approval Workflows**
```javascript
// Phase 2: Approval routing based on contract type and value
{
  "approval_rules": {
    "contract_type": "permanent",
    "approval_chain": [
      { "role": "department_manager", "required": true },
      { "role": "hr_manager", "required": true },
      { "role": "cfo", "required": true, "condition": "salary > 100000" },
      { "role": "ceo", "required": true, "condition": "level >= 5" }
    ],
    "parallel_approval": false,
    "timeout_days": 7
  }
}
```

**2. Digital Signature Integration**
- DocuSign API integration for contract signing
- Adobe Sign integration as alternative
- In-app signature capture for simple documents
- Signature verification and audit trail
- Automatic contract finalization after all signatures collected

**3. Advanced Template Engine**
```javascript
// Phase 2: Variable substitution in contract templates
{
  "template_variables": {
    "employee.full_name": "{{employee.first_name}} {{employee.last_name}}",
    "employee.start_date": "{{contract.start_date | format:'MMMM DD, YYYY'}}",
    "compensation.annual_salary": "{{employee.salary | currency}}",
    "company.legal_entity": "{{organization.legal_name}}",
    "custom_clause": "{{if employee.level >= 5}}Executive benefits apply{{endif}}"
  },
  "conditional_sections": true,
  "dynamic_clauses": true
}
```

**4. Contract Negotiation Workflows**
- Version tracking for contract revisions
- Side-by-side comparison of contract versions
- Comment and annotation system
- Counter-offer management
- Final version locking

**5. Bulk Operations**
- Bulk contract generation from employee list
- Bulk renewal processing with filters
- Contract expiry alerts via email/SMS
- Automated report generation

### Rule Engine Advanced Features

**1. Complex Operators**
```javascript
// Phase 2: Advanced condition operators
{
  "conditions": {
    "AND": [
      { "field": "employee.tenure_years", "operator": ">", "value": 2 },
      { "field": "employee.performance_rating", "operator": ">=", "value": 4.0 },
      { "field": "employee.department", "operator": "in", "value": ["Engineering", "Product"] },
      { "field": "leave.balance", "operator": "<", "value": 5 },
      {
        "OR": [
          { "field": "employee.level", "operator": ">=", "value": 5 },
          { "field": "employee.is_manager", "operator": "==", "value": true }
        ]
      }
    ]
  }
}
```

**2. Nested Conditions with Logical Operators**
- Unlimited nesting depth
- Complex boolean logic (AND, OR, NOT, XOR)
- Parenthetical grouping
- Short-circuit evaluation for performance

**3. External Data Source Integration**
```javascript
// Phase 2: Fetch data from external APIs within rules
{
  "conditions": {
    "field": "external.weather_api.temperature",
    "operator": ">",
    "value": 35,
    "data_source": {
      "type": "rest_api",
      "url": "https://api.weather.com/location/{{employee.city}}",
      "cache_ttl": 3600
    }
  }
}
```

**4. Async Action Execution**
- Queue-based action processing
- Retry logic for failed actions
- Action result tracking
- Webhook triggers

**5. Rule Chaining and Dependencies**
```javascript
// Phase 2: Execute rules in sequence with dependencies
{
  "rule_chain": [
    { "rule_id": "check_eligibility", "on_success": "calculate_benefit" },
    { "rule_id": "calculate_benefit", "on_success": "notify_employee" },
    { "rule_id": "notify_employee", "on_failure": "log_error" }
  ]
}
```

**6. Rule Versioning and A/B Testing**
- Version control for rule definitions
- A/B testing with traffic splitting
- Performance metrics per rule version
- Gradual rollout controls

### Leave Management Advanced Features

**1. Complex Accrual Formulas**
```javascript
// Phase 2: JavaScript expressions for accrual calculation
{
  "accrual_formula": {
    "type": "javascript",
    "expression": `
      const baseDays = 15;
      const tenureBonus = Math.floor(employee.tenure_years / 2) * 2;
      const performanceBonus = employee.performance_rating >= 4.5 ? 3 : 0;
      return Math.min(baseDays + tenureBonus + performanceBonus, 30);
    `
  }
}
```

**2. Leave Forecasting**
- Predict leave balance at future date
- Plan time-off without committing
- Team availability calendar with forecasts
- Budget planning for unused leave payouts

**3. Multi-Currency Leave Banks**
```javascript
// Phase 2: Track different leave types as separate "currencies"
{
  "leave_banks": [
    { "type": "vacation", "balance": 15, "unit": "days" },
    { "type": "sick", "balance": 40, "unit": "hours" },
    { "type": "personal", "balance": 3, "unit": "days" },
    { "type": "floating_holiday", "balance": 2, "unit": "days" }
  ],
  "conversion_rules": {
    "vacation_to_hours": 8,
    "sick_to_days": 0.125
  }
}
```

**4. Leave Donation Programs**
- Employee-to-employee leave donation
- Leave bank pooling for emergencies
- Donation approval workflows
- Tax implications tracking

**5. Payroll Integration**
- Automatic leave balance deduction on payroll run
- Leave payout calculations for terminations
- Unused leave cash-out policies
- Leave liability reporting

### Attendance Advanced Features

**1. Biometric Integration**
- Fingerprint scanner integration
- Facial recognition support
- Badge/RFID card readers
- Real-time sync from devices

**2. GPS-Based Clock-In**
```javascript
// Phase 2: Geofencing for clock-in validation
{
  "geofence_rules": {
    "enabled": true,
    "locations": [
      {
        "name": "Main Office",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "radius_meters": 100,
        "allow_clock_in": true
      }
    ],
    "outside_geofence_action": "require_manager_approval"
  }
}
```

**3. Shift Scheduling Integration**
- Automatic attendance record creation from shifts
- Late arrival detection based on shift start
- Early departure alerts
- Shift swap tracking

**4. Overtime Calculation Automation**
- Automatic overtime detection
- Configurable overtime rules by contract type
- Multi-tier overtime rates
- Comp time vs. overtime pay options

**5. Absence Pattern Detection with ML**
- Identify patterns in absences (e.g., frequent Mondays)
- Predict future absence probability
- Alert managers to concerning patterns
- Integration with performance reviews

---

## �🔍 Detailed Tasks

### Task 12.1: Create Repository Layer (2 days)

**Assignee:** Backend Developer 1 & 2

**Actions:**
1. **Core Employee Management:**
   - Create `userAccountRepository.js` with authentication queries
   - Create `employeeRepository.js` with full CRUD operations
   - Create `emergencyContactRepository.js`

2. **Contract Management:**
   - Create `contractRepository.js` with sequence policy support
   - Implement contract renewal and expiry queries
   - Add contract history tracking

3. **Organizational Structure:**
   - Create `departmentRepository.js`
   - Create `locationRepository.js`
   - Create `positionRepository.js`
   - Create `jobLevelRepository.js`

4. **Leave Management:**
   - Create `leaveRepository.js` with accrual rule support
   - Implement leave balance calculations
   - Add approval workflow queries

5. **Additional Modules:**
   - Create `attendanceRepository.js` with summary queries
   - Create `ruleEngineRepository.js` with JSON condition support
   - Create `performanceRepository.js`
   - Create `benefitRepository.js`
   - Create `documentRepository.js`

6. **Quality Assurance:**
   - Add proper error handling for all queries
   - Implement query optimization with indexes
   - Add transaction support for complex operations

**Standards:** Follow BACKEND_STANDARDS.md, DATABASE_STANDARDS.md

### Task 12.2: Create Service Layer (2.5 days)

**Assignee:** Backend Developer 2 & 3

**Actions:**
1. **User Account & Authentication:**
   - Create `userAccountService.js` with login/logout
   - Implement password management
   - Add session tracking

2. **Employee Lifecycle:**
   - Create `employeeService.js` with onboarding workflows
   - Implement employee termination process
   - Add organizational chart generation

3. **Contract Management (MVP):**
   - Create `contractManagementService.js`
   - Implement sequence-based contract creation
   - Add auto-renewal processing (simple step progression)
   - Document Phase 2: approval workflows, digital signatures

4. **Rule Engine (MVP):**
   - Create `ruleEngineService.js`
   - Implement simple JSON condition evaluation
   - Add basic action execution
   - Document Phase 2: complex operators, nested conditions, external data

5. **Leave Management:**
   - Create `leaveService.js` with accrual rules from JSON
   - Implement leave request approval workflow
   - Add balance calculation with carryover logic

6. **Attendance Tracking:**
   - Create `attendanceService.js`
   - Implement attendance recording and summaries
   - Add percentage calculations

7. **Additional Services:**
   - Create `performanceService.js` with goal tracking
   - Create `benefitService.js` with enrollment
   - Create `documentService.js` with template support

8. **Validation & Business Logic:**
   - Add comprehensive Joi validation schemas
   - Implement business rule checks
   - Add proper error handling

**Standards:** Follow BACKEND_STANDARDS.md

### Task 12.3: Create Controllers (1.5 days)

**Assignee:** Backend Developer 3 & 4

**Actions:**
1. **Core Controllers:**
   - Create `userAccountController.js` (login, register, profile)
   - Create `employeeController.js` (CRUD, search, org chart)
   - Create `contractController.js` (create, renew, view, expiring)
   - Create `leaveController.js` (request, approve, balance, accruals)
   - Create `attendanceController.js` (record, summary, reports)

2. **Advanced Controllers:**
   - Create `ruleEngineController.js` (create, execute, history)
   - Create `performanceController.js` (reviews, goals, feedback)
   - Create `benefitController.js` (plans, enrollment, eligibility)
   - Create `documentController.js` (upload, download, templates)
   - Create `organizationController.js` (departments, locations, positions)

3. **Request/Response Handling:**
   - Implement proper HTTP status codes
   - Add request validation
   - Format responses consistently
   - Handle errors gracefully

**Standards:** Follow BACKEND_STANDARDS.md, API_STANDARDS.md

### Task 12.4: Create Routes (0.5 days)

**Assignee:** Backend Developer 1

**Actions:**
1. Create route files for all modules:
   - `userAccountRoutes.js`
   - `employeeRoutes.js`
   - `contractRoutes.js`
   - `leaveRoutes.js`
   - `attendanceRoutes.js`
   - `ruleEngineRoutes.js`
   - `performanceRoutes.js`
   - `benefitRoutes.js`
   - `documentRoutes.js`
   - `organizationRoutes.js`

2. Set up middleware pipeline (auth, validation, logging)
3. Configure role-based authorization
4. Test all endpoints with Postman
5. Document all routes in API docs

**Standards:** Follow API_STANDARDS.md

### Task 12.5: Integration Events (0.5 days)

**Assignee:** Backend Developer 2

**Actions:**
1. **Event Publishers:**
   - `employee.created` (for Paylinq onboarding)
   - `employee.updated` (for profile changes)
   - `employee.terminated` (for Paylinq payroll stop)
   - `contract.created`
   - `contract.renewed`
   - `leave.approved`
   - `attendance.recorded`

2. **Event Consumers:**
   - `candidate.hired` (from RecruitIQ - create employee + user account)
   - `payroll.processed` (from Paylinq - update employee records)

3. Test event flow end-to-end
4. Document event schemas
5. Monitor event logs for errors

**Standards:** Follow BACKEND_STANDARDS.md

### Task 12.6: Phase 2 Enhancements Documentation (0.5 days)

**Assignee:** Backend Developer 4

**Actions:**
1. Document advanced contract management features:
   - Multi-level approval workflows
   - Digital signature integration
   - Custom contract templates with variable substitution
   - Contract negotiation workflows

2. Document advanced rule engine features:
   - Complex operators (>, <, >=, <=, in, not in, between)
   - Logical operators (AND, OR, NOT) with nested conditions
   - External data source integration
   - Async action execution
   - Rule chaining and dependencies

3. Document enhanced leave management:
   - Complex accrual formulas
   - Leave forecasting and planning
   - Multi-currency leave banks
   - Leave donation programs

4. Document advanced attendance features:
   - Biometric integration
   - GPS-based clock-in
   - Shift scheduling integration
   - Overtime calculation automation

**Output:** `NEXUS_PHASE2_ENHANCEMENTS.md`

### Task 12.7: Write Tests (1.5 days)

**Assignee:** All Developers

**Actions:**
1. **Unit Tests:**
   - Repository layer (all 13 repositories)
   - Service layer (all 10 services)
   - Focus on business logic and edge cases

2. **Integration Tests:**
   - Employee onboarding flow
   - Contract lifecycle (creation → renewal → expiry)
   - Leave request and approval workflow
   - Rule engine execution
   - Attendance recording and summary

3. **Test Coverage:**
   - Achieve 80%+ code coverage
   - Test error scenarios
   - Test validation schemas

4. **Documentation:**
   - Document test scenarios in README_TESTING.md
   - Add example test data

**Standards:** Follow TESTING_STANDARDS.md

---

## 📋 Standards Compliance Checklist

- [ ] Code follows BACKEND_STANDARDS.md layer architecture
- [ ] All queries use custom query wrapper
- [ ] Joi validation for all inputs
- [ ] Tests achieve 90%+ coverage
- [ ] Documentation complete
- [ ] API follows REST conventions
- [ ] Event integration working
- [ ] Error handling comprehensive

---

## 🎯 Success Criteria

Phase 12 is complete when:

1. ✅ All 13 repository files implemented with comprehensive CRUD operations
2. ✅ All 10 service files implemented with business logic and validation
3. ✅ User account management working (separate from employees)
4. ✅ Employee lifecycle management works correctly (onboarding, termination)
5. ✅ Contract management with sequence-based workflows functional (MVP)
6. ✅ Rule engine operational with simple JSON condition evaluation (MVP)
7. ✅ Enhanced leave management with accrual tracking working
8. ✅ Attendance recording and summary calculations functional
9. ✅ Performance review workflows implemented
10. ✅ Benefits enrollment functional
11. ✅ Document management with templates working
12. ✅ All 10 controllers and routes created with proper validation
13. ✅ Integration events working (employee.created, employee.terminated, candidate.hired)
14. ✅ Contract expiry monitoring and auto-renewal working
15. ✅ Organizational chart generation functional
16. ✅ All tests pass (80%+ coverage)
17. ✅ Code review approved
18. ✅ API documented with examples
19. ✅ Phase 2 enhancements documented

---

## 📤 Outputs

### Code Created
- [ ] Product configuration (`product.config.js`) with all 30+ tables
- [ ] **Repository Layer (13 files):**
  - `userAccountRepository.js`, `employeeRepository.js`, `emergencyContactRepository.js`
  - `contractRepository.js` (with sequence policy support)
  - `departmentRepository.js`, `locationRepository.js`, `positionRepository.js`, `jobLevelRepository.js`
  - `leaveRepository.js` (with accrual rules)
  - `attendanceRepository.js`
  - `ruleEngineRepository.js` (JSON-based)
  - `performanceRepository.js`, `benefitRepository.js`, `documentRepository.js`

- [ ] **Service Layer (10 files):**
  - `userAccountService.js` (authentication)
  - `employeeService.js` (lifecycle management, org chart)
  - `contractManagementService.js` (sequence-based workflows)
  - `ruleEngineService.js` (simple condition evaluation)
  - `leaveService.js` (accrual tracking, approvals)
  - `attendanceService.js` (recording, summaries)
  - `performanceService.js`, `benefitService.js`, `documentService.js`
  - `organizationService.js` (departments, locations)

- [ ] **Controller Layer (10+ files):**
  - `userAccountController.js`, `employeeController.js`, `contractController.js`
  - `leaveController.js`, `attendanceController.js`, `ruleEngineController.js`
  - `performanceController.js`, `benefitController.js`, `documentController.js`
  - `organizationController.js`

- [ ] **Route Layer (10+ files):**
  - Route files for all controllers with middleware pipelines

### Tests Created
- [ ] Unit tests for all 13 repositories (80%+ coverage)
- [ ] Unit tests for all 10 services (80%+ coverage)
- [ ] Integration tests for employee lifecycle
- [ ] Integration tests for contract renewal workflows
- [ ] Integration tests for rule engine execution
- [ ] Integration tests for leave management
- [ ] Integration tests for attendance tracking

### Documentation Created
- [ ] API documentation with endpoint examples
- [ ] Integration event schemas
- [ ] `NEXUS_PHASE2_ENHANCEMENTS.md` documenting advanced features
- [ ] Test scenarios documentation

---

## 🔄 Phase 2 Enhancements

**Contract Management Advanced Features:**
- Multi-level approval workflows with configurable routing
- Digital signature integration (DocuSign, Adobe Sign)
- Advanced contract template engine with variable substitution
- Contract negotiation workflows with version tracking
- Bulk contract generation and renewal

**Rule Engine Advanced Features:**
- Complex operators (>, <, >=, <=, in, not in, between, like)
- Logical operators (AND, OR, NOT) with unlimited nesting
- External data source integration (API calls within rules)
- Async action execution with queuing
- Rule chaining and dependencies
- Rule versioning and A/B testing

**Leave Management Advanced Features:**
- Complex accrual formulas with custom JavaScript expressions
- Leave forecasting and balance projections
- Multi-currency leave banks
- Leave donation and sharing programs
- Integration with payroll for leave payment calculations

**Attendance Advanced Features:**
- Biometric device integration
- GPS-based clock-in with geofencing
- Automatic shift scheduling integration
- Overtime calculation automation
- Absence pattern detection with ML

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex contract sequence logic | High | Thorough unit tests; state machine validation |
| Rule engine performance with many rules | High | Rule prioritization; caching; async execution |
| JSON condition parsing complexity | Medium | Use established JSON schema validation; limit MVP operators |
| Accrual calculation edge cases | High | Comprehensive test scenarios; manual verification |
| Organizational hierarchy complexity | Medium | Recursive query optimization; materialized path pattern |
| Integration event failures | High | Retry logic; dead letter queue; monitoring |
| Performance with large employee base | High | Query optimization; indexes; pagination |
| Contract auto-renewal errors | High | Dry-run mode; manual review before activation |
| Rule engine infinite loops | Medium | Execution depth limits; timeout controls |

---

## 🔗 Related Phases

- **Previous:** [Phase 11: Nexus Product - Database](./PHASE_11_NEXUS_DATABASE.md)
- **Next:** [Phase 13: Nexus Product - Testing](./PHASE_13_NEXUS_TESTING.md)
- **Related:** [Phase 9: Paylinq Backend](./PHASE_09_PAYLINQ_BACKEND.md)

---

**Phase Owner:** Backend Team Lead  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start  
**Complexity:** High (Enterprise HRIS with contract management, rule engine, enhanced leave)  
**Approach:** Hybrid MVP - Full database structure with simplified business logic, Phase 2 enhancements documented
