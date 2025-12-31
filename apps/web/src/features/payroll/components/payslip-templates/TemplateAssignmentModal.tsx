import { X, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '@/hooks';
import { handleApiError } from '@/utils/errorHandler';
import { handleApiError } from '@/utils/errorHandler';

interface TemplateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  templateName: string;
}

export default function TemplateAssignmentModal({
  isOpen,
  onClose,
  templateId,
  templateName
}: TemplateAssignmentModalProps) {
  const toast = useToast();
  const { paylinq } = usePaylinqAPI();
  
  const [isLoading, setIsLoading] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [formData, setFormData] = useState<{
    assignmentScope: string;
    scopeId: string | null;
    priority: number;
    effectiveDate: string;
    endDate: string | null;
  }>({
    assignmentScope: 'organization',
    scopeId: null,
    priority: 50,
    effectiveDate: new Date().toISOString().split('T')[0],
    endDate: null
  });

  useEffect(() => {
    if (isOpen) {
      loadAssignments();
    }
  }, [isOpen, templateId]);

  const loadAssignments = async () => {
    try {
      setIsLoading(true);
      const response = await paylinq.getPayslipTemplateAssignments(templateId);
      let data: any[];
      if (Array.isArray(response)) {
        data = response;
      } else if (response && typeof response === 'object' && 'data' in response) {
        const responseData = (response as any).data;
        data = responseData?.data || responseData || [];
      } else {
        data = [];
      }
      setAssignments(data);
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to load assignments',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    try {
      await paylinq.createPayslipTemplateAssignment(templateId, formData);
      success('Assignment created successfully');
      loadAssignments();
      setShowAddForm(false);
      resetForm();
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to create assignment',
      });
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this assignment?')) return;
    
    try {
      await paylinq.deletePayslipTemplateAssignment(templateId, assignmentId);
      success('Assignment removed successfully');
      loadAssignments();
    } catch (err: any) {
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to remove assignment',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      assignmentScope: 'organization',
      scopeId: null,
      priority: 50,
      effectiveDate: new Date().toISOString().split('T')[0],
      endDate: null
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Template Assignments
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {templateName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Assignment Priority</p>
              <p className="text-blue-700 dark:text-blue-300">
                Higher priority assignments override lower ones. Priority order: Employee (100) → Pay Structure (80) → Worker Type (60) → Department (40) → Organization (20)
              </p>
            </div>
          </div>

          {/* Add Assignment Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-4 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-lg text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              + Add New Assignment
            </button>
          )}

          {/* Add Assignment Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                New Assignment
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Scope
                    </label>
                    <select
                      value={formData.assignmentScope}
                      onChange={(e) => setFormData(prev => ({ ...prev, assignmentScope: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="organization">Organization</option>
                      <option value="worker_type">Worker Type</option>
                      <option value="department">Department</option>
                      <option value="employee">Employee</option>
                      <option value="pay_structure">Pay Structure</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      value={formData.effectiveDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.endDate || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value || null }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddAssignment}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    Add Assignment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assignments List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">Loading assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">No assignments yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Add assignments to specify where this template should be used
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          assignment.assignment_scope === 'employee' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                          assignment.assignment_scope === 'pay_structure' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                          assignment.assignment_scope === 'worker_type' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300' :
                          assignment.assignment_scope === 'department' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' :
                          'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                        }`}>
                          {assignment.assignment_scope.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          Priority: {assignment.priority}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span>Effective: {new Date(assignment.effective_date).toLocaleDateString()}</span>
                        {assignment.end_date && (
                          <span className="ml-3">
                            End: {new Date(assignment.end_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
