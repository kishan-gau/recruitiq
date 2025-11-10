# ScheduleHub Integration Testing Guide

## Overview
This directory contains comprehensive integration tests for the ScheduleHub frontend components. These tests verify the complete user flow from UI interaction to API communication using Mock Service Worker (MSW).

## Test Structure

### Test Files
```
tests/
├── mocks/
│   ├── server.ts                           # MSW server setup
│   └── schedulehub.handlers.ts             # API mock handlers
├── integration/
│   ├── ScheduleHubDashboard.test.tsx       # Dashboard tests
│   ├── WorkersList.test.tsx                # Workers list tests
│   ├── SchedulesList.test.tsx              # Schedules list tests
│   ├── TimeOffRequests.test.tsx            # Time off tests
│   └── ShiftSwapMarketplace.test.tsx       # Shift swap tests
└── setup.ts                                # Test environment setup
```

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Specific Test File
```bash
pnpm test tests/integration/ScheduleHubDashboard.test.tsx
```

### Run Tests in Watch Mode
```bash
pnpm test --watch
```

### Run Tests with Coverage
```bash
pnpm test:coverage
```

### Run Tests with UI
```bash
pnpm test:ui
```

## Test Coverage

### ScheduleHubDashboard (8 tests)
- ✅ Renders dashboard with loading state
- ✅ Displays stats cards with mock data
- ✅ Displays quick action cards
- ✅ Displays recent activity sections
- ✅ Navigation links work correctly
- ✅ Handles empty upcoming shifts
- ✅ Handles empty pending approvals
- ✅ Responsive design

### WorkersList (11 tests)
- ✅ Renders workers list page
- ✅ Displays workers in a table
- ✅ Displays worker details (rates, dates)
- ✅ Displays stats cards
- ✅ Filters workers by status
- ✅ Searches workers
- ✅ "Add Worker" button navigation
- ✅ "View Details" links
- ✅ Status badges
- ✅ Hire dates formatting
- ✅ Total worker count

### SchedulesList (10 tests)
- ✅ Renders schedules list page
- ✅ Displays schedules in a grid
- ✅ Displays schedule status badges
- ✅ Displays stats cards
- ✅ Displays schedule date ranges
- ✅ Filters schedules by status
- ✅ "Create Schedule" button navigation
- ✅ "View Details" links
- ✅ "Publish" button for draft schedules
- ✅ Publish action handling

### TimeOffRequests (14 tests)
- ✅ Renders time off requests page
- ✅ Displays requests list
- ✅ Displays stats cards
- ✅ Displays request status badges
- ✅ Displays request date ranges
- ✅ Displays request reasons
- ✅ Displays review notes
- ✅ Shows approve/deny buttons for pending
- ✅ Handles approve action
- ✅ Handles deny action
- ✅ Filters with "Show only pending" toggle
- ✅ "Request Time Off" button
- ✅ Request types formatting
- ✅ Responsive design

### ShiftSwapMarketplace (13 tests)
- ✅ Renders shift swap marketplace page
- ✅ Displays swap offers in a grid
- ✅ Displays stats cards
- ✅ Displays swap status badges
- ✅ Displays swap type formatting
- ✅ Displays offered shift information
- ✅ Displays swap notes
- ✅ Displays expiration time
- ✅ Filters swaps by type
- ✅ Shows "Request This Shift" button
- ✅ Handles request swap action
- ✅ Displays filter options
- ✅ Displays swap cards structure

## Mock Service Worker (MSW)

### API Handlers
The `schedulehub.handlers.ts` file mocks all ScheduleHub API endpoints:

**Workers API:**
- `GET /api/schedulehub/workers` - List workers with filters
- `GET /api/schedulehub/workers/:id` - Get single worker
- `POST /api/schedulehub/workers` - Create worker
- `PATCH /api/schedulehub/workers/:id` - Update worker

**Schedules API:**
- `GET /api/schedulehub/schedules` - List schedules with filters
- `GET /api/schedulehub/schedules/:id` - Get single schedule
- `POST /api/schedulehub/schedules` - Create schedule
- `POST /api/schedulehub/schedules/:id/publish` - Publish schedule

**Time Off API:**
- `GET /api/schedulehub/time-off` - List time off requests
- `GET /api/schedulehub/time-off/pending` - Get pending requests
- `POST /api/schedulehub/time-off` - Create request
- `POST /api/schedulehub/time-off/:id/review` - Review request

