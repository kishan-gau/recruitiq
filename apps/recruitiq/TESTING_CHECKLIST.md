# Testing Best Practices Checklist

Use this checklist when writing or reviewing tests for RecruitIQ.

---

## ✅ Every Test Must Have

### Basic Structure
- [ ] **Clear test description** - Describes what is being tested
- [ ] **Arrange-Act-Assert pattern** - Clear separation of setup, action, assertion
- [ ] **Single responsibility** - Tests one thing at a time
- [ ] **Independent** - Doesn't depend on other tests
- [ ] **Deterministic** - Same results every time

### Example:
```javascript
// ✅ GOOD
it('shows validation error when title is empty', async () => {
  // Arrange
  const user = userEvent.setup()
  renderWithAllProviders(<JobRequisition />)
  
  // Act
  await user.click(screen.getByTestId('save-button'))
  
  // Assert
  expect(screen.getByText(/title is required/i)).toBeInTheDocument()
})

// ❌ BAD
it('test form', async () => {
  render(<JobRequisition />)
  // What are we testing? Unclear!
})
```

---

## 🎯 Component Tests Checklist

### Rendering
- [ ] Renders without crashing
- [ ] Renders with different props
- [ ] Renders loading state
- [ ] Renders error state
- [ ] Renders empty state

### User Interactions
- [ ] Click handlers work
- [ ] Form submission works
- [ ] Input changes are handled
- [ ] Keyboard navigation works
- [ ] Focus management works

### Validation
- [ ] Shows validation errors
- [ ] Validates on blur
- [ ] Validates on submit
- [ ] Clears errors when fixed
- [ ] Disabled state prevents submission

### API Integration
- [ ] Loading state during API call
- [ ] Success message on success
- [ ] Error message on failure
- [ ] Network error handling
- [ ] Timeout handling

### Example Checklist for JobRequisition:
```
Component: JobRequisition
Page: apps/recruitiq/src/pages/JobRequisition.jsx

Rendering:
✅ Renders form on new job
✅ Renders form with existing job data
✅ Shows loading spinner while fetching
✅ Shows error message if load fails
⬜ Shows empty state (N/A for this page)

User Interactions:
✅ Navigate through steps
✅ Fill form fields
✅ Save draft
✅ Publish job
✅ Cancel navigation

Validation:
✅ Required title field
✅ Required description field
✅ Required flow template
✅ Show errors on blur
✅ Scroll to error field

API Integration:
✅ Create new job
✅ Update existing job
✅ Load flow templates
⬜ Handle 500 error
⬜ Handle network timeout
⬜ Handle rate limiting

Edge Cases:
⬜ Very long title (>1000 chars)
⬜ Special characters in title
⬜ XSS attempt in description
⬜ Double submission prevention
⬜ Browser back button

Accessibility:
⬜ Keyboard navigation
⬜ Screen reader labels
⬜ Focus management
⬜ ARIA attributes
⬜ Color contrast
```

---

## 🔧 Test Quality Checklist

### Readability
- [ ] Test name describes expected behavior
- [ ] Uses semantic queries (`getByRole`, `getByLabelText`)
- [ ] Has comments for complex logic
- [ ] Variables have descriptive names
- [ ] Test data is realistic

### Maintainability
- [ ] Uses test helpers/utilities
- [ ] Avoids hard-coded values
- [ ] Uses constants for repeated data
- [ ] Doesn't test implementation details
- [ ] Easy to update when requirements change

### Performance
- [ ] Runs in <2 seconds
- [ ] Doesn't have unnecessary `waitFor`
- [ ] Doesn't use `waitForTimeout` (use `waitFor` instead)
- [ ] Cleans up after itself
- [ ] Reuses mock setup

### Coverage
- [ ] Tests happy path
- [ ] Tests sad path (errors)
- [ ] Tests edge cases
- [ ] Tests validation rules
- [ ] Tests user interactions

---

## 🚫 Anti-Patterns to Avoid

