import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScheduleHubDashboard from '../../src/pages/schedulehub/ScheduleHubDashboard';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ScheduleHub Quick Actions', () => {
  it('renders all 4 quick action buttons', async () => {
    renderWithProviders(<ScheduleHubDashboard />);

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    // Check all quick actions are present
    expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    expect(screen.getByText('Manage Workers')).toBeInTheDocument();
    expect(screen.getByText('Time Off Requests')).toBeInTheDocument();
    expect(screen.getByText('Shift Swaps')).toBeInTheDocument();
  });

  it('has correct links for each quick action', async () => {
    renderWithProviders(<ScheduleHubDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    });

    const createScheduleLink = screen.getByText('Create Schedule').closest('a');
    const manageWorkersLink = screen.getByText('Manage Workers').closest('a');
    const timeOffLink = screen.getByText('Time Off Requests').closest('a');
    const shiftSwapsLink = screen.getByText('Shift Swaps').closest('a');

    expect(createScheduleLink).toHaveAttribute('href', '/schedulehub/schedules/create');
    expect(manageWorkersLink).toHaveAttribute('href', '/schedulehub/workers');
    expect(timeOffLink).toHaveAttribute('href', '/schedulehub/time-off');
    expect(shiftSwapsLink).toHaveAttribute('href', '/schedulehub/shift-swaps');
  });

  it('displays proper descriptions for quick actions', async () => {
    renderWithProviders(<ScheduleHubDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Build a new work schedule')).toBeInTheDocument();
    });

    expect(screen.getByText('View and edit workforce')).toBeInTheDocument();
    expect(screen.getByText('Review pending requests')).toBeInTheDocument();
    expect(screen.getByText('Manage shift marketplace')).toBeInTheDocument();
  });

  it('applies proper styling to quick action cards', async () => {
    renderWithProviders(<ScheduleHubDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    });

    const createScheduleCard = screen.getByText('Create Schedule').closest('a');
    expect(createScheduleCard).toHaveClass('group');
    
    // Verify hover classes are present
    expect(createScheduleCard?.className).toContain('hover:shadow-md');
    expect(createScheduleCard?.className).toContain('hover:border-blue-500');
  });

  it('displays quick action icons', async () => {
    renderWithProviders(<ScheduleHubDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    });

    // All quick action cards should have icons (lucide-react)
    const quickActionLinks = [
      screen.getByText('Create Schedule').closest('a'),
      screen.getByText('Manage Workers').closest('a'),
      screen.getByText('Time Off Requests').closest('a'),
      screen.getByText('Shift Swaps').closest('a'),
    ];

    quickActionLinks.forEach(link => {
      expect(link?.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('displays color-coded icons for each action', async () => {
    renderWithProviders(<ScheduleHubDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    });

    // Each action should have its colored icon container
    const createScheduleCard = screen.getByText('Create Schedule').closest('a');
    const iconContainer = createScheduleCard?.querySelector('.bg-blue-500');
    expect(iconContainer).toBeInTheDocument();

    const manageWorkersCard = screen.getByText('Manage Workers').closest('a');
    const workersIconContainer = manageWorkersCard?.querySelector('.bg-green-500');
    expect(workersIconContainer).toBeInTheDocument();

    const timeOffCard = screen.getByText('Time Off Requests').closest('a');
    const timeOffIconContainer = timeOffCard?.querySelector('.bg-purple-500');
    expect(timeOffIconContainer).toBeInTheDocument();

    const shiftSwapsCard = screen.getByText('Shift Swaps').closest('a');
    const swapsIconContainer = shiftSwapsCard?.querySelector('.bg-orange-500');
    expect(swapsIconContainer).toBeInTheDocument();
  });
});
