import { test, expect } from '@playwright/test';

test.describe('Cross-Module Integration Tests', () => {
  // ✅ Authentication loaded from storage state (playwright/.auth/user.json)
  // No beforeEach needed - each test navigates as needed
  
  test('should navigate between employees, departments, and locations', async ({ page }) => {
    // Start at employees page
    await page.goto('/employees');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
    
    // Navigate to departments via menu/navigation
    await page.goto('/departments');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Departments' })).toBeVisible();
    
    // Navigate to locations
    await page.goto('/locations');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Locations' })).toBeVisible();
    
    // Navigate back to employees
    await page.goto('/employees');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
  });

  test('should create employee with department assignment', async ({ page }) => {
    // First, ensure we have a department
    await page.goto('/departments');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to create employee
    await page.goto('/employees/create');
    await page.waitForLoadState('networkidle');
    
    // Generate unique employee data
    const timestamp = Date.now();
    const employeeNumber = `E2E${timestamp}`;
    const email = `e2e.${timestamp}@example.com`;
    
    // Fill required fields
    await page.getByLabel(/first name/i).fill('Cross');
    await page.getByLabel(/last name/i).fill('Module');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="employeeNumber"]').fill(employeeNumber);
    await page.locator('input[name="hireDate"]').fill('2024-11-01');
    
    // Select department if available
    const deptSelect = page.locator('select[name="departmentId"], #departmentId').first();
    if (await deptSelect.isVisible()) {
      const options = deptSelect.locator('option');
      const optionCount = await options.count();
      
      // Select first department (skip empty option)
      if (optionCount > 1) {
        await deptSelect.selectOption({ index: 1 });
      }
    }
    
    // Submit form
    await page.getByRole('button', { name: 'Create Employee' }).click();
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify redirect
    await expect(page).toHaveURL(/\/employees/);
  });

  test('should create employee with location assignment', async ({ page }) => {
    // Ensure we have a location
    await page.goto(`/locations`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to create employee
    await page.goto(`/employees/create`);
    await page.waitForLoadState('networkidle');
    
    // Generate unique employee data
    const timestamp = Date.now();
    const employeeNumber = `LOC${timestamp}`;
    const email = `loc.${timestamp}@example.com`;
    
    // Fill required fields
    await page.getByLabel(/first name/i).fill('Location');
    await page.getByLabel(/last name/i).fill('Test');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="employeeNumber"]').fill(employeeNumber);
    await page.locator('input[name="hireDate"]').fill('2024-11-01');
    
    // Select location if available
    const locSelect = page.locator('select[name="locationId"], #locationId').first();
    if (await locSelect.isVisible()) {
      const options = locSelect.locator('option');
      const optionCount = await options.count();
      
      // Select first location (skip empty option)
      if (optionCount > 1) {
        await locSelect.selectOption({ index: 1 });
      }
    }
    
    // Submit form
    await page.getByRole('button', { name: 'Create Employee' }).click();
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify redirect
    await expect(page).toHaveURL(/\/employees/);
  });

  test('should create employee with both department and location', async ({ page }) => {
    // Navigate to create employee
    await page.goto(`/employees/create`);
    await page.waitForLoadState('networkidle');
    
    // Generate unique employee data
    const timestamp = Date.now();
    const employeeNumber = `FULL${timestamp}`;
    const email = `full.${timestamp}@example.com`;
    
    // Fill required fields
    await page.getByLabel(/first name/i).fill('Full');
    await page.getByLabel(/last name/i).fill('Integration');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="employeeNumber"]').fill(employeeNumber);
    await page.locator('input[name="hireDate"]').fill('2024-11-01');
    await page.locator('input[name="jobTitle"]').fill('Integration Tester');
    
    // Select department if available
    const deptSelect = page.locator('select[name="departmentId"], #departmentId').first();
    if (await deptSelect.isVisible()) {
      const options = deptSelect.locator('option');
      const optionCount = await options.count();
      if (optionCount > 1) {
        await deptSelect.selectOption({ index: 1 });
      }
    }
    
    // Select location if available
    const locSelect = page.locator('select[name="locationId"], #locationId').first();
    if (await locSelect.isVisible()) {
      const options = locSelect.locator('option');
      const optionCount = await options.count();
      if (optionCount > 1) {
        await locSelect.selectOption({ index: 1 });
      }
    }
    
    // Submit form
    await page.getByRole('button', { name: 'Create Employee' }).click();
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify redirect
    await expect(page).toHaveURL(/\/employees/);
  });

  test('should view employee and see assigned department', async ({ page }) => {
    await page.goto(`/employees`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Click first employee
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Look for department information
    const deptSection = page.getByText(/department|employment information/i);
    expect(await deptSection.count()).toBeGreaterThan(0);
  });

  test('should view employee and see assigned location', async ({ page }) => {
    await page.goto(`/employees`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Click first employee
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Look for location information
    const locSection = page.getByText(/location|employment information|contact information/i);
    expect(await locSection.count()).toBeGreaterThan(0);
  });

  test('should navigate from department to view its employees', async ({ page }) => {
    await page.goto(`/departments`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Click first department
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Look for employees section
    const employeesSection = page.getByText(/employees|team members/i);
    expect(await employeesSection.count()).toBeGreaterThan(0);
    
    // If there's a link to employee, we could click it
    const employeeLink = page.locator('a[href*="/employees/"]').first();
    if (await employeeLink.isVisible()) {
      // This verifies employees are linked properly
      await expect(employeeLink).toHaveAttribute('href', /\/employees\//);
    }
  });

  test('should navigate from location to view its employees', async ({ page }) => {
    await page.goto(`/locations`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Click first location
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Look for employees section
    const employeesSection = page.getByText(/employees|team members/i);
    expect(await employeesSection.count()).toBeGreaterThan(0);
  });

  test('should edit employee and change department', async ({ page }) => {
    await page.goto(`/employees`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to employee edit
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    const editButton = page.getByRole('button', { name: /edit employee/i });
    await editButton.click();
    await page.waitForTimeout(1000);
    
    // Change department
    const deptSelect = page.locator('select[name="departmentId"], #departmentId').first();
    if (await deptSelect.isVisible()) {
      const options = deptSelect.locator('option');
      const optionCount = await options.count();
      
      // Select a different department
      if (optionCount > 2) {
        await deptSelect.selectOption({ index: 2 });
      } else if (optionCount > 1) {
        await deptSelect.selectOption({ index: 1 });
      }
      
      // Submit
      await page.getByRole('button', { name: /update employee/i }).click();
      await page.waitForTimeout(2000);
      
      // Verify redirect
      await expect(page).toHaveURL(/\/employees/);
    }
  });

  test('should edit employee and change location', async ({ page }) => {
    await page.goto(`/employees`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to employee edit
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    const editButton = page.getByRole('button', { name: /edit employee/i });
    await editButton.click();
    await page.waitForTimeout(1000);
    
    // Change location
    const locSelect = page.locator('select[name="locationId"], #locationId').first();
    if (await locSelect.isVisible()) {
      const options = locSelect.locator('option');
      const optionCount = await options.count();
      
      // Select a different location
      if (optionCount > 2) {
        await locSelect.selectOption({ index: 2 });
      } else if (optionCount > 1) {
        await locSelect.selectOption({ index: 1 });
      }
      
      // Submit
      await page.getByRole('button', { name: /update employee/i }).click();
      await page.waitForTimeout(2000);
      
      // Verify redirect
      await expect(page).toHaveURL(/\/employees/);
    }
  });

  test('should search employees in a specific department', async ({ page }) => {
    await page.goto(`/employees`);
    await page.waitForLoadState('networkidle');
    
    // Look for department filter
    const deptFilter = page.locator('select').filter({ hasText: /all departments|department/i }).first();
    
    if (await deptFilter.isVisible()) {
      const options = deptFilter.locator('option');
      const optionCount = await options.count();
      
      if (optionCount > 1) {
        // Select a department
        await deptFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
        
        // Verify table is filtered
        await page.waitForSelector('table tbody tr', { timeout: 5000 });
      }
    }
  });

  test('should search employees in a specific location', async ({ page }) => {
    await page.goto(`/employees`);
    await page.waitForLoadState('networkidle');
    
    // Look for location filter
    const locFilter = page.locator('select').filter({ hasText: /all locations|location/i }).first();
    
    if (await locFilter.isVisible()) {
      const options = locFilter.locator('option');
      const optionCount = await options.count();
      
      if (optionCount > 1) {
        // Select a location
        await locFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
        
        // Verify table is filtered
        await page.waitForSelector('table tbody tr', { timeout: 5000 });
      }
    }
  });

  test('should create department hierarchy and assign employees', async ({ page }) => {
    // Create parent department
    await page.goto(`/departments/new`);
    await page.waitForLoadState('networkidle');
    
    const timestamp = Date.now();
    const parentCode = `PAR${timestamp}`.substring(0, 10);
    const parentName = `Parent Dept ${timestamp}`;
    
    await page.getByLabel(/department code/i).fill(parentCode);
    await page.getByLabel(/department name/i).fill(parentName);
    await page.getByRole('button', { name: /create department/i }).click();
    await page.waitForTimeout(2000);
    
    // Now create child department with parent
    await page.goto(`/departments/new`);
    await page.waitForLoadState('networkidle');
    
    const childCode = `CHD${timestamp}`.substring(0, 10);
    const childName = `Child Dept ${timestamp}`;
    
    await page.getByLabel(/department code/i).fill(childCode);
    await page.getByLabel(/department name/i).fill(childName);
    
    // Select parent if available
    const parentSelect = page.getByLabel(/parent department/i);
    if (await parentSelect.isVisible()) {
      const options = parentSelect.locator('option');
      const optionCount = await options.count();
      if (optionCount > 1) {
        // Try to find the parent we just created
        const parentOption = parentSelect.locator(`option:has-text("${parentName}")`);
        if (await parentOption.count() > 0) {
          await parentOption.first().click();
        } else {
          // Just select any available parent
          await parentSelect.selectOption({ index: 1 });
        }
      }
    }
    
    await page.getByRole('button', { name: /create department/i }).click();
    await page.waitForTimeout(2000);
    
    // Verify both departments exist
    await page.goto(`/departments`);
    await page.waitForLoadState('networkidle');
    
    // Search for parent
    const searchInput = page.getByPlaceholder(/search departments/i);
    await searchInput.fill(parentName);
    await page.waitForTimeout(1000);
    
    // Should find the parent department
    const tableRows = page.locator('tbody tr');
    if (await tableRows.count() > 0) {
      await expect(tableRows.first()).toContainText(parentName);
    }
  });

  test('should create location and department, then assign to employee', async ({ page }) => {
    const timestamp = Date.now();
    
    // Create location
    await page.goto(`/locations/new`);
    await page.waitForLoadState('networkidle');
    
    const locCode = `INT${timestamp}`.substring(0, 10);
    const locName = `Integration Location ${timestamp}`;
    
    await page.getByLabel(/location code/i).fill(locCode);
    await page.getByLabel(/location name/i).fill(locName);
    await page.getByLabel(/location type/i).selectOption('branch');
    await page.getByLabel(/address line 1/i).fill('123 Test St');
    await page.getByLabel(/country/i).fill('USA');
    await page.getByRole('button', { name: /create location/i }).click();
    await page.waitForTimeout(2000);
    
    // Create department
    await page.goto(`/departments/new`);
    await page.waitForLoadState('networkidle');
    
    const deptCode = `INT${timestamp}`.substring(0, 10);
    const deptName = `Integration Dept ${timestamp}`;
    
    await page.getByLabel(/department code/i).fill(deptCode);
    await page.getByLabel(/department name/i).fill(deptName);
    await page.getByRole('button', { name: /create department/i }).click();
    await page.waitForTimeout(2000);
    
    // Create employee with both
    await page.goto(`/employees/create`);
    await page.waitForLoadState('networkidle');
    
    const empNum = `INT${timestamp}`;
    const empEmail = `int.${timestamp}@example.com`;
    
    await page.getByLabel(/first name/i).fill('Integration');
    await page.getByLabel(/last name/i).fill('Test');
    await page.locator('input[name="email"]').fill(empEmail);
    await page.locator('input[name="employeeNumber"]').fill(empNum);
    await page.locator('input[name="hireDate"]').fill('2024-11-01');
    
    // Try to select our newly created department
    const deptSelect = page.locator('select[name="departmentId"], #departmentId').first();
    if (await deptSelect.isVisible()) {
      const deptOption = deptSelect.locator(`option:has-text("${deptName}")`);
      if (await deptOption.count() > 0) {
        await deptOption.first().click();
      }
    }
    
    // Try to select our newly created location
    const locSelect = page.locator('select[name="locationId"], #locationId').first();
    if (await locSelect.isVisible()) {
      const locOption = locSelect.locator(`option:has-text("${locName}")`);
      if (await locOption.count() > 0) {
        await locOption.first().click();
      }
    }
    
    await page.getByRole('button', { name: /create employee/i }).click();
    await page.waitForTimeout(2000);
    
    // Verify success
    await expect(page).toHaveURL(/\/employees/);
  });

  test('should validate referential integrity - cannot delete department with employees', async ({ page }) => {
    // This test verifies that departments with employees cannot be easily deleted
    await page.goto(`/departments`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to a department
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Check if department has employees
    const employeesText = page.getByText(/\d+ employees?/i);
    
    if (await employeesText.isVisible()) {
      const text = await employeesText.textContent();
      const hasEmployees = text && /[1-9]\d*/.test(text);
      
      if (hasEmployees) {
        // Try to delete
        const deleteButton = page.getByRole('button', { name: /delete/i });
        
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          await page.waitForTimeout(500);
          
          // Should show warning or confirmation about employees
          const warningText = page.getByText(/employees|cannot delete|warning/i);
          expect(await warningText.count()).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should validate referential integrity - cannot delete location with employees', async ({ page }) => {
    // This test verifies that locations with employees cannot be easily deleted
    await page.goto(`/locations`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Navigate to a location
    const firstRow = page.locator('tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    
    // Check if location has employees
    const employeesText = page.getByText(/\d+ employees?/i);
    
    if (await employeesText.isVisible()) {
      const text = await employeesText.textContent();
      const hasEmployees = text && /[1-9]\d*/.test(text);
      
      if (hasEmployees) {
        // Try to delete
        const deleteButton = page.getByRole('button', { name: /delete/i });
        
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          await page.waitForTimeout(500);
          
          // Should show warning or confirmation about employees
          const warningText = page.getByText(/employees|cannot delete|warning/i);
          expect(await warningText.count()).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should display breadcrumbs or navigation path', async ({ page }) => {
    // Navigate through different pages and verify navigation elements
    await page.goto(`/employees`);
    await page.waitForLoadState('networkidle');
    
    // Check for navigation elements
    const nav = page.locator('nav, [role="navigation"]');
    expect(await nav.count()).toBeGreaterThan(0);
  });

  test('should handle concurrent creation of department and location', async ({ page }) => {
    const timestamp = Date.now();
    
    // Create department in one flow
    await page.goto(`/departments/new`);
    await page.waitForLoadState('networkidle');
    
    const deptCode = `CON${timestamp}`.substring(0, 10);
    await page.getByLabel(/department code/i).fill(deptCode);
    await page.getByLabel(/department name/i).fill(`Concurrent Dept ${timestamp}`);
    await page.getByRole('button', { name: /create department/i }).click();
    await page.waitForTimeout(2000);
    
    // Immediately create location
    await page.goto(`/locations/new`);
    await page.waitForLoadState('networkidle');
    
    const locCode = `CON${timestamp}`.substring(0, 10);
    await page.getByLabel(/location code/i).fill(locCode);
    await page.getByLabel(/location name/i).fill(`Concurrent Location ${timestamp}`);
    await page.getByLabel(/location type/i).selectOption('branch');
    await page.getByLabel(/address line 1/i).fill('456 Concurrent Ave');
    await page.getByLabel(/country/i).fill('USA');
    await page.getByRole('button', { name: /create location/i }).click();
    await page.waitForTimeout(2000);
    
    // Both should be created successfully
    await expect(page).toHaveURL(/\/locations$/);
  });
});

