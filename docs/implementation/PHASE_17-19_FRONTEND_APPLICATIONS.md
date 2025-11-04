# Phase 17-19: Frontend Applications

**Combined Duration:** 12 days (4 days per app)  
**Dependencies:** Phase 16 (Shared UI Library), Phase 9 (Paylinq Backend), Phase 12 (Nexus Backend)  
**Team:** Frontend Team (4 developers total)  
**Status:** Not Started

---

## 📋 Overview

This combined phase implements the three customer-facing frontend applications aligned with the enterprise backend schemas:

- **Phase 17:** Paylinq (Payroll) Frontend - Complete UI for 35-table payroll system including worker types, tax calculation, pay components, time & attendance, scheduling, reconciliation, and payroll processing
- **Phase 18:** Nexus (HRIS) Frontend - Complete UI for 30+ table HRIS system including user accounts, contract management with sequences, rule engine, enhanced leave management with accruals, attendance tracking, performance reviews, and organizational management
- **Phase 19:** RecruitIQ Frontend Updates - Enhanced candidate management with integration to Nexus HRIS

Each application is a standalone React app using the shared-ui library, with its own routing, state management, and product-specific components. The frontend follows a hybrid MVP approach with full UI for all features and simplified workflows initially, with Phase 2 enhancements documented for advanced capabilities.

### 🎨 Design System Consistency

**CRITICAL:** All applications MUST follow the unified RecruitIQ Design System documented in `/docs/DESIGN_SYSTEM.md`.

