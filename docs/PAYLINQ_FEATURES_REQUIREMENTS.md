# Paylinq Features & User Flow Definition

**Date:** November 4, 2025  
**Version:** 1.0  
**Status:** Frontend Implementation Planning

---

## 📋 Overview

This document defines the complete user flows, features, and UI requirements for the Paylinq frontend application based on the comprehensive ERD and backend implementation specifications. Paylinq is an enterprise-grade payroll management system supporting multiple worker types, sophisticated tax calculations, time & attendance tracking, scheduling, and reconciliation.

---

## �🇷 Suriname Payroll Requirements (MVP Priority)

### Tax Structure
Paylinq's MVP will be built specifically for **Surinamese payroll legislation**, including:

1. **Wage Tax (Loonbelasting)**
   - Progressive tax brackets based on monthly income
   - Standard deductions (e.g., SRD 250 per month)
   - Tax-free allowances for specific categories
   - Monthly tax calculation and withholding

2. **Social Security Contributions**
   - **AOV (Algemene Ouderdomsverzekering)** - Old Age Pension: 4% employee, 2% employer
   - **AWW (Algemene Weduwen en Wezenverzekering)** - Widow/Orphan Insurance: contribution rates
   - Income thresholds for contributions

3. **Worker Classifications**
   - Salaried employees (monthly)
   - Hourly/daily workers
   - Contract workers
   - Government vs. private sector distinctions

4. **Currency & Payment**
   - Surinamese Dollar (SRD) as primary currency
   - USD payment support (common in Suriname)
   - Bank transfer (local banks: DSB Bank, Hakrinbank, RBC)
   - Cash payment tracking

5. **Compliance & Reporting**
   - Monthly payroll tax reporting
   - Annual income statements
   - Social security declarations
   - Minimum wage compliance

### Future Expansion (Phase 2)
- USA tax rules (W-4, federal/state withholding, FICA)
- Netherlands tax rules (for Dutch Caribbean regions)
- Other Caribbean nations

---

## �🎯 Core User Personas

### 1. Payroll Administrator
- **Primary Role:** Manages payroll operations, processes payroll runs, handles tax compliance
- **Key Actions:** Create payroll runs, review calculations, approve payments, generate reports
- **Pain Points:** Complex tax calculations, reconciliation errors, compliance deadlines, keeping up with Surinamese tax law changes

### 2. HR Manager  
- **Primary Role:** Manages employee payroll records, compensation, deductions
- **Key Actions:** Set up employee payroll profiles, assign worker types, manage deductions
- **Pain Points:** Employee data accuracy, benefit enrollment, worker classification

### 3. Time & Attendance Manager
- **Primary Role:** Manages employee schedules, approves time entries
- **Key Actions:** Create schedules, review timesheet submissions, approve time off
- **Pain Points:** Schedule conflicts, overtime tracking, time entry errors

### 4. Employee (Worker)
- **Primary Role:** Views pay stubs, submits time entries, requests schedule changes
- **Key Actions:** Clock in/out, view paychecks, download payslips, update direct deposit
- **Pain Points:** Accessing payslips, understanding deductions, schedule visibility

### 5. Finance Controller
- **Primary Role:** Oversees payroll reconciliation, financial reporting, compliance
- **Key Actions:** Review reconciliation reports, approve adjustments, export data
- **Pain Points:** Reconciliation discrepancies, audit trail, GL integration

---

## 🗺️ Application Structure

### Navigation Hierarchy

```
Paylinq Dashboard
├── Dashboard (Home)
│   ├── Payroll Summary
│   ├── Upcoming Payroll Runs
│   ├── Pending Approvals
│   └── Quick Actions
│
├── Workers (Employees)
│   ├── Worker List
│   ├── Add Worker
│   ├── Worker Details
│   │   ├── Payroll Information
│   │   ├── Compensation History
│   │   ├── Deductions
│   │   ├── Tax Information
│   │   └── Payment History
│   └── Worker Types
│       ├── Worker Type Templates
│       └── Template Configuration
│
├── Tax Rules
│   ├── Tax Rule Sets
│   ├── Tax Brackets
│   ├── Allowances
│   ├── Deductible Cost Rules
│   └── Jurisdiction Management
│
├── Pay Components
│   ├── Standard Components
│   ├── Custom Components
│   ├── Component Formulas
│   └── Component Assignments
│
├── Time & Attendance
│   ├── Time Entries
│   │   ├── Pending Approval
│   │   ├── Approved
│   │   └── Rejected
│   ├── Timesheets
│   ├── Clock Events
│   └── Time Reports
│
├── Scheduling
│   ├── Schedule Calendar
│   ├── Shift Types
│   ├── Schedule Templates
│   ├── Change Requests
│   └── Availability Management
│
├── Payroll Runs
│   ├── Payroll Run List
│   ├── Create Payroll Run
│   ├── Process Payroll
│   ├── Review & Approve
│   └── Payroll History
│
├── Payslips
│   ├── Payslip List
│   ├── Generate Payslips
│   ├── Email Payslips
│   └── Payslip Templates
│
├── Reconciliation
│   ├── Reconciliation Dashboard
│   ├── Reconciliation Records
│   ├── Discrepancy Management
│   └── Payroll Adjustments
│
├── Reports
│   ├── Payroll Summary
│   ├── Tax Summary
│   ├── Worker Cost Analysis
│   ├── Time & Attendance
│   ├── Deductions Report
│   └── Export Center
│
└── Settings
    ├── Organization Settings
    ├── Pay Periods
    ├── Payment Methods
    ├── Approval Workflows
    └── Integrations
```

---

## 🎨 Feature Modules

## Module 1: Dashboard

### User Story
_"As a Payroll Administrator, I want to see an overview of payroll operations so I can quickly understand the current state and take action on urgent items."_

### Features
1. **Payroll Summary Cards**
   - Total employees on payroll
   - Next payroll run date
   - Total monthly payroll cost
   - Pending approvals count

2. **Upcoming Payroll Runs**
   - Timeline of scheduled payroll runs (next 3 months)
   - Run status indicators (Draft, In Review, Scheduled, Processing)
   - Quick actions (View, Process, Edit)

3. **Pending Approvals Widget**
   - Time entries awaiting approval
   - Payroll adjustments requiring approval
   - Schedule change requests
   - Direct navigation to approval interface

4. **Recent Activity Feed**
   - Last 10 payroll-related activities
   - Payroll runs completed
   - Employees added/modified
   - Tax rules updated

