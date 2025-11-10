# Nexus HRIS Frontend Architecture

**Version:** 1.0.0  
**Created:** November 7, 2025  
**Status:** Active Development

---

## Overview

Nexus HRIS frontend is a React 18 + TypeScript application that provides comprehensive human resource management capabilities. It follows the established RecruitIQ monorepo patterns and integrates directly with the Nexus backend API.

---

## Tech Stack

### Core
- **React 18.3+** - UI framework
- **TypeScript 5.7+** - Type safety
- **Vite 6+** - Build tool and dev server
- **React Router DOM 7+** - Client-side routing

### State Management
- **TanStack Query (React Query) 5+** - Server state management, caching, and synchronization
- **React Context** - Global UI state (auth, theme, toast)
- **React Hook Form 7+** - Form state management with validation

### Styling
- **TailwindCSS 3.4+** - Utility-first CSS framework
- **clsx** - Conditional class names
- **Lucide React** - Icon library

### Data & Validation
- **Zod 3+** - Schema validation
- **date-fns 4+** - Date manipulation

### Testing
- **Vitest 4+** - Unit and integration testing
- **React Testing Library** - Component testing
- **MSW (Mock Service Worker) 2+** - API mocking
- **Playwright** - E2E testing

### Shared Packages
- `@recruitiq/api-client` - HTTP client and API utilities
- `@recruitiq/auth` - Authentication context and components
- `@recruitiq/ui` - Shared UI components
- `@recruitiq/types` - TypeScript definitions

---

## Project Structure

