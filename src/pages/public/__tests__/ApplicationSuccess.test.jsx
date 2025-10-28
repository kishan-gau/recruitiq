import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ApplicationSuccess from '../ApplicationSuccess'
import * as DataContext from '../../../context/DataContext'

// Mock the DataContext
vi.mock('../../../context/DataContext', () => ({
  useData: vi.fn(),
}))

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
})

describe('ApplicationSuccess', () => {
  const mockJob = {
    id: 1,
    title: 'Senior Software Engineer',
    workspaceId: 1,
    publicPortal: {
      enabled: true,
      companyName: 'TechCorp Inc.',
    },
  }

  const mockState = {
    jobs: [mockJob],
    candidates: [],
    flowTemplates: [],
  }

  const renderWithProviders = (jobId = '1', trackingCode = 'TRACK-ABC12345', customState = mockState) => {
    DataContext.useData.mockReturnValue({
      state: customState,
    })

    return render(
      <BrowserRouter>
        <Routes>
          <Route
            path="/apply/:jobId/success"
            element={<ApplicationSuccess />}
          />
        </Routes>
      </BrowserRouter>,
      { initialEntries: [`/apply/${jobId}/success?tracking=${trackingCode}`] }
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    DataContext.useData.mockReturnValue({
      state: mockState,
    })
  })

  it('renders success message', () => {
    renderWithProviders()

    expect(screen.getByText('Application Submitted!')).toBeInTheDocument()
    expect(
      screen.getByText(/Thank you for applying to/i)
    ).toBeInTheDocument()
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument()
  })

  it('displays tracking code', () => {
    renderWithProviders('1', 'TRACK-ABC12345')

    expect(screen.getByText('TRACK-ABC12345')).toBeInTheDocument()
    expect(
      screen.getByText('Your Application Tracking Code')
    ).toBeInTheDocument()
  })

  it('copies tracking code to clipboard', async () => {
    renderWithProviders('1', 'TRACK-ABC12345')

    const copyButton = screen.getByTitle('Copy to clipboard')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'TRACK-ABC12345'
      )
      expect(screen.getByText('✓ Copied to clipboard!')).toBeInTheDocument()
    })
  })

  it('shows copy confirmation temporarily', async () => {
    vi.useFakeTimers()
    renderWithProviders('1', 'TRACK-ABC12345')

    const copyButton = screen.getByTitle('Copy to clipboard')
    fireEvent.click(copyButton)

    await waitFor(() => {
      expect(screen.getByText('✓ Copied to clipboard!')).toBeInTheDocument()
    })

    // Fast-forward time
    vi.advanceTimersByTime(2000)

    await waitFor(() => {
      expect(
        screen.queryByText('✓ Copied to clipboard!')
      ).not.toBeInTheDocument()
    })

    vi.useRealTimers()
  })

  it('renders "What Happens Next" section', () => {
    renderWithProviders()

    expect(screen.getByText('What Happens Next?')).toBeInTheDocument()
    expect(screen.getByText('Confirmation Email')).toBeInTheDocument()
    expect(screen.getByText('Application Review')).toBeInTheDocument()
    expect(screen.getByText('Next Steps')).toBeInTheDocument()
  })

  it('renders track application link', () => {
    renderWithProviders('1', 'TRACK-ABC12345')

    const trackLinks = screen.getAllByText('Track Application')
    expect(trackLinks.length).toBeGreaterThan(0)
    
    // Check that at least one has correct href
    const linkElement = trackLinks[0].closest('a')
    expect(linkElement).toHaveAttribute('href', '/track/TRACK-ABC12345')
  })

  it('renders view more jobs link when workspace available', () => {
    renderWithProviders()

    const moreJobsLink = screen.getByText('View More Jobs')
    expect(moreJobsLink).toBeInTheDocument()
    expect(moreJobsLink.closest('a')).toHaveAttribute('href', '/careers/1')
  })

  it('handles missing tracking code gracefully', () => {
    DataContext.useData.mockReturnValue({ state: mockState })
    
    render(
      <BrowserRouter>
        <Routes>
          <Route
            path="/apply/:jobId/success"
            element={<ApplicationSuccess />}
          />
        </Routes>
      </BrowserRouter>,
      { initialEntries: [`/apply/1/success`] }
    )

    expect(screen.getByText('Application Submitted!')).toBeInTheDocument()
    // Tracking code section should not be visible
    expect(
      screen.queryByText('Your Application Tracking Code')
    ).not.toBeInTheDocument()
  })

  it('handles job not found gracefully', () => {
    const emptyState = { jobs: [], candidates: [], flowTemplates: [] }
    renderWithProviders('999', 'TRACK-ABC12345', emptyState)

    // Should still render success page with generic message
    expect(screen.getByText('Application Submitted!')).toBeInTheDocument()
    expect(screen.getByText(/Thank you for applying/i)).toBeInTheDocument()
  })

  it('displays company name in success message', () => {
    renderWithProviders()

    expect(screen.getByText(/at/i)).toBeInTheDocument()
    expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument()
  })

  it('renders info box about tracking', () => {
    renderWithProviders()

    expect(
      screen.getByText('Keep Track of Your Application')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Use your tracking code to check your application status/i)
    ).toBeInTheDocument()
  })

  it('renders both track buttons correctly', () => {
    renderWithProviders('1', 'TRACK-ABC12345')

    // Should have "Track Your Application" in the tracking code card
    expect(screen.getByText('Track Your Application')).toBeInTheDocument()
    
    // And "Track Application" in the actions section
    const trackLinks = screen.getAllByText(/Track.*Application/)
    expect(trackLinks.length).toBeGreaterThanOrEqual(2)
  })
})