5. **Quick Actions**
   - Create Payroll Run
   - Add Worker
   - Approve Time Entries
   - Generate Reports

### UI Components Needed
- `DashboardSummaryCard` - Metric cards with icons and trend indicators
- `UpcomingPayrollTimeline` - Timeline visualization of payroll runs
- `PendingApprovalsTable` - Compact table with quick action buttons
- `ActivityFeed` - Chronological list with timestamps and user avatars
- `QuickActionButtons` - Large action buttons with icons

### Mock Data Structure
```typescript
interface DashboardData {
  summary: {
    totalEmployees: number;
    nextPayrollDate: string;
    monthlyPayrollCost: number;
    pendingApprovals: number;
  };
  upcomingRuns: PayrollRun[];
  pendingApprovals: {
    timeEntries: number;
    adjustments: number;
    scheduleChanges: number;
  };
  recentActivity: Activity[];
}
```

---

## Module 2: Workers Management

### User Story
_"As an HR Manager, I want to manage employee payroll records so I can ensure accurate compensation and deductions for each worker."_

### Features

#### 2.1 Worker List
1. **Search & Filters**
   - Search by name, employee number, email
   - Filter by worker type, status (active/inactive/terminated)
   - Filter by department, location
   - Sort by name, hire date, compensation

2. **Worker Table**
   - Employee number, name, email
   - Worker type badge
   - Compensation amount
   - Status indicator
   - Actions (View, Edit, Deactivate)

3. **Bulk Actions**
   - Export to CSV/Excel
   - Bulk worker type assignment
   - Bulk compensation update

#### 2.2 Add/Edit Worker
1. **Personal Information Tab**
   - Full name, employee number
   - Email, phone number
   - National ID/SSN (encrypted)
   - Hire date, termination date (if applicable)

2. **Payroll Configuration Tab**
   - Worker type selection (dropdown with descriptions)
   - Pay frequency (weekly, bi-weekly, semi-monthly, monthly)
   - Payment method (direct deposit, check, ACH)
   - Currency selection

3. **Compensation Tab**
   - Compensation type (salary, hourly, commission, contract)
   - Amount entry
   - Effective date range
   - Hourly rates (if hourly)
     - Base hourly rate
     - Overtime rate (1.5x default)
     - Double-time rate (2x default)
   - Salary breakdown (if salary)
     - Annual salary
     - Per pay period amount
   - Compensation history table

4. **Bank Information Tab** (Encrypted)
   - Bank name (Surinamese banks: DSB Bank, Hakrinbank, RBC, FINA Bank, Finabank)
   - Account number (masked display)
   - Account type (savings/checking)
   - Currency preference (SRD/USD)
   - **Future:** IBAN/SWIFT for international payments

5. **Tax Information Tab** (Suriname)
   - National ID number
   - Tax exemptions/allowances (SRD 250 standard deduction)
   - Number of dependents
   - AOV enrollment status
   - AWW enrollment status
   - Tax exemptions/allowances
   - Additional withholding amount
   - State tax info (if multi-state)

6. **Deductions Tab**
   - Active deductions list
   - Add deduction button
   - Deduction configuration modal
     - Deduction type (pre-tax, post-tax, garnishment)
     - Category (health, retirement, loan, etc.)
     - Amount type (fixed, percentage, formula)
     - Amount/percentage value
     - Effective date range
   - YTD deduction totals

#### 2.3 Worker Details Page
1. **Overview Tab**
   - Worker information summary
   - Current compensation card
   - Active deductions summary
   - Payment method info

2. **Payment History Tab**
   - Paychecks table (last 12 months)
   - Columns: Date, Pay Period, Gross Pay, Deductions, Net Pay, Status
   - Download payslip button
   - YTD earnings summary

3. **Time & Attendance Tab**
   - Recent time entries (last 30 days)
   - Total hours worked this period
   - Overtime hours
   - Time off balance

4. **Documents Tab**
   - W-4 form
   - Direct deposit authorization
   - Payslips (archive)
   - Tax documents (W-2, 1099)

#### 2.4 Worker Type Management
1. **Worker Type Templates**
   - Template list table
   - Template details:
     - Name, code, description
     - Default pay frequency
     - Default payment method
     - Benefits eligible flag
     - Overtime eligible flag
   - Create/edit template modal

2. **Template Configuration**
   - Associated tax rules
   - Default pay components
   - Eligibility rules (service time, resident status)

### UI Components Needed
- `WorkerTable` - Advanced data table with search/filter/sort
- `WorkerForm` - Multi-step form with validation
- `CompensationCalculator` - Hourly to annual salary converter
- `DeductionConfigModal` - Modal for deduction setup
- `PaymentHistoryTable` - Sortable/filterable table
- `WorkerTypeCard` - Card displaying worker type details
- `WorkerTypeBadge` - Colored badge for quick identification

### Mock Data Structure
```typescript
interface Worker {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  nationalId?: string; // Surinamese ID number
  workerType: WorkerType;
  compensation: Compensation;
  bankInfo: BankInfo;
  taxInfo: TaxInfo;
  deductions: Deduction[];
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
  hireDate: string;
  terminationDate?: string;
  currency: 'SRD' | 'USD'; // Payment currency preference
}

interface WorkerType {
  id: string;
  templateId: string;
  name: string;
  code: string;
  payFrequency: string;
  paymentMethod: string;
  benefitsEligible: boolean;
  overtimeEligible: boolean;
}
```

---

## Module 3: Tax Rules Management

### User Story
_"As a Payroll Administrator, I want to configure tax rules for different jurisdictions so payroll tax calculations are accurate and compliant."_

### Features

#### 3.1 Tax Rule Sets
1. **Rule Set List**
   - Active rule sets by jurisdiction
   - Tax type badges (wage_tax, aov, aww, other)
   - Effective date ranges
   - Active/inactive toggle
   - **MVP Focus:** Suriname tax rules pre-configured

2. **Create/Edit Rule Set**
   - Rule set name and code (e.g., "Suriname Loonbelasting 2025")
   - Jurisdiction selection (country: Suriname)
   - Tax type selection (Wage Tax, AOV, AWW)
   - Calculation method (bracket, flat rate, percentage)
   - Effective date range
   - Associated brackets/allowances
   - Currency (SRD default)

#### 3.2 Tax Brackets
1. **Bracket Configuration**
   - Income range (min - max)
   - Tax rate percentage
   - Fixed amount (if applicable)
   - Bracket order/sequence
   - Visual bracket chart
   - Tax calculation preview

