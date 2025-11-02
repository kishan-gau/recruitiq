import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PublicLayout from '../PublicLayout'

describe('PublicLayout', () => {
  const renderWithRouter = (children) => {
    return render(
      <BrowserRouter>
        <PublicLayout>{children}</PublicLayout>
      </BrowserRouter>
    )
  }

  it('renders the RecruitIQ logo', () => {
    renderWithRouter(<div>Test content</div>)
    const logos = screen.getAllByText('RecruitIQ')
    expect(logos.length).toBeGreaterThan(0)
  })

  it('renders the Recruiter Login link', () => {
    renderWithRouter(<div>Test content</div>)
    const loginLink = screen.getByText(/Recruiter Login/)
    expect(loginLink).toBeInTheDocument()
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login')
  })

  it('renders children content', () => {
    renderWithRouter(<div data-testid="test-content">Test content</div>)
    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders footer with branding', () => {
    renderWithRouter(<div>Test content</div>)
    expect(screen.getByText('Powered by')).toBeInTheDocument()
  })

  it('renders footer links', () => {
    renderWithRouter(<div>Test content</div>)
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
    expect(screen.getByText('Terms of Service')).toBeInTheDocument()
  })

  it('does not render sidebar or navigation', () => {
    renderWithRouter(<div>Test content</div>)
    // Should not have typical internal navigation items
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Jobs')).not.toBeInTheDocument()
    expect(screen.queryByText('Candidates')).not.toBeInTheDocument()
  })
})
