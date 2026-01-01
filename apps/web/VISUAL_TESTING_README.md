# Visual Regression Testing for Payroll Frontend

This document describes the visual regression testing setup for the payroll frontend using Percy and Chromatic.

## Overview

Visual regression testing captures screenshots of UI components and pages, then compares them against baseline images to detect unintended visual changes. This helps catch CSS bugs, layout issues, and unintended design changes.

## Tools Used

### Percy (Primary)
- **Purpose**: Visual regression testing with Playwright
- **Features**: 
  - Responsive snapshots across multiple viewports (mobile, tablet, desktop)
  - Automatic visual diffing
  - Review UI for approving/rejecting changes
  - CI/CD integration

### Chromatic (Alternative)
- **Purpose**: Visual testing for Storybook components
- **Features**:
  - Component-level visual testing
  - Automatic PR integration
  - Visual review workflow

## Setup

### 1. Install Dependencies

Dependencies are already added to `package.json`:

```bash
cd apps/web
pnpm install
```

Key packages:
- `@percy/cli` - Percy command-line interface
- `@percy/playwright` - Percy integration for Playwright
- `chromatic` - Chromatic CLI tool

### 2. Configure Percy

Set up your Percy project token:

```bash
# Add to .env.local
PERCY_TOKEN=your_percy_token_here
```

Get your token from: https://percy.io/settings

### 3. Configure Chromatic

Set up your Chromatic project token:

```bash
# Add to .env.local
CHROMATIC_PROJECT_TOKEN=your_chromatic_token_here
```

Get your token from: https://www.chromatic.com/start

## Configuration Files

### .percyrc.yml
Percy configuration for responsive snapshots and rendering options.

```yaml
version: 2
snapshot:
  widths: [375, 768, 1280, 1920]  # Mobile, Tablet, Desktop, Large Desktop
  min-height: 1024
  enable-javascript: true
```

### chromatic.config.json
Chromatic configuration for build and upload settings.

## Running Visual Tests

### Percy Tests

Run visual regression tests with Percy:

```bash
# Run all visual tests
pnpm test:visual

# Run specific test file
percy exec -- playwright test src/__tests__/visual/payroll/payroll-components.visual.spec.ts

# Run with specific viewport
percy exec -- playwright test --project=chromium
```

### Chromatic Tests

Run Chromatic visual tests:

```bash
# Run Chromatic tests
pnpm test:chromatic

# Or directly with CLI
chromatic --project-token=${CHROMATIC_PROJECT_TOKEN}
```

## Test Structure

### Visual Test Files

Visual tests are located in `src/__tests__/visual/`:

```
src/__tests__/visual/
└── payroll/
    └── payroll-components.visual.spec.ts  # Main visual regression tests
```

### Test Organization

Tests are organized by:
1. **Components** - Individual component snapshots
2. **Pages** - Full page snapshots
3. **Modals** - Modal dialog snapshots
4. **Forms** - Complex form snapshots
5. **Responsive** - Multi-viewport snapshots
6. **States** - Different UI states (loading, error, success)

## Writing Visual Tests

### Basic Snapshot

```typescript
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('should capture dashboard', async ({ page }) => {
  await page.goto('/payroll');
  await percySnapshot(page, 'Payroll Dashboard');
});
```

### Responsive Snapshots

```typescript
test('should capture responsive layout', async ({ page }) => {
  await page.goto('/payroll/compensation');
  
  // Desktop
  await page.setViewportSize({ width: 1280, height: 800 });
  await percySnapshot(page, 'Compensation - Desktop');
  
  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await percySnapshot(page, 'Compensation - Mobile');
});
```

### Component States

```typescript
test('should capture modal states', async ({ page }) => {
  await page.goto('/payroll/deductions');
  
  // Initial state
  await page.click('button:has-text("Add Deduction")');
  await percySnapshot(page, 'Deduction Modal - Empty');
  
  // Filled state
  await page.fill('input[name="deductionName"]', 'Health Insurance');
  await percySnapshot(page, 'Deduction Modal - Filled');
  
  // Error state
  await page.click('button:has-text("Save")');
  await percySnapshot(page, 'Deduction Modal - Validation Errors');
});
```

