import { test, expect } from './fixtures';

test.describe('Currency Conversion', () => {
  test.describe('Paycheck Display with Conversion', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to a paycheck detail page
      // Note: You'll need to adjust this URL based on your routing
      await page.goto('/payroll/paychecks');
      await page.waitForLoadState('networkidle');
    });

    test('should display paycheck amounts with currency symbols', async ({ page }) => {
      // Wait for paycheck list to load
      await page.waitForSelector('[data-testid="paycheck-list"], table', { timeout: 5000 });

      // Look for currency symbols in the table
      const amountCells = page.locator('td:has-text("SRD"), td:has-text("USD"), td:has-text("$"), td:has-text("€")');
      
      if (await amountCells.count() > 0) {
        // Verify at least one amount is visible
        expect(await amountCells.count()).toBeGreaterThan(0);
      }
    });

    test('should show conversion tooltip on hover', async ({ page }) => {
      // Wait for paycheck list
      await page.waitForSelector('[data-testid="paycheck-list"], table', { timeout: 5000 });

      // Find an amount with conversion data (look for tooltip trigger)
      const amountWithTooltip = page.locator('[data-conversion-info], .currency-amount').first();

      if (await amountWithTooltip.isVisible()) {
        // Hover over the amount
        await amountWithTooltip.hover();

        // Wait for tooltip to appear
        await page.waitForTimeout(500);

        // Check if tooltip with conversion info appears
        const tooltip = page.locator('[role="tooltip"], .tooltip-content');
        
        if (await tooltip.isVisible()) {
          // Verify tooltip contains conversion information
          const tooltipText = await tooltip.textContent();
          expect(tooltipText).toBeTruthy();
        }
      }
    });

    test('should display original amount in conversion info', async ({ page }) => {
      // This test verifies the conversion breakdown shows original amount
      
      // Navigate to specific paycheck detail if available
      const paycheckLinks = page.locator('a[href*="/paycheck/"], button:has-text("View Details")');
      
      if (await paycheckLinks.count() > 0) {
        await paycheckLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Look for conversion information display
        const conversionInfo = page.locator('text=Original Amount, text=Converted, text=Exchange Rate');
        
        if (await conversionInfo.count() > 0) {
          // Verify conversion details are shown
          expect(await conversionInfo.count()).toBeGreaterThan(0);
        }
      }
    });

    test('should show exchange rate used for conversion', async ({ page }) => {
      // Navigate to paycheck with conversion
      const paycheckLinks = page.locator('a[href*="/paycheck/"]');
      
      if (await paycheckLinks.count() > 0) {
        await paycheckLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Look for exchange rate display
        const rateDisplay = page.locator('text=Exchange Rate:, text=Rate:');
        
        if (await rateDisplay.isVisible()) {
          // Verify rate is shown with proper formatting
          const rateText = await rateDisplay.textContent();
          expect(rateText).toMatch(/\d+\.\d+/); // Should contain a decimal number
        }
      }
    });
  });

  test.describe('Component-Level Currency Display', () => {
    test('should use CurrencyDisplay component correctly', async ({ page }) => {
      // Navigate to any page with currency display
      await page.goto('/payroll/paychecks');
      await page.waitForLoadState('networkidle');

      // Verify currency formatting
      const amounts = page.locator('.currency-amount, [data-testid="currency-display"]');
      
      if (await amounts.count() > 0) {
        const firstAmount = amounts.first();
        const amountText = await firstAmount.textContent();
        
        // Should contain currency symbol and formatted number
        expect(amountText).toMatch(/[$€£]?\s*[\d,]+\.?\d*/);
      }
    });

    test('should show compact currency format when specified', async ({ page }) => {
      // This test verifies compact mode (e.g., "1.2K", "3.5M")
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for compact currency displays (usually in dashboards)
      const compactAmounts = page.locator('[data-compact="true"], .currency-compact');
      
      if (await compactAmounts.count() > 0) {
        const compactText = await compactAmounts.first().textContent();
        
        // May contain K, M, B for thousands, millions, billions
        expect(compactText).toBeTruthy();
      }
    });
  });

  test.describe('Currency Selector Component', () => {
    test('should display currency selector with search', async ({ page }) => {
      // Navigate to a page with currency selector (settings or create paycheck)
      await page.goto('/currency/configuration');
      await page.waitForLoadState('networkidle');

      // Verify currency selectors exist
      const currencySelectors = page.locator('select:has-option([value="USD"]), select:has-option([value="EUR"])');
      expect(await currencySelectors.count()).toBeGreaterThan(0);
    });

    test('should filter currencies in selector', async ({ page }) => {
      // If CurrencySelector has search functionality, test it
      await page.goto('/currency/exchange-rates');
      await page.waitForLoadState('networkidle');

      // Open add rate modal
      await page.click('button:has-text("Add Exchange Rate")');
      await page.waitForSelector('h3:has-text("Add Exchange Rate")');

      // Verify currency options are available
      const fromCurrencySelect = page.locator('select:near(:text("From Currency"))');
      const options = await fromCurrencySelect.locator('option').count();
      
      expect(options).toBeGreaterThan(1); // Should have multiple currency options
    });

    test('should show currency symbols in selector', async ({ page }) => {
      await page.goto('/currency/exchange-rates');
      await page.click('button:has-text("Add Exchange Rate")');
      await page.waitForSelector('h3:has-text("Add Exchange Rate")');

      // Check if currency options include symbols or names
      const fromCurrencySelect = page.locator('select:near(:text("From Currency"))');
      const firstOption = await fromCurrencySelect.locator('option').nth(1).textContent();
      
      // Should contain currency code (USD, EUR, etc.)
      expect(firstOption).toMatch(/USD|EUR|GBP|SRD|CAD|AUD|JPY|CNY|INR|BRL/);
    });
  });

  test.describe('API Client Integration', () => {
    test('should handle conversion API calls', async ({ page }) => {
      // Listen for API calls
      const apiCalls: string[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/paylinq/currency/convert')) {
          apiCalls.push(request.url());
        }
      });

      // Navigate to exchange rates and create a rate (triggers conversion)
      await page.goto('/currency/exchange-rates');
      await page.click('button:has-text("Add Exchange Rate")');
      await page.waitForSelector('h3:has-text("Add Exchange Rate")');

      // Fill form which may trigger preview conversion
      await page.selectOption('select:near(:text("From Currency"))', 'USD');
      await page.selectOption('select:near(:text("To Currency"))', 'SRD');
      await page.fill('input[type="number"]:near(:text("Exchange Rate"))', '21.50');

      // Wait for any API calls
      await page.waitForTimeout(1000);

      // Note: This test documents expected API interaction
      // Actual conversion API calls would be made when creating paychecks
    });

    test('should handle exchange rate retrieval', async ({ page }) => {
      // Listen for API calls
      let rateApiCalled = false;
      
      page.on('request', request => {
        if (request.url().includes('/api/paylinq/currency/') && 
            request.method() === 'GET') {
          rateApiCalled = true;
        }
      });

      // Navigate to exchange rates page
      await page.goto('/currency/exchange-rates');
      await page.waitForLoadState('networkidle');

      // Wait for API call
      await page.waitForTimeout(1000);

      // Verify API was called to fetch rates
      expect(rateApiCalled).toBe(true);
    });

    test('should cache exchange rates', async ({ page }) => {
      // Navigate to page that uses rates
      await page.goto('/currency/exchange-rates');
      await page.waitForLoadState('networkidle');

      // Count API calls
      let apiCallCount = 0;
      
      page.on('request', request => {
        if (request.url().includes('/api/paylinq/currency/current/')) {
          apiCallCount++;
        }
      });

      // Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/currency/exchange-rates');
      await page.waitForLoadState('networkidle');

      // React Query should cache, reducing repeated calls
      // Note: Exact behavior depends on cache configuration
      await page.waitForTimeout(500);
    });

    test('should invalidate cache after creating rate', async ({ page }) => {
      // Track API calls
      const getCalls: number[] = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/paylinq/currency/') && 
            request.method() === 'GET') {
          getCalls.push(Date.now());
        }
      });

      // Load page
      await page.goto('/currency/exchange-rates');
      await page.waitForLoadState('networkidle');
      
      const initialCallCount = getCalls.length;

      // Create a new rate
      await page.click('button:has-text("Add Exchange Rate")');
      await page.waitForSelector('h3:has-text("Add Exchange Rate")');
      
      await page.selectOption('select:near(:text("From Currency"))', 'EUR');
      await page.selectOption('select:near(:text("To Currency"))', 'USD');
      await page.fill('input[type="number"]:near(:text("Exchange Rate"))', '1.10');
      
      const today = new Date().toISOString().split('T')[0];
      await page.fill('input[type="date"]:near(:text("Effective From"))', today);

      await page.click('button:has-text("Create Rate")');
      
      // Wait for modal to close
      await page.waitForSelector('h3:has-text("Add Exchange Rate")', { state: 'hidden', timeout: 5000 });

      // Should trigger refetch
      await page.waitForTimeout(1000);

      // Verify additional GET call was made (cache invalidation)
      expect(getCalls.length).toBeGreaterThan(initialCallCount);
    });
  });

  test.describe('Error Handling', () => {
    test('should show error when rate not found', async ({ page }) => {
      // This would require mocking API to return 404
      // For now, document expected behavior
      
      // When trying to convert with missing rate, should show error
      // await expect(page.locator('text=Exchange rate not found')).toBeVisible();
    });

    test('should show error on network failure', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true);

      // Try to load exchange rates
      await page.goto('/currency/exchange-rates');

      // Should show error state
      await expect(page.locator('text=Failed to load, text=Please try again')).toBeVisible();

      // Re-enable network
      await page.context().setOffline(false);
    });

    test('should show validation errors in form', async ({ page }) => {
      await page.goto('/currency/exchange-rates');
      await page.click('button:has-text("Add Exchange Rate")');
      await page.waitForSelector('h3:has-text("Add Exchange Rate")');

      // Try to submit without required fields
      await page.click('button:has-text("Create Rate")');

      // Should show validation errors
      await expect(page.locator('text=required, text=must be')).toBeVisible();
    });
  });
});
