import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ScheduleHubDashboard from '../../src/pages/schedulehub/ScheduleHubDashboard';

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

describe('ScheduleHubDashboard Integration', () => {
  it('displays dashboard content after loading', async () => {
    renderWithProviders(<ScheduleHubDashboard />);
    
    // Wait for data to load and dashboard to render
    await waitFor(() => {
      expect(screen.getByText('ScheduleHub')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Workforce scheduling and shift management')).toBeInTheDocument();
  });

  it('displays stats cards with mock data', async () => {
    renderWithProviders(<ScheduleHubDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Active Workers')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    expect(screen.getByText('Published Schedules')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    
    expect(screen.getByText('Pending Requests')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    
    expect(screen.getByText('Open Shifts')).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
  });

  it('displays quick action cards', async () => {
    renderWithProviders(<ScheduleHubDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    });

    expect(screen.getByText('Manage Workers')).toBeInTheDocument();
    expect(screen.getByText('Time Off Requests')).toBeInTheDocument();
    expect(screen.getByText('Shift Swaps')).toBeInTheDocument();
  });

  it('displays recent activity sections', async () => {
    renderWithProviders(<ScheduleHubDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Upcoming Shifts')).toBeInTheDocument();
    });

    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
  });

  it('navigates to correct pages when action cards are clicked', async () => {
    renderWithProviders(<ScheduleHubDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create Schedule')).toBeInTheDocument();
    });

    const createScheduleLink = screen.getByText('Create Schedule').closest('a');
    expect(createScheduleLink).toHaveAttribute('href', '/schedulehub/schedules/create');

    const manageWorkersLink = screen.getByText('Manage Workers').closest('a');
    expect(manageWorkersLink).toHaveAttribute('href', '/schedulehub/workers');

    const timeOffLink = screen.getByText('Time Off Requests').closest('a');
    expect(timeOffLink).toHaveAttribute('href', '/schedulehub/time-off');

    const shiftSwapsLink = screen.getByText('Shift Swaps').closest('a');
    expect(shiftSwapsLink).toHaveAttribute('href', '/schedulehub/shift-swaps');
  });
});
