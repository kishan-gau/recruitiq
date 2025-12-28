import { FileText } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documents</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Manage and organize employee documents</p>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-12 text-center">
        <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Document Management</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Upload, organize, and track employee documents, contracts, certificates, and compliance files.
        </p>
      </div>
    </div>
  );
}
