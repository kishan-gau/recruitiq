# Phase 2: Core Module Migration

**Part of:** [Frontend Consolidation Plan](../FRONTEND_CONSOLIDATION_PLAN.md)  
**Prerequisites:** [Phase 1: Foundation & Infrastructure](./PHASE_1_FOUNDATION.md)  
**Timeline:** Week 3-5 (3 weeks)  
**Effort:** 120-180 hours  
**Team:** 3-4 developers  

---

## Overview

Phase 2 focuses on migrating the core modules from three separate applications (Nexus, PayLinQ, RecruitIQ) into the unified application structure established in Phase 1. This includes route migration, component consolidation, and service integration while maintaining feature parity.

## Goals

### Primary Objectives
- ✅ Migrate all core routes from existing applications
- ✅ Consolidate and optimize shared components  
- ✅ Integrate existing services with unified API client
- ✅ Establish feature toggle system for gradual rollout
- ✅ Maintain 100% feature parity with existing apps

### Success Criteria
- All existing routes accessible in unified app
- No functionality regression
- Improved component reusability (60%+ shared components)
- Consolidated service layer with type safety
- Performance equal or better than existing apps

---

## Technical Architecture

### Module Migration Strategy

```
Source Applications → Unified App Structure

apps/nexus/src/
├── pages/           → apps/unified/src/modules/nexus/pages/
├── components/      → apps/unified/src/modules/nexus/components/ + shared/
├── services/        → apps/unified/src/services/ (consolidated)
└── hooks/           → apps/unified/src/hooks/ (consolidated)

apps/paylinq/src/
├── pages/           → apps/unified/src/modules/paylinq/pages/
├── components/      → apps/unified/src/modules/paylinq/components/ + shared/
├── services/        → apps/unified/src/services/ (consolidated)
└── hooks/           → apps/unified/src/hooks/ (consolidated)

apps/recruitiq/src/
├── pages/           → apps/unified/src/modules/recruitiq/pages/
├── components/      → apps/unified/src/modules/recruitiq/components/ + shared/
├── services/        → apps/unified/src/services/ (consolidated)
└── hooks/           → apps/unified/src/hooks/ (consolidated)
```

### Route Migration Matrix

| Product | Routes Count | Priority | Complexity | Migration Order |
|---------|-------------|----------|------------|-----------------|
| **Nexus** | ~85 routes | High | Medium | Week 1 |
| **PayLinQ** | ~45 routes | High | High | Week 2 |
| **RecruitIQ** | ~30 routes | Medium | Low | Week 3 |

---

## Week-by-Week Breakdown

### Week 1: Nexus Module Migration

#### Day 1-2: Route Analysis & Planning
```typescript
// Target route structure for Nexus
const nexusRoutes = {
  '/nexus/dashboard': 'modules/nexus/pages/Dashboard.tsx',
  '/nexus/employees': 'modules/nexus/pages/employees/EmployeeList.tsx',
  '/nexus/employees/new': 'modules/nexus/pages/employees/CreateEmployee.tsx',
  '/nexus/employees/:id': 'modules/nexus/pages/employees/EmployeeDetail.tsx',
  '/nexus/employees/:id/edit': 'modules/nexus/pages/employees/EditEmployee.tsx',
  '/nexus/departments': 'modules/nexus/pages/departments/DepartmentList.tsx',
  '/nexus/locations': 'modules/nexus/pages/locations/LocationList.tsx',
  '/nexus/attendance': 'modules/nexus/pages/attendance/AttendanceTracking.tsx',
  '/nexus/time-off': 'modules/nexus/pages/time-off/TimeOffManagement.tsx',
  '/nexus/performance': 'modules/nexus/pages/performance/PerformanceReviews.tsx',
  '/nexus/benefits': 'modules/nexus/pages/benefits/BenefitsManagement.tsx',
  '/nexus/documents': 'modules/nexus/pages/documents/DocumentManagement.tsx',
  '/nexus/contracts': 'modules/nexus/pages/contracts/ContractManagement.tsx'
};
```

**Day 1 Tasks:**
- [ ] Analyze existing Nexus routes and components
- [ ] Create route mapping document
- [ ] Identify shared vs. product-specific components
- [ ] Plan component consolidation strategy

**Day 2 Tasks:**
- [ ] Set up Nexus module directory structure
- [ ] Create initial route definitions
- [ ] Set up basic layout components
- [ ] Configure module-specific navigation

