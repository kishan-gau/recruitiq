import { http, HttpResponse } from 'msw';

const API_BASE_URL = 'http://localhost:3001/api/schedulehub';

// Mock data
const mockWorkers = [
  {
    id: 'worker-1',
    organization_id: 'org-1',
    employee_id: 'emp-1',
    status: 'active',
    hire_date: '2024-01-15',
    base_hourly_rate: 25.0,
    overtime_rate: 37.5,
    weekly_hours_limit: 40,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'worker-2',
    organization_id: 'org-1',
    employee_id: 'emp-2',
    status: 'active',
    hire_date: '2024-02-01',
    base_hourly_rate: 30.0,
    overtime_rate: 45.0,
    weekly_hours_limit: 40,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
  },
];

const mockSchedules = [
  {
    id: 'schedule-1',
    organization_id: 'org-1',
    name: 'Week 1 Schedule',
    start_date: '2024-11-04',
    end_date: '2024-11-10',
    status: 'draft',
    created_by: 'user-1',
    created_at: '2024-11-01T00:00:00Z',
    updated_at: '2024-11-01T00:00:00Z',
  },
  {
    id: 'schedule-2',
    organization_id: 'org-1',
    name: 'Week 2 Schedule',
    start_date: '2024-11-11',
    end_date: '2024-11-17',
    status: 'published',
    published_at: '2024-11-08T00:00:00Z',
    published_by: 'user-1',
    created_by: 'user-1',
    created_at: '2024-11-08T00:00:00Z',
    updated_at: '2024-11-08T00:00:00Z',
  },
];

const mockTimeOffRequests = [
  {
    id: 'timeoff-1',
    worker_id: 'worker-1',
    request_type: 'vacation',
    start_date: '2024-12-20',
    end_date: '2024-12-27',
    status: 'pending',
    reason: 'Holiday vacation',
    created_at: '2024-11-01T00:00:00Z',
    updated_at: '2024-11-01T00:00:00Z',
  },
  {
    id: 'timeoff-2',
    worker_id: 'worker-2',
    request_type: 'sick',
    start_date: '2024-11-15',
    end_date: '2024-11-16',
    status: 'approved',
    reason: 'Medical appointment',
    reviewed_by: 'admin-1',
    reviewed_at: '2024-11-10T00:00:00Z',
    review_notes: 'Approved',
    created_at: '2024-11-05T00:00:00Z',
    updated_at: '2024-11-10T00:00:00Z',
  },
  {
    id: 'timeoff-3',
    worker_id: 'worker-1',
    request_type: 'personal',
    start_date: '2024-12-01',
    end_date: '2024-12-02',
    status: 'pending',
    reason: 'Personal matter',
    created_at: '2024-11-01T00:00:00Z',
    updated_at: '2024-11-01T00:00:00Z',
  },
];

const mockShiftSwaps = [
  {
    id: 'swap-1',
    offered_shift_id: 'shift-1',
    offering_worker_id: 'worker-1',
    swap_type: 'open',
    status: 'pending',
    notes: 'Need to swap this shift',
    expires_at: '2024-11-15T00:00:00Z',
    created_at: '2024-11-07T00:00:00Z',
    updated_at: '2024-11-07T00:00:00Z',
  },
];

const mockStats = {
  activeWorkers: 45,
  publishedSchedules: 12,
  pendingTimeOff: 8,
  openShifts: 23,
  upcomingShifts: [],
  pendingApprovals: [],
};

