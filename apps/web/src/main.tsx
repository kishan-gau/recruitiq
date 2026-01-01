import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@recruitiq/auth';

import App from './App';
import { ToastProvider } from './contexts/ToastContext';
import { queryClient } from './core/store/queryClient';
import ErrorBoundary from './shared/components/ui/ErrorBoundary';
import { registerServiceWorker } from './serviceWorker';
import './index.css';

// Register service worker for PWA functionality
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <App />
            </ToastProvider>
          </QueryClientProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
