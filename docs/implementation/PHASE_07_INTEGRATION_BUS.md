# Phase 7: Integration Bus Infrastructure

**Duration:** 2 days  
**Dependencies:** Phase 5, Phase 6  
**Team:** Backend Team (2 developers)  
**Status:** Not Started

---

## 📋 Overview

This phase implements the integration bus system that enables cross-product communication and data synchronization. The integration bus uses an event-driven architecture to allow products to communicate without tight coupling.

Key capabilities:
- Event publishing and subscription
- Cross-product webhooks
- Data transformation and mapping
- Integration state management

---

## 🎯 Objectives

1. Implement event-driven integration bus
2. Create event registration and handling system
3. Implement cross-product event publishing
4. Create integration mapping tables
5. Add integration logging and monitoring
6. Enable product-to-product data synchronization

---

## 📊 Deliverables

### 1. Integration Bus Core

**File:** `backend/src/shared/integrations/integrationBus.js`

```javascript
/**
 * Integration Bus
 * Event-driven cross-product communication system
 */
import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

class IntegrationBus extends EventEmitter {
  constructor() {
    super();
    this.integrations = new Map();
    this.eventHandlers = new Map();
  }

  /**
   * Register an integration between two products
   */
  registerIntegration(sourceProduct, targetProduct, config) {
    const integrationId = `${sourceProduct}:${targetProduct}`;
    
    this.integrations.set(integrationId, {
      id: integrationId,
      source: sourceProduct,
      target: targetProduct,
      webhooks: config.webhooks || [],
      syncData: config.syncData || [],
      enabled: config.enabled !== false,
      createdAt: new Date()
    });
    
    logger.info(`🔗 Registered integration: ${integrationId}`);
    
    // Register event handlers for webhooks
    if (config.webhooks) {
      for (const webhook of config.webhooks) {
        this.registerEventHandler(sourceProduct, targetProduct, webhook);
      }
    }
  }

  /**
   * Register an event handler
   */
  registerEventHandler(sourceProduct, targetProduct, eventName) {
    const eventKey = `${sourceProduct}:${targetProduct}:${eventName}`;
    
    if (!this.eventHandlers.has(eventKey)) {
      this.eventHandlers.set(eventKey, true);
      logger.info(`📝 Registered event handler: ${eventKey}`);
    }
  }

  /**
   * Publish an event
   */
  async publishEvent(sourceProduct, eventName, data, organizationId, db) {
    try {
      const eventKey = `${sourceProduct}:${eventName}`;
      
      logger.info(`📤 Publishing event: ${eventKey}`, {
        organizationId,
        dataKeys: Object.keys(data)
      });
      
      // Store event in database
      await this.storeEvent(sourceProduct, eventName, data, organizationId, db);
      
      // Emit event to all registered handlers
      this.emit(eventKey, {
        sourceProduct,
        eventName,
        data,
        organizationId,
        db,
        timestamp: new Date()
      });
      
      // Find target integrations
      const targetIntegrations = this.findTargetIntegrations(sourceProduct, eventName);
      
      for (const integration of targetIntegrations) {
        const targetEventKey = `${sourceProduct}:${integration.target}:${eventName}`;
        
        this.emit(targetEventKey, {
          sourceProduct,
          targetProduct: integration.target,
          eventName,
          data,
          organizationId,
          db,
          timestamp: new Date()
        });
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to publish event:', error);
      throw error;
    }
  }

  /**
   * Find target integrations for an event
   */
  findTargetIntegrations(sourceProduct, eventName) {
    const results = [];
    
    for (const [integrationId, integration] of this.integrations) {
      if (integration.source === sourceProduct && 
          integration.enabled &&
          integration.webhooks.includes(eventName)) {
        results.push(integration);
      }
    }
    
    return results;
  }

  /**
   * Store event in database
   */
  async storeEvent(sourceProduct, eventName, data, organizationId, db) {
    try {
      await db.query(
        `INSERT INTO integrations.events 
        (organization_id, source_product, event_name, event_data, created_at)
        VALUES ($1, $2, $3, $4, NOW())`,
        [organizationId, sourceProduct, eventName, JSON.stringify(data)]
      );
    } catch (error) {
      logger.error('Failed to store event:', error);
      // Don't throw - event storage failure shouldn't break event publishing
    }
  }

  /**
   * Get integration status
   */
  getIntegration(sourceProduct, targetProduct) {
    const integrationId = `${sourceProduct}:${targetProduct}`;
    return this.integrations.get(integrationId);
  }

  /**
   * Get all integrations
   */
  getAllIntegrations() {
    return Array.from(this.integrations.values());
  }

  /**
   * Enable/disable integration
   */
  setIntegrationEnabled(sourceProduct, targetProduct, enabled) {
    const integrationId = `${sourceProduct}:${targetProduct}`;
    const integration = this.integrations.get(integrationId);
    
    if (integration) {
      integration.enabled = enabled;
      logger.info(`${enabled ? '✅' : '⏸️'} Integration ${integrationId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }
}

