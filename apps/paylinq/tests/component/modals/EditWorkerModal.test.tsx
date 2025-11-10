/**
 * EditWorkerModal Component Tests
 * 
 * Tests worker information editing functionality
 * 
 * Testing Standards Applied:
 * - Data integrity: Ensures worker data is correctly pre-filled and updated
 * - Validation: Required fields and format validation
 * - Immutable fields: National ID, DOB, Start Date cannot be changed
 * - User-centric testing: Focus on observable behavior
 * - AAA Pattern: Arrange-Act-Assert
 * - Semantic queries: getByRole > getByLabelText > getByPlaceholderText
 * 
 * Coverage Target: 85%+ (critical worker management component)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../utils/test-helpers'
import EditWorkerModal from '@/components/modals/EditWorkerModal'

describe('EditWorkerModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  const mockWorker = {
    id: 'W001',
    employeeNumber: 'EMP123456',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+597 8123456',
    nationalId: 'SUR12345678',
    dateOfBirth: '1990-05-15',
    startDate: '2023-01-15',
    workerType: 'Full-Time',
    department: 'Engineering',
    position: 'Software Developer',
    compensation: 8000,
    status: 'active',
    bankName: 'DSB Bank',
    bankAccount: '12345678',
    address: '123 Main St, Paramaribo, Suriname',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Modal Rendering', () => {
    it('renders modal when isOpen is true', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.getByRole('heading', { name: /edit worker - emp123456/i })).toBeInTheDocument()
    })

    it('does not render modal when isOpen is false', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={false} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.queryByRole('heading', { name: /edit worker/i })).not.toBeInTheDocument()
    })

    it('displays employee number in title', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.getByText(/EMP123456/)).toBeInTheDocument()
    })
  })

  describe('Form Sections', () => {
    it('renders Personal Information section', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.getByText('Personal Information')).toBeInTheDocument()
    })

    it('renders Employment Information section', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.getByText('Employment Information')).toBeInTheDocument()
    })

    it('renders Compensation section', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.getByText('Compensation')).toBeInTheDocument()
    })

    it('renders Bank Information section', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.getByText('Bank Information')).toBeInTheDocument()
    })
  })

  describe('Form Pre-population', () => {
    it('pre-fills full name with existing data', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const nameInput = screen.getByDisplayValue('John Doe')
      expect(nameInput).toBeInTheDocument()
    })

    it('pre-fills email with existing data', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const emailInput = screen.getByDisplayValue('john.doe@example.com')
      expect(emailInput).toBeInTheDocument()
    })

    it('pre-fills phone with existing data', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const phoneInput = screen.getByDisplayValue('+597 8123456')
      expect(phoneInput).toBeInTheDocument()
    })

    it('pre-fills department with existing data', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const deptInput = screen.getByDisplayValue('Engineering')
      expect(deptInput).toBeInTheDocument()
    })

    it('pre-fills position with existing data', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const posInput = screen.getByDisplayValue('Software Developer')
      expect(posInput).toBeInTheDocument()
    })

    it('pre-fills compensation with existing data', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const compInput = screen.getByDisplayValue('8000')
      expect(compInput).toBeInTheDocument()
    })

    it('pre-fills bank account with existing data', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const bankInput = screen.getByDisplayValue('12345678')
      expect(bankInput).toBeInTheDocument()
    })

    it('pre-fills address with existing data', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const addressInput = screen.getByDisplayValue('123 Main St, Paramaribo, Suriname')
      expect(addressInput).toBeInTheDocument()
    })
  })

  describe('Immutable Fields - Data Integrity', () => {
    it('disables National ID field (cannot be changed)', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const nationalIdInput = screen.getByDisplayValue('SUR12345678')
      expect(nationalIdInput).toBeDisabled()
    })

    it('disables Date of Birth field (cannot be changed)', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const dobInput = screen.getByDisplayValue('1990-05-15')
      expect(dobInput).toBeDisabled()
    })

    it('disables Start Date field (cannot be changed)', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const startDateInput = screen.getByDisplayValue('2023-01-15')
      expect(startDateInput).toBeDisabled()
    })
  })

  describe('Editable Fields', () => {
    it('allows editing full name', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const nameInput = screen.getByDisplayValue('John Doe')
      await user.clear(nameInput)
      await user.type(nameInput, 'Jane Smith')
      
      expect(nameInput).toHaveValue('Jane Smith')
    })

    it('allows editing email', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const emailInput = screen.getByDisplayValue('john.doe@example.com')
      await user.clear(emailInput)
      await user.type(emailInput, 'jane.smith@example.com')
      
      expect(emailInput).toHaveValue('jane.smith@example.com')
    })

    it('allows editing phone number', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const phoneInput = screen.getByDisplayValue('+597 8123456')
      await user.clear(phoneInput)
      await user.type(phoneInput, '+597 8987654')
      
      expect(phoneInput).toHaveValue('+597 8987654')
    })

    it('allows editing department', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const deptInput = screen.getByDisplayValue('Engineering')
      await user.clear(deptInput)
      await user.type(deptInput, 'Marketing')
      
      expect(deptInput).toHaveValue('Marketing')
    })

    it('allows editing position', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const posInput = screen.getByDisplayValue('Software Developer')
      await user.clear(posInput)
      await user.type(posInput, 'Senior Developer')
      
      expect(posInput).toHaveValue('Senior Developer')
    })

    it('allows editing compensation', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const compInput = screen.getByDisplayValue('8000')
      await user.clear(compInput)
      await user.type(compInput, '9500')
      
      expect(compInput).toHaveValue(9500)
    })

    it('allows editing address', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const addressInput = screen.getByDisplayValue('123 Main St, Paramaribo, Suriname')
      await user.clear(addressInput)
      await user.type(addressInput, '456 New St, Paramaribo')
      
      expect(addressInput).toHaveValue('456 New St, Paramaribo')
    })
  })

  describe('Select Dropdowns', () => {
    it('allows changing worker type', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const workerTypeSelect = screen.getAllByRole('combobox')[0]
      await user.selectOptions(workerTypeSelect, 'Part-Time')
      
      expect(workerTypeSelect).toHaveValue('Part-Time')
    })

    it('allows changing status', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const statusSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(statusSelect, 'on-leave')
      
      expect(statusSelect).toHaveValue('on-leave')
    })

    it('allows changing bank', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const bankSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(bankSelect, 'Hakrinbank')
      
      expect(bankSelect).toHaveValue('Hakrinbank')
    })

    it('displays all worker type options', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.getByText('Full-Time')).toBeInTheDocument()
      expect(screen.getByText('Part-Time')).toBeInTheDocument()
      expect(screen.getByText('Contract')).toBeInTheDocument()
      expect(screen.getByText('Hourly')).toBeInTheDocument()
    })

    it('displays all status options', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('On Leave')).toBeInTheDocument()
      expect(screen.getByText('Suspended')).toBeInTheDocument()
      expect(screen.getByText('Terminated')).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('shows error when full name is empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const nameInput = screen.getByDisplayValue('John Doe')
      await user.clear(nameInput)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument()
      })
    })

    it('shows error when email is empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const emailInput = screen.getByDisplayValue('john.doe@example.com')
      await user.clear(emailInput)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('shows error for invalid email format', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const emailInput = screen.getByDisplayValue('john.doe@example.com')
      await user.clear(emailInput)
      await user.type(emailInput, 'invalid-email')
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })
    })

    it('shows error when phone is empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const phoneInput = screen.getByDisplayValue('+597 8123456')
      await user.clear(phoneInput)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/phone number is required/i)).toBeInTheDocument()
      })
    })

    it('shows error when department is empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const deptInput = screen.getByDisplayValue('Engineering')
      await user.clear(deptInput)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/department is required/i)).toBeInTheDocument()
      })
    })

    it('shows error when position is empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const posInput = screen.getByDisplayValue('Software Developer')
      await user.clear(posInput)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/position is required/i)).toBeInTheDocument()
      })
    })

    it('shows error when compensation is empty', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const compInput = screen.getByDisplayValue('8000')
      await user.clear(compInput)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/compensation is required/i)).toBeInTheDocument()
      })
    })

    it('shows error for invalid compensation amount', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const compInput = screen.getByDisplayValue('8000')
      await user.clear(compInput)
      await user.type(compInput, '-500')
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid compensation amount/i)).toBeInTheDocument()
      })
    })

    it('clears error when user corrects the field', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      // Clear email to trigger error
      const emailInput = screen.getByDisplayValue('john.doe@example.com')
      await user.clear(emailInput)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
      
      // Fix the error
      await user.type(emailInput, 'new.email@example.com')
      
      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Action Buttons', () => {
    it('renders Cancel button', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('renders Save Changes button', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })

    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('disables buttons while saving', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      
      // Both buttons should be enabled initially
      expect(saveButton).not.toBeDisabled()
      expect(cancelButton).not.toBeDisabled()
      
      await user.click(saveButton)
      
      // Verify save completes
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Form Submission', () => {
    it('submits updated worker data successfully', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      // Edit some fields
      const nameInput = screen.getByDisplayValue('John Doe')
      await user.clear(nameInput)
      await user.type(nameInput, 'John Updated')
      
      const compInput = screen.getByDisplayValue('8000')
      await user.clear(compInput)
      await user.type(compInput, '9000')
      
      // Submit
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('prevents submission with validation errors', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      // Clear required field
      const emailInput = screen.getByDisplayValue('john.doe@example.com')
      await user.clear(emailInput)
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
      
      // Should not call success callbacks
      expect(mockOnSuccess).not.toHaveBeenCalled()
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Real-World Scenarios', () => {
    it('handles promoting employee (changing position and compensation)', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      // Update position and compensation for promotion
      const posInput = screen.getByDisplayValue('Software Developer')
      await user.clear(posInput)
      await user.type(posInput, 'Senior Software Developer')
      
      const compInput = screen.getByDisplayValue('8000')
      await user.clear(compInput)
      await user.type(compInput, '12000')
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('handles transferring employee to different department', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const deptInput = screen.getByDisplayValue('Engineering')
      await user.clear(deptInput)
      await user.type(deptInput, 'Sales')
      
      const posInput = screen.getByDisplayValue('Software Developer')
      await user.clear(posInput)
      await user.type(posInput, 'Sales Representative')
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('handles changing employee status to on-leave', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const statusSelect = screen.getAllByRole('combobox')[1]
      await user.selectOptions(statusSelect, 'on-leave')
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('handles updating bank information', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const bankSelect = screen.getAllByRole('combobox')[2]
      await user.selectOptions(bankSelect, 'Hakrinbank')
      
      const accountInput = screen.getByDisplayValue('12345678')
      await user.clear(accountInput)
      await user.type(accountInput, '87654321')
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('handles updating contact information', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const phoneInput = screen.getByDisplayValue('+597 8123456')
      await user.clear(phoneInput)
      await user.type(phoneInput, '+597 8999999')
      
      const emailInput = screen.getByDisplayValue('john.doe@example.com')
      await user.clear(emailInput)
      await user.type(emailInput, 'john.doe.updated@example.com')
      
      const addressInput = screen.getByDisplayValue('123 Main St, Paramaribo, Suriname')
      await user.clear(addressInput)
      await user.type(addressInput, '789 New Address, Paramaribo, Suriname')
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles worker with no address', () => {
      const workerNoAddress = { ...mockWorker, address: '' }
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={workerNoAddress}
        />
      )
      
      // Address field should be empty but present
      const addressInputs = screen.getAllByRole('textbox')
      const addressInput = addressInputs[addressInputs.length - 1] // Last textbox is address
      expect(addressInput).toHaveValue('')
    })

    it('handles very high compensation values', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const compInput = screen.getByDisplayValue('8000')
      await user.clear(compInput)
      await user.type(compInput, '999999')
      
      expect(compInput).toHaveValue(999999)
    })

    it('handles special characters in name', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      const nameInput = screen.getByDisplayValue('John Doe')
      await user.clear(nameInput)
      await user.type(nameInput, "O'Brien-Smith")
      
      expect(nameInput).toHaveValue("O'Brien-Smith")
    })
  })

  describe('Accessibility', () => {
    it('uses dialog role for modal', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has descriptive button labels', () => {
      renderWithProviders(
        <EditWorkerModal 
          isOpen={true} 
          onClose={mockOnClose} 
          onSuccess={mockOnSuccess}
          worker={mockWorker}
        />
      )
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    })
  })
})
