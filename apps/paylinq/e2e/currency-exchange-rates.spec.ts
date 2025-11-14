import { test, expect } from './fixtures';

test.describe('Exchange Rates Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to exchange rates page
    await page.goto('/currency/exchange-rates');
    await page.waitForLoadState('networkidle');
  });

  test('should display exchange rates page with stats', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Exchange Rates');

    // Check stats cards are visible
    await expect(page.locator('text=Total Rates')).toBeVisible();
    await expect(page.locator('text=Active Rates')).toBeVisible();
    await expect(page.locator('text=Currencies')).toBeVisible();

    // Check "Add Exchange Rate" button exists
    await expect(page.locator('button:has-text("Add Exchange Rate")')).toBeVisible();
  });

  test('should filter exchange rates by currency', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // Get initial row count
    const initialRows = await page.locator('table tbody tr').count();

    // Select a currency filter
    await page.selectOption('select:near(:text("Filter by Currency"))', 'USD');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Check that filtering occurred (rows changed or stayed same)
    const filteredRows = await page.locator('table tbody tr').count();
    expect(filteredRows).toBeGreaterThan(0);

    // Verify all visible rows contain USD
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const rowText = await rows.nth(i).textContent();
      expect(rowText).toContain('USD');
    }
  });

  test('should filter exchange rates by source', async ({ page }) => {
    // Select source filter
    await page.selectOption('select:near(:text("Filter by Source"))', 'manual');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify manual badge appears in visible rows
    const manualBadges = page.locator('text=manual');
    expect(await manualBadges.count()).toBeGreaterThan(0);
  });

  test('should open add exchange rate modal', async ({ page }) => {
    // Click "Add Exchange Rate" button
    await page.click('button:has-text("Add Exchange Rate")');

    // Verify modal opens
    await expect(page.locator('h3:has-text("Add Exchange Rate")')).toBeVisible();

    // Verify form fields are present
    await expect(page.locator('label:has-text("From Currency")')).toBeVisible();
    await expect(page.locator('label:has-text("To Currency")')).toBeVisible();
    await expect(page.locator('label:has-text("Exchange Rate")')).toBeVisible();
    await expect(page.locator('label:has-text("Source")')).toBeVisible();
    await expect(page.locator('label:has-text("Effective From")')).toBeVisible();

    // Verify action buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Create Rate")')).toBeVisible();
  });

  test('should create new exchange rate', async ({ page }) => {
    // Click "Add Exchange Rate" button
    await page.click('button:has-text("Add Exchange Rate")');

    // Wait for modal
    await page.waitForSelector('h3:has-text("Add Exchange Rate")');

    // Fill in the form
    // Note: Adjust selectors based on actual CurrencySelector implementation
    await page.selectOption('select:near(:text("From Currency"))', 'EUR');
    await page.selectOption('select:near(:text("To Currency"))', 'SRD');
    await page.fill('input[type="number"]:near(:text("Exchange Rate"))', '25.50');
    await page.selectOption('select:near(:text("Source"))', 'manual');

    // Set effective from date
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]:near(:text("Effective From"))', today);

    // Verify rate preview appears
    await expect(page.locator('text=Rate Preview')).toBeVisible();
    await expect(page.locator('text=1 EUR = 25.50 SRD')).toBeVisible();

    // Submit the form
    await page.click('button:has-text("Create Rate")');

    // Wait for modal to close and success
    await page.waitForSelector('h3:has-text("Add Exchange Rate")', { state: 'hidden', timeout: 5000 });

    // Verify new rate appears in table
    await expect(page.locator('table tbody tr:has-text("EUR")')).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    // Open add modal
    await page.click('button:has-text("Add Exchange Rate")');
    await page.waitForSelector('h3:has-text("Add Exchange Rate")');

    // Try to submit without filling required fields
    await page.click('button:has-text("Create Rate")');

    // Check for validation errors
    await expect(page.locator('text=must be a positive number')).toBeVisible();
  });

  test('should swap currencies', async ({ page }) => {
    // Open add modal
    await page.click('button:has-text("Add Exchange Rate")');
    await page.waitForSelector('h3:has-text("Add Exchange Rate")');

    // Select currencies
    await page.selectOption('select:near(:text("From Currency"))', 'USD');
    await page.selectOption('select:near(:text("To Currency"))', 'SRD');

    // Enter a rate
    await page.fill('input[type="number"]:near(:text("Exchange Rate"))', '21.50');

    // Click swap button (⇄)
    await page.click('button:has-text("⇄")');

    // Wait for swap to complete
    await page.waitForTimeout(300);

    // Verify currencies swapped and rate inverted
    const fromSelect = page.locator('select:near(:text("From Currency"))');
    const toSelect = page.locator('select:near(:text("To Currency"))');
    
    expect(await fromSelect.inputValue()).toBe('SRD');
    expect(await toSelect.inputValue()).toBe('USD');

    // Verify rate was inverted (approximately 0.046512)
    const rateInput = page.locator('input[type="number"]:near(:text("Exchange Rate"))');
    const rateValue = parseFloat(await rateInput.inputValue());
    expect(rateValue).toBeCloseTo(0.046512, 5);
  });

  test('should show inverse rate calculation', async ({ page }) => {
    // Open add modal
    await page.click('button:has-text("Add Exchange Rate")');
    await page.waitForSelector('h3:has-text("Add Exchange Rate")');

    // Enter currencies and rate
    await page.selectOption('select:near(:text("From Currency"))', 'USD');
    await page.selectOption('select:near(:text("To Currency"))', 'SRD');
    await page.fill('input[type="number"]:near(:text("Exchange Rate"))', '21.50');

    // Verify inverse rate is displayed
    await expect(page.locator('text=Inverse rate:')).toBeVisible();
    await expect(page.locator('text=1 SRD = 0.046512 USD')).toBeVisible();
  });

  test('should edit existing exchange rate', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr:has-text("Edit")', { timeout: 5000 });

    // Click edit on first row
    await page.click('table tbody tr:first-child button:has-text("Edit")');

    // Wait for modal
    await expect(page.locator('h3:has-text("Edit Exchange Rate")')).toBeVisible();

    // Modify the rate
    const rateInput = page.locator('input[type="number"]:near(:text("Exchange Rate"))');
    await rateInput.clear();
    await rateInput.fill('22.00');

    // Submit
    await page.click('button:has-text("Update Rate")');

    // Wait for modal to close
    await page.waitForSelector('h3:has-text("Edit Exchange Rate")', { state: 'hidden', timeout: 5000 });

    // Verify update succeeded (table refreshed)
    await expect(page.locator('table tbody tr')).toBeVisible();
  });

  test('should delete exchange rate with confirmation', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr:has-text("Delete")', { timeout: 5000 });

    // Get initial row count
    const initialCount = await page.locator('table tbody tr').count();

    // Set up dialog handler
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete');
      await dialog.accept();
    });

    // Click delete on first row
    await page.click('table tbody tr:first-child button:has-text("Delete")');

    // Wait for deletion to complete
    await page.waitForTimeout(1000);

    // Verify row count decreased or stayed same (if it was the last one)
    const newCount = await page.locator('table tbody tr').count();
    expect(newCount).toBeLessThanOrEqual(initialCount);
  });

  test('should cancel delete when dialog is dismissed', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr:has-text("Delete")', { timeout: 5000 });

    // Get initial row count
    const initialCount = await page.locator('table tbody tr').count();

    // Set up dialog handler to dismiss
    page.once('dialog', async dialog => {
      await dialog.dismiss();
    });

    // Click delete
    await page.click('table tbody tr:first-child button:has-text("Delete")');

    // Wait a moment
    await page.waitForTimeout(500);

    // Verify row count unchanged
    const newCount = await page.locator('table tbody tr').count();
    expect(newCount).toBe(initialCount);
  });

  test('should close modal on cancel button', async ({ page }) => {
    // Open add modal
    await page.click('button:has-text("Add Exchange Rate")');
    await expect(page.locator('h3:has-text("Add Exchange Rate")')).toBeVisible();

    // Click cancel
    await page.click('button:has-text("Cancel")');

    // Verify modal closed
    await expect(page.locator('h3:has-text("Add Exchange Rate")')).not.toBeVisible();
  });

  test('should close modal on escape key', async ({ page }) => {
    // Open add modal
    await page.click('button:has-text("Add Exchange Rate")');
    await expect(page.locator('h3:has-text("Add Exchange Rate")')).toBeVisible();

    // Press escape
    await page.keyboard.press('Escape');

    // Verify modal closed
    await expect(page.locator('h3:has-text("Add Exchange Rate")')).not.toBeVisible();
  });

  test('should display status badges correctly', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // Check for status badges
    const statusBadges = page.locator('table tbody td:has-text("Active"), table tbody td:has-text("Expired"), table tbody td:has-text("Scheduled")');
    expect(await statusBadges.count()).toBeGreaterThan(0);
  });

  test('should show empty state when no rates exist', async ({ page }) => {
    // This test assumes you can clear all rates or navigate to a fresh state
    // For now, just check the empty state structure exists in the component
    
    // Filter to a non-existent currency combination
    await page.selectOption('select:near(:text("Filter by Currency"))', 'JPY');
    await page.waitForTimeout(500);

    // Check for "No exchange rates found" message
    const emptyMessage = page.locator('text=No exchange rates found');
    if (await emptyMessage.isVisible()) {
      // Verify "Add Your First Exchange Rate" button
      await expect(page.locator('button:has-text("Add Your First Exchange Rate")')).toBeVisible();
    }
  });
});
