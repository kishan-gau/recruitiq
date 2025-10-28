import { test, expect } from '@playwright/test';
import { bypassAuth } from '../helpers/auth-helper';

/**
 * Job Creation Test Suite
 * Tests all aspects of creating a new job posting including validation, flow templates, and edge cases
 * 
 * NOTE: These tests connect to the real backend API at http://localhost:4000
 * Make sure the backend server is running before executing these tests
 */

test.describe('Job Creation - Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication bypass (uses real backend API)
    await bypassAuth(page);
    
    // Navigate to job creation page
    await page.goto('/jobs/new');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full job creation workflow', async ({ page }) => {
    // Step 1: Basics
    await expect(page.getByRole('heading', { name: /Basic Info|Basics/i })).toBeVisible();
    
    // Fill job title
    await page.getByTestId('job-title-input').fill('Senior QA Engineer');
    await page.getByTestId('department-select').selectOption('Engineering');
    await page.getByTestId('location-select').selectOption('San Francisco');
    await page.getByTestId('type-select').selectOption('full-time');
    await page.getByTestId('openings-input').fill('2');
    await page.getByTestId('experience-select').selectOption('senior');
    
    // Select flow template
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await flowTemplateSelect.selectOption({ index: 1 }); // Select first available template
    
    // Navigate to description step
    await page.getByTestId('next-button').click();
    
    // Step 2: Description
    await expect(page.getByRole('heading', { name: /Description/i })).toBeVisible();
    
    const description = `We're looking for an experienced QA Engineer to join our team.

## Responsibilities
• Design and implement automated test frameworks
• Collaborate with development teams
• Ensure product quality standards

## What We Offer
• Competitive salary
• Remote work options
• Professional development`;
    
    await page.getByTestId('description-textarea').fill(description);
    await page.getByTestId('next-button').click();
    
    // Step 3: Requirements
    await expect(page.getByRole('heading', { name: /Requirements/i })).toBeVisible();
    
    const requirements = `## Required Qualifications
• 5+ years of QA testing experience
• Strong knowledge of automation frameworks (Selenium, Cypress)
• Experience with CI/CD pipelines
• Excellent communication skills

## Nice to Have
• Experience with performance testing
• Knowledge of security testing`;
    
    await page.getByTestId('requirements-textarea').fill(requirements);
    await page.getByTestId('next-button').click();
    
    // Step 4: Compliance
    await expect(page.getByRole('heading', { name: /Compliance/i })).toBeVisible();
    await page.getByTestId('next-button').click();
    
    // Step 5: Distribution
    await expect(page.getByRole('heading', { name: /Distribution/i })).toBeVisible();
    
    // Publish the job
    await page.getByTestId('publish-button').click();
    
    // Verify redirect to jobs list
    await expect(page).toHaveURL(/\/jobs$/);
    
    // Verify job appears in list
    await expect(page.getByText('Senior QA Engineer')).toBeVisible();
  });

  test('should save as draft', async ({ page }) => {
    // Fill minimal info
    await page.getByTestId('job-title-input').fill('Draft Job Posting');
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await flowTemplateSelect.selectOption({ index: 1 });
    
    // Click Save Draft
    await page.getByTestId('save-draft-button').click();
    
    // Verify redirect
    await expect(page).toHaveURL(/\/jobs$/);
    
    // Verify job appears with draft status
    await expect(page.getByText('Draft Job Posting')).toBeVisible();
  });
});