### ❌ Testing Implementation Details
```javascript
// ❌ BAD - Testing internal state
expect(component.state.title).toBe('Test')

// ✅ GOOD - Testing user-visible behavior
expect(screen.getByDisplayValue('Test')).toBeInTheDocument()
```

### ❌ Hard-Coded Waits
```javascript
// ❌ BAD - Arbitrary timeout
await page.waitForTimeout(3000)

// ✅ GOOD - Wait for specific condition
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
})
```

### ❌ Multiple Assertions Per Test
```javascript
// ❌ BAD - Testing multiple things
it('form works', () => {
  render(<Form />)
  expect(screen.getByLabelText('Title')).toBeInTheDocument()
  expect(screen.getByLabelText('Description')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  // If first assertion fails, we don't know about the rest
})

// ✅ GOOD - Separate tests
it('renders title input', () => {
  render(<Form />)
  expect(screen.getByLabelText('Title')).toBeInTheDocument()
})

it('renders description input', () => {
  render(<Form />)
  expect(screen.getByLabelText('Description')).toBeInTheDocument()
})

it('renders save button', () => {
  render(<Form />)
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
})
```

### ❌ Fragile Selectors
```javascript
// ❌ BAD - Will break with styling changes
const button = container.querySelector('.btn-primary')

// ✅ GOOD - Semantic, stable selector
const button = screen.getByRole('button', { name: 'Save' })
```

### ❌ Testing External Libraries
```javascript
// ❌ BAD - Testing React Router
it('useNavigate returns a function', () => {
  const navigate = useNavigate()
  expect(typeof navigate).toBe('function')
})

// ✅ GOOD - Test your code, not the library
it('navigates to jobs page after save', async () => {
  const mockNavigate = vi.fn()
  vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))
  
  // ... test your component
  
  expect(mockNavigate).toHaveBeenCalledWith('/jobs')
})
```

### ❌ Snapshot Testing UI Components
```javascript
// ❌ BAD - Brittle, hard to review
it('renders correctly', () => {
  const { container } = render(<JobRequisition />)
  expect(container).toMatchSnapshot()
  // Any change breaks this test, even whitespace
})

// ✅ GOOD - Test specific behavior
it('renders job requisition form', () => {
  render(<JobRequisition />)
  expect(screen.getByRole('heading', { name: /job requisition/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/job title/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
})
```

---

## 🎨 Query Priority Order

Always use queries in this order (from most to least preferred):

1. **`getByRole`** - Best for semantic HTML
   ```javascript
   screen.getByRole('button', { name: /save/i })
   screen.getByRole('textbox', { name: /job title/i })
   ```

2. **`getByLabelText`** - Good for form fields
   ```javascript
   screen.getByLabelText(/job title/i)
   ```

3. **`getByPlaceholderText`** - OK for inputs
   ```javascript
   screen.getByPlaceholderText(/enter job title/i)
   ```

4. **`getByText`** - Good for non-interactive content
   ```javascript
   screen.getByText(/job requisition/i)
   ```

5. **`getByTestId`** - Last resort
   ```javascript
   screen.getByTestId('job-title-input')
   ```

**❌ Never use:** `container.querySelector()`, `container.getElementsByClassName()`

---

## 🔍 Debugging Tests

### Use screen.debug()
```javascript
it('renders form', () => {
  render(<JobRequisition />)
  screen.debug() // Prints current DOM
  // Now you can see what's actually rendered
})
```

### Use logRoles()
```javascript
import { logRoles } from '@testing-library/react'

it('finds button', () => {
  const { container } = render(<JobRequisition />)
  logRoles(container) // Shows all accessible roles
})
```

### Use waitFor with longer timeout
```javascript
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
}, { timeout: 5000 }) // 5 seconds instead of default 1 second
```

### Check MSW handlers
```javascript
// In your test
server.use(
  rest.get('/api/jobs', (req, res, ctx) => {
    console.log('MSW: GET /api/jobs called') // Add logging
    return res(ctx.json({ jobs: [] }))
  })
)
```

---

## 📊 Coverage Checklist

