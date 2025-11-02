import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MobileQuickResults from './MobileQuickResults'
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

describe('MobileQuickResults (smoke)', ()=>{
  it('renders quick search page', ()=>{
    const { getByRole } = render(
      <MemoryRouter>
        <DataProvider>
          <MobileQuickResults />
        </DataProvider>
      </MemoryRouter>
    )
    // QuickSearch contains an input when open
    const textbox = getByRole('textbox')
    expect(textbox).toBeTruthy()
  })
})