#### 3.3 Allowances & Exemptions
1. **Allowance Management (Suriname Focus)**
   - Standard monthly deduction (SRD 250 default)
   - Personal exemptions
   - Dependent allowances
   - Special exemptions (elderly, disability)
   - Amount configuration in SRD
   - Future: Multi-currency support

#### 3.4 Social Security & Deduction Rules
1. **Social Security Configuration (Suriname)**
   - **AOV (Old Age Pension)**
     - Employee rate: 4%
     - Employer rate: 2%
     - Income threshold configuration
   - **AWW (Widow/Orphan Insurance)**
     - Contribution rates
     - Income caps
   - Pre-tax vs. post-tax deductions
   - Pension fund contributions
   - Health insurance deductions
   - Annual and per-paycheck limits

#### 3.5 Jurisdiction Management
1. **Jurisdiction Directory**
   - **MVP:** Suriname (primary)
   - **Future:** USA (federal/state), Netherlands, Caribbean nations
   - Active tax rules per jurisdiction
   - Compliance status indicators
   - Quick navigation to rule configuration
   - Tax year management (Suriname fiscal year)

### UI Components Needed
- `TaxRuleTable` - Filterable table with jurisdiction badges
- `TaxBracketChart` - Visual representation of progressive brackets
- `TaxCalculator` - Interactive calculator for testing rules
- `JurisdictionSelector` - Cascading dropdown (country → state → locality)
- `AllowanceForm` - Form for allowance configuration
- `DeductibleRuleCard` - Card showing deduction rule details

### Mock Data Structure
```typescript
interface TaxRuleSet {
  id: string;
  name: string; // e.g., "Suriname Loonbelasting 2025"
  code: string; // e.g., "SR_WAGE_TAX_2025"
  taxType: 'wage_tax' | 'aov' | 'aww' | 'federal_income' | 'state_income' | 'social_security' | 'medicare';
  country: string; // 'Suriname' for MVP, 'USA', 'Netherlands' for Phase 2
  region?: string; // For future multi-region support
  calculationMethod: 'bracket' | 'flat_rate' | 'percentage';
  effectiveFrom: string;
  effectiveTo?: string;
  currency: 'SRD' | 'USD' | 'EUR'; // Surinamese Dollar primary
  brackets: TaxBracket[];
  standardDeduction?: number; // e.g., SRD 250 for Suriname
  isActive: boolean;
}

interface TaxBracket {
  id: string;
  incomeMin: number;
  incomeMax?: number;
  ratePercentage: number;
  fixedAmount: number;
  bracketOrder: number;
}
```

---

## Module 4: Pay Components

### User Story
_"As a Payroll Administrator, I want to define custom pay components so I can handle various earnings and deductions beyond standard pay."_

### Features

#### 4.1 Standard Pay Components
1. **Component Library**
   - Pre-configured components (Base Pay, Overtime, Bonus, Holiday Pay)
   - Component category badges (earning, deduction, benefit)
   - Calculation type (fixed, hourly rate, percentage, formula)
   - Tax treatment flags
   - Enable/disable toggle

#### 4.2 Custom Pay Components
1. **Create Custom Component**
   - Component name and code
   - Category selection
   - Calculation type
   - Default rate/percentage
   - Tax treatment configuration
     - Is taxable?
     - Affects gross pay?
     - Subject to social security/medicare?
   - Formula editor (for formula-based components)

2. **Component List**
   - Search and filter
   - Component details table
   - Usage count (how many workers assigned)
   - Edit/delete actions

#### 4.3 Component Formulas (MVP: Simple expressions)
1. **Formula Builder**
   - Variable selector (hours, base_rate, ot_hours, etc.)
   - Operator buttons (+, -, *, /, parentheses)
   - Formula preview
   - Test calculator with sample inputs
   - Validation feedback

2. **Formula Library**
   - Common formula templates
   - Overtime formulas (1.5x, 2x)
   - Bonus calculations
   - Commission structures

#### 4.4 Component Assignments
1. **Worker-Component Mapping**
   - Assign components to specific workers
   - Custom rate overrides per worker
   - Effective date ranges
   - Bulk assignment tool

### UI Components Needed
- `PayComponentCard` - Card showing component details
- `ComponentCategoryBadge` - Colored badge for component category
- `FormulaBuilder` - Visual formula construction interface
- `FormulaTestCalculator` - Input fields for testing formulas
- `ComponentAssignmentTable` - Table for managing worker assignments
- `ComponentWizard` - Stepped wizard for creating custom components

### Mock Data Structure
```typescript
interface PayComponent {
  id: string;
  name: string;
  code: string;
  category: 'earning' | 'deduction' | 'tax' | 'benefit' | 'reimbursement';
  calculationType: 'fixed' | 'hourly_rate' | 'percentage' | 'formula';
  defaultRate?: number;
  defaultPercentage?: number;
  isTaxable: boolean;
  affectsGross: boolean;
  isActive: boolean;
  formula?: ComponentFormula;
}

interface ComponentFormula {
  id: string;
  name: string;
  expression: string; // e.g., "(base_rate * hours) + (ot_hours * base_rate * 1.5)"
  variables: string[]; // ['base_rate', 'hours', 'ot_hours']
}
```

---

## Module 5: Time & Attendance

### User Story
_"As a Time & Attendance Manager, I want to track employee work hours and approve time entries so payroll is based on accurate attendance data."_

### Features

#### 5.1 Time Entry List
1. **Pending Approval View**
   - Time entries awaiting approval
   - Employee name, date, hours worked
   - Entry type (regular, overtime, PTO, sick, holiday)
   - Quick approve/reject buttons
   - Bulk approval capability

2. **Approved/Rejected Views**
   - Filtered by status
   - Date range filter
   - Department/employee filter
   - Export functionality

3. **Time Entry Details Modal**
   - Clock in/out times
   - Total hours calculation
   - Break hours
   - Shift type
   - Notes/comments
   - Approval history

#### 5.2 Clock Events
1. **Clock Event Log**
   - Real-time clock-in/out events
   - Device/method indicators (web, mobile, biometric)
   - GPS coordinates (if available)
   - Manual vs. automatic entries
   - Anomaly detection (missed clock-outs)

#### 5.3 Timesheets (Legacy/Simple Mode)
1. **Timesheet Entry**
   - Weekly/bi-weekly timesheet grid
   - Days of week columns
   - Hour entry fields (regular, OT, double-time, PTO, sick)
   - Daily total calculations
   - Weekly total summary
   - Submit button

