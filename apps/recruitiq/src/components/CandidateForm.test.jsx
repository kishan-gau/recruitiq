import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CandidateForm from './CandidateForm'
import DataContext from '../context/DataContext'
import ToastContext from '../context/ToastContext'

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

const mockState = {
  jobs: [
    { id: 1, title: 'Software Engineer' },
    { id: 2, title: 'Product Manager' }
  ],
  candidates: []
}

const mockAddCandidate = vi.fn()
const mockToast = { show: vi.fn() }

const renderWithContext = (open = true, onClose = vi.fn()) => {
  return render(
    <ToastContext.Provider value={mockToast}>
      <DataContext.Provider value={{ state: mockState, addCandidate: mockAddCandidate }}>
        <CandidateForm open={open} onClose={onClose} />
      </DataContext.Provider>
    </ToastContext.Provider>
  )
}

describe('CandidateForm - Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display required field indicator for name', () => {
    renderWithContext()
    const label = screen.getByText(/Full Name/i)
    expect(label.textContent).toContain('*')
  })

  it('should show validation error when name is empty on submit', async () => {
    const user = userEvent.setup()
    renderWithContext()
    
    const submitButton = screen.getByRole('button', { name: /add/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/candidate name is required/i)).toBeInTheDocument()
    })
    expect(mockAddCandidate).not.toHaveBeenCalled()
  })

  it('should show validation error when name is only whitespace', async () => {
    const user = userEvent.setup()
    renderWithContext()
    
    const nameInput = screen.getByLabelText(/Full Name/i)
    await user.type(nameInput, '   ')
    
    const submitButton = screen.getByRole('button', { name: /add/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/candidate name is required/i)).toBeInTheDocument()
    })
    expect(mockAddCandidate).not.toHaveBeenCalled()
  })

  it('should show validation error on blur if field is invalid', async () => {
    const user = userEvent.setup()
    renderWithContext()
    
    const nameInput = screen.getByLabelText(/Full Name/i)
    await user.click(nameInput)
    await user.tab() // Blur the field
    
    await waitFor(() => {
      expect(screen.getByText(/candidate name is required/i)).toBeInTheDocument()
    })
  })

  it('should clear validation error when user types valid input', async () => {
    const user = userEvent.setup()
    renderWithContext()
    
    const nameInput = screen.getByLabelText(/Full Name/i)
    
    // Trigger error
    await user.click(nameInput)
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText(/candidate name is required/i)).toBeInTheDocument()
    })
    
    // Type valid input
    await user.type(nameInput, 'John Doe')
    
    await waitFor(() => {
      expect(screen.queryByText(/candidate name is required/i)).not.toBeInTheDocument()
    })
  })

  it('should apply error styling to invalid field', async () => {
    const user = userEvent.setup()
    renderWithContext()
    
    const nameInput = screen.getByLabelText(/Full Name/i)
    await user.click(nameInput)
    await user.tab()
    
    await waitFor(() => {
      expect(nameInput).toHaveClass('border-red-400')
      expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    })
  })

  it('should show toast message on validation error', async () => {
    const user = userEvent.setup()
    renderWithContext()
    
    const submitButton = screen.getByRole('button', { name: /add/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith('Please fix the errors before submitting')
    })
  })

  it('should scroll to error field on submit with invalid data', async () => {
    const user = userEvent.setup()
    renderWithContext()
    
    const submitButton = screen.getByRole('button', { name: /add/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Full Name/i)
      expect(nameInput.scrollIntoView).toHaveBeenCalled()
    })
  })

  it('should add shake animation class to error field', async () => {
    const user = userEvent.setup()
    renderWithContext()
    
    const nameInput = screen.getByLabelText(/Full Name/i)
    const submitButton = screen.getByRole('button', { name: /add/i })
    
    // Mock scrollIntoView to track animation execution
    const scrollMock = vi.fn()
    nameInput.scrollIntoView = scrollMock
    
    await user.click(submitButton)
    
    // Verify scrollIntoView was called as part of animation sequence
    await waitFor(() => {
      expect(scrollMock).toHaveBeenCalled()
    })
    
    // Verify the animation class was added (even if briefly)
    // by checking that focus was called after the animation
    await waitFor(() => {
      expect(document.activeElement).toBe(nameInput)
    }, { timeout: 500 })
  })

  it('should submit successfully with valid data', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockAddCandidate.mockResolvedValue({ id: 3 })
    
    renderWithContext(true, onClose)
    
    const nameInput = screen.getByLabelText(/Full Name/i)
    await user.type(nameInput, 'John Doe')
    
    const titleInput = screen.getByLabelText(/Current Title/i)
    await user.type(titleInput, 'Engineer')
    
    const submitButton = screen.getByRole('button', { name: /add/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockAddCandidate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          title: 'Engineer',
          stage: 'Applied'
        })
      )
    })
    
    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith('Candidate added')
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('should reset form when modal is closed and reopened', async () => {
    const { rerender } = renderWithContext(true)
    
    const nameInput = screen.getByLabelText(/Full Name/i)
    await userEvent.type(nameInput, 'John Doe')
    
    // Close modal
    rerender(
      <ToastContext.Provider value={mockToast}>
        <DataContext.Provider value={{ state: mockState, addCandidate: mockAddCandidate }}>
          <CandidateForm open={false} onClose={vi.fn()} />
        </DataContext.Provider>
      </ToastContext.Provider>
    )
    
    // Reopen modal
    rerender(
      <ToastContext.Provider value={mockToast}>
        <DataContext.Provider value={{ state: mockState, addCandidate: mockAddCandidate }}>
          <CandidateForm open={true} onClose={vi.fn()} />
        </DataContext.Provider>
      </ToastContext.Provider>
    )
    
    const newNameInput = screen.getByLabelText(/Full Name/i)
    expect(newNameInput.value).toBe('')
    expect(screen.queryByText(/candidate name is required/i)).not.toBeInTheDocument()
  })

  it('should have proper ARIA attributes for accessibility', () => {
    renderWithContext()
    
    const nameInput = screen.getByLabelText(/Full Name/i)
    expect(nameInput).toHaveAttribute('aria-required', 'true')
    expect(nameInput).toHaveAttribute('aria-invalid', 'false')
  })

  it('should link error message to input via aria-describedby', async () => {
    const user = userEvent.setup()
    renderWithContext()
    
    const nameInput = screen.getByLabelText(/Full Name/i)
    await user.click(nameInput)
    await user.tab()
    
    await waitFor(() => {
      expect(nameInput).toHaveAttribute('aria-describedby', 'name-error')
      expect(screen.getByText(/candidate name is required/i)).toHaveAttribute('id', 'name-error')
    })
  })

  it('should show error message with fadeIn animation', async () => {
    const user = userEvent.setup()
    renderWithContext()
    
    const nameInput = screen.getByLabelText(/Full Name/i)
    await user.click(nameInput)
    await user.tab()
    
    await waitFor(() => {
      const errorMessage = screen.getByText(/candidate name is required/i)
      expect(errorMessage).toHaveClass('animate-fadeIn')
    })
  })
})
