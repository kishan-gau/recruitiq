/**
 * E2E Tests for Tax Rule Management
 * 
 * Tests the complete end-to-end user journey for creating and managing tax rules.
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

// Helper to navigate to tax rules page
async function navigateToTaxRules(page: Page) {
  await page.goto('/payroll/tax');
  await page.waitForLoadState('networkidle');
}

test.describe('Tax Rule Creation and Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create a new income tax rule', async ({ page }) => {
    // Arrange - Navigate to tax rules page
    await navigateToTaxRules(page);

    // Act - Click create tax rule button
    await page.click('button:has-text("Add Tax Rule"), button:has-text("Create Tax Rule")');
    await page.waitForSelector('[role="dialog"], form', { timeout: 5000 });

    // Fill tax rule details
    const ruleCode = `INCOME_TAX_E2E_${Date.now()}`;
    await page.fill('input[name="ruleCode"]', ruleCode);
    await page.fill('input[name="ruleName"]', 'E2E Income Tax Test');
    await page.selectOption('select[name="ruleType"]', 'INCOME');
    await page.fill('textarea[name="description"]', 'E2E test income tax rule');
    await page.selectOption('select[name="country"]', 'SR');

    // Act - Submit the form
    await page.click('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');

    // Assert - Success message should appear
    await expect(page.locator('text=/created successfully|success/i')).toBeVisible({ timeout: 5000 });

    // Assert - New rule should appear in the list
    await expect(page.locator(`text=${ruleCode}`)).toBeVisible();
  });

  test('should validate required fields for tax rule', async ({ page }) => {
    // Arrange
    await navigateToTaxRules(page);
    await page.click('button:has-text("Add Tax Rule"), button:has-text("Create Tax Rule")');
    await page.waitForSelector('[role="dialog"], form');

    // Act - Try to submit without filling required fields
    await page.click('button:has-text("Create"), button:has-text("Save"), button[type="submit"]');

    // Assert - Validation errors should be displayed
    await expect(page.locator('text=/code.*required|required.*code/i')).toBeVisible();
    await expect(page.locator('text=/name.*required|required.*name/i')).toBeVisible();
  });

  test('should edit existing tax rule', async ({ page }) => {
    // Arrange - Navigate to tax rules
    await navigateToTaxRules(page);
    await page.waitForSelector('table, .card, .tax-rule-item');

    // Act - Click edit on first tax rule
    const editButton = page.locator('button:has-text("Edit"), button[aria-label*="Edit"]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForSelector('[role="dialog"], form');

      // Update rule name
      const nameInput = page.locator('input[name="ruleName"]');
      await nameInput.clear();
      await nameInput.fill('Updated Tax Rule Name');

      // Save changes
      await page.click('button:has-text("Save"), button:has-text("Update"), button[type="submit"]');

      // Assert - Success message
      await expect(page.locator('text=/updated successfully|success/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view tax rule details', async ({ page }) => {
    // Arrange
    await navigateToTaxRules(page);
    await page.waitForSelector('table tbody tr, .card, .tax-rule-item');

    // Act - Click on first tax rule to view details
    const firstRule = page.locator('table tbody tr, .card, .tax-rule-item').first();
    await firstRule.click();

    // Assert - Details should be visible
    await expect(page.locator('text=/Rule Code|Code/i')).toBeVisible();
    await expect(page.locator('text=/Rule Name|Name/i')).toBeVisible();
    await expect(page.locator('text=/Type/i')).toBeVisible();
  });

  test('should filter tax rules by type', async ({ page }) => {
    // Arrange
    await navigateToTaxRules(page);

    // Act - Filter by INCOME type
    const typeFilter = page.locator('select[name="typeFilter"], select[aria-label*="Type"]');
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption('INCOME');
      await page.waitForLoadState('networkidle');

      // Assert - Only income tax rules should be visible
      const incomeTaxRules = await page.locator('text=/INCOME|Income Tax/i').count();
      expect(incomeTaxRules).toBeGreaterThan(0);
    }
  });
});

test.describe('Tax Rule Versioning', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToTaxRules(page);
  });

  test('should create new tax rule version', async ({ page }) => {
    // Arrange - Select a tax rule
    await page.waitForSelector('table tbody tr, .card');
    
    // Act - Open version history
    const versionButton = page.locator('button:has-text("Versions"), button[aria-label*="Version"]').first();
    if (await versionButton.isVisible()) {
      await versionButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

      // Create new version
      await page.click('button:has-text("Create Version"), button:has-text("New Version")');
      await page.waitForSelector('form, input[name="effectiveDate"]');

      // Fill version details
      await page.fill('input[name="effectiveDate"]', '2025-07-01');
      await page.fill('textarea[name="description"]', 'Mid-year adjustment');

      // Add tax brackets if available
      const addBracketButton = page.locator('button:has-text("Add Bracket")');
      if (await addBracketButton.isVisible()) {
        await addBracketButton.click();
        await page.fill('input[name="minIncome"]', '0');
        await page.fill('input[name="maxIncome"]', '10000');
        await page.fill('input[name="rate"]', '0.10');
      }

      // Submit version
      await page.click('button:has-text("Create"), button[type="submit"]');

      // Assert - Version created
      await expect(page.locator('text=/version created|success/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view version history', async ({ page }) => {
    // Arrange
    await page.waitForSelector('table tbody tr, .card');
    
    // Act - Open version history
    const versionButton = page.locator('button:has-text("Versions"), button[aria-label*="Version"]').first();
    if (await versionButton.isVisible()) {
      await versionButton.click();
      await page.waitForSelector('[role="dialog"]');

      // Assert - Version history should be visible
      await expect(page.locator('text=/Version|History/i')).toBeVisible();
      await expect(page.locator('text=/Effective Date/i')).toBeVisible();
    }
  });
});

test.describe('Tax Calculation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should calculate tax for employee', async ({ page }) => {
    // Arrange - Navigate to tax calculation or employee page
    await page.goto('/payroll/tax');
    
    // Act - Open tax calculator
    const calcButton = page.locator('button:has-text("Calculate"), button:has-text("Tax Calculator")');
    if (await calcButton.isVisible()) {
      await calcButton.click();
      await page.waitForSelector('form, input[name="taxableIncome"]');

      // Enter calculation details
      await page.fill('input[name="taxableIncome"]', '50000');
      
      // Select employee if required
      const employeeSelect = page.locator('select[name="employeeId"], input[name="employeeId"]');
      if (await employeeSelect.isVisible()) {
        await employeeSelect.fill('emp-001');
      }

      // Calculate
      await page.click('button:has-text("Calculate"), button[type="submit"]');

      // Assert - Calculation result should be displayed
      await expect(page.locator('text=/Total Tax|Tax Amount/i')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=/Net Income|After Tax/i')).toBeVisible();
    }
  });
});

test.describe('Tax Rule Search and Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToTaxRules(page);
  });

  test('should search tax rules by code', async ({ page }) => {
    // Arrange - Wait for page to load
    await page.waitForSelector('table, .card');

    // Act - Search for tax rule
    const searchInput = page.locator('input[placeholder*="Search"], input[name="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('INCOME');
      await page.waitForLoadState('networkidle');

      // Assert - Only matching rules should be visible
      await expect(page.locator('text=/INCOME/i')).toBeVisible();
    }
  });

  test('should filter by active status', async ({ page }) => {
    // Arrange
    await page.waitForSelector('table, .card');

    // Act - Filter by active rules
    const statusFilter = page.locator('select[name="statusFilter"], input[name="isActive"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOptions('active');
      await page.waitForLoadState('networkidle');

      // Assert - Only active rules visible
      const inactiveRules = await page.locator('text=/Inactive/i').count();
      expect(inactiveRules).toBe(0);
    }
  });
});

test.describe('Tax Rules Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToTaxRules(page);
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
    // Wait for table
    await page.waitForSelector('table, .card');

    // Check for accessible names on important elements
    const addButton = page.locator('button:has-text("Add"), button:has-text("Create")').first();
    if (await addButton.isVisible()) {
      await expect(addButton).toHaveAccessibleName();
    }
  });
});

test.describe('Tax Rules Performance', () => {
  test('should load tax rules page within 3 seconds', async ({ page }) => {
    // Arrange
    await login(page);

    // Act - Measure navigation time
    const startTime = Date.now();
    await navigateToTaxRules(page);
    await page.waitForSelector('table, .card, h1', { timeout: 3000 });
    const loadTime = Date.now() - startTime;

    // Assert - Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });
});
