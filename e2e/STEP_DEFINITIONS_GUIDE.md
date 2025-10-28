# Step Definitions Guide - Connecting Gherkin to Playwright

This guide shows how to implement step definitions to execute Gherkin feature files with Playwright.

## Setup

### 1. Install Dependencies

```bash
npm install --save-dev @cucumber/cucumber playwright-bdd
```

### 2. Update playwright.config.ts

```typescript
import { defineConfig } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

export default defineConfig(
  defineBddConfig({
    features: 'e2e/features/**/*.feature',
    steps: 'e2e/step-definitions/**/*.ts',
    // ... rest of your config
  })
)
```

### 3. Create Step Definition Files

Create `e2e/step-definitions/` folder with step definition files.

## Example Step Definitions

### Job Creation Steps (`e2e/step-definitions/job-creation.steps.ts`)

```typescript
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'

// Background Steps
Given('I am logged in as a recruiter', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'recruiter@test.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
})

Given('I have at least one hiring flow template created', async ({ page }) => {
  // Create a default flow template via API
  await page.request.post('/api/flow-templates', {
    data: {
      name: 'Standard Interview Process',
      stages: [
        { name: 'Application', order: 1 },
        { name: 'Interview', order: 2 },
        { name: 'Offer', order: 3 }
      ]
    }
  })
})

Given('I am on the {string} page', async ({ page }, pageName: string) => {
  const pageMap = {
    'Create Job': '/jobs/new',
    'Jobs List': '/jobs',
    'Dashboard': '/dashboard'
  }
  await page.goto(pageMap[pageName] || '/')
})

// Action Steps
When('I fill in {string} with {string}', async ({ page }, fieldLabel: string, value: string) => {
  const field = page.locator(`label:has-text("${fieldLabel}")`).locator('..').locator('input, textarea')
  await field.fill(value)
})

When('I select {string} from {string}', async ({ page }, value: string, fieldLabel: string) => {
  const select = page.locator(`label:has-text("${fieldLabel}")`).locator('..').locator('select')
  await select.selectOption({ label: value })
})

When('I click {string}', async ({ page }, buttonText: string) => {
  await page.click(`button:has-text("${buttonText}")`)
})

When('I click {string} to go to {word} step', async ({ page }, buttonText: string, stepName: string) => {
  await page.click(`button:has-text("${buttonText}")`)
  await expect(page.locator(`[data-step="${stepName.toLowerCase()}"]`)).toBeVisible()
})

When('I leave {string} empty', async ({ page }, fieldLabel: string) => {
  // Do nothing - field is already empty
})

When('I blur from the {string} field', async ({ page }, fieldLabel: string) => {
  const field = page.locator(`label:has-text("${fieldLabel}")`).locator('..').locator('input, textarea')
  await field.blur()
})

When('I click {string} in the sidebar', async ({ page }, stepName: string) => {
  await page.click(`.sidebar [data-step="${stepName.toLowerCase()}"]`)
})

// Assertion Steps
Then('I should see a success message {string}', async ({ page }, message: string) => {
  await expect(page.locator(`.toast:has-text("${message}")`)).toBeVisible()
})

Then('I should be redirected to the {word} list page', async ({ page }, resourceType: string) => {
  await page.waitForURL(`/${resourceType}`)
})

Then('I should see {string} in the {word} list', async ({ page }, itemName: string, resourceType: string) => {
  await expect(page.locator(`[data-testid="${resourceType}-list"] >> text=${itemName}`)).toBeVisible()
})

Then('I should see validation error {string}', async ({ page }, errorMessage: string) => {
  await expect(page.locator(`.error-message:has-text("${errorMessage}")`)).toBeVisible()
})

Then('I should remain on the job creation page', async ({ page }) => {
  await expect(page).toHaveURL(/\/jobs\/new/)
})

Then('the {string} field should be highlighted in red', async ({ page }, fieldLabel: string) => {
  const field = page.locator(`label:has-text("${fieldLabel}")`).locator('..').locator('input, textarea, select')
  await expect(field).toHaveClass(/border-red/)
})

Then('I should be navigated to the {word} step', async ({ page }, stepName: string) => {
  await expect(page.locator(`[data-step="${stepName.toLowerCase()}"].active`)).toBeVisible()
})

Then('I should be on the {string} step', async ({ page }, stepName: string) => {
  await expect(page.locator(`[data-step="${stepName.toLowerCase()}"].active`)).toBeVisible()
})

Then('the {string} step should be highlighted in the sidebar', async ({ page }, stepName: string) => {
  await expect(page.locator(`.sidebar [data-step="${stepName.toLowerCase()}"].active`)).toBeVisible()
})

// Draft-specific steps
When('I click {string}', async ({ page }, buttonText: string) => {
  await page.click(`button:has-text("${buttonText}")`)
})

Then('I should see {string} in the jobs list with status {string}', async ({ page }, jobTitle: string, status: string) => {
  const jobCard = page.locator(`[data-testid="job-card"]:has-text("${jobTitle}")`)
  await expect(jobCard).toBeVisible()
  await expect(jobCard.locator(`[data-status="${status.toLowerCase()}"]`)).toBeVisible()
})

// Given with existing data
Given('I have a draft job {string}', async ({ page }, jobTitle: string) => {
  await page.request.post('/api/jobs', {
    data: {
      title: jobTitle,
      status: 'draft',
      flowTemplateId: '123',
      description: 'Test description'
    }
  })
  await page.goto('/jobs')
})

Given('I have a published job {string}', async ({ page }, jobTitle: string) => {
  await page.request.post('/api/jobs', {
    data: {
      title: jobTitle,
      status: 'open',
      flowTemplateId: '123',
      description: 'Test description'
    }
  })
  await page.goto('/jobs')
})

// Complex steps with tables
When('I fill in {string} with markdown content:', async ({ page }, fieldLabel: string, docString: string) => {
  const field = page.locator(`label:has-text("${fieldLabel}")`).locator('..').locator('textarea')
  await field.fill(docString)
})
```

