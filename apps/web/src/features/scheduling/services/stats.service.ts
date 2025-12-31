/**
 * Schedule Statistics Service
 * API service for schedule analytics and statistics
 */

import { apiClient } from '@recruitiq/api-client';

export const statsService = {
  /**
   * Get schedule statistics
   */
  async getScheduleStats(filters?: any) {
    try {
      const response = await apiClient.get('/api/products/schedulehub/stats', {
        params: filters,
      });
      return response.data.stats || response.data;
    } catch (error) {
      console.error('Failed to get schedule stats:', error);
      throw error;
    }
  },

  /**
   * Get schedule statistics by period
   */
  async getScheduleStatsByPeriod(period: string, date?: string) {
    try {
      const response = await apiClient.get('/api/products/schedulehub/stats/period', {
        params: { period, date },
      });
      return response.data.stats || response.data;
    } catch (error) {
      console.error('Failed to get schedule stats by period:', error);
      throw error;
    }
  },

  /**
   * Get station coverage statistics
   */
  async getStationCoverageStats(filters?: any) {
    try {
      const response = await apiClient.get('/api/products/schedulehub/stats/station-coverage', {
        params: filters,
      });
      return response.data.stats || response.data;
    } catch (error) {
      console.error('Failed to get station coverage stats:', error);
      throw error;
    }
  },

  /**
   * Get schedule efficiency statistics
   */
  async getScheduleEfficiencyStats(filters?: any) {
    try {
      const response = await apiClient.get('/api/products/schedulehub/stats/efficiency', {
        params: filters,
      });
      return response.data.stats || response.data;
    } catch (error) {
      console.error('Failed to get schedule efficiency stats:', error);
      throw error;
    }
  },

  /**
   * Get schedule trends
   */
  async getScheduleTrends(type: string, period: string) {
    try {
      const response = await apiClient.get('/api/products/schedulehub/stats/trends', {
        params: { type, period },
      });
      return response.data.trends || response.data;
    } catch (error) {
      console.error('Failed to get schedule trends:', error);
      throw error;
    }
  },

  /**
   * Get real-time schedule metrics
   */
  async getRealTimeScheduleMetrics() {
    try {
      const response = await apiClient.get('/api/products/schedulehub/stats/real-time');
      return response.data.metrics || response.data;
    } catch (error) {
      console.error('Failed to get real-time schedule metrics:', error);
      throw error;
    }
  },
};
