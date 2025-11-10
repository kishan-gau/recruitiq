import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import DepartmentsList from '@/pages/departments/DepartmentsList';
import type { Department } from '@/types/department.types';

// Mock data
const mockDepartments: Department[] = [
  {
    id: 'dept-1',
    organizationId: 'org-1',
    departmentCode: 'ENG',
    departmentName: 'Engineering',
    description: 'Engineering department',
    parentDepartmentId: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
  {
    id: 'dept-2',
    organizationId: 'org-1',
    departmentCode: 'HR',
    departmentName: 'Human Resources',
    description: 'HR department',
    parentDepartmentId: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
  {
    id: 'dept-3',
    organizationId: 'org-1',
    departmentCode: 'FE',
    departmentName: 'Frontend',
    description: 'Frontend team',
    parentDepartmentId: 'dept-1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
  {
    id: 'dept-4',
    organizationId: 'org-1',
    departmentCode: 'BE',
    departmentName: 'Backend',
    description: 'Backend team',
    parentDepartmentId: 'dept-1',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
  {
    id: 'dept-5',
    organizationId: 'org-1',
    departmentCode: 'SALES',
    departmentName: 'Sales',
    description: 'Sales department',
    parentDepartmentId: null,
    isActive: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
];

// MSW server setup
const server = setupServer(
  http.get('*/api/nexus/departments', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const isActive = url.searchParams.get('isActive');

    let filtered = [...mockDepartments];

    if (search) {
      filtered = filtered.filter((d) =>
        d.departmentName.toLowerCase().includes(search.toLowerCase()) ||
        d.departmentCode.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (isActive === 'false') {
      filtered = filtered.filter((d) => d.isActive);
    }

    return HttpResponse.json(filtered);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Helper function to render with providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('DepartmentsList', () => {
  describe('Loading State', () => {
    it('should display loading spinner initially', () => {
      renderWithProviders(<DepartmentsList />);

      const spinner = screen.getByLabelText('Loading departments');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should display page title and description', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('Departments')).toBeInTheDocument();
      });

      expect(screen.getByText('Manage organizational departments and hierarchy')).toBeInTheDocument();
    });

    it('should display Add Department button', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        const addButton = screen.getByRole('link', { name: /add department/i });
        expect(addButton).toBeInTheDocument();
        expect(addButton).toHaveAttribute('href', '/departments/create');
      });
    });
  });

  describe('Search and Filters', () => {
    it('should display search input', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search departments...')).toBeInTheDocument();
      });
    });

    it('should filter departments by search query', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
        expect(screen.getByText('Human Resources')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search departments...');
      await user.clear(searchInput);
      await user.type(searchInput, 'Frontend');

      // Wait for HR to disappear and only Frontend to show
      await waitFor(() => {
        expect(screen.getByText('Frontend')).toBeInTheDocument();
        expect(screen.queryByText('Human Resources')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display active only filter checkbox', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByLabelText('Active only')).toBeInTheDocument();
      });
    });

    it('should filter to show only active departments when checkbox is checked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('Sales')).toBeInTheDocument();
      });

      const activeOnlyCheckbox = screen.getByLabelText('Active only');
      await user.click(activeOnlyCheckbox);

      await waitFor(() => {
        expect(screen.queryByText('Sales')).not.toBeInTheDocument();
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });
    });
  });

  describe('Department List Display', () => {
    it('should display all departments', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
        expect(screen.getByText('Human Resources')).toBeInTheDocument();
        expect(screen.getByText('Frontend')).toBeInTheDocument();
        expect(screen.getByText('Backend')).toBeInTheDocument();
        expect(screen.getByText('Sales')).toBeInTheDocument();
      });
    });

    it('should display department codes', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('ENG')).toBeInTheDocument();
        expect(screen.getByText('HR')).toBeInTheDocument();
        expect(screen.getByText('FE')).toBeInTheDocument();
        expect(screen.getByText('BE')).toBeInTheDocument();
      });
    });

    it('should display department descriptions', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('Engineering department')).toBeInTheDocument();
        expect(screen.getByText('HR department')).toBeInTheDocument();
      });
    });

    it('should display inactive badge for inactive departments', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        const salesDept = screen.getByText('Sales').closest('a');
        expect(salesDept).toBeInTheDocument();
        expect(within(salesDept!).getByText('Inactive')).toBeInTheDocument();
      });
    });

    it('should not display inactive badge for active departments', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        const engDept = screen.getByText('Engineering').closest('a');
        expect(engDept).toBeInTheDocument();
        expect(within(engDept!).queryByText('Inactive')).not.toBeInTheDocument();
      });
    });

    it('should display department icons', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        // Lucide icons render as SVG elements
        const icons = document.querySelectorAll('svg');
        expect(icons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Hierarchy Display', () => {
    it('should display root departments at top level', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        // Engineering, HR, and Sales should be at root level
        expect(screen.getByText('Engineering')).toBeInTheDocument();
        expect(screen.getByText('Human Resources')).toBeInTheDocument();
        expect(screen.getByText('Sales')).toBeInTheDocument();
      });
    });

    it('should display child departments indented under parent', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        const frontend = screen.getByText('Frontend').closest('div');
        const backend = screen.getByText('Backend').closest('div');
        
        // Child departments should have padding-left style for indentation
        expect(frontend).toHaveStyle({ paddingLeft: expect.stringMatching(/rem/) });
        expect(backend).toHaveStyle({ paddingLeft: expect.stringMatching(/rem/) });
      });
    });

    it('should display expand/collapse button for departments with children', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        const engDept = screen.getByText('Engineering').closest('a');
        const parent = engDept?.parentElement;
        
        // Should have a button for expand/collapse
        const button = parent?.querySelector('button');
        expect(button).toBeInTheDocument();
      });
    });

    it('should not display expand/collapse button for departments without children', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        const hrDept = screen.getByText('Human Resources').closest('a');
        const parent = hrDept?.parentElement;
        
        // HR has no children, so it should have an empty spacer div instead of button
        const spacer = parent?.querySelector('div.w-6');
        expect(spacer).toBeInTheDocument();
      });
    });

    it('should collapse child departments when clicking collapse button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('Frontend')).toBeInTheDocument();
        expect(screen.getByText('Backend')).toBeInTheDocument();
      });

      // Find and click the collapse button for Engineering department
      const engDept = screen.getByText('Engineering').closest('a');
      const parent = engDept?.parentElement;
      const collapseButton = parent?.querySelector('button');
      
      if (collapseButton) {
        await user.click(collapseButton);
        
        await waitFor(() => {
          // Children should be hidden
          expect(screen.queryByText('Frontend')).not.toBeInTheDocument();
          expect(screen.queryByText('Backend')).not.toBeInTheDocument();
        });
      }
    });

    it('should expand child departments when clicking expand button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('Frontend')).toBeInTheDocument();
      });

      // First collapse
      const engDept = screen.getByText('Engineering').closest('a');
      const parent = engDept?.parentElement;
      const button = parent?.querySelector('button');
      
      if (button) {
        await user.click(button); // Collapse
        
        await waitFor(() => {
          expect(screen.queryByText('Frontend')).not.toBeInTheDocument();
        });

        await user.click(button); // Expand again
        
        await waitFor(() => {
          expect(screen.getByText('Frontend')).toBeInTheDocument();
          expect(screen.getByText('Backend')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Navigation', () => {
    it('should have links to department details pages', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        const engLink = screen.getByText('Engineering').closest('a');
        expect(engLink).toHaveAttribute('href', '/departments/dept-1');

        const hrLink = screen.getByText('Human Resources').closest('a');
        expect(hrLink).toHaveAttribute('href', '/departments/dept-2');
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no departments exist', async () => {
      server.use(
        http.get('*/api/nexus/departments', () => {
          return HttpResponse.json([]);
        })
      );

      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('No departments found')).toBeInTheDocument();
        expect(screen.getByText('Get started by creating your first department')).toBeInTheDocument();
      });
    });

    it('should display Add Department button in empty state', async () => {
      server.use(
        http.get('*/api/nexus/departments', () => {
          return HttpResponse.json([]);
        })
      );

      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        const addButtons = screen.getAllByRole('link', { name: /add department/i });
        expect(addButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Summary', () => {
    it('should display count of departments', async () => {
      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('Showing 5 departments')).toBeInTheDocument();
      });
    });

    it('should display singular form for single department', async () => {
      server.use(
        http.get('*/api/nexus/departments', () => {
          return HttpResponse.json([mockDepartments[0]]);
        })
      );

      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('Showing 1 department')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      server.use(
        http.get('*/api/nexus/departments', () => {
          return HttpResponse.json(
            { message: 'Failed to fetch departments' },
            { status: 500 }
          );
        })
      );

      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Departments')).toBeInTheDocument();
      });
    });

    it('should display error details in error state', async () => {
      server.use(
        http.get('*/api/nexus/departments', () => {
          return HttpResponse.json(
            { message: 'Database connection failed' },
            { status: 500 }
          );
        })
      );

      renderWithProviders(<DepartmentsList />);

      await waitFor(() => {
        expect(screen.getByText('Database connection failed')).toBeInTheDocument();
      });
    });
  });
});
