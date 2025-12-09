# PayLinQ Component Eligibility Gap Analysis

**Status:** Gap Identified  
**Priority:** High  
**Impact:** Medium - Affects pay component assignment flexibility  
**Affected Area:** Pay Structure Templates & Component Management  
**Date Identified:** December 8, 2025

---

## Executive Summary

The current PayLinQ system has **eligibility rules at the template level** (`applicable_to_worker_types`, `applicable_to_jurisdictions`) but **NOT at the individual component level**. This creates a gap when different pay components need different eligibility criteria within the same template.

---

## Current Architecture

### Template-Level Eligibility (✅ Implemented)

**Table:** `payroll.pay_structure_template`

```sql
-- Scope & Applicability (Template Level)
applicable_to_worker_types VARCHAR(50)[],      -- ['full_time', 'part_time', 'contractor']
applicable_to_jurisdictions VARCHAR(10)[],     -- ['SR', 'US', 'NL']
```

**Example:**
- Template "STANDARD_SALARY_SR" applies to:
  - Worker Types: `['full_time', 'part_time']`
  - Jurisdictions: `['SR']`

**Limitation:** ALL components in the template inherit these rules. No component-specific eligibility.

### Component-Level Eligibility (❌ Missing)

**Table:** `payroll.pay_structure_component`

**Missing Fields:**
```sql
-- ❌ NOT IMPLEMENTED:
applicable_to_departments UUID[],              -- Which departments can use this component
applicable_to_locations UUID[],                -- Which locations can use this component
applicable_to_employee_types VARCHAR(50)[],   -- ['executive', 'manager', 'staff']
applicable_to_roles VARCHAR(100)[],            -- Role-based eligibility
min_tenure_months INTEGER,                     -- Minimum employment duration
eligibility_conditions JSONB,                  -- Complex eligibility rules
```

---

## Use Cases Requiring Component-Level Eligibility

### Use Case 1: Executive Compensation

**Scenario:** Only executives should receive stock options component.

**Current Workaround:**
- Create separate template: "EXECUTIVE_SALARY_SR"
- Duplicate all common components (BASE_SALARY, AOV, etc.)
- Add STOCK_OPTIONS only to executive template

**Problem:** Template explosion, maintenance nightmare.

**Desired Solution:**
```javascript
// Component definition with eligibility
{
  componentCode: 'STOCK_OPTIONS',
  componentName: 'Stock Options',
  applicableToRoles: ['C-LEVEL', 'VP', 'DIRECTOR'],
  applicableToEmployeeTypes: ['executive'],
  minTenureMonths: 12  // Must be employed 1 year
}
```

### Use Case 2: Department-Specific Bonuses

**Scenario:** Sales department gets commission, Engineering gets innovation bonus.

**Current Workaround:**
- Create "SALARY_SALES_SR" template
- Create "SALARY_ENGINEERING_SR" template
- Duplicate all common components

**Problem:** 10 departments = 10 templates with duplicated components.

**Desired Solution:**
```javascript
// Commission component
{
  componentCode: 'SALES_COMMISSION',
  componentName: 'Sales Commission',
  applicableToDepartments: ['sales-dept-uuid']
}

// Innovation bonus component
{
  componentCode: 'INNOVATION_BONUS',
  componentName: 'Innovation Bonus',
  applicableToDepartments: ['engineering-dept-uuid']
}
```

### Use Case 3: Location-Specific Benefits

**Scenario:** Paramaribo office gets transportation allowance, Nickerie office gets housing allowance.

**Current Workaround:**
- Create "SALARY_PARAMARIBO" template
- Create "SALARY_NICKERIE" template

**Problem:** Every office needs a separate template.

**Desired Solution:**
```javascript
// Transportation allowance
{
  componentCode: 'TRANSPORT_ALLOWANCE',
  componentName: 'Transportation Allowance',
  applicableToLocations: ['paramaribo-office-uuid']
}

// Housing allowance
{
  componentCode: 'HOUSING_ALLOWANCE',
  componentName: 'Housing Allowance',
  applicableToLocations: ['nickerie-office-uuid']
}
```

### Use Case 4: Tenure-Based Benefits

**Scenario:** Loyalty bonus only after 5 years of service.

