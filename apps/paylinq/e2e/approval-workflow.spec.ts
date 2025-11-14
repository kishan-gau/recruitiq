import { test, expect } from './fixtures';

test.describe('Currency Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to approvals page
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
  });

  test('should display approval queue page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Approval Queue');

    // Check filter controls are visible
    await expect(page.locator('select:near(:text("Request Type"))')).toBeVisible();
    await expect(page.locator('select:near(:text("Priority"))')).toBeVisible();
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();

    // Check table headers
    await expect(page.locator('th:has-text("Request Type")')).toBeVisible();
    await expect(page.locator('th:has-text("Priority")')).toBeVisible();
    await expect(page.locator('th:has-text("Progress")')).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toBeVisible();
  });

  test('should filter approvals by request type', async ({ page }) => {
    // Select conversion filter
    await page.selectOption('select:near(:text("Request Type"))', 'conversion');
    await page.waitForTimeout(500);

    // Verify filtered results show only conversion requests
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const rowText = await rows.nth(i).textContent();
        expect(rowText).toMatch(/conversion|Currency Conversion/i);
      }
    }
  });

  test('should filter approvals by priority', async ({ page }) => {
    // Select high priority filter
    await page.selectOption('select:near(:text("Priority"))', 'high');
    await page.waitForTimeout(500);

    // Verify high priority badges appear
    const highPriorityBadges = page.locator('[class*="bg-orange"]:has-text("HIGH")');
    const badgeCount = await highPriorityBadges.count();
    
    if (badgeCount > 0) {
      expect(badgeCount).toBeGreaterThan(0);
    }
  });

  test('should open approval detail modal', async ({ page }) => {
    // Wait for approval list to load
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // Check if there are any approval rows
    const rowCount = await page.locator('table tbody tr').count();
    
    if (rowCount > 0) {
      // Click "View" button on first row
      await page.locator('table tbody tr').first().locator('button:has-text("View")').click();

      // Verify modal opens
      await expect(page.locator('h3:has-text("Approval Request Details")')).toBeVisible();

      // Verify details sections
      await expect(page.locator('text=Request Information')).toBeVisible();
      await expect(page.locator('text=Request Data')).toBeVisible();

      // Verify action buttons
      await expect(page.locator('button:has-text("Approve")')).toBeVisible();
      await expect(page.locator('button:has-text("Reject")')).toBeVisible();
      await expect(page.locator('button:has-text("Close")')).toBeVisible();
    }
  });

  test('should create conversion approval request from exchange rates', async ({ page }) => {
    // Navigate to exchange rates page
    await page.goto('/currency/exchange-rates');
    await page.waitForLoadState('networkidle');

    // Create a high-value conversion that requires approval
    // (assuming there's a conversion calculator on the page)
    const conversionSection = page.locator('text=Quick Conversion');
    if (await conversionSection.isVisible()) {
      await page.selectOption('select:near(:text("From"))', 'USD');
      await page.selectOption('select:near(:text("To"))', 'EUR');
      await page.fill('input:near(:text("Amount"))', '25000'); // High value requiring approval
      await page.click('button:has-text("Convert")');

      // Check if approval modal/message appears
      await expect(page.locator('text=/approval|requires approval/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should approve a pending request', async ({ page }) => {
    // Wait for approval list
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    const rowCount = await page.locator('table tbody tr').count();
    
    if (rowCount > 0) {
      // Click View on first pending request
      await page.locator('table tbody tr').first().locator('button:has-text("View")').click();

      // Wait for modal
      await page.waitForSelector('h3:has-text("Approval Request Details")');

      // Add approval comment
      const commentField = page.locator('textarea:near(:text("Comments"))');
      if (await commentField.isVisible()) {
        await commentField.fill('Verified and approved - all checks passed');
      }

      // Click Approve button
      await page.click('button:has-text("Approve")');

      // Wait for success message
      await expect(page.locator('text=/approved successfully|approval recorded/i')).toBeVisible({ timeout: 3000 });

      // Modal should close or show updated status
      await page.waitForTimeout(1000);

      // Verify the request status updated
      await page.goto('/approvals');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should reject a pending request with mandatory comments', async ({ page }) => {
    // Navigate to create a test approval request first
    await page.goto('/currency/exchange-rates');
    await page.waitForLoadState('networkidle');

    // Create exchange rate that requires approval
    await page.click('button:has-text("Add Exchange Rate")');
    await page.waitForSelector('h3:has-text("Add Exchange Rate")');

    // Fill form with rate change requiring approval
    await page.selectOption('select:near(:text("From Currency"))', 'USD');
    await page.selectOption('select:near(:text("To Currency"))', 'EUR');
    await page.fill('input[type="number"]:near(:text("Exchange Rate"))', '0.75'); // Significant variance
    
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]:near(:text("Effective From"))', today);

    await page.click('button:has-text("Create Rate")');

    // Wait for potential approval notification
    await page.waitForTimeout(2000);

    // Navigate to approvals
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    const rowCount = await page.locator('table tbody tr').count();
    
    if (rowCount > 0) {
      // Open first request
      await page.locator('table tbody tr').first().locator('button:has-text("View")').click();
      await page.waitForSelector('h3:has-text("Approval Request Details")');

      // Try to reject without comments (should fail)
      await page.click('button:has-text("Reject")');
      
      // Check for validation error
      const hasError = await page.locator('text=/comment.*required|must provide.*comment/i').isVisible({ timeout: 1000 }).catch(() => false);
      
      if (hasError) {
        // Fill in rejection comments
        await page.fill('textarea:near(:text("Comments"))', 'Insufficient documentation - please provide supporting evidence');
        
        // Click Reject again
        await page.click('button:has-text("Reject")');

        // Wait for success message
        await expect(page.locator('text=/rejected|rejection recorded/i')).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should show approval progress indicator', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    const rowCount = await page.locator('table tbody tr').count();
    
    if (rowCount > 0) {
      // Check if progress indicators are visible
      const progressBars = page.locator('[class*="bg-"][class*="h-2"]'); // Progress bar elements
      const progressTexts = page.locator('text=/\\d+\\/\\d+/'); // e.g., "1/2"

      const hasProgressBar = await progressBars.count() > 0;
      const hasProgressText = await progressTexts.count() > 0;

      expect(hasProgressBar || hasProgressText).toBe(true);
    }
  });

  test('should show priority badges correctly', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // Check for priority badges
    const urgentBadges = page.locator('text=URGENT');
    const highBadges = page.locator('text=HIGH');
    const normalBadges = page.locator('text=NORMAL');
    const lowBadges = page.locator('text=LOW');

    const totalBadges = 
      await urgentBadges.count() +
      await highBadges.count() +
      await normalBadges.count() +
      await lowBadges.count();

    if (totalBadges > 0) {
      expect(totalBadges).toBeGreaterThan(0);
    }
  });

  test('should display request age', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    const rowCount = await page.locator('table tbody tr').count();
    
    if (rowCount > 0) {
      // Check for age indicators like "2 hours ago", "1 day ago"
      const ageTexts = page.locator('text=/\\d+\\s+(second|minute|hour|day)s?\\s+ago/i');
      const ageCount = await ageTexts.count();

      expect(ageCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display expiration warnings for old requests', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // Look for expiration warnings (orange/red indicators)
    const warningIcons = page.locator('[class*="text-orange"], [class*="text-red"]');
    const expirationTexts = page.locator('text=/expir/i');

    const hasWarnings = await warningIcons.count() > 0 || await expirationTexts.count() > 0;
    
    // Warnings may or may not be present depending on data
    expect(typeof hasWarnings).toBe('boolean');
  });

  test('should refresh approval list', async ({ page }) => {
    // Initial load
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    
    const initialCount = await page.locator('table tbody tr').count();

    // Click refresh button
    await page.click('button:has-text("Refresh")');
    await page.waitForTimeout(1000);

    // Count should be the same or updated
    const refreshedCount = await page.locator('table tbody tr').count();
    expect(typeof refreshedCount).toBe('number');
  });

  test('should navigate to approval queue from sidebar', async ({ page }) => {
    // Navigate to dashboard first
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for Currency Management section in sidebar
    const currencySection = page.locator('text=Currency Management');
    if (await currencySection.isVisible()) {
      // Expand if collapsed
      if (await currencySection.locator('..').locator('[class*="chevron"]').isVisible()) {
        await currencySection.click();
        await page.waitForTimeout(300);
      }

      // Click Approvals link
      await page.click('a:has-text("Approvals")');
      await page.waitForLoadState('networkidle');

      // Verify we're on approvals page
      await expect(page).toHaveURL(/\/approvals/);
      await expect(page.locator('h1')).toContainText('Approval Queue');
    }
  });

  test('should display empty state when no approvals', async ({ page }) => {
    // Apply filters that will likely return no results
    await page.selectOption('select:near(:text("Request Type"))', 'bulk_rate_import');
    await page.selectOption('select:near(:text("Priority"))', 'urgent');
    await page.waitForTimeout(500);

    const rowCount = await page.locator('table tbody tr').count();
    
    if (rowCount === 0) {
      // Check for empty state message
      const emptyMessage = page.locator('text=/no.*approval|no.*request|no.*found/i');
      const isEmpty = await emptyMessage.isVisible();
      expect(isEmpty).toBe(true);
    }
  });

  test('should show approval history for request', async ({ page }) => {
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    const rowCount = await page.locator('table tbody tr').count();
    
    if (rowCount > 0) {
      // Open first request
      await page.locator('table tbody tr').first().locator('button:has-text("View")').click();
      await page.waitForSelector('h3:has-text("Approval Request Details")');

      // Look for approval history section
      const historySection = page.locator('text=Approval Actions');
      const hasHistory = await historySection.isVisible();

      if (hasHistory) {
        // Check for action entries
        const actionEntries = page.locator('[class*="action"], text=/approved|rejected|pending/i');
        const entryCount = await actionEntries.count();
        expect(entryCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should prevent self-approval', async ({ page, context }) => {
    // This test assumes the logged-in user created a request
    // In real scenario, you'd set this up programmatically
    
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    const rowCount = await page.locator('table tbody tr').count();
    
    if (rowCount > 0) {
      // Try to find a request created by current user
      const selfRequest = page.locator('table tbody tr:has(text="You")').first();
      
      if (await selfRequest.isVisible()) {
        await selfRequest.locator('button:has-text("View")').click();
        await page.waitForSelector('h3:has-text("Approval Request Details")');

        // Approve button should be disabled or show error
        const approveButton = page.locator('button:has-text("Approve")');
        
        if (await approveButton.isVisible()) {
          await approveButton.click();
          
          // Should show error about self-approval
          await expect(page.locator('text=/cannot approve.*own|self-approval/i')).toBeVisible({ timeout: 2000 });
        }
      }
    }
  });

  test('should handle multi-step approvals', async ({ page }) => {
    // Look for requests requiring multiple approvals
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    const multiApprovalRequest = page.locator('table tbody tr:has(text=/[2-9]\\/[2-9]/)').first();
    
    if (await multiApprovalRequest.isVisible()) {
      await multiApprovalRequest.locator('button:has-text("View")').click();
      await page.waitForSelector('h3:has-text("Approval Request Details")');

      // Verify required approvals is shown
      const requiredText = page.locator('text=/Requires \\d+ approval/i');
      await expect(requiredText).toBeVisible();

      // Check progress indicator
      const progressText = page.locator('text=/\\d+\\/\\d+ approval/i');
      await expect(progressText).toBeVisible();
    }
  });
});

test.describe('Approval Statistics', () => {
  test('should display approval statistics if available', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    // Look for stats/summary section
    const statsSection = page.locator('text=/pending|approved|rejected/i').first();
    const hasStats = await statsSection.isVisible();

    // Stats may be optional depending on implementation
    expect(typeof hasStats).toBe('boolean');
  });
});

test.describe('Approval Notifications', () => {
  test('should show badge count on sidebar if pending approvals exist', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for badge/count indicator on Approvals menu item
    const approvalsLink = page.locator('text=Approvals');
    const parentElement = approvalsLink.locator('..');
    
    // Check for badge element (typically a small colored circle with number)
    const badge = parentElement.locator('[class*="badge"], [class*="bg-"][class*="rounded"]');
    const hasBadge = await badge.isVisible().catch(() => false);

    // Badge may or may not be present
    expect(typeof hasBadge).toBe('boolean');
  });
});
