// Mock data for Paylinq application
// Surinamese payroll context (SRD currency, local banks, AOV/AWW)

export interface Worker {
  id: string;
  employeeNumber: string;
  fullName: string;
  initials: string;
  email: string;
  nationalId: string;
  workerType: 'Full-Time' | 'Part-Time' | 'Contract' | 'Hourly';
  compensation: number; // SRD
  currency: 'SRD' | 'USD';
  salaryIncrease?: boolean;
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
  hireDate: string;
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountLast4: string;
    accountType: 'savings' | 'checking';
    currency: 'SRD' | 'USD';
  };
  taxInfo: {
    nationalId: string;
    standardDeduction: number; // SRD 250 default
    dependents: number;
    aovEnrolled: boolean;
    awwEnrolled: boolean;
  };
  deductions: Array<{
    id: string;
    name: string;
    amount: number;
    type: 'pre-tax' | 'post-tax';
  }>;
}

export interface PayrollRun {
  id: string;
  runNumber: string;
  runName: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate: string;
  runType: 'regular' | 'off-cycle' | 'bonus' | 'correction' | 'final';
  status: 'draft' | 'ready' | 'processing' | 'completed' | 'cancelled';
  employeeCount: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalWageTax: number;
  totalAOV: number;
  totalAWW: number;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  regularHours: number;
  overtimeHours: number;
  breakHours: number;
  status: 'pending' | 'approved' | 'rejected';
  hasIssue: boolean;
  notes?: string;
}

// Mock Workers Data
export const mockWorkers: Worker[] = [
  {
    id: '1',
    employeeNumber: 'SR-001',
    fullName: 'John Doe',
    initials: 'JD',
    email: 'john.doe@company.sr',
    nationalId: '1234567890',
    workerType: 'Full-Time',
    compensation: 5000,
    currency: 'SRD',
    salaryIncrease: true,
    status: 'active',
    hireDate: '2024-01-15',
    bankInfo: {
      bankName: 'DSB Bank',
      accountNumber: '1234567890',
      accountLast4: '7890',
      accountType: 'savings',
      currency: 'SRD',
    },
    taxInfo: {
      nationalId: '1234567890',
      standardDeduction: 250,
      dependents: 2,
      aovEnrolled: true,
      awwEnrolled: true,
    },
    deductions: [
      { id: '1', name: 'AOV (4%)', amount: 200, type: 'pre-tax' },
      { id: '2', name: 'AWW', amount: 50, type: 'pre-tax' },
      { id: '3', name: 'Pension Fund', amount: 150, type: 'pre-tax' },
      { id: '4', name: 'Health Insurance', amount: 100, type: 'post-tax' },
    ],
  },
  {
    id: '2',
    employeeNumber: 'SR-002',
    fullName: 'Jane Smith',
    initials: 'JS',
    email: 'jane.smith@company.sr',
    nationalId: '0987654321',
    workerType: 'Part-Time',
    compensation: 3500,
    currency: 'SRD',
    status: 'active',
    hireDate: '2024-03-01',
    bankInfo: {
      bankName: 'Hakrinbank',
      accountNumber: '2345678901',
      accountLast4: '8901',
      accountType: 'checking',
      currency: 'SRD',
    },
    taxInfo: {
      nationalId: '0987654321',
      standardDeduction: 250,
      dependents: 0,
      aovEnrolled: true,
      awwEnrolled: true,
    },
    deductions: [
      { id: '1', name: 'AOV (4%)', amount: 140, type: 'pre-tax' },
      { id: '2', name: 'AWW', amount: 35, type: 'pre-tax' },
    ],
  },
  {
    id: '3',
    employeeNumber: 'SR-003',
    fullName: 'Bob Wilson',
    initials: 'BW',
    email: 'bob.wilson@company.sr',
    nationalId: '1122334455',
    workerType: 'Contract',
    compensation: 120, // per hour
    currency: 'USD',
    status: 'active',
    hireDate: '2024-06-01',
    bankInfo: {
      bankName: 'RBC Suriname',
      accountNumber: '3456789012',
      accountLast4: '9012',
      accountType: 'savings',
      currency: 'USD',
    },
    taxInfo: {
      nationalId: '1122334455',
      standardDeduction: 250,
      dependents: 1,
      aovEnrolled: false,
      awwEnrolled: false,
    },
    deductions: [],
  },
  {
    id: '4',
    employeeNumber: 'SR-004',
    fullName: 'Ana Garcia',
    initials: 'AG',
    email: 'ana.garcia@company.sr',
    nationalId: '5544332211',
    workerType: 'Full-Time',
    compensation: 6200,
    currency: 'SRD',
    salaryIncrease: true,
    status: 'active',
    hireDate: '2023-09-15',
    bankInfo: {
      bankName: 'FINA Bank',
      accountNumber: '4567890123',
      accountLast4: '0123',
      accountType: 'savings',
      currency: 'SRD',
    },
    taxInfo: {
      nationalId: '5544332211',
      standardDeduction: 250,
      dependents: 3,
      aovEnrolled: true,
      awwEnrolled: true,
    },
    deductions: [
      { id: '1', name: 'AOV (4%)', amount: 248, type: 'pre-tax' },
      { id: '2', name: 'AWW', amount: 62, type: 'pre-tax' },
      { id: '3', name: 'Pension Fund', amount: 186, type: 'pre-tax' },
    ],
  },
  {
    id: '5',
    employeeNumber: 'SR-005',
    fullName: 'Carlos Rodriguez',
    initials: 'CR',
    email: 'carlos.rodriguez@company.sr',
    nationalId: '6677889900',
    workerType: 'Full-Time',
    compensation: 4500,
    currency: 'SRD',
    status: 'active',
    hireDate: '2024-02-20',
    bankInfo: {
      bankName: 'Finabank',
      accountNumber: '5678901234',
      accountLast4: '1234',
      accountType: 'checking',
      currency: 'SRD',
    },
    taxInfo: {
      nationalId: '6677889900',
      standardDeduction: 250,
      dependents: 1,
      aovEnrolled: true,
      awwEnrolled: true,
    },
    deductions: [
      { id: '1', name: 'AOV (4%)', amount: 180, type: 'pre-tax' },
      { id: '2', name: 'AWW', amount: 45, type: 'pre-tax' },
    ],
  },
];

