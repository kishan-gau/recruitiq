# Multi-Product SaaS Architecture - Quick Start Guide

**RecruitIQ Platform Transformation**  
**Created:** November 3, 2025  
**Version:** 2.0

---

## 🚀 Getting Started

You've been tasked with transforming RecruitIQ from a single-product ATS into a multi-product SaaS platform. This guide will help you navigate the extensive planning documentation.

### Critical Clarifications

🔴 **Customer-Facing Apps:** `recruitiq/`, `paylinq/`, `nexus/` - Separate React apps for customers  
🔵 **Platform Admin Portal:** `portal/` - Separate admin app for platform owner (NOT for customers)  
🟢 **Unified Backend:** Single Node.js backend with modular product structure  
🟡 **Shared UI Library:** `shared-ui/` - Component library used by all frontend apps

---

## 📚 Documentation Structure

```
RecruitIQ/
│
├── MULTI_PRODUCT_SAAS_ARCHITECTURE.md        # Original architecture design (read first)
├── MULTI_PRODUCT_IMPLEMENTATION_PLAN.md      # High-level implementation plan (read second)
└── docs/
    ├── implementation/
    │   ├── README.md                          # Implementation guide (read third)
    │   ├── PHASE_01_ANALYSIS.md              # Detailed phase docs
    │   ├── PHASE_02_CORE_INFRASTRUCTURE.md   # ...
    │   ├── PHASE_03_DATABASE_SCHEMA.md       # ...
    │   ├── PHASE_04_through_30.md            # Use PHASE_TEMPLATE.md to create
    │   └── PHASE_TEMPLATE.md                  # Template for remaining phases
    │
    └── [All Standards Documents]              # Must follow for all implementation
        ├── CODING_STANDARDS.md
        ├── BACKEND_STANDARDS.md
        ├── DATABASE_STANDARDS.md
        ├── SECURITY_STANDARDS.md
        ├── TESTING_STANDARDS.md
        ├── FRONTEND_STANDARDS.md
        ├── API_STANDARDS.md
        ├── PERFORMANCE_STANDARDS.md
        └── DOCUMENTATION_STANDARDS.md
```

---

## 📖 Reading Order

### 1. Understand the Vision (30 minutes)
👉 **Read:** [MULTI_PRODUCT_SAAS_ARCHITECTURE.md](../MULTI_PRODUCT_SAAS_ARCHITECTURE.md)

This document explains:
- Why we're doing this transformation
- What the target architecture looks like
- How products will work together
- Technical patterns and examples

### 2. Understand the Plan (20 minutes)
👉 **Read:** [MULTI_PRODUCT_IMPLEMENTATION_PLAN.md](../MULTI_PRODUCT_IMPLEMENTATION_PLAN.md)

This document provides:
- 30 phases of implementation
- Timeline and dependencies
- Team structure
- Success criteria

### 3. Understand the Standards (2 hours)
👉 **Read:** [docs/CODING_STANDARDS.md](../docs/CODING_STANDARDS.md) + all referenced standards

These documents are **MANDATORY** for all code:
- How to structure code (layers, patterns)
- How to write secure code
- How to test code (80%+ coverage required)
- How to document code

### 4. Understand Your Phase (1 hour per phase)
👉 **Read:** Your assigned phase document in [docs/implementation/](./docs/implementation/)

Detailed breakdown of:
- What needs to be built
- How to build it
- What standards apply
- Success criteria

---

## 🎯 Key Concepts

### Products
The platform will have **3 standalone products**:

1. **RecruitIQ** - Applicant Tracking System (existing frontend app in `recruitiq/`)
2. **Paylinq** - Payroll Management System (new frontend app to create in `paylinq/`)
3. **Nexus** - Human Resources Information System (new frontend app to create in `nexus/`)

Each can be:
- Sold independently to customers
- Deployed as a standalone application
- Used without the other products
- Integrated with other products when customer subscribes to multiple

### Frontend Architecture: Separate Applications

Each product is a **completely separate React application**:

```
RecruitIQ/
├── shared-ui/           # Shared component library (@recruitiq/shared-ui)
│   └── Used by all apps below for consistent UX
│
├── recruitiq/           # RecruitIQ frontend (customer-facing)
│   └── Deploy to: recruit.customer.com
│
├── paylinq/             # Paylinq frontend (customer-facing)
│   └── Deploy to: payroll.customer.com
│
├── nexus/               # Nexus frontend (customer-facing)
│   └── Deploy to: hris.customer.com
│
└── portal/              # Admin portal (OWNER ONLY, not for customers)
    └── Deploy to: portal.recruitiq.com
```

