# VPS Integration Implementation Plan

**Status:** Starting Implementation  
**Date:** November 21, 2025  
**Branch:** test/fix-all-failing-tests

---

## Overview

Implement a complete VPS integration system following RecruitIQ coding standards for managing deployment infrastructure through the Contabo API.

---

## Architecture

### Layer Structure (MANDATORY)

```
Routes → Controllers → Services → Repositories → External API (Contabo)
```

**Each layer has ONE responsibility:**
- **Routes** - Define endpoints, apply middleware
- **Controllers** - Parse req/res, call services, return HTTP responses
- **Services** - Business logic, validation, orchestration
- **Repositories** - External API calls (Contabo API)

---

## Implementation Components

### 1. VPS Repository (Data Access Layer)

**Location:** `deployment-service/src/repositories/VPSRepository.js`

**Responsibilities:**
- Direct Contabo API calls
- HTTP request/response handling
- API authentication
- Rate limiting handling
- Error translation

**Key Methods:**
```javascript
- listInstances()
- getInstance(instanceId)
- createInstance(config)
- deleteInstance(instanceId)
- getInstanceStatus(instanceId)
- executeCommand(instanceId, command)
- getSnapshots(instanceId)
- createSnapshot(instanceId, name)
```

### 2. VPS Service (Business Logic Layer)

**Location:** `deployment-service/src/services/VPSService.js`

**Responsibilities:**
- Business logic and orchestration
- Input validation (Joi schemas)
- State management
- Retry logic
- Cost tracking
- Resource optimization

**Key Methods:**
```javascript
- provisionVPS(config)
- deprovisionVPS(instanceId)
- getVPSStatus(instanceId)
- waitForVPSReady(instanceId, maxWaitTime)
- healthCheck(instanceId)
- createBackup(instanceId)
- restoreFromBackup(instanceId, snapshotId)
```

### 3. VPS Controller (HTTP Layer)

**Location:** `deployment-service/src/controllers/vpsController.js`

**Responsibilities:**
- HTTP request/response handling
- Route parameter extraction
- Service method invocation
- Response formatting

**Endpoints:**
```javascript
GET    /api/vps/instances           - List all VPS instances
GET    /api/vps/instances/:id       - Get specific instance
POST   /api/vps/instances           - Create new instance
DELETE /api/vps/instances/:id       - Delete instance
GET    /api/vps/instances/:id/status - Get instance status
POST   /api/vps/instances/:id/health - Run health check
```

### 4. Routes (Endpoint Definitions)

**Location:** `deployment-service/src/routes/vps.js`

**Responsibilities:**
- Route definitions
- Middleware application
- Controller method binding

---

## Implementation Standards

### 1. ES Modules (MANDATORY)

```javascript
// ✅ CORRECT: ES modules with .js extensions
import VPSService from '../services/VPSService.js';
import { ValidationError } from '../utils/errors.js';

// ❌ WRONG: CommonJS
const VPSService = require('../services/VPSService');
```

### 2. Dependency Injection (MANDATORY)

```javascript
// ✅ CORRECT: Service with DI
class VPSService {
  constructor(repository = null) {
    this.repository = repository || new VPSRepository();
  }
}
export default VPSService;

// ❌ WRONG: Hard-coded dependency
class VPSService {
  constructor() {
    this.repository = new VPSRepository(); // Not testable
  }
}
```

### 3. Validation (MANDATORY)

```javascript
// ✅ CORRECT: Joi validation
class VPSService {
  static createSchema = Joi.object({
    region: Joi.string().valid('EU', 'US-central', 'US-east', 'US-west').required(),
    productId: Joi.string().required(),
    imageId: Joi.string().required(),
    sshKeys: Joi.array().items(Joi.number()).min(1).required()
  });

  async provisionVPS(config) {
    // ALWAYS validate FIRST
    const validated = await VPSService.createSchema.validateAsync(config);
    // ... business logic
  }
}
```

### 4. Error Handling (MANDATORY)

```javascript
// ✅ CORRECT: Proper error handling
class VPSService {
  async provisionVPS(config) {
    try {
      const validated = await this.constructor.createSchema.validateAsync(config);
      const instance = await this.repository.createInstance(validated);
      
      logger.info('VPS provisioned', {
        instanceId: instance.instanceId,
        region: validated.region
      });
      
      return instance;
    } catch (error) {
      logger.error('VPS provisioning failed', {
        error: error.message,
        config
      });
      throw error;
    }
  }
}
```

---

## Testing Requirements

### Unit Tests (90% coverage target)

**Location:** `deployment-service/tests/unit/services/VPSService.test.js`

**Requirements:**
- Test with mock repository (DI pattern)
- Test success cases
- Test error cases
- Test validation
- Test edge cases
- Follow AAA pattern (Arrange, Act, Assert)

### Integration Tests

**Location:** `deployment-service/tests/integration/vps-api.test.js`

**Requirements:**
- Test full request-response cycle
- Test with real API (or mock server)
- Test authentication
- Test rate limiting
- Test error responses

---

## Security Considerations

### 1. Secrets Management

```javascript
// ✅ CORRECT: Use environment variables
const API_USER = process.env.CONTABO_API_USER;
const API_PASSWORD = process.env.CONTABO_API_PASSWORD;

// ❌ WRONG: Hard-coded credentials
const API_USER = 'my-user@example.com';
```

### 2. Input Validation

```javascript
// ✅ CORRECT: Validate all inputs
const validated = await schema.validateAsync(data);

// ❌ WRONG: Trust user input
const instance = await repository.createInstance(req.body);
```

### 3. Sensitive Data Logging

```javascript
// ✅ CORRECT: Redact sensitive data
logger.info('Creating VPS', {
  region: config.region,
  apiUser: '[REDACTED]'
});

// ❌ WRONG: Log credentials
logger.info('Creating VPS', { apiUser, apiPassword });
```

---

## Implementation Phases

### Phase 1: Repository Layer ✅
- [x] Create VPSRepository class
- [x] Implement Contabo API client
- [x] Add authentication
- [x] Add error handling
- [x] Add rate limiting

### Phase 2: Service Layer 🔄
- [ ] Create VPSService class
- [ ] Add validation schemas
- [ ] Implement business logic
- [ ] Add retry logic
- [ ] Add cost tracking

### Phase 3: Controller Layer 📋
- [ ] Create vpsController
- [ ] Implement HTTP handlers
- [ ] Add response formatting
- [ ] Add error middleware

### Phase 4: Routes 📋
- [ ] Define route structure
- [ ] Apply middleware
- [ ] Bind controllers

### Phase 5: Testing 📋
- [ ] Write unit tests (90% coverage)
- [ ] Write integration tests
- [ ] Manual API testing
- [ ] Load testing

---

## Acceptance Criteria

- ✅ All layers follow RecruitIQ standards
- ✅ Dependency injection implemented
- ✅ Validation with Joi
- ✅ ES modules with .js extensions
- ✅ 90%+ test coverage for services
- ✅ All tests passing
- ✅ Proper error handling
- ✅ Security best practices
- ✅ Logging and monitoring
- ✅ Documentation complete

---

## Next Steps

1. Implement VPS Service layer
2. Add comprehensive validation
3. Implement business logic
4. Write unit tests
5. Implement controller layer
6. Implement routes
7. Write integration tests
8. Manual testing
9. Documentation

---

**Ready to begin Phase 2: Service Layer Implementation**
