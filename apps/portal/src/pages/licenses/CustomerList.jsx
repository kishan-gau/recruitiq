import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Filter, Plus, Download } from 'lucide-react'
import Card from '../../components/licenses/Card'
import Table from '../../components/licenses/Table'
import Badge from '../../components/licenses/Badge'
import apiService from '../../services/api'
import { format } from 'date-fns'

export default function CustomerList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    tier: 'all',
    status: 'all',
    deploymentType: 'all'
  })

  useEffect(() => {
    loadCustomers()
  }, [filters])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const data = await apiService.getCustomers(filters)
      setCustomers(data)
    } catch (error) {
      console.error('Failed to load customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    try {
      // Export to CSV
      const headers = ['Name', 'Email', 'Tier', 'Deployment', 'Status', 'Users', 'Expires', 'MRR']
      const rows = customers.map(c => [
        c.name,
        c.contactEmail,
        c.tier,
        c.deploymentType,
        c.status,
        `${c.users.current}/${c.users.limit || '∞'}`,
        format(new Date(c.contractEndDate), 'yyyy-MM-dd'),
        c.mrr
      ])
      
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `customers-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success(`Exported ${customers.length} customers to CSV`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export customers')
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
    const labels = {
      starter: 'Starter',
      professional: 'Professional',
      enterprise: 'Enterprise'
    }
    const variants = {
      starter: 'gray',
      professional: 'primary',
      enterprise: 'success'
    }
    return <Badge variant={variants[tier] || 'gray'}>{labels[tier]}</Badge>
  }

  const getDeploymentBadge = (type) => {
    const labels = {
      'cloud-shared': 'Cloud Shared',
      'cloud-dedicated': 'Cloud Dedicated',
      'on-premise': 'On-Premise'
    }
    return <Badge variant="gray">{labels[type]}</Badge>
  }

  const columns = [
    {
      header: 'Customer',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-sm text-gray-500">{row.contactEmail}</p>
        </div>
      )
    },
    {
      header: 'Tier',
      accessor: 'tier',
      render: (row) => getTierBadge(row.tier)
    },
    {
      header: 'Deployment',
      accessor: 'deploymentType',
      render: (row) => getDeploymentBadge(row.deploymentType)
    },
    {
      header: 'Users',
      accessor: 'users',
      render: (row) => (
        <span className="text-sm">
          {row.users.current} / {row.users.limit || '∞'}
        </span>
      )
    },
    {
      header: 'Expires',
      accessor: 'contractEndDate',
      render: (row) => {
        const daysLeft = Math.floor((new Date(row.contractEndDate) - new Date()) / (1000 * 60 * 60 * 24))
        return (
          <div>
            <p className="text-sm text-gray-900">{format(new Date(row.contractEndDate), 'MMM dd, yyyy')}</p>
            {daysLeft <= 30 && daysLeft > 0 && (
              <p className="text-xs text-warning-600">{daysLeft} days left</p>
            )}
            {daysLeft <= 0 && (
              <p className="text-xs text-danger-600">Expired</p>
            )}
          </div>
        )
      }
    },
    {
      header: 'MRR',
      accessor: 'mrr',
      render: (row) => (
        <span className="font-medium text-gray-900">
          {row.mrr > 0 ? `$${row.mrr.toLocaleString()}` : 'Annual'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => getStatusBadge(row.status)
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage all customer licenses and subscriptions</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleExport}
            className="btn btn-secondary flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button 
            onClick={() => navigate('/licenses/create')}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                className="input pl-10"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>

          {/* Tier Filter */}
          <div>
            <select
              className="input"
              value={filters.tier}
              onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
            >
              <option value="all">All Tiers</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Deployment Type Filter */}
        <div className="mt-4 flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Deployment:</span>
          <div className="flex items-center space-x-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'cloud-shared', label: 'Cloud Shared' },
              { value: 'cloud-dedicated', label: 'Cloud Dedicated' },
              { value: 'on-premise', label: 'On-Premise' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilters({ ...filters, deploymentType: option.value })}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  filters.deploymentType === option.value
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Customer Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading customers...</p>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={customers}
              onRowClick={(row) => navigate(`/licenses/customers/${row.id}`)}
            />
            <div className="mt-4 text-sm text-gray-600">
              Showing {customers.length} customer{customers.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
