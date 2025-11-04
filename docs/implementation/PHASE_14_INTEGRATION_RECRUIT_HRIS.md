# Phase 14: Cross-Product Integration - RecruitIQ → Nexus HRIS

**Duration:** 2 days  
**Dependencies:** Phases 4, 7, 12  
**Team:** Backend Team (2 developers) + Integration Specialist  
**Status:** Not Started

---

## 📋 Overview

This phase implements the integration flow from RecruitIQ (recruitment) to Nexus (HRIS), enabling seamless employee onboarding when a candidate is hired. This is a critical cross-product workflow that eliminates manual data entry and ensures consistency across systems.

---

## 🎯 Objectives

1. Implement candidate-to-employee conversion workflow
2. Create integration event handlers
3. Map recruitment data to HRIS data structures
4. Handle edge cases and error scenarios
5. Test complete hire-to-onboard flow
6. Document integration process

---

## 📊 Deliverables

### 1. Integration Handler - Candidate Hired

**File:** `backend/src/products/nexus/integrations/candidateHiredHandler.js`

```javascript
/**
 * Candidate Hired Handler
 * Converts hired candidate to employee in HRIS
 */
import logger from '../../../shared/utils/logger.js';
import EmployeeService from '../services/employeeService.js';
import { BusinessRuleError } from '../../../shared/utils/errors.js';

class CandidateHiredHandler {
  constructor(employeeService = null) {
    this.employeeService = employeeService || new EmployeeService();
  }

  /**
   * Handle candidate.hired event
   */
  async handle(eventData) {
    try {
      logger.info('Processing candidate.hired event', {
        candidateId: eventData.candidateId,
        organizationId: eventData.organizationId
      });
      
      // Validate required fields
      this.validateEventData(eventData);
      
      // Check if employee already exists (prevent duplicates)
      const existingEmployee = await this.employeeService.repository.findByEmail(
        eventData.email,
        eventData.organizationId
      );
      
      if (existingEmployee) {
        logger.warn('Employee already exists for candidate', {
          candidateId: eventData.candidateId,
          employeeId: existingEmployee.id
        });
        return {
          success: true,
          message: 'Employee already exists',
          employeeId: existingEmployee.id
        };
      }
      
      // Map candidate data to employee data
      const employeeData = this.mapCandidateToEmployee(eventData);
      
      // Create employee
      const employee = await this.employeeService.createEmployee(
        employeeData,
        eventData.organizationId,
        eventData.hiredBy || eventData.userId
      );
      
      logger.info('Employee created from candidate', {
        candidateId: eventData.candidateId,
        employeeId: employee.id,
        organizationId: eventData.organizationId
      });
      
      return {
        success: true,
        employeeId: employee.id,
        message: 'Employee created successfully'
      };
      
    } catch (error) {
      logger.error('Failed to process candidate.hired event:', error);
      throw error;
    }
  }

  /**
   * Validate event data
   */
  validateEventData(eventData) {
    const required = ['candidateId', 'organizationId', 'firstName', 'lastName', 'email', 'hireDate'];
    const missing = required.filter(field => !eventData[field]);
    
    if (missing.length > 0) {
      throw new BusinessRuleError(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Map candidate data to employee structure
   */
  mapCandidateToEmployee(candidateData) {
    return {
      // Auto-generate employee number (can be overridden)
      employeeNumber: candidateData.employeeNumber || this.generateEmployeeNumber(),
      
      // Personal information
      firstName: candidateData.firstName,
      middleName: candidateData.middleName,
      lastName: candidateData.lastName,
      preferredName: candidateData.preferredName,
      email: candidateData.email,
      personalEmail: candidateData.personalEmail,
      phone: candidateData.phone,
      
      // Employment details
      hireDate: candidateData.hireDate,
      employmentType: candidateData.employmentType || 'full-time',
      jobTitle: candidateData.jobTitle || candidateData.position,
      departmentId: candidateData.departmentId,
      managerId: candidateData.managerId,
      locationId: candidateData.locationId,
      workLocationType: candidateData.workLocationType || 'on-site',
      
      // Personal information
      dateOfBirth: candidateData.dateOfBirth,
      gender: candidateData.gender,
      nationality: candidateData.nationality,
      
      // Contact information
      addressLine1: candidateData.addressLine1,
      addressLine2: candidateData.addressLine2,
      city: candidateData.city,
      state: candidateData.state,
      postalCode: candidateData.postalCode,
      country: candidateData.country,
      
      // Emergency contact
      emergencyContactName: candidateData.emergencyContactName,
      emergencyContactRelationship: candidateData.emergencyContactRelationship,
      emergencyContactPhone: candidateData.emergencyContactPhone,
      
      // Metadata
      sourceSystem: 'recruitiq',
      sourceCandidateId: candidateData.candidateId
    };
  }

  /**
   * Generate employee number
   */
  generateEmployeeNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `EMP${timestamp}${random}`;
  }
}

export default CandidateHiredHandler;
```

