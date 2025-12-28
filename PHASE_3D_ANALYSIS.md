# Phase 3D Analysis: Scheduling Module (ScheduleHub) Consolidation

**Date:** December 27, 2024  
**Status:** NOT STARTED (0% implementation - only placeholder structure exists)

---

## Executive Summary

Phase 3D requires migrating **ScheduleHub** - a comprehensive workforce scheduling system from `apps/nexus` to the unified `apps/web` frontend. The existing implementation in Nexus is **feature-complete with ~3,500+ lines** of production code across 9+ pages, 7 custom hooks, 10+ components, and full backend integration. This is one of the **most complex** consolidation phases due to:

- **Real-time coverage analysis** and constraint checking
- **Complex calendar/timeline interfaces** with drag-drop
- **Worker availability and shift swap marketplace**
- **Multi-station coverage visualization**
- **Auto-generate scheduling with templates**

The unified web app currently has **only empty placeholder pages** (~30 lines total).

---

## Backend API Status: ✅ **FULLY IMPLEMENTED**

### Available Endpoints (via `/api/products/schedulehub`)

| Feature | Endpoints | Status |
|---------|-----------|--------|
| **Schedules** | 10 endpoints (CRUD, auto-generate, publish, regenerate) | ✅ Complete |
| **Shifts** | 8 endpoints (CRUD, assign workers, clock in/out) | ✅ Complete |
| **Workers** | 9 endpoints (CRUD, roles, availability, terminate) | ✅ Complete |
| **Stations** | 7 endpoints (CRUD, requirements, assignments) | ✅ Complete |
| **Roles** | 5 endpoints (CRUD, worker assignments) | ✅ Complete |
| **Availability** | 6 endpoints (CRUD, conflict checking) | ✅ Complete |
| **Time Off** | 5 endpoints (CRUD, approve/deny requests) | ✅ Complete |
| **Shift Swaps** | 6 endpoints (marketplace, requests, approvals) | ✅ Complete |
| **Templates** | 8 endpoints (CRUD, multi-station support) | ✅ Complete |
| **Coverage Analysis** | 2 endpoints (station coverage, timeline stats) | ✅ Complete |
| **Statistics** | 1 dashboard endpoint | ✅ Complete |

**Total:** 67+ backend endpoints fully implemented with DTOs, validation, tenant isolation, and audit trails.

### Key Backend Services

```javascript
// Available ScheduleHub services (all fully implemented)
- ScheduleService         // 2,643 lines - schedule/shift management, auto-generation
- WorkerService           // 796 lines - worker CRUD, roles, availability
- StationService          // 781 lines - station management, coverage
- AvailabilityService     // 673 lines - availability tracking, conflict detection
- ShiftTemplateService    // 1,316 lines - reusable shift templates
- TimeOffService          // 249 lines - time-off requests/approvals
- ShiftTradeService       // 417 lines - shift swap marketplace
- RoleService             // 307 lines - role management
- ShiftService            // 272 lines - individual shift operations
- IntegrationService      // 399 lines - cross-product integration (Paylinq, HRIS)
```

### Database Schema (scheduling schema)

```sql
-- Fully implemented tables (22 total):
scheduling.schedules                      -- Weekly/period schedules
scheduling.shifts                         -- Individual work shifts
scheduling.workers                        -- Link to hris.employee
scheduling.worker_scheduling_config       -- Scheduling preferences
scheduling.stations                       -- Physical work locations
scheduling.station_role_requirements      -- Required staffing levels
scheduling.roles                          -- Job roles
scheduling.worker_roles                   -- Worker-role assignments
scheduling.worker_availability            -- Worker availability windows
scheduling.time_off_requests              -- Time-off management
scheduling.shift_swap_offers              -- Shift swap marketplace
scheduling.shift_templates                -- Reusable shift templates
scheduling.shift_template_roles           -- Template role requirements
scheduling.shift_template_stations        -- Template-station junction
scheduling.station_assignments            -- Worker-station assignments
```

---

## Current State: Legacy Nexus Implementation

### Pages in `apps/nexus/src/pages/schedulehub/` (9 pages, ~3,500+ lines)

