import React from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { faker } from '@faker-js/faker'
import { DataProvider } from '../context/DataContext'
import { FlowProvider } from '../context/FlowContext'
import { ToastProvider } from '../context/ToastContext'
import { AuthProvider } from '@recruitiq/auth'
import { OrganizationProvider } from '../context/OrganizationContext'
import { WorkspaceProvider } from '../context/WorkspaceContext'

/**
 * Test Helpers and Utilities
 * 
 * This file provides reusable test utilities for RecruitIQ tests:
 * - renderWithAllProviders: Renders components with all necessary providers
 * - Mock data factories: Create consistent test data
 * - Mock user: Default authenticated user for tests
 */

// ==================== MOCK USER ====================

export const mockUser = {
  id: 'test-user-id',
  email: 'test@recruitiq.com',
  name: 'Test User',
  role: 'admin',
  organizationId: 'test-org-id',
  workspaceId: 'test-workspace-id'
}

// ==================== MOCK WORKSPACE ====================

export const mockWorkspace = {
  id: 'test-workspace-id',
  name: 'Test Workspace',
  organizationId: 'test-org-id'
}

export const mockWorkspaces = [
  mockWorkspace,
  {
    id: 'workspace-2',
    name: 'Engineering Team',
    organizationId: 'test-org-id'
  }
]

// ==================== RENDER WITH PROVIDERS ====================

/**
 * Render a component with all necessary providers for testing
 * 
 * @param {ReactElement} ui - Component to render
 * @param {Object} options - Configuration options
 * @param {string} options.initialRoute - Initial route for MemoryRouter
 * @param {Object} options.user - Mock user object
 * @param {Object} options.workspace - Mock workspace object
 * @param {Array} options.workspaces - Mock workspaces array
 * @param {QueryClient} options.queryClient - React Query client
 * @param {Object} options.authContext - Additional auth context values
 * @returns {RenderResult} Testing Library render result
 */
export function renderWithAllProviders(ui, options = {}) {
  const {
    initialRoute = '/',
    user = mockUser,
    workspace = mockWorkspace,
    workspaces = mockWorkspaces,
    queryClient = createTestQueryClient(),
    authContext = {},
    flowTemplates = []
  } = options

  // Create a wrapper with all providers
  // We use real providers and let MSW handle API mocking
  const AllTheProviders = ({ children }) => {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <AuthProvider>
            <OrganizationProvider>
              <WorkspaceProvider>
                  <ToastProvider>
                    <DataProvider>
                      <FlowProvider>
                        {children}
                      </FlowProvider>
                    </DataProvider>
                  </ToastProvider>
              </WorkspaceProvider>
            </OrganizationProvider>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: AllTheProviders, ...options })
}

/**
 * Render with only router (for components that don't need other providers)
 */
export function renderWithRouter(ui, { initialRoute = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      {ui}
    </MemoryRouter>
  )
}

/**
 * Create a test QueryClient with sensible defaults for testing
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed queries in tests
        cacheTime: 0, // Don't cache results
        staleTime: 0
      },
      mutations: {
        retry: false
      }
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {} // Suppress error logs in tests
    }
  })
}

// ==================== TEST DATA FACTORIES ====================

/**
 * Create a mock job with optional overrides
 * 
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock job object
 */
export const createMockJob = (overrides = {}) => ({
  id: `job-${faker.string.uuid()}`,
  title: faker.person.jobTitle(),
  department: faker.helpers.arrayElement(['Engineering', 'Product', 'Design', 'Marketing', 'Sales']),
  location: faker.helpers.arrayElement(['San Francisco', 'New York', 'Remote', 'London']),
  employmentType: faker.helpers.arrayElement(['full-time', 'part-time', 'contract', 'internship']),
  description: faker.lorem.paragraphs(2),
  requirements: Array.from({ length: 3 }, () => faker.lorem.sentence()),
  status: faker.helpers.arrayElement(['draft', 'published', 'closed']),
  flowTemplateId: `template-${faker.number.int({ min: 1, max: 3 })}`,
  experienceLevel: faker.helpers.arrayElement(['entry', 'mid', 'senior', 'lead']),
  salary: `$${faker.number.int({ min: 80, max: 200 })}k - $${faker.number.int({ min: 120, max: 250 })}k`,
  openings: faker.number.int({ min: 1, max: 5 }),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides
})

/**
 * Create a mock candidate with optional overrides
 */
export const createMockCandidate = (overrides = {}) => ({
  id: `candidate-${faker.string.uuid()}`,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  stage: faker.helpers.arrayElement(['Applied', 'Phone Screen', 'Interview', 'Offer', 'Hired', 'Rejected']),
  jobId: `job-${faker.string.uuid()}`,
  appliedDate: faker.date.past().toISOString(),
  resume: faker.internet.url(),
  notes: faker.lorem.paragraph(),
  ...overrides
})

