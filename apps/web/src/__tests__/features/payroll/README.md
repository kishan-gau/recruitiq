# Payroll Frontend Tests

## Overview

This directory contains comprehensive frontend tests for the payroll features in the unified web application. Tests follow industry standards as documented in `TESTING_STANDARDS.md` and `FRONTEND_STANDARDS.md`.

## Test Structure

```
src/__tests__/features/payroll/
├── services/              # Service layer tests
│   ├── payroll-runs.service.test.ts
│   ├── compensation.service.test.ts
│   ├── deductions.service.test.ts
│   └── tax.service.test.ts
├── hooks/                 # React Query hook tests
│   ├── usePayrollRuns.test.ts
│   ├── useCompensation.test.ts
│   ├── useDeductions.test.ts (NEW)
│   ├── useTax.test.ts (NEW)
│   ├── usePayComponents.test.ts (NEW)
│   └── useWorkerTypes.test.ts (NEW)
├── components/            # Component tests
│   ├── CurrencySelector.test.tsx
│   ├── DeletePayComponentDialog.test.tsx (NEW)
│   └── ... (more component tests)
├── integration/           # Integration tests (NEW)
│   └── payroll-run-workflow.test.ts
├── utils/                 # Test utilities
│   └── test-helpers.ts
└── README.md             # This file
```

## New Tests Added

### Hook Tests
- **useDeductions.test.ts** - 23 tests covering:
  - Query operations (list, single item)
  - Mutations (create, update, delete)
  - Combined hook functionality
  - Cache management
  - Error scenarios

- **useTax.test.ts** - 27 tests covering:
  - Tax rules queries
  - CRUD mutations
  - Combined hook with mutation objects
  - Edge cases and validation

- **usePayComponents.test.ts** - 23 tests covering:
  - Pay component queries with filters
  - CRUD operations
  - Data transformation (snake_case to camelCase)
  - Error handling

- **useWorkerTypes.test.ts** - 35+ tests covering:
  - Worker type templates (CRUD)
  - Worker type assignments
  - Upgrade previews and execution
  - Template comparisons

### Integration Tests
- **payroll-run-workflow.test.ts** - 9 comprehensive scenarios:
  - Complete payroll run creation flow
  - Worker filtering and validation
  - Status transitions
  - Multi-period payroll runs
  - Cache consistency
  - Error recovery

### Component Tests
- **DeletePayComponentDialog.test.tsx** - 40+ tests covering:
  - Rendering variations
  - User interactions
  - Loading states
  - Accessibility
  - Edge cases

## Testing Tools

- **Vitest**: Fast unit test runner with Jest-compatible API
- **React Testing Library**: Testing utilities for React components
- **@testing-library/user-event**: User interaction simulation
- **@tanstack/react-query**: State management for server data
- **Playwright**: E2E testing framework (NEW)

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Run specific test file
npm test -- useDeductions.test.ts

# Run tests in UI mode
npm test:ui

# Run E2E tests (NEW)
npm test:e2e

