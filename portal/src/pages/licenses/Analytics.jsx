import { useState, useEffect } from 'react'
import { TrendingUp, Users, DollarSign, Briefcase } from 'lucide-react'
import Card from '../../components/licenses/Card'
import MetricCard from '../../components/licenses/MetricCard'
import apiService from '../../services/api'

export default function Analytics() {
  const [period, setPeriod] = useState('30d')
  const [metrics, setMetrics] = useState(null)
  const [topCustomers, setTopCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [period])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      // Get dashboard metrics for overall stats
      const metricsData = await apiService.getDashboardMetrics()
      setMetrics(metricsData)
      
      // Get all customers to calculate top customers by revenue
      const customers = await apiService.getCustomers({})
      const sorted = customers
        .filter(c => c.status === 'active')
        .sort((a, b) => b.mrr - a.mrr)
        .slice(0, 5)
      setTopCustomers(sorted)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Usage insights and revenue metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                period === p
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === '7d' && 'Last 7 Days'}
              {p === '30d' && 'Last 30 Days'}
              {p === '90d' && 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Annual Revenue (ARR)"
          value={metrics?.arr || 0}
          format="currency"
          icon={DollarSign}
        />
        <MetricCard
          label="Monthly Revenue (MRR)"
          value={metrics?.mrr || 0}
          format="currency"
          icon={DollarSign}
        />
        <MetricCard
          label="Active Customers"
          value={metrics?.activeCustomers || 0}
          icon={Users}
        />
        <MetricCard
          label="Total Customers"
          value={metrics?.totalCustomers || 0}
          icon={Users}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Revenue Trend">
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Revenue line chart</p>
              <p className="text-sm text-gray-400 mt-2">Will be implemented with Recharts</p>
            </div>
          </div>
        </Card>

        <Card title="User Activity">
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>User activity chart</p>
              <p className="text-sm text-gray-400 mt-2">Will be implemented with Recharts</p>
            </div>
          </div>
        </Card>

        <Card title="Customer Distribution">
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Tier distribution pie chart</p>
              <p className="text-sm text-gray-400 mt-2">Will be implemented with Recharts</p>
            </div>
          </div>
        </Card>

        <Card title="Deployment Types">
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Deployment type distribution</p>
              <p className="text-sm text-gray-400 mt-2">Will be implemented with Recharts</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Customers */}
      <Card title="Top Customers by Revenue">
        {topCustomers.length > 0 ? (
          <div className="space-y-4">
            {topCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-600 rounded-full font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{customer.name}</p>
                    <p className="text-sm text-gray-600 capitalize">{customer.tier}</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-gray-900">${customer.mrr.toLocaleString()}/mo</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No active customers found</p>
          </div>
        )}
      </Card>
    </div>
  )
}
