/**
 * Document Upload Page
 * Upload new documents with metadata
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Upload, X, File, FolderOpen, AlertCircle, ArrowLeft } from 'lucide-react';
import { useUploadFile, useFolders } from '@/hooks/useDocuments';
import type { DocumentCategory, AccessLevel } from '@/types/documents.types';

const CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = [
  { value: 'contract', label: 'Contract' },
  { value: 'policy', label: 'Policy' },
  { value: 'handbook', label: 'Handbook' },
  { value: 'training', label: 'Training' },
  { value: 'personal', label: 'Personal' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'benefit', label: 'Benefit' },
  { value: 'performance', label: 'Performance' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'other', label: 'Other' },
];

const ACCESS_LEVEL_OPTIONS: { value: AccessLevel; label: string; description: string }[] = [
  { value: 'public', label: 'Public', description: 'Anyone can view' },
  { value: 'internal', label: 'Internal', description: 'All employees can view' },
  { value: 'confidential', label: 'Confidential', description: 'Restricted to specific users' },
  { value: 'restricted', label: 'Restricted', description: 'Admin only' },
];

interface UploadFormData {
  name: string;
  description?: string;
  category: DocumentCategory;
  accessLevel: AccessLevel;
  tags?: string;
  expiresAt?: string;
  folderId?: number;
}

export default function DocumentUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: folders = [] } = useFolders();
  const uploadMutation = useUploadFile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadFormData>({
    defaultValues: {
      category: 'other',
      accessLevel: 'internal',
    },
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!selectedFile) {
      return;
    }

    try {
      const metadata = {
        name: data.name,
        description: data.description,
        category: data.category,
        accessLevel: data.accessLevel,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()) : undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
        folderId: data.folderId ? Number(data.folderId) : undefined,
      };

      await uploadMutation.mutateAsync({ file: selectedFile, metadata });
      navigate('/documents');
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/documents')}
            className="flex items-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Documents
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Upload New Document
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload Area */}
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">File *</label>

          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-emerald-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-700 mb-2">Drag and drop a file here, or click to browse</p>
              <p className="text-sm text-slate-500 mb-4">Maximum file size: 50MB</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Select File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
            </div>
          ) : (
            <div className="border border-slate-300 rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <File className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {!selectedFile && (
            <p className="text-sm text-red-600 mt-2">Please select a file to upload</p>
          )}
        </div>

        {/* Metadata Form */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Document Information</h2>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Document Name *
            </label>
            <input
              {...register('name', { required: 'Name is required' })}
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter document name"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter document description"
            />
          </div>

          {/* Category & Access Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select
                {...register('category', { required: true })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Access Level *
              </label>
              <select
                {...register('accessLevel', { required: true })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {ACCESS_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Folder */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <FolderOpen className="w-4 h-4 inline mr-1" />
              Folder (Optional)
            </label>
            <select
              {...register('folderId')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">No folder (root)</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tags (Optional)
            </label>
            <input
              {...register('tags')}
              type="text"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter tags separated by commas"
            />
            <p className="text-xs text-slate-500 mt-1">Example: contract, 2024, legal</p>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Expiry Date (Optional)
            </label>
            <input
              {...register('expiresAt')}
              type="date"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedFile || uploadMutation.isPending}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploadMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Document
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