| Page | Lines | Status | Complexity | Features |
|------|-------|--------|------------|----------|
| **ScheduleHubDashboard.tsx** | ~400 | ✅ Complete | High | 6 stat cards, quick actions, upcoming shifts, approval queue |
| **SchedulesList.tsx** | 481 | ✅ Complete | High | List/grid view, version management, publish workflow, filters |
| **ScheduleDetails.tsx** | 829 | ✅ Complete | Very High | Calendar view, shift management, worker assignment, coverage analysis |
| **ScheduleBuilder.tsx** | ~600 | ✅ Complete | Very High | Auto-generation, template selection, constraint checking |
| **WorkersList.tsx** | 313 | ✅ Complete | Medium | CRUD, status filters, role assignments |
| **RolesList.tsx** | ~250 | ✅ Complete | Medium | Role management, worker assignments, capacity tracking |
| **TimeOffRequests.tsx** | ~300 | ✅ Complete | Medium | Request approval/denial, calendar view, balance tracking |
| **AvailabilityManagement.tsx** | ~350 | ✅ Complete | High | Worker availability windows, conflict detection |
| **ShiftSwapMarketplace.tsx** | 284 | ✅ Complete | High | Shift swap offers, request/approval workflow |

**Total:** ~3,807 lines of production-ready code

### Key Features Implemented in Nexus

#### 1. **Schedule Management**
- **CRUD operations** with version control
- **Auto-generation** from shift templates
- **Publish/Regenerate** workflows
- **Schedule versioning** with rollback capability
- **Calendar and timeline views**

#### 2. **Shift Management**
- **Drag-drop shift assignment** (calendar interface)
- **Worker assignment** with conflict detection
- **Clock in/out** functionality
- **Shift status tracking** (scheduled → in_progress → completed)
- **Constraint validation** (max hours, rest periods)

#### 3. **Worker Management**
- **Worker profiles** with scheduling preferences
- **Role assignments** (multi-role support)
- **Availability tracking** (recurring/one-time)
- **Termination workflow**
- **Max hours/consecutive days** constraints

#### 4. **Station Coverage**
- **Real-time coverage analysis** per station
- **Understaffing alerts** (adequate/warning/critical)
- **Timeline visualization** showing coverage gaps
- **Multi-station support** for shift templates
- **Role requirements** per station

#### 5. **Time Off Management**
- **Request submission** with date ranges
- **Approval/denial workflow**
- **Conflict detection** with existing shifts
- **Balance tracking** (available/used days)

#### 6. **Shift Swap Marketplace**
- **Shift offering** by workers
- **Swap requests** with approval
- **Open/directed swap** types
- **Approval queue** for managers

### Custom Hooks in `apps/nexus/src/hooks/schedulehub/` (7 hooks)

```typescript
// TanStack Query hooks for API integration
useScheduleStats.ts       // Dashboard stats, schedules, workers (263 lines)
useStationCoverage.ts     // Real-time coverage analysis (196 lines)
useStations.ts            // Station management (149 lines)
useRoles.ts               // Role management (119 lines)
useShiftTemplates.ts      // Template management (245 lines)
useAvailability.ts        // Availability tracking (176 lines)
useShiftSwaps.ts          // Shift swap marketplace (152 lines)
```

**Total:** 1,300+ lines of custom hook logic

### Reusable Components in `apps/nexus/src/components/schedulehub/` (10+ components)

```typescript
// Complex components
CalendarView.tsx                  // Full calendar with drag-drop (~500 lines)
ShiftAssignmentModal.tsx          // Worker assignment modal (~300 lines)
RolesManagement.tsx               // Role CRUD interface (~250 lines)
WorkerSchedulingConfig.tsx        // Scheduling preferences form (~200 lines)
ShiftSwapApprovalQueue.tsx        // Approval workflow UI (~200 lines)

// Supporting components
RoleDetails.tsx                   // Role detail view
RoleForm.tsx                      // Role create/edit form
AssignWorkersToRole.tsx           // Bulk role assignment
WorkerRoleAssignment.tsx          // Individual role assignment

// Subdirectories
availability/                     // Availability management components
stations/                         // Station management components
```

