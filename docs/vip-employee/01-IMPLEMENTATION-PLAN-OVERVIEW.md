# VIP Employee Access Control - Implementation Plan (Part 1: Overview)

**Feature:** Restrict access to sensitive employee data for VIP employees  
**Product:** Nexus (HRIS)  
**Based on Codebase Analysis:** November 21, 2025  
**Version:** 1.0  

---

## Executive Summary

This implementation plan provides a complete roadmap for adding VIP Employee Access Control to the Nexus HRIS product within the RecruitIQ monorepo. The feature enables organizations to restrict access to sensitive data (compensation, performance reviews, personal information) for high-level executives, board members, and other VIP employees.

### Key Objectives

1. ✅ **Granular Access Control** - Restrict by data type (compensation, performance, documents)
2. ✅ **Flexible Authorization** - Grant access by user, role, or department
3. ✅ **Self-Access Exception** - Employees always see their own data
4. ✅ **Override Permission** - CEO/Owner can always access
5. ✅ **Complete Audit Trail** - Every access attempt logged
6. ✅ **Multi-Tenant Safe** - Organization-scoped security
7. ✅ **Backward Compatible** - No breaking changes

---

## Project Structure Analysis

### Current Codebase Architecture

Based on analysis of the existing codebase:

```
backend/src/
├── config/
│   └── database.js                    # Custom query wrapper (use this!)
├── middleware/
│   ├── auth.js                        # authenticateTenant, requireProductAccess
│   ├── requireOrganization.js         # Organization context
│   └── validation.js                  # Joi validation middleware
├── products/
│   └── nexus/
│       ├── controllers/
│       │   ├── employeeController.js  # HTTP handlers
│       │   └── userAccessController.js # User account management
│       ├── dto/
│       │   └── employeeDto.js         # DB ↔ API transformation
│       ├── routes/
│       │   └── index.js               # Route definitions
│       └── services/
│           ├── employeeService.js     # Business logic
│           └── ... (other services)
├── shared/
│   └── services/
│       └── compensationService.js     # Shared compensation logic
└── database/
    └── nexus-hris-schema.sql          # Database schema

apps/nexus/                             # Frontend React app
├── src/
│   ├── services/                       # API client wrappers
│   ├── hooks/                          # React Query hooks
│   └── components/                     # UI components

packages/api-client/                    # Centralized API client
└── src/
    └── products/
        └── nexus/
            └── client.ts               # NexusClient class
```

### Existing Tables (Relevant)

From `backend/src/database/nexus-hris-schema.sql`:

**hris.employee:**
- Primary employee data table
- Fields: id, organization_id, employee_number, first_name, last_name, email, job_title, department_id, location_id, manager_id, employment_status, hire_date, termination_date
- Has standard audit columns: created_at, updated_at, deleted_at, created_by, updated_by

**hris.user_account:**
- Login credentials for employees
- Fields: id, organization_id, employee_id, email, password_hash, account_status, enabled_products, product_roles
- Links to employee via employee_id

**payroll.compensation:**
- Employee compensation records (from shared service)
- Fields: employee_id, compensation_type, amount, currency, effective_from, effective_to, is_current

### Existing Middleware & Authentication

**Authentication Flow:**
- `authenticateTenant` - Validates JWT token from cookie, attaches user to req.user
- `requireProductAccess('nexus')` - Checks user has access to Nexus product
- `requireOrganization` - Ensures organization context exists
- All Nexus routes already protected by these middleware

**Request Object Structure:**
```javascript
req.user = {
  id: UUID,                    // User account ID
  email: string,
  organizationId: UUID,
  employeeId: UUID,            // Linked employee record
  productRoles: {
    nexus: 'admin' | 'manager' | 'employee' | 'hr_manager'
  },
  role: string                 // Legacy role field
}
```

### Existing Services

**EmployeeService** (`products/nexus/services/employeeService.js`):
- `createEmployee(employeeData, organizationId, userId)`
- `getEmployeeById(id, organizationId)`
- `listEmployees(filters, pagination, organizationId)`
- `updateEmployee(id, updateData, organizationId, userId)`
- `terminateEmployee(id, terminationData, organizationId, userId)`
- Uses DTOs: `mapEmployeeDbToApi`, `mapEmployeeApiToDb`
- Already integrates with compensationService

