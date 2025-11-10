import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupContextMocks, resetContextMocks } from '../test/testSetup'
import { renderWithAllProviders, createMockCandidate, createMockJob } from '../test/testHelpers'

// Setup context mocks first
setupContextMocks()

// Mock useParams and useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(),
    Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children)
  }
})

// Mock child components
vi.mock('../components/ConfirmationModal', () => {
  const React = require('react')
  return {
    default: (props) => {
      if (!props.open) return null
      return React.createElement('div', { 'data-testid': 'confirmation-modal' },
        React.createElement('h3', {}, props.title),
        React.createElement('p', {}, props.message),
        React.createElement('button', { onClick: props.onConfirm, 'data-testid': 'confirm-button' }, 'Confirm'),
        React.createElement('button', { onClick: props.onCancel, 'data-testid': 'cancel-button' }, 'Cancel')
      )
    }
  }
})

vi.mock('../components/CandidateEditForm', () => {
  const React = require('react')
  return {
    default: (props) => {
      if (!props.open) return null
      return React.createElement('div', { 'data-testid': 'candidate-edit-form' }, 
        `Editing: ${props.candidate?.name || 'Unknown'}`
      )
    }
  }
})

vi.mock('../components/ApplicationSourceBadge', () => {
  const React = require('react')
  return {
    default: (props) => React.createElement('span', { 'data-testid': 'application-source-badge' }, 
      props.source
    )
  }
})

