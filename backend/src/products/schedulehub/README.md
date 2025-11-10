# ScheduleHub - Workforce Scheduling & Optimization Platform

**Product ID:** `schedulehub`  
**Version:** 1.0.0  
**Type:** Standalone Product Module  
**Integration:** Backend module with UI integrated into Nexus HRIS

---

## Overview

ScheduleHub is an advanced workforce scheduling platform designed for businesses with complex staffing needs. It provides station-based scheduling, role matching, shift optimization, demand forecasting, and an employee-driven shift marketplace.

### Key Features

1. **Station-Based Scheduling** - Assign employees to specific workstations
2. **Role-Based Scheduling** - Match employee skills to shift requirements
3. **Shift Swapping Marketplace** - Employee-driven shift exchanges with approval workflow
4. **Schedule Optimization** - AI-powered automated schedule generation
5. **Demand Forecasting** - Predict staffing needs based on historical data

---

## Architecture

### Backend Structure

```
backend/src/products/schedulehub/
├── config/
│   └── productConfig.js          # Product metadata, features, tiers
├── services/                      # Business logic layer
│   ├── scheduleService.js
│   ├── stationService.js
│   ├── roleService.js
│   ├── swapService.js
│   ├── optimizationService.js
│   └── demandForecastService.js
├── controllers/                   # API endpoint handlers
│   ├── scheduleController.js
│   ├── stationController.js
│   ├── roleController.js
│   ├── swapController.js
│   ├── optimizationController.js
│   └── demandForecastController.js
├── repositories/                  # Data access layer
│   ├── scheduleRepository.js
│   ├── stationRepository.js
│   ├── roleRepository.js
│   ├── swapRepository.js
│   ├── optimizationRepository.js
│   └── demandRepository.js
├── algorithms/                    # Scheduling algorithms
│   ├── optimization/
│   │   ├── greedyScheduler.js
│   │   ├── geneticScheduler.js
│   │   └── constraintSolver.js
│   └── forecasting/
│       ├── movingAverage.js
│       ├── exponentialSmoothing.js
│       └── seasonalDecomposition.js
├── integrations/                  # Cross-product integrations
│   ├── paylinqIntegration.js     # Export time data to Paylinq
│   ├── nexusIntegration.js       # Import employee data from Nexus
│   └── externalSystems/
│       ├── posIntegration.js
│       └── biometricDevices.js
├── routes/
│   └── index.js                  # API route definitions
└── utils/
    └── dtoMapper.js              # Data transformation utilities
```

### Frontend Integration

ScheduleHub UI is integrated within the **Nexus HRIS application**:

```
apps/nexus/
└── src/
    └── modules/
        └── scheduling/           # ScheduleHub UI module
            ├── pages/
            │   ├── Dashboard.tsx
            │   ├── ScheduleBuilder.tsx
            │   ├── Stations.tsx
            │   ├── SwapMarketplace.tsx
            │   └── Optimization.tsx
            ├── components/
            │   ├── StationGrid/
            │   ├── ShiftCard/
            │   └── SwapOffer/
            └── context/
                └── ScheduleContext.tsx
```

### Database Schema

ScheduleHub uses the `scheduling` schema (separate from `payroll`):

- **Core Tables:** schedules, shifts, stations, roles
- **Advanced Tables:** swap_marketplace, optimization_history, demand_forecasts
- **Integration Tables:** employee_roles, shift_coverage_requirements

---

## Product Configuration

### Tiers

| Tier | Price | Max Employees | Features |
|------|-------|---------------|----------|
| **Starter** | $49/mo + $2/employee | 25 | Basic scheduling, stations, availability |
| **Professional** | $199/mo + $3/employee | 100 | + Marketplace, basic optimization, mobile app |
| **Enterprise** | Custom | Unlimited | + AI optimization, forecasting, white-label |

### Permissions

- `schedules.view`, `schedules.create`, `schedules.edit`, `schedules.delete`
- `stations.manage`, `roles.manage`
- `swaps.view`, `swaps.request`, `swaps.approve`, `swaps.reject`
- `optimization.run`, `forecasting.view`
- `analytics.view`, `reports.export`

---

## Integration Architecture

### Event-Driven Communication

ScheduleHub publishes events to the integration bus:

```javascript
// Published Events
'schedule.created'
'schedule.published'
'shift.started'
'shift.completed'
'swap.approved'
'employee.assigned'
```

ScheduleHub subscribes to events from other products:

```javascript
// Subscribed Events (from Nexus)
'employee.created'
'employee.updated'
'employee.terminated'
```

### Data Flow

**Schedule → Payroll:**
1. Employee clocks in/out in ScheduleHub
2. ScheduleHub publishes `shift.completed` event
3. Paylinq subscribes and creates `time_attendance_event`
4. Payroll calculation uses the time data

**Nexus → ScheduleHub:**
1. HR adds employee in Nexus
2. Nexus publishes `employee.created` event
3. ScheduleHub subscribes and caches employee info
4. Manager can now schedule the employee

---

## API Endpoints

All ScheduleHub APIs are prefixed with `/api/schedulehub`:

### Schedules
- `GET /api/schedulehub/schedules` - List schedules
- `POST /api/schedulehub/schedules` - Create schedule
- `GET /api/schedulehub/schedules/:id` - Get schedule details
- `PUT /api/schedulehub/schedules/:id` - Update schedule
- `DELETE /api/schedulehub/schedules/:id` - Delete schedule
- `POST /api/schedulehub/schedules/:id/publish` - Publish schedule

