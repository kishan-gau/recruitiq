# Phase 4: RecruitIQ Product Restructuring

**Duration:** 3 days  
**Dependencies:** Phase 1, Phase 2, Phase 3  
**Team:** Backend Team + 1 Frontend Developer  
**Status:** Not Started

---

## 📋 Overview

This phase restructures the existing RecruitIQ codebase into the new product module structure. We'll move controllers, services, repositories, routes, and models from the monolithic `backend/src/` structure into `backend/src/products/recruitiq/`.

Since the system is not yet in production, we can perform a clean restructuring without backward compatibility concerns.

---

## 🎯 Objectives

1. Restructure existing RecruitIQ backend code into product module format
2. Update all imports and dependencies to reflect new structure
3. Create product configuration file for RecruitIQ
4. Ensure all existing tests still pass after restructuring
5. Verify no functionality is broken

---

## 📊 Deliverables

### 1. Restructured RecruitIQ Product Module

**Directory:** `backend/src/products/recruitiq/`

```
backend/src/products/recruitiq/
├── config/
│   └── product.config.js
├── controllers/
│   ├── jobController.js
│   ├── candidateController.js
│   ├── applicationController.js
│   ├── interviewController.js
│   └── workspaceController.js
├── services/
│   ├── jobService.js
│   ├── candidateService.js
│   ├── applicationService.js
│   ├── interviewService.js
│   └── pipelineService.js
├── repositories/
│   ├── jobRepository.js
│   ├── candidateRepository.js
│   ├── applicationRepository.js
│   └── interviewRepository.js
├── routes/
│   ├── jobs.js
│   ├── candidates.js
│   ├── applications.js
│   ├── interviews.js
│   └── workspaces.js
├── models/
│   └── (if any model files exist)
└── index.js
```

### 2. Product Configuration File

**File:** `backend/src/products/recruitiq/config/product.config.js`

```javascript
/**
 * RecruitIQ Product Configuration
 */
export default {
  id: 'recruitiq',
  name: 'RecruitIQ',
  displayName: 'RecruitIQ ATS',
  version: '1.0.0',
  description: 'Applicant Tracking System',
  
  // Routes configuration
  routes: {
    prefix: '/api/recruit',
    version: 'v1'
  },
  
  // Database configuration
  database: {
    schema: 'recruitment',
    tables: [
      'workspaces',
      'jobs',
      'candidates',
      'applications',
      'interviews',
      'pipeline_stages'
    ]
  },
  
  // Feature tiers
  tiers: {
    starter: {
      name: 'Starter',
      features: ['job_posting', 'candidate_management', 'basic_pipeline'],
      limits: {
        maxJobs: 10,
        maxCandidates: 100,
        maxWorkspaces: 1
      }
    },
    professional: {
      name: 'Professional',
      features: ['job_posting', 'candidate_management', 'advanced_pipeline', 'analytics', 'integrations'],
      limits: {
        maxJobs: 50,
        maxCandidates: 1000,
        maxWorkspaces: 5
      }
    },
    enterprise: {
      name: 'Enterprise',
      features: 'all',
      limits: {
        maxJobs: -1,  // unlimited
        maxCandidates: -1,
        maxWorkspaces: -1
      }
    }
  },
  
  // Dependencies
  dependencies: ['core'],
  
  // Integrations
  integrations: {
    provides: ['candidate.hired'],
    consumes: []
  }
};
```

### 3. Updated Import Statements

All files updated with new import paths:

```javascript
// Before
import JobService from '../services/jobService.js';

// After
import JobService from '../products/recruitiq/services/jobService.js';
```

---

## 🔍 Detailed Tasks

### Task 4.1: Create Product Directory Structure (0.5 days)

**Assignee:** Backend Lead

