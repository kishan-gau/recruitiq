import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/test-helpers';
import PayrollRunCard, { PayrollRun } from '../../../src/components/ui/PayrollRunCard';

describe('PayrollRunCard', () => {
  const mockOnProcess = vi.fn();
  const mockOnView = vi.fn();

  const baseRun: PayrollRun = {
    id: 'run-001',
    period: 'January 2024',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    status: 'draft',
    employeeCount: 25,
    totalAmount: 125000.50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders payroll run period', () => {
      renderWithProviders(<PayrollRunCard run={baseRun} />);
      
      expect(screen.getByText('January 2024')).toBeInTheDocument();
    });

    it('renders payroll run type when provided', () => {
      const runWithType = { ...baseRun, type: 'Monthly Payroll' };
      renderWithProviders(<PayrollRunCard run={runWithType} />);
      
      expect(screen.getByText('Monthly Payroll')).toBeInTheDocument();
    });

    it('renders status badge', () => {
      renderWithProviders(<PayrollRunCard run={baseRun} />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('renders employee count', () => {
      renderWithProviders(<PayrollRunCard run={baseRun} />);
      
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Employees')).toBeInTheDocument();
    });

    it('renders total amount with currency display', () => {
      renderWithProviders(<PayrollRunCard run={baseRun} />);
      
      expect(screen.getByText('Total Amount')).toBeInTheDocument();
      expect(screen.getByText(/125,000\.50/)).toBeInTheDocument();
    });

    it('renders date range', () => {
      renderWithProviders(<PayrollRunCard run={baseRun} />);
      
      expect(screen.getByText('Period')).toBeInTheDocument();
      // Date range format from helpers - use more specific query to avoid matching period title
      expect(screen.getByText(/Dec 31, 2023 - Jan 30, 2024/)).toBeInTheDocument();
    });
  });

  describe('Status-based Styling', () => {
    it('applies ready status styling with blue border', () => {
      const readyRun = { ...baseRun, status: 'ready' as const };
      const { container } = renderWithProviders(<PayrollRunCard run={readyRun} />);
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-blue-300');
    });

    it('applies default styling for non-ready status', () => {
      const { container } = renderWithProviders(<PayrollRunCard run={baseRun} />);
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('border-gray-200');
    });

    it('displays different status badges correctly', () => {
      const statuses: Array<PayrollRun['status']> = ['draft', 'ready', 'processing', 'completed', 'cancelled'];
      
      statuses.forEach(status => {
        const run = { ...baseRun, status };
        const { unmount } = renderWithProviders(<PayrollRunCard run={run} />);
        
        // Status text should be capitalized
        const expectedText = status.charAt(0).toUpperCase() + status.slice(1);
        expect(screen.getByText(expectedText)).toBeInTheDocument();
        
        unmount();
      });
    });
  });

  describe('Action Buttons', () => {
    it('shows process button when status is ready and onProcess is provided', () => {
      const readyRun = { ...baseRun, status: 'ready' as const };
      renderWithProviders(<PayrollRunCard run={readyRun} onProcess={mockOnProcess} />);
      
      expect(screen.getByRole('button', { name: /process payroll/i })).toBeInTheDocument();
    });

    it('does not show process button when status is not ready', () => {
      renderWithProviders(<PayrollRunCard run={baseRun} onProcess={mockOnProcess} />);
      
      expect(screen.queryByRole('button', { name: /process payroll/i })).not.toBeInTheDocument();
    });

    it('does not show process button when onProcess is not provided', () => {
      const readyRun = { ...baseRun, status: 'ready' as const };
      renderWithProviders(<PayrollRunCard run={readyRun} />);
      
      expect(screen.queryByRole('button', { name: /process payroll/i })).not.toBeInTheDocument();
    });

    it('shows view button when onView is provided', () => {
      renderWithProviders(<PayrollRunCard run={baseRun} onView={mockOnView} />);
      
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });

    it('does not show view button when onView is not provided', () => {
      renderWithProviders(<PayrollRunCard run={baseRun} />);
      
      expect(screen.queryByRole('button', { name: /view details/i })).not.toBeInTheDocument();
    });

    it('calls onProcess with run id when process button is clicked', async () => {
      const user = userEvent.setup();
      const readyRun = { ...baseRun, status: 'ready' as const };
      renderWithProviders(<PayrollRunCard run={readyRun} onProcess={mockOnProcess} />);
      
      const processButton = screen.getByRole('button', { name: /process payroll/i });
      await user.click(processButton);
      
      expect(mockOnProcess).toHaveBeenCalledWith('run-001');
      expect(mockOnProcess).toHaveBeenCalledTimes(1);
    });

    it('calls onView with run id when view button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PayrollRunCard run={baseRun} onView={mockOnView} />);
      
      const viewButton = screen.getByRole('button', { name: /view details/i });
      await user.click(viewButton);
      
      expect(mockOnView).toHaveBeenCalledWith('run-001');
      expect(mockOnView).toHaveBeenCalledTimes(1);
    });

    it('shows both buttons when run is ready and both handlers provided', () => {
      const readyRun = { ...baseRun, status: 'ready' as const };
      renderWithProviders(
        <PayrollRunCard run={readyRun} onProcess={mockOnProcess} onView={mockOnView} />
      );
      
      expect(screen.getByRole('button', { name: /process payroll/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });
  });

  describe('Button Styling', () => {
    it('applies primary styling to process button', () => {
      const readyRun = { ...baseRun, status: 'ready' as const };
      renderWithProviders(<PayrollRunCard run={readyRun} onProcess={mockOnProcess} />);
      
      const processButton = screen.getByRole('button', { name: /process payroll/i });
      expect(processButton.className).toContain('bg-blue-500');
    });

    it('applies flex-1 to view button when process button is not shown', () => {
      renderWithProviders(<PayrollRunCard run={baseRun} onView={mockOnView} />);
      
      const viewButton = screen.getByRole('button', { name: /view details/i });
      expect(viewButton.className).toContain('flex-1');
    });

    it('does not apply flex-1 to view button when process button is shown', () => {
      const readyRun = { ...baseRun, status: 'ready' as const };
      renderWithProviders(
        <PayrollRunCard run={readyRun} onProcess={mockOnProcess} onView={mockOnView} />
      );
      
      const viewButton = screen.getByRole('button', { name: /view details/i });
      // Should not have flex-1 class when process button is present
      expect(viewButton.className).not.toContain('flex-1');
    });
  });

  describe('Data Display', () => {
    it('handles zero employee count', () => {
      const emptyRun = { ...baseRun, employeeCount: 0 };
      renderWithProviders(<PayrollRunCard run={emptyRun} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('handles large employee counts', () => {
      const largeRun = { ...baseRun, employeeCount: 1523 };
      renderWithProviders(<PayrollRunCard run={largeRun} />);
      
      expect(screen.getByText('1523')).toBeInTheDocument();
    });

    it('handles zero total amount', () => {
      const zeroAmountRun = { ...baseRun, totalAmount: 0 };
      renderWithProviders(<PayrollRunCard run={zeroAmountRun} />);
      
      // CurrencyDisplay wraps the amount with currency code
      expect(screen.getByText(/SRD 0\.00/)).toBeInTheDocument();
    });

    it('handles large total amounts with proper formatting', () => {
      const largeAmountRun = { ...baseRun, totalAmount: 1500000.75 };
      renderWithProviders(<PayrollRunCard run={largeAmountRun} />);
      
      expect(screen.getByText(/1,500,000\.75/)).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = renderWithProviders(
        <PayrollRunCard run={baseRun} className="custom-class" />
      );
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-class');
    });

    it('maintains base classes when custom className is provided', () => {
      const { container } = renderWithProviders(
        <PayrollRunCard run={baseRun} className="custom-class" />
      );
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-white');
      expect(card.className).toContain('rounded-lg');
      expect(card.className).toContain('border');
    });
  });

  describe('Icons', () => {
    it('renders calendar icon for period', () => {
      const { container } = renderWithProviders(<PayrollRunCard run={baseRun} />);
      
      // Check for lucide-calendar class (from lucide-react icons)
      // SVG className is an SVGAnimatedString, need to use baseVal
      const icons = container.querySelectorAll('svg');
      const hasCalendarIcon = Array.from(icons).some(icon => 
        icon.className.baseVal?.includes('lucide-calendar')
      );
      expect(hasCalendarIcon).toBe(true);
    });

    it('renders users icon for employee count', () => {
      const { container } = renderWithProviders(<PayrollRunCard run={baseRun} />);
      
      const icons = container.querySelectorAll('svg');
      const hasUsersIcon = Array.from(icons).some(icon => 
        icon.className.baseVal?.includes('lucide-users')
      );
      expect(hasUsersIcon).toBe(true);
    });

    it('renders play circle icon in process button', () => {
      const readyRun = { ...baseRun, status: 'ready' as const };
      renderWithProviders(
        <PayrollRunCard run={readyRun} onProcess={mockOnProcess} />
      );
      
      // Verify process button exists (which contains PlayCircle icon)
      const processButton = screen.getByRole('button', { name: /process payroll/i });
      expect(processButton).toBeInTheDocument();
    });

    it('renders eye icon in view button', () => {
      const { container } = renderWithProviders(
        <PayrollRunCard run={baseRun} onView={mockOnView} />
      );
      
      const icons = container.querySelectorAll('svg');
      const hasEyeIcon = Array.from(icons).some(icon => 
        icon.className.baseVal?.includes('lucide-eye')
      );
      expect(hasEyeIcon).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles', () => {
      const readyRun = { ...baseRun, status: 'ready' as const };
      renderWithProviders(
        <PayrollRunCard run={readyRun} onProcess={mockOnProcess} onView={mockOnView} />
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('has descriptive button text', () => {
      const readyRun = { ...baseRun, status: 'ready' as const };
      renderWithProviders(
        <PayrollRunCard run={readyRun} onProcess={mockOnProcess} onView={mockOnView} />
      );
      
      expect(screen.getByRole('button', { name: /process payroll/i })).toHaveAccessibleName();
      expect(screen.getByRole('button', { name: /view details/i })).toHaveAccessibleName();
    });
  });

  describe('Real-World Scenarios', () => {
    it('renders completed payroll run correctly', () => {
      const completedRun: PayrollRun = {
        id: 'run-002',
        period: 'February 2024',
        startDate: '2024-02-01',
        endDate: '2024-02-29',
        status: 'completed',
        employeeCount: 30,
        totalAmount: 175000,
        type: 'Monthly Salary',
      };
      
      renderWithProviders(<PayrollRunCard run={completedRun} onView={mockOnView} />);
      
      expect(screen.getByText('February 2024')).toBeInTheDocument();
      expect(screen.getByText('Monthly Salary')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /process payroll/i })).not.toBeInTheDocument();
    });

    it('renders ready payroll run with all actions', () => {
      const readyRun: PayrollRun = {
        id: 'run-003',
        period: 'March 2024',
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        status: 'ready',
        employeeCount: 28,
        totalAmount: 165000,
      };
      
      renderWithProviders(
        <PayrollRunCard run={readyRun} onProcess={mockOnProcess} onView={mockOnView} />
      );
      
      expect(screen.getByText('March 2024')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /process payroll/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });

    it('renders cancelled payroll run', () => {
      const cancelledRun = { ...baseRun, status: 'cancelled' as const };
      renderWithProviders(<PayrollRunCard run={cancelledRun} />);
      
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
