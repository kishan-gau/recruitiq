# Test Requirements & Standards Guide

## 📋 Table of Contents
1. [Test Creation Requirements](#test-creation-requirements)
2. [Test Structure Standards](#test-structure-standards)
3. [Running Tests](#running-tests)
4. [Writing New Tests](#writing-new-tests)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Test Creation Requirements

### What Every Test Case MUST Have

#### 1. **Clear Test Description**
```typescript
// ✅ GOOD - Descriptive and specific
test('should validate job title is required when clicking next', async ({ page }) => {

// ❌ BAD - Vague and unclear
test('test validation', async ({ page }) => {
```

#### 2. **Proper Test Structure (AAA Pattern)**
Every test should follow **Arrange-Act-Assert**:

```typescript
test('should create a job successfully', async ({ page }) => {
  // ARRANGE - Set up test preconditions
  await page.goto('/jobs/new');
  await page.waitForLoadState('networkidle');
  
  // ACT - Perform the action being tested
  await page.getByLabel('Job Title').fill('Software Engineer');
  await page.getByRole('button', { name: 'Save' }).click();
  
  // ASSERT - Verify the expected outcome
  await expect(page.getByText('Job created successfully')).toBeVisible();
  await expect(page).toHaveURL(/\/jobs$/);
});
```

#### 3. **Stable Selectors**
Use selectors in this priority order:

| Priority | Selector Type | Example | Why |
|----------|---------------|---------|-----|
| 1 | `data-testid` | `page.getByTestId('job-title-input')` | Most stable, purpose-built |
| 2 | Role + Name | `page.getByRole('button', { name: 'Save' })` | Semantic, accessible |
| 3 | Label | `page.getByLabel('Job Title')` | User-facing, clear intent |
| 4 | Text | `page.getByText('Create Job')` | Simple, but can break with copy changes |
| 5 | CSS Classes | `.job-form-title` | Avoid - can change with styling |

**Adding data-testid to Components:**
```jsx
// In your component
<input 
  id="job-title"
  data-testid="job-title-input"  {/* ✅ Add this */}
  value={title}
  onChange={handleChange}
/>
```

#### 4. **Proper Wait Strategies**
```typescript
// ✅ GOOD - Wait for specific conditions
await page.waitForLoadState('networkidle');
await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();

// ❌ BAD - Arbitrary timeouts
await page.waitForTimeout(3000);  // Flaky and slow
```

#### 5. **Error Context**
```typescript
test('should show validation error', async ({ page }) => {
  await page.getByRole('button', { name: 'Next' }).click();
  
  // ✅ GOOD - Clear assertion with specific message
  await expect(page.getByText(/title is required/i)).toBeVisible({
    timeout: 5000
  });
  
  // Add context for debugging
  const errors = await page.locator('.error-message').allTextContents();
  console.log('Validation errors:', errors);
});
```

#### 6. **Cleanup and Isolation**
```typescript
test.describe('Job Creation', () => {
  // Run before each test - ensures clean state
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs/new');
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
  });
  
  // Run after each test - cleanup
  test.afterEach(async ({ page }) => {
    // Delete any created test data
    // Take screenshot on failure
    if (test.info().status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/failure-${Date.now()}.png` 
      });
    }
  });
});
```

---

## Test Structure Standards

### Directory Structure
```
e2e/
├── tests/                      # Playwright test files (.spec.ts)
│   ├── job-creation.spec.ts
│   ├── hiring-flows.spec.ts
│   └── ...
├── features/                   # Gherkin feature files (.feature)
│   ├── job-creation.feature
│   └── hiring-flows.feature
├── fixtures/                   # Test data and mock data
│   ├── jobs.json
│   └── users.json
├── helpers/                    # Reusable test utilities
│   ├── auth.ts
│   └── test-data.ts
├── snapshots/                  # Visual regression baselines
└── playwright.config.ts        # Playwright configuration
```

### File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Test files | `<feature>.spec.ts` | `job-creation.spec.ts` |
| Feature files | `<feature>.feature` | `job-creation.feature` |
| Helper files | `<purpose>.ts` | `auth-helper.ts` |
| Fixtures | `<data-type>.json` | `mock-jobs.json` |

### Test Organization

```typescript
import { test, expect } from '@playwright/test';