2. **Timesheet Review**
   - Submitted timesheets list
   - Approval workflow
   - Comments/corrections

#### 5.4 Time Reports
1. **Hours Summary Report**
   - Total hours by employee
   - Regular vs. overtime breakdown
   - Department rollups
   - Date range selection
   - Export to Excel

2. **Attendance Trends**
   - Attendance rate by department
   - Average hours per employee
   - Overtime trends
   - Charts and visualizations

### UI Components Needed
- `TimeEntryTable` - Sortable/filterable table with bulk actions
- `TimeEntryApprovalModal` - Modal for reviewing and approving entries
- `TimesheetGrid` - Spreadsheet-like grid for hour entry
- `ClockEventLog` - Real-time event feed
- `AttendanceChart` - Chart showing attendance metrics
- `BulkApprovalBar` - Action bar for bulk operations

### Mock Data Structure
```typescript
interface TimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  entryDate: string;
  clockIn?: string;
  clockOut?: string;
  totalHours: number;
  breakHours: number;
  workedHours: number;
  entryType: 'regular' | 'overtime' | 'double_time' | 'pto' | 'sick' | 'holiday';
  shiftType?: ShiftType;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

interface ClockEvent {
  id: string;
  employeeId: string;
  employeeName: string;
  eventType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  eventTimestamp: string;
  deviceId?: string;
  clockMethod: 'web' | 'mobile' | 'biometric' | 'manual';
  gpsCoordinates?: { lat: number; lng: number };
}
```

---

## Module 6: Scheduling

### User Story
_"As a Scheduling Manager, I want to create and manage employee work schedules so I can optimize labor coverage and reduce conflicts."_

### Features

#### 6.1 Schedule Calendar
1. **Calendar View**
   - Week/month view toggle
   - Employee rows (horizontal scrolling if many employees)
   - Shift blocks with details (time, shift type)
   - Drag-and-drop schedule changes
   - Color coding by shift type
   - Conflict indicators (overlapping shifts, overtime alerts)

2. **Schedule Filters**
   - Department filter
   - Location filter
   - Shift type filter
   - Employee availability filter

#### 6.2 Shift Types
1. **Shift Type Management**
   - Shift type list (Day, Night, Weekend, On-Call)
   - Shift configuration
     - Name, code, description
     - Start/end times
     - Expected duration
     - Pay rate multiplier (e.g., 1.5x for night shift)
   - Color assignment for calendar

#### 6.3 Create/Edit Schedule
1. **Schedule Form**
   - Employee selection
   - Shift type selection
   - Date picker
   - Start/end time pickers
   - Location selection
   - Expected hours calculation
   - Conflict detection and warnings

2. **Recurring Schedules**
   - Repeat pattern (daily, weekly, custom)
   - End date or occurrence count
   - Exception dates

#### 6.4 Schedule Change Requests
1. **Change Request List**
   - Pending requests
   - Request type (time change, shift swap, cancellation)
   - Requested by employee
   - Original vs. requested values
   - Approve/reject actions

2. **Request Details Modal**
   - Original schedule info
   - Requested changes
   - Reason for change
   - Approval workflow
   - Comment thread

#### 6.5 Employee Availability
1. **Availability Calendar**
   - Employee availability preferences
   - Unavailable dates/times
   - Preferred shifts
   - Maximum hours per week

### UI Components Needed
- `ScheduleCalendar` - Interactive calendar with drag-and-drop
- `ShiftBlock` - Draggable shift component for calendar
- `ShiftTypeForm` - Form for shift type configuration
- `ScheduleForm` - Form for creating schedules
- `ChangeRequestCard` - Card showing change request details
- `AvailabilityGrid` - Grid for marking availability
- `ConflictAlert` - Alert component for schedule conflicts

### Mock Data Structure
```typescript
interface WorkSchedule {
  id: string;
  employeeId: string;
  employeeName: string;
  shiftType: ShiftType;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  expectedHours: number;
  locationId?: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
}

interface ShiftType {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  payRateMultiplier: number;
  color: string; // For calendar display
  isActive: boolean;
}

interface ScheduleChangeRequest {
  id: string;
  scheduleId: string;
  employeeId: string;
  employeeName: string;
  changeType: 'time_change' | 'shift_swap' | 'cancellation';
  originalStartTime: string;
  originalEndTime: string;
  requestedStartTime?: string;
  requestedEndTime?: string;
  swapWithEmployeeId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string;
  requestedAt: string;
}
```

---

## Module 7: Payroll Runs

### User Story
_"As a Payroll Administrator, I want to process payroll runs efficiently so employees are paid accurately and on time."_

### Features

#### 7.1 Payroll Run List
1. **Run Table**
   - Run number, name
   - Pay period (start - end)
   - Payment date
   - Run type (regular, off-cycle, bonus, correction, final)
   - Status badge (draft, calculating, review, approved, processing, completed)
   - Total employees
   - Total gross/net pay
   - Actions (View, Process, Edit, Cancel)

2. **Filters**
   - Date range
   - Run type
   - Status
   - Search by run number

#### 7.2 Create Payroll Run
1. **Run Setup Wizard**
   - **Step 1: Basic Information**
     - Run name (auto-generated or custom)
     - Run type selection
     - Pay period dates
     - Payment date
   
   - **Step 2: Employee Selection**
     - All employees vs. specific selection
     - Department/location filter
     - Worker type filter
     - Exclude list (terminated, suspended)
     - Preview employee count
   
   - **Step 3: Review & Create**
     - Summary of run configuration
     - Employee list preview
     - Estimated total cost
     - Create run button

#### 7.3 Process Payroll
1. **Calculation Screen**
   - Progress indicator
   - Status messages (calculating, validating, complete)
   - Error log (if any)
   - Calculation summary
     - Total employees processed
     - Total gross pay
     - Total taxes
     - Total deductions
     - Total net pay

2. **Review & Validation**
   - Paycheck details table
     - Employee name, employee number
     - Gross pay, deductions, net pay
     - Warnings/errors
   - Sort by amount, name, warnings
   - Filter by department, issues
   - Drill-down to individual paycheck detail

3. **Paycheck Detail Modal**
   - Employee information
   - Earnings breakdown (by component)
   - Deductions breakdown
   - Taxes breakdown
   - Net pay calculation
   - YTD totals comparison
   - Edit/adjust button

#### 7.4 Approve & Execute
1. **Approval Interface**
   - Final review summary
   - Approval checklist
     - All calculations validated
     - No errors present
     - Bank file generated
     - Payment date confirmed
   - Approve button (requires authorization)
   - Comments field

