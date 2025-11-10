// Utility functions for Paylinq

/**
 * Format SRD currency
 * @param amount - Amount in SRD
 * @param showSymbol - Whether to show SRD symbol
 */
export function formatCurrency(amount: number | null | undefined, showSymbol: boolean = true): string {
  // Handle null/undefined amounts
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? 'SRD 0.00' : '0.00';
  }
  
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `SRD ${formatted}` : formatted;
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date range
 */
export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * Calculate days between dates
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format time (HH:MM)
 */
export function formatTime(time?: string): string {
  if (!time) return '--:--';
  return time;
}

/**
 * Calculate hours between times
 */
export function calculateHours(startTime: string, endTime: string, breakHours: number = 0): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  const totalMinutes = endMinutes - startMinutes;
  const totalHours = totalMinutes / 60;
  
  return Math.max(0, totalHours - breakHours);
}

/**
 * Get status color classes
 */
export function getStatusColor(status: string | undefined | null): string {
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    terminated: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    calculating: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    calculated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    processed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    
    // Legacy status mappings for backwards compatibility
    ready: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };
  
  // Handle undefined, null, or empty string
  if (!status) {
    return statusColors.inactive;
  }
  
  return statusColors[status.toLowerCase()] || statusColors.inactive;
}

/**
 * Get initials from full name
 */
export function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ');
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

/**
 * Mask account number
 */
export function maskAccountNumber(accountNumber: string, visibleDigits: number = 4): string {
  if (accountNumber.length <= visibleDigits) return accountNumber;
  const masked = '•'.repeat(accountNumber.length - visibleDigits);
  return masked + accountNumber.slice(-visibleDigits);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return formatDate(dateString);
}
