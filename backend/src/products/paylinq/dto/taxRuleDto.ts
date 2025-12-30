/**
 * Tax Rule DTO Mappers
 * Converts between database snake_case and API camelCase
 */

/**
 * Map tax rule set from database to API format
 */
export function mapTaxRuleSetDbToApi(dbRule: any): Record<string, any> | null {
  if (!dbRule) return null;
  
  return {
    id: dbRule.id,
    organizationId: dbRule.organization_id,
    taxType: dbRule.tax_type,
    taxName: dbRule.tax_name,
    country: dbRule.country,
    state: dbRule.state,
    locality: dbRule.locality,
    effectiveFrom: dbRule.effective_from,
    effectiveTo: dbRule.effective_to,
    annualCap: dbRule.annual_cap,
    calculationMethod: dbRule.calculation_method,
    calculationMode: dbRule.calculation_mode,
    description: dbRule.description,
    createdAt: dbRule.created_at,
    updatedAt: dbRule.updated_at,
    deletedAt: dbRule.deleted_at,
    createdBy: dbRule.created_by,
    updatedBy: dbRule.updated_by,
    deletedBy: dbRule.deleted_by,
  };
}

/**
 * Map tax bracket from database to API format
 */
export function mapTaxBracketDbToApi(dbBracket: any): Record<string, any> | null {
  if (!dbBracket) return null;
  
  return {
    id: dbBracket.id,
    organizationId: dbBracket.organization_id,
    taxRuleSetId: dbBracket.tax_rule_set_id,
    bracketOrder: dbBracket.bracket_order,
    minIncome: dbBracket.income_min,
    maxIncome: dbBracket.income_max,
    taxRate: dbBracket.rate_percentage,
    standardDeduction: dbBracket.fixed_amount || 0,
    additionalDeduction: 0,
    createdAt: dbBracket.created_at,
    updatedAt: dbBracket.updated_at,
    deletedAt: dbBracket.deleted_at,
  };
}

/**
 * Map API tax rule data to database format
 */
export function mapTaxRuleSetApiToDb(apiData: any): Record<string, any> | null {
  if (!apiData) return null;
  
  const dbData: Record<string, any> = {};
  
  if (apiData.taxType !== undefined) dbData.tax_type = apiData.taxType;
  if (apiData.taxName !== undefined) dbData.tax_name = apiData.taxName;
  if (apiData.country !== undefined) dbData.country = apiData.country;
  if (apiData.state !== undefined) dbData.state = apiData.state;
  if (apiData.locality !== undefined) dbData.locality = apiData.locality;
  if (apiData.effectiveFrom !== undefined) dbData.effective_from = apiData.effectiveFrom;
  if (apiData.effectiveTo !== undefined) dbData.effective_to = apiData.effectiveTo;
  if (apiData.annualCap !== undefined) dbData.annual_cap = apiData.annualCap;
  if (apiData.calculationMethod !== undefined) dbData.calculation_method = apiData.calculationMethod;
  if (apiData.calculationMode !== undefined) dbData.calculation_mode = apiData.calculationMode;
  if (apiData.description !== undefined) dbData.description = apiData.description;
  
  return dbData;
}
