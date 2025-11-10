# Nexus - Human Resource Information System (HRIS)

**Product ID:** `nexus`  
**Version:** 1.0.0  
**Type:** Core HR Platform  
**Integration:** Foundational system for employee data across all products

---

## Overview

Nexus is an enterprise-grade Human Resource Information System (HRIS) that manages the complete employee lifecycle from hiring to termination. It serves as the single source of truth for employee data across the RecruitIQ platform.

### Key Capabilities

1. **Employee Lifecycle Management** - Complete employee records with personal and employment information
2. **Contract Management** - Sophisticated contract lifecycle with sequence-based progressions
3. **Performance Management** - Reviews, goals, continuous feedback, and development plans
4. **Benefits Administration** - Plans, enrollment, and tracking
5. **Time Off Management** - Flexible policies with JSON-based accrual rules
6. **Attendance Tracking** - Clock in/out, integration with time-off
7. **Document Management** - Employee documents with compliance tracking
8. **Rule Engine** - Policy automation (MVP: JSON-based rules)
9. **Organizational Structure** - Departments, locations, hierarchy management
10. **Audit & Compliance** - Complete audit trail for regulatory compliance

---

## Architecture

### Backend Structure

```
backend/src/products/nexus/
├── config/
│   └── productConfig.js              # Product metadata, tiers, permissions
├── repositories/                      # Data access layer (30+ tables)
│   ├── userAccountRepository.js
│   ├── employeeRepository.js
│   ├── departmentRepository.js
│   ├── locationRepository.js
│   ├── contractRepository.js
│   ├── contractSequenceRepository.js
│   ├── performanceReviewRepository.js
│   ├── goalRepository.js
│   ├── feedbackRepository.js
│   ├── benefitsRepository.js
│   ├── timeOffRepository.js
│   ├── timeOffBalanceRepository.js
│   ├── attendanceRepository.js
│   ├── ruleEngineRepository.js
│   └── documentRepository.js
├── services/                          # Business logic
│   ├── employeeService.js            # Employee lifecycle
│   ├── contractManagementService.js  # Contract sequences
│   ├── performanceService.js         # Reviews and goals
│   ├── benefitsService.js            # Benefits administration
│   ├── timeOffService.js             # Leave management
│   ├── attendanceService.js          # Attendance tracking
│   ├── ruleEngineService.js          # Policy automation
│   └── documentService.js            # Document management
├── controllers/                       # API handlers
│   ├── employeeController.js
│   ├── contractController.js
│   ├── performanceController.js
│   ├── benefitsController.js
│   ├── timeOffController.js
│   ├── attendanceController.js
│   └── documentController.js
├── integrations/                      # Cross-product integration
│   ├── candidateHiredHandler.js      # From RecruitIQ
│   ├── payrollIntegration.js         # To Paylinq
│   └── schedulingIntegration.js      # To ScheduleHub
├── routes/
│   └── index.js                      # API routes
└── utils/
    ├── dtoMapper.js
    └── accrualCalculator.js          # Time-off accrual logic
```

### Frontend Structure

Nexus has its own React application that serves as the HR portal:

```
apps/nexus/
├── package.json
├── vite.config.ts
├── src/
│   ├── App.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx             # HR dashboard
│   │   ├── Employees/
│   │   │   ├── EmployeeList.tsx
│   │   │   ├── EmployeeDetail.tsx
│   │   │   └── EmployeeForm.tsx
│   │   ├── Contracts/
│   │   ├── Performance/
│   │   ├── Benefits/
│   │   ├── TimeOff/
│   │   ├── Attendance/
│   │   └── OrgChart.tsx
│   ├── modules/
│   │   └── scheduling/               # ScheduleHub UI (future)
│   │       ├── pages/
│   │       └── components/
│   ├── components/
│   │   ├── EmployeeCard/
│   │   ├── ContractTimeline/
│   │   ├── OrgChartVisualization/
│   │   └── TimeOffCalendar/
│   └── context/
│       └── EmployeeContext.tsx
└── tests/
```

### Database Schema

Nexus uses the `hris` schema with 23 core tables:

#### Core Tables
- `user_account` - Authentication (separate from employee identity)
- `employee` - Employee core information
- `department` - Organizational departments
- `location` - Physical locations

#### Contract Management
- `contract_sequence_policy` - Contract progression rules
- `contract_sequence_step` - Sequence stages
- `contract` - Individual employment contracts

