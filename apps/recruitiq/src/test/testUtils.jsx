import React from 'react'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { WorkspaceProvider } from '../context/WorkspaceContext'
import { DataProvider } from '../context/DataContext'
import { ToastProvider } from '../context/ToastContext'

// Mock workspace data
const mockWorkspace = {
  currentWorkspace: { id: '1', name: 'Test Workspace' },
  workspaces: [{ id: '1', name: 'Test Workspace' }],
  switchWorkspace: () => {},
  loading: false
}

// Custom render that includes all necessary providers
export function renderWithProviders(ui, { workspace = mockWorkspace, ...options } = {}) {
  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <WorkspaceProvider value={workspace}>
          <DataProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </DataProvider>
        </WorkspaceProvider>
      </BrowserRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { renderWithProviders as render }
