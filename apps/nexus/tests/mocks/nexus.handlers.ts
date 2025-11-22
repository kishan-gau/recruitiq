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

  // Employees endpoints
  http.get(`${API_BASE_URL}/employees`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const employmentStatus = url.searchParams.get('employmentStatus');
    const departmentId = url.searchParams.get('departmentId');

    const mockEmployees = [
      {
        id: '1',
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        jobTitle: 'Software Engineer',
        employmentStatus: 'active',
        employmentType: 'full_time',
        hireDate: '2024-01-15',
        department: { id: 'dept-1', departmentName: 'Engineering' },
        location: { id: 'loc-1', locationName: 'New York' },
      },
      {
        id: '2',
        employeeNumber: 'EMP002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        jobTitle: 'Product Manager',
        employmentStatus: 'active',
        employmentType: 'full_time',
        hireDate: '2024-02-01',
        department: { id: 'dept-2', departmentName: 'Product' },
        location: { id: 'loc-1', locationName: 'New York' },
      },
    ];

    let filtered = [...mockEmployees];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.firstName.toLowerCase().includes(searchLower) ||
          emp.lastName.toLowerCase().includes(searchLower) ||
          emp.email.toLowerCase().includes(searchLower)
      );
    }

    if (employmentStatus) {
      filtered = filtered.filter((emp) => emp.employmentStatus === employmentStatus);
    }

    if (departmentId) {
      filtered = filtered.filter((emp) => emp.department.id === departmentId);
    }

    return HttpResponse.json({
      data: filtered,
      total: filtered.length,
      page: 1,
      limit: 50,
    });
  }),

  http.get(`${API_BASE_URL}/employees/:id`, ({ params }) => {
    if (params.id === '123e4567-e89b-12d3-a456-426614174000') {
      return HttpResponse.json({
        id: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: 'org-123',
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        jobTitle: 'Senior Software Engineer',
        employmentStatus: 'active',
        employmentType: 'full_time',
        hireDate: '2024-01-15',
        department: { id: 'dept-1', departmentName: 'Engineering' },
        location: { id: 'loc-1', locationName: 'New York Office' },
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.delete(`${API_BASE_URL}/employees/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE_URL}/employees/:id/terminate`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      employmentStatus: 'terminated',
    });
  }),

  // Documents endpoints
  http.get(`${API_BASE_URL}/documents`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');

    const mockDocuments = [
      {
        id: 'doc-1',
        organizationId: 'org-123',
        name: 'Employee Handbook 2024',
        description: 'Company policies and procedures',
        category: 'handbook',
        status: 'active',
        fileName: 'handbook.pdf',
        fileSize: 1024000,
        fileType: 'pdf',
        mimeType: 'application/pdf',
        fileUrl: 'https://storage.example.com/handbook.pdf',
        version: 1,
        isLatestVersion: true,
        accessLevel: 'internal',
        tags: ['policy', 'handbook', '2024'],
        uploadedAt: '2024-01-15T10:00:00Z',
        accessCount: 42,
      },
      {
        id: 'doc-2',
        organizationId: 'org-123',
        name: 'Employment Contract Template',
        description: 'Standard employment contract',
        category: 'contract',
        status: 'active',
        fileName: 'contract-template.docx',
        fileSize: 524288,
        fileType: 'word',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileUrl: 'https://storage.example.com/contract.docx',
        version: 2,
        isLatestVersion: true,
        accessLevel: 'confidential',
        tags: ['contract', 'template'],
        uploadedAt: '2024-02-01T10:00:00Z',
        accessCount: 25,
      },
    ];

    let filtered = [...mockDocuments];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(searchLower) ||
          (doc.description && doc.description.toLowerCase().includes(searchLower))
      );
    }

    if (category) {
      filtered = filtered.filter((doc) => doc.category === category);
    }

    if (status) {
      filtered = filtered.filter((doc) => doc.status === status);
    }

    return HttpResponse.json({
      data: filtered,
      total: filtered.length,
      page: 1,
      limit: 50,
    });
  }),

  http.get(`${API_BASE_URL}/documents/:id`, ({ params }) => {
    if (params.id === 'doc-1') {
      return HttpResponse.json({
        id: 'doc-1',
        name: 'Employee Handbook 2024',
        category: 'handbook',
        status: 'active',
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.delete(`${API_BASE_URL}/documents/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE_URL}/documents/:id/download`, () => {
    return HttpResponse.json({ downloadUrl: 'https://example.com/download' });
  }),

  http.get(`${API_BASE_URL}/documents/statistics`, () => {
    return HttpResponse.json({
      totalDocuments: 150,
      activeDocuments: 130,
      archivedDocuments: 20,
      totalSize: 52428800,
      byCategory: [
        { category: 'contract', count: 25, size: 10485760 },
        { category: 'policy', count: 30, size: 15728640 },
        { category: 'handbook', count: 15, size: 7340032 },
      ],
      recentUploads: 12,
      pendingSignatures: 5,
    });
  }),
];
