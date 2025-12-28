import { useState, useMemo } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  Search,
  Filter,
  X,
  FileCheck,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Folder,
  Plus,
  Edit3,
} from 'lucide-react';
import { useDocuments } from '../hooks';
import { handleApiError } from '@/utils/errorHandler';
import { useToast } from '@/contexts/ToastContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: any) => void;
  isLoading: boolean;
}

function UploadModal({ isOpen, onClose, onUpload, isLoading }: UploadModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    documentType: 'contract',
    category: 'employment',
    file: null as File | null,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) return;
    
    onUpload({
      file: formData.file,
      metadata: {
        name: formData.name,
        description: formData.description,
        documentType: formData.documentType,
        category: formData.category,
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Document Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Document Type *
              </label>
              <select
                value={formData.documentType}
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="contract">Contract</option>
                <option value="certificate">Certificate</option>
                <option value="id">ID Document</option>
                <option value="resume">Resume</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="employment">Employment</option>
                <option value="personal">Personal</option>
                <option value="compliance">Compliance</option>
                <option value="training">Training</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              File *
            </label>
            <input
              type="file"
              onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              disabled={isLoading || !formData.file}
            >
              {isLoading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { 
    data: documents = [], 
    isLoading, 
    error 
  } = useDocuments();

  const { mutate: uploadDocument, isPending: isUploading } = useDocuments().uploadMutation;
  const { mutate: deleteDocument } = useDocuments().deleteMutation;
  const { mutate: downloadDocument } = useDocuments().downloadMutation;

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc: any) => {
      const matchesSearch = doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || doc.documentType === typeFilter;
      const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [documents, searchQuery, typeFilter, categoryFilter]);

  const handleUpload = (data: any) => {
    uploadDocument(data, {
      onSuccess: () => {
        toast.success('Document uploaded successfully');
        setIsUploadModalOpen(false);
      },
      onError: (error) => {
        handleApiError(error, { toast, defaultMessage: 'Failed to upload document' });
      },
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteDocument(id, {
        onSuccess: () => {
          toast.success('Document deleted successfully');
        },
        onError: (error) => {
          handleApiError(error, { toast, defaultMessage: 'Failed to delete document' });
        },
      });
    }
  };

  const handleDownload = (id: string) => {
    downloadDocument(id, {
      onError: (error) => {
        handleApiError(error, { toast, defaultMessage: 'Failed to download document' });
      },
    });
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      contract: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      certificate: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      id: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      resume: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[type] || colors.other;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      employment: FileCheck,
      personal: User,
      compliance: AlertCircle,
      training: CheckCircle,
    };
    const Icon = icons[category] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error loading documents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documents</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage and organize employee documents, contracts, and certificates
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="contract">Contracts</option>
            <option value="certificate">Certificates</option>
            <option value="id">ID Documents</option>
            <option value="resume">Resumes</option>
            <option value="other">Other</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="employment">Employment</option>
            <option value="personal">Personal</option>
            <option value="compliance">Compliance</option>
            <option value="training">Training</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' 
              ? 'No documents found' 
              : 'No documents yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
            {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload your first document to get started'}
          </p>
          {!searchQuery && typeFilter === 'all' && categoryFilter === 'all' && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc: any) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                      {doc.name}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(doc.documentType)}`}>
                      {doc.documentType}
                    </span>
                  </div>
                </div>
              </div>

              {doc.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {doc.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <div className="flex items-center gap-1">
                  {getCategoryIcon(doc.category)}
                  <span>{doc.category}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {doc.employeeName && (
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <User className="w-4 h-4" />
                  <span>{doc.employeeName}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleDownload(doc.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={() => handleDelete(doc.id, doc.name)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        isLoading={isUploading}
      />
    </div>
  );
}
