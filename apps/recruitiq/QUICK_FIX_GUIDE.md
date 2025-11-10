# Quick Fix Guide - Immediate Testing Improvements

**Goal:** Fix UI testing issues in 1-2 days  
**Focus:** JobRequisition page (your immediate pain point)

---

## 🚨 Problem You're Experiencing

When testing UI flows in RecruitIQ, you're hitting errors because:

1. **No API mocking** - Tests fail when backend is down
2. **Missing component tests** - No tests for JobRequisition page
3. **Context dependencies** - Hard to test components in isolation
4. **Flaky tests** - Network timing issues

---

## ⚡ Quick Fix (2 hours)

### Step 1: Install MSW (5 minutes)

```powershell
cd c:\RecruitIQ\apps\recruitiq
pnpm add -D msw@latest
npx msw init public/ --save
```

### Step 2: Create Mock Server (15 minutes)

Create `src/test/mocks/handlers.js`:

```javascript
import { rest } from 'msw'

const API_URL = 'http://localhost:4000'

export const handlers = [
  // GET /api/jobs
  rest.get(`${API_URL}/api/jobs`, (req, res, ctx) => {
    return res(ctx.json({
      jobs: [],
      total: 0,
      page: 1,
      limit: 20
    }))
  }),

  // POST /api/jobs
  rest.post(`${API_URL}/api/jobs`, async (req, res, ctx) => {
    const body = await req.json()
    return res(ctx.json({
      job: {
        id: 'test-job-id',
        ...body,
        createdAt: new Date().toISOString()
      }
    }))
  }),

  // GET /api/flow-templates
  rest.get(`${API_URL}/api/flow-templates`, (req, res, ctx) => {
    return res(ctx.json({
      templates: [
        {
          id: 'template-1',
          name: 'Standard Process',
          description: 'Standard hiring process',
          stages: [
            { id: '1', name: 'Applied', required: true },
            { id: '2', name: 'Phone Screen', required: false },
            { id: '3', name: 'Interview', required: true },
            { id: '4', name: 'Offer', required: false }
          ]
        }
      ]
    }))
  }),

  // GET /api/candidates
  rest.get(`${API_URL}/api/candidates`, (req, res, ctx) => {
    return res(ctx.json({
      candidates: [],
      total: 0
    }))
  })
]
```

Create `src/test/mocks/server.js`:

```javascript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

### Step 3: Update Test Setup (5 minutes)

Update `src/test/setup.js`:

```javascript
import '@testing-library/jest-dom/vitest'
import { expect, afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { server } from './mocks/server' // ADD THIS

expect.extend(matchers)

// ADD THESE:
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())

afterEach(() => {
  cleanup()
  server.resetHandlers() // ADD THIS
})
```

### Step 4: Create Test Helpers (30 minutes)

Create `src/test/testHelpers.jsx`:

```javascript
import React from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider } from '../context/DataContext'
import { FlowProvider } from '../context/FlowContext'
import { ToastProvider } from '../context/ToastContext'
import { AuthProvider } from '@recruitiq/auth'

// Mock user
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
  organizationId: 'test-org-id'
}

// Render with all providers
export function renderWithAllProviders(ui, options = {}) {
  const {
    initialRoute = '/',
    user = mockUser
  } = options

  const Wrapper = ({ children }) => (
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider value={{ user, isAuthenticated: true, login: vi.fn(), logout: vi.fn() }}>
        <ToastProvider>
          <DataProvider>
            <FlowProvider>
              {children}
            </FlowProvider>
          </DataProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}

// Test data factories
export const createMockJob = (overrides = {}) => ({
  id: `job-${Date.now()}`,
  title: 'Test Job',
  department: 'Engineering',
  location: 'San Francisco',
  employmentType: 'full-time',
  description: 'Test description',
  requirements: ['Requirement 1'],
  status: 'published',
  createdAt: new Date().toISOString(),
  ...overrides
})

export const createMockFlowTemplate = (overrides = {}) => ({
  id: `template-${Date.now()}`,
  name: 'Test Template',
  description: 'Test description',
  stages: [
    { id: '1', name: 'Applied', required: true },
    { id: '2', name: 'Interview', required: true }
  ],
  ...overrides
})
```

### Step 5: Write First Test (40 minutes)

Create `src/pages/JobRequisition.test.jsx`:

```javascript
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { server } from '../test/mocks/server'
import { rest } from 'msw'
import JobRequisition from './JobRequisition'
import { renderWithAllProviders } from '../test/testHelpers'

// Mock router hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({})
  }
})

