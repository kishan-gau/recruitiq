# PayLinQ Integration Tests - Database Schema Requirements

**Created:** November 15, 2025  
**Status:** Database migrations needed before tests can run  
**Test Files:** 1 integration test file (524 lines)

---

## Overview

This document describes the database schema requirements for the PayLinQ integration tests. These tests validate critical multi-tenant payroll functionality including API standards compliance, event-driven architecture, and HRIS integration.

## Current Status

- ✅ **Unit Tests:** 31/31 passing (92.55% coverage)
- ✅ **Test Files Created:** 1 API integration test
- ✅ **Import Errors Fixed:** All files use correct database module
- ⚠️ **Database Schema:** Missing required PayLinQ tables
- ✅ **Event Architecture:** Removed (not needed for single backend)

## Test Files Overview

### 1. payComponentAPI.standards.test.js (524 lines)

**Purpose:** Validates that PayLinQ API endpoints comply with REST and coding standards.

**Features Tested:**
- ✅ Resource-specific response keys (e.g., `payComponent` NOT generic `data`)
- ✅ Proper HTTP status codes (200, 201, 400, 404)
- ✅ Consistent error response structure
- ✅ Tenant isolation enforcement (organizationId filtering)
- ✅ Input validation with Joi schemas
- ✅ Pagination functionality (page, limit, total)
- ✅ Soft delete behavior (deleted_at timestamp)

**API Endpoints Covered:**
```
GET    /api/products/paylinq/pay-components      # List with pagination
GET    /api/products/paylinq/pay-components/:id  # Single resource
POST   /api/products/paylinq/pay-components      # Create component
PUT    /api/products/paylinq/pay-components/:id  # Update component
DELETE /api/products/paylinq/pay-components/:id  # Soft delete
```

---

## Required Database Schema

### Schema: `payroll`

All PayLinQ tables should be in the `payroll` schema for proper namespace separation.

### Table 1: payroll.pay_component

**Purpose:** Stores pay components (earnings, deductions, benefits) used in payroll calculations.

**Columns:**
```sql
CREATE TABLE payroll.pay_component (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant Isolation (REQUIRED for all tenant-scoped tables)
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Component Identification
  component_code VARCHAR(50) NOT NULL,
  component_name VARCHAR(255) NOT NULL,
  component_type VARCHAR(50) NOT NULL,  -- 'earning', 'deduction', 'benefit', 'tax'
  
  -- Configuration
  description TEXT,
  calculation_metadata JSONB,  -- Stores calculation rules, formulas
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER,
  
  -- Audit Columns (REQUIRED)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  -- Soft Delete (REQUIRED)
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES hris.user_account(id),
  
  -- Constraints
  CONSTRAINT check_component_type CHECK (component_type IN ('earning', 'deduction', 'benefit', 'tax')),
  CONSTRAINT unique_component_code UNIQUE (organization_id, component_code, deleted_at)
);

-- Indexes (REQUIRED for performance and tenant isolation)
CREATE INDEX idx_pay_component_org_id ON payroll.pay_component(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_component_type ON payroll.pay_component(component_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_component_code ON payroll.pay_component(component_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_pay_component_active ON payroll.pay_component(is_active) WHERE deleted_at IS NULL;
```

**Feature Description:**
Pay components are the building blocks of payroll calculations. They represent:
- **Earnings:** Base salary, overtime, bonuses, commissions
- **Deductions:** Tax withholdings, insurance premiums, loan repayments
- **Benefits:** Health insurance, retirement contributions
- **Taxes:** Income tax, social security, Medicare

Each component has:
- **Calculation metadata:** JSON configuration for complex calculations (formulas, rates, limits)
- **Taxability:** Determines if component is subject to tax calculations
- **Display order:** Controls ordering in paychecks and reports
- **Active status:** Allows disabling components without deletion

**Multi-Tenant Considerations:**
- Each organization has independent pay components
- Component codes must be unique within an organization
- All queries MUST filter by `organization_id`
- Soft deletes preserve historical data

### Table 2: payroll.worker_metadata

**Purpose:** Stores PayLinQ-specific worker data linked to HRIS employees.

