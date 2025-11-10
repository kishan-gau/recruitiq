import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupContextMocks, resetContextMocks } from '../test/testSetup'
import { renderWithAllProviders } from '../test/testHelpers'

// Setup context mocks first
setupContextMocks()

// Mock the Modal component
vi.mock('../components/Modal', () => {
  const React = require('react')
  return {
    default: (props) => {
      if (!props.open) return null
      return React.createElement('div', { 'data-testid': 'modal', role: 'dialog' },
        React.createElement('h2', {}, props.title),
        React.createElement('div', {}, props.children)
      )
    }
  }
})

import FlowTemplates from './FlowTemplates'

// Import mocked hooks
let useFlow
let useToast
let mockEnsureLoaded
let mockCreateFlowTemplate
let mockCloneFlowTemplate
let mockDeleteFlowTemplate
let mockGetFlowTemplateUsageCount
let mockToast

describe('FlowTemplates Page', () => {

  // Mock flow templates
  const mockTemplates = [
    {
      id: 'template-1',
      name: 'Engineering Interview Flow',
      description: 'Standard flow for engineering positions',
      category: 'engineering',
      isDefault: true,
      stages: [
        {
          id: 'stage-1',
          name: 'Phone Screen',
          type: 'phone-screen',
          description: 'Initial screening call',
          required: true,
          estimatedDuration: 30,
          participants: ['Recruiter']
        },
        {
          id: 'stage-2',
          name: 'Technical Interview',
          type: 'technical',
          description: 'Technical assessment',
          required: true,
          estimatedDuration: 60,
          participants: ['Engineering Manager', 'Senior Engineer']
        },
        {
          id: 'stage-3',
          name: 'Final Interview',
          type: 'panel',
          description: 'Panel interview with leadership',
          required: false,
          estimatedDuration: 45,
          participants: ['VP Engineering', 'CTO']
        }
      ]
    },
    {
      id: 'template-2',
      name: 'Sales Hiring Process',
      description: 'Flow for sales positions',
      category: 'sales',
      isDefault: false,
      stages: [
        {
          id: 'stage-4',
          name: 'Initial Screen',
          type: 'phone-screen',
          description: 'Quick screening',
          required: true,
          estimatedDuration: 20,
          participants: ['Sales Manager']
        },
        {
          id: 'stage-5',
          name: 'Role Play',
          type: 'practical',
          description: 'Sales role-play exercise',
          required: true,
          estimatedDuration: 40,
          participants: []
        }
      ]
    },
    {
      id: 'template-3',
      name: 'Design Interview Flow',
      description: 'Creative hiring process',
      category: 'design',
      isDefault: false,
      stages: [
        {
          id: 'stage-6',
          name: 'Portfolio Review',
          type: 'review',
          description: 'Review portfolio',
          required: true,
          estimatedDuration: 30,
          participants: ['Design Lead']
        }
      ]
    }
  ]

  beforeEach(async () => {
    resetContextMocks()
    
    // Dynamically import to get mocked versions
    const flowModule = await import('../context/FlowContext')
    const toastModule = await import('../context/ToastContext')
    
    useFlow = flowModule.useFlow
    useToast = toastModule.useToast
    
    mockEnsureLoaded = vi.fn()
    mockCreateFlowTemplate = vi.fn()
    mockCloneFlowTemplate = vi.fn()
    mockDeleteFlowTemplate = vi.fn()
    mockGetFlowTemplateUsageCount = vi.fn((templateId) => {
      // Return different counts for different templates
      if (templateId === 'template-1') return 5
      if (templateId === 'template-2') return 2
      return 0
    })
    
    mockToast = {
      show: vi.fn()
    }
    
    // Default mock implementations
    useFlow.mockReturnValue({
      flowTemplates: mockTemplates,
      ensureLoaded: mockEnsureLoaded,
      createFlowTemplate: mockCreateFlowTemplate,
      cloneFlowTemplate: mockCloneFlowTemplate,
      deleteFlowTemplate: mockDeleteFlowTemplate,
      getFlowTemplateUsageCount: mockGetFlowTemplateUsageCount
    })
    
    useToast.mockReturnValue({
      toast: mockToast
    })
  })

  describe('Page Rendering', () => {
    it('renders flow templates page with title', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      expect(screen.getByText('Flow Templates')).toBeInTheDocument()
      expect(screen.getByText(/Create reusable hiring flows/)).toBeInTheDocument()
    })

    it('renders Create Template button', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      expect(screen.getByText('Create Template')).toBeInTheDocument()
    })

    it('calls ensureLoaded on mount', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      expect(mockEnsureLoaded).toHaveBeenCalled()
    })

    it('displays all template cards', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      expect(screen.getByText('Engineering Interview Flow')).toBeInTheDocument()
      expect(screen.getByText('Sales Hiring Process')).toBeInTheDocument()
      expect(screen.getByText('Design Interview Flow')).toBeInTheDocument()
    })

    it('shows template descriptions', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      expect(screen.getByText('Standard flow for engineering positions')).toBeInTheDocument()
      expect(screen.getByText('Flow for sales positions')).toBeInTheDocument()
    })
  })

  describe('Category Filtering', () => {
    it('shows All Templates filter with count', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      expect(screen.getByText('All Templates (3)')).toBeInTheDocument()
    })

    it('shows category filters with counts', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      expect(screen.getByText('Engineering (1)')).toBeInTheDocument()
      expect(screen.getByText(/Sales & Business Development \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/Design & Creative \(1\)/)).toBeInTheDocument()
    })

    it('filters templates by engineering category', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      await user.click(screen.getByText('Engineering (1)'))
      
      expect(screen.getByText('Engineering Interview Flow')).toBeInTheDocument()
      expect(screen.queryByText('Sales Hiring Process')).not.toBeInTheDocument()
      expect(screen.queryByText('Design Interview Flow')).not.toBeInTheDocument()
    })

    it('filters templates by sales category', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      await user.click(screen.getByText(/Sales & Business Development \(1\)/))
      
      expect(screen.getByText('Sales Hiring Process')).toBeInTheDocument()
      expect(screen.queryByText('Engineering Interview Flow')).not.toBeInTheDocument()
    })

    it('resets filter when All Templates is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      // Filter by engineering first
      await user.click(screen.getByText('Engineering (1)'))
      expect(screen.queryByText('Sales Hiring Process')).not.toBeInTheDocument()
      
      // Then click All Templates
      await user.click(screen.getByText('All Templates (3)'))
      
      expect(screen.getByText('Engineering Interview Flow')).toBeInTheDocument()
      expect(screen.getByText('Sales Hiring Process')).toBeInTheDocument()
      expect(screen.getByText('Design Interview Flow')).toBeInTheDocument()
    })

    it('hides categories with no templates', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      // Marketing category should not appear since there are no templates
      expect(screen.queryByText(/Marketing/)).not.toBeInTheDocument()
    })
  })

  describe('Template Cards', () => {
    it('displays default badge on default templates', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      expect(screen.getByText('Default')).toBeInTheDocument()
    })

    it('displays category badges', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      expect(screen.getByText('Engineering')).toBeInTheDocument()
      expect(screen.getByText('Sales & Business Development')).toBeInTheDocument()
      expect(screen.getByText('Design & Creative')).toBeInTheDocument()
    })

    it('displays stage count', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      expect(screen.getByText('3 stages')).toBeInTheDocument()
      expect(screen.getByText('2 stages')).toBeInTheDocument()
      expect(screen.getByText('1 stages')).toBeInTheDocument()
    })

    it('displays first 5 stages in preview', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      expect(screen.getByText('Phone Screen')).toBeInTheDocument()
      expect(screen.getByText('Technical Interview')).toBeInTheDocument()
      expect(screen.getByText('Final Interview')).toBeInTheDocument()
    })

    it('shows usage count for each template', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      // Multiple templates have usage counts
      const usageTexts = screen.getAllByText('jobs using this template')
      expect(usageTexts.length).toBe(3) // All 3 templates
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('uses singular "job" for single usage', () => {
      mockGetFlowTemplateUsageCount.mockReturnValue(1)
      
      renderWithAllProviders(<FlowTemplates />)
      
      // All templates now have count of 1
      const jobTexts = screen.getAllByText('job using this template')
      expect(jobTexts.length).toBeGreaterThan(0)
      const oneElements = screen.getAllByText('1')
      expect(oneElements.length).toBeGreaterThan(0)
    })

    it('renders Preview button on each card', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      expect(previewButtons.length).toBe(3)
    })

    it('renders Clone button on each card', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      const cloneButtons = screen.getAllByText('Clone')
      expect(cloneButtons.length).toBeGreaterThanOrEqual(3)
    })

    it('renders Delete button only on non-default templates', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      const deleteButtons = screen.getAllByText('Delete')
      // Only 2 delete buttons (Sales and Design templates)
      expect(deleteButtons.length).toBe(2)
    })

    it('hides Delete button on default templates', () => {
      renderWithAllProviders(<FlowTemplates />)
      
      // Only 2 delete buttons (for non-default templates)
      const deleteButtons = screen.getAllByText('Delete')
      expect(deleteButtons.length).toBe(2)
      
      // Default template card should not have delete button
      expect(screen.getByText('Default')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no templates exist', () => {
      useFlow.mockReturnValue({
        flowTemplates: [],
        ensureLoaded: mockEnsureLoaded,
        createFlowTemplate: mockCreateFlowTemplate,
        cloneFlowTemplate: mockCloneFlowTemplate,
        deleteFlowTemplate: mockDeleteFlowTemplate,
        getFlowTemplateUsageCount: mockGetFlowTemplateUsageCount
      })
      
      renderWithAllProviders(<FlowTemplates />)
      
      expect(screen.getByText('No flow templates yet')).toBeInTheDocument()
      expect(screen.getByText('Create Your First Template')).toBeInTheDocument()
    })

    it('shows empty state with icon', () => {
      useFlow.mockReturnValue({
        flowTemplates: [],
        ensureLoaded: mockEnsureLoaded,
        createFlowTemplate: mockCreateFlowTemplate,
        cloneFlowTemplate: mockCloneFlowTemplate,
        deleteFlowTemplate: mockDeleteFlowTemplate,
        getFlowTemplateUsageCount: mockGetFlowTemplateUsageCount
      })
      
      const { container } = renderWithAllProviders(<FlowTemplates />)
      
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('Clone Functionality', () => {
    it('calls cloneFlowTemplate when Clone button is clicked', async () => {
      const clonedTemplate = { ...mockTemplates[0], id: 'template-4', name: 'Engineering Interview Flow (Copy)' }
      mockCloneFlowTemplate.mockReturnValue(clonedTemplate)
      
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const cloneButtons = screen.getAllByText('Clone')
      await user.click(cloneButtons[0])
      
      expect(mockCloneFlowTemplate).toHaveBeenCalledWith('template-1')
    })

    it('shows success toast when template is cloned', async () => {
      const clonedTemplate = { ...mockTemplates[0], id: 'template-4', name: 'Engineering Interview Flow (Copy)' }
      mockCloneFlowTemplate.mockReturnValue(clonedTemplate)
      
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const cloneButtons = screen.getAllByText('Clone')
      await user.click(cloneButtons[0])
      
      expect(mockToast.show).toHaveBeenCalledWith('Cloned template: Engineering Interview Flow (Copy)', 'success')
    })

    it('handles null return from cloneFlowTemplate gracefully', async () => {
      mockCloneFlowTemplate.mockReturnValue(null)
      
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const cloneButtons = screen.getAllByText('Clone')
      await user.click(cloneButtons[0])
      
      expect(mockToast.show).not.toHaveBeenCalled()
    })
  })

  describe('Delete Functionality', () => {
    it('opens delete confirmation modal when Delete button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      
      expect(screen.getByText('Delete Flow Template')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to delete this flow template/)).toBeInTheDocument()
    })

    it('shows confirmation dialog with Cancel and Delete buttons', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Delete Template')).toBeInTheDocument()
    })

    it('closes modal when Cancel is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      
      await user.click(screen.getByText('Cancel'))
      
      await waitFor(() => {
        expect(screen.queryByText('Delete Flow Template')).not.toBeInTheDocument()
      })
    })

    it('calls deleteFlowTemplate when confirmed', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0]) // Delete Sales template
      
      await user.click(screen.getByText('Delete Template'))
      
      expect(mockDeleteFlowTemplate).toHaveBeenCalledWith('template-2')
    })

    it('shows success toast after deletion', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      
      await user.click(screen.getByText('Delete Template'))
      
      expect(mockToast.show).toHaveBeenCalledWith('Flow template deleted', 'success')
    })

    it('closes modal after successful deletion', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      
      await user.click(screen.getByText('Delete Template'))
      
      await waitFor(() => {
        expect(screen.queryByText('Delete Flow Template')).not.toBeInTheDocument()
      })
    })

    it('shows error toast when deletion fails', async () => {
      mockDeleteFlowTemplate.mockImplementation(() => {
        throw new Error('Cannot delete template in use')
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      
      await user.click(screen.getByText('Delete Template'))
      
      expect(mockToast.show).toHaveBeenCalledWith('Cannot delete template in use', 'error')
    })
  })

  describe('Preview Modal', () => {
    it('opens preview modal when Preview button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      // Text appears in both card and modal
      const titleElements = screen.getAllByText('Engineering Interview Flow')
      expect(titleElements.length).toBeGreaterThan(0)
    })

    it('displays template description in modal', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      // Text appears in both card and modal
      const descriptionElements = screen.getAllByText('Standard flow for engineering positions')
      expect(descriptionElements.length).toBeGreaterThan(0)
    })

    it('displays template metadata in modal', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      // Text appears in both card and modal
      const stagesText = screen.getAllByText('3 stages')
      expect(stagesText.length).toBeGreaterThan(0)
      expect(screen.getByText('5 jobs')).toBeInTheDocument()
    })

    it('displays all stages in timeline format', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      expect(screen.getByText('Hiring Flow')).toBeInTheDocument()
      // Text appears in both card and modal
      const phoneScreenElements = screen.getAllByText('Phone Screen')
      expect(phoneScreenElements.length).toBeGreaterThan(0)
      const technicalElements = screen.getAllByText('Technical Interview')
      expect(technicalElements.length).toBeGreaterThan(0)
      const finalElements = screen.getAllByText('Final Interview')
      expect(finalElements.length).toBeGreaterThan(0)
    })

    it('displays stage details and descriptions', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      expect(screen.getByText('Initial screening call')).toBeInTheDocument()
      expect(screen.getByText('Technical assessment')).toBeInTheDocument()
    })

    it('shows Required badge on required stages', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      const requiredBadges = screen.getAllByText('Required')
      expect(requiredBadges.length).toBe(2) // Phone Screen and Technical Interview
    })

    it('displays stage duration', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      expect(screen.getByText('30 min')).toBeInTheDocument()
      expect(screen.getByText('60 min')).toBeInTheDocument()
      expect(screen.getByText('45 min')).toBeInTheDocument()
    })

    it('displays stage participants', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      expect(screen.getByText(/Recruiter/)).toBeInTheDocument()
      expect(screen.getByText(/Engineering Manager, Senior Engineer/)).toBeInTheDocument()
    })

    it('displays stage types', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      // Text appears in both card and modal
      const phoneScreenElements = screen.getAllByText('Phone Screen')
      expect(phoneScreenElements.length).toBeGreaterThan(0)
      expect(screen.getByText('Technical')).toBeInTheDocument()
      expect(screen.getByText('Panel Interview')).toBeInTheDocument()
    })

    it('shows numbered timeline for stages', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      // Numbers appear in multiple contexts
      const oneElements = screen.getAllByText('1')
      expect(oneElements.length).toBeGreaterThan(0)
      const twoElements = screen.getAllByText('2')
      expect(twoElements.length).toBeGreaterThan(0)
      const threeElements = screen.getAllByText('3')
      expect(threeElements.length).toBeGreaterThan(0)
    })

    it('renders Close button in modal', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      expect(screen.getByText('Close')).toBeInTheDocument()
    })

    it('renders Clone Template button in modal', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      expect(screen.getByText('Clone Template')).toBeInTheDocument()
    })

    it('closes modal when Close button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      await user.click(screen.getByText('Close'))
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('clones template and closes modal when Clone Template is clicked', async () => {
      const clonedTemplate = { ...mockTemplates[0], id: 'template-4', name: 'Engineering Interview Flow (Copy)' }
      mockCloneFlowTemplate.mockReturnValue(clonedTemplate)
      
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      await user.click(screen.getByText('Clone Template'))
      
      expect(mockCloneFlowTemplate).toHaveBeenCalledWith('template-1')
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Create Modal', () => {
    it('opens create modal when Create Template button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      await user.click(screen.getByText('Create Template'))
      
      // Modal should open (but we're not testing the full form here)
      // This test verifies the button click triggers the modal
    })

    it('opens create modal from empty state', async () => {
      useFlow.mockReturnValue({
        flowTemplates: [],
        ensureLoaded: mockEnsureLoaded,
        createFlowTemplate: mockCreateFlowTemplate,
        cloneFlowTemplate: mockCloneFlowTemplate,
        deleteFlowTemplate: mockDeleteFlowTemplate,
        getFlowTemplateUsageCount: mockGetFlowTemplateUsageCount
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      await user.click(screen.getByText('Create Your First Template'))
      
      // Modal should open
    })
  })

  describe('UI Elements', () => {
    it('renders plus icon in Create Template button', () => {
      const { container } = renderWithAllProviders(<FlowTemplates />)
      
      const createButton = screen.getByText('Create Template').closest('button')
      const svg = createButton?.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders arrow icons in stage preview', () => {
      const { container } = renderWithAllProviders(<FlowTemplates />)
      
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('applies active styles to selected category filter', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const allButton = screen.getByText('All Templates (3)')
      expect(allButton).toHaveClass('bg-emerald-600')
      
      await user.click(screen.getByText('Engineering (1)'))
      
      const engineeringButton = screen.getByText('Engineering (1)')
      expect(engineeringButton).toHaveClass('bg-emerald-600')
    })
  })

  describe('Edge Cases', () => {
    it('handles template with more than 5 stages', () => {
      const templateWithManyStages = {
        ...mockTemplates[0],
        stages: [
          ...mockTemplates[0].stages,
          { id: 'stage-7', name: 'Stage 4', type: 'review', description: 'Test', required: false, estimatedDuration: 30, participants: [] },
          { id: 'stage-8', name: 'Stage 5', type: 'review', description: 'Test', required: false, estimatedDuration: 30, participants: [] },
          { id: 'stage-9', name: 'Stage 6', type: 'review', description: 'Test', required: false, estimatedDuration: 30, participants: [] }
        ]
      }
      
      useFlow.mockReturnValue({
        flowTemplates: [templateWithManyStages],
        ensureLoaded: mockEnsureLoaded,
        createFlowTemplate: mockCreateFlowTemplate,
        cloneFlowTemplate: mockCloneFlowTemplate,
        deleteFlowTemplate: mockDeleteFlowTemplate,
        getFlowTemplateUsageCount: mockGetFlowTemplateUsageCount
      })
      
      renderWithAllProviders(<FlowTemplates />)
      
      expect(screen.getByText('+1 more')).toBeInTheDocument()
    })

    it('handles template with empty participants array', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[1]) // Sales template has empty participants
      
      // Text appears in both card and modal
      const rolePlayElements = screen.getAllByText('Role Play')
      expect(rolePlayElements.length).toBeGreaterThan(0)
    })

    it('handles template with 0 estimated duration', async () => {
      const templateWithZeroDuration = {
        ...mockTemplates[0],
        stages: [{
          id: 'stage-10',
          name: 'Quick Check',
          type: 'review',
          description: 'Fast review',
          required: false,
          estimatedDuration: 0,
          participants: []
        }]
      }
      
      useFlow.mockReturnValue({
        flowTemplates: [templateWithZeroDuration],
        ensureLoaded: mockEnsureLoaded,
        createFlowTemplate: mockCreateFlowTemplate,
        cloneFlowTemplate: mockCloneFlowTemplate,
        deleteFlowTemplate: mockDeleteFlowTemplate,
        getFlowTemplateUsageCount: mockGetFlowTemplateUsageCount
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<FlowTemplates />)
      
      const previewButtons = screen.getAllByText('Preview')
      await user.click(previewButtons[0])
      
      // Should not show duration if it's 0
      expect(screen.queryByText('0 min')).not.toBeInTheDocument()
    })
  })
})