### Stations
- `GET /api/schedulehub/stations` - List stations
- `POST /api/schedulehub/stations` - Create station
- `GET /api/schedulehub/stations/:id` - Get station
- `PUT /api/schedulehub/stations/:id` - Update station

### Roles
- `GET /api/schedulehub/roles` - List roles
- `POST /api/schedulehub/roles` - Create role
- `GET /api/schedulehub/roles/:id` - Get role

### Swaps
- `GET /api/schedulehub/swaps/marketplace` - Browse marketplace
- `POST /api/schedulehub/swaps/offers` - Create swap offer
- `POST /api/schedulehub/swaps/:id/approve` - Approve swap
- `POST /api/schedulehub/swaps/:id/reject` - Reject swap

### Optimization
- `POST /api/schedulehub/optimization/generate` - Generate optimal schedule
- `GET /api/schedulehub/optimization/history` - View optimization history

### Forecasting
- `POST /api/schedulehub/forecasting/generate` - Generate demand forecast
- `GET /api/schedulehub/forecasting/:id` - Get forecast details

---

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis (optional, for caching)

### Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Run database migrations:
```bash
npm run migrate:up
```

3. Start development server:
```bash
npm run dev
```

### Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/recruitiq

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Integration
NEXUS_API_URL=http://localhost:3000/api/nexus
PAYLINQ_API_URL=http://localhost:3000/api/paylinq

# Optimization
OPTIMIZATION_MAX_RUNTIME_MS=30000
OPTIMIZATION_ALGORITHM=greedy  # greedy|genetic|constraint
```

---

## Performance Targets

- API response time: <200ms (P95)
- Schedule generation: <30s for 50 employees
- Concurrent users: 500+
- Database: Support 100K+ schedules
- Uptime: 99.9%

---

## Security

- Row-level security (multi-tenant isolation)
- Role-based access control (RBAC)
- API authentication via JWT tokens
- Data encryption at rest and in transit
- GDPR/CCPA compliant

---

## Phase 2 Enhancements (Future)

- Advanced genetic algorithm optimization
- Machine learning-based demand forecasting
- Multi-location scheduling
- Biometric device integration
- Advanced analytics dashboard
- Mobile native apps (iOS/Android)
- White-label customization

---

## Documentation

- [Product Specification](../../../docs/SCHEDULEHUB_PRODUCT_SPEC.md)
- [Architecture Decision](../../../docs/SCHEDULING_MODULE_ARCHITECTURE_DECISION.md)
- [Implementation Plan](../../../docs/ADVANCED_SCHEDULING_IMPLEMENTATION_PLAN.md)
- [API Documentation](./API.md) (to be created)

---

## Support

For questions or issues:
- Technical Lead: [name@company.com]
- Documentation: [link to docs]
- Slack: #schedulehub-dev

---

**Status:** ✅ Phase 16.3 Complete - Database, Services, Controllers & Routes Implemented  
**Next Steps:** Phase 16.4 Testing, then Phase 16.5 Frontend

---

## Implementation Status

### ✅ Completed (Phase 16.1-16.3)

#### Database Schema (16 Tables)
- **Location:** `backend/src/database/schedulehub-schema.sql` (~850 lines)
- **Tables:** workers, roles, worker_roles, stations, station_role_requirements, schedules, shifts, worker_availability, time_off_requests, shift_swap_offers, shift_swap_requests, swap_credits, coverage_requirements, demand_history, demand_forecasts, optimization_history, service_level_targets
- **Features:** Full indexes, triggers, constraints, soft deletes

#### Backend Services (8 Services, ~3,500 lines)
- `workerService.js` - Worker CRUD and Nexus sync
- `scheduleService.js` - Schedule and shift lifecycle  
- `availabilityService.js` - Availability tracking
- `timeOffService.js` - Time off workflows
- `shiftTradeService.js` - Shift swap marketplace
- `roleService.js` - Role management
- `stationService.js` - Station management
- `shiftService.js` - Time tracking with Paylinq integration (pre-existing)

#### Controllers (7 Controllers)
- `workerController.js` - Worker HTTP handlers
- `scheduleController.js` - Schedule HTTP handlers
- `availabilityController.js` - Availability HTTP handlers
- `timeOffController.js` - Time off HTTP handlers
- `shiftTradeController.js` - Swap HTTP handlers
- `roleController.js` - Role HTTP handlers
- `stationController.js` - Station HTTP handlers

#### API Routes
- **Location:** `backend/src/products/schedulehub/routes/index.js`
- **Mounted at:** `/api/schedulehub` in `server.js`
- **Authentication:** JWT required on all endpoints
- **Documentation:** See [SCHEDULEHUB_API.md](./SCHEDULEHUB_API.md)

#### Cross-Product Integrations
- **Nexus HRIS:** Workers sync from employees table
- **Paylinq:** Clock-out creates time entries

### ⏳ Pending

#### Phase 16.4: Testing
- Unit tests for all services
- Integration tests for API endpoints
- Cross-product integration tests
- Load testing

#### Phase 16.5: Frontend
- React schedule builder UI
- Drag-drop shift assignment
- Availability calendar
- Swap marketplace interface
- Mobile-responsive design
