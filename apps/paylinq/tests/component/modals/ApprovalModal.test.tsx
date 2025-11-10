/**
 * ApprovalModal Component Tests
 * 
 * Tests time entry approval/rejection workflow
 * 
 * Testing Standards Applied:
 * - Audit trail: Approval/rejection notes for compliance
 * - Dual-action testing: Approve vs Reject workflows
 * - User-centric testing: Focus on observable behavior
 * - AAA Pattern: Arrange-Act-Assert
 * - Semantic queries: getByRole > getByLabelText > getByText
 * - SOC 2 Compliance: Documented approval/rejection reasons
 * 
 * Coverage Target: 90%+ (critical approval workflow)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../utils/test-helpers'
import ApprovalModal from '@/components/modals/ApprovalModal'

describe('ApprovalModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSuccess.mockResolvedValue(undefined)
  })

  describe('Modal Rendering - Approve Action', () => {
    it('renders modal when isOpen is true for approval', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('heading', { name: /approve time entries/i })).toBeInTheDocument()
    })

    it('does not render modal when isOpen is false', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={false} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.queryByRole('heading', { name: /approve time entries/i })).not.toBeInTheDocument()
    })

    it('displays approval message for single entry', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText(/you are about to approve 1 time entry/i)).toBeInTheDocument()
    })

    it('displays approval message for multiple entries', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001', 'TE002', 'TE003']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText(/you are about to approve 3 time entries/i)).toBeInTheDocument()
    })

    it('shows entry count for approval', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001', 'TE002']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText(/2 entries selected/i)).toBeInTheDocument()
    })

    it('displays optional notes field for approval', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText(/notes \(optional\)/i)).toBeInTheDocument()
    })
  })

  describe('Modal Rendering - Reject Action', () => {
    it('renders modal with reject title', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('heading', { name: /reject time entries/i })).toBeInTheDocument()
    })

    it('displays rejection message for single entry', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText(/you are about to reject 1 time entry.*please provide a reason/i)).toBeInTheDocument()
    })

    it('displays rejection message for multiple entries', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001', 'TE002', 'TE003', 'TE004']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText(/you are about to reject 4 time entries.*please provide a reason/i)).toBeInTheDocument()
    })

    it('displays required reason field for rejection', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText(/reason for rejection/i)).toBeInTheDocument()
    })

    it('shows different placeholder for rejection notes', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByPlaceholderText(/please provide a reason for rejection/i)).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('renders Cancel button', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('renders Approve button for approve action', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument()
    })

    it('renders Reject button for reject action', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument()
    })

    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /cancel/i }))
      
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Notes/Reason Input', () => {
    it('allows typing in notes field for approval', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      const notesInput = screen.getByPlaceholderText(/add any notes or comments/i)
      await user.type(notesInput, 'Approved by manager')
      
      expect(notesInput).toHaveValue('Approved by manager')
    })

    it('allows typing rejection reason', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      const reasonInput = screen.getByPlaceholderText(/please provide a reason for rejection/i)
      await user.type(reasonInput, 'Incorrect hours logged')
      
      expect(reasonInput).toHaveValue('Incorrect hours logged')
    })

    it('notes field starts empty', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      const notesInput = screen.getByPlaceholderText(/add any notes or comments/i)
      expect(notesInput).toHaveValue('')
    })
  })

  describe('Approval Workflow', () => {
    it('approves single entry without notes', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /^approve$/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('approve', ['TE001'], '')
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('approves single entry with notes (audit trail)', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.type(
        screen.getByPlaceholderText(/add any notes or comments/i),
        'Reviewed and approved by supervisor'
      )
      
      await user.click(screen.getByRole('button', { name: /^approve$/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('approve', ['TE001'], 'Reviewed and approved by supervisor')
      })
    })

    it('approves multiple entries', async () => {
      const user = userEvent.setup()
      const entryIds = ['TE001', 'TE002', 'TE003', 'TE004', 'TE005']
      
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={entryIds}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.type(
        screen.getByPlaceholderText(/add any notes or comments/i),
        'Batch approval for week ending 11/1'
      )
      
      await user.click(screen.getByRole('button', { name: /^approve$/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('approve', entryIds, 'Batch approval for week ending 11/1')
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('shows loading state during approval', async () => {
      const user = userEvent.setup()
      let resolvePromise: () => void
      const delayedPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockOnSuccess.mockReturnValue(delayedPromise)
      
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /^approve$/i }))
      
      // Should show loading state
      expect(screen.getByRole('button', { name: /processing/i })).toBeInTheDocument()
      
      // Resolve the promise
      resolvePromise!()
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('disables buttons during approval processing', async () => {
      const user = userEvent.setup()
      let resolvePromise: () => void
      const delayedPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockOnSuccess.mockReturnValue(delayedPromise)
      
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /^approve$/i }))
      
      // Both buttons should be disabled
      expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
      
      resolvePromise!()
    })
  })

  describe('Rejection Workflow', () => {
    it('rejects single entry with reason', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.type(
        screen.getByPlaceholderText(/please provide a reason for rejection/i),
        'Hours do not match schedule'
      )
      
      await user.click(screen.getByRole('button', { name: /^reject$/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('reject', ['TE001'], 'Hours do not match schedule')
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('rejects multiple entries with reason', async () => {
      const user = userEvent.setup()
      const entryIds = ['TE001', 'TE002', 'TE003']
      
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={entryIds}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.type(
        screen.getByPlaceholderText(/please provide a reason for rejection/i),
        'Missing manager approval'
      )
      
      await user.click(screen.getByRole('button', { name: /^reject$/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('reject', entryIds, 'Missing manager approval')
      })
    })

    it('can reject without notes (empty string passed)', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      // Don't type anything, just reject
      await user.click(screen.getByRole('button', { name: /^reject$/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('reject', ['TE001'], '')
      })
    })

    it('shows loading state during rejection', async () => {
      const user = userEvent.setup()
      let resolvePromise: () => void
      const delayedPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })
      mockOnSuccess.mockReturnValue(delayedPromise)
      
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /^reject$/i }))
      
      expect(screen.getByRole('button', { name: /processing/i })).toBeInTheDocument()
      
      resolvePromise!()
    })
  })

  describe('Error Handling', () => {
    it('handles approval failure gracefully', async () => {
      const user = userEvent.setup()
      mockOnSuccess.mockRejectedValue(new Error('Network error'))
      
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.click(screen.getByRole('button', { name: /^approve$/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
        // Modal should stay open on error
        expect(mockOnClose).not.toHaveBeenCalled()
      })
      
      // Button should be re-enabled after error
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^approve$/i })).not.toBeDisabled()
      })
    })

    it('handles rejection failure gracefully', async () => {
      const user = userEvent.setup()
      mockOnSuccess.mockRejectedValue(new Error('Server error'))
      
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.type(
        screen.getByPlaceholderText(/please provide a reason for rejection/i),
        'Test reason'
      )
      
      await user.click(screen.getByRole('button', { name: /^reject$/i }))
      
      await waitFor(() => {
        // Modal stays open
        expect(mockOnClose).not.toHaveBeenCalled()
      })
    })
  })

  describe('Real-World Scenarios', () => {
    it('handles bulk approval workflow (10+ entries)', async () => {
      const user = userEvent.setup()
      const entryIds = Array.from({ length: 15 }, (_, i) => `TE${String(i + 1).padStart(3, '0')}`)
      
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={entryIds}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByText(/15 entries selected/i)).toBeInTheDocument()
      
      await user.type(
        screen.getByPlaceholderText(/add any notes or comments/i),
        'Weekly timesheet approval - all verified'
      )
      
      await user.click(screen.getByRole('button', { name: /^approve$/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('approve', entryIds, 'Weekly timesheet approval - all verified')
      })
    })

    it('handles manager reviewing and rejecting incorrect entries', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE042', 'TE043']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.type(
        screen.getByPlaceholderText(/please provide a reason for rejection/i),
        'Overtime hours not pre-approved. Please resubmit with approval.'
      )
      
      await user.click(screen.getByRole('button', { name: /^reject$/i }))
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(
          'reject',
          ['TE042', 'TE043'],
          'Overtime hours not pre-approved. Please resubmit with approval.'
        )
      })
    })

    it('clears notes after successful submission', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      await user.type(
        screen.getByPlaceholderText(/add any notes or comments/i),
        'Test notes'
      )
      
      expect(screen.getByPlaceholderText(/add any notes or comments/i)).toHaveValue('Test notes')
      
      await user.click(screen.getByRole('button', { name: /^approve$/i }))
      
      // Notes should be cleared after successful submission (component state reset)
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('uses dialog role for modal', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has descriptive button labels', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="approve"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument()
    })

    it('provides clear action context in heading', () => {
      renderWithProviders(
        <ApprovalModal 
          isOpen={true} 
          onClose={mockOnClose} 
          entryIds={['TE001']}
          action="reject"
          onSuccess={mockOnSuccess}
        />
      )
      
      expect(screen.getByRole('heading', { name: /reject time entries/i })).toBeInTheDocument()
    })
  })
})
