/**
 * Payment Service
 * 
 * Handles employee payment methods, direct deposit management, and payment history.
 * Uses PayLinQClient for payroll-related payment operations.
 * 
 * @module services/employee/payment
 */

import { APIClient, PayLinQClient } from '@recruitiq/api-client';

// Singleton instances
const apiClient = new APIClient();
const paylinqClient = new PayLinQClient(apiClient);

/**
 * Payment method types
 */
export type PaymentMethodType = 'direct_deposit' | 'check' | 'paycard';

/**
 * Account types for direct deposit
 */
export type AccountType = 'checking' | 'savings';

/**
 * Payment method interface
 */
export interface PaymentMethod {
  id: string;
  employeeId: string;
  methodType: PaymentMethodType;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Direct deposit specific fields
  bankName?: string;
  accountType?: AccountType;
  accountNumber?: string;
  routingNumber?: string;
  accountNickname?: string;
  allocationPercentage?: number;
  allocationAmount?: number;
  
  // Check specific fields
  checkMailingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

/**
 * Payment history item interface
 */
export interface PaymentHistoryItem {
  id: string;
  paymentDate: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  grossAmount: number;
  netAmount: number;
  paymentMethod: PaymentMethodType;
  status: 'pending' | 'processed' | 'cancelled';
  checkNumber?: string;
  depositDate?: string;
}

/**
 * Direct deposit form data interface
 */
export interface DirectDepositFormData {
  bankName: string;
  accountType: AccountType;
  accountNumber: string;
  routingNumber: string;
  accountNickname?: string;
  isPrimary: boolean;
  allocationPercentage?: number;
  allocationAmount?: number;
}

/**
 * Payment Service
 * Provides methods for managing employee payment methods and history
 */
export const paymentService = {
  /**
   * Lists all payment methods for the employee
   * 
   * @returns Promise resolving to array of payment methods
   */
  async listPaymentMethods() {
    try {
      const response = await paylinqClient.getPaymentMethods();
      return response.data.paymentMethods || response.data || [];
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      throw error;
    }
  },

  /**
   * Gets a specific payment method by ID
   * 
   * @param methodId - Payment method ID
   * @returns Promise resolving to payment method details
   */
  async getPaymentMethod(methodId: string) {
    try {
      const response = await paylinqClient.getPaymentMethod(methodId);
      return response.data.paymentMethod || response.data;
    } catch (error) {
      console.error(`Failed to fetch payment method ${methodId}:`, error);
      throw error;
    }
  },

  /**
   * Adds a new direct deposit payment method
   * 
   * @param data - Direct deposit form data
   * @returns Promise resolving to created payment method
   */
  async addDirectDeposit(data: DirectDepositFormData) {
    try {
      const response = await paylinqClient.addDirectDeposit(data);
      return response.data.paymentMethod || response.data;
    } catch (error) {
      console.error('Failed to add direct deposit:', error);
      throw error;
    }
  },

  /**
   * Updates an existing direct deposit payment method
   * 
   * @param methodId - Payment method ID
   * @param data - Updated direct deposit data
   * @returns Promise resolving to updated payment method
   */
  async updateDirectDeposit(methodId: string, data: Partial<DirectDepositFormData>) {
    try {
      const response = await paylinqClient.updateDirectDeposit(methodId, data);
      return response.data.paymentMethod || response.data;
    } catch (error) {
      console.error(`Failed to update direct deposit ${methodId}:`, error);
      throw error;
    }
  },

  /**
   * Deletes a payment method
   * 
   * @param methodId - Payment method ID
   * @returns Promise resolving to deletion confirmation
   */
  async deletePaymentMethod(methodId: string) {
    try {
      const response = await paylinqClient.deletePaymentMethod(methodId);
      return response.data;
    } catch (error) {
      console.error(`Failed to delete payment method ${methodId}:`, error);
      throw error;
    }
  },

  /**
   * Sets a payment method as primary
   * 
   * @param methodId - Payment method ID
   * @returns Promise resolving to updated payment method
   */
  async setPrimaryPaymentMethod(methodId: string) {
    try {
      const response = await paylinqClient.setPrimaryPaymentMethod(methodId);
      return response.data.paymentMethod || response.data;
    } catch (error) {
      console.error(`Failed to set primary payment method ${methodId}:`, error);
      throw error;
    }
  },

  /**
   * Gets payment history for the employee
   * 
   * @param filters - Optional filters (startDate, endDate, status)
   * @returns Promise resolving to array of payment history items
   */
  async getPaymentHistory(filters?: { 
    startDate?: string; 
    endDate?: string; 
    status?: 'pending' | 'processed' | 'cancelled';
  }) {
    try {
      const response = await paylinqClient.getPaymentHistory(filters);
      return response.data.payments || response.data || [];
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      throw error;
    }
  },

  /**
   * Validates bank account information
   * 
   * @param routingNumber - Bank routing number
   * @param accountNumber - Bank account number
   * @returns Promise resolving to validation result
   */
  async validateBankAccount(routingNumber: string, accountNumber: string) {
    try {
      const response = await paylinqClient.validateBankAccount({
        routingNumber,
        accountNumber,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to validate bank account:', error);
      throw error;
    }
  },

  /**
   * Gets bank information from routing number
   * 
   * @param routingNumber - Bank routing number
   * @returns Promise resolving to bank information
   */
  async getBankInfo(routingNumber: string) {
    try {
      const response = await paylinqClient.getBankInfo(routingNumber);
      return response.data.bank || response.data;
    } catch (error) {
      console.error('Failed to fetch bank info:', error);
      throw error;
    }
  },

  /**
   * Sends test deposit for verification
   * 
   * @param methodId - Payment method ID
   * @returns Promise resolving to test deposit confirmation
   */
  async sendTestDeposit(methodId: string) {
    try {
      const response = await paylinqClient.sendTestDeposit(methodId);
      return response.data;
    } catch (error) {
      console.error(`Failed to send test deposit for ${methodId}:`, error);
      throw error;
    }
  },

  /**
   * Verifies test deposit amounts
   * 
   * @param methodId - Payment method ID
   * @param amounts - Array of two test deposit amounts in cents
   * @returns Promise resolving to verification result
   */
  async verifyTestDeposit(methodId: string, amounts: [number, number]) {
    try {
      const response = await paylinqClient.verifyTestDeposit(methodId, amounts);
      return response.data;
    } catch (error) {
      console.error(`Failed to verify test deposit for ${methodId}:`, error);
      throw error;
    }
  },
};