**Total:** ~2,000+ lines of component code

### Types in `apps/nexus/src/types/schedulehub.ts` (400+ lines)

```typescript
// 30+ TypeScript interfaces
Worker, Schedule, Shift, Station, Role, ShiftTemplate,
Availability, TimeOffRequest, ShiftSwapOffer,
StationCoverage, ScheduleWithShifts, WorkerWithRoles,
CreateScheduleForm, CreateShiftForm, CreateWorkerForm,
// ... and 15+ more
```

---

## Target State: Unified Web App

### Current State in `apps/web/src/features/scheduling/` (5% - placeholder only)

```
features/scheduling/
├── components/              # ❌ Empty folder
├── hooks/                   # ❌ Empty folder
├── pages/                   # ⚠️ 6 placeholder pages (~30 lines total)
│   ├── Dashboard.tsx        # 10 lines - "Placeholder"
│   ├── Schedules.tsx        # 10 lines - "Placeholder"
│   ├── Shifts.tsx           # 10 lines - "Placeholder"
│   ├── Workers.tsx          # 10 lines - "Placeholder"
│   ├── Stations.tsx         # 10 lines - "Placeholder"
│   └── TimeTracking.tsx     # 10 lines - "Placeholder"
├── schedules/               # ❌ Empty folder
├── services/                # ❌ Empty folder (should have ScheduleHubClient wrapper)
├── shifts/                  # ❌ Empty folder
├── time-tracking/           # ❌ Empty folder
├── types/                   # ❌ Empty folder
├── utils/                   # ❌ Empty folder
└── workers/                 # ❌ Empty folder
```

**Gap:** ~7,000 lines of code need to be migrated/created

---

## Migration Requirements by Feature

### 1. **Schedules Feature** (~1,500 lines)

**Source:** `apps/nexus/src/pages/schedulehub/Schedules*.tsx` (1,310 lines)

**Target pages:**
- `features/scheduling/pages/Schedules.tsx` - List/grid view with version management
- `features/scheduling/schedules/ScheduleDetails.tsx` - Calendar view with shift management
- `features/scheduling/schedules/ScheduleBuilder.tsx` - Auto-generation wizard

**Components needed:**
- `features/scheduling/components/ScheduleCard.tsx` - Schedule list item
- `features/scheduling/components/CalendarView.tsx` - Full calendar interface
- `features/scheduling/components/ScheduleVersionControl.tsx` - Version management UI
- `features/scheduling/components/ShiftAssignmentModal.tsx` - Worker assignment

**Hooks needed:**
- `features/scheduling/hooks/useSchedules.ts` - CRUD operations
- `features/scheduling/hooks/useScheduleGeneration.ts` - Auto-generation logic

**Services needed:**
```typescript
// features/scheduling/services/schedules.service.ts
import { ScheduleHubClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const schedulehubClient = new ScheduleHubClient(apiClient);

export const schedulesService = {
  async listSchedules(filters?: any) {
    const response = await schedulehubClient.listSchedules(filters);
    return response.data.schedules || response.data;
  },
  
  async getSchedule(id: string, includeShifts = true) {
    const response = await schedulehubClient.getSchedule(id, includeShifts);
    return response.data.schedule || response.data;
  },
  
  async createSchedule(data: any) {
    const response = await schedulehubClient.createSchedule(data);
    return response.data.schedule || response.data;
  },
  
  async autoGenerateSchedule(data: any) {
    const response = await schedulehubClient.autoGenerateSchedule(data);
    return response.data;
  },
  
  async publishSchedule(id: string) {
    const response = await schedulehubClient.publishSchedule(id);
    return response.data;
  },
  
  async regenerateSchedule(id: string, data: any) {
    const response = await schedulehubClient.regenerateSchedule(id, data);
    return response.data;
  },
  
  // ... more methods
};
```

### 2. **Workers Feature** (~800 lines)

**Source:** `apps/nexus/src/pages/schedulehub/Workers*.tsx` (313 lines + components)

