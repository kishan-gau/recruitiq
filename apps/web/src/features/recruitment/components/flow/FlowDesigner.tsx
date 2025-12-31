import { useState } from 'react';

import { useFlow } from '../context/FlowContext';
import { useWorkspace } from '../context/WorkspaceContext';

import Modal from './Modal';

const STAGE_TYPES = [
  { id: 'phone-screen', name: 'Phone Screen', icon: '📞' },
  { id: 'technical', name: 'Technical Interview', icon: '💻' },
  { id: 'behavioral', name: 'Behavioral Interview', icon: '💬' },
  { id: 'assessment', name: 'Assessment/Test', icon: '📝' },
  { id: 'panel', name: 'Panel Interview', icon: '👥' },
  { id: 'presentation', name: 'Presentation', icon: '📊' },
  { id: 'practical', name: 'Practical Exercise', icon: '🛠️' },
  { id: 'review', name: 'Application Review', icon: '👁️' },
  { id: 'reference-check', name: 'Reference Check', icon: '📋' },
  { id: 'client-interview', name: 'Client Interview', icon: '🤝' },
  { id: 'compliance', name: 'Compliance/Background', icon: '🔒' }
];

const CATEGORIES = [
  { id: 'engineering', name: 'Engineering' },
  { id: 'executive', name: 'Executive' },
  { id: 'sales', name: 'Sales' },
  { id: 'design', name: 'Design' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'operations', name: 'Operations' },
  { id: 'internship', name: 'Internship' },
  { id: 'other', name: 'Other' }
];

const QUESTION_TYPES = [
  { id: 'rating', name: 'Rating Scale', icon: '⭐' },
  { id: 'multiple-choice', name: 'Multiple Choice', icon: '☑️' },
  { id: 'text', name: 'Text Response', icon: '📝' },
  { id: 'yes-no', name: 'Yes/No', icon: '✓' }
];

// Helper function to get color based on stage type
const getStageColor = (type: string) => {
  const colorMap: Record<string, string> = {
    'phone-screen': '#3b82f6', // blue
    'technical': '#8b5cf6', // purple
    'behavioral': '#ec4899', // pink
    'assessment': '#f59e0b', // amber
    'panel': '#10b981', // emerald
    'presentation': '#06b6d4', // cyan
    'practical': '#6366f1', // indigo
    'review': '#64748b', // slate
    'reference-check': '#0891b2', // cyan-700
    'client-interview': '#059669', // emerald-700
    'compliance': '#dc2626' // red
  };
  return colorMap[type] || '#64748b'; // default slate
};

interface FlowStage {
  id?: string;
  name: string;
  type: string;
  description?: string;
  duration?: number;
  evaluationQuestions?: any[];
  [key: string]: any;
}

interface FlowFormData {
  name: string;
  description: string;
  category: string;
  stages: FlowStage[];
}

interface FlowDesignerProps {
  isOpen: boolean;
  onClose: () => void;
  editingTemplate?: any;
}