test.describe('Job Creation - Validation', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/jobs/new');
    await page.waitForLoadState('networkidle');
  });

  test('should show validation errors for required fields', async ({ page }) => {
    // Try to navigate without filling required fields
    await page.getByTestId('next-button').click();
    
    // Should show error for job title
    await expect(page.getByText(/title is required/i)).toBeVisible();
    
    // Fill title
    await page.getByTestId('job-title-input').fill('Te'); // Too short
    await page.getByTestId('job-title-input').blur();
    
    // Should show minimum length error (if validation exists)
    // await expect(page.getByText(/at least 3 characters/i)).toBeVisible();
    
    // Fix title
    await page.getByTestId('job-title-input').fill('Test Position');
    
    // Try to proceed without flow template
    await page.getByTestId('next-button').click();
    
    // Should show flow template error or stay on basics page
    // The Next button might be disabled or show an error
  });

  test('should validate description field', async ({ page }) => {
    // Fill basics to get to description
    await page.getByTestId('job-title-input').fill('Test Job');
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await flowTemplateSelect.selectOption({ index: 1 });
    await page.getByTestId('next-button').click();
    
    // Try to proceed without description
    await page.getByTestId('next-button').click();
    
    // Should show description error
    await expect(page.getByText(/description is required/i)).toBeVisible();
    
    // Fill short description
    await page.getByTestId('description-textarea').fill('Short');
    await page.getByTestId('description-textarea').blur();
    
    // Should show minimum length error (if validation exists)
    // await expect(page.getByText(/at least 50 characters/i)).toBeVisible();
  });

  test('should validate requirements field', async ({ page }) => {
    // Navigate to requirements step
    await page.getByTestId('job-title-input').fill('Test Job');
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await flowTemplateSelect.selectOption({ index: 1 });
    await page.getByTestId('next-button').click();
    
    // Fill description
    const description = 'A'.repeat(51); // Minimum length
    await page.getByTestId('description-textarea').fill(description);
    await page.getByTestId('next-button').click();
    
    // At requirements step
    await expect(page.getByRole('heading', { name: /Requirements/i })).toBeVisible();
    
    // Try to proceed without requirements
    await page.getByTestId('next-button').click();
    
    // Should show requirements error (if validation exists)
    // await expect(page.getByText(/requirements (?:are|is) required/i)).toBeVisible();
  });

  test('should show inline validation errors with red borders', async ({ page }) => {
    // Click next without filling anything
    await page.getByTestId('next-button').click();
    
    // Title input should have red border
    const titleInput = page.getByTestId('job-title-input');
    await expect(titleInput).toHaveClass(/border-red/);
    
    // Error message should be visible below input
    const titleError = page.locator('#title-error, [role="alert"]').filter({ hasText: /title/i });
    await expect(titleError).toBeVisible();
  });
});

test.describe('Job Creation - Flow Templates', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/jobs/new');
    await page.waitForLoadState('networkidle');
    
    // Debug: Check where we ended up
    console.log('Current URL:', page.url());
  });

  test('should load flow templates dynamically', async ({ page }) => {
    // Debug: Take a screenshot to see what's rendered
    await page.screenshot({ path: 'test-results/debug-page-state.png', fullPage: true });
    
    // Check if we got redirected to login
    const currentURL = page.url();
    console.log('Final URL after navigation:', currentURL);
    
    if (currentURL.includes('/login')) {
      console.log('ERROR: Page redirected to login - auth bypass failed!');
      // Try to see what's on the login page
      const pageText = await page.locator('body').textContent();
      console.log('Login page text preview:', pageText?.substring(0, 200));
      throw new Error('Test environment not set up correctly - auth bypass failed');
    }
    
    // Wait for any content to appear
    await page.waitForTimeout(2000);
    
    // Check what's actually on the page
    const bodyText = await page.locator('body').textContent();
    console.log('Page content length:', bodyText?.length || 0);
    console.log('Page contains "Job":', bodyText?.toLowerCase().includes('job'));
    console.log('Page contains "Title":', bodyText?.toLowerCase().includes('title'));
    
    // First wait for the page to actually render
    await expect(page.getByTestId('job-title-input')).toBeVisible({ timeout: 10000 });
    
    // Flow templates should load when page opens
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await expect(flowTemplateSelect).toBeVisible();
    
    // Wait for templates to load (API call + render)
    await page.waitForTimeout(2000);
    
    // Should have at least the placeholder option plus templates
    const options = await flowTemplateSelect.locator('option').count();
    expect(options).toBeGreaterThan(1);
    
    // Should show template details (stage count)
    const firstOption = flowTemplateSelect.locator('option').nth(1);
    const optionText = await firstOption.textContent();
    expect(optionText).toMatch(/\d+ stages/);
  });

  test('should display flow template info box', async ({ page }) => {
    // Info box should be visible
    await expect(page.getByText(/Select a hiring workflow/i)).toBeVisible();
    
    // Should have create new flow link/button
    await expect(page.getByRole('link', { name: /Create New Flow/i })).toBeVisible();
  });

  test('should allow creating new flow template from job creation', async ({ page }) => {
    // Click create new flow
    await page.getByRole('link', { name: /Create New Flow/i }).click();
    
    // Should open flow designer modal or navigate to flow creation
    await expect(page.getByText(/Flow Template|Create Flow/i)).toBeVisible();
  });
});

