/**
 * ConfirmDialog Component
 * A confirmation dialog with customizable actions
 */

import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { Button } from '../Button';
import { Dialog } from '../Dialog';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  const iconBgStyles = {
    danger: 'bg-red-100',
    warning: 'bg-yellow-100',
    primary: 'bg-blue-100',
  };

  const iconStyles = {
    danger: 'text-red-600',
    warning: 'text-yellow-600',
    primary: 'text-blue-600',
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`
              px-4 py-2 rounded-md text-sm font-medium text-white
              focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${variantStyles[variant]}
            `}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-full ${iconBgStyles[variant]}`}>
            <AlertTriangle className={`w-6 h-6 ${iconStyles[variant]}`} />
          </div>
          <p className="text-gray-700 dark:text-gray-300 flex-1 pt-1">
            {message}
          </p>
        </div>
      </div>
    </Dialog>
  );
};

export default ConfirmDialog;