**Shift Swaps API:**
- `GET /api/schedulehub/shift-swaps/marketplace` - Get marketplace offers
- `POST /api/schedulehub/shift-swaps` - Create swap offer
- `POST /api/schedulehub/shift-swaps/:offerId/request` - Request swap

**Roles & Stations API:**
- `GET /api/schedulehub/roles` - List roles
- `GET /api/schedulehub/stations` - List stations

### Mock Data
The handlers use predefined mock data that simulates realistic API responses:
- 2 mock workers (active status)
- 2 mock schedules (1 draft, 1 published)
- 2 mock time off requests (1 pending, 1 approved)
- 1 mock shift swap offer (open type, pending status)

## Test Utilities

### Test Providers Wrapper
```typescript
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};
```

This wrapper provides:
- React Query client for data fetching
- React Router for navigation
- Clean state for each test

### Test Query Client Configuration
```typescript
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
      },
    },
  });
```

## Best Practices

### 1. Async Testing
Always use `waitFor` when testing async operations:
```typescript
await waitFor(() => {
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### 2. User Interactions
Use `userEvent` for realistic user interactions:
```typescript
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');
```

### 3. Cleanup
Tests automatically clean up after each test via `afterEach` in `setup.ts`.

### 4. Isolated Tests
Each test is independent and doesn't rely on the state of other tests.

### 5. Mock Global Functions
Mock browser APIs when needed:
```typescript
global.confirm = vi.fn(() => true);
global.alert = vi.fn();
```

## Debugging Tests

### View Test Results in UI
```bash
pnpm test:ui
```

### Run Single Test
Add `.only` to focus on one test:
```typescript
it.only('specific test case', () => {
  // test code
});
```

### Skip Tests
Use `.skip` to temporarily skip tests:
```typescript
it.skip('test to skip', () => {
  // test code
});
```

### Debug Output
Add `screen.debug()` to see current DOM:
```typescript
await waitFor(() => {
  screen.debug(); // Print current DOM
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

## Coverage Goals

### Current Coverage
- **Dashboard:** 100% (8/8 tests passing)
- **Workers:** 100% (11/11 tests passing)
- **Schedules:** 100% (10/10 tests passing)
- **Time Off:** 100% (14/14 tests passing)
- **Shift Swaps:** 100% (13/13 tests passing)

**Total: 56 integration tests**

### Target Coverage
- Line Coverage: >80%
- Branch Coverage: >75%
- Function Coverage: >80%
- Statement Coverage: >80%

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Integration Tests
  run: pnpm test --run

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Common Issues & Solutions

### Issue: "Cannot find module"
**Solution:** Check that all imports use the `@/` alias correctly and files exist.

### Issue: "Test timeout"
**Solution:** Increase timeout or check that async operations complete:
```typescript
it('test', async () => {
  // Ensure all async operations are awaited
  await waitFor(() => { ... }, { timeout: 5000 });
}, 10000); // Test timeout
```

### Issue: "Element not found"
**Solution:** Use `waitFor` for async elements or check mock data is correct.

### Issue: "MSW handler not called"
**Solution:** Verify API URL matches exactly, including query parameters.

## Future Enhancements

### Additional Test Coverage
1. **Error Handling Tests**
   - API errors (500, 404, 403)
   - Network failures
   - Validation errors

2. **Edge Cases**
   - Empty states
   - Large datasets (pagination)
   - Concurrent operations

3. **Accessibility Tests**
   - Keyboard navigation
   - Screen reader support
   - ARIA attributes

4. **Performance Tests**
   - Render performance
   - Memory leaks
   - Bundle size

5. **Visual Regression Tests**
   - Screenshot comparisons
   - Component snapshots
   - Theme variations

### Integration with Backend Tests
- Shared test data fixtures
- Contract testing
- End-to-end test suite

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro)

## Summary

The ScheduleHub integration test suite provides comprehensive coverage of all major UI components and user workflows. With 56 tests covering 5 main pages, the test suite ensures:

✅ **Reliability** - Catch bugs before production
✅ **Confidence** - Safe refactoring and feature additions
✅ **Documentation** - Tests serve as living documentation
✅ **Quality** - Maintain high code quality standards

**Status: ✅ Complete - 56 integration tests passing**
