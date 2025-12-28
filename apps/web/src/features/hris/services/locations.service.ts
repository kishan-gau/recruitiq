import { NexusClient, APIClient } from '@recruitiq/api-client';
import type { Location, CreateLocationDTO, UpdateLocationDTO } from '@/types/location.types';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const locationsService = {
  async listLocations(filters?: any): Promise<Location[]> {
    const response = await nexusClient.getLocations(filters);
    return response.data || [];
  },

  async getLocation(id: string): Promise<Location> {
    const response = await nexusClient.getLocation(id);
    if (!response.data) throw new Error('Location not found');
    return response.data;
  },

  async createLocation(data: CreateLocationDTO): Promise<Location> {
    const response = await nexusClient.createLocation(data);
    if (!response.data) throw new Error('Failed to create location');
    return response.data;
  },

  async updateLocation(id: string, data: UpdateLocationDTO): Promise<Location> {
    const response = await nexusClient.updateLocation(id, data);
    if (!response.data) throw new Error('Failed to update location');
    return response.data;
  },

  async deleteLocation(id: string): Promise<void> {
    await nexusClient.deleteLocation(id);
  },
};