**Current Workaround:**
- Manual checks during payroll processing
- Error-prone, no systematic enforcement

**Desired Solution:**
```javascript
{
  componentCode: 'LOYALTY_BONUS',
  componentName: '5-Year Loyalty Bonus',
  minTenureMonths: 60,  // 5 years
  eligibilityConditions: {
    type: 'tenure',
    operator: '>=',
    value: 60,
    unit: 'months'
  }
}
```

---

## Proposed Schema Changes

### Option A: Add Eligibility Fields to pay_structure_component

**Advantages:**
- Simple, straightforward
- Easy to implement
- Clear component-level rules

**Disadvantages:**
- Makes component definition more complex
- Harder to maintain when departments/locations change

```sql
ALTER TABLE payroll.pay_structure_component 
ADD COLUMN applicable_to_departments UUID[],
ADD COLUMN applicable_to_locations UUID[],
ADD COLUMN applicable_to_employee_types VARCHAR(50)[],
ADD COLUMN applicable_to_roles VARCHAR(100)[],
ADD COLUMN min_tenure_months INTEGER,
ADD COLUMN max_tenure_months INTEGER,
ADD COLUMN eligibility_conditions JSONB;

-- Add foreign key constraints
ALTER TABLE payroll.pay_structure_component
ADD CONSTRAINT fk_applicable_departments
  FOREIGN KEY (applicable_to_departments) 
  REFERENCES hris.department(id);

-- Cannot use array FK directly in PostgreSQL, requires trigger or junction table
```

### Option B: Separate Eligibility Rules Table

**Advantages:**
- Flexible, extensible
- Can add new rule types without schema changes
- Audit trail of eligibility changes
- Reusable rules across components

**Disadvantages:**
- More complex queries
- Additional table joins

```sql
CREATE TABLE payroll.component_eligibility_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES payroll.pay_structure_component(id) ON DELETE CASCADE,
  
  -- Rule Type
  rule_type VARCHAR(50) NOT NULL 
    CHECK (rule_type IN (
      'department', 
      'location', 
      'employee_type', 
      'role', 
      'tenure', 
      'custom'
    )),
  
  -- Rule Target (depends on rule_type)
  target_department_id UUID REFERENCES hris.department(id),
  target_location_id UUID REFERENCES hris.location(id),
  target_employee_type VARCHAR(50),
  target_role VARCHAR(100),
  
  -- Tenure Rules
  min_tenure_months INTEGER,
  max_tenure_months INTEGER,
  
  -- Custom Rule Expression
  custom_expression TEXT,  -- Formula: "employee.department.code == 'SALES'"
  custom_expression_ast JSONB,
  
  -- Rule Evaluation
  evaluation_order INTEGER DEFAULT 1,
  is_inclusive BOOLEAN DEFAULT true,  -- true = must match, false = must NOT match
  
  -- Metadata
  description TEXT,
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hris.user_account(id),
  updated_by UUID REFERENCES hris.user_account(id),
  deleted_by UUID REFERENCES hris.user_account(id),
  
  -- Constraints
  CONSTRAINT valid_rule_target CHECK (
    (rule_type = 'department' AND target_department_id IS NOT NULL) OR
    (rule_type = 'location' AND target_location_id IS NOT NULL) OR
    (rule_type = 'employee_type' AND target_employee_type IS NOT NULL) OR
    (rule_type = 'role' AND target_role IS NOT NULL) OR
    (rule_type = 'tenure' AND (min_tenure_months IS NOT NULL OR max_tenure_months IS NOT NULL)) OR
    (rule_type = 'custom' AND custom_expression IS NOT NULL)
  )
);

CREATE INDEX idx_component_eligibility_component 
  ON payroll.component_eligibility_rule(component_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_component_eligibility_type 
  ON payroll.component_eligibility_rule(rule_type, component_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_component_eligibility_department 
  ON payroll.component_eligibility_rule(target_department_id) 
  WHERE deleted_at IS NULL AND rule_type = 'department';

CREATE INDEX idx_component_eligibility_location 
  ON payroll.component_eligibility_rule(target_location_id) 
  WHERE deleted_at IS NULL AND rule_type = 'location';
```

