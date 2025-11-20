import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.join(process.cwd(), 'user-manual', 'tmp-captures', 'recruitiq');

test.beforeAll(async () => {
  // ensure out dir exists
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

test('capture onboarding and job-create flow (manual)', async ({ page }) => {
  // Adjust the URL to your local dev server
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT_DIR, '01-home.png'), fullPage: true });

  // Example: open login
  await page.click('text=Login'); // change selector to real one
  // Test credentials provided by user
  await page.fill('input[name="email"]', 'tenant@testcompany.com');
  await page.fill('input[name="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Dashboard', { timeout: 10000 });
  await page.screenshot({ path: path.join(OUT_DIR, '02-dashboard.png') });

  // Example: create a job flow (change selectors to match app)
  await page.click('text=Create Job');
  await page.fill('input[name="title"]', 'Manual: Test Job');
  await page.fill('textarea[name="description"]', 'Generated test job for docs.');
  await page.click('button:has-text("Save")');
  await page.waitForSelector('text=Job created', { timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: path.join(OUT_DIR, '03-create-job.png') });
});