**Key Requirements:**
- **Brand Color:** Emerald (#10b981) for all primary actions and CTAs
- **Product Logos:**
  - Paylinq: "PL" in emerald-to-blue gradient
  - Nexus: "NX" in emerald-to-purple gradient
  - RecruitIQ: "RI" in emerald gradient (existing)
- **Typography:** Inter font family (400, 600, 700 weights)
- **Dark Mode:** Full support via class-based toggling
- **Layout:** Identical structure (Header 72px + Collapsible Sidebar 256px/72px + Main Content)
- **Components:** Shared from `@recruitiq/shared-ui` with consistent styling
- **Animations:** 220ms cubic-bezier transitions (matching RecruitIQ)
- **Spacing:** Tailwind spacing scale (4px increments)
- **Accessibility:** WCAG 2.1 Level AA compliance

---

## 🎯 Objectives

### Phase 17: Paylinq Frontend (4 days)
1. Create Paylinq React application structure
2. Implement worker type management UI
3. Implement pay component configuration UI
4. Implement tax setup and calculation preview UI
5. Implement time & attendance UI (clock in/out, time entries, rated time lines)
6. Implement shift scheduling UI with change requests
7. Implement payroll run and processing UI
8. Implement payroll reconciliation UI
9. Implement employee payment history UI
10. Implement deduction management UI
11. Implement reporting and dashboards
12. Test and deploy

### Phase 18: Nexus Frontend (4 days)
1. Create Nexus React application structure
2. Implement user account management UI (separate from employees)
3. Implement employee management UI with full lifecycle
4. Implement contract management UI with sequence workflows
5. Implement rule engine UI (create rules, view execution logs)
6. Implement enhanced leave management UI with accrual tracking
7. Implement attendance recording and reporting UI
8. Implement performance review UI with goals and competencies
9. Implement benefits enrollment UI
10. Implement document management UI with templates
11. Implement organizational structure UI (departments, locations, positions)
12. Implement organizational chart view
13. Test and deploy

### Phase 19: RecruitIQ Updates (4 days)
1. Update RecruitIQ to use shared-ui library
2. Add comprehensive hire candidate workflow (triggers employee + user account + contract creation in Nexus)
3. Update candidate management UI with hiring status tracking
4. Integrate with Nexus HRIS for employee synchronization
5. Add candidate-to-employee conversion UI
6. Test and deploy

---

## 🎨 Design System Implementation

All three applications MUST implement the following design elements for consistency with RecruitIQ:

### Shared Configuration Files

**File:** `tailwind.config.cjs` (identical across all products)
```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto']
      }
    },
  },
  plugins: [],
}
```

**File:** `index.html` (update theme-color per product)
```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Paylinq Payroll</title> <!-- or "Nexus HRIS" -->
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <meta name="theme-color" content="#0ea5a4">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**File:** `src/index.css` (duplicate RecruitIQ's styles)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Base styles matching RecruitIQ */
html, body, #root { 
  height: 100%; 
  background: #f8fafc; 
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
}

/* Dark mode overrides (identical to RecruitIQ) */
.dark html, .dark body, .dark #root { background: #0f172a }
.dark .bg-white { background: #1e293b !important }
.dark header.bg-white { background: #1e293b !important; border-color: rgba(255,255,255,0.1) }
.dark .text-slate-800 { color: #e2e8f0 !important }
.dark .text-slate-500 { color: #94a3b8 !important }
.dark .text-slate-600 { color: #cbd5e1 !important }
.dark .bg-slate-50 { background: #1e293b !important }
.dark .bg-slate-100 { background: #334155 !important }
.dark .bg-emerald-50 { background: rgba(16,185,129,0.1) !important }
.dark .bg-emerald-100 { background: rgba(16,185,129,0.15) !important }
.dark .bg-emerald-500 { background: linear-gradient(180deg,#059669,#10b981) !important }
.dark .border { border-color: rgba(255,255,255,0.1) !important }
.dark .shadow { box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important }
.dark .shadow-sm { box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important }
.dark .shadow-md { box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important }
.dark .bg-gradient-to-br.from-emerald-500 { background-image: linear-gradient(180deg,#059669,#10b981) !important }

/* Focus ring for accessibility */
.focus-ring:focus-visible { 
  outline: none; 
  box-shadow: 0 0 0 4px rgba(6,95,70,0.12); 
  border-radius: 6px;
}

/* Animations matching RecruitIQ */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
.animate-fadeIn { animation: fadeIn 0.2s ease-out; }

html { scroll-behavior: smooth; }
```

### Product Logos

**Paylinq Logo Component:**
```jsx
// src/components/Logo.jsx
export function Logo({ collapsed = false }) {
  return (
    <div className={`${collapsed ? 'w-10 h-10' : 'w-10 h-10'} rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold shadow`}>
      PL
    </div>
  );
}
```

**Nexus Logo Component:**
```jsx
// src/components/Logo.jsx
export function Logo({ collapsed = false }) {
  return (
    <div className={`${collapsed ? 'w-10 h-10' : 'w-10 h-10'} rounded-xl bg-gradient-to-br from-emerald-500 to-purple-500 flex items-center justify-center text-white font-bold shadow`}>
      NX
    </div>
  );
}
```

### Layout Component (matching RecruitIQ)

**File:** `src/components/Layout.jsx`
```jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### Header Component (72px height, matching RecruitIQ)

**File:** `src/components/Header.jsx`
```jsx
export default function Header() {
  return (
    <header className="h-18 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4">
          <Logo collapsed={false} />
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Paylinq {/* or "Nexus" */}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Payroll Management {/* or "HRIS" */}
            </p>
          </div>
        </div>
        
        {/* Quick Search (matching RecruitIQ) */}
        <QuickSearch />
        
        {/* User Menu (matching RecruitIQ) */}
        <AvatarMenu />
      </div>
    </header>
  );
}
```

### Sidebar Component (collapsible 256px/72px, matching RecruitIQ)

**File:** `src/components/Sidebar.jsx`
```jsx
import { motion } from 'framer-motion';

export default function Sidebar() {
  const [collapsed, setCollapsed] = React.useState(false);
  
  return (
    <aside className="block" data-testid="primary-sidebar">
      <motion.div
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.18 }}
        className="overflow-hidden h-full"
      >
        <div className="p-4 bg-white dark:bg-slate-800 rounded shadow-sm sticky top-0">
          {/* Logo and collapse button */}
          <div className={`flex items-center mb-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && <Logo />}
            {collapsed && <Logo collapsed />}
            {!collapsed && (
              <button onClick={() => setCollapsed(true)} className="p-1 text-slate-500 hover:bg-slate-50 rounded focus-ring">
                <Icon name="close" className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {collapsed && (
            <button onClick={() => setCollapsed(false)} className="p-2 text-slate-500 hover:bg-slate-100 rounded focus-ring">
              <Icon name="menu" className="w-5 h-5" />
            </button>
          )}
          
          {/* Navigation items with animated pill (matching RecruitIQ) */}
          <nav className="space-y-1">
            {/* NavLinks with framer-motion animated pill background */}
          </nav>
        </div>
      </motion.div>
    </aside>
  );
}
```

### Button Styles (matching RecruitIQ)

```jsx
// Primary buttons use emerald (not product accent colors)
<Button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded shadow-sm transition-colors duration-220">
  Save
</Button>

// Loading spinner uses emerald
<div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
```

### Card Component (matching RecruitIQ)

```jsx
<div className="p-4 bg-white dark:bg-slate-800 rounded shadow-sm">
  {children}
</div>
```

### Transition Timings (matching RecruitIQ)

```css
/* Standard transitions */
transition: all 220ms cubic-bezier(.2,.9,.2,1);

/* Quick interactions */
transition: all 160ms ease;

/* Layout changes */
transition: width 180ms cubic-bezier(.2,.9,.2,1);
```

---

## 📊 Phase 17: Paylinq Frontend Deliverables

### Application Structure
```
paylinq/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Workers/
│   │   │   ├── WorkersList.tsx
│   │   │   ├── WorkerDetail.tsx
│   │   │   ├── WorkerTypes.tsx
│   │   │   └── WorkerTypeTemplates.tsx
│   │   ├── PayComponents/
│   │   │   ├── PayComponentsList.tsx
│   │   │   ├── PayComponentDetail.tsx
│   │   │   ├── CustomComponents.tsx
│   │   │   └── FormulaBuilder.tsx (MVP: Simple arithmetic, Phase 2: Visual formula builder)
│   │   ├── TaxSetup/
│   │   │   ├── TaxRuleSets.tsx
│   │   │   ├── TaxBrackets.tsx
│   │   │   ├── Allowances.tsx
│   │   │   ├── DeductibleCosts.tsx
│   │   │   └── TaxCalculationPreview.tsx
│   │   ├── TimeAttendance/
│   │   │   ├── ClockInOut.tsx
│   │   │   ├── TimeEntries.tsx
│   │   │   ├── ApprovalQueue.tsx
│   │   │   └── RatedTimeLines.tsx
│   │   ├── Scheduling/
│   │   │   ├── WorkSchedules.tsx
│   │   │   ├── ShiftTypes.tsx
│   │   │   ├── ScheduleCalendar.tsx
│   │   │   └── ChangeRequests.tsx
│   │   ├── PayrollRuns/
│   │   │   ├── PayrollRunsList.tsx
│   │   │   ├── PayrollRunDetail.tsx
│   │   │   ├── PayrollProcessor.tsx
│   │   │   └── PaycheckGenerator.tsx
│   │   ├── Reconciliation/
│   │   │   ├── ReconciliationsList.tsx
│   │   │   ├── ReconciliationDetail.tsx
│   │   │   ├── VarianceAnalysis.tsx
│   │   │   └── AdjustmentQueue.tsx
│   │   ├── Deductions/
│   │   │   ├── DeductionsList.tsx
│   │   │   └── EmployeeDeductions.tsx
│   │   ├── Payments/
│   │   │   ├── PaymentTransactions.tsx
│   │   │   └── PaymentHistory.tsx
│   │   └── Reports/
│   │       ├── PayrollSummary.tsx
│   │       ├── TaxReports.tsx
│   │       ├── AttendanceReports.tsx
│   │       └── ComplianceReports.tsx
│   ├── components/
│   │   ├── WorkerTypeCard.tsx
│   │   ├── PayComponentCard.tsx
│   │   ├── TaxCalculator.tsx
│   │   ├── TimesheetEntry.tsx
│   │   ├── ClockWidget.tsx
│   │   ├── ScheduleGrid.tsx
│   │   ├── PayrollCalculator.tsx
│   │   ├── PaycheckDetail.tsx
│   │   ├── ReconciliationItemCard.tsx
│   │   └── FormulaEditor.tsx (MVP: Text input, Phase 2: Visual builder)
│   ├── services/
│   │   ├── payrollApi.ts
│   │   ├── workerApi.ts
│   │   ├── taxApi.ts
│   │   ├── timeAttendanceApi.ts
│   │   ├── schedulingApi.ts
│   │   └── reconciliationApi.ts
│   ├── hooks/
│   │   ├── usePayroll.ts
│   │   ├── useWorkers.ts
│   │   ├── useTaxCalculation.ts
│   │   ├── useTimeAttendance.ts
│   │   └── useReconciliation.ts
│   └── types/
│       ├── payroll.ts
│       ├── worker.ts
│       ├── tax.ts
│       ├── timeAttendance.ts
│       └── reconciliation.ts
```

### Key Components

**File:** `paylinq/src/pages/Workers/WorkerTypes.tsx`

```typescript
/**
 * Worker Types Management
 * Manage worker type templates and assignments
 */
import React, { useState } from 'react';
import { Button, Table, Modal, Badge, Tabs } from '@recruitiq/shared-ui';
import { useApi } from '@recruitiq/shared-ui';

export const WorkerTypes: React.FC = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const { data: templates, loading } = useApi('/api/payroll/worker-type-templates', 'GET');
  
  const templateColumns = [
    { key: 'template_code', label: 'Code' },
    { key: 'template_name', label: 'Name' },
    { key: 'payment_frequency', label: 'Pay Frequency' },
    { key: 'default_hours_per_week', label: 'Hours/Week' },
    { key: 'overtime_eligible', label: 'OT Eligible', render: (v) => v ? 'Yes' : 'No' },
    { key: 'active_count', label: 'Active Workers' }
  ];
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Worker Types</h1>
        <Button onClick={() => navigate('/worker-types/new-template')}>
          New Template
        </Button>
      </div>
      
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { value: 'templates', label: 'Templates' },
          { value: 'assignments', label: 'Worker Assignments' }
        ]}
      />
      
      <Table
        columns={templateColumns}
        data={templates || []}
        loading={loading}
        onRowClick={(template) => navigate(`/worker-types/${template.id}`)}
      />
    </div>
  );
};
```

**File:** `paylinq/src/pages/TimeAttendance/ClockInOut.tsx`

```typescript
/**
 * Clock In/Out Widget
 * MVP: Manual clock in/out, Phase 2: Biometric integration, GPS validation
 */
import React, { useState, useEffect } from 'react';
import { Button, Card, Input, Alert } from '@recruitiq/shared-ui';
import { useApi } from '@recruitiq/shared-ui';

export const ClockInOut: React.FC = () => {
  const [currentStatus, setCurrentStatus] = useState<'clocked-out' | 'clocked-in'>('clocked-out');
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const { execute: clockIn, loading: clockingIn } = useApi('/api/payroll/time-attendance/clock-in', 'POST');
  const { execute: clockOut, loading: clockingOut } = useApi('/api/payroll/time-attendance/clock-out', 'POST');
  
  const handleClockIn = async () => {
    try {
      const result = await clockIn({
        clockInTime: new Date().toISOString(),
        notes: 'Manual clock-in' // Phase 2: Add GPS coordinates, device info
      });
      setCurrentEvent(result.data);
      setCurrentStatus('clocked-in');
    } catch (error) {
      // Handle error
    }
  };
  
  const handleClockOut = async () => {
    try {
      const result = await clockOut({
        attendanceEventId: currentEvent.id,
        clockOutTime: new Date().toISOString(),
        notes: 'Manual clock-out'
      });
      setCurrentStatus('clocked-out');
      setCurrentEvent(null);
    } catch (error) {
      // Handle error
    }
  };
  
  return (
    <Card className="max-w-md mx-auto">
      <div className="text-center">
        <div className="text-4xl font-bold mb-4">
          {new Date().toLocaleTimeString()}
        </div>
        
        {currentStatus === 'clocked-out' ? (
          <Button
            size="large"
            variant="success"
            onClick={handleClockIn}
            loading={clockingIn}
            className="w-full"
          >
            Clock In
          </Button>
        ) : (
          <>
            <Alert variant="info" className="mb-4">
              Clocked in at {new Date(currentEvent.clock_in_time).toLocaleTimeString()}
            </Alert>
            <Button
              size="large"
              variant="danger"
              onClick={handleClockOut}
              loading={clockingOut}
              className="w-full"
            >
              Clock Out
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};
```

**File:** `paylinq/src/pages/Reconciliation/ReconciliationDetail.tsx`

```typescript
/**
 * Payroll Reconciliation Detail
 * MVP: Manual variance resolution, Phase 2: Automated discrepancy detection
 */
import React, { useState } from 'react';
import { Card, Table, Button, Badge, Input } from '@recruitiq/shared-ui';
import { useApi } from '@recruitiq/shared-ui';
import { useParams } from 'react-router-dom';

export const ReconciliationDetail: React.FC = () => {
  const { reconciliationId } = useParams();
  const { data: reconciliation, loading } = useApi(
    `/api/payroll/reconciliations/${reconciliationId}`,
    'GET'
  );
  
  const itemColumns = [
    { key: 'paycheck_number', label: 'Paycheck #' },
    { key: 'worker_name', label: 'Worker' },
    { key: 'expected_amount', label: 'Expected', format: 'currency' },
    { key: 'actual_amount', label: 'Actual', format: 'currency' },
    { 
      key: 'variance_amount', 
      label: 'Variance',
      render: (value) => (
        <span className={value !== 0 ? 'text-red-600' : 'text-green-600'}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <Badge variant={value === 'resolved' ? 'success' : 'warning'}>
          {value}
        </Badge>
      )
    }
  ];
  
  return (
    <div className="p-6">
      <Card className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{reconciliation?.reconciliation_name}</h1>
            <p className="text-gray-600">Payroll Run: {reconciliation?.payroll_run_number}</p>
          </div>
          <Badge variant={reconciliation?.status === 'completed' ? 'success' : 'warning'}>
            {reconciliation?.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div>
            <p className="text-sm text-gray-600">Total Expected</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
                .format(reconciliation?.total_expected_amount || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Actual</p>
            <p className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
                .format(reconciliation?.total_actual_amount || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Variance</p>
            <p className={`text-2xl font-bold ${reconciliation?.total_variance_amount !== 0 ? 'text-red-600' : 'text-green-600'}`}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
                .format(reconciliation?.total_variance_amount || 0)}
            </p>
          </div>
        </div>
      </Card>
      
      <Table
        columns={itemColumns}
        data={reconciliation?.items || []}
        loading={loading}
        onRowClick={(item) => navigate(`/reconciliation-items/${item.id}`)}
      />
    </div>
  );
};
```

**Task Breakdown:**
- Task 17.1: Setup Paylinq app structure and routing (0.5 days)
- Task 17.2: Implement worker type management UI (0.5 days)
- Task 17.3: Implement pay component configuration UI (0.5 days)
- Task 17.4: Implement tax setup UI (0.5 days)
- Task 17.5: Implement time & attendance UI (clock in/out, entries, approval) (0.75 days)
- Task 17.6: Implement scheduling UI (0.5 days)
- Task 17.7: Implement payroll run and processing UI (0.75 days)
- Task 17.8: Implement reconciliation UI (0.5 days)
- Task 17.9: Implement deductions and payment history UI (0.25 days)
- Task 17.10: Implement reports and dashboards (0.5 days)
- Task 17.11: Testing and bug fixes (0.5 days)
- Task 17.12: Deployment and documentation (0.25 days)

---

## 📊 Phase 18: Nexus Frontend Deliverables

### Application Structure
```
nexus/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── UserAccounts/
│   │   │   ├── UserAccountsList.tsx
│   │   │   ├── UserAccountDetail.tsx
│   │   │   └── UserProfile.tsx
│   │   ├── Employees/
│   │   │   ├── EmployeesList.tsx
│   │   │   ├── EmployeeDetail.tsx
│   │   │   ├── EmployeeOnboarding.tsx
│   │   │   └── EmployeeTermination.tsx
│   │   ├── Contracts/
│   │   │   ├── ContractsList.tsx
│   │   │   ├── ContractDetail.tsx
│   │   │   ├── ContractSequencePolicies.tsx
│   │   │   ├── ContractRenewal.tsx
│   │   │   └── ExpiringContracts.tsx
│   │   ├── RuleEngine/
│   │   │   ├── RulesList.tsx
│   │   │   ├── RuleEditor.tsx (MVP: JSON editor, Phase 2: Visual rule builder)
│   │   │   ├── RuleExecutionLogs.tsx
│   │   │   └── RuleTestRunner.tsx
│   │   ├── Leave/
│   │   │   ├── LeaveRequests.tsx
│   │   │   ├── LeaveApprovalQueue.tsx
│   │   │   ├── LeaveBalances.tsx
│   │   │   ├── LeaveCalendar.tsx
│   │   │   ├── LeavePolicies.tsx
│   │   │   └── AccrualSettings.tsx
│   │   ├── Attendance/
│   │   │   ├── AttendanceRecords.tsx
│   │   │   ├── AttendanceSummary.tsx
│   │   │   └── AttendanceReports.tsx
│   │   ├── Performance/
│   │   │   ├── PerformanceReviews.tsx
│   │   │   ├── ReviewTemplates.tsx
│   │   │   ├── Goals.tsx
│   │   │   ├── Competencies.tsx
│   │   │   └── Feedback.tsx
│   │   ├── Benefits/
│   │   │   ├── BenefitPlans.tsx
│   │   │   ├── BenefitEnrollment.tsx
│   │   │   └── EligibilityRules.tsx
│   │   ├── Documents/
│   │   │   ├── DocumentsList.tsx
│   │   │   ├── DocumentUpload.tsx
│   │   │   ├── DocumentTemplates.tsx
│   │   │   └── DocumentViewer.tsx
│   │   ├── Organization/
│   │   │   ├── Departments.tsx
│   │   │   ├── Locations.tsx
│   │   │   ├── Positions.tsx
│   │   │   ├── JobLevels.tsx
│   │   │   └── OrgChart.tsx
│   │   └── Reports/
│   │       ├── HeadcountReports.tsx
│   │       ├── TurnoverAnalysis.tsx
│   │       ├── LeaveAnalytics.tsx
│   │       └── ComplianceReports.tsx
│   ├── components/
│   │   ├── UserAccountCard.tsx
│   │   ├── EmployeeCard.tsx
│   │   ├── ContractCard.tsx
│   │   ├── ContractSequenceViewer.tsx
│   │   ├── RuleConditionBuilder.tsx (MVP: JSON, Phase 2: Visual)
│   │   ├── RuleActionBuilder.tsx
│   │   ├── LeaveBalanceWidget.tsx
│   │   ├── AccrualCalculator.tsx
│   │   ├── AttendanceCalendar.tsx
│   │   ├── OrgChartNode.tsx
│   │   ├── PerformanceReviewForm.tsx
│   │   ├── GoalTracker.tsx
│   │   └── CompetencyRating.tsx
│   ├── services/
│   │   ├── hrisApi.ts
│   │   ├── userAccountApi.ts
│   │   ├── contractApi.ts
│   │   ├── ruleEngineApi.ts
│   │   ├── leaveApi.ts
│   │   ├── attendanceApi.ts
│   │   └── performanceApi.ts
│   ├── hooks/
│   │   ├── useEmployees.ts
│   │   ├── useUserAccounts.ts
│   │   ├── useContracts.ts
│   │   ├── useRuleEngine.ts
│   │   ├── useLeaveManagement.ts
│   │   └── useAttendance.ts
│   └── types/
│       ├── employee.ts
│       ├── userAccount.ts
│       ├── contract.ts
│       ├── rule.ts
│       ├── leave.ts
│       └── attendance.ts
```

### Key Components

**File:** `nexus/src/pages/Contracts/ContractSequencePolicies.tsx`

```typescript
/**
 * Contract Sequence Policies Management
 * MVP: Basic sequence creation, Phase 2: Visual workflow builder
 */
import React, { useState } from 'react';
import { Button, Table, Modal, Card } from '@recruitiq/shared-ui';
import { useApi } from '@recruitiq/shared-ui';

export const ContractSequencePolicies: React.FC = () => {
  const [showNewModal, setShowNewModal] = useState(false);
  const { data: policies, loading } = useApi('/api/hris/contract-sequences', 'GET');
  
  const columns = [
    { key: 'sequence_name', label: 'Sequence Name' },
    { key: 'sequence_code', label: 'Code' },
    { key: 'description', label: 'Description' },
    { key: 'total_steps', label: 'Steps' },
    { key: 'active_contracts', label: 'Active Contracts' },
    { key: 'is_active', label: 'Status', render: (v) => v ? 'Active' : 'Inactive' }
  ];
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contract Sequence Policies</h1>
        <Button onClick={() => setShowNewModal(true)}>
          New Sequence Policy
        </Button>
      </div>
      
      <Table
        columns={columns}
        data={policies || []}
        loading={loading}
        onRowClick={(policy) => navigate(`/contract-sequences/${policy.id}`)}
      />
    </div>
  );
};
```

**File:** `nexus/src/pages/RuleEngine/RuleEditor.tsx`

```typescript
/**
 * Rule Engine Editor
 * MVP: JSON editor for conditions/actions, Phase 2: Visual rule builder
 */
import React, { useState } from 'react';
import { Button, Input, Select, Card, Tabs } from '@recruitiq/shared-ui';
import { useApi } from '@recruitiq/shared-ui';

export const RuleEditor: React.FC = () => {
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState('leave_approval');
  const [conditionsJson, setConditionsJson] = useState('{}');
  const [actionsJson, setActionsJson] = useState('{}');
  const [activeTab, setActiveTab] = useState('conditions');
  
  const { execute: saveRule, loading: saving } = useApi('/api/hris/rules', 'POST');
  
  const handleSave = async () => {
    try {
      const conditions = JSON.parse(conditionsJson);
      const actions = JSON.parse(actionsJson);
      
      await saveRule({
        ruleName,
        ruleType,
        conditions,
        actions,
        priority: 0,
        isActive: true
      });
      
      // Show success and navigate back
    } catch (error) {
      // Handle JSON parse error or API error
    }
  };
  
  return (
    <div className="p-6">
      <Card>
        <h1 className="text-2xl font-bold mb-6">Create Rule</h1>
        
        <div className="space-y-4 mb-6">
          <Input
            label="Rule Name"
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="e.g., Auto-approve leave under 3 days"
          />
          
          <Select
            label="Rule Type"
            value={ruleType}
            onChange={setRuleType}
            options={[
              { value: 'leave_approval', label: 'Leave Approval' },
              { value: 'attendance_policy', label: 'Attendance Policy' },
              { value: 'performance_trigger', label: 'Performance Trigger' },
              { value: 'benefit_eligibility', label: 'Benefit Eligibility' }
            ]}
          />
        </div>
        
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            { value: 'conditions', label: 'Conditions (JSON)' },
            { value: 'actions', label: 'Actions (JSON)' }
          ]}
        />
        
        {activeTab === 'conditions' ? (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">
              Conditions (MVP: JSON format, Phase 2: Visual builder)
            </label>
            <textarea
              className="w-full h-64 p-3 border rounded font-mono text-sm"
              value={conditionsJson}
              onChange={(e) => setConditionsJson(e.target.value)}
              placeholder='{"employee.tenure_years": 2, "leave.days_requested": 3}'
            />
            <p className="text-sm text-gray-600 mt-2">
              Example: Simple equality checks. Phase 2 will support operators like &gt;, &lt;, in, etc.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">
              Actions (MVP: JSON format)
            </label>
            <textarea
              className="w-full h-64 p-3 border rounded font-mono text-sm"
              value={actionsJson}
              onChange={(e) => setActionsJson(e.target.value)}
              placeholder='{"auto_approve": true, "notify_manager": false}'
            />
            <p className="text-sm text-gray-600 mt-2">
              Actions to execute when conditions are met.
            </p>
          </div>
        )}
        
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="secondary" onClick={() => navigate('/rules')}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save Rule
          </Button>
        </div>
      </Card>
    </div>
  );
};
```

**File:** `nexus/src/pages/Leave/LeaveBalances.tsx`

```typescript
/**
 * Leave Balances with Accrual Tracking
 */
import React from 'react';
import { Card, Table, Badge, ProgressBar } from '@recruitiq/shared-ui';
import { useApi } from '@recruitiq/shared-ui';
import { useParams } from 'react-router-dom';

export const LeaveBalances: React.FC = () => {
  const { employeeId } = useParams();
  const { data: balances, loading } = useApi(
    `/api/hris/employees/${employeeId}/leave-balances`,
    'GET'
  );
  
  const columns = [
    { key: 'policy_name', label: 'Leave Type' },
    { 
      key: 'available_balance', 
      label: 'Available',
      render: (value) => `${value} days`
    },
    { 
      key: 'used_balance', 
      label: 'Used',
      render: (value) => `${value} days`
    },
    { 
      key: 'pending_balance', 
      label: 'Pending',
      render: (value) => `${value} days`
    },
    {
      key: 'utilization',
      label: 'Utilization',
      render: (_, row) => {
        const total = parseFloat(row.available_balance) + parseFloat(row.used_balance);
        const percent = total > 0 ? (parseFloat(row.used_balance) / total) * 100 : 0;
        return <ProgressBar value={percent} />;
      }
    },
    {
      key: 'next_accrual_date',
      label: 'Next Accrual',
      format: 'date'
    }
  ];
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Leave Balances</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="text-sm text-gray-600">Total Available</p>
          <p className="text-3xl font-bold">
            {balances?.reduce((sum, b) => sum + parseFloat(b.available_balance), 0).toFixed(1)} days
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Total Used</p>
          <p className="text-3xl font-bold">
            {balances?.reduce((sum, b) => sum + parseFloat(b.used_balance), 0).toFixed(1)} days
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Total Pending</p>
          <p className="text-3xl font-bold">
            {balances?.reduce((sum, b) => sum + parseFloat(b.pending_balance), 0).toFixed(1)} days
          </p>
        </Card>
      </div>
      
      <Table
        columns={columns}
        data={balances || []}
        loading={loading}
      />
    </div>
  );
};
```

**Task Breakdown:**
- Task 18.1: Setup Nexus app structure and routing (0.5 days)
- Task 18.2: Implement user account management UI (0.5 days)
- Task 18.3: Implement employee management UI with lifecycle (0.75 days)
- Task 18.4: Implement contract management UI with sequences (0.75 days)
- Task 18.5: Implement rule engine UI (JSON editor, execution logs) (0.5 days)
- Task 18.6: Implement enhanced leave management UI with accruals (0.75 days)
- Task 18.7: Implement attendance recording and reports UI (0.5 days)
- Task 18.8: Implement performance review UI (0.5 days)
- Task 18.9: Implement benefits enrollment UI (0.25 days)
- Task 18.10: Implement document management UI (0.25 days)
- Task 18.11: Implement organizational structure UI and org chart (0.5 days)
- Task 18.12: Testing and bug fixes (0.5 days)
- Task 18.13: Deployment and documentation (0.25 days)

---

## 📊 Phase 19: RecruitIQ Updates Deliverables

### Updates Required

**File:** `recruitiq/src/pages/CandidateDetail.tsx` (UPDATE)

```typescript
/**
 * Enhanced Hire Candidate Flow
 * Triggers creation of: Employee Record, User Account, and Initial Contract in Nexus
 */
import { Button, Modal, Input, Select, DatePicker, Card, Stepper } from '@recruitiq/shared-ui';
import { useState } from 'react';

// Add to existing CandidateDetail component
const [showHireModal, setShowHireModal] = useState(false);
const [hireStep, setHireStep] = useState(1);
const [hireData, setHireData] = useState({
  hireDate: null,
  jobTitle: '',
  employmentType: 'full-time',
  departmentId: null,
  managerId: null,
  locationId: null,
  workLocationType: 'on-site',
  // Contract details
  contractSequencePolicyId: null,
  contractType: 'probation',
  // User account details
  username: '',
  email: candidate.email,
  // Compensation (for Paylinq)
  salary: null,
  paymentFrequency: 'monthly'
});

const { execute: hireCandidate, loading: hiring } = useApi(
  `/api/recruitment/candidates/${candidateId}/hire`,
  'POST'
);

const { data: departments } = useApi('/api/hris/departments', 'GET');
const { data: managers } = useApi('/api/hris/employees?role=manager', 'GET');
const { data: contractPolicies } = useApi('/api/hris/contract-sequences', 'GET');

const handleHire = async () => {
  try {
    const result = await hireCandidate({
      // Employee details
      hireDate: hireData.hireDate,
      jobTitle: hireData.jobTitle,
      employmentType: hireData.employmentType,
      departmentId: hireData.departmentId,
      managerId: hireData.managerId,
      locationId: hireData.locationId,
      workLocationType: hireData.workLocationType,
      
      // Contract details
      contractSequencePolicyId: hireData.contractSequencePolicyId,
      contractType: hireData.contractType,
      
      // User account details
      username: hireData.username,
      email: hireData.email,
      
      // Compensation details (for Paylinq integration)
      salary: hireData.salary,
      paymentFrequency: hireData.paymentFrequency
    });
    
    // Show success message with created entities
    toast.success(
      `Candidate hired successfully!
       - Employee record created in Nexus HRIS (ID: ${result.data.employee.employee_number})
       - User account created (Username: ${result.data.userAccount.username})
       - Initial ${result.data.contract.contract_type} contract created (${result.data.contract.contract_number})`
    );
    
    setShowHireModal(false);
    // Update candidate status
    updateCandidateStatus('hired');
  } catch (error) {
    toast.error('Failed to hire candidate: ' + error.message);
  }
};

// Add hire button with enhanced modal
{candidate.status === 'offer-accepted' && (
  <Button variant="primary" onClick={() => setShowHireModal(true)}>
    Hire Candidate
  </Button>
)}

{showHireModal && (
  <Modal
    title="Hire Candidate"
    onClose={() => setShowHireModal(false)}
    size="large"
  >
    <Stepper
      currentStep={hireStep}
      steps={[
        { label: 'Employee Details' },
        { label: 'Contract & Compensation' },
        { label: 'User Account' },
        { label: 'Review & Confirm' }
      ]}
    />
    
    {hireStep === 1 && (
      <Card className="mt-6">
        <h3 className="font-bold mb-4">Employee Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <DatePicker
            label="Hire Date"
            value={hireData.hireDate}
            onChange={(date) => setHireData({ ...hireData, hireDate: date })}
            required
          />
          <Input
            label="Job Title"
            value={hireData.jobTitle}
            onChange={(e) => setHireData({ ...hireData, jobTitle: e.target.value })}
            required
          />
          <Select
            label="Employment Type"
            value={hireData.employmentType}
            onChange={(value) => setHireData({ ...hireData, employmentType: value })}
            options={[
              { value: 'full-time', label: 'Full Time' },
              { value: 'part-time', label: 'Part Time' },
              { value: 'contract', label: 'Contract' },
              { value: 'intern', label: 'Intern' }
            ]}
            required
          />
          <Select
            label="Department"
            value={hireData.departmentId}
            onChange={(value) => setHireData({ ...hireData, departmentId: value })}
            options={departments?.map(d => ({ value: d.id, label: d.department_name }))}
            required
          />
          <Select
            label="Manager"
            value={hireData.managerId}
            onChange={(value) => setHireData({ ...hireData, managerId: value })}
            options={managers?.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }))}
          />
          <Select
            label="Work Location Type"
            value={hireData.workLocationType}
            onChange={(value) => setHireData({ ...hireData, workLocationType: value })}
            options={[
              { value: 'on-site', label: 'On-site' },
              { value: 'remote', label: 'Remote' },
              { value: 'hybrid', label: 'Hybrid' }
            ]}
          />
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={() => setHireStep(2)}>Next</Button>
        </div>
      </Card>
    )}
    
    {hireStep === 2 && (
      <Card className="mt-6">
        <h3 className="font-bold mb-4">Contract & Compensation</h3>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Contract Sequence Policy"
            value={hireData.contractSequencePolicyId}
            onChange={(value) => setHireData({ ...hireData, contractSequencePolicyId: value })}
            options={contractPolicies?.map(p => ({ 
              value: p.id, 
              label: `${p.sequence_name} (${p.sequence_code})` 
            }))}
            required
          />
          <Select
            label="Initial Contract Type"
            value={hireData.contractType}
            onChange={(value) => setHireData({ ...hireData, contractType: value })}
            options={[
              { value: 'probation', label: 'Probation' },
              { value: 'fixed-term', label: 'Fixed Term' },
              { value: 'permanent', label: 'Permanent' },
              { value: 'temporary', label: 'Temporary' }
            ]}
            required
          />
          <Input
            label="Annual Salary"
            type="number"
            value={hireData.salary}
            onChange={(e) => setHireData({ ...hireData, salary: e.target.value })}
            required
          />
          <Select
            label="Payment Frequency"
            value={hireData.paymentFrequency}
            onChange={(value) => setHireData({ ...hireData, paymentFrequency: value })}
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'bi-weekly', label: 'Bi-weekly' },
              { value: 'semi-monthly', label: 'Semi-monthly' },
              { value: 'monthly', label: 'Monthly' }
            ]}
          />
        </div>
        <div className="flex justify-between mt-6">
          <Button variant="secondary" onClick={() => setHireStep(1)}>Back</Button>
          <Button onClick={() => setHireStep(3)}>Next</Button>
        </div>
      </Card>
    )}
    
    {hireStep === 3 && (
      <Card className="mt-6">
        <h3 className="font-bold mb-4">User Account Setup</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Username"
            value={hireData.username}
            onChange={(e) => setHireData({ ...hireData, username: e.target.value })}
            placeholder="e.g., john.doe"
            required
          />
          <Input
            label="Email"
            type="email"
            value={hireData.email}
            onChange={(e) => setHireData({ ...hireData, email: e.target.value })}
            required
          />
        </div>
        <p className="text-sm text-gray-600 mt-4">
          A temporary password will be generated and sent to the employee's email.
        </p>
        <div className="flex justify-between mt-6">
          <Button variant="secondary" onClick={() => setHireStep(2)}>Back</Button>
          <Button onClick={() => setHireStep(4)}>Next</Button>
        </div>
      </Card>
    )}
    
    {hireStep === 4 && (
      <Card className="mt-6">
        <h3 className="font-bold mb-4">Review & Confirm</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Employee Details</h4>
            <p>Job Title: {hireData.jobTitle}</p>
            <p>Hire Date: {hireData.hireDate}</p>
            <p>Employment Type: {hireData.employmentType}</p>
          </div>
          <div>
            <h4 className="font-semibold">Contract Details</h4>
            <p>Contract Type: {hireData.contractType}</p>
            <p>Salary: ${hireData.salary?.toLocaleString()}</p>
            <p>Payment Frequency: {hireData.paymentFrequency}</p>
          </div>
          <div>
            <h4 className="font-semibold">User Account</h4>
            <p>Username: {hireData.username}</p>
            <p>Email: {hireData.email}</p>
          </div>
        </div>
        <div className="flex justify-between mt-6">
          <Button variant="secondary" onClick={() => setHireStep(3)}>Back</Button>
          <Button
            variant="primary"
            onClick={handleHire}
            loading={hiring}
          >
            Confirm & Hire
          </Button>
        </div>
      </Card>
    )}
  </Modal>
)}
```

**Task Breakdown:**
- Task 19.1: Migrate to shared-ui components (1 day)
- Task 19.2: Implement comprehensive hire workflow with stepper (1.5 days)
- Task 19.3: Add integration with Nexus for employee/contract/user creation (1 day)
- Task 19.4: Update candidate management with hiring status tracking (0.5 days)
- Task 19.5: Testing and deployment (0.5 days)

---

## 🔍 Combined Task Assignments

### Frontend Developer 1 (Paylinq Focus - 4 days)
- Phase 17 implementation lead
- Worker types and pay components UI
- Time & attendance and scheduling UI
- Payroll run and reconciliation UI
- Testing and bug fixes

### Frontend Developer 2 (Nexus Focus - 4 days)
- Phase 18 implementation lead
- Contract management and sequence workflows UI
- Rule engine UI (JSON editor)
- Enhanced leave management with accruals UI
- Attendance, performance, and org structure UI
- Testing and bug fixes

### Frontend Developer 3 (Nexus Support - 4 days)
- Phase 18 support
- User account management UI
- Benefits and document management UI
- Organizational chart visualization
- Testing and documentation

### Frontend Developer 4 (RecruitIQ Focus - 4 days)
- Phase 19 implementation lead
- Migration to shared-ui components
- Enhanced hire candidate workflow (multi-step wizard)
- Integration testing with Nexus backend
- Testing and deployment

---

## 📋 Standards Compliance Checklist

- [ ] All apps use @recruitiq/shared-ui
- [ ] TypeScript for all code
- [ ] Accessibility standards met
- [ ] Responsive design implemented
- [ ] Tests achieve 70%+ coverage
- [ ] Code follows FRONTEND_STANDARDS.md
- [ ] API integration working
- [ ] Error handling comprehensive

---

## 🎯 Success Criteria

Phases 17-19 complete when:

### Phase 17 (Paylinq)
1. ✅ Paylinq app running independently
2. ✅ **Design system compliance:** Emerald primary color, Inter font, PL logo with emerald-to-blue gradient, 72px header, 256px/72px collapsible sidebar, dark mode support, 220ms transitions
3. ✅ Worker type management UI functional
4. ✅ Pay component configuration UI working
5. ✅ Tax setup and calculation preview UI operational
6. ✅ Time & attendance UI functional (clock in/out, entries, approvals, rated time lines)
7. ✅ Shift scheduling UI with change requests working
8. ✅ Payroll run and processing UI executing correctly
9. ✅ Reconciliation UI functional with variance tracking
10. ✅ Deduction management UI working
11. ✅ Payment history and reporting UI operational
12. ✅ All API integrations working
13. ✅ Tests passing (70%+ coverage)
14. ✅ Visual consistency verified with RecruitIQ (same look and feel)

### Phase 18 (Nexus)
1. ✅ Nexus app running independently
2. ✅ **Design system compliance:** Emerald primary color, Inter font, NX logo with emerald-to-purple gradient, 72px header, 256px/72px collapsible sidebar, dark mode support, 220ms transitions
3. ✅ User account management UI functional (separate from employees)
4. ✅ Employee lifecycle management UI working (onboarding, termination)
5. ✅ Contract management UI functional with sequence workflows
6. ✅ Rule engine UI operational (JSON editor, execution logs)
7. ✅ Enhanced leave management UI working with accrual tracking
8. ✅ Attendance recording and reporting UI functional
9. ✅ Performance review UI with goals and competencies working
10. ✅ Benefits enrollment UI operational
11. ✅ Document management UI with templates functional
12. ✅ Organizational structure UI working (departments, locations, positions)
13. ✅ Org chart visualization displaying correctly
14. ✅ All API integrations working
15. ✅ Tests passing (70%+ coverage)
16. ✅ Visual consistency verified with RecruitIQ (same look and feel)

### Phase 19 (RecruitIQ)
1. ✅ RecruitIQ fully migrated to shared-ui components
2. ✅ **Design system compliance maintained:** Existing emerald colors, Inter font, RI logo, layout structure preserved
3. ✅ Multi-step hire workflow complete and functional
4. ✅ Hire workflow triggers employee + user account + contract creation in Nexus
5. ✅ Integration with Nexus HRIS working end-to-end
6. ✅ Candidate status tracking updated with hiring status
7. ✅ All existing RecruitIQ features still functional
8. ✅ Tests passing (70%+ coverage)

---

## 📤 Outputs

### Applications Created/Updated
- [ ] **paylinq/** - Complete payroll application
  - Worker types and pay components modules
  - Tax setup and calculation module
  - Time & attendance module
  - Scheduling module
  - Payroll processing module
  - Reconciliation module
  - Reporting dashboards

- [ ] **nexus/** - Complete HRIS application
  - User account management module
  - Employee lifecycle module
  - Contract management module with sequences
  - Rule engine module (JSON-based MVP)
  - Enhanced leave management module
  - Attendance tracking module
  - Performance review module
  - Benefits and documents modules
  - Organizational structure module

- [ ] **recruitiq/** - Updated ATS application
  - Migrated to shared-ui components
  - Multi-step hire workflow with wizard
  - Integration with Nexus for employee creation

### Tests Created
- [ ] Component tests for all new components (70%+ coverage)
- [ ] Integration tests for key workflows:
  - Paylinq: Payroll run end-to-end
  - Paylinq: Time entry to paycheck
  - Paylinq: Reconciliation workflow
  - Nexus: Employee onboarding
  - Nexus: Contract renewal workflow
  - Nexus: Leave request and approval
  - Nexus: Rule engine execution
  - RecruitIQ: Candidate hire to employee creation
- [ ] E2E tests for critical paths across all three apps

### Documentation Created
- [ ] User guides for each application
- [ ] Developer documentation
- [ ] API integration documentation
- [ ] Phase 2 enhancements documentation for:
  - Formula builder (visual editor)
  - Rule engine (visual rule builder)
  - Advanced features roadmap

---

## 🔄 Phase 2 Enhancements (Frontend)

**Paylinq Advanced UI:**
- Visual formula builder for pay components
- Interactive tax calculation simulator
- Biometric device integration UI
- Advanced reporting with drill-down
- Payroll forecasting and budgeting tools

**Nexus Advanced UI:**
- Visual rule builder (drag-and-drop conditions/actions)
- Advanced contract template editor
- Leave forecasting and planning tools
- ML-based absence pattern detection dashboard
- Advanced org chart with filters and search

**RecruitIQ Advanced UI:**
- Automated candidate matching with ML
- Video interview integration
- Advanced candidate pipeline visualization

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shared-ui API changes breaking apps | High | Lock versions; test thoroughly before updates; maintain changelog |
| Complex state management across modules | High | Use Zustand/Redux for global state; document patterns |
| Performance issues with large datasets | High | Implement pagination, virtual scrolling, code splitting, lazy loading |
| Browser compatibility issues | Medium | Cross-browser testing; polyfills; transpilation |
| JSON editor UX for rule engine | Medium | Provide templates and examples; Phase 2 visual builder |
| Contract sequence workflow confusion | Medium | Clear UI flow; tooltips; onboarding guides |
| API integration failures | High | Comprehensive error handling; retry logic; offline support |
| Accessibility compliance | Medium | Follow WCAG guidelines; automated testing; manual audits |
| Mobile responsiveness challenges | Medium | Mobile-first design; extensive device testing |

---

## 🔗 Related Phases

- **Previous:** [Phase 16: Shared UI Library](./PHASE_16_FRONTEND_SHARED_UI.md)
- **Next:** [Phase 20: Subscription & Billing](./PHASE_20_SUBSCRIPTION_BILLING.md)
- **Related:** [Phase 16: Shared UI](./PHASE_16_FRONTEND_SHARED_UI.md)

---

**Phase Owners:**  
- Phase 17 (Paylinq): Frontend Developer 1  
- Phase 18 (Nexus): Frontend Developer 2 & 3  
- Phase 19 (RecruitIQ): Frontend Developer 4  

**Last Updated:** November 3, 2025  
**Status:** Ready to Start  
**Complexity:** High (Enterprise UIs with contract management, rule engine, enhanced features)  
**Approach:** Hybrid MVP - Full UI for all features with simplified workflows initially, Phase 2 visual builders documented
