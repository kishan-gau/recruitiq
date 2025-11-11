import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../utils/test-helpers'
import { server } from '../../mocks/server'
import CreatePayrollRunModal from '@/components/modals/CreatePayrollRunModal'

const API_URL = 'http://localhost:4000/api'

describe('CreatePayrollRunModal - Advanced API Integration Tests', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('Network Error Scenarios', () => {
    it('handles network timeouts gracefully', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return HttpResponse.error()
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/network error|failed to create/i)).toBeInTheDocument()
      })

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('handles 500 internal server errors', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Internal server error occurred',
            },
            { status: 500 }
          )
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/internal server error|failed to create/i)).toBeInTheDocument()
      })

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('handles 403 forbidden errors', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Insufficient permissions to create payroll run',
            },
            { status: 403 }
          )
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/insufficient permissions|failed to create/i)).toBeInTheDocument()
      })

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('handles 401 unauthorized errors', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Unauthorized',
            },
            { status: 401 }
          )
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/unauthorized|failed to create/i)).toBeInTheDocument()
      })

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })

  describe('API Validation Error Responses', () => {
    it('displays field-specific validation errors from API', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'Validation failed',
              details: [
                { field: 'periodStart', message: 'Period start date cannot be in the past' },
                { field: 'periodEnd', message: 'Period end date is invalid' },
              ],
            },
            { status: 400 }
          )
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/period start date cannot be in the past/i)).toBeInTheDocument()
        expect(screen.getByText(/period end date is invalid/i)).toBeInTheDocument()
      })

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })

    it('handles duplicate payroll run errors', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, () => {
          return HttpResponse.json(
            {
              success: false,
              message: 'A payroll run already exists for this period',
            },
            { status: 409 }
          )
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/already exists|failed to create/i)).toBeInTheDocument()
      })

      expect(mockOnSuccess).not.toHaveBeenCalled()
    })
  })

  describe('Successful API Responses', () => {
    it('successfully creates payroll run and calls callbacks', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>
          return HttpResponse.json({
            success: true,
            payrollRun: {
              id: 'PR-2024-11-001',
              run_number: body.runNumber,
              run_name: body.runName,
              run_type: body.runType,
              pay_period_start: body.payPeriodStart,
              pay_period_end: body.payPeriodEnd,
              payment_date: body.paymentDate,
              status: 'draft',
              created_at: new Date().toISOString(),
            },
          })
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1)
        expect(mockOnClose).toHaveBeenCalledTimes(1)
      })
    })

    it('displays success toast after creation', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/payroll run created successfully/i)).toBeInTheDocument()
      })
    })
  })

  describe('Complex API Scenarios', () => {
    it('handles slow API responses without breaking UI', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000))
          return HttpResponse.json({
            success: true,
            payrollRun: { id: 'PR-001', status: 'draft' },
          })
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      // Button should show loading state
      expect(screen.getByText(/creating/i)).toBeInTheDocument()

      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalled()
        },
        { timeout: 3000 }
      )
    }, 10000)

    it('retains form data if API call fails', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, () => {
          return HttpResponse.error()
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const nameInput = screen.getByTestId('payroll-name-input')
      const descriptionInput = screen.getByPlaceholderText(/optional description/i)

      await user.clear(nameInput)
      await user.type(nameInput, 'Test Payroll')
      await user.type(descriptionInput, 'Test Description')

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/network error|failed to create/i)).toBeInTheDocument()
      })

      // Form data should still be present
      expect(nameInput).toHaveValue('Test Payroll')
      expect(descriptionInput).toHaveValue('Test Description')
    })

    it('can retry after network error', async () => {
      const user = userEvent.setup()
      let attemptCount = 0

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, () => {
          attemptCount++
          if (attemptCount === 1) {
            return HttpResponse.error()
          }
          return HttpResponse.json({
            success: true,
            payrollRun: { id: 'PR-001', status: 'draft' },
          })
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })

      // First attempt fails
      await user.click(submitButton)
      await waitFor(() => {
        expect(screen.getByText(/network error|failed to create/i)).toBeInTheDocument()
      })

      // Second attempt succeeds
      await user.click(submitButton)
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Payload Validation', () => {
    it('sends correctly formatted dates to API', async () => {
      const user = userEvent.setup()
      let capturedPayload: any = null

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, async ({ request }) => {
          capturedPayload = await request.json()
          return HttpResponse.json({
            success: true,
            payrollRun: { id: 'PR-001', status: 'draft' },
          })
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/)
      await user.clear(dateInputs[0])
      await user.type(dateInputs[0], '2024-11-01')
      await user.clear(dateInputs[1])
      await user.type(dateInputs[1], '2024-11-30')
      await user.clear(dateInputs[2])
      await user.type(dateInputs[2], '2024-12-05')

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(capturedPayload).not.toBeNull()
        expect(capturedPayload.payPeriodStart).toBe('2024-11-01')
        expect(capturedPayload.payPeriodEnd).toBe('2024-11-30')
        expect(capturedPayload.paymentDate).toBe('2024-12-05')
      })
    })

    it('sends correct run type to API', async () => {
      const user = userEvent.setup()
      let capturedPayload: any = null

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, async ({ request }) => {
          capturedPayload = await request.json()
          return HttpResponse.json({
            success: true,
            payrollRun: { id: 'PR-001', status: 'draft' },
          })
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '13th-month')

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(capturedPayload).not.toBeNull()
        expect(capturedPayload.runType).toBe('13th-month')
      })
    })

    it('generates unique run numbers', async () => {
      const user = userEvent.setup()
      const capturedPayloads: any[] = []

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, async ({ request }) => {
          const payload = await request.json()
          capturedPayloads.push(payload)
          return HttpResponse.json({
            success: true,
            payrollRun: { id: `PR-${capturedPayloads.length}`, status: 'draft' },
          })
        })
      )

      // First submission
      const { unmount } = renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(capturedPayloads.length).toBe(1)
      })

      unmount()

      // Second submission
      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton2 = screen.getByRole('button', { name: /create payroll run/i })
      await user.click(submitButton2)

      await waitFor(() => {
        expect(capturedPayloads.length).toBe(2)
        expect(capturedPayloads[0].runNumber).not.toBe(capturedPayloads[1].runNumber)
      })
    })
  })

  describe('Concurrent Operations', () => {
    it('prevents multiple simultaneous submissions', async () => {
      const user = userEvent.setup()
      let submitCount = 0

      server.use(
        http.post(`${API_URL}/paylinq/payroll-runs`, async () => {
          submitCount++
          await new Promise((resolve) => setTimeout(resolve, 1000))
          return HttpResponse.json({
            success: true,
            payrollRun: { id: 'PR-001', status: 'draft' },
          })
        })
      )

      renderWithProviders(
        <CreatePayrollRunModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
      )

      const submitButton = screen.getByRole('button', { name: /create payroll run/i })

      // Try to submit multiple times rapidly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalledTimes(1)
        },
        { timeout: 3000 }
      )

      // Should only submit once
      expect(submitCount).toBeLessThanOrEqual(1)
    })
  })
})