/**
 * Test Suite Title
 * Brief description of what this suite tests
 */

// Group related tests
test.describe('Feature Name - Category', () => {
  // Setup for all tests in this group
  test.beforeEach(async ({ page }) => {
    // Common setup
  });
  
  // Individual test cases
  test('should do something specific', async ({ page }) => {
    // Test implementation
  });
  
  test('should handle error case', async ({ page }) => {
    // Test implementation
  });
});

// Another category
test.describe('Feature Name - Another Category', () => {
  // More tests
});
```

---

## Running Tests

### Available Commands

```powershell
# Run all Playwright tests
npm run test:visual

# Run all Vitest unit tests
npm test

# Run specific test file
npx playwright test job-creation.spec.ts

# Run tests with specific name
npx playwright test -g "should create a job"

# Run in headed mode (see browser)
npx playwright test --headed

# Run in UI mode (interactive debugging)
npx playwright test --ui

# Run in debug mode
npx playwright test --debug

# Update visual snapshots
npx playwright test --update-snapshots

# Generate HTML report
npx playwright show-report
```

### Test Modes

| Mode | Command | When to Use |
|------|---------|-------------|
| **Headless** | `npm run test:visual` | CI/CD, fast execution |
| **Headed** | `npx playwright test --headed` | Debugging UI issues |
| **UI Mode** | `npx playwright test --ui` | Interactive development |
| **Debug** | `npx playwright test --debug` | Step-by-step debugging |

### Filtering Tests

```powershell
# Run only job creation tests
npx playwright test job-creation

# Run only hiring flow tests
npx playwright test hiring-flows

# Run specific test by name
npx playwright test -g "should validate"

# Run tests matching pattern
npx playwright test -g "validation"

# Skip tests
npx playwright test --grep-invert "skip this"
```

---

## Writing New Tests

### Step-by-Step Checklist

- [ ] **1. Identify the Feature**
  - What functionality are you testing?
  - What user flow does it cover?
  - What edge cases exist?

- [ ] **2. Choose Test Type**
  - **E2E (Playwright):** User flows, integration testing
  - **Unit (Vitest):** Component logic, utilities, hooks
  - **Visual:** Screenshot comparisons

- [ ] **3. Write Test Outline**
  ```typescript
  test.describe('Feature Name - Category', () => {
    test.beforeEach(async ({ page }) => {
      // Setup
    });
    
    test('happy path test name', async ({ page }) => {
      // Arrange
      // Act
      // Assert
    });
    
    test('validation test name', async ({ page }) => {
      // Arrange
      // Act
      // Assert
    });
    
    test('edge case test name', async ({ page }) => {
      // Arrange
      // Act
      // Assert
    });
  });
  ```

- [ ] **4. Implement Test**
  - Use stable selectors
  - Add proper waits
  - Make clear assertions
  - Add error context

- [ ] **5. Run and Verify**
  ```powershell
  npx playwright test your-test.spec.ts --headed
  ```

- [ ] **6. Handle Failures**
  - Check error context
  - Review screenshots
  - Add better waits if needed
  - Update selectors if UI changed

- [ ] **7. Document**
  - Add JSDoc comments
  - Update this file if needed
  - Note any setup requirements

### Test Template

```typescript
import { test, expect } from '@playwright/test';

/**
 * [Feature Name] Test Suite
 * 
 * Tests the [feature description] functionality including:
 * - Happy path flows
 * - Validation rules
 * - Edge cases
 * - Error handling
 */

