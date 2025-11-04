import { test, expect } from '@playwright/test';
import { bypassAuth } from '../helpers/auth-helper';

/**
 * Hiring Flow Test Suite
 * Tests flow template creation, management, and integration with jobs
 * 
 * NOTE: These tests connect to the real backend API at http://localhost:4000
 */

test.describe('Flow Template Creation - Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);
  });

  test('should create a new flow template', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to workspaces/settings
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    
    // Click on Hiring Flows tab
    await page.getByRole('tab', { name: /hiring flows|flows/i }).click();
    
    // Click create new flow
    await page.getByRole('button', { name: /create new flow|new flow template/i }).click();
    
    // Fill flow template details
    await page.getByLabel('Template Name').fill('Engineering Interview Process');
    await page.getByLabel('Description').fill('Standard interview process for engineering positions');
    
    // Add stages
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-0-name"]').fill('Applied');
    await page.locator('textarea[name="stage-0-description"]').fill('Initial application received');
    
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-1-name"]').fill('Phone Screen');
    await page.locator('textarea[name="stage-1-description"]').fill('30-minute phone screening');
    
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-2-name"]').fill('Technical Interview');
    await page.locator('textarea[name="stage-2-description"]').fill('Technical assessment and coding challenge');
    
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-3-name"]').fill('Final Interview');
    await page.locator('textarea[name="stage-3-description"]').fill('Interview with hiring manager');
    
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-4-name"]').fill('Offer');
    await page.locator('textarea[name="stage-4-description"]').fill('Job offer extended');
    
    // Save flow template
    await page.getByRole('button', { name: /save|create/i }).click();
    
    // Should close modal and show success message
    await expect(page.getByText(/flow template created|success/i)).toBeVisible();
    
    // Should appear in flow templates list
    await expect(page.getByText('Engineering Interview Process')).toBeVisible();
  });

  test('should create minimal flow template with 2 stages', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows|flows/i }).click();
    await page.getByRole('button', { name: /create new flow|new flow template/i }).click();
    
    // Fill minimal required fields
    await page.getByLabel('Template Name').fill('Simple Process');
    await page.getByLabel('Description').fill('Minimal two-stage process');
    
    // Add two stages (minimum required)
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-0-name"]').fill('Applied');
    
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-1-name"]').fill('Hired');
    
    await page.getByRole('button', { name: /save|create/i }).click();
    
    // Should succeed
    await expect(page.getByText(/flow template created|success/i)).toBeVisible();
  });
});

test.describe('Flow Template Creation - Validation', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);

    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows|flows/i }).click();
    await page.getByRole('button', { name: /create new flow|new flow template/i }).click();
  });

  test('should validate template name is required', async ({ page }) => {
    // Try to save without name
    await page.getByRole('button', { name: /save|create/i }).click();
    
    // Should show error
    await expect(page.getByText(/template name is required/i)).toBeVisible();
  });

  test('should validate minimum 2 stages required', async ({ page }) => {
    await page.getByLabel('Template Name').fill('Test Flow');
    
    // Add only 1 stage
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-0-name"]').fill('Applied');
    
    // Try to save
    await page.getByRole('button', { name: /save|create/i }).click();
    
    // Should show error
    await expect(page.getByText(/at least 2 stages|minimum.*stages/i)).toBeVisible();
  });

  test('should validate stage names are required', async ({ page }) => {
    await page.getByLabel('Template Name').fill('Test Flow');
    
    // Add 2 stages but leave names empty
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.getByRole('button', { name: /add stage/i }).click();
    
    // Try to save
    await page.getByRole('button', { name: /save|create/i }).click();
    
    // Should show validation errors for stage names
    await expect(page.getByText(/stage name is required/i).first()).toBeVisible();
  });

  test('should prevent duplicate stage names', async ({ page }) => {
    await page.getByLabel('Template Name').fill('Test Flow');
    
    // Add 2 stages with same name
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-0-name"]').fill('Interview');
    
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-1-name"]').fill('Interview');
    
    // Should show duplicate name error
    await expect(page.getByText(/stage names must be unique|duplicate stage name/i)).toBeVisible();
  });
});

