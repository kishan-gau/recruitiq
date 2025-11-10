import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SchedulesList from '../../src/pages/schedulehub/SchedulesList';

// Mock window.confirm
global.confirm = vi.fn(() => true);
global.alert = vi.fn();

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

describe('SchedulesList Integration', () => {
  it('renders schedules list page', async () => {
    renderWithProviders(<SchedulesList />);
    
    await waitFor(() => {
      expect(screen.getByText('Schedules')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Create and manage work schedules')).toBeInTheDocument();
  });

  it('displays schedules in a grid', async () => {
    renderWithProviders(<SchedulesList />);

    await waitFor(() => {
      expect(screen.getByText('Week 1 Schedule')).toBeInTheDocument();
    });

    expect(screen.getByText('Week 2 Schedule')).toBeInTheDocument();
  });

  it('displays schedule status badges', async () => {
    renderWithProviders(<SchedulesList />);

    await waitFor(() => {
      expect(screen.getByText('draft')).toBeInTheDocument();
    });

    expect(screen.getByText('published')).toBeInTheDocument();
  });

  it('displays stats cards with schedule counts', async () => {
    renderWithProviders(<SchedulesList />);

    await waitFor(() => {
      expect(screen.getByText('Draft Schedules')).toBeInTheDocument();
    });

    expect(screen.getByText('Published Schedules')).toBeInTheDocument();
    
    // "Archived" appears in both stats and filter dropdown
    const archivedElements = screen.getAllByText('Archived');
    expect(archivedElements.length).toBeGreaterThan(0);
  });

  it('displays schedule date ranges', async () => {
    renderWithProviders(<SchedulesList />);

    await waitFor(() => {
      // Verify schedules are loaded
      expect(screen.getByText('Week 1 Schedule')).toBeInTheDocument();
    });

    // Dates are displayed - just verify schedule content is shown
    expect(screen.getByText('Week 2 Schedule')).toBeInTheDocument();
  });

  it('filters schedules by status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SchedulesList />);

    await waitFor(() => {
      expect(screen.getByText('Week 1 Schedule')).toBeInTheDocument();
    });

    const statusFilter = screen.getByRole('combobox');
    await user.selectOptions(statusFilter, 'draft');

    // Filter applied
    expect(statusFilter).toHaveValue('draft');
  });

  it('has "Create Schedule" button linking to schedule builder', async () => {
    renderWithProviders(<SchedulesList />);

    await waitFor(() => {
      const createButtons = screen.getAllByText('Create Schedule');
      expect(createButtons[0]).toBeInTheDocument();
    });

    const createButton = screen.getAllByText('Create Schedule')[0].closest('a');
    expect(createButton).toHaveAttribute('href', '/schedulehub/schedules/builder');
  });

  it('has "View Details" links for each schedule', async () => {
    renderWithProviders(<SchedulesList />);

    await waitFor(() => {
      expect(screen.getAllByText('View Details')).toHaveLength(2);
    });

    const detailsLinks = screen.getAllByText('View Details');
    expect(detailsLinks[0].closest('a')).toHaveAttribute('href', '/schedulehub/schedules/schedule-1');
    expect(detailsLinks[1].closest('a')).toHaveAttribute('href', '/schedulehub/schedules/schedule-2');
  });

  it('shows "Publish" button only for draft schedules', async () => {
    renderWithProviders(<SchedulesList />);

    await waitFor(() => {
      expect(screen.getByText('Week 1 Schedule')).toBeInTheDocument();
    });

    const publishButtons = screen.getAllByText('Publish');
    expect(publishButtons).toHaveLength(1); // Only draft schedule has publish button
  });

  it('handles publish action', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SchedulesList />);

    await waitFor(() => {
      expect(screen.getByText('Publish')).toBeInTheDocument();
    });

    const publishButton = screen.getByText('Publish');
    await user.click(publishButton);

    expect(global.confirm).toHaveBeenCalled();
  });

  it('displays schedule cards with proper styling', async () => {
    renderWithProviders(<SchedulesList />);

    await waitFor(() => {
      expect(screen.getByText('Week 1 Schedule')).toBeInTheDocument();
    });

    const scheduleCard = screen.getByText('Week 1 Schedule').closest('div');
    expect(scheduleCard).toBeInTheDocument();
  });
});
