# Frontend Consolidation Plan

**Project:** RecruitIQ Frontend Unification  
**Version:** 1.0  
**Created:** December 25, 2025  
**Duration:** 8-12 weeks (320-480 hours)  
**Team Size:** 3-4 developers  

---

## Executive Summary

This plan outlines the consolidation of 3 separate frontend applications (Nexus HRIS, PayLinQ Payroll, RecruitIQ ATS) into a single unified React application. The consolidation will eliminate code duplication, streamline development workflows, and create a cohesive user experience while maintaining the existing backend product-based access control system.

## Current State Analysis

### Existing Applications
- **Nexus (HRIS):** 2.04 MB, 205 files, ~100 routes
- **PayLinQ (Payroll):** 1.91 MB, 196 files, ~40 routes  
- **RecruitIQ (ATS):** 1.18 MB, 134 files, ~20 routes

### Total Current Size: 5.13 MB, 535 files, ~160 routes

### Key Issues Identified
1. **Feature Duplication:** ScheduleHub exists in both Nexus and PayLinQ
2. **Development Overhead:** 3 separate build processes, deployment pipelines
3. **Shared Component Fragmentation:** 27+ imports from @recruitiq packages across apps
4. **Testing Complexity:** Separate E2E test suites per application
5. **User Experience Inconsistency:** Different navigation patterns and layouts

### Infrastructure Strengths (Facilitating Consolidation)
- ✅ Unified tech stack: React 18.3.1 + TypeScript + Vite + React Router v6
- ✅ Shared packages: @recruitiq/auth, ui, types, utils, api-client
- ✅ Backend product enforcement via `enabledProducts` array
- ✅ Existing lazy loading and code splitting
- ✅ TailwindCSS design system consistency

## Consolidation Benefits

### Development Benefits
- **35% reduction** in codebase size (estimated final size: ~3.5 MB)
- **Single deployment pipeline** instead of 3 separate ones
- **Unified testing strategy** across all products
- **Shared component library** usage optimization
- **Consistent development workflow**

### User Experience Benefits  
- **Single sign-on** across all products
- **Unified navigation** and layout consistency
- **Cross-product workflows** (e.g., employee data in payroll)
- **Consistent design language**
- **Performance improvements** from shared resources

### Business Benefits
- **Faster feature development** through shared components
- **Reduced maintenance overhead** 
- **Easier onboarding** for new developers
- **Improved product integration**
- **Lower infrastructure costs**

## Target Architecture

### Module-Based Structure
```
apps/unified-frontend/
├── src/
│   ├── modules/
│   │   ├── nexus/           # HRIS modules
│   │   │   ├── employees/
│   │   │   ├── contracts/
│   │   │   ├── benefits/
│   │   │   └── performance/
│   │   ├── paylinq/         # Payroll modules  
│   │   │   ├── workers/
│   │   │   ├── payroll-runs/
│   │   │   ├── tax-rules/
│   │   │   └── components/
│   │   ├── recruitiq/       # ATS modules
│   │   │   ├── jobs/
│   │   │   ├── candidates/
│   │   │   ├── applications/
│   │   │   └── pipeline/
│   │   └── shared/          # Cross-product modules
│   │       ├── schedulehub/ # Unified scheduling
│   │       ├── dashboard/
│   │       └── settings/
│   ├── layouts/             # Product-specific layouts
│   ├── routing/             # Product-aware routing
│   └── shared/              # App-wide utilities
```

### Access Control Strategy
- Leverage existing `user.enabledProducts` backend enforcement
- Frontend route protection via `ProtectedRoute` with product checks
- Dynamic menu rendering based on user permissions
- Lazy loading of product modules for performance

## Implementation Phases

### [Phase 1: Foundation & Infrastructure](./consolidation/PHASE_1_FOUNDATION.md) (Weeks 1-2)
**Duration:** 80-120 hours  
**Focus:** Setup unified application structure and shared infrastructure

### [Phase 2: Core Module Migration](./consolidation/PHASE_2_CORE_MIGRATION.md) (Weeks 3-5)
**Duration:** 120-180 hours  
**Focus:** Migrate individual product modules with routing

