import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAuthError, isPermissionError } from './utils/errorHandler'
import App from './App'
import './index.css'
import { AuthProvider } from '@recruitiq/auth'
import { OrganizationProvider } from './context/OrganizationContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import { FlowProvider } from './context/FlowContext'
import Sprite from './components/icons/Sprite'

// Create React Query client with smart retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data fresh for 5 min
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
      retry: (failureCount, error) => {
        // Don't retry on auth errors - user needs to log in again
        if (isAuthError(error)) {
          return false;
        }
        // Don't retry on permission errors - user lacks access
        if (isPermissionError(error)) {
          return false;
        }
        // Retry other errors once
        return failureCount < 1;
      },
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true, // Refetch on network reconnect
    },
    mutations: {
      retry: false, // Never retry mutations
    }
  }
})

// apply persisted theme on startup
try{
  const t = localStorage.getItem('recruitiq_theme')
  if(t === 'dark') document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
}catch(e){}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <OrganizationProvider>
            <WorkspaceProvider>
              <DataProvider>
                <FlowProvider>
                  <ToastProvider>
                    <Sprite />
                    <App />
                  </ToastProvider>
                </FlowProvider>
              </DataProvider>
            </WorkspaceProvider>
          </OrganizationProvider>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
