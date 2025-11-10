import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import EmployeeDetails from '../../src/pages/employees/EmployeeDetails';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock data
const mockEmployee = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  organizationId: 'org-123',
  employeeNumber: 'EMP001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  mobilePhone: '+1987654321',
  jobTitle: 'Senior Software Engineer',
  employmentStatus: 'active',
  employmentType: 'full_time',
  hireDate: '2024-01-15',
  dateOfBirth: '1990-05-20',
  gender: 'male',
  nationality: 'American',
  addressLine1: '123 Main St',
  addressLine2: 'Apt 4B',
  city: 'New York',
  stateProvince: 'NY',
  postalCode: '10001',
  country: 'USA',
  emergencyContactName: 'Jane Doe',
  emergencyContactRelationship: 'Spouse',
  emergencyContactPhone: '+1555555555',
  bio: 'Experienced software engineer with a passion for building great products.',
  skills: ['React', 'TypeScript', 'Node.js'],
  workSchedule: 'Mon-Fri 9-5',
  ftePercentage: 100,
  department: { id: 'dept-1', departmentName: 'Engineering' },
  location: { id: 'loc-1', locationName: 'New York Office' },
  manager: { id: 'mgr-1', firstName: 'Alice', lastName: 'Manager' },
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

// MSW server setup
const server = setupServer(
  http.get('/api/nexus/employees/:id', ({ params }) => {
    if (params.id === mockEmployee.id) {
      return HttpResponse.json(mockEmployee);
    }
    return new HttpResponse(null, { status: 404 });
  }),
  http.post('/api/nexus/employees/:id/terminate', () => {
    return HttpResponse.json({ ...mockEmployee, employmentStatus: 'terminated' });
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
function renderWithProviders(component: React.ReactElement, initialRoute = `/employees/${mockEmployee.id}`) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  window.history.pushState({}, 'Test page', initialRoute);

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <Routes>
            <Route path="/employees/:id" element={component} />
          </Routes>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('EmployeeDetails', () => {
  it('renders loading state initially', () => {
    renderWithProviders(<EmployeeDetails />);
    expect(screen.getByLabelText(/loading employee/i)).toBeInTheDocument();
  });

  it('displays employee header information', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Use getAllByText for elements that appear multiple times
    expect(screen.getAllByText('Senior Software Engineer').length).toBeGreaterThan(0);
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getAllByText('john.doe@example.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+1234567890').length).toBeGreaterThan(0);
    expect(screen.getByText('#EMP001')).toBeInTheDocument();
  });

  it('displays avatar with initials when no photo provided', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  it('displays all tab options', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
    expect(screen.getByText('Employment')).toBeInTheDocument();
    expect(screen.getByText('Contracts')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Time Off')).toBeInTheDocument();
  });

  it('displays overview tab by default', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('Employment Information')).toBeInTheDocument();
    });

    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
  });

  it('displays employment information correctly', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('Employment Information')).toBeInTheDocument();
    });

    // Use getAllByText for elements that appear multiple times
    expect(screen.getAllByText('Senior Software Engineer').length).toBeGreaterThan(0);
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('New York Office')).toBeInTheDocument();
    expect(screen.getByText('full time')).toBeInTheDocument();
    expect(screen.getByText('Alice Manager')).toBeInTheDocument();
  });

  it('displays contact information correctly', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
    });

    // Use getAllByText for elements that appear multiple times
    expect(screen.getAllByText('john.doe@example.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+1234567890').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+1987654321').length).toBeGreaterThan(0);
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Apt 4B')).toBeInTheDocument();
    expect(screen.getByText(/New York.*NY.*10001/)).toBeInTheDocument();
    expect(screen.getByText('USA')).toBeInTheDocument();
  });

  it('displays emergency contact information', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
    });

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Spouse')).toBeInTheDocument();
    expect(screen.getByText('+1555555555')).toBeInTheDocument();
  });

  it('displays bio and skills', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText(/Experienced software engineer/i)).toBeInTheDocument();
    });

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('switches to personal info tab when clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const personalInfoTab = screen.getByText('Personal Info');
    await user.click(personalInfoTab);

    await waitFor(() => {
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
    });

    expect(screen.getByText('American')).toBeInTheDocument();
  });

  it('switches to employment tab when clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const employmentTab = screen.getByText('Employment');
    await user.click(employmentTab);

    await waitFor(() => {
      expect(screen.getByText('Employment Details')).toBeInTheDocument();
    });

    expect(screen.getByText('EMP001')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows terminate button for active employees', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Terminate')).toBeInTheDocument();
  });

  it('does not show terminate button for terminated employees', async () => {
    const terminatedEmployee = { ...mockEmployee, employmentStatus: 'terminated' };
    
    server.use(
      http.get('/api/nexus/employees/:id', () => {
        return HttpResponse.json(terminatedEmployee);
      })
    );

    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.queryByText('Terminate')).not.toBeInTheDocument();
  });

  it('opens terminate modal when terminate button clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const terminateButton = screen.getByText('Terminate');
    await user.click(terminateButton);

    await waitFor(() => {
      expect(screen.getByText('Terminate Employee')).toBeInTheDocument();
    });

    expect(screen.getByText(/Are you sure you want to terminate John Doe/i)).toBeInTheDocument();
  });

  it('closes terminate modal when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open modal
    const terminateButton = screen.getByText('Terminate');
    await user.click(terminateButton);

    await waitFor(() => {
      expect(screen.getByText('Terminate Employee')).toBeInTheDocument();
    });

    // Close modal
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Terminate Employee')).not.toBeInTheDocument();
    });
  });

  it('shows edit employee button', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Edit Employee')).toBeInTheDocument();
  });

  it('shows back to employees button', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(screen.getByText('Back to Employees')).toBeInTheDocument();
  });

  it('displays error when employee not found', async () => {
    server.use(
      http.get('/api/nexus/employees/:id', () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('Employee Not Found')).toBeInTheDocument();
    });

    // Error message is "Not Found" from the error response
    expect(screen.getByText('Not Found')).toBeInTheDocument();
    expect(screen.getByText('← Back to Employees')).toBeInTheDocument();
  });

  it('displays placeholder content for contracts tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const contractsTab = screen.getByText('Contracts');
    await user.click(contractsTab);

    await waitFor(() => {
      expect(screen.getByText('Contract management coming soon')).toBeInTheDocument();
    });
  });

  it('displays placeholder content for performance tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const performanceTab = screen.getByText('Performance');
    await user.click(performanceTab);

    await waitFor(() => {
      expect(screen.getByText('Performance tracking coming soon')).toBeInTheDocument();
    });
  });

  it('displays placeholder content for time off tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const timeOffTab = screen.getByText('Time Off');
    await user.click(timeOffTab);

    await waitFor(() => {
      expect(screen.getByText('Time off tracking coming soon')).toBeInTheDocument();
    });
  });

  it('displays hire date in overview section', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('Hire Date')).toBeInTheDocument();
    });

    // Verify the Overview section displays hire date label
    expect(screen.getByText('Employment Information')).toBeInTheDocument();
  });

  it('handles missing optional fields gracefully', async () => {
    const minimalEmployee = {
      ...mockEmployee,
      phone: null,
      mobilePhone: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      emergencyContactName: null,
      bio: null,
      skills: null,
      manager: null,
    };

    server.use(
      http.get('/api/nexus/employees/:id', () => {
        return HttpResponse.json(minimalEmployee);
      })
    );

    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Should render without crashing
    expect(screen.getByText('Employment Information')).toBeInTheDocument();
  });

  it('displays correct status badge color for active status', async () => {
    renderWithProviders(<EmployeeDetails />);

    await waitFor(() => {
      const statusBadge = screen.getByText('active');
      expect(statusBadge).toHaveClass('bg-green-100');
    });
  });
});
