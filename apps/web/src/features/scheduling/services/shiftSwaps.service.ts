/**
 * Shift Swaps Service
 * API service for shift swap marketplace and requests
 */

import { apiClient } from '@recruitiq/api-client';

export const shiftSwapsService = {
  /**
   * Get marketplace shift swap offers
   */
  async getMarketplace(params?: any) {
    const response = await apiClient.get('/api/products/schedulehub/shift-swaps/marketplace', { params });
    return response.data;
  },

  /**
   * Get my shift swap offers
   */
  async getMyOffers() {
    const response = await apiClient.get('/api/products/schedulehub/shift-swaps/my-offers');
    return response.data;
  },

  /**
   * Get specific shift swap offer
   */
  async getOffer(id: string) {
    const response = await apiClient.get(`/api/products/schedulehub/shift-swaps/${id}`);
    return response.data;
  },

  /**
   * Create shift swap offer
   */
  async createOffer(data: any) {
    const response = await apiClient.post('/api/products/schedulehub/shift-swaps', data);
    return response.data;
  },

  /**
   * Request shift swap
   */
  async requestSwap(offerId: string, data: any) {
    const response = await apiClient.post(`/api/products/schedulehub/shift-swaps/${offerId}/request`, data);
    return response.data;
  },

  /**
   * Get shift swap requests
   */
  async getRequests(params?: any) {
    const response = await apiClient.get('/api/products/schedulehub/shift-swaps/requests', { params });
    return response.data;
  },

  /**
   * Get specific shift swap request
   */
  async getRequest(id: string) {
    const response = await apiClient.get(`/api/products/schedulehub/shift-swaps/requests/${id}`);
    return response.data;
  },

  /**
   * Accept shift swap request
   */
  async acceptRequest(requestId: string) {
    const response = await apiClient.post(`/api/products/schedulehub/shift-swaps/requests/${requestId}/accept`);
    return response.data;
  },

  /**
   * Reject shift swap request
   */
  async rejectRequest(requestId: string, reason?: string) {
    const response = await apiClient.post(`/api/products/schedulehub/shift-swaps/requests/${requestId}/reject`, { reason });
    return response.data;
  },

  /**
   * Get pending shift swap approvals (manager view)
   */
  async getPendingApprovals(params?: any) {
    const response = await apiClient.get('/api/products/schedulehub/shift-swaps/pending-approvals', { params });
    return response.data;
  },

  /**
   * Approve shift swap (manager action)
   */
  async approveSwap(swapId: string) {
    const response = await apiClient.post(`/api/products/schedulehub/shift-swaps/${swapId}/approve`);
    return response.data;
  },

  /**
   * Reject shift swap (manager action)
   */
  async rejectSwap(swapId: string, reason?: string) {
    const response = await apiClient.post(`/api/products/schedulehub/shift-swaps/${swapId}/reject`, { reason });
    return response.data;
  },

  /**
   * Cancel shift swap offer
   */
  async cancelSwap(swapId: string) {
    const response = await apiClient.delete(`/api/products/schedulehub/shift-swaps/${swapId}`);
    return response.data;
  },

  /**
   * Bulk approve swaps
   */
  async bulkApprove(swapIds: string[]) {
    const response = await apiClient.post('/api/products/schedulehub/shift-swaps/bulk-approve', { swapIds });
    return response.data;
  },

  /**
   * Bulk reject swaps
   */
  async bulkReject(swapIds: string[], reason?: string) {
    const response = await apiClient.post('/api/products/schedulehub/shift-swaps/bulk-reject', { swapIds, reason });
    return response.data;
  },
};
