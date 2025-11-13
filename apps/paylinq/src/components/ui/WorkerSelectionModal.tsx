import { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, Users } from 'lucide-react';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
  department?: string;
}

interface WorkerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedWorkerIds: string[]) => void;
  maxSelection?: number;
  isLoading?: boolean;
}

export default function WorkerSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  maxSelection = 10,
  isLoading = false,
}: WorkerSelectionModalProps) {
  const { paylinq } = usePaylinqAPI();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);

  // Fetch workers from API
  useEffect(() => {
    if (isOpen) {
      const fetchWorkers = async () => {
        setIsLoadingWorkers(true);
        try {
          const response = await paylinq.getWorkers({ status: 'active', limit: 100 });
          if (response.success && response.employees) {
            const mappedWorkers: Worker[] = response.employees.map((w: any) => ({
              id: w.employeeId || w.employee_id || w.id,
              firstName: w.first_name || w.firstName || '',
              lastName: w.last_name || w.lastName || '',
              employeeCode: w.employee_number || w.employeeNumber || '',
              department: w.department || '',
            }));
            setWorkers(mappedWorkers);
          }
        } catch (error) {
          console.error('Failed to fetch workers:', error);
        } finally {
          setIsLoadingWorkers(false);
        }
      };
      fetchWorkers();
    }
  }, [isOpen, paylinq]);

  const filteredWorkers = workers.filter((worker) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      worker.firstName.toLowerCase().includes(searchLower) ||
      worker.lastName.toLowerCase().includes(searchLower) ||
      worker.employeeCode?.toLowerCase().includes(searchLower) ||
      worker.department?.toLowerCase().includes(searchLower)
    );
  });

  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkerIds((prev) => {
      if (prev.includes(workerId)) {
        return prev.filter((id) => id !== workerId);
      } else {
        if (prev.length >= maxSelection) {
          return prev;
        }
        return [...prev, workerId];
      }
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedWorkerIds);
    setSelectedWorkerIds([]);
    setSearchTerm('');
  };

  const handleClose = () => {
    onClose();
    setSelectedWorkerIds([]);
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-emerald-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Select Workers</h2>
              <p className="text-sm text-gray-500 mt-1">
                Choose up to {maxSelection} workers to test this pattern
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, employee code, or department..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              disabled={isLoadingWorkers || isLoading}
            />
          </div>
          {selectedWorkerIds.length > 0 && (
            <div className="mt-3 text-sm text-emerald-600 font-medium">
              {selectedWorkerIds.length} of {maxSelection} workers selected
            </div>
          )}
        </div>

        {/* Worker List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingWorkers ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              Loading workers...
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No workers found matching your search.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWorkers.map((worker) => {
                const isSelected = selectedWorkerIds.includes(worker.id);
                const isMaxReached = selectedWorkerIds.length >= maxSelection && !isSelected;

                return (
                  <button
                    key={worker.id}
                    type="button"
                    onClick={() => toggleWorkerSelection(worker.id)}
                    disabled={isMaxReached || isLoading}
                    className={`
                      w-full p-4 rounded-lg border-2 text-left transition-all
                      ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50'
                          : isMaxReached
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50 cursor-pointer'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">
                            {worker.firstName} {worker.lastName}
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          {worker.employeeCode && (
                            <span className="font-mono">{worker.employeeCode}</span>
                          )}
                          {worker.department && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                              {worker.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedWorkerIds.length === 0 || isLoading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Testing...
              </span>
            ) : (
              `Test Pattern (${selectedWorkerIds.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
