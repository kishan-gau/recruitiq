# Nexus E2E Integration Test Suite

## Overview
Comprehensive end-to-end testing suite for the Nexus HR Management System covering all major workflows and cross-module interactions.

## Test Coverage Summary

### Total Statistics
- **Total E2E Test Files**: 4
- **Total E2E Tests**: 78
- **Total Lines of Test Code**: 1,673

### Test Files Breakdown

#### 1. employees.spec.ts (20 tests, 391 lines)
Employee CRUD workflow and list features:
- Display employees list with search and filters
- Search and filter employees
- Create new employees with validation
- View employee details and navigate tabs
- Edit and update employees
- Terminate employees with modal confirmation
- Delete employees from list
- Cancel operations
- Display empty states and counts
- Employee badges and avatars

#### 2. departments.spec.ts (16 tests, 297 lines)
Department management and hierarchy:
- Display departments list with hierarchy
- Search departments by name
- Filter departments by status
- Navigate to create/edit pages
- Validation errors for empty forms
- Create departments with/without parents
- View department details with hierarchy
- Update department information
- Display parent/children relationships
- Show employees in departments
- Cancel creation/edit operations
- Delete department modal
- Empty state handling

#### 3. locations.spec.ts (24 tests, 421 lines)
Location management with comprehensive validation:
- Display locations list with filters
- Search by name, code, city, country
- Filter by location type and status
- Navigate to create/edit pages
- **Validation Tests**:
  - Empty form validation
  - Location code format (uppercase, numbers, hyphens)
  - Email format validation
  - Phone number format validation
- Create locations with required/optional fields
- View location details (info, address, contact)
- Display location address correctly
- Display contact information
- Update location information
- Show employees at location
- Cancel creation/edit operations
- Delete location modal
- Location type badges (headquarters, branch, remote, warehouse, store)
- Active/inactive status display
- Empty state and count display

#### 4. cross-module-integration.spec.ts (18 tests, 564 lines)
Cross-module workflows and integrations:
- **Navigation Tests**:
  - Navigate between employees, departments, and locations
  - Display breadcrumbs/navigation path
- **Employee Assignment Tests**:
  - Create employee with department assignment
  - Create employee with location assignment
  - Create employee with both department and location
  - View employee and see assigned department
  - View employee and see assigned location
- **Department-Employee Integration**:
  - Navigate from department to view employees
  - Search employees in specific department
  - Edit employee and change department
- **Location-Employee Integration**:
  - Navigate from location to view employees
  - Search employees in specific location
  - Edit employee and change location
- **Hierarchy Management**:
  - Create department hierarchy with parent/child
  - Assign employees to hierarchical departments
- **Complex Workflows**:
  - Create location and department, then assign to employee
  - Handle concurrent creation of department and location
- **Referential Integrity**:
  - Validate cannot delete department with employees
  - Validate cannot delete location with employees

## Test Patterns & Best Practices

### Configuration
```typescript
const BASE_URL = 'http://localhost:5175';
```

### Setup Pattern
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE_URL}/path`);
  await page.waitForLoadState('networkidle');
});
```

### Common Patterns Used
1. **Wait for page load**: `await page.waitForLoadState('networkidle')`
2. **Wait for elements**: `await page.waitForSelector('table', { timeout: 10000 })`
3. **Wait for operations**: `await page.waitForTimeout(500)` (for async operations)
4. **Generate unique test data**: `const timestamp = Date.now()`
5. **Conditional testing**: Check if elements exist before interacting
6. **Modal handling**: Click to open, verify presence, click to close
7. **Form validation**: Submit empty forms and check for error messages

### Accessibility Patterns
- Use semantic selectors: `getByRole()`, `getByLabel()`, `getByPlaceholder()`
- Test keyboard navigation with `await user.tab()`
- Verify ARIA labels and accessibility attributes

## Running the Tests

### Run All E2E Tests
```bash
cd apps/nexus
pnpm playwright test
```

### Run Specific Test File
```bash
pnpm playwright test e2e/departments.spec.ts
pnpm playwright test e2e/locations.spec.ts
pnpm playwright test e2e/cross-module-integration.spec.ts
```

### Run Tests in UI Mode
```bash
pnpm playwright test --ui
```

### Run Tests in Headed Mode (See Browser)
```bash
pnpm playwright test --headed
```

### Run Tests in Specific Browser
```bash
pnpm playwright test --project=chromium
pnpm playwright test --project=firefox
pnpm playwright test --project=webkit
```

### Generate HTML Report
```bash
pnpm playwright show-report
```

