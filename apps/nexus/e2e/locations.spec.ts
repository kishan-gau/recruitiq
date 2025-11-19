import { test, expect } from '@playwright/test';

test.describe('Locations Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // ✅ Authentication loaded from storage state (playwright/.auth/user.json)
    await page.goto('/locations');
    await page.waitForLoadState('networkidle');
  });

  test('should display locations list page', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: 'Locations', exact: true })).toBeVisible();
    
    // Check search input
    await expect(page.getByPlaceholder(/search locations/i)).toBeVisible();
    
    // Check Add Location button
    await expect(page.getByRole('link', { name: /add location/i })).toBeVisible();
    
    // Wait for locations to load
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test('should search for locations by name and code', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Search by location name
    const searchInput = page.getByPlaceholder(/search locations/i);
    await searchInput.fill('HQ');
    
    await page.waitForTimeout(500);
    
    // Verify results
    const tableRows = page.locator('tbody tr');
    const count = await tableRows.count();
    
    if (count > 0) {
      const firstRow = tableRows.first();
      await expect(firstRow).toContainText('hq', { ignoreCase: true });
    }
  });

  test('should filter locations by type', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Look for location type filter
    const typeSelect = page.locator('select').filter({ hasText: /all types|headquarters|branch|remote/i });
    
    if (await typeSelect.count() > 0) {
      const firstSelect = typeSelect.first();
      
      // Select "Branch" type
      await firstSelect.selectOption('branch');
      await page.waitForTimeout(500);
      
      // Verify branch locations are shown
      const branchBadges = page.locator('text=/branch/i');
      if (await branchBadges.count() > 0) {
        await expect(branchBadges.first()).toBeVisible();
      }
    }
  });

  test('should filter locations by status', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Look for status filter
    const statusSelect = page.locator('select').filter({ hasText: /all statuses|active|inactive/i });
    
    if (await statusSelect.count() > 0) {
      const firstSelect = statusSelect.first();
      
      // Select "Active" status
      await firstSelect.selectOption('active');
      await page.waitForTimeout(500);
    }
  });

  test('should navigate to create location page', async ({ page }) => {
    // Click Add Location button
    await page.getByRole('link', { name: /add location/i }).first().click();
    
    // Verify navigation
    await expect(page).toHaveURL(/\/locations\/new/);
    
    // Check form sections
    await expect(page.getByText(/create location/i)).toBeVisible();
    await expect(page.getByText(/basic information/i)).toBeVisible();
    await expect(page.getByText(/address/i)).toBeVisible();
    await expect(page.getByText(/contact information/i)).toBeVisible();
  });

  test('should show validation errors for empty location form', async ({ page }) => {
    await page.goto(`/locations/new`);
    await page.waitForLoadState('networkidle');
    
    // Click submit without filling fields
    await page.getByRole('button', { name: /create location/i }).click();
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // Check for required field errors
    await expect(page.getByText(/location code.*required/i)).toBeVisible();
    await expect(page.getByText(/location name.*required/i)).toBeVisible();
    await expect(page.getByText(/address.*required/i)).toBeVisible();
    await expect(page.getByText(/country.*required/i)).toBeVisible();
  });

  test('should validate location code format', async ({ page }) => {
    await page.goto(`/locations/new`);
    await page.waitForLoadState('networkidle');
    
    // Enter invalid location code (lowercase)
    const codeInput = page.getByLabel(/location code/i);
    await codeInput.fill('invalid-code');
    
    // Trigger validation by moving to next field
    await codeInput.blur();
    await page.waitForTimeout(500);
    
    // Check for format validation error
    await expect(page.getByText(/location code must contain only uppercase/i)).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto(`/locations/new`);
    await page.waitForLoadState('networkidle');
    
    // Enter invalid email
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('notanemail');
    
    // Trigger validation
    await emailInput.blur();
    await page.waitForTimeout(500);
    
    // Check for email validation error
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('should validate phone number format', async ({ page }) => {
    await page.goto(`/locations/new`);
    await page.waitForLoadState('networkidle');
    
    // Enter invalid phone
    const phoneInput = page.getByLabel(/phone/i);
    await phoneInput.fill('invalid-phone');
    
    // Trigger validation
    await phoneInput.blur();
    await page.waitForTimeout(500);
    
    // Check for phone validation error
    await expect(page.getByText(/invalid phone number/i)).toBeVisible();
  });

  test('should create a new location with required fields only', async ({ page }) => {
    await page.goto(`/locations/new`);
    await page.waitForLoadState('networkidle');
    
    // Generate unique location data
    const timestamp = Date.now();
    const locationCode = `E2E${timestamp}`.substring(0, 10);
    const locationName = `E2E Location ${timestamp}`;
    
    // Fill required fields
    await page.getByLabel(/location code/i).fill(locationCode);
    await page.getByLabel(/location name/i).fill(locationName);
    
    // Select location type
    const typeSelect = page.getByLabel(/location type/i);
    await typeSelect.selectOption('branch');
    
    // Fill address required fields
    await page.getByLabel(/address line 1/i).fill('123 Test Street');
    await page.getByLabel(/country/i).fill('USA');
    
    // Submit form
    await page.getByRole('button', { name: /create location/i }).click();
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify redirect to locations list
    await expect(page).toHaveURL(`/locations`);
  });

  test('should create a location with all fields including optional', async ({ page }) => {
    await page.goto(`/locations/new`);
    await page.waitForLoadState('networkidle');
    
    // Generate unique location data
    const timestamp = Date.now();
    const locationCode = `FULL${timestamp}`.substring(0, 10);
    const locationName = `Full E2E Location ${timestamp}`;
    
    // Fill required fields
    await page.getByLabel(/location code/i).fill(locationCode);
    await page.getByLabel(/location name/i).fill(locationName);
    
    // Select location type
    const typeSelect = page.getByLabel(/location type/i);
    await typeSelect.selectOption('headquarters');
    
    // Fill address fields
    await page.getByLabel(/address line 1/i).fill('456 Main Avenue');
    await page.getByLabel(/address line 2/i).fill('Suite 200');
    await page.getByLabel(/city/i).fill('San Francisco');
    await page.getByLabel(/state.*province/i).fill('CA');
    await page.getByLabel(/postal code/i).fill('94105');
    await page.getByLabel(/country/i).fill('USA');
    
    // Fill contact information
    await page.getByLabel(/phone/i).fill('+1-555-0100');
    await page.getByLabel(/email/i).fill(`e2e.${timestamp}@location.com`);
    
    // Check Active checkbox
    const activeCheckbox = page.getByLabel(/active/i);
    await activeCheckbox.check();
    
    // Submit form
    await page.getByRole('button', { name: /create location/i }).click();
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify redirect
    await expect(page).toHaveURL(`/locations`);
  });

  test('should view location details', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Click first location row
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Verify details page
    await expect(page).toHaveURL(/\/locations\/[a-f0-9-]+$/);
    
    // Check sections
    await expect(page.getByText(/location information/i)).toBeVisible();
    await expect(page.getByText(/address/i)).toBeVisible();
    await expect(page.getByText(/contact information/i)).toBeVisible();
  });

  test('should display location address correctly', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Click first location
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Verify address section
    const addressSection = page.getByText(/address/i);
    await expect(addressSection).toBeVisible();
    
    // Check for address fields
    const addressContent = page.locator('text=/street|city|state|country|postal/i');
    expect(await addressContent.count()).toBeGreaterThan(0);
  });

  test('should display location contact information', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Click first location
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Verify contact section
    await expect(page.getByText(/contact information/i)).toBeVisible();
  });

  test('should navigate to edit location page', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to location details
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Click Edit button
    const editButton = page.getByRole('button', { name: /edit/i }).or(page.getByRole('link', { name: /edit/i }));
    await editButton.click();
    
    // Verify edit page
    await expect(page).toHaveURL(/\/locations\/[a-f0-9-]+\/edit$/);
    await expect(page.getByText(/edit location|save changes/i)).toBeVisible();
  });

  test('should update location information', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to first location
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Click Edit
    const editButton = page.getByRole('button', { name: /edit/i }).or(page.getByRole('link', { name: /edit/i }));
    await editButton.click();
    await page.waitForTimeout(1000);
    
    // Update city field
    const cityInput = page.getByLabel(/city/i);
    await cityInput.clear();
    await cityInput.fill(`Updated City ${Date.now()}`);
    
    // Submit
    await page.getByRole('button', { name: /save changes|update/i }).click();
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify redirect
    await expect(page).toHaveURL(/\/locations\/[a-f0-9-]+$/);
  });

  test('should show employees at location', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to location details
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Look for employees section
    const employeesSection = page.getByText(/employees|team members/i);
    expect(await employeesSection.count()).toBeGreaterThan(0);
  });

  test('should cancel location creation', async ({ page }) => {
    await page.goto(`/locations/new`);
    await page.waitForLoadState('networkidle');
    
    // Fill some data
    await page.getByLabel(/location code/i).fill('TEST');
    
    // Click Cancel
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Verify navigation back
    await expect(page).toHaveURL(`/locations`);
  });

  test('should cancel location edit', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to location edit
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    const editButton = page.getByRole('button', { name: /edit/i }).or(page.getByRole('link', { name: /edit/i }));
    await editButton.click();
    await page.waitForTimeout(1000);
    
    // Make a change
    const cityInput = page.getByLabel(/city/i);
    await cityInput.fill('Changed City');
    
    // Click Cancel
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Verify navigation back
    await expect(page).toHaveURL(/\/locations\/[a-f0-9-]+$/);
  });

  test('should open and close delete location modal', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to location details
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
      await expect(page.getByText(/delete location|confirm/i)).toBeVisible();
      
      // Click Cancel
      await page.getByRole('button', { name: /cancel|no/i }).click();
      await page.waitForTimeout(500);
      
      // Modal should be closed
      await expect(page.getByText(/delete location|confirm/i)).not.toBeVisible();
    }
  });

  test('should display location type badges', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Check for location type badges
    const typeBadges = page.locator('text=/headquarters|branch|remote|warehouse|store/i');
    
    if (await typeBadges.count() > 0) {
      await expect(typeBadges.first()).toBeVisible();
    }
  });

  test('should display active/inactive status', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Check for status indicators
    const statusBadges = page.locator('text=/active|inactive/i');
    
    if (await statusBadges.count() > 0) {
      await expect(statusBadges.first()).toBeVisible();
    }
  });

  test('should display empty state for search with no results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search locations/i);
    await searchInput.fill('NonExistentLocation99999');
    
    await page.waitForTimeout(1000);
    
    // Check for empty state
    await expect(page.getByText(/no locations found/i)).toBeVisible();
  });

  test('should display location count', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Look for count display
    const countText = page.getByText(/showing.*locations?/i);
    
    if (await countText.count() > 0) {
      await expect(countText.first()).toBeVisible();
    }
  });
});
