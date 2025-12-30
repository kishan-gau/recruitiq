/**
 * Component DTO (DEPRECATED)
 * 
 * @deprecated This file is deprecated. Use specific DTO files instead:
 * - For pay_components table: import from './payComponentDto.ts'
 * - For payroll.payroll_run_components table: import from './runComponentDto.ts'
 * 
 * This file remains for backward compatibility but will be removed in a future version.
 * 
 * @module products/paylinq/dto/componentDto
 */

// Re-export PayComponent functions for backward compatibility
export {
  mapComponentDbToApi,
  mapComponentsDbToApi,
  mapComponentApiToDb,
  mapComponentToSummary,
  mapComponentsToSummary,
  groupComponentsByType
} from './payComponentDto.ts';

// Re-export RunComponent functions for backward compatibility
export {
  mapRunComponentDbToApi,
  mapRunComponentsDbToApi,
  mapRunComponentApiToDb,
  mapRunComponentsToBreakdown
} from './runComponentDto.ts';
