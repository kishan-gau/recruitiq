/**
 * Documents Dashboard Page
 * Overview of document management with expiring documents, statistics, and search
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar,
  Search,
  Upload,
  Folder,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  useDocuments,
  useDocumentStatistics,
  useExpiringDocuments,
} from '@/hooks/useDocuments';
import { useAuth } from '@/contexts/AuthContext';
import DocumentExpiryAlert from '@/components/documents/DocumentExpiryAlert';
import DocumentSearch from '@/components/documents/DocumentSearch';
import type { Document } from '@/types/documents.types';

export default function DocumentsDashboard() {
  const { hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expiryDays, setExpiryDays] = useState<30 | 60 | 90>(30);

  // Fetch data
  const { data: statistics, isLoading: statsLoading } = useDocumentStatistics();
  const { data: recentDocs, isLoading: docsLoading } = useDocuments({
    limit: 5,
    sortBy: 'uploadedAt',
    sortOrder: 'desc',
  });
  const { data: expiringDocs, isLoading: expiringLoading } = useExpiringDocuments(expiryDays);

  // Permissions
  const canUpload = hasPermission('documents:upload');
  const canManage = hasPermission('documents:manage');

  // Calculate urgency stats from expiring documents
  const urgencyStats = useMemo(() => {
    if (!expiringDocs) return { critical: 0, warning: 0, attention: 0 };

    const today = new Date();
    return expiringDocs.reduce(
      (acc, doc) => {
        if (!doc.expiryDate) return acc;
        const expiryDate = new Date(doc.expiryDate);
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry <= 7) acc.critical++;
        else if (daysUntilExpiry <= 30) acc.warning++;
        else acc.attention++;

        return acc;
      },
      { critical: 0, warning: 0, attention: 0 }
    );
  }, [expiringDocs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor your organization's documents
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/documents"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 
                     flex items-center gap-2 transition-colors"
          >
            <Folder className="w-4 h-4" />
            Browse All
          </Link>
          {canUpload && (
            <Link
              to="/documents/upload"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <DocumentSearch
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search documents by name, category, or tags..."
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? '...' : statistics?.totalDocuments || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          {statistics && (
            <p className="text-xs text-gray-500 mt-3">
              {statistics.activeDocuments} active · {statistics.archivedDocuments} archived
            </p>
          )}
        </div>

        {/* Expiring Soon */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {expiringLoading ? '...' : expiringDocs?.length || 0}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="flex gap-2 mt-3 text-xs">
            <span className="text-red-600">{urgencyStats.critical} critical</span>
            <span className="text-gray-400">·</span>
            <span className="text-orange-600">{urgencyStats.warning} warning</span>
          </div>
        </div>

        {/* Total Storage */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Storage</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? '...' : formatBytes(statistics?.totalStorageUsed || 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            {statistics?.documentsByCategory.length || 0} categories
          </p>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statsLoading ? '...' : statistics?.activeUsers || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">Last 30 days</p>
        </div>
      </div>

      {/* Expiring Documents Widget */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">Expiring Documents</h2>
            </div>
            <div className="flex gap-2">
              {[30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setExpiryDays(days as 30 | 60 | 90)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    expiryDays === days
                      ? 'bg-orange-100 text-orange-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6">
          {expiringLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : !expiringDocs || expiringDocs.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">No documents expiring in the next {expiryDays} days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringDocs.slice(0, 10).map((doc) => (
                <DocumentExpiryAlert key={doc.id} document={doc} />
              ))}
              {expiringDocs.length > 10 && (
                <div className="pt-3 text-center">
                  <Link
                    to={`/documents?expiring=${expiryDays}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View all {expiringDocs.length} expiring documents →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
            </div>
          </div>
          <div className="p-6">
            {docsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : !recentDocs || recentDocs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p>No recent documents</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentDocs.map((doc) => (
                  <Link
                    key={doc.id}
                    to={`/documents/${doc.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 
                             transition-colors group"
                  >
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 group-hover:text-blue-600 
                                   truncate transition-colors">
                        {doc.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {doc.category} · {formatBytes(doc.fileSize)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(doc.uploadedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Documents by Category */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Folder className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">By Category</h2>
            </div>
          </div>
          <div className="p-6">
            {statsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : !statistics?.documentsByCategory || statistics.documentsByCategory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Folder className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p>No categories yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {statistics.documentsByCategory.map((cat) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between p-3 rounded-lg 
                             hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${getCategoryColor(cat.category)}`} />
                      <span className="font-medium text-gray-900 capitalize">
                        {cat.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{cat.count} docs</span>
                      <span className="text-xs text-gray-400">
                        {formatBytes(cat.totalSize)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Functions

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDistanceToNow(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    contract: 'bg-blue-500',
    policy: 'bg-purple-500',
    handbook: 'bg-green-500',
    training: 'bg-yellow-500',
    personal: 'bg-pink-500',
    payroll: 'bg-indigo-500',
    benefit: 'bg-teal-500',
    performance: 'bg-orange-500',
    compliance: 'bg-red-500',
    other: 'bg-gray-500',
  };
  return colors[category] || 'bg-gray-500';
}
