# Paylinq Entity Relationship Diagram (ERD)

This ERD defines the full schema for Paylinq, a global payroll engine supporting salaried, hourly, contractor, and foreign workers across jurisdictions. It includes scheduling, time & attendance, reconciliation, and formula-driven payroll components.

## Core Entities

### Organization
- `organization_id` (PK)
- `name`
- `tax_registration`
- `created_at`

### Employee
- `employee_id` (PK)
- `organization_id` (FK → Organization)
- `full_name`
- `national_id`
- `start_date`
- `contract_type`
- `resident_status`
- `worker_type_id` (FK → WorkerType)
- `pay_frequency`
- `bank_account`
- `created_at`

### WorkerType
- `worker_type_id` (PK)
- `name`
- `jurisdiction`
- `description`

### WorkerTypeTemplate
- `template_id` (PK)
- `worker_type_id` (FK → WorkerType)
- `rule_set_id` (FK → TaxRuleSet)
- `calculation_sequence`
- `effective_from`
- `effective_to`

### TemplateComponentEligibility
- `eligibility_id` (PK)
- `template_id` (FK → WorkerTypeTemplate)
- `component_id` (FK → PayComponent)
- `included`
- `resident_only`
- `foreigner_only`
- `min_service_months`
- `max_service_months`
- `notes`

## Tax & Compliance

### TaxRuleSet
- `rule_set_id` (PK)
- `name`
- `effective_from`
- `effective_to`
- `legal_reference`
- `created_by`
- `created_at`

### TaxBracket
- `bracket_id` (PK)
- `rule_set_id` (FK → TaxRuleSet)
- `lower_bound`
- `upper_bound`
- `rate_percent`
- `applies_to`

### Allowance
- `allowance_id` (PK)
- `rule_set_id` (FK → TaxRuleSet)
- `name`
- `amount`
- `frequency`
- `prorate_policy`

### DeductibleCostRule
- `deductible_id` (PK)
- `rule_set_id` (FK → TaxRuleSet)
- `percent`
- `annual_cap`
- `applies_to_components`

### ContributionRule
- `contribution_id` (PK)
- `rule_set_id` (FK → TaxRuleSet)
- `name`
- `rate_employee`
- `rate_employer`
- `base`
- `cap_amount`
- `is_tax_deductible`

## Pay Components

### PayComponent
- `component_id` (PK)
- `code`
- `name`
- `taxable`
- `subject_to_social`
- `subject_to_deductible`
- `level`
- `special_table`
- `visible_on_payslip`

### CustomPayComponent
- `custom_component_id` (PK)
- `organization_id` (FK → Organization)
- `code`
- `name`
- `type`
- `level`
- `taxable`
- `subject_to_social`
- `visible_on_payslip`
- `effective_from`
- `effective_to`

### ComponentFormula
- `formula_id` (PK)
- `custom_component_id` (FK → CustomPayComponent)
- `expression`
- `effective_from`
- `effective_to`
- `created_by`
- `created_at`

### EmployeePayComponentAssignment
- `assignment_id` (PK)
- `employee_id` (FK → Employee)
- `custom_component_id` (FK → CustomPayComponent)
- `amount`
- `frequency`
- `start_date`
- `end_date`
- `notes`

## Time & Attendance

### ShiftType
- `shift_type_id` (PK)
- `organization_id` (FK → Organization)
- `code`
- `name`
- `start_time`
- `end_time`
- `description`

### TimeAttendanceEvent
- `event_id` (PK)
- `employee_id` (FK → Employee)
- `event_type`
- `event_time`
- `shift_type_id` (FK → ShiftType)
- `source`

### TimeEntry
- `time_entry_id` (PK)
- `employee_id` (FK → Employee)
- `schedule_id` (FK → WorkSchedule, nullable)
- `start_time`
- `end_time`
- `hours_worked`
- `is_overtime`
- `is_holiday`
- `reconciled_status`

### RatedTimeLine
- `rated_line_id` (PK)
- `time_entry_id` (FK → TimeEntry)
- `component_code`
- `base_hours`
- `base_rate`
- `multiplier`
- `gross_earnings`

## Scheduling

### WorkSchedule
- `schedule_id` (PK)
- `organization_id` (FK → Organization)
- `employee_id` (FK → Employee)
- `shift_type_id` (FK → ShiftType)
- `scheduled_start`
- `scheduled_end`
- `location`
- `role`
- `status`
- `created_by`
- `created_at`

### ScheduleChangeRequest
- `request_id` (PK)
- `schedule_id` (FK → WorkSchedule)
- `employee_id` (FK → Employee)
- `request_type`
- `status`
- `approver_id` (FK → Employee)
- `requested_at`
- `approved_at`

## Payroll

### PayrollRun
- `run_id` (PK)
- `employee_id` (FK → Employee)
- `rule_set_id` (FK → TaxRuleSet)
- `template_id` (FK → WorkerTypeTemplate)
- `period_start`
- `period_end`
- `gross_amount`
- `net_amount`

### PayrollRunComponent
- `run_component_id` (PK)
- `run_id` (FK → PayrollRun)
- `component_code`
- `description`
- `amount`
- `source_ref`
