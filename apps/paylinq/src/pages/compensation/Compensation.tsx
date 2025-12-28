import React from 'react';
import { useParams } from 'react-router-dom';
import { useCompensation } from '../../hooks/payroll/useCompensation';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

export default function Compensation() {
  const { organizationId } = useParams();
  const { data: compensation = [], isLoading, error } = useCompensation(organizationId);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="p-6">
        <ErrorAlert error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Compensation</h1>
        <p className="mt-2 text-gray-600">Manage employee compensation and salaries</p>
      </div>

      {compensation.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-600">No compensation records found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Employee</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Effective From</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {compensation.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{record.employeeName}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {record.currency ? `${record.currency} ` : ''}{record.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.compensationType}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.effectiveFrom}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                      {record.isCurrent ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