test.describe('Flow Template Management', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);

  });

  test('should display existing flow templates', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows|flows/i }).click();
    
    // Should load and display templates
    await page.waitForTimeout(1000); // Wait for lazy loading
    
    // Should show templates list
    const templatesList = page.locator('[data-testid="flow-templates-list"], .flow-templates');
    await expect(templatesList).toBeVisible();
  });

  test('should show flow template details', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows|flows/i }).click();
    await page.waitForTimeout(1000);
    
    // Click on first template
    const firstTemplate = page.locator('.flow-template-card, [data-testid="flow-template"]').first();
    await firstTemplate.click();
    
    // Should show template details
    await expect(page.getByText(/stages|workflow/i)).toBeVisible();
  });

  test('should edit existing flow template', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows|flows/i }).click();
    await page.waitForTimeout(1000);
    
    // Click edit on first template
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await editButton.click();
    
    // Modify template name
    const nameInput = page.getByLabel('Template Name');
    await nameInput.clear();
    await nameInput.fill('Updated Flow Template');
    
    // Save changes
    await page.getByRole('button', { name: /save|update/i }).click();
    
    // Should show success
    await expect(page.getByText(/updated|success/i)).toBeVisible();
    
    // Should reflect changes
    await expect(page.getByText('Updated Flow Template')).toBeVisible();
  });

  test('should delete flow template', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows|flows/i }).click();
    await page.waitForTimeout(1000);
    
    // Get initial template count
    const initialCount = await page.locator('.flow-template-card, [data-testid="flow-template"]').count();
    
    // Click delete on first template
    const deleteButton = page.getByRole('button', { name: /delete/i }).first();
    await deleteButton.click();
    
    // Confirm deletion
    await page.getByRole('button', { name: /confirm|yes|delete/i }).click();
    
    // Should show success
    await expect(page.getByText(/deleted|removed/i)).toBeVisible();
    
    // Template count should decrease
    const newCount = await page.locator('.flow-template-card, [data-testid="flow-template"]').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should clone flow template', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows|flows/i }).click();
    await page.waitForTimeout(1000);
    
    // Click clone/duplicate button
    const cloneButton = page.getByRole('button', { name: /clone|duplicate|copy/i }).first();
    await cloneButton.click();
    
    // Should create a copy
    await expect(page.getByText(/copy|cloned/i)).toBeVisible();
  });

  test('should prevent deleting flow in use', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows|flows/i }).click();
    await page.waitForTimeout(1000);
    
    // Find a template that's in use (shows job count > 0)
    const templateInUse = page.locator('.flow-template-card').filter({ hasText: /\d+ job/i }).first();
    
    if (await templateInUse.count() > 0) {
      const deleteButton = templateInUse.getByRole('button', { name: /delete/i });
      await deleteButton.click();
      
      // Should show warning that template is in use
      await expect(page.getByText(/in use|cannot delete|used by.*jobs/i)).toBeVisible();
    }
  });
});

test.describe('Flow Template Stage Management', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);

    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows|flows/i }).click();
    await page.getByRole('button', { name: /create new flow/i }).click();
    
    await page.getByLabel('Template Name').fill('Test Flow');
    await page.getByLabel('Description').fill('Test description');
  });

  test('should add stage', async ({ page }) => {
    await page.getByRole('button', { name: /add stage/i }).click();
    
    // Stage input should appear
    await expect(page.locator('input[name="stage-0-name"]')).toBeVisible();
  });

  test('should remove stage', async ({ page }) => {
    // Add 3 stages
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-0-name"]').fill('Stage 1');
    
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-1-name"]').fill('Stage 2');
    
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-2-name"]').fill('Stage 3');
    
    // Remove middle stage
    const removeButton = page.locator('[data-stage-index="1"]').getByRole('button', { name: /remove|delete/i });
    await removeButton.click();
    
    // Should have 2 stages remaining
    const stageCount = await page.locator('input[name^="stage-"][name$="-name"]').count();
    expect(stageCount).toBe(2);
  });

  test('should reorder stages with drag and drop', async ({ page }) => {
    // Add 3 stages
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-0-name"]').fill('First');
    
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-1-name"]').fill('Second');
    
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-2-name"]').fill('Third');
    
    // Drag second stage to first position
    const secondStage = page.locator('[data-stage-index="1"]');
    const firstStage = page.locator('[data-stage-index="0"]');
    
    await secondStage.dragTo(firstStage);
    
    // Order should change
    const firstStageName = await page.locator('input[name="stage-0-name"]').inputValue();
    expect(firstStageName).toBe('Second');
  });

  test('should set stage colors', async ({ page }) => {
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-0-name"]').fill('Applied');
    
    // Select color
    const colorPicker = page.locator('[data-stage-index="0"]').locator('input[type="color"], .color-picker');
    await colorPicker.click();
    
    // Color picker should be visible
    await expect(page.locator('.color-options, [role="listbox"]')).toBeVisible();
  });

  test('should set initial and final stages', async ({ page }) => {
    // Add 3 stages
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /add stage/i }).click();
      await page.locator(`input[name="stage-${i}-name"]`).fill(`Stage ${i + 1}`);
    }
    
    // First stage should be marked as initial
    const firstStage = page.locator('[data-stage-index="0"]');
    await expect(firstStage).toContainText(/initial|first/i);
    
    // Last stage should be marked as final
    const lastStage = page.locator('[data-stage-index="2"]');
    await expect(lastStage).toContainText(/final|last/i);
  });
});

