/**
 * Formatting Utilities
 * 
 * Common formatting functions for currency, dates, numbers, etc.
 */

import { format, parseISO } from 'date-fns';

/**
 * Format a number as currency
 * 
 * @param amount - The amount to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(1234.56, 'EUR') // "€1,234.56"
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Format a date string or Date object
 * 
 * @param date - Date string or Date object
 * @param formatString - Format string (default: 'MMM dd, yyyy')
 * @returns Formatted date string
 * 
 * @example
 * formatDate('2024-03-20') // "Mar 20, 2024"
 * formatDate(new Date(), 'yyyy-MM-dd') // "2024-03-20"
 */
export const formatDate = (
  date: string | Date,
  formatString: string = 'MMM dd, yyyy'
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
};

/**
 * Format a date as relative time (e.g., "2 hours ago")
 * 
 * @param date - Date string or Date object
 * @returns Relative time string
 * 
 * @example
 * formatRelativeTime('2024-03-20T10:00:00') // "2 hours ago"
 */
export const formatRelativeTime = (date: string | Date): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  
  return formatDate(dateObj);
};

/**
 * Format a number as a percentage
 * 
 * @param value - The value to format (0.1234 = 12.34%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercentage(0.1234) // "12.34%"
 * formatPercentage(0.5, 0) // "50%"
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format a number with thousands separators
 * 
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(1234.5678, 2) // "1,234.57"
 */
export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format hours as a time duration
 * 
 * @param hours - Number of hours
 * @returns Formatted duration string
 * 
 * @example
 * formatDuration(1.5) // "1h 30m"
 * formatDuration(8) // "8h 0m"
 */
export const formatDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

/**
 * Format a file size in bytes to human-readable format
 * 
 * @param bytes - Size in bytes
 * @returns Formatted size string
 * 
 * @example
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1536000) // "1.46 MB"
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format a phone number
 * 
 * @param phone - Phone number string
 * @returns Formatted phone number
 * 
 * @example
 * formatPhoneNumber('1234567890') // "(123) 456-7890"
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
};

/**
 * Truncate text with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 50)
 * @returns Truncated text
 * 
 * @example
 * truncateText('This is a very long text', 10) // "This is a..."
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Format initials from a full name
 * 
 * @param name - Full name
 * @returns Initials (max 2 characters)
 * 
 * @example
 * formatInitials('John Doe') // "JD"
 * formatInitials('Sarah Johnson') // "SJ"
 */
export const formatInitials = (name: string): string => {
  if (!name) return '';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Format a status badge with color
 * Used for consistent status display across the app
 * 
 * @param status - Status string
 * @returns Tailwind CSS classes for the badge
 */
export const getStatusColor = (
  status: string | undefined | null
): { bg: string; text: string; border: string } => {
  // Handle undefined, null, or empty string
  if (!status) {
    return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
  }
  
  const statusLower = status.toLowerCase();
  
  const statusMap: Record<string, { bg: string; text: string; border: string }> = {
    // Payroll statuses
    draft: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    approved: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    processed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    
    // Timesheet statuses
    submitted: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    
    // General statuses
    active: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    completed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  };
  
  return (
    statusMap[statusLower] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-200',
    }
  );
};

/**
 * Format priority level with color
 * 
 * @param priority - Priority string ('high', 'medium', 'low')
 * @returns Tailwind CSS color class
 */
export const getPriorityColor = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    high: 'text-red-600',
    medium: 'text-orange-600',
    low: 'text-gray-600',
  };
  
  return priorityMap[priority.toLowerCase()] || 'text-gray-600';
};