**CompensationService** (`shared/services/compensationService.js`):
- Shared service used by Nexus and PayLinQ
- `createInitialCompensation(employeeId, data, organizationId, userId)`
- `getCurrentCompensation(employeeId, organizationId)`
- `getCompensationHistory(employeeId, organizationId)`

---

## Implementation Phases

### Phase 1: Database Schema (Week 1)
- Add VIP columns to hris.employee
- Create hris.employee_access_control table
- Create hris.restricted_access_log table
- Database migration scripts
- **Files:** 3 new files

### Phase 2: Access Control Service (Week 1-2)
- Create EmployeeAccessControlService
- Implement access checking logic
- Implement audit logging
- Unit tests
- **Files:** 2 new files, 0 modified

### Phase 3: Middleware (Week 2)
- Create checkEmployeeAccess middleware
- Create filterRestrictedEmployees middleware
- Integration with existing auth flow
- **Files:** 1 new file

### Phase 4: Backend API Updates (Week 2-3)
- Update EmployeeService with VIP methods
- Update EmployeeController with VIP endpoints
- Update routes with middleware
- Update DTOs
- Integration tests
- **Files:** 5 modified files, 2 new test files

### Phase 5: API Client Updates (Week 3)
- Add VIP methods to NexusClient
- Update TypeScript types
- **Files:** 2 modified files

### Phase 6: Frontend Implementation (Week 3-4)
- VIP Badge component
- Access Control Modal
- Request Access workflow
- Access Denied screen
- Audit Log viewer
- Settings page
- **Files:** 12 new files, 3 modified files

### Phase 7: Testing & Documentation (Week 4)
- E2E tests for access scenarios
- Security testing
- Performance testing
- User documentation
- API documentation
- **Files:** 5 new test files, 3 docs

### Phase 8: Deployment & Rollout (Week 5)
- Database migrations
- Feature flag configuration
- Gradual rollout
- Monitoring setup

---

## Technical Dependencies

### Backend Dependencies (Already Installed)
- ✅ `joi` - Validation
- ✅ `jsonwebtoken` - JWT auth
- ✅ `pg` - PostgreSQL client
- ✅ `express` - Web framework
- ✅ No new dependencies required

### Frontend Dependencies (Already Installed)
- ✅ `@tanstack/react-query` - Data fetching
- ✅ `react-router-dom` - Routing
- ✅ `axios` - HTTP client (via api-client)
- ✅ No new dependencies required

### Database Requirements
- ✅ PostgreSQL 12+ (already in use)
- ✅ UUID support (already enabled)
- ✅ JSONB support (already in use)

---

## Coding Standards Compliance

This implementation follows all RecruitIQ coding standards:

### Backend Standards
- ✅ **Layer Architecture:** Routes → Controllers → Services → Repositories
- ✅ **Custom Query Wrapper:** Use `query()` from `config/database.js`
- ✅ **Tenant Isolation:** All queries filter by `organization_id`
- ✅ **Parameterized Queries:** No SQL injection vulnerabilities
- ✅ **Soft Deletes:** Use `deleted_at` column
- ✅ **Audit Columns:** created_at, updated_at, created_by, updated_by
- ✅ **DTOs:** Transform snake_case ↔ camelCase
- ✅ **Error Handling:** Use custom error classes
- ✅ **Logging:** Use centralized logger

### Frontend Standards
- ✅ **Provider Wrapping Order:** ErrorBoundary → Router → Auth → QueryClient → Theme
- ✅ **Centralized API Client:** Use `@recruitiq/api-client` NexusClient
- ✅ **Service Layer:** Wrap API client methods
- ✅ **React Query Hooks:** Use hooks for data fetching
- ✅ **Component Structure:** Functional components with hooks
- ✅ **TailwindCSS:** Consistent styling