### 2. Integration Registration

**File:** `backend/src/products/nexus/integrations/index.js`

```javascript
/**
 * Nexus Integration Setup
 * Register all integration handlers
 */
import { registerIntegration } from '../../core/services/integrationBus.js';
import CandidateHiredHandler from './candidateHiredHandler.js';
import logger from '../../../shared/utils/logger.js';

/**
 * Setup Nexus integrations
 */
export async function setupNexusIntegrations() {
  logger.info('Setting up Nexus HRIS integrations');
  
  // Register candidate.hired handler
  const candidateHiredHandler = new CandidateHiredHandler();
  registerIntegration({
    eventType: 'candidate.hired',
    handler: candidateHiredHandler.handle.bind(candidateHiredHandler),
    product: 'nexus',
    description: 'Create employee from hired candidate'
  });
  
  logger.info('Nexus integrations registered');
}
```

### 3. RecruitIQ - Publish Hire Event

**File:** `backend/src/products/recruitiq/services/candidateService.js` (UPDATE)

```javascript
// Add to existing candidateService.js

/**
 * Mark candidate as hired
 */
async hireCandidate(candidateId, hireData, organizationId, userId) {
  try {
    logger.info('Hiring candidate', { candidateId, organizationId });
    
    // Validate hire data
    const validated = await this.constructor.hireCandidateSchema.validateAsync(hireData);
    
    // Get candidate details
    const candidate = await this.repository.findById(candidateId, organizationId);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }
    
    if (candidate.status === 'hired') {
      throw new BusinessRuleError('Candidate already hired');
    }
    
    // Update candidate status
    const updatedCandidate = await this.repository.update(
      candidateId,
      {
        status: 'hired',
        hireDate: validated.hireDate,
        hiringManager: validated.hiringManager
      },
      organizationId,
      userId
    );
    
    // Publish integration event for HRIS
    await publishEvent('candidate.hired', {
      candidateId: candidate.id,
      organizationId,
      
      // Personal information
      firstName: candidate.first_name,
      middleName: candidate.middle_name,
      lastName: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone,
      
      // Hire details
      hireDate: validated.hireDate,
      jobTitle: validated.jobTitle || candidate.applied_position,
      employmentType: validated.employmentType,
      departmentId: validated.departmentId,
      managerId: validated.managerId,
      locationId: validated.locationId,
      workLocationType: validated.workLocationType,
      
      // Optional fields
      personalEmail: candidate.personal_email,
      dateOfBirth: candidate.date_of_birth,
      addressLine1: candidate.address_line1,
      addressLine2: candidate.address_line2,
      city: candidate.city,
      state: candidate.state,
      postalCode: candidate.postal_code,
      country: candidate.country,
      
      // Metadata
      hiredBy: userId,
      userId
    });
    
    logger.info('Candidate hired and event published', {
      candidateId,
      organizationId
    });
    
    return updatedCandidate;
  } catch (error) {
    if (error.isJoi) {
      throw new ValidationError(error.message);
    }
    logger.error('Failed to hire candidate:', error);
    throw error;
  }
}

// Add validation schema
static get hireCandidateSchema() {
  return Joi.object({
    hireDate: Joi.date().required(),
    jobTitle: Joi.string().required().trim().max(200),
    employmentType: Joi.string().valid('full-time', 'part-time', 'contract', 'intern').required(),
    departmentId: Joi.string().uuid().optional(),
    managerId: Joi.string().uuid().optional(),
    locationId: Joi.string().uuid().optional(),
    workLocationType: Joi.string().valid('on-site', 'remote', 'hybrid').default('on-site'),
    hiringManager: Joi.string().optional()
  }).options({ stripUnknown: true });
}
```

### 4. Integration Tests

**File:** `backend/tests/integration/cross-product/recruitment-to-hris.test.js`

