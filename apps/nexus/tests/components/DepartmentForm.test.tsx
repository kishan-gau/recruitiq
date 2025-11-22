import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import DepartmentForm from '../../src/components/DepartmentForm';
import type { Department } from '../../src/types/department.types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockDepartments = [
  { id: 'dept-1', departmentCode: 'ENG', departmentName: 'Engineering', description: 'Engineering department', isActive: true, parentDepartmentId: null, parentDepartment: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'dept-2', departmentCode: 'FE', departmentName: 'Frontend', description: 'Frontend team', isActive: true, parentDepartmentId: 'dept-1', parentDepartment: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'dept-3', departmentCode: 'SALES', departmentName: 'Sales', description: null, isActive: true, parentDepartmentId: null, parentDepartment: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
];

const server = setupServer(
  http.get('*/api/products/nexus/departments', () => HttpResponse.json(mockDepartments)),
  http.post('*/api/products/nexus/departments', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ id: 'new-dept-id', ...body, parentDepartment: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { status: 201 });
  }),
  http.patch('*/api/products/nexus/departments/:id', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const dept = mockDepartments.find(d => d.id === params.id);
    return HttpResponse.json({ ...dept, ...body, updatedAt: new Date().toISOString() });
  })
);

beforeAll(() => server.listen());
afterEach(() => { server.resetHandlers(); mockNavigate.mockClear(); });
afterAll(() => server.close());

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><BrowserRouter>{ui}</BrowserRouter></QueryClientProvider>);
}