```
apps/nexus/
├── public/                        # Static assets
│   └── nexus-logo.svg
├── src/
│   ├── main.tsx                   # Application entry point
│   ├── App.tsx                    # Root component with routing
│   ├── index.css                  # Global styles
│   ├── vite-env.d.ts             # Vite type definitions
│   │
│   ├── components/                # Reusable components
│   │   ├── layout/
│   │   │   ├── Layout.tsx        # Main layout with sidebar
│   │   │   ├── Header.tsx        # Top navigation bar
│   │   │   └── Sidebar.tsx       # Side navigation
│   │   │
│   │   ├── employees/
│   │   │   ├── EmployeeCard.tsx
│   │   │   ├── EmployeeTable.tsx
│   │   │   ├── EmployeeFilters.tsx
│   │   │   ├── EmployeeForm.tsx
│   │   │   └── OrgChartVisualization.tsx
│   │   │
│   │   ├── contracts/
│   │   │   ├── ContractCard.tsx
│   │   │   ├── ContractTimeline.tsx
│   │   │   └── ContractForm.tsx
│   │   │
│   │   ├── performance/
│   │   │   ├── ReviewCard.tsx
│   │   │   ├── ReviewForm.tsx
│   │   │   ├── GoalCard.tsx
│   │   │   ├── GoalForm.tsx
│   │   │   └── FeedbackForm.tsx
│   │   │
│   │   ├── time-off/
│   │   │   ├── TimeOffCalendar.tsx
│   │   │   ├── TimeOffRequestCard.tsx
│   │   │   ├── TimeOffRequestForm.tsx
│   │   │   ├── TimeOffBalanceCard.tsx
│   │   │   └── TimeOffApprovalModal.tsx
│   │   │
│   │   ├── attendance/
│   │   │   ├── AttendanceCard.tsx
│   │   │   ├── AttendanceCalendar.tsx
│   │   │   ├── ClockInOutWidget.tsx
│   │   │   └── AttendanceSummary.tsx
│   │   │
│   │   ├── benefits/
│   │   │   ├── BenefitPlanCard.tsx
│   │   │   ├── BenefitPlanForm.tsx
│   │   │   ├── EnrollmentCard.tsx
│   │   │   └── EnrollmentForm.tsx
│   │   │
│   │   ├── departments/
│   │   │   ├── DepartmentCard.tsx
│   │   │   ├── DepartmentForm.tsx
│   │   │   ├── DepartmentTree.tsx
│   │   │   └── DepartmentHierarchy.tsx
│   │   │
│   │   ├── documents/
│   │   │   ├── DocumentCard.tsx
│   │   │   ├── DocumentUploadForm.tsx
│   │   │   ├── DocumentViewer.tsx
│   │   │   └── DocumentExpiryAlert.tsx
│   │   │
│   │   └── ui/                   # Shared UI components
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       ├── Modal.tsx
│   │       ├── Table.tsx
│   │       ├── Tabs.tsx
│   │       ├── Select.tsx
│   │       ├── Input.tsx
│   │       ├── Textarea.tsx
│   │       ├── DatePicker.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── pages/                     # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   │
│   │   ├── employees/
│   │   │   ├── EmployeesList.tsx
│   │   │   ├── EmployeeDetails.tsx
│   │   │   ├── EmployeeCreate.tsx
│   │   │   ├── EmployeeEdit.tsx
│   │   │   └── OrgChart.tsx
│   │   │
│   │   ├── contracts/
│   │   │   ├── ContractsList.tsx
│   │   │   ├── ContractDetails.tsx
│   │   │   ├── ContractCreate.tsx
│   │   │   └── ContractEdit.tsx
│   │   │
│   │   ├── performance/
│   │   │   ├── ReviewsList.tsx
│   │   │   ├── ReviewDetails.tsx
│   │   │   ├── ReviewCreate.tsx
│   │   │   ├── ReviewEdit.tsx
│   │   │   ├── GoalsList.tsx
│   │   │   └── FeedbackList.tsx
│   │   │
│   │   ├── time-off/
│   │   │   ├── TimeOffRequests.tsx
│   │   │   ├── TimeOffBalance.tsx
│   │   │   ├── TimeOffCalendar.tsx
│   │   │   └── TimeOffPolicies.tsx
│   │   │
│   │   ├── attendance/
│   │   │   ├── AttendanceDashboard.tsx
│   │   │   ├── AttendanceRecords.tsx
│   │   │   └── AttendanceSummary.tsx
│   │   │
│   │   ├── benefits/
│   │   │   ├── BenefitsPlansList.tsx
│   │   │   ├── BenefitPlanDetails.tsx
│   │   │   ├── EnrollmentsList.tsx
│   │   │   └── EnrollmentDetails.tsx
│   │   │
│   │   ├── departments/
│   │   │   ├── DepartmentsList.tsx
│   │   │   ├── DepartmentDetails.tsx
│   │   │   └── OrganizationStructure.tsx
│   │   │
│   │   ├── locations/
│   │   │   ├── LocationsList.tsx
│   │   │   └── LocationDetails.tsx
│   │   │
│   │   ├── documents/
│   │   │   ├── DocumentsList.tsx
│   │   │   └── DocumentDetails.tsx
│   │   │
│   │   ├── reports/
│   │   │   └── ReportsDashboard.tsx
│   │   │
│   │   └── settings/
│   │       └── Settings.tsx
│   │
│   ├── contexts/                  # React contexts
│   │   ├── ThemeContext.tsx      # Dark mode theme
│   │   └── ToastContext.tsx      # Toast notifications
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── useEmployees.ts
│   │   ├── useContracts.ts
│   │   ├── usePerformanceReviews.ts
│   │   ├── useTimeOff.ts
│   │   ├── useAttendance.ts
│   │   ├── useBenefits.ts
│   │   ├── useDepartments.ts
│   │   ├── useLocations.ts
│   │   ├── useDocuments.ts
│   │   ├── useDebounce.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── services/                  # API service layer
│   │   ├── api.ts                # Base API client
│   │   ├── employees.service.ts
│   │   ├── contracts.service.ts
│   │   ├── performance.service.ts
│   │   ├── timeOff.service.ts
│   │   ├── attendance.service.ts
│   │   ├── benefits.service.ts
│   │   ├── departments.service.ts
│   │   ├── locations.service.ts
│   │   ├── documents.service.ts
│   │   └── reports.service.ts
│   │
│   ├── types/                     # TypeScript types
│   │   ├── employee.types.ts
│   │   ├── contract.types.ts
│   │   ├── performance.types.ts
│   │   ├── timeOff.types.ts
│   │   ├── attendance.types.ts
│   │   ├── benefits.types.ts
│   │   ├── department.types.ts
│   │   ├── location.types.ts
│   │   ├── document.types.ts
│   │   └── common.types.ts
│   │
│   ├── utils/                     # Utility functions
│   │   ├── format.ts             # Formatting helpers
│   │   ├── validation.ts         # Validation utilities
│   │   ├── constants.ts          # App constants
│   │   └── helpers.ts            # General helpers
│   │
│   └── __tests__/                 # Test files
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── utils/
│
├── tests/                         # Additional tests
│   ├── e2e/                      # Playwright E2E tests
│   └── integration/              # Integration tests
│
├── index.html                     # HTML entry point
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── tsconfig.test.json            # TypeScript config for tests
├── vite.config.ts                # Vite configuration
├── vitest.config.ts              # Vitest configuration
├── tailwind.config.js            # Tailwind configuration
├── postcss.config.cjs            # PostCSS configuration
└── README.md                      # Documentation
```