#### Day 3-5: Core Page Migration

**Employee Management Migration:**
```typescript
// apps/unified/src/modules/nexus/pages/employees/EmployeeList.tsx
import React from 'react';
import { useEmployees } from '@/hooks/useEmployees';
import { EmployeeCard } from '@/modules/nexus/components/EmployeeCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export function EmployeeList() {
  const { data: employees, isLoading, error } = useEmployees();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Employees" 
        subtitle="Manage your workforce"
        actions={[
          { label: 'Add Employee', href: '/nexus/employees/new', variant: 'primary' }
        ]}
      />
      
      <div className="grid gap-4">
        {employees?.map(employee => (
          <EmployeeCard key={employee.id} employee={employee} />
        ))}
      </div>
    </div>
  );
}
```

**Day 3 Tasks:**
- [ ] Migrate Employee List page
- [ ] Migrate Employee Detail page  
- [ ] Migrate Create Employee page
- [ ] Test employee management flow

**Day 4 Tasks:**
- [ ] Migrate Department pages
- [ ] Migrate Location pages
- [ ] Set up department/location navigation
- [ ] Test organizational structure features

**Day 5 Tasks:**
- [ ] Migrate Attendance Tracking
- [ ] Migrate Time-off Management
- [ ] Set up time tracking components
- [ ] Test attendance workflows

#### Day 6-7: Service Integration & Component Consolidation

**Service Integration:**
```typescript
// apps/unified/src/services/employees.service.ts
import { NexusClient, APIClient } from '@recruitiq/api-client';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from '@/types';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const employeesService = {
  async listEmployees(filters?: any): Promise<Employee[]> {
    const response = await nexusClient.listEmployees(filters);
    return response.data.employees || response.data;
  },

  async getEmployee(id: string): Promise<Employee> {
    const response = await nexusClient.getEmployee(id);
    return response.data.employee || response.data;
  },

  async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    const response = await nexusClient.createEmployee(data);
    return response.data.employee || response.data;
  },

  async updateEmployee(id: string, updates: UpdateEmployeeRequest): Promise<Employee> {
    const response = await nexusClient.updateEmployee(id, updates);
    return response.data.employee || response.data;
  },

  async terminateEmployee(id: string, data: any): Promise<void> {
    await nexusClient.terminateEmployee(id, data);
  }
};
```

**Component Consolidation:**
```typescript
// apps/unified/src/components/shared/DataTable/DataTable.tsx
import React from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ data, columns, loading, onRowClick }: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  if (loading) {
    return <TableSkeleton />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map(row => (
            <tr 
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Day 6 Tasks:**
- [ ] Consolidate data table components
- [ ] Merge form components (employee forms, etc.)
- [ ] Integrate services with React Query
- [ ] Set up error boundaries

**Day 7 Tasks:**
- [ ] Performance testing for Nexus module
- [ ] Fix any migration issues
- [ ] Complete Nexus module documentation
- [ ] Week 1 review and validation

### Week 2: PayLinQ Module Migration

#### Day 8-9: PayLinQ Route Analysis & Setup

**PayLinQ Route Structure:**
```typescript
const paylinqRoutes = {
  '/paylinq/dashboard': 'modules/paylinq/pages/Dashboard.tsx',
  '/paylinq/payroll-runs': 'modules/paylinq/pages/payroll/PayrollRunList.tsx',
  '/paylinq/payroll-runs/new': 'modules/paylinq/pages/payroll/CreatePayrollRun.tsx',
  '/paylinq/payroll-runs/:id': 'modules/paylinq/pages/payroll/PayrollRunDetail.tsx',
  '/paylinq/worker-types': 'modules/paylinq/pages/worker-types/WorkerTypeList.tsx',
  '/paylinq/allowances': 'modules/paylinq/pages/allowances/AllowanceList.tsx',
  '/paylinq/deductions': 'modules/paylinq/pages/deductions/DeductionList.tsx',
  '/paylinq/tax-calculations': 'modules/paylinq/pages/tax/TaxCalculations.tsx',
  '/paylinq/compliance': 'modules/paylinq/pages/compliance/ComplianceReporting.tsx',
  '/paylinq/reports': 'modules/paylinq/pages/reports/PayrollReports.tsx'
};
```

**Complex PayLinQ Components:**
```typescript
// apps/unified/src/modules/paylinq/components/PayrollRunWizard.tsx
import React, { useState } from 'react';
import { Steps } from '@/components/shared/Steps';
import { PayrollRunBasicInfo } from './PayrollRunBasicInfo';
import { PayrollRunEmployees } from './PayrollRunEmployees';
import { PayrollRunCalculations } from './PayrollRunCalculations';
import { PayrollRunReview } from './PayrollRunReview';