**Actions:**
1. ✅ Create `backend/src/products/recruitiq/` directory
2. ✅ Create subdirectories: `config/`, `controllers/`, `services/`, `repositories/`, `routes/`, `models/`
3. ✅ Create product configuration file (`product.config.js`)
4. ✅ Create `index.js` for product exports
5. ✅ Verify directory structure matches standards

**Standards:** Follow BACKEND_STANDARDS.md layer architecture

### Task 4.2: Move Controller Files (0.5 days)

**Assignee:** Backend Developer 1

**Actions:**
1. ✅ Move `backend/src/controllers/jobController.js` → `products/recruitiq/controllers/`
2. ✅ Move `backend/src/controllers/candidateController.js` → `products/recruitiq/controllers/`
3. ✅ Move `backend/src/controllers/applicationController.js` → `products/recruitiq/controllers/`
4. ✅ Move `backend/src/controllers/interviewController.js` → `products/recruitiq/controllers/`
5. ✅ Move `backend/src/controllers/workspaceController.js` → `products/recruitiq/controllers/`
6. ✅ Update all internal imports within controller files
7. ✅ Verify no syntax errors

**Standards:** Follow BACKEND_STANDARDS.md controller patterns

### Task 4.3: Move Service Files (0.5 days)

**Assignee:** Backend Developer 2

**Actions:**
1. ✅ Move `backend/src/services/jobService.js` → `products/recruitiq/services/`
2. ✅ Move `backend/src/services/candidateService.js` → `products/recruitiq/services/`
3. ✅ Move `backend/src/services/applicationService.js` → `products/recruitiq/services/`
4. ✅ Move `backend/src/services/interviewService.js` → `products/recruitiq/services/`
5. ✅ Move `backend/src/services/pipelineService.js` → `products/recruitiq/services/`
6. ✅ Update all internal imports
7. ✅ Verify Joi schemas still work

**Standards:** Follow BACKEND_STANDARDS.md service layer standards

### Task 4.4: Move Repository Files (0.5 days)

**Assignee:** Backend Developer 1

**Actions:**
1. ✅ Move `backend/src/repositories/jobRepository.js` → `products/recruitiq/repositories/`
2. ✅ Move `backend/src/repositories/candidateRepository.js` → `products/recruitiq/repositories/`
3. ✅ Move `backend/src/repositories/applicationRepository.js` → `products/recruitiq/repositories/`
4. ✅ Move `backend/src/repositories/interviewRepository.js` → `products/recruitiq/repositories/`
5. ✅ Update schema references (if any) to use `recruitment.` prefix
6. ✅ Update all internal imports
7. ✅ Verify query wrapper still used correctly

**Standards:** Follow DATABASE_STANDARDS.md query patterns

### Task 4.5: Move Route Files (0.5 days)

**Assignee:** Backend Developer 2

**Actions:**
1. ✅ Move `backend/src/routes/jobs.js` → `products/recruitiq/routes/`
2. ✅ Move `backend/src/routes/candidates.js` → `products/recruitiq/routes/`
3. ✅ Move `backend/src/routes/applications.js` → `products/recruitiq/routes/`
4. ✅ Move `backend/src/routes/interviews.js` → `products/recruitiq/routes/`
5. ✅ Move `backend/src/routes/workspaces.js` → `products/recruitiq/routes/`
6. ✅ Update controller imports in route files
7. ✅ Update route prefixes to `/api/recruit/*`

**Standards:** Follow API_STANDARDS.md REST conventions

### Task 4.6: Update Server.js Integration (0.5 days)

**Assignee:** Backend Lead

**Actions:**
1. ✅ Update `backend/src/server.js` to load RecruitIQ via product loader
2. ✅ Remove old direct route imports
3. ✅ Verify product loader mounts routes at correct prefix
4. ✅ Test that all endpoints still accessible
5. ✅ Verify middleware still applied correctly