---

## Routing Architecture

### Route Structure

```typescript
/                           → Redirect to /dashboard
/login                      → Public login page
/dashboard                  → HR dashboard with key metrics

/employees                  → Employee list
/employees/new              → Create employee
/employees/:id              → Employee details
/employees/:id/edit         → Edit employee
/employees/org-chart        → Organization chart

/contracts                  → Contracts list
/contracts/new              → Create contract
/contracts/:id              → Contract details
/contracts/:id/edit         → Edit contract

/performance/reviews        → Performance reviews list
/performance/reviews/new    → Create review
/performance/reviews/:id    → Review details
/performance/reviews/:id/edit → Edit review
/performance/goals          → Goals list
/performance/feedback       → Feedback list

/time-off/requests          → Time-off requests
/time-off/balance           → Leave balance dashboard
/time-off/calendar          → Leave calendar
/time-off/policies          → Time-off policies

/attendance                 → Attendance dashboard
/attendance/records         → Attendance records
/attendance/summary         → Attendance summary

/benefits/plans             → Benefits plans
/benefits/plans/:id         → Plan details
/benefits/enrollments       → Enrollments list
/benefits/enrollments/:id   → Enrollment details

/departments                → Departments list
/departments/:id            → Department details
/departments/structure      → Organization structure

/locations                  → Locations list
/locations/:id              → Location details

/documents                  → Documents library
/documents/:id              → Document details

/reports                    → Reports dashboard
/settings                   → Application settings
```

### Protected Routes

All routes except `/login` are protected and require authentication.

---

## State Management Strategy

### 1. Server State (TanStack Query)

Used for all API data fetching, caching, and synchronization:

```typescript
// Employee data fetching
const { data: employees, isLoading, error } = useQuery({
  queryKey: ['employees', filters],
  queryFn: () => employeesService.list(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Mutations
const createEmployee = useMutation({
  mutationFn: employeesService.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    toast.success('Employee created successfully');
  },
});
```

**Query Keys Structure:**
- `['employees']` - All employees
- `['employees', { status: 'active' }]` - Filtered employees
- `['employees', employeeId]` - Single employee
- `['contracts', { employeeId }]` - Employee contracts
- `['timeoff', 'requests', { status: 'pending' }]` - Pending requests

### 2. Client State (React Context)

Used for UI state that doesn't belong to the server:

**AuthContext** - User authentication state
**ThemeContext** - Dark/light mode preference
**ToastContext** - Toast notifications

### 3. Form State (React Hook Form)

Used for all form management with Zod validation:

```typescript
const form = useForm<EmployeeFormData>({
  resolver: zodResolver(employeeSchema),
  defaultValues: employee,
});
```

---

## API Integration

### Base API Client

```typescript
// src/services/api.ts
import { apiClient } from '@recruitiq/api-client';

const nexusApi = apiClient.create({
  baseURL: '/api/nexus',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default nexusApi;
```

### Service Layer Pattern

Each domain has a dedicated service:

```typescript
// src/services/employees.service.ts
import api from './api';
import type { Employee, CreateEmployeeDTO, UpdateEmployeeDTO } from '@/types/employee.types';

export const employeesService = {
  list: async (filters?: EmployeeFilters) => {
    const { data } = await api.get<Employee[]>('/employees', { params: filters });
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get<Employee>(`/employees/${id}`);
    return data;
  },

  create: async (employee: CreateEmployeeDTO) => {
    const { data } = await api.post<Employee>('/employees', employee);
    return data;
  },

  update: async (id: string, updates: UpdateEmployeeDTO) => {
    const { data } = await api.patch<Employee>(`/employees/${id}`, updates);
    return data;
  },

  terminate: async (id: string, terminationData: TerminationDTO) => {
    const { data } = await api.post<Employee>(`/employees/${id}/terminate`, terminationData);
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/employees/${id}`);
  },

  getOrgChart: async () => {
    const { data } = await api.get<OrgChartNode[]>('/employees/org-chart');
    return data;
  },

  search: async (query: string) => {
    const { data } = await api.get<Employee[]>('/employees/search', {
      params: { q: query },
    });
    return data;
  },
};
```

---

## Type Safety

### TypeScript Configuration

Strict mode enabled for maximum type safety:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Type Definitions

All backend models are typed in `src/types/`:

```typescript
// src/types/employee.types.ts
export interface Employee {
  id: string;
  organizationId: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  hireDate: string;
  terminationDate?: string;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  departmentId?: string;
  department?: Department;
  locationId?: string;
  location?: Location;
  managerId?: string;
  manager?: Employee;
  jobTitle?: string;
  workSchedule?: string;
  ftePercentage?: number;
  profilePhotoUrl?: string;
  bio?: string;
  skills?: string[];
  createdAt: string;
  updatedAt: string;
}

export type EmploymentStatus = 'active' | 'on_leave' | 'terminated' | 'suspended';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern';

export interface CreateEmployeeDTO {
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  hireDate: string;
  employmentType: EmploymentType;
  departmentId?: string;
  locationId?: string;
  managerId?: string;
  jobTitle?: string;
  // ... other optional fields
}

export interface UpdateEmployeeDTO extends Partial<CreateEmployeeDTO> {}

export interface EmployeeFilters {
  status?: EmploymentStatus;
  departmentId?: string;
  locationId?: string;
  employmentType?: EmploymentType;
  search?: string;
}
```

---

## Component Patterns

### 1. Page Components

Handle routing, data fetching, and layout:

```tsx
// src/pages/employees/EmployeesList.tsx
export default function EmployeesList() {
  const [filters, setFilters] = useState<EmployeeFilters>({});
  const { data: employees, isLoading, error } = useEmployees(filters);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Employees</h1>
        <Link to="/employees/new">
          <Button>Add Employee</Button>
        </Link>
      </div>

      <EmployeeFilters filters={filters} onChange={setFilters} />

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      {employees && <EmployeeTable employees={employees} />}
    </div>
  );
}
```

### 2. Container Components

Handle business logic and state:

```tsx
// src/components/employees/EmployeeTable.tsx
interface EmployeeTableProps {
  employees: Employee[];
}

export default function EmployeeTable({ employees }: EmployeeTableProps) {
  const navigate = useNavigate();
  const { mutate: deleteEmployee } = useDeleteEmployee();

  const handleDelete = (id: string) => {
    if (confirm('Are you sure?')) {
      deleteEmployee(id);
    }
  };

  return (
    <Table
      columns={columns}
      data={employees}
      onRowClick={(employee) => navigate(`/employees/${employee.id}`)}
      actions={(employee) => (
        <Button onClick={() => handleDelete(employee.id)}>Delete</Button>
      )}
    />
  );
}
```

### 3. Presentational Components

Pure UI components:

```tsx
// src/components/employees/EmployeeCard.tsx
interface EmployeeCardProps {
  employee: Employee;
  onClick?: () => void;
}

export default function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  return (
    <Card onClick={onClick} className="hover:shadow-lg transition-shadow cursor-pointer">
      <div className="flex items-center space-x-4">
        <img
          src={employee.profilePhotoUrl || '/default-avatar.png'}
          alt={employee.firstName}
          className="w-12 h-12 rounded-full"
        />
        <div>
          <h3 className="font-semibold">
            {employee.firstName} {employee.lastName}
          </h3>
          <p className="text-sm text-gray-500">{employee.jobTitle}</p>
        </div>
      </div>
    </Card>
  );
}
```

---

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)

Test all components, hooks, and utilities:

```typescript
// src/__tests__/components/employees/EmployeeCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EmployeeCard from '@/components/employees/EmployeeCard';

