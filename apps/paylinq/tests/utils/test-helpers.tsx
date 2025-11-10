import { ReactElement } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../src/contexts/ThemeContext';
import { ToastProvider } from '../../src/contexts/ToastContext';

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface RenderOptions {
  queryClient?: QueryClient;
  initialData?: Record<string, any>;
}

/**
 * Custom render function that wraps components with all providers
 * @param ui - The React element to render
 * @param options - Optional configuration including queryClient and initialData
 */
export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const { queryClient, initialData } = options;
  const testQueryClient = queryClient || createTestQueryClient();

  // Pre-populate cache with initial data if provided
  if (initialData) {
    Object.entries(initialData).forEach(([key, data]) => {
      testQueryClient.setQueryData(JSON.parse(key), data);
    });
  }

  return rtlRender(
    <BrowserRouter>
      <QueryClientProvider client={testQueryClient}>
        <ThemeProvider>
          <ToastProvider>{ui}</ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { renderWithProviders as render };
