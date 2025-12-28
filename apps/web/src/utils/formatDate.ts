import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

/**
 * Formats a date string or Date object to Dutch locale
 * @param date - Date string (ISO) or Date object
 * @param formatStr - Format string (default: 'dd MMM yyyy')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date | null | undefined, formatStr = 'dd MMM yyyy'): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: nl });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

/**
 * Formats a date to short format (dd-MM-yyyy)
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd-MM-yyyy');
}

/**
 * Formats a date with time (dd MMM yyyy HH:mm)
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd MMM yyyy HH:mm');
}
