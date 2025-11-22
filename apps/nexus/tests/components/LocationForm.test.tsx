import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import LocationForm from '../../src/components/LocationForm';
import type { Location } from '../../src/types/location.types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeAll(() => server.listen());
afterEach(() => { server.resetHandlers(); mockNavigate.mockClear(); });
afterAll(() => server.close());

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ 
    defaultOptions: { 
      queries: { retry: false }, 
      mutations: { retry: false } 
    } 
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('LocationForm', () => {
  describe('Create Mode', () => {
    it('should display create form with correct title and description', () => {
      renderWithProviders(<LocationForm mode="create" />);
      expect(screen.getByRole('heading', { name: 'Create Location' })).toBeInTheDocument();
      expect(screen.getByText('Add a new location to your organization')).toBeInTheDocument();
    });

    it('should render all form sections', () => {
      renderWithProviders(<LocationForm mode="create" />);
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Address')).toBeInTheDocument();
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
    });

    it('should render all required form fields', () => {
      renderWithProviders(<LocationForm mode="create" />);
      expect(screen.getByLabelText(/location code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
    });

    it('should render optional form fields', () => {
      renderWithProviders(<LocationForm mode="create" />);
      expect(screen.getByLabelText(/address line 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state\/province/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/postal code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/active/i)).toBeInTheDocument();
    });

    it('should show empty initial values for basic fields', () => {
      renderWithProviders(<LocationForm mode="create" />);
      expect(screen.getByLabelText(/location code/i)).toHaveValue('');
      expect(screen.getByLabelText(/location name/i)).toHaveValue('');
      expect(screen.getByLabelText(/location type/i)).toHaveValue('branch');
    });

    it('should show validation errors for required fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      const submitButton = screen.getByRole('button', { name: /create location/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/location code must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/location name must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/address line 1 is required/i)).toBeInTheDocument();
        expect(screen.getByText(/country is required/i)).toBeInTheDocument();
      });
    });

    it('should validate location code format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      const codeInput = screen.getByLabelText(/location code/i);
      await user.type(codeInput, 'abc');
      
      // Submit to trigger validation
      await user.click(screen.getByRole('button', { name: /create location/i }));

      await waitFor(() => {
        expect(screen.getByText(/location code must contain only uppercase letters, numbers, hyphens, and underscores/i)).toBeInTheDocument();
      });
    });

    it('should accept valid location codes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      await user.type(screen.getByLabelText(/location code/i), 'NYC-01');
      await user.type(screen.getByLabelText(/location name/i), 'New York Office');
      await user.type(screen.getByLabelText(/address line 1/i), '123 Main St');
      await user.type(screen.getByLabelText(/country/i), 'USA');
      
      await user.click(screen.getByRole('button', { name: /create location/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/locations');
      });
    });

    it('should validate phone number format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      const phoneInput = screen.getByLabelText(/phone/i);
      await user.type(phoneInput, 'invalid-phone');
      
      // Blur to trigger validation
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/invalid phone number format/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'notanemail');
      
      // Blur to trigger validation
      await user.tab();
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('should submit form with all required data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      await user.type(screen.getByLabelText(/location code/i), 'HQ');
      await user.type(screen.getByLabelText(/location name/i), 'Headquarters');
      await user.selectOptions(screen.getByLabelText(/location type/i), 'headquarters');
      await user.type(screen.getByLabelText(/address line 1/i), '123 Main St');
      await user.type(screen.getByLabelText(/country/i), 'USA');
      
      await user.click(screen.getByRole('button', { name: /create location/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/locations');
      });
    });

    it('should submit form with all fields including optional ones', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      await user.type(screen.getByLabelText(/location code/i), 'NYC');
      await user.type(screen.getByLabelText(/location name/i), 'New York Office');
      await user.selectOptions(screen.getByLabelText(/location type/i), 'branch');
      await user.type(screen.getByLabelText(/address line 1/i), '456 Park Ave');
      await user.type(screen.getByLabelText(/address line 2/i), 'Suite 100');
      await user.type(screen.getByLabelText(/city/i), 'New York');
      await user.type(screen.getByLabelText(/state\/province/i), 'NY');
      await user.type(screen.getByLabelText(/postal code/i), '10001');
      await user.type(screen.getByLabelText(/country/i), 'USA');
      await user.type(screen.getByLabelText(/phone/i), '+1-555-0200');
      await user.type(screen.getByLabelText(/email/i), 'nyc@company.com');
      
      await user.click(screen.getByRole('button', { name: /create location/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/locations');
      });
    });

    it('should allow selecting different location types', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      const typeSelect = screen.getByLabelText(/location type/i);
      
      await user.selectOptions(typeSelect, 'headquarters');
      expect(typeSelect).toHaveValue('headquarters');
      
      await user.selectOptions(typeSelect, 'warehouse');
      expect(typeSelect).toHaveValue('warehouse');
      
      await user.selectOptions(typeSelect, 'store');
      expect(typeSelect).toHaveValue('store');
      
      await user.selectOptions(typeSelect, 'remote');
      expect(typeSelect).toHaveValue('remote');
    });

    it('should allow toggling active status', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      const activeCheckbox = screen.getByLabelText(/active/i);
      expect(activeCheckbox).toBeChecked();
      
      await user.click(activeCheckbox);
      expect(activeCheckbox).not.toBeChecked();
      
      await user.click(activeCheckbox);
      expect(activeCheckbox).toBeChecked();
    });

    it('should navigate to locations list on cancel', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/locations');
    });

    it('should disable buttons while submitting', async () => {
      const user = userEvent.setup();
      
      // Delay the response to test loading state
      server.use(
        http.post('*/api/products/nexus/locations', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({ id: 'new-id' }, { status: 201 });
        })
      );
      
      renderWithProviders(<LocationForm mode="create" />);
      
      await user.type(screen.getByLabelText(/location code/i), 'HQ');
      await user.type(screen.getByLabelText(/location name/i), 'Headquarters');
      await user.type(screen.getByLabelText(/address line 1/i), '123 Main St');
      await user.type(screen.getByLabelText(/country/i), 'USA');
      
      const submitButton = screen.getByRole('button', { name: /create location/i });
      await user.click(submitButton);

      // Check for "Creating..." state
      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode', () => {
    const mockLocation: Location = {
      id: 'loc-1',
      organizationId: 'org-1',
      locationCode: 'HQ',
      locationName: 'Headquarters',
      locationType: 'headquarters',
      addressLine1: '123 Main St',
      addressLine2: 'Suite 100',
      city: 'San Francisco',
      stateProvince: 'CA',
      postalCode: '94105',
      country: 'USA',
      phone: '+1-555-0100',
      email: 'hq@company.com',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      createdBy: 'user-1',
      updatedBy: 'user-1',
    };

    it('should display edit form with correct title', () => {
      renderWithProviders(<LocationForm mode="edit" location={mockLocation} />);
      expect(screen.getByText('Edit Location')).toBeInTheDocument();
      expect(screen.getByText('Update location information')).toBeInTheDocument();
    });

    it('should populate form with location data', () => {
      renderWithProviders(<LocationForm mode="edit" location={mockLocation} />);
      expect(screen.getByLabelText(/location code/i)).toHaveValue('HQ');
      expect(screen.getByLabelText(/location name/i)).toHaveValue('Headquarters');
      expect(screen.getByLabelText(/location type/i)).toHaveValue('headquarters');
      expect(screen.getByLabelText(/address line 1/i)).toHaveValue('123 Main St');
      expect(screen.getByLabelText(/address line 2/i)).toHaveValue('Suite 100');
      expect(screen.getByLabelText(/city/i)).toHaveValue('San Francisco');
      expect(screen.getByLabelText(/state\/province/i)).toHaveValue('CA');
      expect(screen.getByLabelText(/postal code/i)).toHaveValue('94105');
      expect(screen.getByLabelText(/country/i)).toHaveValue('USA');
      expect(screen.getByLabelText(/phone/i)).toHaveValue('+1-555-0100');
      expect(screen.getByLabelText(/email/i)).toHaveValue('hq@company.com');
      expect(screen.getByLabelText(/active/i)).toBeChecked();
    });

    it('should submit update with modified data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="edit" location={mockLocation} />);
      
      const nameInput = screen.getByLabelText(/location name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Headquarters - Updated');
      
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/locations/loc-1');
      });
    });

    it('should navigate to location details on cancel', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="edit" location={mockLocation} />);
      
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/locations/loc-1');
    });

    it('should allow editing all fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="edit" location={mockLocation} />);
      
      const nameInput = screen.getByLabelText(/location name/i);
      const phoneInput = screen.getByLabelText(/phone/i);
      
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
      expect(nameInput).toHaveValue('New Name');
      
      await user.clear(phoneInput);
      await user.type(phoneInput, '+1-555-9999');
      expect(phoneInput).toHaveValue('+1-555-9999');
    });

    it('should allow changing location type', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="edit" location={mockLocation} />);
      
      const typeSelect = screen.getByLabelText(/location type/i);
      await user.selectOptions(typeSelect, 'branch');
      
      expect(typeSelect).toHaveValue('branch');
    });

    it('should allow toggling active status', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="edit" location={mockLocation} />);
      
      const activeCheckbox = screen.getByLabelText(/active/i);
      expect(activeCheckbox).toBeChecked();
      
      await user.click(activeCheckbox);
      expect(activeCheckbox).not.toBeChecked();
    });

    it('should show save changes button text', () => {
      renderWithProviders(<LocationForm mode="edit" location={mockLocation} />);
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should show saving state when submitting', async () => {
      const user = userEvent.setup();
      
      // Delay the response to test loading state
      server.use(
        http.patch('*/api/products/nexus/locations/:id', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({ id: 'loc-1' });
        })
      );
      
      renderWithProviders(<LocationForm mode="edit" location={mockLocation} />);
      
      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      // Check for "Saving..." state
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('should enforce maximum length for location code', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      const codeInput = screen.getByLabelText(/location code/i);
      await user.type(codeInput, 'VERYLONGCODE');
      
      await user.click(screen.getByRole('button', { name: /create location/i }));

      await waitFor(() => {
        expect(screen.getByText(/location code must not exceed 10 characters/i)).toBeInTheDocument();
      });
    });

    it('should enforce maximum length for location name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      const nameInput = screen.getByLabelText(/location name/i);
      await user.type(nameInput, 'A'.repeat(101));
      
      await user.click(screen.getByRole('button', { name: /create location/i }));

      await waitFor(() => {
        expect(screen.getByText(/location name must not exceed 100 characters/i)).toBeInTheDocument();
      });
    });

    it('should accept valid phone number formats', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      await user.type(screen.getByLabelText(/location code/i), 'HQ');
      await user.type(screen.getByLabelText(/location name/i), 'Headquarters');
      await user.type(screen.getByLabelText(/address line 1/i), '123 Main St');
      await user.type(screen.getByLabelText(/country/i), 'USA');
      await user.type(screen.getByLabelText(/phone/i), '+1-555-0100');
      
      await user.click(screen.getByRole('button', { name: /create location/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/locations');
      });
    });

    it('should accept valid email formats', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      await user.type(screen.getByLabelText(/location code/i), 'HQ');
      await user.type(screen.getByLabelText(/location name/i), 'Headquarters');
      await user.type(screen.getByLabelText(/address line 1/i), '123 Main St');
      await user.type(screen.getByLabelText(/country/i), 'USA');
      await user.type(screen.getByLabelText(/email/i), 'test@company.com');
      
      await user.click(screen.getByRole('button', { name: /create location/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/locations');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      renderWithProviders(<LocationForm mode="create" />);
      
      expect(screen.getByLabelText(/location code/i)).toHaveAttribute('id');
      expect(screen.getByLabelText(/location name/i)).toHaveAttribute('id');
      expect(screen.getByLabelText(/location type/i)).toHaveAttribute('id');
      expect(screen.getByLabelText(/address line 1/i)).toHaveAttribute('id');
      expect(screen.getByLabelText(/country/i)).toHaveAttribute('id');
      expect(screen.getByLabelText(/phone/i)).toHaveAttribute('id');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('id');
    });

    it('should mark required fields with asterisk', () => {
      renderWithProviders(<LocationForm mode="create" />);
      
      const requiredLabels = screen.getAllByText('*');
      expect(requiredLabels.length).toBeGreaterThan(0);
    });

    it('should display error messages with proper styling', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationForm mode="create" />);
      
      await user.click(screen.getByRole('button', { name: /create location/i }));

      await waitFor(() => {
        const errors = screen.getAllByText(/is required|must be at least/i);
        errors.forEach(error => {
          expect(error).toHaveClass('text-red-600', 'dark:text-red-400');
        });
      });
    });
  });
});
