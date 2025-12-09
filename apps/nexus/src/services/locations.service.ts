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

export const locationsService = {
  list: async (filters?: LocationFilters): Promise<Location[]> => {
    const response = await apiClient.get('/locations', {
      params: filters,
    });
    return response || [];
  },

  get: async (id: string): Promise<Location> => {
    const response = await apiClient.get(`/locations/${id}`);
    return response.location;
  },

  getByCode: async (code: string): Promise<Location> => {
    const response = await apiClient.get(`/locations/code/${code}`);
    return response.location;
  },

  create: async (location: CreateLocationDTO): Promise<Location> => {
    const response = await apiClient.post('/locations', location);
    return response.location;
  },

  update: async (id: string, updates: UpdateLocationDTO): Promise<Location> => {
    const response = await apiClient.patch(`/locations/${id}`, updates);
    return response.location;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/locations/${id}`);
  },

  getStatistics: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/locations/${id}/stats`);
    return response.stats;
  },

  getAllStatistics: async (): Promise<any[]> => {
    const response = await apiClient.get('/locations/stats/all');
    return response.stats || [];
  },

  getStats: async (id: string): Promise<unknown> => {
    const response = await apiClient.get(`/locations/${id}/stats`);
    return response.stats;
  },

  getAllStats: async (): Promise<unknown> => {
    const response = await apiClient.get('/locations/stats/all');
    return response.stats;
  },
};
