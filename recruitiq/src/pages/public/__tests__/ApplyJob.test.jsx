import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ApplyJob from '../ApplyJob'
import * as DataContext from '../../../context/DataContext'

// Mock the DataContext
vi.mock('../../../context/DataContext', () => ({
  useData: vi.fn(),
}))

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('ApplyJob', () => {
  const mockJob = {
    id: 1,
    title: 'Senior Software Engineer',
    department: 'Engineering',
    location: 'San Francisco, CA',
    type: 'Full-time',
    description: 'We are looking for a talented software engineer...',
    requirements: 'Bachelor\'s degree in Computer Science or related field',
    workspaceId: 1,
    publicPortal: {
      enabled: true,
      companyName: 'TechCorp Inc.',
      companyLogo: 'https://example.com/logo.png',
      companyDescription: 'TechCorp is a leading technology company...',
      salaryMin: 120000,
      salaryMax: 180000,
      salaryPublic: true,
      applications: 42,
    },
    postedDate: '2025-10-15T10:00:00Z',
    flowTemplateId: 1,
  }

  const mockFlowTemplate = {
    id: 1,
    name: 'Standard Hiring Process',
    stages: [
      { id: 1, name: 'Applied', order: 1 },
      { id: 2, name: 'Phone Screen', order: 2 },
      { id: 3, name: 'Interview', order: 3 },
    ],
  }

  const mockState = {
    jobs: [mockJob],
    flowTemplates: [mockFlowTemplate],
    candidates: [],
  }

  const mockAddCandidate = vi.fn()

  const renderWithProviders = (jobId = '1', customState = mockState) => {
    DataContext.useData.mockReturnValue({
      state: customState,
      addCandidate: mockAddCandidate,
    })

    return render(
      <BrowserRouter>
        <Routes>
          <Route path="/apply/:jobId" element={<ApplyJob />} />
        </Routes>
      </BrowserRouter>,
      { initialEntries: [`/apply/${jobId}`] }
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    DataContext.useData.mockReturnValue({
      state: mockState,
      addCandidate: mockAddCandidate,
    })
  })

  it('renders job details correctly', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
      expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument()
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument()
      expect(screen.getByText('Full-time')).toBeInTheDocument()
      expect(screen.getByText('Engineering')).toBeInTheDocument()
    })
  })

  it('displays salary range when public', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText(/\$120,000 - \$180,000/)).toBeInTheDocument()
    })
  })

  it('renders application form with all fields', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Location/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Cover Letter/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/LinkedIn Profile/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Portfolio\/Website/i)).toBeInTheDocument()
    })
  })

  it('shows validation errors for required fields', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('Apply Now')).toBeInTheDocument()
    })

    const submitButton = screen.getByText('Apply Now')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Phone number is required')).toBeInTheDocument()
      expect(screen.getByText('Location is required')).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    })

    const emailInput = screen.getByLabelText(/Email Address/i)
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })

    const submitButton = screen.getByText('Apply Now')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    mockAddCandidate.mockResolvedValueOnce({ id: 123 })
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
    })

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'john.doe@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { value: '+1 555-1234' },
    })
    fireEvent.change(screen.getByLabelText(/Location/i), {
      target: { value: 'New York, NY' },
    })

    // Submit form
    const submitButton = screen.getByText('Apply Now')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockAddCandidate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1 555-1234',
          location: 'New York, NY',
          jobId: 1,
          stage: 'Applied',
          applicationSource: 'public-portal',
          trackingCode: expect.stringMatching(/^TRACK-[A-Z0-9]{8}$/),
        })
      )
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/\/apply\/1\/success\?tracking=TRACK-[A-Z0-9]{8}$/)
      )
    })
  })

  it('shows loading state while submitting', async () => {
    mockAddCandidate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
    })

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'john.doe@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { value: '+1 555-1234' },
    })
    fireEvent.change(screen.getByLabelText(/Location/i), {
      target: { value: 'New York, NY' },
    })

    // Submit form
    const submitButton = screen.getByText('Apply Now')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Submitting...')).toBeInTheDocument()
    })
  })

  it('shows 404 when job not found', () => {
    const emptyState = { jobs: [], flowTemplates: [], candidates: [] }
    renderWithProviders('999', emptyState)

    expect(screen.getByText('Job Not Found')).toBeInTheDocument()
  })

  it('shows message when job is not publicly available', () => {
    const privateJob = {
      ...mockJob,
      publicPortal: {
        ...mockJob.publicPortal,
        enabled: false,
      },
    }
    const privateState = { ...mockState, jobs: [privateJob] }
    renderWithProviders('1', privateState)

    expect(screen.getByText('Job Not Available')).toBeInTheDocument()
  })

  it('includes optional fields in submission', async () => {
    mockAddCandidate.mockResolvedValueOnce({ id: 123 })
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
    })

    // Fill all fields including optional ones
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Jane Smith' },
    })
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { value: '+1 555-5678' },
    })
    fireEvent.change(screen.getByLabelText(/Location/i), {
      target: { value: 'Boston, MA' },
    })
    fireEvent.change(screen.getByLabelText(/Cover Letter/i), {
      target: { value: 'I am very interested in this position...' },
    })
    fireEvent.change(screen.getByLabelText(/LinkedIn Profile/i), {
      target: { value: 'https://linkedin.com/in/janesmith' },
    })
    fireEvent.change(screen.getByLabelText(/Portfolio\/Website/i), {
      target: { value: 'https://janesmith.dev' },
    })

    const submitButton = screen.getByText('Apply Now')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockAddCandidate).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationData: expect.objectContaining({
            formResponses: {
              coverLetter: 'I am very interested in this position...',
              linkedin: 'https://linkedin.com/in/janesmith',
              portfolio: 'https://janesmith.dev',
            },
          }),
        })
      )
    })
  })
})
