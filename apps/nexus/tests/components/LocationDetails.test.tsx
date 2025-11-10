import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LocationDetails from '../../src/pages/locations/LocationDetails';
import type { Location } from '../../src/types/location.types';

// Mock data
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

const mockBranchLocation: Location = {
  id: 'loc-2',
  organizationId: 'org-1',
  locationCode: 'NYC',
  locationName: 'New York Branch',
  locationType: 'branch',
  addressLine1: '456 Park Ave',
  city: 'New York',
  stateProvince: 'NY',
  postalCode: '10001',
  country: 'USA',
  phone: '+1-555-0200',
  email: 'nyc@company.com',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
};

const mockInactiveLocation: Location = {
  id: 'loc-3',
  organizationId: 'org-1',
  locationCode: 'OLD',
  locationName: 'Old Warehouse',
  locationType: 'warehouse',
  addressLine1: '789 Industrial Blvd',
  city: 'Chicago',
  stateProvince: 'IL',
  postalCode: '60601',
  country: 'USA',
  isActive: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
};

const mockMinimalLocation: Location = {
  id: 'loc-4',
  organizationId: 'org-1',
  locationCode: 'MIN',
  locationName: 'Minimal Location',
  locationType: 'remote',
  addressLine1: 'Remote',
  country: 'USA',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  updatedBy: 'user-1',
};

