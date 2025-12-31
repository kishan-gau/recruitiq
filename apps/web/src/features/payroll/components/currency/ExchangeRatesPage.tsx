import { format } from 'date-fns';
import React, { useState, useMemo } from 'react';

import type {
  ExchangeRate} from '@/hooks';
import {
  useExchangeRates,
  useDeleteExchangeRate
} from '@/hooks';
import Button from '@recruitiq/ui';
import { CURRENCY_SYMBOLS } from '../shared/CurrencyDisplay';
import Modal from '../ui/Modal';

import ExchangeRateForm from './ExchangeRateForm';

interface ExchangeRatesPageProps {
  organizationId: string;
}

const ExchangeRatesPage: React.FC<ExchangeRatesPageProps> = ({ organizationId }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [filterCurrency, setFilterCurrency] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('');
  
  const { data: rates = [], isLoading, error, refetch } = useExchangeRates();
  const deleteRate = useDeleteExchangeRate();

  // Filter rates
  const filteredRates = useMemo(() => rates.filter(rate => {
      const matchesCurrency = !filterCurrency || 
        rate.from_currency === filterCurrency || 
        rate.to_currency === filterCurrency;
      const matchesSource = !filterSource || rate.source === filterSource;
      return matchesCurrency && matchesSource;
    }), [rates, filterCurrency, filterSource]);

  // Get unique currencies
  const uniqueCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    rates.forEach(rate => {
      currencies.add(rate.from_currency);
      currencies.add(rate.to_currency);
    });
    return Array.from(currencies).sort();
  }, [rates]);

  // Handle delete
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this exchange rate?')) {
      try {
        await deleteRate.mutateAsync(id);
        refetch();
      } catch (error) {
        console.error('Failed to delete exchange rate:', error);
        alert('Failed to delete exchange rate. Please try again.');
      }
    }
  };

  // Handle edit
  const handleEdit = (rate: ExchangeRate) => {
    setEditingRate(rate);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingRate(null);
  };

  // Handle success
  const handleSuccess = () => {
    handleCloseModal();
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load exchange rates. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exchange Rates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage currency exchange rates for payroll calculations
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          Add Exchange Rate
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-500">Total Rates</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{rates.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-500">Active Rates</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {rates.filter(r => !r.effective_to).length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-500">Currencies</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {uniqueCurrencies.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Currency
            </label>
            <select
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Currencies</option>
              {uniqueCurrencies.map(currency => (
                <option key={currency} value={currency}>
                  {CURRENCY_SYMBOLS[currency]} {currency}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Source
            </label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Sources</option>
              <option value="manual">Manual</option>
              <option value="api">API</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency Pair
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effective To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-gray-500">No exchange rates found</p>
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="mt-4"
                      variant="outline"
                    >
                      Add Your First Exchange Rate
                    </Button>
                  </td>
                </tr>
              ) : (
                filteredRates.map((rate) => {
                  const isActive = !rate.effective_to;
                  const isExpired = rate.effective_to && new Date(rate.effective_to) < new Date();
                  
                  return (
                    <tr key={rate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">
                            {CURRENCY_SYMBOLS[rate.from_currency]} {rate.from_currency}
                          </span>
                          <span className="mx-2 text-gray-400">→</span>
                          <span className="font-medium text-gray-900">
                            {CURRENCY_SYMBOLS[rate.to_currency]} {rate.to_currency}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-900">
                          {rate.rate.toFixed(6)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rate.source === 'manual' 
                            ? 'bg-blue-100 text-blue-800'
                            : rate.source === 'api'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rate.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(rate.effective_from), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rate.effective_to 
                          ? format(new Date(rate.effective_to), 'MMM d, yyyy')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isActive
                            ? 'bg-green-100 text-green-800'
                            : isExpired
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {isActive ? 'Active' : isExpired ? 'Expired' : 'Scheduled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(rate)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(rate.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={deleteRate.isPending}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingRate) && (
        <Modal
          isOpen={true}
          onClose={handleCloseModal}
          title={editingRate ? 'Edit Exchange Rate' : 'Add Exchange Rate'}
        >
          <ExchangeRateForm
            rate={editingRate || undefined}
            onSuccess={handleSuccess}
            onCancel={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
};

export default ExchangeRatesPage;
