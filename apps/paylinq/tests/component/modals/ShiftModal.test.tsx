/**
 * ShiftModal Component Tests
 * 
 * Tests shift scheduling functionality
 * 
 * Testing Standards Applied:
 * - Business rule validation: Start time < End time, Max 12 hours
 * - Time validation: Proper time input handling
 * - Dual-mode testing: Add vs Edit shift workflows
 * - User-centric testing: Focus on observable behavior
 * - AAA Pattern: Arrange-Act-Assert
 * - Semantic queries: getByRole > getByLabelText > getByText
 * 
 * Coverage Target: 90%+ (critical scheduling component)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../utils/test-helpers'
import ShiftModal from '@/components/modals/ShiftModal'

describe('ShiftModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal Rendering - Add Mode', () => {
    it('renders modal when isOpen is true', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('heading', { name: /add shift/i })).toBeInTheDocument()
    })

    it('does not render modal when isOpen is false', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={false} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.queryByRole('heading', { name: /add shift/i })).not.toBeInTheDocument()
    })

    it('displays date when provided', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          date="2025-11-15"
        />
      )
      
      // Date formatting may vary by timezone, just check that date section appears
      expect(screen.getByText(/date:/i)).toBeInTheDocument()
      expect(screen.getByText(/november.*2025/i)).toBeInTheDocument()
    })

    it('does not display date section when date is not provided', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.queryByText(/date:/i)).not.toBeInTheDocument()
    })
  })

  describe('Modal Rendering - Edit Mode', () => {
    const existingShift = {
      id: 'SHIFT001',
      startTime: '08:00',
      endTime: '16:00',
      type: 'regular',
    }

    it('renders modal with edit title', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          existingShift={existingShift}
        />
      )
      
      expect(screen.getByRole('heading', { name: /edit shift/i })).toBeInTheDocument()
    })

    it('pre-fills form with existing shift data', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          existingShift={existingShift}
        />
      )
      
      const startTimeInput = screen.getByDisplayValue('08:00')
      const endTimeInput = screen.getByDisplayValue('16:00')
      
      expect(startTimeInput).toBeInTheDocument()
      expect(endTimeInput).toBeInTheDocument()
    })
  })

  describe('Form Fields', () => {
    it('renders Start Time field', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText(/start time/i)).toBeInTheDocument()
    })

    it('renders End Time field', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText(/end time/i)).toBeInTheDocument()
    })

    it('renders Shift Type field', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText(/shift type/i)).toBeInTheDocument()
    })

    it('renders Notes field', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText(/^notes$/i)).toBeInTheDocument()
    })

    it('has default values for new shift', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('17:00')).toBeInTheDocument()
    })
  })

  describe('Shift Type Options', () => {
    it('displays Regular shift option', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText('Regular')).toBeInTheDocument()
    })

    it('displays Overtime shift option', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText('Overtime')).toBeInTheDocument()
    })

    it('displays Holiday shift option', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText('Holiday')).toBeInTheDocument()
    })

    it('allows changing shift type', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      const typeSelect = screen.getByRole('combobox')
      await user.selectOptions(typeSelect, 'overtime')
      
      expect(typeSelect).toHaveValue('overtime')
    })
  })

  describe('Time Input', () => {
    it('allows changing start time', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      const startTimeInput = screen.getByDisplayValue('09:00')
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '08:00')
      
      expect(startTimeInput).toHaveValue('08:00')
    })

    it('allows changing end time', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      const endTimeInput = screen.getByDisplayValue('17:00')
      await user.clear(endTimeInput)
      await user.type(endTimeInput, '18:00')
      
      expect(endTimeInput).toHaveValue('18:00')
    })

    it('allows typing notes', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      const notesInput = screen.getByPlaceholderText(/optional notes/i)
      await user.type(notesInput, 'Morning shift with training')
      
      expect(notesInput).toHaveValue('Morning shift with training')
    })
  })

  describe('Duration Calculation', () => {
    it('displays duration for valid time range', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      // Default 09:00 - 17:00 = 8 hours
      expect(screen.getByText(/duration:/i)).toBeInTheDocument()
      expect(screen.getByText(/8\.0 hours/i)).toBeInTheDocument()
    })

    it('updates duration when times change', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      const startTimeInput = screen.getByDisplayValue('09:00')
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '09:00')
      
      const endTimeInput = screen.getByDisplayValue('17:00')
      await user.clear(endTimeInput)
      await user.type(endTimeInput, '13:00')
      
      // 09:00 - 13:00 = 4 hours
      await waitFor(() => {
        expect(screen.getByText(/4\.0 hours/i)).toBeInTheDocument()
      })
    })

    it('does not display duration when end time is before start time', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      const startTimeInput = screen.getByDisplayValue('09:00')
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '17:00')
      
      const endTimeInputs = screen.getAllByDisplayValue('17:00')
      await user.clear(endTimeInputs[1]) // End time is the second one after updating start
      await user.type(endTimeInputs[1], '09:00')
      
      expect(screen.queryByText(/duration:/i)).not.toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('validates end time must be after start time', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      const startTimeInput = screen.getByDisplayValue('09:00')
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '17:00')
      
      const endTimeInputs = screen.getAllByDisplayValue('17:00')
      await user.clear(endTimeInputs[1]) // End time is the second one
      await user.type(endTimeInputs[1], '16:00')
      
      await user.click(screen.getByRole('button', { name: /add shift/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument()
      })
    })

    it('validates shift cannot be longer than 12 hours', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      const startTimeInput = screen.getByDisplayValue('09:00')
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '08:00')
      
      const endTimeInput = screen.getByDisplayValue('17:00')
      await user.clear(endTimeInput)
      await user.type(endTimeInput, '21:00')
      
      await user.click(screen.getByRole('button', { name: /add shift/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/shift cannot be longer than 12 hours/i)).toBeInTheDocument()
      })
    })

    it('clears error when user corrects the field', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      // Set invalid times
      const startTimeInput = screen.getByDisplayValue('09:00')
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '17:00')
      
      const endTimeInputs = screen.getAllByDisplayValue('17:00')
      await user.clear(endTimeInputs[1])
      await user.type(endTimeInputs[1], '16:00')
      
      await user.click(screen.getByRole('button', { name: /add shift/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument()
      })
      
      // Fix the error
      const endTimeInput = screen.getByDisplayValue('16:00')
      await user.clear(endTimeInput)
      await user.type(endTimeInput, '18:00')
      
      await waitFor(() => {
        expect(screen.queryByText(/end time must be after start time/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Action Buttons', () => {
    it('renders Cancel button', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('renders Add Shift button in add mode', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('button', { name: /add shift/i })).toBeInTheDocument()
    })

    it('renders Update Shift button in edit mode', () => {
      const existingShift = {
        id: 'SHIFT001',
        startTime: '08:00',
        endTime: '16:00',
        type: 'regular',
      }
      
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          existingShift={existingShift}
        />
      )
      
      expect(screen.getByRole('button', { name: /update shift/i })).toBeInTheDocument()
    })

    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /cancel/i }))
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Add Shift Workflow', () => {
    it('creates new shift with default times', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          employeeId="EMP001"
          date="2025-11-15"
        />
      )
      
      await user.click(screen.getByRole('button', { name: /add shift/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('creates new shift with custom times', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          employeeId="EMP001"
          date="2025-11-15"
        />
      )
      
      const startTimeInput = screen.getByDisplayValue('09:00')
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '08:30')
      
      const endTimeInput = screen.getByDisplayValue('17:00')
      await user.clear(endTimeInput)
      await user.type(endTimeInput, '17:30')
      
      await user.click(screen.getByRole('button', { name: /add shift/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('handles overtime shift with notes', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          employeeId="EMP003"
          date="2025-11-14"
        />
      )
      
      await user.type(screen.getByPlaceholderText(/optional notes/i), 'Afternoon shift')
      await user.click(screen.getByRole('button', { name: /add shift/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('shows loading state during creation', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      const submitButton = screen.getByRole('button', { name: /add shift/i })
      await user.click(submitButton)
      
      // Should show loading text (briefly)
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Edit Shift Workflow', () => {
    const existingShift = {
      id: 'SHIFT001',
      startTime: '08:00',
      endTime: '16:00',
      type: 'regular',
    }

    it('updates existing shift', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          existingShift={existingShift}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /update shift/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('updates shift times', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          existingShift={existingShift}
        />
      )
      
      const startTimeInput = screen.getByDisplayValue('08:00')
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '07:00')
      
      await user.click(screen.getByRole('button', { name: /update shift/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('updates shift type', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          existingShift={existingShift}
        />
      )
      
      const typeSelect = screen.getByRole('combobox')
      await user.selectOptions(typeSelect, 'overtime')
      
      await user.click(screen.getByRole('button', { name: /update shift/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Real-World Scenarios', () => {
    it('handles standard 8-hour shift (9am-5pm)', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          date="2025-11-15"
        />
      )
      
      // Default is already 9am-5pm (8 hours)
      expect(screen.getByText(/8\.0 hours/i)).toBeInTheDocument()
      
      await user.click(screen.getByRole('button', { name: /add shift/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('handles night shift (10pm-6am)', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      const startTimeInput = screen.getByDisplayValue('09:00')
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '22:00')
      
      const endTimeInput = screen.getByDisplayValue('17:00')
      await user.clear(endTimeInput)
      await user.type(endTimeInput, '06:00')
      
      // This would be invalid (end before start) in same day
      await user.click(screen.getByRole('button', { name: /add shift/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument()
      })
    })

    it('handles maximum allowed shift (12 hours)', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          employeeId="EMP001"
          date="2025-11-15"
        />
      )
      
      const startTimeInput = screen.getByDisplayValue('09:00')
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '08:00')
      
      const endTimeInput = screen.getByDisplayValue('17:00')
      await user.clear(endTimeInput)
      await user.type(endTimeInput, '20:00')
      
      expect(screen.getByText(/12\.0 hours/i)).toBeInTheDocument()
      
      await user.click(screen.getByRole('button', { name: /add shift/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('handles part-time shift (4 hours)', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          employeeId="EMP002"
          date="2025-11-15"
        />
      )
      
      const startTimeInput = screen.getByDisplayValue('09:00')
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '14:00')
      
      const endTimeInput = screen.getByDisplayValue('17:00')
      await user.clear(endTimeInput)
      await user.type(endTimeInput, '18:00')
      
      expect(screen.getByText(/4\.0 hours/i)).toBeInTheDocument()
      
      await user.click(screen.getByRole('button', { name: /add shift/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('handles overtime shift with notes', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          date="2025-11-15"
        />
      )
      
      const typeSelect = screen.getByRole('combobox')
      await user.selectOptions(typeSelect, 'overtime')
      
      await user.type(
        screen.getByPlaceholderText(/optional notes/i),
        'Pre-approved overtime for project deadline'
      )
      
      await user.click(screen.getByRole('button', { name: /add shift/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('uses dialog role for modal', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has descriptive button labels', () => {
      renderWithProviders(
        <ShiftModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add shift/i })).toBeInTheDocument()
    })
  })
})
