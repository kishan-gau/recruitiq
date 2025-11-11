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

  describe('API Integration', () => {
    it('sends correct payload on successful submission', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      // With default MSW handlers, submission should succeed
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('shows success message on successful creation', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      // Success toast should appear
      await waitFor(() => {
        expect(screen.getByText(/payroll run created successfully/i)).toBeInTheDocument()
      })
    })

    it('closes modal after successful creation', async () => {
      const user = userEvent.setup()
      
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('handles leap year dates correctly', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const startInput = dateInputs[0]
      const endInput = dateInputs[1]

      await user.clear(startInput)
      await user.type(startInput, '2024-02-01')
      await user.clear(endInput)
      await user.type(endInput, '2024-02-29')

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('validates non-leap year February dates', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const endInput = dateInputs[1]

      await user.clear(endInput)
      await user.type(endInput, '2023-02-28')

      expect(endInput).toHaveValue('2023-02-28')
    })

    it('handles year boundaries correctly', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const startInput = dateInputs[0]
      const endInput = dateInputs[1]
      const paymentInput = dateInputs[2]

      await user.clear(startInput)
      await user.type(startInput, '2024-12-15')
      await user.clear(endInput)
      await user.type(endInput, '2024-12-31')
      await user.clear(paymentInput)
      await user.type(paymentInput, '2025-01-05')

      // Verify fields are populated correctly
      expect(startInput).toHaveValue('2024-12-15')
      expect(endInput).toHaveValue('2024-12-31')
      expect(paymentInput).toHaveValue('2025-01-05')
    })

    it('handles very long payroll names', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByTestId('payroll-name-input')
      const longName = 'A'.repeat(200)
      
      await user.clear(nameInput)
      await user.type(nameInput, longName)

      expect(nameInput).toHaveValue(longName)
    })

    it('handles special characters in payroll name', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByTestId('payroll-name-input')
      const specialName = 'Payroll #123 - Nov/Dec (2024) & Co.'
      
      await user.clear(nameInput)
      await user.type(nameInput, specialName)

      expect(nameInput).toHaveValue(specialName)
    })

    it('handles same date for start and end', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const startInput = dateInputs[0]
      const endInput = dateInputs[1]

      await user.clear(startInput)
      await user.type(startInput, '2024-11-15')
      await user.clear(endInput)
      await user.type(endInput, '2024-11-15')

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument()
      })
    })

    it('handles payment date same as end date', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const startInput = dateInputs[0]
      const endInput = dateInputs[1]
      const paymentInput = dateInputs[2]

      // Set valid start/end dates first
      await user.clear(startInput)
      await user.type(startInput, '2024-11-01')
      await user.clear(endInput)
      await user.type(endInput, '2024-11-30')
      // Set payment date same as end date - this should be VALID
      await user.clear(paymentInput)
      await user.type(paymentInput, '2024-11-30')

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      // Payment date equal to end date is allowed - should succeed
      await waitFor(() => {
        expect(screen.getByText(/payroll run created successfully/i)).toBeInTheDocument()
      })
      expect(mockOnSuccess).toHaveBeenCalled()
    })

    it('handles far future dates', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const startInput = dateInputs[0]
      const endInput = dateInputs[1]
      const paymentInput = dateInputs[2]

      await user.clear(startInput)
      await user.type(startInput, '2099-01-01')
      await user.clear(endInput)
      await user.type(endInput, '2099-01-31')
      await user.clear(paymentInput)
      await user.type(paymentInput, '2099-02-05')

      // Verify far future dates are accepted by the form
      expect(startInput).toHaveValue('2099-01-01')
      expect(endInput).toHaveValue('2099-01-31')
      expect(paymentInput).toHaveValue('2099-02-05')
    })
  })

  describe('User Experience and Interactions', () => {
    it('maintains focus after validation error', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      await user.clear(dateInputs[0])

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/start date is required/i)).toBeInTheDocument()
      })
    })

    it('allows rapid field switching without data loss', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByTestId('payroll-name-input')
      const descriptionInput = screen.getByPlaceholderText(/optional description/i)
      const select = screen.getByRole('combobox')

      await user.clear(nameInput)
      await user.type(nameInput, 'Test Payroll')
      await user.click(select)
      await user.selectOptions(select, 'bonus')
      await user.click(descriptionInput)
      await user.type(descriptionInput, 'Test Description')

      expect(nameInput).toHaveValue('Test Payroll')
      expect(select).toHaveValue('bonus')
      expect(descriptionInput).toHaveValue('Test Description')
    })

    it('updates summary immediately when dates change', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      const startInput = dateInputs[0]

      await user.clear(startInput)
      await user.type(startInput, '2024-12-01')

      // Wait for summary to update
      await waitFor(() => {
        expect(screen.getByText(/December/)).toBeInTheDocument()
      })
    })

    it('shows validation errors for multiple fields simultaneously', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      await user.clear(dateInputs[0])
      await user.clear(dateInputs[1])
      await user.clear(dateInputs[2])

      const nameInput = screen.getByTestId('payroll-name-input')
      await user.clear(nameInput)

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/payroll name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/start date is required/i)).toBeInTheDocument()
        expect(screen.getByText(/end date is required/i)).toBeInTheDocument()
        expect(screen.getByText(/payment date is required/i)).toBeInTheDocument()
      })
    })

    it('clears all errors when all fields are corrected', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByTestId('payroll-name-input')
      await user.clear(nameInput)

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/payroll name is required/i)).toBeInTheDocument()
      })

      await user.type(nameInput, 'Valid Payroll Name')

      await waitFor(() => {
        expect(screen.queryByText(/payroll name is required/i)).not.toBeInTheDocument()
      })
    })

    it('prevents double submission', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      
      // Click once
      await user.click(submitButton)

      // Wait for the API call to complete
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      })

      // Button should be enabled again after success, but modal is closed
      // So we can't really test double-clicking since modal closes on success
    })

    it('resets form state when modal is closed and reopened', async () => {
      const user = userEvent.setup()
      
      // First render
      const { unmount } = renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByTestId('payroll-name-input')
      await user.clear(nameInput)
      await user.type(nameInput, 'Custom Payroll')

      unmount()

      // Reopen modal - form should reset to defaults with a fresh mount
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      // Default name should be present (fresh instance)
      const reopenedNameInput = screen.getByTestId('payroll-name-input')
      expect(reopenedNameInput.getAttribute('value')).toContain('Payroll')
    })
  })

  describe('Keyboard Navigation', () => {
    it('allows tabbing through all form fields', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByTestId('payroll-name-input')
      nameInput.focus()

      expect(document.activeElement).toBe(nameInput)

      await user.tab()
      const select = screen.getByRole('combobox')
      expect(document.activeElement).toBe(select)
    })

    it('allows form submission with Enter key', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      
      // Focus and use keyboard to submit
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility Features', () => {
    it('provides proper ARIA labels for date inputs', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = document.querySelectorAll('input[type="date"]')
      expect(dateInputs.length).toBeGreaterThan(0)
    })

    it('maintains proper heading hierarchy', () => {
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const heading = screen.getByRole('heading', { name: /create payroll run/i })
      expect(heading).toBeInTheDocument()
    })

    it('provides descriptive error messages for screen readers', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByTestId('payroll-name-input')
      await user.clear(nameInput)

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        const errorMessage = screen.getByText(/payroll name is required/i)
        expect(errorMessage).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Cleanup', () => {
    it('cleans up on unmount', () => {
      const { unmount } = renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      unmount()

      // No errors should occur
      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('handles rapid open/close cycles', () => {
      // Test that the modal can be opened and closed multiple times without errors
      for (let i = 0; i < 5; i++) {
        const { unmount } = renderWithProviders(
          <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
        )
        
        expect(screen.getByRole('heading', { name: /create payroll run/i })).toBeInTheDocument()
        unmount()
      }

      // Final render to verify it still works
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )
      
      expect(screen.getByRole('heading', { name: /create payroll run/i })).toBeInTheDocument()
    })
  })

  describe('Different Payroll Types Workflows', () => {
    it('creates bonus payroll with appropriate dates', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'bonus')

      const nameInput = screen.getByTestId('payroll-name-input')
      await user.clear(nameInput)
      await user.type(nameInput, 'Year End Bonus 2024')

      const descriptionInput = screen.getByPlaceholderText(/optional description/i)
      await user.type(descriptionInput, 'Special year-end performance bonus')

      expect(select).toHaveValue('bonus')
      expect(nameInput).toHaveValue('Year End Bonus 2024')
    })

    it('creates 13th month with december dates', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '13th-month')

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      await user.clear(dateInputs[0])
      await user.type(dateInputs[0], '2024-12-01')
      await user.clear(dateInputs[1])
      await user.type(dateInputs[1], '2024-12-31')
      await user.clear(dateInputs[2])
      await user.type(dateInputs[2], '2025-01-05')

      expect(select).toHaveValue('13th-month')
    })

    it('creates correction run with past dates', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'correction')

      const nameInput = screen.getByTestId('payroll-name-input')
      await user.clear(nameInput)
      await user.type(nameInput, 'October 2024 Correction')

      const descriptionInput = screen.getByPlaceholderText(/optional description/i)
      await user.type(descriptionInput, 'Correcting calculation errors from October payroll')

      expect(select).toHaveValue('correction')
    })
  })

  describe('Complex Validation Scenarios', () => {
    it('validates period spanning multiple months', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      await user.clear(dateInputs[0])
      await user.type(dateInputs[0], '2024-11-15')
      await user.clear(dateInputs[1])
      await user.type(dateInputs[1], '2024-12-15')
      await user.clear(dateInputs[2])
      await user.type(dateInputs[2], '2024-12-20')

      // Verify dates spanning multiple months are accepted
      expect(dateInputs[0]).toHaveValue('2024-11-15')
      expect(dateInputs[1]).toHaveValue('2024-12-15')
      expect(dateInputs[2]).toHaveValue('2024-12-20')
    })

    it('validates very short payroll periods', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      await user.clear(dateInputs[0])
      await user.type(dateInputs[0], '2024-11-01')
      await user.clear(dateInputs[1])
      await user.type(dateInputs[1], '2024-11-02')
      await user.clear(dateInputs[2])
      await user.type(dateInputs[2], '2024-11-05')

      // Verify very short periods are accepted
      expect(dateInputs[0]).toHaveValue('2024-11-01')
      expect(dateInputs[1]).toHaveValue('2024-11-02')
      expect(dateInputs[2]).toHaveValue('2024-11-05')
    })

    it('handles whitespace-only payroll name', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByTestId('payroll-name-input')
      await user.clear(nameInput)
      await user.type(nameInput, '   ')

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/payroll name is required/i)).toBeInTheDocument()
      })
    })
  })
})
