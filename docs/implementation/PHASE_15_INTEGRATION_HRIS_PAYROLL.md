# Phase 15: Cross-Product Integration - Nexus → Paylinq

**Duration:** 2 days  
**Dependencies:** Phases 9, 12, 14  
**Team:** Backend Team (2 developers) + Integration Specialist  
**Status:** Not Started

---

## 📋 Overview

This phase implements the integration flow from Nexus HRIS to Paylinq (payroll), enabling automatic payroll record creation when employees are added or updated in HRIS. This ensures payroll data stays synchronized with employee information.

---

## 🎯 Objectives

1. Implement employee-to-payroll synchronization
2. Create integration event handlers
3. Map HRIS data to payroll data structures
4. Handle employee status changes (termination, leave)
5. Test complete HRIS-to-payroll flow
6. Document integration process

---

## 📊 Deliverables

### 1. Integration Handler - Employee Created

**File:** `backend/src/products/paylinq/integrations/employeeCreatedHandler.js`

```javascript
/**
 * Employee Created Handler
 * Creates payroll record when employee is added to HRIS
 */
import logger from '../../../shared/utils/logger.js';
import PayrollService from '../services/payrollService.js';
import { BusinessRuleError } from '../../../shared/utils/errors.js';

class EmployeeCreatedHandler {
  constructor(payrollService = null) {
    this.payrollService = payrollService || new PayrollService();
  }

  /**
   * Handle employee.created event
   */
  async handle(eventData) {
    try {
      logger.info('Processing employee.created event', {
        employeeId: eventData.employeeId,
        organizationId: eventData.organizationId
      });
      
      // Validate required fields
      this.validateEventData(eventData);
      
      // Check if payroll record already exists
      const existing = await this.payrollService.repository.findByEmployeeId(
        eventData.employeeId,
        eventData.organizationId
      );
      
      if (existing) {
        logger.warn('Payroll record already exists for employee', {
          employeeId: eventData.employeeId,
          payrollRecordId: existing.id
        });
        return {
          success: true,
          message: 'Payroll record already exists',
          payrollRecordId: existing.id
        };
      }
      
      // Map employee data to payroll data
      const payrollData = this.mapEmployeeToPayroll(eventData);
      
      // Create payroll employee record
      const payrollRecord = await this.payrollService.createEmployeeRecord(
        payrollData,
        eventData.organizationId,
        eventData.userId || eventData.createdBy
      );
      
      logger.info('Payroll record created from employee', {
        employeeId: eventData.employeeId,
        payrollRecordId: payrollRecord.id,
        organizationId: eventData.organizationId
      });
      
      return {
        success: true,
        payrollRecordId: payrollRecord.id,
        message: 'Payroll record created successfully'
      };
      
    } catch (error) {
      logger.error('Failed to process employee.created event:', error);
      throw error;
    }
  }

  /**
   * Validate event data
   */
  validateEventData(eventData) {
    const required = ['employeeId', 'organizationId', 'employeeNumber', 'email', 'hireDate'];
    const missing = required.filter(field => !eventData[field]);
    
    if (missing.length > 0) {
      throw new BusinessRuleError(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Map employee data to payroll structure
   */
  mapEmployeeToPayroll(employeeData) {
    // Determine pay frequency based on employment type
    let payFrequency = 'bi-weekly'; // Default
    if (employeeData.employmentType === 'contract') {
      payFrequency = 'monthly';
    }
    
    return {
      employeeId: employeeData.employeeId,
      employeeNumber: employeeData.employeeNumber,
      payFrequency,
      paymentMethod: 'direct_deposit', // Default, can be updated later
      currency: 'USD',
      startDate: employeeData.hireDate,
      
      // Metadata
      sourceSystem: 'nexus',
      sourceEmployeeId: employeeData.employeeId
    };
  }
}

export default EmployeeCreatedHandler;
```

### 2. Integration Handler - Employee Updated

**File:** `backend/src/products/paylinq/integrations/employeeUpdatedHandler.js`

