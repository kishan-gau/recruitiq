# Database Schema Part 2 - Operational Data & Views

**Document:** 02b-DATABASE-SCHEMA-OPERATIONAL.md  
**Project:** Multi-Tenant Consolidated Reporting System  
**Continuation of:** 02-DATABASE-SCHEMA.md

---

## 5. Operational Schema - Replicated Operational Tables

These tables are **replicated from the operational database** via ETL jobs. They maintain the same structure but are **read-only** in the reporting database.

### Organizations Table (Core)

```sql
CREATE TABLE operational.organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  legal_name VARCHAR(500),
  
  -- Contact information
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(500),
  
  -- Address
  address_line1 VARCHAR(500),
  address_line2 VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  
  -- Business details
  tax_id VARCHAR(100),
  industry VARCHAR(100),
  size_category VARCHAR(50), -- 'small', 'medium', 'large', 'enterprise'
  
  -- Subscription & status
  subscription_tier VARCHAR(50),
  is_active BOOLEAN,
  
  -- Timestamps
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_operational_orgs_active ON operational.organizations(is_active);
CREATE INDEX idx_operational_orgs_code ON operational.organizations(code);

COMMENT ON TABLE operational.organizations IS 
  'Replicated organizations from operational DB. Read-only.';
```

### Employees Table

```sql
CREATE TABLE operational.employees (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  
  -- Personal information (some fields masked based on permissions)
  employee_number VARCHAR(50),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  middle_name VARCHAR(100),
  preferred_name VARCHAR(100),
  
  email VARCHAR(255),
  phone VARCHAR(50),
  
  date_of_birth DATE,
  ssn_encrypted VARCHAR(500), -- Encrypted in operational, will be hashed/masked in reporting
  gender VARCHAR(50),
  
  -- Employment details
  hire_date DATE,
  termination_date DATE,
  employment_status VARCHAR(50), -- 'active', 'terminated', 'on_leave', etc.
  employment_type VARCHAR(50), -- 'full_time', 'part_time', 'contract', etc.
  
  -- Job information
  job_title VARCHAR(255),
  department VARCHAR(255),
  location VARCHAR(255),
  manager_id UUID,
  
  -- Compensation (sensitive - requires specific permissions)
  salary_amount DECIMAL(15,2),
  salary_currency VARCHAR(3),
  pay_frequency VARCHAR(50),
  pay_type VARCHAR(50), -- 'salary', 'hourly', 'commission'
  hourly_rate DECIMAL(10,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_operational_employees_org ON operational.employees(organization_id);
CREATE INDEX idx_operational_employees_status ON operational.employees(employment_status);
CREATE INDEX idx_operational_employees_dept ON operational.employees(department);
CREATE INDEX idx_operational_employees_hire_date ON operational.employees(hire_date);

COMMENT ON TABLE operational.employees IS 
  'Replicated employee records. Contains sensitive data - use data masking rules.';
```

### Departments Table

```sql
CREATE TABLE operational.departments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  
  -- Hierarchy
  parent_department_id UUID,
  department_head_id UUID, -- Employee ID
  
  -- Cost center
  cost_center VARCHAR(100),
  budget_allocated DECIMAL(15,2),
  budget_currency VARCHAR(3),
  
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_operational_depts_org ON operational.departments(organization_id);
CREATE INDEX idx_operational_depts_parent ON operational.departments(parent_department_id);
```

### Payroll Runs Table

```sql
CREATE TABLE operational.payroll_runs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  
  -- Run identification
  run_number VARCHAR(50),
  run_name VARCHAR(255),
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  
  -- Status
  status VARCHAR(50), -- 'draft', 'processing', 'approved', 'paid', 'cancelled'
  
  -- Totals
  total_gross_pay DECIMAL(15,2),
  total_net_pay DECIMAL(15,2),
  total_taxes DECIMAL(15,2),
  total_deductions DECIMAL(15,2),
  employee_count INTEGER,
  currency VARCHAR(3),
  
  -- Approval workflow
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_operational_payroll_org ON operational.payroll_runs(organization_id);
CREATE INDEX idx_operational_payroll_period ON operational.payroll_runs(pay_period_start, pay_period_end);
CREATE INDEX idx_operational_payroll_status ON operational.payroll_runs(status);
```

