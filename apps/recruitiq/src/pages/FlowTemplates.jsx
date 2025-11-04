import React, { useState, useEffect } from 'react'
import { useFlow } from '../context/FlowContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const STAGE_TYPE_LABELS = {
  'phone-screen': 'Phone Screen',
  'technical': 'Technical',
  'behavioral': 'Behavioral',
  'assessment': 'Assessment',
  'panel': 'Panel Interview',
  'presentation': 'Presentation',
  'practical': 'Practical Exercise',
  'review': 'Review',
  'reference-check': 'Reference Check',
  'client-interview': 'Client Meeting',
  'compliance': 'Compliance Check'
}

const CATEGORY_LABELS = {
  'engineering': 'Engineering',
  'executive': 'Executive',
  'sales': 'Sales & Business Development',
  'design': 'Design & Creative',
  'marketing': 'Marketing',
  'operations': 'Operations',
  'internship': 'Internship',
  'other': 'Other'
}

export default function FlowTemplates() {
  const { flowTemplates, ensureLoaded, createFlowTemplate, cloneFlowTemplate, deleteFlowTemplate, getFlowTemplateUsageCount } = useFlow()
  const { toast } = useToast()
  
  // Ensure flow templates are loaded when component mounts
  useEffect(() => {
    ensureLoaded()
  }, [ensureLoaded])
  
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showPreview, setShowPreview] = useState(null)

  const filteredTemplates = selectedCategory === 'all'
    ? flowTemplates
    : flowTemplates.filter(t => t.category === selectedCategory)

  const handleClone = (template) => {
    const cloned = cloneFlowTemplate(template.id)
    if (cloned) {
      toast.show(`Cloned template: ${cloned.name}`, 'success')
    }
  }

  const handleDelete = (templateId) => {
    try {
      deleteFlowTemplate(templateId)
      toast.show('Flow template deleted', 'success')
      setShowDeleteConfirm(null)
    } catch (error) {
      toast.show(error.message, 'error')
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Flow Templates
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Template
          </button>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Create reusable hiring flows that can be assigned to jobs and customized as needed
        </p>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Templates ({flowTemplates.length})
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
            const count = flowTemplates.filter(t => t.category === key).length
            if (count === 0) return null
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-400 dark:text-slate-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-4">No flow templates yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => {
            const usageCount = getFlowTemplateUsageCount(template.id)
            return (
              <div
                key={template.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {template.name}
                        </h3>
                        {template.isDefault && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {template.description}
                      </p>
                    </div>
                  </div>

                  {/* Category Badge */}
                  <div className="mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {CATEGORY_LABELS[template.category] || template.category}
                    </span>
                  </div>

                  {/* Stages Summary */}
                  <div className="mb-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {template.stages.length} stages
                    </div>
                    <div className="flex items-center gap-1 overflow-x-auto pb-2">
                      {template.stages.slice(0, 5).map((stage, idx) => (
                        <React.Fragment key={stage.id}>
                          <div className="flex-shrink-0 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-700 dark:text-slate-300">
                            {stage.name}
                          </div>
                          {idx < Math.min(template.stages.length - 1, 4) && (
                            <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </React.Fragment>
                      ))}
                      {template.stages.length > 5 && (
                        <div className="flex-shrink-0 text-xs text-slate-500">
                          +{template.stages.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium">{usageCount}</span> {usageCount === 1 ? 'job' : 'jobs'} using this template
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPreview(template)}
                      className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleClone(template)}
                      className="flex-1 px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium transition-colors"
                    >
                      Clone
                    </button>
                    {!template.isDefault && (
                      <button
                        onClick={() => setShowDeleteConfirm(template.id)}
                        className="px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <Modal open={true} onClose={() => setShowPreview(null)} title={showPreview.name} size="lg">
          <div className="space-y-6">
            <div>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {showPreview.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {CATEGORY_LABELS[showPreview.category]}
                </span>
                <span>{showPreview.stages.length} stages</span>
                <span>{getFlowTemplateUsageCount(showPreview.id)} jobs</span>
              </div>
            </div>

            {/* Stages Timeline */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Hiring Flow</h4>
              <div className="space-y-4">
                {showPreview.stages.map((stage, idx) => (
                  <div key={stage.id} className="flex gap-4">
                    {/* Timeline */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        idx === 0
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {idx + 1}
                      </div>
                      {idx < showPreview.stages.length - 1 && (
                        <div className="w-0.5 h-16 bg-slate-200 dark:bg-slate-700 my-1"></div>
                      )}
                    </div>

                    {/* Stage Details */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-slate-900 dark:text-slate-100">
                              {stage.name}
                            </h5>
                            {stage.required && (
                              <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {stage.description}
                          </p>
                        </div>
                        {stage.estimatedDuration > 0 && (
                          <span className="text-sm text-slate-500 dark:text-slate-500 ml-4 flex-shrink-0">
                            {stage.estimatedDuration} min
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                          {STAGE_TYPE_LABELS[stage.type] || stage.type}
                        </span>
                        {stage.participants && stage.participants.length > 0 && (
                          <span className="text-xs text-slate-500 dark:text-slate-500">
                            • {stage.participants.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowPreview(null)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleClone(showPreview)
                  setShowPreview(null)
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
              >
                Clone Template
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal open={true} onClose={() => setShowDeleteConfirm(null)} title="Delete Flow Template">
          <div className="space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              Are you sure you want to delete this flow template? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
              >
                Delete Template
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
