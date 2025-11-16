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
export function mapComponentDbToApi(dbComponent) {
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
