/**
 * LocationsService Tests
 * Tests all CRUD operations and TanStack Query hooks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  useLocations,
  useLocation,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  locationKeys,
} from '../../src/services/LocationsService';
import type { Location } from '../../src/types/location.types';

// Mock data
const mockLocations: Location[] = [
  {
    id: 'loc-1',
    organizationId: 'org-1',
    locationCode: 'HQ',
    locationName: 'Headquarters',
    locationType: 'headquarters',
    addressLine1: '123 Main St',
    city: 'San Francisco',
    stateProvince: 'CA',
    postalCode: '94105',
    country: 'USA',
    phone: '+1-555-0100',
    email: 'hq@company.com',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'loc-2',
    organizationId: 'org-1',
    locationCode: 'NYC',
    locationName: 'New York Branch',
    locationType: 'branch',
    addressLine1: '456 Broadway',
    city: 'New York',
    stateProvince: 'NY',
    postalCode: '10013',
    country: 'USA',
    phone: '+1-555-0200',
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'loc-3',
    organizationId: 'org-1',
    locationCode: 'WH1',
    locationName: 'Warehouse 1',
    locationType: 'warehouse',
    addressLine1: '789 Industrial Blvd',
    city: 'Newark',
    stateProvince: 'NJ',
    postalCode: '07102',
    country: 'USA',
    isActive: false,
    createdAt: '2024-01-03T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

// Setup MSW server
const server = setupServer(
  // GET all locations
  http.get('/api/nexus/locations', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const locationType = url.searchParams.get('locationType');
    const isActive = url.searchParams.get('isActive');
    const country = url.searchParams.get('country');

    let filtered = [...mockLocations];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (loc) =>
          loc.locationName.toLowerCase().includes(searchLower) ||
          loc.locationCode.toLowerCase().includes(searchLower)
      );
    }

    if (locationType) {
      filtered = filtered.filter((loc) => loc.locationType === locationType);
    }

    if (isActive !== null) {
      const activeFilter = isActive === 'true';
      filtered = filtered.filter((loc) => loc.isActive === activeFilter);
    }

    if (country) {
      filtered = filtered.filter((loc) => loc.country === country);
    }

    return HttpResponse.json(filtered);
  }),

  // GET single location
  http.get('/api/nexus/locations/:id', ({ params }) => {
    const location = mockLocations.find((loc) => loc.id === params.id);
    if (!location) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(location);
  }),

  // POST create location
  http.post('/api/nexus/locations', async ({ request }) => {
    const body = await request.json();
    const data = body as any;
    const newLocation: Location = {
      id: 'loc-new',
      organizationId: 'org-1',
      ...data,
      isActive: data.isActive ?? true,
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(newLocation, { status: 201 });
  }),

  // PATCH update location
  http.patch('/api/nexus/locations/:id', async ({ params, request }) => {
    const location = mockLocations.find((loc) => loc.id === params.id);
    if (!location) {
      return new HttpResponse(null, { status: 404 });
    }
    const body = await request.json();
    const data = body as any;
    const updated = {
      ...location,
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: 'user-1',
    };
    return HttpResponse.json(updated);
  }),

  // DELETE location
  http.delete('/api/nexus/locations/:id', ({ params }) => {
    const location = mockLocations.find((loc) => loc.id === params.id);
    if (!location) {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  })
);

beforeEach(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('LocationsService', () => {
  describe('useLocations', () => {
    it('should fetch all locations', async () => {
      const { result } = renderHook(() => useLocations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.[0].locationCode).toBe('HQ');
    });

    it('should filter locations by search term', async () => {
      const { result } = renderHook(
        () => useLocations({ search: 'warehouse' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].locationCode).toBe('WH1');
    });

    it('should filter locations by type', async () => {
      const { result } = renderHook(
        () => useLocations({ locationType: 'branch' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].locationCode).toBe('NYC');
    });

    it('should filter locations by active status', async () => {
      const { result } = renderHook(
        () => useLocations({ isActive: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.every((loc: Location) => loc.isActive)).toBe(true);
    });

    it('should filter locations by country', async () => {
      const { result } = renderHook(
        () => useLocations({ country: 'USA' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.every((loc: Location) => loc.country === 'USA')).toBe(true);
    });

    it('should handle fetch error', async () => {
      server.use(
        http.get('/api/nexus/locations', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const { result } = renderHook(() => useLocations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useLocation', () => {
    it('should fetch a single location by id', async () => {
      const { result } = renderHook(() => useLocation('loc-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.locationCode).toBe('HQ');
      expect(result.current.data?.locationName).toBe('Headquarters');
    });

    it('should handle location not found', async () => {
      const { result } = renderHook(() => useLocation('non-existent'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useCreateLocation', () => {
    it('should create a new location', async () => {
      const { result } = renderHook(() => useCreateLocation(), {
        wrapper: createWrapper(),
      });

      const newLocation = {
        locationCode: 'LA',
        locationName: 'Los Angeles Office',
        locationType: 'branch' as const,
        addressLine1: '100 Sunset Blvd',
        city: 'Los Angeles',
        stateProvince: 'CA',
        postalCode: '90028',
        country: 'USA',
      };

      result.current.mutate(newLocation);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.id).toBe('loc-new');
      expect(result.current.data?.locationCode).toBe('LA');
    });
  });

  describe('useUpdateLocation', () => {
    it('should update an existing location', async () => {
      const { result } = renderHook(() => useUpdateLocation(), {
        wrapper: createWrapper(),
      });

      const updateData = {
        locationName: 'Headquarters - Updated',
        phone: '+1-555-0199',
      };

      result.current.mutate({ id: 'loc-1', data: updateData });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.locationName).toBe('Headquarters - Updated');
      expect(result.current.data?.phone).toBe('+1-555-0199');
    });
  });

  describe('useDeleteLocation', () => {
    it('should delete a location', async () => {
      const { result } = renderHook(() => useDeleteLocation(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('loc-3');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('locationKeys', () => {
    it('should generate correct query keys', () => {
      expect(locationKeys.all).toEqual(['locations']);
      expect(locationKeys.lists()).toEqual(['locations', 'list']);
      expect(locationKeys.list({ search: 'test' })).toEqual([
        'locations',
        'list',
        { search: 'test' },
      ]);
      expect(locationKeys.details()).toEqual(['locations', 'detail']);
      expect(locationKeys.detail('loc-1')).toEqual(['locations', 'detail', 'loc-1']);
    });
  });
});
