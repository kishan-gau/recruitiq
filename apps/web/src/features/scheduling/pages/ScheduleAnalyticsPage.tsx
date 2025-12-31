
import { ScheduleAnalytics } from '@features/scheduling/components';

export default function ScheduleAnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Schedule Analytics
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Comprehensive analytics and insights for workforce scheduling
          </p>
        </div>
      </div>

      {/* Analytics Component */}
      <ScheduleAnalytics />
    </div>
  );
}