import CandidateDetail from './CandidateDetail'
import { useParams, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'

describe('CandidateDetail Page', () => {
  let mockUseParams
  let mockUseNavigate
  let mockUseData
  let mockNavigate

  // Mock candidate data
  const mockCandidate = createMockCandidate({
    id: 'candidate-1',
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0123',
    location: 'New York, NY',
    title: 'Software Engineer',
    jobId: 'job-1',
    stage: 'Interview',
    experience: 'Senior software engineer with 5 years of experience in React and Node.js',
    resume: 'https://example.com/resume.pdf',
    application_source: 'linkedin'
  })

  const mockJob = createMockJob({
    id: 'job-1',
    title: 'Senior Software Engineer'
  })

  beforeEach(async () => {
    resetContextMocks()
    
    const routerModule = await import('react-router-dom')
    const dataModule = await import('../context/DataContext')
    
    mockUseParams = routerModule.useParams
    mockUseNavigate = routerModule.useNavigate
    mockUseData = dataModule.useData
    
    mockNavigate = vi.fn()
    
    // Default: return candidate-1 ID
    mockUseParams.mockReturnValue({ id: 'candidate-1' })
    mockUseNavigate.mockReturnValue(mockNavigate)
    
    // Default mock data context
    mockUseData.mockReturnValue({
      candidates: [mockCandidate],
      jobs: [mockJob],
      loading: { candidates: false, jobs: false },
      error: { candidates: null, jobs: null },
      deleteCandidate: vi.fn()
    })
  })

  describe('Page Rendering', () => {
    it('renders candidate name and title', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    })

    it('renders back to candidates link', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      const backLinks = screen.getAllByText('Back to candidates')
      expect(backLinks.length).toBeGreaterThan(0)
      expect(backLinks[0].closest('a')).toHaveAttribute('href', '/candidates')
    })

    it('renders candidate avatar with initials', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('renders active candidate status badge', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('Active Candidate')).toBeInTheDocument()
    })

    it('renders application source badge', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByTestId('application-source-badge')).toBeInTheDocument()
      expect(screen.getByText('linkedin')).toBeInTheDocument()
    })

    it('renders Edit and Delete buttons', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      const editButtons = screen.getAllByText('Edit')
      const deleteButtons = screen.getAllByText(/Delete/)
      
      expect(editButtons.length).toBeGreaterThan(0)
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('renders all tab navigation', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Documents' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Compliance' })).toBeInTheDocument()
    })
  })

  describe('Overview Tab', () => {
    it('displays personal details', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('Personal Details')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('555-0123')).toBeInTheDocument()
      expect(screen.getByText('New York, NY')).toBeInTheDocument()
    })

    it('displays job title candidate applied for', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('Applied for')).toBeInTheDocument()
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
    })

    it('displays experience section', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('Experience')).toBeInTheDocument()
      expect(screen.getByText(/Senior software engineer with 5 years/)).toBeInTheDocument()
    })

    it('renders View Resume button with correct link', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      const resumeLink = screen.getByText('View Resume').closest('a')
      expect(resumeLink).toHaveAttribute('href', 'https://example.com/resume.pdf')
      expect(resumeLink).toHaveAttribute('target', '_blank')
    })

    it('renders Add Note button', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('Add Note')).toBeInTheDocument()
    })

    it('shows dash when no job is associated', () => {
      mockUseData.mockReturnValue({
        candidates: [{ ...mockCandidate, jobId: 'non-existent' }],
        jobs: [mockJob],
        loading: { candidates: false, jobs: false },
        error: { candidates: null, jobs: null },
        deleteCandidate: vi.fn()
      })
      
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('Overview tab is active by default', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      const overviewTab = screen.getByRole('tab', { name: 'Overview' })
      expect(overviewTab).toHaveAttribute('aria-selected', 'true')
    })

    it('switches to Activity tab when clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const activityTab = screen.getByRole('tab', { name: 'Activity' })
      await user.click(activityTab)
      
      expect(activityTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Activity Timeline')).toBeInTheDocument()
    })

    it('switches to Documents tab when clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const documentsTab = screen.getByRole('tab', { name: 'Documents' })
      await user.click(documentsTab)
      
      expect(documentsTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getAllByText('Documents').length).toBeGreaterThan(0)
    })

    it('switches to Compliance tab when clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const complianceTab = screen.getByRole('tab', { name: 'Compliance' })
      await user.click(complianceTab)
      
      expect(complianceTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Compliance & Legal')).toBeInTheDocument()
    })
  })

  describe('Activity Tab', () => {
    it('displays activity timeline', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const activityTab = screen.getByRole('tab', { name: 'Activity' })
      await user.click(activityTab)
      
      expect(screen.getByText('Activity Timeline')).toBeInTheDocument()
      expect(screen.getByText(/Moved to Interview/)).toBeInTheDocument()
      expect(screen.getByText('Application submitted')).toBeInTheDocument()
    })

    it('displays job title in activity', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const activityTab = screen.getByRole('tab', { name: 'Activity' })
      await user.click(activityTab)
      
      expect(screen.getByText(/Candidate applied for Senior Software Engineer/)).toBeInTheDocument()
    })
  })

  describe('Documents Tab', () => {
    it('displays resume document', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const documentsTab = screen.getByRole('tab', { name: 'Documents' })
      await user.click(documentsTab)
      
      expect(screen.getByText('Resume.pdf')).toBeInTheDocument()
      expect(screen.getByText(/Uploaded 5 days ago/)).toBeInTheDocument()
    })

    it('resume view link points to correct URL', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const documentsTab = screen.getByRole('tab', { name: 'Documents' })
      await user.click(documentsTab)
      
      const viewLink = screen.getByText('View').closest('a')
      expect(viewLink).toHaveAttribute('href', 'https://example.com/resume.pdf')
    })

    it('shows no additional documents message', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const documentsTab = screen.getByRole('tab', { name: 'Documents' })
      await user.click(documentsTab)
      
      expect(screen.getByText('No additional documents uploaded')).toBeInTheDocument()
    })
  })

  describe('Compliance Tab', () => {
    it('displays compliance information', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const complianceTab = screen.getByRole('tab', { name: 'Compliance' })
      await user.click(complianceTab)
      
      expect(screen.getByText('Compliance & Legal')).toBeInTheDocument()
      expect(screen.getByText('US Work Authorization')).toBeInTheDocument()
      expect(screen.getByText('Background Check')).toBeInTheDocument()
      expect(screen.getByText('Offer Letter')).toBeInTheDocument()
    })

    it('shows verification statuses', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const complianceTab = screen.getByRole('tab', { name: 'Compliance' })
      await user.click(complianceTab)
      
      expect(screen.getByText('Verified and confirmed')).toBeInTheDocument()
      expect(screen.getByText('Pending initiation')).toBeInTheDocument()
      expect(screen.getByText('Not yet issued')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner when candidates are loading', () => {
      mockUseData.mockReturnValue({
        candidates: [],
        jobs: [],
        loading: { candidates: true, jobs: false },
        error: { candidates: null, jobs: null },
        deleteCandidate: vi.fn()
      })
      
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('Loading candidate details...')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    it('shows loading spinner when jobs are loading', () => {
      mockUseData.mockReturnValue({
        candidates: [],
        jobs: [],
        loading: { candidates: false, jobs: true },
        error: { candidates: null, jobs: null },
        deleteCandidate: vi.fn()
      })
      
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('Loading candidate details...')).toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('shows error message when fetch fails', () => {
      mockUseData.mockReturnValue({
        candidates: [],
        jobs: [],
        loading: { candidates: false, jobs: false },
        error: { candidates: 'Network error', jobs: null },
        deleteCandidate: vi.fn()
      })
      
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('Failed to load candidate')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    it('renders "Back to candidates" link on error', () => {
      mockUseData.mockReturnValue({
        candidates: [],
        jobs: [],
        loading: { candidates: false, jobs: false },
        error: { candidates: 'Failed to fetch', jobs: null },
        deleteCandidate: vi.fn()
      })
      
      renderWithAllProviders(<CandidateDetail />)
      
      const backLink = screen.getByText('Back to candidates')
      expect(backLink).toBeInTheDocument()
      expect(backLink.closest('a')).toHaveAttribute('href', '/candidates')
    })
  })

  describe('Not Found State', () => {
    it('shows not found message when candidate does not exist', () => {
      mockUseParams.mockReturnValue({ id: 'non-existent-id' })
      
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('Candidate not found')).toBeInTheDocument()
      expect(screen.getByText("The candidate you're looking for doesn't exist")).toBeInTheDocument()
    })

    it('renders "Back to candidates" link when not found', () => {
      mockUseParams.mockReturnValue({ id: 'non-existent-id' })
      
      renderWithAllProviders(<CandidateDetail />)
      
      const backLink = screen.getByText('Back to candidates')
      expect(backLink).toBeInTheDocument()
      expect(backLink.closest('a')).toHaveAttribute('href', '/candidates')
    })
  })

  describe('Edit Functionality', () => {
    it('opens edit form when Edit button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const editButton = screen.getAllByText('Edit')[0]
      await user.click(editButton)
      
      expect(screen.getByTestId('candidate-edit-form')).toBeInTheDocument()
      expect(screen.getByText('Editing: John Doe')).toBeInTheDocument()
    })

    it('edit form is hidden by default', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.queryByTestId('candidate-edit-form')).not.toBeInTheDocument()
    })
  })

  describe('Delete Functionality', () => {
    it('opens confirmation modal when Delete button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const deleteButton = screen.getAllByText(/Delete/)[0]
      await user.click(deleteButton)
      
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument()
      expect(screen.getByText('Delete candidate')).toBeInTheDocument()
      expect(screen.getByText(/Delete John Doe/)).toBeInTheDocument()
    })

    it('calls deleteCandidate and navigates when confirmed', async () => {
      const mockDeleteCandidate = vi.fn()
      mockUseData.mockReturnValue({
        candidates: [mockCandidate],
        jobs: [mockJob],
        loading: { candidates: false, jobs: false },
        error: { candidates: null, jobs: null },
        deleteCandidate: mockDeleteCandidate
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const deleteButton = screen.getAllByText(/Delete/)[0]
      await user.click(deleteButton)
      
      const confirmButton = screen.getByTestId('confirm-button')
      await user.click(confirmButton)
      
      expect(mockDeleteCandidate).toHaveBeenCalledWith('candidate-1', expect.any(Object))
      expect(mockNavigate).toHaveBeenCalledWith('/candidates')
    })

    it('closes modal when cancel is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<CandidateDetail />)
      
      const deleteButton = screen.getAllByText(/Delete/)[0]
      await user.click(deleteButton)
      
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument()
      
      const cancelButton = screen.getByTestId('cancel-button')
      await user.click(cancelButton)
      
      await waitFor(() => {
        expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument()
      })
    })

    it('confirmation modal is hidden by default', () => {
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument()
    })
  })

  describe('Data Handling', () => {
    it('matches candidate by string ID comparison', () => {
      mockUseParams.mockReturnValue({ id: 'candidate-1' })
      
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('constructs name from firstName and lastName when name is missing', () => {
      const candidateWithoutName = createMockCandidate({
        id: 'candidate-2',
        name: '',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com'
      })
      
      mockUseParams.mockReturnValue({ id: 'candidate-2' })
      mockUseData.mockReturnValue({
        candidates: [candidateWithoutName],
        jobs: [mockJob],
        loading: { candidates: false, jobs: false },
        error: { candidates: null, jobs: null },
        deleteCandidate: vi.fn()
      })
      
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('JS')).toBeInTheDocument()
    })

    it('displays "Unknown" when no name is available', () => {
      const candidateWithoutName = createMockCandidate({
        id: 'candidate-2',
        name: '',
        firstName: '',
        lastName: '',
        email: 'unknown@example.com'
      })
      
      mockUseParams.mockReturnValue({ id: 'candidate-2' })
      mockUseData.mockReturnValue({
        candidates: [candidateWithoutName],
        jobs: [mockJob],
        loading: { candidates: false, jobs: false },
        error: { candidates: null, jobs: null },
        deleteCandidate: vi.fn()
      })
      
      renderWithAllProviders(<CandidateDetail />)
      
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('handles missing resume URL gracefully', () => {
      const candidateWithoutResume = createMockCandidate({
        id: 'candidate-2',
        name: 'Test User',
        resume: ''
      })
      
      mockUseParams.mockReturnValue({ id: 'candidate-2' })
      mockUseData.mockReturnValue({
        candidates: [candidateWithoutResume],
        jobs: [mockJob],
        loading: { candidates: false, jobs: false },
        error: { candidates: null, jobs: null },
        deleteCandidate: vi.fn()
      })
      
      renderWithAllProviders(<CandidateDetail />)
      
      const resumeLink = screen.getByText('View Resume').closest('a')
      expect(resumeLink).toHaveAttribute('href', '#')
    })
  })

  describe('UI Elements', () => {
    it('renders correct icons for error state', () => {
      mockUseData.mockReturnValue({
        candidates: [],
        jobs: [],
        loading: { candidates: false, jobs: false },
        error: { candidates: 'Error', jobs: null },
        deleteCandidate: vi.fn()
      })
      
      const { container } = renderWithAllProviders(<CandidateDetail />)
      
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders correct icons for not found state', () => {
      mockUseParams.mockReturnValue({ id: 'non-existent' })
      
      const { container } = renderWithAllProviders(<CandidateDetail />)
      
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })
})
