/**
 * Benefits DTO
 * Maps benefit data between API format (camelCase) and database format (snake_case)
 */

/**
 * Map benefit plan from API to database format
 * @param {Object} apiData - Benefit plan data from API (camelCase)
 * @returns {Object} Database format (snake_case)
 */
export function mapPlanApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Required fields - support both camelCase (API) and snake_case (direct DB format)
  if (apiData.planName !== undefined || apiData.plan_name !== undefined) {
    dbData.plan_name = apiData.plan_name || apiData.planName;
  }
  if (apiData.planCode !== undefined || apiData.plan_code !== undefined) {
    dbData.plan_code = apiData.plan_code || apiData.planCode;
  }
  if (apiData.category !== undefined || apiData.plan_type !== undefined) {
    dbData.plan_type = apiData.plan_type || apiData.category; // Map category to plan_type
  }
  
  // Optional fields
  if (apiData.description !== undefined) dbData.description = apiData.description;
  if (apiData.providerName !== undefined || apiData.provider_name !== undefined) {
    dbData.provider_name = apiData.provider_name || apiData.providerName;
  }
  if (apiData.providerContact !== undefined || apiData.provider_contact !== undefined) {
    dbData.provider_contact = apiData.provider_contact || apiData.providerContact;
  }
  if (apiData.policyNumber !== undefined || apiData.policy_number !== undefined) {
    dbData.policy_number = apiData.policy_number || apiData.policyNumber;
  }
  
  // Cost fields
  if (apiData.employeeContribution !== undefined || apiData.employee_cost !== undefined) {
    dbData.employee_cost = apiData.employee_cost || apiData.employeeContribution;
  }
  if (apiData.employerContribution !== undefined || apiData.employer_contribution !== undefined) {
    dbData.employer_contribution = apiData.employer_contribution || apiData.employerContribution;
  }
  if (apiData.deductible !== undefined) dbData.deductible = apiData.deductible;
  if (apiData.outOfPocketMax !== undefined || apiData.out_of_pocket_max !== undefined) {
    dbData.out_of_pocket_max = apiData.out_of_pocket_max || apiData.outOfPocketMax;
  }
  
  // Coverage fields
  if (apiData.coverageLevels !== undefined || apiData.coverage_level !== undefined) {
    const rawCoverageLevel = apiData.coverage_level || apiData.coverageLevels;
    // Convert array to the first level and map frontend values to database values
    let coverageLevel = Array.isArray(rawCoverageLevel) 
      ? rawCoverageLevel[0] 
      : rawCoverageLevel;
    
    // Map frontend values (with dashes) to database values (with underscores)
    const coverageLevelMap = {
      'employee-only': 'employee',
      'employee-spouse': 'employee_spouse',
      'employee-children': 'employee_children',
      'family': 'family'
    };
    
    dbData.coverage_level = coverageLevelMap[coverageLevel] || coverageLevel || 'employee';
  }
  if (apiData.coverageStartDay !== undefined || apiData.coverage_start_day !== undefined) {
    dbData.coverage_start_day = apiData.coverage_start_day || apiData.coverageStartDay;
  }
  
  // Eligibility fields
  if (apiData.eligibilityRules !== undefined || apiData.eligibility_rules !== undefined) {
    dbData.eligibility_rules = apiData.eligibility_rules || apiData.eligibilityRules;
  }
  if (apiData.waitingPeriodDays !== undefined || apiData.waiting_period_days !== undefined) {
    dbData.waiting_period_days = apiData.waiting_period_days || apiData.waitingPeriodDays;
  }
  
  // Date fields
  if (apiData.planYearStart !== undefined || apiData.effective_date !== undefined) {
    dbData.effective_date = apiData.effective_date || apiData.planYearStart;
  }
  if (apiData.planYearEnd !== undefined || apiData.termination_date !== undefined) {
    dbData.termination_date = apiData.termination_date || apiData.planYearEnd;
  }
  
  // Document fields
  if (apiData.summaryDocumentUrl !== undefined || apiData.summary_document_url !== undefined) {
    dbData.summary_document_url = apiData.summary_document_url || apiData.summaryDocumentUrl;
  }
  if (apiData.handbookUrl !== undefined || apiData.handbook_url !== undefined) {
    dbData.handbook_url = apiData.handbook_url || apiData.handbookUrl;
  }
  
  // Status field
  if (apiData.status !== undefined) {
    dbData.is_active = apiData.status === 'active';
  } else if (apiData.is_active !== undefined) {
    dbData.is_active = apiData.is_active;
  }

  // Default contribution frequency
  if (apiData.contributionFrequency !== undefined || apiData.contribution_frequency !== undefined) {
    dbData.contribution_frequency = apiData.contribution_frequency || apiData.contributionFrequency;
  } else {
    dbData.contribution_frequency = 'monthly';
  }

  return dbData;
}

/**
 * Map benefit plan from database to API format
 * @param {Object} dbData - Benefit plan data from database (snake_case)
 * @returns {Object} API format (camelCase)
 */
export function mapPlanDbToApi(dbData) {
  if (!dbData) return null;

  return {
    id: dbData.id,
    organizationId: dbData.organization_id,
    planName: dbData.plan_name,
    planCode: dbData.plan_code || dbData.plan_name, // Fallback if plan_code doesn't exist
    category: dbData.plan_type,
    description: dbData.description,
    status: dbData.is_active ? 'active' : 'inactive',
    
    providerName: dbData.provider_name,
    providerContact: dbData.provider_contact,
    policyNumber: dbData.policy_number,
    
    employeeContribution: parseFloat(dbData.employee_cost) || 0,
    employerContribution: parseFloat(dbData.employer_contribution) || 0,
    deductible: dbData.deductible ? parseFloat(dbData.deductible) : null,
    outOfPocketMax: dbData.out_of_pocket_max ? parseFloat(dbData.out_of_pocket_max) : null,
    
    // Map database values (with underscores) back to frontend values (with dashes)
    coverageLevels: dbData.coverage_level 
      ? [dbData.coverage_level.replace(/_/g, '-')] 
      : ['employee-only'],
    coverageStartDay: dbData.coverage_start_day || 1,
    
    // Convert JSONB to string if it's an object, otherwise return as-is
    eligibilityRules: typeof dbData.eligibility_rules === 'object' && dbData.eligibility_rules !== null
      ? JSON.stringify(dbData.eligibility_rules)
      : dbData.eligibility_rules,
    waitingPeriodDays: dbData.waiting_period_days || 0,
    
    planYearStart: dbData.effective_date,
    planYearEnd: dbData.termination_date,
    
    summaryDocumentUrl: dbData.summary_document_url,
    handbookUrl: dbData.handbook_url,
    
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
    createdBy: dbData.created_by,
    updatedBy: dbData.updated_by,
  };
}

/**
 * Map multiple plans from database to API format
 * @param {Array} dbPlans - Array of benefit plans from database
 * @returns {Array} Array in API format
 */
export function mapPlansDbToApi(dbPlans) {
  if (!Array.isArray(dbPlans)) return [];
  return dbPlans.map(mapPlanDbToApi);
}
