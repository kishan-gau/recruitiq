# TWK (Terugwerkende Kracht) - Retroactive Payment System
## Complete Implementation Specification for PaylinQ

**Document Version:** 1.0.0  
**Created:** November 5, 2025  
**Target System:** PaylinQ - RecruitIQ Platform  
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Requirements](#business-requirements)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [Calculation Engine](#calculation-engine)
6. [Formula System](#formula-system)
7. [API Endpoints](#api-endpoints)
8. [Frontend Components](#frontend-components)
9. [Testing Strategy](#testing-strategy)
10. [Migration Guide](#migration-guide)

---

## 1. Executive Summary

### What is TWK?

**TWK (Terugwerkende Kracht)** is a retroactive payment calculation system required in Suriname when:
- A Collective Labor Agreement (CAO) changes with a past effective date
- Salary components are adjusted retroactively
- Benefits or allowances are increased with backdated effect

### Core Functionality

The TWK system must:
1. **Calculate retroactive differences** between old and new compensation terms
2. **Support multiple scenarios** (component-based and formula-based)
3. **Handle variable salaries** (hourly workers, unpaid leave, varying overtime)
4. **Provide what-if simulations** before actual execution
5. **Track and audit** all TWK scenarios and payments
6. **Integrate seamlessly** with existing payroll runs

### Key Design Principles

- ✅ **Maximum Flexibility** - Support any combination of components and formulas
- ✅ **Historical Accuracy** - Calculate based on actual past payroll data
- ✅ **Scenario Simulation** - Test impact before committing
- ✅ **Complete Audit Trail** - Track every calculation and decision
- ✅ **Multi-Component Support** - Handle simple to complex scenarios

---

## 2. Business Requirements

### 2.1 Use Cases

#### Use Case 1: Simple Base Salary Increase
**Scenario:** CAO increases base salary by 8% effective 3 months ago

```
Old Base: SRD 5,000/month
New Base: SRD 5,400/month
Effective Date: 2025-01-01
Current Date: 2025-04-15

TWK Calculation:
- January: SRD 5,400 - SRD 5,000 = SRD 400
- February: SRD 5,400 - SRD 5,000 = SRD 400
- March: SRD 5,400 - SRD 5,000 = SRD 400
Total TWK: SRD 1,200
```

#### Use Case 2: Multi-Component Retroactive Change
**Scenario:** CAO changes both base salary and transport benefit

```
Changes Effective 2025-02-01:
- Base Salary: +10%
- Transport Benefit: SRD 300 → SRD 450

For each past period:
  TWK = (New Base - Old Base) + (New Transport - Old Transport)
```

#### Use Case 3: Hourly Worker with Variable Hours
**Scenario:** Hourly rate increase for worker with varying monthly hours

```
Old Rate: SRD 50/hour
New Rate: SRD 55/hour
Effective: 2025-01-01

January: 160 hours → TWK = 160 × (55 - 50) = SRD 800
February: 140 hours → TWK = 140 × (55 - 50) = SRD 700
March: 175 hours → TWK = 175 × (55 - 50) = SRD 875
Total TWK: SRD 2,375
```

#### Use Case 4: Formula-Based Calculation
**Scenario:** Complex increase based on salary tier

```
Formula: if (base_salary < 3000) then base_salary × 0.10
         else if (base_salary < 5000) then base_salary × 0.07
         else base_salary × 0.05

Applied retroactively to each past period based on actual salary that period
```

#### Use Case 5: Worker with Unpaid Leave
**Scenario:** Monthly worker had unpaid leave in some periods

```
New Salary: SRD 6,000/month
Effective: 2025-01-01

January: Full month → TWK = (6000 - 5500) = SRD 500
February: 20 days worked (5 unpaid) → TWK proportional
March: Full month → TWK = SRD 500
```

### 2.2 Functional Requirements

#### FR-1: TWK Scenario Management
- Create, edit, delete, and archive TWK scenarios
- Name and describe scenarios for organizational tracking
- Set effective dates and calculation rules
- Support draft and approved states

#### FR-2: Component Selection
- Select any combination of pay components
- Support standard and custom pay components
- Define change type per component:
  - Fixed amount increase/decrease
  - Percentage change
  - New absolute value
  - Formula-based calculation

#### FR-3: Formula Engine
- Support arithmetic operations: `+`, `-`, `*`, `/`, `()`
- Support comparison operators: `<`, `>`, `<=`, `>=`, `==`, `!=`
- Support conditional logic: `if/else`, ternary operators
- Access component values: `base_salary`, `transport`, `overtime_rate`
- Access period data: `hours_worked`, `days_worked`, `period_number`
- Support functions: `min()`, `max()`, `round()`, `floor()`, `ceil()`

#### FR-4: Historical Data Access
- Query all payroll runs since effective date
- Access paycheck details per employee
- Retrieve component-level breakdown
- Handle missing or incomplete historical data

#### FR-5: Simulation ("What-If")
- Calculate TWK impact without committing
- Show per-employee breakdown
- Display total liability by department/cost center
- Export simulation results
- Compare multiple scenarios side-by-side

#### FR-6: Execution & Payment
- Approve scenario after simulation
- Generate TWK payment records
- Option to pay in next regular payroll or separate run
- Create audit trail of execution
- Generate payment reports

#### FR-7: Reporting & Analytics
- TWK liability reports
- Employee impact analysis
- Component-wise breakdown
- Historical TWK payments
- Comparative scenario analysis

### 2.3 Non-Functional Requirements

#### NFR-1: Performance
- Calculate TWK for 1,000 employees in < 30 seconds
- Support scenarios spanning 12+ months
- Handle complex formulas efficiently

#### NFR-2: Accuracy
- Financial calculations accurate to 2 decimal places
- No rounding errors in multi-step calculations
- Maintain calculation audit trail

#### NFR-3: Security
- Role-based access control for TWK scenarios
- Approval workflow for execution
- Encryption of sensitive salary data
- Audit log of all operations

#### NFR-4: Usability
- Intuitive scenario creation wizard
- Visual formula builder
- Clear simulation results display
- Error messages with actionable guidance

#### NFR-5: Maintainability
- Modular calculation engine
- Extensible formula system
- Clear separation of concerns
- Comprehensive unit tests

---

## 3. System Architecture

### 3.1 Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
├─────────────────────────────────────────────────────────────┤
│  TWK Scenario Manager  │  Formula Builder  │  Simulation UI │
│  Approval Workflow     │  Reports Dashboard                 │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
├─────────────────────────────────────────────────────────────┤
│  twkScenarioController  │  twkCalculationController         │
│  twkExecutionController │  twkReportController              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│  twkScenarioService     │  twkCalculationService            │
│  twkFormulaService      │  twkExecutionService              │
│  twkSimulationService   │  twkReportService                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Calculation Engine                         │
├─────────────────────────────────────────────────────────────┤
│  Component-Based Calculator  │  Formula Parser & Evaluator  │
│  Historical Data Aggregator  │  Period-by-Period Processor  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer                           │
├─────────────────────────────────────────────────────────────┤
│  twkScenarioRepository  │  twkCalculationRepository         │
│  payrollRepository      │  payComponentRepository           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                            │
├─────────────────────────────────────────────────────────────┤
│  twk_scenarios          │  twk_scenario_components          │
│  twk_calculations       │  twk_execution_log                │
│  payroll_run (existing) │  paycheck (existing)              │
│  payroll_run_component  │  pay_component (existing)         │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

#### Scenario Creation Flow
```
User → Frontend → Create Scenario → API
  → Validate Inputs → Save to DB → Return Scenario ID
```

#### Simulation Flow
```
User → Request Simulation → API → Load Scenario
  → Load Historical Payroll Data → Calculate Per Employee
  → Aggregate Results → Return to Frontend → Display
```

#### Execution Flow
```
User → Approve & Execute → API → Validate Approval Rights
  → Lock Scenario → Execute Calculations → Create Payment Records
  → Update Payroll Run (or create new) → Mark Complete → Audit Log
```

### 3.3 Integration Points

#### With Existing Payroll System
- Read historical payroll runs from `payroll.payroll_run`
- Read paycheck details from `payroll.paycheck`
- Read component breakdown from `payroll.payroll_run_component`
- Create new paycheck records for TWK payments

#### With Employee Records
- Access employee compensation history from `payroll.compensation`
- Validate employee eligibility
- Link TWK payments to employee records

#### With Pay Components
- Access component definitions from `payroll.pay_component`
- Support custom components from `payroll.custom_pay_component`
- Respect component calculation rules

#### With Tax Engine
- Apply tax rules to TWK payments
- Respect tax brackets and allowances
- Calculate employer contributions

---


## 4. Database Schema

### 4.1 New Tables

#### Table: \	wk_scenarios\
**Purpose:** Store TWK scenario definitions and configurations

\\\sql
CREATE TABLE IF NOT EXISTS payroll.twk_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Scenario identification
  scenario_code VARCHAR(50) NOT NULL,
  scenario_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Effective dates
  effective_date DATE NOT NULL, -- Retroactive start date
  calculation_date DATE NOT NULL, -- When scenario was created
  
  -- Calculation method
  calculation_method VARCHAR(20) NOT NULL CHECK (calculation_method IN ('component_based', 'formula_based', 'hybrid')),
  
  -- Status and workflow
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'simulated', 'approved', 'executed', 'cancelled')),
  
  -- Simulation results (cached)
  total_employees INTEGER,
  total_twk_amount NUMERIC(12, 2),
  simulated_at TIMESTAMP WITH TIME ZONE,
  simulated_by UUID REFERENCES users(id),
  
  -- Approval workflow
  submitted_for_approval_at TIMESTAMP WITH TIME ZONE,
  submitted_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  approval_notes TEXT,
  
  -- Execution tracking
  executed_at TIMESTAMP WITH TIME ZONE,
  executed_by UUID REFERENCES users(id),
  execution_payroll_run_id UUID REFERENCES payroll.payroll_run(id),
  
  -- Metadata
  tags TEXT[], -- For categorization (e.g., 'CAO-2025', 'Q1-Adjustment')
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id),
  
  UNIQUE(organization_id, scenario_code),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_twk_scenarios_org_status ON payroll.twk_scenarios(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_twk_scenarios_effective_date ON payroll.twk_scenarios(effective_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_twk_scenarios_status ON payroll.twk_scenarios(status) WHERE deleted_at IS NULL;

COMMENT ON TABLE payroll.twk_scenarios IS 'TWK (retroactive payment) scenario definitions and configurations';
COMMENT ON COLUMN payroll.twk_scenarios.calculation_method IS 'component_based: Change specific components, formula_based: Use custom formula, hybrid: Both';
COMMENT ON COLUMN payroll.twk_scenarios.effective_date IS 'The retroactive start date from which TWK should be calculated';
\\\

---

#### Table: \	wk_scenario_components\
**Purpose:** Define component-based changes for TWK scenarios

\\\sql
CREATE TABLE IF NOT EXISTS payroll.twk_scenario_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  twk_scenario_id UUID NOT NULL REFERENCES payroll.twk_scenarios(id) ON DELETE CASCADE,
  
  -- Component identification
  component_code VARCHAR(50) NOT NULL,
  component_name VARCHAR(100) NOT NULL,
  component_type VARCHAR(20) CHECK (component_type IN ('standard', 'custom')),
  
  -- Change specification
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('fixed_amount', 'percentage', 'new_value', 'formula', 'rate_change')),
  change_value NUMERIC(12, 4), -- The amount, percentage, or new value
  change_operator VARCHAR(10) CHECK (change_operator IN ('add', 'subtract', 'multiply', 'replace')),
  
  -- Formula (if change_type = 'formula')
  formula_expression TEXT,
  
  -- Applicability filters
  apply_to_employees UUID[], -- Specific employee IDs (NULL = all)
  apply_to_departments VARCHAR(100)[],
  min_salary NUMERIC(12, 2),
  max_salary NUMERIC(12, 2),
  
  -- Calculation settings
  prorate_partial_periods BOOLEAN DEFAULT true,
  apply_to_overtime BOOLEAN DEFAULT false,
  
  -- Metadata
  sequence_order INTEGER DEFAULT 1, -- Order of calculation if multiple components
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (twk_scenario_id) REFERENCES payroll.twk_scenarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_twk_components_scenario ON payroll.twk_scenario_components(twk_scenario_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_twk_components_code ON payroll.twk_scenario_components(component_code) WHERE deleted_at IS NULL;

COMMENT ON TABLE payroll.twk_scenario_components IS 'Component-specific changes for TWK scenarios';
COMMENT ON COLUMN payroll.twk_scenario_components.change_type IS 'How to apply the change: fixed_amount (+500), percentage (+10%), new_value (5500), formula (custom), rate_change (hourly rate)';
COMMENT ON COLUMN payroll.twk_scenario_components.prorate_partial_periods IS 'Whether to prorate for partial months/periods';
\\\

---

#### Table: \	wk_scenario_formulas\
**Purpose:** Store formula-based calculation rules

\\\sql
CREATE TABLE IF NOT EXISTS payroll.twk_scenario_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  twk_scenario_id UUID NOT NULL REFERENCES payroll.twk_scenarios(id) ON DELETE CASCADE,
  
  -- Formula definition
  formula_name VARCHAR(100) NOT NULL,
  formula_expression TEXT NOT NULL,
  formula_description TEXT,
  
  -- Variables and context
  available_variables JSONB, -- List of variables that can be used
  affected_components VARCHAR(50)[], -- Which components this formula affects
  
  -- Validation
  is_validated BOOLEAN DEFAULT false,
  validation_result TEXT,
  validation_date TIMESTAMP WITH TIME ZONE,
  
  -- Applicability
  apply_to_employees UUID[],
  apply_to_departments VARCHAR(100)[],
  conditions JSONB, -- Additional conditional logic
  
  -- Execution order
  execution_order INTEGER DEFAULT 1,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_by UUID REFERENCES users(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (twk_scenario_id) REFERENCES payroll.twk_scenarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_twk_formulas_scenario ON payroll.twk_scenario_formulas(twk_scenario_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE payroll.twk_scenario_formulas IS 'Formula-based calculation rules for TWK scenarios';
COMMENT ON COLUMN payroll.twk_scenario_formulas.formula_expression IS 'JavaScript-style expression, e.g., (base_salary * 0.08) + (transport * 0.10)';
COMMENT ON COLUMN payroll.twk_scenario_formulas.available_variables IS 'JSON object defining available variables and their types';
\\\

---

#### Table: \	wk_calculations\
**Purpose:** Store calculated TWK amounts per employee per period

\\\sql
CREATE TABLE IF NOT EXISTS payroll.twk_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  twk_scenario_id UUID NOT NULL REFERENCES payroll.twk_scenarios(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hris.employee(id) ON DELETE CASCADE,
  
  -- Period information
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label VARCHAR(50), -- e.g., 'January 2025', 'Week 1 2025'
  
  -- Historical payroll reference
  historical_payroll_run_id UUID REFERENCES payroll.payroll_run(id),
  historical_paycheck_id UUID REFERENCES payroll.paycheck(id),
  
  -- Original amounts (what was paid)
  original_gross_amount NUMERIC(12, 2),
  original_component_amounts JSONB, -- Breakdown by component
  
  -- New calculated amounts (what should have been paid)
  new_gross_amount NUMERIC(12, 2),
  new_component_amounts JSONB,
  
  -- TWK difference
  twk_amount NUMERIC(12, 2) NOT NULL,
  twk_component_breakdown JSONB, -- TWK per component
  
  -- Calculation metadata
  calculation_method VARCHAR(50),
  formula_used TEXT,
  calculation_notes TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'calculated' CHECK (status IN ('calculated', 'verified', 'approved', 'paid', 'voided')),
  
  -- Tax implications
  twk_tax_amount NUMERIC(12, 2),
  twk_net_amount NUMERIC(12, 2),
  
  -- Audit fields
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  calculated_by UUID REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES users(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (twk_scenario_id) REFERENCES payroll.twk_scenarios(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES hris.employee(id) ON DELETE CASCADE
);

CREATE INDEX idx_twk_calc_scenario_employee ON payroll.twk_calculations(twk_scenario_id, employee_id);
CREATE INDEX idx_twk_calc_period ON payroll.twk_calculations(period_start, period_end);
CREATE INDEX idx_twk_calc_status ON payroll.twk_calculations(status);

COMMENT ON TABLE payroll.twk_calculations IS 'Calculated TWK amounts per employee per period';
COMMENT ON COLUMN payroll.twk_calculations.twk_amount IS 'The retroactive payment owed: new_amount - original_amount';
COMMENT ON COLUMN payroll.twk_calculations.twk_component_breakdown IS 'JSON breakdown showing TWK per component';
\\\

---

#### Table: \	wk_execution_log\
**Purpose:** Audit trail of TWK scenario execution

\\\sql
CREATE TABLE IF NOT EXISTS payroll.twk_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  twk_scenario_id UUID NOT NULL REFERENCES payroll.twk_scenarios(id) ON DELETE CASCADE,
  
  -- Execution details
  execution_type VARCHAR(20) NOT NULL CHECK (execution_type IN ('simulation', 'approval', 'execution', 'cancellation')),
  execution_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_by UUID NOT NULL REFERENCES users(id),
  
  -- Results
  employees_affected INTEGER,
  total_twk_amount NUMERIC(12, 2),
  execution_status VARCHAR(20) CHECK (execution_status IN ('started', 'in_progress', 'completed', 'failed', 'rolled_back')),
  
  -- Error handling
  error_message TEXT,
  errors_encountered JSONB, -- Array of errors
  warnings JSONB,
  
  -- Payment details (for execution type)
  payment_method VARCHAR(20),
  payroll_run_id UUID REFERENCES payroll.payroll_run(id),
  payment_date DATE,
  
  -- Metadata
  execution_parameters JSONB, -- Parameters used for execution
  duration_seconds INTEGER,
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (twk_scenario_id) REFERENCES payroll.twk_scenarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_twk_exec_log_scenario ON payroll.twk_execution_log(twk_scenario_id);
CREATE INDEX idx_twk_exec_log_timestamp ON payroll.twk_execution_log(execution_timestamp);
CREATE INDEX idx_twk_exec_log_type ON payroll.twk_execution_log(execution_type);

COMMENT ON TABLE payroll.twk_execution_log IS 'Complete audit trail of all TWK scenario operations';
COMMENT ON COLUMN payroll.twk_execution_log.execution_type IS 'Type of operation: simulation, approval, execution, cancellation';
\\\

---

#### Table: \	wk_payments\
**Purpose:** Link TWK calculations to actual paycheck payments

\\\sql
CREATE TABLE IF NOT EXISTS payroll.twk_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  twk_scenario_id UUID NOT NULL REFERENCES payroll.twk_scenarios(id) ON DELETE CASCADE,
  twk_calculation_id UUID NOT NULL REFERENCES payroll.twk_calculations(id) ON DELETE CASCADE,
  
  -- Payment linkage
  payroll_run_id UUID NOT NULL REFERENCES payroll.payroll_run(id) ON DELETE CASCADE,
  paycheck_id UUID NOT NULL REFERENCES payroll.paycheck(id) ON DELETE CASCADE,
  
  -- Payment details
  twk_gross_amount NUMERIC(12, 2) NOT NULL,
  twk_tax_amount NUMERIC(12, 2),
  twk_net_amount NUMERIC(12, 2) NOT NULL,
  
  -- Component breakdown
  twk_components JSONB, -- Array of component payments
  
  -- Payment status
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processed', 'paid', 'failed', 'reversed')),
  payment_date DATE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (twk_scenario_id) REFERENCES payroll.twk_scenarios(id) ON DELETE CASCADE,
  FOREIGN KEY (twk_calculation_id) REFERENCES payroll.twk_calculations(id) ON DELETE CASCADE,
  FOREIGN KEY (payroll_run_id) REFERENCES payroll.payroll_run(id) ON DELETE CASCADE,
  FOREIGN KEY (paycheck_id) REFERENCES payroll.paycheck(id) ON DELETE CASCADE
);

CREATE INDEX idx_twk_payments_scenario ON payroll.twk_payments(twk_scenario_id);
CREATE INDEX idx_twk_payments_payroll_run ON payroll.twk_payments(payroll_run_id);
CREATE INDEX idx_twk_payments_employee ON payroll.twk_payments(paycheck_id);
CREATE INDEX idx_twk_payments_status ON payroll.twk_payments(payment_status);

COMMENT ON TABLE payroll.twk_payments IS 'Links TWK calculations to actual paycheck payments';
COMMENT ON COLUMN payroll.twk_payments.twk_components IS 'JSON array of TWK payment components with amounts';
\\\

---


### 4.2 Database Relationships

```
twk_scenarios (1)  (N) twk_scenario_components
twk_scenarios (1)  (N) twk_scenario_formulas
twk_scenarios (1)  (N) twk_calculations
twk_scenarios (1)  (N) twk_execution_log
twk_scenarios (1)  (N) twk_payments

twk_calculations (1)  (1) twk_payments
twk_calculations (N)  (1) employee_record
twk_calculations (N)  (1) payroll_run (historical)
twk_calculations (N)  (1) paycheck (historical)

twk_payments (N)  (1) payroll_run (payment)
twk_payments (N)  (1) paycheck (payment)
```

---

## 5. Calculation Engine

### 5.1 Core Calculation Flow

```javascript
// High-level pseudocode
async function calculateTWK(scenarioId) {
  // 1. Load scenario configuration
  const scenario = await loadScenario(scenarioId);
  
  // 2. Determine affected employees
  const employees = await getAffectedEmployees(scenario);
  
  // 3. Get historical payroll periods
  const periods = await getHistoricalPeriods(
    scenario.effectiveDate,
    new Date()
  );
  
  // 4. For each employee and period
  for (const employee of employees) {
    for (const period of periods) {
      // 4a. Load historical payroll data
      const historical = await getHistoricalPayroll(employee, period);
      
      // 4b. Calculate what SHOULD have been paid
      const recalculated = await recalculatePayroll(
        employee,
        period,
        scenario,
        historical
      );
      
      // 4c. Calculate TWK difference
      const twk = recalculated.gross - historical.gross;
      
      // 4d. Store calculation
      await storeTWKCalculation({
        scenarioId,
        employeeId: employee.id,
        period,
        original: historical,
        new: recalculated,
        twkAmount: twk
      });
    }
  }
  
  // 5. Aggregate and return results
  return await aggregateTWKResults(scenarioId);
}
```

### 5.2 Component-Based Calculation

```javascript
/**
 * Calculate TWK for component-based scenarios
 */
async function calculateComponentBasedTWK(employee, period, historical, components) {
  const results = {
    originalGross: historical.grossPay,
    newGross: historical.grossPay,
    twkBreakdown: {}
  };
  
  // Process each affected component
  for (const component of components) {
    const originalAmount = historical.components[component.code] || 0;
    let newAmount = originalAmount;
    
    switch (component.changeType) {
      case 'fixed_amount':
        newAmount = originalAmount + component.changeValue;
        break;
        
      case 'percentage':
        newAmount = originalAmount * (1 + component.changeValue / 100);
        break;
        
      case 'new_value':
        newAmount = component.changeValue;
        break;
        
      case 'rate_change':
        // For hourly workers - apply new rate to actual hours
        const hours = historical.hoursWorked || 0;
        const oldRate = historical.rates[component.code] || 0;
        const newRate = component.changeValue;
        newAmount = hours * newRate;
        break;
        
      case 'formula':
        // Evaluate formula for this component
        newAmount = await evaluateFormula(
          component.formulaExpression,
          { employee, period, historical }
        );
        break;
    }
    
    // Apply prorating if needed
    if (component.proratePartialPeriods && period.isPartial) {
      newAmount = newAmount * period.prorateRatio;
    }
    
    // Calculate TWK for this component
    const componentTWK = newAmount - originalAmount;
    results.twkBreakdown[component.code] = {
      original: originalAmount,
      new: newAmount,
      twk: componentTWK
    };
    
    results.newGross += componentTWK;
  }
  
  results.totalTWK = results.newGross - results.originalGross;
  return results;
}
```

### 5.3 Formula-Based Calculation

```javascript
/**
 * Calculate TWK using custom formulas
 */
async function calculateFormulaBasedTWK(employee, period, historical, formulas) {
  const context = prepareFormulaContext(employee, period, historical);
  const results = {
    originalGross: historical.grossPay,
    newGross: 0,
    twkBreakdown: {}
  };
  
  // Sort formulas by execution order
  const sortedFormulas = formulas.sort((a, b) => a.executionOrder - b.executionOrder);
  
  for (const formula of sortedFormulas) {
    try {
      // Evaluate the formula
      const calculatedAmount = await evaluateFormula(
        formula.formulaExpression,
        context
      );
      
      // Determine which component this affects
      for (const componentCode of formula.affectedComponents) {
        const originalAmount = historical.components[componentCode] || 0;
        const twk = calculatedAmount - originalAmount;
        
        results.twkBreakdown[componentCode] = {
          original: originalAmount,
          new: calculatedAmount,
          twk: twk,
          formula: formula.formulaName
        };
        
        results.newGross += twk;
      }
      
      // Update context for next formula
      context.calculatedValues[formula.formulaName] = calculatedAmount;
      
    } catch (error) {
      throw new FormulaEvaluationError(
        `Failed to evaluate formula "${formula.formulaName}": ${error.message}`
      );
    }
  }
  
  results.totalTWK = results.newGross - results.originalGross;
  return results;
}
```

### 5.4 Historical Data Aggregation

```javascript
/**
 * Aggregate historical payroll data for TWK calculation
 */
async function getHistoricalPayroll(employeeId, period) {
  // Find the historical payroll run for this period
  const payrollRun = await db.query(`
    SELECT * FROM payroll.payroll_run
    WHERE organization_id = $1
      AND pay_period_start <= $2
      AND pay_period_end >= $3
      AND status = 'processed'
      AND deleted_at IS NULL
    ORDER BY pay_period_end DESC
    LIMIT 1
  `, [organizationId, period.start, period.end]);
  
  if (!payrollRun) {
    return null; // No historical payroll for this period
  }
  
  // Get the employee's paycheck
  const paycheck = await db.query(`
    SELECT * FROM payroll.paycheck
    WHERE payroll_run_id = $1
      AND employee_id = $2
      AND deleted_at IS NULL
  `, [payrollRun.id, employeeId]);
  
  if (!paycheck) {
    return null; // Employee not paid in this period
  }
  
  // Get component breakdown
  const components = await db.query(`
    SELECT 
      component_code,
      component_name,
      component_type,
      units,
      rate,
      amount
    FROM payroll.payroll_run_component
    WHERE paycheck_id = $1
      AND deleted_at IS NULL
  `, [paycheck.id]);
  
  // Get time entries for this period (if applicable)
  const timeEntries = await db.query(`
    SELECT 
      SUM(hours_worked) as total_hours,
      SUM(CASE WHEN is_overtime THEN hours_worked ELSE 0 END) as overtime_hours
    FROM payroll.time_entry
    WHERE employee_id = $1
      AND start_time >= $2
      AND end_time <= $3
      AND deleted_at IS NULL
  `, [employeeId, period.start, period.end]);
  
  return {
    payrollRunId: payrollRun.id,
    paycheckId: paycheck.id,
    grossPay: paycheck.gross_pay,
    netPay: paycheck.net_pay,
    components: components.reduce((acc, c) => {
      acc[c.component_code] = c.amount;
      return acc;
    }, {}),
    rates: components.reduce((acc, c) => {
      if (c.rate) acc[c.component_code] = c.rate;
      return acc;
    }, {}),
    hoursWorked: timeEntries.total_hours || 0,
    overtimeHours: timeEntries.overtime_hours || 0,
    period: {
      start: payrollRun.pay_period_start,
      end: payrollRun.pay_period_end
    }
  };
}
```

### 5.5 Period Handling

```javascript
/**
 * Get all payroll periods between effective date and now
 */
async function getHistoricalPeriods(effectiveDate, endDate) {
  const payrollRuns = await db.query(`
    SELECT DISTINCT
      pay_period_start,
      pay_period_end,
      id as payroll_run_id
    FROM payroll.payroll_run
    WHERE organization_id = $1
      AND pay_period_end >= $2
      AND pay_period_start <= $3
      AND status = 'processed'
      AND deleted_at IS NULL
    ORDER BY pay_period_start ASC
  `, [organizationId, effectiveDate, endDate]);
  
  return payrollRuns.map(run => ({
    start: run.pay_period_start,
    end: run.pay_period_end,
    payrollRunId: run.payroll_run_id,
    label: formatPeriodLabel(run.pay_period_start, run.pay_period_end),
    isPartial: isPartialPeriod(run.pay_period_start, run.pay_period_end, effectiveDate),
    prorateRatio: calculateProrateRatio(run.pay_period_start, run.pay_period_end, effectiveDate)
  }));
}

/**
 * Calculate proration ratio for partial periods
 */
function calculateProrateRatio(periodStart, periodEnd, effectiveDate) {
  if (effectiveDate <= periodStart) {
    return 1.0; // Full period
  }
  
  const totalDays = (periodEnd - periodStart) / (1000 * 60 * 60 * 24);
  const effectiveDays = (periodEnd - effectiveDate) / (1000 * 60 * 60 * 24);
  
  return effectiveDays / totalDays;
}
```

---

## 6. Formula System

### 6.1 Formula Engine Architecture

The formula engine uses a sandboxed JavaScript expression evaluator with restricted access to prevent security issues.

**Supported Features:**
-  Arithmetic operations: `+`, `-`, `*`, `/`, `%`, `**`
-  Comparison operators: `<`, `>`, `<=`, `>=`, `==`, `!=`, `===`, `!==`
-  Logical operators: `&&`, `||`, `!`
-  Ternary operator: `condition ? valueIfTrue : valueIfFalse`
-  Math functions: `Math.round()`, `Math.floor()`, `Math.ceil()`, `Math.min()`, `Math.max()`
-  Conditional statements: `if/else`

**Security Restrictions:**
-  No `eval()` or `Function()` constructor
-  No access to `require()` or `import()`
-  No file system access
-  No network access
-  No access to global objects beyond Math

### 6.2 Available Variables

```javascript
// Employee data
employee.id                    // UUID
employee.employeeNumber       // String
employee.fullName             // String
employee.startDate            // Date
employee.payFrequency         // String

// Compensation data
compensation.baseSalary       // Number
compensation.hourlyRate       // Number
compensation.overtimeRate     // Number
compensation.annualAmount     // Number

// Period data
period.start                  // Date
period.end                    // Date
period.label                  // String
period.daysInPeriod          // Number
period.monthNumber           // Number
period.year                  // Number

// Time data (if applicable)
time.hoursWorked             // Number
time.overtimeHours           // Number
time.regularHours            // Number
time.daysWorked              // Number
time.absenceDays             // Number

// Historical amounts
historical.grossPay          // Number
historical.netPay            // Number
historical.basePay           // Number
historical.overtimePay       // Number

// Component values (dynamic based on pay components)
components.base_salary       // Number
components.transport         // Number
components.housing           // Number
components.overtime          // Number
// ... any other component codes

// Calculated values from previous formulas
calculated.previousFormula   // Number (if other formulas ran first)
```

### 6.3 Formula Examples

#### Example 1: Simple Percentage Increase
```javascript
// Increase base salary by 8%
components.base_salary * 1.08
```

#### Example 2: Tiered Increase
```javascript
// Tiered increase based on salary range
components.base_salary < 3000 
  ? components.base_salary * 1.10 
  : components.base_salary < 5000 
    ? components.base_salary * 1.07 
    : components.base_salary * 1.05
```

#### Example 3: Multi-Component Change
```javascript
// Increase base + transport proportionally
(components.base_salary * 1.08) + (components.transport * 1.15)
```

#### Example 4: Hours-Based Calculation
```javascript
// New hourly rate applied to actual hours
time.hoursWorked * 55 + (time.overtimeHours * 55 * 1.5)
```

#### Example 5: Conditional with Tenure
```javascript
// Increase based on years of service
(() => {
  const yearsOfService = (new Date() - employee.startDate) / (365.25 * 24 * 60 * 60 * 1000);
  const increasePercent = yearsOfService < 2 ? 0.05 : yearsOfService < 5 ? 0.07 : 0.10;
  return components.base_salary * (1 + increasePercent);
})()
```

#### Example 6: Complex CAO Adjustment
```javascript
// CAO 2025: Base increase + transport adjustment
(() => {
  const newBase = components.base_salary * 1.08;
  const newTransport = components.transport < 300 ? 350 : components.transport * 1.10;
  const housingAdjustment = components.housing ? components.housing * 1.05 : 0;
  return newBase + newTransport + housingAdjustment;
})()
```

### 6.4 Formula Validator

```javascript
/**
 * Validate formula before saving
 */
async function validateFormula(formulaExpression, availableVariables) {
  const validator = new FormulaValidator();
  
  try {
    // 1. Parse the formula AST
    const ast = parser.parse(formulaExpression);
    
    // 2. Check for forbidden operations
    const forbidden = validator.checkForbiddenOperations(ast);
    if (forbidden.length > 0) {
      return {
        isValid: false,
        errors: forbidden.map(f => `Forbidden operation: ${f}`)
      };
    }
    
    // 3. Check variable references
    const undefinedVars = validator.checkVariableReferences(ast, availableVariables);
    if (undefinedVars.length > 0) {
      return {
        isValid: false,
        errors: undefinedVars.map(v => `Undefined variable: ${v}`)
      };
    }
    
    // 4. Test with sample data
    const sampleContext = generateSampleContext(availableVariables);
    const testResult = await evaluateFormula(formulaExpression, sampleContext);
    
    if (typeof testResult !== 'number' || isNaN(testResult)) {
      return {
        isValid: false,
        errors: ['Formula must return a numeric value']
      };
    }
    
    return {
      isValid: true,
      testResult: testResult,
      returnType: 'number'
    };
    
  } catch (error) {
    return {
      isValid: false,
      errors: [error.message]
    };
  }
}
```

### 6.5 Formula Evaluator

```javascript
/**
 * Safely evaluate formula in sandboxed context
 */
async function evaluateFormula(formulaExpression, context) {
  // Use vm2 or isolated-vm for sandboxing
  const { VM } = require('vm2');
  
  const vm = new VM({
    timeout: 5000, // 5 second timeout
    sandbox: {
      // Expose only safe Math functions
      Math: {
        round: Math.round,
        floor: Math.floor,
        ceil: Math.ceil,
        min: Math.min,
        max: Math.max,
        abs: Math.abs,
        pow: Math.pow
      },
      // Expose context variables
      employee: context.employee,
      compensation: context.compensation,
      period: context.period,
      time: context.time,
      historical: context.historical,
      components: context.components,
      calculated: context.calculated || {}
    }
  });
  
  try {
    const result = vm.run(formulaExpression);
    
    // Ensure result is a number
    const numResult = Number(result);
    if (isNaN(numResult)) {
      throw new Error('Formula must return a numeric value');
    }
    
    // Round to 2 decimal places for currency
    return Math.round(numResult * 100) / 100;
    
  } catch (error) {
    throw new FormulaEvaluationError(
      `Formula evaluation failed: ${error.message}`,
      formulaExpression,
      context
    );
  }
}
```

---


## 7. API Endpoints

### 7.1 TWK Scenario Management

#### Create TWK Scenario
```
POST /api/paylinq/twk/scenarios
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "scenarioCode": "CAO-2025-Q1",
  "scenarioName": "CAO 2025 First Quarter Adjustment",
  "description": "8% base salary increase effective January 1, 2025",
  "effectiveDate": "2025-01-01",
  "calculationMethod": "component_based", // or "formula_based" or "hybrid"
  "components": [
    {
      "componentCode": "base_salary",
      "componentName": "Base Salary",
      "changeType": "percentage",
      "changeValue": 8.0,
      "proratePartialPeriods": true
    },
    {
      "componentCode": "transport",
      "changeType": "new_value",
      "changeValue": 450.00
    }
  ],
  "formulas": [], // Empty for component-based
  "tags": ["CAO-2025", "salary-adjustment"],
  "notes": "Approved by HR board on 2025-04-01"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "scenarioCode": "CAO-2025-Q1",
    "status": "draft",
    "createdAt": "2025-04-15T10:30:00Z"
  }
}
```

#### Get Scenario Details
```
GET /api/paylinq/twk/scenarios/:scenarioId
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "scenarioCode": "CAO-2025-Q1",
    "scenarioName": "CAO 2025 First Quarter Adjustment",
    "effectiveDate": "2025-01-01",
    "calculationMethod": "component_based",
    "status": "draft",
    "components": [...],
    "formulas": [...],
    "totalEmployees": null,
    "totalTwkAmount": null,
    "createdAt": "2025-04-15T10:30:00Z",
    "createdBy": {...}
  }
}
```

#### List All Scenarios
```
GET /api/paylinq/twk/scenarios?status=draft&page=1&limit=20
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "scenarios": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

#### Update Scenario
```
PUT /api/paylinq/twk/scenarios/:scenarioId
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "scenarioName": "Updated name",
  "components": [...],
  "notes": "Updated notes"
}

Response: 200 OK
```

#### Delete Scenario
```
DELETE /api/paylinq/twk/scenarios/:scenarioId
Authorization: Bearer <token>

Response: 204 No Content
```

---

### 7.2 TWK Simulation

#### Run Simulation
```
POST /api/paylinq/twk/scenarios/:scenarioId/simulate
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "employeeFilter": {
    "departments": ["Sales", "Marketing"],
    "employeeIds": null, // null = all employees
    "minSalary": null,
    "maxSalary": null
  },
  "options": {
    "includeTaxCalculation": true,
    "groupBy": "department", // or "employee" or "period"
    "detailLevel": "summary" // or "detailed"
  }
}

Response: 200 OK
{
  "success": true,
  "data": {
    "scenarioId": "550e8400-e29b-41d4-a716-446655440000",
    "simulationId": "660f9511-f3ac-52e5-b827-557766551111",
    "summary": {
      "totalEmployees": 45,
      "totalTwkGross": 125000.00,
      "totalTwkTax": 18750.00,
      "totalTwkNet": 106250.00,
      "periodsAffected": 4,
      "dateRange": {
        "start": "2025-01-01",
        "end": "2025-04-30"
      }
    },
    "byDepartment": [
      {
        "department": "Sales",
        "employees": 20,
        "twkAmount": 68000.00
      },
      {
        "department": "Marketing",
        "employees": 25,
        "twkAmount": 57000.00
      }
    ],
    "byPeriod": [
      {
        "period": "January 2025",
        "periodStart": "2025-01-01",
        "periodEnd": "2025-01-31",
        "employees": 45,
        "twkAmount": 31250.00
      },
      ...
    ],
    "simulatedAt": "2025-04-15T11:00:00Z"
  }
}
```

#### Get Detailed Employee Results
```
GET /api/paylinq/twk/scenarios/:scenarioId/simulations/:simulationId/employees
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "employees": [
      {
        "employeeId": "emp-001",
        "employeeName": "John Doe",
        "employeeNumber": "E12345",
        "department": "Sales",
        "totalTwkGross": 3200.00,
        "totalTwkTax": 480.00,
        "totalTwkNet": 2720.00,
        "periods": [
          {
            "periodLabel": "January 2025",
            "twkGross": 800.00,
            "componentBreakdown": {
              "base_salary": 720.00,
              "transport": 80.00
            }
          },
          ...
        ]
      },
      ...
    ]
  }
}
```

---

### 7.3 TWK Approval & Execution

#### Submit for Approval
```
POST /api/paylinq/twk/scenarios/:scenarioId/submit-approval
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "approverUserId": "approver-uuid",
  "notes": "Please review and approve"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "status": "pending_approval",
    "submittedAt": "2025-04-15T12:00:00Z",
    "approver": {...}
  }
}
```

#### Approve Scenario
```
POST /api/paylinq/twk/scenarios/:scenarioId/approve
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "approvalNotes": "Approved. Proceed with execution."
}

Response: 200 OK
{
  "success": true,
  "data": {
    "status": "approved",
    "approvedAt": "2025-04-15T13:00:00Z",
    "approvedBy": {...}
  }
}
```

#### Execute TWK Scenario
```
POST /api/paylinq/twk/scenarios/:scenarioId/execute
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "paymentMethod": "add_to_next_payroll", // or "create_separate_payroll"
  "payrollRunId": "existing-run-id", // if add_to_next_payroll
  "paymentDate": "2025-05-15",
  "notes": "TWK payment for CAO 2025 Q1 adjustment"
}

