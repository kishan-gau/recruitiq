import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import EmployeesList from '../../src/pages/employees/EmployeesList';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock data
const mockEmployees = [
  {
    id: '1',
    employeeNumber: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    jobTitle: 'Software Engineer',
    employmentStatus: 'active',
    employmentType: 'full_time',
    hireDate: '2024-01-15',
    department: { id: 'dept-1', departmentName: 'Engineering' },
    location: { id: 'loc-1', locationName: 'New York' },
  },
  {
    id: '2',
    employeeNumber: 'EMP002',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    jobTitle: 'Product Manager',
    employmentStatus: 'active',
    employmentType: 'full_time',
    hireDate: '2024-02-01',
    department: { id: 'dept-2', departmentName: 'Product' },
    location: { id: 'loc-1', locationName: 'New York' },
  },
  {
    id: '3',
    employeeNumber: 'EMP003',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@example.com',
    jobTitle: 'Designer',
    employmentStatus: 'on_leave',
    employmentType: 'part_time',
    hireDate: '2024-03-01',
    department: { id: 'dept-3', departmentName: 'Design' },
    location: { id: 'loc-2', locationName: 'San Francisco' },
  },
];

// MSW server setup
const server = setupServer(
  http.get('/api/nexus/employees', () => {
    return HttpResponse.json({
      data: mockEmployees,
      total: mockEmployees.length,
      page: 1,
      limit: 50,
    });
  }),
  http.delete('/api/nexus/employees/:id', () => {
    return new HttpResponse(null, { status: 204 });
  })
);

beforeEach(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// Test wrapper with all providers
function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>{component}</ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('EmployeesList', () => {
  it('renders the employees list page with header', async () => {
    renderWithProviders(<EmployeesList />);

    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by name, email, or employee number/i)).toBeInTheDocument();
    expect(screen.getByText('Add Employee')).toBeInTheDocument();
  });

  it('displays loading spinner while fetching data', () => {
    renderWithProviders(<EmployeesList />);
    
    // Should show loading initially
    expect(screen.getByLabelText(/loading employees/i)).toBeInTheDocument();
  });

  it('displays employees after data is loaded', async () => {
    renderWithProviders(<EmployeesList />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    expect(screen.getByText('#EMP001')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
  });

  it('displays correct status badges', async () => {
    renderWithProviders(<EmployeesList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Check status badges
    const activeBadges = screen.getAllByText('active');
    expect(activeBadges.length).toBeGreaterThan(0);
    
    const onLeaveBadge = screen.getByText('on leave');
    expect(onLeaveBadge).toBeInTheDocument();
  });

  it('displays employment type badges', async () => {
    renderWithProviders(<EmployeesList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const fullTimeBadges = screen.getAllByText('full time');
    expect(fullTimeBadges.length).toBeGreaterThan(0);

    const partTimeBadge = screen.getByText('part time');
    expect(partTimeBadge).toBeInTheDocument();
  });

  it('filters employees by search query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeesList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/search by name, email, or employee number/i);
    await user.type(searchInput, 'Jane');

    // Should show only Jane Smith
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });
  });

  it('clears search when input is cleared', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeesList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Search for something
    const searchInput = screen.getByPlaceholderText(/search by name, email, or employee number/i);
    await user.type(searchInput, 'Jane');

    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    // Clear search
    await user.clear(searchInput);

    // All employees should be visible again
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });
  });

  it('shows total employee count', async () => {
    renderWithProviders(<EmployeesList />);

    await waitFor(() => {
      expect(screen.getByText(/3 employees/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no employees exist', async () => {
    // Override the handler to return empty array
    server.use(
      http.get('/api/nexus/employees', () => {
        return HttpResponse.json({
          data: [],
          total: 0,
          page: 1,
          limit: 50,
        });
      })
    );

    renderWithProviders(<EmployeesList />);

    await waitFor(() => {
      expect(screen.getByText(/no employees found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/get started by adding your first employee/i)).toBeInTheDocument();
  });

  it('displays error message when API fails', async () => {
    // Override the handler to return error
    server.use(
      http.get('/api/nexus/employees', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderWithProviders(<EmployeesList />);

    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
    });
  });

  it('has accessible table with proper headers', async () => {
    renderWithProviders(<EmployeesList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Check for table headers
    expect(screen.getByText('Employee')).toBeInTheDocument();
    expect(screen.getByText('Job Title')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('shows correct employee avatars', async () => {
    renderWithProviders(<EmployeesList />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Should have avatar placeholders with initials
    const avatars = screen.getAllByText('JD');
    expect(avatars.length).toBeGreaterThan(0);
  });
});
