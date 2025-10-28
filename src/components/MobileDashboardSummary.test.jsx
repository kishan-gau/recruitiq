import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MobileDashboardSummary from './MobileDashboardSummary'
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

describe('MobileDashboardSummary (snapshot)', ()=>{
  it('renders compact summary', ()=>{
    const { container } = render(
      <MemoryRouter>
        <DataProvider>
          <MobileDashboardSummary />
        </DataProvider>
      </MemoryRouter>
    )
    // confirm a key label from the mobile summary is present
    const label = container.querySelector('div')
    expect(container.textContent).toContain('Open roles')
  })
})
