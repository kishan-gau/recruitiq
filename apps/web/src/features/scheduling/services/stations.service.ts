import { ScheduleHubClient, APIClient } from '@recruitiq/api-client';

const scheduleHubClient = new ScheduleHubClient(new APIClient());

export const stationsService = {
  /**
   * Lists all stations with optional filters
   */
  async listStations(filters?: { search?: string; isActive?: boolean }) {
    try {
      const response = await scheduleHubClient.getAllStations(filters);
      return response.data.stations || response.data || [];
    } catch (error) {
      console.error('Failed to list stations:', error);
      throw error;
    }
  },

  /**
   * Gets a single station by ID
   */
  async getStation(id: string) {
    try {
      const response = await scheduleHubClient.getStation(id);
      return response.data.station || response.data;
    } catch (error) {
      console.error(`Failed to get station ${id}:`, error);
      throw error;
    }
  },

  /**
   * Creates a new station
   */
  async createStation(data: any) {
    try {
      const response = await scheduleHubClient.createStation(data);
      return response.data.station || response.data;
    } catch (error) {
      console.error('Failed to create station:', error);
      throw error;
    }
  },

  /**
   * Updates an existing station
   */
  async updateStation(id: string, updates: any) {
    try {
      const response = await scheduleHubClient.updateStation(id, updates);
      return response.data.station || response.data;
    } catch (error) {
      console.error(`Failed to update station ${id}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a station (soft delete)
   */
  async deleteStation(id: string) {
    try {
      await scheduleHubClient.deleteStation(id);
    } catch (error) {
      console.error(`Failed to delete station ${id}:`, error);
      throw error;
    }
  },

  /**
   * Gets station coverage statistics
   */
  async getStationCoverage(stationId: string, startDate: string, endDate: string) {
    try {
      const response = await apiClient.get(`/api/products/schedulehub/stations/${stationId}/coverage`, {
        params: { startDate, endDate },
      });
      return response.data.coverage || response.data;
    } catch (error) {
      console.error(`Failed to get station ${stationId} coverage:`, error);
      throw error;
    }
  },

  /**
   * Gets all stations coverage summary
   */
  async getAllStationsCoverage(startDate: string, endDate: string) {
    try {
      const response = await apiClient.get('/api/products/schedulehub/stations/coverage', {
        params: { startDate, endDate },
      });
      return response.data.coverage || response.data;
    } catch (error) {
      console.error('Failed to get all stations coverage:', error);
      throw error;
    }
  },
};
