/**
 * Tests for DeductionModal
 * 
 * Tests the complex deduction form modal with employee selection,
 * calculation types, and date range handling.
 * Following industry standards from TESTING_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeductionModal from '@/features/payroll/components/modals/DeductionModal';

// Mock dependencies
vi.mock('@recruitiq/ui', () => ({
  Dialog: ({ isOpen, onClose, children, title }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="dialog" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        <div>{children}</div>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
  FormField: ({ label, children, error }: any) => (
    <div data-testid="form-field">
      <label>{label}</label>
      {children}
      {error && <span className="error">{error}</span>}
    </div>
  ),
  Input: ({ name, value, onChange, type, ...props }: any) => (
    <input
      data-testid={`input-${name}`}
      name={name}
      value={value}
      onChange={onChange}
      type={type || 'text'}
      {...props}
    />
  ),
  TextArea: ({ name, value, onChange, ...props }: any) => (
    <textarea
      data-testid={`textarea-${name}`}
      name={name}
      value={value}
      onChange={onChange}
      {...props}
    />
  ),
  Select: ({ name, value, onChange, children, ...props }: any) => (
    <select
      data-testid={`select-${name}`}
      name={name}
      value={value}
      onChange={onChange}
      {...props}
    >
      {children}
    </select>
  ),
}));

describe('DeductionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Initial State', () => {
    it('should render modal when isOpen is true', () => {
      render(<DeductionModal {...defaultProps} />);
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<DeductionModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should display "Add" title when no deduction provided', () => {
      render(<DeductionModal {...defaultProps} />);
      
      expect(screen.getByText(/Add|New.*Deduction/i)).toBeInTheDocument();
    });

    it('should display "Edit" title when deduction is provided', () => {
      const deduction = {
        id: '123',
        employeeId: 'emp-001',
        deductionCode: 'HEALTH_INS',
        deductionName: 'Health Insurance',
        deductionType: 'VOLUNTARY' as const,
        deductionAmount: 100,
        isActive: true,
      };

      render(<DeductionModal {...defaultProps} deduction={deduction} />);
      
      expect(screen.getByText(/Edit.*Deduction/i)).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('should render employee selection field', () => {
      render(<DeductionModal {...defaultProps} />);
      
      expect(screen.getByTestId('input-employeeId')).toBeInTheDocument();
    });

    it('should render deduction code field', () => {
      render(<DeductionModal {...defaultProps} />);
      
      expect(screen.getByTestId('input-deductionCode')).toBeInTheDocument();
    });

    it('should render deduction name field', () => {
      render(<DeductionModal {...defaultProps} />);
      
      expect(screen.getByTestId('input-deductionName')).toBeInTheDocument();
    });

    it('should render deduction type selector', () => {
      render(<DeductionModal {...defaultProps} />);
      
      expect(screen.getByTestId('select-deductionType')).toBeInTheDocument();
    });

    it('should render amount and percentage fields', () => {
      render(<DeductionModal {...defaultProps} />);
      
      expect(screen.getByTestId('input-deductionAmount')).toBeInTheDocument();
      expect(screen.getByTestId('input-deductionPercentage')).toBeInTheDocument();
    });

    it('should render date range fields', () => {
      render(<DeductionModal {...defaultProps} />);
      
      expect(screen.getByTestId('input-startDate')).toBeInTheDocument();
      expect(screen.getByTestId('input-endDate')).toBeInTheDocument();
    });

    it('should render notes textarea', () => {
      render(<DeductionModal {...defaultProps} />);
      
      expect(screen.getByTestId('textarea-notes')).toBeInTheDocument();
    });
  });

  describe('Deduction Types', () => {
    it('should handle STATUTORY deduction type', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      const typeSelect = screen.getByTestId('select-deductionType');
      await user.selectOptions(typeSelect, 'STATUTORY');
      
      expect(typeSelect).toHaveValue('STATUTORY');
    });

    it('should handle VOLUNTARY deduction type', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      const typeSelect = screen.getByTestId('select-deductionType');
      await user.selectOptions(typeSelect, 'VOLUNTARY');
      
      expect(typeSelect).toHaveValue('VOLUNTARY');
    });

    it('should handle GARNISHMENT deduction type', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      const typeSelect = screen.getByTestId('select-deductionType');
      await user.selectOptions(typeSelect, 'GARNISHMENT');
      
      expect(typeSelect).toHaveValue('GARNISHMENT');
    });

    it('should handle LOAN deduction type', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      const typeSelect = screen.getByTestId('select-deductionType');
      await user.selectOptions(typeSelect, 'LOAN');
      
      expect(typeSelect).toHaveValue('LOAN');
    });
  });

  describe('Amount Calculation', () => {
    it('should accept fixed amount', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      const amountInput = screen.getByTestId('input-deductionAmount');
      await user.type(amountInput, '250.50');
      
      expect(amountInput).toHaveValue('250.50');
    });

    it('should accept percentage value', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      const percentageInput = screen.getByTestId('input-deductionPercentage');
      await user.type(percentageInput, '10.5');
      
      expect(percentageInput).toHaveValue('10.5');
    });

    it('should handle max amount limit', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      const maxAmountInput = screen.getByTestId('input-maxAmount');
      await user.type(maxAmountInput, '5000');
      
      expect(maxAmountInput).toHaveValue('5000');
    });
  });

  describe('Date Range Handling', () => {
    it('should accept start date', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      const startDateInput = screen.getByTestId('input-startDate');
      await user.type(startDateInput, '2025-01-01');
      
      expect(startDateInput).toHaveValue('2025-01-01');
    });

    it('should accept end date', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      const endDateInput = screen.getByTestId('input-endDate');
      await user.type(endDateInput, '2025-12-31');
      
      expect(endDateInput).toHaveValue('2025-12-31');
    });

    it('should validate end date is after start date', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      await user.type(screen.getByTestId('input-startDate'), '2025-12-31');
      await user.type(screen.getByTestId('input-endDate'), '2025-01-01');
      
      const submitButton = screen.getByText(/Submit|Save|Create/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/end date.*after.*start date/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate required employee ID', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      const submitButton = screen.getByText(/Submit|Save|Create/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/employee.*required/i)).toBeInTheDocument();
      });
    });

    it('should validate required deduction code', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      await user.type(screen.getByTestId('input-employeeId'), 'emp-001');
      
      const submitButton = screen.getByText(/Submit|Save|Create/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/code.*required/i)).toBeInTheDocument();
      });
    });

    it('should validate required deduction name', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      await user.type(screen.getByTestId('input-employeeId'), 'emp-001');
      await user.type(screen.getByTestId('input-deductionCode'), 'DED001');
      
      const submitButton = screen.getByText(/Submit|Save|Create/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/name.*required/i)).toBeInTheDocument();
      });
    });

    it('should validate amount or percentage is provided', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      await user.type(screen.getByTestId('input-employeeId'), 'emp-001');
      await user.type(screen.getByTestId('input-deductionCode'), 'DED001');
      await user.type(screen.getByTestId('input-deductionName'), 'Test Deduction');
      
      // Don't enter amount or percentage
      
      const submitButton = screen.getByText(/Submit|Save|Create/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/amount.*percentage/i)).toBeInTheDocument();
      });
    });

    it('should validate percentage is between 0 and 100', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      const percentageInput = screen.getByTestId('input-deductionPercentage');
      await user.type(percentageInput, '150');
      
      const submitButton = screen.getByText(/Submit|Save|Create/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/percentage.*0.*100/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      
      render(<DeductionModal {...defaultProps} />);
      
      // Fill all required fields
      await user.type(screen.getByTestId('input-employeeId'), 'emp-001');
      await user.type(screen.getByTestId('input-deductionCode'), 'HEALTH_INS');
      await user.type(screen.getByTestId('input-deductionName'), 'Health Insurance');
      await user.selectOptions(screen.getByTestId('select-deductionType'), 'VOLUNTARY');
      await user.type(screen.getByTestId('input-deductionAmount'), '150');
      await user.type(screen.getByTestId('input-startDate'), '2025-01-01');
      
      const submitButton = screen.getByText(/Submit|Save|Create/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
        const submittedData = mockOnSubmit.mock.calls[0][0];
        expect(submittedData.employeeId).toBe('emp-001');
        expect(submittedData.deductionCode).toBe('HEALTH_INS');
        expect(submittedData.deductionName).toBe('Health Insurance');
      });
    });

    it('should close modal after successful submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      
      render(<DeductionModal {...defaultProps} />);
      
      // Fill required fields
      await user.type(screen.getByTestId('input-employeeId'), 'emp-001');
      await user.type(screen.getByTestId('input-deductionCode'), 'TEST');
      await user.type(screen.getByTestId('input-deductionName'), 'Test');
      await user.type(screen.getByTestId('input-deductionAmount'), '100');
      
      const submitButton = screen.getByText(/Submit|Save|Create/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode', () => {
    const existingDeduction = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      employeeId: 'emp-001',
      deductionCode: 'PENSION',
      deductionName: 'Pension Contribution',
      deductionType: 'STATUTORY' as const,
      deductionAmount: 200,
      deductionPercentage: null,
      maxAmount: null,
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      isActive: true,
      notes: 'Mandatory pension contribution',
    };

    it('should populate form with existing deduction data', () => {
      render(<DeductionModal {...defaultProps} deduction={existingDeduction} />);
      
      expect(screen.getByTestId('input-employeeId')).toHaveValue('emp-001');
      expect(screen.getByTestId('input-deductionCode')).toHaveValue('PENSION');
      expect(screen.getByTestId('input-deductionName')).toHaveValue('Pension Contribution');
      expect(screen.getByTestId('select-deductionType')).toHaveValue('STATUTORY');
      expect(screen.getByTestId('input-deductionAmount')).toHaveValue('200');
    });

    it('should update deduction with edited data', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      
      render(<DeductionModal {...defaultProps} deduction={existingDeduction} />);
      
      // Update amount
      const amountInput = screen.getByTestId('input-deductionAmount');
      await user.clear(amountInput);
      await user.type(amountInput, '250');
      
      const submitButton = screen.getByText(/Submit|Save|Update/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
        const submittedData = mockOnSubmit.mock.calls[0][0];
        expect(submittedData.deductionAmount).toBe('250');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<DeductionModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      // Tab to first input
      await user.tab();
      expect(screen.getByTestId('input-employeeId')).toHaveFocus();
      
      // Tab to next input
      await user.tab();
      expect(screen.getByTestId('input-deductionCode')).toHaveFocus();
    });
  });

  describe('Cancel Action', () => {
    it('should call onClose when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<DeductionModal {...defaultProps} />);
      
      const cancelButton = screen.getByText(/Cancel/i);
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should disable form during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit: any;
      const submitPromise = new Promise((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValue(submitPromise);
      
      render(<DeductionModal {...defaultProps} />);
      
      // Fill and submit
      await user.type(screen.getByTestId('input-employeeId'), 'emp-001');
      await user.type(screen.getByTestId('input-deductionCode'), 'TEST');
      await user.type(screen.getByTestId('input-deductionName'), 'Test');
      await user.type(screen.getByTestId('input-deductionAmount'), '100');
      
      const submitButton = screen.getByText(/Submit|Save|Create/i);
      await user.click(submitButton);
      
      // Verify button is disabled during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
      
      resolveSubmit(undefined);
    });
  });
});