2. **Processing Status**
   - Real-time status updates
   - Payment transaction tracking
   - Direct deposit batch status
   - Check printing queue
   - Completion confirmation

#### 7.5 Payroll History
1. **Historical Runs**
   - Past payroll runs table
   - Date range filter
   - Run type filter
   - Export run details
   - Reprocess capability (if needed)

### UI Components Needed
- `PayrollRunTable` - Advanced table with status badges
- `PayrollRunWizard` - Multi-step wizard for run creation
- `CalculationProgress` - Progress bar with status messages
- `PaycheckTable` - Detailed paycheck listing
- `PaycheckDetailModal` - Modal showing full paycheck breakdown
- `ApprovalChecklist` - Checklist component with confirmations
- `PayrollStatusTracker` - Real-time status tracking

### Mock Data Structure
```typescript
interface PayrollRun {
  id: string;
  runNumber: string;
  runName: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate: string;
  runType: 'regular' | 'off_cycle' | 'bonus' | 'correction' | 'final';
  status: 'draft' | 'calculating' | 'calculated' | 'review' | 'approved' | 'processing' | 'completed' | 'cancelled' | 'failed';
  totalEmployees: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalTaxes: number;
  totalDeductions: number;
  calculatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  completedAt?: string;
  errorMessage?: string;
}

interface Paycheck {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  checkNumber?: string;
  paymentDate: string;
  grossPay: number;
  regularPay: number;
  overtimePay: number;
  bonus: number;
  commission: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  preTaxDeductions: number;
  postTaxDeductions: number;
  netPay: number;
  ytdGross: number;
  ytdNet: number;
  status: 'pending' | 'approved' | 'issued' | 'cancelled';
  paymentMethod: 'direct_deposit' | 'check' | 'ach';
}
```

---

## Module 8: Payslips

### User Story
_"As a Payroll Administrator, I want to generate and distribute payslips so employees receive their payment documentation."_

### Features

#### 8.1 Payslip List
1. **Payslip Table**
   - Payroll run number
   - Employee name
   - Pay period
   - Net pay amount
   - Status (generated, emailed, viewed, downloaded)
   - Actions (View, Download, Email, Regenerate)

2. **Filters**
   - Payroll run filter
   - Date range filter
   - Employee search
   - Status filter

#### 8.2 Generate Payslips
1. **Generation Interface**
   - Select payroll run (dropdown)
   - Select employees (all or specific)
   - Template selection (if multiple templates)
   - Preview payslip
   - Generate button
   - Bulk generation progress

2. **Payslip Template**
   - Company branding (logo, colors)
   - Employee information
   - Pay period details
   - Earnings table (component, hours/units, rate, amount)
   - Deductions table (component, amount)
   - Taxes table (type, amount)
   - Net pay prominently displayed
   - YTD summary section
   - Payment method details (direct deposit account)

#### 8.3 Email Payslips
1. **Email Configuration**
   - Select recipients (individual or bulk)
   - Email template customization
   - Subject line
   - Message body
   - Attachment format (PDF, encrypted PDF)
   - Send test email
   - Schedule send time
   - Send button

2. **Email Tracking**
   - Sent status per employee
   - Opened tracking
   - Failed deliveries
   - Resend capability

#### 8.4 Payslip Viewer (Employee Self-Service)
1. **Employee Payslip Portal**
   - List of available payslips (last 24 months)
   - Year selection
   - Pay period navigation
   - Preview payslip
   - Download PDF button
   - Print button

2. **Payslip Detail**
   - Full payslip display (read-only)
   - Earnings breakdown
   - Deductions breakdown
   - Tax withholdings
   - Net pay and payment method
   - YTD summary

### UI Components Needed
- `PayslipTable` - Table with generation/email actions
- `PayslipTemplate` - Styled payslip component for display/print
- `PayslipGenerator` - Interface for bulk generation
- `EmailPayslipModal` - Modal for email configuration
- `PayslipViewer` - Full-page payslip viewer
- `PayslipDownloadButton` - Button with PDF generation

### Mock Data Structure
```typescript
interface Payslip {
  id: string;
  paycheckId: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate: string;
  earnings: PayslipEarning[];
  deductions: PayslipDeduction[];
  taxes: PayslipTax[];
  netPay: number;
  ytdSummary: YTDSummary;
  paymentMethod: string;
  bankAccountLast4?: string;
  status: 'generated' | 'emailed' | 'viewed' | 'downloaded';
  emailedAt?: string;
  viewedAt?: string;
}

interface PayslipEarning {
  component: string;
  hours?: number;
  rate?: number;
  amount: number;
}

interface PayslipDeduction {
  component: string;
  amount: number;
}

interface PayslipTax {
  taxType: string;
  amount: number;
}

interface YTDSummary {
  grossPay: number;
  netPay: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
}
```

---

## Module 9: Reconciliation

### User Story
_"As a Finance Controller, I want to reconcile payroll data so I can ensure accuracy and identify discrepancies for correction."_

### Features

#### 9.1 Reconciliation Dashboard
1. **Overview Cards**
   - Total reconciliations this month
   - Open discrepancies count
   - Resolved discrepancies count
   - Total variance amount

2. **Reconciliation Queue**
   - Pending reconciliations table
   - Priority/due date sorting
   - Quick actions (Start, View, Resolve)

3. **Reconciliation Trends**
   - Chart showing discrepancies over time
   - Common discrepancy types
   - Resolution time metrics

#### 9.2 Reconciliation Records
1. **Reconciliation List**
   - Reconciliation type (bank, tax, GL, benefits)
   - Payroll run reference
   - Period covered
   - Expected vs. actual amounts
   - Variance amount
   - Status (pending, in progress, completed, discrepancy, resolved)
   - Actions (View, Investigate, Resolve)

2. **Filters**
   - Reconciliation type
   - Status
   - Date range
   - Has discrepancies toggle

#### 9.3 Reconciliation Detail
1. **Reconciliation Information**
   - Reconciliation type and period
   - Associated payroll run
   - Expected totals
   - Actual totals
   - Variance breakdown

2. **Discrepancy Items**
   - Item type (paycheck, deduction, tax, adjustment)
   - Employee name (if applicable)
   - Expected amount
   - Actual amount
   - Variance amount
   - Status (open, investigating, resolved, exception)
   - Actions (Investigate, Resolve, Create Adjustment)