test.describe('[Feature] - [Category]', () => {
  /**
   * Setup: Runs before each test in this describe block
   */
  test.beforeEach(async ({ page }) => {
    // Navigate to the page
    await page.goto('/your-route');
    await page.waitForLoadState('networkidle');
    
    // Clear any stored state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  /**
   * Test: [Describe what this test does]
   * 
   * Given: [preconditions]
   * When: [action]
   * Then: [expected result]
   */
  test('should [expected behavior]', async ({ page }) => {
    // ARRANGE - Set up test data and preconditions
    const testData = {
      title: 'Test Job',
      department: 'Engineering'
    };
    
    // ACT - Perform the action being tested
    await page.getByLabel('Job Title').fill(testData.title);
    await page.getByLabel('Department').selectOption(testData.department);
    await page.getByRole('button', { name: 'Save' }).click();
    
    // ASSERT - Verify the expected outcomes
    await expect(page.getByText('Success')).toBeVisible();
    await expect(page).toHaveURL(/\/jobs$/);
    
    // Verify data persists
    await page.reload();
    await expect(page.getByText(testData.title)).toBeVisible();
  });
  
  /**
   * Test: Error handling scenario
   */
  test('should handle [error case]', async ({ page }) => {
    // Test implementation
  });
});
```

---

## Best Practices

### 1. **Test Independence**
✅ **Each test should be independent**
```typescript
// ✅ GOOD - Each test sets up its own data
test('test A', async ({ page }) => {
  await createTestJob('Job A');
  // test logic
});

test('test B', async ({ page }) => {
  await createTestJob('Job B');
  // test logic
});

// ❌ BAD - Tests depend on execution order
let jobId;
test('create job', async ({ page }) => {
  jobId = await createJob();  // Test B depends on this
});

test('edit job', async ({ page }) => {
  await editJob(jobId);  // Fails if test A doesn't run first
});
```

### 2. **Use Page Object Model for Complex Flows**
```typescript
// helpers/job-creation-page.ts
export class JobCreationPage {
  constructor(private page: Page) {}
  
  async navigateToNewJob() {
    await this.page.goto('/jobs/new');
    await this.page.waitForLoadState('networkidle');
  }
  
  async fillBasicInfo(data: { title: string; department: string }) {
    await this.page.getByLabel('Job Title').fill(data.title);
    await this.page.getByLabel('Department').selectOption(data.department);
  }
  
  async save() {
    await this.page.getByRole('button', { name: 'Save' }).click();
  }
}

// In test file
test('should create job', async ({ page }) => {
  const jobPage = new JobCreationPage(page);
  await jobPage.navigateToNewJob();
  await jobPage.fillBasicInfo({ title: 'Engineer', department: 'Eng' });
  await jobPage.save();
});
```

### 3. **Meaningful Test Data**
```typescript
// ✅ GOOD - Clear, readable test data
const testJob = {
  title: 'Senior Software Engineer',
  department: 'Engineering',
  location: 'San Francisco',
  salary: '$150,000 - $200,000'
};

// ❌ BAD - Cryptic or meaningless data
const testJob = {
  title: 'Test123',
  department: 'Dept1',
  location: 'Loc',
  salary: '100'
};
```

### 4. **Test Positive and Negative Cases**
```typescript
test.describe('Job Title Validation', () => {
  test('should accept valid job title', async ({ page }) => {
    await page.getByLabel('Job Title').fill('Software Engineer');
    await expect(page.getByLabel('Job Title')).toHaveValue('Software Engineer');
    await expect(page.locator('.error')).not.toBeVisible();
  });
  
  test('should reject empty job title', async ({ page }) => {
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/title is required/i)).toBeVisible();
  });
  
  test('should reject title that is too short', async ({ page }) => {
    await page.getByLabel('Job Title').fill('A');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/at least 2 characters/i)).toBeVisible();
  });
});
```

### 5. **Use Fixtures for Common Data**
```typescript
// fixtures/test-data.ts
export const TEST_JOBS = {
  valid: {
    title: 'Software Engineer',
    department: 'Engineering',
    location: 'San Francisco',
    type: 'full-time'
  },
  minimal: {
    title: 'Test Job',
    department: 'Engineering'
  },
  invalid: {
    title: '',  // Required field empty
    department: 'Engineering'
  }
};

// In test
import { TEST_JOBS } from '../fixtures/test-data';

