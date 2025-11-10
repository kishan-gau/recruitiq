/**
 * ScheduleHub Product Configuration
 * 
 * Defines product metadata, features, tiers, permissions, and integrations
 * for the ScheduleHub workforce scheduling platform.
 */

export default {
  productId: 'schedulehub',
  productName: 'ScheduleHub',
  displayName: 'ScheduleHub - Workforce Scheduling',
  version: '1.0.0',
  
  description: 'Advanced workforce scheduling and optimization platform for complex staffing needs',
  
  // Core and advanced features available in ScheduleHub
  features: {
    core: [
      'shift_scheduling',
      'station_management',
      'role_management',
      'employee_availability',
      'schedule_templates',
      'schedule_publishing',
      'notifications'
    ],
    advanced: [
      'shift_swapping',
      'shift_marketplace',
      'schedule_optimization',
      'demand_forecasting',
      'labor_analytics',
      'multi_location',
      'mobile_app',
      'api_access'
    ]
  },
  
  // Integration requirements
  integrations: {
    required: ['nexus'], // Needs employee data from HRIS
    optional: ['paylinq', 'pos_systems', 'biometric_devices', 'communication_platforms']
  },
  
  // Database configuration
  database: {
    schema: 'scheduling',
    tables: [
      'schedules',
      'shifts',
      'stations',
      'station_assignments',
      'roles',
      'employee_roles',
      'shift_role_requirements',
      'swap_marketplace',
      'swap_offers',
      'swap_credits',
      'employee_availability',
      'coverage_requirements',
      'optimization_history',
      'demand_history',
      'demand_forecasts',
      'service_level_targets'
    ]
  },
  
  // Product tiers and pricing
  tiers: {
    starter: {
      name: 'Starter',
      displayName: 'ScheduleHub Starter',
      price: {
        base: 49, // $49/month
        perEmployee: 2 // $2/employee
      },
      limits: {
        maxEmployees: 25,
        maxStations: 10,
        historyMonths: 3,
        optimizationRuns: 0, // Not available
        apiCalls: 0 // Not available
      },
      features: [
        'shift_scheduling',
        'station_management',
        'employee_availability',
        'basic_reports',
        'email_notifications'
      ]
    },
    professional: {
      name: 'Professional',
      displayName: 'ScheduleHub Professional',
      price: {
        base: 199, // $199/month
        perEmployee: 3 // $3/employee
      },
      limits: {
        maxEmployees: 100,
        maxStations: 50,
        historyMonths: 12,
        optimizationRuns: 100, // per month
        apiCalls: 10000 // per month
      },
      features: [
        'shift_scheduling',
        'station_management',
        'role_management',
        'shift_marketplace',
        'basic_optimization',
        'employee_availability',
        'advanced_reports',
        'mobile_app',
        'api_access',
        'sms_notifications'
      ]
    },
    enterprise: {
      name: 'Enterprise',
      displayName: 'ScheduleHub Enterprise',
      price: {
        base: 'custom',
        perEmployee: 'custom'
      },
      limits: {
        maxEmployees: Infinity,
        maxStations: Infinity,
        historyMonths: Infinity,
        optimizationRuns: Infinity,
        apiCalls: Infinity
      },
      features: [
        'shift_scheduling',
        'station_management',
        'role_management',
        'shift_marketplace',
        'advanced_optimization',
        'demand_forecasting',
        'employee_availability',
        'multi_location',
        'custom_integrations',
        'unlimited_api',
        'white_label',
        'dedicated_support',
        'custom_training',
        'sla_guarantees'
      ]
    }
  },
  
  // Permissions for RBAC
  permissions: [
    'schedules.view',
    'schedules.create',
    'schedules.edit',
    'schedules.delete',
    'schedules.publish',
    'stations.manage',
    'roles.manage',
    'swaps.view',
    'swaps.request',
    'swaps.approve',
    'swaps.reject',
    'optimization.run',
    'forecasting.view',
    'forecasting.manage',
    'analytics.view',
    'settings.manage',
    'reports.view',
    'reports.export'
  ],
  
  // Predefined roles
  roles: [
    {
      roleId: 'schedule_admin',
      name: 'Schedule Administrator',
      permissions: ['*'] // All permissions
    },
    {
      roleId: 'schedule_manager',
      name: 'Schedule Manager',
      permissions: [
        'schedules.*',
        'stations.manage',
        'roles.manage',
        'swaps.approve',
        'swaps.reject',
        'optimization.run',
        'analytics.view',
        'reports.*'
      ]
    },
    {
      roleId: 'team_lead',
      name: 'Team Lead',
      permissions: [
        'schedules.view',
        'swaps.view',
        'swaps.approve',
        'swaps.reject',
        'reports.view'
      ]
    },
    {
      roleId: 'employee',
      name: 'Employee',
      permissions: [
        'schedules.view',
        'swaps.view',
        'swaps.request'
      ]
    }
  ],
  
  // API configuration
  api: {
    basePath: '/api/schedulehub',
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
  
  // Event types published by ScheduleHub
  events: {
    published: [
      'schedule.created',
      'schedule.updated',
      'schedule.deleted',
      'schedule.published',
      'shift.created',
      'shift.updated',
      'shift.started',
      'shift.completed',
      'shift.cancelled',
      'swap.requested',
      'swap.approved',
      'swap.rejected',
      'swap.completed',
      'employee.assigned',
      'employee.unassigned',
      'optimization.completed',
      'forecast.generated'
    ],
    subscribed: [
      'employee.created',
      'employee.updated',
      'employee.terminated',
      'organization.updated'
    ]
  },
  
  // Performance targets
  performance: {
    apiResponseTime: 200, // milliseconds (P95)
    scheduleGenerationTime: 30000, // milliseconds for 50 employees
    concurrentUsers: 500,
    maxSchedules: 100000,
    uptime: 99.9 // percentage
  },
  
  // Compliance and security
  compliance: {
    gdpr: true,
    ccpa: true,
    soc2: false, // planned
    hipaa: false // for healthcare customers (future)
  }
};