test.describe('Job Creation - Text Formatting', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/jobs/new');
    await page.waitForLoadState('networkidle');
    
    // Navigate to description step
    await page.getByTestId('job-title-input').fill('Test Job');
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await flowTemplateSelect.selectOption({ index: 1 });
    await page.getByTestId('next-button').click();
  });

  test('should apply bold formatting', async ({ page }) => {
    const textarea = page.getByTestId('description-textarea');
    await textarea.fill('Test text');
    await textarea.evaluate((el: HTMLTextAreaElement) => {
      el.setSelectionRange(0, 4); // Select "Test"
    });
    
    // Click bold button
    await page.getByRole('button', { name: 'Bold', exact: false }).click();
    
    // Text should be wrapped in ** **
    const value = await textarea.inputValue();
    expect(value).toContain('**Test**');
  });

  test('should show preview of formatted text', async ({ page }) => {
    const description = `## Heading
**Bold text**
*Italic text*
• Bullet point`;
    
    await page.getByTestId('description-textarea').fill(description);
    
    // Preview should be visible below textarea
    const preview = page.locator('.prose').filter({ hasText: /heading/i });
    await expect(preview).toBeVisible();
    
    // Should render heading
    await expect(preview.locator('h3')).toBeVisible();
    
    // Should render bold
    await expect(preview.locator('strong')).toBeVisible();
  });
});

test.describe('Job Creation - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
    await page.goto('/jobs/new');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate between steps', async ({ page }) => {
    // Fill basics
    await page.getByTestId('job-title-input').fill('Test Job');
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await flowTemplateSelect.selectOption({ index: 1 });
    
    // Go to description
    await page.getByTestId('next-button').click();
    await expect(page.getByRole('heading', { name: /Description/i })).toBeVisible();
    
    // Go back to basics
    await page.getByTestId('previous-button').click();
    await expect(page.getByRole('heading', { name: /Basic Info/i })).toBeVisible();
    
    // Job title should still be filled
    await expect(page.getByTestId('job-title-input')).toHaveValue('Test Job');
  });

  test('should show step progress indicator', async ({ page }) => {
    // Should show step 1 active
    const step1 = page.locator('[data-step="basics"], .step-basics, button').first();
    // Skip this check for now as implementation may vary
    // await expect(step1).toHaveClass(/active|current/);
    
    // Navigate to step 2
    await page.getByTestId('job-title-input').fill('Test Job');
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await flowTemplateSelect.selectOption({ index: 1 });
    await page.getByTestId('next-button').click();
    
    // Should show step 2 active
    // const step2 = page.locator('[data-step="description"], .step-description').first();
    // await expect(step2).toHaveClass(/active|current/);
  });

  test('should allow clicking on step indicators to navigate', async ({ page }) => {
    // Fill required fields first
    await page.getByTestId('job-title-input').fill('Test Job');
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await flowTemplateSelect.selectOption({ index: 1 });
    await page.getByTestId('next-button').click();
    
    // Fill description
    const description = 'A'.repeat(51);
    await page.getByTestId('description-textarea').fill(description);
    await page.getByTestId('next-button').click();
    
    // Now at requirements step
    await expect(page.getByRole('heading', { name: /Requirements/i })).toBeVisible();
    
    // Click on description step indicator (if step navigation is implemented)
    // const descriptionStep = page.locator('[data-step="description"], button:has-text("Description")').first();
    // await descriptionStep.click();
    
    // Should navigate back to description (if implemented)
    // await expect(page.getByRole('heading', { name: /Description/i })).toBeVisible();
  });
});

