/**
 * Tests for CurrencySelector component
 * 
 * Tests user interactions, accessibility, and rendering of the currency selector.
 * Following industry standards from TESTING_STANDARDS.md and FRONTEND_STANDARDS.md
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencySelector } from '@/features/payroll/components/ui/CurrencySelector';

describe('CurrencySelector', () => {
  const mockOnChange = vi.fn();

  const defaultProps = {
    value: 'USD',
    onChange: mockOnChange,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<CurrencySelector {...defaultProps} />);

      // Assert label is rendered
      expect(screen.getByText('Currency')).toBeInTheDocument();

      // Assert select element is rendered
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('USD');
    });

    it('should render with custom label', () => {
      render(<CurrencySelector {...defaultProps} label="Select Currency" />);

      expect(screen.getByText('Select Currency')).toBeInTheDocument();
    });

    it('should render without label when not provided', () => {
      render(<CurrencySelector {...defaultProps} label="" />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.queryByText('Currency')).not.toBeInTheDocument();
    });

    it('should render default currencies', () => {
      render(<CurrencySelector {...defaultProps} />);

      const select = screen.getByRole('combobox');
      const options = Array.from(select.querySelectorAll('option'));

      // Assert default currencies are present
      expect(options).toHaveLength(8);
      expect(options.map((opt) => opt.value)).toEqual([
        'USD',
        'EUR',
        'GBP',
        'CAD',
        'AUD',
        'JPY',
        'CHF',
        'CNY',
      ]);
    });

    it('should render custom currencies when provided', () => {
      const customCurrencies = ['USD', 'EUR', 'INR'];
      render(<CurrencySelector {...defaultProps} currencies={customCurrencies} />);

      const select = screen.getByRole('combobox');
      const options = Array.from(select.querySelectorAll('option'));

      expect(options).toHaveLength(3);
      expect(options.map((opt) => opt.value)).toEqual(customCurrencies);
    });

    it('should show required indicator when required prop is true', () => {
      render(<CurrencySelector {...defaultProps} required />);

      const requiredIndicator = screen.getByText('*');
      expect(requiredIndicator).toBeInTheDocument();
      expect(requiredIndicator).toHaveClass('text-red-500');
    });

    it('should not show required indicator when required prop is false', () => {
      render(<CurrencySelector {...defaultProps} required={false} />);

      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('should display error message when error prop is provided', () => {
      const errorMessage = 'Currency is required';
      render(<CurrencySelector {...defaultProps} error={errorMessage} />);

      const errorElement = screen.getByText(errorMessage);
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveClass('text-red-600');
    });

    it('should not display error message when error prop is not provided', () => {
      render(<CurrencySelector {...defaultProps} />);

      const errors = screen.queryByRole('alert');
      expect(errors).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onChange when a currency is selected', async () => {
      const user = userEvent.setup();
      render(<CurrencySelector {...defaultProps} />);

      const select = screen.getByRole('combobox');

      // Change selection to EUR
      await user.selectOptions(select, 'EUR');

      expect(mockOnChange).toHaveBeenCalledWith('EUR');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it('should call onChange with correct value when using keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CurrencySelector {...defaultProps} />);

      const select = screen.getByRole('combobox');

      // Focus the select
      select.focus();

      // Use arrow down to select next option
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should handle multiple selection changes', async () => {
      const user = userEvent.setup();
      render(<CurrencySelector {...defaultProps} />);

      const select = screen.getByRole('combobox');

      // Select EUR
      await user.selectOptions(select, 'EUR');
      expect(mockOnChange).toHaveBeenCalledWith('EUR');

      // Select GBP
      await user.selectOptions(select, 'GBP');
      expect(mockOnChange).toHaveBeenCalledWith('GBP');

      // Back to USD
      await user.selectOptions(select, 'USD');
      expect(mockOnChange).toHaveBeenCalledWith('USD');

      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });

    it('should update displayed value when value prop changes', () => {
      const { rerender } = render(<CurrencySelector {...defaultProps} value="USD" />);

      let select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('USD');

      // Update value prop
      rerender(<CurrencySelector {...defaultProps} value="EUR" />);

      select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('EUR');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<CurrencySelector {...defaultProps} label="Select Currency" />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveAccessibleName('Select Currency');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<CurrencySelector {...defaultProps} />);

      const select = screen.getByRole('combobox');

      // Tab to focus
      await user.tab();
      expect(select).toHaveFocus();

      // Arrow down should work
      await user.keyboard('{ArrowDown}');

      // Verify interaction is possible
      expect(select).toHaveFocus();
    });

    it('should have required attribute when required prop is true', () => {
      render(<CurrencySelector {...defaultProps} required />);

      const select = screen.getByRole('combobox');
      expect(select).toBeRequired();
    });

    it('should not have required attribute when required prop is false', () => {
      render(<CurrencySelector {...defaultProps} required={false} />);

      const select = screen.getByRole('combobox');
      expect(select).not.toBeRequired();
    });

    it('should associate label with select element', () => {
      render(<CurrencySelector {...defaultProps} label="Currency Type" />);

      const label = screen.getByText(/Currency Type/);
      const select = screen.getByRole('combobox');

      // Label should be associated with select
      expect(select).toHaveAccessibleName('Currency Type');
    });

    it('should provide error feedback for screen readers', () => {
      const errorMessage = 'Please select a currency';
      render(<CurrencySelector {...defaultProps} error={errorMessage} />);

      const errorElement = screen.getByText(errorMessage);
      expect(errorElement).toBeInTheDocument();

      // Error should be visible for screen readers
      expect(errorElement).toHaveClass('text-sm');
    });
  });

  describe('Styling', () => {
    it('should apply correct CSS classes', () => {
      render(<CurrencySelector {...defaultProps} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('block', 'w-full', 'px-3', 'py-2');
    });

    it('should apply dark mode classes', () => {
      render(<CurrencySelector {...defaultProps} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('dark:bg-gray-800', 'dark:text-white');
    });

    it('should apply error styling when error is present', () => {
      render(<CurrencySelector {...defaultProps} error="Error message" />);

      const errorElement = screen.getByText('Error message');
      expect(errorElement).toHaveClass('text-red-600', 'dark:text-red-400');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty currencies array', () => {
      render(<CurrencySelector {...defaultProps} currencies={[]} />);

      const select = screen.getByRole('combobox');
      const options = Array.from(select.querySelectorAll('option'));

      expect(options).toHaveLength(0);
    });

    it('should handle single currency in array', () => {
      render(<CurrencySelector {...defaultProps} currencies={['USD']} />);

      const select = screen.getByRole('combobox');
      const options = Array.from(select.querySelectorAll('option'));

      expect(options).toHaveLength(1);
      expect(options[0].value).toBe('USD');
    });

    it('should handle very long currency list', () => {
      const manyCurrencies = Array.from({ length: 100 }, (_, i) => `CUR${i}`);
      render(<CurrencySelector {...defaultProps} currencies={manyCurrencies} />);

      const select = screen.getByRole('combobox');
      const options = Array.from(select.querySelectorAll('option'));

      expect(options).toHaveLength(100);
    });

    it('should not crash when onChange is undefined', () => {
      // This should not happen in practice, but test defensive programming
      const { container } = render(
        <CurrencySelector value="USD" onChange={undefined as any} />
      );

      const select = container.querySelector('select');
      expect(select).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should work correctly in a form context', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn((e) => e.preventDefault());

      const { container } = render(
        <form onSubmit={handleSubmit}>
          <CurrencySelector {...defaultProps} required />
          <button type="submit">Submit</button>
        </form>
      );

      const form = container.querySelector('form')!;
      const submitButton = screen.getByText('Submit');

      // Submit form
      await user.click(submitButton);

      expect(form.checkValidity()).toBe(true);
    });
  });
});
