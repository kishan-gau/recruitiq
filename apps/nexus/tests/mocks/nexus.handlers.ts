import { http, HttpResponse } from 'msw';

// MSW handlers match the full URL path including origin
// APIClient uses baseURL='/api', so NexusClient makes requests to /api/products/nexus/*
// In tests, axios defaults to current origin, so we match the absolute path
const API_BASE_URL = '*/api/products/nexus';

// Mock location data
const mockLocations = [
  {
    id: 'loc-1',
    organizationId: 'org-1',
    locationCode: 'HQ',
    locationName: 'Headquarters',
    locationType: 'headquarters',
    addressLine1: '123 Main St',
    city: 'San Francisco',
    stateProvince: 'CA',
    postalCode: '94105',
    country: 'USA',
    phone: '+1-555-0100',
    email: 'hq@company.com',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'loc-2',
    organizationId: 'org-1',
    locationCode: 'NYC',
    locationName: 'New York Branch',
    locationType: 'branch',
    addressLine1: '456 Broadway',
    city: 'New York',
    stateProvince: 'NY',
    postalCode: '10013',
    country: 'USA',
    phone: '+1-555-0200',
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'loc-3',
    organizationId: 'org-1',
    locationCode: 'WH1',
    locationName: 'Warehouse 1',
    locationType: 'warehouse',
    addressLine1: '789 Industrial Blvd',
    city: 'Newark',
    stateProvince: 'NJ',
    postalCode: '07102',
    country: 'USA',
    isActive: false,
    createdAt: '2024-01-03T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

// Mock department data
const mockDepartments = [
  {
    id: 'dept-1',
    organizationId: 'org-1',
    departmentCode: 'ENG',
    departmentName: 'Engineering',
    description: 'Software engineering department',
    parentDepartmentId: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'dept-2',
    organizationId: 'org-1',
    departmentCode: 'SALES',
    departmentName: 'Sales',
    description: 'Sales department',
    parentDepartmentId: null,
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

export const nexusHandlers = [
  // Locations endpoints
  http.get(`${API_BASE_URL}/locations`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const locationType = url.searchParams.get('locationType');
    const isActive = url.searchParams.get('isActive');
    const country = url.searchParams.get('country');

    let filtered = [...mockLocations];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (loc) =>
          loc.locationName.toLowerCase().includes(searchLower) ||
          loc.locationCode.toLowerCase().includes(searchLower) ||
          (loc.city && loc.city.toLowerCase().includes(searchLower))
      );
    }

    if (locationType) {
      filtered = filtered.filter((loc) => loc.locationType === locationType);
    }

    if (isActive !== null && isActive !== undefined) {
      const activeFilter = isActive === 'true';
      filtered = filtered.filter((loc) => loc.isActive === activeFilter);
    }

    if (country) {
      filtered = filtered.filter((loc) => loc.country === country);
    }

    return HttpResponse.json({
      success: true,
      data: filtered,
    });
  }),

  http.get(`${API_BASE_URL}/locations/:id`, ({ params }) => {
    const location = mockLocations.find((loc) => loc.id === params.id);
    if (!location) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({
      success: true,
      data: location,
    });
  }),

  http.post(`${API_BASE_URL}/locations`, async ({ request }) => {
    const body = (await request.json()) as any;
    const newLocation = {
      id: 'loc-new',
      organizationId: 'org-1',
      ...body,
      isActive: body.isActive ?? true,
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(
      {
        success: true,
        data: newLocation,
      },
      { status: 201 }
    );
  }),

  http.patch(`${API_BASE_URL}/locations/:id`, async ({ params, request }) => {
    const location = mockLocations.find((loc) => loc.id === params.id);
    if (!location) {
      return new HttpResponse(null, { status: 404 });
    }
    const body = (await request.json()) as any;
    const updated = {
      ...location,
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: 'user-1',
    };
    return HttpResponse.json({
      success: true,
      data: updated,
    });
  }),

  http.delete(`${API_BASE_URL}/locations/:id`, ({ params }) => {
    const location = mockLocations.find((loc) => loc.id === params.id);
    if (!location) {
      return new HttpResponse(null, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Departments endpoints
  http.get(`${API_BASE_URL}/departments`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const isActive = url.searchParams.get('isActive');

    let filtered = [...mockDepartments];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (dept) =>
          dept.departmentName.toLowerCase().includes(searchLower) ||
          dept.departmentCode.toLowerCase().includes(searchLower)
      );
    }

    if (isActive !== null && isActive !== undefined) {
      const activeFilter = isActive === 'true';
      filtered = filtered.filter((dept) => dept.isActive === activeFilter);
    }

    return HttpResponse.json({
      success: true,
      data: filtered,
    });
  }),

  http.get(`${API_BASE_URL}/departments/:id`, ({ params }) => {
    const department = mockDepartments.find((dept) => dept.id === params.id);
    if (!department) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({
      success: true,
      data: department,
    });
  }),

  http.post(`${API_BASE_URL}/departments`, async ({ request }) => {
    const body = (await request.json()) as any;
    const newDepartment = {
      id: `dept-${Date.now()}`,
      organizationId: 'org-1',
      ...body,
      isActive: body.isActive ?? true,
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
      updatedAt: new Date().toISOString(),
    };
    mockDepartments.push(newDepartment);
    return HttpResponse.json(
      {
        success: true,
        data: newDepartment,
      },
      { status: 201 }
    );
  }),

  http.patch(`${API_BASE_URL}/departments/:id`, async ({ params, request }) => {
    const deptIndex = mockDepartments.findIndex((dept) => dept.id === params.id);
    if (deptIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    const body = (await request.json()) as any;
    mockDepartments[deptIndex] = {
      ...mockDepartments[deptIndex],
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: 'user-1',
    };
    return HttpResponse.json({
      success: true,
      data: mockDepartments[deptIndex],
    });
  }),

  http.delete(`${API_BASE_URL}/departments/:id`, ({ params }) => {
    const deptIndex = mockDepartments.findIndex((dept) => dept.id === params.id);
    if (deptIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    mockDepartments.splice(deptIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