### Payroll Line Items Table

```sql
CREATE TABLE operational.payroll_line_items (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  payroll_run_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  
  -- Earnings
  gross_pay DECIMAL(15,2),
  regular_hours DECIMAL(10,2),
  overtime_hours DECIMAL(10,2),
  bonus DECIMAL(15,2),
  commission DECIMAL(15,2),
  
  -- Deductions
  federal_tax DECIMAL(15,2),
  state_tax DECIMAL(15,2),
  social_security DECIMAL(15,2),
  medicare DECIMAL(15,2),
  retirement_401k DECIMAL(15,2),
  health_insurance DECIMAL(15,2),
  other_deductions DECIMAL(15,2),
  
  -- Net
  net_pay DECIMAL(15,2),
  
  currency VARCHAR(3),
  created_at TIMESTAMPTZ
);

CREATE INDEX idx_operational_payroll_items_org ON operational.payroll_line_items(organization_id);
CREATE INDEX idx_operational_payroll_items_run ON operational.payroll_line_items(payroll_run_id);
CREATE INDEX idx_operational_payroll_items_emp ON operational.payroll_line_items(employee_id);
```

### Time Off Requests Table

```sql
CREATE TABLE operational.time_off_requests (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  
  -- Request details
  request_type VARCHAR(50), -- 'vacation', 'sick', 'personal', etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5,2),
  
  status VARCHAR(50), -- 'pending', 'approved', 'rejected', 'cancelled'
  
  -- Approval
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_operational_timeoff_org ON operational.time_off_requests(organization_id);
CREATE INDEX idx_operational_timeoff_emp ON operational.time_off_requests(employee_id);
CREATE INDEX idx_operational_timeoff_dates ON operational.time_off_requests(start_date, end_date);
```

---

## 6. Reporting Schema - Denormalized Views

These materialized views **denormalize operational data** for fast reporting queries. They are refreshed during ETL jobs.

### Employee Detail View

```sql
CREATE MATERIALIZED VIEW reporting.employee_details AS
SELECT 
  e.id AS employee_id,
  e.organization_id,
  o.name AS organization_name,
  o.code AS organization_code,
  
  -- Employee info (masked fields handled by application layer)
  e.employee_number,
  e.first_name,
  e.last_name,
  e.email,
  e.phone,
  
  -- Hashed SSN for security (only last 4 shown in UI based on permissions)
  md5(e.ssn_encrypted) AS ssn_hash,
  
  -- Employment
  e.hire_date,
  e.termination_date,
  e.employment_status,
  e.employment_type,
  
  -- Job
  e.job_title,
  e.department,
  d.name AS department_name,
  d.cost_center,
  e.location,
  
  -- Manager
  e.manager_id,
  CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
  
  -- Compensation (requires salary viewing permission)
  e.salary_amount,
  e.salary_currency,
  e.pay_frequency,
  e.pay_type,
  e.hourly_rate,
  
  -- Tenure calculations
  CASE 
    WHEN e.termination_date IS NOT NULL THEN 
      EXTRACT(YEAR FROM AGE(e.termination_date, e.hire_date))
    ELSE 
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.hire_date))
  END AS years_of_service,
  
  -- Age (for demographic reporting - masked if needed)
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.date_of_birth)) AS age,
  
  -- Age group for aggregate reporting
  CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.date_of_birth)) < 25 THEN 'Under 25'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.date_of_birth)) BETWEEN 25 AND 34 THEN '25-34'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.date_of_birth)) BETWEEN 35 AND 44 THEN '35-44'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.date_of_birth)) BETWEEN 45 AND 54 THEN '45-54'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.date_of_birth)) BETWEEN 55 AND 64 THEN '55-64'
    ELSE '65+'
  END AS age_group,
  
  -- Salary band for range-based reporting
  CASE 
    WHEN e.salary_amount < 30000 THEN '< $30K'
    WHEN e.salary_amount BETWEEN 30000 AND 49999 THEN '$30K-$50K'
    WHEN e.salary_amount BETWEEN 50000 AND 74999 THEN '$50K-$75K'
    WHEN e.salary_amount BETWEEN 75000 AND 99999 THEN '$75K-$100K'
    WHEN e.salary_amount BETWEEN 100000 AND 149999 THEN '$100K-$150K'
    ELSE '$150K+'
  END AS salary_band,
  
  -- Timestamps
  e.created_at,
  e.updated_at,
  CURRENT_TIMESTAMP AS view_refreshed_at
  
FROM operational.employees e
LEFT JOIN operational.organizations o ON o.id = e.organization_id
LEFT JOIN operational.departments d ON d.id = e.department
LEFT JOIN operational.employees m ON m.id = e.manager_id
WHERE e.deleted_at IS NULL
  AND o.deleted_at IS NULL;

-- Indexes for performance
CREATE INDEX idx_report_emp_details_org ON reporting.employee_details(organization_id);
CREATE INDEX idx_report_emp_details_dept ON reporting.employee_details(department);
CREATE INDEX idx_report_emp_details_status ON reporting.employee_details(employment_status);
CREATE INDEX idx_report_emp_details_type ON reporting.employee_details(employment_type);

COMMENT ON MATERIALIZED VIEW reporting.employee_details IS 
  'Denormalized employee data with calculated fields. Refresh nightly during ETL.';
```

