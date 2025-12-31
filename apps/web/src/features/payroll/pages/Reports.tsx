import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { payrollRunsService } from '@/features/payroll/services';
import { handleApiError } from '@/utils/errorHandler';

type ReportType = 'payroll' | 'deductions' | 'ytd' | 'tax' | 'custom';

interface ReportFilters {
  startDate: string;
  endDate: string;
  employeeId?: string;
  departmentId?: string;
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('payroll');
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Available reports
  const reports = [
    {
      id: 'payroll' as ReportType,
      name: 'Loonstrook Overzicht',
      description: 'Gedetailleerd overzicht van alle loonstroken voor een periode',
      icon: '📊',
    },
    {
      id: 'deductions' as ReportType,
      name: 'Aftrekken Overzicht',
      description: 'Samenvatting van alle aftrekken per medewerker',
      icon: '📉',
    },
    {
      id: 'ytd' as ReportType,
      name: 'Year-to-Date Rapport',
      description: 'Cumulatieve loon- en aftrekgegevens voor het huidige jaar',
      icon: '📅',
    },
    {
      id: 'tax' as ReportType,
      name: 'Belasting Overzicht',
      description: 'Belastingberekeningen en inhouding per periode',
      icon: '💰',
    },
    {
      id: 'custom' as ReportType,
      name: 'Aangepast Rapport',
      description: 'Maak een aangepast rapport met specifieke criteria',
      icon: '🔧',
    },
  ];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      // This would call the appropriate report generation API based on selectedReport
      const reportRequest = {
        reportType: selectedReport,
        filters: filters,
        format: 'PDF', // or 'EXCEL', 'CSV'
      };
      
      // Simulating API call - replace with actual service call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Generating report:', reportRequest);
      alert('Rapport wordt gegenereerd. U ontvangt een notificatie wanneer het gereed is.');
    } catch (error) {
      handleApiError(error, { defaultMessage: 'Fout bij genereren rapport' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = (format: 'PDF' | 'EXCEL' | 'CSV') => {
    alert(`Exporteren naar ${format}...`);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Rapporten</h1>
        <p className="mt-1 text-sm text-gray-600">Genereer en exporteer loonadministratie rapporten</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Beschikbare Rapporten</h2>
            <div className="space-y-2">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedReport === report.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{report.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{report.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{report.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Rapport Statistieken</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Deze maand</span>
                <span className="text-sm font-medium text-gray-900">12 rapporten</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Totaal dit jaar</span>
                <span className="text-sm font-medium text-gray-900">145 rapporten</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Laatst gegenereerd</span>
                <span className="text-sm font-medium text-gray-900">2 uur geleden</span>
              </div>
            </div>
          </div>
        </div>

        {/* Report Configuration */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                {reports.find(r => r.id === selectedReport)?.name}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {reports.find(r => r.id === selectedReport)?.description}
              </p>
            </div>

            {/* Filters */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Einddatum</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {selectedReport !== 'ytd' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medewerker (optioneel)</label>
                    <input
                      type="text"
                      placeholder="Medewerker ID of naam"
                      value={filters.employeeId || ''}
                      onChange={(e) => setFilters({ ...filters, _employeeId: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Afdeling (optioneel)</label>
                    <input
                      type="text"
                      placeholder="Afdeling ID of naam"
                      value={filters.departmentId || ''}
                      onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Report Preview/Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Rapport Inhoud</h3>
              <div className="text-sm text-gray-600 space-y-1">
                {selectedReport === 'payroll' && (
                  <>
                    <p>• Brutoloon en toelagen per medewerker</p>
                    <p>• Aftrekken en belastingen</p>
                    <p>• Nettoloon berekening</p>
                    <p>• Totaal overzicht per afdeling</p>
                  </>
                )}
                {selectedReport === 'deductions' && (
                  <>
                    <p>• Wettelijke en vrijwillige aftrekken</p>
                    <p>• Aftrek per medewerker en type</p>
                    <p>• Cumulatieve aftrekbedragen</p>
                    <p>• Vergelijking met vorige periode</p>
                  </>
                )}
                {selectedReport === 'ytd' && (
                  <>
                    <p>• Cumulatief bruto- en nettoloon</p>
                    <p>• Totale belastingen en aftrekken</p>
                    <p>• Jaarlijks overzicht per medewerker</p>
                    <p>• Compliance tracking</p>
                  </>
                )}
                {selectedReport === 'tax' && (
                  <>
                    <p>• Belastingberekeningen per regel</p>
                    <p>• Ingehouden bedragen per type</p>
                    <p>• Werkgeversbijdragen</p>
                    <p>• Aangiftegegevens</p>
                  </>
                )}
                {selectedReport === 'custom' && (
                  <>
                    <p>• Selecteer uw eigen datakolommen</p>
                    <p>• Aangepaste filters en groeperingen</p>
                    <p>• Flexibel exportformaat</p>
                    <p>• Bewaar als template</p>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('PDF')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => handleExport('EXCEL')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  📊 Excel
                </button>
                <button
                  onClick={() => handleExport('CSV')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  📝 CSV
                </button>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className={`inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isGenerating
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Genereren...
                  </>
                ) : (
                  'Rapport Genereren'
                )}
              </button>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="mt-6 bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recente Rapporten</h3>
            <div className="space-y-3">
              {[
                { name: 'Loonstrook Overzicht December 2024', date: '2024-12-26', size: '2.4 MB', type: 'PDF' },
                { name: 'Year-to-Date Rapport 2024', date: '2024-12-20', size: '5.1 MB', type: 'Excel' },
                { name: 'Belasting Overzicht Q4 2024', date: '2024-12-15', size: '1.8 MB', type: 'PDF' },
              ].map((report, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">{report.type === 'PDF' ? '📄' : '📊'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{report.name}</p>
                      <p className="text-xs text-gray-500">{report.date} • {report.size}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-blue-600 hover:text-blue-900">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button className="p-2 text-gray-600 hover:text-gray-900">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
