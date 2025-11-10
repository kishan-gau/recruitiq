/**
 * Test Setup with Context Mocks
 * 
 * Industry Standard Approach:
 * - Mock hooks at module level (Facebook/React team recommendation)
 * - Provide sensible defaults that work for most tests
 * - Allow per-test overrides when needed
 * - Keep tests fast and isolated
 */

import { vi } from 'vitest'

// Mock Flow Templates Data
export const mockFlowTemplates = [
  {
    id: 'template-1',
    name: 'Standard Interview Process',
    description: 'Standard 5-stage interview process',
    stages: [
      { id: 'stage-1', name: 'Applied', order: 0, required: true, color: '#3B82F6' },
      { id: 'stage-2', name: 'Phone Screen', order: 1, required: false, color: '#8B5CF6' },
      { id: 'stage-3', name: 'Technical Interview', order: 2, required: true, color: '#EC4899' },
      { id: 'stage-4', name: 'Final Interview', order: 3, required: true, color: '#F59E0B' },
      { id: 'stage-5', name: 'Offer', order: 4, required: false, color: '#10B981' }
    ],
    isDefault: true
  },
  {
    id: 'template-2',
    name: 'Quick Hire Process',
    description: 'Streamlined 3-stage process',
    stages: [
      { id: 'stage-1', name: 'Applied', order: 0, required: true, color: '#3B82F6' },
      { id: 'stage-2', name: 'Interview', order: 1, required: true, color: '#EC4899' },
      { id: 'stage-3', name: 'Offer', order: 2, required: false, color: '#10B981' }
    ],
    isDefault: false
  }
]

// Mock User Data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@recruitiq.com',
  name: 'Test User',
  role: 'admin',
  organizationId: 'test-org-id'
}

// Mock Workspace Data
export const mockWorkspace = {
  id: 'test-workspace-id',
  name: 'Test Workspace',
  organizationId: 'test-org-id'
}

// Mock Organization Data
export const mockOrganization = {
  id: 'test-org-id',
  name: 'Test Organization',
  tier: 'professional',
  isActive: true,
  maxWorkspaces: 10,
  maxUsers: 50
}

/**
 * Setup module mocks for all context hooks
 * Call this in your test file before imports
 */
export function setupContextMocks() {
  // Mock AuthContext
  vi.mock('@recruitiq/auth', () => ({
    AuthProvider: ({ children }) => children,
    useAuth: vi.fn(() => ({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn()
    }))
  }))

  // Mock WorkspaceContext
  vi.mock('../context/WorkspaceContext', () => ({
    WORKSPACE_COLORS: [
      { id: 'emerald', name: 'Emerald', class: 'bg-emerald-500', ring: 'ring-emerald-500', text: 'text-emerald-500' },
      { id: 'blue', name: 'Blue', class: 'bg-blue-500', ring: 'ring-blue-500', text: 'text-blue-500' },
      { id: 'purple', name: 'Purple', class: 'bg-purple-500', ring: 'ring-purple-500', text: 'text-purple-500' },
      { id: 'amber', name: 'Amber', class: 'bg-amber-500', ring: 'ring-amber-500', text: 'text-amber-500' },
      { id: 'rose', name: 'Rose', class: 'bg-rose-500', ring: 'ring-rose-500', text: 'text-rose-500' },
      { id: 'cyan', name: 'Cyan', class: 'bg-cyan-500', ring: 'ring-cyan-500', text: 'text-cyan-500' },
    ],
    WorkspaceProvider: ({ children }) => children,
    useWorkspace: vi.fn(() => ({
      currentWorkspace: mockWorkspace,
      currentWorkspaceId: mockWorkspace.id,
      workspaces: [mockWorkspace],
      switchWorkspace: vi.fn(),
      loading: false
    }))
  }))

  // Mock OrganizationContext
  vi.mock('../context/OrganizationContext', () => ({
    OrganizationProvider: ({ children }) => children,
    useOrganization: vi.fn(() => ({
      organization: mockOrganization,
      loading: false,
      error: null,
      canCreateWorkspace: () => true,
      canAddUser: () => true,
      hasFeature: () => true
    }))
  }))

  // Mock FlowContext - THIS IS THE KEY ONE
  vi.mock('../context/FlowContext', () => ({
    FlowProvider: ({ children }) => children,
    useFlow: vi.fn(() => ({
      flowTemplates: mockFlowTemplates,
      isLoading: false,
      error: null,
      createJobFlow: vi.fn(),
      ensureLoaded: vi.fn()
    }))
  }))

  // Mock DataContext
  vi.mock('../context/DataContext', () => ({
    DataProvider: ({ children }) => children,
    useData: vi.fn(() => ({
      jobs: [],
      candidates: [],
      applications: [],
      loading: {
        jobs: false,
        candidates: false,
        applications: false
      },
      error: {
        jobs: null,
        candidates: null,
        applications: null
      },
      refreshJobs: vi.fn(),
      refreshCandidates: vi.fn(),
      refreshApplications: vi.fn(),
      addJob: vi.fn((job) => Promise.resolve({ success: true, data: { ...job, id: 'new-job-id' } })),
      updateJob: vi.fn((id, job) => Promise.resolve({ success: true, data: { ...job, id } })),
      deleteJob: vi.fn((id) => Promise.resolve({ success: true })),
      addCandidate: vi.fn((candidate) => Promise.resolve({ success: true, data: { ...candidate, id: 'new-candidate-id' } })),
      updateCandidate: vi.fn((id, candidate) => Promise.resolve({ success: true, data: { ...candidate, id } })),
      deleteCandidate: vi.fn((id) => Promise.resolve({ success: true }))
    }))
  }))

  // Mock ToastContext
  vi.mock('../context/ToastContext', () => ({
    ToastProvider: ({ children }) => children,
    useToast: vi.fn(() => ({
      toast: {
        show: vi.fn()
      }
    }))
  }))
}

/**
 * Reset all mocks between tests
 */
export function resetContextMocks() {
  vi.clearAllMocks()
}
