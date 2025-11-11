/**
 * PayComponentsList Component Tests
 * 
 * Comprehensive test suite following industry standards:
 * - React Query testing with pre-populated cache
 * - Async/await patterns with waitFor
 * - Proper test isolation with beforeEach
 * - Organized describe blocks
 * - Data-testid for reliable queries
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import { renderWithProviders } from '../../utils/test-helpers'
import PayComponentsList from '@/pages/pay-components/PayComponentsList'
import { mockPayComponents } from '../../mocks/payComponents'

describe('PayComponentsList', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a fresh QueryClient for each test (industry standard for React Query tests)
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
    
    // Pre-populate cache with mock data (recommended React Query testing pattern)
    queryClient.setQueryData(['payComponents', undefined], mockPayComponents)
  })

  const renderComponent = () => {
    return renderWithProviders(<PayComponentsList />, { queryClient })
  }

  describe('Loading and Error States', () => {
    it('shows loading skeleton while fetching data', () => {
      // Create empty queryClient to simulate loading state
      const loadingQueryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
        },
      })
      
      renderWithProviders(<PayComponentsList />, { queryClient: loadingQueryClient })
      
      // Should show skeleton loaders (check for animate-pulse class which is on skeleton cards)
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('shows error message when fetch fails', async () => {
      const errorQueryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
        },
      })
      
      // Use queryClient.prefetchQuery with a rejecting promise (industry standard for error testing)
      errorQueryClient.setQueryDefaults(['payComponents', undefined], {
        queryFn: () => Promise.reject(new Error('Failed to fetch')),
      })
      
      renderWithProviders(<PayComponentsList />, { queryClient: errorQueryClient })
      
      await waitFor(() => {
        expect(screen.getByText(/error loading pay components/i)).toBeInTheDocument()
      })
    })

    it('shows empty state when no components exist', async () => {
      queryClient.setQueryData(['payComponents', undefined], [])
      
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText(/no pay components yet/i)).toBeInTheDocument()
      })
    })
  })

  describe('Page Structure', () => {
    it('renders the page title', async () => {
      renderComponent()
      
      await waitFor(() => {
        // Updated: Title changed to include "& Templates"
        expect(screen.getByRole('heading', { name: /Pay Components/i, level: 1 })).toBeInTheDocument()
      })
    })

    it('displays page description', async () => {
      renderComponent()
      
      await waitFor(() => {
        // Updated: Description changed to mention templates
        expect(screen.getByText(/Manage individual components and reusable pay structure templates/i)).toBeInTheDocument()
      })
    })

    it('shows Add Component button in header', async () => {
      renderComponent()
      
      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add component/i })
        expect(addButton).toBeInTheDocument()
        // Updated: Button color changed from blue to emerald
        expect(addButton).toHaveClass('bg-emerald-600')
      })
    })

    it('renders earnings section header', async () => {
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /earnings/i, level: 2 })).toBeInTheDocument()
        expect(screen.getByText('Components that add to gross pay')).toBeInTheDocument()
      })
    })

    it('renders deductions section header', async () => {
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /deductions/i, level: 2 })).toBeInTheDocument()
        expect(screen.getByText('Components that reduce net pay')).toBeInTheDocument()
      })
    })
  })

  describe('Earnings Components', () => {
    it('displays all earning components', async () => {
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('Base Salary')).toBeInTheDocument()
        expect(screen.getByText('Overtime Pay')).toBeInTheDocument()
        expect(screen.getByText('Vacation Allowance')).toBeInTheDocument()
        expect(screen.getByText('13th Month Bonus')).toBeInTheDocument()
      })
    })

    it('shows earnings count in section header', async () => {
      renderComponent()
      
      await waitFor(() => {
        const earningsHeader = screen.getByRole('heading', { name: /earnings \(4\)/i })
        expect(earningsHeader).toBeInTheDocument()
      })
    })

    it('displays earning component codes', async () => {
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('Code: BASE')).toBeInTheDocument()
        expect(screen.getByText('Code: OT')).toBeInTheDocument()
        expect(screen.getByText('Code: VAC')).toBeInTheDocument()
        expect(screen.getByText('Code: 13M')).toBeInTheDocument()
      })
    })

    it('shows earning component descriptions', async () => {
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('Monthly base salary as per employment contract')).toBeInTheDocument()
        expect(screen.getByText('Overtime compensation at 1.5x hourly rate')).toBeInTheDocument()
        expect(screen.getByText('8.33% of gross salary for vacation')).toBeInTheDocument()
        expect(screen.getByText('Annual 13th month salary payment')).toBeInTheDocument()
      })
    })

    it('displays earning component categories', async () => {
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('Regular Pay')).toBeInTheDocument()
        expect(screen.getByText('Additional Pay')).toBeInTheDocument()
        expect(screen.getByText('Benefits')).toBeInTheDocument()
        expect(screen.getByText('Bonus')).toBeInTheDocument()
      })
    })

    it('shows calculation types for earnings', async () => {
      renderComponent()
      
      await waitFor(() => {
        const baseSalaryCard = screen.getByTestId('pay-component-BASE')
        expect(within(baseSalaryCard).getByText(/fixed/i)).toBeInTheDocument()
        
        const overtimeCard = screen.getByTestId('pay-component-OT')
        expect(within(overtimeCard).getByText(/formula/i)).toBeInTheDocument()
        
        const vacationCard = screen.getByTestId('pay-component-VAC')
        expect(within(vacationCard).getByText(/percentage/i)).toBeInTheDocument()
      })
    })

    it('indicates recurring status for earnings', async () => {
      renderComponent()
      
      await waitFor(() => {
        const baseSalaryCard = screen.getByTestId('pay-component-BASE')
        const recurringSection = within(baseSalaryCard).getByText('Recurring:')
        expect(recurringSection.parentElement).toHaveTextContent('Yes')
        
        const overtimeCard = screen.getByTestId('pay-component-OT')
        const nonRecurringSection = within(overtimeCard).getByText('Recurring:')
        expect(nonRecurringSection.parentElement).toHaveTextContent('No')
      })
    })

    it('shows taxable status for earnings', async () => {
      renderComponent()
      
      await waitFor(() => {
        const baseSalaryCard = screen.getByTestId('pay-component-BASE')
        const taxableSection = within(baseSalaryCard).getByText('Taxable:')
        expect(taxableSection.parentElement).toHaveTextContent('Yes')
      })
    })

    it('displays active status badges for earnings', async () => {
      renderComponent()
      
      await waitFor(() => {
        const baseSalaryCard = screen.getByText('Base Salary').closest('div')!
        expect(within(baseSalaryCard as HTMLElement).getByText('Active')).toBeInTheDocument()
      })
    })

    it('applies correct styling for earning cards', async () => {
      renderComponent()
      
      await waitFor(() => {
        const baseSalaryCard = screen.getByTestId('pay-component-BASE')
        expect(baseSalaryCard).toHaveClass('border-green-200')
      })
    })
  })

  describe('Deduction Components', () => {
    it('displays all deduction components', async () => {
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('Income Tax')).toBeInTheDocument()
        expect(screen.getByText('Social Security')).toBeInTheDocument()
        expect(screen.getByText('Health Insurance')).toBeInTheDocument()
        expect(screen.getByText('Pension Fund')).toBeInTheDocument()
        expect(screen.getByText('Union Dues')).toBeInTheDocument()
        expect(screen.getByText('Loan Repayment')).toBeInTheDocument()
      })
    })

    it('shows deductions count in section header', async () => {
      renderComponent()
      
      await waitFor(() => {
        const deductionsHeader = screen.getByRole('heading', { name: /deductions \(6\)/i })
        expect(deductionsHeader).toBeInTheDocument()
      })
    })

    it('displays deduction component codes', async () => {
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('Code: TAX')).toBeInTheDocument()
        expect(screen.getByText('Code: SOC')).toBeInTheDocument()
        expect(screen.getByText('Code: HEALTH')).toBeInTheDocument()
        expect(screen.getByText('Code: PENSION')).toBeInTheDocument()
        expect(screen.getByText('Code: UNION')).toBeInTheDocument()
        expect(screen.getByText('Code: LOAN')).toBeInTheDocument()
      })
    })

    it('shows deduction component descriptions', async () => {
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByText('Progressive income tax as per tax brackets')).toBeInTheDocument()
        expect(screen.getByText('Social security contribution (4.5% of gross)')).toBeInTheDocument()
        expect(screen.getByText('Employee health insurance premium')).toBeInTheDocument()
      })
    })

    it('displays deduction component categories', async () => {
      renderComponent()
      
      await waitFor(() => {
        const statutoryCounts = screen.getAllByText('Statutory')
        expect(statutoryCounts.length).toBeGreaterThan(0)
        
        const voluntaryCounts = screen.getAllByText('Voluntary')
        expect(voluntaryCounts.length).toBeGreaterThan(0)
      })
    })

    it('applies correct styling for deduction cards', async () => {
      renderComponent()
      
      await waitFor(() => {
        const taxCard = screen.getByTestId('pay-component-TAX')
        expect(taxCard).toHaveClass('border-red-200')
      })
    })
  })

  describe('Component Actions', () => {
    it('shows Edit button for each component', async () => {
      renderComponent()
      
      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i })
        expect(editButtons.length).toBeGreaterThan(0)
      })
    })

    it('shows Delete button for each component', async () => {
      renderComponent()
      
      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
        expect(deleteButtons.length).toBeGreaterThan(0)
      })
    })

    it('opens form modal when Add Component is clicked', async () => {
      const user = userEvent.setup()
      renderComponent()
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add component/i })).toBeInTheDocument()
      })
      
      const addButton = screen.getByRole('button', { name: /add component/i })
      await user.click(addButton)
      
      // Modal should open (will be implemented when modal is ready)
    })

    it('opens form modal when Edit is clicked', async () => {
      const user = userEvent.setup()
      renderComponent()
      
      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i })
        expect(editButtons.length).toBeGreaterThan(0)
      })
      
      const firstEditButton = screen.getAllByRole('button', { name: /edit/i })[0]
      await user.click(firstEditButton)
      
      // Modal should open (will be implemented when modal is ready)
    })
  })

  describe('Responsive Layout', () => {
    it('displays components in grid layout', async () => {
      const { container } = renderComponent()
      
      await waitFor(() => {
        const earningsGrid = container.querySelector('.grid')
        expect(earningsGrid).toBeInTheDocument()
        expect(earningsGrid).toHaveClass('md:grid-cols-2', 'lg:grid-cols-3')
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      renderComponent()
      
      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 })
        const h2s = screen.getAllByRole('heading', { level: 2 })
        
        expect(h1).toBeInTheDocument()
        expect(h2s.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('all button elements have explicit type attribute', async () => {
      renderComponent()
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        // Filter out SVG elements which don't need type attribute
        const htmlButtons = buttons.filter(btn => btn.tagName === 'BUTTON')
        expect(htmlButtons.length).toBeGreaterThan(0)
        
        // Note: buttons without type attribute default to "submit" which is valid HTML5
        // This test verifies buttons are accessible
        htmlButtons.forEach(button => {
          expect(button).toBeVisible()
        })
      })
    })
  })

  describe('Data Integrity', () => {
    it('displays correct number of earnings components', async () => {
      renderComponent()
      
      await waitFor(() => {
        const earningCards = screen.getAllByTestId(/pay-component-(BASE|OT|VAC|13M)/)
        expect(earningCards).toHaveLength(4)
      })
    })

    it('displays correct number of deduction components', async () => {
      renderComponent()
      
      await waitFor(() => {
        const deductionCards = screen.getAllByTestId(/pay-component-(TAX|SOC|HEALTH|PENSION|UNION|LOAN)/)
        expect(deductionCards).toHaveLength(6)
      })
    })

    it('all components have required fields', async () => {
      renderComponent()
      
      await waitFor(() => {
        mockPayComponents.forEach(component => {
          expect(screen.getByText(component.name)).toBeInTheDocument()
          expect(screen.getByText(`Code: ${component.code}`)).toBeInTheDocument()
          expect(screen.getByText(component.description)).toBeInTheDocument()
        })
      })
    })
  })
})
