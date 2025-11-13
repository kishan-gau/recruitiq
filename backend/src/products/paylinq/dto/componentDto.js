/**
 * Component DTO
 * 
 * Data Transfer Object for pay component records.
 * Handles mapping between database schema and API format.
 * 
 * Database Format (snake_case):
 * - component_code, component_name, component_type
 * - calculation_metadata (JSONB)
 * 
 * API Format (camelCase):
 * - componentCode, componentName, componentType
 * - calculationMetadata (parsed object)
 * 
 * @module products/paylinq/dto/componentDto
 */

/**
 * Map a single component from database format to API format
 * @param {Object} dbComponent - Component record from database
 * @returns {Object} Component in API format
 */
export function mapComponentDbToApi(dbComponent) {
  if (!dbComponent) return null;

  return {
    id: dbComponent.id,
    organizationId: dbComponent.organization_id,
    componentCode: dbComponent.component_code,
    componentName: dbComponent.component_name,
    componentType: dbComponent.component_type,
    description: dbComponent.description || null,
    
    // JSONB calculation_metadata
    calculationMetadata: dbComponent.calculation_metadata || {},
    
    // Configuration
    isActive: dbComponent.is_active,
    isTaxable: dbComponent.is_taxable,
    isSystemDefined: dbComponent.is_system_defined,
    displayOrder: dbComponent.display_order,
    
    // UI
    icon: dbComponent.icon || null,
    color: dbComponent.color || null,
    category: dbComponent.category || null,
    
    // Audit
    createdBy: dbComponent.created_by,
    createdAt: dbComponent.created_at,
    updatedBy: dbComponent.updated_by,
    updatedAt: dbComponent.updated_at
  };
}

/**
 * Map array of components from database format to API format
 * @param {Array} dbComponents - Array of component records
 * @returns {Array} Array of components in API format
 */
export function mapComponentsDbToApi(dbComponents) {
  if (!Array.isArray(dbComponents)) return [];
  
  return dbComponents.map(mapComponentDbToApi);
}

/**
 * Map component from API format to database format
 * @param {Object} apiData - Component data from API request
 * @returns {Object} Component in database format
 */
export function mapComponentApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Only include fields that are present in the API data
  if (apiData.componentCode !== undefined) {
    dbData.component_code = apiData.componentCode;
  }
  if (apiData.componentName !== undefined) {
    dbData.component_name = apiData.componentName;
  }
  if (apiData.componentType !== undefined) {
    dbData.component_type = apiData.componentType;
  }
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  if (apiData.calculationMetadata !== undefined) {
    dbData.calculation_metadata = apiData.calculationMetadata;
  }
  if (apiData.isActive !== undefined) {
    dbData.is_active = apiData.isActive;
  }
  if (apiData.isTaxable !== undefined) {
    dbData.is_taxable = apiData.isTaxable;
  }
  if (apiData.displayOrder !== undefined) {
    dbData.display_order = apiData.displayOrder;
  }
  if (apiData.icon !== undefined) {
    dbData.icon = apiData.icon;
  }
  if (apiData.color !== undefined) {
    dbData.color = apiData.color;
  }
  if (apiData.category !== undefined) {
    dbData.category = apiData.category;
  }

  return dbData;
}

/**
 * Map component to summary format (for dropdowns)
 * @param {Object} dbComponent - Component record from database
 * @returns {Object} Component summary
 */
export function mapComponentToSummary(dbComponent) {
  if (!dbComponent) return null;

  return {
    id: dbComponent.id,
    componentCode: dbComponent.component_code,
    componentName: dbComponent.component_name,
    componentType: dbComponent.component_type,
    icon: dbComponent.icon || null,
    color: dbComponent.color || null
  };
}

/**
 * Map array of components to summary format
 * @param {Array} dbComponents - Array of component records
 * @returns {Array} Array of component summaries
 */
export function mapComponentsToSummary(dbComponents) {
  if (!Array.isArray(dbComponents)) return [];
  
  return dbComponents.map(mapComponentToSummary);
}

/**
 * Map payroll run component (breakdown) from database to API format
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
 * Group components by type for summary display
 * @param {Array} components - Array of components
 * @returns {Object} Components grouped by type { earnings: [], taxes: [], deductions: [] }
 */
