/**
 * useToast Hook
 * 
 * Provides access to the global toast notification system.
 * This is a bridge to the ToastContext for use throughout the application.
 */

import { useContext } from 'react';

import { ToastContext } from '@/contexts/ToastContext';

interface ShowOptions {
  duration?: number;
  action?: () => void;
}

export interface Toast {
  show: (message: string, options?: ShowOptions) => string;
  dismiss: (id: string) => void;
}

export function useToast(): Toast {
  const context = useContext(ToastContext);
  
  if (!context) {
    // Fallback if ToastProvider is not in the tree
    return {
      show: (message: string) => {
        console.warn('Toast: ToastProvider not found in component tree', message);
        return '';
      },
      dismiss: () => {
        console.warn('Toast: ToastProvider not found in component tree');
      }
    };
  }

  return context;
}