export default new IntegrationBus();
```

### 2. Integration Handlers

**File:** `backend/src/shared/integrations/handlers/candidateToEmployee.js`

```javascript
/**
 * Candidate to Employee Integration Handler
 * Converts hired candidates to employee records in HRIS
 */
import logger from '../../utils/logger.js';

/**
 * Handle candidate.hired event
 * Convert candidate to employee in HRIS product
 */
export async function handleCandidateHired(eventData) {
  const { organizationId, data, db } = eventData;
  
  try {
    logger.info('🔄 Converting candidate to employee', {
      candidateId: data.candidate.id,
      organizationId
    });
    
    // Check if organization has HRIS product
    const hasHRIS = await db.query(
      `SELECT 1 FROM core.product_subscriptions 
      WHERE organization_id = $1 AND product_id = 'nexus' AND status = 'active'`,
      [organizationId]
    );
    
    if (hasHRIS.rowCount === 0) {
      logger.info('Organization does not have HRIS product, skipping conversion');
      return null;
    }
    
    // Create employee record
    const employee = await createEmployee(data.candidate, organizationId, db);
    
    // Store mapping
    await db.query(
      `INSERT INTO integrations.candidate_employee_map 
      (organization_id, candidate_id, employee_id, converted_by, converted_at)
      VALUES ($1, $2, $3, $4, NOW())`,
      [organizationId, data.candidate.id, employee.id, data.hiredBy]
    );
    
    logger.info(`✅ Converted candidate ${data.candidate.id} to employee ${employee.id}`);
    
    return employee;
  } catch (error) {
    logger.error('Failed to convert candidate to employee:', error);
    throw error;
  }
}

/**
 * Create employee record from candidate data
 */
async function createEmployee(candidate, organizationId, db) {
  const result = await db.query(
    `INSERT INTO hris.employees 
    (organization_id, first_name, last_name, email, phone, hire_date, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *`,
    [
      organizationId,
      candidate.firstName,
      candidate.lastName,
      candidate.email,
      candidate.phone,
      new Date(),
      'active'
    ]
  );
  
  return result.rows[0];
}
```

### 3. Integration Setup

**File:** `backend/src/shared/integrations/setupIntegrations.js`

```javascript
/**
 * Integration Setup
 * Configures all cross-product integrations
 */
import integrationBus from './integrationBus.js';
import { handleCandidateHired } from './handlers/candidateToEmployee.js';
import logger from '../utils/logger.js';

export async function setupIntegrations() {
  try {
    logger.info('🔧 Setting up product integrations...');
    
    // ========================================
    // RecruitIQ → Nexus (HRIS) Integration
    // ========================================
    integrationBus.registerIntegration('recruitiq', 'nexus', {
      webhooks: ['candidate.hired'],
      syncData: ['candidates'],
      enabled: true
    });
    
    integrationBus.on('recruitiq:nexus:candidate.hired', async (eventData) => {
      await handleCandidateHired(eventData);
    });
    
    // ========================================
    // Nexus → Paylinq Integration
    // ========================================
    integrationBus.registerIntegration('nexus', 'paylinq', {
      webhooks: ['employee.created', 'employee.updated', 'employee.terminated'],
      syncData: ['employees', 'compensation'],
      enabled: true
    });
    
    integrationBus.on('nexus:paylinq:employee.created', async (eventData) => {
      // Handler to create payroll record
      logger.info('Creating payroll record for new employee');
    });
    
    // ========================================
    // RecruitIQ → Paylinq Integration (direct)
    // ========================================
    integrationBus.registerIntegration('recruitiq', 'paylinq', {
      webhooks: ['candidate.hired'],
      enabled: true
    });
    
    logger.info('✅ Product integrations configured');
    logger.info(`Total integrations: ${integrationBus.getAllIntegrations().length}`);
  } catch (error) {
    logger.error('Failed to setup integrations:', error);
    throw error;
  }
}
```

---

## 🔍 Detailed Tasks

### Task 7.1: Implement Integration Bus Core (0.5 days)

**Assignee:** Senior Backend Developer

**Actions:**
1. ✅ Create `integrationBus.js` with EventEmitter
2. ✅ Implement `registerIntegration()` method
3. ✅ Implement `publishEvent()` method
4. ✅ Implement event storage
5. ✅ Add integration status management
6. ✅ Add comprehensive logging

**Standards:** Follow BACKEND_STANDARDS.md

### Task 7.2: Create Database Tables for Integrations (0.5 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Create migration for `integrations.events` table
2. ✅ Create migration for `integrations.candidate_employee_map` table
3. ✅ Create migration for `integrations.employee_payroll_map` table
4. ✅ Add indexes for performance
5. ✅ Run migrations

**SQL:**
```sql
-- Create integrations schema
CREATE SCHEMA IF NOT EXISTS integrations;

-- Events table
CREATE TABLE integrations.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  source_product VARCHAR(50) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

CREATE INDEX idx_events_org_product ON integrations.events(organization_id, source_product);
CREATE INDEX idx_events_created ON integrations.events(created_at DESC);

