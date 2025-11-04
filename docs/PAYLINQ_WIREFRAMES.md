# Paylinq UI Wireframes & Component Specifications

**Date:** November 4, 2025  
**Version:** 1.0  
**Context:** Surinamese payroll system (SRD currency, local banks, AOV/AWW)

---

## 📐 Design Principles

### Visual Hierarchy
- **Primary actions:** Blue (paylinq accent #3b82f6)
- **Financial data:** Bold, tabular-nums for alignment
- **Status indicators:** Color-coded badges
- **Spacing:** Generous whitespace for readability

### Typography
- **Headers:** font-semibold, text-2xl to text-3xl
- **Body:** font-normal, text-sm to text-base
- **Financial values:** font-medium, tabular-nums
- **Labels:** font-medium, text-xs uppercase text-gray-600

### Color Usage
- **Positive amounts:** text-green-600
- **Deductions/negative:** text-red-600
- **Neutral:** text-gray-900 dark:text-gray-100
- **Paylinq blue:** bg-blue-50 text-blue-600 (highlights)

---

## 🏠 Screen 1: Dashboard

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header: "Dashboard"                                      │
│ Subtext: "Welcome to Paylinq - Payroll Overview"        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │ Total   │ │ Next    │ │ Pending │ │ Monthly │       │
│ │Workers  │ │Payroll  │ │Approvals│ │  Cost   │       │
│ │   42    │ │ Dec 15  │ │    8    │ │SRD 210K │       │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Upcoming Payroll Runs                    [Create Run]   │
│ ┌─────────────────────────────────────────────────┐    │
│ │ ○─────○─────○                                   │    │
│ │ Nov 15  Nov 30  Dec 15                          │    │
│ │ ✓Done   Ready   Scheduled                       │    │
│ └─────────────────────────────────────────────────┘    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Pending Approvals (8)              [View All]           │
│ ┌──────────────────────────────────────────────────┐   │
│ │ □ 12 time entries awaiting approval      [Approve]│   │
│ │ □ 3 schedule change requests             [Review] │   │
│ │ □ 2 payroll adjustments                  [Review] │   │
│ └──────────────────────────────────────────────────┘   │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Recent Activity                                          │
│ • John Doe added to payroll        2 hours ago          │
│ • Payroll Run #2024-11 completed   5 hours ago          │
│ • Tax rules updated                1 day ago            │
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Summary Cards (4 cards)
```typescript
<Card variant="default" padding="lg">
  <div className="space-y-2">
    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
      Total Workers
    </p>
    <p className="text-3xl font-bold text-gray-900 dark:text-white">
      42
    </p>
    <p className="text-xs text-green-600 flex items-center">
      <TrendingUp className="w-4 h-4 mr-1" />
      +3 this month
    </p>
  </div>
</Card>
```

**Cards:**
1. **Total Workers** - Count with trend indicator
2. **Next Payroll** - Date with days remaining
3. **Pending Approvals** - Count with urgency badge
4. **Monthly Cost** - SRD amount with comparison

#### 2. Payroll Timeline
```typescript
<Card variant="default" padding="lg">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold">Upcoming Payroll Runs</h3>
    <Button variant="primary" size="sm">Create Run</Button>
  </div>
  <PayrollTimeline runs={upcomingRuns} />
</Card>
```

**Visual:** Horizontal timeline with dots for each payroll run
- Past runs: Green checkmark
- Current: Blue pulsing dot
- Future: Gray outlined dot

#### 3. Pending Approvals Widget
```typescript
<Card variant="default" padding="lg">
  <div className="space-y-3">
    {approvals.map(item => (
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center space-x-3">
          <input type="checkbox" />
          <div>
            <p className="text-sm font-medium">{item.count} {item.type}</p>
            <p className="text-xs text-gray-500">{item.urgency}</p>
          </div>
        </div>
        <Button variant="outline" size="sm">Review</Button>
      </div>
    ))}
  </div>
</Card>
```

#### 4. Recent Activity Feed
- Icon + description + timestamp
- Clickable items linking to details
- Max 10 items, scrollable

### Mock Data Requirements
```typescript
interface DashboardData {
  summary: {
    totalWorkers: number;
    workersTrend: number; // +/- change
    nextPayrollDate: string;
    daysUntilPayroll: number;
    pendingApprovals: number;
    monthlyCost: number; // SRD
    costTrend: number; // percentage
  };
  upcomingRuns: {
    id: string;
    date: string;
    status: 'completed' | 'ready' | 'scheduled';
  }[];
  pendingApprovals: {
    type: string;
    count: number;
    urgency: 'high' | 'medium' | 'low';
  }[];
  recentActivity: {
    description: string;
    timestamp: string;
    link?: string;
  }[];
}
```

---

## 👥 Screen 2: Workers List

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Workers                                    [+ Add Worker]│
│ Manage employee payroll records                          │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌────────────┐  ┌──────────────┐  │
│ │ 🔍 Search...    │  │ Type: All ▾│  │ Status: All ▾│  │
│ └─────────────────┘  └────────────┘  └──────────────┘  │
│                                                          │
│ ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐ │
│ │ ☑ Employee # │ Name       │ Type    │ Salary │ ... │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ □ SR-001     │ John Doe   │[Full]   │5,000▲  │ ⋮   │ │
│ │ □ SR-002     │ Jane Smith │[Part]   │3,500   │ ⋮   │ │
│ │ □ SR-003     │ Bob Wilson │[Contract]│120/hr │ ⋮   │ │
│ │ □ SR-004     │ Ana Garcia │[Full]   │6,200▲  │ ⋮   │ │
│ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘ │
│                                                          │
│ Showing 1-10 of 42 workers        [< 1 2 3 4 5 >]      │
│                                                          │
│ [☑ 4 selected] [⬇ Export] [✉ Email Payslips]          │
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Header with Actions
```typescript
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-3xl font-bold">Workers</h1>
    <p className="text-gray-600">Manage employee payroll records</p>
  </div>
  <Button variant="primary" size="lg" onClick={handleAddWorker}>
    <Plus className="w-5 h-5 mr-2" />
    Add Worker
  </Button>
</div>
```

#### 2. Filter Bar
```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <Input
    type="search"
    placeholder="Search by name or employee number..."
    icon={<Search />}
  />
  <Select options={workerTypes} placeholder="Type: All" />
  <Select options={statuses} placeholder="Status: All" />
</div>
```

#### 3. Workers Table
```typescript
<Card variant="default" padding="none">
  <table className="data-table w-full">
    <thead>
      <tr>
        <th><input type="checkbox" /></th>
        <th>Employee #</th>
        <th>Name</th>
        <th>Worker Type</th>
        <th>Compensation</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {workers.map(worker => (
        <tr key={worker.id} className="hover:bg-gray-50">
          <td><input type="checkbox" /></td>
          <td className="font-mono text-sm">{worker.employeeNumber}</td>
          <td>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="font-semibold text-blue-600">
                  {worker.initials}
                </span>
              </div>
              <div>
                <p className="font-medium">{worker.fullName}</p>
                <p className="text-xs text-gray-500">{worker.email}</p>
              </div>
            </div>
          </td>
          <td>
            <Badge variant="blue">{worker.workerType}</Badge>
          </td>
          <td className="financial-value">
            SRD {worker.compensation.toLocaleString()}
            {worker.salaryIncrease && (
              <TrendingUp className="w-4 h-4 text-green-500 inline ml-1" />
            )}
          </td>
          <td>
            <StatusBadge status={worker.status} />
          </td>
          <td>
            <DropdownMenu>
              <DropdownItem onClick={() => viewWorker(worker.id)}>
                View Details
              </DropdownItem>
              <DropdownItem onClick={() => editWorker(worker.id)}>
                Edit
              </DropdownItem>
              <DropdownItem onClick={() => viewPayslips(worker.id)}>
                Payslips
              </DropdownItem>
              <DropdownItem variant="danger">
                Deactivate
              </DropdownItem>
            </DropdownMenu>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
  
  <div className="p-4 border-t flex items-center justify-between">
    <p className="text-sm text-gray-600">
      Showing {start}-{end} of {total} workers
    </p>
    <Pagination currentPage={page} totalPages={totalPages} />
  </div>
</Card>
```

#### 4. Bulk Actions Bar (appears when items selected)
```typescript
{selectedCount > 0 && (
  <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-4">
    <span className="font-medium">{selectedCount} selected</span>
    <Button variant="secondary" size="sm">Export</Button>
    <Button variant="secondary" size="sm">Email Payslips</Button>
    <Button variant="outline" size="sm">Deselect All</Button>
  </div>
)}
```

### Mock Data Requirements
```typescript
interface Worker {
  id: string;
  employeeNumber: string; // SR-001, SR-002
  fullName: string;
  initials: string;
  email: string;
  workerType: 'Full-Time' | 'Part-Time' | 'Contract' | 'Hourly';
  compensation: number; // SRD amount
  salaryIncrease?: boolean;
  status: 'active' | 'inactive' | 'suspended';
  hireDate: string;
}
```

---

## 👤 Screen 3: Worker Details

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Workers                                        │
│                                                          │
│ ┌────┐  John Doe                              [Edit]    │
│ │ JD │  Employee #SR-001 • Full-Time Salaried          │
│ └────┘  Hired: Jan 15, 2024                             │
├─────────────────────────────────────────────────────────┤
│ [Overview] [Payment History] [Time & Attendance] [Docs] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────────────┐  ┌─────────────────────┐       │
│ │ Current Compensation│  │ Active Deductions   │       │
│ │                     │  │                     │       │
│ │ SRD 5,000 / month  │  │ • AOV: SRD 200     │       │
│ │ Effective: Jan 2024│  │ • AWW: SRD 50      │       │
│ │                     │  │ • Pension: SRD 150 │       │
│ │ [View History]     │  │                     │       │
│ └─────────────────────┘  └─────────────────────┘       │
│                                                          │
│ ┌─────────────────────┐  ┌─────────────────────┐       │
│ │ Payment Method      │  │ Tax Information     │       │
│ │                     │  │                     │       │
│ │ DSB Bank           │  │ National ID:        │       │
│ │ ••••••••7890       │  │ 1234567890         │       │
│ │ Savings Account    │  │                     │       │
│ │ Currency: SRD      │  │ Deduction: SRD 250 │       │
│ │                     │  │ Dependents: 2      │       │
│ └─────────────────────┘  └─────────────────────┘       │
│                                                          │
│ YTD Summary (2025)                                       │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Gross Pay    SRD 55,000                           │  │
│ │ Wage Tax     SRD 4,785                            │  │
│ │ AOV          SRD 2,200                            │  │
│ │ AWW          SRD 550                              │  │
│ │ Net Pay      SRD 47,465                           │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Worker Header
```typescript
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center space-x-4">
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
      <span className="text-2xl font-bold text-white">JD</span>
    </div>
    <div>
      <h1 className="text-3xl font-bold">{worker.fullName}</h1>
      <p className="text-gray-600">
        Employee #{worker.employeeNumber} • {worker.workerType}
      </p>
      <p className="text-sm text-gray-500">
        Hired: {formatDate(worker.hireDate)}
      </p>
    </div>
  </div>
  <Button variant="primary" onClick={handleEdit}>
    <Edit className="w-5 h-5 mr-2" />
    Edit
  </Button>
</div>
```

#### 2. Tab Navigation
```typescript
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="payments">Payment History</TabsTrigger>
    <TabsTrigger value="time">Time & Attendance</TabsTrigger>
    <TabsTrigger value="documents">Documents</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview">
    {/* Overview cards */}
  </TabsContent>
  
  <TabsContent value="payments">
    {/* Payment history table */}
  </TabsContent>
</Tabs>
```

#### 3. Overview Tab - Info Cards
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Compensation Card */}
  <Card variant="default" padding="lg">
    <h3 className="text-lg font-semibold mb-4">Current Compensation</h3>
    <div className="space-y-3">
      <div>
        <p className="text-3xl font-bold text-blue-600">
          SRD {worker.compensation.toLocaleString()}
        </p>
        <p className="text-sm text-gray-500">per month</p>
      </div>
      <div>
        <p className="text-sm text-gray-600">
          Effective: {formatDate(worker.compensationEffectiveDate)}
        </p>
      </div>
      <Button variant="outline" size="sm">View History</Button>
    </div>
  </Card>
  
  {/* Deductions Card */}
  <Card variant="default" padding="lg">
    <h3 className="text-lg font-semibold mb-4">Active Deductions</h3>
    <div className="space-y-2">
      {worker.deductions.map(deduction => (
        <div className="flex justify-between items-center py-2 border-b">
          <span className="text-sm font-medium">{deduction.name}</span>
          <span className="text-sm financial-value financial-negative">
            SRD {deduction.amount}
          </span>
        </div>
      ))}
    </div>
  </Card>
  
  {/* Payment Method Card */}
  <Card variant="default" padding="lg">
    <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
    <div className="space-y-2">
      <div className="flex items-center space-x-3">
        <Building className="w-5 h-5 text-gray-400" />
        <div>
          <p className="font-medium">{worker.bankInfo.bankName}</p>
          <p className="text-sm text-gray-500">
            ••••••••{worker.bankInfo.accountLast4}
          </p>
        </div>
      </div>
      <p className="text-sm text-gray-600">
        {worker.bankInfo.accountType} • {worker.bankInfo.currency}
      </p>
    </div>
  </Card>
  
  {/* Tax Info Card */}
  <Card variant="default" padding="lg">
    <h3 className="text-lg font-semibold mb-4">Tax Information</h3>
    <div className="space-y-2">
      <div>
        <p className="text-xs text-gray-500">National ID</p>
        <p className="font-mono">{worker.taxInfo.nationalId}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Standard Deduction</p>
        <p>SRD {worker.taxInfo.standardDeduction}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500">Dependents</p>
        <p>{worker.taxInfo.dependents}</p>
      </div>
    </div>
  </Card>
