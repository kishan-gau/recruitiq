import React from 'react';
import { useParams } from 'react-router-dom';
import { useDepartments } from '../../hooks/hris/useDepartments';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

export default function Departments() {
  const { organizationId } = useParams();
  const { data: departments = [], isLoading, error } = useDepartments(organizationId);

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
        <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
        <p className="mt-2 text-gray-600">Manage organizational departments and hierarchies</p>
      </div>

      {departments.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-600">No departments configured yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Department Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Manager</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Employees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{dept.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{dept.manager || 'Unassigned'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{dept.employeeCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
