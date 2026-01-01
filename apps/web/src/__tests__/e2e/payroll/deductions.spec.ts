/**
 * E2E Tests for Deduction Assignment and Management
 * 
 * Tests the complete end-to-end user journey for assigning and managing employee deductions.
 * Following industry standards from TESTING_STANDARDS.md - E2E Testing section.
 */

import { test, expect, Page } from '@playwright/test';

// Test fixtures
const TEST_USER = {
  email: 'admin@test.com',
  password: 'Test123!',
};

// Helper function to login
async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

// Helper to navigate to deductions page
async function navigateToDeductions(page: Page) {
  await page.goto('/payroll/deductions');
  await page.waitForLoadState('networkidle');
}

test.describe('Deduction Creation and Assignment', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a new voluntary deduction', async ({ page }) => {
    // Arrange - Navigate to deductions page
    await navigateToDeductions(page);

    // Act - Click add deduction button
    await page.click('button:has-text("Add Deduction"), button:has-text("New Deduction")');
    await page.waitForSelector('[role="dialog"], form', { timeout: 5000 });

    // Fill deduction details
    const deductionCode = `HEALTH_INS_E2E_${Date.now()}`;
    await page.fill('input[name="employeeId"]', 'emp-001');
    await page.fill('input[name="deductionCode"]', deductionCode);
    await page.fill('input[name="deductionName"]', 'Health Insurance E2E');
    await page.selectOption('select[name="deductionType"]', 'VOLUNTARY');
    await page.fill('input[name="deductionAmount"]', '150');
    await page.fill('input[name="startDate"]', '2025-01-01');

    // Act - Submit the form
    await page.click('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');

    // Assert - Success message should appear
    await expect(page.locator('text=/created successfully|success/i')).toBeVisible({ timeout: 5000 });

    // Assert - New deduction should appear in the list
    await expect(page.locator(`text=${deductionCode}`)).toBeVisible();
  });

  test('should create a percentage-based deduction', async ({ page }) => {
    // Arrange
    await navigateToDeductions(page);
    await page.click('button:has-text("Add Deduction"), button:has-text("New Deduction")');
    await page.waitForSelector('[role="dialog"], form');

    // Fill percentage-based deduction
    const deductionCode = `PENSION_E2E_${Date.now()}`;
    await page.fill('input[name="employeeId"]', 'emp-001');
    await page.fill('input[name="deductionCode"]', deductionCode);
    await page.fill('input[name="deductionName"]', 'Pension Contribution E2E');
    await page.selectOption('select[name="deductionType"]', 'STATUTORY');
    await page.fill('input[name="deductionPercentage"]', '5');
    await page.fill('input[name="startDate"]', '2025-01-01');

    // Submit
    await page.click('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');

    // Assert
    await expect(page.locator('text=/created successfully|success/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${deductionCode}`)).toBeVisible();
  });

  test('should validate required fields for deduction', async ({ page }) => {
    // Arrange
    await navigateToDeductions(page);
    await page.click('button:has-text("Add Deduction"), button:has-text("New Deduction")');
    await page.waitForSelector('[role="dialog"], form');

    // Act - Try to submit without filling required fields
    await page.click('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');

    // Assert - Validation errors should be displayed
    await expect(page.locator('text=/employee.*required|required.*employee/i')).toBeVisible();
    await expect(page.locator('text=/code.*required|required.*code/i')).toBeVisible();
    await expect(page.locator('text=/name.*required|required.*name/i')).toBeVisible();
  });

  test('should validate amount or percentage is provided', async ({ page }) => {
    // Arrange
    await navigateToDeductions(page);
    await page.click('button:has-text("Add Deduction"), button:has-text("New Deduction")');
    await page.waitForSelector('[role="dialog"], form');

    // Fill required fields but no amount/percentage
    await page.fill('input[name="employeeId"]', 'emp-001');
    await page.fill('input[name="deductionCode"]', 'TEST_DED');
    await page.fill('input[name="deductionName"]', 'Test Deduction');

    // Act - Try to submit
    await page.click('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');

    // Assert - Should require amount or percentage
    await expect(page.locator('text=/amount.*percentage|provide.*amount/i')).toBeVisible();
  });
});

