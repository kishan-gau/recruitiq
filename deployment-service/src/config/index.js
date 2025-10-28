require('dotenv').config();

module.exports = {
  // TransIP API Configuration
  transip: {
    accountName: process.env.TRANSIP_ACCOUNT_NAME,
    privateKeyPath: process.env.TRANSIP_PRIVATE_KEY_PATH,
    apiUrl: process.env.TRANSIP_API_URL || 'https://api.transip.nl/v6',
    tokenExpiry: parseInt(process.env.TRANSIP_TOKEN_EXPIRY || '1800', 10), // 30 minutes default
    readOnly: process.env.TRANSIP_READ_ONLY === 'true', // Prevents token from making changes
  },

  // Deployment Configuration
  deployment: {
    dryRun: process.env.DEPLOYMENT_DRY_RUN === 'true', // Prevents actual API calls that create invoices
    billingGuard: process.env.DEPLOYMENT_BILLING_GUARD === 'true', // Requires approval for invoice-generating calls
    maxConcurrentDeployments: parseInt(process.env.MAX_CONCURRENT_DEPLOYMENTS || '3', 10),
    defaultProductName: process.env.TRANSIP_DEFAULT_PRODUCT || 'vps-bladevps-x4', // Default VPS product
    defaultRegion: process.env.TRANSIP_DEFAULT_REGION || 'ams0',
  },

  // OpenStack Configuration
  openstack: {
    defaultProjectName: process.env.OPENSTACK_DEFAULT_PROJECT || 'recruitiq',
    defaultFlavor: process.env.OPENSTACK_DEFAULT_FLAVOR || 'm1.medium',
    defaultImage: process.env.OPENSTACK_DEFAULT_IMAGE || 'ubuntu-22.04',
  },

  // Redis Configuration (for queue)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    maxRetriesPerRequest: 3,
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.DEPLOYMENT_SERVICE_PORT || '5001', 10),
    env: process.env.NODE_ENV || 'development',
  },

  // License Manager Integration
  licenseManager: {
    baseUrl: process.env.LICENSE_MANAGER_URL || 'http://localhost:5000',
    apiKey: process.env.LICENSE_MANAGER_API_KEY,
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    requireAuth: process.env.REQUIRE_AUTH !== 'false',
  },
};
