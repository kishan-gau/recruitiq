/**
 * Reconciliation & Transaction Type Definitions
 * Aligns with backend schema: payroll.payment_transaction, payroll.reconciliation
 */

import { BaseEntity, PaymentMethod, Currency } from './common';

/**
 * Payment Status
 */
export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'cancelled'
  | 'reconciled';

/**
 * Reconciliation Type
 */
export type ReconciliationType = 'bank' | 'gl' | 'tax' | 'benefit';

/**
 * Reconciliation Status
 */
export type ReconciliationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Payment Transaction
 * Backend table: payroll.payment_transaction
 */
export interface PaymentTransaction extends BaseEntity {
  paycheckId?: string;
  payrollRunId?: string;
  employeeId?: string;
  
  // Payment details
  paymentMethod: PaymentMethod;
  paymentAmount: number;
  paymentDate?: string; // ISO date
  scheduledDate: string; // ISO date
  
  // Transaction tracking
  transactionReference?: string; // Internal reference number
  bankAccountNumber?: string;
  routingNumber?: string;
  
  // Status tracking
  paymentStatus: PaymentStatus;
  processedAt?: string; // ISO datetime
  failedAt?: string; // ISO datetime
  failureReason?: string;
  retryCount: number;
  reconciledAt?: string; // ISO datetime
  reconciledBy?: string;
  
  // Payment processor integration
  currency: Currency;
  processorName?: string; // Payment gateway/bank name
  processorTransactionId?: string; // External transaction ID
  
  notes?: string;
  
  // Populated fields
  employeeName?: string;
  runNumber?: string;
}

/**
 * Reconciliation
 * Backend table: payroll.reconciliation
 */
export interface Reconciliation extends BaseEntity {
  payrollRunId?: string;
  
  // Reconciliation details
  reconciliationType: ReconciliationType;
  reconciliationDate: string; // ISO date
  
  // Amounts
  expectedTotal?: number;
  actualTotal?: number;
  varianceAmount?: number;
  
  // Status
  status: ReconciliationStatus;
  reconciledBy?: string;
  reconciledAt?: string; // ISO datetime
  
  notes?: string;
  
  // Populated fields
  runNumber?: string;
  runName?: string;
}

/**
 * Create Payment Transaction Request
 */
export interface CreatePaymentTransactionRequest {
  paycheckId?: string;
  payrollRunId?: string;
  employeeId?: string;
  paymentMethod: PaymentMethod;
  paymentAmount: number;
  scheduledDate: string; // ISO date
  bankAccountNumber?: string;
  routingNumber?: string;
  transactionReference?: string;
  currency?: Currency;
  processorName?: string;
  notes?: string;
}

/**
 * Update Payment Transaction Request
 */
export interface UpdatePaymentTransactionRequest {
  paymentStatus?: PaymentStatus;
  paymentDate?: string; // ISO date
  processedAt?: string; // ISO datetime
  failureReason?: string;
  processorTransactionId?: string;
  notes?: string;
}

/**
 * Process Payment Request
 */
export interface ProcessPaymentRequest {
  transactionId: string;
  processorTransactionId?: string;
}

/**
 * Retry Payment Request
 */
export interface RetryPaymentRequest {
  transactionId: string;
  reason?: string;
}

/**
 * Create Reconciliation Request
 */
export interface CreateReconciliationRequest {
  payrollRunId?: string;
  reconciliationType: ReconciliationType;
  reconciliationDate: string; // ISO date
  expectedTotal?: number;
  actualTotal?: number;
  notes?: string;
}

/**
 * Update Reconciliation Request
 */
export interface UpdateReconciliationRequest {
  actualTotal?: number;
  status?: ReconciliationStatus;
  notes?: string;
}

/**
 * Complete Reconciliation Request
 */
export interface CompleteReconciliationRequest {
  reconciliationId: string;
  actualTotal: number;
  notes?: string;
}

/**
 * Payment Transaction Filters
 */
export interface PaymentTransactionFilters {
  payrollRunId?: string;
  employeeId?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  scheduledDate?: string;
  paymentDate?: string;
}

/**
 * Reconciliation Filters
 */
export interface ReconciliationFilters {
  payrollRunId?: string;
  reconciliationType?: ReconciliationType;
  status?: ReconciliationStatus;
  reconciliationDate?: string;
}

/**
 * Payment Summary
 */
export interface PaymentSummary {
  payrollRunId: string;
  totalAmount: number;
  totalTransactions: number;
  pendingCount: number;
  processedCount: number;
  failedCount: number;
  reconciledCount: number;
  byPaymentMethod: Record<PaymentMethod, {
    count: number;
    amount: number;
  }>;
}

/**
 * Reconciliation Summary
 */
export interface ReconciliationSummary {
  payrollRunId: string;
  reconciliationType: ReconciliationType;
  expectedTotal: number;
  actualTotal: number;
  varianceAmount: number;
  variancePercentage: number;
  isReconciled: boolean;
  discrepancies: Array<{
    description: string;
    amount: number;
  }>;
}

/**
 * Bulk Payment Processing Result
 */
export interface BulkPaymentProcessingResult {
  totalTransactions: number;
  successCount: number;
  failureCount: number;
  errors: Array<{
    transactionId: string;
    employeeName: string;
    error: string;
  }>;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Single payment transaction response
 */
export interface PaymentTransactionResponse {
  success: boolean;
  paymentTransaction: PaymentTransaction;
  message?: string;
}

/**
 * Payment transactions list response
 */
export interface PaymentTransactionsListResponse {
  success: boolean;
  paymentTransactions: PaymentTransaction[];
  count: number;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
}

/**
 * Single reconciliation response
 */
export interface ReconciliationResponse {
  success: boolean;
  reconciliation: Reconciliation;
  message?: string;
}

/**
 * Reconciliations list response
 */
export interface ReconciliationsListResponse {
  success: boolean;
  reconciliations: Reconciliation[];
  count: number;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
  };
}

/**
 * Reconciliation summary response
 */
export interface ReconciliationSummaryResponse {
  success: boolean;
  summary: ReconciliationSummary;
}

/**
 * Bulk payment processing result response
 */
export interface BulkPaymentProcessingResponse {
  success: boolean;
  result: BulkPaymentProcessingResult;
}
