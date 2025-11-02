import React, { useState, useEffect } from 'react'
import { Icon } from './icons'
import Modal from './Modal'
import { useToast } from '../context/ToastContext'
import { 
  trackPortalSettingsOpened, 
  trackPortalSettingsSaved, 
  trackPortalSettingsCancelled,
  trackCustomFieldAdded,
  trackCustomFieldRemoved
} from '../utils/telemetry'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export default function PortalSettingsModal({ job, isOpen, onClose, onUpdate }) {
  const toast = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    companyName: '',
    companyLogo: '',
    salaryPublic: false,
    customFields: []
  })

  useEffect(() => {
    if (job && isOpen) {
      // Track modal opened
      trackPortalSettingsOpened(job.id)
      
      // Load existing settings or defaults
      const existingSettings = job.public_portal_settings || {}
      setSettings({
        companyName: existingSettings.companyName || job.organization_name || '',
        companyLogo: existingSettings.companyLogo || '',
        salaryPublic: existingSettings.salaryPublic || false,
        customFields: existingSettings.customFields || []
      })
    }
  }, [job, isOpen])

  const handleSave = async () => {
    try {
      setIsSaving(true)

      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE}/jobs/${job.id}/portal-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        throw new Error('Failed to update portal settings')
      }

      const data = await response.json()
      
      // Track analytics event
      trackPortalSettingsSaved(job.id, settings)
      
      toast?.showToast?.('Portal settings updated successfully!', 'success')
      
      if (onUpdate) {
        onUpdate(data)
      }
      
      onClose()
    } catch (err) {
      console.error('Error saving portal settings:', err)
      toast?.showToast?.('Failed to update portal settings', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddCustomField = () => {
    const newField = {
      id: `custom_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      options: []
    }
    
    setSettings({
      ...settings,
      customFields: [
        ...settings.customFields,
        newField
      ]
    })
    
    // Track analytics event
    trackCustomFieldAdded(job.id, newField.type)
  }

  const handleUpdateCustomField = (index, field, value) => {
    const updatedFields = [...settings.customFields]
    updatedFields[index] = { ...updatedFields[index], [field]: value }
    setSettings({ ...settings, customFields: updatedFields })
  }

  const handleRemoveCustomField = (index) => {
    const fieldToRemove = settings.customFields[index]
    const updatedFields = settings.customFields.filter((_, i) => i !== index)
    setSettings({ ...settings, customFields: updatedFields })
    
    // Track analytics event
    if (fieldToRemove) {
      trackCustomFieldRemoved(job.id, fieldToRemove.type)
    }
  }

  if (!isOpen) return null

  const handleCancel = () => {
    // Track analytics event
    trackPortalSettingsCancelled(job.id)
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleCancel}
      title="Public Portal Settings"
      size="large"
    >
      <div className="space-y-6">
        {/* Company Information */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Company Information
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder="e.g., Acme Corporation"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                This name will appear on the public job posting
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Company Logo URL (Optional)
              </label>
              <input
                type="url"
                value={settings.companyLogo}
                onChange={(e) => setSettings({ ...settings, companyLogo: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {settings.companyLogo && (
                <div className="mt-2">
                  <img 
                    src={settings.companyLogo} 
                    alt="Company logo preview" 
                    className="h-12 object-contain"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Salary Visibility */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Salary Information
          </h3>
          
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.salaryPublic}
              onChange={(e) => setSettings({ ...settings, salaryPublic: e.target.checked })}
              className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Show salary range on public posting
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {settings.salaryPublic 
                  ? `Candidates will see: ${job?.salary_min && job?.salary_max ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}` : 'the salary range'}`
                  : 'Salary information will be hidden from candidates'
                }
              </p>
            </div>
          </label>
        </div>

        {/* Custom Fields */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Custom Application Fields
            </h3>
            <button
              onClick={handleAddCustomField}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
            >
              <Icon name="plus" className="w-4 h-4" />
              Add Field
            </button>
          </div>

          {settings.customFields.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <Icon name="list" className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No custom fields added yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Add custom questions to collect additional information from candidates
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.customFields.map((field, index) => (
                <div 
                  key={field.id} 
                  className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateCustomField(index, 'label', e.target.value)}
                        placeholder="Field label (e.g., Portfolio URL)"
                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateCustomField(index, 'type', e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="number">Number</option>
                        <option value="url">URL</option>
                        <option value="select">Dropdown</option>
                      </select>
                    </div>
                    <button
                      onClick={() => handleRemoveCustomField(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove field"
                    >
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => handleUpdateCustomField(index, 'required', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300">Required field</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Icon name="info" className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-900 dark:text-blue-100 font-medium mb-1">
                These settings apply to the public application form
              </p>
              <p className="text-blue-800 dark:text-blue-200">
                Candidates will see these customizations when applying through the career portal.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Icon name="check" className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