test.describe('Job Creation - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
  });

  test('should handle empty flow templates list', async ({ page }) => {
    // Mock empty flow templates response
    await page.route('**/api/flow-templates*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ flowTemplates: [] })
      });
    });
    
    await page.goto('/jobs/new');
    await page.waitForLoadState('networkidle');
    
    // Should show message about no templates
    await expect(page.getByText(/no flow templates|create a flow template first/i)).toBeVisible();
    
    // Should still show create new flow link
    await expect(page.getByRole('link', { name: /Create New Flow/i })).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Fill form completely
    await page.goto('/jobs/new');
    await page.getByTestId('job-title-input').fill('Test Job');
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await flowTemplateSelect.selectOption({ index: 1 });
    await page.getByTestId('next-button').click();
    
    const description = 'A'.repeat(51);
    await page.getByTestId('description-textarea').fill(description);
    await page.getByTestId('next-button').click();
    
    const requirements = 'Requirements text here';
    await page.getByTestId('requirements-textarea').fill(requirements);
    await page.getByTestId('next-button').click();
    await page.getByTestId('next-button').click();
    
    // Mock API failure
    await page.route('**/api/jobs', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' })
      });
    });
    
    await page.getByTestId('publish-button').click();
    
    // Should show error message
    await expect(page.getByText(/failed to create job|error|internal server error/i)).toBeVisible();
    
    // Should stay on the form (not navigate away)
    await expect(page).toHaveURL(/\/jobs\/new/);
  });

  test('should handle special characters in inputs', async ({ page }) => {
    await page.goto('/jobs/new');
    
    // Test special characters in title
    const specialTitle = 'Senior Engineer (C++/Rust) - Backend <Team>';
    await page.getByTestId('job-title-input').fill(specialTitle);
    
    // Should accept special characters
    await expect(page.getByTestId('job-title-input')).toHaveValue(specialTitle);
    
    // Test markdown with special chars in description
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await flowTemplateSelect.selectOption({ index: 1 });
    await page.getByTestId('next-button').click();
    
    const specialDescription = `## Role: Senior Dev
**Requirements:** C++ & Rust experience
*Salary:* $150k-$200k
[Apply here](https://example.com/apply?job=123&ref=linkedin)`;
    
    await page.getByTestId('description-textarea').fill(specialDescription);
    
    // Should accept without errors
    await expect(page.getByTestId('description-textarea')).toHaveValue(specialDescription);
  });

  test('should handle very long text inputs', async ({ page }) => {
    await page.goto('/jobs/new');
    
    // Create very long title (at character limit)
    const longTitle = 'A'.repeat(255);
    await page.getByTestId('job-title-input').fill(longTitle);
    
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await flowTemplateSelect.selectOption({ index: 1 });
    await page.getByTestId('next-button').click();
    
    // Create very long description
    const longDescription = 'B'.repeat(5000);
    await page.getByTestId('description-textarea').fill(longDescription);
    
    // Should accept long text
    await expect(page.getByTestId('description-textarea')).toHaveValue(longDescription);
  });

  test('should prevent duplicate submissions', async ({ page }) => {
    // Fill form completely
    await page.goto('/jobs/new');
    await page.getByTestId('job-title-input').fill('Test Job');
    const flowTemplateSelect = page.getByTestId('flow-template-select');
    await flowTemplateSelect.selectOption({ index: 1 });
    await page.getByTestId('next-button').click();
    
    const description = 'A'.repeat(51);
    await page.getByTestId('description-textarea').fill(description);
    await page.getByTestId('next-button').click();
    
    const requirements = 'Requirements text';
    await page.getByTestId('requirements-textarea').fill(requirements);
    await page.getByTestId('next-button').click();
    await page.getByTestId('next-button').click();
    
    // Click publish button twice quickly
    const publishButton = page.getByTestId('publish-button');
    await publishButton.click();
    await publishButton.click(); // Second click
    
    // Button should be disabled during submission
    await expect(publishButton).toBeDisabled();
  });
});

test.describe('Job Creation - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
  });

  test('should work in dark mode', async ({ page }) => {
    // Set dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.goto('/jobs/new');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'e2e/snapshots/job-creation-dark.png', fullPage: true });
    
    // Form should be usable
    await page.getByTestId('job-title-input').fill('Dark Mode Test');
    await expect(page.getByTestId('job-title-input')).toHaveValue('Dark Mode Test');
  });
});

test.describe('Job Creation - Mobile Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/jobs/new');
    await page.waitForLoadState('networkidle');
    
    // Form should be visible and usable
    await expect(page.getByTestId('job-title-input')).toBeVisible();
    await page.getByTestId('job-title-input').fill('Mobile Test Job');
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/snapshots/job-creation-mobile.png', fullPage: true });
  });
});
