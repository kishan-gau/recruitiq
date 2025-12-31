
import { useCandidates } from '../hooks/useCandidates';
import { useDashboard } from '../hooks/useDashboard';
import { useJobs } from '../hooks/useJobs';

interface DashboardMetrics {
  totalJobs: number
  openJobs: number
  totalCandidates: number
  activeCandidates: number
  totalHired: number
  totalApplications: number
  conversionRate: number
  avgTimeToHire: number
}

export default function RecruitmentDashboard() {
  // Data hooks
  const { data: jobs = [], isLoading: jobsLoading } = useJobs();
  const { data: candidates = [], isLoading: candidatesLoading } = useCandidates();
  const { data: metrics, isLoading: metricsLoading } = useDashboard();

  // Calculate totals safely from direct data or metrics
  const totalOpenings = metrics?.openJobs ?? jobs.filter((j: any) => j.status === 'open').length;
  const totalCandidates = metrics?.totalCandidates ?? candidates.length;
  const totalHired = metrics?.totalHired ?? candidates.filter((c: any) => c.stage === 'Hired').length;
  const conversionRate = metrics?.conversionRate ?? 0;

  // Loading state
  const isLoading = jobsLoading || candidatesLoading || metricsLoading;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recruitment Overview</h1>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Summary of hiring activity and recruitment performance
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded shadow-sm hover:shadow transition-all duration-200"
          >
            Share
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            New Job
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-emerald-500/5 transition-all duration-200">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Open Roles</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isLoading ? (
              <div className="w-16 h-8 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            ) : (
              totalOpenings.toLocaleString()
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Active job postings
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-emerald-500/5 transition-all duration-200">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Candidates</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isLoading ? (
              <div className="w-16 h-8 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            ) : (
              totalCandidates.toLocaleString()
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Total in pipeline
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-emerald-500/5 transition-all duration-200">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Hires</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {isLoading ? (
              <div className="w-16 h-8 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            ) : (
              totalHired.toLocaleString()
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Successful hires
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-emerald-500/5 transition-all duration-200">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Conversion Rate</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {isLoading ? (
              <div className="w-16 h-8 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            ) : (
              `${conversionRate.toFixed(1)}%`
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Application to hire
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-2 p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
          <div className="font-semibold mb-4 text-slate-900 dark:text-slate-100">Recent Activity</div>
          
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-full" />
                  <div className="flex-1">
                    <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mb-1" />
                    <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              No recent activity — move candidates through stages to populate this feed.
            </div>
          )}
        </div>

        <div className="p-4 bg-white dark:bg-slate-800/50 rounded-lg border dark:border-slate-700/50 shadow-sm">
          <div className="font-semibold mb-4 text-slate-900 dark:text-slate-100">Quick Actions</div>
          <div className="space-y-2">
            <button className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Post New Job
            </button>
            <button className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Review Applications
            </button>
            <button className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Schedule Interview
            </button>
            <button className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              View Pipeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