**Key Point:** Customers only receive the frontend apps they subscribe to. If they subscribe to only Paylinq, they get only the `paylinq/` app.

### Backend Architecture: Unified with Product Modules

Single Node.js/Express backend with modular structure:

```
backend/
├── src/
│   ├── products/
│   │   ├── core/           # Always loaded (auth, users, orgs)
│   │   ├── recruitiq/      # RecruitIQ module
│   │   ├── paylinq/        # Paylinq module
│   │   └── nexus/          # Nexus module
│   ├── shared/             # Shared utilities
│   └── server.js           # Dynamic product loading
└── database/
    ├── core schema
    ├── recruitment schema
    ├── payroll schema
    └── hris schema
```

**Key Point:** Single backend deployment, but products are loaded dynamically based on subscriptions

### Core Principles

#### 1. Product Independence
```
✅ Customer can subscribe to RecruitIQ only
✅ Customer can subscribe to Paylinq only  
✅ Customer can subscribe to all three
✅ Customer can add products later
```

#### 2. Shared Infrastructure
```
All products share:
- Authentication (JWT tokens)
- User management
- Organization management  
- Billing system
```

#### 3. Data Isolation
```
Each product has its own database schema:
- core schema (shared)
- recruitment schema (RecruitIQ)
- payroll schema (Paylinq)
- hris schema (Nexus)
- integrations schema (cross-product)
```

#### 4. Access Control
```
Every API request checks:
- Is user authenticated?
- Does organization have access to this product?
- Does organization's tier include this feature?
- Is organization within usage limits?
```

---

## 🏗️ Architecture Overview

### Directory Structure (Target State)

```
backend/src/
├── products/
│   ├── core/                    # Required for all
│   │   ├── auth/
│   │   ├── users/
│   │   ├── organizations/
│   │   └── billing/
│   ├── recruitiq/               # ATS Product
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── routes/
│   │   └── models/
│   ├── payroll/                 # Payroll Product
│   │   └── [same structure]
│   └── hris/                    # HRIS Product
│       └── [same structure]
│
├── shared/                      # Cross-product utilities
│   ├── productLoader.js         # Loads products dynamically
│   ├── integrationBus.js        # Cross-product events
│   ├── database/
│   │   └── query.js            # Multi-schema query wrapper
│   └── middleware/
│       ├── productAccess.js    # Product access control
│       └── featureAccess.js    # Feature access control
│
└── server.js                    # Dynamic route registration
```

### Database Schema

```sql
-- Core schema (required)
core.organizations
core.users
core.product_subscriptions       -- What products each org has
core.product_usage              -- Usage tracking for limits
core.product_permissions        -- Available permissions
core.user_product_permissions   -- User permissions per product

-- Product schemas
recruitment.jobs
recruitment.candidates
recruitment.applications
recruitment.interviews

payroll.employees
payroll.pay_runs
payroll.timesheets
payroll.tax_documents

hris.employees
hris.departments
hris.benefits
hris.performance_reviews

-- Integration schema
integrations.candidate_employee_map
integrations.employee_payroll_map
integrations.cross_product_events
```

---

## 📋 Implementation Phases Summary

### Foundation (Weeks 1-5)
Build the core infrastructure that all products need.

- **Phase 1:** Analyze current system, plan migration
- **Phase 2:** Create products/ structure, core module
- **Phase 3:** Refactor database schemas
- **Phase 4:** Extract RecruitIQ into products/recruitiq/
- **Phase 5:** Implement product loader and access control
- **Phase 6:** Dynamic routing in server.js
- **Phase 7:** Integration bus infrastructure

### New Products (Weeks 6-15)
Build Paylinq and Nexus from scratch.

- **Phases 8-10:** Paylinq (database, backend, testing)
- **Phases 11-13:** Nexus (database, backend, testing)
- **Phases 14-15:** Cross-product integrations

### Frontend (Weeks 16-21)
Build multi-product UI/UX.

- **Phases 16-19:** Frontend apps for all products

### Business & Quality (Weeks 22-24)
Add subscriptions, billing, and ensure quality.

- **Phases 20-24:** Subscriptions, billing, security, performance, docs