test('should create job with valid data', async ({ page }) => {
  await fillJobForm(page, TEST_JOBS.valid);
  await expect(page.getByText('Success')).toBeVisible();
});
```

### 6. **Smart Assertions**
```typescript
// ✅ GOOD - Specific assertions
await expect(page.getByRole('heading')).toHaveText('Create Job');
await expect(page).toHaveURL(/\/jobs\/new$/);
await expect(page.getByLabel('Job Title')).toBeVisible();
await expect(page.getByLabel('Job Title')).toBeEnabled();

// ❌ BAD - Vague or multiple unrelated assertions
await expect(page.locator('div')).toBeVisible();  // Which div?
const text = await page.textContent('body');
expect(text).toContain('Create');
expect(text).toContain('Job');
expect(text).toContain('Save');  // Too broad
```

### 7. **Error Handling**
```typescript
test('should handle API errors', async ({ page, context }) => {
  // Mock API error
  await context.route('**/api/jobs', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    });
  });
  
  await page.getByRole('button', { name: 'Save' }).click();
  
  // Verify error is shown to user
  await expect(page.getByText(/something went wrong/i)).toBeVisible();
  
  // Verify user can retry
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});
```

### 8. **Visual Regression Tests**
```typescript
test('should match baseline screenshot', async ({ page }) => {
  await page.goto('/jobs/new');
  
  // Wait for dynamic content to load
  await page.waitForLoadState('networkidle');
  
  // Take screenshot and compare
  await expect(page).toHaveScreenshot('job-creation-form.png', {
    maxDiffPixels: 100,  // Allow minor differences
    threshold: 0.2       // 20% threshold
  });
});
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Timeout waiting for element"
```typescript
// ❌ Problem
await page.getByLabel('Job Title').fill('Test');  // Times out

// ✅ Solution 1: Add explicit wait
await page.waitForSelector('[data-testid="job-title"]', { state: 'visible' });
await page.getByLabel('Job Title').fill('Test');

// ✅ Solution 2: Increase timeout
await page.getByLabel('Job Title').fill('Test', { timeout: 10000 });

// ✅ Solution 3: Wait for network to settle first
await page.waitForLoadState('networkidle');
await page.getByLabel('Job Title').fill('Test');
```

#### Issue: "Element is not visible"
```typescript
// Check if element exists but is hidden
const element = page.getByLabel('Job Title');
console.log('Is visible:', await element.isVisible());
console.log('Is hidden:', await element.isHidden());

// Wait for element to be visible
await element.waitFor({ state: 'visible', timeout: 5000 });
```

#### Issue: "Tests fail in CI but pass locally"
```typescript
// Common causes:
// 1. Timing issues - add proper waits
await page.waitForLoadState('networkidle');

// 2. Screen size differences - set viewport
await page.setViewportSize({ width: 1280, height: 720 });

// 3. Missing authentication - mock or set up properly
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('/dashboard');
});
```

#### Issue: "Flaky tests (pass/fail randomly)"
```typescript
// Causes and solutions:

// ❌ Avoid: Race conditions
await page.click('button');
await page.click('another-button');  // May click before first action completes

// ✅ Use: Proper waits
await page.click('button');
await page.waitForResponse(resp => resp.url().includes('/api/save'));
await page.click('another-button');

// ❌ Avoid: Hard-coded waits
await page.waitForTimeout(2000);

// ✅ Use: Conditional waits
await page.waitForSelector('.loading', { state: 'hidden' });
```

#### Issue: "Element is covered by another element"
```typescript
// ❌ Problem: Element is behind modal or overlay
await page.getByRole('button', { name: 'Save' }).click();  // Fails

// ✅ Solution 1: Use force click
await page.getByRole('button', { name: 'Save' }).click({ force: true });

// ✅ Solution 2: Close overlay first
await page.getByRole('button', { name: 'Close Modal' }).click();
await page.getByRole('button', { name: 'Save' }).click();

// ✅ Solution 3: Scroll into view
await page.getByRole('button', { name: 'Save' }).scrollIntoViewIfNeeded();
await page.getByRole('button', { name: 'Save' }).click();
```

### Debugging Tips

