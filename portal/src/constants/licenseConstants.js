/**
 * License Management Constants
 */

export const TIER_PRESETS = {
  starter: {
    maxUsers: 10,
    maxWorkspaces: 1,
    maxJobs: 50,
    maxCandidates: 500,
    features: ['basic']
  },
  professional: {
    maxUsers: 50,
    maxWorkspaces: 5,
    maxJobs: null,
    maxCandidates: 5000,
    features: ['basic', 'analytics', 'api', 'customBranding', 'mfa']
  },
  enterprise: {
    maxUsers: null,
    maxWorkspaces: null,
    maxJobs: null,
    maxCandidates: null,
    features: ['basic', 'analytics', 'api', 'customBranding', 'mfa', 'sso', 'integrations', 'whiteLabel']
  }
};

export const TIER_INFO = [
  {
    value: 'starter',
    title: 'Starter',
    price: '$49/user/mo',
    features: [
      'Up to 10 users',
      '1 workspace',
      '50 jobs',
      '500 candidates',
      'Basic security'
    ]
  },
  {
    value: 'professional',
    title: 'Professional',
    price: '$99/user/mo',
    features: [
      'Up to 50 users',
      '5 workspaces',
      'Unlimited jobs',
      '5,000 candidates',
      'Analytics',
      'API access',
      '🔐 Multi-Factor Authentication (MFA)'
    ]
  },
  {
    value: 'enterprise',
    title: 'Enterprise',
    price: 'Custom',
    features: [
      'Unlimited users',
      'Unlimited workspaces',
      'Unlimited everything',
      '🔐 Multi-Factor Authentication (MFA)',
      'SSO/SAML',
      'White-label',
      'Dedicated support'
    ]
  }
];

export const DEPLOYMENT_TYPES = [
  {
    value: 'cloud-shared',
    title: 'Cloud Shared (SaaS)',
    description: 'Multi-tenant shared infrastructure'
  },
  {
    value: 'cloud-dedicated',
    title: 'Cloud Dedicated',
    description: 'Isolated instance in your cloud'
  },
  {
    value: 'on-premise',
    title: 'On-Premise',
    description: 'Customer hosts on their infrastructure'
  }
];

export const DURATION_OPTIONS = [
  { value: 1, label: '1 Month' },
  { value: 3, label: '3 Months' },
  { value: 6, label: '6 Months' },
  { value: 12, label: '12 Months (1 Year)' },
  { value: 24, label: '24 Months (2 Years)' },
  { value: 36, label: '36 Months (3 Years)' }
];

export const SESSION_POLICY_OPTIONS = [
  {
    value: 'single',
    title: 'Single Session (License Enforcement)',
    description: 'Only 1 active session per user. Ideal for preventing credential sharing.',
    icon: '🔐'
  },
  {
    value: 'multiple',
    title: 'Multiple Sessions',
    description: 'Allow users to login from multiple devices simultaneously.',
    icon: '📱'
  }
];

export const MAX_SESSIONS_OPTIONS = [
  { value: 1, label: '1 Session' },
  { value: 2, label: '2 Sessions' },
  { value: 3, label: '3 Sessions' },
  { value: 5, label: '5 Sessions (Recommended)' },
  { value: 10, label: '10 Sessions' }
];

export const FORM_STEPS = [
  { number: 1, title: 'Customer Info' },
  { number: 2, title: 'Deployment' },
  { number: 3, title: 'License Tier' },
  { number: 4, title: 'Limits & Duration' },
  { number: 5, title: 'Security & Sessions' },
  { number: 6, title: 'Review' }
];

export const INITIAL_FORM_DATA = {
  // Step 1: Customer Info
  name: '',
  contactName: '',
  contactEmail: '',
  
  // Step 2: Deployment
  deploymentType: 'cloud-dedicated',
  instanceUrl: '',
  
  // Step 3: License Tier
  tier: 'professional',
  
  // Step 4: Limits
  maxUsers: 50,
  maxWorkspaces: 5,
  maxJobs: null,
  maxCandidates: 5000,
  durationMonths: 12,
  
  // Step 5: Security & Sessions
  sessionPolicy: 'multiple',
  maxSessionsPerUser: 5,
  concurrentLoginDetection: true,
  mfaRequired: false,
  
  // Step 6: Features
  features: ['basic', 'analytics', 'api']
};