</div>
```

#### 4. YTD Summary Section
```typescript
<Card variant="outlined" padding="lg" className="mt-6">
  <h3 className="text-lg font-semibold mb-4">
    Year-to-Date Summary (2025)
  </h3>
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
    <div>
      <p className="text-xs text-gray-500 uppercase">Gross Pay</p>
      <p className="text-xl font-bold financial-value">
        SRD {ytd.grossPay.toLocaleString()}
      </p>
    </div>
    <div>
      <p className="text-xs text-gray-500 uppercase">Wage Tax</p>
      <p className="text-xl font-bold financial-value financial-negative">
        SRD {ytd.wageTax.toLocaleString()}
      </p>
    </div>
    <div>
      <p className="text-xs text-gray-500 uppercase">AOV</p>
      <p className="text-xl font-bold financial-value financial-negative">
        SRD {ytd.aov.toLocaleString()}
      </p>
    </div>
    <div>
      <p className="text-xs text-gray-500 uppercase">AWW</p>
      <p className="text-xl font-bold financial-value financial-negative">
        SRD {ytd.aww.toLocaleString()}
      </p>
    </div>
    <div>
      <p className="text-xs text-gray-500 uppercase">Net Pay</p>
      <p className="text-xl font-bold financial-value financial-positive">
        SRD {ytd.netPay.toLocaleString()}
      </p>
    </div>
  </div>
