/**
 * Run Component DTO
 * 
 * Data Transfer Object for payroll run component records (payroll_run_components table).
 * Handles mapping between database schema and API format.
 * 
 * Database Format (snake_case):
 * - run_id, component_code, component_name, component_type
 * - calculation_metadata (JSONB)
 * 
 * API Format (camelCase):
 * - runId, componentCode, componentName, componentType
 * - calculationMetadata (parsed object)
 * 
 * @module products/paylinq/dto/runComponentDto
 */

/**
 * Map payroll run component from database to API format
 * Used for the component breakdown in a payroll run
 * 
 * @param {Object} dbRunComponent - Run component record from database
 * @returns {Object} Run component in API format
 */
export function mapRunComponentDbToApi(dbRunComponent) {
  if (!dbRunComponent) return null;

  return {
    id: dbRunComponent.id,
    runId: dbRunComponent.run_id,
    componentCode: dbRunComponent.component_code,
    componentName: dbRunComponent.component_name,
    componentType: dbRunComponent.component_type,
    
    // Amounts
    amount: parseFloat(dbRunComponent.amount) || 0,
    
    // Metadata
    calculationMetadata: dbRunComponent.calculation_metadata || {},
    
    // Config
    isTaxable: dbRunComponent.is_taxable,
    displayOrder: dbRunComponent.display_order,
    
    // Audit
    createdAt: dbRunComponent.created_at
  };
}

/**
 * Map array of run components from database to API format
 * @param {Array} dbRunComponents - Array of run component records
 * @returns {Array} Array of run components in API format
 */
export function mapRunComponentsDbToApi(dbRunComponents) {
  if (!Array.isArray(dbRunComponents)) return [];
  
  return dbRunComponents.map(mapRunComponentDbToApi);
}

/**
 * Map run component from API format to database format
 * @param {Object} apiData - Run component data from API
 * @returns {Object} Run component in database format
 */
export function mapRunComponentApiToDb(apiData) {
  if (!apiData) return null;

  return {
    run_id: apiData.runId,
    component_code: apiData.componentCode,
    component_name: apiData.componentName,
    component_type: apiData.componentType,
    amount: apiData.amount,
    calculation_metadata: apiData.calculationMetadata || {},
    is_taxable: apiData.isTaxable !== undefined ? apiData.isTaxable : true,
    display_order: apiData.displayOrder || 999
  };
}

/**
 * Map payroll run components with tax calculation metadata for component breakdown endpoint (PHASE 2)
 * @param {Array<Object>} dbComponents - Array of payroll_run_component records from database
 * @returns {Object} Structured component breakdown with earnings, taxes, and summary
 */
