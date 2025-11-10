/**
 * Mock Pay Components Data for Testing
 * 
 * This file contains mock data following industry standards for test fixtures.
 * Data is organized by type (earnings/deductions) for easy test setup.
 */

import type { PayComponent } from '../../src/hooks/usePayComponents';

export const mockPayComponents: PayComponent[] = [
  // Earnings
  {
    id: '1',
    name: 'Base Salary',
    code: 'BASE',
    type: 'earning',
    category: 'Regular Pay',
    calculationType: 'fixed',
    defaultValue: 5000,
    isRecurring: true,
    isTaxable: true,
    status: 'active',
    description: 'Monthly base salary as per employment contract',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Overtime Pay',
    code: 'OT',
    type: 'earning',
    category: 'Additional Pay',
    calculationType: 'formula',
    isRecurring: false,
    isTaxable: true,
    status: 'active',
    description: 'Overtime compensation at 1.5x hourly rate',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '3',
    name: 'Vacation Allowance',
    code: 'VAC',
    type: 'earning',
    category: 'Benefits',
    calculationType: 'percentage',
    defaultValue: 8.33,
    isRecurring: true,
    isTaxable: true,
    status: 'active',
    description: '8.33% of gross salary for vacation',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '4',
    name: '13th Month Bonus',
    code: '13M',
    type: 'earning',
    category: 'Bonus',
    calculationType: 'formula',
    isRecurring: true,
    isTaxable: true,
    status: 'active',
    description: 'Annual 13th month salary payment',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },

  // Deductions
  {
    id: '5',
    name: 'Income Tax',
    code: 'TAX',
    type: 'deduction',
    category: 'Statutory',
    calculationType: 'formula',
    isRecurring: true,
    isTaxable: false,
    status: 'active',
    description: 'Progressive income tax as per tax brackets',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '6',
    name: 'Social Security',
    code: 'SOC',
    type: 'deduction',
    category: 'Statutory',
    calculationType: 'percentage',
    defaultValue: 4.5,
    isRecurring: true,
    isTaxable: false,
    status: 'active',
    description: 'Social security contribution (4.5% of gross)',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '7',
    name: 'Health Insurance',
    code: 'HEALTH',
    type: 'deduction',
    category: 'Voluntary',
    calculationType: 'fixed',
    defaultValue: 150,
    isRecurring: true,
    isTaxable: false,
    status: 'active',
    description: 'Employee health insurance premium',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '8',
    name: 'Pension Fund',
    code: 'PENSION',
    type: 'deduction',
    category: 'Statutory',
    calculationType: 'percentage',
    defaultValue: 6,
    isRecurring: true,
    isTaxable: false,
    status: 'active',
    description: 'Mandatory pension fund contribution',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '9',
    name: 'Union Dues',
    code: 'UNION',
    type: 'deduction',
    category: 'Voluntary',
    calculationType: 'fixed',
    defaultValue: 25,
    isRecurring: true,
    isTaxable: false,
    status: 'active',
    description: 'Monthly union membership fee',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '10',
    name: 'Loan Repayment',
    code: 'LOAN',
    type: 'deduction',
    category: 'Voluntary',
    calculationType: 'fixed',
    defaultValue: 300,
    isRecurring: true,
    isTaxable: false,
    status: 'active',
    description: 'Employee loan monthly installment',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
];

export const mockEarnings = mockPayComponents.filter((c) => c.type === 'earning');
export const mockDeductions = mockPayComponents.filter((c) => c.type === 'deduction');

/**
 * Helper to get mock component by code
 */
export function getMockComponentByCode(code: string): PayComponent | undefined {
  return mockPayComponents.find((c) => c.code === code);
}

/**
 * Helper to create a new mock component
 */
export function createMockComponent(overrides: Partial<PayComponent> = {}): PayComponent {
  return {
    id: Math.random().toString(36).substring(7),
    name: 'Test Component',
    code: 'TEST',
    type: 'earning',
    category: 'Regular Pay',
    calculationType: 'fixed',
    defaultValue: 100,
    isRecurring: true,
    isTaxable: true,
    status: 'active',
    description: 'Test component description',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