## Test Data Management

### Unique Test Data Generation
All E2E tests generate unique identifiers using timestamps to avoid conflicts:
```typescript
const timestamp = Date.now();
const employeeNumber = `E2E${timestamp}`;
const email = `e2e.${timestamp}@example.com`;
```

### Data Cleanup
Tests are designed to:
- Use unique identifiers to avoid conflicts
- Not interfere with existing production-like data
- Be idempotent (can run multiple times)

## Prerequisites

### Backend Requirements
- Backend API running on `http://localhost:3000`
- Database seeded with initial test data (departments, locations)

### Frontend Requirements
- Nexus app running on `http://localhost:5175`
- All routes configured and accessible

### Test Environment
```bash
# Start backend
cd backend
npm run dev

# Start frontend (in new terminal)
cd apps/nexus
pnpm dev

# Run tests (in new terminal)
cd apps/nexus
pnpm playwright test
```

## Test Coverage Areas

### ✅ Fully Covered
- Employee CRUD operations
- Department management with hierarchy
- Location management with full validation
- Cross-module navigation
- Form validation (required fields, format validation)
- Modal interactions (delete confirmations)
- Search and filter functionality
- Empty state handling
- Employee-Department assignment
- Employee-Location assignment
- Referential integrity checks

### 🔄 Partial Coverage
- Performance metrics (not tested)
- Real file uploads (using mock data)
- Advanced search queries
- Pagination (if implemented)
- Sorting (if implemented)

### 📋 Not Yet Covered
- Authentication flows (bypassed in tests)
- Role-based permissions
- Bulk operations
- Export/Import functionality
- Audit logs
- Email notifications
- Real-time updates

## Success Criteria

Each test should:
1. ✅ Start with clean state (beforeEach)
2. ✅ Use unique test data
3. ✅ Verify UI elements are visible
4. ✅ Check correct navigation
5. ✅ Validate form submissions
6. ✅ Confirm data persistence
7. ✅ Handle edge cases gracefully
8. ✅ Clean up or isolate test data

## Troubleshooting

### Common Issues

**Issue**: Tests timeout
- **Solution**: Increase timeout in `playwright.config.ts` or specific test
- **Check**: Backend is running and responding

**Issue**: Element not found
- **Solution**: Increase wait time or check selector specificity
- **Check**: UI elements match test selectors (labels, roles, placeholders)

**Issue**: Flaky tests
- **Solution**: Add proper waits (`waitForLoadState`, `waitForSelector`)
- **Avoid**: Hard-coded `waitForTimeout` where possible

**Issue**: Tests fail in CI but pass locally
- **Solution**: Use `waitForLoadState('networkidle')` consistently
- **Check**: CI environment has sufficient resources

## Future Enhancements

1. **Visual Regression Testing**: Add screenshot comparisons
2. **Performance Testing**: Measure page load times
3. **Accessibility Testing**: Automated a11y checks with axe-core
4. **API Testing**: Verify backend responses directly
5. **Mobile Testing**: Add mobile viewport tests
6. **Network Conditions**: Test with slow/offline conditions
7. **Internationalization**: Test with different locales
8. **Dark Mode**: Verify dark theme rendering

## Maintenance

### When to Update Tests

- **New Features**: Add tests for new pages/components
- **Bug Fixes**: Add regression tests
- **UI Changes**: Update selectors if elements change
- **API Changes**: Update form data if schema changes

### Test Naming Convention
```typescript
test('should [action] [expected result]', async ({ page }) => {
  // Test implementation
});
```

### File Organization
```
e2e/
├── employees.spec.ts           # Employee module tests
├── departments.spec.ts         # Department module tests
├── locations.spec.ts           # Location module tests
└── cross-module-integration.spec.ts  # Cross-module workflows
```

## Contributing

When adding new E2E tests:
1. Follow existing patterns and naming conventions
2. Use semantic selectors (getByRole, getByLabel)
3. Add proper waits and error handling
4. Generate unique test data with timestamps
5. Document complex workflows
6. Keep tests focused and independent
7. Verify tests pass in all browsers

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    cd apps/nexus
    pnpm playwright test --reporter=html
    
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: apps/nexus/playwright-report/
```

## Metrics

- **Test Execution Time**: ~5-10 minutes (all tests)
- **Test Stability**: Target >95% pass rate
- **Code Coverage**: E2E tests cover critical user workflows
- **Maintenance Effort**: Low (stable selectors, good patterns)

---

**Last Updated**: November 7, 2025
**Test Suite Version**: 1.0.0
**Playwright Version**: As per package.json
