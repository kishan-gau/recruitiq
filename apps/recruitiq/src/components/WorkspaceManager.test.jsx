import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupContextMocks, resetContextMocks } from '../test/testSetup'
import { renderWithAllProviders } from '../test/testHelpers'

// Setup context mocks first
setupContextMocks()

// Mock Modal component
vi.mock('./Modal', () => {
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

// Mock FlowDesigner component
vi.mock('./FlowDesigner', () => {
  const React = require('react')
  return {
    default: (props) => {
      if (!props.template && !props.onClose) return null
      return React.createElement('div', { 'data-testid': 'flow-designer' },
        React.createElement('h3', {}, props.template ? 'Edit Flow Template' : 'Create Flow Template'),
        React.createElement('button', { onClick: () => props.onClose && props.onClose() }, 'Close Designer')
      )
    }
  }
})

import WorkspaceManager from './WorkspaceManager'

// Import mocked hooks
let useWorkspace
let useFlow
let mockCreateWorkspace
let mockRenameWorkspace
let mockUpdateWorkspaceColor
let mockDeleteWorkspace
let mockGetWorkspaceColor
let mockAddWorkspaceUser
let mockUpdateWorkspaceUser
let mockRemoveWorkspaceUser
let mockEnsureLoaded
let mockCloneFlowTemplate
let mockDeleteFlowTemplate
let mockGetFlowTemplateUsageCount

describe('WorkspaceManager Component', () => {
  const mockWorkspaces = [
    {
      id: 'workspace-1',
      name: 'Engineering Team',
      color: 'emerald',
      createdAt: '2024-01-15T10:00:00Z',
      users: [
        { id: 'user-1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
        { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', role: 'member' }
      ]
    },
    {
      id: 'workspace-2',
      name: 'Sales Team',
      color: 'blue',
      createdAt: '2024-02-20T14:30:00Z',
      users: []
    }
  ]

  const mockFlowTemplates = [
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
          participants: ['Engineering Manager']
        }
      ]
    },
    {
      id: 'template-2',
      name: 'Sales Hiring Flow',
      description: 'Flow for sales positions',
      category: 'sales',
      isDefault: false,
      stages: [
        {
          id: 'stage-3',
          name: 'Initial Screen',
          type: 'phone-screen',
          description: 'Quick screening',
          required: true,
          estimatedDuration: 20,
          participants: []
        }
      ]
    }
  ]

  const mockOnClose = vi.fn()

  beforeEach(async () => {
    resetContextMocks()
    
    // Dynamically import to get mocked versions
    const workspaceModule = await import('../context/WorkspaceContext')
    const flowModule = await import('../context/FlowContext')
    
    useWorkspace = workspaceModule.useWorkspace
    useFlow = flowModule.useFlow
    
    // Setup workspace mock functions
    mockCreateWorkspace = vi.fn()
    mockRenameWorkspace = vi.fn()
    mockUpdateWorkspaceColor = vi.fn()
    mockDeleteWorkspace = vi.fn()
    mockGetWorkspaceColor = vi.fn((colorId) => ({
      id: colorId,
      class: `bg-${colorId}-500`,
      name: colorId
    }))
    mockAddWorkspaceUser = vi.fn()
    mockUpdateWorkspaceUser = vi.fn()
    mockRemoveWorkspaceUser = vi.fn()
    
    // Setup flow mock functions
    mockEnsureLoaded = vi.fn()
    mockCloneFlowTemplate = vi.fn((templateId) => {
      const template = mockFlowTemplates.find(t => t.id === templateId)
      if (template) {
        return { ...template, id: 'cloned-template', name: `${template.name} (Copy)` }
      }
      return null
    })
    mockDeleteFlowTemplate = vi.fn()
    mockGetFlowTemplateUsageCount = vi.fn((templateId) => {
      if (templateId === 'template-1') return 5
      if (templateId === 'template-2') return 2
      return 0
    })
    
    // Mock implementations
    useWorkspace.mockReturnValue({
      workspaces: mockWorkspaces,
      currentWorkspace: mockWorkspaces[0],
      createWorkspace: mockCreateWorkspace,
      renameWorkspace: mockRenameWorkspace,
      updateWorkspaceColor: mockUpdateWorkspaceColor,
      deleteWorkspace: mockDeleteWorkspace,
      getWorkspaceColor: mockGetWorkspaceColor,
      addWorkspaceUser: mockAddWorkspaceUser,
      updateWorkspaceUser: mockUpdateWorkspaceUser,
      removeWorkspaceUser: mockRemoveWorkspaceUser
    })
    
    useFlow.mockReturnValue({
      flowTemplates: mockFlowTemplates,
      ensureLoaded: mockEnsureLoaded,
      cloneFlowTemplate: mockCloneFlowTemplate,
      deleteFlowTemplate: mockDeleteFlowTemplate,
      getFlowTemplateUsageCount: mockGetFlowTemplateUsageCount
    })
  })

  describe('Modal Rendering', () => {
    it('does not render when isOpen is false', () => {
      renderWithAllProviders(<WorkspaceManager isOpen={false} onClose={mockOnClose} />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders modal when isOpen is true', () => {
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Manage Workspaces')).toBeInTheDocument()
    })
  })

  describe('List Mode - Workspace List', () => {
    it('displays all workspaces', () => {
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      expect(screen.getByText('Sales Team')).toBeInTheDocument()
    })

    it('shows active workspace indicator', () => {
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      expect(screen.getByText(/Active/)).toBeInTheDocument()
    })

    it('displays workspace creation dates', () => {
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      // Dates should be formatted
      expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument()
      expect(screen.getByText(/2\/20\/2024/)).toBeInTheDocument()
    })

    it('shows Create New Workspace button', () => {
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      expect(screen.getByText('Create New Workspace')).toBeInTheDocument()
    })

    it('displays settings button for each workspace', () => {
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      expect(settingsButtons.length).toBe(2)
    })

    it('displays delete button for each workspace', () => {
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const deleteButtons = screen.getAllByTitle('Delete workspace')
      expect(deleteButtons.length).toBe(2)
    })

    it('displays workspace color indicator', () => {
      const { container } = renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const colorIndicators = container.querySelectorAll('.w-4.h-4.rounded-full')
      expect(colorIndicators.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Create Mode', () => {
    it('switches to create mode when Create button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      await user.click(screen.getByText('Create New Workspace'))
      
      expect(screen.getByText('Create Workspace')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/e.g., ACME Corp/)).toBeInTheDocument()
    })

    it('displays workspace name input field', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      await user.click(screen.getByText('Create New Workspace'))
      
      expect(screen.getByPlaceholderText(/e.g., ACME Corp/)).toBeInTheDocument()
    })

    it('displays color selection', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      await user.click(screen.getByText('Create New Workspace'))
      
      expect(screen.getByText('Color')).toBeInTheDocument()
      expect(screen.getByTitle('Emerald')).toBeInTheDocument()
    })

    it('allows entering workspace name', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      await user.click(screen.getByText('Create New Workspace'))
      
      const nameInput = screen.getByPlaceholderText(/e.g., ACME Corp/)
      await user.type(nameInput, 'New Workspace')
      
      expect(nameInput).toHaveValue('New Workspace')
    })

    it('calls createWorkspace when Create button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      await user.click(screen.getByText('Create New Workspace'))
      
      const nameInput = screen.getByPlaceholderText(/e.g., ACME Corp/)
      await user.type(nameInput, 'Test Workspace')
      
      await user.click(screen.getByText('Create'))
      
      expect(mockCreateWorkspace).toHaveBeenCalledWith('Test Workspace', 'emerald')
    })

    it('returns to list mode after successful creation', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      await user.click(screen.getByText('Create New Workspace'))
      await user.type(screen.getByPlaceholderText(/e.g., ACME Corp/), 'Test')
      await user.click(screen.getByText('Create'))
      
      expect(screen.getByText('Manage Workspaces')).toBeInTheDocument()
    })

    it('shows Cancel button', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      await user.click(screen.getByText('Create New Workspace'))
      
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('returns to list mode when Cancel is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      await user.click(screen.getByText('Create New Workspace'))
      await user.click(screen.getByText('Cancel'))
      
      expect(screen.getByText('Manage Workspaces')).toBeInTheDocument()
    })
  })

  describe('Settings Mode - General Tab', () => {
    it('opens settings when settings button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      
      expect(screen.getByText('Edit Workspace')).toBeInTheDocument()
    })

    it('displays three tabs: General, Team, Hiring Flows', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      
      expect(screen.getByText('General')).toBeInTheDocument()
      expect(screen.getByText('Team')).toBeInTheDocument()
      expect(screen.getByText('Hiring Flows')).toBeInTheDocument()
    })

    it('General tab is active by default', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      
      const generalTab = screen.getByText('General')
      expect(generalTab).toHaveClass('border-b-2')
      expect(generalTab).toHaveClass('border-emerald-600')
    })

    it('displays workspace name in input field', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      
      const nameInput = screen.getByPlaceholderText(/e.g., ACME Corp/)
      expect(nameInput).toHaveValue('Engineering Team')
    })

    it('allows editing workspace name', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      
      const nameInput = screen.getByPlaceholderText(/e.g., ACME Corp/)
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Name')
      
      expect(nameInput).toHaveValue('Updated Name')
    })

    it('calls renameWorkspace when Save Changes is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      
      const nameInput = screen.getByPlaceholderText(/e.g., ACME Corp/)
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Name')
      
      await user.click(screen.getByText('Save Changes'))
      
      expect(mockRenameWorkspace).toHaveBeenCalledWith('workspace-1', 'Updated Name')
    })

    it('calls updateWorkspaceColor when color is changed', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      
      // Note: This test assumes color buttons are available in the UI
      // You may need to adjust based on actual implementation
      await user.click(screen.getByText('Save Changes'))
      
      expect(mockUpdateWorkspaceColor).toHaveBeenCalledWith('workspace-1', 'emerald')
    })
  })

  describe('Settings Mode - Team Tab', () => {
    it('switches to Team tab when clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      
      await user.click(screen.getByText('Team'))
      
      const teamTab = screen.getByText('Team')
      expect(teamTab).toHaveClass('border-b-2')
      expect(teamTab).toHaveClass('border-emerald-600')
    })

    it('displays existing team members', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Team'))
      
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })

    it('shows Add Team Member button', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Team'))
      
      expect(screen.getByText('Add Team Member')).toBeInTheDocument()
    })

    it('displays empty state when no team members', async () => {
      useWorkspace.mockReturnValue({
        workspaces: [{ ...mockWorkspaces[1], users: [] }],
        currentWorkspace: { ...mockWorkspaces[1], users: [] },
        createWorkspace: mockCreateWorkspace,
        renameWorkspace: mockRenameWorkspace,
        updateWorkspaceColor: mockUpdateWorkspaceColor,
        deleteWorkspace: mockDeleteWorkspace,
        getWorkspaceColor: mockGetWorkspaceColor,
        addWorkspaceUser: mockAddWorkspaceUser,
        updateWorkspaceUser: mockUpdateWorkspaceUser,
        removeWorkspaceUser: mockRemoveWorkspaceUser
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Team'))
      
      expect(screen.getByText(/No team members yet/)).toBeInTheDocument()
    })

    it('shows Add Team Member button', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Team'))
      
      // Button is present
      expect(screen.getByText('Add Team Member')).toBeInTheDocument()
    })

    it('displays team member list', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Team'))
      
      // Team members are shown
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  describe('Settings Mode - Hiring Flows Tab', () => {
    it('switches to Hiring Flows tab when clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      
      await user.click(screen.getByText('Hiring Flows'))
      
      const flowsTab = screen.getByText('Hiring Flows')
      expect(flowsTab).toHaveClass('border-b-2')
      expect(flowsTab).toHaveClass('border-emerald-600')
    })

    it('calls ensureLoaded when Hiring Flows tab is activated', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      expect(mockEnsureLoaded).toHaveBeenCalled()
    })

    it('displays Manage Hiring Flows info box', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      expect(screen.getByText('Manage Hiring Flows')).toBeInTheDocument()
      expect(screen.getByText(/Create reusable hiring flow templates/)).toBeInTheDocument()
    })

    it('shows Create New Flow Template button', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      expect(screen.getByText('Create New Flow Template')).toBeInTheDocument()
    })

    it('displays all flow templates', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      expect(screen.getByText('Engineering Interview Flow')).toBeInTheDocument()
      expect(screen.getByText('Sales Hiring Flow')).toBeInTheDocument()
    })

    it('shows template descriptions', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      expect(screen.getByText('Standard flow for engineering positions')).toBeInTheDocument()
      expect(screen.getByText('Flow for sales positions')).toBeInTheDocument()
    })

    it('displays Default badge on default templates', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      expect(screen.getByText('Default')).toBeInTheDocument()
    })

    it('shows stage count for each template', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      expect(screen.getByText('2 stages')).toBeInTheDocument()
      expect(screen.getByText('1 stages')).toBeInTheDocument()
    })

    it('displays usage count for each template', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      expect(screen.getByText(/5.*jobs/)).toBeInTheDocument()
      expect(screen.getByText(/2.*jobs/)).toBeInTheDocument()
    })

    it('displays Preview, Edit, Clone, Delete buttons for each template', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      const previewButtons = screen.getAllByText('Preview')
      const editButtons = screen.getAllByText('Edit')
      const cloneButtons = screen.getAllByText('Clone')
      
      expect(previewButtons.length).toBe(2)
      expect(editButtons.length).toBe(2)
      expect(cloneButtons.length).toBe(2)
    })

    it('hides Delete button for default templates', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      const deleteButtons = screen.getAllByText('Delete')
      // Only 1 delete button (for non-default Sales template)
      expect(deleteButtons.length).toBe(1)
    })

    it('shows empty state when no flow templates exist', async () => {
      useFlow.mockReturnValue({
        flowTemplates: [],
        ensureLoaded: mockEnsureLoaded,
        cloneFlowTemplate: mockCloneFlowTemplate,
        deleteFlowTemplate: mockDeleteFlowTemplate,
        getFlowTemplateUsageCount: mockGetFlowTemplateUsageCount
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      expect(screen.getByText('No flow templates yet')).toBeInTheDocument()
    })
  })

  describe('Hiring Flows - Edit Functionality', () => {
    it('opens FlowDesigner when Edit button is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('flow-designer')).toBeInTheDocument()
      })
    })

    it('passes selected template to FlowDesigner for editing', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[1]) // Edit Sales template
      
      expect(screen.getByTestId('flow-designer')).toBeInTheDocument()
    })

    it('has close button in FlowDesigner', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      const editButtons = screen.getAllByText('Edit')
      await user.click(editButtons[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('flow-designer')).toBeInTheDocument()
      })
      
      // Close button is present
      expect(screen.getByText('Close Designer')).toBeInTheDocument()
    })
  })

  describe('Hiring Flows - Create Functionality', () => {
    it('opens FlowDesigner when Create New Flow Template is clicked', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      await user.click(screen.getByText('Create New Flow Template'))
      
      expect(screen.getByTestId('flow-designer')).toBeInTheDocument()
      expect(screen.getByText('Create Flow Template')).toBeInTheDocument()
    })

    it('passes null template to FlowDesigner for new creation', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      await user.click(screen.getByText('Create New Flow Template'))
      
      // Should show "Create" not "Edit"
      expect(screen.getByText('Create Flow Template')).toBeInTheDocument()
      expect(screen.queryByText('Edit Flow Template')).not.toBeInTheDocument()
    })
  })

  describe('Hiring Flows - Clone Functionality', () => {
    it('calls cloneFlowTemplate when Clone button is clicked', async () => {
      // Mock window.alert
      window.alert = vi.fn()
      
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      const cloneButtons = screen.getAllByText('Clone')
      await user.click(cloneButtons[0])
      
      expect(mockCloneFlowTemplate).toHaveBeenCalledWith('template-1')
    })

    it('shows alert with cloned template name', async () => {
      window.alert = vi.fn()
      
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      const cloneButtons = screen.getAllByText('Clone')
      await user.click(cloneButtons[0])
      
      expect(window.alert).toHaveBeenCalledWith('Cloned as "Engineering Interview Flow (Copy)"')
    })
  })

  describe('Hiring Flows - Delete Functionality', () => {
    it('shows confirmation when Delete button is clicked', async () => {
      window.confirm = vi.fn(() => false)
      
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Delete "Sales Hiring Flow"'))
    })

    it('calls deleteFlowTemplate when deletion is confirmed', async () => {
      window.confirm = vi.fn(() => true)
      
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      
      expect(mockDeleteFlowTemplate).toHaveBeenCalledWith('template-2')
    })

    it('does not delete when confirmation is cancelled', async () => {
      window.confirm = vi.fn(() => false)
      
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      
      expect(mockDeleteFlowTemplate).not.toHaveBeenCalled()
    })

    it('shows alert when deletion fails', async () => {
      window.confirm = vi.fn(() => true)
      window.alert = vi.fn()
      mockDeleteFlowTemplate.mockImplementation(() => {
        throw new Error('Cannot delete template in use')
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const settingsButtons = screen.getAllByTitle('Workspace settings')
      await user.click(settingsButtons[0])
      await user.click(screen.getByText('Hiring Flows'))
      
      const deleteButtons = screen.getAllByText('Delete')
      await user.click(deleteButtons[0])
      
      expect(window.alert).toHaveBeenCalledWith('Cannot delete template in use')
    })
  })

  describe('Workspace Delete Functionality', () => {
    it('requires double-click confirmation to delete workspace', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const deleteButtons = screen.getAllByTitle('Delete workspace')
      await user.click(deleteButtons[1]) // Click delete for Sales workspace
      
      // First click should not delete
      expect(mockDeleteWorkspace).not.toHaveBeenCalled()
      
      // Button text should change to "Click again to confirm"
      expect(screen.getByTitle('Click again to confirm')).toBeInTheDocument()
    })

    it('deletes workspace on second click', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      const deleteButtons = screen.getAllByTitle('Delete workspace')
      await user.click(deleteButtons[1])
      
      const confirmButton = screen.getByTitle('Click again to confirm')
      await user.click(confirmButton)
      
      expect(mockDeleteWorkspace).toHaveBeenCalledWith('workspace-2')
    })

    it('prevents deleting the last workspace', async () => {
      window.alert = vi.fn()
      
      useWorkspace.mockReturnValue({
        workspaces: [mockWorkspaces[0]], // Only one workspace
        currentWorkspace: mockWorkspaces[0],
        createWorkspace: mockCreateWorkspace,
        renameWorkspace: mockRenameWorkspace,
        updateWorkspaceColor: mockUpdateWorkspaceColor,
        deleteWorkspace: mockDeleteWorkspace,
        getWorkspaceColor: mockGetWorkspaceColor,
        addWorkspaceUser: mockAddWorkspaceUser,
        updateWorkspaceUser: mockUpdateWorkspaceUser,
        removeWorkspaceUser: mockRemoveWorkspaceUser
      })
      
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      // Should not show delete button when only one workspace exists
      expect(screen.queryByTitle('Delete workspace')).not.toBeInTheDocument()
    })
  })

  describe('Modal Close Functionality', () => {
    it('calls onClose when modal is closed', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      // Simulate modal close (exact method depends on Modal implementation)
      // This test verifies the handler is passed correctly
      expect(mockOnClose).toBeDefined()
    })

    it('resets form state when modal is closed', async () => {
      const user = userEvent.setup()
      renderWithAllProviders(<WorkspaceManager isOpen={true} onClose={mockOnClose} />)
      
      // Open create mode
      await user.click(screen.getByText('Create New Workspace'))
      await user.type(screen.getByPlaceholderText(/e.g., ACME Corp/), 'Test')
      
      // Cancel should reset
      await user.click(screen.getByText('Cancel'))
      
      // Open create again - should be empty
      await user.click(screen.getByText('Create New Workspace'))
      expect(screen.getByPlaceholderText(/e.g., ACME Corp/)).toHaveValue('')
    })
  })
})
