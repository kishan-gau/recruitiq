import { test, expect } from '@playwright/test';

// Configuration
const BASE_URL = 'http://localhost:5175';

test.describe('Departments Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/departments`);
    await page.waitForLoadState('networkidle');
  });

  test('should display departments list page with hierarchy', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: 'Departments' })).toBeVisible();
    
    // Check search input
    await expect(page.getByPlaceholder(/search departments/i)).toBeVisible();
    
    // Check Add Department button
    await expect(page.getByRole('link', { name: /add department/i })).toBeVisible();
    
    // Wait for departments to load
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test('should search for departments by name', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Type in search box
    const searchInput = page.getByPlaceholder(/search departments/i);
    await searchInput.fill('Engineering');
    
    // Wait for search results
    await page.waitForTimeout(500);
    
    // Verify results contain search term
    const tableRows = page.locator('tbody tr');
    const count = await tableRows.count();
    
    if (count > 0) {
      const firstRow = tableRows.first();
      await expect(firstRow).toContainText('engineering', { ignoreCase: true });
    }
  });

  test('should filter departments by status', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Look for status filter
    const statusSelect = page.locator('select[name="status"], #status');
    
    if (await statusSelect.isVisible()) {
      // Select "Active" status
      await statusSelect.selectOption('active');
      await page.waitForTimeout(500);
      
      // Verify active departments are shown
      const activeBadges = page.locator('text=/active/i');
      if (await activeBadges.count() > 0) {
        await expect(activeBadges.first()).toBeVisible();
      }
    }
  });

  test('should navigate to create department page', async ({ page }) => {
    // Click Add Department button
    await page.getByRole('link', { name: /add department/i }).click();
    
    // Verify navigation to create page
    await expect(page).toHaveURL(/\/departments\/new/);
    
    // Check form elements
    await expect(page.getByText(/create department/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create department/i })).toBeVisible();
  });

  test('should show validation errors for empty department form', async ({ page }) => {
    await page.goto(`${BASE_URL}/departments/new`);
    await page.waitForLoadState('networkidle');
    
    // Click submit without filling fields
    await page.getByRole('button', { name: /create department/i }).click();
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // Check for required field errors
    await expect(page.getByText(/department code.*required/i)).toBeVisible();
    await expect(page.getByText(/department name.*required/i)).toBeVisible();
  });

  test('should create a new department without parent', async ({ page }) => {
    await page.goto(`${BASE_URL}/departments/new`);
    await page.waitForLoadState('networkidle');
    
    // Generate unique department data
    const timestamp = Date.now();
    const deptCode = `E2E${timestamp}`;
    const deptName = `E2E Test Department ${timestamp}`;
    
    // Fill required fields
    await page.getByLabel(/department code/i).fill(deptCode);
    await page.getByLabel(/department name/i).fill(deptName);
    await page.getByLabel(/description/i).fill('E2E test department');
    
    // Submit form
    await page.getByRole('button', { name: /create department/i }).click();
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify redirect to departments list
    await expect(page).toHaveURL(/\/departments$/);
  });

  test('should create a department with parent', async ({ page }) => {
    await page.goto(`${BASE_URL}/departments/new`);
    await page.waitForLoadState('networkidle');
    
    // Generate unique department data
    const timestamp = Date.now();
    const deptCode = `SUB${timestamp}`;
    const deptName = `E2E Sub-Department ${timestamp}`;
    
    // Fill required fields
    await page.getByLabel(/department code/i).fill(deptCode);
    await page.getByLabel(/department name/i).fill(deptName);
    
    // Select parent department if dropdown exists
    const parentSelect = page.getByLabel(/parent department/i);
    if (await parentSelect.isVisible()) {
      const options = parentSelect.locator('option');
      const optionCount = await options.count();
      
      // Select first available parent (skip "None" option)
      if (optionCount > 1) {
        await parentSelect.selectOption({ index: 1 });
      }
    }
    
    // Submit form
    await page.getByRole('button', { name: /create department/i }).click();
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify redirect
    await expect(page).toHaveURL(/\/departments/);
  });

  test('should view department details', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Click first department row
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Verify details page
    await expect(page).toHaveURL(/\/departments\/[a-f0-9-]+$/);
    
    // Check sections
    await expect(page.getByText(/department information/i)).toBeVisible();
  });

  test('should navigate to edit department page', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to first department details
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Click Edit button
    const editButton = page.getByRole('button', { name: /edit/i }).or(page.getByRole('link', { name: /edit/i }));
    await editButton.click();
    
    // Verify edit page
    await expect(page).toHaveURL(/\/departments\/[a-f0-9-]+\/edit$/);
    await expect(page.getByText(/edit department|save changes/i)).toBeVisible();
  });

  test('should update department information', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to first department
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Click Edit button
    const editButton = page.getByRole('button', { name: /edit/i }).or(page.getByRole('link', { name: /edit/i }));
    await editButton.click();
    await page.waitForTimeout(1000);
    
    // Update description
    const descInput = page.getByLabel(/description/i);
    await descInput.clear();
    await descInput.fill(`Updated by E2E test at ${Date.now()}`);
    
    // Submit
    await page.getByRole('button', { name: /save changes|update/i }).click();
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify redirect
    await expect(page).toHaveURL(/\/departments/);
  });

  test('should display department hierarchy with parent/children', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to first department
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Look for hierarchy information
    const hierarchySection = page.getByText(/hierarchy|parent department|sub-departments|children/i);
    
    // Hierarchy section should exist
    expect(await hierarchySection.count()).toBeGreaterThan(0);
  });

  test('should show employees in department', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to first department
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Look for employees section
    const employeesSection = page.getByText(/employees|team members|department employees/i);
    expect(await employeesSection.count()).toBeGreaterThan(0);
  });

  test('should cancel department creation', async ({ page }) => {
    await page.goto(`${BASE_URL}/departments/new`);
    await page.waitForLoadState('networkidle');
    
    // Fill some data
    await page.getByLabel(/department code/i).fill('TEST');
    
    // Click Cancel
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Verify navigation back
    await expect(page).toHaveURL(`${BASE_URL}/departments`);
  });

  test('should cancel department edit', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to department edit
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    const editButton = page.getByRole('button', { name: /edit/i }).or(page.getByRole('link', { name: /edit/i }));
    await editButton.click();
    await page.waitForTimeout(1000);
    
    // Make a change
    const descInput = page.getByLabel(/description/i);
    await descInput.fill('Changed');
    
    // Click Cancel
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Verify navigation back
    await expect(page).toHaveURL(/\/departments\/[a-f0-9-]+$/);
  });

  test('should open and close delete department modal', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to department details
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Look for Delete button
    const deleteButton = page.getByRole('button', { name: /delete/i });
    
    if (await deleteButton.isVisible()) {
      // Click Delete
      await deleteButton.click();
      await page.waitForTimeout(500);
      
      // Verify modal
      await expect(page.getByText(/delete department|confirm/i)).toBeVisible();
      
      // Click Cancel
      await page.getByRole('button', { name: /cancel|no/i }).click();
      await page.waitForTimeout(500);
      
      // Modal should be closed
      await expect(page.getByText(/delete department|confirm/i)).not.toBeVisible();
    }
  });

  test('should display empty state for search with no results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search departments/i);
    await searchInput.fill('NonExistentDepartment99999');
    
    await page.waitForTimeout(1000);
    
    // Check for empty state
    await expect(page.getByText(/no departments found/i)).toBeVisible();
  });
});