### [Phase 3: Feature Consolidation](./consolidation/PHASE_3_FEATURE_CONSOLIDATION.md) (Weeks 6-8)
**Duration:** 80-120 hours  
**Focus:** Merge duplicate features and optimize shared components

### [Phase 4: Testing & Launch](./consolidation/PHASE_4_TESTING_LAUNCH.md) (Weeks 9-10)
**Duration:** 40-60 hours  
**Focus:** Comprehensive testing and production deployment

### [Phase 5: Cleanup & Optimization](./consolidation/PHASE_5_CLEANUP_OPTIMIZATION.md) (Weeks 11-12)
**Duration:** 40-60 hours  
**Focus:** Remove old applications and optimize performance

## Risk Assessment & Mitigation

### High Risk
- **User Authentication Disruption**
  - *Mitigation:* Parallel deployment with gradual rollout
  - *Contingency:* Quick rollback mechanism

### Medium Risk  
- **Cross-Product Feature Conflicts**
  - *Mitigation:* Careful namespace design and testing
  - *Contingency:* Module isolation fallback

### Low Risk
- **Performance Degradation**
  - *Mitigation:* Aggressive code splitting and lazy loading
  - *Contingency:* Resource optimization techniques

## Success Criteria

### Phase Completion Metrics
- [ ] All existing functionality preserved
- [ ] No authentication/authorization regressions
- [ ] Performance parity or improvement (load times)
- [ ] Zero data loss during migration
- [ ] Full E2E test coverage maintained

### Quality Gates
- [ ] Code coverage ≥ 80% across all modules
- [ ] Lighthouse performance score ≥ 90
- [ ] Zero critical accessibility violations
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness maintained

### Business Objectives
- [ ] 35% reduction in frontend codebase size
- [ ] Single deployment pipeline operational
- [ ] Developer onboarding time reduced by 50%
- [ ] User satisfaction scores maintained or improved

## Resource Requirements

### Development Team
- **Technical Lead:** 1 person (architecture oversight)
- **Senior Frontend Developers:** 2 people (module migration)
- **Frontend Developer:** 1 person (testing & documentation)
- **DevOps Engineer:** 0.5 person (deployment pipeline)
- **QA Engineer:** 0.5 person (testing coordination)

### Infrastructure
- **Development Environment:** Existing setup sufficient
- **Staging Environment:** Additional capacity for parallel testing
- **CI/CD Pipeline:** Modifications for unified build process
- **Monitoring:** Enhanced logging for migration tracking

## Communication Plan

### Stakeholder Updates
- **Weekly Status Reports:** Every Friday
- **Phase Demo Sessions:** End of each phase
- **Risk Assessment Reviews:** Bi-weekly
- **Go-Live Readiness Review:** Week 9

### User Communication
- **Migration Announcement:** 2 weeks before start
- **Feature Preview Sessions:** End of Phase 2
- **Training Materials:** Available in Phase 3
- **Go-Live Communication:** 1 week before launch

## Next Steps

1. **Review and Approve Plan:** Stakeholder sign-off required
2. **Team Assembly:** Assign developers to phases
3. **Environment Setup:** Prepare development and staging
4. **Detailed Sprint Planning:** Break down Phase 1 into sprints
5. **Risk Review:** Final assessment of identified risks

---

**Phase Documents:**
- [Phase 1: Foundation & Infrastructure](./consolidation/PHASE_1_FOUNDATION.md)
- [Phase 2: Core Module Migration](./consolidation/PHASE_2_CORE_MIGRATION.md) 
- [Phase 3: Feature Consolidation](./consolidation/PHASE_3_FEATURE_CONSOLIDATION.md)
- [Phase 4: Testing & Launch](./consolidation/PHASE_4_TESTING_LAUNCH.md)
- [Phase 5: Cleanup & Optimization](./consolidation/PHASE_5_CLEANUP_OPTIMIZATION.md)

**Document Owner:** Technical Lead  
**Last Updated:** December 25, 2025  
**Next Review:** Phase completion milestones