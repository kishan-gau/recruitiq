import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupContextMocks, resetContextMocks } from '../test/testSetup'
import { renderWithAllProviders, createMockCandidate, createMockJob } from '../test/testHelpers'

// Setup context mocks first
setupContextMocks()

// Mock the hooks
vi.mock('../hooks/useCandidates', () => ({
  useCandidates: vi.fn()
}))

vi.mock('../hooks/useJobs', () => ({
  useJobs: vi.fn()
}))

// Mock child components
vi.mock('../components/CandidateFlowProgress', () => {
  const React = require('react')
  return {
    default: (props) => React.createElement('div', { 'data-testid': 'candidate-flow-progress' }, 
      `Flow Progress: Candidate ${props.candidateId}, Job ${props.jobId}`
    )
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

import Pipeline from './Pipeline'
import { useCandidates } from '../hooks/useCandidates'
import { useJobs } from '../hooks/useJobs'
import { useFlow } from '../context/FlowContext'

describe('Pipeline Page', () => {
  let mockUseCandidates
  let mockUseJobs
  let mockUseFlow
  let mockMoveCandidate
  let mockRefetch
  let mockEnsureLoaded

  // Mock flow template
  const mockFlowTemplate = {
    id: 'template-1',
    name: 'Standard Hiring Flow',
    stages: [
      { name: 'Applied', type: 'screening', order: 0 },
      { name: 'Phone Screen', type: 'screening', order: 1 },
      { name: 'Interview', type: 'interview', order: 2 },
      { name: 'Technical Assessment', type: 'assessment', order: 3 },
      { name: 'Offer', type: 'offer', order: 4 }
    ]
  }

  // Mock candidates at different stages
  const mockCandidates = [
    createMockCandidate({
      id: 1,
      name: 'Alice Johnson',
      title: 'Software Engineer',
      stage: 'Applied',
      jobId: 'job-1',
      application_source: 'linkedin'
    }),
    createMockCandidate({
      id: 2,
      name: 'Bob Smith',
      title: 'Product Manager',
      stage: 'Phone Screen',
      jobId: 'job-1',
      application_source: 'referral'
    }),
    createMockCandidate({
      id: 3,
      name: 'Carol Williams',
      title: 'Designer',
      stage: 'Interview',
      jobId: 'job-1',
      application_source: 'website'
    }),
    createMockCandidate({
      id: 4,
      name: 'David Brown',
      title: 'Data Analyst',
      stage: 'Technical Assessment',
      jobId: 'job-1'
    }),
    createMockCandidate({
      id: 5,
      name: 'Eve Davis',
      title: 'Marketing Manager',
      stage: 'Offer',
      jobId: 'job-1'
    })
  ]

  const mockJob = createMockJob({
    id: 'job-1',
    title: 'Senior Engineer',
    flowTemplateId: 'template-1'
  })

  beforeEach(async () => {
    resetContextMocks()
    
    const candidatesModule = await import('../hooks/useCandidates')
    const jobsModule = await import('../hooks/useJobs')
    const flowModule = await import('../context/FlowContext')
    
    mockUseCandidates = candidatesModule.useCandidates
    mockUseJobs = jobsModule.useJobs
    mockUseFlow = flowModule.useFlow
    
    mockMoveCandidate = vi.fn()
    mockRefetch = vi.fn()
    mockEnsureLoaded = vi.fn()
    
    // Default mock implementations
    mockUseCandidates.mockReturnValue({
      candidates: mockCandidates,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      moveCandidate: mockMoveCandidate
    })
    
    mockUseJobs.mockReturnValue({
      jobs: [mockJob],
      isLoading: false,
      error: null
    })
    
    mockUseFlow.mockReturnValue({
      flowTemplates: [mockFlowTemplate],
      isLoading: false,
      error: null,
      ensureLoaded: mockEnsureLoaded
    })
  })

  describe('Page Rendering', () => {
    it('renders pipeline page with title', () => {
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('Pipeline')).toBeInTheDocument()
      expect(screen.getByText('Drag & drop candidates between stages')).toBeInTheDocument()
    })

    it('renders drag instruction hint', () => {
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('Drag cards to move candidates')).toBeInTheDocument()
    })

    it('calls ensureLoaded on mount', () => {
      renderWithAllProviders(<Pipeline />)
      
      expect(mockEnsureLoaded).toHaveBeenCalled()
    })

    it('renders all stage columns from flow template', () => {
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('Applied')).toBeInTheDocument()
      expect(screen.getByText('Phone Screen')).toBeInTheDocument()
      expect(screen.getByText('Interview')).toBeInTheDocument()
      expect(screen.getByText('Technical Assessment')).toBeInTheDocument()
      expect(screen.getByText('Offer')).toBeInTheDocument()
    })

    it('displays candidate count for each stage', () => {
      renderWithAllProviders(<Pipeline />)
      
      // Each stage should show count (1 candidate per stage in mock data)
      const countBadges = screen.getAllByText('1')
      expect(countBadges.length).toBeGreaterThan(0)
    })
  })

  describe('Candidate Cards', () => {
    it('displays candidate cards in correct stages', () => {
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
      expect(screen.getByText('Carol Williams')).toBeInTheDocument()
      expect(screen.getByText('David Brown')).toBeInTheDocument()
      expect(screen.getByText('Eve Davis')).toBeInTheDocument()
    })

    it('displays candidate titles', () => {
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
      expect(screen.getByText('Designer')).toBeInTheDocument()
    })

    it('displays candidate avatars with initials', () => {
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('AJ')).toBeInTheDocument() // Alice Johnson
      expect(screen.getByText('BS')).toBeInTheDocument() // Bob Smith
      expect(screen.getByText('CW')).toBeInTheDocument() // Carol Williams
      expect(screen.getByText('DB')).toBeInTheDocument() // David Brown
      expect(screen.getByText('ED')).toBeInTheDocument() // Eve Davis
    })

    it('displays application source badges', () => {
      renderWithAllProviders(<Pipeline />)
      
      const sourceBadges = screen.getAllByTestId('application-source-badge')
      expect(sourceBadges.length).toBeGreaterThan(0)
      expect(screen.getByText('linkedin')).toBeInTheDocument()
      expect(screen.getByText('referral')).toBeInTheDocument()
      expect(screen.getByText('website')).toBeInTheDocument()
    })

    it('displays flow progress for candidates with jobId', () => {
      renderWithAllProviders(<Pipeline />)
      
      const progressComponents = screen.getAllByTestId('candidate-flow-progress')
      expect(progressComponents.length).toBe(5) // All candidates have jobId
    })

    it('renders Prev and Next buttons for each candidate', () => {
      renderWithAllProviders(<Pipeline />)
      
      const prevButtons = screen.getAllByText(/← Prev/)
      const nextButtons = screen.getAllByText(/Next →/)
      
      expect(prevButtons.length).toBe(5)
      expect(nextButtons.length).toBe(5)
    })
  })

  describe('Stage Navigation - Prev/Next Buttons', () => {
    it('disables Prev button for candidates in first stage', () => {
      renderWithAllProviders(<Pipeline />)
      
      const prevButtons = screen.getAllByText(/← Prev/)
      // Alice is in "Applied" (first stage), her Prev button should be disabled
      expect(prevButtons[0]).toBeDisabled()
    })

    it('disables Next button for candidates in last stage', () => {
      renderWithAllProviders(<Pipeline />)
      
      const nextButtons = screen.getAllByText(/Next →/)
      // Eve is in "Offer" (last stage), her Next button should be disabled
      expect(nextButtons[nextButtons.length - 1]).toBeDisabled()
    })

    it('enables Prev button for candidates not in first stage', () => {
      renderWithAllProviders(<Pipeline />)
      
      const prevButtons = screen.getAllByText(/← Prev/)
      // Bob is in "Phone Screen" (not first), his Prev button should be enabled
      expect(prevButtons[1]).not.toBeDisabled()
    })

    it('enables Next button for candidates not in last stage', () => {
      renderWithAllProviders(<Pipeline />)
      
      const nextButtons = screen.getAllByText(/Next →/)
      // Alice is in "Applied" (not last), her Next button should be enabled
      expect(nextButtons[0]).not.toBeDisabled()
    })

    it('calls moveCandidate when Next button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<Pipeline />)
      
      const nextButtons = screen.getAllByText(/Next →/)
      // Click Next for Alice (in Applied, should move to Phone Screen)
      await user.click(nextButtons[0])
      
      expect(mockMoveCandidate).toHaveBeenCalledWith(1, 'Phone Screen', expect.any(Object))
    })

    it('calls moveCandidate when Prev button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<Pipeline />)
      
      const prevButtons = screen.getAllByText(/← Prev/)
      // Click Prev for Bob (in Phone Screen, should move to Applied)
      await user.click(prevButtons[1])
      
      expect(mockMoveCandidate).toHaveBeenCalledWith(2, 'Applied', expect.any(Object))
    })
  })

  describe('Empty States', () => {
    it('shows "No candidates" message in empty stages', () => {
      // Create a scenario with one stage having no candidates
      const candidatesInOneStage = [
        createMockCandidate({ id: 1, name: 'Test User', stage: 'Applied', jobId: 'job-1' })
      ]
      
      mockUseCandidates.mockReturnValue({
        candidates: candidatesInOneStage,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        moveCandidate: mockMoveCandidate
      })
      
      renderWithAllProviders(<Pipeline />)
      
      // Other stages should show "No candidates"
      const emptyMessages = screen.getAllByText('No candidates')
      expect(emptyMessages.length).toBeGreaterThan(0)
    })

    it('shows "No stages available" when no flow templates exist', () => {
      mockUseFlow.mockReturnValue({
        flowTemplates: [],
        isLoading: false,
        error: null,
        ensureLoaded: mockEnsureLoaded
      })
      
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('No stages available')).toBeInTheDocument()
      expect(screen.getByText(/Create flow templates in Workspace Settings/)).toBeInTheDocument()
    })

    it('shows empty state when jobs have no flowTemplateId', () => {
      mockUseJobs.mockReturnValue({
        jobs: [{ ...mockJob, flowTemplateId: null }],
        isLoading: false,
        error: null
      })
      
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('No stages available')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner when candidates are loading', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        isLoading: true,
        error: null,
        refetch: mockRefetch,
        moveCandidate: mockMoveCandidate
      })
      
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByText('Loading pipeline...')).toBeInTheDocument()
    })

    it('shows loading spinner when jobs are loading', () => {
      mockUseJobs.mockReturnValue({
        jobs: [],
        isLoading: true,
        error: null
      })
      
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('Loading pipeline...')).toBeInTheDocument()
    })

    it('shows loading spinner when flow templates are loading', () => {
      mockUseFlow.mockReturnValue({
        flowTemplates: [],
        isLoading: true,
        error: null,
        ensureLoaded: mockEnsureLoaded
      })
      
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('Loading pipeline...')).toBeInTheDocument()
    })

    it('hides stage content during loading', () => {
      mockUseCandidates.mockReturnValue({
        candidates: mockCandidates,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
        moveCandidate: mockMoveCandidate
      })
      
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('shows error message when candidates fail to load', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        isLoading: false,
        error: 'Failed to fetch candidates',
        refetch: mockRefetch,
        moveCandidate: mockMoveCandidate
      })
      
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('Failed to load pipeline')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch candidates')).toBeInTheDocument()
    })

    it('renders Try again button on error', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        isLoading: false,
        error: 'Network error',
        refetch: mockRefetch,
        moveCandidate: mockMoveCandidate
      })
      
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('Try again')).toBeInTheDocument()
    })

    it('calls refetch when Try again button is clicked', async () => {
      const user = userEvent.setup()
      mockUseCandidates.mockReturnValue({
        candidates: [],
        isLoading: false,
        error: 'Connection timeout',
        refetch: mockRefetch,
        moveCandidate: mockMoveCandidate
      })
      
      renderWithAllProviders(<Pipeline />)
      
      const retryButton = screen.getByText('Try again')
      await user.click(retryButton)
      
      expect(mockRefetch).toHaveBeenCalled()
    })

    it('hides pipeline content when error occurs', () => {
      mockUseCandidates.mockReturnValue({
        candidates: mockCandidates,
        isLoading: false,
        error: 'Error occurred',
        refetch: mockRefetch,
        moveCandidate: mockMoveCandidate
      })
      
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()
      expect(screen.queryByText('Applied')).not.toBeInTheDocument()
    })
  })

  describe('Drag and Drop', () => {
    it('sets dragging state when drag starts', () => {
      renderWithAllProviders(<Pipeline />)
      
      const candidateCard = screen.getByText('Alice Johnson').closest('div[draggable="true"]')
      expect(candidateCard).toBeInTheDocument()
      expect(candidateCard).toHaveAttribute('draggable', 'true')
    })

    it('candidate cards are draggable', () => {
      renderWithAllProviders(<Pipeline />)
      
      const aliceCard = screen.getByText('Alice Johnson').closest('div[draggable="true"]')
      const bobCard = screen.getByText('Bob Smith').closest('div[draggable="true"]')
      
      expect(aliceCard).toHaveAttribute('draggable', 'true')
      expect(bobCard).toHaveAttribute('draggable', 'true')
    })

    it('applies hover styles to candidate cards', () => {
      renderWithAllProviders(<Pipeline />)
      
      const aliceCard = screen.getByText('Alice Johnson').closest('div[draggable="true"]')
      expect(aliceCard).toHaveClass('cursor-grab')
      expect(aliceCard).toHaveClass('active:cursor-grabbing')
    })
  })

  describe('Stage Colors', () => {
    it('applies screening color to screening stages', () => {
      const { container } = renderWithAllProviders(<Pipeline />)
      // Applied and Phone Screen are screening stages
      // Check that screening color classes are present
      expect(container.querySelector('.bg-blue-50')).toBeTruthy()
    })

    it('applies interview color to interview stages', () => {
      const { container } = renderWithAllProviders(<Pipeline />)
      // Interview stage should have purple colors
      expect(container.querySelector('.bg-purple-50')).toBeTruthy()
    })

    it('applies assessment color to assessment stages', () => {
      const { container } = renderWithAllProviders(<Pipeline />)
      // Technical Assessment should have amber colors
      expect(container.querySelector('.bg-amber-50')).toBeTruthy()
    })

    it('applies offer color to offer stages', () => {
      const { container } = renderWithAllProviders(<Pipeline />)
      // Offer stage should have emerald colors
      expect(container.querySelector('.bg-emerald-50')).toBeTruthy()
    })
  })

  describe('Multiple Jobs and Templates', () => {
    it('handles multiple jobs with same template', () => {
      const job2 = createMockJob({
        id: 'job-2',
        title: 'Senior Designer',
        flowTemplateId: 'template-1'
      })
      
      mockUseJobs.mockReturnValue({
        jobs: [mockJob, job2],
        isLoading: false,
        error: null
      })
      
      renderWithAllProviders(<Pipeline />)
      
      // Should still render all stages correctly
      expect(screen.getByText('Applied')).toBeInTheDocument()
      expect(screen.getByText('Offer')).toBeInTheDocument()
    })

    it('handles jobs with different templates', () => {
      const template2 = {
        id: 'template-2',
        name: 'Fast Track',
        stages: [
          { name: 'Applied', type: 'screening', order: 0 },
          { name: 'Final Interview', type: 'interview', order: 1 },
          { name: 'Offer', type: 'offer', order: 2 }
        ]
      }
      
      const job2 = createMockJob({
        id: 'job-2',
        title: 'Intern',
        flowTemplateId: 'template-2'
      })
      
      mockUseJobs.mockReturnValue({
        jobs: [mockJob, job2],
        isLoading: false,
        error: null
      })
      
      mockUseFlow.mockReturnValue({
        flowTemplates: [mockFlowTemplate, template2],
        isLoading: false,
        error: null,
        ensureLoaded: mockEnsureLoaded
      })
      
      renderWithAllProviders(<Pipeline />)
      
      // Should render unique stages from both templates
      expect(screen.getByText('Applied')).toBeInTheDocument()
      expect(screen.getByText('Final Interview')).toBeInTheDocument()
    })
  })

  describe('Data Integration', () => {
    it('filters candidates by stage correctly', () => {
      renderWithAllProviders(<Pipeline />)
      
      // Each candidate should appear in their respective stage
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
      
      // Count should be 1 for each stage (since each has 1 candidate)
      const counts = screen.getAllByText('1')
      expect(counts.length).toBeGreaterThanOrEqual(5)
    })

    it('handles candidates without application_source', () => {
      const candidateNoSource = createMockCandidate({
        id: 6,
        name: 'Frank Miller',
        stage: 'Applied',
        jobId: 'job-1',
        application_source: null
      })
      
      mockUseCandidates.mockReturnValue({
        candidates: [candidateNoSource],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        moveCandidate: mockMoveCandidate
      })
      
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('Frank Miller')).toBeInTheDocument()
    })

    it('handles candidates without jobId gracefully', () => {
      const candidateNoJob = createMockCandidate({
        id: 7,
        name: 'Grace Lee',
        stage: 'Applied',
        jobId: null
      })
      
      mockUseCandidates.mockReturnValue({
        candidates: [candidateNoJob],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
        moveCandidate: mockMoveCandidate
      })
      
      renderWithAllProviders(<Pipeline />)
      
      expect(screen.getByText('Grace Lee')).toBeInTheDocument()
      // Should not render flow progress without jobId
      expect(screen.queryByTestId('candidate-flow-progress')).not.toBeInTheDocument()
    })
  })

  describe('UI Elements', () => {
    it('renders correct icons for loading state', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        isLoading: true,
        error: null,
        refetch: mockRefetch,
        moveCandidate: mockMoveCandidate
      })
      
      const { container } = renderWithAllProviders(<Pipeline />)
      
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('renders correct icons for error state', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        isLoading: false,
        error: 'Error',
        refetch: mockRefetch,
        moveCandidate: mockMoveCandidate
      })
      
      const { container } = renderWithAllProviders(<Pipeline />)
      
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders info icon for drag instruction', () => {
      const { container } = renderWithAllProviders(<Pipeline />)
      
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })
  })
})