export function groupComponentsByType(components) {
  const grouped = {
    earnings: [],
    taxes: [],
    deductions: []
  };

  if (!Array.isArray(components)) return grouped;

  components.forEach(component => {
    const type = component.componentType || component.component_type;
    if (grouped[type]) {
      grouped[type].push(component);
    }
  });

  return grouped;
}

/**
 * Map payroll run components with tax calculation metadata for component breakdown endpoint (PHASE 2)
 * @param {Array<Object>} dbComponents - Array of payroll_run_component records from database
 * @returns {Object} Structured component breakdown with earnings, taxes, and summary
 */
export function mapComponentsToBreakdown(dbComponents) {
  if (!Array.isArray(dbComponents) || dbComponents.length === 0) {
    return {
      earnings: [],
      deductions: [],
      taxes: [],
      benefits: [],
      summary: {
        totalEarnings: 0,
        totalTaxFree: 0,
        totalTaxable: 0,
        totalTaxes: 0,
        totalDeductions: 0,
        netPay: 0
      }
    };
  }

  const earnings = [];
  const deductions = [];
  const taxes = [];
  const benefits = [];

  let totalEarnings = 0;
  let totalTaxFree = 0;
  let totalTaxable = 0;
  let totalTaxes = 0;
  let totalDeductions = 0;

  for (const dbComp of dbComponents) {
    const amount = parseFloat(dbComp.amount) || 0;

    // Extract tax calculation if present in metadata
    const taxCalc = dbComp.calculation_metadata?.taxCalculation;

    switch (dbComp.component_type) {
      case 'earning':
        totalEarnings += amount;
        
        if (taxCalc) {
          totalTaxFree += taxCalc.taxFreeAllowance || 0;
          totalTaxable += taxCalc.taxableIncome || 0;
        }

        earnings.push({
          componentCode: dbComp.component_code,
          componentName: dbComp.component_name,
          amount,
          isTaxable: taxCalc ? taxCalc.isTaxable : true,
          calculationMetadata: taxCalc ? {
            grossAmount: taxCalc.amount,
            taxFreeAmount: taxCalc.taxFreeAllowance || 0,
            taxableAmount: taxCalc.taxableIncome || 0,
            wageTax: taxCalc.wageTax || 0,
            aovTax: taxCalc.aovTax || 0,
            awwTax: taxCalc.awwTax || 0,
            totalTax: taxCalc.totalTax || 0,
            allowanceType: taxCalc.calculationMetadata?.allowanceType || null,
            yearlyUsage: taxCalc.calculationMetadata?.yearlyUsage || null,
            yearlyRemaining: taxCalc.calculationMetadata?.yearlyRemaining || null
          } : null
        });

        // Add corresponding tax components
        if (taxCalc && taxCalc.wageTax > 0) {
          taxes.push({
            componentCode: `WAGE_TAX_${dbComp.component_code}`,
            componentName: `Wage Tax (${dbComp.component_name})`,
            amount: taxCalc.wageTax,
            relatedTo: dbComp.component_code
          });
          totalTaxes += taxCalc.wageTax;
        }

        if (taxCalc && taxCalc.aovTax > 0) {
          taxes.push({
            componentCode: `AOV_${dbComp.component_code}`,
            componentName: `AOV Tax (${dbComp.component_name})`,
            amount: taxCalc.aovTax,
            relatedTo: dbComp.component_code
          });
          totalTaxes += taxCalc.aovTax;
        }

        if (taxCalc && taxCalc.awwTax > 0) {
          taxes.push({
            componentCode: `AWW_${dbComp.component_code}`,
            componentName: `AWW Tax (${dbComp.component_name})`,
            amount: taxCalc.awwTax,
            relatedTo: dbComp.component_code
          });
          totalTaxes += taxCalc.awwTax;
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
        totalTaxes += amount;
        taxes.push({
          componentCode: dbComp.component_code,
          componentName: dbComp.component_name,
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

  const netPay = totalEarnings - totalTaxes - totalDeductions;

  return {
    earnings,
    deductions,
    taxes,
    benefits,
    summary: {
      totalEarnings,
      totalTaxFree,
      totalTaxable,
      totalTaxes,
      totalDeductions,
      netPay
    }
  };
}
