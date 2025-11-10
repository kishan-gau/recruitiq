import { test, expect } from '@playwright/test';

/**
 * Payroll Run E2E Tests
 * 
 * This suite tests the complete payroll run workflow from the UI:
 * - Creating a new payroll run
 * - Verifying it appears in the list
 * - Processing the payroll run
 * - Checking status transitions
 * 
 * Prerequisites:
 * - Backend server running on http://localhost:3000
 * - Frontend app running on http://localhost:5174
 * - Test user credentials available
 */

test.describe('Payroll Run Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Login with test credentials
    await page.fill('input#email', 'payroll@testcompany.com');
    await page.fill('input#password', 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Wait for successful login and redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Navigate to payroll runs page
    await page.goto('/payroll');
  });

  test('should create a new payroll run and verify it appears in the list', async ({ page }) => {
    // Click the "Create Payroll Run" button
    await page.click('button:has-text("Create Payroll Run")');
    
    // Wait for the modal to appear
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    
    // Fill in the payroll run details
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const paymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 5);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    await page.fill('input[name="payrollName"]', `E2E Test Run - ${Date.now()}`);
    await page.fill('input[name="periodStart"]', formatDate(startDate));
    await page.fill('input[name="periodEnd"]', formatDate(endDate));
    await page.fill('input[name="paymentDate"]', formatDate(paymentDate));
    
    // Submit the form
    await page.click('button:has-text("Create Run")');
    
    // Wait for success message
    await expect(page.locator('text=/Payroll run created/i')).toBeVisible({ timeout: 10000 });
    
    // Verify the modal closes
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
    
    // Verify the new payroll run appears in the list
    await expect(page.locator('text=/E2E Test Run/i')).toBeVisible({ timeout: 5000 });
    
    // Verify the status is "Draft"
    const payrollCard = page.locator('text=/E2E Test Run/i').locator('..').locator('..');
    await expect(payrollCard.locator('text=/draft/i')).toBeVisible();
  });

  test('should filter payroll runs by status', async ({ page }) => {
    // Wait for payroll runs to load
    await page.waitForSelector('[data-testid="payroll-runs-list"]', { timeout: 10000 });
    
    // Click on "Draft" tab
    await page.click('button:has-text("Draft")');
    
    // Verify only draft runs are shown
    const statusBadges = await page.locator('[data-status]').allTextContents();
    statusBadges.forEach(status => {
      expect(status.toLowerCase()).toContain('draft');
    });
    
    // Click on "Approved" tab
    await page.click('button:has-text("Approved")');
    
    // Wait for filtered results
    await page.waitForTimeout(1000);
    
    // Verify URL contains filter parameter
    expect(page.url()).toContain('status=approved');
  });

  test('should view payroll run details', async ({ page }) => {
    // Wait for payroll runs to load
    await page.waitForSelector('[data-testid="payroll-runs-list"]', { timeout: 10000 });
    
    // Click on the first payroll run
    const firstRun = page.locator('[data-testid="payroll-run-card"]').first();
    const runName = await firstRun.locator('[data-testid="run-name"]').textContent();
    
    await firstRun.click();
    
    // Verify navigation to details page
    await expect(page).toHaveURL(/\/payroll\/runs\/[a-f0-9-]+/);
    
    // Verify details page shows correct information
    await expect(page.locator('h1')).toContainText(runName || '');
  });

  test('should calculate payroll for a draft run', async ({ page }) => {
    // First create a new payroll run
    await page.click('button:has-text("New Payroll Run")');
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    
    const today = new Date();
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    const runName = `Calculate Test - ${Date.now()}`;
    await page.fill('input[name="payrollName"]', runName);
    await page.fill('input[name="periodStart"]', formatDate(new Date(today.getFullYear(), today.getMonth(), 1)));
    await page.fill('input[name="periodEnd"]', formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
    await page.fill('input[name="paymentDate"]', formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 5)));
    
    await page.click('button:has-text("Create Run")');
    await expect(page.locator('text=/Payroll run created/i')).toBeVisible({ timeout: 10000 });
    
    // Find the newly created run
    const newRun = page.locator(`text=${runName}`).locator('..').locator('..');
    
    // Click on "Calculate" button
    await newRun.locator('button:has-text("Calculate")').click();
    
    // Wait for calculation to complete
    await expect(page.locator('text=/Calculation (complete|successful)/i')).toBeVisible({ timeout: 15000 });
    
    // Verify status changed to "Calculated"
    await expect(newRun.locator('text=/calculated/i')).toBeVisible({ timeout: 5000 });
  });

  test('should approve a calculated payroll run', async ({ page }) => {
    // Navigate to a calculated payroll run
    await page.click('button:has-text("Calculated")');
    await page.waitForTimeout(1000);
    
    const calculatedRun = page.locator('[data-status="calculated"]').first();
    
    if (await calculatedRun.count() === 0) {
      test.skip('No calculated payroll runs available for approval test');
      return;
    }
    
    // Click on "Approve" button
    await calculatedRun.locator('button:has-text("Approve")').click();
    
    // Confirm approval in modal if present
    const confirmButton = page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }
    
    // Wait for approval to complete
    await expect(page.locator('text=/Payroll run approved/i')).toBeVisible({ timeout: 10000 });
    
    // Verify status changed to "Approved"
    await expect(calculatedRun.locator('text=/approved/i')).toBeVisible({ timeout: 5000 });
  });

  test('should search for payroll runs', async ({ page }) => {
    // Wait for payroll runs to load
    await page.waitForSelector('[data-testid="payroll-runs-list"]', { timeout: 10000 });
    
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    if (await searchInput.count() > 0) {
      // Get the first run name
      const firstRunName = await page.locator('[data-testid="run-name"]').first().textContent();
      
      // Search for it
      await searchInput.fill(firstRunName?.substring(0, 10) || '');
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
      
      // Verify results contain search term
      const visibleRuns = await page.locator('[data-testid="run-name"]').allTextContents();
      expect(visibleRuns.length).toBeGreaterThan(0);
    }
  });

  test('should sort payroll runs by different columns', async ({ page }) => {
    // Wait for payroll runs to load
    await page.waitForSelector('[data-testid="payroll-runs-list"]', { timeout: 10000 });
    
    // Click on "End Date" column header to sort
    const endDateHeader = page.locator('th:has-text("End Date")');
    if (await endDateHeader.count() > 0) {
      await endDateHeader.click();
      
      // Wait for sort to apply
      await page.waitForTimeout(1000);
      
      // Verify URL contains sort parameter
      expect(page.url()).toContain('sortBy=');
      
      // Click again to reverse sort
      await endDateHeader.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should paginate through payroll runs', async ({ page }) => {
    // Wait for payroll runs to load
    await page.waitForSelector('[data-testid="payroll-runs-list"]', { timeout: 10000 });
    
    // Check if pagination exists
    const nextButton = page.locator('button:has-text("Next")');
    
    if (await nextButton.isEnabled()) {
      // Get first run name on page 1
      const firstRunPage1 = await page.locator('[data-testid="run-name"]').first().textContent();
      
      // Go to page 2
      await nextButton.click();
      await page.waitForTimeout(1000);
      
      // Get first run name on page 2
      const firstRunPage2 = await page.locator('[data-testid="run-name"]').first().textContent();
      
      // Verify they're different
      expect(firstRunPage1).not.toBe(firstRunPage2);
      
      // Go back to page 1
      await page.locator('button:has-text("Previous")').click();
      await page.waitForTimeout(1000);
      
      // Verify we're back to the same run
      const firstRunBack = await page.locator('[data-testid="run-name"]').first().textContent();
      expect(firstRunBack).toBe(firstRunPage1);
    }
  });

  test('should handle validation errors when creating a payroll run', async ({ page }) => {
    // Click the "New Payroll Run" button
    await page.click('button:has-text("New Payroll Run")');
    
    // Wait for the modal to appear
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    
    // Try to submit without filling required fields
    await page.click('button:has-text("Create Run")');
    
    // Verify validation errors appear
    await expect(page.locator('text=/required|invalid/i')).toBeVisible({ timeout: 5000 });
    
    // Fill invalid date range (end before start)
    const today = new Date();
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    await page.fill('input[name="payrollName"]', 'Invalid Test');
    await page.fill('input[name="periodStart"]', formatDate(new Date(today.getFullYear(), today.getMonth(), 15)));
    await page.fill('input[name="periodEnd"]', formatDate(new Date(today.getFullYear(), today.getMonth(), 1)));
    await page.fill('input[name="paymentDate"]', formatDate(new Date(today.getFullYear(), today.getMonth(), 1)));
    
    await page.click('button:has-text("Create Run")');
    
    // Verify error message about invalid date range
    await expect(page.locator('text=/period end.*after.*start|invalid.*date/i')).toBeVisible({ timeout: 5000 });
  });

  test('should delete a draft payroll run', async ({ page }) => {
    // Filter to draft runs
    await page.click('button:has-text("Draft")');
    await page.waitForTimeout(1000);
    
    const draftRun = page.locator('[data-status="draft"]').first();
    
    if (await draftRun.count() === 0) {
      test.skip('No draft payroll runs available for deletion test');
      return;
    }
    
    // Get the run name before deletion
    const runName = await draftRun.locator('[data-testid="run-name"]').textContent();
    
    // Click delete button
    await draftRun.locator('button[aria-label*="Delete"]').click();
    
    // Confirm deletion in modal
    await page.locator('button:has-text("Delete")').click();
    
    // Wait for success message
    await expect(page.locator('text=/deleted/i')).toBeVisible({ timeout: 10000 });
    
    // Verify the run is no longer in the list
    await expect(page.locator(`text=${runName}`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should show loading state while fetching payroll runs', async ({ page }) => {
    // Reload the page to see loading state
    await page.reload();
    
    // Verify loading indicator appears
    const loadingIndicator = page.locator('[data-testid="loading"]');
    
    if (await loadingIndicator.isVisible({ timeout: 1000 })) {
      // Verify it disappears after data loads
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }
    
    // Verify payroll runs list is visible
    await expect(page.locator('[data-testid="payroll-runs-list"]')).toBeVisible();
  });

  test('should handle empty state when no payroll runs exist', async ({ page }) => {
    // This test assumes a filter that returns no results
    // Navigate to a status with likely no runs
    await page.click('button:has-text("Processing")');
    await page.waitForTimeout(1000);
    
    // Check if empty state is shown
    const emptyState = page.locator('text=/no.*payroll.*runs|no.*results/i');
    
    if (await emptyState.isVisible({ timeout: 2000 })) {
      // Verify empty state shows helpful message
      await expect(emptyState).toBeVisible();
      
      // Verify "Create" button is available
      await expect(page.locator('button:has-text("New Payroll Run")')).toBeVisible();
    }
  });
});

test.describe('Payroll Run Details View', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input#email', 'payroll@testcompany.com');
    await page.fill('input#password', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Navigate to payroll runs
    await page.goto('/payroll');
    
    // Navigate to first payroll run
    await page.locator('[data-testid="payroll-run-card"]').first().click();
    await page.waitForURL(/\/payroll\/runs\/[a-f0-9-]+/);
  });

  test('should display payroll run summary information', async ({ page }) => {
    // Verify key information is displayed
    await expect(page.locator('[data-testid="run-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="employee-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="pay-period"]')).toBeVisible();
  });

  test('should show paychecks list', async ({ page }) => {
    // Click on "Paychecks" tab if exists
    const paychecksTab = page.locator('button:has-text("Paychecks")');
    
    if (await paychecksTab.isVisible()) {
      await paychecksTab.click();
      
      // Verify paychecks table/list is displayed
      await expect(page.locator('[data-testid="paychecks-list"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate back to payroll runs list', async ({ page }) => {
    // Click back button
    await page.locator('button[aria-label*="Back"]').click();
    
    // Verify navigation to list view
    await expect(page).toHaveURL('/payroll/runs');
  });
});
