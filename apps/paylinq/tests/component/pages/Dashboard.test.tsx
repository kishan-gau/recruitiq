import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/test-helpers'
import Dashboard from '@/pages/Dashboard'

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('renders loading skeleton while fetching data', () => {
      renderWithProviders(<Dashboard />)
      
      // Should show pulsing skeleton loaders before data loads
      const animatedDiv = document.querySelector('.animate-pulse')
      expect(animatedDiv).toBeInTheDocument()
    })
  })

  describe('Dashboard Content', () => {
    it('renders dashboard title and welcome message', async () => {
      renderWithProviders(<Dashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getByText(/Welcome to Paylinq/i)).toBeInTheDocument()
      })
    })

    it('displays summary cards with data from API', async () => {
      renderWithProviders(<Dashboard />)
      
      await waitFor(() => {
        // Summary cards should be visible (may appear multiple times on page)
        const workerCards = screen.getAllByText(/Total Workers/i)
        expect(workerCards.length).toBeGreaterThan(0)
        
        const payrollCards = screen.getAllByText(/Next Payroll/i)
        expect(payrollCards.length).toBeGreaterThan(0)
      })
    })

    it('shows worker and payroll data from mock API', async () => {
      renderWithProviders(<Dashboard />)
      
      await waitFor(() => {
        // Verify data appears (multiple instances expected - card + detailed section)
        const workerElements = screen.getAllByText('25')
        expect(workerElements.length).toBeGreaterThan(0)
        
        const payrollElements = screen.getAllByText(/7 days/i)
        expect(payrollElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Snapshot Testing', () => {
    it('matches snapshot after data loads', async () => {
      const { container } = renderWithProviders(<Dashboard />)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      expect(container).toMatchSnapshot()
    })
  })
})
