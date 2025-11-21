# RBAC Implementation Roadmap

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.0  
**Last Updated:** November 21, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Phases](#implementation-phases)
3. [Phase 1: Foundation (Weeks 1-2)](#phase-1-foundation-weeks-1-2)
4. [Phase 2: Backend Implementation (Weeks 3-4)](#phase-2-backend-implementation-weeks-3-4)
5. [Phase 3: Frontend Integration (Weeks 5-6)](#phase-3-frontend-integration-weeks-5-6)
6. [Phase 4: Testing & Validation (Weeks 7-8)](#phase-4-testing--validation-weeks-7-8)
7. [Phase 5: Migration & Deployment (Weeks 9-10)](#phase-5-migration--deployment-weeks-9-10)
8. [Success Metrics](#success-metrics)
9. [Risk Mitigation](#risk-mitigation)

---

## Overview

This roadmap outlines the complete implementation of Role-Based Access Control (RBAC) across the RecruitIQ platform. The implementation follows a phased approach to minimize risk and ensure thorough testing.

**Key Documents:**
- [RBAC Standards](./RBAC_STANDARDS.md) - Technical implementation standards
- [RBAC Testing Standards](./RBAC_TESTING_STANDARDS.md) - Comprehensive testing guide
- [RBAC Migration Checklist](./RBAC_MIGRATION_CHECKLIST.md) - Feature-by-feature migration guide

**Total Timeline:** 10 weeks  
**Team Size:** 2-3 developers  
**Estimated Effort:** 400-600 hours

---

## Implementation Phases

### Phase Overview

| Phase | Duration | Focus Area | Deliverables |
|-------|----------|------------|--------------|
| **Phase 1** | 2 weeks | Foundation | Database schema, permission registry, base middleware |
| **Phase 2** | 2 weeks | Backend | API protection, service layer integration |
| **Phase 3** | 2 weeks | Frontend | UI components, route guards, feature toggles |
| **Phase 4** | 2 weeks | Testing | Comprehensive test coverage |
| **Phase 5** | 2 weeks | Migration | Data migration, deployment, monitoring |

---

## Phase 1: Foundation (Weeks 1-2)

### Week 1: Database & Core Infrastructure

**Objectives:**
- Set up database schema for RBAC
- Create permission registry
- Implement base permission system

**Tasks:**

#### Day 1-2: Database Schema
```sql
-- Priority 1: Core tables
✅ Create roles table
✅ Create permissions table
✅ Create role_permissions table
✅ Create user_roles table
✅ Add organization_id to all tables
✅ Create indexes
```

**Files to Create:**
```
backend/src/database/migrations/
  └── YYYYMMDD_create_rbac_tables.sql

backend/tests/integration/
  └── rbac-schema.test.js
```

**Acceptance Criteria:**
- [ ] All RBAC tables created
- [ ] Foreign key constraints working
- [ ] Indexes improve query performance
- [ ] Migration is reversible
- [ ] Integration tests pass

#### Day 3-4: Permission Registry
```javascript
// Priority 2: Permission definitions
✅ Define all permission categories
✅ Create permission registry class
✅ Implement permission validation
✅ Add permission seeding script
```

**Files to Create:**
```
backend/src/permissions/
  ├── PermissionRegistry.js
  ├── permissions.js
  └── index.js

backend/tests/unit/permissions/
  └── PermissionRegistry.test.js
```

**Acceptance Criteria:**
- [ ] All permissions documented
- [ ] Registry loads successfully
- [ ] Validation catches invalid permissions
- [ ] Unit tests cover all edge cases

#### Day 5: Role Service
```javascript
// Priority 3: Role management
✅ Create RoleService
✅ Create RoleRepository
✅ Implement CRUD operations
✅ Add validation
```

**Files to Create:**
```
backend/src/services/RoleService.js
backend/src/repositories/RoleRepository.js
backend/tests/unit/services/RoleService.test.js
```

**Acceptance Criteria:**
- [ ] Can create/read/update/delete roles
- [ ] Permissions can be assigned to roles
- [ ] Tenant isolation enforced
- [ ] 90%+ test coverage

### Week 2: Middleware & Helpers

#### Day 6-7: Permission Middleware
```javascript
// Priority 4: Core middleware
✅ requirePermission middleware
✅ requireAnyPermission middleware
✅ requireAllPermissions middleware
✅ Error handling
```

**Files to Create:**
```
backend/src/middleware/permissions.js
backend/tests/unit/middleware/permissions.test.js
backend/tests/integration/permission-middleware.test.js
```

**Acceptance Criteria:**
- [ ] Middleware blocks unauthorized access
- [ ] Returns correct HTTP status codes
- [ ] Logs security events
- [ ] Performance < 5ms per check

#### Day 8-9: Helper Functions & Decorators
```javascript
// Priority 5: Developer tools
✅ @RequirePermission decorator
✅ hasPermission() helper
✅ hasAnyPermission() helper
✅ checkPermissions() utility
```

**Files to Create:**
```
backend/src/utils/permissionDecorators.js
backend/src/utils/permissionHelpers.js
backend/tests/unit/utils/permissionHelpers.test.js
```

**Acceptance Criteria:**
- [ ] Decorators work on controller methods
- [ ] Helpers validate correctly
- [ ] TypeScript types correct
- [ ] Documentation complete

#### Day 10: Phase 1 Integration Testing
```javascript
// Priority 6: End-to-end validation
✅ Test complete permission flow
✅ Test role assignment
✅ Test permission checking
✅ Performance benchmarks
```

**Acceptance Criteria:**
- [ ] All Phase 1 tests pass
- [ ] Performance meets targets
- [ ] Documentation complete
- [ ] Code review passed

**Phase 1 Deliverables:**
- ✅ Database schema deployed
- ✅ Permission registry operational
- ✅ Core middleware functional
- ✅ Helper functions available
- ✅ Documentation complete

---

## Phase 2: Backend Implementation (Weeks 3-4)

### Week 3: API Protection

#### Day 11-12: Core Platform APIs
```javascript
// Priority 7: Protect core endpoints
✅ /api/auth/* - Authentication endpoints
✅ /api/organizations/* - Organization management
✅ /api/users/* - User management
✅ /api/roles/* - Role management (new)
```

**Files to Modify:**
```
backend/src/routes/auth.js
backend/src/routes/organizations.js
backend/src/routes/users.js
backend/src/routes/roles.js (new)
backend/src/controllers/roleController.js (new)
```

**Acceptance Criteria:**
- [ ] All endpoints protected
- [ ] Correct permissions required
- [ ] Integration tests pass
- [ ] API documentation updated

#### Day 13-14: RecruitIQ Product APIs
```javascript
// Priority 8: RecruitIQ endpoints
✅ /api/products/recruitiq/jobs
✅ /api/products/recruitiq/candidates
✅ /api/products/recruitiq/applications
✅ /api/products/recruitiq/interviews
```

**Files to Modify:**
```
backend/src/products/recruitiq/routes/
  ├── jobs.js
  ├── candidates.js
  ├── applications.js
  └── interviews.js

backend/src/products/recruitiq/controllers/
  └── (all controllers)
```

**Acceptance Criteria:**
- [ ] All RecruitIQ endpoints protected
- [ ] Permission checks in place
- [ ] Tests updated
- [ ] No breaking changes

#### Day 15: Nexus Product APIs (Part 1)
```javascript
// Priority 9: High-value Nexus endpoints
✅ /api/products/nexus/employees
✅ /api/products/nexus/departments
✅ /api/products/nexus/locations
```

**Files to Modify:**
```
backend/src/products/nexus/routes/
  ├── employees.js
  ├── departments.js
  └── locations.js
```

**Acceptance Criteria:**
- [ ] Critical Nexus endpoints protected
- [ ] Employee data secured
- [ ] Tests passing

### Week 4: Product APIs (Continued)

#### Day 16-17: Nexus Product APIs (Part 2)
```javascript
// Priority 10: Remaining Nexus endpoints
✅ /api/products/nexus/benefits
✅ /api/products/nexus/time-off
✅ /api/products/nexus/attendance
✅ /api/products/nexus/performance
✅ /api/products/nexus/contracts
✅ /api/products/nexus/documents
```

**Acceptance Criteria:**
- [ ] All Nexus endpoints protected
- [ ] Tests comprehensive
- [ ] Documentation updated

#### Day 18-19: PayLinQ & ScheduleHub
```javascript
// Priority 11: PayLinQ endpoints
✅ /api/products/paylinq/payroll-runs
✅ /api/products/paylinq/worker-types
✅ /api/products/paylinq/allowances
✅ /api/products/paylinq/deductions

// Priority 12: ScheduleHub endpoints
✅ /api/products/schedulehub/schedules
✅ /api/products/schedulehub/shifts
✅ /api/products/schedulehub/stations
```

**Acceptance Criteria:**
- [ ] All product endpoints secured
- [ ] Payroll data protected
- [ ] Schedule permissions working

#### Day 20: Phase 2 Integration Testing
```javascript
// Comprehensive API testing
✅ Test all protected endpoints
✅ Verify permission enforcement
✅ Security audit
✅ Performance testing
```

**Phase 2 Deliverables:**
- ✅ All API endpoints protected
- ✅ Permission checks enforced
- ✅ Integration tests complete
- ✅ API documentation updated

---

## Phase 3: Frontend Integration (Weeks 5-6)

### Week 5: React Components & Context

#### Day 21-22: Permission Context & Hooks
```typescript
// Priority 13: Frontend infrastructure
✅ PermissionContext
✅ usePermissions hook
✅ useHasPermission hook
✅ useCheckPermissions hook
```

**Files to Create:**
```
packages/auth/src/
  ├── contexts/PermissionContext.tsx
  ├── hooks/usePermissions.ts
  ├── hooks/useHasPermission.ts
  └── hooks/useCheckPermissions.ts

packages/auth/tests/
  └── hooks/usePermissions.test.tsx
```

**Acceptance Criteria:**
- [ ] Context provides permission state
- [ ] Hooks work correctly
- [ ] TypeScript types correct
- [ ] React Testing Library tests pass

#### Day 23-24: UI Components
```typescript
// Priority 14: Permission-aware components
✅ <PermissionGate> component
✅ <HasPermission> component
✅ <HasAnyPermission> component
✅ <HasAllPermissions> component
```

**Files to Create:**
```
packages/ui/src/components/
  ├── PermissionGate.tsx
  ├── HasPermission.tsx
  └── (other components)

packages/ui/tests/
  └── components/PermissionGate.test.tsx
```

**Acceptance Criteria:**
- [ ] Components render conditionally
- [ ] Loading states work
- [ ] Error handling correct
- [ ] Storybook stories created

#### Day 25: Route Guards
```typescript
// Priority 15: Protected routes
✅ ProtectedRoute component
✅ Route-level permission checks
✅ Redirect logic
✅ Access denied page
```

**Files to Create:**
```
packages/auth/src/
  ├── components/ProtectedRoute.tsx
  └── components/AccessDenied.tsx
```

**Acceptance Criteria:**
- [ ] Routes protect correctly
- [ ] Unauthorized users redirected
- [ ] Loading states smooth
- [ ] Tests comprehensive

### Week 6: App Integration

#### Day 26-27: Portal App Integration
```typescript
// Priority 16: Admin portal
✅ Protect admin routes
✅ Add permission checks to UI
✅ Update navigation
✅ Add role management UI
```

**Files to Modify:**
```
apps/portal/src/
  ├── App.tsx
  ├── routes/index.tsx
  ├── pages/roles/ (new)
  └── components/Navigation.tsx
```

**Acceptance Criteria:**
- [ ] Admin portal secured
- [ ] Role management working
- [ ] UI reflects permissions
- [ ] Tests passing

#### Day 28-29: Product App Integration
```typescript
// Priority 17: RecruitIQ, Nexus, PayLinQ, ScheduleHub
✅ Update app routing
✅ Add permission gates
✅ Update navigation menus
✅ Disable unavailable features
```

**Files to Modify:**
```
apps/recruitiq/src/
apps/nexus/src/
apps/paylinq/src/
apps/schedulehub/src/
```

**Acceptance Criteria:**
- [ ] All apps use RBAC
- [ ] UI consistent
- [ ] No console errors
- [ ] Smooth user experience

#### Day 30: Phase 3 Integration Testing
```typescript
// Frontend E2E testing
✅ Test all apps
✅ Verify UI behavior
✅ Cross-browser testing
✅ Performance testing
```

**Phase 3 Deliverables:**
- ✅ Frontend RBAC complete
- ✅ All apps integrated
- ✅ UI components functional
- ✅ E2E tests passing

---

## Phase 4: Testing & Validation (Weeks 7-8)

### Week 7: Comprehensive Testing

#### Day 31-32: Unit Testing
```javascript
// Priority 18: Complete unit test coverage
✅ All services 90%+ coverage
✅ All middleware 90%+ coverage
✅ All repositories 85%+ coverage
✅ All utilities 90%+ coverage
```

**Test Files to Complete:**
```
backend/tests/unit/
  ├── services/
  ├── middleware/
  ├── repositories/
  └── utils/

apps/*/tests/
  ├── components/
  ├── hooks/
  └── services/
```

**Acceptance Criteria:**
- [ ] Coverage thresholds met
- [ ] All edge cases tested
- [ ] Error paths covered
- [ ] CI/CD passing

#### Day 33-34: Integration Testing
```javascript
// Priority 19: API integration tests
✅ Permission enforcement tests
✅ Role assignment tests
✅ Multi-tenant isolation tests
✅ Product-specific tests
```

**Test Files:**
```
backend/tests/integration/
  ├── rbac-enforcement.test.js
  ├── role-management.test.js
  ├── permission-isolation.test.js
  └── products/
      ├── recruitiq-rbac.test.js
      ├── nexus-rbac.test.js
      ├── paylinq-rbac.test.js
      └── schedulehub-rbac.test.js
```

**Acceptance Criteria:**
- [ ] All integration tests pass
- [ ] Security tests comprehensive
- [ ] Performance acceptable
- [ ] Test reports generated

#### Day 35: E2E Testing
```javascript
// Priority 20: End-to-end scenarios
✅ Admin creates role
✅ Admin assigns permissions
✅ User accesses features
✅ Unauthorized access blocked
```

**Test Files:**
```
backend/tests/e2e/
  └── rbac-workflows.test.js

apps/*/e2e/
  └── rbac-scenarios.spec.ts
```

**Acceptance Criteria:**
- [ ] Complete user journeys tested
- [ ] All products covered
- [ ] Screenshots captured
- [ ] Tests stable

### Week 8: Security & Performance

#### Day 36-37: Security Audit
```javascript
// Priority 21: Security validation
✅ Permission bypass attempts
✅ Privilege escalation tests
✅ Tenant isolation verification
✅ SQL injection tests
✅ XSS protection tests
```

**Security Tests:**
```
backend/tests/security/
  ├── rbac-security.test.js
  ├── permission-bypass.test.js
  ├── privilege-escalation.test.js
  └── tenant-isolation.test.js
```

**Acceptance Criteria:**
- [ ] No security vulnerabilities
- [ ] Penetration tests pass
- [ ] Security scan clean
- [ ] Audit report generated

#### Day 38-39: Performance Testing
```javascript
// Priority 22: Performance optimization
✅ Permission check latency < 5ms
✅ Role load time < 100ms
✅ API response time acceptable
✅ Frontend rendering smooth
```

**Performance Tests:**
```
backend/tests/performance/
  └── rbac-performance.test.js
```

**Acceptance Criteria:**
- [ ] Performance targets met
- [ ] No memory leaks
- [ ] Database queries optimized
- [ ] Caching effective

#### Day 40: Phase 4 Review
```javascript
// Final testing review
✅ All tests passing
✅ Coverage requirements met
✅ Security validated
✅ Performance acceptable
```

**Phase 4 Deliverables:**
- ✅ Complete test suite
- ✅ Security audit passed
- ✅ Performance validated
- ✅ Documentation complete

---

## Phase 5: Migration & Deployment (Weeks 9-10)

### Week 9: Data Migration & Preparation

#### Day 41-42: Migration Script Development
```javascript
// Priority 23: Data migration
✅ Create migration script
✅ Map existing roles to new system
✅ Assign default permissions
✅ Dry-run validation
```

**Migration Scripts:**
```
backend/scripts/migrations/
  ├── migrate-to-rbac.js
  ├── rollback-rbac.js
  └── validate-migration.js
```

**Acceptance Criteria:**
- [ ] Migration script tested
- [ ] Rollback script works
- [ ] No data loss
- [ ] Validation successful

#### Day 43-44: Staging Deployment
```javascript
// Priority 24: Staging environment
✅ Deploy to staging
✅ Run migration
✅ Smoke testing
✅ User acceptance testing
```

**Deployment Tasks:**
```bash
# Staging deployment checklist
✅ Database backup
✅ Run migrations
✅ Deploy backend
✅ Deploy frontend
✅ Verify functionality
✅ Monitor logs
```

**Acceptance Criteria:**
- [ ] Staging deployment successful
- [ ] All features working
- [ ] No critical issues
- [ ] UAT sign-off

#### Day 45: Monitoring Setup
```javascript
// Priority 25: Observability
✅ Add RBAC metrics
✅ Set up alerts
✅ Create dashboards
✅ Log aggregation
```

**Monitoring Setup:**
```
- Permission check metrics
- Role assignment tracking
- Access denied events
- Performance monitoring
- Security event logging
```

**Acceptance Criteria:**
- [ ] Metrics collecting
- [ ] Alerts configured
- [ ] Dashboards functional
- [ ] Logs searchable

### Week 10: Production Deployment

#### Day 46-47: Production Deployment
```javascript
// Priority 26: Production rollout
✅ Database backup
✅ Run migrations
✅ Deploy backend (blue-green)
✅ Deploy frontend
✅ Verify functionality
```

**Deployment Plan:**
```yaml
Pre-deployment:
  - Create full database backup
  - Notify users of maintenance window
  - Run migration dry-run
  
Deployment:
  - Apply database migrations
  - Deploy backend (version 2.0.0)
  - Deploy frontend apps
  - Smoke test critical paths
  
Post-deployment:
  - Monitor logs for 24 hours
  - Respond to user feedback
  - Hot-fix if needed
```

**Acceptance Criteria:**
- [ ] Zero downtime deployment
- [ ] All users migrated
- [ ] No critical issues
- [ ] Monitoring healthy

#### Day 48-49: Post-Deployment Validation
```javascript
// Priority 27: Production validation
✅ Smoke tests pass
✅ User testing
✅ Performance monitoring
✅ Error tracking
```

**Validation Checklist:**
```
- All products accessible
- Permissions enforced
- No access issues
- Performance acceptable
- Logs clean
- No error spikes
```

**Acceptance Criteria:**
- [ ] All systems operational
- [ ] Users satisfied
- [ ] Metrics normal
- [ ] No rollback needed

#### Day 50: Post-Mortem & Documentation
```javascript
// Priority 28: Project closure
✅ Document lessons learned
✅ Update runbooks
✅ Create user guides
✅ Team retrospective
```

**Final Documentation:**
```
- Migration report
- Performance report
- Security audit results
- User adoption metrics
- Lessons learned
```

**Phase 5 Deliverables:**
- ✅ Production deployment successful
- ✅ All users migrated
- ✅ Monitoring operational
- ✅ Documentation complete

---

## Success Metrics

### Technical Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Test Coverage** | 90% overall | Jest coverage reports |
| **Permission Check Latency** | < 5ms | Performance monitoring |
| **API Response Time** | < 200ms | APM tools |
| **Security Vulnerabilities** | 0 critical | Security scans |
| **Uptime During Migration** | 99.9% | Monitoring dashboard |

### Business Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **User Adoption** | 100% | User login analytics |
| **Access Denied Rate** | < 1% | Log analysis |
| **Support Tickets** | < 10/week | Support system |
| **User Satisfaction** | > 8/10 | User surveys |
| **Time to Onboard New User** | < 5 min | Process timing |

### Quality Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Bug Reports** | < 5 critical | Issue tracking |
| **Code Quality** | A grade | SonarQube |
| **Documentation Coverage** | 100% | Manual review |
| **Test Stability** | > 95% | CI/CD reports |

---

## Risk Mitigation

### High-Risk Areas

#### Risk 1: Performance Degradation
**Probability:** Medium  
**Impact:** High

**Mitigation:**
- [ ] Implement permission caching
- [ ] Optimize database queries
- [ ] Load test before production
- [ ] Monitor performance metrics
- [ ] Have rollback plan ready

**Rollback Trigger:** API response time > 500ms

#### Risk 2: Data Migration Failure
**Probability:** Low  
**Impact:** Critical

**Mitigation:**
- [ ] Create full database backup
- [ ] Test migration script thoroughly
- [ ] Implement dry-run mode
- [ ] Validate data after migration
- [ ] Have rollback script ready

**Rollback Trigger:** Data validation fails

#### Risk 3: User Access Issues
**Probability:** Medium  
**Impact:** High

**Mitigation:**
- [ ] Default to granting access initially
- [ ] Gradual permission restriction
- [ ] Clear error messages
- [ ] Support team briefing
- [ ] Emergency access bypass

**Rollback Trigger:** > 10% users blocked

#### Risk 4: Integration Bugs
**Probability:** Medium  
**Impact:** Medium

**Mitigation:**
- [ ] Comprehensive integration tests
- [ ] Staging environment testing
- [ ] Gradual rollout by product
- [ ] Feature flags for RBAC
- [ ] Quick hot-fix process

**Rollback Trigger:** > 5 critical bugs

### Rollback Plan

**Immediate Rollback (< 1 hour):**
```bash
# Database rollback
psql -U postgres -d recruitiq < backup_pre_migration.sql

# Code rollback
git revert <rbac-merge-commit>
git push origin main

# Redeploy previous version
./scripts/deploy.sh v1.9.0
```

**Gradual Rollback (feature flag):**
```javascript
// Disable RBAC system-wide
const RBAC_ENABLED = false;

// Disable by product
const PRODUCT_RBAC = {
  recruitiq: false,
  nexus: false,
  paylinq: false,
  schedulehub: false
};
```

### Monitoring & Alerts

**Critical Alerts:**
- Permission check failures > 5%
- API error rate > 1%
- Database query time > 1s
- Memory usage > 80%
- CPU usage > 90%

**Alert Channels:**
- Slack: #rbac-alerts
- Email: dev-team@recruitiq.com
- PagerDuty: On-call engineer

---

## Post-Implementation

### Week 11+: Stabilization

**Activities:**
- Monitor production metrics
- Address user feedback
- Fix minor bugs
- Optimize performance
- Update documentation

**Success Criteria:**
- No critical issues for 7 days
- User satisfaction > 8/10
- Performance targets met
- Test coverage maintained

### Ongoing Maintenance

**Monthly:**
- Review permission usage
- Audit role assignments
- Update documentation
- Performance optimization

**Quarterly:**
- Security audit
- Permission cleanup
- Feature enhancement
- User training updates

---

## Resources Required

### Team Composition

| Role | Allocation | Responsibility |
|------|-----------|----------------|
| **Backend Developer** | 100% | Backend implementation, migrations |
| **Frontend Developer** | 100% | React components, UI integration |
| **QA Engineer** | 50% | Test planning, E2E testing |
| **DevOps Engineer** | 25% | Deployment, monitoring setup |
| **Tech Lead** | 25% | Code review, architecture decisions |
| **Product Manager** | 10% | Requirements, UAT coordination |

### Tools & Infrastructure

- Development environments (3x)
- Staging environment
- CI/CD pipeline updates
- Monitoring tools (Datadog/New Relic)
- Security scanning tools
- Load testing tools

### Budget Estimate

| Category | Estimated Cost |
|----------|---------------|
| Development Time | $60,000 - $80,000 |
| Infrastructure | $2,000 - $5,000 |
| Tools & Services | $3,000 - $5,000 |
| Contingency (15%) | $10,000 - $15,000 |
| **Total** | **$75,000 - $105,000** |

---

## References

- [RBAC Standards](./RBAC_STANDARDS.md)
- [RBAC Testing Standards](./RBAC_TESTING_STANDARDS.md)
- [RBAC Migration Checklist](./RBAC_MIGRATION_CHECKLIST.md)
- [Security Standards](./SECURITY_STANDARDS.md)
- [Backend Standards](./BACKEND_STANDARDS.md)
- [Frontend Standards](./FRONTEND_STANDARDS.md)
- [Testing Standards](./TESTING_STANDARDS.md)

---

**Next Steps:**
1. Present roadmap to stakeholders
2. Get approval for timeline and budget
3. Begin Phase 1 implementation
4. Set up project tracking (Jira/GitHub Projects)
5. Schedule regular progress reviews
