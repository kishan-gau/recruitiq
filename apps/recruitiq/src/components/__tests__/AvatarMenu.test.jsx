import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import AvatarMenu from '../../components/AvatarMenu'
import { BrowserRouter } from 'react-router-dom'

// Mock the AuthContext
vi.mock('@recruitiq/auth', () => ({
  useAuth: () => ({
    user: { name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
    isAuthenticated: true,
    isLoading: false
  })
}))

test('AvatarMenu opens and has profile and logout', ()=>{
  render(<BrowserRouter><AvatarMenu /></BrowserRouter>)
  const btn = screen.getByRole('button')
  // open by clicking the button
  fireEvent.click(btn)
  expect(screen.getByText(/Profile/)).toBeTruthy()
  expect(screen.getByText(/Sign Out/)).toBeTruthy()
  // navigate with ArrowDown
  fireEvent.keyDown(document, { key: 'ArrowDown' })
  // close with Escape
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByText(/Profile/)).toBeNull()
})
