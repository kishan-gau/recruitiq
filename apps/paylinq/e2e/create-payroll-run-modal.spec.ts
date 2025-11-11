import { test, expect } from '@playwright/test';

test.describe('Create Payroll Run Modal E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page that has the modal
    await page.goto('/payroll');
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('opens modal when create button is clicked', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    await expect(page.getByRole('heading', { name: /create payroll run/i })).toBeVisible();
  });

  test('displays default values for current month', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    // Check that payroll name contains current month
    const nameInput = page.getByTestId('payroll-name-input');
    const nameValue = await nameInput.inputValue();
    expect(nameValue).toContain('Payroll');

    // Check that dates are populated
    const startInput = page.getByTestId('period-start-input');
    const startValue = await startInput.inputValue();
    expect(startValue).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  test('creates regular payroll run successfully', async ({ page }) => {
    await page.route('**/*payroll-runs*', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payrollRun: {
            id: 'PR-001',
            run_number: 'PR-2024-11-001',
            status: 'draft',
          },
          message: 'Payroll run created successfully',
        }),
      });
    });

    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    await expect(page.getByTestId('create-payroll-modal')).toBeVisible();

    const submitButton = page.getByTestId('submit-button');
    await submitButton.click();

    // Modal should close on success
    await expect(page.getByTestId('create-payroll-modal')).not.toBeVisible({ timeout: 5000 });

    // Success toast should appear
    await expect(page.getByText(/payroll run created successfully/i)).toBeVisible();
  });

  test('validates required fields', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const nameInput = page.getByTestId('payroll-name-input');
    await nameInput.clear();

    const submitButton = page.getByTestId('submit-button');
    await submitButton.click();

    await expect(page.getByText(/payroll name is required/i)).toBeVisible();
  });

  test('validates date range logic', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const startInput = page.getByTestId('period-start-input');
    const endInput = page.getByTestId('period-end-input');

    await startInput.fill('2024-11-30');
    await endInput.fill('2024-11-01');

    const submitButton = page.getByTestId('submit-button');
    await submitButton.click();

    await expect(page.getByText(/end date must be after start date/i)).toBeVisible();
  });

  test('allows selecting different payroll types', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const typeSelect = page.getByTestId('payroll-type-select');
    await typeSelect.selectOption('13th-month');

    expect(await typeSelect.inputValue()).toBe('13th-month');
  });

  test('updates period summary when dates change', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const startInput = page.getByTestId('period-start-input');
    await startInput.fill('2024-12-01');

    await expect(page.getByText(/December/)).toBeVisible();
  });

  test('closes modal on cancel', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    await expect(page.getByRole('heading', { name: /create payroll run/i })).not.toBeVisible();
  });

  test('disables submit button during submission', async ({ page }) => {
    await page.route('**/*payroll-runs*', async (route) => {
      // Simulate slow API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payrollRun: { id: 'PR-001' },
        }),
      });
    });

    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const submitButton = page.getByTestId('submit-button');
    await submitButton.click();

    // Button should be disabled and show loading text
    await expect(submitButton).toBeDisabled();
    await expect(page.getByText(/creating/i)).toBeVisible();
  });

  test('handles API errors gracefully', async ({ page }) => {
    await page.route('**/*payroll-runs*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Internal server error',
        }),
      });
    });

    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const submitButton = page.getByTestId('submit-button');
    await submitButton.click();

    await expect(page.getByText(/failed to create|internal server error/i)).toBeVisible();
  });

  test('supports keyboard navigation', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const nameInput = page.getByTestId('payroll-name-input');
    await nameInput.focus();

    // Tab through fields
    await page.keyboard.press('Tab');
    const typeSelect = page.getByTestId('payroll-type-select');
    await expect(typeSelect).toBeFocused();

    await page.keyboard.press('Tab');
    const startInput = page.getByTestId('period-start-input');
    await expect(startInput).toBeFocused();
  });

  test('maintains form data after validation error', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const nameInput = page.getByTestId('payroll-name-input');
    await nameInput.clear();
    await nameInput.fill('Test Payroll');

    const descriptionInput = page.getByTestId('description-input');
    await descriptionInput.fill('Test Description');

    const startInput = page.getByTestId('period-start-input');
    await startInput.clear();

    const submitButton = page.getByTestId('submit-button');
    await submitButton.click();

    // Validation error appears
    await expect(page.getByText(/start date is required/i)).toBeVisible();

    // Form data should still be present
    expect(await nameInput.inputValue()).toBe('Test Payroll');
    expect(await descriptionInput.inputValue()).toBe('Test Description');
  });

  test('creates bonus payroll with custom description', async ({ page }) => {
    await page.route('**/*payroll-runs*', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payrollRun: { id: 'PR-002', run_type: 'bonus' },
          message: 'Payroll run created successfully',
        }),
      });
    });

    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const typeSelect = page.getByTestId('payroll-type-select');
    await typeSelect.selectOption('bonus');

    const descriptionInput = page.getByTestId('description-input');
    await descriptionInput.fill('Year-end performance bonus');

    const submitButton = page.getByTestId('submit-button');
    await submitButton.click();

    await expect(page.getByText(/payroll run created successfully/i)).toBeVisible();
  });

  test('creates 13th month payroll for December', async ({ page }) => {
    await page.route('**/*payroll-runs*', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payrollRun: { id: 'PR-003', run_type: '13th-month' },
          message: 'Payroll run created successfully',
        }),
      });
    });

    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const typeSelect = page.getByTestId('payroll-type-select');
    await typeSelect.selectOption('13th-month');

    const startInput = page.getByTestId('period-start-input');
    await startInput.fill('2024-12-01');

    const endInput = page.getByTestId('period-end-input');
    await endInput.fill('2024-12-31');

    const paymentInput = page.getByTestId('payment-date-input');
    await paymentInput.fill('2025-01-05');

    const submitButton = page.getByTestId('submit-button');
    await submitButton.click();

    await expect(page.getByText(/payroll run created successfully/i)).toBeVisible();
  });

  test('creates correction run with past dates', async ({ page }) => {
    await page.route('**/*payroll-runs*', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          payrollRun: { id: 'PR-004', run_type: 'correction' },
          message: 'Payroll run created successfully',
        }),
      });
    });

    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const typeSelect = page.getByTestId('payroll-type-select');
    await typeSelect.selectOption('correction');

    const nameInput = page.getByTestId('payroll-name-input');
    await nameInput.clear();
    await nameInput.fill('October 2024 Correction');

    const submitButton = page.getByTestId('submit-button');
    await submitButton.click();

    await expect(page.getByText(/payroll run created successfully/i)).toBeVisible();
  });

  test('validates payment date is after period end', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    const endInput = page.getByTestId('period-end-input');
    await endInput.fill('2024-11-30');

    const paymentInput = page.getByTestId('payment-date-input');
    await paymentInput.fill('2024-11-25');

    const submitButton = page.getByTestId('submit-button');
    await submitButton.click();

    await expect(
      page.getByText(/payment date should be after period end date/i)
    ).toBeVisible();
  });

  test('displays informational message about employees', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    await expect(
      page.getByText(/a new payroll run will be created for all active employees/i)
    ).toBeVisible();
  });

  test('shows period summary with formatted dates', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create payroll run/i }).first();
    await createButton.click();

    await expect(page.getByText(/period summary/i)).toBeVisible();
    await expect(page.getByText(/payment:/i)).toBeVisible();
    await expect(page.getByText(/→/)).toBeVisible();
  });
});
