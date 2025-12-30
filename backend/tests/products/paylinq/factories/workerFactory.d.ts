/**
 * Generate a valid worker DTO for API requests
 */
export function createWorkerDTO(overrides?: {}): {
    hrisEmployeeId: any;
    workerTypeId: any;
    employeeNumber: any;
    firstName: any;
    lastName: any;
    email: any;
    departmentId: any;
    hireDate: any;
    status: string;
    paymentMethod: string;
    bankAccountNumber: any;
    bankRoutingNumber: any;
    taxInfo: {
        filingStatus: string;
        exemptions: any;
        additionalWithholding: number;
    };
    metadata: {};
};
/**
 * Generate multiple worker DTOs
 */
export function createWorkerDTOList(count?: number, overrides?: {}): {
    hrisEmployeeId: any;
    workerTypeId: any;
    employeeNumber: any;
    firstName: any;
    lastName: any;
    email: any;
    departmentId: any;
    hireDate: any;
    status: string;
    paymentMethod: string;
    bankAccountNumber: any;
    bankRoutingNumber: any;
    taxInfo: {
        filingStatus: string;
        exemptions: any;
        additionalWithholding: number;
    };
    metadata: {};
}[];
/**
 * Generate a worker entity (database representation)
 */
export function createWorkerEntity(overrides?: {}): {
    id: any;
    organization_id: any;
    hris_employee_id: any;
    worker_type_id: any;
    employee_number: any;
    first_name: any;
    last_name: any;
    email: any;
    department_id: any;
    hire_date: any;
    termination_date: null;
    status: string;
    payment_method: string;
    bank_account_number: any;
    bank_routing_number: any;
    tax_info: {
        filingStatus: string;
        exemptions: any;
        additionalWithholding: number;
    };
    metadata: {};
    created_at: string;
    updated_at: string;
    created_by: any;
    updated_by: any;
};
/**
 * Generate multiple worker entities
 */
export function createWorkerEntityList(count?: number, overrides?: {}): {
    id: any;
    organization_id: any;
    hris_employee_id: any;
    worker_type_id: any;
    employee_number: any;
    first_name: any;
    last_name: any;
    email: any;
    department_id: any;
    hire_date: any;
    termination_date: null;
    status: string;
    payment_method: string;
    bank_account_number: any;
    bank_routing_number: any;
    tax_info: {
        filingStatus: string;
        exemptions: any;
        additionalWithholding: number;
    };
    metadata: {};
    created_at: string;
    updated_at: string;
    created_by: any;
    updated_by: any;
}[];
/**
 * Generate a W-2 employee worker
 */
export function createW2EmployeeDTO(overrides?: {}): {
    hrisEmployeeId: any;
    workerTypeId: any;
    employeeNumber: any;
    firstName: any;
    lastName: any;
    email: any;
    departmentId: any;
    hireDate: any;
    status: string;
    paymentMethod: string;
    bankAccountNumber: any;
    bankRoutingNumber: any;
    taxInfo: {
        filingStatus: string;
        exemptions: any;
        additionalWithholding: number;
    };
    metadata: {};
};
/**
 * Generate a 1099 contractor worker
 */
export function create1099ContractorDTO(overrides?: {}): {
    hrisEmployeeId: any;
    workerTypeId: any;
    employeeNumber: any;
    firstName: any;
    lastName: any;
    email: any;
    departmentId: any;
    hireDate: any;
    status: string;
    paymentMethod: string;
    bankAccountNumber: any;
    bankRoutingNumber: any;
    taxInfo: {
        filingStatus: string;
        exemptions: any;
        additionalWithholding: number;
    };
    metadata: {};
};
/**
 * Generate a terminated worker
 */
export function createTerminatedWorkerDTO(overrides?: {}): {
    hrisEmployeeId: any;
    workerTypeId: any;
    employeeNumber: any;
    firstName: any;
    lastName: any;
    email: any;
    departmentId: any;
    hireDate: any;
    status: string;
    paymentMethod: string;
    bankAccountNumber: any;
    bankRoutingNumber: any;
    taxInfo: {
        filingStatus: string;
        exemptions: any;
        additionalWithholding: number;
    };
    metadata: {};
};
/**
 * Generate a worker on leave
 */
export function createWorkerOnLeaveDTO(overrides?: {}): {
    hrisEmployeeId: any;
    workerTypeId: any;
    employeeNumber: any;
    firstName: any;
    lastName: any;
    email: any;
    departmentId: any;
    hireDate: any;
    status: string;
    paymentMethod: string;
    bankAccountNumber: any;
    bankRoutingNumber: any;
    taxInfo: {
        filingStatus: string;
        exemptions: any;
        additionalWithholding: number;
    };
    metadata: {};
};
/**
 * Generate minimal valid worker DTO (required fields only)
 */
export function createMinimalWorkerDTO(overrides?: {}): {
    hrisEmployeeId: any;
    firstName: any;
    lastName: any;
    email: any;
    hireDate: any;
};
/**
 * Generate invalid worker DTO for validation testing
 */
export function createInvalidWorkerDTO(invalidField: any): {
    hrisEmployeeId: any;
    workerTypeId: any;
    employeeNumber: any;
    firstName: any;
    lastName: any;
    email: any;
    departmentId: any;
    hireDate: any;
    status: string;
    paymentMethod: string;
    bankAccountNumber: any;
    bankRoutingNumber: any;
    taxInfo: {
        filingStatus: string;
        exemptions: any;
        additionalWithholding: number;
    };
    metadata: {};
};
/**
 * Generate worker update DTO
 */
export function createWorkerUpdateDTO(overrides?: {}): {
    firstName: any;
    lastName: any;
    email: any;
    status: string;
};
/**
 * Generate worker payroll history data
 */
export function createWorkerPayrollHistory(count?: number, overrides?: {}): {
    id: any;
    worker_id: any;
    pay_period_start: any;
    pay_period_end: any;
    gross_pay: any;
    net_pay: any;
    total_deductions: any;
    total_taxes: any;
}[];
declare namespace _default {
    export { createWorkerDTO };
    export { createWorkerDTOList };
    export { createWorkerEntity };
    export { createWorkerEntityList };
    export { createW2EmployeeDTO };
    export { create1099ContractorDTO };
    export { createTerminatedWorkerDTO };
    export { createWorkerOnLeaveDTO };
    export { createMinimalWorkerDTO };
    export { createInvalidWorkerDTO };
    export { createWorkerUpdateDTO };
    export { createWorkerPayrollHistory };
}
export default _default;
//# sourceMappingURL=workerFactory.d.ts.map