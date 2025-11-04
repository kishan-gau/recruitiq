import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Profile from '../../pages/Profile'
import { BrowserRouter } from 'react-router-dom'

// Mock the AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
    isAuthenticated: true,
    isLoading: false
  })
}))

test('Profile theme toggle persists and applies class', ()=>{
  // ensure no theme initially
  localStorage.removeItem('recruitiq_theme')
  render(<BrowserRouter><Profile /></BrowserRouter>)
  
  // Check initial state
  expect(screen.getByText(/Current:/)).toBeInTheDocument()
  expect(screen.getByText(/light/)).toBeInTheDocument()
  expect(localStorage.getItem('recruitiq_theme')).toBe('light')
  
  // Click the toggle button
  const toggleButton = screen.getByRole('button', { name: '' })
  fireEvent.click(toggleButton)
  
  // Verify theme changed to dark
  expect(localStorage.getItem('recruitiq_theme')).toBe('dark')
})
