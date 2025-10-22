import { test, expect } from '@playwright/test';

test('modal opens, FAB hidden, screenshots', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 375, height: 812 });

  // mobile FAB has an explicit aria-label 'New'
  const fab = page.locator('button[aria-label="New"]');
  await fab.waitFor({ state: 'visible', timeout: 5000 });
  await page.screenshot({ path: 'e2e/snapshots/modal-initial.png', fullPage: true });

  await page.getByRole('button', { name: 'Search (press /)' }).click();
  // find the QuickSearch dialog (it contains the title 'Quick search')
  const quickDialog = page.locator('[role="dialog"]').filter({ hasText: 'Quick search' }).first();
  await quickDialog.waitFor();
  await page.screenshot({ path: 'e2e/snapshots/modal-open.png', fullPage: true });

  // click the Close button inside the QuickSearch dialog and wait for it to hide
  await quickDialog.getByRole('button', { name: 'Close' }).click();
  await expect(quickDialog).toBeHidden({ timeout: 10000 });
  await page.screenshot({ path: 'e2e/snapshots/modal-closed.png', fullPage: true });
});
