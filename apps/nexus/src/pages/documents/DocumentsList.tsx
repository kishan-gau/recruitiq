/**
 * Documents List Page
 * Browse and manage organizational documents
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Upload, FolderPlus, File, Download, Eye, Archive } from 'lucide-react';
import { useDocuments, useDocumentStatistics } from '@/hooks/useDocuments';
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

const STATUS_COLORS: Record<DocumentStatus, string> = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
  expired: 'bg-red-100 text-red-800',
  draft: 'bg-yellow-100 text-yellow-800',
};

const ACCESS_COLORS: Record<AccessLevel, string> = {
  public: 'bg-blue-100 text-blue-800',
  internal: 'bg-purple-100 text-purple-800',
  confidential: 'bg-orange-100 text-orange-800',
  restricted: 'bg-red-100 text-red-800',
};

export default function DocumentsList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');

  const filters = {
    ...(categoryFilter && { category: categoryFilter }),
    ...(statusFilter && { status: statusFilter }),
    ...(searchQuery && { search: searchQuery }),
  };

  const { data: documents = [], isLoading } = useDocuments(Object.keys(filters).length > 0 ? filters : undefined);
  const { data: statistics } = useDocumentStatistics();

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage organizational documents and files</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <FolderPlus className="w-5 h-5" />
            New Folder
          </button>
          <button
            onClick={() => navigate('/documents/upload')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <File className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Total Documents</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statistics?.totalDocuments || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statistics?.activeDocuments || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-600">Archived</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statistics?.archivedDocuments || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Download className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-gray-600">Storage Used</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {statistics?.totalSize ? formatFileSize(statistics.totalSize) : '0 B'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Filter className="w-5 h-5" />
          Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as DocumentCategory | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No documents found</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="bg-white p-5 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
            >
              {/* Document Icon & Info */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <File className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate" title={doc.name}>
                    {doc.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{doc.fileName}</p>
                </div>
              </div>

              {/* Description */}
              {doc.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{doc.description}</p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[doc.status]}`}>
                  {doc.status}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${ACCESS_COLORS[doc.accessLevel]}`}>
                  {doc.accessLevel}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                  {CATEGORY_LABELS[doc.category]}
                </span>
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" />
                  <span>{formatFileSize(doc.fileSize)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{doc.accessCount} views</span>
                </div>
                <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/documents/${doc.id}`);
                  }}
                  className="flex-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Download
                </button>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