Response: 202 Accepted
{
  "success": true,
  "data": {
    "executionId": "exec-001",
    "status": "processing",
    "estimatedCompletion": "2025-04-15T13:10:00Z",
    "message": "TWK execution started. Processing 45 employees..."
  }
}
```

#### Check Execution Status
```
GET /api/paylinq/twk/scenarios/:scenarioId/executions/:executionId
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "executionId": "exec-001",
    "status": "completed", // or "processing", "failed"
    "progress": {
      "total": 45,
      "processed": 45,
      "failed": 0
    },
    "results": {
      "totalPaid": 106250.00,
      "payrollRunId": "new-run-id",
      "paymentsCreated": 45
    },
    "errors": [],
    "completedAt": "2025-04-15T13:08:00Z"
  }
}
```

---

### 7.4 TWK Reports

#### Get TWK Liability Report
```
GET /api/paylinq/twk/reports/liability?startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "totalLiability": 256000.00,
    "byStatus": {
      "draft": 45000.00,
      "simulated": 86000.00,
      "approved": 125000.00,
      "executed": 0
    },
    "byScenario": [
      {
        "scenarioCode": "CAO-2025-Q1",
        "scenarioName": "CAO 2025 First Quarter Adjustment",
        "status": "approved",
        "totalTwk": 125000.00,
        "employees": 45
      },
      ...
    ]
  }
}
```

#### Get TWK Payment History
```
GET /api/paylinq/twk/reports/payment-history?employeeId=emp-001
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "employee": {...},
    "totalTwkReceived": 8450.00,
    "payments": [
      {
        "paymentDate": "2025-03-15",
        "scenarioCode": "CAO-2024-Q4",
        "grossAmount": 3200.00,
        "taxAmount": 480.00,
        "netAmount": 2720.00,
        "payrollRunId": "run-123"
      },
      ...
    ]
  }
}
```

---

## 8. Frontend Components

### 8.1 TWK Scenario Manager

**Component Path:** `apps/paylinq/src/components/twk/TWKScenarioManager.tsx`

**Features:**
- List all TWK scenarios with filtering and search
- Create new scenarios (wizard-style)
- Edit existing scenarios
- Delete scenarios
- View scenario details
- Status badges and workflow indicators

**Key UI Elements:**
- Data table with scenarios
- Filter bar (status, date range, tags)
- "Create Scenario" button
- Action menu per scenario (edit, simulate, approve, execute, delete)

---

### 8.2 TWK Scenario Creation Wizard

**Component Path:** `apps/paylinq/src/components/twk/TWKScenarioWizard.tsx`

**Steps:**
1. **Basic Information**
   - Scenario code, name, description
   - Effective date
   - Tags

2. **Calculation Method**
   - Choose: Component-based, Formula-based, or Hybrid
   - Info cards explaining each method

3. **Component Configuration** (if component-based)
   - Select components from dropdown
   - Choose change type (percentage, fixed amount, new value, rate change)
   - Enter change value
   - Set applicability filters
   - Add multiple components

4. **Formula Configuration** (if formula-based)
   - Formula editor with syntax highlighting
   - Variable reference panel
   - Formula validation button
   - Test with sample data

5. **Review & Create**
   - Summary of all settings
   - Estimated affected employees
   - Create button

---

### 8.3 Formula Builder

**Component Path:** `apps/paylinq/src/components/twk/FormulaBuilder.tsx`

**Features:**
- Monaco editor for formula input
- Syntax highlighting
- Autocomplete for variables
- Real-time validation
- Variable reference panel
- Formula examples library
- Test formula with sample data

**UI Layout:**
```

 Formula Editor (Monaco)                     
  
  components.base_salary * 1.08            
                                           
  
                                             
 [Validate Formula] [Test Formula]          
                                             
 Available Variables:                        
  employee.* (id, name, startDate...)      
  components.* (base_salary, transport...) 
  period.* (start, end, monthNumber...)    
  time.* (hoursWorked, overtimeHours...)   
                                             
 Formula Examples:                           
  Simple percentage increase               
  Tiered salary adjustment                 
  Multi-component calculation              

