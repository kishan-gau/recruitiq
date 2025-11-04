# Paylinq Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose
Paylinq is a rule-driven payroll engine designed to process payroll across multiple jurisdictions, including Suriname and the USA. It supports salaried, hourly, contractor, and foreign workers, integrating scheduling, time & attendance, and payroll into one auditable flow.

### 1.2 Scope
Paylinq will:
- Calculate gross-to-net (and vice versa) pay using configurable tax rules and worker templates.
- Support custom pay components and formula-based calculations.
- Integrate time tracking and shift scheduling.
- Handle reconciliation between planned and actual work.
- Ensure auditability and compliance.

---

## 2. Overall Description

### 2.1 User Classes
- Payroll Administrators
- HR Managers
- Employees
- Auditors

### 2.2 System Features
- Configurable tax rule sets
- WorkerType templates
- Component eligibility rules
- Custom and formula-driven components
- Time & attendance integration
- Shift scheduling and reconciliation
- Payslip generation and audit logs

---

## 3. Functional Requirements

### 3.1 Tax Rule Management
- Create/update rule sets with brackets, allowances, deductible costs, contributions.

### 3.2 Worker Types & Templates
- Define worker types and link to templates with calculation sequences.

### 3.3 Component Management
- Define components and formulas; assign to employees.

### 3.4 Eligibility Rules
- Restrict components by residency, worker type, or service length.

### 3.5 Time & Attendance
- Import clock-in/out events; normalize into time entries.

### 3.6 Scheduling
- Create planned shifts; allow employee requests and approvals.
- Enforce labor law constraints.

### 3.7 Reconciliation
- Compare scheduled vs. actual work.
- Handle exceptions: absences, unscheduled work.
- Apply grace pay or route for approval.

### 3.8 Payroll Processing
- Calculate gross → deductions → taxable → tax → net.
- Resolve formulas and dependencies.
- Aggregate across employments.

### 3.9 Audit & Reporting
- Store rule/template/formula versions.
- Generate payslips and audit logs.

---

## 4. Non-Functional Requirements
- Performance: Process 10,000 employees/hour.
- Scalability: Multi-tenant SaaS.
- Security: Role-based access, encryption.
- Localization: Multi-currency, multi-language.
- Auditability: Immutable logs.

---

## 5. Data Model Overview
See `Paylinq_ERD.md` for full schema.

---

## 6. Example Scenarios
- Surinamese salaried worker with SRD 9,000 tax-free sum.
- Hourly worker with overtime and missing punches.
- US biweekly salaried worker with 401(k) deduction.
- Nested formula component (Housing Allowance).
- Scheduled shift with no T&A record.