```javascript
/**
 * Employee Updated Handler
 * Updates payroll record when employee is updated in HRIS
 */
import logger from '../../../shared/utils/logger.js';
import PayrollService from '../services/payrollService.js';
import { NotFoundError } from '../../../shared/utils/errors.js';

class EmployeeUpdatedHandler {
  constructor(payrollService = null) {
    this.payrollService = payrollService || new PayrollService();
  }

  /**
   * Handle employee.updated event
   */
  async handle(eventData) {
    try {
      logger.info('Processing employee.updated event', {
        employeeId: eventData.employeeId,
        organizationId: eventData.organizationId,
        changes: eventData.changes
      });
      
      // Find payroll record
      const payrollRecord = await this.payrollService.repository.findByEmployeeId(
        eventData.employeeId,
        eventData.organizationId
      );
      
      if (!payrollRecord) {
        logger.warn('Payroll record not found for employee', {
          employeeId: eventData.employeeId
        });
        // Could create record here if auto-creation is desired
        return {
          success: false,
          message: 'Payroll record not found'
        };
      }
      
      // Determine what needs to be updated
      const updates = this.determinePayrollUpdates(eventData.changes);
      
      if (Object.keys(updates).length === 0) {
        logger.info('No payroll updates needed');
        return {
          success: true,
          message: 'No payroll updates needed'
        };
      }
      
      // Update payroll record
      const updated = await this.payrollService.repository.updateEmployee(
        payrollRecord.id,
        updates,
        eventData.organizationId,
        eventData.userId || eventData.updatedBy
      );
      
      logger.info('Payroll record updated from employee', {
        employeeId: eventData.employeeId,
        payrollRecordId: payrollRecord.id,
        updates
      });
      
      return {
        success: true,
        payrollRecordId: updated.id,
        message: 'Payroll record updated successfully'
      };
      
    } catch (error) {
      logger.error('Failed to process employee.updated event:', error);
      throw error;
    }
  }

  /**
   * Determine which payroll fields need updating based on HRIS changes
   */
  determinePayrollUpdates(changes) {
    const updates = {};
    
    // Employee number changed
    if (changes.employeeNumber) {
      updates.employeeNumber = changes.employeeNumber;
    }
    
    // Employment type changed (affects pay frequency)
    if (changes.employmentType) {
      if (changes.employmentType === 'contract') {
        updates.payFrequency = 'monthly';
      } else {
        updates.payFrequency = 'bi-weekly';
      }
    }
    
    return updates;
  }
}

export default EmployeeUpdatedHandler;
```

### 3. Integration Handler - Employee Terminated

**File:** `backend/src/products/paylinq/integrations/employeeTerminatedHandler.js`

```javascript
/**
 * Employee Terminated Handler
 * Handles employee termination in payroll
 */
import logger from '../../../shared/utils/logger.js';
import PayrollService from '../services/payrollService.js';

class EmployeeTerminatedHandler {
  constructor(payrollService = null) {
    this.payrollService = payrollService || new PayrollService();
  }

  /**
   * Handle employee.terminated event
   */
  async handle(eventData) {
    try {
      logger.info('Processing employee.terminated event', {
        employeeId: eventData.employeeId,
        organizationId: eventData.organizationId,
        terminationDate: eventData.terminationDate
      });
      
      // Find payroll record
      const payrollRecord = await this.payrollService.repository.findByEmployeeId(
        eventData.employeeId,
        eventData.organizationId
      );
      
      if (!payrollRecord) {
        logger.warn('Payroll record not found for terminated employee', {
          employeeId: eventData.employeeId
        });
        return {
          success: false,
          message: 'Payroll record not found'
        };
      }
      
      // Update payroll record status
      const updated = await this.payrollService.repository.updateEmployee(
        payrollRecord.id,
        {
          status: 'terminated',
          terminationDate: eventData.terminationDate
        },
        eventData.organizationId,
        eventData.userId
      );
      
      // Process final payroll if needed
      await this.processFinalPayroll(payrollRecord, eventData);
      
      logger.info('Payroll record marked as terminated', {
        employeeId: eventData.employeeId,
        payrollRecordId: payrollRecord.id
      });
      
      return {
        success: true,
        payrollRecordId: updated.id,
        message: 'Payroll record terminated successfully'
      };
      
    } catch (error) {
      logger.error('Failed to process employee.terminated event:', error);
      throw error;
    }
  }

  /**
   * Process final payroll for terminated employee
   */
  async processFinalPayroll(payrollRecord, eventData) {
    // Calculate pro-rated pay up to termination date
    // This would include:
    // - Unpaid hours/days
    // - Accrued vacation payout
    // - Final benefits deductions
    // - Final tax calculations
    
    logger.info('Final payroll processing for terminated employee', {
      payrollRecordId: payrollRecord.id,
      terminationDate: eventData.terminationDate
    });
    
    // Implementation would go here
    // For now, just log the intent
  }
}

export default EmployeeTerminatedHandler;
```