```typescript
// 1. Take screenshots at key points
await page.screenshot({ path: 'debug-before-click.png' });
await page.click('button');
await page.screenshot({ path: 'debug-after-click.png' });

// 2. Log page content
const content = await page.content();
console.log('Page HTML:', content);

// 3. Log all visible text
const text = await page.textContent('body');
console.log('Page text:', text);

// 4. Pause test for inspection
await page.pause();  // Test will pause here

// 5. Enable verbose logging
DEBUG=pw:api npx playwright test

// 6. Generate trace
npx playwright test --trace on
npx playwright show-trace trace.zip
```

---

## Test Maintenance

### When to Update Tests

| Trigger | Action Required |
|---------|----------------|
| UI/UX changes | Update selectors, screenshots |
| New feature | Add new test coverage |
| Bug fix | Add regression test |
| API changes | Update mocks, request/response validation |
| Accessibility updates | Add/update A11y tests |

### Regular Maintenance Tasks

- [ ] **Weekly:** Review and fix failing tests
- [ ] **Monthly:** Update outdated selectors
- [ ] **Quarterly:** Review test coverage gaps
- [ ] **Per Release:** Update snapshots, run full suite

---

## Coverage Goals

### Target Coverage by Type

| Test Type | Target | Current | Status |
|-----------|--------|---------|--------|
| **E2E Critical Paths** | 100% | 100% | ✅ |
| **E2E Happy Paths** | 100% | 100% | ✅ |
| **Validation Rules** | 100% | 95% | 🟡 |
| **Edge Cases** | 80% | 85% | ✅ |
| **Error Handling** | 80% | 75% | 🟡 |
| **Visual Regression** | Key pages | 60% | 🟡 |
| **Accessibility** | WCAG AA | 40% | 🔴 |
| **Performance** | Key flows | 50% | 🟡 |

---

## Quick Reference

### Essential Playwright Assertions

```typescript
// Visibility
await expect(element).toBeVisible();
await expect(element).toBeHidden();

// Enabled/Disabled
await expect(element).toBeEnabled();
await expect(element).toBeDisabled();

// Text content
await expect(element).toHaveText('Expected text');
await expect(element).toContainText('partial text');

// Input values
await expect(input).toHaveValue('expected value');
await expect(input).toBeEmpty();

// Attributes
await expect(element).toHaveAttribute('data-testid', 'my-element');
await expect(element).toHaveClass('active');

// Count
await expect(list).toHaveCount(5);

// URL
await expect(page).toHaveURL(/\/jobs$/);
await expect(page).toHaveTitle('Job Board');
```

### Essential Playwright Actions

```typescript
// Navigation
await page.goto('/path');
await page.goBack();
await page.reload();

// Clicks
await page.click('button');
await page.dblclick('button');

// Forms
await page.fill('input', 'value');
await page.type('input', 'value', { delay: 100 });
await page.selectOption('select', 'option-value');
await page.check('checkbox');
await page.uncheck('checkbox');

// Keyboard
await page.press('input', 'Enter');
await page.keyboard.type('text');

// Waits
await page.waitForLoadState('networkidle');
await page.waitForSelector('.element');
await page.waitForURL('/path');
await page.waitForResponse(resp => resp.url().includes('/api'));
```

---

## Summary

### Required for Every New Test

1. ✅ Clear descriptive name
2. ✅ AAA structure (Arrange-Act-Assert)
3. ✅ Stable selectors (data-testid preferred)
4. ✅ Proper waits (no hard-coded timeouts)
5. ✅ Independent from other tests
6. ✅ Cleanup in afterEach
7. ✅ Error context for debugging
8. ✅ Documentation (JSDoc comments)

### Test Before Committing

```powershell
# 1. Run your specific test
npx playwright test your-test.spec.ts --headed

# 2. Run in different viewports
npx playwright test your-test.spec.ts --project=mobile

# 3. Run full suite to check for conflicts
npm run test:visual

# 4. Check for flakiness (run 3 times)
npx playwright test your-test.spec.ts --repeat-each=3
```

---

**Need Help?**
- Check existing tests for examples
- Review Playwright docs: https://playwright.dev
- See `TESTING_STRATEGY.md` for high-level approach
- See `STEP_DEFINITIONS_GUIDE.md` for Gherkin tests

**Happy Testing!** 🎯
