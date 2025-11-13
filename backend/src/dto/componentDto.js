/**
 * Component DTO - Maps payroll run components
 * Database: snake_case → API: camelCase
 */

/**
 * Map components to breakdown format (for API response)
 * @param {Array} dbComponents - Array of database records
 * @returns {Object} Grouped components with summary
 */
export function mapComponentsToBreakdown(dbComponents) {
  if (!Array.isArray(dbComponents)) return { earnings: [], taxes: [], deductions: [], summary: {} };

  const apiComponents = mapComponentsDbToApi(dbComponents);

  // Group by type
  const earnings = apiComponents.filter(c => c.componentType === 'earning');
  const taxes = apiComponents.filter(c => c.componentType === 'tax');
  const deductions = apiComponents.filter(c => c.componentType === 'deduction');

  // Calculate totals
  const totalEarnings = earnings.reduce((sum, c) => sum + c.amount, 0);
  const totalTaxes = taxes.reduce((sum, c) => sum + c.amount, 0);
  const totalDeductions = deductions.reduce((sum, c) => sum + c.amount, 0);

  // Extract tax-free and taxable from metadata
  let totalTaxFree = 0;
  let totalTaxable = 0;
  let totalWageTax = 0;
  let totalAovTax = 0;
  let totalAwwTax = 0;
  let calculationModes = null;

  earnings.forEach(earning => {
    const taxCalc = earning.calculationMetadata?.taxCalculation;
    if (taxCalc) {
      totalTaxFree += taxCalc.taxFreeAllowance || 0;
      totalTaxable += taxCalc.taxableIncome || 0;
      totalWageTax += taxCalc.wageTax || 0;
      totalAovTax += taxCalc.aovTax || 0;
      totalAwwTax += taxCalc.awwTax || 0;

      // Get calculation modes from metadata (should be same for all components)
      if (!calculationModes && taxCalc.taxRulesApplied) {
        calculationModes = {
          wageTax: taxCalc.taxRulesApplied.wageTaxMode,
          aov: taxCalc.taxRulesApplied.aovMode,
          aww: taxCalc.taxRulesApplied.awwMode
        };
      }
    }
  });

  return {
    earnings,
    taxes,
    deductions,
    summary: {
      totalEarnings,
      totalTaxFree,
      totalTaxable,
      totalWageTax,
      totalAovTax,
      totalAwwTax,
      totalTaxes,
      totalDeductions,
      netPay: totalEarnings - totalTaxes - totalDeductions,
      calculationModes
    }
  };
}

/**
 * Map component from database to API format
 * @param {Object} dbComponent - Database record (snake_case)
 * @returns {Object} API-formatted component (camelCase)
 */
export function mapComponentDbToApi(dbComponent) {
  if (!dbComponent) return null;

  return {
    id: dbComponent.id,
    organizationId: dbComponent.organization_id,
    payrollRunId: dbComponent.payroll_run_id,
    paycheckId: dbComponent.paycheck_id,
    
    // Component details
    componentType: dbComponent.component_type,    // 'earning', 'tax', 'deduction'
    componentCode: dbComponent.component_code,     // 'VAKANTIEGELD', 'WAGE_TAX_REGULAR'
    componentName: dbComponent.component_name,     // 'Holiday Allowance'
    
    // Calculation
    units: parseFloat(dbComponent.units) || null,
    rate: parseFloat(dbComponent.rate) || null,
    amount: parseFloat(dbComponent.amount) || 0,
    
    // Metadata
    isTaxable: dbComponent.is_taxable,
    taxCategory: dbComponent.tax_category,
    
    // Structure tracking
    workerStructureId: dbComponent.worker_structure_id,
    structureTemplateVersion: dbComponent.structure_template_version,
    componentConfigSnapshot: dbComponent.component_config_snapshot,
    calculationMetadata: dbComponent.calculation_metadata,
    
    // Audit
    createdAt: dbComponent.created_at,
    createdBy: dbComponent.created_by
  };
}

/**
 * Map array of components from database to API format
 * @param {Array} dbComponents - Array of database records
 * @returns {Array} Array of API-formatted components
 */
export function mapComponentsDbToApi(dbComponents) {
  if (!Array.isArray(dbComponents)) return [];
  return dbComponents.map(mapComponentDbToApi);
}

/**
 * Map component from API to database format
 * @param {Object} apiData - API request data (camelCase)
 * @returns {Object} Database format (snake_case)
 */
export function mapComponentApiToDb(apiData) {
  if (!apiData) return null;

  return {
    payroll_run_id: apiData.payrollRunId,
    paycheck_id: apiData.paycheckId,
    component_type: apiData.componentType,
    component_code: apiData.componentCode,
    component_name: apiData.componentName,
    units: apiData.units,
    rate: apiData.rate,
    amount: apiData.amount,
    is_taxable: apiData.isTaxable,
    tax_category: apiData.taxCategory,
    worker_structure_id: apiData.workerStructureId,
    structure_template_version: apiData.structureTemplateVersion,
    component_config_snapshot: apiData.componentConfigSnapshot ? 
      JSON.stringify(apiData.componentConfigSnapshot) : null,
    calculation_metadata: apiData.calculationMetadata ? 
      JSON.stringify(apiData.calculationMetadata) : null
  };
}