```

---

### 8.4 TWK Simulation Results

**Component Path:** `apps/paylinq/src/components/twk/TWKSimulationResults.tsx`

**Features:**
- Summary cards (total employees, total TWK, tax, net)
- Charts: TWK by department, by period
- Detailed employee breakdown table
- Export to Excel/PDF
- Approve scenario button
- Re-run simulation button

**UI Layout:**
```

 Summary Cards                                       
      
  45        SRD       SRD       SRD       
 Employees 125,000   18,750    106,250    
 Affected  Gross TWK Tax       Net TWK    
      
                                                     
 TWK by Department          TWK by Period           
           
  [Bar Chart]             [Line Chart]         
           
                                                     
 Employee Details                                   
    
  Name       Dept    TWK Gross TWK Net       
    
  John Doe   Sales   3,200    2,720         
  Jane Smith Mktg    2,800    2,380         
    
                                                     
 [Export to Excel] [Submit for Approval]            

```

---

### 8.5 TWK Execution Monitor

**Component Path:** `apps/paylinq/src/components/twk/TWKExecutionMonitor.tsx`

**Features:**
- Real-time execution progress
- Progress bar and percentage
- List of employees processed
- Error notifications
- Success confirmation
- Link to generated payroll run

---

## 9. Testing Strategy

### 9.1 Unit Tests

#### Repository Tests
```javascript
// tests/products/paylinq/repositories/twkScenarioRepository.test.js
describe('TWKScenarioRepository', () => {
  test('createScenario - should create TWK scenario', async () => {
    const scenario = await twkScenarioRepository.createScenario({
      organizationId: org.id,
      scenarioCode: 'TEST-001',
      scenarioName: 'Test Scenario',
      effectiveDate: '2025-01-01',
      calculationMethod: 'component_based'
    });
    
    expect(scenario.id).toBeDefined();
    expect(scenario.scenarioCode).toBe('TEST-001');
  });
  
  test('addComponent - should add component to scenario', async () => {
    const component = await twkScenarioRepository.addComponent(scenario.id, {
      componentCode: 'base_salary',
      changeType: 'percentage',
      changeValue: 8.0
    });
    
    expect(component.id).toBeDefined();
  });
});
```

#### Service Tests
```javascript
// tests/products/paylinq/services/twkCalculationService.test.js
describe('TWKCalculationService', () => {
  test('calculateComponentBasedTWK - percentage increase', async () => {
    const result = await twkCalculationService.calculateTWK(scenarioId);
    
    expect(result.totalEmployees).toBe(45);
    expect(result.totalTwkAmount).toBeCloseTo(125000, 2);
  });
  
  test('calculateFormulaBasedTWK - custom formula', async () => {
    const result = await twkCalculationService.calculateTWK(formulaScenarioId);
    
    expect(result.totalEmployees).toBeGreaterThan(0);
    expect(result.calculations).toBeDefined();
  });
  
  test('handles employee with unpaid leave', async () => {
    // Test proration logic
  });
});
```

#### Formula Engine Tests
```javascript
// tests/products/paylinq/services/twkFormulaService.test.js
describe('TWKFormulaService', () => {
  test('validateFormula - valid formula', async () => {
    const result = await formulaService.validateFormula(
      'components.base_salary * 1.08'
    );
    
    expect(result.isValid).toBe(true);
  });
  
  test('validateFormula - invalid syntax', async () => {
    const result = await formulaService.validateFormula(
      'components.base_salary * '
    );
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Syntax error');
  });
  
  test('evaluateFormula - simple expression', async () => {
    const result = await formulaService.evaluateFormula(
      'components.base_salary * 1.08',
      { components: { base_salary: 5000 } }
    );
    
    expect(result).toBe(5400);
  });
  
  test('evaluateFormula - ternary operator', async () => {
    const result = await formulaService.evaluateFormula(
      'components.base_salary < 3000 ? components.base_salary * 1.10 : components.base_salary * 1.05',
      { components: { base_salary: 2500 } }
    );
    
    expect(result).toBe(2750);
  });
});
```

---

### 9.2 Integration Tests

```javascript
// tests/products/paylinq/integration/twk.integration.test.js
describe('TWK End-to-End Integration', () => {
  test('complete TWK workflow', async () => {
    // 1. Create scenario
    const scenario = await createTWKScenario();
    
    // 2. Add components
    await addComponentToScenario(scenario.id, {...});
    
    // 3. Run simulation
    const simulation = await runSimulation(scenario.id);
    expect(simulation.totalEmployees).toBeGreaterThan(0);
    
    // 4. Approve scenario
    await approveScenario(scenario.id);
    
    // 5. Execute scenario
    const execution = await executeScenario(scenario.id);
    expect(execution.status).toBe('completed');
    
    // 6. Verify payments created
    const payments = await getPayments(scenario.id);
    expect(payments.length).toBe(simulation.totalEmployees);
  });
});
```

---

### 9.3 API Tests

```javascript
// tests/products/paylinq/controllers/twkScenarioController.test.js
describe('TWK API Endpoints', () => {
  test('POST /api/paylinq/twk/scenarios', async () => {
    const response = await request(app)
      .post('/api/paylinq/twk/scenarios')
      .set('Authorization', `Bearer ${token}`)
      .send({
        scenarioCode: 'API-TEST-001',
        scenarioName: 'API Test Scenario',
        effectiveDate: '2025-01-01',
        calculationMethod: 'component_based',
        components: [...]
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
  });
  
  test('POST /api/paylinq/twk/scenarios/:id/simulate', async () => {
    const response = await request(app)
      .post(`/api/paylinq/twk/scenarios/${scenarioId}/simulate`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    
    expect(response.status).toBe(200);
    expect(response.body.data.summary).toBeDefined();
  });
});
```

---

## 10. Migration & Deployment Guide

### 10.1 Database Migration

**File:** `backend/src/database/migrations/2025-11-05-twk-tables.sql`

```sql
-- Run the TWK schema creation
\i backend/src/database/twk-schema.sql

-- Verify tables created
SELECT tablename FROM pg_tables WHERE schemaname = 'payroll' AND tablename LIKE 'twk_%';

-- Expected output:
-- twk_scenarios
-- twk_scenario_components
-- twk_scenario_formulas
-- twk_calculations
-- twk_execution_log
-- twk_payments
```

### 10.2 Dependency Installation

```bash
cd backend
npm install vm2 --save  # For formula sandboxing
npm install mathjs --save  # For advanced math operations (optional)
```

### 10.3 Implementation Checklist

#### Phase 1: Database & Repositories (Week 1)
- [ ] Create TWK database schema
- [ ] Run migration
- [ ] Create `twkScenarioRepository.js`
- [ ] Create `twkCalculationRepository.js`
- [ ] Create `twkExecutionRepository.js`
- [ ] Write repository unit tests

#### Phase 2: Calculation Engine (Week 2)
- [ ] Create `twkCalculationService.js`
- [ ] Implement component-based calculation
- [ ] Implement historical data aggregation
- [ ] Implement period handling
- [ ] Write calculation unit tests

#### Phase 3: Formula System (Week 3)
- [ ] Create `twkFormulaService.js`
- [ ] Implement formula parser
- [ ] Implement formula validator
- [ ] Implement formula evaluator (sandboxed)
- [ ] Write formula unit tests

#### Phase 4: API Layer (Week 4)
- [ ] Create `twkScenarioController.js`
- [ ] Create `twkCalculationController.js`
- [ ] Create `twkExecutionController.js`
- [ ] Create `twkReportController.js`
- [ ] Add routes to Express app
- [ ] Write API tests

#### Phase 5: Frontend (Week 5-6)
- [ ] Create TWK Scenario Manager component
- [ ] Create Scenario Creation Wizard
- [ ] Create Formula Builder
- [ ] Create Simulation Results component
- [ ] Create Execution Monitor
- [ ] Integrate with backend APIs

#### Phase 6: Testing & Documentation (Week 7)
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Performance testing (1000+ employees)
- [ ] Security audit
- [ ] User documentation
- [ ] API documentation

#### Phase 7: Deployment (Week 8)
- [ ] Staging deployment
- [ ] User acceptance testing
- [ ] Production deployment
- [ ] Training materials
- [ ] Go-live support

---

## 11. Security Considerations

### 11.1 Access Control
- TWK scenarios visible only to authorized roles (HR, Payroll Manager)
- Approval workflow requires specific permissions
- Execution requires admin-level access

### 11.2 Formula Security
- Sandboxed formula execution (vm2 or isolated-vm)
- No access to file system, network, or sensitive data
- Timeout limits (5 seconds)
- Input validation and sanitization

### 11.3 Audit Trail
- All operations logged to `twk_execution_log`
- Who created/approved/executed scenarios
- Timestamp of all actions
- Parameters used for calculations

---

## 12. Performance Optimization

### 12.1 Caching
- Cache historical payroll data during calculation
- Cache simulation results
- Invalidate cache on data changes

### 12.2 Batch Processing
- Process employees in batches of 100
- Use database transactions for consistency
- Parallel processing where possible

### 12.3 Database Indexes
- All foreign keys indexed
- Composite indexes on frequently queried columns
- Partial indexes for active records

---

## 13. Future Enhancements

### 13.1 Advanced Features
- Multi-currency TWK calculations
- TWK for international employees
- Partial TWK payments (installments)
- TWK reversal and corrections

### 13.2 Reporting
- TWK forecast reports
- Comparative analysis between scenarios
- Department-wise TWK liability
- Employee TWK history dashboard

### 13.3 Integration
- Export to accounting systems
- Integration with banking APIs for payments
- API for external TWK triggers

---

## 14. Success Metrics

-  Calculate TWK for 1000 employees in < 30 seconds
-  100% accuracy in calculations (vs manual verification)
-  Zero security vulnerabilities in formula engine
-  99.9% uptime for TWK services
-  < 5% user error rate in scenario creation

---

**END OF SPECIFICATION**

This document provides complete implementation guidance for the TWK system. Engineers can use this as a blueprint for development.

