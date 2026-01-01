import { useState } from 'react';
import { FileText, Download, Eye, Search, Filter, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentsList, useDocumentCategories, useDocumentDownload } from '../hooks';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

/**
 * Employee Documents Page
 * Mobile-optimized document management portal
 * 
 * Features:
 * - Document list with categories
 * - Search and filter functionality
 * - Download and preview documents
 * - Mobile-first card layout
 */
export default function EmployeeDocuments() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  
  const { data: documents, isLoading: documentsLoading } = useDocumentsList(
    user?.employeeId || '',
    { category: selectedCategory, search: searchQuery }
  );
  
  const { data: categories } = useDocumentCategories();
  const downloadMutation = useDocumentDownload();

  const handleDownload = async (documentId: string, documentName: string) => {
    try {
      const blob = await downloadMutation.mutateAsync(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  if (documentsLoading && !documents) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          My Documents
        </h1>
        <p className="text-sm opacity-90 mt-1">
          Access your employment documents
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-card touch-manipulation"
          />
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap touch-manipulation ${
              !selectedCategory
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-foreground'
            }`}
          >
            All
          </button>
          {categories?.map((category: any) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap touch-manipulation ${
                selectedCategory === category.name
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Document List */}
        <div className="space-y-3">
          {documents && documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No documents found</p>
            </div>
          ) : (
            documents?.map((document: any) => (
              <div
                key={document.id}
                className="bg-card rounded-lg border border-border p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {document.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {document.category} • {new Date(document.uploadedAt).toLocaleDateString()}
                    </p>
                    {document.size && (
                      <p className="text-xs text-muted-foreground">
                        {(document.size / 1024).toFixed(0)} KB
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(document.id, document.name)}
                      className="p-2 hover:bg-muted rounded-lg touch-manipulation"
                      aria-label="Download document"
                    >
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
