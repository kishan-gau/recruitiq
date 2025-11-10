import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import WorkersList from '../../src/pages/schedulehub/WorkersList';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('WorkersList Integration', () => {
  it('renders workers list page', async () => {
    renderWithProviders(<WorkersList />);

    // Wait for async data to load
    await waitFor(() => {
      expect(screen.getByText('Workers')).toBeInTheDocument();
    });
    expect(screen.getByText('Manage your workforce and scheduling assignments')).toBeInTheDocument();
  });  it('displays workers in a table', async () => {
    renderWithProviders(<WorkersList />);

    await waitFor(() => {
      expect(screen.getByText('Employee #emp-1')).toBeInTheDocument();
    });

    expect(screen.getByText('Employee #emp-2')).toBeInTheDocument();
  });

  it('displays worker details correctly', async () => {
    renderWithProviders(<WorkersList />);

    await waitFor(() => {
      expect(screen.getByText('$25.00/hr')).toBeInTheDocument();
    });

    expect(screen.getByText('$30.00/hr')).toBeInTheDocument();
  });

  it('displays stats cards with worker counts', async () => {
    renderWithProviders(<WorkersList />);

    await waitFor(() => {
      expect(screen.getByText('Active Workers')).toBeInTheDocument();
    });

    expect(screen.getByText('Inactive Workers')).toBeInTheDocument();
    expect(screen.getByText('Total Workers')).toBeInTheDocument();
  });

  it('filters workers by status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkersList />);

    await waitFor(() => {
      expect(screen.getByText('Employee #emp-1')).toBeInTheDocument();
    });

    const statusFilter = screen.getByRole('combobox', { name: '' });
    await user.selectOptions(statusFilter, 'active');

    // Both workers are active, so they should still be visible
    expect(screen.getByText('Employee #emp-1')).toBeInTheDocument();
    expect(screen.getByText('Employee #emp-2')).toBeInTheDocument();
  });

  it('has search input field', async () => {
    renderWithProviders(<WorkersList />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search workers...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search workers...') as HTMLInputElement;
    expect(searchInput).toBeInTheDocument();
    expect(searchInput.type).toBe('text');
  });

  it('has "Add Worker" button linking to new worker form', async () => {
    renderWithProviders(<WorkersList />);

    await waitFor(() => {
      expect(screen.getByText('Add Worker')).toBeInTheDocument();
    });

    const addButton = screen.getByText('Add Worker').closest('a');
    expect(addButton).toHaveAttribute('href', '/schedulehub/workers/new');
  });

  it('has "View Details" links for each worker', async () => {
    renderWithProviders(<WorkersList />);

    await waitFor(() => {
      expect(screen.getAllByText('View Details')).toHaveLength(2);
    });

    const detailsLinks = screen.getAllByText('View Details');
    expect(detailsLinks[0].closest('a')).toHaveAttribute('href', '/schedulehub/workers/worker-1');
    expect(detailsLinks[1].closest('a')).toHaveAttribute('href', '/schedulehub/workers/worker-2');
  });

  it('displays worker status badges', async () => {
    renderWithProviders(<WorkersList />);

    await waitFor(() => {
      const statusBadges = screen.getAllByText('active');
      expect(statusBadges).toHaveLength(2);
    });
  });

  it('displays worker hire dates', async () => {
    renderWithProviders(<WorkersList />);

    await waitFor(() => {
      // Date format matches actual toLocaleDateString() output
      const expectedDate1 = new Date('2024-01-15').toLocaleDateString();
      const expectedDate2 = new Date('2024-02-01').toLocaleDateString();
      expect(screen.getByText(expectedDate1)).toBeInTheDocument();
      expect(screen.getByText(expectedDate2)).toBeInTheDocument();
    });
  });

  it('displays total worker count in stats', async () => {
    renderWithProviders(<WorkersList />);

    await waitFor(() => {
      const totalElements = screen.getAllByText('2');
      expect(totalElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