### Payroll Summary View

```sql
CREATE MATERIALIZED VIEW reporting.payroll_summary AS
SELECT 
  pr.id AS payroll_run_id,
  pr.organization_id,
  o.name AS organization_name,
  o.code AS organization_code,
  
  -- Run details
  pr.run_number,
  pr.run_name,
  pr.pay_period_start,
  pr.pay_period_end,
  pr.pay_date,
  pr.status,
  
  -- Employee counts
  pr.employee_count,
  COUNT(DISTINCT CASE WHEN e.employment_type = 'full_time' THEN pli.employee_id END) AS full_time_count,
  COUNT(DISTINCT CASE WHEN e.employment_type = 'part_time' THEN pli.employee_id END) AS part_time_count,
  COUNT(DISTINCT CASE WHEN e.employment_type = 'contract' THEN pli.employee_id END) AS contract_count,
  
  -- Totals
  pr.total_gross_pay,
  pr.total_net_pay,
  pr.total_taxes,
  pr.total_deductions,
  pr.currency,
  
  -- Averages
  ROUND(pr.total_gross_pay / NULLIF(pr.employee_count, 0), 2) AS avg_gross_pay_per_employee,
  ROUND(pr.total_net_pay / NULLIF(pr.employee_count, 0), 2) AS avg_net_pay_per_employee,
  
  -- Tax breakdown
  SUM(pli.federal_tax) AS total_federal_tax,
  SUM(pli.state_tax) AS total_state_tax,
  SUM(pli.social_security) AS total_social_security,
  SUM(pli.medicare) AS total_medicare,
  
  -- Deduction breakdown
  SUM(pli.retirement_401k) AS total_401k_contributions,
  SUM(pli.health_insurance) AS total_health_insurance,
  
  -- Hours
  SUM(pli.regular_hours) AS total_regular_hours,
  SUM(pli.overtime_hours) AS total_overtime_hours,
  
  -- Department breakdown (aggregated as JSON)
  jsonb_object_agg(
    DISTINCT e.department,
    jsonb_build_object(
      'employee_count', COUNT(DISTINCT pli.employee_id),
      'gross_pay', SUM(pli.gross_pay)
    )
  ) AS department_breakdown,
  
  pr.approved_at,
  pr.processed_at,
  CURRENT_TIMESTAMP AS view_refreshed_at
  
FROM operational.payroll_runs pr
LEFT JOIN operational.payroll_line_items pli ON pli.payroll_run_id = pr.id
LEFT JOIN operational.employees e ON e.id = pli.employee_id
LEFT JOIN operational.organizations o ON o.id = pr.organization_id
WHERE o.deleted_at IS NULL
GROUP BY 
  pr.id, pr.organization_id, o.name, o.code, pr.run_number, pr.run_name,
  pr.pay_period_start, pr.pay_period_end, pr.pay_date, pr.status,
  pr.employee_count, pr.total_gross_pay, pr.total_net_pay, 
  pr.total_taxes, pr.total_deductions, pr.currency,
  pr.approved_at, pr.processed_at;

CREATE INDEX idx_report_payroll_summ_org ON reporting.payroll_summary(organization_id);
CREATE INDEX idx_report_payroll_summ_period ON reporting.payroll_summary(pay_period_start, pay_period_end);
CREATE INDEX idx_report_payroll_summ_status ON reporting.payroll_summary(status);
```

