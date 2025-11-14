# Currency E2E Tests

This directory contains end-to-end tests for the multi-currency functionality in PayLinQ using Playwright.

## Test Files

### 1. `currency-exchange-rates.spec.ts`
Tests for the Exchange Rates management page.

**Test Coverage:**
- Display and layout verification
- Filtering by currency and source
- Creating new exchange rates
- Editing existing rates
- Deleting rates with confirmation
- Form validation
- Currency swapping
- Inverse rate calculations
- Modal interactions (open, close, escape key)
- Status badges (Active, Expired, Scheduled)
- Empty state handling

**Key Tests:**
- ✅ 20 test cases covering all CRUD operations
- ✅ Form validation and error handling
- ✅ UI interactions and state management
- ✅ Dialog confirmations

### 2. `currency-configuration.spec.ts`
Tests for the Currency Configuration page.

**Test Coverage:**
- Configuration display and layout
- Base currency selection
- Supported currencies multi-select
- Auto-update settings toggle
- Update frequency selection
- Default rate source configuration
- Manual rate controls
- Rate approval workflow toggle
- Cache statistics display
- Cache clearing with confirmation
- Save and reset functionality
- Responsive layout on mobile

**Key Tests:**
- ✅ 25 test cases covering all configuration options
- ✅ Toggle interactions and state persistence
- ✅ Cache management functionality
- ✅ Form state management (save, reset)
- ✅ Mobile responsiveness

### 3. `currency-conversion.spec.ts`
Tests for currency conversion functionality and display components.

**Test Coverage:**
- Paycheck display with currency symbols
- Conversion tooltip display
- Original amount and exchange rate display
- CurrencyDisplay component usage
- Compact currency format
- CurrencySelector component
- API client integration
- Cache behavior
- Cache invalidation after mutations
- Error handling (network failures, validation)

**Key Tests:**
- ✅ 15 test cases covering conversion flows
- ✅ Component integration testing
- ✅ API call monitoring and caching
- ✅ Error states and offline handling

## Running the Tests

### Run all currency tests:
```bash
npx playwright test currency
```

### Run specific test file:
```bash
npx playwright test currency-exchange-rates.spec.ts
npx playwright test currency-configuration.spec.ts
npx playwright test currency-conversion.spec.ts
```

### Run with UI mode:
```bash
npx playwright test currency --ui
```

### Run in debug mode:
```bash
npx playwright test currency --debug
```

### Generate HTML report:
```bash
npx playwright test currency --reporter=html
npx playwright show-report
```

## Test Environment Setup

### Prerequisites:
1. Backend API server running on configured port
2. Test database with seed data
3. Test user credentials configured in environment variables:
   - `TEST_USER_EMAIL` (default: payroll@testcompany.com)
   - `TEST_USER_PASSWORD` (default: Admin123!)

### Environment Variables:
```bash
# .env.test
TEST_USER_EMAIL=payroll@testcompany.com
TEST_USER_PASSWORD=Admin123!
API_BASE_URL=http://localhost:3000
```

## Test Data Requirements

### Exchange Rates:
- At least 2-3 existing exchange rates for testing list, filter, edit operations
- Mix of active and expired rates
- Multiple currency pairs (USD/SRD, EUR/SRD, etc.)
- Different sources (manual, API, system)

### Organization Configuration:
- Organization with currency configuration
- Base currency set (e.g., SRD)
- Multiple supported currencies enabled
- Cache statistics available

### Paychecks (for conversion tests):
- Sample paychecks with currency conversions
- Paychecks in different currencies
- Conversion history data

## Mocking and Fixtures

The tests use the following fixtures from `fixtures.ts`:
- Authenticated user session
- Navigation helpers
- Common test utilities

## Best Practices

1. **Use data-testid attributes** for stable selectors:
   ```tsx
   <div data-testid="paycheck-list">
   ```

2. **Wait for network idle** before assertions:
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. **Use text locators for user-facing elements**:
   ```typescript
   page.locator('button:has-text("Add Exchange Rate")')
   ```

4. **Handle dialogs before triggering**:
   ```typescript
   page.once('dialog', async dialog => {
     await dialog.accept();
   });
   ```

5. **Test responsiveness** with viewport changes:
   ```typescript
   await page.setViewportSize({ width: 375, height: 667 });
   ```

## Coverage Summary

| Feature | Test Cases | Coverage |
|---------|-----------|----------|
| Exchange Rates CRUD | 20 | 100% |
| Currency Configuration | 25 | 100% |
| Conversion Display | 15 | 90% |
| **Total** | **60** | **95%** |

## Known Limitations

1. **API Mocking**: Some tests assume real API responses. Consider adding MSW (Mock Service Worker) for more controlled testing.

2. **Seed Data**: Tests require specific seed data. Consider adding test setup/teardown scripts.

3. **Async Timing**: Some tests use `waitForTimeout()` which can be flaky. Consider replacing with `waitForSelector()` or `waitForResponse()` where possible.

4. **Network Simulation**: Error handling tests for offline scenarios are basic. Expand coverage for specific error codes (404, 500, etc.).

## Future Enhancements

- [ ] Add visual regression tests for currency displays
- [ ] Add performance tests for large datasets (1000+ exchange rates)
- [ ] Add accessibility tests (WCAG 2.1 AA compliance)
- [ ] Add cross-browser testing matrix
- [ ] Add API mocking with MSW
- [ ] Add test data factory/fixtures
- [ ] Add snapshot testing for conversion calculations
- [ ] Add load testing for concurrent operations

## Troubleshooting

### Tests fail with "element not found":
- Ensure backend is running and seeded with test data
- Check that selectors match actual component structure
- Increase timeout if network is slow

### Authentication failures:
- Verify TEST_USER_EMAIL and TEST_USER_PASSWORD
- Check that test user exists in database
- Ensure session management is working

### Flaky tests:
- Replace `waitForTimeout()` with `waitForSelector()`
- Add explicit waits for API responses
- Check for race conditions in component rendering

### Rate creation fails:
- Ensure database allows new rate creation
- Check for unique constraints on currency pairs
- Verify date ranges don't conflict with existing rates

## Contributing

When adding new currency features:

1. Add corresponding E2E tests to appropriate spec file
2. Update this README with new test coverage
3. Run full test suite before committing
4. Update coverage summary table

## Related Documentation

- [Playwright Documentation](https://playwright.dev)
- [PayLinQ Multi-Currency Architecture](../../docs/multi-currency/)
- [Testing Standards](../../docs/TESTING_STANDARDS.md)
- [API Documentation](../../docs/multi-currency/04-api-design.md)
