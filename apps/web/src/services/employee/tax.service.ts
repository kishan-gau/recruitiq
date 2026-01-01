/**
 * Tax Service
 * 
 * Handles employee tax documents, withholding information, and W-4 forms.
 * Uses PayLinQClient for payroll-related tax operations.
 * 
 * @module services/employee/tax
 */

import { APIClient, PayLinQClient } from '@recruitiq/api-client';

// Singleton instances
const apiClient = new APIClient();
const paylinqClient = new PayLinQClient(apiClient);

/**
 * Tax document types
 */
export type TaxDocumentType = 'W2' | 'W4' | '1099' | 'Tax Summary' | 'State Tax' | 'Other';

/**
 * Tax document interface
 */
export interface TaxDocument {
  id: string;
  employeeId: string;
  year: number;
  documentType: TaxDocumentType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  status: 'available' | 'processing' | 'unavailable';
}

/**
 * Withholding information interface
 */
export interface WithholdingInfo {
  id: string;
  employeeId: string;
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
  allowances: number;
  additionalWithholding: number;
  exemptFromFederalTax: boolean;
  exemptFromStateTax: boolean;
  stateFilingStatus?: string;
  stateAllowances?: number;
  effectiveDate: string;
  updatedAt: string;
}

/**
 * W-4 form data interface
 */
export interface W4FormData {
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head_of_household';
  multipleJobs: boolean;
  claimDependents: boolean;
  dependentsAmount?: number;
  otherIncome?: number;
  deductions?: number;
  additionalWithholding?: number;
  signature: string;
  date: string;
}

/**
 * Tax Service
 * Provides methods for managing employee tax documents and withholding
 */
export const taxService = {
  /**
   * Lists all tax documents for the employee
   * 
   * @param filters - Optional filters (year, documentType)
   * @returns Promise resolving to array of tax documents
   */
  async listTaxDocuments(filters?: { year?: number; documentType?: TaxDocumentType }) {
    try {
      const response = await paylinqClient.getTaxDocuments(filters);
      return response.data.documents || response.data || [];
    } catch (error) {
      console.error('Failed to fetch tax documents:', error);
      throw error;
    }
  },

  /**
   * Gets a specific tax document by ID
   * 
   * @param documentId - Tax document ID
   * @returns Promise resolving to tax document details
   */
  async getTaxDocument(documentId: string) {
    try {
      const response = await paylinqClient.getTaxDocument(documentId);
      return response.data.document || response.data;
    } catch (error) {
      console.error(`Failed to fetch tax document ${documentId}:`, error);
      throw error;
    }
  },

  /**
   * Downloads a tax document
   * 
   * @param documentId - Tax document ID
   * @returns Promise resolving to download URL or blob
   */
  async downloadTaxDocument(documentId: string) {
    try {
      const response = await paylinqClient.downloadTaxDocument(documentId);
      return response.data;
    } catch (error) {
      console.error(`Failed to download tax document ${documentId}:`, error);
      throw error;
    }
  },

  /**
   * Gets current withholding information
   * 
   * @returns Promise resolving to withholding information
   */
  async getWithholdingInfo() {
    try {
      const response = await paylinqClient.getWithholdingInfo();
      return response.data.withholding || response.data;
    } catch (error) {
      console.error('Failed to fetch withholding info:', error);
      throw error;
    }
  },

  /**
   * Updates withholding information
   * 
   * @param data - Updated withholding data
   * @returns Promise resolving to updated withholding information
   */
  async updateWithholding(data: Partial<WithholdingInfo>) {
    try {
      const response = await paylinqClient.updateWithholding(data);
      return response.data.withholding || response.data;
    } catch (error) {
      console.error('Failed to update withholding:', error);
      throw error;
    }
  },

  /**
   * Submits a new W-4 form
   * 
   * @param formData - W-4 form data
   * @returns Promise resolving to submission confirmation
   */
  async submitW4Form(formData: W4FormData) {
    try {
      const response = await paylinqClient.submitW4Form(formData);
      return response.data;
    } catch (error) {
      console.error('Failed to submit W-4 form:', error);
      throw error;
    }
  },

  /**
   * Gets withholding history
   * 
   * @returns Promise resolving to array of historical withholding records
   */
  async getWithholdingHistory() {
    try {
      const response = await paylinqClient.getWithholdingHistory();
      return response.data.history || response.data || [];
    } catch (error) {
      console.error('Failed to fetch withholding history:', error);
      throw error;
    }
  },

  /**
   * Calculates estimated tax withholding based on form data
   * 
   * @param formData - W-4 form data for calculation
   * @returns Promise resolving to estimated withholding amounts
   */
  async calculateEstimatedWithholding(formData: Partial<W4FormData>) {
    try {
      const response = await paylinqClient.calculateWithholding(formData);
      return response.data.estimate || response.data;
    } catch (error) {
      console.error('Failed to calculate estimated withholding:', error);
      throw error;
    }
  },
};
