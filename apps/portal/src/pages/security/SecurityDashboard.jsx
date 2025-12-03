import { useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, Activity, TrendingUp } from 'lucide-react';
import { portalService } from '../../services';

export default function SecurityDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['security-dashboard'],
    queryFn: () => portalService.getSecurityDashboard(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200">
        <p className="text-red-600">Failed to load security dashboard: {error.message}</p>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const recentEvents = data?.recentEvents || [];
  const activeThreats = data?.activeThreats || [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shield className="text-primary-600" size={32} />
          Security Monitor
        </h1>
        <p className="text-gray-600 mt-2">
          Real-time security monitoring across all cloud instances
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Events (24h)</p>
            <Activity className="text-blue-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900">{metrics.totalEvents24h || 0}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Failed Logins (24h)</p>
            <AlertTriangle className="text-yellow-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900">{metrics.failedLogins24h || 0}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Active Threats</p>
            <AlertTriangle className="text-red-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900">{activeThreats.length}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Alerts Sent (24h)</p>
            <TrendingUp className="text-green-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-gray-900">{metrics.alertsSent24h || 0}</p>
        </div>
      </div>

      {/* Active Threats */}
      {activeThreats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={24} />
            Active Threats
          </h2>
          <div className="space-y-4">
            {activeThreats.map((threat, index) => (
              <div key={index} className="card bg-red-50 border-red-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                        {threat.severity?.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">
                        {threat.tenant_id || threat.tenantId}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900">{threat.description}</p>
                    <div className="mt-2 text-sm text-gray-600">
                      <span>IP: {threat.ip_address || 'Unknown'}</span>
                      {threat.username && <span className="ml-4">User: {threat.username}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(threat.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Events */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Security Events</h2>
        <div className="card">
          {recentEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent security events</p>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentEvents.map((event, index) => (
                <div key={index} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          event.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          event.severity === 'error' ? 'bg-orange-100 text-orange-700' :
                          event.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {event.event_type || event.eventType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {event.tenant_id || event.tenantId}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">{event.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {event.ip_address && `IP: ${event.ip_address}`}
                        {event.username && ` • User: ${event.username}`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 ml-4">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
