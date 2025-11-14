import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import CurrencyDisplay from '../ui/CurrencyDisplay';
import { CURRENCY_SYMBOLS } from '../ui/CurrencyDisplay';

interface PaycheckListItem {
  id: string;
  employeeId: string;
  employeeName: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  baseCurrency: string;
  paymentCurrency: string;
  grossPay: number;
  netPay: number;
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  isMultiCurrency: boolean;
}

interface PaycheckListProps {
  paychecks: PaycheckListItem[];
  onPaycheckClick?: (paycheckId: string) => void;
  onBulkAction?: (action: string, paycheckIds: string[]) => void;
}

const PaycheckList: React.FC<PaycheckListProps> = ({
  paychecks,
  onPaycheckClick,
  onBulkAction,
}) => {
  const [selectedPaychecks, setSelectedPaychecks] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCurrency, setFilterCurrency] = useState<string>('');
  const [sortBy, setSortBy] = useState<'employee' | 'amount' | 'date'>('employee');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Get unique currencies
  const currencies = useMemo(() => {
    const currencySet = new Set<string>();
    paychecks.forEach(pc => {
      currencySet.add(pc.paymentCurrency);
      if (pc.isMultiCurrency) {
        currencySet.add(pc.baseCurrency);
      }
    });
    return Array.from(currencySet).sort();
  }, [paychecks]);

  // Filter and sort paychecks
  const filteredPaychecks = useMemo(() => {
    let filtered = paychecks.filter(pc => {
      const matchesStatus = !filterStatus || pc.status === filterStatus;
      const matchesCurrency = !filterCurrency || 
        pc.paymentCurrency === filterCurrency || 
        pc.baseCurrency === filterCurrency;
      return matchesStatus && matchesCurrency;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'employee':
          comparison = a.employeeName.localeCompare(b.employeeName);
          break;
        case 'amount':
          comparison = a.netPay - b.netPay;
          break;
        case 'date':
          comparison = new Date(a.payDate).getTime() - new Date(b.payDate).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [paychecks, filterStatus, filterCurrency, sortBy, sortOrder]);

  // Calculate totals
  const totals = useMemo(() => {
    const byCurrency: Record<string, { gross: number; net: number; count: number }> = {};
    
    filteredPaychecks.forEach(pc => {
      if (!byCurrency[pc.paymentCurrency]) {
        byCurrency[pc.paymentCurrency] = { gross: 0, net: 0, count: 0 };
      }
      byCurrency[pc.paymentCurrency].gross += pc.grossPay;
      byCurrency[pc.paymentCurrency].net += pc.netPay;
      byCurrency[pc.paymentCurrency].count += 1;
    });

    return byCurrency;
  }, [filteredPaychecks]);

  const togglePaycheck = (id: string) => {
    const newSelected = new Set(selectedPaychecks);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPaychecks(newSelected);
  };

  const toggleAll = () => {
    if (selectedPaychecks.size === filteredPaychecks.length) {
      setSelectedPaychecks(new Set());
    } else {
      setSelectedPaychecks(new Set(filteredPaychecks.map(pc => pc.id)));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (field: 'employee' | 'amount' | 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Currency Filter */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Currencies</option>
              {currencies.map(currency => (
                <option key={currency} value={currency}>
                  {CURRENCY_SYMBOLS[currency]} {currency}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedPaychecks.size > 0 && onBulkAction && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Bulk Actions ({selectedPaychecks.size} selected)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => onBulkAction('approve', Array.from(selectedPaychecks))}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => onBulkAction('void', Array.from(selectedPaychecks))}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                >
                  Void
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Totals Summary */}
      {Object.keys(totals).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary by Currency</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(totals).map(([currency, data]) => (
              <div key={currency} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">
                  {CURRENCY_SYMBOLS[currency]} {currency} ({data.count} paychecks)
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gross:</span>
                    <CurrencyDisplay
                      amount={data.gross}
                      currency={currency}
                      className="font-semibold text-gray-900"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Net:</span>
                    <CurrencyDisplay
                      amount={data.net}
                      currency={currency}
                      className="font-semibold text-green-600"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paychecks Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedPaychecks.size === filteredPaychecks.length && filteredPaychecks.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('employee')}
                >
                  <div className="flex items-center gap-1">
                    Employee
                    {sortBy === 'employee' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay Period
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Net Pay
                    {sortBy === 'amount' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Pay Date
                    {sortBy === 'date' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPaychecks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No paychecks found
                  </td>
                </tr>
              ) : (
                filteredPaychecks.map((paycheck) => (
                  <tr
                    key={paycheck.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onPaycheckClick?.(paycheck.id)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedPaychecks.has(paycheck.id)}
                        onChange={() => togglePaycheck(paycheck.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {paycheck.employeeName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(paycheck.payPeriodStart), 'MMM d')} - {format(new Date(paycheck.payPeriodEnd), 'MMM d')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <CurrencyDisplay
                        amount={paycheck.netPay}
                        currency={paycheck.paymentCurrency}
                        className="text-sm font-semibold text-gray-900"
                      />
                      {paycheck.isMultiCurrency && (
                        <div className="text-xs text-purple-600 mt-1">
                          Multi-currency
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(paycheck.payDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(paycheck.status)}`}>
                        {paycheck.status.charAt(0).toUpperCase() + paycheck.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaycheckList;
