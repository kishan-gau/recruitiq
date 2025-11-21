# VIP Employee Feature - Implementation Plan (Part 1: Overview)

**Project:** RecruitIQ Multi-Product Platform  
**Feature:** VIP Employee Management System  
**Created:** November 21, 2025  
**Status:** Implementation Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Feature Overview](#feature-overview)
3. [Current Codebase Analysis](#current-codebase-analysis)
4. [Architecture Design](#architecture-design)
5. [Implementation Phases](#implementation-phases)
6. [Standards Compliance](#standards-compliance)

---

## Executive Summary

### Purpose
Implement a comprehensive VIP employee management system across the RecruitIQ platform, enabling organizations to designate certain employees as VIP and apply enhanced privacy controls, special handling, and restricted access to their data.

### Scope
- **Products Affected:** PayLinQ (Payroll), Nexus (HRIS), ScheduleHub (Scheduling)
- **Backend Changes:** New services, repositories, middleware, database schema
- **Frontend Changes:** UI components, access control, data masking
- **Database Changes:** New tables, columns, indexes, triggers
- **Security:** Enhanced tenant isolation, role-based access, audit logging

### Key Benefits
1. **Privacy Protection:** Mask sensitive data for VIP employees (salary, contact info)
2. **Access Control:** Restrict VIP employee data to authorized personnel only
3. **Audit Trail:** Track all access to VIP employee information
4. **Compliance:** Meet data protection regulations for executive/sensitive personnel
5. **Flexibility:** Per-product VIP settings with inheritance model

---

## Feature Overview

### What is a VIP Employee?

A VIP employee is a designated individual within an organization whose data requires:
- **Enhanced Privacy:** Salary, compensation, and personal details are masked
- **Restricted Access:** Only authorized roles can view full details
- **Audit Logging:** All access attempts are logged for compliance
- **Special Handling:** Payroll, HR, and scheduling operations respect VIP status

### Use Cases

#### 1. Executive Compensation Privacy
- **Scenario:** CEO's salary should not be visible to general HR staff
- **Solution:** Mark CEO as VIP, restrict access to CFO and Board members
- **Implementation:** Mask salary fields, log access attempts

#### 2. Sensitive Personal Information
- **Scenario:** Employee with protected status (witness protection, celebrity)
- **Solution:** Mark as VIP across all products (PayLinQ, Nexus, ScheduleHub)
- **Implementation:** Global VIP flag with product-specific overrides

#### 3. Merger & Acquisition
- **Scenario:** Temporary restriction during confidential negotiations
- **Solution:** Bulk VIP designation with expiration date
- **Implementation:** Time-bound VIP status, automatic reversion

#### 4. Contractor/Consultant Privacy
- **Scenario:** High-value consultant's rates should be confidential
- **Solution:** VIP status in PayLinQ only
- **Implementation:** Product-specific VIP flag

---

## Current Codebase Analysis

### Existing Architecture (Verified)

#### 1. Product Structure
```
backend/src/products/
├── paylinq/           # Payroll management
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── dto/
│   └── routes/
├── nexus/             # HRIS
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   └── routes/
└── schedulehub/       # Scheduling (not implemented yet)
```

#### 2. Employee Data Model

**Current Schema (hris.employee):**
```sql
CREATE TABLE hris.employee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_number VARCHAR(50) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  date_of_birth DATE,
  hire_date DATE NOT NULL,
  employment_status VARCHAR(50) NOT NULL,
  -- Audit columns
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_at TIMESTAMP
);
```

**Current PayLinQ Worker Model:**
```sql
CREATE TABLE paylinq.workers (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  employee_id UUID REFERENCES hris.employee(id),
  worker_type_id UUID REFERENCES paylinq.worker_types(id),
  pay_rate DECIMAL(15, 2),
  pay_frequency VARCHAR(50),
  -- ... other payroll-specific fields
);
```

#### 3. Existing Services (Verified)

**Nexus Employee Service:**
- **File:** `backend/src/products/nexus/services/EmployeeService.js`
- **Methods:** 
  - `getAllEmployees()` - List all employees
  - `getEmployeeById()` - Get single employee
  - `createEmployee()` - Create new employee
  - `updateEmployee()` - Update employee
  - `terminateEmployee()` - Soft delete
  - `getEmploymentHistory()` - Get history
- **Export Pattern:** Class export with DI support ✅

**PayLinQ Worker Service:**
- **File:** `backend/src/products/paylinq/services/WorkerService.js`
- **Methods:** (To be verified in Part 2)
- **Export Pattern:** To be verified

#### 4. Authentication & Authorization

**Current System:**
- **Auth Type:** Cookie-based session (migration from JWT in progress)
- **Middleware:** `backend/src/middleware/authenticate.js`
- **User Roles:** Stored in `hris.user_account.role`
- **Session Management:** Express-session with PostgreSQL store

**Available Roles (Verified in seed data):**
```javascript
// From backend/src/database/seed/04-users.js
const roles = {
  SUPER_ADMIN: 'super_admin',      // Platform admin
  ADMIN: 'admin',                  // Organization admin
  HR_MANAGER: 'hr_manager',        // HR management
  PAYROLL_ADMIN: 'payroll_admin',  // Payroll management
  MANAGER: 'manager',              // Department manager
  EMPLOYEE: 'employee'             // Regular employee
};
```

#### 5. Data Access Patterns

**Repository Pattern:**
```javascript
// backend/src/products/nexus/repositories/EmployeeRepository.js
class EmployeeRepository extends BaseRepository {
  constructor() {
    super('hris.employee');
  }

  async findById(id, organizationId) {
    const text = `
      SELECT * FROM hris.employee
      WHERE id = $1 
        AND organization_id = $2
        AND deleted_at IS NULL
    `;
    const result = await query(text, [id, organizationId], organizationId);
    return result.rows[0] || null;
  }
}
```

**Key Observations:**
- ✅ Uses custom `query()` wrapper (not `pool.query()`)
- ✅ Always filters by `organization_id` (tenant isolation)
- ✅ Includes `deleted_at IS NULL` check (soft deletes)
- ✅ Uses parameterized queries (SQL injection prevention)

---

## Architecture Design

### 1. VIP Employee Data Model

#### Core VIP Table
```sql
CREATE TABLE hris.vip_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- VIP Status
  is_vip_global BOOLEAN NOT NULL DEFAULT false,
  is_vip_paylinq BOOLEAN,  -- NULL = inherit from global
  is_vip_nexus BOOLEAN,    -- NULL = inherit from global
  is_vip_schedulehub BOOLEAN, -- NULL = inherit from global
  
  -- Access Control
  reason TEXT,
  authorized_roles TEXT[], -- Array of roles that can access
  authorized_user_ids UUID[], -- Specific users who can access
  
  -- Time-bound VIP
  effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_until TIMESTAMP, -- NULL = permanent
  
  -- Audit columns
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT unique_vip_employee UNIQUE (employee_id, organization_id),
  CONSTRAINT check_effective_dates CHECK (
    effective_until IS NULL OR effective_until > effective_from
  )
);
```

#### VIP Access Log Table
```sql
CREATE TABLE hris.vip_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_employee_id UUID NOT NULL REFERENCES hris.vip_employees(id),
  employee_id UUID NOT NULL REFERENCES hris.employee(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Access Details
  accessed_by_user_id UUID NOT NULL REFERENCES hris.user_account(id),
  accessed_by_role VARCHAR(50) NOT NULL,
  access_type VARCHAR(50) NOT NULL, -- 'view', 'update', 'export'
  product VARCHAR(50) NOT NULL, -- 'paylinq', 'nexus', 'schedulehub'
  
  -- Request Context
  endpoint VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  
  -- Authorization Result
  was_authorized BOOLEAN NOT NULL,
  denial_reason TEXT,
  
  -- Data Accessed
  fields_accessed TEXT[], -- Array of field names
  
  -- Timestamp
  accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2. VIP Resolution Logic

```javascript
/**
 * Determines if an employee is VIP for a specific product
 * @param {UUID} employeeId
 * @param {UUID} organizationId
 * @param {string} product - 'paylinq', 'nexus', 'schedulehub'
 * @returns {boolean}
 */
async function isEmployeeVIP(employeeId, organizationId, product) {
  // 1. Check if VIP record exists
  const vipRecord = await getVIPRecord(employeeId, organizationId);
  
  if (!vipRecord) return false;
  
  // 2. Check if VIP status is active (time-based)
  if (!isVIPActive(vipRecord)) return false;
  
  // 3. Check product-specific VIP flag
  const productFlag = vipRecord[`is_vip_${product}`];
  
  // If product flag is NULL, inherit from global
  if (productFlag === null) {
    return vipRecord.is_vip_global;
  }
  
  return productFlag;
}
```

### 3. Access Control Logic

```javascript
/**
 * Checks if user can access VIP employee data
 * @param {UUID} userId
 * @param {string} userRole
 * @param {UUID} vipEmployeeId
 * @param {UUID} organizationId
 * @returns {Object} { authorized: boolean, reason: string }
 */
async function checkVIPAccess(userId, userRole, vipEmployeeId, organizationId) {
  // 1. Get VIP record
  const vipRecord = await getVIPRecord(vipEmployeeId, organizationId);
  
  if (!vipRecord) {
    return { authorized: true, reason: 'Not a VIP employee' };
  }
  
  // 2. Check if user is accessing their own data
  if (userId === vipEmployeeId) {
    return { authorized: true, reason: 'Self-access' };
  }
  
  // 3. Super admin always has access
  if (userRole === 'super_admin') {
    return { authorized: true, reason: 'Super admin access' };
  }
  
  // 4. Check authorized roles
  if (vipRecord.authorized_roles && vipRecord.authorized_roles.includes(userRole)) {
    return { authorized: true, reason: 'Role authorized' };
  }
  
  // 5. Check authorized user IDs
  if (vipRecord.authorized_user_ids && vipRecord.authorized_user_ids.includes(userId)) {
    return { authorized: true, reason: 'User explicitly authorized' };
  }
  
  // 6. Default deny
  return { authorized: false, reason: 'Insufficient permissions for VIP employee' };
}
```

### 4. Data Masking Strategy

```javascript
/**
 * Masks sensitive fields for VIP employees
 * @param {Object} employeeData
 * @param {boolean} isAuthorized
 * @returns {Object} Masked employee data
 */
function maskVIPData(employeeData, isAuthorized) {
  if (isAuthorized) {
    return employeeData; // Return full data
  }
  
  // Mask sensitive fields
  return {
    ...employeeData,
    // Personal info
    email: maskEmail(employeeData.email),
    phone: maskPhone(employeeData.phone),
    date_of_birth: null,
    address: '[RESTRICTED]',
    
    // Financial info (PayLinQ)
    pay_rate: null,
    salary: null,
    bonus: null,
    tax_info: null,
    bank_account: null,
    
    // Mark as restricted
    _is_vip: true,
    _access_restricted: true
  };
}

function maskEmail(email) {
  if (!email) return null;
  const [user, domain] = email.split('@');
  return `${user.charAt(0)}***@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return null;
  return `***-***-${phone.slice(-4)}`;
}
```

---

## Implementation Phases

### Phase 1: Database & Core Infrastructure (Week 1)
**Duration:** 3-5 days  
**Complexity:** Medium  

**Tasks:**
1. Create database schema (tables, indexes)
2. Write and test migration scripts
3. Create VIP service with basic CRUD operations
4. Create VIP repository with data access methods
5. Write unit tests for VIP service/repository

**Deliverables:**
- Database migration file
- VIPEmployeeService class
- VIPEmployeeRepository class
- Unit tests (90%+ coverage)

**Dependencies:** None

---

### Phase 2: Access Control & Middleware (Week 1-2)
**Duration:** 4-6 days  
**Complexity:** High  

**Tasks:**
1. Implement VIP access control service
2. Create VIP authorization middleware
3. Implement VIP access logging service
4. Add VIP check to existing employee services
5. Write integration tests for access control

**Deliverables:**
- VIPAccessControlService class
- checkVIPAccess middleware
- VIPAccessLogService class
- Integration tests
- Updated employee services

**Dependencies:** Phase 1

---

### Phase 3: Data Masking & Privacy (Week 2)
**Duration:** 3-4 days  
**Complexity:** Medium  

**Tasks:**
1. Implement data masking utilities
2. Update DTOs to support masked data
3. Add VIP masking to employee queries
4. Add VIP masking to payroll queries
5. Write tests for masking logic

**Deliverables:**
- maskVIPData utility functions
- Updated employee DTOs
- Updated payroll DTOs
- Masking unit tests

**Dependencies:** Phase 1, Phase 2

---

### Phase 4: API Endpoints (Week 2-3)
**Duration:** 4-5 days  
**Complexity:** Medium  

**Tasks:**
1. Create VIP management endpoints (CRUD)
2. Add VIP status to employee endpoints
3. Create VIP access log endpoints
4. Create bulk VIP designation endpoints
5. Write API integration tests

**Deliverables:**
- VIP controller with CRUD operations
- Updated employee endpoints
- VIP access log controller
- API integration tests
- OpenAPI documentation

**Dependencies:** Phase 1, Phase 2, Phase 3

---

### Phase 5: Frontend Implementation - Nexus (Week 3)
**Duration:** 5-7 days  
**Complexity:** High  

**Tasks:**
1. Create VIP designation UI components
2. Add VIP indicators to employee lists
3. Implement VIP access restriction UI
4. Add VIP management page
5. Add VIP access logs viewer
6. Write frontend tests

**Deliverables:**
- VIPBadge component
- VIPDesignationForm component
- VIPManagementPage
- VIPAccessLogsPage
- Frontend unit/integration tests

**Dependencies:** Phase 4

---

### Phase 6: Frontend Implementation - PayLinQ (Week 4)
**Duration:** 4-5 days  
**Complexity:** Medium  

**Tasks:**
1. Add VIP indicators to payroll UI
2. Implement salary masking in payroll runs
3. Add VIP filtering to worker lists
4. Update payroll reports with VIP handling
5. Write frontend tests

**Deliverables:**
- Updated worker list components
- Masked salary display components
- VIP-aware payroll reports
- Frontend tests

**Dependencies:** Phase 4, Phase 5

---

### Phase 7: Security & Audit (Week 4)
**Duration:** 3-4 days  
**Complexity:** High  

**Tasks:**
1. Implement comprehensive audit logging
2. Add security event logging for VIP access
3. Create VIP access reports
4. Perform security review
5. Write security tests

**Deliverables:**
- Enhanced audit logging
- Security event tracking
- VIP access reports
- Security test suite
- Security documentation

**Dependencies:** All previous phases

---

### Phase 8: Testing & Documentation (Week 5)
**Duration:** 4-5 days  
**Complexity:** Medium  

**Tasks:**
1. E2E testing for VIP workflows
2. Performance testing with VIP checks
3. Security penetration testing
4. User documentation
5. Developer documentation

**Deliverables:**
- E2E test suite
- Performance benchmarks
- Security test results
- User manual
- Developer guide
- API documentation

**Dependencies:** All previous phases

---

## Standards Compliance

### ✅ Backend Standards Compliance

1. **Layer Architecture**
   - ✅ Routes → Controllers → Services → Repositories
   - ✅ Proper separation of concerns
   - ✅ No business logic in controllers
   - ✅ Data access only in repositories

2. **Service Layer**
   - ✅ Constructor with dependency injection
   - ✅ Static Joi schemas for validation
   - ✅ JSDoc comments for all methods
   - ✅ organizationId parameter for all operations
   - ✅ userId parameter for audit trail

3. **Repository Layer**
   - ✅ Extends BaseRepository
   - ✅ Uses custom query() wrapper (not pool.query())
   - ✅ Always filters by organization_id
   - ✅ Implements soft deletes (deleted_at)
   - ✅ Parameterized queries (SQL injection prevention)

4. **DTO Pattern**
   - ✅ One DTO file per database table
   - ✅ mapDbToApi and mapApiToDb functions
   - ✅ snake_case (DB) → camelCase (API)

5. **Error Handling**
   - ✅ Custom error classes (ValidationError, NotFoundError)
   - ✅ Structured error responses
   - ✅ Error logging with context

### ✅ Security Standards Compliance

1. **Authentication & Authorization**
   - ✅ Cookie-based session authentication
   - ✅ Role-based access control (RBAC)
   - ✅ Tenant isolation enforced

2. **Data Protection**
   - ✅ Sensitive data masking
   - ✅ Audit logging for VIP access
   - ✅ No sensitive data in logs

3. **SQL Injection Prevention**
   - ✅ Parameterized queries only
   - ✅ Input validation with Joi
   - ✅ Custom query wrapper

### ✅ Testing Standards Compliance

1. **Test Structure**
   - ✅ Tests in separate tests/ folder
   - ✅ Unit tests for services/repositories
   - ✅ Integration tests for API endpoints
   - ✅ E2E tests for workflows

2. **Test Coverage**
   - ✅ Services: 90%+ coverage
   - ✅ Repositories: 85%+ coverage
   - ✅ Controllers: 75%+ coverage

3. **Test Patterns**
   - ✅ AAA pattern (Arrange, Act, Assert)
   - ✅ Dependency injection for mocking
   - ✅ Test data factories

### ✅ Database Standards Compliance

1. **Schema Design**
   - ✅ snake_case for tables and columns
   - ✅ Required audit columns (created_at, updated_at, etc.)
   - ✅ Soft delete support (deleted_at)
   - ✅ UUID primary keys
   - ✅ Proper foreign key constraints
   - ✅ Check constraints for enums

2. **Indexing**
   - ✅ Indexes on foreign keys
   - ✅ Partial indexes for common queries
   - ✅ Composite indexes for performance

3. **Migrations**
   - ✅ Idempotent migrations (IF NOT EXISTS)
   - ✅ Proper UP and DOWN scripts
   - ✅ Naming convention: YYYYMMDDHHMMSS_description.sql

---

## Next Steps

Continue to **Part 2: Database Schema & Migration** for detailed database implementation.

---

**Document Version:** 1.0  
**Last Updated:** November 21, 2025  
**Next Review:** After Phase 1 completion