```javascript
/**
 * RecruitIQ → Nexus Integration Tests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../src/server.js';
import { setupTestDatabase, teardownTestDatabase, createTestUser } from '../../helpers/testSetup.js';
import { waitForEvent } from '../../helpers/integrationHelpers.js';

describe('RecruitIQ → Nexus Integration', () => {
  let authToken;
  let organizationId;
  let candidateId;
  
  beforeAll(async () => {
    await setupTestDatabase();
    const { token, user } = await createTestUser({ role: 'admin' });
    authToken = token;
    organizationId = user.organization_id;
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
  });
  
  beforeEach(async () => {
    // Create test candidate
    const candidateResponse = await request(app)
      .post('/api/recruitment/candidates')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-0123',
        appliedPosition: 'Software Engineer'
      });
    
    candidateId = candidateResponse.body.data.id;
  });
  
  describe('Candidate Hire Flow', () => {
    it('should create employee in HRIS when candidate is hired', async () => {
      // Hire candidate
      const hireResponse = await request(app)
        .post(`/api/recruitment/candidates/${candidateId}/hire`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hireDate: '2025-02-01',
          jobTitle: 'Software Engineer',
          employmentType: 'full-time',
          workLocationType: 'hybrid'
        });
      
      expect(hireResponse.status).toBe(200);
      expect(hireResponse.body.data.status).toBe('hired');
      
      // Wait for integration event to process
      await waitForEvent('employee.created', 5000);
      
      // Verify employee created in HRIS
      const employeesResponse = await request(app)
        .get('/api/hris/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ email: 'john.doe@example.com' });
      
      expect(employeesResponse.status).toBe(200);
      expect(employeesResponse.body.data.length).toBe(1);
      
      const employee = employeesResponse.body.data[0];
      expect(employee.first_name).toBe('John');
      expect(employee.last_name).toBe('Doe');
      expect(employee.email).toBe('john.doe@example.com');
      expect(employee.job_title).toBe('Software Engineer');
      expect(employee.employment_type).toBe('full-time');
      expect(employee.employment_status).toBe('active');
    });
    
    it('should not create duplicate employee if already exists', async () => {
      // Hire candidate first time
      await request(app)
        .post(`/api/recruitment/candidates/${candidateId}/hire`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hireDate: '2025-02-01',
          jobTitle: 'Software Engineer',
          employmentType: 'full-time'
        });
      
      await waitForEvent('employee.created', 5000);
      
      // Try to hire same candidate again (edge case)
      const secondHireResponse = await request(app)
        .post(`/api/recruitment/candidates/${candidateId}/hire`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hireDate: '2025-02-01',
          jobTitle: 'Software Engineer',
          employmentType: 'full-time'
        });
      
      // Should return error about already hired
      expect(secondHireResponse.status).toBe(400);
      
      // Verify only one employee exists
      const employeesResponse = await request(app)
        .get('/api/hris/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ email: 'john.doe@example.com' });
      
      expect(employeesResponse.body.data.length).toBe(1);
    });
  });
});
```

---

## 🔍 Detailed Tasks

### Task 14.1: Implement Candidate Hired Handler (0.5 days)

**Assignee:** Backend Developer 1

**Actions:**
1. Create `candidateHiredHandler.js`
2. Implement data mapping logic
3. Add validation and error handling
4. Add duplicate prevention logic

**Standards:** Follow BACKEND_STANDARDS.md

### Task 14.2: Update RecruitIQ Service (0.5 days)

**Assignee:** Backend Developer 2

**Actions:**
1. Add `hireCandidate` method to candidateService
2. Implement event publishing
3. Add validation schema
4. Update routes and controllers

**Standards:** Follow BACKEND_STANDARDS.md

### Task 14.3: Register Integration (0.25 days)

**Assignee:** Integration Specialist

**Actions:**
1. Register handler in integration bus
2. Update server initialization
3. Verify event routing
4. Document integration flow

**Standards:** Follow integration standards

### Task 14.4: Integration Testing (0.5 days)

**Assignee:** QA Engineer + Backend Dev

**Actions:**
1. Create integration tests
2. Test happy path
3. Test error scenarios
4. Test duplicate prevention
5. Verify data accuracy

**Standards:** Follow TESTING_STANDARDS.md

### Task 14.5: Documentation (0.25 days)

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

Phase 14 is complete when:

1. ✅ Candidate hired event published correctly
2. ✅ Employee created automatically in HRIS
3. ✅ Data mapping accurate and complete
4. ✅ Duplicate prevention working
5. ✅ Error handling comprehensive
6. ✅ Integration tests pass
7. ✅ Documentation complete
8. ✅ Code review approved

---

## 📤 Outputs

### Code Created
- [ ] `candidateHiredHandler.js`
- [ ] Updated `candidateService.js` in RecruitIQ
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
| Data mapping errors | High | Comprehensive validation; testing |
| Duplicate employee creation | Medium | Duplicate detection logic |
| Performance with high hiring volume | Medium | Async processing; batch handling |

---

## 🔗 Related Phases

- **Previous:** [Phase 13: Nexus Testing](./PHASE_13_NEXUS_TESTING.md)
- **Next:** [Phase 15: Cross-Product Integration - Nexus to Paylinq](./PHASE_15_INTEGRATION_HRIS_PAYROLL.md)
- **Related:** [Phase 7: Integration Bus](./PHASE_07_INTEGRATION_BUS.md)

---

**Phase Owner:** Integration Team Lead  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start
