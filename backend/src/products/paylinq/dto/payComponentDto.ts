/**
 * Pay Component DTO
 * 
 * Data Transfer Object for pay component records (pay_components table).
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
 * @module products/paylinq/dto/payComponentDto
 */

/**
 * Map a single component from database format to API format
 * @param {Object} dbComponent - Component record from database
 * @returns {Object} Component in API format
 */
export function mapComponentDbToApi(dbComponent: any): Record<string, any> | null {
  if (!dbComponent) return null;

  return {
    id: dbComponent.id,
    organizationId: dbComponent.organization_id,
    componentCode: dbComponent.component_code,
    componentName: dbComponent.component_name,
    componentType: dbComponent.component_type,
    description: dbComponent.description || null,
    
    // Calculation configuration
    calculationType: dbComponent.calculation_type, // 'fixed_amount', 'percentage', 'hourly_rate', 'formula'
    defaultRate: dbComponent.default_rate || null,
    defaultAmount: dbComponent.default_amount || null,
    
    // Formula (simple formula expression stored on the component)
    formula: dbComponent.formula || null,
    
    // JSONB calculation_metadata
    calculationMetadata: dbComponent.calculation_metadata || {},
    
    // Configuration - database uses 'status' column, not 'is_active'
    isActive: dbComponent.status === 'active',
    isTaxable: dbComponent.is_taxable,
    isSystemDefined: dbComponent.is_system_component, // Map is_system_component to isSystemDefined
    displayOrder: dbComponent.display_order,
    
    // Multi-currency support
    defaultCurrency: dbComponent.default_currency || null,
    allowCurrencyOverride: dbComponent.allow_currency_override !== false,
    
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
export function mapComponentsDbToApi(dbComponents: any): Record<string, any> | null {
  if (!Array.isArray(dbComponents)) return [];
  
  return dbComponents.map(mapComponentDbToApi);
}

/**
 * Map component from API format to database format
 * @param {Object} apiData - Component data from API request
 * @returns {Object} Component in database format
 */
export function mapComponentApiToDb(apiData: any): Record<string, any> | null {
  if (!apiData) return null;

  const dbData: Record<string, any> = {};

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
  if (apiData.calculationType !== undefined) {
    dbData.calculation_type = apiData.calculationType;
  }
  if (apiData.defaultRate !== undefined) {
    dbData.default_rate = apiData.defaultRate;
  }
  if (apiData.defaultAmount !== undefined) {
    dbData.default_amount = apiData.defaultAmount;
  }
  if (apiData.formula !== undefined) {
    dbData.formula = apiData.formula;
  }
  if (apiData.calculationMetadata !== undefined) {
    dbData.calculation_metadata = apiData.calculationMetadata;
  }
  if (apiData.isActive !== undefined) {
    // Database uses 'status' column, not 'is_active'
    dbData.status = apiData.isActive ? 'active' : 'inactive';
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
  if (apiData.isRecurring !== undefined) {
    dbData.is_recurring = apiData.isRecurring;
  }
  if (apiData.isPreTax !== undefined) {
    dbData.is_pre_tax = apiData.isPreTax;
  }
  if (apiData.isSystemComponent !== undefined) {
    dbData.is_system_component = apiData.isSystemComponent;
  }
  if (apiData.appliesToGross !== undefined) {
    dbData.applies_to_gross = apiData.appliesToGross;
  }
  if (apiData.appliesToOvertime !== undefined) {
    dbData.applies_to_overtime = apiData.appliesToOvertime;
  }
  if (apiData.affectsTaxableIncome !== undefined) {
    dbData.affects_taxable_income = apiData.affectsTaxableIncome;
  }
  if (apiData.metadata !== undefined) {
    dbData.metadata = apiData.metadata;
  }
  if (apiData.defaultCurrency !== undefined) {
    dbData.default_currency = apiData.defaultCurrency;
  }
  if (apiData.allowCurrencyOverride !== undefined) {
    dbData.allow_currency_override = apiData.allowCurrencyOverride;
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
 * Group components by type for summary display
 * @param {Array} components - Array of components (API or DB format)
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