export default function FlowDesigner({ isOpen, onClose, editingTemplate = null }: FlowDesignerProps) {
  const { createFlowTemplate, updateFlowTemplate } = useFlow();
  const { currentWorkspaceId } = useWorkspace();
  
  const [formData, setFormData] = useState<FlowFormData>(() => {
    if (editingTemplate) {
      return {
        name: editingTemplate.name,
        description: editingTemplate.description,
        category: editingTemplate.category,
        stages: editingTemplate.stages.map((s: FlowStage) => ({...s})) // deep clone
      };
    }
    return {
      name: '',
      description: '',
      category: 'other',
      stages: []
    };
  });

  const [editingStage, setEditingStage] = useState(null);
  const [showStageForm, setShowStageForm] = useState(false);
  const [stageFormData, setStageFormData] = useState({
    name: '',
    type: 'technical',
    description: '',
    estimatedDuration: 60,
    participants: '',
    required: true,
    requirements: {
      questions: [],
      documents: [],
      scoring: {
        enabled: false,
        passingScore: 70,
        autoAdvance: false
      }
    }
  });
  const [stageErrors, setStageErrors] = useState<Record<string, string>>({});
  const [templateErrors, setTemplateErrors] = useState<Record<string, string>>({});
  
  // Question/Document management state
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [questionFormData, setQuestionFormData] = useState({
    text: '',
    type: 'rating',
    required: true,
    weight: 10,
    options: []
  });
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [documentFormData, setDocumentFormData] = useState({
    name: '',
    description: '',
    required: true,
    fileTypes: ''
  });

  const handleSaveTemplate = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Template name is required';
    }
    if (formData.stages.length === 0) {
      errors.stages = 'Please add at least one stage';
    }

    if (Object.keys(errors).length > 0) {
      console.log('[FlowDesigner] Validation errors:', errors);
      setTemplateErrors(errors);
      return;
    }

    console.log('[FlowDesigner] Saving template:', formData);

    const templateData = {
      workspaceId: currentWorkspaceId,
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category,
      stages: formData.stages.map((stage, idx) => ({
        id: stage.id,
        name: stage.name,
        description: stage.description || '',
        order: idx + 1,
        color: stage.color || getStageColor(stage.type),
        isInitial: idx === 0,
        isFinal: idx === formData.stages.length - 1
      }))
    };

    if (editingTemplate) {
      console.log('[FlowDesigner] Updating template:', editingTemplate.id);
      updateFlowTemplate(editingTemplate.id, templateData)
        .then(() => {
          console.log('[FlowDesigner] Template updated successfully');
          onClose();
        })
        .catch(err => {
          console.error('[FlowDesigner] Failed to update template:', err);
          setTemplateErrors({ submit: err.message || 'Failed to update template' });
        });
    } else {
      console.log('[FlowDesigner] Creating new template');
      createFlowTemplate(templateData)
        .then(() => {
          console.log('[FlowDesigner] Template created successfully');
          onClose();
        })
        .catch(err => {
          console.error('[FlowDesigner] Failed to create template:', err);
          setTemplateErrors({ submit: err.message || 'Failed to create template' });
        });
    }
  };

  const handleAddStage = () => {
    setEditingStage(null);
    setStageErrors({});
    setStageFormData({
      name: '',
      type: 'technical',
      description: '',
      estimatedDuration: 60,
      participants: '',
      required: true,
      requirements: {
        questions: [],
        documents: [],
        scoring: {
          enabled: false,
          passingScore: 70,
          autoAdvance: false
        }
      }
    });
    setShowStageForm(true);
  };

  const handleEditStage = (index) => {
    const stage = formData.stages[index];
    setEditingStage(index);
    setStageErrors({});
    setStageFormData({
      name: stage.name,
      type: stage.type,
      description: stage.description || '',
      estimatedDuration: stage.estimatedDuration || 60,
      participants: stage.participants || '',
      required: stage.required,
      requirements: stage.requirements || {
        questions: [],
        documents: [],
        scoring: {
          enabled: false,
          passingScore: 70,
          autoAdvance: false
        }
      }
    });
    setShowStageForm(true);
  };

  const handleSaveStage = () => {
    const errors = {};
    
    if (!stageFormData.name.trim()) {
      errors.name = 'Stage name is required';
    }

    if (Object.keys(errors).length > 0) {
      setStageErrors(errors);
      return;
    }

    const newStage = {
      id: editingStage !== null ? formData.stages[editingStage].id : `stage_${Date.now()}`,
      name: stageFormData.name.trim(),
      type: stageFormData.type,
      description: stageFormData.description.trim(),
      estimatedDuration: parseInt(stageFormData.estimatedDuration) || 60,
      participants: stageFormData.participants.trim(),
      required: stageFormData.required,
      requirements: stageFormData.requirements,
      order: editingStage !== null ? formData.stages[editingStage].order : formData.stages.length + 1
    };

    if (editingStage !== null) {
      // Update existing stage
      const newStages = [...formData.stages];
      newStages[editingStage] = newStage;
      setFormData({ ...formData, stages: newStages });
    } else {
      // Add new stage
      setFormData({ ...formData, stages: [...formData.stages, newStage] });
    }

    setShowStageForm(false);
    setEditingStage(null);
    setStageErrors({});
  };

  const handleDeleteStage = (index) => {
    if (window.confirm('Delete this stage?')) {
      const newStages = formData.stages.filter((_, i) => i !== index);
      setFormData({ ...formData, stages: newStages });
    }
  };

  const handleMoveStage = (index, direction) => {
    const newStages = [...formData.stages];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newStages.length) return;
    
    [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];
    setFormData({ ...formData, stages: newStages });
  };

  // Question handlers
  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionFormData({
      text: '',
      type: 'rating',
      required: true,
      weight: 10,
      options: []
    });
    setShowQuestionForm(true);
  };

  const handleEditQuestion = (index) => {
    const question = stageFormData.requirements.questions[index];
    setEditingQuestion(index);
    setQuestionFormData({...question});
    setShowQuestionForm(true);
  };

  const handleSaveQuestion = () => {
    if (!questionFormData.text.trim()) return;

    const newQuestion = {
      id: editingQuestion !== null 
        ? stageFormData.requirements.questions[editingQuestion].id 
        : `q_${Date.now()}`,
      ...questionFormData,
      text: questionFormData.text.trim()
    };

    const newQuestions = editingQuestion !== null
      ? stageFormData.requirements.questions.map((q, i) => i === editingQuestion ? newQuestion : q)
      : [...stageFormData.requirements.questions, newQuestion];

    setStageFormData({
      ...stageFormData,
      requirements: {
        ...stageFormData.requirements,
        questions: newQuestions
      }
    });
    setShowQuestionForm(false);
  };

  const handleDeleteQuestion = (index) => {
    const newQuestions = stageFormData.requirements.questions.filter((_, i) => i !== index);
    setStageFormData({
      ...stageFormData,
      requirements: {
        ...stageFormData.requirements,
        questions: newQuestions
      }
    });
  };

  // Document handlers
  const handleAddDocument = () => {
    setEditingDocument(null);
    setDocumentFormData({
      name: '',
      description: '',
      required: true,
      fileTypes: ''
    });
    setShowDocumentForm(true);
  };

  const handleEditDocument = (index) => {
    const doc = stageFormData.requirements.documents[index];
    setEditingDocument(index);
    setDocumentFormData({...doc});
    setShowDocumentForm(true);
  };

  const handleSaveDocument = () => {
    if (!documentFormData.name.trim()) return;

    const newDocument = {
      id: editingDocument !== null 
        ? stageFormData.requirements.documents[editingDocument].id 
        : `d_${Date.now()}`,
      ...documentFormData,
      name: documentFormData.name.trim(),
      description: documentFormData.description.trim()
    };

    const newDocuments = editingDocument !== null
      ? stageFormData.requirements.documents.map((d, i) => i === editingDocument ? newDocument : d)
      : [...stageFormData.requirements.documents, newDocument];

    setStageFormData({
      ...stageFormData,
      requirements: {
        ...stageFormData.requirements,
        documents: newDocuments
      }
    });
    setShowDocumentForm(false);
  };

  const handleDeleteDocument = (index) => {
    const newDocuments = stageFormData.requirements.documents.filter((_, i) => i !== index);
    setStageFormData({
      ...stageFormData,
      requirements: {
        ...stageFormData.requirements,
        documents: newDocuments
      }
    });
  };

  const getStageTypeIcon = (typeId) => {
    const type = STAGE_TYPES.find(t => t.id === typeId);
    return type ? type.icon : '📋';
  };

  const getStageTypeName = (typeId) => {
    const type = STAGE_TYPES.find(t => t.id === typeId);
    return type ? type.name : typeId;
  };

  return (
    <Modal 
      open={isOpen} 
      onClose={onClose} 
      title={editingTemplate ? 'Edit Flow Template' : 'Create Flow Template'}
      size="xl"
      zIndex="z-[70]"
    >
      <div className="space-y-6">
        {/* Template Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (templateErrors.name) {
                  setTemplateErrors({ ...templateErrors, name: undefined });
                }
              }}
              placeholder="e.g., Senior Developer Flow, Sales Manager Flow"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                templateErrors.name 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-slate-300 dark:border-slate-600 focus:border-emerald-500'
              }`}
            />
            {templateErrors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{templateErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe when to use this flow template"
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stages Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Interview Stages {formData.stages.length > 0 && `(${formData.stages.length})`}
            </h4>
            <button
              onClick={() => {
                handleAddStage();
                if (templateErrors.stages) {
                  setTemplateErrors({ ...templateErrors, stages: undefined });
                }
              }}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Stage
            </button>
          </div>

          {templateErrors.stages && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{templateErrors.stages}</p>
            </div>
          )}

          {formData.stages.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-400 mb-2">No stages yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Add stages to define your hiring flow
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {formData.stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveStage(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveStage(index, 'down')}
                      disabled={index === formData.stages.length - 1}
                      className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStageTypeIcon(stage.type)}</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {stage.name}
                      </span>
                      {stage.required && (
                        <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                      {getStageTypeName(stage.type)}
                      {stage.estimatedDuration > 0 && ` • ${stage.estimatedDuration} min`}
                      {stage.participants && ` • ${stage.participants}`}
                    </div>
                    {stage.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {stage.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditStage(index)}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Edit stage"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteStage(index)}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded transition-colors"
                      title="Delete stage"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* General Error Display */}
        {templateErrors.submit && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{templateErrors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveTemplate}
            className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
          >
            {editingTemplate ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>

      {/* Stage Form Modal */}
      {showStageForm && (
        <Modal
          open={true}
          onClose={() => {
            setShowStageForm(false);
            setStageErrors({});
          }}
          title={editingStage !== null ? 'Edit Stage' : 'Add Stage'}
          size="lg"
          zIndex="z-[80]"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Stage Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={stageFormData.name}
                onChange={(e) => {
                  setStageFormData({ ...stageFormData, name: e.target.value });
                  if (stageErrors.name) {
                    setStageErrors({ ...stageErrors, name: undefined });
                  }
                }}
                placeholder="e.g., Technical Interview, Phone Screen"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  stageErrors.name 
                    ? 'border-red-500 dark:border-red-500' 
                    : 'border-slate-300 dark:border-slate-600 focus:border-emerald-500'
                }`}
                autoFocus
              />
              {stageErrors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{stageErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Stage Type
              </label>
              <select
                value={stageFormData.type}
                onChange={(e) => setStageFormData({ ...stageFormData, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {STAGE_TYPES.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={stageFormData.description}
                onChange={(e) => setStageFormData({ ...stageFormData, description: e.target.value })}
                placeholder="What happens in this stage?"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  value={stageFormData.estimatedDuration}
                  onChange={(e) => setStageFormData({ ...stageFormData, estimatedDuration: e.target.value })}
                  min="0"
                  step="15"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Participants
                </label>
                <input
                  type="text"
                  value={stageFormData.participants}
                  onChange={(e) => setStageFormData({ ...stageFormData, participants: e.target.value })}
                  placeholder="e.g., Hiring Manager, Team Lead"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="stage-required"
                checked={stageFormData.required}
                onChange={(e) => setStageFormData({ ...stageFormData, required: e.target.checked })}
                className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="stage-required" className="text-sm text-slate-700 dark:text-slate-300">
                This stage is required (cannot be skipped)
              </label>
            </div>

            {/* Evaluation Questions Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Evaluation Questions {stageFormData.requirements.questions.length > 0 && `(${stageFormData.requirements.questions.length})`}
                </h5>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-2 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                >
                  + Add Question
                </button>
              </div>
              
              {stageFormData.requirements.questions.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">No questions defined yet</p>
              ) : (
                <div className="space-y-2">
                  {stageFormData.requirements.questions.map((question, idx) => (
                    <div key={question.id} className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded border border-slate-200 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{QUESTION_TYPES.find(t => t.id === question.type)?.icon}</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {question.text}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-500">
                            {QUESTION_TYPES.find(t => t.id === question.type)?.name}
                            {question.weight > 0 && ` • Weight: ${question.weight}%`}
                            {question.required && ' • Required'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditQuestion(idx)}
                            className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                            title="Edit question"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(idx)}
                            className="p-1 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded"
                            title="Delete question"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Required Documents Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Required Documents {stageFormData.requirements.documents.length > 0 && `(${stageFormData.requirements.documents.length})`}
                </h5>
                <button
                  type="button"
                  onClick={handleAddDocument}
                  className="px-2 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                >
                  + Add Document
                </button>
              </div>
              
              {stageFormData.requirements.documents.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">No documents required yet</p>
              ) : (
                <div className="space-y-2">
                  {stageFormData.requirements.documents.map((doc, idx) => (
                    <div key={doc.id} className="p-2 bg-slate-50 dark:bg-slate-900/30 rounded border border-slate-200 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">📎</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {doc.name}
                            </span>
                            {doc.required && (
                              <span className="text-xs px-1 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                                Required
                              </span>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{doc.description}</p>
                          )}
                          {doc.fileTypes && (
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Types: {doc.fileTypes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditDocument(idx)}
                            className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                            title="Edit document"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(idx)}
                            className="p-1 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded"
                            title="Delete document"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scoring Settings */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h5 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Scoring Settings</h5>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="scoring-enabled"
                    checked={stageFormData.requirements.scoring.enabled}
                    onChange={(e) => setStageFormData({
                      ...stageFormData,
                      requirements: {
                        ...stageFormData.requirements,
                        scoring: {
                          ...stageFormData.requirements.scoring,
                          enabled: e.target.checked
                        }
                      }
                    })}
                    className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="scoring-enabled" className="text-sm text-slate-700 dark:text-slate-300">
                    Enable automatic scoring
                  </label>
                </div>

                {stageFormData.requirements.scoring.enabled && (
                  <>
                    <div>
                      <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">
                        Passing Score (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={stageFormData.requirements.scoring.passingScore}
                        onChange={(e) => setStageFormData({
                          ...stageFormData,
                          requirements: {
                            ...stageFormData.requirements,
                            scoring: {
                              ...stageFormData.requirements.scoring,
                              passingScore: parseInt(e.target.value) || 0
                            }
                          }
                        })}
                        className="w-32 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="auto-advance"
                        checked={stageFormData.requirements.scoring.autoAdvance}
                        onChange={(e) => setStageFormData({
                          ...stageFormData,
                          requirements: {
                            ...stageFormData.requirements,
                            scoring: {
                              ...stageFormData.requirements.scoring,
                              autoAdvance: e.target.checked
                            }
                          }
                        })}
                        className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500"
                      />
                      <label htmlFor="auto-advance" className="text-sm text-slate-700 dark:text-slate-300">
                        Auto-advance to next stage if passing score is met
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowStageForm(false);
                  setStageErrors({});
                }}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStage}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
              >
                {editingStage !== null ? 'Update Stage' : 'Add Stage'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Question Form Modal */}
      {showQuestionForm && (
        <Modal
          open={true}
          onClose={() => setShowQuestionForm(false)}
          title={editingQuestion !== null ? 'Edit Question' : 'Add Question'}
          size="md"
          zIndex="z-[90]"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                value={questionFormData.text}
                onChange={(e) => setQuestionFormData({ ...questionFormData, text: e.target.value })}
                placeholder="e.g., Rate the candidate's problem-solving ability"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Question Type
              </label>
              <select
                value={questionFormData.type}
                onChange={(e) => setQuestionFormData({ ...questionFormData, type: e.target.value, options: [] })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {QUESTION_TYPES.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
            </div>

            {questionFormData.type === 'multiple-choice' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Answer Options
                </label>
                <div className="space-y-2 mb-2">
                  {(questionFormData.options || []).map((option, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...questionFormData.options];
                          newOptions[idx] = e.target.value;
                          setQuestionFormData({ ...questionFormData, options: newOptions });
                        }}
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder={`Option ${idx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newOptions = questionFormData.options.filter((_, i) => i !== idx);
                          setQuestionFormData({ ...questionFormData, options: newOptions });
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setQuestionFormData({ 
                    ...questionFormData, 
                    options: [...(questionFormData.options || []), ''] 
                  })}
                  className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  + Add Option
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Weight (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={questionFormData.weight}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, weight: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">For scoring calculation</p>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questionFormData.required}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, required: e.target.checked })}
                    className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Required</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowQuestionForm(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuestion}
                disabled={!questionFormData.text.trim()}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingQuestion !== null ? 'Update Question' : 'Add Question'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Document Form Modal */}
      {showDocumentForm && (
        <Modal
          open={true}
          onClose={() => setShowDocumentForm(false)}
          title={editingDocument !== null ? 'Edit Document' : 'Add Document'}
          size="md"
          zIndex="z-[90]"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Document Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={documentFormData.name}
                onChange={(e) => setDocumentFormData({ ...documentFormData, name: e.target.value })}
                placeholder="e.g., Code Sample, Portfolio"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={documentFormData.description}
                onChange={(e) => setDocumentFormData({ ...documentFormData, description: e.target.value })}
                placeholder="Brief description of what's needed"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Accepted File Types
              </label>
              <input
                type="text"
                value={documentFormData.fileTypes}
                onChange={(e) => setDocumentFormData({ ...documentFormData, fileTypes: e.target.value })}
                placeholder="e.g., .pdf, .zip, .github.com"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Comma-separated (optional)</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="doc-required"
                checked={documentFormData.required}
                onChange={(e) => setDocumentFormData({ ...documentFormData, required: e.target.checked })}
                className="w-4 h-4 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="doc-required" className="text-sm text-slate-700 dark:text-slate-300">
                Required
              </label>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowDocumentForm(false)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDocument}
                disabled={!documentFormData.name.trim()}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingDocument !== null ? 'Update Document' : 'Add Document'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