# Run E2E tests in UI mode (NEW)
npm test:e2e:ui
```

## Test Categories

### 1. Service Layer Tests

Test the API service wrappers that interact with `@recruitiq/api-client`.

**Example:**
```typescript
// services/payroll-runs.service.test.ts
describe('payrollRunsService', () => {
  it('should fetch payroll runs', async () => {
    const mockData = [{ id: '123', runCode: 'RUN-001' }];
    mockPaylinqClient.getPayrollRuns.mockResolvedValue({ data: mockData });

    const result = await payrollRunsService.getPayrollRuns();

    expect(result).toEqual(mockData);
  });
});
```

**Coverage:** Services should have **90%+ coverage**

### 2. React Query Hook Tests

Test custom hooks that use `@tanstack/react-query` for data fetching and mutations.

**Example:**
```typescript
// hooks/usePayrollRuns.test.ts
describe('usePayrollRuns', () => {
  it('should fetch payroll runs successfully', async () => {
    const mockRuns = [{ id: '123', runCode: 'RUN-001' }];
    vi.mocked(payrollRunsService.getPayrollRuns).mockResolvedValue(mockRuns);

    const { result } = renderHook(() => usePayrollRuns(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockRuns);
  });
});
```

**Coverage:** Hooks should have **85%+ coverage**

### 3. Component Tests

Test React components for rendering, user interactions, and accessibility.

**Example:**
```typescript
// components/CurrencySelector.test.tsx
describe('CurrencySelector', () => {
  it('should call onChange when currency is selected', async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();

    render(<CurrencySelector value="USD" onChange={mockOnChange} />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'EUR');

    expect(mockOnChange).toHaveBeenCalledWith('EUR');
  });
});
```

**Coverage:** Components should have **70%+ coverage**

### 4. Integration Tests (NEW)

Test complete workflows with multiple components working together.

**Example:**
```typescript
// integration/payroll-run-workflow.test.ts
describe('Complete Payroll Run Creation Flow', () => {
  it('should create payroll run and fetch workers in integrated workflow', async () => {
    // Test multiple hooks working together
    // Verify data flow between components
    // Ensure cache consistency
  });
});
```

**Coverage:** Integration tests should cover critical user journeys

### 5. E2E Tests with Playwright (NEW)

Test complete application flows from user perspective in real browser.

**Example:**
```typescript
// e2e/payroll/payroll-run-creation.spec.ts
test('should create a new monthly payroll run', async ({ page }) => {
  await page.click('button:has-text("Create Payroll Run")');
  await page.fill('input[name="runCode"]', 'RUN-2025-01');
  await page.click('button:has-text("Create")');
  await expect(page.locator('text=created successfully')).toBeVisible();
});
```

**Coverage:** E2E tests should cover critical business flows

## Testing Patterns

### Arrange-Act-Assert (AAA) Pattern

All tests follow the AAA pattern for clarity:

```typescript
it('should create a payroll run', async () => {
  // Arrange: Set up test data and mocks
  const mockData = { runCode: 'RUN-001' };
  mockService.create.mockResolvedValue(mockData);

  // Act: Execute the function under test
  const result = await service.create(mockData);

  // Assert: Verify the expected outcome
  expect(result).toEqual(mockData);
  expect(mockService.create).toHaveBeenCalledWith(mockData);
});
```

### Mocking API Clients

```typescript
// Mock the entire API client package
vi.mock('@recruitiq/api-client', () => ({
  APIClient: vi.fn().mockImplementation(() => ({})),
  PaylinqClient: vi.fn().mockImplementation(() => ({
    getPayrollRuns: vi.fn(),
    createPayrollRun: vi.fn(),
  })),
}));

// Access the mocked instance
const mockPaylinqClient = vi.mocked(PaylinqClient).mock.results[0]?.value;
```

### Testing React Query Hooks

```typescript
// Create a wrapper with QueryClientProvider
let queryClient: QueryClient;
let wrapper: React.FC<{ children: React.ReactNode }>;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
});

// Use the wrapper in renderHook
const { result } = renderHook(() => usePayrollRuns(), { wrapper });
```

### Testing User Interactions

```typescript
import userEvent from '@testing-library/user-event';

it('should handle user input', async () => {
  const user = userEvent.setup();
  render(<Form />);

  // Type into input
  await user.type(screen.getByLabelText('Name'), 'John Doe');

  // Click button
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  // Verify results
  expect(mockSubmit).toHaveBeenCalled();
});
```

## Test Utilities

Common test utilities are available in `utils/test-helpers.ts`:

- `createTestQueryClient()` - Fresh QueryClient for each test
- `createMockPayrollRun()` - Factory for payroll run data
- `createMockCompensation()` - Factory for compensation data
- `createMockDeduction()` - Factory for deduction data (NEW)
- `createMockTaxRule()` - Factory for tax rule data (NEW)
- `createMockPayComponent()` - Factory for pay component data (NEW)
- `createMockWorker()` - Factory for worker data (NEW)
- `createMockWorkerTypeTemplate()` - Factory for worker type template data (NEW)
- `createMockApiError()` - Mock API errors (NEW)
- `createMockValidationError()` - Mock validation errors (NEW)
- `generateUUID()` - Generate valid UUID v4 (NEW)
- `generateMockArray()` - Generate arrays of mock data (NEW)

**Usage:**
```typescript
import { 
  createMockPayrollRun, 
  createTestQueryClient,
  generateMockArray 
} from '../utils/test-helpers';

const mockRun = createMockPayrollRun({ status: 'completed' });
const queryClient = createTestQueryClient();
const mockRuns = generateMockArray(createMockPayrollRun, 10);
```

## Accessibility Testing

All component tests should verify accessibility:

```typescript
it('should be keyboard navigable', async () => {
  const user = userEvent.setup();
  render(<CurrencySelector {...props} />);

  // Tab to focus
  await user.tab();
  expect(screen.getByRole('combobox')).toHaveFocus();

  // Arrow keys should work
  await user.keyboard('{ArrowDown}');
  expect(screen.getByRole('combobox')).toHaveFocus();
});