### Hiring Flow Steps (`e2e/step-definitions/hiring-flows.steps.ts`)

```typescript
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import { expect } from '@playwright/test'

// Navigation
When('I click on the {string} tab', async ({ page }, tabName: string) => {
  await page.click(`[role="tab"]:has-text("${tabName}")`)
})

When('I click {string}', async ({ page }, buttonText: string) => {
  await page.click(`button:has-text("${buttonText}")`)
})

// Modal interactions
Then('the flow designer modal should open', async ({ page }) => {
  await expect(page.locator('[data-testid="flow-designer-modal"]')).toBeVisible()
})

// Adding stages
When('I add the following stages:', async ({ page }, dataTable: DataTable) => {
  const stages = dataTable.hashes()
  
  for (const stage of stages) {
    await page.click('button:has-text("Add Stage")')
    const lastStageInput = page.locator('[data-testid="stage-name-input"]').last()
    await lastStageInput.fill(stage['Stage Name'])
    
    if (stage['Color']) {
      const colorPicker = page.locator('[data-testid="stage-color-picker"]').last()
      await colorPicker.click()
      await page.click(`[data-color="${stage['Color']}"]`)
    }
  }
})

When('I add stage {string}', async ({ page }, stageName: string) => {
  await page.click('button:has-text("Add Stage")')
  await page.locator('[data-testid="stage-name-input"]').last().fill(stageName)
})

When('I add only {int} stage {string}', async ({ page }, count: number, stageName: string) => {
  for (let i = 0; i < count; i++) {
    await page.click('button:has-text("Add Stage")')
    await page.locator('[data-testid="stage-name-input"]').last().fill(stageName)
  }
})

When('I add a stage with empty name', async ({ page }) => {
  await page.click('button:has-text("Add Stage")')
  // Don't fill in the name
})

// Assertions
Then('the template should show {string}', async ({ page }, text: string) => {
  await expect(page.locator(`text=${text}`)).toBeVisible()
})

Then('{string} should appear in the flow templates list', async ({ page }, templateName: string) => {
  await expect(page.locator(`[data-testid="flow-template-card"]:has-text("${templateName}")`)).toBeVisible()
})

// Given steps with data
Given('I have created the following flow templates:', async ({ page }, dataTable: DataTable) => {
  const templates = dataTable.hashes()
  
  for (const template of templates) {
    const stages = []
    for (let i = 0; i < parseInt(template['Stages']); i++) {
      stages.push({ name: `Stage ${i + 1}`, order: i + 1 })
    }
    
    await page.request.post('/api/flow-templates', {
      data: {
        name: template['Name'],
        stages: stages
      }
    })
  }
})

Given('I have a flow template {string} with {int} stages', async ({ page }, templateName: string, stageCount: number) => {
  const stages = []
  for (let i = 0; i < stageCount; i++) {
    stages.push({ name: `Stage ${i + 1}`, order: i + 1 })
  }
  
  await page.request.post('/api/flow-templates', {
    data: {
      name: templateName,
      stages: stages
    }
  })
})

// Drag and drop
When('I drag {string} stage before {string} stage', async ({ page }, source: string, target: string) => {
  const sourceStage = page.locator(`[data-stage-name="${source}"]`)
  const targetStage = page.locator(`[data-stage-name="${target}"]`)
  
  await sourceStage.dragTo(targetStage)
})

Then('the new order should be: {string}', async ({ page }, orderString: string) => {
  const expectedOrder = orderString.split(', ').map(s => s.trim().replace(/"/g, ''))
  
  const stages = await page.locator('[data-testid="stage-card"]').all()
  for (let i = 0; i < expectedOrder.length; i++) {
    const stageText = await stages[i].textContent()
    expect(stageText).toContain(expectedOrder[i])
  }
})
```