### Headcount Trend View (Time Series)

```sql
CREATE MATERIALIZED VIEW reporting.headcount_trends AS
WITH date_series AS (
  SELECT generate_series(
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '24 months'),
    DATE_TRUNC('month', CURRENT_DATE),
    '1 month'::interval
  )::date AS snapshot_date
),
monthly_headcount AS (
  SELECT 
    ds.snapshot_date,
    e.organization_id,
    o.name AS organization_name,
    e.department,
    e.employment_type,
    e.employment_status,
    COUNT(*) AS employee_count
  FROM date_series ds
  CROSS JOIN operational.employees e
  LEFT JOIN operational.organizations o ON o.id = e.organization_id
  WHERE e.hire_date <= ds.snapshot_date
    AND (e.termination_date IS NULL OR e.termination_date > ds.snapshot_date)
    AND e.deleted_at IS NULL
  GROUP BY ds.snapshot_date, e.organization_id, o.name, e.department, 
           e.employment_type, e.employment_status
)
SELECT 
  snapshot_date,
  organization_id,
  organization_name,
  department,
  employment_type,
  employment_status,
  employee_count,
  
  -- Month-over-month change
  employee_count - LAG(employee_count) OVER (
    PARTITION BY organization_id, department, employment_type 
    ORDER BY snapshot_date
  ) AS mom_change,
  
  -- Year-over-year change
  employee_count - LAG(employee_count, 12) OVER (
    PARTITION BY organization_id, department, employment_type 
    ORDER BY snapshot_date
  ) AS yoy_change,
  
  CURRENT_TIMESTAMP AS view_refreshed_at
FROM monthly_headcount
ORDER BY snapshot_date DESC, organization_name, department;

CREATE INDEX idx_report_headcount_org_date ON reporting.headcount_trends(organization_id, snapshot_date DESC);
CREATE INDEX idx_report_headcount_dept ON reporting.headcount_trends(department, snapshot_date DESC);
```

### Turnover Metrics View

```sql
CREATE MATERIALIZED VIEW reporting.turnover_metrics AS
WITH monthly_stats AS (
  SELECT 
    DATE_TRUNC('month', e.termination_date) AS turnover_month,
    e.organization_id,
    o.name AS organization_name,
    e.department,
    COUNT(*) AS terminations,
    
    -- Voluntary vs Involuntary (assumes field exists or use default)
    COUNT(*) FILTER (WHERE e.termination_type = 'voluntary') AS voluntary_terminations,
    COUNT(*) FILTER (WHERE e.termination_type = 'involuntary') AS involuntary_terminations,
    
    -- Tenure at termination
    AVG(EXTRACT(YEAR FROM AGE(e.termination_date, e.hire_date))) AS avg_tenure_at_termination
    
  FROM operational.employees e
  LEFT JOIN operational.organizations o ON o.id = e.organization_id
  WHERE e.termination_date IS NOT NULL
    AND e.termination_date >= CURRENT_DATE - INTERVAL '24 months'
    AND e.deleted_at IS NULL
  GROUP BY DATE_TRUNC('month', e.termination_date), e.organization_id, o.name, e.department
),
monthly_headcount AS (
  SELECT 
    DATE_TRUNC('month', date_val) AS count_month,
    e.organization_id,
    e.department,
    AVG(employee_count) AS avg_headcount
  FROM generate_series(CURRENT_DATE - INTERVAL '24 months', CURRENT_DATE, '1 day'::interval) AS date_val
  CROSS JOIN LATERAL (
    SELECT 
      e.organization_id,
      e.department,
      COUNT(*) AS employee_count
    FROM operational.employees e
    WHERE e.hire_date <= date_val
      AND (e.termination_date IS NULL OR e.termination_date > date_val)
      AND e.deleted_at IS NULL
    GROUP BY e.organization_id, e.department
  ) e
  GROUP BY DATE_TRUNC('month', date_val), e.organization_id, e.department
)
SELECT 
  ms.turnover_month,
  ms.organization_id,
  ms.organization_name,
  ms.department,
  ms.terminations,
  ms.voluntary_terminations,
  ms.involuntary_terminations,
  mh.avg_headcount,
  
  -- Turnover rate calculation
  ROUND((ms.terminations::decimal / NULLIF(mh.avg_headcount, 0)) * 100, 2) AS monthly_turnover_rate,
  
  -- Annualized turnover rate
  ROUND((ms.terminations::decimal / NULLIF(mh.avg_headcount, 0)) * 1200, 2) AS annualized_turnover_rate,
  
  ms.avg_tenure_at_termination,
  CURRENT_TIMESTAMP AS view_refreshed_at
  
FROM monthly_stats ms
LEFT JOIN monthly_headcount mh 
  ON mh.count_month = ms.turnover_month 
  AND mh.organization_id = ms.organization_id 
  AND (mh.department = ms.department OR (mh.department IS NULL AND ms.department IS NULL))
ORDER BY ms.turnover_month DESC, ms.organization_name, ms.department;

CREATE INDEX idx_report_turnover_org_month ON reporting.turnover_metrics(organization_id, turnover_month DESC);
```

