import { X, Download, Send, Loader2, FileText, BarChart3, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, RotateCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { useToast } from '@/contexts/ToastContext';
import { usePaylinqAPI } from '@/hooks/usePaylinqAPI';
import { handleApiError } from '@/utils/errorHandler';

import ComponentBreakdown from './ComponentBreakdown';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PayslipViewerProps {
  paycheckId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PayslipViewer({ paycheckId, isOpen, onClose }: PayslipViewerProps) {
  const { paylinq } = usePaylinqAPI();
  const toast = useToast();
  const [pdfData, setPdfData] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pdf' | 'breakdown'>('pdf');
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    if (isOpen && paycheckId) {
      loadPdf();
    }

    return () => {
      // Cleanup when component unmounts or modal closes
      setPdfData(null);
    };
  }, [isOpen, paycheckId]);

  const loadPdf = async () => {
    try {
      setIsLoading(true);
      
      console.log('[PayslipViewer] Calling downloadPayslipPdf...');
      const response = await paylinq.downloadPayslipPdf(paycheckId);
      
      console.log('[PayslipViewer] Full response:', response);
      console.log('[PayslipViewer] Response is Blob:', response instanceof Blob);
      
      // Handle different response formats
      let blob: Blob;
      
      if (response instanceof Blob) {
        // Direct Blob (old axios implementation)
        blob = response;
        console.log('[PayslipViewer] Using direct Blob:', blob.size, blob.type);
      } else if (response?.data instanceof Blob) {
        // Axios-like response with data property
        blob = response.data;
        console.log('[PayslipViewer] Using response.data Blob:', blob.size, blob.type);
      } else {
        console.error('[PayslipViewer] Unexpected response format:', response);
        throw new Error('Invalid PDF response format');
      }
      
      setPdfData(blob);
    } catch (err: any) {
      console.error('Failed to load payslip PDF:', err);
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to load payslip',
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await paylinq.downloadPayslipPdf(paycheckId);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${paycheckId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Payslip downloaded successfully');
    } catch (err: any) {
      console.error('Failed to download payslip:', err);
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to download payslip',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSend = async () => {
    try {
      setIsSending(true);
      await paylinq.sendPayslip(paycheckId);
      toast.success('Payslip sent to employee email');
    } catch (err: any) {
      console.error('Failed to send payslip:', err);
      handleApiError(err, {
        toast,
        defaultMessage: 'Failed to send payslip',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.4));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFitToPage = () => {
    setScale(1.0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-6xl bg-white dark:bg-gray-900 rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Payslip Preview
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                disabled={isDownloading || isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download</span>
              </button>
              <button
                onClick={handleSend}
                disabled={isSending || isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Send Email</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab('pdf')}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'pdf'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>PDF View</span>
              </button>
              <button
                onClick={() => setActiveTab('breakdown')}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'breakdown'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Component Breakdown</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'pdf' ? (
              <>
                {/* PDF Controls Toolbar */}
                {!isLoading && pdfData && (
                  <div className="flex items-center justify-center space-x-2 mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <button
                      onClick={handleZoomOut}
                      disabled={scale <= 0.4}
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      disabled={scale >= 3.0}
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
                    <button
                      onClick={handleRotate}
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={handleFitToPage}
                      disabled={scale === 1.0}
                      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Fit to Page (100%)"
                    >
                      <Maximize2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>
                )}
                {isLoading ? (
                  <div className="flex items-center justify-center h-[600px]">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">Loading payslip...</p>
                    </div>
                  </div>
                ) : pdfData ? (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    <div className="flex flex-col items-center py-4">
                      <Document
                        file={pdfData}
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        loading={
                          <div className="flex items-center justify-center h-[600px]">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                          </div>
                        }
                        error={
                          <div className="flex items-center justify-center h-[600px]">
                            <div className="text-center">
                              <FileText className="w-12 h-12 text-red-600 mx-auto mb-4" />
                              <p className="text-gray-600 dark:text-gray-400">Failed to load PDF</p>
                            </div>
                          </div>
                        }
                      >
                        <Page
                          pageNumber={pageNumber}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          className="shadow-lg"
                          width={800 * scale}
                          rotate={rotation}
                        />
                      </Document>
                      
                      {numPages > 1 && (
                        <div className="flex items-center space-x-4 mt-4">
                          <button
                            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                            disabled={pageNumber <= 1}
                            className="p-2 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Page {pageNumber} of {numPages}
                          </span>
                          <button
                            onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                            disabled={pageNumber >= numPages}
                            className="p-2 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px]">
                    <p className="text-gray-500 dark:text-gray-400">Failed to load payslip</p>
                  </div>
                )}
              </>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <ComponentBreakdown paycheckId={paycheckId} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
