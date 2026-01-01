/**
 * Tests for PayComponentFormModal
 * 
 * Tests the complex pay component form modal with multiple calculation types,
 * conditional fields, and formula builder integration.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PayComponentFormModal from '@/features/payroll/components/modals/PayComponentFormModal';

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

vi.mock('@/components/ui/CurrencySelector', () => ({
  default: ({ value, onChange }: any) => (
    <select
      data-testid="currency-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="SRD">SRD</option>
      <option value="USD">USD</option>
      <option value="EUR">EUR</option>
    </select>
  ),
}));

vi.mock('@/features/payroll/components/modals/FormulaBuilder', () => ({
  default: ({ value, onChange }: any) => (
    <div data-testid="formula-builder">
      <textarea
        data-testid="formula-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

describe('PayComponentFormModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    mode: 'add' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Initial State', () => {
    it('should render modal when isOpen is true', () => {
      render(<PayComponentFormModal {...defaultProps} />);
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<PayComponentFormModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should display "Add" title in add mode', () => {
      render(<PayComponentFormModal {...defaultProps} mode="add" />);
      
      expect(screen.getByText(/Add/i)).toBeInTheDocument();
    });

    it('should display "Edit" title in edit mode', () => {
      const component = {
        id: '123',
        name: 'Basic Salary',
        code: 'BASIC_SALARY',
        type: 'earning' as const,
        category: 'salary',
        calculationType: 'fixed' as const,
        isRecurring: true,
        isTaxable: true,
        status: 'active' as const,
        description: 'Basic monthly salary',
      };

      render(
        <PayComponentFormModal
          {...defaultProps}
          mode="edit"
          component={component}
        />
      );
      
      expect(screen.getByText(/Edit/i)).toBeInTheDocument();
    });

    it('should render all required form fields', () => {
      render(<PayComponentFormModal {...defaultProps} />);
      
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
      expect(screen.getByTestId('input-code')).toBeInTheDocument();
      expect(screen.getByTestId('select-type')).toBeInTheDocument();
      expect(screen.getByTestId('input-category')).toBeInTheDocument();
      expect(screen.getByTestId('select-calculationType')).toBeInTheDocument();
      expect(screen.getByTestId('textarea-description')).toBeInTheDocument();
    });
  });

  describe('Form Fields - Basic Inputs', () => {
    it('should handle name input changes', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const nameInput = screen.getByTestId('input-name');
      await user.type(nameInput, 'Housing Allowance');
      
      expect(nameInput).toHaveValue('Housing Allowance');
    });

    it('should handle code input changes', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const codeInput = screen.getByTestId('input-code');
      await user.type(codeInput, 'HOUSING_ALLOW');
      
      expect(codeInput).toHaveValue('HOUSING_ALLOW');
    });

    it('should handle type selection', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const typeSelect = screen.getByTestId('select-type');
      await user.selectOptions(typeSelect, 'deduction');
      
      expect(typeSelect).toHaveValue('deduction');
    });

    it('should handle category input', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const categoryInput = screen.getByTestId('input-category');
      await user.type(categoryInput, 'Allowance');
      
      expect(categoryInput).toHaveValue('Allowance');
    });

    it('should handle description textarea', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const descriptionInput = screen.getByTestId('textarea-description');
      await user.type(descriptionInput, 'Monthly housing allowance');
      
      expect(descriptionInput).toHaveValue('Monthly housing allowance');
    });
  });

  describe('Calculation Type - Conditional Fields', () => {
    it('should show default value field when calculationType is "fixed"', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const calcTypeSelect = screen.getByTestId('select-calculationType');
      await user.selectOptions(calcTypeSelect, 'fixed');
      
      await waitFor(() => {
        expect(screen.getByTestId('input-defaultValue')).toBeInTheDocument();
      });
    });

    it('should show default value field when calculationType is "percentage"', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const calcTypeSelect = screen.getByTestId('select-calculationType');
      await user.selectOptions(calcTypeSelect, 'percentage');
      
      await waitFor(() => {
        expect(screen.getByTestId('input-defaultValue')).toBeInTheDocument();
      });
    });

    it('should show formula builder when calculationType is "formula"', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const calcTypeSelect = screen.getByTestId('select-calculationType');
      await user.selectOptions(calcTypeSelect, 'formula');
      
      await waitFor(() => {
        expect(screen.getByTestId('formula-builder')).toBeInTheDocument();
      });
    });

    it('should allow entering formula in formula mode', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const calcTypeSelect = screen.getByTestId('select-calculationType');
      await user.selectOptions(calcTypeSelect, 'formula');
      
      await waitFor(() => {
        const formulaInput = screen.getByTestId('formula-input');
        expect(formulaInput).toBeInTheDocument();
      });
      
      const formulaInput = screen.getByTestId('formula-input');
      await user.type(formulaInput, 'base_salary * 0.1');
      
      expect(formulaInput).toHaveValue('base_salary * 0.1');
    });
  });

  describe('Currency Selection', () => {
    it('should display currency selector', () => {
      render(<PayComponentFormModal {...defaultProps} />);
      
      expect(screen.getByTestId('currency-selector')).toBeInTheDocument();
    });

    it('should handle currency changes', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const currencySelect = screen.getByTestId('currency-selector');
      await user.selectOptions(currencySelect, 'USD');
      
      expect(currencySelect).toHaveValue('USD');
    });

    it('should default to SRD currency', () => {
      render(<PayComponentFormModal {...defaultProps} />);
      
      const currencySelect = screen.getByTestId('currency-selector');
      expect(currencySelect).toHaveValue('SRD');
    });
  });

  describe('Form Validation', () => {
    it('should validate required name field', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const submitButton = screen.getByText(/Submit|Create|Save/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        const errors = screen.queryAllByText(/required/i);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it('should validate required code field', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      // Fill name but not code
      await user.type(screen.getByTestId('input-name'), 'Test Component');
      
      const submitButton = screen.getByText(/Submit|Create|Save/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/code.*required/i)).toBeInTheDocument();
      });
    });

    it('should validate code format', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      await user.type(screen.getByTestId('input-name'), 'Test Component');
      await user.type(screen.getByTestId('input-code'), 'invalid code!');
      
      const submitButton = screen.getByText(/Submit|Create|Save/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        const codeError = screen.queryByText(/uppercase/i) || screen.queryByText(/alphanumeric/i);
        expect(codeError).toBeInTheDocument();
      });
    });

    it('should validate numeric values for fixed calculation type', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const calcTypeSelect = screen.getByTestId('select-calculationType');
      await user.selectOptions(calcTypeSelect, 'fixed');
      
      await waitFor(() => {
        const defaultValueInput = screen.getByTestId('input-defaultValue');
        expect(defaultValueInput).toBeInTheDocument();
      });
      
      const defaultValueInput = screen.getByTestId('input-defaultValue');
      await user.type(defaultValueInput, 'not-a-number');
      
      const submitButton = screen.getByText(/Submit|Create|Save/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        const errors = screen.queryAllByText(/number|numeric|invalid/i);
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      
      render(<PayComponentFormModal {...defaultProps} />);
      
      // Fill required fields
      await user.type(screen.getByTestId('input-name'), 'Basic Salary');
      await user.type(screen.getByTestId('input-code'), 'BASIC_SALARY');
      await user.type(screen.getByTestId('input-category'), 'Salary');
      await user.type(screen.getByTestId('textarea-description'), 'Monthly basic salary');
      
      const submitButton = screen.getByText(/Submit|Create|Save/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
        const submittedData = mockOnSubmit.mock.calls[0][0];
        expect(submittedData.name).toBe('Basic Salary');
        expect(submittedData.code).toBe('BASIC_SALARY');
      });
    });

    it('should call onClose after successful submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      
      render(<PayComponentFormModal {...defaultProps} />);
      
      // Fill and submit valid form
      await user.type(screen.getByTestId('input-name'), 'Test Component');
      await user.type(screen.getByTestId('input-code'), 'TEST_COMP');
      await user.type(screen.getByTestId('input-category'), 'Test');
      
      const submitButton = screen.getByText(/Submit|Create|Save/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should not call onSubmit with invalid data', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      // Try to submit without filling required fields
      const submitButton = screen.getByText(/Submit|Create|Save/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode', () => {
    const existingComponent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Housing Allowance',
      code: 'HOUSING_ALLOW',
      type: 'earning' as const,
      category: 'Allowance',
      calculationType: 'fixed' as const,
      defaultValue: 5000,
      isRecurring: true,
      isTaxable: false,
      status: 'active' as const,
      description: 'Monthly housing allowance for employees',
      defaultCurrency: 'USD',
      allowCurrencyOverride: true,
    };

    it('should populate form with existing component data', () => {
      render(
        <PayComponentFormModal
          {...defaultProps}
          mode="edit"
          component={existingComponent}
        />
      );
      
      expect(screen.getByTestId('input-name')).toHaveValue('Housing Allowance');
      expect(screen.getByTestId('input-code')).toHaveValue('HOUSING_ALLOW');
      expect(screen.getByTestId('select-type')).toHaveValue('earning');
      expect(screen.getByTestId('input-category')).toHaveValue('Allowance');
    });

    it('should update component with edited data', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);
      
      render(
        <PayComponentFormModal
          {...defaultProps}
          mode="edit"
          component={existingComponent}
        />
      );
      
      // Update the name
      const nameInput = screen.getByTestId('input-name');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Housing Allowance');
      
      const submitButton = screen.getByText(/Submit|Save|Update/i);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
        const submittedData = mockOnSubmit.mock.calls[0][0];
        expect(submittedData.name).toBe('Updated Housing Allowance');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PayComponentFormModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      // Tab through form elements
      await user.tab();
      expect(screen.getByTestId('input-name')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('input-code')).toHaveFocus();
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
      
      render(<PayComponentFormModal {...defaultProps} />);
      
      // Fill and submit
      await user.type(screen.getByTestId('input-name'), 'Test');
      await user.type(screen.getByTestId('input-code'), 'TEST');
      await user.type(screen.getByTestId('input-category'), 'Test');
      
      const submitButton = screen.getByText(/Submit|Create|Save/i);
      await user.click(submitButton);
      
      // Form should be disabled during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
      
      // Resolve submission
      resolveSubmit(undefined);
    });
  });

  describe('Cancel Action', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      const cancelButton = screen.getByText(/Cancel/i);
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not save data when cancelled', async () => {
      const user = userEvent.setup();
      render(<PayComponentFormModal {...defaultProps} />);
      
      // Fill some data
      await user.type(screen.getByTestId('input-name'), 'Test Component');
      
      // Cancel
      const cancelButton = screen.getByText(/Cancel/i);
      await user.click(cancelButton);
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});