**Target pages:**
- `features/scheduling/pages/Workers.tsx` - Worker list with filters
- `features/scheduling/workers/WorkerDetails.tsx` - Profile with scheduling config
- `features/scheduling/workers/AvailabilityManagement.tsx` - Availability tracking

**Components needed:**
- `features/scheduling/components/WorkerCard.tsx`
- `features/scheduling/components/WorkerSchedulingConfig.tsx`
- `features/scheduling/components/AvailabilityEditor.tsx`
- `features/scheduling/components/WorkerRoleAssignment.tsx`

**Hooks needed:**
- `features/scheduling/hooks/useWorkers.ts`
- `features/scheduling/hooks/useAvailability.ts`

### 3. **Shifts Feature** (~600 lines)

**Target pages:**
- `features/scheduling/pages/Shifts.tsx` - Shift list/calendar view
- `features/scheduling/shifts/ShiftSwapMarketplace.tsx` - Swap marketplace

**Components needed:**
- `features/scheduling/components/ShiftCard.tsx`
- `features/scheduling/components/ShiftSwapOffer.tsx`
- `features/scheduling/components/ShiftSwapApprovalQueue.tsx`

**Hooks needed:**
- `features/scheduling/hooks/useShifts.ts`
- `features/scheduling/hooks/useShiftSwaps.ts`

### 4. **Stations Feature** (~400 lines)

**Target pages:**
- `features/scheduling/pages/Stations.tsx` - Station management

**Components needed:**
- `features/scheduling/components/StationCard.tsx`
- `features/scheduling/components/StationCoverageIndicator.tsx`
- `features/scheduling/components/StationRequirements.tsx`

**Hooks needed:**
- `features/scheduling/hooks/useStations.ts`
- `features/scheduling/hooks/useStationCoverage.ts`

### 5. **Time Tracking Feature** (~300 lines)

**Target pages:**
- `features/scheduling/pages/TimeTracking.tsx` - Clock in/out interface
- `features/scheduling/time-tracking/TimeOffRequests.tsx` - Time-off management

**Components needed:**
- `features/scheduling/components/ClockInOut.tsx`
- `features/scheduling/components/TimeOffRequestForm.tsx`
- `features/scheduling/components/TimeOffApprovalQueue.tsx`

**Hooks needed:**
- `features/scheduling/hooks/useTimeTracking.ts`
- `features/scheduling/hooks/useTimeOff.ts`

### 6. **Dashboard** (~400 lines)

**Target pages:**
- `features/scheduling/pages/Dashboard.tsx` - ScheduleHub overview

**Components needed:**
- `features/scheduling/components/DashboardStatCard.tsx`
- `features/scheduling/components/UpcomingShifts.tsx`
- `features/scheduling/components/PendingApprovals.tsx`
- `features/scheduling/components/CoverageOverview.tsx`

---

## Technical Challenges & Considerations

### 1. **Real-Time Coverage Analysis**

**Challenge:** Live updates of station coverage as shifts are assigned/unassigned.

**Solution:**
- Use TanStack Query with aggressive cache invalidation
- WebSocket support for real-time updates (future enhancement)
- Optimistic UI updates for drag-drop operations

### 2. **Complex Calendar Interface**

**Challenge:** Full-featured calendar with drag-drop, multi-station view, constraint checking.

**Solution:**
- Migrate existing `CalendarView.tsx` component (~500 lines)
- Consider using `react-big-calendar` or `FullCalendar` library
- Implement custom drag-drop logic with `@dnd-kit/core`

### 3. **Auto-Generation Algorithm**

**Challenge:** Complex scheduling algorithm with worker availability, station requirements, role constraints.

**Solution:**
- Backend algorithm already fully implemented (ScheduleService)
- Frontend needs wizard UI with step-by-step configuration
- Real-time feedback on coverage gaps and constraint violations

### 4. **Multi-Station Templates**

**Challenge:** Templates can specify multiple stations, requiring complex UI.

**Solution:**
- Multi-select station picker in template editor
- Visual representation of template coverage across stations
- Validation against station role requirements

### 5. **Constraint Checking**