3. **Resolution Interface**
   - Resolution action selection
     - Create adjustment
     - Accept variance
     - Escalate to supervisor
   - Resolution notes
   - Supporting documentation upload
   - Resolve button

#### 9.4 Payroll Adjustments
1. **Adjustment List**
   - Adjustment type (correction, bonus, reimbursement, deduction)
   - Employee name
   - Amount
   - Adjustment date
   - Status (pending, approved, applied, cancelled)
   - Apply to payroll run selection

2. **Create Adjustment Modal**
   - Employee selection
   - Adjustment type
   - Description
   - Amount (positive or negative)
   - Tax treatment flags
   - Effective date
   - Apply to run (dropdown of upcoming runs)
   - Reason/notes

3. **Adjustment Approval Workflow**
   - Pending approvals table
   - Adjustment details review
   - Approve/reject buttons
   - Approval comments

### UI Components Needed
- `ReconciliationDashboard` - Dashboard with cards and charts
- `ReconciliationTable` - Filterable table with status badges
- `DiscrepancyItemTable` - Table showing detailed discrepancies
- `ReconciliationDetailPanel` - Panel showing full reconciliation details
- `ResolutionForm` - Form for resolving discrepancies
- `AdjustmentModal` - Modal for creating adjustments
- `AdjustmentApprovalCard` - Card for approval workflow

### Mock Data Structure
```typescript
interface Reconciliation {
  id: string;
  payrollRunId: string;
  reconciliationType: 'bank' | 'tax' | 'gl' | 'benefits' | 'deductions';
  reconciliationDate: string;
  periodStart: string;
  periodEnd: string;
  expectedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  hasDiscrepancy: boolean;
  discrepancyCount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'discrepancy' | 'resolved';
  resolvedAt?: string;
  resolvedBy?: string;
  items: ReconciliationItem[];
}

interface ReconciliationItem {
  id: string;
  reconciliationId: string;
  itemType: 'paycheck' | 'deduction' | 'tax' | 'adjustment';
  employeeId?: string;
  employeeName?: string;
  expectedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  status: 'open' | 'investigating' | 'resolved' | 'exception';
  resolutionAction?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
}

interface PayrollAdjustment {
  id: string;
  paycheckId?: string;
  employeeId: string;
  employeeName: string;
  adjustmentType: 'correction' | 'bonus' | 'reimbursement' | 'deduction' | 'manual';
  description: string;
  amount: number;
  affectsGross: boolean;
  isTaxable: boolean;
  adjustmentDate: string;
  applyToRunId?: string;
  status: 'pending' | 'approved' | 'applied' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
}
```

---

## Module 10: Reports

### User Story
_"As a Finance Controller, I want to generate comprehensive payroll reports so I can analyze costs, ensure compliance, and make data-driven decisions."_

### Features

#### 10.1 Report Dashboard
1. **Report Categories**
   - Payroll Summary
   - Tax Reports
   - Worker Cost Analysis
   - Time & Attendance
   - Deductions & Benefits
   - Custom Reports

2. **Quick Report Actions**
   - Run frequently used reports
   - Scheduled reports management
   - Report templates library

#### 10.2 Payroll Summary Report
1. **Report Configuration**
   - Date range selection
   - Department/location filter
   - Worker type filter
   - Group by (department, worker type, pay period)
   - Include/exclude terminated employees

2. **Report Display**
   - Total gross payroll
   - Total net payroll
   - Total employees
   - Average pay per employee
   - Breakdown by department
   - Breakdown by worker type
   - Trend chart (if multiple periods)
   - Export options (PDF, Excel, CSV)

#### 10.3 Tax Summary Report
1. **Tax Report Options**
   - Federal tax summary
   - State tax summary (by state)
   - FICA summary (Social Security + Medicare)
   - Quarterly tax reports
   - Annual tax summary (for W-2 prep)

2. **Report Display**
   - Total taxes withheld
   - Employee vs. employer taxes
   - Breakdown by tax type
   - Employee-level detail table
   - Tax liability summary
   - Quarter-over-quarter comparison

#### 10.4 Worker Cost Analysis
1. **Cost Report Configuration**
   - Cost type (total compensation, gross pay, employer burden)
   - Time period
   - Department/cost center
   - Include benefits flag

2. **Report Display**
   - Total labor cost
   - Cost per employee
   - Cost breakdown (wages, benefits, taxes, other)
   - Cost by department chart
   - Top 10 highest-cost employees
   - Cost trend analysis

#### 10.5 Time & Attendance Reports
1. **Attendance Summary**
   - Total hours by employee
   - Regular vs. overtime breakdown
   - Department totals
   - Attendance rate percentage
   - Absent days tracking

2. **Overtime Report**
   - Overtime hours by employee
   - Overtime cost
   - Department overtime totals
   - Overtime trends

#### 10.6 Deductions Report
1. **Deduction Summary**
   - Total deductions by type
   - Employee deduction details
   - YTD deduction totals
   - Pre-tax vs. post-tax breakdown
   - Deduction reconciliation data

#### 10.7 Export Center
1. **Export Options**
   - Format selection (PDF, Excel, CSV, JSON)
   - Data range selection
   - Column/field customization
   - Scheduled exports
   - Download history

### UI Components Needed
- `ReportDashboard` - Dashboard with report categories
- `ReportConfigurationPanel` - Form for configuring report parameters
- `ReportViewer` - Component for displaying reports
- `ReportChart` - Various chart types (bar, line, pie)
- `ReportTable` - Sortable, exportable data table
- `ExportModal` - Modal for export configuration

### Mock Data Structure
```typescript
interface ReportConfig {
  reportType: string;
  dateRange: { start: string; end: string };
  filters: Record<string, any>;
  groupBy?: string[];
  sortBy?: string;
  includeCharts: boolean;
}

interface PayrollSummaryReport {
  config: ReportConfig;
  summary: {
    totalGrossPayroll: number;
    totalNetPayroll: number;
    totalEmployees: number;
    averagePayPerEmployee: number;
  };
  breakdown: {
    byDepartment: { department: string; amount: number; employees: number }[];
    byWorkerType: { workerType: string; amount: number; employees: number }[];
  };
  trends: { period: string; amount: number }[];
}

interface TaxSummaryReport {
  config: ReportConfig;
  summary: {
    totalFederalTax: number;
    totalStateTax: number;
    totalSocialSecurity: number;
    totalMedicare: number;
    totalEmployerTaxes: number;
  };
  byEmployee: {
    employeeName: string;
    federalTax: number;
    stateTax: number;
    socialSecurity: number;
    medicare: number;
  }[];
}
```

