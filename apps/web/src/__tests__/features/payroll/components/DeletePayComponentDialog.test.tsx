/**
 * Tests for DeletePayComponentDialog component
 * 
 * Tests the delete confirmation dialog for pay components.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeletePayComponentDialog from '@/features/payroll/components/modals/DeletePayComponentDialog';

// Mock the ConfirmDialog component from @recruitiq/ui
vi.mock('@recruitiq/ui', () => ({
  ConfirmDialog: ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, variant, isLoading }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirm-dialog" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onClose} disabled={isLoading}>
          {cancelText}
        </button>
        <button onClick={onConfirm} disabled={isLoading} data-variant={variant}>
          {confirmText}
        </button>
        {isLoading && <span data-testid="loading-indicator">Loading...</span>}
      </div>
    );
  },
}));

describe('DeletePayComponentDialog', () => {
  const mockComponent = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Basic Salary',
    code: 'BASIC_SALARY',
    type: 'earning' as const,
  };

  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnConfirm: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnConfirm = vi.fn();
  });

  describe('Rendering', () => {
    it('should render dialog when isOpen is true and component is provided', () => {
      // Arrange & Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
        />
      );

      // Assert
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      // Arrange & Act
      render(
        <DeletePayComponentDialog
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
        />
      );

      // Assert
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });

    it('should not render when component is null', () => {
      // Arrange & Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={null}
        />
      );

      // Assert
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });

    it('should display correct title', () => {
      // Arrange & Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
        />
      );

      // Assert
      expect(screen.getByText('Delete Pay Component')).toBeInTheDocument();
    });

    it('should display component details in message', () => {
      // Arrange & Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
        />
      );

      // Assert
      const message = screen.getByText(/Are you sure you want to delete/);
      expect(message).toBeInTheDocument();
      expect(message.textContent).toContain('earning');
      expect(message.textContent).toContain('Basic Salary');
      expect(message.textContent).toContain('BASIC_SALARY');
    });

    it('should display warning about action being irreversible', () => {
      // Arrange & Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
        />
      );

      // Assert
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
    });

    it('should display warning about affecting payroll calculations', () => {
      // Arrange & Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
        />
      );

      // Assert
      expect(screen.getByText(/may affect existing payroll calculations/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
        />
      );

      // Act
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onConfirm when Delete button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
        />
      );

      // Act
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      // Assert
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      // Arrange & Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
          isLoading={true}
        />
      );

      // Assert
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('should disable buttons when isLoading is true', () => {
      // Arrange & Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
          isLoading={true}
        />
      );

      // Assert
      const cancelButton = screen.getByText('Cancel');
      const deleteButton = screen.getByText('Delete');
      expect(cancelButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });

    it('should not show loading indicator when isLoading is false', () => {
      // Arrange & Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
          isLoading={false}
        />
      );

      // Assert
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Component Variants', () => {
    it('should use danger variant for confirmation dialog', () => {
      // Arrange & Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
        />
      );

      // Assert
      const deleteButton = screen.getByText('Delete');
      expect(deleteButton).toHaveAttribute('data-variant', 'danger');
    });

    it('should handle deduction component type correctly', () => {
      // Arrange
      const deductionComponent = {
        ...mockComponent,
        name: 'Health Insurance',
        code: 'HEALTH_INS',
        type: 'deduction' as const,
      };

      // Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={deductionComponent}
        />
      );

      // Assert
      const message = screen.getByText(/Are you sure you want to delete/);
      expect(message.textContent).toContain('deduction');
      expect(message.textContent).toContain('Health Insurance');
      expect(message.textContent).toContain('HEALTH_INS');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA modal attributes', () => {
      // Arrange & Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
        />
      );

      // Assert
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should be keyboard navigable', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
        />
      );

      // Act - Tab to first button
      await user.tab();
      expect(screen.getByText('Cancel')).toHaveFocus();

      // Act - Tab to second button
      await user.tab();
      expect(screen.getByText('Delete')).toHaveFocus();
    });

    it('should support Enter key for confirmation', async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={mockComponent}
        />
      );

      // Act - Tab to Delete button and press Enter
      await user.tab();
      await user.tab();
      await user.keyboard('{Enter}');

      // Assert
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle long component names', () => {
      // Arrange
      const longNameComponent = {
        ...mockComponent,
        name: 'Very Long Component Name That Should Be Displayed Properly In The Dialog Without Breaking The Layout',
      };

      // Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={longNameComponent}
        />
      );

      // Assert
      expect(screen.getByText(/Very Long Component Name/)).toBeInTheDocument();
    });

    it('should handle special characters in component code', () => {
      // Arrange
      const specialCharComponent = {
        ...mockComponent,
        code: 'SALARY-2025_Q1',
      };

      // Act
      render(
        <DeletePayComponentDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          component={specialCharComponent}
        />
      );

      // Assert
      expect(screen.getByText(/SALARY-2025_Q1/)).toBeInTheDocument();
    });
  });
});