// Mock Payroll Runs
export const mockPayrollRuns: PayrollRun[] = [
  {
    id: '1',
    runNumber: '2025-11',
    runName: 'November 2025 - Period 1',
    payPeriodStart: '2025-11-01',
    payPeriodEnd: '2025-11-15',
    paymentDate: '2025-11-15',
    runType: 'regular',
    status: 'ready',
    employeeCount: 42,
    totalGrossPay: 210000,
    totalNetPay: 175350,
    totalWageTax: 18270,
    totalAOV: 8400,
    totalAWW: 2100,
  },
  {
    id: '2',
    runNumber: '2025-10',
    runName: 'October 2025 - Period 2',
    payPeriodStart: '2025-10-16',
    payPeriodEnd: '2025-10-31',
    paymentDate: '2025-10-31',
    runType: 'regular',
    status: 'completed',
    employeeCount: 40,
    totalGrossPay: 205000,
    totalNetPay: 171175,
    totalWageTax: 17835,
    totalAOV: 8200,
    totalAWW: 2050,
  },
  {
    id: '3',
    runNumber: '2025-09',
    runName: 'October 2025 - Period 1',
    payPeriodStart: '2025-10-01',
    payPeriodEnd: '2025-10-15',
    paymentDate: '2025-10-15',
    runType: 'regular',
    status: 'completed',
    employeeCount: 38,
    totalGrossPay: 198500,
    totalNetPay: 165762,
    totalWageTax: 17270,
    totalAOV: 7940,
    totalAWW: 1985,
  },
  {
    id: '4',
    runNumber: '2025-BONUS-01',
    runName: '13th Month Bonus 2025',
    payPeriodStart: '2025-12-01',
    payPeriodEnd: '2025-12-31',
    paymentDate: '2025-12-20',
    runType: 'bonus',
    status: 'draft',
    employeeCount: 42,
    totalGrossPay: 210000,
    totalNetPay: 189000,
    totalWageTax: 21000,
    totalAOV: 0,
    totalAWW: 0,
  },
];