/**
 * Create a mock flow template with optional overrides
 */
export const createMockFlowTemplate = (overrides = {}) => ({
  id: `template-${faker.string.uuid()}`,
  name: faker.helpers.arrayElement(['Standard Process', 'Quick Hire', 'Executive Search', 'Internship Track']),
  description: faker.lorem.sentence(),
  stages: [
    { id: '1', name: 'Applied', order: 0, required: true, color: '#3B82F6' },
    { id: '2', name: 'Phone Screen', order: 1, required: false, color: '#8B5CF6' },
    { id: '3', name: 'Interview', order: 2, required: true, color: '#EC4899' },
    { id: '4', name: 'Offer', order: 3, required: false, color: '#10B981' }
  ],
  isDefault: false,
  createdAt: faker.date.past().toISOString(),
  ...overrides
})

/**
 * Create a mock application with optional overrides
 */
export const createMockApplication = (overrides = {}) => ({
  id: `app-${faker.string.uuid()}`,
  jobId: `job-${faker.string.uuid()}`,
  candidateId: `candidate-${faker.string.uuid()}`,
  status: faker.helpers.arrayElement(['submitted', 'under_review', 'interview_scheduled', 'rejected', 'accepted']),
  appliedDate: faker.date.past().toISOString(),
  ...overrides
})

/**
 * Create a mock workspace with optional overrides
 */
export const createMockWorkspace = (overrides = {}) => ({
  id: `workspace-${faker.string.uuid()}`,
  name: faker.company.buzzNoun() + ' Team',
  organizationId: 'test-org-id',
  createdAt: faker.date.past().toISOString(),
  ...overrides
})

// ==================== FORM HELPERS ====================

/**
 * Fill out a job requisition form
 * 
 * @param {UserEvent} user - UserEvent instance from @testing-library/user-event
 * @param {Object} formData - Form data to fill
 */
export async function fillJobRequisitionForm(user, formData = {}) {
  const {
    title = 'Test Job Title',
    department = 'Engineering',
    location = 'San Francisco',
    employmentType = 'full-time',
    flowTemplateId = '1',
    description = 'Test job description',
    requirements = 'Test requirements'
  } = formData

  const { screen } = await import('@testing-library/react')

  // Fill title
  const titleInput = screen.getByTestId('job-title-input')
  await user.clear(titleInput)
  await user.type(titleInput, title)

  // Select department
  if (department) {
    await user.selectOptions(screen.getByTestId('department-select'), department)
  }

  // Select location
  if (location) {
    await user.selectOptions(screen.getByTestId('location-select'), location)
  }

  // Select employment type
  if (employmentType) {
    await user.selectOptions(screen.getByTestId('type-select'), employmentType)
  }

  // Select flow template
  if (flowTemplateId) {
    const templateSelect = screen.getByTestId('flow-template-select')
    await user.selectOptions(templateSelect, flowTemplateId)
  }

  // Fill description (if on description step)
  if (description) {
    const descTextarea = screen.queryByTestId('description-textarea')
    if (descTextarea) {
      await user.clear(descTextarea)
      await user.type(descTextarea, description)
    }
  }

  // Fill requirements (if on requirements step)
  if (requirements) {
    const reqTextarea = screen.queryByTestId('requirements-textarea')
    if (reqTextarea) {
      await user.clear(reqTextarea)
      await user.type(reqTextarea, requirements)
    }
  }
}

// ==================== WAIT HELPERS ====================

/**
 * Wait for loading to finish
 * 
 * @param {Function} screen - Testing Library screen object
 * @param {number} timeout - Timeout in milliseconds
 */
export async function waitForLoadingToFinish(screen, timeout = 3000) {
  const { waitFor } = await import('@testing-library/react')
  
  await waitFor(
    () => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    },
    { timeout }
  )
}

/**
 * Wait for element to be removed from DOM
 */
export async function waitForElementToBeRemoved(element, timeout = 3000) {
  const { waitFor } = await import('@testing-library/react')
  
  await waitFor(
    () => {
      expect(element).not.toBeInTheDocument()
    },
    { timeout }
  )
}

// ==================== MOCK FUNCTIONS ====================

/**
 * Create a mock navigate function for react-router
 */
export const createMockNavigate = () => vi.fn()

/**
 * Create a mock toast function
 */
export const createMockToast = () => ({
  show: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn()
})

// ==================== DEBUG HELPERS ====================

/**
 * Print the current DOM for debugging
 */
export function debugDOM(container) {
  const { prettyDOM } = require('@testing-library/react')
  console.log(prettyDOM(container, 100000))
}

/**
 * Print all accessible roles in the DOM
 */
export function debugRoles(container) {
  const { logRoles } = require('@testing-library/react')
  logRoles(container)
}