**Challenge:** Validate worker assignments against:
- Max hours per week/day
- Minimum rest hours between shifts
- Role requirements per station
- Overlapping shifts
- Time-off conflicts

**Solution:**
- Backend validation already implemented
- Frontend should provide real-time feedback before submission
- Visual indicators for constraint violations

---

## Migration Strategy (Phased Approach)

### Phase 3D.1: Core Infrastructure (2-3 days)

**Goal:** Set up service layer and basic hooks

1. **Create service wrappers** in `features/scheduling/services/`:
   ```typescript
   schedules.service.ts    // ScheduleHubClient wrapper
   workers.service.ts
   shifts.service.ts
   stations.service.ts
   availability.service.ts
   timeOff.service.ts
   ```

2. **Implement core hooks** in `features/scheduling/hooks/`:
   ```typescript
   useSchedules.ts         // Based on useScheduleStats.ts
   useWorkers.ts
   useShifts.ts
   useStations.ts
   useStationCoverage.ts
   ```

3. **Migrate types** from Nexus to `features/scheduling/types/`

### Phase 3D.2: Dashboard & Lists (3-4 days)

**Goal:** Implement overview and list pages

1. **Dashboard page** with stats cards and quick actions
2. **Schedules list** with filters and version management
3. **Workers list** with filters and search
4. **Stations list** with coverage indicators

### Phase 3D.3: Schedule Details & Calendar (5-6 days)

**Goal:** Core scheduling interface

1. **ScheduleDetails page** with calendar view
2. **CalendarView component** (migrate/rewrite ~500 lines)
3. **ShiftAssignmentModal** for worker assignment
4. **Drag-drop functionality** for shift management
5. **Coverage analysis** integration

### Phase 3D.4: Auto-Generation & Templates (4-5 days)

**Goal:** Schedule generation wizard

1. **ScheduleBuilder page** with multi-step wizard
2. **Template selection** interface
3. **Constraint configuration** UI
4. **Coverage preview** before generation
5. **Conflict resolution** UI

### Phase 3D.5: Advanced Features (4-5 days)

**Goal:** Worker management and marketplace

1. **WorkerDetails page** with scheduling config
2. **AvailabilityManagement** calendar interface
3. **ShiftSwapMarketplace** with offer/request workflow
4. **TimeOffRequests** with approval queue
5. **Role management** interface

### Phase 3D.6: Time Tracking (2-3 days)

**Goal:** Clock in/out and time management

1. **TimeTracking page** with clock in/out
2. **Actual vs scheduled** time comparison
3. **Time-off balance** tracking

### Phase 3D.7: Testing & Polish (3-4 days)

**Goal:** QA and refinement

1. **E2E tests** for critical workflows
2. **Edge case handling** (constraint violations, conflicts)
3. **Performance optimization** (large schedules, many workers)
4. **Accessibility** improvements
5. **Error handling** and empty states

---

## Estimated Effort

| Phase | Tasks | Estimated Time | Complexity |
|-------|-------|----------------|------------|
| **3D.1: Infrastructure** | Services, hooks, types | 2-3 days | Medium |
| **3D.2: Dashboard & Lists** | 4 list pages | 3-4 days | Medium |
| **3D.3: Schedule Details** | Calendar, drag-drop | 5-6 days | High |
| **3D.4: Auto-Generation** | Wizard, templates | 4-5 days | High |
| **3D.5: Advanced Features** | Workers, marketplace | 4-5 days | High |
| **3D.6: Time Tracking** | Clock in/out | 2-3 days | Medium |
| **3D.7: Testing & Polish** | QA, optimization | 3-4 days | Medium |
| **Total** | | **23-30 days** | **Very High** |

**Critical Path:** Calendar interface and auto-generation are highest risk/effort.

---

## Dependencies

### Blocking Issues
- ❌ **TypeScript compile errors** must be resolved first (64 errors currently)
- ❌ **Centralized API client** must be fully integrated (@recruitiq/api-client)

### External Dependencies
- ✅ Backend ScheduleHub API fully implemented
- ✅ Database schema complete with all tables
- ✅ ScheduleHubClient in @recruitiq/api-client (needs verification)
- ⚠️ Calendar library decision needed (react-big-calendar vs FullCalendar vs custom)
- ⚠️ Drag-drop library (@dnd-kit/core recommended)