---

## Recommended Approach: Hybrid (Option B with UI Simplifications)

### Phase 1: Implement Separate Eligibility Rules Table
- More flexible, future-proof
- Allows complex eligibility scenarios
- Better audit trail

### Phase 2: UI Helper for Common Cases
- Provide simple checkboxes for departments/locations
- Auto-create eligibility rules behind the scenes
- Advanced users can use custom expressions

### Phase 3: Eligibility Evaluation Service
```javascript
class ComponentEligibilityService {
  /**
   * Check if employee is eligible for a component
   */
  async checkEligibility(employeeId, componentId, organizationId) {
    // Get employee details
    const employee = await this.getEmployee(employeeId);
    
    // Get component eligibility rules
    const rules = await this.repository.getEligibilityRules(componentId, organizationId);
    
    // Evaluate all rules (AND logic)
    for (const rule of rules) {
      if (!await this.evaluateRule(rule, employee)) {
        return {
          eligible: false,
          reason: `Failed eligibility rule: ${rule.description}`,
          ruleType: rule.ruleType
        };
      }
    }
    
    return { eligible: true };
  }
  
  async evaluateRule(rule, employee) {
    switch (rule.ruleType) {
      case 'department':
        return employee.departmentId === rule.targetDepartmentId;
      
      case 'location':
        return employee.locationId === rule.targetLocationId;
      
      case 'employee_type':
        return employee.employeeType === rule.targetEmployeeType;
      
      case 'role':
        return employee.roles?.includes(rule.targetRole);
      
      case 'tenure':
        const tenureMonths = this.calculateTenureMonths(employee.hireDate);
        if (rule.minTenureMonths && tenureMonths < rule.minTenureMonths) return false;
        if (rule.maxTenureMonths && tenureMonths > rule.maxTenureMonths) return false;
        return true;
      
      case 'custom':
        return await this.formulaEngine.evaluate(rule.customExpression, { employee });
      
      default:
        return false;
    }
  }
}
```

---

## Integration Points

### 1. Pay Structure Template Assignment
```javascript
// When assigning template to employee
async assignTemplate(employeeId, templateId, organizationId) {
  // Get template components
  const components = await this.getTemplateComponents(templateId);
  
  // Filter components by eligibility
  const eligibleComponents = [];
  const ineligibleComponents = [];
  
  for (const component of components) {
    const eligibility = await this.eligibilityService.checkEligibility(
      employeeId, 
      component.id, 
      organizationId
    );
    
    if (eligibility.eligible) {
      eligibleComponents.push(component);
    } else {
      ineligibleComponents.push({
        component,
        reason: eligibility.reason
      });
    }
  }
  
  // Assign only eligible components
  await this.assignComponents(employeeId, eligibleComponents);
  
  // Log ineligible components
  if (ineligibleComponents.length > 0) {
    logger.info('Some components were not assigned due to eligibility', {
      employeeId,
      ineligibleComponents: ineligibleComponents.map(ic => ({
        code: ic.component.componentCode,
        reason: ic.reason
      }))
    });
  }
  
  return {
    assignedComponents: eligibleComponents.length,
    skippedComponents: ineligibleComponents.length,
    skippedDetails: ineligibleComponents
  };
}
```

### 2. Payroll Run Processing
```javascript
// During payroll run
async processPayrollRun(runId, organizationId) {
  const employees = await this.getEmployeesInRun(runId);
  
  for (const employee of employees) {
    // Get assigned template
    const template = await this.getEmployeeTemplate(employee.id);
    
    // Get components
    const components = await this.getTemplateComponents(template.id);
    
    // Filter by eligibility AT RUNTIME
    const eligibleComponents = [];
    for (const component of components) {
      const eligibility = await this.eligibilityService.checkEligibility(
        employee.id,
        component.id,
        organizationId
      );
      
      if (eligibility.eligible) {
        eligibleComponents.push(component);
      }
    }
    
    // Calculate pay using only eligible components
    const payCalculation = await this.calculatePay(employee, eligibleComponents);
    
    // ... store results
  }
}
```