-- Candidate to Employee mapping
CREATE TABLE integrations.candidate_employee_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  candidate_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  converted_by UUID REFERENCES core.users(id),
  converted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_candidate_employee_map_org ON integrations.candidate_employee_map(organization_id);
CREATE INDEX idx_candidate_employee_map_candidate ON integrations.candidate_employee_map(candidate_id);

-- Employee to Payroll mapping
CREATE TABLE integrations.employee_payroll_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id),
  employee_id UUID NOT NULL,
  payroll_record_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_payroll_map_org ON integrations.employee_payroll_map(organization_id);
```

**Standards:** Follow DATABASE_STANDARDS.md

### Task 7.3: Create Integration Handlers (0.5 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Create `candidateToEmployee.js` handler
2. ✅ Implement candidate data transformation
3. ✅ Create employee record in HRIS schema
4. ✅ Store integration mapping
5. ✅ Add error handling and rollback

**Standards:** Follow BACKEND_STANDARDS.md

### Task 7.4: Create Integration Setup (0.25 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Create `setupIntegrations.js`
2. ✅ Register all product integrations
3. ✅ Wire up event handlers
4. ✅ Add configuration options
5. ✅ Call from server.js startup

**Standards:** Follow BACKEND_STANDARDS.md

### Task 7.5: Add Integration API Endpoints (0.25 days)

**Assignee:** Backend Developer

**Actions:**
1. ✅ Create `/api/integrations/status` endpoint
2. ✅ Create `/api/integrations/events` endpoint (list)
3. ✅ Create `/api/integrations/:source/:target/enable` endpoint
4. ✅ Add authentication and authorization
5. ✅ Document API endpoints

**Standards:** Follow API_STANDARDS.md

### Task 7.6: Write Comprehensive Tests (0.5 days)

**Assignee:** QA + Backend Developer

**Actions:**
1. ✅ Unit tests for integrationBus
2. ✅ Unit tests for handlers
3. ✅ Integration tests for event flow
4. ✅ Test candidate-to-employee conversion
5. ✅ Test event storage
6. ✅ Achieve 85%+ coverage

**Standards:** Follow TESTING_STANDARDS.md

---

## 📋 Standards Compliance Checklist

- [ ] Code follows BACKEND_STANDARDS.md patterns
- [ ] Database tables follow DATABASE_STANDARDS.md
- [ ] Security requirements from SECURITY_STANDARDS.md are met
- [ ] Tests written per TESTING_STANDARDS.md (85%+ coverage)
- [ ] Documentation follows DOCUMENTATION_STANDARDS.md
- [ ] API endpoints follow API_STANDARDS.md
- [ ] Event handling is idempotent

---

## 🎯 Success Criteria

Phase 7 is complete when:

1. ✅ Integration bus can register integrations
2. ✅ Events can be published and handled
3. ✅ Candidate-to-employee conversion works
4. ✅ Integration tables created in database
5. ✅ Event storage works correctly
6. ✅ All tests pass with 85%+ coverage
7. ✅ API endpoints for integration management work
8. ✅ Integration status can be enabled/disabled
9. ✅ Code review approved by 2+ engineers
10. ✅ Documentation complete

---

## 📤 Outputs

### Code Created
- [ ] `backend/src/shared/integrations/integrationBus.js`
- [ ] `backend/src/shared/integrations/handlers/candidateToEmployee.js`
- [ ] `backend/src/shared/integrations/setupIntegrations.js`
- [ ] Integration API routes

### Database Created
- [ ] `integrations` schema
- [ ] `integrations.events` table
- [ ] `integrations.candidate_employee_map` table
- [ ] `integrations.employee_payroll_map` table

### Tests Created
- [ ] Unit tests (85%+ coverage)
- [ ] Integration tests
- [ ] End-to-end integration flow tests

### Documentation Created
- [ ] Integration bus architecture
- [ ] Event schema documentation
- [ ] Integration handler guide

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Event loss during failures | High | Persistent event storage; retry mechanism |
| Circular dependencies between products | Medium | Clear integration direction; validation |
| Performance impact from events | Medium | Async processing; event batching |
| Data consistency across products | High | Transactions; idempotent handlers |
| Integration handler errors | Medium | Comprehensive error handling; dead letter queue |

---

## 🔗 Related Phases

- **Previous:** [Phase 6: Server.js Dynamic Routing](./PHASE_06_DYNAMIC_ROUTING.md)
- **Next:** [Phase 8: Paylinq Product - Database](./PHASE_08_PAYLINQ_DATABASE.md)
- **Related:** [Phase 5: Product Loader & Access Control](./PHASE_05_PRODUCT_LOADER.md)

---

## ⏭️ Next Phase

**[Phase 8: Paylinq Product - Database](./PHASE_08_PAYLINQ_DATABASE.md)**

Upon completion of Phase 7, proceed to Phase 8 to begin building the Paylinq payroll product, starting with database schema design.

---

**Phase Owner:** Backend Team Lead  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start
