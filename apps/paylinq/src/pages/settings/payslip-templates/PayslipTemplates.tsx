import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText } from 'lucide-react';
import TemplateCard from '@/components/payslip-templates/TemplateCard';
import TemplateAssignmentModal from '@/components/payslip-templates/TemplateAssignmentModal';
import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';

export default function PayslipTemplates() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { paylinq } = usePaylinqAPI();
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean; templateId: string; templateName: string }>({
    isOpen: false,
    templateId: '',
    templateName: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await paylinq.getPayslipTemplates();
      const data = response.data || response;
      const templates = Array.isArray(data) ? data : (data.data || []);
      setTemplates(templates);
    } catch (err: any) {
      console.error('Failed to load templates:', err);
      showError(err.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    navigate('/settings/payslip-templates/new');
  };

  const handleEditTemplate = (id: string) => {
    navigate(`/settings/payslip-templates/${id}`);
  };

  const handleDuplicate = async (id: string) => {
    try {
      await paylinq.duplicatePayslipTemplate(id);
      success('Template duplicated successfully');
      loadTemplates();
    } catch (err: any) {
      showError(err.message || 'Failed to duplicate template');
    }
  };

  const handlePreview = async (_id: string) => {
    // TODO: Open preview modal with sample data
    showError('Preview coming soon! Please edit the template to see live preview.');
  };

  const handleManageAssignments = (template: any) => {
    setAssignmentModal({
      isOpen: true,
      templateId: template.id,
      templateName: template.template_name
    });
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this template?')) return;
    
    try {
      await paylinq.archivePayslipTemplate(id);
      success('Template archived successfully');
      loadTemplates();
    } catch (err: any) {
      showError(err.message || 'Failed to archive template');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await paylinq.activatePayslipTemplate(id);
      success('Template activated successfully');
      loadTemplates();
    } catch (err: any) {
      showError(err.message || 'Failed to activate template');
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.template_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payslip Templates</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Create and manage customizable payslip designs
          </p>
        </div>
        <button
          onClick={handleCreateTemplate}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Create Template</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEditTemplate(template.id)}
              onDuplicate={() => handleDuplicate(template.id)}
              onAssignments={() => handleManageAssignments(template)}
              onPreview={() => handlePreview(template.id)}
              onArchive={() => handleArchive(template.id)}
              onActivate={() => handleActivate(template.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery || statusFilter !== 'all'
              ? 'No templates found'
              : 'No templates yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first payslip template to get started'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              onClick={handleCreateTemplate}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Create Template</span>
            </button>
          )}
        </div>
      )}

      {/* Assignment Modal */}
      <TemplateAssignmentModal
        isOpen={assignmentModal.isOpen}
        onClose={() => setAssignmentModal({ isOpen: false, templateId: '', templateName: '' })}
        templateId={assignmentModal.templateId}
        templateName={assignmentModal.templateName}
      />
    </div>
  );
}
