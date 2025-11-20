# Shared Compensation Service

## Overview

Industry-standard shared service for managing employee compensation records across the RecruitIQ platform. Used by both **Nexus (HRIS)** and **PayLinQ (Payroll)** products to ensure consistent compensation data management and complete audit trails.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Business Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Nexus (HRIS)          │        PayLinQ (Payroll)           │
│  EmployeeService       │        PayrollService              │
│         │              │              │                      │
│         └──────────────┴──────────────┘                      │
│                        │                                     │
│                        ▼                                     │
│         ┌──────────────────────────────┐                    │
│         │  CompensationService (Shared)│                    │
│         │  - createInitialCompensation │                    │
│         │  - updateCompensation        │                    │
│         │  - getCurrentCompensation    │                    │
│         └──────────────┬───────────────┘                    │
│                        │                                     │
│                        ▼                                     │
├─────────────────────────────────────────────────────────────┤
│                   Data Layer                                 │
├─────────────────────────────────────────────────────────────┤
│           payroll.compensation table                         │
│           - employee_id (FK to hris.employee)               │
│           - compensation_type, amount, currency             │
│           - effective_from, effective_to                    │
│           - is_current (only one per employee)              │
│           - Complete audit trail                            │
└─────────────────────────────────────────────────────────────┘
```

## Design Principles

Following industry best practices:

1. **Single Responsibility** - One service for all compensation logic
2. **DRY (Don't Repeat Yourself)** - No code duplication between products
3. **Consistency** - Same business rules apply regardless of entry point
4. **Audit Trail** - Complete history of all compensation changes
5. **Testability** - Easy to test in isolation

## Usage

### Creating Initial Compensation (Employee Hire)

Both Nexus and PayLinQ call this when creating an employee with compensation:

```javascript
import compensationService from '../../../shared/services/compensationService.js';

// In Nexus EmployeeService.createEmployee()
if (employeeData.compensation) {
  await compensationService.createInitialCompensation(
    employee.id,
    {
      amount: employeeData.compensation,
      type: 'salary',
      currency: employeeData.currency || 'SRD',
      effectiveFrom: employeeData.hire_date,
      payFrequency: 'monthly'
    },
    organizationId,
    userId
  );
}

// In PayLinQ PayrollService.createEmployeeRecord()
if (value.metadata?.compensation) {
  await compensationService.createInitialCompensation(
    targetEmployeeId,
    {
      amount: value.metadata.compensation,
      type: value.metadata.compensationType || 'salary',
      currency: payrollData.currency,
      effectiveFrom: payrollData.startDate,
      payFrequency: payrollData.payFrequency
    },
    organizationId,
    userId
  );
}
```

### Updating Compensation (Raise, Adjustment)

```javascript
// Change compensation
await compensationService.updateCompensation(
  employeeId,
  {
    amount: 150000,
    type: 'salary',
    currency: 'SRD',
    effectiveFrom: '2025-01-01',
    changeReason: 'Annual merit increase'
  },
  organizationId,
  userId
);
```

### Getting Current Compensation

```javascript
const currentCompensation = await compensationService.getCurrentCompensation(
  employeeId,
  organizationId
);

if (currentCompensation) {
  console.log(`Current: ${currentCompensation.amount} ${currentCompensation.currency}`);
}
```

## Benefits

### For Development
- ✅ **Single place to update** compensation logic
- ✅ **Consistent behavior** across all products
- ✅ **Easier testing** - test once, works everywhere
- ✅ **Better documentation** - centralized documentation

### For Data Integrity
- ✅ **Complete audit trail** - every change tracked
- ✅ **No orphaned data** - compensation always linked to employee
- ✅ **Historical accuracy** - effective dates track changes over time
- ✅ **Single source of truth** - no conflicting compensation data

### For Business
- ✅ **Compliance ready** - audit trail for legal requirements
- ✅ **Reporting accuracy** - consistent data for reports
- ✅ **Product flexibility** - works with or without full suite

## Database Schema

```sql
CREATE TABLE payroll.compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_id UUID NOT NULL REFERENCES hris.employee(id),
  compensation_type VARCHAR(50) NOT NULL, -- 'salary', 'hourly', 'commission'
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'SRD',
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  overtime_rate DECIMAL(5,2),
  pay_frequency VARCHAR(20),
  change_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_at TIMESTAMP,
  deleted_by UUID,
  
  CONSTRAINT chk_only_one_current 
    EXCLUDE USING gist (
      employee_id WITH =, 
      organization_id WITH =
    ) WHERE (is_current = true AND deleted_at IS NULL)
);
```

## Backfilling Existing Data

For employees created before this service was implemented, run the backfill script:

```bash
cd backend
node scripts/backfill-compensation-records.js
```

This will:
1. Find employees with compensation data but no formal records
2. Create initial compensation records using the shared service
3. Provide detailed progress and summary

## Examples from Industry

Similar patterns used by:

- **Shopify** - Shared `InventoryService` used by Orders and Fulfillment
- **Stripe** - Shared `PaymentService` used by Billing and Invoicing  
- **Workday** - Shared `CompensationService` across HR and Payroll modules
- **ADP** - Centralized compensation management across products

## Testing

```javascript
import compensationService from '../../../shared/services/compensationService.js';

describe('CompensationService', () => {
  it('should create initial compensation', async () => {
    const result = await compensationService.createInitialCompensation(
      employeeId,
      { amount: 100000, type: 'salary', currency: 'SRD' },
      organizationId,
      userId
    );
    
    expect(result.amount).toBe(100000);
    expect(result.is_current).toBe(true);
  });
});
```

## Migration Guide

### Before (Anti-pattern)
```javascript
// Nexus: No compensation creation
// PayLinQ: Custom compensation logic
await this.payrollRepository.createCompensation(...);
```

### After (Industry standard)
```javascript
// Both products use shared service
import compensationService from '../../../shared/services/compensationService.js';
await compensationService.createInitialCompensation(...);
```

## Support

For questions or issues:
- Check the inline JSDoc comments in `compensationService.js`
- Review test cases in `tests/shared/services/compensationService.test.js`
- See usage examples in Nexus and PayLinQ services
