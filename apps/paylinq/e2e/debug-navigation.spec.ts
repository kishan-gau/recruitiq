import { test, expect } from '@playwright/test';

test.describe('Debug Navigation', () => {
  test('navigate to payroll-runs and screenshot', async ({ page }) => {
    // Try to go directly to payroll-runs
    await page.goto('/payroll-runs');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-payroll-runs.png', fullPage: true });
    
    // Log current URL
    console.log('Current URL:', page.url());
    
    // Log page title
    console.log('Page title:', await page.title());
    
    // Try to find any buttons on the page
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on page`);
    
    for (const button of buttons.slice(0, 10)) {  // Log first 10 buttons
      const text = await button.textContent();
      console.log('Button text:', text?.trim());
    }
    
    // Try clicking on "View All Payroll Runs"
    const viewAllButton = page.getByRole('button', { name: /view all payroll runs/i });
    if (await viewAllButton.isVisible()) {
      console.log('Found View All Payroll Runs button, clicking it');
      await viewAllButton.click();
      await page.waitForLoadState('networkidle');
      console.log('After View All click URL:', page.url());
      
      // Take another screenshot
      await page.screenshot({ path: 'test-results/payroll-runs-page.png', fullPage: true });
      
      // Check for Create Payroll Run button
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} buttons on payroll runs page`);
      for (const btn of allButtons) {
        const text = await btn.textContent();
        if (text?.includes('Create') || text?.includes('Payroll')) {
          console.log('Found button:', text.trim());
        }
      }
    }
  });
});
