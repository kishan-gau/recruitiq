/**
 * Paylinq Product Configuration
 * 
 * Defines product metadata, database schema, routing, feature tiers,
 * and integration points for the Paylinq payroll management system.
 * 
 * @module products/paylinq/config
 */

export default {
  // Product Identity
  id: 'paylinq',
  name: 'Paylinq',
  displayName: 'Paylinq Payroll',
  version: '1.0.0',
  description: 'Enterprise Payroll Management System for Suriname',
  
  // Routing Configuration
  routes: {
    prefix: '/api/payroll',
    version: 'v1'
  },
  
  // Database Configuration
  database: {
    schema: 'payroll',
    
    // All 35 tables from Enhanced Paylinq ERD
    tables: [
      // Worker Type Management (2 tables)
      'worker_type_template',
      'worker_type',
      
      // Employee & Compensation (3 tables)
      'employee_payroll_config',
      'compensation',
      'employee_pay_component_assignment',
      
      // Pay Components (2 tables)
      'pay_component',
      'component_formula',
      
      // Tax Engine (4 tables)
      'tax_rule_set',
      'tax_bracket',
      'allowance',
      'deductible_cost_rule',
      
      // Time & Attendance (5 tables)
      'shift_type',
      'time_attendance_event',
      'time_entry',
      'rated_time_line',
      'timesheet',
      
      // Scheduling (2 tables)
      'work_schedule',
      'schedule_change_request',
      
      // Payroll Processing (3 tables)
      'payroll_run',
      'paycheck',
      'payroll_run_component',
      
      // Deductions & Payments (2 tables)
      'employee_deduction',
      'payment_transaction',
      
      // Reconciliation (3 tables)
      'reconciliation',
      'reconciliation_item',
      'payroll_adjustment',
      
      // Audit & History (9 tables)
      'employee_record_history',
      'compensation_history',
      'worker_type_history',
      'tax_rule_set_history',
      'pay_component_history',
      'payroll_run_history',
      'paycheck_history',
      'time_entry_history',
      'schedule_history'
    ]
  },
  
  // Feature Tiers
  // NOTE: Tier configurations are managed dynamically in the 'tier_presets' database table.
  // This section defines the supported tier names and default feature mappings for reference.
  tiers: {
    supported: ['starter', 'professional', 'enterprise'],
    
    // Feature catalog (used for tier preset creation)
    availableFeatures: [
      // Core Payroll
      'basic_payroll',
      'advanced_payroll',
      'payroll_processing',
      
      // Time & Attendance
      'timesheets',
      'time_attendance',
      'clock_in_out',
      'shift_management',
      
      // Payment Methods
      'direct_deposit',
      'check_printing',
      'cash_payment',
      
      // Tax & Compliance
      'basic_tax_calculation',
      'advanced_tax_calculation',
      'multi_jurisdiction_tax',
      'tax_filing_support',
      
      // Worker Types
      'single_worker_type',
      'multi_worker_types',
      'unlimited_worker_types',
      
      // Pay Components
      'standard_pay_components',
      'employee_component_assignments',
      'formula_engine',
      'advanced_formulas',
      
      // Scheduling
      'basic_scheduling',
      'advanced_scheduling',
      'automated_scheduling',
      
      // Reports & Analytics
      'standard_reports',
      'advanced_reports',
      'custom_reports',
      'analytics_dashboard',
      
      // Reconciliation
      'basic_reconciliation',
      'advanced_reconciliation',
      'automated_reconciliation',
      
      // Integration & API
      'api_access',
      'webhooks',
      'sso_integration',
      'hris_integration',
      
      // Multi-Currency & Location
      'multi_currency',
      'multi_state',
      'multi_country',
      
      // Additional Features
      'payment_tracking',
      'employee_portal',
      'mobile_app',
      'document_management',
      'audit_trail'
    ],
    
    // Paylinq-specific limit fields (used in tier presets)
    limitFields: {
      maxEmployees: 'Maximum number of employees in payroll',
      maxPayrollRuns: 'Maximum number of payroll runs (-1 for unlimited)',
      maxWorkerTypes: 'Maximum worker type templates',
      maxPayComponents: 'Maximum pay component definitions',
      maxCustomFormulas: 'Maximum custom formula definitions',
      storageGB: 'Storage limit in GB',
      reportRetentionMonths: 'Report retention period in months'
    }
  },
  
  // Dependencies on other products/modules
  dependencies: ['core', 'platform'],
  
  // Optional integrations
  optionalIntegrations: ['nexus'], // HRIS integration
  
  // Integration Events
  integrations: {
    // Events this product emits
    provides: [
      'payroll.run.created',
      'payroll.run.processed',
      'payroll.run.completed',
      'paycheck.generated',
      'paycheck.paid',
      'timesheet.submitted',
      'timesheet.approved',
      'schedule.changed',
      'reconciliation.completed'
    ],
    
    // Events this product consumes
    consumes: [
      'employee.created',       // From Nexus HRIS
      'employee.updated',       // From Nexus HRIS
      'employee.terminated',    // From Nexus HRIS
      'employee.rehired',       // From Nexus HRIS
      'department.changed',     // From Nexus HRIS
      'compensation.changed'    // From Nexus HRIS
    ]
  },
  
  // API Rate Limits
  // NOTE: Rate limits are also stored in tier_presets.features JSONB field
  // These are default values used if not specified in tier preset
  rateLimits: {
    default: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    }
  },
  
  // Compliance & Regulations
  compliance: {
    regions: ['SR'], // Suriname
    regulations: [
      'WAGE_TAX_DECREE',
      'AOV_ACT',
      'AWW_ACT',
      'LABOR_CODE_SURINAME'
    ],
    dataRetention: {
      payrollRecords: 84, // 7 years (months)
      taxRecords: 84,     // 7 years (months)
      timesheets: 36,     // 3 years (months)
      auditLogs: 60       // 5 years (months)
    }
  },
  
  // Security Settings
  security: {
    encryptionRequired: true,
    encryptedFields: [
      'bank_account_number',
      'routing_number',
      'tax_id',
      'national_id',
      'salary_amount'
    ],
    auditLogEnabled: true,
    mfaRequired: true, // For payroll admins
    ipWhitelisting: false, // Enterprise feature
    sessionTimeout: 30 // minutes
  },
  
  // Background Jobs
  jobs: {
    enabled: true,
    schedules: {
      'payroll-reminders': '0 8 * * 1', // Weekly Monday 8am
      'timesheet-reminders': '0 17 * * 5', // Weekly Friday 5pm
      'tax-filing-reminders': '0 9 1 * *', // Monthly 1st 9am
      'reconciliation-check': '0 10 15 * *', // Monthly 15th 10am
      'backup-payroll-data': '0 2 * * *', // Daily 2am
      'cleanup-expired-sessions': '0 */6 * * *' // Every 6 hours
    }
  },
  
  // Feature Flags (for gradual rollout)
  featureFlags: {
    formulaEngineV2: false, // Phase 2: Advanced formula engine
    biometricTimeTracking: false, // Phase 2: Biometric integration
    automatedScheduling: false, // Phase 2: AI-powered scheduling
    bankReconciliation: false, // Phase 2: Automated bank reconciliation
    multiJurisdictionTax: false, // Phase 2: Multi-state/country tax
    paymentProcessing: false, // Phase 2: Direct ACH initiation
    mobilePushNotifications: false, // Phase 2: Mobile push
    voiceCommands: false // Phase 2: Voice-activated features
  },
  
  // Tier Management Utilities
  tierManagement: {
    /**
     * Get tier preset from database
     * @param {string} tierName - Tier name (starter, professional, enterprise)
     * @param {Object} db - Database connection
     * @returns {Promise<Object>} Tier preset configuration
     */
    async getTierPreset(tierName, db) {
      const result = await db.query(
        `SELECT * FROM tier_presets 
         WHERE tier_name = $1 AND is_active = true 
         ORDER BY effective_date DESC, version DESC 
         LIMIT 1`,
        [tierName]
      );
      return result.rows[0] || null;
    },
    
    /**
     * Validate if feature is enabled for tier
     * @param {string} featureName - Feature to check
     * @param {Object} tierPreset - Tier preset from database
     * @returns {boolean} Whether feature is enabled
     */
    isFeatureEnabled(featureName, tierPreset) {
      if (!tierPreset || !tierPreset.features) return false;
      const features = Array.isArray(tierPreset.features) 
        ? tierPreset.features 
        : tierPreset.features.features || [];
      return features.includes(featureName) || features.includes('all');
    },
    
    /**
     * Check if limit is exceeded
     * @param {string} limitName - Limit field name
     * @param {number} currentValue - Current usage
     * @param {Object} tierPreset - Tier preset from database
     * @returns {boolean} Whether limit is exceeded
     */
    isLimitExceeded(limitName, currentValue, tierPreset) {
      if (!tierPreset) return true;
      
      // Map limit names to tier preset fields
      const limitMapping = {
        maxEmployees: 'max_employees',
        maxPayrollRuns: 'max_payroll_runs',
        maxWorkerTypes: 'max_worker_types',
        maxPayComponents: 'max_pay_components'
      };
      
      const dbField = limitMapping[limitName] || limitName;
      const limitValue = tierPreset[dbField] || tierPreset.features?.[dbField];
      
      // -1 means unlimited
      if (limitValue === -1 || limitValue === '-1') return false;
      
      return currentValue >= limitValue;
    }
  }
};