**Columns:**
```sql
CREATE TABLE payroll.worker_metadata (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant Isolation
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- HRIS Integration
  employee_id UUID NOT NULL REFERENCES hris.employee(id),
  
  -- Payroll Configuration
  worker_type_code VARCHAR(50),  -- References worker_types (full-time, part-time, contractor)
  pay_frequency VARCHAR(50) NOT NULL,  -- 'weekly', 'bi-weekly', 'monthly', 'semi-monthly'
  payment_method VARCHAR(50) NOT NULL DEFAULT 'bank_transfer',  -- 'bank_transfer', 'check', 'cash'
  
  -- Bank Details (encrypted in production)
  bank_account_number VARCHAR(255),
  bank_routing_number VARCHAR(255),
  bank_name VARCHAR(255),
  
  -- Tax Configuration
  tax_id VARCHAR(50),  -- SSN, Tax ID, etc.
  tax_filing_status VARCHAR(50),  -- 'single', 'married', 'head_of_household'
  tax_exemptions INTEGER DEFAULT 0,
  
  -- Payroll Status
  is_payroll_eligible BOOLEAN NOT NULL DEFAULT true,
  last_payroll_run_id UUID,
  
  -- Metadata
  notes TEXT,
  custom_fields JSONB,
  
  -- Audit Columns
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  -- Soft Delete
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES hris.user_account(id),
  
  -- Constraints
  CONSTRAINT check_pay_frequency CHECK (pay_frequency IN ('weekly', 'bi-weekly', 'monthly', 'semi-monthly')),
  CONSTRAINT check_payment_method CHECK (payment_method IN ('bank_transfer', 'check', 'cash')),
  CONSTRAINT unique_employee_org UNIQUE (organization_id, employee_id, deleted_at)
);

-- Indexes
CREATE INDEX idx_worker_metadata_org_id ON payroll.worker_metadata(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_metadata_employee_id ON payroll.worker_metadata(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_metadata_worker_type ON payroll.worker_metadata(worker_type_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_metadata_eligible ON payroll.worker_metadata(is_payroll_eligible) WHERE deleted_at IS NULL;
```

**Feature Description:**
Worker metadata bridges HRIS employee data with PayLinQ payroll processing. It stores:
- **Payroll configuration:** Pay frequency, payment method, bank details
- **Tax information:** Tax ID, filing status, exemptions
- **Worker classification:** Links to worker types (full-time, part-time, contractor)
- **Eligibility tracking:** Controls which employees are included in payroll runs

**HRIS Integration:**
- Each HRIS employee can have one worker metadata record
- Created automatically when `employee.hired` event is emitted
- Updated when employee status or compensation changes
- Soft deleted when employee is terminated

**Security Considerations:**
- Bank account numbers should be encrypted at rest (use database encryption)
- Tax IDs should be masked in logs and API responses
- Access should be restricted to payroll administrators

### Table 3: payroll.compensation

**Purpose:** Stores individual worker compensation details (pay components assigned to workers).

**Columns:**
```sql
CREATE TABLE payroll.compensation (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant Isolation
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Worker and Component References
  worker_metadata_id UUID NOT NULL REFERENCES payroll.worker_metadata(id),
  pay_component_id UUID NOT NULL REFERENCES payroll.pay_component(id),
  
  -- Compensation Details
  amount NUMERIC(15, 2),  -- Fixed amount (e.g., $5000 monthly salary)
  rate NUMERIC(15, 2),    -- Hourly/unit rate (e.g., $25/hour)
  percentage NUMERIC(5, 2),  -- Percentage rate (e.g., 5% commission)
  
  -- Configuration
  calculation_type VARCHAR(50) NOT NULL,  -- 'fixed', 'hourly', 'percentage', 'formula'
  frequency VARCHAR(50),  -- How often this component applies
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NOT NULL,
  effective_to DATE,
  
  -- Limits and Rules
  min_value NUMERIC(15, 2),
  max_value NUMERIC(15, 2),
  calculation_rules JSONB,  -- Complex calculation rules
  
  -- Notes
  notes TEXT,
  
  -- Audit Columns
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  
  -- Soft Delete
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES hris.user_account(id),
  
  -- Constraints
  CONSTRAINT check_calculation_type CHECK (calculation_type IN ('fixed', 'hourly', 'percentage', 'formula')),
  CONSTRAINT check_amount_or_rate CHECK (
    (calculation_type = 'fixed' AND amount IS NOT NULL) OR
    (calculation_type = 'hourly' AND rate IS NOT NULL) OR
    (calculation_type = 'percentage' AND percentage IS NOT NULL) OR
    (calculation_type = 'formula')
  ),
  CONSTRAINT check_effective_dates CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT unique_worker_component UNIQUE (organization_id, worker_metadata_id, pay_component_id, effective_from, deleted_at)
);

-- Indexes
CREATE INDEX idx_compensation_org_id ON payroll.compensation(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_compensation_worker ON payroll.compensation(worker_metadata_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_compensation_component ON payroll.compensation(pay_component_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_compensation_active ON payroll.compensation(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_compensation_effective ON payroll.compensation(effective_from, effective_to) WHERE deleted_at IS NULL;
```

