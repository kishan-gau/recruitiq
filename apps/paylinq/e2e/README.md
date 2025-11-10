# Paylinq E2E Tests

End-to-end tests for the Paylinq payroll application using Playwright.

## Prerequisites

1. **Backend Server Running**
   ```bash
   cd backend
   npm run dev
   ```
   Backend should be running on `http://localhost:3000`

2. **Frontend App Running**
   ```bash
   cd apps/paylinq
   pnpm dev
   ```
   Frontend should be running on `http://localhost:5174`

3. **Test Database**
   - Ensure you have a test database with sample data
   - At least one test user with valid credentials

## Running Tests

### Run all E2E tests (headless)
```bash
pnpm test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
pnpm test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
pnpm test:e2e:headed
```

### Debug tests
```bash
pnpm test:e2e:debug
```

### Run specific test file
```bash
npx playwright test e2e/payroll-run.spec.ts
```

### Run specific test by name
```bash
npx playwright test -g "should create a new payroll run"
```

## Environment Variables

Create a `.env.test` file in the paylinq app directory:

```env
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test123
TEST_BASE_URL=http://localhost:5174
TEST_API_URL=http://localhost:3000
```

## Test Structure

```
e2e/
├── payroll-run.spec.ts       # Main payroll run workflow tests
├── fixtures.ts                # Shared test fixtures and helpers
└── README.md                  # This file
```

## What's Being Tested

### Payroll Run Workflow
1. ✅ Creating a new payroll run
2. ✅ Verifying it appears in the list
3. ✅ Filtering runs by status
4. ✅ Viewing run details
5. ✅ Calculating payroll
6. ✅ Approving payroll runs
7. ✅ Searching payroll runs
8. ✅ Sorting by different columns
9. ✅ Pagination
10. ✅ Validation error handling
11. ✅ Deleting draft runs
12. ✅ Loading states
13. ✅ Empty states

### Payroll Run Details View
1. ✅ Displaying summary information
2. ✅ Showing paychecks list
3. ✅ Navigation

## Test Data

Tests create their own data with unique timestamps to avoid conflicts:
- Payroll run names include timestamp: `E2E Test Run - 1699478400000`
- This ensures each test run is independent

## Troubleshooting

### Tests failing with timeout
- Ensure both backend and frontend are running
- Check if the ports (3000 and 5174) are correct
- Increase timeout in `playwright.config.ts`

### Login fails
- Update test credentials in `.env.test` or `fixtures.ts`
- Ensure test user exists in database
- Check if login endpoint is working

### Elements not found
- Add `data-testid` attributes to components for more reliable selectors
- Check if component structure matches selectors in tests
- Use Playwright Inspector: `pnpm test:e2e:debug`

### Visual debugging
```bash
# Run with trace viewer
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Wait for navigation** after actions that cause route changes
3. **Clean up test data** when possible (delete created runs)
4. **Use unique identifiers** (timestamps) for test data
5. **Test real user workflows** not implementation details

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Install Playwright Browsers
  run: cd apps/paylinq && npx playwright install --with-deps chromium

- name: Run E2E Tests
  run: cd apps/paylinq && pnpm test:e2e
  env:
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

- name: Upload Test Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: apps/paylinq/playwright-report/
```

## Viewing Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Adding New Tests

1. Create a new spec file in `e2e/` directory
2. Import test fixtures: `import { test, expect } from './fixtures';`
3. Use descriptive test names that explain the user action
4. Follow the existing test structure
5. Run tests locally before committing

## Related Documentation

- [Playwright Documentation](https://playwright.dev)
- [Paylinq Testing Standards](../../../docs/TESTING_STANDARDS.md)
- [Backend API Documentation](../../../backend/README.md)
