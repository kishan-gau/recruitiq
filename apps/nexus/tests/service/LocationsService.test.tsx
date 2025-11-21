/**
 * LocationsService Tests
 * Tests all CRUD operations and TanStack Query hooks
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import {
  useLocations,
  useLocation,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  locationKeys,
} from '../../src/services/LocationsService';

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
        http.get('*/api/products/nexus/locations', () => {
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