// MSW server setup
const server = setupServer(
  http.get('*/api/nexus/locations/:id', ({ params }) => {
    if (params.id === 'loc-1') {
      return HttpResponse.json(mockLocation);
    }
    if (params.id === 'loc-2') {
      return HttpResponse.json(mockBranchLocation);
    }
    if (params.id === 'loc-3') {
      return HttpResponse.json(mockInactiveLocation);
    }
    if (params.id === 'loc-4') {
      return HttpResponse.json(mockMinimalLocation);
    }
    if (params.id === 'not-found') {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(mockLocation);
  }),

  http.delete('*/api/nexus/locations/:id', ({ params }) => {
    if (params.id === 'loc-1' || params.id === 'loc-2' || params.id === 'loc-3') {
      return new HttpResponse(null, { status: 204 });
    }
    return new HttpResponse(null, { status: 404 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Helper function to render with providers
function renderWithProviders(ui: React.ReactElement, initialRoute = '/locations/loc-1') {
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
          <Route path="/locations/:id" element={ui} />
          <Route path="/locations" element={<div>Locations List</div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('LocationDetails', () => {
  describe('Loading State', () => {
    it('should display loading spinner while fetching', () => {
      renderWithProviders(<LocationDetails />);

      const spinner = screen.getByLabelText('Loading location');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('should display location name in header', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent('Headquarters');
      });
    });

    it('should display location code', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText(/Location Code: HQ/)).toBeInTheDocument();
      });
    });

    it('should display location type badge', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        const badges = screen.getAllByText('headquarters');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should display branch type badge', async () => {
      renderWithProviders(<LocationDetails />, '/locations/loc-2');

      await waitFor(() => {
        const badges = screen.getAllByText('branch');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should display active status badge', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        const badges = screen.getAllByText('Active');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should display inactive status badge for inactive location', async () => {
      renderWithProviders(<LocationDetails />, '/locations/loc-3');

      await waitFor(() => {
        const badges = screen.getAllByText('Inactive');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('should display back button', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        const backButton = screen.getByLabelText('Back to locations');
        expect(backButton).toBeInTheDocument();
      });
    });

    it('should display edit button', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        const editButton = screen.getByRole('link', { name: /edit/i });
        expect(editButton).toBeInTheDocument();
        expect(editButton).toHaveAttribute('href', '/locations/loc-1/edit');
      });
    });

    it('should display delete button', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        expect(deleteButton).toBeInTheDocument();
      });
    });
  });

  describe('Location Information', () => {
    it('should display location information section', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('Location Information')).toBeInTheDocument();
      });
    });

    it('should display location name field', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('Location Name')).toBeInTheDocument();
        const values = screen.getAllByText('Headquarters');
        expect(values.length).toBeGreaterThan(0);
      });
    });

    it('should display location code field', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('Location Code')).toBeInTheDocument();
        const codes = screen.getAllByText('HQ');
        expect(codes.length).toBeGreaterThan(0);
      });
    });

    it('should display location type field', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('Location Type')).toBeInTheDocument();
        const types = screen.getAllByText('headquarters');
        expect(types.length).toBeGreaterThan(0);
      });
    });

    it('should display status field', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        const statusLabels = screen.getAllByText('Status');
        expect(statusLabels.length).toBeGreaterThan(0);
        const statusValues = screen.getAllByText('Active');
        expect(statusValues.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Address Section', () => {
    it('should display address section', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('Address')).toBeInTheDocument();
      });
    });

    it('should display address line 1', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('123 Main St')).toBeInTheDocument();
      });
    });

    it('should display address line 2 when present', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('Suite 100')).toBeInTheDocument();
      });
    });

    it('should not display address line 2 when not present', async () => {
      renderWithProviders(<LocationDetails />, '/locations/loc-2');

      await waitFor(() => {
        expect(screen.getByText('456 Park Ave')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Suite/)).not.toBeInTheDocument();
    });

    it('should display city, state, and postal code', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText(/San Francisco, CA, 94105/)).toBeInTheDocument();
      });
    });

    it('should display country', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        const usaElements = screen.getAllByText('USA');
        expect(usaElements.length).toBeGreaterThan(0);
      });
    });

    it('should handle minimal address information', async () => {
      renderWithProviders(<LocationDetails />, '/locations/loc-4');

      await waitFor(() => {
        expect(screen.getByText('Remote')).toBeInTheDocument();
      });
    });
  });

  describe('Contact Information', () => {
    it('should display contact information section', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('Contact Information')).toBeInTheDocument();
      });
    });

    it('should display phone number when present', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('Phone')).toBeInTheDocument();
        const phoneLink = screen.getByRole('link', { name: '+1-555-0100' });
        expect(phoneLink).toBeInTheDocument();
        expect(phoneLink).toHaveAttribute('href', 'tel:+1-555-0100');
      });
    });

    it('should display email when present', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('Email')).toBeInTheDocument();
        const emailLink = screen.getByRole('link', { name: 'hq@company.com' });
        expect(emailLink).toBeInTheDocument();
        expect(emailLink).toHaveAttribute('href', 'mailto:hq@company.com');
      });
    });

    it('should not display phone when not present', async () => {
      renderWithProviders(<LocationDetails />, '/locations/loc-4');

      await waitFor(() => {
        expect(screen.getByText('Contact Information')).toBeInTheDocument();
      });

      expect(screen.queryByText('Phone')).not.toBeInTheDocument();
    });

    it('should not display email when not present', async () => {
      renderWithProviders(<LocationDetails />, '/locations/loc-4');

      await waitFor(() => {
        expect(screen.getByText('Contact Information')).toBeInTheDocument();
      });

      expect(screen.queryByText('Email')).not.toBeInTheDocument();
    });
  });

  describe('Employees Section', () => {
    it('should display employees section', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('Employees at this Location')).toBeInTheDocument();
      });
    });

    it('should display placeholder message', async () => {
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('Employee list coming soon')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should open delete confirmation modal when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Location')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      });
    });

    it('should display location name in delete confirmation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Location')).toBeInTheDocument();
        const modal = screen.getByText(/Are you sure you want to delete/).closest('div');
        expect(modal).toHaveTextContent('Headquarters');
      });
    });

    it('should close modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Location')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Delete Location')).not.toBeInTheDocument();
      });
    });

    it('should show deleting state when delete is in progress', async () => {
      const user = userEvent.setup();
      
      // Delay the delete response
      server.use(
        http.delete('*/api/nexus/locations/:id', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return new HttpResponse(null, { status: 204 });
        })
      );

      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete Location')).toBeInTheDocument();
      });

      const confirmButton = screen.getAllByRole('button', { name: /delete/i })[1];
      await user.click(confirmButton);

      // Should show deleting state briefly
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when location is not found', async () => {
      renderWithProviders(<LocationDetails />, '/locations/not-found');

      await waitFor(() => {
        expect(screen.getByText('Location Not Found')).toBeInTheDocument();
      });
    });

    it('should display error details for 404', async () => {
      renderWithProviders(<LocationDetails />, '/locations/not-found');

      await waitFor(() => {
        expect(screen.getByText(/doesn't exist or has been deleted/)).toBeInTheDocument();
      });
    });

    it('should display back to locations link in error state', async () => {
      renderWithProviders(<LocationDetails />, '/locations/not-found');

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back to locations/i });
        expect(backButton).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      server.use(
        http.get('*/api/nexus/locations/:id', () => {
          return HttpResponse.json(
            { message: 'Server error' },
            { status: 500 }
          );
        })
      );

      renderWithProviders(<LocationDetails />);

      await waitFor(() => {
        expect(screen.getByText('Location Not Found')).toBeInTheDocument();
      });
    });
  });
});
