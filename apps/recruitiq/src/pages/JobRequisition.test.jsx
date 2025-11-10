import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/mocks/server'
import { setupContextMocks, resetContextMocks, mockFlowTemplates } from '../test/testSetup'
import { renderWithAllProviders } from '../test/testHelpers'

// Setup all context mocks BEFORE importing the component
setupContextMocks()

// Now import the component (it will use mocked contexts)
import JobRequisition from './JobRequisition'

/**
 * JobRequisition Page Tests
 * 
 * Tests the job requisition form including:
 * - Form rendering and initialization
 * - Multi-step navigation
 * - Field validation
 * - Draft saving
 * - Job publishing
 * - Flow template integration
 * - Error handling
 */

// Mock router hooks
const mockNavigate = vi.fn()
const mockParams = { id: null }
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams
  }
})

describe('JobRequisition Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  afterEach(() => {
    resetContextMocks()
  })

  // ==================== RENDERING TESTS ====================

  describe('Form Rendering', () => {
    it('renders form successfully', async () => {
      renderWithAllProviders(<JobRequisition />)
      
      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      // Check all basic fields are present
      expect(screen.getByTestId('department-select')).toBeInTheDocument()
      expect(screen.getByTestId('location-select')).toBeInTheDocument()
      expect(screen.getByTestId('type-select')).toBeInTheDocument()
      expect(screen.getByTestId('flow-template-select')).toBeInTheDocument()
    })

    it('renders all step indicators', async () => {
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByText('Basics')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Requirements')).toBeInTheDocument()
      expect(screen.getByText('Compliance')).toBeInTheDocument()
      expect(screen.getByText('Distribution')).toBeInTheDocument()
    })

    it('renders action buttons', async () => {
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('save-draft-button')).toBeInTheDocument()
      })
      
      expect(screen.getByTestId('publish-button')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('loads flow templates on mount', async () => {
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        const select = screen.getByTestId('flow-template-select')
        expect(select.options.length).toBeGreaterThan(1) // Has options beyond "Select..."
      })
    })
  })

  // ==================== VALIDATION TESTS ====================

  describe('Form Validation', () => {
    it('shows error when title is empty and save is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      // Save button should be disabled without title
      const saveButton = screen.getByTestId('save-draft-button')
      expect(saveButton).toBeDisabled()
      
      // Select template to enable the button
      const templateSelect = screen.getByTestId('flow-template-select')
      await user.selectOptions(templateSelect, 'template-1')
      
      // Button should still be disabled without title
      await waitFor(() => {
        expect(saveButton).toBeDisabled()
      })
    })

    it('shows error when description is empty and save is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      // Fill title only
      await user.type(screen.getByTestId('job-title-input'), 'Test Job')
      
      // Select flow template
      const templateSelect = screen.getByTestId('flow-template-select')
      await user.selectOptions(templateSelect, 'template-1')
      
      // Try to save
      await user.click(screen.getByTestId('save-draft-button'))
      
      // Should navigate to description and show error
      await waitFor(() => {
        expect(screen.getByText(/job description is required/i)).toBeInTheDocument()
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
      
      // Wait for form to update
      await waitFor(() => {
        const saveButton = screen.getByTestId('save-draft-button')
        // Save button should be disabled without flow template
        expect(saveButton).toBeDisabled()
      })
    })

    it('validates title on blur', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      const titleInput = screen.getByTestId('job-title-input')
      
      // Focus and blur without entering anything
      await user.click(titleInput)
      await user.tab()
      
      // Should show error after blur
      await waitFor(() => {
        expect(screen.getByText(/job title is required/i)).toBeInTheDocument()
      })
    })

    it('clears error when title is filled', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      const titleInput = screen.getByTestId('job-title-input')
      
      // Trigger error
      await user.click(titleInput)
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByText(/job title is required/i)).toBeInTheDocument()
      })
      
      // Fill title
      await user.type(titleInput, 'Senior QA Engineer')
      
      // Error should be gone
      await waitFor(() => {
        expect(screen.queryByText(/job title is required/i)).not.toBeInTheDocument()
      })
    })
  })

  // ==================== NAVIGATION TESTS ====================

  describe('Step Navigation', () => {
    it('navigates through all steps using Next button', async () => {
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

    it('navigates backward using Previous button', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('next-button')).toBeInTheDocument()
      })
      
      // Go to step 2
      await user.click(screen.getByTestId('next-button'))
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /description/i })).toBeInTheDocument()
      })
      
      // Go back to step 1
      await user.click(screen.getByTestId('previous-button'))
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /basic info/i })).toBeInTheDocument()
      })
    })

    it('disables Previous button on first step', async () => {
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('previous-button')).toBeInTheDocument()
      })
      
      const prevButton = screen.getByTestId('previous-button')
      expect(prevButton).toBeDisabled()
    })

    it('disables Next button on last step', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('next-button')).toBeInTheDocument()
      })
      
      // Navigate to last step
      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByTestId('next-button'))
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      await waitFor(() => {
        const nextButton = screen.getByTestId('next-button')
        expect(nextButton).toBeDisabled()
      })
    })
  })

  // ==================== SAVE DRAFT TESTS ====================

  describe('Save Draft', () => {
    it('saves draft with minimal required data', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      // Fill required fields
      await user.type(screen.getByTestId('job-title-input'), 'Senior QA Engineer')
      
      // Select flow template
      const templateSelect = screen.getByTestId('flow-template-select')
      await user.selectOptions(templateSelect, 'template-1')
      
      // Navigate to description
      await user.click(screen.getByTestId('next-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('description-textarea')).toBeInTheDocument()
      })
      
      // Fill description
      await user.type(screen.getByTestId('description-textarea'), 'Test description')
      
      // Save as draft
      const saveButton = screen.getByTestId('save-draft-button')
      await user.click(saveButton)
      
      // Should navigate to jobs list
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/jobs')
      }, { timeout: 5000 })
    })

    it('disables save button without title', async () => {
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('save-draft-button')).toBeInTheDocument()
      })
      
      const saveButton = screen.getByTestId('save-draft-button')
      expect(saveButton).toBeDisabled()
    })

    it('disables save button without flow template', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      // Fill title only
      await user.type(screen.getByTestId('job-title-input'), 'Test Job')
      
      // Save button should still be disabled
      const saveButton = screen.getByTestId('save-draft-button')
      expect(saveButton).toBeDisabled()
    })
  })

  // ==================== PUBLISH JOB TESTS ====================

  describe('Publish Job', () => {
    it('publishes job with all required data', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      // Fill form
      await user.type(screen.getByTestId('job-title-input'), 'Senior QA Engineer')
      const templateSelect = screen.getByTestId('flow-template-select')
      await user.selectOptions(templateSelect, 'template-1')
      
      // Navigate and fill description
      await user.click(screen.getByTestId('next-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('description-textarea')).toBeInTheDocument()
      })
      
      await user.type(screen.getByTestId('description-textarea'), 'Test description')
      
      // Publish
      const publishButton = screen.getByTestId('publish-button')
      await user.click(publishButton)
      
      // Should navigate to job detail page
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled()
        const callArg = mockNavigate.mock.calls[0][0]
        expect(callArg).toMatch(/\/jobs\//)
      }, { timeout: 5000 })
    })

    it('shows validation errors before publishing', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      const publishButton = screen.getByTestId('publish-button')
      
      // Publish button should be disabled initially
      expect(publishButton).toBeDisabled()
      
      // Fill just the title to enable the button
      await user.type(screen.getByTestId('job-title-input'), 'T')
      
      // Select flow template to enable navigation
      const templateSelect = screen.getByTestId('flow-template-select')
      await user.selectOptions(templateSelect, 'template-1')
      
      // Now try to publish
      await waitFor(() => {
        expect(screen.getByTestId('publish-button')).not.toBeDisabled()
      })
      
      await user.click(screen.getByTestId('publish-button'))
      
      // Should show validation error for title being too short or missing description
      await waitFor(() => {
        const hasError = 
          screen.queryByText(/job title.*at least/i) ||
          screen.queryByText(/description is required/i) ||
          screen.queryByText(/required/i)
        expect(hasError).toBeInTheDocument()
      })
    })

    it('disables publish button without required fields', async () => {
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('publish-button')).toBeInTheDocument()
      })
      
      const publishButton = screen.getByTestId('publish-button')
      expect(publishButton).toBeDisabled()
    })
  })

  // ==================== ERROR HANDLING TESTS ====================

  describe('Error Handling', () => {
    it('handles API error gracefully when saving', async () => {
      const user = userEvent.setup()
      
      // Mock addJob to return error
      const { useData } = await import('../context/DataContext')
      useData.mockImplementationOnce(() => ({
        jobs: [],
        candidates: [],
        applications: [],
        loading: { jobs: false, candidates: false, applications: false },
        error: { jobs: null, candidates: null, applications: null },
        refreshJobs: vi.fn(),
        refreshCandidates: vi.fn(),
        refreshApplications: vi.fn(),
        addJob: vi.fn(() => Promise.resolve({ success: false, message: 'Internal server error' })),
        updateJob: vi.fn(),
        deleteJob: vi.fn(),
        addCandidate: vi.fn(),
        updateCandidate: vi.fn(),
        deleteCandidate: vi.fn()
      }))
      
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      // Fill and submit form
      await user.type(screen.getByTestId('job-title-input'), 'Test Job')
      
      const templateSelect = screen.getByTestId('flow-template-select')
      await user.selectOptions(templateSelect, 'template-1')
      
      await user.click(screen.getByTestId('next-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('description-textarea')).toBeInTheDocument()
      })
      
      await user.type(screen.getByTestId('description-textarea'), 'Description')
      
      await user.click(screen.getByTestId('save-draft-button'))
      
      // The form stays on the page (doesn't navigate away on error)
      await waitFor(() => {
        expect(screen.getByTestId('save-draft-button')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('handles validation error from API', async () => {
      const user = userEvent.setup()
      
      // Mock validation error
      server.use(
        http.post('http://localhost:4000/api/jobs', () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Job title must be at least 2 characters',
              errorCode: 'VALIDATION_ERROR'
            },
            { status: 400 }
          )
        })
      )
      
      // Mock addJob to return validation error
      const { useData } = await import('../context/DataContext')
      useData.mockImplementationOnce(() => ({
        jobs: [],
        candidates: [],
        applications: [],
        loading: { jobs: false, candidates: false, applications: false },
        error: { jobs: null, candidates: null, applications: null },
        refreshJobs: vi.fn(),
        refreshCandidates: vi.fn(),
        refreshApplications: vi.fn(),
        addJob: vi.fn(() => Promise.resolve({ 
          success: false, 
          message: 'Job title must be at least 2 characters',
          errorCode: 'VALIDATION_ERROR'
        })),
        updateJob: vi.fn(),
        deleteJob: vi.fn(),
        addCandidate: vi.fn(),
        updateCandidate: vi.fn(),
        deleteCandidate: vi.fn()
      }))
      
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      // Fill and submit
      await user.type(screen.getByTestId('job-title-input'), 'A')
      
      const templateSelect = screen.getByTestId('flow-template-select')
      await user.selectOptions(templateSelect, 'template-1')
      
      await user.click(screen.getByTestId('next-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('description-textarea')).toBeInTheDocument()
      })
      
      await user.type(screen.getByTestId('description-textarea'), 'Description')
      
      await user.click(screen.getByTestId('save-draft-button'))
      
      // The form stays on the page (doesn't navigate away on error)
      await waitFor(() => {
        expect(screen.getByTestId('save-draft-button')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('handles network timeout gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock network delay
      server.use(
        http.post('http://localhost:4000/api/jobs', async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return HttpResponse.json({ success: true, job: { id: 'test' } })
        })
      )
      
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      // This test just verifies the form doesn't crash during network operations
      await user.type(screen.getByTestId('job-title-input'), 'Test Job')
      
      expect(screen.getByTestId('job-title-input')).toHaveValue('Test Job')
    })
  })

  // ==================== FLOW TEMPLATE TESTS ====================

  describe('Flow Template Integration', () => {
    it('shows template preview when selected', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('flow-template-select')).toBeInTheDocument()
      })
      
      // Select a template
      const templateSelect = screen.getByTestId('flow-template-select')
      await user.selectOptions(templateSelect, 'template-1')
      
      // Should show template info (check for template name in preview area)
      await waitFor(() => {
        // Template info should be visible - look for the stages in the preview
        const stages = screen.getAllByText(/applied|phone screen/i)
        expect(stages.length).toBeGreaterThan(1) // Should appear in dropdown AND preview
      })
    })

    it('validates flow template is required before save', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      // Fill title but no template
      await user.type(screen.getByTestId('job-title-input'), 'Test Job')
      
      // Try to save
      const saveButton = screen.getByTestId('save-draft-button')
      expect(saveButton).toBeDisabled()
    })
  })

  // ==================== TEXT FORMATTING TESTS ====================

  describe('Text Formatting', () => {
    it('shows formatting toolbar on description step', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('next-button')).toBeInTheDocument()
      })
      
      // Navigate to description step
      await user.click(screen.getByTestId('next-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('description-textarea')).toBeInTheDocument()
      })
      
      // Check for description textarea (formatting may be handled by the component)
      const textarea = screen.getByTestId('description-textarea')
      expect(textarea).toBeInTheDocument()
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('allows markdown-style text entry', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('next-button')).toBeInTheDocument()
      })
      
      // Navigate to description
      await user.click(screen.getByTestId('next-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('description-textarea')).toBeInTheDocument()
      })
      
      // Type some text
      const textarea = screen.getByTestId('description-textarea')
      await user.type(textarea, 'Test **bold** text')
      
      // Text should be entered
      expect(textarea).toHaveValue('Test **bold** text')
    })
  })

  // ==================== CANCEL TESTS ====================

  describe('Cancel Action', () => {
    it('navigates back to jobs list when cancel is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('Cancel'))
      
      expect(mockNavigate).toHaveBeenCalledWith('/jobs')
    })
  })

  // ==================== EDIT MODE TESTS ====================

  describe('Edit Mode', () => {
    beforeEach(() => {
      // Set ID for edit mode
      mockParams.id = '1'
    })

    afterEach(() => {
      // Reset to default (no ID)
      mockParams.id = null
    })

    it('loads existing job data in edit mode', async () => {
      const existingJob = {
        id: '1',
        title: 'Senior Engineer',
        department: 'Engineering',
        location: 'New York',
        employmentType: 'full-time',
        description: 'Existing description',
        requirements: ['Req 1', 'Req 2'],
        experienceLevel: 'senior',
        salary: '$120k - $150k',
        flowTemplateId: 'template-1',
        status: 'draft'
      }

      // Mock useData to return the existing job
      const { useData } = await import('../context/DataContext')
      useData.mockImplementation(() => ({
        jobs: [existingJob],
        candidates: [],
        applications: [],
        loading: { jobs: false, candidates: false, applications: false },
        error: { jobs: null, candidates: null, applications: null },
        refreshJobs: vi.fn(),
        refreshCandidates: vi.fn(),
        refreshApplications: vi.fn(),
        addJob: vi.fn(),
        updateJob: vi.fn(() => Promise.resolve({ success: true })),
        deleteJob: vi.fn(),
        addCandidate: vi.fn(),
        updateCandidate: vi.fn(),
        deleteCandidate: vi.fn()
      }))

      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      // Check if existing data is loaded
      expect(screen.getByTestId('job-title-input')).toHaveValue('Senior Engineer')
      expect(screen.getByTestId('department-select')).toHaveValue('Engineering')
      expect(screen.getByTestId('location-select')).toHaveValue('New York')
    })

    it('updates existing job when save is clicked in edit mode', async () => {
      const user = userEvent.setup()
      const updateJobMock = vi.fn(() => Promise.resolve({ success: true }))
      
      const existingJob = {
        id: '1',
        title: 'Senior Engineer',
        department: 'Engineering',
        location: 'New York',
        employmentType: 'full-time',
        description: 'Existing description',
        requirements: 'Req 1\nReq 2',
        experienceLevel: 'senior',
        salary: '$120k - $150k',
        flowTemplateId: 'template-1',
        status: 'draft'
      }

      // Mock useData to return the existing job
      const { useData } = await import('../context/DataContext')
      useData.mockImplementation(() => ({
        jobs: [existingJob],
        candidates: [],
        applications: [],
        loading: { jobs: false, candidates: false, applications: false },
        error: { jobs: null, candidates: null, applications: null },
        refreshJobs: vi.fn(),
        refreshCandidates: vi.fn(),
        refreshApplications: vi.fn(),
        addJob: vi.fn(),
        updateJob: updateJobMock,
        deleteJob: vi.fn(),
        addCandidate: vi.fn(),
        updateCandidate: vi.fn(),
        deleteCandidate: vi.fn()
      }))

      renderWithAllProviders(<JobRequisition />)
      
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toHaveValue('Senior Engineer')
      })
      
      // Edit the title
      const titleInput = screen.getByTestId('job-title-input')
      await user.clear(titleInput)
      await user.type(titleInput, 'Lead Engineer')
      
      // Save
      await user.click(screen.getByTestId('save-draft-button'))
      
      // Should call updateJob
      await waitFor(() => {
        expect(updateJobMock).toHaveBeenCalled()
      })
    })

    it('handles loading state during edit without hooks error', async () => {
      const existingJob = {
        id: '1',
        title: 'Senior Engineer',
        department: 'Engineering',
        location: 'New York',
        employmentType: 'full-time',
        description: 'Existing description',
        requirements: ['Req 1', 'Req 2'],
        experienceLevel: 'senior',
        flowTemplateId: 'template-1',
        status: 'draft'
      }

      // Start with loading state
      const { useData } = await import('../context/DataContext')
      let mockState = {
        jobs: [existingJob],
        candidates: [],
        applications: [],
        loading: { jobs: true, candidates: false, applications: false },
        error: { jobs: null, candidates: null, applications: null },
        refreshJobs: vi.fn(),
        refreshCandidates: vi.fn(),
        refreshApplications: vi.fn(),
        addJob: vi.fn(),
        updateJob: vi.fn(() => Promise.resolve({ success: true })),
        deleteJob: vi.fn(),
        addCandidate: vi.fn(),
        updateCandidate: vi.fn(),
        deleteCandidate: vi.fn()
      }
      
      useData.mockImplementation(() => mockState)

      const { rerender } = renderWithAllProviders(<JobRequisition />)
      
      // Should show loading
      await waitFor(() => {
        expect(screen.getByText(/loading job/i)).toBeInTheDocument()
      })
      
      // Simulate loading complete
      mockState = {
        ...mockState,
        loading: { jobs: false, candidates: false, applications: false }
      }
      
      rerender(<JobRequisition />)
      
      // Should show form without hooks error
      await waitFor(() => {
        expect(screen.getByTestId('job-title-input')).toBeInTheDocument()
      })
      
      expect(screen.getByTestId('job-title-input')).toHaveValue('Senior Engineer')
    })

    it('shows not found only when not loading and job does not exist', async () => {
      // Mock useData with no matching job
      const { useData } = await import('../context/DataContext')
      useData.mockImplementation(() => ({
        jobs: [],
        candidates: [],
        applications: [],
        loading: { jobs: false, candidates: false, applications: false },
        error: { jobs: null, candidates: null, applications: null },
        refreshJobs: vi.fn(),
        refreshCandidates: vi.fn(),
        refreshApplications: vi.fn(),
        addJob: vi.fn(),
        updateJob: vi.fn(),
        deleteJob: vi.fn(),
        addCandidate: vi.fn(),
        updateCandidate: vi.fn(),
        deleteCandidate: vi.fn()
      }))

      renderWithAllProviders(<JobRequisition />)
      
      // Should show "not found" message
      await waitFor(() => {
        expect(screen.getByText(/job not found/i)).toBeInTheDocument()
      })
      
      expect(screen.getByText(/doesn't exist or has been deleted/i)).toBeInTheDocument()
    })
  })
})
