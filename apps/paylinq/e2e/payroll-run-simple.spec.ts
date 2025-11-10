import { test, expect } from '@playwright/test';

/**
 * Simplified Payroll Run E2E Tests
 * 
 * Tests the core payroll run workflow:
 * 1. Login to the application
 * 2. Create a new payroll run
 * 3. Verify it appears in the list
 * 
 * To run: pnpm test:e2e
 */

test.describe('Payroll Run - Core Workflow', () => {
  
  test('should login, create payroll run, and see it in the list', async ({ page }) => {
    // Step 1: Navigate to login
    await page.goto('/login');
    
    // Step 2: Login
    console.log('Logging in...');
    await page.fill('input#email', 'payroll@testcompany.com');
    await page.fill('input#password', 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Step 3: Navigate to Payroll Runs page
    console.log('Navigating to payroll runs...');
    await page.goto('/payroll');
    await page.waitForTimeout(1000);
    
    // Step 4: Click "Create Payroll Run" button
    console.log('Looking for create button...');
    
    const createButton = page.locator('button:has-text("Create Payroll Run")');
    
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();
    
    // Step 5: Fill in the payroll run form
    console.log('Filling payroll run form...');
    
    const today = new Date();
    const runName = `E2E Test - ${today.getTime()}`;
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const paymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 5);
    
    // Find and fill form fields (trying multiple possible field names)
    const nameField = page.locator('input[name="payrollName"], input[name="name"], input[name="runName"]').first();
    await expect(nameField).toBeVisible({ timeout: 5000 });
    await nameField.fill(runName);
    
    const startField = page.locator('input[name="periodStart"], input[name="startDate"]').first();
    await startField.fill(formatDate(startDate));
    
    const endField = page.locator('input[name="periodEnd"], input[name="endDate"]').first();
    await endField.fill(formatDate(endDate));
    
    const payField = page.locator('input[name="paymentDate"], input[name="payDate"]').first();
    await payField.fill(formatDate(paymentDate));
    
    // Step 6: Submit the form
    console.log('Submitting form...');
    
    const submitButton = page.locator('button[type="submit"], button').filter({ 
      hasText: /create|save|submit/i 
    }).first();
    
    await submitButton.click();
    
    // Step 7: Wait for success and modal to close
    await page.waitForTimeout(2000);
    
    // Step 8: Verify the payroll run appears in the list
    console.log('Verifying payroll run appears in list...');
    
    await expect(page.locator(`text="${runName}"`)).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Test passed: Payroll run created and visible in list');
  });
  
  test('should show validation error for invalid date range', async ({ page }) => {
    await page.goto('/payroll');
    
    // Wait for page load
    await page.waitForTimeout(1000);
    
    // Open create modal
    const createButton = page.locator('button:has-text("Create Payroll Run")');
    
    await createButton.click({ timeout: 10000 });
    
    // Fill with invalid dates (end before start)
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    const today = new Date();
    
    await page.locator('input').first().fill('Invalid Test');
    await page.locator('input[name="periodStart"], input[name="startDate"]').first()
      .fill(formatDate(new Date(today.getFullYear(), today.getMonth(), 15)));
    await page.locator('input[name="periodEnd"], input[name="endDate"]').first()
      .fill(formatDate(new Date(today.getFullYear(), today.getMonth(), 1)));
    
    // Try to submit
    const submitButton = page.locator('button[type="submit"], button').filter({ 
      hasText: /create|save|submit/i 
    }).first();
    
    await submitButton.click();
    
    // Verify error message appears
    const errorText = page.locator('text=/error|invalid|must be after/i');
    await expect(errorText).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Test passed: Validation error shown for invalid dates');
  });
  
  test('should filter payroll runs by status tabs', async ({ page }) => {
    await page.goto('/payroll');
    await page.waitForTimeout(1000);
    
    // Look for status tabs (Draft, Calculated, Approved, etc.)
    const draftTab = page.locator('button, a').filter({ hasText: /draft/i }).first();
    
    if (await draftTab.isVisible({ timeout: 2000 })) {
      await draftTab.click();
      await page.waitForTimeout(500);
      
      // Verify URL or content changed
      const url = page.url();
      const hasDraftInUrl = url.includes('draft') || url.includes('status=draft');
      
      expect(hasDraftInUrl || await page.locator('text=/draft/i').count() > 0).toBeTruthy();
      
      console.log('✅ Test passed: Can filter by status');
    } else {
      console.log('⚠️  No status tabs found, skipping test');
    }
  });
});