### Common Steps (`e2e/step-definitions/common.steps.ts`)

```typescript
import { Given, When, Then, Before, After } from '@cucumber/cucumber'
import { expect } from '@playwright/test'

// Hooks
Before(async ({ page }) => {
  // Set up default test data, clear cookies, etc.
  await page.context().clearCookies()
})

After(async ({ page }, scenario) => {
  // Clean up test data
  if (scenario.result?.status === 'failed') {
    await page.screenshot({ path: `test-results/${scenario.pickle.name}-failed.png` })
  }
})

// Login
Given('I am logged in as a {string}', async ({ page }, role: string) => {
  const credentials = {
    'recruiter': { email: 'recruiter@test.com', password: 'password123' },
    'admin': { email: 'admin@test.com', password: 'admin123' },
    'viewer': { email: 'viewer@test.com', password: 'viewer123' }
  }
  
  const creds = credentials[role.toLowerCase()]
  await page.goto('/login')
  await page.fill('[name="email"]', creds.email)
  await page.fill('[name="password"]', creds.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
})

// API conditions
Given('the API server is temporarily unavailable', async ({ page }) => {
  await page.route('**/api/**', route => route.abort())
})

// Session
Given('my session expires after {int} minutes', async ({ page }, minutes: number) => {
  // Manipulate the auth token to be expired
  await page.evaluate(() => {
    localStorage.setItem('token', 'expired-token')
  })
})

// Error handling
Then('I should see an error message {string}', async ({ page }, message: string) => {
  await expect(page.locator(`.error-message:has-text("${message}")`)).toBeVisible()
})

// Wait conditions
When('I wait for {int} seconds', async ({ page }, seconds: number) => {
  await page.waitForTimeout(seconds * 1000)
})
```

## Running Gherkin Tests

```bash
# Run all feature files
npm run test:features

# Run specific feature
npm run test:features -- --name "Create a new hiring flow"

# Run with tags
npm run test:features -- --tags "@smoke"

# Generate HTML report
npm run test:features -- --format html:reports/cucumber-report.html
```

## Adding Tags to Features

You can tag scenarios for selective execution:

```gherkin
@smoke @critical
Scenario: Create a new job posting with all required fields
  When I fill in "Job Title" with "Senior QA Engineer"
  ...

@regression
Scenario: Handle very long job titles
  When I fill in "Job Title" with a 250-character string
  ...
```

Run tagged scenarios:
```bash
npm run test:features -- --tags "@smoke"
npm run test:features -- --tags "not @regression"
```

## Best Practices

### 1. Keep Steps Reusable
✅ Good:
```gherkin
When I fill in "Job Title" with "Engineer"
```

❌ Bad:
```gherkin
When I fill in the job title field with Engineer
```

### 2. Use Data Tables
✅ Good:
```gherkin
When I add the following stages:
  | Stage Name | Color |
  | Review     | blue  |
  | Interview  | green |
```

❌ Bad:
```gherkin
When I add stage "Review" with color "blue"
And I add stage "Interview" with color "green"
```

### 3. Keep Scenarios Independent
Each scenario should be able to run in isolation.

### 4. Use Background for Common Setup
```gherkin
Background:
  Given I am logged in as a recruiter
  And I am on the job creation page
```

### 5. Descriptive Scenario Names
✅ Good: "Cannot publish job without required job title"
❌ Bad: "Test validation"

## Debugging

### Run in Debug Mode
```bash
npm run test:features -- --debug
```

### View Step Definitions
```bash
npx cucumber-js --dry-run --format=json | jq
```

### Check Step Coverage
```bash
npx cucumber-js --dry-run
```

## Integration with CI/CD

Add to `.github/workflows/test.yml`:

```yaml
- name: Run Cucumber Tests
  run: npm run test:features -- --format json:reports/cucumber-results.json

- name: Publish Test Results
  if: always()
  uses: cucumber/cucumber-action@v1
  with:
    report-path: reports/cucumber-results.json
```

## Next Steps

1. Install dependencies: `npm install --save-dev @cucumber/cucumber playwright-bdd`
2. Create step definition files in `e2e/step-definitions/`
3. Update `playwright.config.ts` with BDD config
4. Run tests: `npm run test:features`
5. View reports and iterate

## Resources

- Cucumber.js Docs: https://cucumber.io/docs/cucumber/
- Playwright BDD: https://github.com/vitalets/playwright-bdd
- Step Definitions Guide: https://cucumber.io/docs/cucumber/step-definitions/

Happy testing! 🎉