</Card>
```

---

## 💳 Screen 4: Payroll Runs

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Payroll Runs                            [+ Create Run]   │
│ Process and manage payroll runs                          │
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐  ┌─────────┐  ┌─────────┐                  │
│ │All Runs │  │ Active  │  │Completed│                   │
│ └─────────┘  └─────────┘  └─────────┘                  │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Run #2025-11              Status: [Ready to Process]│ │
│ │ Pay Period: Nov 1-15, 2025                          │ │
│ │ Payment Date: Nov 15, 2025                          │ │
│ │                                                     │ │
│ │ 42 employees  |  SRD 210,000 total  |  [Process]  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Run #2025-10              Status: [✓ Completed]     │ │
│ │ Pay Period: Oct 16-31, 2025                         │ │
│ │ Payment Date: Oct 31, 2025                          │ │
│ │                                                     │ │
│ │ 40 employees  |  SRD 205,000 paid   |  [View]     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Run #2025-09              Status: [✓ Completed]     │ │
│ │ Pay Period: Oct 1-15, 2025                          │ │
│ │ Payment Date: Oct 15, 2025                          │ │
│ │                                                     │ │
│ │ 38 employees  |  SRD 198,500 paid   |  [View]     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Payroll Run Card
```typescript
<Card 
  variant={run.status === 'ready' ? 'elevated' : 'default'} 
  padding="lg"
  className={run.status === 'ready' ? 'border-blue-300' : ''}