export const schedulehubHandlers = [
  // Dashboard stats
  http.get(`${API_BASE_URL}/stats`, () => {
    return HttpResponse.json(mockStats);
  }),

  // Workers
  http.get(`${API_BASE_URL}/workers`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    let filteredWorkers = [...mockWorkers];

    if (status) {
      filteredWorkers = filteredWorkers.filter((w) => w.status === status);
    }

    if (search) {
      filteredWorkers = filteredWorkers.filter(
        (w) =>
          w.id.includes(search) ||
          w.employee_id.includes(search)
      );
    }

    return HttpResponse.json({
      data: filteredWorkers,
      pagination: {
        page,
        limit,
        total: filteredWorkers.length,
        totalPages: Math.ceil(filteredWorkers.length / limit),
      },
    });
  }),

  http.get(`${API_BASE_URL}/workers/:id`, ({ params }) => {
    const worker = mockWorkers.find((w) => w.id === params.id);
    if (!worker) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(worker);
  }),

  http.post(`${API_BASE_URL}/workers`, async ({ request }) => {
    const body = await request.json() as Record<string, any>;
    const newWorker = {
      id: `worker-${Date.now()}`,
      organization_id: 'org-1',
      ...(body || {}),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
    mockWorkers.push(newWorker);
    return HttpResponse.json(newWorker, { status: 201 });
  }),

  http.patch(`${API_BASE_URL}/workers/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, any>;
    const workerIndex = mockWorkers.findIndex((w) => w.id === params.id);
    if (workerIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockWorkers[workerIndex] = {
      ...mockWorkers[workerIndex],
      ...(body || {}),
      updated_at: new Date().toISOString(),
    } as any;
    return HttpResponse.json(mockWorkers[workerIndex]);
  }),

  // Schedules
  http.get(`${API_BASE_URL}/schedules`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');

    let filteredSchedules = [...mockSchedules];

    if (status) {
      filteredSchedules = filteredSchedules.filter((s) => s.status === status);
    }

    return HttpResponse.json({
      data: filteredSchedules,
      pagination: {
        page,
        limit,
        total: filteredSchedules.length,
        totalPages: Math.ceil(filteredSchedules.length / limit),
      },
    });
  }),

  http.get(`${API_BASE_URL}/schedules/:id`, ({ params }) => {
    const schedule = mockSchedules.find((s) => s.id === params.id);
    if (!schedule) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(schedule);
  }),

  http.post(`${API_BASE_URL}/schedules`, async ({ request }) => {
    const body = await request.json() as Record<string, any>;
    const newSchedule = {
      id: `schedule-${Date.now()}`,
      organization_id: 'org-1',
      ...(body || {}),
      status: 'draft',
      created_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
    mockSchedules.push(newSchedule);
    return HttpResponse.json(newSchedule, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/schedules/:id/publish`, ({ params }) => {
    const scheduleIndex = mockSchedules.findIndex((s) => s.id === params.id);
    if (scheduleIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockSchedules[scheduleIndex] = {
      ...mockSchedules[scheduleIndex],
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: 'user-1',
      updated_at: new Date().toISOString(),
    } as any;
    return HttpResponse.json(mockSchedules[scheduleIndex]);
  }),

  // Time Off
  http.get(`${API_BASE_URL}/time-off`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let filteredRequests = [...mockTimeOffRequests];

    if (status) {
      filteredRequests = filteredRequests.filter((r) => r.status === status);
    }

    return HttpResponse.json({
      data: filteredRequests,
      pagination: {
        page: 1,
        limit: 20,
        total: filteredRequests.length,
        totalPages: 1,
      },
    });
  }),

  http.get(`${API_BASE_URL}/time-off/pending`, () => {
    const pendingRequests = mockTimeOffRequests.filter((r) => r.status === 'pending');
    return HttpResponse.json({
      data: pendingRequests,
      pagination: {
        page: 1,
        limit: 20,
        total: pendingRequests.length,
        totalPages: 1,
      },
    });
  }),

  http.post(`${API_BASE_URL}/time-off`, async ({ request }) => {
    const body = await request.json() as Record<string, any>;
    const newRequest = {
      id: `timeoff-${Date.now()}`,
      ...(body || {}),
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
    mockTimeOffRequests.push(newRequest);
    return HttpResponse.json(newRequest, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/time-off/:id/review`, async ({ params, request }) => {
    const body = await request.json() as Record<string, any>;
    const requestIndex = mockTimeOffRequests.findIndex((r) => r.id === params.id);
    if (requestIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockTimeOffRequests[requestIndex] = {
      ...mockTimeOffRequests[requestIndex],
      status: body?.decision,
      reviewed_by: 'admin-1',
      reviewed_at: new Date().toISOString(),
      review_notes: body?.notes,
      updated_at: new Date().toISOString(),
    } as any;
    return HttpResponse.json(mockTimeOffRequests[requestIndex]);
  }),

  // Shift Swaps
  http.get(`${API_BASE_URL}/shift-swaps/marketplace`, ({ request }) => {
    const url = new URL(request.url);
    const swapType = url.searchParams.get('swapType');

    let filteredSwaps = [...mockShiftSwaps];

    if (swapType) {
      filteredSwaps = filteredSwaps.filter((s) => s.swap_type === swapType);
    }

    return HttpResponse.json({
      data: filteredSwaps,
      pagination: {
        page: 1,
        limit: 20,
        total: filteredSwaps.length,
        totalPages: 1,
      },
    });
  }),

  http.post(`${API_BASE_URL}/shift-swaps`, async ({ request }) => {
    const body = await request.json();
    const newSwap = {
      id: `swap-${Date.now()}`,
      ...body,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockShiftSwaps.push(newSwap);
    return HttpResponse.json(newSwap, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/shift-swaps/:offerId/request`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: `swap-request-${Date.now()}`,
      offer_id: params.offerId,
      requesting_worker_id: body.workerId,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Roles
  http.get(`${API_BASE_URL}/roles`, () => {
    return HttpResponse.json({
      data: [
        {
          id: 'role-1',
          organization_id: 'org-1',
          name: 'Server',
          description: 'Restaurant server',
          color_code: '#3B82F6',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  }),

  // Stations
  http.get(`${API_BASE_URL}/stations`, () => {
    return HttpResponse.json({
      data: [
        {
          id: 'station-1',
          organization_id: 'org-1',
          name: 'Front Desk',
          description: 'Reception area',
          capacity: 2,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    });
  }),
];
