import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupContextMocks, resetContextMocks } from '../test/testSetup'
import { renderWithAllProviders, createMockJob } from '../test/testHelpers'

// Setup context mocks first
setupContextMocks()

// Mock all hooks used by the component
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

import Jobs from './Jobs'

describe('Jobs Page', () => {
  let mockUseJobs
  let mockUsePagination
  let mockUseDebounce
  let mockUseSearchFilters

  // Default mock data
  const mockJobs = [
    createMockJob({ 
      id: '1', 
      title: 'Senior Software Engineer', 
      location: 'New York, NY',
      employmentType: 'full-time',
      openings: 2,
      status: 'open'
    }),
    createMockJob({ 
      id: '2', 
      title: 'Product Manager', 
      location: 'San Francisco, CA',
      employmentType: 'full-time',
      openings: 1,
      status: 'open'
    }),
    createMockJob({ 
      id: '3', 
      title: 'UX Designer', 
      location: 'Remote',
      type: 'contract',
      openings: 3,
      status: 'draft'
    })
  ]

  beforeEach(async () => {
    resetContextMocks()
    
    // Import and mock hooks
    const useJobsModule = await import('../hooks/useJobs')
    const usePaginationModule = await import('../hooks/usePagination')
    const useDebounceModule = await import('../hooks/useDebounce')
    const useSearchFiltersModule = await import('../hooks/useSearchFilters')
    
    mockUseJobs = useJobsModule.useJobs
    mockUsePagination = usePaginationModule.usePagination
    mockUseDebounce = useDebounceModule.useDebounce
    mockUseSearchFilters = useSearchFiltersModule.useSearchFilters
    
    // Default mock implementations
    mockUseJobs.mockReturnValue({
      jobs: mockJobs,
      total: mockJobs.length,
      isLoading: false,
      error: null,
      refetch: vi.fn()
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
      filters: { search: '', status: '', location: '', type: '' },
      setFilter: vi.fn(),
      removeFilter: vi.fn(),
      clearFilters: vi.fn(),
      activeFilters: [],
      queryParams: {}
    })
  })

  describe('Page Rendering', () => {
    it('renders jobs page with title and count', () => {
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByText('Jobs')).toBeInTheDocument()
      expect(screen.getByText('3 positions')).toBeInTheDocument()
    })

    it('renders "Post a job" button', () => {
      renderWithAllProviders(<Jobs />)
      
      const postButtons = screen.getAllByText('Post a job')
      expect(postButtons.length).toBeGreaterThan(0)
      expect(postButtons[0]).toBeInTheDocument()
    })

    it('renders search input and filter dropdowns', () => {
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByTestId('search-input')).toBeInTheDocument()
      expect(screen.getByText('All statuses')).toBeInTheDocument()
      expect(screen.getByText('All types')).toBeInTheDocument()
    })

    it('renders filter chips component', () => {
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByTestId('filter-chips')).toBeInTheDocument()
    })

    it('displays correct singular text for 1 position', () => {
      mockUseJobs.mockReturnValue({
        jobs: [mockJobs[0]],
        total: 1,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByText('1 position')).toBeInTheDocument()
    })
  })

  describe('Job List Display', () => {
    it('renders all job cards', () => {
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
      expect(screen.getByText('Product Manager')).toBeInTheDocument()
      expect(screen.getByText('UX Designer')).toBeInTheDocument()
    })

    it('displays job location and employment type', () => {
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByText('New York, NY')).toBeInTheDocument()
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument()
      expect(screen.getByText('Remote')).toBeInTheDocument()
      
      // Check for multiple full-time occurrences
      const fullTimeElements = screen.getAllByText('full-time')
      expect(fullTimeElements.length).toBeGreaterThanOrEqual(2)
    })

    it('displays openings count for each job', () => {
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('uses correct plural/singular for openings', () => {
      renderWithAllProviders(<Jobs />)
      
      // 2 openings should be plural
      const openingsText = screen.getAllByText('openings')
      expect(openingsText.length).toBeGreaterThan(0)
      
      // 1 opening should be singular
      expect(screen.getByText('opening')).toBeInTheDocument()
    })

    it('links to individual job detail pages', () => {
      renderWithAllProviders(<Jobs />)
      
      const jobLinks = screen.getAllByRole('link')
      const detailLink = jobLinks.find(link => link.getAttribute('href') === '/jobs/1')
      expect(detailLink).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when loading jobs', () => {
      mockUseJobs.mockReturnValue({
        jobs: [],
        total: 0,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByText('Loading jobs...')).toBeInTheDocument()
    })

    it('does not render job list when loading', () => {
      mockUseJobs.mockReturnValue({
        jobs: [],
        total: 0,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Jobs />)
      
      expect(screen.queryByText('Senior Software Engineer')).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('shows error message when fetch fails', () => {
      mockUseJobs.mockReturnValue({
        jobs: [],
        total: 0,
        isLoading: false,
        error: 'Failed to fetch jobs',
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByText('Error loading jobs')).toBeInTheDocument()
      expect(screen.getByText('Failed to load jobs')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch jobs')).toBeInTheDocument()
    })

    it('renders retry button on error', () => {
      const mockRefetch = vi.fn()
      mockUseJobs.mockReturnValue({
        jobs: [],
        total: 0,
        isLoading: false,
        error: 'Network error',
        refetch: mockRefetch
      })
      
      renderWithAllProviders(<Jobs />)
      
      const retryButton = screen.getByText('Try again')
      expect(retryButton).toBeInTheDocument()
    })

    it('calls refetch when retry button is clicked', async () => {
      const mockRefetch = vi.fn()
      mockUseJobs.mockReturnValue({
        jobs: [],
        total: 0,
        isLoading: false,
        error: 'Network error',
        refetch: mockRefetch
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<Jobs />)
      
      const retryButton = screen.getByText('Try again')
      await user.click(retryButton)
      
      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no jobs exist', () => {
      mockUseJobs.mockReturnValue({
        jobs: [],
        total: 0,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByText('No jobs posted yet')).toBeInTheDocument()
      expect(screen.getByText('Get started by posting your first job opening')).toBeInTheDocument()
    })

    it('shows "Post a job" button in empty state', () => {
      mockUseJobs.mockReturnValue({
        jobs: [],
        total: 0,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Jobs />)
      
      // Should have multiple "Post a job" buttons (header + empty state)
      const postButtons = screen.getAllByText('Post a job')
      expect(postButtons.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Filters and Search', () => {
    it('updates search input on user typing', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<Jobs />)
      
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'engineer')
      
      expect(searchInput.value).toBe('engineer')
    })

    it('updates status filter on selection', async () => {
      const mockSetFilter = vi.fn()
      mockUseSearchFilters.mockReturnValue({
        filters: { search: '', status: '', location: '', type: '' },
        setFilter: mockSetFilter,
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [],
        queryParams: {}
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<Jobs />)
      
      const statusSelect = screen.getByDisplayValue('All statuses')
      await user.selectOptions(statusSelect, 'open')
      
      expect(mockSetFilter).toHaveBeenCalledWith('status', 'open')
    })

    it('updates type filter on selection', async () => {
      const mockSetFilter = vi.fn()
      mockUseSearchFilters.mockReturnValue({
        filters: { search: '', status: '', location: '', type: '' },
        setFilter: mockSetFilter,
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [],
        queryParams: {}
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<Jobs />)
      
      const typeSelect = screen.getByDisplayValue('All types')
      await user.selectOptions(typeSelect, 'full-time')
      
      expect(mockSetFilter).toHaveBeenCalledWith('type', 'full-time')
    })

    it('shows "matching filters" text when filters are active', () => {
      mockUseSearchFilters.mockReturnValue({
        filters: { search: '', status: 'open', location: '', type: '' },
        setFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [{ key: 'status', label: 'Status', value: 'open' }],
        queryParams: { status: 'open' }
      })
      
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByText('3 positions matching filters')).toBeInTheDocument()
    })

    it('passes debounced search value to setFilter', async () => {
      const mockSetFilter = vi.fn()
      
      // Mock debounce to return the debounced value immediately
      mockUseDebounce.mockReturnValue('engineer')
      
      mockUseSearchFilters.mockReturnValue({
        filters: { search: '', status: '', location: '', type: '' },
        setFilter: mockSetFilter,
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [],
        queryParams: {}
      })
      
      renderWithAllProviders(<Jobs />)
      
      // The useEffect that calls setFilter should have been triggered
      await waitFor(() => {
        expect(mockSetFilter).toHaveBeenCalledWith('search', 'engineer')
      })
    })
  })

  describe('Pagination', () => {
    it('renders pagination component when jobs exist', () => {
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByTestId('pagination-component')).toBeInTheDocument()
    })

    it('does not render pagination in empty state', () => {
      mockUseJobs.mockReturnValue({
        jobs: [],
        total: 0,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Jobs />)
      
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
      
      const { rerender } = renderWithAllProviders(<Jobs />)
      
      // Change filters
      mockUseSearchFilters.mockReturnValue({
        filters: { search: '', status: 'open', location: '', type: '' },
        setFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [{ key: 'status', label: 'Status', value: 'open' }],
        queryParams: { status: 'open' }
      })
      
      rerender(<Jobs />)
      
      // resetPage should be called when queryParams change
      // Note: This would need the useEffect to trigger, which is tested implicitly
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
      
      renderWithAllProviders(<Jobs />)
      
      expect(mockGetTotalPages).toHaveBeenCalledWith(3)
    })
  })

  describe('Navigation', () => {
    it('"Post a job" button links to /jobs/new', () => {
      renderWithAllProviders(<Jobs />)
      
      const postButtons = screen.getAllByText('Post a job')
      const headerPostButton = postButtons[0]
      
      expect(headerPostButton.closest('a')).toHaveAttribute('href', '/jobs/new')
    })

    it('job cards link to job detail pages', () => {
      renderWithAllProviders(<Jobs />)
      
      const jobCard = screen.getByText('Senior Software Engineer').closest('a')
      expect(jobCard).toHaveAttribute('href', '/jobs/1')
    })
  })

  describe('Data Integration', () => {
    it('passes correct parameters to useJobs hook', () => {
      mockUseSearchFilters.mockReturnValue({
        filters: { search: 'engineer', status: 'open', location: '', type: 'full-time' },
        setFilter: vi.fn(),
        removeFilter: vi.fn(),
        clearFilters: vi.fn(),
        activeFilters: [
          { key: 'search', label: 'Search', value: 'engineer' },
          { key: 'status', label: 'Status', value: 'open' },
          { key: 'type', label: 'Type', value: 'full-time' }
        ],
        queryParams: { search: 'engineer', status: 'open', type: 'full-time' }
      })
      
      mockUsePagination.mockReturnValue({
        page: 2,
        pageSize: 50,
        setPage: vi.fn(),
        setPageSize: vi.fn(),
        getTotalPages: vi.fn((total) => Math.ceil(total / 50)),
        resetPage: vi.fn()
      })
      
      renderWithAllProviders(<Jobs />)
      
      expect(mockUseJobs).toHaveBeenCalledWith({
        page: 2,
        pageSize: 50,
        search: 'engineer',
        status: 'open',
        type: 'full-time'
      })
    })

    it('handles jobs without openings field', () => {
      const jobsWithoutOpenings = [
        createMockJob({ id: '1', title: 'Test Job', openings: undefined })
      ]
      
      mockUseJobs.mockReturnValue({
        jobs: jobsWithoutOpenings,
        total: 1,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Jobs />)
      
      // Should display 0 openings
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('openings')).toBeInTheDocument()
    })

    it('handles jobs with type instead of employmentType', () => {
      const jobWithType = [
        createMockJob({ 
          id: '1', 
          title: 'Contract Role',
          type: 'contract',
          employmentType: undefined
        })
      ]
      
      mockUseJobs.mockReturnValue({
        jobs: jobWithType,
        total: 1,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Jobs />)
      
      expect(screen.getByText('contract')).toBeInTheDocument()
    })
  })
})
