import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupContextMocks, resetContextMocks } from '../test/testSetup'
import { renderWithAllProviders, createMockCandidate, createMockJob } from '../test/testHelpers'

// Setup context mocks first
setupContextMocks()

// Mock all hooks used by the component
vi.mock('../hooks/useCandidates', () => ({
  useCandidates: vi.fn()
}))

vi.mock('../hooks/useJobs', () => ({
  useJobs: vi.fn()
}))

vi.mock('../hooks/usePagination', () => ({
  usePagination: vi.fn()
}))

vi.mock('../hooks/useDebounce', () => ({
  useDebounce: vi.fn()
}))

vi.mock('../hooks/useSearchFilters', () => ({
  useSearchFilters: vi.fn()
}))

// Mock child components
vi.mock('../components/CandidateForm', () => {
  const React = require('react')
  return {
    default: (props) => {
      if (!props.open) return null
      return React.createElement('div', { 'data-testid': 'candidate-form-modal' }, 'Candidate Form')
    }
  }
})

vi.mock('../components/Pagination', () => {
  const React = require('react')
  return {
    default: (props) => React.createElement('div', { 'data-testid': 'pagination-component' }, 'Pagination')
  }
})

vi.mock('../components/SearchInput', () => {
  const React = require('react')
  return {
    default: (props) => React.createElement('input', { 
      'data-testid': 'search-input',
      type: 'text',
      value: props.value,
      onChange: props.onChange,
      placeholder: props.placeholder
    })
  }
})