**Example code:**
```javascript
// backend/src/server.js
import productLoader from './shared/productLoader.js';

// Load RecruitIQ product
await productLoader.loadProduct('recruitiq');

// Mount routes
const recruitiqProduct = productLoader.getProduct('recruitiq');
app.use(recruitiqProduct.routes.prefix, recruitiqProduct.routes.router);
```

**Standards:** Follow BACKEND_STANDARDS.md

### Task 4.7: Update All Tests (0.5 days)

**Assignee:** QA + Backend Team

**Actions:**
1. ✅ Update test import paths for controllers
2. ✅ Update test import paths for services
3. ✅ Update test import paths for repositories
4. ✅ Run all unit tests: `npm test`
5. ✅ Fix any failing tests
6. ✅ Verify 80%+ coverage maintained
7. ✅ Run integration tests

**Standards:** Follow TESTING_STANDARDS.md

---

## 📋 Standards Compliance Checklist

- [ ] Code follows BACKEND_STANDARDS.md (layer architecture maintained)
- [ ] Database queries still use custom query wrapper per DATABASE_STANDARDS.md
- [ ] All imports updated correctly
- [ ] No direct file system dependencies (relative paths only)
- [ ] Tests written per TESTING_STANDARDS.md (80%+ coverage)
- [ ] Documentation updated per DOCUMENTATION_STANDARDS.md
- [ ] API endpoints still follow API_STANDARDS.md
- [ ] No breaking changes to existing functionality

---

## 🎯 Success Criteria

Phase 4 is complete when:

1. ✅ All RecruitIQ code moved to `products/recruitiq/` structure
2. ✅ Product configuration file created and valid
3. ✅ All imports updated correctly throughout codebase
4. ✅ All unit tests pass (80%+ coverage)
5. ✅ All integration tests pass
6. ✅ Server starts without errors
7. ✅ All API endpoints respond correctly at `/api/recruit/*`
8. ✅ No console errors or warnings
9. ✅ Code review approved by 2+ engineers
10. ✅ No regression in existing functionality

---

## 📤 Outputs

### Code Restructured
- [ ] `backend/src/products/recruitiq/config/product.config.js`
- [ ] `backend/src/products/recruitiq/controllers/*.js` (5 files)
- [ ] `backend/src/products/recruitiq/services/*.js` (5 files)
- [ ] `backend/src/products/recruitiq/repositories/*.js` (4 files)
- [ ] `backend/src/products/recruitiq/routes/*.js` (5 files)
- [ ] `backend/src/products/recruitiq/index.js`
- [ ] `backend/src/server.js` (updated)

### Tests Updated
- [ ] All test files have updated import paths
- [ ] All tests pass (maintain or improve coverage)
- [ ] Integration tests verify product loading works

### Documentation Updated
- [ ] README updated with new structure
- [ ] API documentation reflects new endpoints
- [ ] Architecture diagrams updated

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Import path errors break application | High | Systematic file-by-file testing; use IDE refactoring tools |
| Tests fail after restructuring | High | Update tests incrementally; maintain test coverage reports |
| Missing file during move | Medium | Create checklist of all files; verify against git status |
| Performance degradation from new structure | Low | Benchmark API response times before and after |
| Route conflicts after restructuring | Medium | Test all endpoints; verify routing table |

---

## 🔗 Related Phases

- **Previous:** [Phase 3: Database Schema Design](./PHASE_03_DATABASE_SCHEMA.md)
- **Next:** [Phase 5: Product Loader & Access Control](./PHASE_05_PRODUCT_LOADER.md)
- **Related:** [Phase 2: Core Infrastructure](./PHASE_02_CORE_INFRASTRUCTURE.md)

---

## ⏭️ Next Phase

**[Phase 5: Product Loader & Access Control](./PHASE_05_PRODUCT_LOADER.md)**

Upon completion of Phase 4, proceed to Phase 5 to implement the product loader system and subscription-based access control middleware.

---

**Phase Owner:** Backend Team Lead  
**Last Updated:** November 3, 2025  
**Status:** Ready to Start
