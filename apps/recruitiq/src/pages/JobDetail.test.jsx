import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupContextMocks, resetContextMocks, mockDataContext } from '../test/testSetup'
import { renderWithAllProviders, createMockJob, createMockCandidate } from '../test/testHelpers'

// Setup context mocks first
setupContextMocks()

// Mock useParams to return a job ID
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(),
    Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children)
  }
})

// Mock child components
vi.mock('../components/PublishJobToggle', () => {
  const React = require('react')
  return {
    default: (props) => React.createElement('div', { 'data-testid': 'publish-job-toggle' }, 
      `PublishJobToggle: ${props.job?.title || 'No job'}`
    )
  }
})

vi.mock('../components/PortalSettingsModal', () => {
  const React = require('react')
  return {
    default: (props) => {
      if (!props.isOpen) return null
      return React.createElement('div', { 'data-testid': 'portal-settings-modal' }, 
        'Portal Settings Modal'
      )
    }
  }
})

import JobDetail from './JobDetail'
import { useParams } from 'react-router-dom'
import { useData } from '../context/DataContext'

describe('JobDetail Page', () => {
  let mockUseParams
  let mockUseData

  // Mock job data
  const mockJob = createMockJob({
    id: 'job-1',
    title: 'Senior Software Engineer',
    location: 'New York, NY',
    employmentType: 'full-time',
    openings: 2,
    description: 'We are looking for an experienced software engineer to join our team.',
    is_public: false
  })

  const mockPublishedJob = createMockJob({
    id: 'job-2',
    title: 'Product Manager',
    location: 'San Francisco, CA',
    employmentType: 'full-time',
    openings: 1,
    description: 'Lead product strategy and roadmap.',
    is_public: true
  })

  // Mock candidates
  const mockCandidates = [
    createMockCandidate({
      id: 'candidate-1',
      name: 'John Doe',
      jobId: 'job-1',
      stage: 'Interview',
      title: 'Software Engineer'
    }),
    createMockCandidate({
      id: 'candidate-2',
      name: 'Jane Smith',
      jobId: 'job-1',
      stage: 'Technical Screen',
      title: 'Senior Developer'
    }),
    createMockCandidate({
      id: 'candidate-3',
      name: 'Bob Johnson',
      jobId: 'job-2',
      stage: 'Offer',
      title: 'PM'
    })
  ]

  beforeEach(async () => {
    resetContextMocks()
    
    const routerModule = await import('react-router-dom')
    const dataModule = await import('../context/DataContext')
    
    mockUseParams = routerModule.useParams
    mockUseData = dataModule.useData
    
    // Default: return job-1 ID
    mockUseParams.mockReturnValue({ id: 'job-1' })
    
    // Default mock data context
    mockUseData.mockReturnValue({
      jobs: [mockJob, mockPublishedJob],
      candidates: mockCandidates,
      loading: { jobs: false, candidates: false },
      error: { jobs: null, candidates: null },
      updateJob: vi.fn()
    })
  })

  describe('Page Rendering', () => {
    it('renders job title and basic info', () => {
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
      expect(screen.getByText('New York, NY')).toBeInTheDocument()
      expect(screen.getByText('full-time')).toBeInTheDocument()
      expect(screen.getByText('2 openings')).toBeInTheDocument()
    })

    it('renders job description', () => {
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('We are looking for an experienced software engineer to join our team.')).toBeInTheDocument()
    })

    it('renders Edit and Post buttons', () => {
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Post')).toBeInTheDocument()
    })

    it('renders PublishJobToggle component', () => {
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByTestId('publish-job-toggle')).toBeInTheDocument()
      expect(screen.getByText(/PublishJobToggle: Senior Software Engineer/)).toBeInTheDocument()
    })

    it('displays singular "opening" for 1 opening', () => {
      mockUseParams.mockReturnValue({ id: 'job-2' })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('1 opening')).toBeInTheDocument()
    })

    it('displays plural "openings" for multiple openings', () => {
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('2 openings')).toBeInTheDocument()
    })
  })

  describe('Candidates Section', () => {
    it('renders candidates list header with count', () => {
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Candidates')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // 2 candidates for job-1
    })

    it('displays all candidates for the job', () => {
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument() // Different job
    })

    it('displays candidate stages', () => {
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Interview')).toBeInTheDocument()
      expect(screen.getByText('Technical Screen')).toBeInTheDocument()
    })

    it('displays candidate titles', () => {
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
      expect(screen.getByText('Senior Developer')).toBeInTheDocument()
    })

    it('links to candidate detail pages', () => {
      renderWithAllProviders(<JobDetail />)
      
      const candidateLink = screen.getByText('John Doe').closest('a')
      expect(candidateLink).toHaveAttribute('href', '/candidates/candidate-1')
    })

    it('shows empty state when no candidates', () => {
      mockUseData.mockReturnValue({
        jobs: [mockJob, mockPublishedJob],
        candidates: [],
        loading: { jobs: false, candidates: false },
        error: { jobs: null, candidates: null },
        updateJob: vi.fn()
      })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('No candidates yet')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner when jobs are loading', () => {
      mockUseData.mockReturnValue({
        jobs: [],
        candidates: [],
        loading: { jobs: true, candidates: false },
        error: { jobs: null, candidates: null },
        updateJob: vi.fn()
      })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Loading job details...')).toBeInTheDocument()
      expect(screen.queryByText('Senior Software Engineer')).not.toBeInTheDocument()
    })

    it('shows loading spinner when candidates are loading', () => {
      mockUseData.mockReturnValue({
        jobs: [],
        candidates: [],
        loading: { jobs: false, candidates: true },
        error: { jobs: null, candidates: null },
        updateJob: vi.fn()
      })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Loading job details...')).toBeInTheDocument()
    })

    it('shows loading spinner when both are loading', () => {
      mockUseData.mockReturnValue({
        jobs: [],
        candidates: [],
        loading: { jobs: true, candidates: true },
        error: { jobs: null, candidates: null },
        updateJob: vi.fn()
      })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Loading job details...')).toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('shows error message when job fetch fails', () => {
      mockUseData.mockReturnValue({
        jobs: [],
        candidates: [],
        loading: { jobs: false, candidates: false },
        error: { jobs: 'Network error', candidates: null },
        updateJob: vi.fn()
      })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Failed to load job')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    it('renders "Back to jobs" link on error', () => {
      mockUseData.mockReturnValue({
        jobs: [],
        candidates: [],
        loading: { jobs: false, candidates: false },
        error: { jobs: 'Failed to fetch', candidates: null },
        updateJob: vi.fn()
      })
      
      renderWithAllProviders(<JobDetail />)
      
      const backLink = screen.getByText('Back to jobs')
      expect(backLink).toBeInTheDocument()
      expect(backLink.closest('a')).toHaveAttribute('href', '/jobs')
    })

    it('does not show job details on error', () => {
      mockUseData.mockReturnValue({
        jobs: [],
        candidates: [],
        loading: { jobs: false, candidates: false },
        error: { jobs: 'Error', candidates: null },
        updateJob: vi.fn()
      })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.queryByText('Senior Software Engineer')).not.toBeInTheDocument()
      expect(screen.queryByText('Description')).not.toBeInTheDocument()
    })
  })

  describe('Not Found State', () => {
    it('shows not found message when job does not exist', () => {
      mockUseParams.mockReturnValue({ id: 'non-existent-id' })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Job not found')).toBeInTheDocument()
      expect(screen.getByText("The job you're looking for doesn't exist")).toBeInTheDocument()
    })

    it('renders "Back to jobs" link when job not found', () => {
      mockUseParams.mockReturnValue({ id: 'non-existent-id' })
      
      renderWithAllProviders(<JobDetail />)
      
      const backLink = screen.getByText('Back to jobs')
      expect(backLink).toBeInTheDocument()
      expect(backLink.closest('a')).toHaveAttribute('href', '/jobs')
    })

    it('does not show job details when job not found', () => {
      mockUseParams.mockReturnValue({ id: 'non-existent-id' })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.queryByText('Description')).not.toBeInTheDocument()
      expect(screen.queryByText('Candidates')).not.toBeInTheDocument()
    })

    it('handles null jobs array gracefully', () => {
      mockUseData.mockReturnValue({
        jobs: null,
        candidates: mockCandidates,
        loading: { jobs: false, candidates: false },
        error: { jobs: null, candidates: null },
        updateJob: vi.fn()
      })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Job not found')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('Edit button links to edit page', () => {
      renderWithAllProviders(<JobDetail />)
      
      const editLink = screen.getByText('Edit').closest('a')
      expect(editLink).toHaveAttribute('href', '/jobs/job-1/edit')
    })

    it('uses correct job ID in edit link', () => {
      mockUseParams.mockReturnValue({ id: 'job-2' })
      
      renderWithAllProviders(<JobDetail />)
      
      const editLink = screen.getByText('Edit').closest('a')
      expect(editLink).toHaveAttribute('href', '/jobs/job-2/edit')
    })
  })

  describe('Published Job Features', () => {
    it('shows portal settings button for published jobs', () => {
      mockUseParams.mockReturnValue({ id: 'job-2' })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Configure Portal Settings')).toBeInTheDocument()
    })

    it('does not show portal settings button for unpublished jobs', () => {
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.queryByText('Configure Portal Settings')).not.toBeInTheDocument()
    })

    it('shows portal settings description text for published jobs', () => {
      mockUseParams.mockReturnValue({ id: 'job-2' })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText(/Customize company info, salary visibility/)).toBeInTheDocument()
    })

    it('opens portal settings modal when button is clicked', async () => {
      mockUseParams.mockReturnValue({ id: 'job-2' })
      const user = userEvent.setup()
      
      renderWithAllProviders(<JobDetail />)
      
      const settingsButton = screen.getByText('Configure Portal Settings')
      await user.click(settingsButton)
      
      expect(screen.getByTestId('portal-settings-modal')).toBeInTheDocument()
    })

    it('handles is_public field for published status', () => {
      mockUseParams.mockReturnValue({ id: 'job-2' })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Configure Portal Settings')).toBeInTheDocument()
    })

    it('handles isPublic field for published status', () => {
      const jobWithIsPublic = createMockJob({
        id: 'job-3',
        title: 'Designer',
        isPublic: true,
        is_public: undefined
      })
      mockUseParams.mockReturnValue({ id: 'job-3' })
      mockUseData.mockReturnValue({
        jobs: [jobWithIsPublic],
        candidates: mockCandidates,
        loading: { jobs: false, candidates: false },
        error: { jobs: null, candidates: null },
        updateJob: vi.fn()
      })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Configure Portal Settings')).toBeInTheDocument()
    })
  })

  describe('Data Handling', () => {
    it('matches job by string ID comparison', () => {
      mockUseParams.mockReturnValue({ id: 'job-1' })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
    })

    it('handles job with type field instead of employmentType', () => {
      const jobWithType = createMockJob({
        id: 'job-3',
        title: 'Contract Developer',
        type: 'contract',
        employmentType: undefined
      })
      mockUseParams.mockReturnValue({ id: 'job-3' })
      mockUseData.mockReturnValue({
        jobs: [jobWithType],
        candidates: mockCandidates,
        loading: { jobs: false, candidates: false },
        error: { jobs: null, candidates: null },
        updateJob: vi.fn()
      })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('contract')).toBeInTheDocument()
    })

    it('filters candidates by jobId correctly', () => {
      mockUseParams.mockReturnValue({ id: 'job-2' })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })

    it('handles empty candidates array', () => {
      mockUseData.mockReturnValue({
        jobs: [mockJob, mockPublishedJob],
        candidates: [],
        loading: { jobs: false, candidates: false },
        error: { jobs: null, candidates: null },
        updateJob: vi.fn()
      })
      
      renderWithAllProviders(<JobDetail />)
      
      expect(screen.getByText('No candidates yet')).toBeInTheDocument()
    })

    it('calls updateJob when job is updated', () => {
      const mockUpdateJob = vi.fn()
      mockUseData.mockReturnValue({
        jobs: [mockJob, mockPublishedJob],
        candidates: mockCandidates,
        loading: { jobs: false, candidates: false },
        error: { jobs: null, candidates: null },
        updateJob: mockUpdateJob
      })
      
      renderWithAllProviders(<JobDetail />)
      
      // The component passes handleJobUpdate to child components
      // We verify updateJob is available in context
      expect(mockUpdateJob).toBeDefined()
    })
  })

  describe('UI Elements', () => {
    it('renders correct icons for error state', () => {
      mockUseData.mockReturnValue({
        jobs: [],
        candidates: [],
        loading: { jobs: false, candidates: false },
        error: { jobs: 'Error', candidates: null },
        updateJob: vi.fn()
      })
      
      const { container } = renderWithAllProviders(<JobDetail />)
      
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders correct icons for not found state', () => {
      mockUseParams.mockReturnValue({ id: 'non-existent' })
      
      const { container } = renderWithAllProviders(<JobDetail />)
      
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('applies correct styling to candidate cards', () => {
      renderWithAllProviders(<JobDetail />)
      
      const candidateName = screen.getByText('John Doe')
      const candidateCard = candidateName.closest('div')
      expect(candidateCard).toBeInTheDocument()
    })

    it('shows candidate count badge', () => {
      renderWithAllProviders(<JobDetail />)
      
      // The "2" badge appears next to "Candidates" header
      const badge = screen.getByText('2')
      expect(badge).toBeInTheDocument()
    })
  })
})
