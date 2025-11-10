import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  Briefcase,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useContract, useDeleteContract, useActivateContract, useTerminateContract } from '@/hooks/useContracts';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { format } from 'date-fns';
import type { ContractStatus } from '@/types/contract.types';

export default function ContractDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [terminationDate, setTerminationDate] = useState('');

  const { data: contract, isLoading, error } = useContract(id);
  const deleteMutation = useDeleteContract();
  const activateMutation = useActivateContract();
  const terminateMutation = useTerminateContract();

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      try {
        await deleteMutation.mutateAsync(id!);
        navigate('/contracts');
      } catch (error) {
        console.error('Failed to delete contract:', error);
      }
    }
  };

  const handleActivate = async () => {
    if (confirm('Are you sure you want to activate this contract?')) {
      try {
        await activateMutation.mutateAsync(id!);
      } catch (error) {
        console.error('Failed to activate contract:', error);
      }
    }
  };

  const handleTerminate = async () => {
    if (!terminationDate) {
      alert('Please select a termination date');
      return;
    }
    try {
      await terminateMutation.mutateAsync({ id: id!, terminationDate });
      setShowTerminateModal(false);
    } catch (error) {
      console.error('Failed to terminate contract:', error);
    }
  };

  const getStatusBadgeClass = (status: ContractStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'terminated':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'draft':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">
          Contract Not Found
        </h3>
        <p className="text-red-700 dark:text-red-400 mb-4">
          The contract you're looking for doesn't exist or has been deleted.
        </p>
        <Link
          to="/contracts"
          className="inline-flex items-center text-red-900 dark:text-red-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contracts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <Link
            to="/contracts"
            className="mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {contract.contractNumber}
              </h1>
              <span
                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                  contract.status
                )}`}
              >
                {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{contract.title}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {contract.status === 'draft' && (
            <button
              onClick={handleActivate}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Activate
            </button>
          )}
          {contract.status === 'active' && (
            <button
              onClick={() => setShowTerminateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Terminate
            </button>
          )}
          <Link
            to={`/contracts/${id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Information */}
          {contract.employee && (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Employee
              </h2>
              <Link
                to={`/employees/${contract.employeeId}`}
                className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                    {contract.employee.firstName[0]}
                    {contract.employee.lastName[0]}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {contract.employee.firstName} {contract.employee.lastName}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {contract.employee.employeeNumber} • {contract.employee.email}
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Contract Details */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Contract Details
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Contract Type
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                  {contract.contractType.replace('_', ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Sequence Number
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  #{contract.sequenceNumber}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Start Date
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {format(new Date(contract.startDate), 'MMMM dd, yyyy')}
                </dd>
              </div>
              {contract.endDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    End Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {format(new Date(contract.endDate), 'MMMM dd, yyyy')}
                  </dd>
                </div>
              )}
              {contract.probationEndDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Probation End Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {format(new Date(contract.probationEndDate), 'MMMM dd, yyyy')}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Compensation */}
          {contract.salary && (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Compensation
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Salary
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {contract.currency || 'USD'} {contract.salary.toLocaleString()}
                  </dd>
                </div>
                {contract.paymentFrequency && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Payment Frequency
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white capitalize">
                      {contract.paymentFrequency.replace('_', ' ')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Work Details */}
          {(contract.position || contract.department || contract.location || contract.hoursPerWeek) && (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Work Details
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {contract.position && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <Briefcase className="h-4 w-4 mr-1" />
                      Position
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {contract.position}
                    </dd>
                  </div>
                )}
                {contract.department && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Department
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {contract.department}
                    </dd>
                  </div>
                )}
                {contract.location && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      Location
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {contract.location}
                    </dd>
                  </div>
                )}
                {contract.hoursPerWeek && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Hours per Week
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      {contract.hoursPerWeek}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Notes */}
          {contract.notes && (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notes</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {contract.notes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Document */}
          {contract.documentUrl && (
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Contract Document
              </h3>
              <a
                href={contract.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Download className="h-4 w-4" />
                Download Document
              </a>
              {contract.signedDate && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Signed Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {format(new Date(contract.signedDate), 'MMMM dd, yyyy')}
                  </dd>
                  {contract.signedBy && (
                    <div className="mt-2">
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Signed By
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {contract.signedBy}
                      </dd>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Metadata
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {format(new Date(contract.createdAt), 'MMM dd, yyyy HH:mm')}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {format(new Date(contract.updatedAt), 'MMM dd, yyyy HH:mm')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Terminate Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Terminate Contract
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Please select the termination date for this contract.
            </p>
            <input
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowTerminateModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleTerminate}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
              >
                Terminate Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
