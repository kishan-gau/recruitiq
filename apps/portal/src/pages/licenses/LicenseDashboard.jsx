import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileKey, DollarSign, AlertCircle, TrendingUp, Clock } from 'lucide-react'
import MetricCard from '../../components/licenses/MetricCard'
import Card from '../../components/licenses/Card'
import Table from '../../components/licenses/Table'
import Badge from '../../components/licenses/Badge'
import { portalService } from '../../services'
import { format } from 'date-fns'

export default function LicenseDashboard() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState(null)
  const [upcomingRenewals, setUpcomingRenewals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [metricsData, renewalsData] = await Promise.all([
        portalService.getDashboardMetrics(),
        portalService.getUpcomingRenewals(60)
      ])
      setMetrics(metricsData)
      setUpcomingRenewals(renewalsData)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      active: 'success',
      expired: 'danger',
      suspended: 'warning'
    }
    return <Badge variant={variants[status] || 'gray'}>{status}</Badge>
  }

  const getTierBadge = (tier) => {
    const variants = {
      starter: 'gray',
      professional: 'primary',
      enterprise: 'success'
    }
    return <Badge variant={variants[tier] || 'gray'}>{tier}</Badge>
  }

  const renewalColumns = [
    {
      header: 'Customer',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-500">{row.instanceKey}</p>
        </div>
      )
    },
    {
      header: 'Tier',
      accessor: 'tier',
      render: (row) => getTierBadge(row.tier)
    },
    {
      header: 'Expires',
      accessor: 'contractEndDate',
      render: (row) => {
        const daysLeft = Math.floor((new Date(row.contractEndDate) - new Date()) / (1000 * 60 * 60 * 24))
        return (
          <div>
            <p className="text-sm text-gray-900">{format(new Date(row.contractEndDate), 'MMM dd, yyyy')}</p>
            <p className={`text-xs ${daysLeft <= 15 ? 'text-red-600' : 'text-yellow-600'}`}>
              {daysLeft} days left
            </p>
          </div>
        )
      }
    },
    {
      header: 'MRR',
      accessor: 'mrr',
      render: (row) => (
        <span className="font-medium">${row.mrr.toLocaleString()}</span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => getStatusBadge(row.status)
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">License Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of all licenses and customers</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Total Customers"
          value={metrics?.totalCustomers || 0}
          icon={Users}
        />
        <MetricCard
          label="Active Licenses"
          value={metrics?.activeLicenses || 0}
          icon={FileKey}
        />
        <MetricCard
          label="Monthly Revenue"
          value={metrics?.mrr || 0}
          format="currency"
          icon={DollarSign}
        />
        <MetricCard
          label="Expiring Soon"
          value={metrics?.expiringLicenses || 0}
          icon={AlertCircle}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card title="Revenue Trend">
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Revenue chart visualization</p>
              <p className="text-sm text-gray-400 mt-2">Will be implemented with Recharts</p>
            </div>
          </div>
        </Card>

        {/* Customer Growth */}
        <Card title="Customer Growth">
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Customer growth chart</p>
              <p className="text-sm text-gray-400 mt-2">Will be implemented with Recharts</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Renewals */}
      <Card 
        title="Upcoming Renewals" 
        actions={
          <button 
            onClick={() => navigate('/licenses/customers')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </button>
        }
      >
        <Table 
          columns={renewalColumns} 
          data={upcomingRenewals.slice(0, 5)}
          onRowClick={(row) => navigate(`/licenses/customers/${row.id}`)}
        />
        {upcomingRenewals.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No upcoming renewals in the next 60 days</p>
          </div>
        )}
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Annual Recurring Revenue</p>
            <p className="text-3xl font-bold text-gray-900">${(metrics?.arr || 0).toLocaleString()}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Average Customer Value</p>
            <p className="text-3xl font-bold text-gray-900">
              ${Math.round((metrics?.mrr || 0) / (metrics?.activeCustomers || 1)).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">per month</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Active Rate</p>
            <p className="text-3xl font-bold text-gray-900">
              {Math.round(((metrics?.activeCustomers || 0) / (metrics?.totalCustomers || 1)) * 100)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">{metrics?.activeCustomers || 0} of {metrics?.totalCustomers || 0} customers</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