### 4. Integration Registration

**File:** `backend/src/products/paylinq/integrations/index.js`

```javascript
/**
 * Paylinq Integration Setup
 * Register all integration handlers
 */
import { registerIntegration } from '../../core/services/integrationBus.js';
import EmployeeCreatedHandler from './employeeCreatedHandler.js';
import EmployeeUpdatedHandler from './employeeUpdatedHandler.js';
import EmployeeTerminatedHandler from './employeeTerminatedHandler.js';
import logger from '../../../shared/utils/logger.js';

/**
 * Setup Paylinq integrations
 */
export async function setupPaylinqIntegrations() {
  logger.info('Setting up Paylinq payroll integrations');
  
  // Register employee.created handler
  const employeeCreatedHandler = new EmployeeCreatedHandler();
  registerIntegration({
    eventType: 'employee.created',
    handler: employeeCreatedHandler.handle.bind(employeeCreatedHandler),
    product: 'paylinq',
    description: 'Create payroll record from employee'
  });
  
  // Register employee.updated handler
  const employeeUpdatedHandler = new EmployeeUpdatedHandler();
  registerIntegration({
    eventType: 'employee.updated',
    handler: employeeUpdatedHandler.handle.bind(employeeUpdatedHandler),
    product: 'paylinq',
    description: 'Update payroll record from employee changes'
  });
  
  // Register employee.terminated handler
  const employeeTerminatedHandler = new EmployeeTerminatedHandler();
  registerIntegration({
    eventType: 'employee.terminated',
    handler: employeeTerminatedHandler.handle.bind(employeeTerminatedHandler),
    product: 'paylinq',
    description: 'Handle employee termination in payroll'
  });
  
  logger.info('Paylinq integrations registered');
}
```

### 5. Integration Tests

**File:** `backend/tests/integration/cross-product/hris-to-payroll.test.js`

