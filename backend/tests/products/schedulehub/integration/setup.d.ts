export function createTestOrganization(): Promise<{
    organizationId: any;
    userId: any;
    agent: any;
    csrfToken: any;
}>;
export function createTestDepartment(organizationId: any, userId: any): Promise<any>;
export function createTestLocation(organizationId: any, userId: any): Promise<any>;
export function createTestEmployee(organizationId: any, userId: any, departmentId: any, locationId: any): Promise<any>;
export function createTestWorker(organizationId: any, userId: any, employeeId: any, departmentId: any, locationId: any): Promise<any>;
export function createTestRole(organizationId: any, userId: any, departmentId: any): Promise<any>;
export function createTestStation(organizationId: any, userId: any, locationId: any): Promise<any>;
export function createTestSchedule(organizationId: any, userId: any, departmentId: any): Promise<any>;
export function cleanupTestData(organizationId: any): Promise<void>;
//# sourceMappingURL=setup.d.ts.map