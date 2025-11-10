/**
 * Worker Data Factory
 * Generates test data for worker entities following industry standards
 */

import { faker } from '@faker-js/faker';

/**
 * Generate a valid worker DTO for API requests
 */
export function createWorkerDTO(overrides = {}) {
  return {
    hrisEmployeeId: faker.string.uuid(),
    workerTypeId: faker.string.uuid(),
    employeeNumber: faker.string.numeric(6),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    departmentId: faker.string.uuid(),
    hireDate: faker.date.past({ years: 2 }).toISOString().split('T')[0],
    status: 'active',
    paymentMethod: 'direct_deposit',
    bankAccountNumber: faker.finance.accountNumber(),
    bankRoutingNumber: faker.finance.routingNumber(),
    taxInfo: {
      filingStatus: 'single',
      exemptions: faker.number.int({ min: 0, max: 5 }),
      additionalWithholding: 0,
    },
    metadata: {},
    ...overrides,
  };
}

/**
 * Generate multiple worker DTOs
 */
export function createWorkerDTOList(count = 3, overrides = {}) {
  return Array.from({ length: count }, () => createWorkerDTO(overrides));
}

/**
 * Generate a worker entity (database representation)
 */
export function createWorkerEntity(overrides = {}) {
  const id = faker.string.uuid();
  const now = new Date().toISOString();
  
  return {
    id,
    organization_id: faker.string.uuid(),
    hris_employee_id: faker.string.uuid(),
    worker_type_id: faker.string.uuid(),
    employee_number: faker.string.numeric(6),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
    department_id: faker.string.uuid(),
    hire_date: faker.date.past({ years: 2 }),
    termination_date: null,
    status: 'active',
    payment_method: 'direct_deposit',
    bank_account_number: faker.finance.accountNumber(),
    bank_routing_number: faker.finance.routingNumber(),
    tax_info: {
      filingStatus: 'single',
      exemptions: faker.number.int({ min: 0, max: 5 }),
      additionalWithholding: 0,
    },
    metadata: {},
    created_at: now,
    updated_at: now,
    created_by: faker.string.uuid(),
    updated_by: faker.string.uuid(),
    ...overrides,
  };
}

/**
 * Generate multiple worker entities
 */
export function createWorkerEntityList(count = 3, overrides = {}) {
  return Array.from({ length: count }, () => createWorkerEntity(overrides));
}

/**
 * Generate a W-2 employee worker
 */
export function createW2EmployeeDTO(overrides = {}) {
  return createWorkerDTO({
    status: 'active',
    paymentMethod: 'direct_deposit',
    taxInfo: {
      filingStatus: 'single',
      exemptions: 2,
      additionalWithholding: 0,
    },
    ...overrides,
  });
}

/**
 * Generate a 1099 contractor worker
 */
export function create1099ContractorDTO(overrides = {}) {
  return createWorkerDTO({
    status: 'active',
    paymentMethod: 'check',
    taxInfo: null, // Contractors handle their own taxes
    ...overrides,
  });
}

/**
 * Generate a terminated worker
 */
export function createTerminatedWorkerDTO(overrides = {}) {
  return createWorkerDTO({
    status: 'terminated',
    ...overrides,
  });
}

/**
 * Generate a worker on leave
 */
export function createWorkerOnLeaveDTO(overrides = {}) {
  return createWorkerDTO({
    status: 'on_leave',
    ...overrides,
  });
}

/**
 * Generate minimal valid worker DTO (required fields only)
 */
export function createMinimalWorkerDTO(overrides = {}) {
  return {
    hrisEmployeeId: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    hireDate: faker.date.past({ years: 1 }).toISOString().split('T')[0],
    ...overrides,
  };
}

/**
 * Generate invalid worker DTO for validation testing
 */
export function createInvalidWorkerDTO(invalidField) {
  const base = createWorkerDTO();
  
  switch (invalidField) {
    case 'missingFirstName':
      delete base.firstName;
      break;
    case 'missingLastName':
      delete base.lastName;
      break;
    case 'missingEmail':
      delete base.email;
      break;
    case 'invalidEmail':
      base.email = 'not-an-email';
      break;
    case 'missingHireDate':
      delete base.hireDate;
      break;
    case 'invalidStatus':
      base.status = 'invalid_status';
      break;
    case 'invalidPaymentMethod':
      base.paymentMethod = 'invalid_method';
      break;
    case 'invalidUUID':
      base.workerTypeId = 'not-a-uuid';
      break;
    default:
      break;
  }
  
  return base;
}

/**
 * Generate worker update DTO
 */
export function createWorkerUpdateDTO(overrides = {}) {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    status: 'active',
    ...overrides,
  };
}

/**
 * Generate worker payroll history data
 */
export function createWorkerPayrollHistory(count = 3, overrides = {}) {
  return Array.from({ length: count }, (_, index) => ({
    id: faker.string.uuid(),
    worker_id: overrides.workerId || faker.string.uuid(),
    pay_period_start: faker.date.past({ years: 1 }),
    pay_period_end: faker.date.recent({ days: 14 }),
    gross_pay: faker.number.float({ min: 2000, max: 8000, precision: 0.01 }),
    net_pay: faker.number.float({ min: 1500, max: 6000, precision: 0.01 }),
    total_deductions: faker.number.float({ min: 200, max: 1500, precision: 0.01 }),
    total_taxes: faker.number.float({ min: 300, max: 1000, precision: 0.01 }),
    ...overrides,
  }));
}

export default {
  createWorkerDTO,
  createWorkerDTOList,
  createWorkerEntity,
  createWorkerEntityList,
  createW2EmployeeDTO,
  create1099ContractorDTO,
  createTerminatedWorkerDTO,
  createWorkerOnLeaveDTO,
  createMinimalWorkerDTO,
  createInvalidWorkerDTO,
  createWorkerUpdateDTO,
  createWorkerPayrollHistory,
};