describe('EmployeeCard', () => {
  it('renders employee information', () => {
    const employee = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
      jobTitle: 'Software Engineer',
    };

    render(<EmployeeCard employee={employee} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
  });
});
```

### Integration Tests (MSW)

Test API integration with mocked responses:

```typescript
// src/__tests__/hooks/useEmployees.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import { useEmployees } from '@/hooks/useEmployees';

describe('useEmployees', () => {
  it('fetches employees successfully', async () => {
    server.use(
      http.get('/api/nexus/employees', () => {
        return HttpResponse.json([
          { id: '1', firstName: 'John', lastName: 'Doe' },
        ]);
      })
    );

    const { result } = renderHook(() => useEmployees());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});
```

### E2E Tests (Playwright)

Test critical user flows:

```typescript
// tests/e2e/employee-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Employee Management', () => {
  test('create new employee', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/employees/new');
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="email"]', 'john.doe@example.com');
    await page.fill('[name="hireDate"]', '2025-01-01');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/employees\/[a-z0-9-]+/);
    await expect(page.locator('h1')).toContainText('John Doe');
  });
});
```

---

## Performance Optimization

### 1. Code Splitting

Lazy load routes:

```tsx
const EmployeesList = lazy(() => import('@/pages/employees/EmployeesList'));
const EmployeeDetails = lazy(() => import('@/pages/employees/EmployeeDetails'));
```

### 2. Query Optimization

Use appropriate cache times and refetch strategies:

```typescript
const { data } = useQuery({
  queryKey: ['employees', id],
  queryFn: () => employeesService.get(id),
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
});
```

### 3. Optimistic Updates

Update UI immediately while mutation is in progress:

```typescript
const updateEmployee = useMutation({
  mutationFn: employeesService.update,
  onMutate: async (variables) => {
    await queryClient.cancelQueries({ queryKey: ['employees', variables.id] });
    const previous = queryClient.getQueryData(['employees', variables.id]);
    queryClient.setQueryData(['employees', variables.id], variables);
    return { previous };
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(['employees', variables.id], context.previous);
  },
});
```

### 4. Virtual Scrolling

For large lists (>1000 items), use virtual scrolling

### 5. Memoization

Use React.memo for expensive components:

```tsx
export default React.memo(EmployeeCard, (prev, next) => {
  return prev.employee.id === next.employee.id &&
         prev.employee.updatedAt === next.employee.updatedAt;
});
```

---

## Accessibility

### WCAG 2.1 Level AA Compliance

- Semantic HTML elements
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- Color contrast ratios
- Screen reader friendly

### Implementation

```tsx
<button
  onClick={handleSubmit}
  aria-label="Create new employee"
  aria-busy={isSubmitting}
  disabled={isSubmitting}
>
  Create Employee
</button>
```

---

## Design System Integration

Follows **Nexus HRIS** branding from `DESIGN_SYSTEM.md`:

### Colors
- **Primary:** Emerald-500 (#10b981) - brand consistency
- **Accent:** Purple-500 (#a855f7) - product differentiation
- **Theme:** #0ea5a4

### Logo
```tsx
<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-purple-500 flex items-center justify-center text-white font-bold shadow">
  NX
</div>
```

### Typography
- **Font:** Inter (Google Fonts)
- **Scale:** Standard Tailwind scale

### Components
- Use `@recruitiq/ui` shared components
- Extend with Nexus-specific components

---

## Development Workflow

### 1. Start Development Server

```bash
cd apps/nexus
pnpm dev
```

### 2. Run Tests

```bash
pnpm test                # Unit tests
pnpm test:coverage       # Coverage report
pnpm test:e2e           # E2E tests
```

### 3. Build for Production

```bash
pnpm build
pnpm preview
```

### 4. Lint and Format

```bash
pnpm lint
pnpm format
```

---

## Next Steps

1. ✅ Complete architecture documentation
2. ⏳ Initialize project structure
3. ⏳ Set up routing and authentication
4. ⏳ Build core layout components
5. ⏳ Implement employee management (MVP)
6. ⏳ Add comprehensive tests
7. ⏳ Implement remaining modules iteratively

---

**Maintained by:** Nexus Frontend Team  
**Last Updated:** November 7, 2025
