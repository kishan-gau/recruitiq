/**
 * Visual Regression Tests for Payroll Components
 * 
 * These tests use Percy to capture visual snapshots of key payroll components
 * across different states and viewports. Visual changes are reviewed in Percy
 * dashboard before being approved.
 * 
 * @see https://docs.percy.io/docs/playwright
 */

import { test, expect } from '@playwright/test';
import percySnapshot from '@percy/playwright';

// Test configuration
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
  largeDesktop: { width: 1920, height: 1080 },
};

// Helper function to login
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'Test123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

// Helper to navigate to payroll
async function navigateToPayroll(page: any) {
  await page.click('a[href*="/payroll"]');
  await page.waitForLoadState('networkidle');
}

test.describe('Payroll Components - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPayroll(page);
  });

  test('should capture payroll dashboard across viewports', async ({ page }) => {
    // Desktop view
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Payroll Dashboard - Desktop');

    // Tablet view
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(500);
    await percySnapshot(page, 'Payroll Dashboard - Tablet');

    // Mobile view
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(500);
    await percySnapshot(page, 'Payroll Dashboard - Mobile');
  });

  test('should capture payroll runs list', async ({ page }) => {
    await page.goto('/payroll/runs');
    await page.waitForSelector('table', { timeout: 5000 });
    await page.waitForLoadState('networkidle');

    // Capture empty state if no runs
    const rowCount = await page.locator('table tbody tr').count();
    if (rowCount === 0) {
      await percySnapshot(page, 'Payroll Runs - Empty State');
    } else {
      await percySnapshot(page, 'Payroll Runs - List View');
    }
  });

  test('should capture create payroll run modal', async ({ page }) => {
    await page.goto('/payroll/runs');
    await page.click('button:has-text("Create Payroll Run")');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Capture initial state
    await percySnapshot(page, 'Create Payroll Run Modal - Initial State');

    // Fill some fields to show active state
    await page.fill('input[name="runCode"]', 'RUN-2025-VISUAL-TEST');
    await page.selectOption('select[name="period"]', 'monthly');
    await percySnapshot(page, 'Create Payroll Run Modal - Filled State');

    // Trigger validation by clicking create without required fields
    await page.fill('input[name="runCode"]', '');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(500);
    await percySnapshot(page, 'Create Payroll Run Modal - Validation Errors');
  });

  test('should capture tax rules page', async ({ page }) => {
    await page.goto('/payroll/tax');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Tax Rules Page - Desktop');
  });

  test('should capture deductions page', async ({ page }) => {
    await page.goto('/payroll/deductions');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Deductions Page - Desktop');
  });

  test('should capture compensation page', async ({ page }) => {
    await page.goto('/payroll/compensation');
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Compensation Page - Desktop');
  });
});

test.describe('Payroll Modals - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToPayroll(page);
  });

  test('should capture process payroll modal states', async ({ page }) => {
    await page.goto('/payroll/runs');
    await page.waitForSelector('table');

    // Find a draft run (if exists) and click process
    const processButton = page.locator('button:has-text("Process")').first();
    if (await processButton.isVisible()) {
      await processButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      await percySnapshot(page, 'Process Payroll Modal - Confirmation');
    }
  });

  test('should capture deduction modal', async ({ page }) => {
    await page.goto('/payroll/deductions');
    
    // Try to open add deduction modal
    const addButton = page.locator('button:has-text("Add Deduction")');
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      await percySnapshot(page, 'Deduction Modal - Add New');
      
      // Fill in some fields
      await page.fill('input[name="deductionName"]', 'Health Insurance');
      await page.selectOption('select[name="deductionType"]', 'VOLUNTARY');
      await percySnapshot(page, 'Deduction Modal - Filled State');
    }
  });

  test('should capture pay component form modal', async ({ page }) => {
    await page.goto('/payroll/compensation');
    
    // Try to open add component modal
    const addButton = page.locator('button:has-text("Add Component")');
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      await percySnapshot(page, 'Pay Component Modal - Add New');
      
      // Switch to formula calculation type
      await page.selectOption('select[name="calculationType"]', 'formula');
      await page.waitForTimeout(300);
      await percySnapshot(page, 'Pay Component Modal - Formula Mode');
    }
  });
});

test.describe('Payroll Forms - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should capture tax rule form', async ({ page }) => {
    await page.goto('/payroll/tax');
    
    const addButton = page.locator('button:has-text("Add Tax Rule")');
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForSelector('form', { timeout: 5000 });
      await percySnapshot(page, 'Tax Rule Form - Initial');
      
      // Fill form to show different states
      await page.fill('input[name="ruleCode"]', 'TAX-VISUAL-001');
      await page.fill('input[name="ruleName"]', 'Visual Test Tax Rule');
      await percySnapshot(page, 'Tax Rule Form - Partially Filled');
    }
  });

  test('should capture worker type templates', async ({ page }) => {
    await page.goto('/payroll/compensation');
    
    // Navigate to worker types if available
    const workerTypesTab = page.locator('button:has-text("Worker Types")');
    if (await workerTypesTab.isVisible()) {
      await workerTypesTab.click();
      await page.waitForLoadState('networkidle');
      await percySnapshot(page, 'Worker Types - List View');
    }
  });
});

test.describe('Payroll Responsive Design - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should verify responsive layout for compensation page', async ({ page }) => {
    await page.goto('/payroll/compensation');
    
    // Desktop
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Compensation - Responsive Desktop');

    // Tablet
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(500);
    await percySnapshot(page, 'Compensation - Responsive Tablet');

    // Mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(500);
    await percySnapshot(page, 'Compensation - Responsive Mobile');
  });

  test('should verify responsive layout for tax rules', async ({ page }) => {
    await page.goto('/payroll/tax');
    
    // Desktop
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForLoadState('networkidle');
    await percySnapshot(page, 'Tax Rules - Responsive Desktop');

    // Tablet
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.waitForTimeout(500);
    await percySnapshot(page, 'Tax Rules - Responsive Tablet');

    // Mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(500);
    await percySnapshot(page, 'Tax Rules - Responsive Mobile');
  });
});

test.describe('Payroll Dark Mode - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should capture dark mode if available', async ({ page }) => {
    await page.goto('/payroll');
    
    // Try to enable dark mode
    const darkModeToggle = page.locator('[aria-label*="dark mode"], [aria-label*="theme"]');
    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click();
      await page.waitForTimeout(500);
      await percySnapshot(page, 'Payroll Dashboard - Dark Mode');
    }
  });
});