## Test Coverage

### Payroll Components Covered

1. **Dashboard Views**
   - Payroll dashboard across viewports
   - Summary cards and statistics

2. **List Pages**
   - Payroll runs list
   - Tax rules list
   - Deductions list
   - Compensation components list

3. **Modals**
   - Create payroll run modal
   - Process payroll modal
   - Add/edit deduction modal
   - Pay component form modal
   - Tax rule form modal

4. **Forms**
   - Tax rule creation form
   - Deduction assignment form
   - Pay component configuration
   - Formula builder

5. **Responsive Layouts**
   - All major pages at 4 viewport sizes
   - Mobile navigation
   - Tablet layouts

## Review Workflow

### 1. Run Tests Locally

```bash
pnpm test:visual
```

### 2. Review Changes in Percy Dashboard

1. Go to https://percy.io
2. Select your project
3. View the build with changes
4. Review visual diffs
5. Approve or reject changes

### 3. CI/CD Integration

Percy automatically runs on pull requests:

```yaml
# .github/workflows/visual-tests.yml
name: Visual Tests
on: [pull_request]
jobs:
  percy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: pnpm install
      - name: Run Percy tests
        run: pnpm test:visual
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

## Best Practices

### 1. Stable Snapshots

- Wait for network idle before capturing
- Hide dynamic content (timestamps, random IDs)
- Use fixed data in tests
- Disable animations

```typescript
test('should capture stable snapshot', async ({ page }) => {
  await page.goto('/payroll/runs');
  await page.waitForLoadState('networkidle');
  
  // Hide dynamic timestamps
  await page.evaluate(() => {
    document.querySelectorAll('.timestamp').forEach(el => el.style.display = 'none');
  });
  
  await percySnapshot(page, 'Payroll Runs - Stable');
});
```

### 2. Meaningful Names

Use descriptive snapshot names:

```typescript
// ❌ Bad
await percySnapshot(page, 'Test 1');

// ✅ Good
await percySnapshot(page, 'Payroll Dashboard - Desktop - Logged In User');
```

### 3. Test Important States

Capture key UI states:

- Empty states
- Loading states
- Error states
- Success states
- Filled forms
- Validation errors

### 4. Responsive Testing

Always test responsive layouts:

```typescript
const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
};

for (const [name, viewport] of Object.entries(viewports)) {
  await page.setViewportSize(viewport);
  await percySnapshot(page, `Component - ${name}`);
}
```

## Troubleshooting

### Percy Token Issues

If Percy authentication fails:

```bash
# Check token is set
echo $PERCY_TOKEN

# Set token manually
export PERCY_TOKEN=your_token_here
```

### Snapshot Differences

If unexpected differences appear:

1. Check for dynamic content (timestamps, IDs)
2. Verify font loading is complete
3. Wait for animations to finish
4. Check for race conditions in data loading

### CI/CD Failures

If visual tests fail in CI:

1. Run locally to reproduce
2. Check environment variables
3. Verify dependencies are installed
4. Review Percy build logs

## Maintenance

### Updating Baselines

When intentional visual changes are made:

1. Run visual tests: `pnpm test:visual`
2. Review changes in Percy dashboard
3. Approve new snapshots as baselines
4. Percy automatically updates baselines

### Adding New Tests

When adding new components:

1. Create test in `src/__tests__/visual/payroll/`
2. Follow existing test structure
3. Run locally to verify
4. Add to CI/CD pipeline

## Resources

- [Percy Documentation](https://docs.percy.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Chromatic Documentation](https://www.chromatic.com/docs/)
- [Visual Testing Best Practices](https://percy.io/blog/visual-testing-best-practices)

## Support

For issues or questions:
- Check Percy dashboard for error details
- Review Playwright logs
- Consult team lead for guidance
- Refer to `docs/TESTING_STANDARDS.md`