it('should have proper ARIA attributes', () => {
  render(<CurrencySelector label="Select Currency" {...props} />);

  const select = screen.getByRole('combobox');
  expect(select).toHaveAccessibleName('Select Currency');
});
```

## Error Handling Tests

Always test both success and error scenarios:

```typescript
describe('error scenarios', () => {
  it('should handle network errors', async () => {
    const error = new Error('Network error');
    mockService.fetch.mockRejectedValue(error);

    const { result } = renderHook(() => useData(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(error);
  });
});
```

## Coverage Requirements

Following `TESTING_STANDARDS.md`:

| Type | Minimum Coverage | Target Coverage |
|------|-----------------|-----------------|
| Services | 90% | 95% |
| Hooks | 85% | 90% |
| Components | 70% | 80% |
| Utilities | 90% | 95% |

## Current Test Coverage

As of the latest update:

- **Hook Tests**: 108 tests (useDeductions, useTax, usePayComponents, useWorkerTypes)
- **Service Tests**: ~50 tests (existing)
- **Component Tests**: ~70 tests (including new DeletePayComponentDialog)
- **Integration Tests**: 9 comprehensive workflow tests
- **E2E Tests**: 11 end-to-end scenarios with Playwright

## Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Test from the user's perspective

2. **Isolated Tests**
   - Each test should be independent
   - Use `beforeEach` to reset state
   - Clear mocks between tests

3. **Descriptive Test Names**
   - Use "should" statements
   - Be specific about what is being tested
   - Include the expected outcome

4. **Minimal Mocking**
   - Only mock external dependencies
   - Avoid mocking the code under test
   - Use real implementations when possible

5. **Fast Tests**
   - Tests should run in milliseconds
   - Disable retries in QueryClient
   - Use fake timers for time-dependent code

## Common Issues

### Issue: Tests hanging or timing out

**Solution:** Ensure QueryClient has retries disabled:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});
```

### Issue: "Cannot find module" errors

**Solution:** Check vite.config.ts path aliases match imports:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@features': path.resolve(__dirname, './src/features'),
  },
},
```

### Issue: Mock not being called

**Solution:** Verify mock is properly set up before the test runs:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  mockService.method.mockResolvedValue(data);
});
```

### Issue: React Query mutations receive extra context parameters

**Solution:** Check the first argument only:
```typescript
// Instead of:
expect(service.create).toHaveBeenCalledWith(data);

// Use:
expect(service.create).toHaveBeenCalled();
expect(service.create.mock.calls[0][0]).toEqual(data);
```

## E2E Testing with Playwright

### Setup

```bash
# Install Playwright browsers (first time only)
npx playwright install
```

### Running E2E Tests

```bash
# Run all E2E tests
npm test:e2e

# Run with UI
npm test:e2e:ui

# Run specific test file
npx playwright test payroll-run-creation

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

### E2E Test Structure

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await login(page);
  });

  test('should perform action', async ({ page }) => {
    // Test implementation
  });
});
```

### E2E Best Practices

1. **Use Page Object Model** for complex pages
2. **Wait for network idle** before assertions
3. **Use data-testid** attributes for reliable selectors
4. **Test critical paths only** - E2E tests are slow
5. **Run in CI** with retries for flaky tests

## Performance Testing

Performance tests verify application responsiveness:

```typescript
test('should load within 3 seconds', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/payroll');
  await page.waitForSelector('table');
  const loadTime = Date.now() - startTime;
  
  expect(loadTime).toBeLessThan(3000);
});
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro)
- [TanStack Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)
- [Playwright Documentation](https://playwright.dev/) (NEW)
- Project Standards: `docs/TESTING_STANDARDS.md`
- Project Standards: `docs/FRONTEND_STANDARDS.md`

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use the AAA pattern
3. Include accessibility tests for components
4. Add test utilities to `test-helpers.ts` for reusable mocks
5. Ensure coverage meets requirements
6. Run tests before committing
7. Add E2E tests for critical user journeys

## Support

For questions or issues with tests:
- Review `TESTING_STANDARDS.md` for detailed guidelines
- Check existing tests for examples
- Consult the team lead for clarification