```javascript
/**
 * Nexus → Paylinq Integration Tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../src/server.js';
import { setupTestDatabase, teardownTestDatabase, createTestUser } from '../../helpers/testSetup.js';
import { waitForEvent } from '../../helpers/integrationHelpers.js';

describe('Nexus → Paylinq Integration', () => {
  let authToken;
  let organizationId;
  let employeeId;
  
  beforeAll(async () => {
    await setupTestDatabase();
    const { token, user } = await createTestUser({ role: 'admin' });
    authToken = token;
    organizationId = user.organization_id;
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });
  
  describe('Employee to Payroll Flow', () => {
    it('should create payroll record when employee is created', async () => {
      // Create employee in HRIS
      const employeeResponse = await request(app)
        .post('/api/hris/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeNumber: 'EMP001',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          hireDate: '2025-02-01',
          employmentType: 'full-time',
          jobTitle: 'Product Manager'
        });
      
      expect(employeeResponse.status).toBe(201);
      employeeId = employeeResponse.body.data.id;
      
      // Wait for integration event to process
      await waitForEvent('payroll.record.created', 5000);
      
      // Verify payroll record created
      const payrollResponse = await request(app)
        .get('/api/payroll/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ employeeId });
      
      expect(payrollResponse.status).toBe(200);
      expect(payrollResponse.body.data.length).toBe(1);
      
      const payrollRecord = payrollResponse.body.data[0];
      expect(payrollRecord.employee_number).toBe('EMP001');
      expect(payrollRecord.pay_frequency).toBe('bi-weekly');
      expect(payrollRecord.status).toBe('active');
    });
    
    it('should update payroll record when employee is updated', async () => {
      // Create employee first
      const employeeResponse = await request(app)
        .post('/api/hris/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeNumber: 'EMP002',
          firstName: 'Bob',
          lastName: 'Johnson',
          email: 'bob.johnson@example.com',
          hireDate: '2025-02-01',
          employmentType: 'full-time',
          jobTitle: 'Engineer'
        });
      
      const employeeId = employeeResponse.body.data.id;
      await waitForEvent('payroll.record.created', 5000);
      
      // Update employee to contract (should change pay frequency)
      const updateResponse = await request(app)
        .put(`/api/hris/employees/${employeeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employmentType: 'contract'
        });
      
      expect(updateResponse.status).toBe(200);
      await waitForEvent('payroll.record.updated', 5000);
      
      // Verify payroll record updated
      const payrollResponse = await request(app)
        .get('/api/payroll/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ employeeId });
      
      const payrollRecord = payrollResponse.body.data[0];
      expect(payrollRecord.pay_frequency).toBe('monthly');
    });
    
    it('should handle employee termination in payroll', async () => {
      // Create employee first
      const employeeResponse = await request(app)
        .post('/api/hris/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          employeeNumber: 'EMP003',
          firstName: 'Alice',
          lastName: 'Williams',
          email: 'alice.williams@example.com',
          hireDate: '2025-01-01',
          employmentType: 'full-time',
          jobTitle: 'Designer'
        });
      
      const employeeId = employeeResponse.body.data.id;
      await waitForEvent('payroll.record.created', 5000);
      
      // Terminate employee
      const terminateResponse = await request(app)
        .put(`/api/hris/employees/${employeeId}/terminate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          terminationDate: '2025-03-31',
          reason: 'Resignation'
        });
      
      expect(terminateResponse.status).toBe(200);
      await waitForEvent('payroll.record.terminated', 5000);
      
      // Verify payroll record terminated
      const payrollResponse = await request(app)
        .get('/api/payroll/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ employeeId });
      
      const payrollRecord = payrollResponse.body.data[0];
      expect(payrollRecord.status).toBe('terminated');
    });
  });
});
```

---

## 🔍 Detailed Tasks

### Task 15.1: Implement Employee Created Handler (0.5 days)

**Assignee:** Backend Developer 1

**Actions:**
1. Create `employeeCreatedHandler.js`
2. Implement data mapping logic
3. Add validation and duplicate prevention
4. Test handler

**Standards:** Follow BACKEND_STANDARDS.md

### Task 15.2: Implement Employee Updated/Terminated Handlers (0.5 days)

**Assignee:** Backend Developer 2

**Actions:**
1. Create `employeeUpdatedHandler.js`
2. Create `employeeTerminatedHandler.js`
3. Implement update logic
4. Implement final payroll logic

**Standards:** Follow BACKEND_STANDARDS.md

### Task 15.3: Register Integrations (0.25 days)

**Assignee:** Integration Specialist

**Actions:**
1. Register all handlers in integration bus
2. Update server initialization
3. Verify event routing
4. Document integration flow

**Standards:** Follow integration standards

### Task 15.4: Integration Testing (0.5 days)

**Assignee:** QA Engineer + Backend Dev

**Actions:**
1. Create integration tests
2. Test all event types
3. Test error scenarios
4. Verify data synchronization

**Standards:** Follow TESTING_STANDARDS.md

### Task 15.5: Documentation (0.25 days)

**Assignee:** Technical Writer

**Actions:**
1. Document integration flow
2. Create sequence diagrams
3. Document data mapping
4. Document error scenarios

**Standards:** Follow DOCUMENTATION_STANDARDS.md

---

## 📋 Standards Compliance Checklist

- [ ] Event handlers follow integration bus pattern
- [ ] All data validated before processing
- [ ] Error handling comprehensive
- [ ] Duplicate prevention implemented
- [ ] Tests achieve 90%+ coverage
- [ ] Integration documented
- [ ] Code review approved

---

## 🎯 Success Criteria

Phase 15 is complete when:

1. ✅ Employee created event creates payroll record
2. ✅ Employee updated event updates payroll record
3. ✅ Employee terminated event updates payroll status
4. ✅ Data mapping accurate and complete
5. ✅ Error handling comprehensive
6. ✅ Integration tests pass
7. ✅ Documentation complete
8. ✅ Code review approved

---

## 📤 Outputs

### Code Created
- [ ] `employeeCreatedHandler.js`
- [ ] `employeeUpdatedHandler.js`
- [ ] `employeeTerminatedHandler.js`
- [ ] Integration registration code
- [ ] Integration tests

### Documentation Created
- [ ] Integration flow diagram
- [ ] Data mapping documentation
- [ ] Error handling documentation

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Event delivery failure | High | Retry logic; error queues; monitoring |
| Data synchronization issues | High | Comprehensive validation; reconciliation |
| Final payroll calculation errors | Critical | Thorough testing; manual review process |
| Performance with many employees | Medium | Async processing; batch handling |

---

## 🔗 Related Phases

- **Previous:** [Phase 14: RecruitIQ to Nexus Integration](./PHASE_14_INTEGRATION_RECRUIT_HRIS.md)
- **Next:** [Phase 16: Frontend - Shared UI Library](./PHASE_16_FRONTEND_SHARED_UI.md)
- **Related:** [Phase 7: Integration Bus](./PHASE_07_INTEGRATION_BUS.md)

---

**Phase Owner:** Integration Team Lead  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start