describe('DepartmentForm', () => {
  describe('Create Mode', () => {
    it('should display create form with correct title and description', () => {
      renderWithProviders(<DepartmentForm mode="create" />);
      expect(screen.getByRole('heading', { name: 'Create Department' })).toBeInTheDocument();
      expect(screen.getByText('Add a new department to your organization')).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      renderWithProviders(<DepartmentForm mode="create" />);
      expect(screen.getByLabelText(/department code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/department name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/parent department/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/active/i)).toBeInTheDocument();
    });

    it('should show empty initial values', () => {
      renderWithProviders(<DepartmentForm mode="create" />);
      expect(screen.getByLabelText(/department code/i)).toHaveValue('');
      expect(screen.getByLabelText(/department name/i)).toHaveValue('');
      expect(screen.getByLabelText(/description/i)).toHaveValue('');
    });

    it('should show validation errors for required fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      const submitButton = screen.getByRole('button', { name: /create department/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/department code must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/department name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate department code format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      const codeInput = screen.getByLabelText(/department code/i);
      await user.type(codeInput, 'a');
      
      // Add a valid name so we only see the code error
      await user.type(screen.getByLabelText(/department name/i), 'Test Department');
      
      // Submit to trigger validation
      await user.click(screen.getByRole('button', { name: /create department/i }));

      await waitFor(() => {
        expect(screen.getByText(/department code must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate department code with only uppercase, numbers, underscores, and hyphens', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      const codeInput = screen.getByLabelText(/department code/i);
      await user.type(codeInput, 'abc');
      
      // Submit to trigger validation
      await user.click(screen.getByRole('button', { name: /create department/i }));

      await waitFor(() => {
        expect(screen.getByText(/department code must contain only uppercase letters, numbers, hyphens, and underscores/i)).toBeInTheDocument();
      });
    });

    it('should accept valid department codes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      const codeInput = screen.getByLabelText(/department code/i);
      const nameInput = screen.getByLabelText(/department name/i);
      await user.type(codeInput, 'HR_2024');
      await user.type(nameInput, 'Human Resources');
      
      // Submit to check no validation errors
      await user.click(screen.getByRole('button', { name: /create department/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/departments');
      });
    });

    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      await user.type(screen.getByLabelText(/department code/i), 'HR');
      await user.type(screen.getByLabelText(/department name/i), 'Human Resources');
      await user.type(screen.getByLabelText(/description/i), 'HR department');
      
      await user.click(screen.getByRole('button', { name: /create department/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/departments');
      });
    });

    it('should allow selecting parent department', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      // Wait for departments to load and check if options are available
      await waitFor(() => {
        const parentSelect = screen.getByLabelText(/parent department/i);
        const options = parentSelect.querySelectorAll('option');
        expect(options.length).toBeGreaterThan(1); // More than just the "None" option
      });

      const parentSelect = screen.getByLabelText(/parent department/i);
      await user.selectOptions(parentSelect, 'dept-1');
      
      expect(parentSelect).toHaveValue('dept-1');
    });

    it('should allow toggling active status', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      const activeCheckbox = screen.getByLabelText(/active/i);
      expect(activeCheckbox).toBeChecked();
      
      await user.click(activeCheckbox);
      expect(activeCheckbox).not.toBeChecked();
    });

    it('should navigate to departments list on cancel', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/departments');
    });
  });

  describe('Edit Mode', () => {
    const mockDepartment: Department = {
      id: 'dept-1',
      organizationId: 'org-1',
      departmentCode: 'ENG',
      departmentName: 'Engineering',
      description: 'Engineering department',
      isActive: true,
      parentDepartmentId: undefined,
      parentDepartment: undefined,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    it('should display edit form with correct title', () => {
      renderWithProviders(<DepartmentForm mode="edit" department={mockDepartment} />);
      expect(screen.getByText('Edit Department')).toBeInTheDocument();
      expect(screen.getByText('Update department information')).toBeInTheDocument();
    });

    it('should populate form with department data', () => {
      renderWithProviders(<DepartmentForm mode="edit" department={mockDepartment} />);
      expect(screen.getByLabelText(/department code/i)).toHaveValue('ENG');
      expect(screen.getByLabelText(/department name/i)).toHaveValue('Engineering');
      expect(screen.getByLabelText(/description/i)).toHaveValue('Engineering department');
      expect(screen.getByLabelText(/active/i)).toBeChecked();
    });

    it('should exclude current department from parent options', async () => {
      renderWithProviders(<DepartmentForm mode="edit" department={mockDepartment} />);
      
      await waitFor(() => {
        const parentSelect = screen.getByLabelText(/parent department/i);
        const options = Array.from(parentSelect.querySelectorAll('option')).map((opt: any) => opt.value);
        expect(options).not.toContain('dept-1');
      });
    });

    it('should submit update with modified data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="edit" department={mockDepartment} />);
      
      const nameInput = screen.getByLabelText(/department name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Engineering Team');
      
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/departments/dept-1');
      });
    });

    it('should navigate to department details on cancel', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="edit" department={mockDepartment} />);
      
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/departments/dept-1');
    });

    it('should allow editing all fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="edit" department={mockDepartment} />);
      
      const codeInput = screen.getByLabelText(/department code/i);
      const nameInput = screen.getByLabelText(/department name/i);
      const descInput = screen.getByLabelText(/description/i);
      
      await user.clear(codeInput);
      await user.type(codeInput, 'ENG_NEW');
      expect(codeInput).toHaveValue('ENG_NEW');
      
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      expect(nameInput).toHaveValue('New Name');
      
      await user.clear(descInput);
      await user.type(descInput, 'New description');
      expect(descInput).toHaveValue('New description');
    });

    it('should handle inactive department', () => {
      const inactiveDept = { ...mockDepartment, isActive: false };
      renderWithProviders(<DepartmentForm mode="edit" department={inactiveDept} />);
      
      expect(screen.getByLabelText(/active/i)).not.toBeChecked();
    });

    it('should handle department without parent', () => {
      renderWithProviders(<DepartmentForm mode="edit" department={mockDepartment} />);
      
      const parentSelect = screen.getByLabelText(/parent department/i);
      expect(parentSelect).toHaveValue('');
    });
  });

  describe('Validation', () => {
    it('should show error for single character code', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      await user.type(screen.getByLabelText(/department code/i), 'A');
      await user.type(screen.getByLabelText(/department name/i), 'Test Department');
      await user.click(screen.getByRole('button', { name: /create department/i }));

      await waitFor(() => {
        expect(screen.getByText(/department code must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('should show error for lowercase in code', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      await user.type(screen.getByLabelText(/department code/i), 'Abc');
      await user.click(screen.getByRole('button', { name: /create department/i }));

      await waitFor(() => {
        expect(screen.getByText(/department code must contain only uppercase letters, numbers, hyphens, and underscores/i)).toBeInTheDocument();
      });
    });

    it('should accept valid code formats', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      const codeInput = screen.getByLabelText(/department code/i);
      const nameInput = screen.getByLabelText(/department name/i);
      await user.type(codeInput, 'ENG-TEAM');
      await user.type(nameInput, 'Engineering Team');
      
      await user.click(screen.getByRole('button', { name: /create department/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/departments');
      });
    });

    it('should show error for empty department name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      await user.type(screen.getByLabelText(/department code/i), 'HR');
      await user.click(screen.getByRole('button', { name: /create department/i }));

      await waitFor(() => {
        expect(screen.getByText(/department name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('should not require description field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<DepartmentForm mode="create" />);
      
      await user.type(screen.getByLabelText(/department code/i), 'HR');
      await user.type(screen.getByLabelText(/department name/i), 'Human Resources');
      await user.click(screen.getByRole('button', { name: /create department/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/departments');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      renderWithProviders(<DepartmentForm mode="create" />);
      
      expect(screen.getByLabelText(/department code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/department name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/parent department/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/active/i)).toBeInTheDocument();
    });

    it('should have descriptive button labels', () => {
      renderWithProviders(<DepartmentForm mode="create" />);
      
      expect(screen.getByRole('button', { name: /create department/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should display helper text for fields', () => {
      renderWithProviders(<DepartmentForm mode="create" />);
      
      // Check for asterisk indicators for required fields
      expect(screen.getAllByText('*').length).toBeGreaterThan(0);
      // Check for helper text on parent department field
      expect(screen.getByText(/select a parent department to create a hierarchy/i)).toBeInTheDocument();
    });

    it('should have descriptive placeholders', () => {
      renderWithProviders(<DepartmentForm mode="create" />);
      
      const codeInput = screen.getByLabelText(/department code/i);
      expect(codeInput).toHaveAttribute('placeholder');
    });
  });
});