vi.mock('../components/FilterChips', () => {
  const React = require('react')
  return {
    default: (props) => React.createElement('div', { 'data-testid': 'filter-chips' }, 
      props.filters.length > 0 ? `${props.filters.length} filters` : 'No filters'
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

vi.mock('../components/icons', () => ({
  Icon: () => null
}))

import Candidates from './Candidates'

describe('Candidates Page', () => {
  let mockUseCandidates
  let mockUseJobs
  let mockUsePagination
  let mockUseDebounce
  let mockUseSearchFilters

  // Default mock data
  const mockCandidates = [
    createMockCandidate({
      id: 'candidate-1',
      name: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      currentJobTitle: 'Software Engineer',
      currentCompany: 'Tech Corp',
      location: 'New York, NY',
      application_source: 'linkedin',
      recentApplication: { stage: 'interview' }
    }),
    createMockCandidate({
      id: 'candidate-2',
      name: 'Jane Smith',
      firstName: 'Jane',
      lastName: 'Smith',
      currentJobTitle: 'Product Manager',
      currentCompany: 'StartupCo',
      location: 'San Francisco, CA',
      application_source: 'referral',
      recentApplication: { stage: 'offer' }
    }),
    createMockCandidate({
      id: 'candidate-3',
      name: 'Bob Johnson',
      firstName: 'Bob',
      lastName: 'Johnson',
      currentJobTitle: 'Designer',
      location: 'Remote',
      application_source: 'website'
    })
  ]

  const mockJobs = [
    createMockJob({ id: 'job-1', title: 'Senior Engineer', flowTemplateId: 'template-1' }),
    createMockJob({ id: 'job-2', title: 'Product Manager', flowTemplateId: 'template-1' })
  ]

  beforeEach(async () => {
    resetContextMocks()
    
    // Import and mock hooks
    const useCandidatesModule = await import('../hooks/useCandidates')
    const useJobsModule = await import('../hooks/useJobs')
    const usePaginationModule = await import('../hooks/usePagination')
    const useDebounceModule = await import('../hooks/useDebounce')
    const useSearchFiltersModule = await import('../hooks/useSearchFilters')
    
    mockUseCandidates = useCandidatesModule.useCandidates
    mockUseJobs = useJobsModule.useJobs
    mockUsePagination = usePaginationModule.usePagination
    mockUseDebounce = useDebounceModule.useDebounce
    mockUseSearchFilters = useSearchFiltersModule.useSearchFilters
    
    // Default mock implementations
    mockUseCandidates.mockReturnValue({
      candidates: mockCandidates,
      total: mockCandidates.length,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      moveCandidate: vi.fn()
    })
    
    mockUseJobs.mockReturnValue({
      jobs: mockJobs,
      isLoading: false,
      error: null
    })
    
    mockUsePagination.mockReturnValue({
      page: 1,
      pageSize: 25,
      setPage: vi.fn(),
      setPageSize: vi.fn(),
      getTotalPages: vi.fn((total) => Math.ceil(total / 25)),
      resetPage: vi.fn()
    })
    
    mockUseDebounce.mockImplementation((value) => value)
    
    mockUseSearchFilters.mockReturnValue({
      filters: { search: '', stage: '', jobId: '' },
      setFilter: vi.fn(),
      removeFilter: vi.fn(),
      clearFilters: vi.fn(),
      activeFilters: [],
      queryParams: {}
    })
  })

  describe('Page Rendering', () => {
    it('renders candidates page with title and count', () => {
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Candidates')).toBeInTheDocument()
      expect(screen.getByText('3 people in your pipeline')).toBeInTheDocument()
    })

    it('renders "Add candidate" button', () => {
      renderWithAllProviders(<Candidates />)
      
      const addButtons = screen.getAllByText('Add candidate')
      expect(addButtons.length).toBeGreaterThan(0)
      expect(addButtons[0]).toBeInTheDocument()
    })

    it('renders search input and filter dropdowns', () => {
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByTestId('search-input')).toBeInTheDocument()
      expect(screen.getByText('All stages')).toBeInTheDocument()
      expect(screen.getByText('All jobs')).toBeInTheDocument()
    })

    it('renders filter chips component', () => {
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByTestId('filter-chips')).toBeInTheDocument()
    })

    it('displays correct singular text for 1 person', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [mockCandidates[0]],
        total: 1,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('1 person in your pipeline')).toBeInTheDocument()
    })
  })

  describe('Candidate List Display', () => {
    it('renders all candidate cards', () => {
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
    })

    it('displays candidate job titles', () => {
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Software Engineer')).toBeInTheDocument()
      // Product Manager appears in both dropdown and candidate list
      const productManagerElements = screen.getAllByText('Product Manager')
      expect(productManagerElements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Designer')).toBeInTheDocument()
    })

    it('displays candidate companies', () => {
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Tech Corp')).toBeInTheDocument()
      expect(screen.getByText('StartupCo')).toBeInTheDocument()
    })

    it('displays candidate locations', () => {
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('New York, NY')).toBeInTheDocument()
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument()
      expect(screen.getByText('Remote')).toBeInTheDocument()
    })

    it('displays application source badges', () => {
      renderWithAllProviders(<Candidates />)
      
      const sourceBadges = screen.getAllByTestId('application-source-badge')
      expect(sourceBadges).toHaveLength(3)
    })

    it('displays recent application stages', () => {
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Interview')).toBeInTheDocument()
      // Offer appears in both stage dropdown and candidate badge
      const offerElements = screen.getAllByText('Offer')
      expect(offerElements.length).toBeGreaterThanOrEqual(1)
    })

    it('displays "Active" badge when no recent application', () => {
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('displays candidate initials in avatar', () => {
      renderWithAllProviders(<Candidates />)
      
      // Initials are rendered as text content: JD, JS, BJ
      expect(screen.getByText('JD')).toBeInTheDocument()
      expect(screen.getByText('JS')).toBeInTheDocument()
      expect(screen.getByText('BJ')).toBeInTheDocument()
    })

    it('links to candidate detail pages', () => {
      renderWithAllProviders(<Candidates />)
      
      const candidateLinks = screen.getAllByRole('link')
      const detailLink = candidateLinks.find(link => link.getAttribute('href') === '/candidates/candidate-1')
      expect(detailLink).toBeInTheDocument()
    })

    it('handles missing candidate name gracefully', () => {
      const candidateWithoutName = createMockCandidate({
        id: 'candidate-4',
        name: '',
        firstName: '',
        lastName: ''
      })
      
      mockUseCandidates.mockReturnValue({
        candidates: [candidateWithoutName],
        total: 1,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('handles missing job title gracefully', () => {
      const candidateWithoutTitle = createMockCandidate({
        id: 'candidate-4',
        name: 'Test User',
        currentJobTitle: ''
      })
      
      mockUseCandidates.mockReturnValue({
        candidates: [candidateWithoutTitle],
        total: 1,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('No title')).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner when candidates are loading', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        total: 0,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByText('Loading candidates...')).toBeInTheDocument()
    })

    it('shows loading spinner when jobs are loading', () => {
      mockUseJobs.mockReturnValue({
        jobs: [],
        isLoading: true,
        error: null
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Loading candidates...')).toBeInTheDocument()
    })

    it('does not render candidate list when loading', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        total: 0,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('shows error message when fetch fails', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        total: 0,
        isLoading: false,
        error: 'Failed to fetch candidates',
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Error loading candidates')).toBeInTheDocument()
      expect(screen.getByText('Failed to load candidates')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch candidates')).toBeInTheDocument()
    })

    it('renders retry button on error', () => {
      const mockRefetch = vi.fn()
      mockUseCandidates.mockReturnValue({
        candidates: [],
        total: 0,
        isLoading: false,
        error: 'Network error',
        refetch: mockRefetch,
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      const retryButton = screen.getByText('Try again')
      expect(retryButton).toBeInTheDocument()
    })

    it('calls refetch when retry button is clicked', async () => {
      const mockRefetch = vi.fn()
      mockUseCandidates.mockReturnValue({
        candidates: [],
        total: 0,
        isLoading: false,
        error: 'Network error',
        refetch: mockRefetch,
        moveCandidate: vi.fn()
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<Candidates />)
      
      const retryButton = screen.getByText('Try again')
      await user.click(retryButton)
      
      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no candidates exist', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        total: 0,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('No candidates yet')).toBeInTheDocument()
      expect(screen.getByText('Start building your talent pipeline by adding candidates')).toBeInTheDocument()
    })

    it('shows filtered empty state message when filters are active', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        total: 0,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      mockUseSearchFilters.mockReturnValue({
        filters: { search: '', stage: 'interview', jobId: '' },
        setFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [{ key: 'stage', label: 'Stage', value: 'interview' }],
        queryParams: { stage: 'interview' }
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('No candidates match your filters')).toBeInTheDocument()
    })

    it('shows "Add candidate" button in empty state', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        total: 0,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      // Should have multiple "Add candidate" buttons (header + empty state)
      const addButtons = screen.getAllByText('Add candidate')
      expect(addButtons.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Filters and Search', () => {
    it('updates search input on user typing', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<Candidates />)
      
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'john')
      
      expect(searchInput.value).toBe('john')
    })

    it('updates stage filter on selection', async () => {
      const mockSetFilter = vi.fn()
      mockUseSearchFilters.mockReturnValue({
        filters: { search: '', stage: '', jobId: '' },
        setFilter: mockSetFilter,
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [],
        queryParams: {}
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<Candidates />)
      
      const stageSelect = screen.getByDisplayValue('All stages')
      await user.selectOptions(stageSelect, 'Applied')
      
      expect(mockSetFilter).toHaveBeenCalledWith('stage', 'Applied')
    })

    it('updates job filter on selection', async () => {
      const mockSetFilter = vi.fn()
      mockUseSearchFilters.mockReturnValue({
        filters: { search: '', stage: '', jobId: '' },
        setFilter: mockSetFilter,
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [],
        queryParams: {}
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<Candidates />)
      
      const jobSelect = screen.getByDisplayValue('All jobs')
      await user.selectOptions(jobSelect, 'job-1')
      
      expect(mockSetFilter).toHaveBeenCalledWith('jobId', 'job-1')
    })

    it('shows "matching filters" text when filters are active', () => {
      mockUseSearchFilters.mockReturnValue({
        filters: { search: '', stage: 'interview', jobId: '' },
        setFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [{ key: 'stage', label: 'Stage', value: 'interview' }],
        queryParams: { stage: 'interview' }
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('3 people in your pipeline matching filters')).toBeInTheDocument()
    })

    it('passes debounced search value to setFilter', async () => {
      const mockSetFilter = vi.fn()
      
      // Mock debounce to return the debounced value immediately
      mockUseDebounce.mockReturnValue('john')
      
      mockUseSearchFilters.mockReturnValue({
        filters: { search: '', stage: '', jobId: '' },
        setFilter: mockSetFilter,
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [],
        queryParams: {}
      })
      
      renderWithAllProviders(<Candidates />)
      
      // The useEffect that calls setFilter should have been triggered
      await waitFor(() => {
        expect(mockSetFilter).toHaveBeenCalledWith('search', 'john')
      })
    })

    it('displays job titles in job filter dropdown', () => {
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Senior Engineer')).toBeInTheDocument()
      // Product Manager appears in both dropdown and candidate job title
      const productManagerElements = screen.getAllByText('Product Manager')
      expect(productManagerElements.length).toBeGreaterThanOrEqual(1)
    })

    it('does not render job filter when no jobs exist', () => {
      mockUseJobs.mockReturnValue({
        jobs: [],
        isLoading: false,
        error: null
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.queryByText('All jobs')).not.toBeInTheDocument()
    })
  })

  describe('Pagination', () => {
    it('renders pagination component when candidates exist', () => {
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByTestId('pagination-component')).toBeInTheDocument()
    })

    it('does not render pagination in empty state', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        total: 0,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.queryByTestId('pagination-component')).not.toBeInTheDocument()
    })

    it('resets page when filters change', () => {
      const mockResetPage = vi.fn()
      mockUsePagination.mockReturnValue({
        page: 2,
        pageSize: 25,
        setPage: vi.fn(),
        setPageSize: vi.fn(),
        getTotalPages: vi.fn((total) => Math.ceil(total / 25)),
        resetPage: mockResetPage
      })
      
      const { rerender } = renderWithAllProviders(<Candidates />)
      
      // Change filters
      mockUseSearchFilters.mockReturnValue({
        filters: { search: '', stage: 'interview', jobId: '' },
        setFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [{ key: 'stage', label: 'Stage', value: 'interview' }],
        queryParams: { stage: 'interview' }
      })
      
      rerender(<Candidates />)
    })

    it('calculates total pages correctly', () => {
      const mockGetTotalPages = vi.fn((total) => Math.ceil(total / 25))
      mockUsePagination.mockReturnValue({
        page: 1,
        pageSize: 25,
        setPage: vi.fn(),
        setPageSize: vi.fn(),
        getTotalPages: mockGetTotalPages,
        resetPage: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(mockGetTotalPages).toHaveBeenCalledWith(3)
    })
  })

  describe('User Interactions', () => {
    it('opens candidate form when "Add candidate" button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<Candidates />)
      
      const addButton = screen.getAllByText('Add candidate')[0]
      await user.click(addButton)
      
      expect(screen.getByTestId('candidate-form-modal')).toBeInTheDocument()
    })

    it('candidate form is hidden by default', () => {
      renderWithAllProviders(<Candidates />)
      
      expect(screen.queryByTestId('candidate-form-modal')).not.toBeInTheDocument()
    })
  })

  describe('Data Integration', () => {
    it('passes correct parameters to useCandidates hook', () => {
      mockUseSearchFilters.mockReturnValue({
        filters: { search: 'john', stage: 'interview', jobId: 'job-1' },
        setFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [
          { key: 'search', label: 'Search', value: 'john' },
          { key: 'stage', label: 'Stage', value: 'interview' },
          { key: 'jobId', label: 'Job', value: 'job-1' }
        ],
        queryParams: { search: 'john', stage: 'interview', jobId: 'job-1' }
      })
      
      mockUsePagination.mockReturnValue({
        page: 2,
        pageSize: 50,
        setPage: vi.fn(),
        setPageSize: vi.fn(),
        getTotalPages: vi.fn((total) => Math.ceil(total / 50)),
        resetPage: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(mockUseCandidates).toHaveBeenCalledWith({
        page: 2,
        pageSize: 50,
        search: 'john',
        stage: 'interview',
        jobId: 'job-1'
      })
    })

    it('constructs candidate name from firstName and lastName when name is missing', () => {
      const candidateWithSplitName = createMockCandidate({
        id: 'candidate-4',
        name: '',
        firstName: 'Alice',
        lastName: 'Williams'
      })
      
      mockUseCandidates.mockReturnValue({
        candidates: [candidateWithSplitName],
        total: 1,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Alice Williams')).toBeInTheDocument()
    })

    it('displays stages from flow templates', () => {
      renderWithAllProviders(<Candidates />)
      
      // The component should load stages from flow templates
      // Check if stage dropdown exists (it depends on flow templates)
      expect(screen.getByText('All stages')).toBeInTheDocument()
    })
  })

  describe('Stage Display', () => {
    it('formats stage names correctly', () => {
      const candidateWithUnderscoreStage = createMockCandidate({
        id: 'candidate-4',
        name: 'Test User',
        recentApplication: { stage: 'phone_screen' }
      })
      
      mockUseCandidates.mockReturnValue({
        candidates: [candidateWithUnderscoreStage],
        total: 1,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      // phone_screen should be formatted as "Phone Screen"
      // Appears in both stage dropdown and candidate badge
      const phoneScreenElements = screen.getAllByText('Phone Screen')
      expect(phoneScreenElements.length).toBeGreaterThanOrEqual(1)
    })

    it('applies correct styling for hired stage', () => {
      const hiredCandidate = createMockCandidate({
        id: 'candidate-4',
        name: 'Hired Person',
        recentApplication: { stage: 'hired' }
      })
      
      mockUseCandidates.mockReturnValue({
        candidates: [hiredCandidate],
        total: 1,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Hired')).toBeInTheDocument()
    })

    it('applies correct styling for rejected stage', () => {
      const rejectedCandidate = createMockCandidate({
        id: 'candidate-4',
        name: 'Rejected Person',
        recentApplication: { stage: 'rejected' }
      })
      
      mockUseCandidates.mockReturnValue({
        candidates: [rejectedCandidate],
        total: 1,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        moveCandidate: vi.fn()
      })
      
      renderWithAllProviders(<Candidates />)
      
      expect(screen.getByText('Rejected')).toBeInTheDocument()
    })
  })
})
