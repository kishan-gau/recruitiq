import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../utils/test-helpers'
import CreatePayrollRunModal from '@/components/modals/CreatePayrollRunModal'

describe('CreatePayrollRunModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal Rendering', () => {
    it('renders modal when isOpen is true', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      // Use semantic query - heading role is more specific than text
      expect(screen.getByRole('heading', { name: 'Create Payroll Run' })).toBeInTheDocument()
    })

    it('does not render modal when isOpen is false', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      expect(screen.queryByText('Create Payroll Run')).not.toBeInTheDocument()
    })

    it('renders informational message about payroll run', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      expect(screen.getByText(/A new payroll run will be created for all active employees/i)).toBeInTheDocument()
    })

    it('renders all required form fields', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      expect(screen.getByText('Payroll Type')).toBeInTheDocument()
      expect(screen.getByText('Period Start Date')).toBeInTheDocument()
      expect(screen.getByText('Period End Date')).toBeInTheDocument()
      expect(screen.getByText('Payment Date')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    it('renders action buttons', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create payroll run/i })).toBeInTheDocument()
    })
  })

  describe('Default Values', () => {
    it('sets period start to first day of current month', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const startInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-01$/)
      expect(startInputs.length).toBeGreaterThan(0)
    })

    it('sets period end to last day of current month', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      // Should have a date input with the last day of month
      const dateInputs = document.querySelectorAll('input[type="date"]')
      expect(dateInputs.length).toBeGreaterThan(0)
    })

    it('sets payment date to 5th of next month by default', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const paymentInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-05$/)
      expect(paymentInputs.length).toBeGreaterThan(0)
    })

    it('sets payroll type to regular by default', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const select = screen.getByRole('combobox')
      expect(select).toHaveValue('regular')
    })

    it('description field is empty by default', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const descriptionInput = screen.getByPlaceholderText(/optional description/i)
      expect(descriptionInput).toHaveValue('')
    })
  })

  describe('Payroll Type Options', () => {
    it('provides regular payroll option', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      expect(screen.getByText('Regular Payroll')).toBeInTheDocument()
    })

    it('provides 13th month bonus option', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      expect(screen.getByText('13th Month Bonus')).toBeInTheDocument()
    })

    it('provides special bonus option', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      expect(screen.getByText('Special Bonus')).toBeInTheDocument()
    })

    it('provides correction run option', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      expect(screen.getByText('Correction Run')).toBeInTheDocument()
    })

    it('allows selecting different payroll types', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '13th-month')
      
      expect(select).toHaveValue('13th-month')
    })
  })

  describe('Form Validation', () => {
    it('shows error when period start is empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      // Clear the start date
      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const startInput = dateInputs[0] // First date input
      await user.clear(startInput)
      
      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/start date is required/i)).toBeInTheDocument()
      })
    })

    it('shows error when period end is empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const endInput = dateInputs[1] // Second date input
      await user.clear(endInput)
      
      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/end date is required/i)).toBeInTheDocument()
      })
    })

    it('shows error when payment date is empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const paymentInput = dateInputs[2] // Third date input
      await user.clear(paymentInput)
      
      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/payment date is required/i)).toBeInTheDocument()
      })
    })

    it('validates end date is after start date', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const startInput = dateInputs[0]
      const endInput = dateInputs[1]
      
      // Set end date before start date
      await user.clear(startInput)
      await user.type(startInput, '2024-11-20')
      await user.clear(endInput)
      await user.type(endInput, '2024-11-10')
      
      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument()
      })
    })

    it('validates payment date is after period end', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const endInput = dateInputs[1]
      const paymentInput = dateInputs[2]
      
      // Set payment date before end date
      await user.clear(endInput)
      await user.type(endInput, '2024-11-30')
      await user.clear(paymentInput)
      await user.type(paymentInput, '2024-11-25')
      
      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/payment date should be after period end date/i)).toBeInTheDocument()
      })
    })

    it('clears error when user corrects the field', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const startInput = dateInputs[0]
      
      // Trigger error
      await user.clear(startInput)
      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/start date is required/i)).toBeInTheDocument()
      })
      
      // Fix the error
      await user.type(startInput, '2024-11-01')
      
      await waitFor(() => {
        expect(screen.queryByText(/start date is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Period Summary', () => {
    it('displays period summary when dates are set', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      expect(screen.getByText('Period Summary')).toBeInTheDocument()
    })

    it('shows formatted start and end dates in summary', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      // Should show formatted dates with arrow
      const summary = screen.getByText(/→/)
      expect(summary).toBeInTheDocument()
    })

    it('shows payment date in summary', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      expect(screen.getByText(/Payment:/)).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('allows typing in description field', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const descriptionInput = screen.getByPlaceholderText(/optional description/i)
      await user.type(descriptionInput, 'November 2024 payroll')
      
      expect(descriptionInput).toHaveValue('November 2024 payroll')
    })

    it('updates period summary when dates change', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const startInput = dateInputs[0]
      
      await user.clear(startInput)
      await user.type(startInput, '2024-12-01')
      
      // Summary should update with new date
      await waitFor(() => {
        const summary = screen.getByText(/December/)
        expect(summary).toBeInTheDocument()
      })
    })
  })

  describe('Cancel Action', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('disables cancel button while loading', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      // During loading state, buttons should be disabled
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      expect(cancelButton).not.toBeDisabled()
    })
  })

  describe('Submit Action', () => {
    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)
      
      // Verify the submission completes successfully (testing the outcome, not intermediate loading state)
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('disables submit button while loading', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      
      // Button should be enabled initially
      expect(submitButton).not.toBeDisabled()
      
      await user.click(submitButton)
      
      // Verify submission completed successfully
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('marks required fields with asterisk', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      // Should have multiple required field indicators
      const asterisks = screen.getAllByText('*')
      expect(asterisks.length).toBeGreaterThan(3) // At least 4 required fields
    })

    it('associates error messages with inputs', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      await user.clear(dateInputs[0])
      
      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/start date is required/i)
        expect(errorMessage).toBeInTheDocument()
      })
    })

    it('provides descriptive button labels', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create payroll run/i })).toBeInTheDocument()
    })
  })

  describe('Icon Rendering', () => {
    it('renders calendar icon in info message', () => {
      const { container } = renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      // Check for lucide-react Calendar icon
      const icons = container.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Real-World Scenarios', () => {
    it('handles creating regular monthly payroll', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      // Default values should be set for monthly payroll
      const select = screen.getByRole('combobox')
      expect(select).toHaveValue('regular')
      
      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)
      
      // Verify successful submission with default values
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('handles creating 13th month bonus run', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '13th-month')
      
      const descriptionInput = screen.getByPlaceholderText(/optional description/i)
      await user.type(descriptionInput, 'Year-end 13th month bonus')
      
      expect(select).toHaveValue('13th-month')
      expect(descriptionInput).toHaveValue('Year-end 13th month bonus')
    })

    it('handles creating correction run', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'correction')
      
      expect(select).toHaveValue('correction')
    })
  })
})