>
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-xl font-bold">{run.runNumber}</h3>
      <p className="text-sm text-gray-600">
        Pay Period: {formatDateRange(run.payPeriodStart, run.payPeriodEnd)}
      </p>
      <p className="text-sm text-gray-600">
        Payment Date: {formatDate(run.paymentDate)}
      </p>
    </div>
    <StatusBadge status={run.status} size="lg" />
  </div>
  
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-6">
      <div>
        <p className="text-xs text-gray-500">Employees</p>
        <p className="text-lg font-semibold">{run.employeeCount}</p>
      </div>
      <div className="h-10 w-px bg-gray-300" />
      <div>
        <p className="text-xs text-gray-500">Total Amount</p>
        <p className="text-lg font-semibold financial-value">
          SRD {run.totalAmount.toLocaleString()}
        </p>
      </div>
    </div>
    
    <div className="flex space-x-2">
      {run.status === 'ready' && (
        <Button variant="primary" onClick={() => processRun(run.id)}>
          Process Run
        </Button>
      )}
      <Button variant="outline" onClick={() => viewRun(run.id)}>
        {run.status === 'completed' ? 'View Details' : 'Review'}
      </Button>
    </div>
  </div>
</Card>
```

---

## ⏰ Screen 5: Time Entries

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Time & Attendance                                        │
│ Review and approve time entries                          │
├─────────────────────────────────────────────────────────┤
│ [Pending (12)] [Approved] [Rejected]                     │
├─────────────────────────────────────────────────────────┤
│ ┌──────┐  Week of Nov 4-10, 2025          [Approve All] │
│ │< > │  Filter: [All Employees ▾]                      │
│ └──────┘                                                 │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐│
│ │ □ John Doe (SR-001)                    Mon, Nov 4    ││
│ │   In: 08:00 AM  |  Out: 05:00 PM                     ││
│ │   Regular: 8.0 hrs  |  Break: 1.0 hr                 ││
│ │   [✓ Approve] [✗ Reject] [Details]                   ││
│ ├──────────────────────────────────────────────────────┤│
│ │ □ Jane Smith (SR-002)                  Mon, Nov 4    ││
│ │   In: 07:30 AM  |  Out: 06:00 PM                     ││
│ │   Regular: 8.0 hrs  |  Overtime: 1.5 hrs             ││
│ │   [✓ Approve] [✗ Reject] [Details]                   ││
│ ├──────────────────────────────────────────────────────┤│
│ │ □ Bob Wilson (SR-003)                  Mon, Nov 4    ││
│ │   Missing clock-out ⚠️                                ││
│ │   In: 08:15 AM  |  Out: --:-- --                     ││
│ │   [Edit] [Contact Employee]                          ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ [□ 3 selected]  [✓ Bulk Approve]  [✗ Bulk Reject]      │
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Time Entry Card
```typescript
<Card variant="default" padding="md" className="mb-3">
  <div className="flex items-start space-x-4">
    <input 
      type="checkbox" 
      checked={isSelected}
      onChange={handleSelect}
      className="mt-1"
    />
    
    <div className="flex-1">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-semibold">{entry.employeeName}</h4>
          <p className="text-sm text-gray-500">
            {entry.employeeNumber} • {formatDate(entry.date)}
          </p>
        </div>
        {entry.hasIssue && (
          <Badge variant="warning">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Issue
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Clock In</p>
          <p className="font-medium">{entry.clockIn || '--:--'}</p>
        </div>
        <div>
          <p className="text-gray-500">Clock Out</p>
          <p className="font-medium">{entry.clockOut || '--:--'}</p>
        </div>
        <div>
          <p className="text-gray-500">Regular Hours</p>
          <p className="font-medium">{entry.regularHours} hrs</p>
        </div>
        {entry.overtimeHours > 0 && (
          <div>
            <p className="text-gray-500">Overtime</p>
            <p className="font-medium text-orange-600">
              {entry.overtimeHours} hrs
            </p>
          </div>
        )}
      </div>
      
      <div className="flex space-x-2 mt-3">
        <Button 
          variant="primary" 
          size="sm"
          onClick={() => approveEntry(entry.id)}
        >
          <Check className="w-4 h-4 mr-1" />
          Approve
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => rejectEntry(entry.id)}
        >
          <X className="w-4 h-4 mr-1" />
          Reject
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => viewDetails(entry.id)}
        >
          Details
        </Button>
      </div>
    </div>
  </div>