### Component Coverage Goals
- [ ] **70%+** line coverage
- [ ] **80%+** branch coverage
- [ ] **100%** critical path coverage

### What to Cover
- [ ] All user interactions
- [ ] All validation rules
- [ ] All API calls
- [ ] All error scenarios
- [ ] All loading states
- [ ] All edge cases

### What NOT to Cover
- [ ] ~~Third-party library code~~
- [ ] ~~Generated code~~
- [ ] ~~Type definitions~~
- [ ] ~~Constants/config files~~

---

## 🚀 Running Tests Checklist

### Before Committing
- [ ] All tests pass locally
- [ ] No console errors/warnings
- [ ] Coverage hasn't decreased
- [ ] Tests run in <2 minutes
- [ ] No flaky tests (run 3x to verify)

### Commands
```powershell
# Run all tests
pnpm test

# Run specific file
pnpm test JobRequisition.test.jsx

# Run with coverage
pnpm test -- --coverage

# Run in watch mode
pnpm test -- --watch

# Run with UI
pnpm test -- --ui

# Run only changed files
pnpm test -- --changed
```

---

## 📝 Test Documentation Checklist

### Every Test File Should Have
- [ ] File-level comment explaining what's being tested
- [ ] Imports organized (React → Testing Library → Mocks → Component)
- [ ] Mock setup before tests
- [ ] Cleanup in `afterEach`
- [ ] Grouped tests with `describe` blocks
- [ ] Comments for complex test logic

### Example:
```javascript
/**
 * JobRequisition Page Tests
 * 
 * Tests the job requisition form including:
 * - Form rendering
 * - Multi-step navigation
 * - Field validation
 * - Draft saving
 * - Job publishing
 * - Error handling
 */

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mocks
import { server } from '../test/mocks/server'
import { rest } from 'msw'

// Component under test
import JobRequisition from './JobRequisition'

// Test helpers
import { renderWithAllProviders } from '../test/testHelpers'

// Mock router
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

describe('JobRequisition Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Form Rendering', () => {
    it('renders all form fields', async () => {
      // Test implementation
    })
  })

  describe('Validation', () => {
    it('validates required fields', async () => {
      // Test implementation
    })
  })

  // ... more test groups
})
```

---

## ✨ Tips for Success

1. **Write tests as you code** - Don't leave testing for later
2. **Start with happy path** - Then add error cases
3. **Use meaningful test names** - Should read like documentation
4. **Keep tests simple** - One assertion per test when possible
5. **Mock at the boundary** - Mock API calls, not internal functions
6. **Test user behavior** - Not implementation details
7. **Use test-ids sparingly** - Prefer semantic queries
8. **Clean up after tests** - Avoid test pollution
9. **Run tests frequently** - Catch issues early
10. **Review test output** - Make sure tests actually test something

---

## 🎯 Quick Reference

### Essential Testing Library Queries
```javascript
// Preferred (in order)
getByRole('button', { name: /save/i })
getByLabelText(/job title/i)
getByPlaceholderText(/search/i)
getByText(/hello world/i)
getByTestId('submit-button')

// Async queries (for elements that appear later)
await findByRole('button', { name: /save/i })
await findByText(/success/i)

// Query multiple elements
getAllByRole('listitem')

// Check if element is NOT in document
expect(queryByText('Error')).not.toBeInTheDocument()
```

### Common User Interactions
```javascript
const user = userEvent.setup()

await user.click(button)
await user.type(input, 'text')
await user.clear(input)
await user.selectOptions(select, 'value')
await user.upload(fileInput, file)
await user.hover(element)
await user.tab()
```

### Common Assertions
```javascript
expect(element).toBeInTheDocument()
expect(element).toBeVisible()
expect(element).toBeDisabled()
expect(element).toHaveValue('text')
expect(element).toHaveTextContent('text')
expect(element).toHaveClass('active')
expect(element).toHaveAttribute('href', '/path')
```

---

**Last Updated:** November 6, 2025  
**Maintained By:** Engineering Team  
**Review Frequency:** Quarterly
