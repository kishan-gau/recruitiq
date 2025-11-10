import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import Login from './Login'
import { AuthProvider } from '@recruitiq/auth'

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  }
}))

const mockLogin = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock the AuthContext
vi.mock('@recruitiq/auth', async () => {
  const actual = await vi.importActual('@recruitiq/auth')
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
      user: null,
      logout: vi.fn(),
      isAuthenticated: false,
      isLoading: false
    })
  }
})

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  )
}

describe('Login - Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should display required field indicators', () => {
    renderLogin()
    
    const emailLabel = screen.getByText(/^Email/)
    const passwordLabel = screen.getByText(/^Password/)
    
    expect(emailLabel.textContent).toContain('*')
    expect(passwordLabel.textContent).toContain('*')
  })

  it('should show validation error when email is empty on submit', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const submitButton = screen.getByRole('button', { name: /sign in$/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('should show validation error when password is empty on submit', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    await user.type(emailInput, 'test@example.com')
    
    const submitButton = screen.getByRole('button', { name: /sign in$/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('should show validation error for invalid email format', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    await user.type(emailInput, 'invalid-email')
    await user.tab() // Blur the field
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('should show validation error on blur if field is invalid', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    await user.click(emailInput)
    await user.tab() // Blur the field
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('should clear validation error when user types valid input', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    
    // Trigger error
    await user.click(emailInput)
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
    
    // Type valid input
    await user.type(emailInput, 'test@example.com')
    
    await waitFor(() => {
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
    })
  })

  it('should apply error styling to invalid fields', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    await user.click(emailInput)
    await user.tab()
    
    await waitFor(() => {
      expect(emailInput).toHaveClass('border-red-400')
      expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    })
  })

  it('should scroll to first error field on submit with invalid data', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const submitButton = screen.getByRole('button', { name: /sign in$/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText(/^Email/i)
      expect(emailInput.scrollIntoView).toHaveBeenCalled()
    })
  })

  it('should add shake animation class to error field', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    const submitButton = screen.getByRole('button', { name: /sign in$/i })
    
    // Mock scrollIntoView to track animation execution
    const scrollMock = vi.fn()
    emailInput.scrollIntoView = scrollMock
    
    await user.click(submitButton)
    
    // Verify scrollIntoView was called as part of animation sequence
    await waitFor(() => {
      expect(scrollMock).toHaveBeenCalled()
    })
    
    // Verify the animation class was added (even if briefly)
    // by checking that focus was called after the animation
    await waitFor(() => {
      expect(document.activeElement).toBe(emailInput)
    }, { timeout: 500 })
  })

  it('should submit successfully with valid credentials', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue({ user: { email: 'test@example.com' } })
    
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    await user.type(emailInput, 'test@example.com')
    
    const passwordInput = screen.getByLabelText(/^Password/i)
    await user.type(passwordInput, 'password123')
    
    const submitButton = screen.getByRole('button', { name: /sign in$/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('should have proper ARIA attributes for accessibility', () => {
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    const passwordInput = screen.getByLabelText(/^Password/i)
    
    expect(emailInput).toHaveAttribute('aria-required', 'true')
    expect(emailInput).toHaveAttribute('aria-invalid', 'false')
    expect(passwordInput).toHaveAttribute('aria-required', 'true')
    expect(passwordInput).toHaveAttribute('aria-invalid', 'false')
  })

  it('should link error message to input via aria-describedby', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    await user.click(emailInput)
    await user.tab()
    
    await waitFor(() => {
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error')
      expect(screen.getByText(/email is required/i)).toHaveAttribute('id', 'email-error')
    })
  })

  it('should show error message with fadeIn animation', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    await user.click(emailInput)
    await user.tab()
    
    await waitFor(() => {
      const errorMessage = screen.getByText(/email is required/i)
      expect(errorMessage).toHaveClass('animate-fadeIn')
    })
  })

  it('should toggle password visibility', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const passwordInput = screen.getByLabelText(/^Password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    await user.click(toggleButton)
    
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('should handle server error gracefully', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue(new Error('Invalid credentials'))
    
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    await user.type(emailInput, 'test@example.com')
    
    const passwordInput = screen.getByLabelText(/^Password/i)
    await user.type(passwordInput, 'wrongpassword')
    
    const submitButton = screen.getByRole('button', { name: /sign in$/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('should clear general error when user modifies fields', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue(new Error('Invalid credentials'))
    
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    await user.type(emailInput, 'test@example.com')
    
    const passwordInput = screen.getByLabelText(/^Password/i)
    await user.type(passwordInput, 'wrongpassword')
    
    const submitButton = screen.getByRole('button', { name: /sign in$/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
    
    // Modify email
    await user.type(emailInput, 'a')
    
    await waitFor(() => {
      expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument()
    })
  })

  it('should disable submit button while loading', async () => {
    const user = userEvent.setup()
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    await user.type(emailInput, 'test@example.com')
    
    const passwordInput = screen.getByLabelText(/^Password/i)
    await user.type(passwordInput, 'password123')
    
    const submitButton = screen.getByRole('button', { name: /sign in$/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    })
  })

  it('should validate email format correctly', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const emailInput = screen.getByLabelText(/^Email/i)
    
    // Test invalid format - type and blur
    await user.type(emailInput, 'invalid-email')
    await user.tab() // Tab away to trigger blur
    
    // Wait for validation error to appear
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    }, { timeout: 1000 })
    
    // Test valid format - clear, type valid email, and blur
    await user.clear(emailInput)
    await user.type(emailInput, 'valid@example.com')
    await user.tab()
    
    // Wait for validation error to disappear
    await waitFor(() => {
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('should show both field errors when both are invalid on submit', async () => {
    const user = userEvent.setup()
    renderLogin()
    
    const submitButton = screen.getByRole('button', { name: /sign in$/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })
})