#### Performance Management
- `review_template` - Review templates
- `performance_review` - Employee reviews
- `performance_goal` - Individual goals
- `feedback` - Continuous feedback

#### Benefits
- `benefits_plan` - Available benefits
- `employee_benefit_enrollment` - Employee enrollments

#### Time Off
- `time_off_type` - Leave types and policies
- `employee_time_off_balance` - Balance tracking
- `time_off_request` - Leave requests
- `time_off_accrual_history` - Accrual transactions

#### Attendance
- `attendance_record` - Daily attendance tracking

#### Rule Engine
- `rule_definition` - Policy rules (JSON-based)
- `rule_execution_history` - Execution audit trail

#### Documents
- `document_category` - Document types
- `employee_document` - Document storage

#### Audit
- `audit_log` - Change tracking for compliance

---

## Product Tiers

| Tier | Price | Max Employees | Key Features |
|------|-------|---------------|--------------|
| **Starter** | $99/mo + $3/employee | 50 | Employee mgmt, basic contracts, time-off, documents |
| **Professional** | $299/mo + $5/employee | 250 | + Performance, benefits, attendance, org chart, mobile |
| **Enterprise** | Custom | Unlimited | + Rule engine, advanced analytics, custom workflows, SLA |

---

## Integration Architecture

### Event-Driven Communication

**Published Events:**
```javascript
'employee.created'        // New employee added
'employee.updated'        // Employee data changed
'employee.terminated'     // Employee termination
'contract.expired'        // Contract expiring soon
'timeoff.approved'        // Leave approved
'attendance.clocked_in'   // Employee clocked in
```

**Subscribed Events:**
```javascript
'candidate.hired'         // From RecruitIQ → auto-create employee
'organization.updated'    // Organization settings changed
```

### Data Flow Patterns

**RecruitIQ → Nexus (Hiring Flow):**
1. Candidate marked as "Hired" in RecruitIQ
2. RecruitIQ publishes `candidate.hired` event
3. Nexus `candidateHiredHandler` receives event
4. Auto-creates employee record in Nexus
5. Triggers onboarding workflow

**Nexus → Paylinq (Payroll Sync):**
1. Employee created/updated in Nexus
2. Nexus publishes `employee.created` or `employee.updated`
3. Paylinq subscribes and updates payroll records
4. Salary, department, tax info synced

**Nexus → ScheduleHub (Scheduling):**
1. Employee added to Nexus
2. Nexus publishes `employee.created`
3. ScheduleHub caches employee data
4. Manager can now schedule the employee

---

## API Endpoints

All Nexus APIs are prefixed with `/api/nexus`:

### Employees
- `GET /api/nexus/employees` - List employees
- `POST /api/nexus/employees` - Create employee
- `GET /api/nexus/employees/:id` - Get employee details
- `PUT /api/nexus/employees/:id` - Update employee
- `DELETE /api/nexus/employees/:id` - Soft delete employee
- `POST /api/nexus/employees/:id/terminate` - Terminate employment

### Contracts
- `GET /api/nexus/contracts` - List contracts
- `POST /api/nexus/contracts` - Create contract
- `GET /api/nexus/contracts/:id` - Get contract
- `PUT /api/nexus/contracts/:id` - Update contract
- `POST /api/nexus/contracts/:id/renew` - Renew contract
- `GET /api/nexus/contracts/expiring` - Get expiring contracts

### Performance
- `GET /api/nexus/reviews` - List reviews
- `POST /api/nexus/reviews` - Create review
- `GET /api/nexus/reviews/:id` - Get review
- `PUT /api/nexus/reviews/:id` - Update review
- `POST /api/nexus/reviews/:id/submit` - Submit review
- `GET /api/nexus/goals` - List goals
- `POST /api/nexus/goals` - Create goal

### Time Off
- `GET /api/nexus/timeoff/types` - List time-off types
- `POST /api/nexus/timeoff/requests` - Request time off
- `GET /api/nexus/timeoff/requests/:id` - Get request
- `POST /api/nexus/timeoff/requests/:id/approve` - Approve request
- `POST /api/nexus/timeoff/requests/:id/reject` - Reject request
- `GET /api/nexus/timeoff/balance/:employeeId` - Get balance

### Attendance
- `POST /api/nexus/attendance/clock-in` - Clock in
- `POST /api/nexus/attendance/clock-out` - Clock out
- `GET /api/nexus/attendance` - Get attendance records
- `GET /api/nexus/attendance/summary` - Attendance summary

