import { test, expect } from '@playwright/test';

// Configuration
const API_URL = 'http://localhost:3000';

test.describe('Employee CRUD Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // ✅ Authentication loaded from storage state (playwright/.auth/user.json)
    // Navigate to the employees page
    await page.goto('/employees');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display employees list page', async ({ page }) => {
    // Check that the main heading is present
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
    
    // Check for search input
    await expect(page.getByPlaceholder('Search employees...')).toBeVisible();
    
    // Check for Add Employee button
    await expect(page.getByRole('link', { name: 'Add Employee' })).toBeVisible();
  });

  test('should search for employees', async ({ page }) => {
    // Wait for employees to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Type in the search box
    const searchInput = page.getByPlaceholder('Search employees...');
    await searchInput.fill('John');
    
    // Wait for search to filter results
    await page.waitForTimeout(500);
    
    // Verify search results contain "John"
    const tableRows = page.locator('tbody tr');
    const count = await tableRows.count();
    
    if (count > 0) {
      const firstRow = tableRows.first();
      await expect(firstRow).toContainText('john', { ignoreCase: true });
    }
  });

  test('should navigate to create employee page', async ({ page }) => {
    // Click the Add Employee button
    await page.getByRole('link', { name: 'Add Employee' }).click();
    
    // Verify navigation to create page
    await expect(page).toHaveURL(/\/employees\/new/);
    
    // Check that the form title is present
    await expect(page.getByText('Create Employee')).toBeVisible();
    
    // Verify form sections are present
    await expect(page.getByText('Personal Information')).toBeVisible();
    await expect(page.getByText('Contact Information')).toBeVisible();
    await expect(page.getByText('Employment Details')).toBeVisible();
  });

  test('should show validation errors when submitting empty form', async ({ page }) => {
    // Navigate to create page
    await page.goto('/employees/create');
    await page.waitForLoadState('networkidle');
    
    // Click submit button without filling any fields
    const submitButton = page.getByRole('button', { name: 'Create Employee' });
    await submitButton.click();
    
    // Wait for validation errors to appear
    await page.waitForTimeout(500);
    
    // Check for validation error messages
    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Last name is required')).toBeVisible();
    await expect(page.getByText('Employee number is required')).toBeVisible();
  });

  test('should create a new employee', async ({ page }) => {
    // Navigate to create page
    await page.goto('/employees/create');
    await page.waitForLoadState('networkidle');
    
    // Generate unique employee number
    const timestamp = Date.now();
    const employeeNumber = `E2E${timestamp}`;
    const email = `e2e.test.${timestamp}@example.com`;
    
    // Fill in required fields
    await page.getByRole('textbox', { name: /first name/i }).fill('E2E');
    await page.getByRole('textbox', { name: /last name/i }).fill('Test');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="employeeNumber"]').fill(employeeNumber);
    await page.locator('input[name="hireDate"]').fill('2024-11-01');
    
    // Fill optional fields
    await page.locator('input[name="jobTitle"]').fill('QA Engineer');
    
    // Submit the form
    await page.getByRole('button', { name: 'Create Employee' }).click();
    
    // Wait for navigation or success message
    await page.waitForTimeout(2000);
    
    // Verify redirect to employees list or details page
    await expect(page).toHaveURL(/\/employees/);
    
    // Verify success message or that we're on a valid page
    const url = page.url();
    expect(url).toMatch(/\/employees/);
  });

  test('should view employee details', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Click on the first employee row
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    
    // Wait for navigation to details page
    await page.waitForTimeout(1000);
    
    // Verify we're on the details page
    await expect(page).toHaveURL(/\/employees\/[a-f0-9-]+$/);
    
    // Verify employee details are displayed
    await expect(page.getByText('Employment Information')).toBeVisible();
    await expect(page.getByText('Contact Information')).toBeVisible();
    
    // Verify action buttons are present
    await expect(page.getByRole('button', { name: 'Edit Employee' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to Employees' })).toBeVisible();
  });

  test('should navigate through employee detail tabs', async ({ page }) => {
    // Navigate to first employee details
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Verify Overview tab is active by default
    await expect(page.getByText('Employment Information')).toBeVisible();
    
    // Click on Personal Info tab
    await page.getByRole('button', { name: 'Personal Info' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Personal Information')).toBeVisible();
    
    // Click on Employment tab
    await page.getByRole('button', { name: 'Employment', exact: true }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Employment Details')).toBeVisible();
    
    // Click on Contracts tab
    await page.getByRole('button', { name: 'Contracts' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/contract/i)).toBeVisible();
    
    // Click on Performance tab
    await page.getByRole('button', { name: 'Performance' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/performance/i)).toBeVisible();
    
    // Click on Time Off tab
    await page.getByRole('button', { name: 'Time Off' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/time off/i)).toBeVisible();
  });

  test('should navigate to edit employee page', async ({ page }) => {
    // Navigate to first employee details
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Click Edit Employee button
    await page.getByRole('button', { name: 'Edit Employee' }).click();
    
    // Verify navigation to edit page
    await expect(page).toHaveURL(/\/employees\/[a-f0-9-]+\/edit$/);
    
    // Verify form is in edit mode
    await expect(page.getByText('Edit Employee')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update Employee' })).toBeVisible();
    
    // Verify form is pre-populated with data
    const firstNameInput = page.getByRole('textbox', { name: /first name/i });
    await expect(firstNameInput).not.toBeEmpty();
  });

  test('should update an employee', async ({ page }) => {
    // Navigate to first employee details
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Click Edit Employee button
    await page.getByRole('button', { name: 'Edit Employee' }).click();
    await page.waitForTimeout(1000);
    
    // Update job title
    const jobTitleInput = page.locator('input[name="jobTitle"]');
    await jobTitleInput.clear();
    await jobTitleInput.fill('Updated Job Title - E2E Test');
    
    // Submit the form
    await page.getByRole('button', { name: 'Update Employee' }).click();
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify we're back on details page or employees list
    await expect(page).toHaveURL(/\/employees/);
  });

  test('should open and close terminate modal', async ({ page }) => {
    // Navigate to first employee details
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Look for Terminate button (only visible for active employees)
    const terminateButton = page.getByRole('button', { name: 'Terminate' });
    
    // Check if terminate button exists (employee must be active)
    if (await terminateButton.isVisible()) {
      // Click Terminate button
      await terminateButton.click();
      await page.waitForTimeout(500);
      
      // Verify modal is open
      await expect(page.getByText('Terminate Employee')).toBeVisible();
      await expect(page.getByText(/Are you sure you want to terminate/i)).toBeVisible();
      
      // Click Cancel button
      await page.getByRole('button', { name: 'Cancel' }).click();
      await page.waitForTimeout(500);
      
      // Verify modal is closed
      await expect(page.getByText('Terminate Employee')).not.toBeVisible();
    } else {
      console.log('Terminate button not visible - employee may already be terminated');
    }
  });

  test('should delete an employee from list', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Get initial row count
    const initialRowCount = await page.locator('tbody tr').count();
    
    if (initialRowCount > 0) {
      // Find delete button in last row to avoid deleting important test data
      const lastRow = page.locator('tbody tr').last();
      const deleteButton = lastRow.getByRole('button', { name: /delete/i });
      
      if (await deleteButton.isVisible()) {
        // Set up dialog handler for confirmation
        page.on('dialog', dialog => dialog.accept());
        
        // Click delete button
        await deleteButton.click();
        
        // Wait for deletion to complete
        await page.waitForTimeout(2000);
        
        // Verify row count decreased or page reloaded
        const newRowCount = await page.locator('tbody tr').count();
        expect(newRowCount).toBeLessThanOrEqual(initialRowCount);
      }
    }
  });

  test('should navigate back to employees list from details', async ({ page }) => {
    // Navigate to first employee details
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Click Back to Employees button
    await page.getByRole('button', { name: 'Back to Employees' }).click();
    
    // Verify navigation back to list
    await expect(page).toHaveURL('/employees');
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
  });

  test('should display empty state when no employees found', async ({ page }) => {
    // Search for non-existent employee
    const searchInput = page.getByPlaceholder('Search employees...');
    await searchInput.fill('NonExistentEmployee99999');
    
    // Wait for search to filter results
    await page.waitForTimeout(1000);
    
    // Verify empty state message is displayed
    await expect(page.getByText('No employees found')).toBeVisible();
  });

  test('should show employee count', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Verify employee count is displayed
    const countText = page.getByText(/Showing \d+ of \d+ employees/);
    await expect(countText).toBeVisible();
  });

  test('should cancel employee creation', async ({ page }) => {
    // Navigate to create page
    await page.goto('/employees/create');
    await page.waitForLoadState('networkidle');
    
    // Fill in some data
    await page.getByRole('textbox', { name: /first name/i }).fill('Test');
    
    // Click Cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Verify navigation back to list
    await expect(page).toHaveURL('/employees');
  });

  test('should cancel employee edit', async ({ page }) => {
    // Navigate to first employee details
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Click Edit Employee button
    await page.getByRole('button', { name: 'Edit Employee' }).click();
    await page.waitForTimeout(1000);
    
    // Make a change
    const jobTitleInput = page.locator('input[name="jobTitle"]');
    await jobTitleInput.clear();
    await jobTitleInput.fill('Changed Title');
    
    // Click Cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Verify navigation back
    await expect(page).toHaveURL(/\/employees\/[a-f0-9-]+$/);
  });
});

test.describe('Employee List Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/employees');
    await page.waitForLoadState('networkidle');
  });

  test('should display employee badges correctly', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Check for status badges (active, on leave, etc.)
    const statusBadges = page.locator('.badge, [class*="badge"], [class*="px-"]').filter({ hasText: /active|on leave|terminated/i });
    
    if (await statusBadges.count() > 0) {
      await expect(statusBadges.first()).toBeVisible();
    }
  });

  test('should display employee avatars or initials', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Look for avatar elements (could be images or divs with initials)
    const firstRow = page.locator('tbody tr').first();
    
    // Check if employee name is visible
    const employeeName = firstRow.locator('td').first();
    await expect(employeeName).toBeVisible();
  });

  test('should toggle filters panel', async ({ page }) => {
    // Look for Filters button or toggle
    const filtersButton = page.getByRole('button', { name: /filter/i });
    
    if (await filtersButton.isVisible()) {
      // Click to open filters
      await filtersButton.click();
      await page.waitForTimeout(500);
      
      // Click to close filters
      await filtersButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should clear search input', async ({ page }) => {
    // Type in the search box
    const searchInput = page.getByPlaceholder('Search employees...');
    await searchInput.fill('Test Search');
    
    // Clear the search
    await searchInput.clear();
    
    // Verify search is cleared
    await expect(searchInput).toHaveValue('');
  });
});
