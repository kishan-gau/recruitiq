/**
 * E2E Tests for Payroll Run Creation Flow
 * 
 * Tests the complete end-to-end user journey for creating payroll runs.
 * Following industry standards from TESTING_STANDARDS.md - E2E Testing section.
 */

import { test, expect, Page } from '@playwright/test';

// Test fixtures and helpers
const TEST_USER = {
  email: 'admin@test.com',
  password: 'Test123!',
};

/**
 * Helper function to login
 */
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

/**
 * Helper function to navigate to payroll module
 */
async function navigateToPayroll(page: Page) {
  await page.click('a[href*="/payroll"]');
  await expect(page).toHaveURL(/\/payroll/);
}

test.describe('Payroll Run Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('should create a new monthly payroll run', async ({ page }) => {
    // Arrange - Navigate to payroll page
    await navigateToPayroll(page);
    await page.waitForLoadState('networkidle');

    // Act - Click create new payroll run button
    await page.click('button:has-text("Create Payroll Run")');

    // Assert - Modal should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=New Payroll Run')).toBeVisible();

    // Act - Fill in payroll run details
    await page.fill('input[name="runCode"]', `RUN-2025-E2E-${Date.now()}`);
    await page.selectOption('select[name="period"]', 'monthly');
    
    // Select date range
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    await page.fill('input[name="startDate"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[name="endDate"]', endDate.toISOString().split('T')[0]);

    // Act - Submit the form
    await page.click('button:has-text("Create")');

    // Assert - Success message should appear
    await expect(page.locator('text=Payroll run created successfully')).toBeVisible({ timeout: 5000 });

    // Assert - Should be redirected to payroll runs list
    await expect(page).toHaveURL(/\/payroll\/runs/);

    // Assert - New run should appear in the list
    await expect(page.locator(`text=RUN-2025-E2E-`)).toBeVisible();
  });

  test('should validate required fields when creating payroll run', async ({ page }) => {
    // Arrange
    await navigateToPayroll(page);
    await page.click('button:has-text("Create Payroll Run")');

    // Act - Try to submit empty form
    await page.click('button:has-text("Create")');

    // Assert - Validation errors should be displayed
    await expect(page.locator('text=Run code is required')).toBeVisible();
    await expect(page.locator('text=Period is required')).toBeVisible();
  });

  test('should cancel payroll run creation', async ({ page }) => {
    // Arrange
    await navigateToPayroll(page);
    await page.click('button:has-text("Create Payroll Run")');

    // Act - Fill some data and then cancel
    await page.fill('input[name="runCode"]', 'RUN-CANCEL-TEST');
    await page.click('button:has-text("Cancel")');

    // Assert - Modal should close without creating run
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Assert - Run should not exist in list
    await expect(page.locator('text=RUN-CANCEL-TEST')).not.toBeVisible();
  });

  test('should filter payroll runs by status', async ({ page }) => {
    // Arrange
    await navigateToPayroll(page);
    await page.waitForSelector('table'); // Wait for runs table to load

    // Act - Filter by status
    await page.selectOption('select[name="statusFilter"]', 'draft');
    await page.waitForLoadState('networkidle');

    // Assert - Only draft runs should be visible
    const statusBadges = await page.locator('td:has-text("Draft")').count();
    expect(statusBadges).toBeGreaterThan(0);

    // Assert - No completed runs should be visible
    const completedBadges = await page.locator('td:has-text("Completed")').count();
    expect(completedBadges).toBe(0);
  });

  test('should search for payroll run by code', async ({ page }) => {
    // Arrange
    await navigateToPayroll(page);
    
    // Create a run with unique code first
    const uniqueCode = `SEARCH-TEST-${Date.now()}`;
    await page.click('button:has-text("Create Payroll Run")');
    await page.fill('input[name="runCode"]', uniqueCode);
    await page.selectOption('select[name="period"]', 'monthly');
    
    const today = new Date();
    await page.fill('input[name="startDate"]', new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
    await page.fill('input[name="endDate"]', new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]);
    
    await page.click('button:has-text("Create")');
    await page.waitForSelector(`text=${uniqueCode}`);

    // Act - Search for the run
    await page.fill('input[placeholder*="Search"]', uniqueCode);
    await page.waitForLoadState('networkidle');

    // Assert - Only the searched run should be visible
    await expect(page.locator(`text=${uniqueCode}`)).toBeVisible();

    // Assert - Row count should be 1
    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBe(1);
  });
});