// Mock Time Entries
export const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'John Doe',
    employeeNumber: 'SR-001',
    date: '2025-11-04',
    clockIn: '08:00',
    clockOut: '17:00',
    regularHours: 8.0,
    overtimeHours: 0,
    breakHours: 1.0,
    status: 'pending',
    hasIssue: false,
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: 'Jane Smith',
    employeeNumber: 'SR-002',
    date: '2025-11-04',
    clockIn: '07:30',
    clockOut: '18:00',
    regularHours: 8.0,
    overtimeHours: 1.5,
    breakHours: 1.0,
    status: 'pending',
    hasIssue: false,
  },
  {
    id: '3',
    employeeId: '3',
    employeeName: 'Bob Wilson',
    employeeNumber: 'SR-003',
    date: '2025-11-04',
    clockIn: '08:15',
    clockOut: undefined,
    regularHours: 0,
    overtimeHours: 0,
    breakHours: 0,
    status: 'pending',
    hasIssue: true,
    notes: 'Missing clock-out time',
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: 'Ana Garcia',
    employeeNumber: 'SR-004',
    date: '2025-11-04',
    clockIn: '08:00',
    clockOut: '17:00',
    regularHours: 8.0,
    overtimeHours: 0,
    breakHours: 1.0,
    status: 'pending',
    hasIssue: false,
  },
  {
    id: '5',
    employeeId: '5',
    employeeName: 'Carlos Rodriguez',
    employeeNumber: 'SR-005',
    date: '2025-11-04',
    clockIn: '09:00',
    clockOut: '18:30',
    regularHours: 8.0,
    overtimeHours: 0.5,
    breakHours: 1.0,
    status: 'pending',
    hasIssue: false,
  },
];

// Dashboard Summary Data
export const mockDashboardData = {
  summary: {
    totalWorkers: 42,
    workersTrend: 3, // +3 this month
    nextPayrollDate: '2025-11-15',
    daysUntilPayroll: 11,
    pendingApprovals: 8,
    monthlyCost: 210000, // SRD
    costTrend: 2.4, // +2.4%
  },
  upcomingRuns: [
    { id: '1', date: '2025-11-15', status: 'ready' as const },
    { id: '2', date: '2025-11-30', status: 'scheduled' as const },
    { id: '3', date: '2025-12-15', status: 'scheduled' as const },
  ],
  pendingApprovals: [
    { type: 'time entries', count: 12, urgency: 'high' as const },
    { type: 'schedule change requests', count: 3, urgency: 'medium' as const },
    { type: 'payroll adjustments', count: 2, urgency: 'low' as const },
  ],
  recentActivity: [
    { description: 'John Doe added to payroll', timestamp: '2 hours ago', link: '/workers/1' },
    { description: 'Payroll Run #2025-10 completed', timestamp: '5 hours ago', link: '/payroll/2' },
    { description: 'Tax rules updated for 2025', timestamp: '1 day ago', link: '/tax-rules' },
    { description: 'Jane Smith compensation updated', timestamp: '2 days ago', link: '/workers/2' },
    { description: 'Time entries approved (15)', timestamp: '3 days ago', link: '/time-entries' },
  ],
};

// YTD Summary for Worker Details
export const mockYTDSummary = {
  '1': {
    // John Doe
    grossPay: 55000,
    wageTax: 4785,
    aov: 2200,
    aww: 550,
    otherDeductions: 1100,
    netPay: 46365,
  },
  '2': {
    // Jane Smith
    grossPay: 38500,
    wageTax: 2887,
    aov: 1540,
    aww: 385,
    otherDeductions: 0,
    netPay: 33688,
  },
};

// Surinamese Banks
export const surinameseBanks = [
  'DSB Bank',
  'Hakrinbank',
  'RBC Suriname',
  'FINA Bank',
  'Finabank',
  'Republic Bank Suriname',
  'Landbouwbank',
];

// Worker Types
export const workerTypes = [
  { value: 'Full-Time', label: 'Full-Time Salaried' },
  { value: 'Part-Time', label: 'Part-Time' },
  { value: 'Contract', label: 'Contract Worker' },
  { value: 'Hourly', label: 'Hourly Worker' },
];

// Status Options
export const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'terminated', label: 'Terminated' },
];
