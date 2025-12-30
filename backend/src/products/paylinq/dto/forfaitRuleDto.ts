/**
 * Forfait Rule DTO
 * Maps forfait_rules table between DB and API formats
 * 
 * @module products/paylinq/dto/forfaitRuleDto
 */

/**
 * Map single forfait rule from database to API format
 * @param {Object} dbRule - Forfait rule record from database (snake_case)
 * @returns {Object} Forfait rule in API format (camelCase)
 */
export function mapForfaitRuleDbToApi(dbRule: any): Record<string, any> | null {
  if (!dbRule) return null;

  return {
    id: dbRule.id,
    organizationId: dbRule.organization_id,
    ruleName: dbRule.rule_name,
    description: dbRule.description || null,
    sourceComponentId: dbRule.source_component_id,
    forfaitComponentId: dbRule.forfait_component_id,
    percentageRate: parseFloat(dbRule.percentage_rate),
    applyOnGross: dbRule.apply_on_gross,
    minAmount: dbRule.min_amount ? parseFloat(dbRule.min_amount) : null,
    maxAmount: dbRule.max_amount ? parseFloat(dbRule.max_amount) : null,
    catalogValue: dbRule.catalog_value || null,
    effectiveFrom: dbRule.effective_from,
    effectiveTo: dbRule.effective_to || null,
    isActive: dbRule.is_active,
    metadata: dbRule.metadata || {},
    createdBy: dbRule.created_by,
    createdAt: dbRule.created_at,
    updatedBy: dbRule.updated_by,
    updatedAt: dbRule.updated_at,
    deletedAt: dbRule.deleted_at || null,
    deletedBy: dbRule.deleted_by || null,
    
    // Include related component details if joined
    sourceComponent: dbRule.source_component_name ? {
      id: dbRule.source_component_id,
      name: dbRule.source_component_name,
      code: dbRule.source_component_code
    } : undefined,
    
    forfaitComponent: dbRule.forfait_component_name ? {
      id: dbRule.forfait_component_id,
      name: dbRule.forfait_component_name,
      code: dbRule.forfait_component_code
    } : undefined
  };
}

/**
 * Map array of forfait rules from database to API format
 * @param {Array} dbRules - Array of forfait rule records
 * @returns {Array} Array of forfait rules in API format
 */
export function mapForfaitRulesDbToApi(dbRules: any): Record<string, any> | null {
  if (!Array.isArray(dbRules)) return [];
  return dbRules.map(mapForfaitRuleDbToApi);
}

/**
 * Map forfait rule from API format to database format
 * @param {Object} apiData - Forfait rule data from API (camelCase)
 * @returns {Object} Forfait rule in database format (snake_case)
 */
export function mapForfaitRuleApiToDb(apiData: any): Record<string, any> {
  if (!apiData) return null;

  const dbData: Record<string, any> = {};

  if (apiData.ruleName !== undefined) {
    dbData.rule_name = apiData.ruleName;
  }
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  if (apiData.sourceComponentId !== undefined) {
    dbData.source_component_id = apiData.sourceComponentId;
  }
  if (apiData.forfaitComponentId !== undefined) {
    dbData.forfait_component_id = apiData.forfaitComponentId;
  }
  if (apiData.percentageRate !== undefined) {
    dbData.percentage_rate = apiData.percentageRate;
  }
  if (apiData.applyOnGross !== undefined) {
    dbData.apply_on_gross = apiData.applyOnGross;
  }
  if (apiData.minAmount !== undefined) {
    dbData.min_amount = apiData.minAmount;
  }
  if (apiData.maxAmount !== undefined) {
    dbData.max_amount = apiData.maxAmount;
  }
  if (apiData.catalogValue !== undefined) {
    dbData.catalog_value = apiData.catalogValue;
  }
  if (apiData.effectiveFrom !== undefined) {
    dbData.effective_from = apiData.effectiveFrom;
  }
  if (apiData.effectiveTo !== undefined) {
    dbData.effective_to = apiData.effectiveTo;
  }
  if (apiData.isActive !== undefined) {
    dbData.is_active = apiData.isActive;
  }
  if (apiData.metadata !== undefined) {
    dbData.metadata = apiData.metadata;
  }

  return dbData;
}