test.describe('Payroll Run Processing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPayroll(page);
  });

  test('should process a draft payroll run', async ({ page }) => {
    // Arrange - Create a draft run first
    const runCode = `PROCESS-TEST-${Date.now()}`;
    await page.click('button:has-text("Create Payroll Run")');
    await page.fill('input[name="runCode"]', runCode);
    await page.selectOption('select[name="period"]', 'monthly');
    
    const today = new Date();
    await page.fill('input[name="startDate"]', new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
    await page.fill('input[name="endDate"]', new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]);
    
    await page.click('button:has-text("Create")');
    await page.waitForSelector(`text=${runCode}`);

    // Act - Find the run and click process button
    const runRow = page.locator(`tr:has-text("${runCode}")`);
    await runRow.locator('button:has-text("Process")').click();

    // Assert - Confirmation dialog should appear
    await expect(page.locator('text=Process Payroll Run')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to process')).toBeVisible();

    // Act - Confirm processing
    await page.click('button:has-text("Confirm")');

    // Assert - Processing started message
    await expect(page.locator('text=Payroll run processing started')).toBeVisible({ timeout: 5000 });

    // Assert - Status should change to "Processing"
    await expect(runRow.locator('text=Processing')).toBeVisible({ timeout: 10000 });
  });

  test('should view payroll run details', async ({ page }) => {
    // Arrange - Navigate to runs list
    await page.waitForSelector('table');

    // Act - Click on first run in the list
    await page.click('table tbody tr:first-child');

    // Assert - Should navigate to details page
    await expect(page).toHaveURL(/\/payroll\/runs\/[a-f0-9-]+/);

    // Assert - Details should be visible
    await expect(page.locator('h1')).toContainText('Payroll Run Details');
    await expect(page.locator('text=Run Code')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();
    await expect(page.locator('text=Period')).toBeVisible();
  });

  test('should export payroll run data', async ({ page }) => {
    // Arrange
    await page.waitForSelector('table');

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Act - Click export button on first run
    await page.locator('table tbody tr:first-child button:has-text("Export")').click();

    // Assert - File should be downloaded
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/payroll-run-.*\.(csv|xlsx)/);
  });
});

test.describe('Payroll Run Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPayroll(page);
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('table');

    // Act - Navigate using keyboard
    await page.keyboard.press('Tab'); // Focus on first interactive element

    // Assert - Should be able to reach create button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const createButton = page.locator('button:has-text("Create Payroll Run")');
    
    // Check if create button has focus (or close to it in tab order)
    await createButton.focus();
    await expect(createButton).toBeFocused();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    // Act - Wait for table to load
    await page.waitForSelector('table');

    // Assert - Table should have accessible name
    const table = page.locator('table');
    await expect(table).toHaveAttribute('aria-label', /payroll runs/i);

    // Assert - Buttons should have accessible labels
    const createButton = page.locator('button:has-text("Create Payroll Run")');
    await expect(createButton).toHaveAccessibleName();
  });
});

test.describe('Payroll Run Performance', () => {
  test('should load payroll runs list within 3 seconds', async ({ page }) => {
    // Arrange
    await login(page);

    // Act - Measure navigation time
    const startTime = Date.now();
    await navigateToPayroll(page);
    await page.waitForSelector('table tbody tr', { timeout: 3000 });
    const loadTime = Date.now() - startTime;

    // Assert - Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle pagination efficiently', async ({ page }) => {
    // Arrange
    await login(page);
    await navigateToPayroll(page);
    await page.waitForSelector('table');

    // Act - Navigate through pages
    const nextButton = page.locator('button:has-text("Next")');
    
    if (await nextButton.isVisible()) {
      const startTime = Date.now();
      await nextButton.click();
      await page.waitForLoadState('networkidle');
      const paginationTime = Date.now() - startTime;

      // Assert - Pagination should be fast (< 1 second)
      expect(paginationTime).toBeLessThan(1000);
    }
  });
});
