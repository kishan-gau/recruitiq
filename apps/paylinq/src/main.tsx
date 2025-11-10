import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
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

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
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
