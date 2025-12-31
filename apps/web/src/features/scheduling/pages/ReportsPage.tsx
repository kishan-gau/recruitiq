
import { ReportingDashboard } from '@features/scheduling/components';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Scheduling Reports
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Generate and view detailed scheduling reports and insights
          </p>
        </div>
      </div>

      {/* Reporting Dashboard Component */}
      <div className="min-h-[600px]">
        <ReportingDashboard />
      </div>
    </div>
  );
}