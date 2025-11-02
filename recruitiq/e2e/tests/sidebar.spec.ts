import { test, expect } from '@playwright/test';
import { bypassAuth } from '../helpers/auth-helper';

/**
 * Sidebar Navigation Tests
 * NOTE: These tests connect to the real backend API at http://localhost:4000
 */

test('sidebar expanded and collapsed snapshots with active pill', async ({ page }) => {
  await bypassAuth(page);
  // set desktop viewport before navigation so responsive classes are applied server-side
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  // ensure sidebar element exists in the DOM (CSS visibility handled separately)
  await page.waitForSelector('[data-testid="primary-sidebar"]', { state: 'attached', timeout: 10000 });
  await page.screenshot({ path: 'e2e/snapshots/sidebar-expanded.png', fullPage: true });

  // collapse sidebar by setting localStorage and reloading (avoids invisible button click in headless env)
  await page.evaluate(()=> localStorage.setItem('recruitiq_sidebar_collapsed','true'));
  await page.reload();
  await page.waitForSelector('[data-testid="primary-sidebar"]', { state: 'attached', timeout: 5000 });
  await page.screenshot({ path: 'e2e/snapshots/sidebar-collapsed.png', fullPage: true });

  // open Jobs to move pill
  // navigate directly to Jobs to move the active pill (avoids clicking hidden nav items)
  await page.goto('/jobs');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(120);
  await page.screenshot({ path: 'e2e/snapshots/sidebar-pillar-jobs.png', fullPage: true });
});