### Cross-Module Integration
- **HRIS Integration:** Workers are linked to `hris.employee` table
- **Payroll Integration:** Time tracking data exports to Paylinq for payroll processing
- **Notification System:** Shift swap approvals, time-off requests need notifications

---

## Success Criteria

### Functional Requirements
- [ ] All 9 pages migrated with feature parity
- [ ] Calendar drag-drop interface working
- [ ] Auto-generation wizard functional
- [ ] Constraint validation working (max hours, rest periods, conflicts)
- [ ] Station coverage analysis real-time
- [ ] Shift swap marketplace operational
- [ ] Time-off approval workflow complete
- [ ] Clock in/out functionality
- [ ] Version control for schedules

### Technical Requirements
- [ ] All services use ScheduleHubClient from @recruitiq/api-client
- [ ] All hooks use TanStack Query
- [ ] Zero TypeScript errors
- [ ] Coverage > 70% (unit + integration tests)
- [ ] E2E tests for critical workflows
- [ ] Performance: Calendar loads < 1s for 50 workers, 200 shifts
- [ ] Accessibility: WCAG 2.1 AA compliant

### Documentation Requirements
- [ ] Migration guide for legacy Nexus users
- [ ] Component library documentation
- [ ] API integration examples
- [ ] Troubleshooting guide

---

## Risks & Mitigations

### High Risk: Calendar Complexity

**Risk:** Custom calendar with drag-drop is complex and error-prone.

**Mitigation:**
1. Evaluate existing libraries (FullCalendar, react-big-calendar)
2. Consider migrating existing Nexus CalendarView.tsx with minimal changes
3. Implement in isolation with comprehensive tests before integration

### Medium Risk: Auto-Generation Algorithm

**Risk:** Complex wizard UI with many configuration options.

**Mitigation:**
1. Backend algorithm already works - focus on UI/UX
2. Multi-step wizard with validation at each step
3. Real-time preview of generation results

### Medium Risk: Performance with Large Schedules

**Risk:** Slow rendering with 100+ workers and 1000+ shifts.

**Mitigation:**
1. Virtual scrolling for large lists
2. Pagination and lazy loading
3. Optimistic updates for better perceived performance
4. Caching strategies with TanStack Query

### Low Risk: Time-Off Conflicts

**Risk:** Complex conflict detection between shifts and time-off.

**Mitigation:**
1. Backend already handles validation
2. Frontend displays conflicts clearly
3. Allow override with warnings

---

## Recommendations

### Immediate Actions (Week 1)
1. **Fix TypeScript errors** (64 errors blocking build)
2. **Verify ScheduleHubClient** exists in @recruitiq/api-client
3. **Create service wrappers** for all ScheduleHub features
4. **Migrate types** from Nexus to unified web

### Short-Term (Weeks 2-3)
1. **Implement dashboard and lists** (quick wins)
2. **Build calendar interface** (highest priority)
3. **Test drag-drop** functionality thoroughly

### Medium-Term (Weeks 4-5)
1. **Auto-generation wizard** with template support
2. **Worker management** with availability tracking
3. **Shift swap marketplace**

### Long-Term (Week 6+)
1. **Time tracking** features
2. **E2E testing** suite
3. **Performance optimization**
4. **Archive legacy Nexus app**

---

## Conclusion

**Phase 3D (Scheduling Module) is the MOST COMPLEX** consolidation task due to:

- ✅ **Backend fully ready** - 67+ endpoints, 22 tables, 9 services
- ⚠️ **Frontend gap is massive** - ~7,000 lines need migration
- 🔴 **High complexity features** - calendar, drag-drop, auto-generation
- 🟡 **Critical dependencies** - TypeScript errors must be fixed first

**Estimate:** 23-30 working days (~5-6 weeks) for full migration

**Priority:** HIGH - ScheduleHub is a core product and many customers depend on it

**Recommendation:** Start with infrastructure (services/hooks) and basic lists, then tackle the complex calendar interface last with dedicated focus.