### Group Consolidated View

```sql
CREATE MATERIALIZED VIEW reporting.group_consolidated_summary AS
SELECT 
  og.id AS group_id,
  og.name AS group_name,
  og.code AS group_code,
  og.level AS group_level,
  
  -- Organization count
  COUNT(DISTINCT om.organization_id) AS organization_count,
  
  -- Aggregate employee metrics
  SUM(emp_stats.total_employees) AS total_employees,
  SUM(emp_stats.active_employees) AS active_employees,
  SUM(emp_stats.terminated_employees) AS terminated_employees,
  
  -- Employment type breakdown
  SUM(emp_stats.full_time_count) AS total_full_time,
  SUM(emp_stats.part_time_count) AS total_part_time,
  SUM(emp_stats.contract_count) AS total_contract,
  
  -- Compensation aggregates (only for roles with salary viewing permission)
  SUM(emp_stats.total_payroll_cost) AS total_group_payroll_cost,
  AVG(emp_stats.avg_salary) AS avg_salary_across_group,
  
  -- Department counts
  COUNT(DISTINCT dept_stats.department_name) AS unique_departments,
  
  -- Latest data timestamp
  MAX(emp_stats.snapshot_date) AS data_as_of_date,
  CURRENT_TIMESTAMP AS view_refreshed_at
  
FROM security.organization_groups og
LEFT JOIN security.organization_memberships om 
  ON om.group_id = og.id 
  AND (om.effective_to IS NULL OR om.effective_to >= CURRENT_DATE)
LEFT JOIN LATERAL (
  SELECT 
    om.organization_id,
    CURRENT_DATE AS snapshot_date,
    COUNT(*) AS total_employees,
    COUNT(*) FILTER (WHERE employment_status = 'active') AS active_employees,
    COUNT(*) FILTER (WHERE employment_status = 'terminated') AS terminated_employees,
    COUNT(*) FILTER (WHERE employment_type = 'full_time') AS full_time_count,
    COUNT(*) FILTER (WHERE employment_type = 'part_time') AS part_time_count,
    COUNT(*) FILTER (WHERE employment_type = 'contract') AS contract_count,
    SUM(salary_amount) AS total_payroll_cost,
    AVG(salary_amount) AS avg_salary
  FROM operational.employees e
  WHERE e.organization_id = om.organization_id
    AND e.deleted_at IS NULL
  GROUP BY om.organization_id
) emp_stats ON true
LEFT JOIN LATERAL (
  SELECT DISTINCT department AS department_name
  FROM operational.employees e
  WHERE e.organization_id = om.organization_id
    AND e.deleted_at IS NULL
    AND e.department IS NOT NULL
) dept_stats ON true
WHERE og.is_active = true
  AND og.deleted_at IS NULL
GROUP BY og.id, og.name, og.code, og.level
ORDER BY og.level, og.name;

CREATE INDEX idx_report_group_consol_group ON reporting.group_consolidated_summary(group_id);
CREATE INDEX idx_report_group_consol_level ON reporting.group_consolidated_summary(group_level);
```

---

**Status:** ✅ Schema Part 2 Complete  
**Next:** 02c - Security Functions & Materialized View Refresh
