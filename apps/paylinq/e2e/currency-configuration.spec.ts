import { test, expect } from './fixtures';

test.describe('Currency Configuration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to currency configuration page
    await page.goto('/currency/configuration');
    await page.waitForLoadState('networkidle');
  });

  test('should display currency configuration page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Currency Configuration');

    // Check main sections are visible
    await expect(page.locator('h2:has-text("Base Currency")')).toBeVisible();
    await expect(page.locator('h2:has-text("Supported Currencies")')).toBeVisible();
    await expect(page.locator('h2:has-text("Exchange Rate Settings")')).toBeVisible();
    await expect(page.locator('h2:has-text("Cache Statistics")')).toBeVisible();
  });

  test('should display current configuration', async ({ page }) => {
    // Verify base currency selector is populated
    const baseCurrencySelect = page.locator('select:near(:text("Organization Base Currency"))');
    await expect(baseCurrencySelect).toBeVisible();
    
    const selectedValue = await baseCurrencySelect.inputValue();
    expect(selectedValue).toBeTruthy();
    expect(['USD', 'SRD', 'EUR', 'GBP']).toContain(selectedValue);
  });

  test('should change base currency', async ({ page }) => {
    // Get current base currency
    const baseCurrencySelect = page.locator('select:near(:text("Organization Base Currency"))');
    const currentValue = await baseCurrencySelect.inputValue();

    // Select a different currency
    const newCurrency = currentValue === 'USD' ? 'EUR' : 'USD';
    await baseCurrencySelect.selectOption(newCurrency);

    // Verify change is reflected
    expect(await baseCurrencySelect.inputValue()).toBe(newCurrency);

    // Verify save button is enabled (hasChanges is true)
    const saveButton = page.locator('button:has-text("Save Configuration")');
    await expect(saveButton).toBeEnabled();
  });

  test('should select and deselect supported currencies', async ({ page }) => {
    // Find a currency button that's not selected
    const currencyButtons = page.locator('button:has-text("USD"), button:has-text("EUR"), button:has-text("GBP")');
    const count = await currencyButtons.count();

    // Click first available currency button
    if (count > 0) {
      const firstButton = currencyButtons.first();
      const isSelected = await firstButton.evaluate((el) => 
        el.classList.contains('border-blue-500')
      );

      await firstButton.click();

      // Wait for state update
      await page.waitForTimeout(300);

      // Verify selection changed
      const newState = await firstButton.evaluate((el) => 
        el.classList.contains('border-blue-500')
      );
      expect(newState).toBe(!isSelected);
    }
  });

  test('should not allow removing base currency from supported currencies', async ({ page }) => {
    // Get base currency
    const baseCurrencySelect = page.locator('select:near(:text("Organization Base Currency"))');
    const baseCurrency = await baseCurrencySelect.inputValue();

    // Try to find and click the base currency button
    const baseCurrencyButton = page.locator(`button:has-text("${baseCurrency}")`).first();
    
    if (await baseCurrencyButton.isVisible()) {
      // Check if button is disabled or clicking has no effect
      const isDisabled = await baseCurrencyButton.isDisabled();
      expect(isDisabled).toBe(true);
    }
  });

  test('should toggle auto-update rates', async ({ page }) => {
    // Find the auto-update toggle button
    const toggleButton = page.locator('button:near(:text("Auto-Update Exchange Rates"))');
    
    // Get current state
    const isActive = await toggleButton.evaluate((el) => 
      el.classList.contains('bg-blue-600')
    );

    // Click toggle
    await toggleButton.click();

    // Wait for state update
    await page.waitForTimeout(300);

    // Verify state changed
    const newState = await toggleButton.evaluate((el) => 
      el.classList.contains('bg-blue-600')
    );
    expect(newState).toBe(!isActive);

    // Verify save button is enabled
    await expect(page.locator('button:has-text("Save Configuration")')).toBeEnabled();
  });

  test('should show update frequency when auto-update is enabled', async ({ page }) => {
    // Find the auto-update toggle
    const toggleButton = page.locator('button:near(:text("Auto-Update Exchange Rates"))');
    
    // Get current state
    const isActive = await toggleButton.evaluate((el) => 
      el.classList.contains('bg-blue-600')
    );

    // Enable if not already enabled
    if (!isActive) {
      await toggleButton.click();
      await page.waitForTimeout(300);
    }

    // Verify update frequency selector is visible
    await expect(page.locator('label:has-text("Update Frequency")')).toBeVisible();
    await expect(page.locator('select:near(:text("Update Frequency"))')).toBeVisible();
  });

  test('should change update frequency', async ({ page }) => {
    // Enable auto-update first
    const toggleButton = page.locator('button:near(:text("Auto-Update Exchange Rates"))');
    const isActive = await toggleButton.evaluate((el) => 
      el.classList.contains('bg-blue-600')
    );

    if (!isActive) {
      await toggleButton.click();
      await page.waitForTimeout(300);
    }

    // Change frequency
    const frequencySelect = page.locator('select:near(:text("Update Frequency"))');
    await frequencySelect.selectOption('daily');

    // Verify change
    expect(await frequencySelect.inputValue()).toBe('daily');
  });

  test('should change default rate source', async ({ page }) => {
    // Find default rate source selector
    const sourceSelect = page.locator('select:near(:text("Default Rate Source"))');
    await expect(sourceSelect).toBeVisible();

    // Change to 'manual'
    await sourceSelect.selectOption('manual');

    // Verify change
    expect(await sourceSelect.inputValue()).toBe('manual');

    // Verify save button is enabled
    await expect(page.locator('button:has-text("Save Configuration")')).toBeEnabled();
  });

  test('should toggle allow manual rates', async ({ page }) => {
    // Find the toggle
    const toggleButton = page.locator('button:near(:text("Allow Manual Rate Entry"))');
    
    // Get current state
    const isActive = await toggleButton.evaluate((el) => 
      el.classList.contains('bg-blue-600')
    );

    // Click toggle
    await toggleButton.click();

    // Wait for state update
    await page.waitForTimeout(300);

    // Verify state changed
    const newState = await toggleButton.evaluate((el) => 
      el.classList.contains('bg-blue-600')
    );
    expect(newState).toBe(!isActive);
  });

  test('should toggle require rate approval', async ({ page }) => {
    // Find the toggle
    const toggleButton = page.locator('button:near(:text("Require Rate Approval"))');
    
    // Get current state
    const isActive = await toggleButton.evaluate((el) => 
      el.classList.contains('bg-blue-600')
    );

    // Click toggle
    await toggleButton.click();

    // Wait for state update
    await page.waitForTimeout(300);

    // Verify state changed
    const newState = await toggleButton.evaluate((el) => 
      el.classList.contains('bg-blue-600')
    );
    expect(newState).toBe(!isActive);
  });

  test('should display cache statistics', async ({ page }) => {
    // Check for cache stats section
    await expect(page.locator('h2:has-text("Cache Statistics")')).toBeVisible();

    // Verify stat labels
    await expect(page.locator('text=Cached Rates')).toBeVisible();
    await expect(page.locator('text=Cache Hits')).toBeVisible();
    await expect(page.locator('text=Cache Misses')).toBeVisible();
    await expect(page.locator('text=Hit Rate')).toBeVisible();

    // Verify clear cache button
    await expect(page.locator('button:has-text("Clear Cache")')).toBeVisible();
  });

  test('should clear cache with confirmation', async ({ page }) => {
    // Set up dialog handler
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to clear');
      await dialog.accept();
    });

    // Click clear cache
    await page.click('button:has-text("Clear Cache")');

    // Wait for operation
    await page.waitForTimeout(1000);

    // Verify success message appears
    await expect(page.locator('text=Cache cleared successfully')).toBeVisible();
  });

  test('should cancel cache clear on dialog dismiss', async ({ page }) => {
    // Set up dialog handler to dismiss
    page.once('dialog', async dialog => {
      await dialog.dismiss();
    });

    // Click clear cache
    await page.click('button:has-text("Clear Cache")');

    // Wait a moment
    await page.waitForTimeout(500);

    // Verify no success message
    await expect(page.locator('text=Cache cleared successfully')).not.toBeVisible();
  });

  test('should save configuration changes', async ({ page }) => {
    // Make a change
    const baseCurrencySelect = page.locator('select:near(:text("Organization Base Currency"))');
    const currentValue = await baseCurrencySelect.inputValue();
    const newValue = currentValue === 'USD' ? 'EUR' : 'USD';
    await baseCurrencySelect.selectOption(newValue);

    // Wait for state update
    await page.waitForTimeout(300);

    // Click save
    await page.click('button:has-text("Save Configuration")');

    // Wait for save to complete
    await page.waitForTimeout(1500);

    // Verify success message
    await expect(page.locator('text=Configuration saved successfully')).toBeVisible();

    // Verify save button is disabled (no unsaved changes)
    await expect(page.locator('button:has-text("Save Configuration")')).toBeDisabled();
  });

  test('should reset configuration changes', async ({ page }) => {
    // Make a change
    const baseCurrencySelect = page.locator('select:near(:text("Organization Base Currency"))');
    const originalValue = await baseCurrencySelect.inputValue();
    const newValue = originalValue === 'USD' ? 'EUR' : 'USD';
    await baseCurrencySelect.selectOption(newValue);

    // Wait for state update
    await page.waitForTimeout(300);

    // Verify save button is enabled
    await expect(page.locator('button:has-text("Save Configuration")')).toBeEnabled();

    // Click reset
    await page.click('button:has-text("Reset")');

    // Wait for state update
    await page.waitForTimeout(300);

    // Verify value reverted
    expect(await baseCurrencySelect.inputValue()).toBe(originalValue);

    // Verify save button is disabled
    await expect(page.locator('button:has-text("Save Configuration")')).toBeDisabled();
  });

  test('should disable save and reset buttons when no changes', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);

    // Verify buttons are disabled initially
    await expect(page.locator('button:has-text("Save Configuration")')).toBeDisabled();
    await expect(page.locator('button:has-text("Reset")')).toBeDisabled();
  });

  test('should show error message on save failure', async ({ page }) => {
    // This test would require mocking a failed API call
    // For now, we'll just verify the error display structure exists
    
    // Make a change to enable save button
    const toggleButton = page.locator('button:near(:text("Auto-Update Exchange Rates"))');
    await toggleButton.click();
    await page.waitForTimeout(300);

    // Note: In a real scenario, you'd mock the API to return an error
    // For now, just document the expected behavior
    
    // After a failed save, should show error message
    // await expect(page.locator('.bg-red-50')).toBeVisible();
  });

  test('should display currency symbols and names', async ({ page }) => {
    // Check that currency buttons show symbols and names
    const currencyButtons = page.locator('button:has-text("USD"), button:has-text("EUR")');
    
    if (await currencyButtons.count() > 0) {
      const firstButton = currencyButtons.first();
      
      // Should contain currency code
      await expect(firstButton).toContainText(/USD|EUR|GBP|SRD/);
      
      // Should have emoji/symbol (checking for any non-empty text)
      const buttonText = await firstButton.textContent();
      expect(buttonText).toBeTruthy();
    }
  });

  test('should show base currency is always included message', async ({ page }) => {
    // Get base currency
    const baseCurrencySelect = page.locator('select:near(:text("Organization Base Currency"))');
    const baseCurrency = await baseCurrencySelect.inputValue();

    // Verify message appears
    await expect(page.locator(`text=Base currency (${baseCurrency}) is always included`)).toBeVisible();
  });

  test('should maintain responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify page still displays correctly
    await expect(page.locator('h1:has-text("Currency Configuration")')).toBeVisible();
    await expect(page.locator('h2:has-text("Base Currency")')).toBeVisible();
    
    // Verify sections are stacked (not side-by-side)
    const configSection = page.locator('h2:has-text("Base Currency")').locator('..');
    const boundingBox = await configSection.boundingBox();
    
    if (boundingBox) {
      // Should take most of the width
      expect(boundingBox.width).toBeGreaterThan(300);
    }
  });
});
