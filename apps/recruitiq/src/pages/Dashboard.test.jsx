/**
 * Dashboard Page Tests
 * 
 * Tests the main dashboard page with stats, loading states, and navigation
 * Uses industry-standard module-level mocking approach
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupContextMocks, resetContextMocks, mockUser, mockWorkspace } from '../test/testSetup'
import { renderWithAllProviders } from '../test/testHelpers'

// Setup context mocks BEFORE importing component
setupContextMocks()

// Mock useJobs and useCandidates hooks
vi.mock('../hooks/useJobs', () => ({
  useJobs: vi.fn()
}))

vi.mock('../hooks/useCandidates', () => ({
  useCandidates: vi.fn()
}))

// Mock child components to focus on Dashboard logic
vi.mock('../components/DashboardQuickResults', () => {
  const React = require('react')
  return {
    default: () => React.createElement('div', { 'data-testid': 'dashboard-quick-results' }, 'Quick Results Component')
  }
})

vi.mock('../components/MobileDashboardSummary', () => {
  const React = require('react')
  return {
    default: () => React.createElement('div', { 'data-testid': 'mobile-dashboard-summary' }, 'Mobile Summary')
  }
})

// Now import the component
import Dashboard from './Dashboard'

describe('Dashboard Page', () => {
  let mockUseJobs
  let mockUseCandidates

  beforeEach(async () => {
    resetContextMocks()
    
    // Get the mocked hooks
    const useJobsModule = await import('../hooks/useJobs')
    const useCandidatesModule = await import('../hooks/useCandidates')
    mockUseJobs = useJobsModule.useJobs
    mockUseCandidates = useCandidatesModule.useCandidates
    
    // Default mock implementations
    mockUseJobs.mockReturnValue({
      jobs: [
        { id: 'job-1', title: 'Senior Engineer', openings: 2, status: 'open' },
        { id: 'job-2', title: 'Product Manager', openings: 1, status: 'open' },
        { id: 'job-3', title: 'Designer', openings: 3, status: 'draft' }
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })
    
    mockUseCandidates.mockReturnValue({
      candidates: [
        { id: 'cand-1', name: 'Alice Johnson', stage: 'Interview' },
        { id: 'cand-2', name: 'Bob Smith', stage: 'Hired' },
        { id: 'cand-3', name: 'Carol Davis', stage: 'Applied' },
        { id: 'cand-4', name: 'David Wilson', stage: 'Hired' }
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })
  })

  // ==================== RENDERING TESTS ====================

  describe('Page Rendering', () => {
    it('renders dashboard with title and summary', () => {
      renderWithAllProviders(<Dashboard />)
      
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Summary of hiring activity')).toBeInTheDocument()
    })

    it('renders action buttons', () => {
      renderWithAllProviders(<Dashboard />)
      
      expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /new job/i })).toBeInTheDocument()
    })

    it('renders mobile summary component', () => {
      renderWithAllProviders(<Dashboard />)
      
      expect(screen.getByTestId('mobile-dashboard-summary')).toBeInTheDocument()
    })

    it('renders quick results component', () => {
      renderWithAllProviders(<Dashboard />)
      
      expect(screen.getByTestId('dashboard-quick-results')).toBeInTheDocument()
    })
  })

  // ==================== STATS DISPLAY TESTS ====================

  describe('Statistics Display', () => {
    it('displays total open roles correctly', () => {
      renderWithAllProviders(<Dashboard />)
      
      expect(screen.getByText('Open roles')).toBeInTheDocument()
      // Total openings = 2 + 1 + 3 = 6
      expect(screen.getByText('6')).toBeInTheDocument()
    })

    it('displays total candidates correctly', () => {
      renderWithAllProviders(<Dashboard />)
      
      expect(screen.getByText('Candidates')).toBeInTheDocument()
      // Total candidates = 4
      expect(screen.getByText('4')).toBeInTheDocument()
    })

    it('displays total hires correctly', () => {
      renderWithAllProviders(<Dashboard />)
      
      expect(screen.getByText('Hires')).toBeInTheDocument()
      // Total hired = 2 (Bob and David)
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('calculates stats correctly with zero openings', () => {
      mockUseJobs.mockReturnValue({
        jobs: [
          { id: 'job-1', title: 'Test Job', status: 'open' } // No openings property
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Dashboard />)
      
      // Should default to 0 if openings is undefined
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('shows zero hires when no candidates are hired', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [
          { id: 'cand-1', name: 'Alice', stage: 'Interview' },
          { id: 'cand-2', name: 'Bob', stage: 'Applied' }
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Dashboard />)
      
      const statsSection = screen.getByText('Hires').parentElement
      expect(statsSection).toHaveTextContent('0')
    })
  })

  // ==================== LOADING STATE TESTS ====================

  describe('Loading States', () => {
    it('shows loading skeleton for jobs stats when loading', () => {
      mockUseJobs.mockReturnValue({
        jobs: [],
        isLoading: true,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Dashboard />)
      
      // Should show loading skeleton (animate-pulse class)
      const loadingElements = document.querySelectorAll('.animate-pulse')
      expect(loadingElements.length).toBeGreaterThan(0)
    })

    it('shows loading skeleton for candidates stats when loading', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [],
        isLoading: true,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Dashboard />)
      
      const loadingElements = document.querySelectorAll('.animate-pulse')
      expect(loadingElements.length).toBeGreaterThan(0)
    })

    it('shows all loading skeletons when both are loading', () => {
      mockUseJobs.mockReturnValue({
        jobs: [],
        isLoading: true,
        error: null,
        refetch: vi.fn()
      })
      
      mockUseCandidates.mockReturnValue({
        candidates: [],
        isLoading: true,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Dashboard />)
      
      const loadingElements = document.querySelectorAll('.animate-pulse')
      // Should have 3 loading skeletons (jobs, candidates, hires)
      expect(loadingElements.length).toBeGreaterThanOrEqual(3)
    })

    it('hides loading skeletons after data loads', async () => {
      // Start with loading
      mockUseJobs.mockReturnValue({
        jobs: [],
        isLoading: true,
        error: null,
        refetch: vi.fn()
      })
      
      const { rerender } = renderWithAllProviders(<Dashboard />)
      
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
      
      // Update to loaded state
      mockUseJobs.mockReturnValue({
        jobs: [{ id: 'job-1', title: 'Test', openings: 5 }],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      rerender(<Dashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })
    })
  })

  // ==================== EMPTY STATE TESTS ====================

  describe('Empty States', () => {
    it('shows zero for all stats when no data', () => {
      mockUseJobs.mockReturnValue({
        jobs: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      mockUseCandidates.mockReturnValue({
        candidates: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Dashboard />)
      
      // All stats should show 0
      const statCards = screen.getAllByText('0')
      expect(statCards.length).toBeGreaterThanOrEqual(3)
    })

    it('shows empty activity message', () => {
      renderWithAllProviders(<Dashboard />)
      
      expect(screen.getByText(/no activity yet/i)).toBeInTheDocument()
      expect(screen.getByText(/move candidates through stages/i)).toBeInTheDocument()
    })
  })

  // ==================== INTERACTION TESTS ====================

  describe('User Interactions', () => {
    it('new job button is clickable', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<Dashboard />)
      
      const newJobButton = screen.getByRole('button', { name: /new job/i })
      
      await user.click(newJobButton)
      
      // Button should be interactive (no errors thrown)
      expect(newJobButton).toBeInTheDocument()
    })

    it('share button is clickable', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<Dashboard />)
      
      const shareButton = screen.getByRole('button', { name: /share/i })
      
      await user.click(shareButton)
      
      expect(shareButton).toBeInTheDocument()
    })
  })

  // ==================== DATA CALCULATION TESTS ====================

  describe('Data Calculations', () => {
    it('correctly sums openings from multiple jobs', () => {
      mockUseJobs.mockReturnValue({
        jobs: [
          { id: 'job-1', openings: 10 },
          { id: 'job-2', openings: 5 },
          { id: 'job-3', openings: 3 },
          { id: 'job-4', openings: 2 }
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Dashboard />)
      
      // Total = 10 + 5 + 3 + 2 = 20
      expect(screen.getByText('20')).toBeInTheDocument()
    })

    it('handles jobs with missing openings field', () => {
      mockUseJobs.mockReturnValue({
        jobs: [
          { id: 'job-1', openings: 5 },
          { id: 'job-2', title: 'No openings' }, // Missing openings field
          { id: 'job-3', openings: 3 }
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Dashboard />)
      
      // Should treat missing as 0: 5 + 0 + 3 = 8
      expect(screen.getByText('8')).toBeInTheDocument()
    })

    it('counts only hired candidates', () => {
      mockUseCandidates.mockReturnValue({
        candidates: [
          { id: '1', stage: 'Applied' },
          { id: '2', stage: 'Hired' },
          { id: '3', stage: 'Interview' },
          { id: '4', stage: 'Hired' },
          { id: '5', stage: 'Hired' },
          { id: '6', stage: 'Rejected' }
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })
      
      renderWithAllProviders(<Dashboard />)
      
      const hiresSection = screen.getByText('Hires').parentElement
      // Should count only 3 hired candidates
      expect(hiresSection).toHaveTextContent('3')
    })
  })

  // ==================== RESPONSIVE DESIGN TESTS ====================

  describe('Responsive Design', () => {
    it('renders stat cards with proper styling', () => {
      renderWithAllProviders(<Dashboard />)
      
      const openRolesCard = screen.getByText('Open roles').parentElement
      expect(openRolesCard).toHaveClass('p-4')
      expect(openRolesCard).toHaveClass('rounded-lg')
    })

    it('mobile summary is always visible', () => {
      renderWithAllProviders(<Dashboard />)
      
      const mobileSummary = screen.getByTestId('mobile-dashboard-summary')
      expect(mobileSummary).toBeVisible()
    })
  })
})
