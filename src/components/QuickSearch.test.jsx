import React from 'react'
import { render, screen } from '@testing-library/react'
import { test, expect, vi } from 'vitest'
import QuickSearch from './QuickSearch'
import { DataProvider } from '../context/DataContext'
import { MemoryRouter } from 'react-router-dom'

// Mock WorkspaceContext
vi.mock('../context/WorkspaceContext', () => ({
  useWorkspace: () => ({
    currentWorkspace: { id: '1', name: 'Test Workspace' },
    workspaces: [{ id: '1', name: 'Test Workspace' }],
    switchWorkspace: vi.fn(),
    loading: false
  })
}))

test('QuickSearch renders and shows input when open', ()=>{
  render(
    <MemoryRouter>
      <DataProvider>
        <QuickSearch open={true} onClose={()=>{}} />
      </DataProvider>
    </MemoryRouter>
  )
  const input = screen.getByPlaceholderText(/Search people or jobs.../i)
  expect(input).toBeTruthy()
})
