import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { test, expect, vi } from 'vitest'
import Layout from './Layout'
import { MemoryRouter } from 'react-router-dom'
import { DataProvider } from '../context/DataContext'

// Mock WorkspaceContext
vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    currentWorkspace: { id: '1', name: 'Test Workspace', color: 'blue' },
    workspaces: [{ id: '1', name: 'Test Workspace', color: 'blue' }],
    switchWorkspace: vi.fn(),
    loading: false,
    getWorkspaceColor: (color) => color || 'blue'
  })
}))

// Mock AuthContext
vi.mock('@recruitiq/auth', () => ({
  useAuth: () => ({
    user: { name: 'Test User', email: 'test@example.com' },
    logout: vi.fn(),
    isAuthenticated: true,
    isLoading: false
  })
}))

test('search icon toggles inline input', ()=>{
  render(
    <MemoryRouter>
      <DataProvider>
        <Layout><div>Content</div></Layout>
      </DataProvider>
    </MemoryRouter>
  )
  // Use more specific aria-label to find the header search button
  const btn = screen.getByRole('button', { name: /Search \(press \/\)/i })
  expect(btn).toBeTruthy()
  fireEvent.click(btn)
  const input = screen.getByPlaceholderText(/Search people or jobs.../i)
  expect(input).toBeTruthy()
})