### 3. UI Component Selection
```javascript
// When configuring pay structure template
async getAvailableComponents(templateId, organizationId, employeeId = null) {
  const allComponents = await this.repository.getTemplateComponents(templateId);
  
  if (!employeeId) {
    // Show all components with eligibility rules
    return allComponents.map(c => ({
      ...c,
      hasEligibilityRules: c.eligibilityRules?.length > 0,
      eligibilityRulesSummary: this.summarizeRules(c.eligibilityRules)
    }));
  }
  
  // Filter for specific employee
  const availableComponents = [];
  for (const component of allComponents) {
    const eligibility = await this.eligibilityService.checkEligibility(
      employeeId,
      component.id,
      organizationId
    );
    
    availableComponents.push({
      ...component,
      isEligible: eligibility.eligible,
      ineligibilityReason: eligibility.reason
    });
  }
  
  return availableComponents;
}
```

---

## Migration Strategy

### Step 1: Create Eligibility Rules Table (Non-Breaking)
```sql
-- Add new table (does not affect existing functionality)
CREATE TABLE payroll.component_eligibility_rule (...);
```

### Step 2: Add Service Layer Methods
```javascript
// New methods, backward compatible
checkEligibility(employeeId, componentId, organizationId)
evaluateRule(rule, employee)
getEligibilityRules(componentId, organizationId)
```

### Step 3: Update Template Assignment (Opt-In)
```javascript
// Add flag to enable eligibility checking
async assignTemplate(employeeId, templateId, organizationId, options = {}) {
  const { enforceEligibility = false } = options;
  
  if (enforceEligibility) {
    // Use new eligibility logic
    return this.assignTemplateWithEligibility(...);
  } else {
    // Use legacy logic (no filtering)
    return this.assignTemplateLegacy(...);
  }
}
```

### Step 4: UI Updates
- Add eligibility rules tab to component editor
- Show eligibility status on employee pay structure view
- Add bulk eligibility checker tool

### Step 5: Full Rollout
- Enable eligibility checking by default
- Deprecate legacy assignment logic
- Add migration tools for existing templates

---

## Impact Assessment

### Performance Impact
- **Low-Medium:** Eligibility checks add queries per component
- **Mitigation:** Cache eligibility results per payroll run
- **Estimated:** +50-100ms per employee during payroll run

### Data Migration
- **None Required:** New functionality, existing data unaffected
- **Backward Compatible:** Opt-in eligibility enforcement

### User Training
- **Required:** HR users need to understand eligibility rules
- **Documentation:** Update user manual with eligibility examples
- **Support:** Provide eligibility rule templates

---

## Alternatives Considered

### Alternative 1: Worker Type + Department Combination
**Rejected:** Too rigid, doesn't handle complex scenarios

### Alternative 2: Role-Based Access Control
**Rejected:** RBAC is for permissions, not pay eligibility

### Alternative 3: External Eligibility Service
**Rejected:** Over-engineering, adds latency

---

## Recommendation

**Implement Option B (Separate Eligibility Rules Table)** with the following timeline:

1. **Phase 1 (2 weeks):** Schema changes + eligibility service
2. **Phase 2 (1 week):** UI for simple rules (department/location checkboxes)
3. **Phase 3 (1 week):** Template assignment integration
4. **Phase 4 (1 week):** Payroll run integration
5. **Phase 5 (1 week):** Testing + documentation

**Total Estimate:** 6 weeks development + 2 weeks testing = **2 months**

---

## Questions for Stakeholders

1. **Priority:** Is this a blocking issue or can it wait until next quarter?
2. **Scope:** Do we need custom expression support or just department/location/tenure?
3. **UI Complexity:** Simple checkboxes or full rule builder?
4. **Performance:** What's the acceptable latency for eligibility checks?
5. **Migration:** Do existing templates need retroactive eligibility rules?

---

## Related Documentation

- [Backend Standards](./BACKEND_STANDARDS.md) - Service layer patterns
- [Database Standards](./DATABASE_STANDARDS.md) - Schema design principles
- [PayLinQ Schema](../backend/src/database/paylinq-schema.sql) - Current schema

---

**Status:** Awaiting stakeholder review  
**Next Steps:** Schedule design review meeting  
**Owner:** Development Team  
**Reviewers:** Product Manager, HR System Users
