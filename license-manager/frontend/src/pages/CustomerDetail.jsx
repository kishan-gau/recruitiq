import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, 
  Edit, 
  RotateCcw, 
  Download, 
  Pause, 
  Play,
  AlertCircle,
  CheckCircle,
  Globe,
  Server,
  Users,
  Briefcase,
  FileText,
  Activity
} from 'lucide-react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import ProgressBar from '../components/ProgressBar'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import DeploymentButton from '../components/DeploymentButton'
import DeploymentProgress from '../components/DeploymentProgress'
import api from '../services/api'
import { format, formatDistanceToNow } from 'date-fns'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [usage, setUsage] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [renewMonths, setRenewMonths] = useState(12)
  const [actionLoading, setActionLoading] = useState(false)
  const [deploymentJobId, setDeploymentJobId] = useState(null)
  const [editForm, setEditForm] = useState({
    contactName: '',
    contactEmail: '',
    instanceUrl: ''
  })

  useEffect(() => {
    loadCustomerData()
  }, [id])

  const loadCustomerData = async () => {
    try {
      const [customerData, usageData, activityData] = await Promise.all([
        api.getCustomer(id),
        api.getCustomerUsage(id, 30),
        api.getCustomerActivity(id, 10)
      ])
      setCustomer(customerData)
      setUsage(usageData)
      setActivity(activityData)
      
      // Initialize edit form with customer data
      setEditForm({
        contactName: customerData.contactName || '',
        contactEmail: customerData.contactEmail || '',
        instanceUrl: customerData.instanceUrl || ''
      })
    } catch (error) {
      console.error('Failed to load customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRenewLicense = async () => {
    setActionLoading(true)
    try {
      await api.renewLicense(id, renewMonths)
      setShowRenewModal(false)
      await loadCustomerData()
      toast.success(`License renewed for ${renewMonths} months!`)
    } catch (error) {
      console.error('Renew error:', error)
      toast.error(error.response?.data?.error || 'Failed to renew license')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspendLicense = async () => {
    setActionLoading(true)
    setShowSuspendConfirm(false)
    try {
      await api.suspendLicense(id)
      await loadCustomerData()
      toast.success('License suspended successfully')
    } catch (error) {
      console.error('Suspend error:', error)
      toast.error(error.response?.data?.error || 'Failed to suspend license')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivateLicense = async () => {
    setActionLoading(true)
    try {
      await api.reactivateLicense(id)
      await loadCustomerData()
      toast.success('License reactivated successfully')
    } catch (error) {
      console.error('Reactivate error:', error)
      toast.error(error.response?.data?.error || 'Failed to reactivate license')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditCustomer = async () => {
    setActionLoading(true)
    try {
      await api.updateCustomer(id, {
        contact_name: editForm.contactName,
        contact_email: editForm.contactEmail,
        instance_url: editForm.instanceUrl
      })
      await loadCustomerData()
      setShowEditModal(false)
      toast.success('Customer updated successfully')
    } catch (error) {
      console.error('Update error:', error)
      toast.error(error.response?.data?.error || 'Failed to update customer')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || !customer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading customer details...</p>
        </div>
      </div>
    )
  }

  const daysUntilExpiry = Math.floor((new Date(customer.contractEndDate) - new Date()) / (1000 * 60 * 60 * 24))
  const isExpired = daysUntilExpiry < 0
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-600 mt-1">{customer.instanceKey}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => api.downloadLicenseFile(id)}
            className="btn btn-secondary flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Download .lic
          </button>
          <button 
            onClick={() => setShowEditModal(true)}
            className="btn btn-secondary flex items-center"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </button>
          <button 
            onClick={() => setShowRenewModal(true)}
            className="btn btn-success flex items-center"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Renew
          </button>
        </div>
      </div>

      {/* Expiry Alert */}
      {(isExpiringSoon || isExpired) && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 ${
          isExpired ? 'bg-danger-50 border border-danger-200' : 'bg-warning-50 border border-warning-200'
        }`}>
          <AlertCircle className={`w-5 h-5 mt-0.5 ${isExpired ? 'text-danger-600' : 'text-warning-600'}`} />
          <div>
            <h3 className={`font-medium ${isExpired ? 'text-danger-900' : 'text-warning-900'}`}>
              {isExpired ? 'License Expired' : 'License Expiring Soon'}
            </h3>
            <p className={`text-sm mt-1 ${isExpired ? 'text-danger-700' : 'text-warning-700'}`}>
              {isExpired 
                ? `This license expired ${Math.abs(daysUntilExpiry)} days ago. Please renew immediately.`
                : `This license will expire in ${daysUntilExpiry} days. Consider renewing soon.`
              }
            </p>
          </div>
        </div>
      )}

      {/* License Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="License Details">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Tier</label>
              <div className="mt-1">{getTierBadge(customer.tier)}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Status</label>
              <div className="mt-1">{getStatusBadge(customer.status)}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">License Key</label>
              <p className="mt-1 text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                {customer.id}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Issued</label>
              <p className="mt-1 text-sm text-gray-900">
                {format(new Date(customer.contractStartDate), 'MMMM dd, yyyy')}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Expires</label>
              <p className="mt-1 text-sm text-gray-900">
                {format(new Date(customer.contractEndDate), 'MMMM dd, yyyy')}
              </p>
              <p className={`text-xs mt-1 ${isExpired ? 'text-danger-600' : isExpiringSoon ? 'text-warning-600' : 'text-gray-600'}`}>
                {isExpired ? `Expired ${Math.abs(daysUntilExpiry)} days ago` : `${daysUntilExpiry} days remaining`}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Instance Details">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Deployment Type</label>
              <div className="mt-1 flex items-center space-x-2">
                {customer.deploymentType === 'on-premise' ? (
                  <Server className="w-4 h-4 text-gray-500" />
                ) : (
                  <Globe className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-sm text-gray-900">
                  {customer.deploymentType === 'cloud-shared' && 'Cloud Shared'}
                  {customer.deploymentType === 'cloud-dedicated' && 'Cloud Dedicated'}
                  {customer.deploymentType === 'on-premise' && 'On-Premise'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600">URL</label>
              <a 
                href={customer.instanceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-sm text-primary-600 hover:text-primary-700 block"
              >
                {customer.instanceUrl}
              </a>
            </div>
            <div>
              <label className="text-sm text-gray-600">Version</label>
              <p className="mt-1 text-sm text-gray-900">{customer.version}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Last Heartbeat</label>
              <p className="mt-1 text-sm text-gray-900">
                {formatDistanceToNow(new Date(customer.lastHeartbeat), { addSuffix: true })}
              </p>
              {new Date() - new Date(customer.lastHeartbeat) > 24 * 60 * 60 * 1000 && (
                <p className="text-xs text-warning-600 mt-1">No recent heartbeat</p>
              )}
            </div>
          </div>
        </Card>

        <Card title="Contact Information">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Contact Name</label>
              <p className="mt-1 text-sm text-gray-900">{customer.contactName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <a 
                href={`mailto:${customer.contactEmail}`}
                className="mt-1 text-sm text-primary-600 hover:text-primary-700 block"
              >
                {customer.contactEmail}
              </a>
            </div>
            <div>
              <label className="text-sm text-gray-600">Monthly Revenue</label>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {customer.mrr > 0 ? `$${customer.mrr.toLocaleString()}` : 'Annual Payment'}
              </p>
            </div>
            <div className="pt-4 border-t border-gray-200">
              {customer.status === 'active' ? (
                <button
                  onClick={() => setShowSuspendConfirm(true)}
                  disabled={actionLoading}
                  className="btn btn-danger w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Suspending...
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Suspend License
                    </>
                  )}
                </button>
              ) : customer.status === 'suspended' ? (
                <button
                  onClick={handleReactivateLicense}
                  disabled={actionLoading}
                  className="btn btn-success w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Reactivating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Reactivate License
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleReactivateLicense}
                  disabled={actionLoading}
                  className="btn btn-warning w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Reactivating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Reactivate License
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Usage Stats */}
      <Card title="Usage & Limits">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Users</span>
            </div>
            <ProgressBar current={customer.users.current} limit={customer.users.limit} />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Briefcase className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Workspaces</span>
            </div>
            <ProgressBar current={customer.workspaces.current} limit={customer.workspaces.limit} />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Jobs</span>
            </div>
            <ProgressBar current={customer.jobs.current} limit={customer.jobs.limit} />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Candidates</span>
            </div>
            <ProgressBar current={customer.candidates.current} limit={customer.candidates.limit} />
          </div>
        </div>
      </Card>

      {/* Instance Deployment */}
      <Card title="Instance Deployment">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <Server className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900">Cloud Deployment</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Deploy this customer's RecruitIQ instance to TransIP OpenStack infrastructure with one click.
                  The deployment will automatically configure Docker containers, Nginx, SSL certificates, and all required services.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Deployment Type</p>
              <p className="text-sm font-medium text-gray-900 mt-1 capitalize">
                {customer.deploymentType || 'Not Deployed'}
              </p>
            </div>
            <DeploymentButton
              instance={{
                id: customer.instanceKey,
                license_key: customer.id
              }}
              customer={{
                id: customer.id,
                name: customer.name,
                email: customer.contactEmail,
                tier: customer.tier
              }}
              onDeploymentStart={(job) => {
                setDeploymentJobId(job.jobId)
                toast.success('Deployment started!')
              }}
            />
          </div>

          {deploymentJobId && (
            <div className="mt-6">
              <DeploymentProgress
                jobId={deploymentJobId}
                onComplete={(deployment) => {
                  console.log('Deployment completed:', deployment)
                  if (deployment.state === 'completed' && deployment.result) {
                    toast.success(`Deployment successful! IP: ${deployment.result.ipAddress}`)
                    // Optionally reload customer data to update instance URL
                    loadCustomerData()
                  } else if (deployment.state === 'failed') {
                    toast.error('Deployment failed. Check logs for details.')
                  }
                }}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card title="Recent Activity">
        <div className="space-y-4">
          {activity.map((item, index) => (
            <div key={index} className="flex items-start space-x-3 pb-4 border-b border-gray-200 last:border-0 last:pb-0">
              <div className="p-2 bg-primary-50 rounded-lg">
                <Activity className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{item.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Renew Modal */}
      <Modal
        isOpen={showRenewModal}
        onClose={() => setShowRenewModal(false)}
        title="Renew License"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Renewal Duration</label>
            <select
              className="input"
              value={renewMonths}
              onChange={(e) => setRenewMonths(parseInt(e.target.value))}
            >
              <option value={1}>1 Month</option>
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>12 Months (1 Year)</option>
              <option value={24}>24 Months (2 Years)</option>
              <option value={36}>36 Months (3 Years)</option>
            </select>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">New expiry date:</p>
            <p className="text-lg font-semibold text-gray-900">
              {format(
                new Date(new Date(customer.contractEndDate).getTime() + (renewMonths * 30 * 24 * 60 * 60 * 1000)),
                'MMMM dd, yyyy'
              )}
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowRenewModal(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleRenewLicense}
              className="btn btn-primary"
            >
              Renew License
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Customer"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Contact Name</label>
            <input
              type="text"
              className="input"
              value={editForm.contactName}
              onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="label">Contact Email</label>
            <input
              type="email"
              className="input"
              value={editForm.contactEmail}
              onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
              placeholder="john@company.com"
            />
          </div>

          <div>
            <label className="label">Instance URL</label>
            <input
              type="url"
              className="input"
              value={editForm.instanceUrl}
              onChange={(e) => setEditForm({ ...editForm, instanceUrl: e.target.value })}
              placeholder="https://company.recruitiq.com"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowEditModal(false)}
              disabled={actionLoading}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleEditCustomer}
              disabled={actionLoading}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Suspend Confirmation */}
      <ConfirmDialog
        isOpen={showSuspendConfirm}
        onClose={() => setShowSuspendConfirm(false)}
        onConfirm={handleSuspendLicense}
        title="Suspend License"
        message="Are you sure you want to suspend this license? The customer will lose access to their RecruitIQ instance immediately."
        confirmText="Suspend License"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
