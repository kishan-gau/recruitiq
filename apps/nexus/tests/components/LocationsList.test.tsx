/**
 * LocationsList Tests
 * Tests the locations list page component
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import LocationsList from '../../src/pages/locations/LocationsList';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import type { Location } from '../../src/types/location.types';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Use centralized MSW server with all handlers

beforeEach(() => {
  server.listen();
  mockNavigate.mockClear();
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
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

describe('LocationsList', () => {
  describe('Page Header', () => {
    it('renders the locations list page with header', async () => {
      renderWithProviders(<LocationsList />);

      expect(screen.getByRole('heading', { name: 'Locations' })).toBeInTheDocument();
      expect(screen.getByText("Manage your organization's locations")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add location/i })).toBeInTheDocument();
    });

    it('has link to add new location', () => {
      renderWithProviders(<LocationsList />);

      const addButton = screen.getByRole('button', { name: /add location/i });
      expect(addButton.closest('a')).toHaveAttribute('href', '/locations/new');
    });
  });

  describe('Search Functionality', () => {
    it('displays search input', () => {
      renderWithProviders(<LocationsList />);

      const searchInput = screen.getByPlaceholderText(/search by name, code, city, or country/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('filters locations by search query', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationsList />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      // All locations should be visible
      expect(screen.getByText('Headquarters')).toBeInTheDocument();
      expect(screen.getByText('New York Branch')).toBeInTheDocument();
      expect(screen.getByText('Warehouse 1')).toBeInTheDocument();

      // Search for "warehouse"
      const searchInput = screen.getByPlaceholderText(/search by name, code, city, or country/i);
      await user.type(searchInput, 'warehouse');

      // Only warehouse should be visible
      expect(screen.getByText('Warehouse 1')).toBeInTheDocument();
      expect(screen.queryByText('Headquarters')).not.toBeInTheDocument();
      expect(screen.queryByText('New York Branch')).not.toBeInTheDocument();
    });

    it('filters locations by location code', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by name, code, city, or country/i);
      await user.type(searchInput, 'NYC');

      expect(screen.getByText('New York Branch')).toBeInTheDocument();
      expect(screen.queryByText('Headquarters')).not.toBeInTheDocument();
    });

    it('filters locations by city', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by name, code, city, or country/i);
      await user.type(searchInput, 'newark');

      expect(screen.getByText('Warehouse 1')).toBeInTheDocument();
      expect(screen.queryByText('Headquarters')).not.toBeInTheDocument();
    });
  });

  describe('Filters', () => {
    it('toggles filter panel when filter button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationsList />);

      const filterButton = screen.getByRole('button', { name: /filters/i });
      
      // Filters should not be visible initially
      expect(screen.queryByLabelText('Type')).not.toBeInTheDocument();

      // Click to show filters
      await user.click(filterButton);
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
    });

    it('filters locations by type', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationsList />);

      // Wait for initial data
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBeGreaterThan(3); // header + 3 data rows
      });

      // Open filters
      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      // Select warehouse type
      const typeSelect = screen.getByLabelText('Type');
      await user.selectOptions(typeSelect, 'warehouse');

      // Should only show warehouse location
      await waitFor(() => {
        expect(screen.getByText('Warehouse 1')).toBeInTheDocument();
      });
      
      // HQ and NYC should not be in the table rows - check for locationCode instead
      const tableBody = screen.getAllByRole('row')[1].closest('tbody'); // Get tbody
      if (tableBody) {
        expect(tableBody.textContent).not.toContain('#HQ');
        expect(tableBody.textContent).not.toContain('#NYC');
      }
    });

    it('filters locations by active status', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBeGreaterThan(3); // header + 3 data rows
      });

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const statusSelect = screen.getByLabelText('Status');
      await user.selectOptions(statusSelect, 'true');

      // Should show only active locations by checking for their codes
      await waitFor(() => {
        const tableBody = screen.getAllByRole('row')[1].closest('tbody');
        if (tableBody) {
          expect(tableBody.textContent).toContain('#HQ');
          expect(tableBody.textContent).toContain('#NYC');
          expect(tableBody.textContent).not.toContain('#WH1');
        }
      });
    });

    it('clears all filters and search when clear button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      // Apply search and filters
      const searchInput = screen.getByPlaceholderText(/search by name, code, city, or country/i);
      await user.type(searchInput, 'warehouse');

      const filterButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filterButton);

      const typeSelect = screen.getByLabelText('Type');
      await user.selectOptions(typeSelect, 'warehouse');

      // Clear filters
      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearButton);

      // Search should be cleared
      expect(searchInput).toHaveValue('');

      // Filter should reset
      expect(typeSelect).toHaveValue('');
    });
  });

  describe('Location Display', () => {
    it('displays loading spinner while fetching data', () => {
      renderWithProviders(<LocationsList />);

      expect(screen.getByLabelText(/loading locations/i)).toBeInTheDocument();
    });

    it('displays locations after data is loaded', async () => {
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      expect(screen.getByText('New York Branch')).toBeInTheDocument();
      expect(screen.getByText('Warehouse 1')).toBeInTheDocument();
      expect(screen.getByText('#HQ')).toBeInTheDocument();
      expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
    });

    it('displays location type badges', async () => {
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      expect(screen.getByText('headquarters')).toBeInTheDocument();
      expect(screen.getByText('branch')).toBeInTheDocument();
      expect(screen.getByText('warehouse')).toBeInTheDocument();
    });

    it('displays location status badges', async () => {
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges).toHaveLength(2);

      const inactiveBadge = screen.getByText('Inactive');
      expect(inactiveBadge).toBeInTheDocument();
    });

    it('displays location addresses', async () => {
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
      expect(screen.getByText(/San Francisco/)).toBeInTheDocument();
      expect(screen.getByText(/CA 94105/)).toBeInTheDocument();
    });

    it('displays location contact information', async () => {
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      expect(screen.getByText('+1-555-0100')).toBeInTheDocument();
      expect(screen.getByText('hq@company.com')).toBeInTheDocument();
    });

    it('displays results count', async () => {
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      expect(screen.getByText(/showing 3 of 3 locations/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to location details when row is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      const row = screen.getByText('Headquarters').closest('tr');
      await user.click(row!);

      expect(mockNavigate).toHaveBeenCalledWith('/locations/loc-1');
    });

    it('navigates to edit page when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/locations/loc-1/edit');
    });

    it('does not navigate to details when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      // Should navigate to edit, not details
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/locations/loc-1/edit');
    });
  });

  describe('Delete Functionality', () => {
    it('shows confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete Headquarters?');
      confirmSpy.mockRestore();
    });

    it('deletes location when confirmed', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
      });

      confirmSpy.mockRestore();
    });
  });

  describe('Empty States', () => {
    it('displays empty state when no locations exist', async () => {
      server.use(
        http.get('*/api/products/nexus/locations', () => {
          return HttpResponse.json({ success: true, data: [] });
        })
      );

      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('No locations found')).toBeInTheDocument();
      });

      expect(screen.getByText(/get started by adding your first location/i)).toBeInTheDocument();
    });

    it('displays empty state with different message when filters are applied', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText('Headquarters')).toBeInTheDocument();
      });

      // Apply search that returns no results
      const searchInput = screen.getByPlaceholderText(/search by name, code, city, or country/i);
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No locations found')).toBeInTheDocument();
      expect(screen.getByText(/try adjusting your search or filters/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when fetch fails', async () => {
      server.use(
        http.get('*/api/products/nexus/locations', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      renderWithProviders(<LocationsList />);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch locations/i)).toBeInTheDocument();
      });
    });
  });
});
