import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DepartmentDetails from '@/pages/departments/DepartmentDetails';
import type { Department } from '@/types/department.types';

// Mock data
const mockDepartment: Department = {
  id: 'dept-1',
  organizationId: 'org-1',
  departmentCode: 'ENG',
  departmentName: 'Engineering',
  description: 'Engineering department handling all technical development',
  parentDepartmentId: null,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
};

const mockDepartmentWithParent: Department = {
  id: 'dept-2',
  organizationId: 'org-1',
  departmentCode: 'FE',
  departmentName: 'Frontend',
  description: 'Frontend development team',
  parentDepartmentId: 'dept-1',
  parentDepartment: {
    id: 'dept-1',
    organizationId: 'org-1',
    departmentCode: 'ENG',
    departmentName: 'Engineering',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
};

const mockInactiveDepartment: Department = {
  ...mockDepartment,
  id: 'dept-3',
  departmentCode: 'SALES',
  departmentName: 'Sales',
  isActive: false,
};

// MSW server setup
const server = setupServer(
  http.get('*/api/nexus/departments/:id', ({ params }) => {
    if (params.id === 'dept-1') {
      return HttpResponse.json(mockDepartment);
    }
    if (params.id === 'dept-2') {
      return HttpResponse.json(mockDepartmentWithParent);
    }
    if (params.id === 'dept-3') {
      return HttpResponse.json(mockInactiveDepartment);
    }
    if (params.id === 'not-found') {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(mockDepartment);
  }),

  http.delete('*/api/nexus/departments/:id', ({ params }) => {
    if (params.id === 'dept-1' || params.id === 'dept-2' || params.id === 'dept-3') {
      return new HttpResponse(null, { status: 204 });
    }
    return new HttpResponse(null, { status: 404 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Helper function to render with providers
function renderWithProviders(ui: React.ReactElement, initialRoute = '/departments/dept-1') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  window.history.pushState({}, '', initialRoute);

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/departments/:id" element={ui} />
          <Route path="/departments" element={<div>Departments List</div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('DepartmentDetails', () => {
  describe('Loading State', () => {
    it('should display loading spinner while fetching', () => {
      renderWithProviders(<DepartmentDetails />);

      const spinner = screen.getByLabelText('Loading department');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should display department name in header', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent('Engineering');
      });
    });

    it('should display department code', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText(/Department Code: ENG/)).toBeInTheDocument();
      });
    });

    it('should display active status badge', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        const badges = screen.getAllByText('Active');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should display inactive status badge for inactive department', async () => {
      renderWithProviders(<DepartmentDetails />, '/departments/dept-3');

      await waitFor(() => {
        const badges = screen.getAllByText('Inactive');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should display back button', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        const backButton = screen.getByLabelText('Back to departments');
        expect(backButton).toBeInTheDocument();
      });
    });

    it('should display edit button', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        const editButton = screen.getByRole('link', { name: /edit/i });
        expect(editButton).toBeInTheDocument();
        expect(editButton).toHaveAttribute('href', '/departments/dept-1/edit');
      });
    });

    it('should display delete button', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        expect(deleteButton).toBeInTheDocument();
      });
    });
  });

  describe('Department Information', () => {
    it('should display department information section', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText('Department Information')).toBeInTheDocument();
      });
    });

    it('should display department name field', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText('Department Name')).toBeInTheDocument();
        const values = screen.getAllByText('Engineering');
        expect(values.length).toBeGreaterThan(0);
      });
    });

    it('should display department code field', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText('Department Code')).toBeInTheDocument();
        const codes = screen.getAllByText('ENG');
        expect(codes.length).toBeGreaterThan(0);
      });
    });

    it('should display description when present', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Engineering department handling all technical development')).toBeInTheDocument();
      });
    });

    it('should not display description field when not present', async () => {
      server.use(
        http.get('*/api/nexus/departments/:id', () => {
          return HttpResponse.json({ ...mockDepartment, description: null });
        })
      );

      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText('Department Name')).toBeInTheDocument();
      });

      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });

    it('should display parent department link when present', async () => {
      renderWithProviders(<DepartmentDetails />, '/departments/dept-2');

      await waitFor(() => {
        expect(screen.getByText('Parent Department')).toBeInTheDocument();
        const parentLink = screen.getByRole('link', { name: 'Engineering' });
        expect(parentLink).toBeInTheDocument();
        expect(parentLink).toHaveAttribute('href', '/departments/dept-1');
      });
    });

    it('should not display parent department field when not present', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText('Department Name')).toBeInTheDocument();
      });

      expect(screen.queryByText('Parent Department')).not.toBeInTheDocument();
    });

    it('should display status field', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
        const statusValues = screen.getAllByText('Active');
        expect(statusValues.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Employees Section', () => {
    it('should display employees section', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText('Employees')).toBeInTheDocument();
      });
    });

    it('should display placeholder message', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText('Employee list coming soon')).toBeInTheDocument();
      });
    });
  });

  describe('Sub-Departments Section', () => {
    it('should display sub-departments section', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText('Sub-Departments')).toBeInTheDocument();
      });
    });

    it('should display placeholder message', async () => {
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText('Sub-departments list coming soon')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should open delete confirmation modal when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Department')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      });
    });

    it('should display department name in delete confirmation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Department')).toBeInTheDocument();
        // Check for the strong tag which only appears in the modal
        const modal = screen.getByText(/Are you sure you want to delete/).closest('div');
        expect(modal).toHaveTextContent('Engineering');
      });
    });

    it('should close modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Department')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Delete Department')).not.toBeInTheDocument();
      });
    });

    it('should show deleting state when delete is in progress', async () => {
      const user = userEvent.setup();
      
      // Delay the delete response
      server.use(
        http.delete('*/api/nexus/departments/:id', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return new HttpResponse(null, { status: 204 });
        })
      );

      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Department')).toBeInTheDocument();
      });

      const confirmButton = screen.getAllByRole('button', { name: /delete/i })[1];
      await user.click(confirmButton);

      // Should show deleting state briefly
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when department is not found', async () => {
      renderWithProviders(<DepartmentDetails />, '/departments/not-found');

      await waitFor(() => {
        expect(screen.getByText('Department Not Found')).toBeInTheDocument();
      });
    });

    it('should display error details for 404', async () => {
      renderWithProviders(<DepartmentDetails />, '/departments/not-found');

      await waitFor(() => {
        expect(screen.getByText(/doesn't exist or has been deleted/)).toBeInTheDocument();
      });
    });

    it('should display back to departments link in error state', async () => {
      renderWithProviders(<DepartmentDetails />, '/departments/not-found');

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back to departments/i });
        expect(backButton).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      server.use(
        http.get('*/api/nexus/departments/:id', () => {
          return HttpResponse.json(
            { message: 'Server error' },
            { status: 500 }
          );
        })
      );

      renderWithProviders(<DepartmentDetails />);

      await waitFor(() => {
        expect(screen.getByText('Department Not Found')).toBeInTheDocument();
      });
    });
  });
});