export function mapRunComponentsToBreakdown(dbComponents) {
  // Validate input
  if (dbComponents === null || dbComponents === undefined) {
    throw new Error('Components array is required');
  }

  if (!Array.isArray(dbComponents)) {
    throw new Error('Components must be an array');
  }

  if (dbComponents.length === 0) {
    return {
      earnings: [],
      deductions: [],
      taxes: [],
      benefits: [],
      summary: {
        totalEarnings: 0,
        totalTaxFree: 0,
        totalTaxable: 0,
        totalWageTax: 0,
        totalAovTax: 0,
        totalAwwTax: 0,
        totalTaxes: 0,
        totalDeductions: 0,
        netPay: 0
      }
    };
  }

  // Validate required fields
  for (const comp of dbComponents) {
    if (!comp.component_code || !comp.component_name || comp.amount === undefined) {
      throw new Error('Component must have component_code, component_name, and amount');
    }
  }

  const earnings = [];
  const deductions = [];
  const taxMap = new Map(); // Use map to aggregate taxes by type
  const benefits = [];

  let totalEarnings = 0;
  let totalTaxFree = 0;
  let totalTaxable = 0;
  let totalWageTax = 0;
  let totalAovTax = 0;
  let totalAwwTax = 0;
  let totalDeductions = 0;

  for (const dbComp of dbComponents) {
    const amount = parseFloat(dbComp.amount) || 0;

    // Extract tax calculation if present in metadata
    const taxCalc = dbComp.calculation_metadata?.taxCalculation;

    switch (dbComp.component_type) {
      case 'earning':
        totalEarnings += amount;
        
        const taxFreeAmount = parseFloat(taxCalc?.taxFreeAmount) || 0;
        const taxableAmount = parseFloat(taxCalc?.taxableAmount) || 0;
        const wageTax = parseFloat(taxCalc?.wageTax) || 0;
        const aovTax = parseFloat(taxCalc?.aovTax) || 0;
        const awwTax = parseFloat(taxCalc?.awwTax) || 0;
        const totalTax = parseFloat(taxCalc?.totalTax) || 0;

        if (taxCalc) {
          totalTaxFree += taxFreeAmount;
          totalTaxable += taxableAmount;
          totalWageTax += wageTax;
          totalAovTax += aovTax;
          totalAwwTax += awwTax;
        }

        earnings.push({
          componentId: dbComp.id,
          componentCode: dbComp.component_code,
          componentName: dbComp.component_name,
          amount,
          taxFreeAmount,
          taxableAmount,
          wageTax,
          aovTax,
          awwTax,
          totalTax,
          allowanceType: taxCalc?.allowanceType,
          allowanceApplied: taxFreeAmount,
          effectiveTaxRate: taxCalc?.effectiveTaxRate,
          isTaxable: dbComp.is_taxable !== false
        });

        // Aggregate tax components
        if (wageTax > 0) {
          const existing = taxMap.get('WAGE_TAX') || { amount: 0, totalTax: 0 };
          taxMap.set('WAGE_TAX', {
            componentCode: 'WAGE_TAX',
            componentName: 'Wage Tax',
            componentType: 'tax',
            amount: existing.amount + wageTax,
            totalTax: existing.totalTax + wageTax
          });
        }

        if (aovTax > 0) {
          const existing = taxMap.get('AOV') || { amount: 0 };
          taxMap.set('AOV', {
            componentCode: 'AOV',
            componentName: 'AOV (Old Age Pension)',
            componentType: 'tax',
            amount: existing.amount + aovTax
          });
        }

        if (awwTax > 0) {
          const existing = taxMap.get('AWW') || { amount: 0 };
          taxMap.set('AWW', {
            componentCode: 'AWW',
            componentName: 'AWW (Widow/Orphan)',
            componentType: 'tax',
            amount: existing.amount + awwTax
          });
        }
        break;

      case 'deduction':
        totalDeductions += amount;
        deductions.push({
          componentCode: dbComp.component_code,
          componentName: dbComp.component_name,
          amount,
          deductionType: dbComp.calculation_metadata?.deductionType || 'other',
          isPreTax: dbComp.calculation_metadata?.isPreTax || false
        });
        break;

      case 'tax':
        taxes.push({
          componentCode: dbComp.component_code,
          componentName: dbComp.component_name,
          componentType: 'tax',
          amount,
          relatedTo: dbComp.calculation_metadata?.relatedComponent || null
        });
        break;

      case 'benefit':
        benefits.push({
          componentCode: dbComp.component_code,
          componentName: dbComp.component_name,
          amount,
          benefitType: dbComp.calculation_metadata?.benefitType || 'other'
        });
        break;
    }
  }

  // Convert tax map to array
  const taxes = Array.from(taxMap.values());
  const totalTaxes = totalWageTax + totalAovTax + totalAwwTax;
  const netPay = totalEarnings - totalTaxes;

  return {
    earnings,
    deductions,
    taxes,
    benefits,
    summary: {
      totalEarnings,
      totalTaxFree,
      totalTaxable,
      totalWageTax,
      totalAovTax,
      totalAwwTax,
      totalTaxes,
      totalDeductions,
      netPay
    }
  };
}
