import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import Card from '../components/Card'
import api from '../services/api'

export default function LicenseCreate() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1: Customer Info
    name: '',
    contactName: '',
    contactEmail: '',
    
    // Step 2: Deployment
    deploymentType: 'cloud-dedicated',
    instanceUrl: '',
    
    // Step 3: License Tier
    tier: 'professional',
    
    // Step 4: Limits
    maxUsers: 50,
    maxWorkspaces: 5,
    maxJobs: null,
    maxCandidates: 5000,
    durationMonths: 12,
    
    // Step 5: Features
    features: ['basic', 'analytics', 'api']
  })

  const steps = [
    { number: 1, title: 'Customer Info' },
    { number: 2, title: 'Deployment' },
    { number: 3, title: 'License Tier' },
    { number: 4, title: 'Limits & Duration' },
    { number: 5, title: 'Review' }
  ]

  const tierPresets = {
    starter: {
      maxUsers: 10,
      maxWorkspaces: 1,
      maxJobs: 50,
      maxCandidates: 500,
      features: ['basic']
    },
    professional: {
      maxUsers: 50,
      maxWorkspaces: 5,
      maxJobs: null,
      maxCandidates: 5000,
      features: ['basic', 'analytics', 'api', 'customBranding']
    },
    enterprise: {
      maxUsers: null,
      maxWorkspaces: null,
      maxJobs: null,
      maxCandidates: null,
      features: ['basic', 'analytics', 'api', 'customBranding', 'sso', 'integrations', 'whiteLabel']
    }
  }

  const handleTierChange = (tier) => {
    const preset = tierPresets[tier]
    setFormData({
      ...formData,
      tier,
      ...preset
    })
  }

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    const loadingToast = toast.loading('Creating customer...')
    
    try {
      const customer = await api.createCustomer({
        name: formData.name,
        contactEmail: formData.contactEmail,
        contactName: formData.contactName,
        deploymentType: formData.deploymentType,
        instanceUrl: formData.instanceUrl,
        tier: formData.tier,
        maxUsers: formData.maxUsers,
        maxWorkspaces: formData.maxWorkspaces,
        maxJobs: formData.maxJobs,
        maxCandidates: formData.maxCandidates,
        features: formData.features,
        contractMonths: formData.durationMonths
      })
      
      toast.success('Customer created successfully!', { id: loadingToast })
      navigate(`/customers/${customer.id}`)
    } catch (error) {
      console.error('Failed to create customer:', error)
      const errorMsg = error.response?.data?.error || 'Failed to create customer'
      toast.error(errorMsg, { id: loadingToast })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New License</h1>
          <p className="text-gray-600 mt-1">Set up a new customer with license</p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    currentStep >= step.number
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span className="text-xs text-gray-600 mt-2 text-center">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-1 flex-1 mx-4 ${
                  currentStep > step.number ? 'bg-primary-600' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Step Content */}
      <Card>
        {/* Step 1: Customer Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
            
            <div>
              <label className="label">Organization Name *</label>
              <input
                type="text"
                className="input"
                placeholder="Acme Corp"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Contact Name *</label>
              <input
                type="text"
                className="input"
                placeholder="John Smith"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Contact Email *</label>
              <input
                type="email"
                className="input"
                placeholder="john@acmecorp.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Step 2: Deployment */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Deployment Type</h2>
            
            <div className="space-y-3">
              {[
                {
                  value: 'cloud-shared',
                  title: 'Cloud Shared (SaaS)',
                  description: 'Multi-tenant shared infrastructure'
                },
                {
                  value: 'cloud-dedicated',
                  title: 'Cloud Dedicated',
                  description: 'Isolated instance in your cloud'
                },
                {
                  value: 'on-premise',
                  title: 'On-Premise',
                  description: 'Customer hosts on their infrastructure'
                }
              ].map((option) => (
                <div
                  key={option.value}
                  onClick={() => setFormData({ ...formData, deploymentType: option.value })}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.deploymentType === option.value
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                      formData.deploymentType === option.value
                        ? 'border-primary-600 bg-primary-600'
                        : 'border-gray-300'
                    }`}>
                      {formData.deploymentType === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{option.title}</p>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="label">Instance URL</label>
              <input
                type="url"
                className="input"
                placeholder="https://customer.recruitiq.com"
                value={formData.instanceUrl}
                onChange={(e) => setFormData({ ...formData, instanceUrl: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Step 3: License Tier */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">License Tier</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: 'starter', title: 'Starter', price: '$49/user/mo', features: ['Up to 10 users', '1 workspace', '50 jobs', '500 candidates'] },
                { value: 'professional', title: 'Professional', price: '$99/user/mo', features: ['Up to 50 users', '5 workspaces', 'Unlimited jobs', '5,000 candidates', 'Analytics', 'API access'] },
                { value: 'enterprise', title: 'Enterprise', price: 'Custom', features: ['Unlimited users', 'Unlimited workspaces', 'Unlimited everything', 'SSO/SAML', 'White-label', 'Dedicated support'] }
              ].map((tier) => (
                <div
                  key={tier.value}
                  onClick={() => handleTierChange(tier.value)}
                  className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.tier === tier.value
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="text-lg font-semibold text-gray-900">{tier.title}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{tier.price}</p>
                  <ul className="mt-4 space-y-2">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <Check className="w-4 h-4 text-success-600 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Limits */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Limits & Duration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Max Users</label>
                <input
                  type="number"
                  className="input"
                  value={formData.maxUsers || ''}
                  onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
              </div>

              <div>
                <label className="label">Max Workspaces</label>
                <input
                  type="number"
                  className="input"
                  value={formData.maxWorkspaces || ''}
                  onChange={(e) => setFormData({ ...formData, maxWorkspaces: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                />
              </div>

              <div>
                <label className="label">Max Jobs</label>
                <input
                  type="number"
                  className="input"
                  value={formData.maxJobs || ''}
                  onChange={(e) => setFormData({ ...formData, maxJobs: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                />
              </div>

              <div>
                <label className="label">Max Candidates</label>
                <input
                  type="number"
                  className="input"
                  value={formData.maxCandidates || ''}
                  onChange={(e) => setFormData({ ...formData, maxCandidates: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div>
              <label className="label">License Duration</label>
              <select
                className="input"
                value={formData.durationMonths}
                onChange={(e) => setFormData({ ...formData, durationMonths: parseInt(e.target.value) })}
              >
                <option value={1}>1 Month</option>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months (1 Year)</option>
                <option value={24}>24 Months (2 Years)</option>
                <option value={36}>36 Months (3 Years)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Review & Confirm</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Organization</p>
                  <p className="font-medium text-gray-900">{formData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contact</p>
                  <p className="font-medium text-gray-900">{formData.contactName}</p>
                  <p className="text-sm text-gray-600">{formData.contactEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Deployment</p>
                  <p className="font-medium text-gray-900">
                    {formData.deploymentType === 'cloud-shared' && 'Cloud Shared'}
                    {formData.deploymentType === 'cloud-dedicated' && 'Cloud Dedicated'}
                    {formData.deploymentType === 'on-premise' && 'On-Premise'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tier</p>
                  <p className="font-medium text-gray-900 capitalize">{formData.tier}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Limits</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-gray-600">Users: <span className="font-medium text-gray-900">{formData.maxUsers || 'Unlimited'}</span></p>
                  <p className="text-gray-600">Workspaces: <span className="font-medium text-gray-900">{formData.maxWorkspaces || 'Unlimited'}</span></p>
                  <p className="text-gray-600">Jobs: <span className="font-medium text-gray-900">{formData.maxJobs || 'Unlimited'}</span></p>
                  <p className="text-gray-600">Candidates: <span className="font-medium text-gray-900">{formData.maxCandidates || 'Unlimited'}</span></p>
                </div>
              </div>

              <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <p className="text-sm text-gray-600">License Duration</p>
                <p className="text-lg font-semibold text-gray-900">{formData.durationMonths} months</p>
                <p className="text-sm text-gray-600 mt-2">
                  Expires: {new Date(Date.now() + formData.durationMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation Buttons */}
      <Card>
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="btn btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>

          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              className="btn btn-primary flex items-center"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="btn btn-success flex items-center"
            >
              <Check className="w-4 h-4 mr-2" />
              Create License
            </button>
          )}
        </div>
      </Card>
    </div>
  )
}