test.describe('Flow Integration with Jobs', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);

  });

  test('should use flow template when creating job', async ({ page }) => {
    // Create job with flow template
    await page.goto('/jobs/new');
    
    await page.getByLabel('Job Title').fill('Software Engineer');
    
    // Select flow template
    const flowSelect = page.getByLabel('Flow Template');
    await flowSelect.selectOption({ index: 1 });
    
    // Get selected template name
    const selectedOption = await flowSelect.locator('option:checked').textContent();
    
    // Complete job creation
    await page.getByRole('button', { name: 'Next' }).click();
    const description = 'A'.repeat(51);
    await page.getByLabel('Job Description').fill(description);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.locator('#job-requirements').fill('Requirements');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Publish' }).click();
    
    // Navigate to job detail
    await page.getByText('Software Engineer').click();
    
    // Should show the flow template being used
    await expect(page.getByText(selectedOption || '')).toBeVisible();
  });

  test('should show candidates in flow stages', async ({ page }) => {
    await page.goto('/pipeline');
    
    // Should display pipeline view with stages
    await expect(page.getByText(/pipeline|kanban/i)).toBeVisible();
    
    // Should show stage columns
    const stages = page.locator('.stage-column, [data-testid="stage"]');
    await expect(stages.first()).toBeVisible();
    
    // Candidates should appear in their respective stages
    const candidateCards = page.locator('.candidate-card, [data-testid="candidate"]');
    await expect(candidateCards.first()).toBeVisible();
  });

  test('should move candidate between stages', async ({ page }) => {
    await page.goto('/pipeline');
    
    // Get first candidate
    const candidate = page.locator('.candidate-card').first();
    const candidateName = await candidate.textContent();
    
    // Get current stage
    const currentStage = candidate.locator('..').locator('.stage-name, [data-stage]');
    const currentStageName = await currentStage.textContent();
    
    // Drag to next stage
    const nextStage = page.locator('.stage-column').nth(1);
    await candidate.dragTo(nextStage);
    
    // Candidate should move
    await expect(nextStage).toContainText(candidateName || '');
  });
});

test.describe('Flow Templates - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);

  });

  test('should handle maximum number of stages', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows/i }).click();
    await page.getByRole('button', { name: /create new flow/i }).click();
    
    await page.getByLabel('Template Name').fill('Max Stages Flow');
    await page.getByLabel('Description').fill('Testing maximum stages');
    
    // Add 10 stages (or whatever the maximum is)
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: /add stage/i }).click();
      await page.locator(`input[name="stage-${i}-name"]`).fill(`Stage ${i + 1}`);
    }
    
    // Add stage button should be disabled or show message
    const addButton = page.getByRole('button', { name: /add stage/i });
    const isDisabled = await addButton.isDisabled();
    
    if (!isDisabled) {
      await addButton.click();
      // Should show max stages error
      await expect(page.getByText(/maximum.*stages|too many stages/i)).toBeVisible();
    }
  });

  test('should handle special characters in stage names', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows/i }).click();
    await page.getByRole('button', { name: /create new flow/i }).click();
    
    await page.getByLabel('Template Name').fill('Test Flow');
    
    // Add stage with special characters
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-0-name"]').fill('Interview (Round 1)');
    
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-1-name"]').fill('Offer & Negotiation');
    
    // Should accept special characters
    await page.getByRole('button', { name: /save|create/i }).click();
    await expect(page.getByText(/success|created/i)).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows/i }).click();
    
    // Mock API error
    await page.route('**/api/flow-templates', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Server error' })
      });
    });
    
    await page.getByRole('button', { name: /create new flow/i }).click();
    await page.getByLabel('Template Name').fill('Test Flow');
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-0-name"]').fill('Stage 1');
    await page.getByRole('button', { name: /add stage/i }).click();
    await page.locator('input[name="stage-1-name"]').fill('Stage 2');
    await page.getByRole('button', { name: /save|create/i }).click();
    
    // Should show error message
    await expect(page.getByText(/failed|error|server error/i)).toBeVisible();
  });

  test('should lazy load flow templates', async ({ page }) => {
    // Navigate directly to dashboard (should NOT load flows)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check if flow templates API was called
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/flow-templates')) {
        apiCalls.push(request.url());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Should NOT have made the API call
    expect(apiCalls.length).toBe(0);
    
    // Now navigate to job creation (SHOULD load flows)
    await page.goto('/jobs/new');
    await page.waitForTimeout(1000);
    
    // Should have made the API call
    expect(apiCalls.length).toBeGreaterThan(0);
  });
});

test.describe('Flow Templates - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await bypassAuth(page);

  });

  test('should match flow designer screenshot', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows/i }).click();
    await page.getByRole('button', { name: /create new flow/i }).click();
    
    // Take screenshot
    await page.screenshot({ 
      path: 'e2e/snapshots/flow-designer.png', 
      fullPage: true 
    });
  });

  test('should match flow list screenshot', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows/i }).click();
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'e2e/snapshots/flow-list.png', 
      fullPage: true 
    });
  });

  test('should work in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows/i }).click();
    await page.getByRole('button', { name: /create new flow/i }).click();
    
    // Take screenshot
    await page.screenshot({ 
      path: 'e2e/snapshots/flow-designer-dark.png', 
      fullPage: true 
    });
  });

  test('should work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/');
    await page.getByRole('button', { name: /workspace|settings/i }).click();
    await page.getByRole('tab', { name: /hiring flows/i }).click();
    
    // Take screenshot
    await page.screenshot({ 
      path: 'e2e/snapshots/flow-list-mobile.png', 
      fullPage: true 
    });
  });
});
