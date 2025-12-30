/**
 * Nexus Services Index
 * Exports all service modules
 */

import productService from './productService.ts';
import productPermissionService from './productPermissionService.ts';
import productConfigService from './productConfigService.ts';
import productFeatureService from './productFeatureService.ts';
import employeeService from './employeeService.ts';
import employmentHistoryService from './employmentHistoryService.ts';
import timeOffService from './timeOffService.ts';
import contractService from './contractService.ts';
import performanceService from './performanceService.ts';
import benefitsService from './benefitsService.ts';
import attendanceService from './attendanceService.ts';
import departmentService from './departmentService.ts';

export {
  productService,
  productPermissionService,
  productConfigService,
  productFeatureService,
  employeeService,
  employmentHistoryService,
  timeOffService,
  contractService,
  performanceService,
  benefitsService,
  attendanceService,
  departmentService
};