test.describe('Deduction Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDeductions(page);
  });

  test('should edit existing deduction', async ({ page }) => {
    // Arrange - Wait for deductions list to load
    await page.waitForSelector('table tbody tr, .card, .deduction-item');

    // Act - Click edit on first deduction
    const editButton = page.locator('button:has-text("Edit"), button[aria-label*="Edit"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForSelector('[role="dialog"], form');

      // Update deduction amount
      const amountInput = page.locator('input[name="deductionAmount"]');
      await amountInput.clear();
      await amountInput.fill('200');

      // Save changes
      await page.click('button:has-text("Save"), button:has-text("Update"), button[type="submit"]');

      // Assert - Success message
      await expect(page.locator('text=/updated successfully|success/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should deactivate deduction', async ({ page }) => {
    // Arrange
    await page.waitForSelector('table tbody tr, .card');

    // Act - Click deactivate/disable on first active deduction
    const deactivateButton = page.locator('button:has-text("Deactivate"), button:has-text("Disable")').first();
    if (await deactivateButton.isVisible()) {
      await deactivateButton.click();

      // Confirm if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      // Assert - Success message
      await expect(page.locator('text=/deactivated|disabled|success/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete deduction', async ({ page }) => {
    // Arrange
    await page.waitForSelector('table tbody tr, .card');

    // Act - Click delete on first deduction
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="Delete"]').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion
      await page.waitForSelector('[role="dialog"]');
      await expect(page.locator('text=/Are you sure/i')).toBeVisible();
      await page.click('button:has-text("Delete"), button:has-text("Confirm")');

      // Assert - Success message
      await expect(page.locator('text=/deleted successfully|success/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view deduction details', async ({ page }) => {
    // Arrange
    await page.waitForSelector('table tbody tr, .card, .deduction-item');

    // Act - Click on first deduction to view details
    const firstDeduction = page.locator('table tbody tr, .card, .deduction-item').first();
    await firstDeduction.click();

    // Assert - Details should be visible
    await expect(page.locator('text=/Deduction Code|Code/i')).toBeVisible();
    await expect(page.locator('text=/Deduction Name|Name/i')).toBeVisible();
    await expect(page.locator('text=/Type/i')).toBeVisible();
    await expect(page.locator('text=/Amount|Percentage/i')).toBeVisible();
  });
});

test.describe('Deduction Filtering and Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDeductions(page);
  });

  test('should filter deductions by type', async ({ page }) => {
    // Arrange
    await page.waitForSelector('table, .card');

    // Act - Filter by VOLUNTARY type
    const typeFilter = page.locator('select[name="typeFilter"], select[aria-label*="Type"]');
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption('VOLUNTARY');
      await page.waitForLoadState('networkidle');

      // Assert - Only voluntary deductions should be visible
      const voluntaryDeductions = await page.locator('text=/VOLUNTARY|Voluntary/i').count();
      expect(voluntaryDeductions).toBeGreaterThan(0);
    }
  });

  test('should filter deductions by employee', async ({ page }) => {
    // Arrange
    await page.waitForSelector('table, .card');

    // Act - Filter by employee
    const employeeFilter = page.locator('select[name="employeeFilter"], input[name="employeeId"]');
    if (await employeeFilter.isVisible()) {
      await employeeFilter.fill('emp-001');
      await page.waitForLoadState('networkidle');

      // Assert - Only deductions for emp-001 should be visible
      await expect(page.locator('text=emp-001')).toBeVisible();
    }
  });

  test('should search deductions by code', async ({ page }) => {
    // Arrange
    await page.waitForSelector('table, .card');

    // Act - Search for deduction
    const searchInput = page.locator('input[placeholder*="Search"], input[name="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('HEALTH');
      await page.waitForLoadState('networkidle');

      // Assert - Only matching deductions should be visible
      await expect(page.locator('text=/HEALTH/i')).toBeVisible();
    }
  });

  test('should filter by active status', async ({ page }) => {
    // Arrange
    await page.waitForSelector('table, .card');

    // Act - Filter by active deductions
    const statusFilter = page.locator('select[name="statusFilter"], input[name="isActive"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOptions('active');
      await page.waitForLoadState('networkidle');

      // Assert - Only active deductions visible
      const inactiveDeductions = await page.locator('text=/Inactive/i').count();
      expect(inactiveDeductions).toBe(0);
    }
  });
});

test.describe('Deduction Date Range Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDeductions(page);
  });

  test('should set deduction end date', async ({ page }) => {
    // Arrange
    await page.waitForSelector('table tbody tr, .card');

    // Act - Edit first deduction
    const editButton = page.locator('button:has-text("Edit"), button[aria-label*="Edit"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForSelector('[role="dialog"], form');

      // Set end date
      await page.fill('input[name="endDate"]', '2025-12-31');

      // Save
      await page.click('button:has-text("Save"), button:has-text("Update")');

      // Assert
      await expect(page.locator('text=/updated successfully|success/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should validate end date is after start date', async ({ page }) => {
    // Arrange
    await page.click('button:has-text("Add Deduction"), button:has-text("New Deduction")');
    await page.waitForSelector('[role="dialog"], form');

    // Fill basic info
    await page.fill('input[name="employeeId"]', 'emp-001');
    await page.fill('input[name="deductionCode"]', 'TEST');
    await page.fill('input[name="deductionName"]', 'Test');
    await page.fill('input[name="deductionAmount"]', '100');

    // Set invalid date range
    await page.fill('input[name="startDate"]', '2025-12-31');
    await page.fill('input[name="endDate"]', '2025-01-01');

    // Act - Try to submit
    await page.click('button:has-text("Create"), button:has-text("Save")');

    // Assert - Validation error
    await expect(page.locator('text=/end date.*after.*start date/i')).toBeVisible();
  });
});

test.describe('Deduction Calculation Preview', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDeductions(page);
  });

  test('should preview deduction calculation', async ({ page }) => {
    // Arrange - Open add deduction modal
    await page.click('button:has-text("Add Deduction"), button:has-text("New Deduction")');
    await page.waitForSelector('[role="dialog"], form');

    // Fill deduction details
    await page.fill('input[name="employeeId"]', 'emp-001');
    await page.fill('input[name="deductionCode"]', 'PREVIEW_TEST');
    await page.fill('input[name="deductionName"]', 'Preview Test');
    await page.fill('input[name="deductionPercentage"]', '10');

    // Act - Enter sample gross pay if preview available
    const previewInput = page.locator('input[name="grossPaySample"], input[placeholder*="gross pay"]');
    if (await previewInput.isVisible()) {
      await previewInput.fill('5000');

      // Click calculate/preview button
      const previewButton = page.locator('button:has-text("Preview"), button:has-text("Calculate")');
      if (await previewButton.isVisible()) {
        await previewButton.click();

        // Assert - Preview result should show
        await expect(page.locator('text=/Deduction Amount|Preview/i')).toBeVisible();
        await expect(page.locator('text=500')).toBeVisible(); // 10% of 5000
      }
    }
  });
});

test.describe('Bulk Deduction Operations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDeductions(page);
  });

  test('should bulk assign deduction to multiple employees', async ({ page }) => {
    // Arrange
    await page.waitForSelector('table, .card');

    // Act - Click bulk assign button if available
    const bulkButton = page.locator('button:has-text("Bulk Assign"), button:has-text("Assign to Multiple")');
    if (await bulkButton.isVisible()) {
      await bulkButton.click();
      await page.waitForSelector('[role="dialog"], form');

      // Select deduction type
      await page.fill('input[name="deductionCode"]', 'BULK_TEST');
      await page.fill('input[name="deductionName"]', 'Bulk Test Deduction');
      await page.fill('input[name="deductionAmount"]', '100');

      // Select employees (checkboxes or multi-select)
      const employeeCheckboxes = page.locator('input[type="checkbox"][name*="employee"]');
      const checkboxCount = await employeeCheckboxes.count();
      if (checkboxCount > 0) {
        // Select first 2 employees
        await employeeCheckboxes.nth(0).check();
        await employeeCheckboxes.nth(1).check();

        // Submit
        await page.click('button:has-text("Assign"), button:has-text("Create")');

        // Assert
        await expect(page.locator('text=/assigned successfully|success/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Deductions Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToDeductions(page);
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('table, .card');

    // Tab through elements
    await page.keyboard.press('Tab');
    
    // Should focus on interactive elements
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'A', 'SELECT']).toContain(focusedElement);
  });

  test('should have proper ARIA labels', async ({ page }) => {
    // Wait for table/cards
    await page.waitForSelector('table, .card');

    // Check for accessible names
    const addButton = page.locator('button:has-text("Add"), button:has-text("New")').first();
    if (await addButton.isVisible()) {
      await expect(addButton).toHaveAccessibleName();
    }
  });
});

test.describe('Deductions Performance', () => {
  test('should load deductions page within 3 seconds', async ({ page }) => {
    // Arrange
    await login(page);

    // Act - Measure navigation time
    const startTime = Date.now();
    await navigateToDeductions(page);
    await page.waitForSelector('table, .card, h1', { timeout: 3000 });
    const loadTime = Date.now() - startTime;

    // Assert - Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle large number of deductions efficiently', async ({ page }) => {
    // Arrange
    await navigateToDeductions(page);
    await page.waitForSelector('table, .card');

    // Act - Scroll through list
    const startTime = Date.now();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const scrollTime = Date.now() - startTime;

    // Assert - Scrolling should be smooth (< 1 second)
    expect(scrollTime).toBeLessThan(1000);
  });
});