### Security Standards
- ✅ **Authentication Required:** All endpoints protected
- ✅ **Authorization Checks:** Per-endpoint access control
- ✅ **Audit Logging:** All access attempts logged
- ✅ **Input Validation:** Joi schemas for all inputs
- ✅ **SQL Injection Prevention:** Parameterized queries only
- ✅ **XSS Prevention:** Escape all user input
- ✅ **403 vs 404:** Use 403 for cross-org denial (don't reveal existence)

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Performance impact on list queries** | Medium | Low | Add database indexes, implement caching |
| **Backward compatibility breaking** | Low | High | Thorough testing, feature flag, gradual rollout |
| **Complex authorization logic** | Medium | Medium | Comprehensive unit tests, clear documentation |
| **Audit log storage growth** | Medium | Low | Regular cleanup job, data retention policy |
| **Race conditions in access checks** | Low | Medium | Use database transactions, idempotent operations |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **User resistance to restrictions** | Medium | Medium | Clear communication, self-service request flow |
| **Compliance issues** | Low | High | Complete audit trail, retention policies |
| **Increased support tickets** | Medium | Low | Clear error messages, user documentation |
| **Training overhead** | Low | Low | Video tutorials, in-app tooltips |

---

## Success Metrics

### Technical Metrics
- ✅ Zero security vulnerabilities introduced
- ✅ < 50ms average access check time
- ✅ 100% test coverage for access control logic
- ✅ Zero data leaks across organizations

### Business Metrics
- 📊 Number of VIP employees protected
- 📊 Access denial rate
- 📊 Average time to approve access requests
- 📊 Audit log query performance

### User Satisfaction
- 😊 Ease of marking employees as VIP
- 😊 Clarity of access denied messages
- 😊 Speed of access request approval
- 😊 Usefulness of audit logs

---

## File Count Summary

### New Files to Create: 28
- Database migrations: 3
- Backend services: 2
- Backend middleware: 1
- Backend tests: 7
- Frontend components: 12
- Frontend tests: 3

### Files to Modify: 10
- Backend services: 2
- Backend controllers: 1
- Backend routes: 1
- Backend DTOs: 1
- API client: 2
- Frontend services: 2
- Configuration: 1

### Total Files: 38

---

## Timeline Estimate

**Total Duration:** 5 weeks (25 business days)

| Phase | Duration | Team Size | Effort |
|-------|----------|-----------|--------|
| Phase 1: Database | 3 days | 1 backend dev | 3 days |
| Phase 2: Service | 4 days | 1 backend dev | 4 days |
| Phase 3: Middleware | 2 days | 1 backend dev | 2 days |
| Phase 4: Backend API | 5 days | 1 backend dev | 5 days |
| Phase 5: API Client | 2 days | 1 frontend dev | 2 days |
| Phase 6: Frontend | 6 days | 1 frontend dev | 6 days |
| Phase 7: Testing | 5 days | 1 QA engineer | 5 days |
| Phase 8: Deployment | 3 days | 1 DevOps | 3 days |

**Note:** Phases can overlap. Frontend work (Phase 6) can start after Phase 4 is complete.

---

## Next Steps

1. **Review & Approval** - Stakeholder sign-off on implementation plan
2. **Sprint Planning** - Break into 2-week sprints
3. **Environment Setup** - Create feature branch `feature/vip-employee-access`
4. **Phase 1 Kickoff** - Database schema design and migration

---

## Document Index

This implementation plan is split into multiple parts:

1. **Part 1: Overview** (This document)
   - Project structure analysis
   - Implementation phases
   - Risk assessment
   - Timeline

2. **Part 2: Database Schema** (`02-DATABASE-SCHEMA.md`)
   - Complete schema changes
   - Migration scripts
   - Index strategy

3. **Part 3: Backend Implementation** (`03-BACKEND-IMPLEMENTATION.md`)
   - Service layer code
   - Middleware code
   - Controller updates

4. **Part 4: API & Routes** (`04-API-ROUTES.md`)
   - Route definitions
   - API client updates
   - TypeScript types

5. **Part 5: Frontend Implementation** (`05-FRONTEND-IMPLEMENTATION.md`)
   - React components
   - Hooks and services
   - Styling

6. **Part 6: Testing Strategy** (`06-TESTING-STRATEGY.md`)
   - Unit tests
   - Integration tests
   - E2E tests

7. **Part 7: Deployment Guide** (`07-DEPLOYMENT-GUIDE.md`)
   - Migration execution
   - Configuration
   - Rollout plan

---

**Status:** Draft for Review  
**Last Updated:** November 21, 2025  
**Next Document:** [Part 2: Database Schema](./02-DATABASE-SCHEMA.md)