**Feature Description:**
Compensation records link workers to pay components with specific rates and rules:
- **Calculation types:**
  - **Fixed:** Set amount per pay period (e.g., $5000/month salary)
  - **Hourly:** Rate per hour worked (e.g., $25/hour)
  - **Percentage:** Percentage of another value (e.g., 5% commission)
  - **Formula:** Complex calculation using formula engine
  
- **Date effectivity:** Compensation can change over time
  - `effective_from`: When this compensation starts
  - `effective_to`: When it ends (NULL = ongoing)
  
- **Limits:** Min/max values for calculated amounts

**Multi-Currency Support:**
The `amount`, `rate`, and `min_value`/`max_value` fields store currency values. For multi-currency support:
1. Add `currency_code VARCHAR(3)` column (ISO 4217 codes)
2. Add `exchange_rate NUMERIC(15, 6)` for conversion tracking
3. Reference exchange rates from `payroll.exchange_rates` table

**Event Integration:**
- Created when `compensation.created` event is emitted
- Updated when `compensation.updated` event is emitted
- Triggers `payroll.recalculation_needed` event for active payroll runs

---

## Additional Required Tables

### Supporting Tables (Referenced by integration tests)

#### hris.employee
```sql
-- Assumed to exist from HRIS/Nexus product
CREATE TABLE hris.employee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  department_id UUID REFERENCES hris.department(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  employee_number VARCHAR(50),
  hire_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

#### hris.department
```sql
-- Assumed to exist from HRIS/Nexus product
CREATE TABLE hris.department (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

---

## Migration Strategy

### Phase 1: Core Tables (Priority 1)
1. Create `payroll` schema
2. Create `payroll.pay_component` table
3. Create `payroll.worker_metadata` table
4. Create `payroll.compensation` table
5. Add indexes and constraints

### Phase 2: Seed Data (Priority 2)
1. Seed default pay components (base salary, overtime, etc.)
2. Seed worker types (full-time, part-time, contractor)
3. Create test data for integration tests

### Phase 3: Run Integration Tests (Priority 3)
1. Verify database schema is complete
2. Run integration tests
3. Fix any discovered issues
4. Document test coverage

---

## Migration Files Needed

### 1. Create PayLinQ Schema
**File:** `backend/migrations/YYYYMMDD_create_paylinq_schema.sql`
```sql
-- Create payroll schema
CREATE SCHEMA IF NOT EXISTS payroll;

-- Grant permissions
GRANT USAGE ON SCHEMA payroll TO recruitiq_app;
GRANT ALL ON ALL TABLES IN SCHEMA payroll TO recruitiq_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA payroll TO recruitiq_app;
```

### 2. Create Pay Components Table
**File:** `backend/migrations/YYYYMMDD_create_pay_components_table.sql`
- Full SQL from Table 1 above
- Add seed data for common components

### 3. Create Worker Metadata Table
**File:** `backend/migrations/YYYYMMDD_create_worker_metadata_table.sql`
- Full SQL from Table 2 above
- Add triggers for automatic timestamp updates

### 4. Create Compensation Table
**File:** `backend/migrations/YYYYMMDD_create_compensation_table.sql`
- Full SQL from Table 3 above
- Add foreign key constraints
- Add validation triggers

---

## Running Integration Tests

### Prerequisites
1. ✅ Database schema migrations applied
2. ✅ Test data seeded
3. ✅ HRIS tables exist (`employee`, `department`)
4. ✅ Organizations table has `slug` column
5. ✅ Event system initialized

### Run Commands
```bash
# Run all PayLinQ integration tests
npm test -- --testPathPattern="tests/integration/paylinq"

# Run specific test file
npm test -- tests/integration/paylinq/payComponentAPI.standards.test.js

# Run with verbose output
npm test -- --testPathPattern="tests/integration/paylinq" --verbose

# Run with coverage
npm test -- --testPathPattern="tests/integration/paylinq" --coverage
```

### Expected Results
- **Test Suites:** 3 passed, 0 failed
- **Tests:** ~50+ passed (exact count depends on final test structure)
- **Coverage:** Should maintain 90%+ for PayLinQ services

---

## Security Considerations

### Data Protection
1. **Bank account numbers:** Encrypt at rest using AES-256
2. **Tax IDs:** Mask in logs and API responses
3. **Compensation amounts:** Restrict access to authorized users
4. **Audit trail:** Log all changes to compensation and metadata

### Tenant Isolation (CRITICAL)
1. **EVERY query** MUST filter by `organization_id`
2. **Indexes** MUST include `organization_id` for performance
3. **Foreign keys** MUST respect tenant boundaries
4. **Tests** MUST verify tenant isolation cannot be bypassed

### Query Pattern Example
```javascript
// ❌ WRONG: No tenant isolation
SELECT * FROM payroll.pay_component WHERE id = $1;

// ✅ CORRECT: Enforces tenant isolation
SELECT * FROM payroll.pay_component 
WHERE id = $1 
  AND organization_id = $2 
  AND deleted_at IS NULL;
```

---

## Testing Strategy

### Unit Tests (✅ COMPLETE)
- Service layer business logic
- DTO transformations
- Validation rules
- Formula calculations
- **Status:** 31/31 passing (92.55% coverage)

### Integration Tests (⏳ PENDING SCHEMA)
- API endpoint contracts
- Database transactions
- Multi-tenant isolation
- Soft delete behavior
- **Status:** File created, awaiting database schema

### E2E Tests (📋 FUTURE)
- Complete payroll run workflow
- Employee lifecycle scenarios
- Compensation change propagation
- **Status:** Not yet created

---

## Business Impact

### Features Enabled by These Tables

1. **Pay Component Management**
   - Define custom earnings, deductions, and benefits
   - Configure complex calculation rules
   - Support for percentage-based components (e.g., commission)

2. **Worker Payroll Configuration**
   - Link employees to payroll system
   - Configure pay frequency and payment methods
   - Track tax information and exemptions

3. **Compensation Tracking**
   - Historical compensation records
   - Date-effective changes
   - Support for multiple pay components per worker

4. **Multi-Tenant Payroll**
   - Complete data isolation between organizations
   - Independent component libraries per tenant
   - Scalable to thousands of organizations

---

## Next Steps

### Immediate Actions
1. ✅ Review this schema documentation
2. 📋 Create database migration files
3. 📋 Apply migrations to test database
4. 📋 Run integration tests
5. 📋 Fix any discovered issues

### Future Enhancements
1. 📋 Add multi-currency support (exchange rates table)
2. 📋 Add payroll runs table (payroll.payroll_run)
3. 📋 Add paychecks table (payroll.paycheck)
4. 📋 Add payment history table (payroll.payment_history)
5. 📋 Add tax calculations table (payroll.tax_calculation)

---

## References

- **Coding Standards:** `docs/BACKEND_STANDARDS.md`
- **Database Standards:** `docs/DATABASE_STANDARDS.md`
- **Testing Standards:** `docs/TESTING_STANDARDS.md`
- **API Standards:** `docs/API_STANDARDS.md`
- **Security Standards:** `docs/SECURITY_STANDARDS.md`

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-11-15 | Initial documentation created | GitHub Copilot |
| 2025-11-15 | Added multi-currency considerations | GitHub Copilot |
| 2025-11-15 | Added security section | GitHub Copilot |

---

## Contact

For questions about these integration tests or schema requirements:
- Review the test files directly
- Check the coding standards documentation
- Consult the PayLinQ product architecture documentation
