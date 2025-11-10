/**
 * Locations API Service
 */

import { apiClient } from './api';
import type {
  Location,
  CreateLocationDTO,
  UpdateLocationDTO,
  LocationFilters,
} from '@/types/location.types';

// API response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const locationsService = {
  list: async (filters?: LocationFilters): Promise<Location[]> => {
    const { data } = await apiClient.get<ApiResponse<Location[]>>('/locations', {
      params: filters,
    });
    return data.data;
  },

  get: async (id: string): Promise<Location> => {
    const { data } = await apiClient.get<ApiResponse<Location>>(`/locations/${id}`);
    return data.data;
  },

  getByCode: async (code: string): Promise<Location> => {
    const { data } = await apiClient.get<ApiResponse<Location>>(`/locations/code/${code}`);
    return data.data;
  },

  create: async (location: CreateLocationDTO): Promise<Location> => {
    const { data } = await apiClient.post<ApiResponse<Location>>('/locations', location);
    return data.data;
  },

  update: async (id: string, updates: UpdateLocationDTO): Promise<Location> => {
    const { data } = await apiClient.patch<ApiResponse<Location>>(`/locations/${id}`, updates);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/locations/${id}`);
  },

  getStats: async (id: string): Promise<unknown> => {
    const { data } = await apiClient.get<ApiResponse<unknown>>(`/locations/${id}/stats`);
    return data.data;
  },

  getAllStats: async (): Promise<unknown> => {
    const { data } = await apiClient.get<ApiResponse<unknown>>('/locations/stats/all');
    return data.data;
  },
};