### Launch (Weeks 25-30)
Test, migrate, and deploy.

- **Phases 25-30:** Migration, testing, UAT, deployment, support

---

## ⚡ Critical Rules (Never Break These)

### Database
```javascript
// ❌ NEVER use pool.query() directly
const result = await pool.query('SELECT * FROM jobs');

// ✅ ALWAYS use custom query wrapper
const result = await query(
  'SELECT * FROM recruitment.jobs WHERE organization_id = $1',
  [organizationId],
  organizationId,
  { operation: 'SELECT', table: 'jobs', schema: 'recruitment' }
);
```

### Tenant Isolation
```javascript
// ❌ NEVER query without organization_id
SELECT * FROM jobs;

// ✅ ALWAYS filter by organization_id
SELECT * FROM jobs WHERE organization_id = $1 AND deleted_at IS NULL;
```

### API Responses
```javascript
// ❌ NEVER use generic "data" key
return res.json({ success: true, data: job });

// ✅ ALWAYS use resource-specific key
return res.json({ success: true, job: job });
```

### Testing
```javascript
// ❌ NEVER skip tests
// TODO: write tests later

// ✅ ALWAYS write tests (80%+ coverage required)
describe('JobService', () => {
  it('should create job with valid data', async () => {
    // Test implementation
  });
});
```

---

## 📊 Progress Tracking

Track your progress in:
1. **Phase documents** - Mark tasks complete
2. **Main plan** - Update phase status
3. **Daily standups** - Report progress
4. **Weekly reviews** - Discuss blockers

---

## 🆘 Getting Help

### Questions About...

**Architecture/Design:**
- Read MULTI_PRODUCT_SAAS_ARCHITECTURE.md again
- Check the architecture diagrams
- Ask the Architecture Team Lead

**Implementation:**
- Read your phase document
- Check the relevant standards document
- Ask your team lead

**Standards:**
- Read the specific standard document
- Check code examples in standards
- Ask the Technical Lead

**Testing:**
- Read TESTING_STANDARDS.md
- Check existing test files for patterns
- Ask the QA Team Lead

---

## ✅ Before You Start Coding

1. [ ] Read MULTI_PRODUCT_SAAS_ARCHITECTURE.md
2. [ ] Read MULTI_PRODUCT_IMPLEMENTATION_PLAN.md
3. [ ] Read all applicable standards documents
4. [ ] Read your assigned phase document
5. [ ] Understand the task breakdown
6. [ ] Know the success criteria
7. [ ] Have your development environment set up
8. [ ] Understand the coding standards
9. [ ] Know how to run tests
10. [ ] Know who to ask for help

---

## 🎓 Learning Path

### Week 1: Foundation
- Understand the vision and architecture
- Learn the coding standards
- Set up development environment

### Week 2: Deep Dive
- Study your product area (RecruitIQ/Paylinq/Nexus)
- Review database schema design
- Understand security requirements

### Week 3+: Implementation
- Start with your assigned phase
- Follow the standards religiously
- Write tests as you code
- Get code reviews frequently

---

## 🚦 Success Indicators

You're on the right track if:

- ✅ You understand why we're doing this
- ✅ You know which phase you're working on
- ✅ You can explain the architecture to someone else
- ✅ You're following the standards
- ✅ Your tests are passing
- ✅ Your code reviews are approved
- ✅ You're tracking your progress

You need help if:

- ❌ You don't understand the architecture
- ❌ You're not sure which standards apply
- ❌ Your tests are failing
- ❌ You're blocked on dependencies
- ❌ You're behind schedule
- ❌ Code reviews are finding major issues

---

## 📞 Contacts

| Role | Responsibility | Contact |
|------|----------------|---------|
| Project Manager | Overall coordination | TBD |
| Technical Lead | Technical decisions | TBD |
| Architecture Lead | System design | TBD |
| Database Lead | Schema design | TBD |
| Security Lead | Security review | TBD |
| QA Lead | Testing strategy | TBD |

---

## 🎉 Ready to Start!

You now have all the information you need to begin the transformation. 

**Next Steps:**
1. Review your assigned phase document
2. Set up your development environment  
3. Create your feature branch
4. Start with Task 1 of your phase
5. Follow the standards
6. Write tests
7. Get code reviews
8. Mark tasks complete
9. Move to next task

**Good luck! 🚀**

---

**Last Updated:** November 3, 2025  
**Maintained By:** Engineering Team
