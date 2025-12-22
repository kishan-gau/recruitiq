import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/products/schedulehub`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send httpOnly cookies with requests for authentication
});

// Add CSRF token to state-changing requests
api.interceptors.request.use(async (config) => {
  // Only add CSRF token for state-changing operations
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (config.method && stateChangingMethods.includes(config.method.toUpperCase())) {
    // Get CSRF token from cookie or fetch it
    let csrfToken = getCsrfTokenFromCookie();
    
    if (!csrfToken) {
      // Fetch CSRF token if not available
      try {
        const response = await axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true });
        csrfToken = response.data.csrfToken;
      } catch (error) {
        console.warn('Failed to fetch CSRF token:', error);
      }
    }
    
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// Helper to extract CSRF token from cookie
function getCsrfTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN' || name === '_csrf') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export const schedulehubApi = {
  stats: {
    get: () => api.get('/stats').then((res) => res.data),
  },

  workers: {
    list: (params?: any) => api.get('/workers', { params }).then((res) => res.data.workers || res.data),
    get: (id: string) => api.get(`/workers/${id}`).then((res) => res.data.worker || res.data),
    getByEmployee: (employeeId: string) =>
      api.get(`/workers/employee/${employeeId}`).then((res) => res.data.data || res.data),
    create: (data: any) => api.post('/workers', data).then((res) => res.data.data || res.data),
    update: (id: string, data: any) =>
      api.patch(`/workers/${id}`, data).then((res) => res.data.data || res.data),
    terminate: (id: string, terminationDate: string) =>
      api.post(`/workers/${id}/terminate`, { terminationDate }).then((res) => res.data.data || res.data),
    getAvailability: (id: string, params?: any) =>
      api.get(`/workers/${id}/availability`, { params }).then((res) => res.data.data || res.data),
    getShifts: (id: string, params?: any) =>
      api.get(`/workers/${id}/shifts`, { params }).then((res) => res.data.data || res.data),
  },

  schedules: {
    list: (params?: any) => api.get('/schedules', { params }).then((res) => res.data),
    get: (id: string, includeShifts = true) =>
      api.get(`/schedules/${id}`, { params: { includeShifts } }).then((res) => res.data),
    create: (data: any) => api.post('/schedules', data).then((res) => res.data),
    autoGenerate: (data: any) => api.post('/schedules/auto-generate', data).then((res) => res.data),
    regenerate: (id: string, data: any) => api.put(`/schedules/${id}/regenerate`, data).then((res) => res.data),
    update: (id: string, data: any) =>
      api.patch(`/schedules/${id}`, data).then((res) => res.data),
    publish: (id: string) => api.post(`/schedules/${id}/publish`).then((res) => res.data),
    createShift: (scheduleId: string, data: any) =>
      api.post(`/schedules/${scheduleId}/shifts`, data).then((res) => res.data),
  },

  shifts: {
    get: (id: string) => api.get(`/shifts/${id}`).then((res) => res.data),
    update: (id: string, data: any) =>
      api.patch(`/shifts/${id}`, data).then((res) => res.data),
    assign: (id: string, workerId: string) =>
      api.post(`/shifts/${id}/assign`, { workerId }).then((res) => res.data),
    unassign: (id: string) => api.post(`/shifts/${id}/unassign`).then((res) => res.data),
    clockIn: (id: string) => api.post(`/shifts/${id}/clock-in`).then((res) => res.data),
    clockOut: (id: string, data?: any) =>
      api.post(`/shifts/${id}/clock-out`, data).then((res) => res.data),
    cancel: (id: string, reason?: string) =>
      api.post(`/shifts/${id}/cancel`, { reason }).then((res) => res.data),
  },

  availability: {
    create: (data: any) => api.post('/availability', data).then((res) => res.data),
    getWorkerAvailability: (workerId: string, params?: any) =>
      api.get(`/workers/${workerId}/availability`, { params }).then((res) => res.data),
    checkAvailability: (workerId: string, startTime: string, endTime: string) =>
      api
        .get(`/workers/${workerId}/check-availability`, {
          params: { startTime, endTime },
        })
        .then((res) => res.data),
    findAvailableWorkers: (params: any) =>
      api.get('/available-workers', { params }).then((res) => res.data),
    setDefaultAvailability: (workerId: string, data: any) =>
      api.post(`/workers/${workerId}/default-availability`, data).then((res) => res.data),
    update: (id: string, data: any) =>
      api.patch(`/availability/${id}`, data).then((res) => res.data),
    delete: (id: string) => api.delete(`/availability/${id}`).then((res) => res.data),
  },

  timeOff: {
    list: (params?: any) => api.get('/time-off', { params }).then((res) => res.data),
    get: (id: string) => api.get(`/time-off/${id}`).then((res) => res.data),
    getWorkerRequests: (workerId: string, params?: any) =>
      api.get(`/workers/${workerId}/time-off`, { params }).then((res) => res.data),
    getPending: () => api.get('/time-off/pending').then((res) => res.data),
    create: (data: any) => api.post('/time-off', data).then((res) => res.data),
    review: (id: string, decision: string, notes?: string) =>
      api.post(`/time-off/${id}/review`, { decision, notes }).then((res) => res.data),
    cancel: (id: string) => api.post(`/time-off/${id}/cancel`).then((res) => res.data),
  },

  shiftSwaps: {
    // Marketplace and offers
    getMarketplace: (params?: any) =>
      api.get('/shift-swaps/marketplace', { params }).then((res) => res.data),
    getMyOffers: () =>
      api.get('/shift-swaps/my-offers').then((res) => res.data),
    get: (id: string) => api.get(`/shift-swaps/${id}`).then((res) => res.data),
    create: (data: any) => api.post('/shift-swaps', data).then((res) => res.data),
    
    // Swap requests
    requestSwap: (offerId: string, data: any) =>
      api.post(`/shift-swaps/${offerId}/request`, data).then((res) => res.data),
    getRequests: (params?: any) =>
      api.get('/shift-swap-requests', { params }).then((res) => res.data),
    getRequest: (requestId: string) =>
      api.get(`/shift-swap-requests/${requestId}`).then((res) => res.data),
    acceptRequest: (requestId: string) =>
      api.post(`/shift-swap-requests/${requestId}/accept`).then((res) => res.data),
    rejectRequest: (requestId: string, data?: { reason?: string }) =>
      api.post(`/shift-swap-requests/${requestId}/reject`, data).then((res) => res.data),
    
    // Manager approval
    getPendingApprovals: (params?: any) =>
      api.get('/shift-swaps/pending-approvals', { params }).then((res) => res.data),
    approve: (offerId: string, data?: { notes?: string }) =>
      api.post(`/shift-swaps/${offerId}/approve`, data).then((res) => res.data),
    reject: (offerId: string, data: { reason: string }) =>
      api.post(`/shift-swaps/${offerId}/reject`, data).then((res) => res.data),
    
    // Cancellation
    cancel: (offerId: string, data?: { reason?: string }) =>
      api.post(`/shift-swaps/${offerId}/cancel`, data).then((res) => res.data),
  },

  roles: {
    list: (params?: any) => api.get('/roles', { params }).then((res) => res.data),
    get: (id: string) => api.get(`/roles/${id}`).then((res) => res.data),
    create: (data: any) => api.post('/roles', data).then((res) => res.data),
    update: (id: string, data: any) =>
      api.patch(`/roles/${id}`, data).then((res) => res.data),
    delete: (id: string) => api.delete(`/roles/${id}`).then((res) => res.data),
    getWorkers: (roleId: string) =>
      api.get(`/roles/${roleId}/workers`).then((res) => res.data),
    assignWorker: (roleId: string, data: any) =>
      api.post(`/roles/${roleId}/workers`, data).then((res) => res.data),
    updateWorkerRole: (roleId: string, workerId: string, data: any) =>
      api.patch(`/roles/${roleId}/workers/${workerId}`, data).then((res) => res.data),
    removeWorker: (roleId: string, workerId: string) =>
      api.delete(`/roles/${roleId}/workers/${workerId}`).then((res) => res.data),
  },

  stations: {
    list: (params?: any) => api.get('/stations', { params }).then((res) => res.data),
    get: (id: string) => api.get(`/stations/${id}`).then((res) => res.data),
    getRequirements: (id: string) => api.get(`/stations/${id}/requirements`).then((res) => res.data),
    create: (data: any) => api.post('/stations', data).then((res) => res.data),
    update: (id: string, data: any) =>
      api.patch(`/stations/${id}`, data).then((res) => res.data),
    addRequirement: (stationId: string, data: any) =>
      api.post(`/stations/${stationId}/requirements`, data).then((res) => res.data),
    updateRequirement: (stationId: string, roleId: string, data: any) =>
      api
        .patch(`/stations/${stationId}/requirements/${roleId}`, data)
        .then((res) => res.data),
    removeRequirement: (stationId: string, roleId: string) =>
      api.delete(`/stations/${stationId}/requirements/${roleId}`).then((res) => res.data),
    
    // Assignment operations
    getAssignments: (stationId: string) =>
      api.get(`/stations/${stationId}/assignments`).then((res) => res.data),
    assignEmployee: (data: { stationId: string; employeeId: string; notes?: string }) =>
      api.post(`/stations/${data.stationId}/assignments`, { 
        employeeId: data.employeeId,
        notes: data.notes 
      }).then((res) => res.data),
    unassignEmployee: (stationId: string, assignmentId: string) =>
      api.delete(`/stations/${stationId}/assignments/${assignmentId}`).then((res) => res.data),
  },

  shiftTemplates: {
    getAll: (params?: any) => api.get('/shift-templates', { params }).then((res) => res.data),
    getSummaries: (params?: any) => api.get('/shift-templates/summaries', { params }).then((res) => res.data),
    getById: (id: string) => api.get(`/shift-templates/${id}`).then((res) => res.data),
    create: (data: any) => api.post('/shift-templates', data).then((res) => res.data),
    update: (id: string, data: any) =>
      api.patch(`/shift-templates/${id}`, data).then((res) => res.data),
    delete: (id: string) => api.delete(`/shift-templates/${id}`).then((res) => res.data),
    duplicate: (id: string, data?: { name?: string }) =>
      api.post(`/shift-templates/${id}/duplicate`, data).then((res) => res.data),
    validate: (data: any) => api.post('/shift-templates/validate', data).then((res) => res.data),
    bulkUpdate: (data: any) => api.post('/shift-templates/bulk', data).then((res) => res.data),
    getUsageStats: (id: string) => api.get(`/shift-templates/${id}/usage`).then((res) => res.data),
  },
};
