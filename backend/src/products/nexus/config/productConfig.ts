/**
 * Nexus Product Configuration
 * 
 * Defines product metadata, features, tiers, permissions, and integrations
 * for the Nexus HRIS (Human Resource Information System).
 */

export default {
  productId: 'nexus',
  productName: 'Nexus',
  displayName: 'Nexus - Human Resource Information System',
  version: '1.0.0',
  
  description: 'Enterprise-grade HRIS managing complete employee lifecycle, contracts, performance, benefits, and compliance',
  
  // Core and advanced features available in Nexus
  features: {
    core: [
      'employee_management',
      'user_accounts',
      'organizational_structure',
      'department_management',
      'location_management',
      'contract_management',
      'document_management',
      'basic_reports'
    ],
    advanced: [
      'performance_reviews',
      'performance_goals',
      'continuous_feedback',
      'benefits_administration',
      'time_off_management',
      'time_off_accruals',
      'attendance_tracking',
      'rule_engine',
      'contract_sequences',
      'advanced_analytics',
      'org_chart_visualization',
      'employee_self_service',
      'mobile_app',
      'api_access',
      'custom_workflows'
    ]
  },
  
  // Integration requirements
  integrations: {
    required: [], // Nexus is foundational, no hard dependencies
    optional: ['recruitiq', 'paylinq', 'schedulehub', 'background_check_providers', 'document_signing']
  },
  
  // Database configuration
  database: {
    schema: 'hris',
    tables: [
      'user_account',
      'department',
      'location',
      'employee',
      'contract_sequence_policy',
      'contract_sequence_step',
      'contract',
      'review_template',
      'performance_review',
      'performance_goal',
      'feedback',
      'benefits_plan',
      'employee_benefit_enrollment',
      'time_off_type',
      'employee_time_off_balance',
      'time_off_request',
      'time_off_accrual_history',
      'attendance_record',
      'rule_definition',
      'rule_execution_history',
      'document_category',
      'employee_document',
      'audit_log'
    ]
  },
  
  // Product tiers and pricing
  tiers: {
    starter: {
      name: 'Starter',
      displayName: 'Nexus Starter',
      price: {
        base: 99, // $99/month
        perEmployee: 3 // $3/employee
      },
      limits: {
        maxEmployees: 50,
        maxDepartments: 10,
        maxLocations: 5,
        historyMonths: 12,
        documentStorage: 5, // GB
        apiCalls: 0 // Not available
      },
      features: [
        'employee_management',
        'user_accounts',
        'organizational_structure',
        'department_management',
        'location_management',
        'basic_contract_management',
        'document_management',
        'basic_time_off',
        'basic_reports',
        'email_notifications'
      ]
    },
    professional: {
      name: 'Professional',
      displayName: 'Nexus Professional',
      price: {
        base: 299, // $299/month
        perEmployee: 5 // $5/employee
      },
      limits: {
        maxEmployees: 250,
        maxDepartments: 50,
        maxLocations: 20,
        historyMonths: 36,
        documentStorage: 50, // GB
        apiCalls: 50000 // per month
      },
      features: [
        'employee_management',
        'user_accounts',
        'organizational_structure',
        'department_management',
        'location_management',
        'contract_management',
        'contract_sequences',
        'document_management',
        'performance_reviews',
        'performance_goals',
        'benefits_administration',
        'time_off_management',
        'time_off_accruals',
        'attendance_tracking',
        'advanced_reports',
        'org_chart_visualization',
        'employee_self_service',
        'mobile_app',
        'api_access',
        'sms_notifications'
      ]
    },
    enterprise: {
      name: 'Enterprise',
      displayName: 'Nexus Enterprise',
      price: {
        base: 'custom',
        perEmployee: 'custom'
      },
      limits: {
        maxEmployees: Infinity,
        maxDepartments: Infinity,
        maxLocations: Infinity,
        historyMonths: Infinity,
        documentStorage: Infinity,
        apiCalls: Infinity
      },
      features: [
        'employee_management',
        'user_accounts',
        'organizational_structure',
        'department_management',
        'location_management',
        'contract_management',
        'contract_sequences',
        'document_management',
        'performance_reviews',
        'performance_goals',
        'continuous_feedback',
        'benefits_administration',
        'time_off_management',
        'time_off_accruals',
        'attendance_tracking',
        'rule_engine',
        'advanced_analytics',
        'org_chart_visualization',
        'employee_self_service',
        'mobile_app',
        'unlimited_api',
        'custom_workflows',
        'white_label',
        'dedicated_support',
        'custom_training',
        'sla_guarantees',
        'advanced_security',
        'audit_compliance'
      ]
    }
  },
  
  // Permissions for RBAC
  permissions: [
    // Employee Management
    'employees.view',
    'employees.create',
    'employees.edit',
    'employees.delete',
    'employees.view_sensitive', // SSN, salary, etc.
    
    // Organizational Structure
    'departments.manage',
    'locations.manage',
    'org_chart.view',
    
    // Contract Management
    'contracts.view',
    'contracts.create',
    'contracts.edit',
    'contracts.approve',
    'contract_policies.manage',
    
    // Performance Management
    'reviews.view',
    'reviews.create',
    'reviews.conduct',
    'reviews.approve',
    'goals.view',
    'goals.create',
    'goals.edit',
    'feedback.give',
    'feedback.view_team',
    
    // Benefits
    'benefits.view_plans',
    'benefits.manage_plans',
    'benefits.enroll',
    'benefits.approve_enrollment',
    
    // Time Off
    'timeoff.view_own',
    'timeoff.request',
    'timeoff.view_team',
    'timeoff.approve',
    'timeoff.manage_policies',
    
    // Attendance
    'attendance.clock_in',
    'attendance.view_own',
    'attendance.view_team',
    'attendance.manage',
    
    // Documents
    'documents.view_own',
    'documents.upload',
    'documents.view_team',
    'documents.view_all',
    'documents.manage',
    
    // Reporting & Analytics
    'reports.view',
    'reports.export',
    'analytics.view',
    
    // Administration
    'settings.manage',
    'users.manage',
    'rules.manage',
    'audit_log.view'
  ],
  
  // Predefined roles
  roles: [
    {
      roleId: 'hr_admin',
      name: 'HR Administrator',
      permissions: ['*'] // All permissions
    },
    {
      roleId: 'hr_manager',
      name: 'HR Manager',
      permissions: [
        'employees.*',
        'departments.manage',
        'locations.manage',
        'contracts.*',
        'reviews.*',
        'goals.*',
        'benefits.*',
        'timeoff.view_team',
        'timeoff.approve',
        'timeoff.manage_policies',
        'attendance.view_team',
        'attendance.manage',
        'documents.view_all',
        'documents.manage',
        'reports.*',
        'analytics.view'
      ]
    },
    {
      roleId: 'manager',
      name: 'Department Manager',
      permissions: [
        'employees.view',
        'employees.edit', // for their reports
        'org_chart.view',
        'reviews.view',
        'reviews.conduct',
        'goals.view',
        'goals.create',
        'feedback.give',
        'feedback.view_team',
        'benefits.view_plans',
        'timeoff.view_team',
        'timeoff.approve',
        'attendance.view_team',
        'documents.view_team',
        'reports.view'
      ]
    },
    {
      roleId: 'employee',
      name: 'Employee',
      permissions: [
        'employees.view', // limited to self and public profiles
        'org_chart.view',
        'reviews.view', // own reviews
        'goals.view', // own goals
        'goals.edit', // own goals
        'feedback.give',
        'benefits.view_plans',
        'benefits.enroll',
        'timeoff.view_own',
        'timeoff.request',
        'attendance.clock_in',
        'attendance.view_own',
        'documents.view_own',
        'documents.upload'
      ]
    },
    {
      roleId: 'payroll_specialist',
      name: 'Payroll Specialist',
      permissions: [
        'employees.view',
        'employees.view_sensitive', // need salary info
        'contracts.view',
        'attendance.view_team',
        'attendance.manage',
        'timeoff.view_team',
        'reports.view',
        'reports.export'
      ]
    }
  ],
  
  // API configuration
  api: {
    basePath: '/api/nexus',
    version: 'v1',
    rateLimit: {
      starter: {
        requests: 100,
        window: '15m'
      },
      professional: {
        requests: 1000,
        window: '15m'
      },
      enterprise: {
        requests: 10000,
        window: '15m'
      }
    }
  },
  
  // Event types published by Nexus
  events: {
    published: [
      'employee.created',
      'employee.updated',
      'employee.terminated',
      'employee.status_changed',
      'contract.created',
      'contract.renewed',
      'contract.expired',
      'contract.terminated',
      'review.completed',
      'goal.created',
      'goal.completed',
      'timeoff.requested',
      'timeoff.approved',
      'timeoff.rejected',
      'attendance.clocked_in',
      'attendance.clocked_out',
      'benefits.enrolled',
      'document.uploaded',
      'department.created',
      'location.created'
    ],
    subscribed: [
      'candidate.hired', // from RecruitIQ
      'organization.updated'
    ]
  },
  
  // Performance targets
  performance: {
    apiResponseTime: 200, // milliseconds (P95)
    employeeSearchTime: 100, // milliseconds
    orgChartGenerationTime: 500, // milliseconds for 1000 employees
    concurrentUsers: 1000,
    maxEmployees: 10000,
    uptime: 99.9 // percentage
  },
  
  // Compliance and security
  compliance: {
    gdpr: true,
    ccpa: true,
    hipaa: false, // can be enabled for healthcare customers
    soc2: false, // planned
    iso27001: false // planned
  },
  
  // Module configuration
  modules: {
    scheduling: {
      enabled: true, // ScheduleHub integration
      displayName: 'Workforce Scheduling',
      icon: 'calendar',
      route: '/scheduling'
    },
    recruitment: {
      enabled: true, // RecruitIQ integration
      displayName: 'Recruitment',
      icon: 'users',
      route: '/recruitment'
    },
    payroll: {
      enabled: true, // Paylinq integration
      displayName: 'Payroll',
      icon: 'dollar-sign',
      route: '/payroll'
    }
  }
};
