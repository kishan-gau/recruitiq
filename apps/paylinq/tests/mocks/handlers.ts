import { http, HttpResponse } from 'msw'

const API_URL = 'http://localhost:4000/api'

export const handlers = [
  // Dashboard
  http.get(`${API_URL}/paylinq/dashboard`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        summary: {
          totalWorkers: 25,
          workersTrend: 5,
          daysUntilPayroll: 7,
          pendingApprovals: 12,
          monthlyCost: 125000,
          costTrend: 3,
          nextPayrollDate: 'Nov 15, 2024',
        },
        recentActivity: [
          { description: 'New worker added: Jane Smith', timestamp: '2 hours ago' },
          { description: 'Payroll run completed for Oct 2024', timestamp: '1 day ago' },
        ],
        pendingApprovals: [
          { type: 'time entries', count: 8, urgency: 'high' },
          { type: 'schedule changes', count: 4, urgency: 'medium' },
        ],
      },
    })
  }),

  // Workers - GET list
  http.get(`${API_URL}/paylinq/workers`, ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')

    return HttpResponse.json({
      success: true,
      employees: [
        {
          id: 'W001',
          employee_number: '123456',
          full_name: 'John Doe',
          worker_type: 'Full-Time',
          compensation_type: 'salary',
          compensation_amount: 60000,
          status: 'active',
        },
        {
          id: 'W002',
          employee_number: '123457',
          full_name: 'Jane Smith',
          worker_type: 'Part-Time',
          compensation_type: 'hourly',
          compensation_amount: 25,
          status: 'active',
        },
      ],
      pagination: {
        page,
        limit,
        total: 2,
        totalPages: 1,
      },
    })
  }),

  // Workers - POST create
  http.post(`${API_URL}/paylinq/workers`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      success: true,
      employee: {
        id: 'W003',
        ...body,
      },
    })
  }),

  // Workers - PUT update
  http.put(`${API_URL}/paylinq/workers/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      success: true,
      employee: {
        id: params.id,
        ...body,
      },
    })
  }),

  // Workers - DELETE
  http.delete(`${API_URL}/paylinq/workers/:id`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Worker deleted successfully',
    })
  }),

  // Payroll runs - GET list
  http.get(`${API_URL}/paylinq/payroll-runs`, () => {
    return HttpResponse.json({ success: true, runs: [] })
  }),

  // Payroll runs - GET single
  http.get(`${API_URL}/paylinq/payroll-runs/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        payroll_run: {
          id: params.id,
          status: 'completed',
          pay_period_start: '2025-01-01',
          pay_period_end: '2025-01-31',
          payment_date: '2025-02-05',
          run_type: 'Regular',
        },
        employee_breakdown: [
          {
            worker_id: 'emp-001',
            full_name: 'John Doe',
            employee_number: 'EMP001',
            gross_pay: 5000,
            wage_tax: 750,
            aov: 250,
            aww: 100,
            total_deductions: 1100,
            net_pay: 3900,
            status: 'calculated',
          },
          {
            worker_id: 'emp-002',
            full_name: 'Jane Smith',
            employee_number: 'EMP002',
            gross_pay: 6000,
            wage_tax: 900,
            aov: 300,
            aww: 120,
            total_deductions: 1320,
            net_pay: 4680,
            status: 'calculated',
          },
          {
            worker_id: 'emp-003',
            full_name: 'Alice Johnson',
            employee_number: 'EMP003',
            gross_pay: 4500,
            wage_tax: 675,
            aov: 225,
            aww: 90,
            total_deductions: 1000,
            net_pay: 3500,
            status: 'calculated',
          },
        ],
      },
    })
  }),

  // Payroll runs - POST create
  http.post(`${API_URL}/paylinq/payroll-runs`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    
    // Simulate validation errors if needed
    if (!body.runName || (typeof body.runName === 'string' && body.runName.trim() === '')) {
      return HttpResponse.json({
        success: false,
        message: 'Validation failed',
        details: [
          { field: 'payrollName', message: 'Payroll name is required' }
        ]
      }, { status: 400 })
    }
    
    return HttpResponse.json({
      success: true,
      payrollRun: {
        id: 'PR001',
        run_number: 'PR-2025-11-001',
        ...body,
        status: 'draft',
        created_at: new Date().toISOString(),
      },
    })
  }),

  // Payroll runs - POST process (finalize)
  http.post(`${API_URL}/paylinq/payroll-runs/:id/process`, async ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: `Payroll run ${params.id} processed successfully`,
      payrollRun: {
        id: params.id,
        status: 'processed',
        processed_at: new Date().toISOString(),
      },
    })
  }),

  // Time entries
  http.get(`${API_URL}/paylinq/time-entries`, () => {
    return HttpResponse.json({ success: true, entries: [] })
  }),
]
