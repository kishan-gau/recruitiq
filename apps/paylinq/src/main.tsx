import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { isAuthError, isPermissionError } from '@/utils/errorHandler';
import App from './App';
import './index.css';

// Track page loads to detect reload loops (persists across reloads)
const loadCount = parseInt(sessionStorage.getItem('pageLoadCount') || '0') + 1;
sessionStorage.setItem('pageLoadCount', loadCount.toString());
console.log(`🔄 [main.tsx] PAGE LOAD #${loadCount}`);
console.log('[main.tsx] Timestamp:', new Date().toISOString());

if (loadCount > 3) {
  console.error('⚠️ WARNING: Page has reloaded', loadCount, 'times! This indicates a reload loop.');
}

// Create a query client for React Query with smart retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors - user needs to log in again
        if (isAuthError(error)) {
          return false;
        }
        // Don't retry on permission errors - user lacks access
        if (isPermissionError(error)) {
          return false;
        }
        // Don't retry on 404s - these are expected when resources don't exist
        if (error?.response?.status === 404) {
          return false;
        }
        // Retry other errors once
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false, // Never retry mutations
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </AuthProvider>
);