describe('JobRequisition Page', () => {
  it('renders form successfully', async () => {
    renderWithAllProviders(<JobRequisition />)
    
    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
    })
    
    expect(screen.getByTestId('department-select')).toBeInTheDocument()
    expect(screen.getByTestId('flow-template-select')).toBeInTheDocument()
  })

  it('shows validation error when title is empty', async () => {
    const user = userEvent.setup()
    renderWithAllProviders(<JobRequisition />)
    
    await waitFor(() => {
      expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
    })
    
    // Try to save without title
    const saveButton = screen.getByTestId('save-draft-button')
    await user.click(saveButton)
    
    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/job title is required/i)).toBeInTheDocument()
    })
  })

  it('requires flow template selection', async () => {
    const user = userEvent.setup()
    renderWithAllProviders(<JobRequisition />)
    
    await waitFor(() => {
      expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
    })
    
    // Fill title but not template
    await user.type(screen.getByTestId('job-title-input'), 'Test Job')
    
    // Try to save
    const saveButton = screen.getByTestId('save-draft-button')
    expect(saveButton).toBeDisabled()
  })

  it('saves draft successfully', async () => {
    const user = userEvent.setup()
    renderWithAllProviders(<JobRequisition />)
    
    await waitFor(() => {
      expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
    })
    
    // Fill required fields
    await user.type(screen.getByTestId('job-title-input'), 'Senior QA Engineer')
    
    // Select flow template
    const templateSelect = screen.getByTestId('flow-template-select')
    await user.selectOptions(templateSelect, '1')
    
    // Navigate to description
    await user.click(screen.getByTestId('next-button'))
    
    await waitFor(() => {
      expect(screen.getByTestId('description-textarea')).toBeInTheDocument()
    })
    
    // Fill description
    await user.type(screen.getByTestId('description-textarea'), 'Test description')
    
    // Save draft
    await user.click(screen.getByTestId('save-draft-button'))
    
    // Should navigate to jobs list
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/jobs')
    })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock API error
    server.use(
      rest.post('http://localhost:4000/api/jobs', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ message: 'Internal server error' })
        )
      })
    )
    
    renderWithAllProviders(<JobRequisition />)
    
    await waitFor(() => {
      expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
    })
    
    // Fill and submit form
    await user.type(screen.getByTestId('job-title-input'), 'Test Job')
    
    const templateSelect = screen.getByTestId('flow-template-select')
    await user.selectOptions(templateSelect, '1')
    
    await user.click(screen.getByTestId('next-button'))
    
    await waitFor(() => {
      expect(screen.getByTestId('description-textarea')).toBeInTheDocument()
    })
    
    await user.type(screen.getByTestId('description-textarea'), 'Description')
    
    await user.click(screen.getByTestId('save-draft-button'))
    
    // Should show error (check for toast or error message)
    await waitFor(() => {
      // Adjust based on your error handling
      expect(screen.getByText(/failed/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('navigates through all steps', async () => {
    const user = userEvent.setup()
    renderWithAllProviders(<JobRequisition />)
    
    await waitFor(() => {
      expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
    })
    
    // Step 1: Basics
    expect(screen.getByRole('heading', { name: /basic info/i })).toBeInTheDocument()
    
    await user.type(screen.getByTestId('job-title-input'), 'Test')
    await user.click(screen.getByTestId('next-button'))
    
    // Step 2: Description
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /description/i })).toBeInTheDocument()
    })
    
    await user.click(screen.getByTestId('next-button'))
    
    // Step 3: Requirements
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /requirements/i })).toBeInTheDocument()
    })
    
    await user.click(screen.getByTestId('next-button'))
    
    // Step 4: Compliance
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /compliance/i })).toBeInTheDocument()
    })
    
    await user.click(screen.getByTestId('next-button'))
    
    // Step 5: Distribution
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /distribution/i })).toBeInTheDocument()
    })
  })
})
```

### Step 6: Run Tests (5 minutes)

```powershell
cd c:\RecruitIQ\apps\recruitiq
pnpm test JobRequisition.test.jsx
```

---

## ✅ What This Fixes

1. **✅ No backend dependency** - Tests run with mocked API
2. **✅ Fast execution** - Tests complete in <5 seconds
3. **✅ Deterministic** - Same results every time
4. **✅ Easy to debug** - Clear error messages
5. **✅ Component isolation** - Test JobRequisition independently

---

## 🎯 Next Steps

Once this works, add more tests for:

1. **Form validation** - All field validations
2. **Error scenarios** - Network errors, 500s, timeouts
3. **User interactions** - Clicking, typing, navigating
4. **Loading states** - Spinners, skeleton screens
5. **Edge cases** - Empty data, long text, special characters

---

## 🐛 Troubleshooting

### Tests still fail?

1. **Check imports**
   ```javascript
   // Make sure server is imported
   import { server } from '../test/mocks/server'
   ```

2. **Check API URLs**
   ```javascript
   // Should match your .env
   const API_URL = 'http://localhost:4000'
   ```

3. **Check console**
   ```powershell
   pnpm test JobRequisition.test.jsx -- --reporter=verbose
   ```

4. **Debug MSW**
   ```javascript
   // In handlers.js, add logging
   rest.get(`${API_URL}/api/jobs`, (req, res, ctx) => {
     console.log('MSW intercepted GET /api/jobs')
     return res(ctx.json({ jobs: [] }))
   })
   ```

### Tests timeout?

```javascript
// Increase timeout in test
it('saves draft successfully', async () => {
  // ... test code
}, { timeout: 10000 }) // 10 seconds
```

### Can't find elements?

```javascript
// Use screen.debug() to see what's rendered
renderWithAllProviders(<JobRequisition />)
screen.debug() // Prints DOM to console
```

---

## 📚 Learn More

- [MSW Documentation](https://mswjs.io/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [User Event API](https://testing-library.com/docs/user-event/intro)
- [Vitest Matchers](https://vitest.dev/api/expect.html)

---

## 💡 Pro Tips

1. **Start simple** - Test happy path first
2. **Add test-ids** - Makes finding elements easier
3. **Use waitFor** - For async operations
4. **Mock errors** - Use `server.use()` to override handlers
5. **Keep tests focused** - One assertion per test

---

**Time to implement:** 2 hours  
**Impact:** Immediate relief for UI testing  
**Maintenance:** Low (MSW is stable)

Good luck! 🚀
