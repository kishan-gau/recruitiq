/**
 * PayslipsList Component
 * 
 * Displays a list of paychecks/payslips for a processed payroll run
 * with options to view and download individual payslips
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, Loader2, X } from 'lucide-react';
import type { Paycheck } from '@recruitiq/types';

import { usePaylinqAPI } from '../../hooks/usePaylinqAPI';
import { handleApiError } from '@/utils/errorHandler';
import PayslipViewer from './PayslipViewer';

interface PayslipsListProps {
  payrollRunId: string;
  isOpen: boolean;
  onClose: () => void;
  runNumber?: string;
  runName?: string;
}

export default function PayslipsList({ 
  payrollRunId, 
  isOpen, 
  onClose,
  runNumber,
  runName
}: PayslipsListProps) {
  const { paylinq } = usePaylinqAPI();
  const [selectedPaycheckId, setSelectedPaycheckId] = useState<string | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // Fetch paychecks for this payroll run
  const { data: paychecks, isLoading, error } = useQuery({
    queryKey: ['paychecks', payrollRunId],
    queryFn: async () => {
      const response = await paylinq.getPaychecks({ payrollRunId });
      return response.data || [];
    },
    enabled: isOpen && !!payrollRunId,
  });

  const handleDownload = async (paycheckId: string, employeeName: string) => {
    try {
      setDownloadingIds(prev => new Set(prev).add(paycheckId));
      
      const response = await paylinq.downloadPayslipPdf(paycheckId);
      
      // Handle different response formats
      let blob: Blob;
      if (response instanceof Blob) {
        blob = response;
      } else if (response?.data instanceof Blob) {
        blob = response.data;
      } else {
        throw new Error('Invalid PDF response format');
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `loonstrook_${employeeName.replace(/\s+/g, '_')}_${runNumber || paycheckId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Download mislukt' });
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(paycheckId);
        return newSet;
      });
    }
  };

  const handleDownloadAll = async () => {
    if (!paychecks || paychecks.length === 0) return;
    
    // Download all paychecks sequentially
    for (const paycheck of paychecks) {
      await handleDownload(paycheck.id, paycheck.employeeName || 'Medewerker');
      // Small delay between downloads to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={onClose}
          />
          
          <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Loonstroken</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {runNumber && `Run: ${runNumber}`}
                  {runName && ` - ${runName}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {paychecks && paychecks.length > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Download Alle
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isLoading && (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">Fout bij laden loonstroken</p>
                </div>
              )}

              {!isLoading && !error && paychecks && paychecks.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">Geen loonstroken gevonden</p>
                </div>
              )}

              {!isLoading && !error && paychecks && paychecks.length > 0 && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Medewerker
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bruto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Netto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Betaaldatum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acties
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paychecks.map((paycheck: Paycheck) => (
                        <tr key={paycheck.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {paycheck.employeeName || 'Medewerker'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            €{paycheck.grossPay.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            €{paycheck.netPay.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(paycheck.paymentDate).toLocaleDateString('nl-NL')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${paycheck.status === 'paid' ? 'bg-green-100 text-green-800' : ''}
                              ${paycheck.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                              ${paycheck.status === 'approved' ? 'bg-blue-100 text-blue-800' : ''}
                              ${paycheck.status === 'voided' ? 'bg-red-100 text-red-800' : ''}
                            `}>
                              {paycheck.status === 'paid' ? 'Betaald' : ''}
                              {paycheck.status === 'pending' ? 'In afwachting' : ''}
                              {paycheck.status === 'approved' ? 'Goedgekeurd' : ''}
                              {paycheck.status === 'voided' ? 'Vervallen' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedPaycheckId(paycheck.id)}
                                className="text-blue-600 hover:text-blue-900 p-1.5 rounded hover:bg-blue-50"
                                title="Bekijken"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownload(paycheck.id, paycheck.employeeName || 'Medewerker')}
                                disabled={downloadingIds.has(paycheck.id)}
                                className="text-green-600 hover:text-green-900 p-1.5 rounded hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Download"
                              >
                                {downloadingIds.has(paycheck.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {paychecks && paychecks.length > 0 && (
                    <>
                      Totaal: {paychecks.length} loonstr{paychecks.length === 1 ? 'ook' : 'oken'}
                    </>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payslip Viewer Modal */}
      {selectedPaycheckId && (
        <PayslipViewer
          paycheckId={selectedPaycheckId}
          isOpen={true}
          onClose={() => setSelectedPaycheckId(null)}
        />
      )}
    </>
  );
}
