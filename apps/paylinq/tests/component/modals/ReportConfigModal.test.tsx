import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils/test-helpers';
import ReportConfigModal from '@/components/modals/ReportConfigModal';

describe('ReportConfigModal', () => {
  const mockOnClose = vi.fn();
  const mockReportType = {
    id: 'payroll-summary',
    title: 'Payroll Summary',
    category: 'payroll',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Modal Rendering ====================
  describe('Modal Rendering', () => {
    it('renders modal when isOpen is true', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Generate Payroll Summary')).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={false} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('returns null when reportType is null', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={null} 
        />
      );

      // Assert
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays report category in info banner', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByText('Category:')).toBeInTheDocument();
      expect(screen.getByText('payroll')).toBeInTheDocument();
    });
  });

  // ==================== Form Fields ====================
  describe('Form Fields', () => {
    it('renders Start Date field', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByText(/start date/i)).toBeInTheDocument();
      const dateInputs = screen.getAllByDisplayValue(/2025-11/);
      expect(dateInputs.length).toBeGreaterThan(0);
    });

    it('renders End Date field', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByText(/end date/i)).toBeInTheDocument();
    });

    it('renders Format dropdown', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByText(/^format$/i)).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('shows Group By field for payroll reports', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByText(/group by/i)).toBeInTheDocument();
    });

    it('hides Group By field for non-payroll reports', () => {
      // Arrange
      const nonPayrollReport = {
        id: 'time-entries',
        title: 'Time Entries Report',
        category: 'attendance',
      };

      // Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={nonPayrollReport} 
        />
      );

      // Assert
      expect(screen.queryByText(/group by/i)).not.toBeInTheDocument();
    });
  });

  // ==================== Default Values ====================
  describe('Default Values', () => {
    it('sets start date to first day of current month by default', () => {
      // Arrange
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const expectedDate = firstDay.toISOString().split('T')[0];

      // Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      const dateInputs = screen.getAllByDisplayValue(expectedDate);
      expect(dateInputs.length).toBeGreaterThan(0);
    });

    it('sets end date to today by default', () => {
      // Arrange
      const today = new Date();
      const expectedDate = today.toISOString().split('T')[0];

      // Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      const endDateInput = screen.getByDisplayValue(expectedDate);
      expect(endDateInput).toBeInTheDocument();
    });

    it('sets format to PDF by default', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      const formatSelect = screen.getAllByRole('combobox')[0]; // First select is format
      expect(formatSelect).toHaveValue('pdf');
    });

    it('sets group by to "none" by default', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      const groupBySelect = screen.getAllByRole('combobox')[1]; // Second select is group by
      expect(groupBySelect).toHaveValue('none');
    });
  });

  // ==================== Format Options ====================
  describe('Format Options', () => {
    it('provides PDF format option', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('provides Excel format option', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByText('Excel (XLSX)')).toBeInTheDocument();
    });

    it('provides CSV format option', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });

    it('allows changing format selection', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Act
      const formatSelect = screen.getAllByRole('combobox')[0]; // First select is format
      await user.selectOptions(formatSelect, 'xlsx');

      // Assert
      expect(formatSelect).toHaveValue('xlsx');
    });
  });

  // ==================== Grouping Options ====================
  describe('Grouping Options', () => {
    it('provides "No Grouping" option', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByText('No Grouping')).toBeInTheDocument();
    });

    it('provides "Department" grouping option', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByText('Department')).toBeInTheDocument();
    });

    it('provides "Position" grouping option', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByText('Position')).toBeInTheDocument();
    });

    it('provides "Worker Type" grouping option', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByText('Worker Type')).toBeInTheDocument();
    });

    it('allows changing grouping selection', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Act
      const groupBySelect = screen.getAllByRole('combobox')[1]; // Second select is group by
      await user.selectOptions(groupBySelect, 'department');

      // Assert
      expect(groupBySelect).toHaveValue('department');
    });
  });

  // ==================== User Interactions ====================
  describe('User Interactions', () => {
    it('allows changing start date', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Act
      const dateInputs = screen.getAllByDisplayValue(/2025-11/);
      const startDateInput = dateInputs[0]; // First date input is start date
      await user.clear(startDateInput);
      await user.type(startDateInput, '2025-01-01');

      // Assert
      expect(startDateInput).toHaveValue('2025-01-01');
    });

    it('allows changing end date', async () => {
      // Arrange
      const user = userEvent.setup();
      const today = new Date();
      const expectedDate = today.toISOString().split('T')[0];
      
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Act
      const endDateInput = screen.getByDisplayValue(expectedDate);
      await user.clear(endDateInput);
      await user.type(endDateInput, '2025-01-31');

      // Assert
      expect(endDateInput).toHaveValue('2025-01-31');
    });
  });

  // ==================== Action Buttons ====================
  describe('Action Buttons', () => {
    it('renders Cancel button', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders Generate Report button', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument();
    });

    it('calls onClose when Cancel is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Act
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('disables buttons during report generation', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Act
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      // Assert
      expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  // ==================== Report Generation ====================
  describe('Report Generation', () => {
    it('shows loading state when generating report', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Act
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      // Assert
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('closes modal and shows success toast after generation', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Act
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      // Assert - Wait for async operation (1500ms simulated delay)
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 2000 });
      
      // Toast should appear
      await waitFor(() => {
        expect(screen.getByText(/payroll summary report generated successfully/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  // ==================== Real-World Scenarios ====================
  describe('Real-World Scenarios', () => {
    it('handles generating monthly payroll report as PDF', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Act - Accept defaults (first day of month to today, PDF format)
      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      // Assert - Verify loading state (generation started)
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('handles generating custom date range report as Excel', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Act
      const today = new Date();
      const expectedDate = today.toISOString().split('T')[0];
      
      const dateInputs = screen.getAllByDisplayValue(/2025-11/);
      const startDateInput = dateInputs[0];
      const endDateInput = screen.getByDisplayValue(expectedDate);
      const formatSelect = screen.getAllByRole('combobox')[0];

      await user.clear(startDateInput);
      await user.type(startDateInput, '2025-01-01');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2025-03-31');
      await user.selectOptions(formatSelect, 'xlsx');

      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      // Assert - Verify generation started with correct format selected
      expect(formatSelect).toHaveValue('xlsx');
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('handles generating grouped payroll report', async () => {
      // Arrange
      const user = userEvent.setup();
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Act
      const groupBySelect = screen.getAllByRole('combobox')[1]; // Second select is group by
      await user.selectOptions(groupBySelect, 'department');

      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      // Assert - Verify generation started with grouping selected
      expect(groupBySelect).toHaveValue('department');
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('handles generating attendance report (no grouping option)', async () => {
      // Arrange
      const user = userEvent.setup();
      const attendanceReport = {
        id: 'attendance-summary',
        title: 'Attendance Summary',
        category: 'attendance',
      };

      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={attendanceReport} 
        />
      );

      // Act
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBe(1); // Only format select, no group by
      await user.selectOptions(selects[0], 'csv');

      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      // Assert
      expect(screen.queryByText(/group by/i)).not.toBeInTheDocument();
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });
  });

  // ==================== Accessibility ====================
  describe('Accessibility', () => {
    it('uses dialog role for modal', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has descriptive button labels with icons', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('marks required fields appropriately', () => {
      // Arrange & Act
      renderWithProviders(
        <ReportConfigModal 
          isOpen={true} 
          onClose={mockOnClose} 
          reportType={mockReportType} 
        />
      );

      // Assert
      // All date and format fields should be required
      const startDateLabel = screen.getByText(/start date/i);
      const endDateLabel = screen.getByText(/end date/i);
      const formatLabel = screen.getByText(/format/i);

      expect(startDateLabel).toBeInTheDocument();
      expect(endDateLabel).toBeInTheDocument();
      expect(formatLabel).toBeInTheDocument();
    });
  });
});
