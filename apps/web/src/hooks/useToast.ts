/**
 * useToast Hook
 * 
 * Provides access to the global toast notification system.
 * This is a bridge to the ToastContext for use throughout the application.
 */

import { useContext } from 'react';

import { ToastContext, ToastContextType } from '@/contexts/ToastContext';

/**
 * Hook to access toast notifications
 * Must be used within a ToastProvider
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}

