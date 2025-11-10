/**
 * Document Details Page
 * View document information, download, and manage access
 */

import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Eye,
  Share2,
  Archive,
  Trash2,
  Edit,
  FileText,
  Calendar,
  Lock,
  Tag,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  useDocument,
  useArchiveDocument,
  useDeleteDocument,
  useDocumentActivity,
} from '@/hooks/useDocuments';
import type { DocumentCategory, DocumentStatus, AccessLevel } from '@/types/documents.types';

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  contract: 'Contract',
  policy: 'Policy',
  handbook: 'Handbook',
  training: 'Training',
  personal: 'Personal',
  payroll: 'Payroll',
  benefit: 'Benefit',
  performance: 'Performance',
  compliance: 'Compliance',
  other: 'Other',
};

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; icon: typeof CheckCircle; color: string }
> = {
  active: { label: 'Active', icon: CheckCircle, color: 'text-green-600' },
  draft: { label: 'Draft', icon: Edit, color: 'text-yellow-600' },
  archived: { label: 'Archived', icon: Archive, color: 'text-gray-600' },
  expired: { label: 'Expired', icon: XCircle, color: 'text-red-600' },
};

const ACCESS_COLORS: Record<AccessLevel, string> = {
  public: 'bg-blue-100 text-blue-800',
  internal: 'bg-purple-100 text-purple-800',
  confidential: 'bg-orange-100 text-orange-800',
  restricted: 'bg-red-100 text-red-800',
};

export default function DocumentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: document, isLoading } = useDocument(id!);
  const { data: activity } = useDocumentActivity(id!);
  const archiveMutation = useArchiveDocument();
  const deleteMutation = useDeleteDocument();

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleArchive = async () => {
    if (!document || !confirm('Are you sure you want to archive this document?')) return;
    try {
      await archiveMutation.mutateAsync(document.id);
      navigate('/documents');
    } catch (error) {
      console.error('Failed to archive document:', error);
    }
  };

  const handleDelete = async () => {
    if (
      !document ||
      !confirm(
        'Are you sure you want to delete this document? This action cannot be undone.'
      )
    )
      return;
    try {
      await deleteMutation.mutateAsync(document.id);
      navigate('/documents');
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Not Found</h2>
        <p className="text-gray-600 mb-4">The document you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/documents')}
          className="text-blue-600 hover:text-blue-700"
        >
          Back to Documents
        </button>
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[document.status].icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/documents')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{document.name}</h1>
            <p className="text-gray-600">{document.fileName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Preview */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Document Preview Not Available</p>
                <p className="text-sm text-gray-500 mt-1">
                  Download the file to view its contents
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {document.description && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-700">{document.description}</p>
            </div>
          )}

          {/* Activity Statistics */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Statistics</h2>
            {!activity ? (
              <p className="text-gray-600">No activity data available</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Accesses</p>
                  <p className="text-2xl font-bold text-gray-900">{activity.totalAccesses}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unique Users</p>
                  <p className="text-2xl font-bold text-gray-900">{activity.uniqueUsers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Downloads</p>
                  <p className="text-2xl font-bold text-gray-900">{activity.downloads}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Views</p>
                  <p className="text-2xl font-bold text-gray-900">{activity.views}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Last Accessed</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(activity.lastAccessedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Metadata */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Information</h2>

            {/* Status */}
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-5 h-5 ${STATUS_CONFIG[document.status].color}`} />
              <div>
                <p className="text-xs text-gray-600">Status</p>
                <p className="text-sm font-medium text-gray-900">
                  {STATUS_CONFIG[document.status].label}
                </p>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Category</p>
                <p className="text-sm font-medium text-gray-900">
                  {CATEGORY_LABELS[document.category]}
                </p>
              </div>
            </div>

            {/* Access Level */}
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Access Level</p>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    ACCESS_COLORS[document.accessLevel]
                  }`}
                >
                  {document.accessLevel}
                </span>
              </div>
            </div>

            {/* File Size */}
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">File Size</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatFileSize(document.fileSize)}
                </p>
              </div>
            </div>

            {/* MIME Type */}
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">File Type</p>
                <p className="text-sm font-medium text-gray-900">{document.mimeType}</p>
              </div>
            </div>

            {/* Upload Date */}
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Uploaded</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(document.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Uploaded By */}
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Uploaded By</p>
                <p className="text-sm font-medium text-gray-900">{document.uploadedBy}</p>
              </div>
            </div>

            {/* Access Count */}
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-600">Views</p>
                <p className="text-sm font-medium text-gray-900">{document.accessCount}</p>
              </div>
            </div>

            {/* Last Accessed */}
            {document.lastAccessedAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-600">Last Accessed</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(document.lastAccessedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Expiry Date */}
            {document.expiryDate && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-600">Expires</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(document.expiryDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-5 h-5 text-gray-400" />
                  <p className="text-xs text-gray-600">Tags</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {document.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <button className="w-full flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Edit className="w-4 h-4" />
              Edit Details
            </button>
            <button
              onClick={handleArchive}
              disabled={archiveMutation.isPending}
              className="w-full flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Archive className="w-4 h-4" />
              {archiveMutation.isPending ? 'Archiving...' : 'Archive Document'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Document'}
            </button>
          </div>

          {/* Signatures */}
          {document.requiresSignature && document.signedBy && document.signedBy.length > 0 && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Signatures</h2>
              <div className="space-y-3">
                {document.signedBy.map((signerId, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between pb-3 border-b border-gray-200 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">Signed by: {signerId}</p>
                      {document.signedAt && (
                        <p className="text-xs text-gray-500">
                          {new Date(document.signedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