---

## Module 11: Settings

### User Story
_"As a Payroll Administrator, I want to configure system settings so the payroll system operates according to our organization's policies."_

### Features

#### 11.1 Organization Settings
1. **Organization Information**
   - Organization name
   - Tax registration number
   - Contact information
   - Default currency
   - Timezone

2. **Payroll Configuration**
   - Default pay frequency
   - Default payment method
   - Payroll calendar (pay dates)
   - Processing cutoff times

#### 11.2 Pay Period Settings
1. **Pay Period Templates**
   - Weekly (every Friday, etc.)
   - Bi-weekly (every other Friday)
   - Semi-monthly (15th and last day)
   - Monthly (last day of month)
   - Custom

2. **Pay Period Calendar**
   - View upcoming pay periods (12 months)
   - Add/edit/delete pay periods
   - Holiday consideration
   - Payment date adjustments

#### 11.3 Payment Method Configuration
1. **Direct Deposit Settings**
   - Bank integration configuration
   - ACH file format
   - Prenote requirements
   - Processing timeline

2. **Check Printing**
   - Check stock configuration
   - Check numbering
   - Printer settings
   - Signature configuration

#### 11.4 Approval Workflows
1. **Workflow Configuration**
   - Time entry approval workflow
   - Payroll run approval workflow
   - Adjustment approval workflow
   - Schedule change approval workflow

2. **Approver Management**
   - Assign approvers by role
   - Approval hierarchy
   - Delegation rules
   - Notification settings

#### 11.5 Integrations
1. **Integration List**
   - Available integrations (accounting, HRIS, benefits)
   - Active integrations
   - Connection status
   - Configure/disconnect

2. **Integration Configuration**
   - API credentials
   - Data mapping
   - Sync frequency
   - Error handling

### UI Components Needed
- `SettingsLayout` - Layout with settings navigation sidebar
- `OrganizationForm` - Form for org settings
- `PayPeriodCalendar` - Calendar for managing pay periods
- `WorkflowBuilder` - Visual workflow configuration
- `IntegrationCard` - Card showing integration status
- `IntegrationConfigModal` - Modal for integration setup

### Mock Data Structure
```typescript
interface OrganizationSettings {
  name: string;
  taxRegistration: string;
  defaultCurrency: string;
  timezone: string;
  defaultPayFrequency: string;
  defaultPaymentMethod: string;
  payrollCalendar: PayPeriod[];
}

interface PayPeriod {
  id: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  frequency: string;
  status: 'upcoming' | 'processing' | 'completed';
}

interface ApprovalWorkflow {
  id: string;
  workflowType: 'time_entry' | 'payroll_run' | 'adjustment' | 'schedule_change';
  approvalSteps: {
    stepOrder: number;
    approverRole: string;
    required: boolean;
  }[];
  notificationEnabled: boolean;
  escalationRules?: any;
}
```

---

## 🎨 Design System Integration

### Color Usage (Based on Design System)

