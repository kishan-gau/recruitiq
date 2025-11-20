/**
 * Portal Customers Service
 * 
 * Wraps PortalAPI customer management methods
 */
import { PortalAPI, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const portalClient = new PortalAPI(apiClient);

export const customersService = {
  /**
   * Get all customers with filters
   */
  async getCustomers(filters = {}) {
    const response = await portalClient.getCustomers(filters);
    return response.customers || response.data;
  },

  /**
   * Get customer by ID
   */
  async getCustomer(id: string) {
    const response = await portalClient.getCustomer(id);
    return response.customer || response.data;
  },

  /**
   * Create a new customer
   */
  async createCustomer(data: any) {
    const response = await portalClient.createCustomer(data);
    return response.customer || response.data;
  },

  /**
   * Update customer
   */
  async updateCustomer(id: string, data: any) {
    const response = await portalClient.updateCustomer(id, data);
    return response.customer || response.data;
  },

  /**
   * Delete customer
   */
  async deleteCustomer(id: string) {
    const response = await portalClient.deleteCustomer(id);
    return response;
  },

  /**
   * Get customer usage statistics
   */
  async getCustomerUsage(id: string, days = 30) {
    const response = await portalClient.getCustomerUsage(id, days);
    return response.usage || response.data;
  },

  /**
   * Get customer activity log
   */
  async getCustomerActivity(id: string, limit = 10) {
    const response = await portalClient.getCustomerActivity(id, limit);
    return response.activity || response.data;
  },

  /**
   * Renew customer license
   */
  async renewLicense(customerId: string, months = 12) {
    const response = await portalClient.renewLicense(customerId, months);
    return response;
  },

  /**
   * Suspend customer license
   */
  async suspendLicense(customerId: string) {
    const response = await portalClient.suspendLicense(customerId);
    return response;
  },

  /**
   * Reactivate customer license
   */
  async reactivateLicense(customerId: string) {
    const response = await portalClient.reactivateLicense(customerId);
    return response;
  },

  /**
   * Download license file
   */
  async downloadLicenseFile(customerId: string) {
    const response = await portalClient.downloadLicenseFile(customerId);
    return response;
  },
};