### Organization
- `GET /api/nexus/departments` - List departments
- `POST /api/nexus/departments` - Create department
- `GET /api/nexus/locations` - List locations
- `POST /api/nexus/locations` - Create location
- `GET /api/nexus/org-chart` - Get org chart data

---

## Key Features Detail

### Contract Sequence Management

Automate contract progression through predefined stages:

```javascript
// Example: Probation → Fixed Term → Permanent
Policy: "Standard Employee Progression"
  Step 1: Probation (3 months) → auto-renew to Step 2
  Step 2: Fixed Term (12 months) → require review, renew to Step 3
  Step 3: Permanent (indefinite)
```

### Time-Off Accrual Rules

Flexible JSON-based accrual configuration:

```json
{
  "accrualType": "monthly",
  "accrualAmount": 1.25,  // days per month
  "startDate": "hire_date",
  "maxBalance": 30,
  "carryover": {
    "enabled": true,
    "maxDays": 5,
    "expiryMonths": 3
  }
}
```

### Rule Engine (MVP)

Simple JSON-based rule execution:

```javascript
Rule: "Auto-approve single-day leave requests"
Condition: { "timeoff.days": { "$lte": 1 } }
Action: { "approve": true, "notify": ["employee", "manager"] }
```

---

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- React 18+

### Setup Backend

```bash
cd backend
npm install
npm run migrate:up  # Run database migrations
npm run seed        # Seed initial data
npm run dev         # Start server
```

### Setup Frontend

```bash
cd apps/nexus
pnpm install
pnpm dev            # Start dev server
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/recruitiq

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRY=7d

# File Storage
DOCUMENT_STORAGE_PATH=/var/uploads/nexus
MAX_DOCUMENT_SIZE=10485760  # 10MB

# Integration
RECRUITIQ_API_URL=http://localhost:3000/api/recruitiq
PAYLINQ_API_URL=http://localhost:3000/api/paylinq
SCHEDULEHUB_API_URL=http://localhost:3000/api/schedulehub

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
```

---

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Coverage Targets

- Repository layer: 90%+
- Service layer: 90%+
- Controller layer: 85%+
- Overall: 90%+

---

## Performance & Scale

### Performance Targets

- API response time: <200ms (P95)
- Employee search: <100ms
- Org chart generation: <500ms for 1000 employees
- Concurrent users: 1000+
- Max employees: 10,000+

### Optimization Strategies

- Database indexes on all foreign keys
- Materialized views for org chart
- Redis caching for frequently accessed data
- Lazy loading for large datasets
- Virtual scrolling in UI

---

## Security & Compliance

### Security Features

- Row-level security (multi-tenant isolation)
- Role-based access control (RBAC)
- Field-level permissions (sensitive data)
- Audit logging (all changes tracked)
- Encrypted document storage
- MFA support

### Compliance

- ✅ GDPR compliant (data privacy)
- ✅ CCPA compliant (California privacy)
- ⏳ SOC 2 certification (in progress)
- ⏳ ISO 27001 (planned)
- Optional: HIPAA for healthcare

---

## Phase 2 Enhancements (Future)

### Advanced Rule Engine
- Complex condition evaluation
- Multi-step workflow automation
- External system triggers

### Advanced Analytics
- Predictive attrition modeling
- Workforce planning forecasts
- Skill gap analysis

### Mobile Apps
- Native iOS and Android apps
- Offline mode support
- Biometric authentication

### Advanced Performance
- 360-degree feedback
- Competency frameworks
- Succession planning

---

## Documentation

- [Database Schema](../../database/nexus-hris-schema.sql)
- [Phase 11: Database Implementation](../../../docs/implementation/PHASE_11_NEXUS_DATABASE.md)
- [Phase 12: Backend Implementation](../../../docs/implementation/PHASE_12_NEXUS_BACKEND.md)
- [Phase 13: Testing](../../../docs/implementation/PHASE_13_NEXUS_TESTING.md)
- [API Documentation](./API.md) (to be created)

---

## Support & Contributing

### Team
- Product Owner: [name@company.com]
- Tech Lead: [name@company.com]
- Slack: #nexus-dev

### Contributing
- Follow [BACKEND_STANDARDS.md](../../../docs/BACKEND_STANDARDS.md)
- Write tests for all new features
- Update documentation
- Code review required

---

**Status:** 🚧 Phase 11 Complete (Database Schema), Phase 12 In Progress (Backend Implementation)  
**Next Milestone:** Complete repositories and services, then create Nexus frontend app