</Card>
```

---

## 📊 Screen 6: Reports Dashboard

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Reports                                                  │
│ Generate payroll reports and analytics                   │
├─────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│ │  Payroll   │ │    Tax     │ │   Time &   │           │
│ │  Summary   │ │  Summary   │ │ Attendance │           │
│ │            │ │            │ │            │           │
│ │ [Generate] │ │ [Generate] │ │ [Generate] │           │
│ └────────────┘ └────────────┘ └────────────┘           │
│                                                          │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│ │   Worker   │ │ Deductions │ │   Custom   │           │
│ │    Cost    │ │  Report    │ │   Report   │           │
│ │            │ │            │ │            │           │
│ │ [Generate] │ │ [Generate] │ │  [Create]  │           │
│ └────────────┘ └────────────┘ └────────────┘           │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Recent Reports                             [View All]    │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 📄 Payroll Summary - October 2025                    ││
│ │    Generated: Nov 1, 2025  |  [Download] [Email]    ││
│ ├──────────────────────────────────────────────────────┤│
│ │ 📄 Tax Summary Q3 2025                               ││
│ │    Generated: Oct 15, 2025  |  [Download] [Email]   ││
│ └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 📅 Screen 7: Scheduling Calendar

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Scheduling                               [Create Shift]  │
│ Manage employee schedules and shifts                     │
├─────────────────────────────────────────────────────────┤
│ ┌──────┐  Week of Nov 4-10, 2025     [Week][Month]      │
│ │< > │  Filter: [All Departments ▾]                    │
│ └──────┘                                                 │
│                                                          │
│ ┌───────┬──────┬──────┬──────┬──────┬──────┬──────┐    │
│ │Employee│ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │    │
│ ├───────┼──────┼──────┼──────┼──────┼──────┼──────┤    │
│ │John   │ 8-5 │ 8-5 │ 8-5 │ 8-5 │ 8-5 │ --- │    │
│ │Doe    │ Day │ Day │ Day │ Day │ Day │ OFF │    │
│ ├───────┼──────┼──────┼──────┼──────┼──────┼──────┤    │
│ │Jane   │ --- │ 9-6 │ 9-6 │ 9-6 │ 9-6 │ 9-1 │    │
│ │Smith  │ OFF │ Day │ Day │ Day │ Day │ Half│    │
│ ├───────┼──────┼──────┼──────┼──────┼──────┼──────┤    │
│ │Bob    │10-7 │10-7 │10-7 │10-7 │10-7 │ --- │    │
│ │Wilson │Night│Night│Night│Night│Night│ OFF │    │
│ └───────┴──────┴──────┴──────┴──────┴──────┴──────┘    │
│                                                          │
│ Legend: [Day Shift] [Night Shift] [Half Day] [OFF]      │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Component Library Reference

### Components Needed from @recruitiq/ui
- `Button` (primary, secondary, outline, ghost, danger variants)
- `Card` (default, outlined, elevated variants)
- `Input` (search, with icons)
- `Modal` (for forms and dialogs)

### Custom Paylinq Components to Build
1. **DashboardSummaryCard** - Metric card with trend indicator
2. **PayrollTimeline** - Visual timeline of payroll runs
3. **WorkerTable** - Advanced data table with sorting/filtering
4. **WorkerAvatar** - Avatar with initials
5. **StatusBadge** - Color-coded status indicators
6. **PayrollRunCard** - Card displaying run details
7. **TimeEntryCard** - Expandable time entry with actions
8. **Pagination** - Page navigation component
9. **DropdownMenu** - Actions dropdown
10. **Tabs** - Tab navigation for detail views
11. **Badge** - Small label/tag component
12. **DateRangePicker** - Date selection for reports
13. **CurrencyDisplay** - Formatted SRD currency
14. **ScheduleGrid** - Weekly schedule visualization

---

**Document Version:** 1.0  
**Status:** Ready for Implementation  
**Next Step:** Build components in Task 7
