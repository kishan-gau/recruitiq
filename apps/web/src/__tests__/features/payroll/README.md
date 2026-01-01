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
│   ├── useDeductions.test.ts
│   └── useTax.test.ts
├── components/            # Component tests
│   ├── CurrencySelector.test.tsx
│   └── ... (more component tests)
└── utils/                 # Test utilities
    └── test-helpers.ts
```

## Testing Tools

- **Vitest**: Fast unit test runner with Jest-compatible API
- **React Testing Library**: Testing utilities for React components
- **@testing-library/user-event**: User interaction simulation
- **@tanstack/react-query**: State management for server data

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Run specific test file
npm test -- payroll-runs.service.test.ts

# Run tests in UI mode
npm test:ui
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
- `createMockDeduction()` - Factory for deduction data
- `createMockApiError()` - Mock API errors
- `createMockValidationError()` - Mock validation errors

**Usage:**
```typescript
import { createMockPayrollRun, createTestQueryClient } from '../utils/test-helpers';

const mockRun = createMockPayrollRun({ status: 'completed' });
const queryClient = createTestQueryClient();
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

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro)
- [TanStack Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)
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

## Support

For questions or issues with tests:
- Review `TESTING_STANDARDS.md` for detailed guidelines
- Check existing tests for examples
- Consult the team lead for clarification
