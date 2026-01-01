/**
 * Earnings Service
 * Provides API integration for employee earnings and compensation
 */

import { PayLinQClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const paylinqClient = new PayLinQClient(apiClient);

export interface EarningsBreakdown {
  period: string;
  grossPay: number;
  netPay: number;
  deductions: {
    name: string;
    amount: number;
    type: 'pre-tax' | 'post-tax' | 'tax';
  }[];
  earnings: {
    name: string;
    amount: number;
    type: 'regular' | 'overtime' | 'bonus' | 'commission' | 'allowance';
  }[];
  taxes: {
    name: string;
    amount: number;
    rate: number;
  }[];
  ytdGross: number;
  ytdNet: number;
  ytdTaxes: number;
}

export interface CompensationSummary {
  baseSalary: number;
  frequency: 'hourly' | 'monthly' | 'annual';
  currency: string;
  effectiveDate: string;
  nextReviewDate?: string;
  ytdEarnings: {
    gross: number;
    net: number;
    taxes: number;
    deductions: number;
  };
}

export interface PayComponent {
  id: string;
  name: string;
  type: 'earning' | 'deduction' | 'tax';
  amount: number;
  rate?: number;
  frequency: string;
  isTaxable: boolean;
}

export const earningsService = {
  /**
   * Get earnings breakdown for a specific payroll run
   */
  async getEarningsBreakdown(payrollRunId: string): Promise<EarningsBreakdown> {
    const response = await paylinqClient.getPayrollRunDetails(payrollRunId);
    return response.data.earnings || response.data;
  },

  /**
   * Get compensation summary
   */
  async getCompensationSummary(): Promise<CompensationSummary> {
    const response = await paylinqClient.getCompensationSummary();
    return response.data.summary || response.data;
  },

  /**
   * Get all pay components for employee
   */
  async listPayComponents(): Promise<PayComponent[]> {
    const response = await paylinqClient.listPayComponents();
    return response.data.components || response.data || [];
  },

  /**
   * Get YTD (Year-to-Date) earnings
   */
  async getYTDEarnings(year?: number): Promise<any> {
    const response = await paylinqClient.getYTDEarnings(year);
    return response.data;
  },

  /**
   * Get earnings by period (monthly, quarterly, annual)
   */
  async getEarningsByPeriod(
    period: 'monthly' | 'quarterly' | 'annual',
    year: number
  ): Promise<any[]> {
    const response = await paylinqClient.getEarningsByPeriod(period, year);
    return response.data.earnings || response.data || [];
  },

  /**
   * Download earnings statement
   */
  async downloadStatement(payrollRunId: string): Promise<Blob> {
    const response = await paylinqClient.downloadEarningsStatement(payrollRunId);
    return response.data;
  }
};
