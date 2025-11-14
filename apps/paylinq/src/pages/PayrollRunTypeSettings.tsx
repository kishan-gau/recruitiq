/**
 * Payroll Run Type Settings Page
 * 
 * Admin interface for managing payroll run types:
 * - View all run types in a data table
 * - Create new custom run types
 * - Edit existing run types
 * - Delete custom run types (system defaults protected)
 * - Configure component inclusion modes
 * 
 * Features:
 * - Search and filter
 * - Sort by any column
 * - Visual indicators (icons, colors, badges)
 * - Component preview
 * - Validation and error handling
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Filter,
  Calendar,
  Gift,
  Award,
  Edit,
  UserX,
  ArrowLeft,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import { DataTable, type Column } from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import PayrollRunTypeModal from '@/components/modals/PayrollRunTypeModal';

// PayrollRunType interface
interface PayrollRunType {
  id: string;
  organizationId: string;
  typeCode: string;
  typeName: string;
  description?: string;
  componentOverrideMode: 'template' | 'explicit' | 'hybrid';
  defaultTemplateId?: string;
  templateName?: string;
  allowedComponents?: string[];
  excludedComponents?: string[];
  isSystemDefault: boolean;
  isActive: boolean;
  displayOrder: number;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt?: string;
}

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  calendar: Calendar,
  gift: Gift,
  award: Award,
  'calendar-check': Calendar,
  edit: Edit,
  'user-x': UserX,
  'trending-up': TrendingUp,
};

export default function PayrollRunTypeSettings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRunType, setEditingRunType] = useState<PayrollRunType | null>(null);
  const [deletingRunType, setDeletingRunType] = useState<PayrollRunType | null>(null);

  const { client } = usePaylinqAPI();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch run types
  const { data: runTypes, isLoading, error } = useQuery({
    queryKey: ['payrollRunTypes', showInactive],
    queryFn: async () => {
      const response = await client.get<{ success: boolean; payrollRunTypes: PayrollRunType[] }>(
        `/products/paylinq/payroll-run-types?includeInactive=${showInactive}`
      );
      return response.payrollRunTypes;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await client.delete(`/products/paylinq/payroll-run-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRunTypes'] });
      showToast('success', 'Run type deleted successfully');
      setDeletingRunType(null);
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Failed to delete run type');
    },
  });

  // Get icon component
  const getIcon = (iconName?: string) => {
    if (!iconName) return Calendar;
    return ICON_MAP[iconName] || Calendar;
  };

  // Filter run types based on search
  const filteredRunTypes = (runTypes || []).filter((rt) =>
    rt.typeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rt.typeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rt.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Table columns
  const columns: Column<PayrollRunType>[] = [
    {
      key: 'typeName',
      header: 'Run Type',
      accessor: (runType: PayrollRunType) => {
        const Icon = getIcon(runType.icon);
        return (
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: runType.color || '#10b981' }}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{runType.typeName}</div>
              <div className="text-sm text-gray-500 font-mono">{runType.typeCode}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (runType: PayrollRunType) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-600 line-clamp-2">
            {runType.description || '-'}
          </p>
        </div>
      ),
    },
    {
      key: 'mode',
      header: 'Mode',
      accessor: (runType: PayrollRunType) => {
        const modeColors: Record<string, string> = {
          template: 'bg-blue-100 text-blue-800',
          explicit: 'bg-green-100 text-green-800',
          hybrid: 'bg-purple-100 text-purple-800',
        };
        return (
          <Badge className={modeColors[runType.componentOverrideMode]}>
            {runType.componentOverrideMode}
          </Badge>
        );
      },
    },
    {
      key: 'components',
      header: 'Components',
      accessor: (runType: PayrollRunType) => {
        const count = runType.allowedComponents?.length || 0;
        return (
          <div className="text-sm text-gray-600">
            {count} {count === 1 ? 'component' : 'components'}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (runType: PayrollRunType) => (
        <div className="flex items-center gap-2">
          {runType.isActive ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600">Active</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Inactive</span>
            </>
          )}
          {runType.isSystemDefault && (
            <Badge className="bg-gray-100 text-gray-600 ml-2">System</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (runType: PayrollRunType) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingRunType(runType)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit run type"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {!runType.isSystemDefault && (
            <button
              onClick={() => setDeletingRunType(runType)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete run type"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/settings"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payroll Run Types</h1>
        <p className="text-gray-600">
          Manage run types to control which components are included in different payroll scenarios
        </p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search run types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center gap-3">
          {/* Show Inactive Toggle */}
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              showInactive
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            {showInactive ? 'Showing All' : 'Active Only'}
          </button>

          {/* Create Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Run Type
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Failed to load run types</h3>
            <p className="text-sm text-red-600 mt-1">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <DataTable
          data={filteredRunTypes}
          columns={columns}
          isLoading={isLoading}
          emptyMessage={
            searchQuery
              ? 'No run types match your search'
              : 'No run types found. Create your first run type to get started.'
          }
        />
      </div>

      {/* Info Card */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">About Run Types</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>
                <strong>Template Mode:</strong> Uses components from linked pay structure template
              </li>
              <li>
                <strong>Explicit Mode:</strong> Uses only the components you specify
              </li>
              <li>
                <strong>Hybrid Mode:</strong> Starts with template, then adds/removes specific components
              </li>
              <li>
                <strong>System Defaults:</strong> Protected run types seeded for all organizations (cannot be deleted)
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingRunType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Run Type</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete <strong>{deletingRunType.typeName}</strong>? This action
                  cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeletingRunType(null)}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(deletingRunType.id)}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TODO: Create/Edit Modals */}
      <PayrollRunTypeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        runType={null}
      />

      <PayrollRunTypeModal
        isOpen={!!editingRunType}
        onClose={() => setEditingRunType(null)}
        runType={editingRunType}
      />
    </div>
  );
}