interface PayrollRunWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export function PayrollRunWizard({ onComplete, onCancel }: PayrollRunWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [payrollData, setPayrollData] = useState({});

  const steps = [
    { title: 'Basic Information', component: PayrollRunBasicInfo },
    { title: 'Select Employees', component: PayrollRunEmployees },
    { title: 'Calculations', component: PayrollRunCalculations },
    { title: 'Review & Submit', component: PayrollRunReview }
  ];

  const handleNext = (stepData: any) => {
    setPayrollData(prev => ({ ...prev, ...stepData }));
    if (currentStep === steps.length - 1) {
      onComplete({ ...payrollData, ...stepData });
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="max-w-4xl mx-auto">
      <Steps 
        steps={steps.map(s => s.title)}
        currentStep={currentStep}
        className="mb-8"
      />
      
      <CurrentStepComponent
        data={payrollData}
        onNext={handleNext}
        onBack={currentStep > 0 ? handleBack : undefined}
        onCancel={onCancel}
      />
    </div>
  );
}
```

**Day 8 Tasks:**
- [ ] Analyze PayLinQ complexity (high due to financial calculations)
- [ ] Create PayLinQ module structure
- [ ] Set up payroll-specific routing
- [ ] Plan wizard component migration strategy

**Day 9 Tasks:**
- [ ] Migrate Dashboard page
- [ ] Set up PayLinQ navigation structure
- [ ] Create basic payroll layouts
- [ ] Test PayLinQ module loading

#### Day 10-12: Core Payroll Feature Migration

**Advanced Payroll Calculations:**
```typescript
// apps/unified/src/modules/paylinq/hooks/usePayrollCalculations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService } from '@/services/payroll.service';
import { toast } from '@/hooks/useToast';

export function usePayrollCalculations(payrollRunId: string) {
  const queryClient = useQueryClient();

  const { data: calculations, isLoading } = useQuery({
    queryKey: ['payroll-calculations', payrollRunId],
    queryFn: () => payrollService.getCalculations(payrollRunId),
    enabled: !!payrollRunId
  });

  const recalculateMutation = useMutation({
    mutationFn: (params: any) => payrollService.recalculate(payrollRunId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-calculations', payrollRunId] });
      toast.success('Payroll recalculated successfully');
    },
    onError: (error: any) => {
      toast.error(`Calculation failed: ${error.message}`);
    }
  });

  const approveCalculationsMutation = useMutation({
    mutationFn: () => payrollService.approveCalculations(payrollRunId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      toast.success('Calculations approved');
    }
  });

  return {
    calculations,
    isLoading,
    recalculate: recalculateMutation.mutate,
    isRecalculating: recalculateMutation.isPending,
    approveCalculations: approveCalculationsMutation.mutate,
    isApproving: approveCalculationsMutation.isPending
  };
}
```

**Day 10 Tasks:**
- [ ] Migrate Payroll Run List and Detail pages
- [ ] Implement PayrollRunWizard component
- [ ] Set up payroll calculation hooks
- [ ] Test basic payroll workflows

**Day 11 Tasks:**
- [ ] Migrate Worker Types management
- [ ] Migrate Allowances and Deductions  
- [ ] Set up complex form validation
- [ ] Test financial calculation accuracy

**Day 12 Tasks:**
- [ ] Migrate Tax Calculations module
- [ ] Migrate Compliance Reporting
- [ ] Set up regulatory compliance features
- [ ] Test tax calculation workflows

#### Day 13-14: PayLinQ Service Integration & Testing

**Complex Service Integration:**
```typescript
// apps/unified/src/services/payroll.service.ts
import { PayLinQClient, APIClient } from '@recruitiq/api-client';
import { PayrollRun, PayrollCalculation, WorkerType } from '@/types';

const apiClient = new APIClient();
const paylinqClient = new PayLinQClient(apiClient);

export const payrollService = {
  // Payroll Run Management
  async listPayrollRuns(filters?: any): Promise<PayrollRun[]> {
    const response = await paylinqClient.listPayrollRuns(filters);
    return response.data.payrollRuns || response.data;
  },

  async createPayrollRun(data: any): Promise<PayrollRun> {
    const response = await paylinqClient.createPayrollRun(data);
    return response.data.payrollRun || response.data;
  },

  async getPayrollRun(id: string): Promise<PayrollRun> {
    const response = await paylinqClient.getPayrollRun(id);
    return response.data.payrollRun || response.data;
  },

  // Advanced Calculations
  async getCalculations(payrollRunId: string): Promise<PayrollCalculation[]> {
    const response = await paylinqClient.getPayrollCalculations(payrollRunId);
    return response.data.calculations || response.data;
  },

  async recalculate(payrollRunId: string, params: any): Promise<PayrollCalculation[]> {
    const response = await paylinqClient.recalculatePayroll(payrollRunId, params);
    return response.data.calculations || response.data;
  },

  async approveCalculations(payrollRunId: string): Promise<void> {
    await paylinqClient.approvePayrollCalculations(payrollRunId);
  },

  // Worker Types
  async listWorkerTypes(): Promise<WorkerType[]> {
    const response = await paylinqClient.listWorkerTypes();
    return response.data.workerTypes || response.data;
  },

  async createWorkerType(data: any): Promise<WorkerType> {
    const response = await paylinqClient.createWorkerType(data);
    return response.data.workerType || response.data;
  }
};
```

**Day 13 Tasks:**
- [ ] Complete PayLinQ service integration
- [ ] Set up complex React Query patterns
- [ ] Implement error handling for financial operations
- [ ] Test service reliability

**Day 14 Tasks:**
- [ ] PayLinQ module performance testing
- [ ] Fix any calculation or integration issues
- [ ] Complete PayLinQ documentation
- [ ] Week 2 review and validation

### Week 3: RecruitIQ Module Migration

#### Day 15-16: RecruitIQ Migration (Lower Complexity)

**RecruitIQ Route Structure:**
```typescript
const recruitiqRoutes = {
  '/recruitiq/dashboard': 'modules/recruitiq/pages/Dashboard.tsx',
  '/recruitiq/jobs': 'modules/recruitiq/pages/jobs/JobList.tsx',
  '/recruitiq/jobs/new': 'modules/recruitiq/pages/jobs/CreateJob.tsx',
  '/recruitiq/jobs/:id': 'modules/recruitiq/pages/jobs/JobDetail.tsx',
  '/recruitiq/candidates': 'modules/recruitiq/pages/candidates/CandidateList.tsx',
  '/recruitiq/candidates/:id': 'modules/recruitiq/pages/candidates/CandidateProfile.tsx',
  '/recruitiq/applications': 'modules/recruitiq/pages/applications/ApplicationList.tsx',
  '/recruitiq/interviews': 'modules/recruitiq/pages/interviews/InterviewScheduling.tsx',
  '/recruitiq/reports': 'modules/recruitiq/pages/reports/RecruitmentReports.tsx'
};
```

**Streamlined Migration:**
```typescript
// apps/unified/src/modules/recruitiq/pages/jobs/JobList.tsx
import React from 'react';
import { useJobs } from '@/hooks/useJobs';
import { JobCard } from '@/modules/recruitiq/components/JobCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchAndFilter } from '@/components/shared/SearchAndFilter';

export function JobList() {
  const [filters, setFilters] = useState({});
  const { data: jobs, isLoading } = useJobs(filters);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Job Postings" 
        subtitle="Manage open positions"
        actions={[
          { label: 'Create Job', href: '/recruitiq/jobs/new', variant: 'primary' }
        ]}
      />
      
      <SearchAndFilter
        onFiltersChange={setFilters}
        filterOptions={jobFilterOptions}
      />
      
      <div className="grid gap-4">
        {jobs?.map(job => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
```

**Day 15 Tasks:**
- [ ] Migrate all RecruitIQ pages (simpler than PayLinQ)
- [ ] Set up recruitment workflows
- [ ] Integrate candidate management
- [ ] Test job posting features

**Day 16 Tasks:**
- [ ] Migrate interview scheduling
- [ ] Set up application tracking
- [ ] Integrate recruitment reports
- [ ] Complete RecruitIQ migration

#### Day 17-19: Cross-Module Integration & Feature Toggles

**Feature Toggle System:**
```typescript
// apps/unified/src/config/features.ts
interface FeatureFlags {
  modules: {
    nexus: boolean;
    paylinq: boolean;
    recruitiq: boolean;
    schedulehub: boolean;
  };
  features: {
    advancedReporting: boolean;
    bulkOperations: boolean;
    apiIntegrations: boolean;
    mobileOptimization: boolean;
  };
}

export const useFeatureFlags = (): FeatureFlags => {
  const { user } = useAuth();
  
  return {
    modules: {
      nexus: user.enabledProducts?.includes('nexus') ?? false,
      paylinq: user.enabledProducts?.includes('paylinq') ?? false,
      recruitiq: user.enabledProducts?.includes('recruitiq') ?? false,
      schedulehub: user.enabledProducts?.includes('schedulehub') ?? false
    },
    features: {
      advancedReporting: user.permissions?.includes('reports:advanced') ?? false,
      bulkOperations: user.permissions?.includes('bulk:operations') ?? false,
      apiIntegrations: user.permissions?.includes('api:integrations') ?? false,
      mobileOptimization: true // Always enabled
    }
  };
};
```

**Cross-Module Data Sharing:**
```typescript
// apps/unified/src/modules/shared/hooks/useEmployeeData.ts
import { useQuery } from '@tanstack/react-query';
import { employeesService } from '@/services/employees.service';

export function useEmployeeData(employeeId: string) {
  return useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeesService.getEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Shared across modules
    meta: {
      shared: true
    }
  });
}

// Usage in PayLinQ module
export function PayrollEmployeeSelector() {
  const { data: employee } = useEmployeeData(selectedEmployeeId);
  
  return (
    <div>
      <h3>Employee: {employee?.name}</h3>
      <p>Department: {employee?.department}</p>
      <p>Worker Type: {employee?.workerType}</p>
    </div>
  );
}
```

**Day 17 Tasks:**
- [ ] Implement feature toggle system
- [ ] Set up cross-module data sharing
- [ ] Create shared employee/user contexts
- [ ] Test module interoperability

**Day 18 Tasks:**
- [ ] Implement gradual rollout system
- [ ] Set up A/B testing framework
- [ ] Create migration status dashboard
- [ ] Test feature flag functionality

**Day 19 Tasks:**
- [ ] Complete cross-module integration
- [ ] Finalize shared component library
- [ ] Performance optimization pass
- [ ] Integration testing

#### Day 20-21: Phase 2 Validation & Handoff

**Validation Checklist:**
```typescript
// apps/unified/src/utils/migrationValidation.ts
interface MigrationValidation {
  routes: {
    nexus: RouteValidation[];
    paylinq: RouteValidation[];
    recruitiq: RouteValidation[];
  };
  components: ComponentValidation[];
  services: ServiceValidation[];
  performance: PerformanceMetrics;
}

export async function validateMigration(): Promise<MigrationValidation> {
  const routes = await validateAllRoutes();
  const components = await validateComponentFunctionality();
  const services = await validateServiceIntegration();
  const performance = await measurePerformanceMetrics();
  
  return {
    routes,
    components,
    services,
    performance
  };
}
```

**Day 20 Tasks:**
- [ ] Run comprehensive migration validation
- [ ] Test all migrated routes and components
- [ ] Verify feature parity with original apps
- [ ] Performance benchmark comparison

**Day 21 Tasks:**
- [ ] Fix any remaining migration issues
- [ ] Complete Phase 2 documentation
- [ ] Prepare handoff documentation for Phase 3
- [ ] Phase 2 completion review

---

## Risk Management

### High-Risk Areas

**1. PayLinQ Financial Calculations (Critical)**
- **Risk:** Calculation errors could affect payroll accuracy
- **Mitigation:** 
  - Extensive unit testing of calculation logic
  - Side-by-side validation with existing app
  - Financial QA team validation
  - Rollback plan for calculation discrepancies

**2. Cross-Module Data Dependencies**
- **Risk:** Modules may share data in unexpected ways
- **Mitigation:**
  - Thorough data flow analysis
  - Controlled shared state management
  - Clear module boundaries
  - Data isolation testing

**3. Performance Regression**
- **Risk:** Unified app may be slower than separate apps
- **Mitigation:**
  - Code splitting by module
  - Lazy loading implementation
  - Performance monitoring
  - Bundle size optimization

### Migration Safety Measures

**Parallel Running Strategy:**
```typescript
// apps/unified/src/config/migrationMode.ts
interface MigrationConfig {
  mode: 'parallel' | 'gradual' | 'complete';
  fallbackEnabled: boolean;
  modules: {
    nexus: 'legacy' | 'unified' | 'both';
    paylinq: 'legacy' | 'unified' | 'both';
    recruitiq: 'legacy' | 'unified' | 'both';
  };
}

export const migrationConfig: MigrationConfig = {
  mode: 'gradual',
  fallbackEnabled: true,
  modules: {
    nexus: 'both',    // Run both during transition
    paylinq: 'both',  // Critical financial calculations
    recruitiq: 'unified' // Lower risk, can switch faster
  }
};
```

**Rollback Procedures:**
1. **Immediate Rollback** - Feature flag disable (< 5 minutes)
2. **Gradual Rollback** - Progressive user migration back to legacy
3. **Full Rollback** - Complete revert to separate applications
4. **Data Integrity** - Ensure no data loss during rollback

---

## Quality Assurance

### Testing Strategy

**Component Testing:**
```typescript
// apps/unified/src/modules/nexus/__tests__/EmployeeList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmployeeList } from '../pages/employees/EmployeeList';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('EmployeeList', () => {
  it('renders employee list correctly', async () => {
    render(<EmployeeList />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText('Employees')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Add Employee')).toBeInTheDocument();
  });
  
  it('handles loading state', () => {
    render(<EmployeeList />, { wrapper: createWrapper() });
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

**Service Integration Testing:**
```typescript
// apps/unified/src/services/__tests__/employees.service.test.ts
import { employeesService } from '../employees.service';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/products/nexus/employees', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        employees: [
          { id: '1', name: 'John Doe', email: 'john@example.com' }
        ]
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('employeesService', () => {
  it('fetches employees successfully', async () => {
    const employees = await employeesService.listEmployees();
    expect(employees).toHaveLength(1);
    expect(employees[0].name).toBe('John Doe');
  });
});
```

### Performance Benchmarks

**Metrics to Track:**
- Page load time (< 2 seconds)
- Route transition speed (< 500ms)
- Bundle size per module (< 500KB gzipped)
- Memory usage (< 100MB heap)
- Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)

---

## Deliverables

### Phase 2 Outputs

**1. Migrated Module Structure**
```
apps/unified/src/modules/
├── nexus/
│   ├── pages/
│   ├── components/
│   └── hooks/
├── paylinq/
│   ├── pages/
│   ├── components/
│   └── hooks/
├── recruitiq/
│   ├── pages/
│   ├── components/
│   └── hooks/
└── shared/
    ├── components/
    ├── hooks/
    └── utils/
```

**2. Service Layer Integration**
```
apps/unified/src/services/
├── employees.service.ts
├── payroll.service.ts
├── jobs.service.ts
├── candidates.service.ts
└── shared/
    ├── api.service.ts
    └── cache.service.ts
```

**3. Feature Toggle System**
```
apps/unified/src/config/
├── features.ts
├── migration.ts
└── permissions.ts
```

**4. Test Coverage**
- Unit tests for all migrated components
- Integration tests for service layer
- E2E tests for critical workflows
- Performance test suite

**5. Documentation**
- Migration status report
- Component inventory
- Service integration guide
- Testing documentation

---

## Definition of Done

### Technical Requirements
- [ ] All routes from source applications accessible in unified app
- [ ] 100% feature parity maintained
- [ ] Service integration complete with type safety
- [ ] Feature toggle system operational
- [ ] Performance benchmarks met or exceeded

### Testing Requirements
- [ ] Unit test coverage ≥ 80% for new code
- [ ] Integration tests for all service endpoints
- [ ] E2E tests for critical user workflows
- [ ] Performance tests pass established benchmarks
- [ ] Cross-browser testing complete

### Quality Requirements  
- [ ] No accessibility regressions
- [ ] Security review completed
- [ ] Code review approval from tech leads
- [ ] Documentation updated and reviewed
- [ ] Migration validation checklist completed

### Business Requirements
- [ ] All existing functionality preserved
- [ ] User experience equivalent or improved
- [ ] Performance equal or better than legacy apps
- [ ] Feature flags configured for gradual rollout
- [ ] Rollback procedures tested and documented

---

## Next Phase

**Phase 3: Feature Consolidation** will focus on:
- ScheduleHub module integration
- Advanced shared component optimization
- Cross-module workflow enhancement
- Mobile responsiveness improvements
- Performance optimization

The foundation and core modules established in Phases 1 and 2 will enable rapid feature consolidation in Phase 3.