**Primary Colors:**
- Primary: `emerald-500` (#10b981) - Brand consistency across all products
- Paylinq Accent: `blue-500` (#3b82f6) - Used for Paylinq-specific highlights and CTAs

**Component-Specific Colors:**
- Status badges:
  - Success: `green-500` (approved, completed, active)
  - Warning: `yellow-500` (pending, draft, review)
  - Danger: `red-500` (rejected, failed, error)
  - Info: `blue-500` (processing, calculating)
  - Neutral: `gray-500` (cancelled, inactive)

- Financial data:
  - Positive amounts: `green-600`
  - Negative amounts/deductions: `red-600`
  - Neutral amounts: `gray-900 dark:gray-100`

**Typography:**
- Font: Inter (from Design System)
- Headers: font-semibold
- Body: font-normal
- Financial values: font-medium tabular-nums

**Component Patterns:**
- Cards: Use `@recruitiq/ui` Card component with padding="md"
- Buttons: Use `@recruitiq/ui` Button with variant="primary" (blue for Paylinq)
- Inputs: Use `@recruitiq/ui` Input with proper labels and error states
- Modals: Use `@recruitiq/ui` Modal with appropriate sizes

---

## 📱 Responsive Design Requirements

### Breakpoints
- Mobile: 0-640px (sm)
- Tablet: 641-1024px (md)
- Desktop: 1025px+ (lg)

### Mobile Considerations
1. **Dashboard**
   - Stack cards vertically
   - Collapsible sections
   - Simplified charts

2. **Tables**
   - Horizontal scrolling
   - Card view option for mobile
   - Essential columns only

3. **Forms**
   - Single-column layout
   - Larger touch targets
   - Simplified date pickers

4. **Calendar/Schedule**
   - Day view instead of week
   - Swipe navigation
   - Bottom sheet for details

---

## 🔐 Permission & Access Control

### Role-Based Access

**Super Admin**
- Full access to all features
- System configuration
- User management

**Payroll Administrator**
- All payroll operations
- Process payroll runs
- Approve paychecks
- Configure tax rules
- View all reports

**HR Manager**
- Manage workers
- Configure compensation
- Manage deductions
- View worker reports
- Cannot process payroll

**Time & Attendance Manager**
- Approve time entries
- Manage schedules
- View attendance reports
- Cannot access payroll processing

**Finance Controller**
- View payroll reports
- Perform reconciliation
- Approve adjustments
- Export financial data
- Cannot process payroll

**Employee (Self-Service)**
- View own payslips
- Submit time entries
- View own schedule
- Request schedule changes
- Update direct deposit info

### Feature Tier Access

**Starter Tier**
- Basic payroll processing
- Timesheets (legacy)
- Direct deposit
- Basic tax calculation
- Up to 25 employees

**Professional Tier**
- All Starter features
- Time & attendance (clock events)
- Basic scheduling
- Custom pay components
- Multi-state tax support
- Up to 100 employees
- Reports

**Enterprise Tier**
- All Professional features
- Reconciliation
- Formula engine
- Advanced scheduling
- Multi-jurisdictional tax
- Unlimited employees
- API access

---

## 🚀 MVP vs. Future Features

### MVP (Phase 1) - Included in Initial Launch

✅ **Workers Management**
- CRUD operations for workers
- Worker type assignment
- Basic compensation configuration
- Bank information entry

✅ **Tax Rules (Suriname Focus)**
- Pre-configured Suriname tax rules (Wage Tax/Loonbelasting)
- Surinamese tax brackets and rates
- Standard deductions and allowances for Suriname
- Social security contributions (AOV/AWW)
- Basic bracket-based calculation

✅ **Pay Components**
- Standard components (Base, Overtime, Bonus)
- Simple custom components (fixed amount, percentage)
- Basic formula support (arithmetic only)

✅ **Time Entry (Timesheet Mode)**
- Weekly timesheet entry
- Approval workflow
- Simple hour calculations

✅ **Basic Scheduling**
- Manual schedule creation
- Shift type definition
- Schedule viewing

✅ **Payroll Processing**
- Create payroll runs
- Process payroll (basic calculation)
- Review and approve
- Generate paychecks

✅ **Payslips**
- Generate payslips
- Email payslips
- Download PDF
- Employee self-service viewing

✅ **Basic Reports**
- Payroll summary
- Tax summary
- Worker cost analysis

### Phase 2 - Advanced Features

⏳ **Advanced Time & Attendance**
- Real-time clock events
- Biometric integration
- GPS verification
- Mobile app clock-in

⏳ **Advanced Scheduling**
- Automated schedule generation
- Shift optimization algorithms
- Employee availability matching
- Shift swap marketplace

⏳ **Advanced Tax Engine (Multi-Country)**
- USA tax rules (federal/state)
- Netherlands tax rules
- Caribbean region tax rules
- Multi-jurisdictional tax calculation
- Tax treaty processing
- Tax projections and what-if scenarios

⏳ **Formula Engine**
- Complex formula builder (conditionals, functions)
- Formula testing interface
- Variable library
- Custom function creation

⏳ **Reconciliation**
- Automated bank reconciliation
- GL integration
- Benefits provider reconciliation
- Discrepancy detection and alerts

⏳ **Advanced Pay Components**
- Commission structures
- Shift differentials
- Garnishment priority processing
- Loan repayment tracking

⏳ **Integrations**
- Accounting system integration (QuickBooks, etc.)
- Benefits provider integration
- Third-party time clock integration
- Banking API for ACH automation

---

## 📊 Performance Requirements

### Load Times
- Dashboard: < 2 seconds
- Worker list (100 employees): < 1 second
- Payroll run processing (100 employees): < 30 seconds
- Report generation: < 5 seconds
- Payslip PDF generation: < 2 seconds per payslip

### Data Volumes
- Support up to 1,000 employees per organization (MVP)
- Support up to 10,000 employees (Enterprise)
- Maintain last 7 years of payroll history
- Archive older data for compliance

### Concurrent Users
- Support 10 concurrent users per organization (MVP)
- Support 50+ concurrent users (Enterprise)

---

## 🎯 Success Metrics

### User Experience
- Time to complete payroll run: < 15 minutes (for 50 employees)
- Time entry approval time: < 2 minutes per employee
- Employee self-service adoption: > 80% of employees viewing payslips online

### Accuracy
- Payroll calculation accuracy: 99.99%
- Tax calculation accuracy: 100% (validated against official tax tables)
- Time entry discrepancy rate: < 1%

### Efficiency
- Reduction in payroll processing time: 50% vs. manual process
- Reduction in payroll errors: 75% vs. manual process
- Payslip distribution time: < 1 hour for 100 employees

---

## 📝 Notes

### Design Decisions
1. **Design-First Approach**: Build all UI with mock data before backend integration
2. **Blue Accent for Paylinq**: Use blue-500 as primary CTA color to distinguish from other products
3. **Simplified MVP**: Focus on core payroll features, defer advanced scheduling and reconciliation
4. **Mobile-Responsive**: Full mobile support for employee self-service, tablet support for approvals
5. **Dark Mode**: Full dark mode support using class-based toggling

### Technical Considerations
1. Use `@recruitiq/ui` components wherever possible
2. Use `@recruitiq/api-client` for all API calls (once backend is ready)
3. Use React Router 7 for navigation
4. Use React Query for data fetching and caching
5. Use Tailwind CSS for styling (following Design System)
6. TypeScript for type safety
7. Form validation using React Hook Form + Zod

### Accessibility
1. All interactive elements keyboard accessible
2. ARIA labels on all form inputs
3. Screen reader support for tables and data grids
4. Color contrast ratio meets WCAG AA standards
5. Focus indicators visible on all interactive elements

---

## 🇸🇷 Surinamese Payroll Implementation Notes

### Tax Rates & Brackets (2025)
**Note:** These are placeholder rates. Actual 2025 Surinamese tax brackets must be obtained from official sources.

**Wage Tax (Loonbelasting) - Monthly:**
- Up to SRD 1,500: 0%
- SRD 1,501 - 3,000: 8%
- SRD 3,001 - 5,000: 18%
- SRD 5,001 - 10,000: 28%
- Above SRD 10,000: 38%

**Social Security Contributions:**
- **AOV (Old Age Pension):** 4% employee + 2% employer (on gross salary)
- **AWW (Widow/Orphan):** Specific rates to be configured

**Standard Deduction:** SRD 250 per month

### Common Surinamese Payroll Scenarios

1. **Salaried Employee (Monthly)**
   - Fixed monthly salary in SRD
   - AOV/AWW deductions
   - Progressive wage tax after standard deduction
   - 13th-month bonus (common practice)
   - Vacation allowance

2. **Hourly Worker**
   - Hourly rate × hours worked
   - Overtime calculations (typically 1.5x after 8 hours/day)
   - Weekend/holiday premiums
   - Same tax treatment as salaried

3. **Contract Worker**
   - May or may not have AOV/AWW
   - Simplified tax withholding
   - Invoice-based payment

### Banking Integration Priority
1. **Phase 1:** Manual bank file generation (CSV/Excel)
2. **Phase 2:** Direct integration with DSB Bank, Hakrinbank APIs

### Currency Handling
- **Primary:** Surinamese Dollar (SRD)
- **Secondary:** USD (common for certain industries)
- Exchange rate tracking for reporting
- Dual-currency payslips

### Compliance Requirements
- Monthly tax declaration to Surinamese Tax Authority
- Annual income statements for employees
- Social security reporting (AOV/AWW)
- Minimum wage enforcement (to be configured)

### Data Sources Needed
- [ ] Official 2025 Surinamese tax brackets
- [ ] Current AOV/AWW rates
- [ ] Minimum wage rates by sector
- [ ] Public holidays calendar
- [ ] Standard working hours regulations

---

**Document Version:** 1.1  
**Last Updated:** November 4, 2025  
**Priority:** Surinamese payroll legislation (MVP), USA support (Phase 2)  
**Next Steps:** Create Paylinq app structure, design wireframes, build components

