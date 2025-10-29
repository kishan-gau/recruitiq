import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Application
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  apiVersion: process.env.API_VERSION || 'v1',
  appName: process.env.APP_NAME || 'RecruitIQ',
  appUrl: process.env.APP_URL || 'http://localhost:4000',
  
  // Database
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    name: process.env.DATABASE_NAME || 'recruitiq_dev',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    ssl: process.env.DATABASE_SSL === 'true',
    pool: {
      min: parseInt(process.env.DATABASE_POOL_MIN, 10) || 2,
      max: parseInt(process.env.DATABASE_POOL_MAX, 10) || 10,
    },
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    accessSecret: process.env.JWT_SECRET, // Alias for compatibility
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    accessExpiresIn: process.env.JWT_EXPIRES_IN || '7d', // Alias
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  // Redis
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  
  // Secrets Management
  secrets: {
    provider: process.env.SECRETS_PROVIDER || 'environment', // 'aws', 'azure', 'vault', 'barbican', 'environment'
    cacheTTL: parseInt(process.env.SECRETS_CACHE_TTL, 10) || 300, // 5 minutes in seconds
    
    // AWS Secrets Manager
    aws: {
      region: process.env.AWS_SECRETS_REGION || process.env.AWS_REGION || 'us-east-1',
    },
    
    // Azure Key Vault
    azure: {
      vaultUrl: process.env.AZURE_KEY_VAULT_URL,
    },
    
    // HashiCorp Vault
    vault: {
      endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
      token: process.env.VAULT_TOKEN,
      namespace: process.env.VAULT_NAMESPACE || 'secret',
    },
    
    // TransIP/OpenStack Barbican
    barbican: {
      endpoint: process.env.BARBICAN_ENDPOINT,
      token: process.env.BARBICAN_TOKEN,
      projectId: process.env.BARBICAN_PROJECT_ID,
      authUrl: process.env.OPENSTACK_AUTH_URL,
      username: process.env.OPENSTACK_USERNAME,
      password: process.env.OPENSTACK_PASSWORD,
    },
  },
  
  // Email
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    },
    from: process.env.EMAIL_FROM || 'noreply@recruitiq.com',
    fromName: process.env.EMAIL_FROM_NAME || 'RecruitIQ',
  },
  
  // AWS
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3: {
      bucket: process.env.AWS_S3_BUCKET || 'recruitiq-uploads',
      region: process.env.AWS_S3_BUCKET_REGION || 'us-east-1',
    },
  },
  
  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  },
  
  // Frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  },
  
  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 min
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    requireHttps: process.env.REQUIRE_HTTPS === 'true' || process.env.NODE_ENV === 'production',
    trustProxy: process.env.TRUST_PROXY === 'true',
    sessionSecret: process.env.SESSION_SECRET,
    cookieMaxAge: parseInt(process.env.COOKIE_MAX_AGE, 10) || 86400000, // 24 hours
  },
  
  // Encryption
  encryption: {
    masterKey: process.env.ENCRYPTION_MASTER_KEY,
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bits
  },
  
  // TLS/SSL
  tls: {
    enabled: process.env.TLS_ENABLED === 'true' || process.env.NODE_ENV === 'production',
    certPath: process.env.TLS_CERT_PATH,
    keyPath: process.env.TLS_KEY_PATH,
    caPath: process.env.TLS_CA_PATH,
    minVersion: process.env.TLS_MIN_VERSION || 'TLSv1.3',
    maxVersion: process.env.TLS_MAX_VERSION || 'TLSv1.3',
  },
  
  // Redis (for rate limiting and caching)
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
  },
  
  // Security Monitoring
  monitoring: {
    enabled: process.env.SECURITY_MONITORING_ENABLED !== 'false',
    alertChannels: (process.env.ALERT_CHANNELS || 'log').split(','),
    webhookUrl: process.env.ALERT_WEBHOOK_URL,
    
    // CloudWatch
    cloudwatch: {
      enabled: process.env.CLOUDWATCH_ENABLED === 'true',
      namespace: process.env.CLOUDWATCH_NAMESPACE || 'RecruitIQ/Security',
      region: process.env.CLOUDWATCH_REGION || process.env.AWS_REGION || 'us-east-1',
    },
    
    // Datadog
    datadog: {
      enabled: process.env.DATADOG_ENABLED === 'true',
      apiKey: process.env.DATADOG_API_KEY,
      appKey: process.env.DATADOG_APP_KEY,
      site: process.env.DATADOG_SITE || 'datadoghq.com',
      service: process.env.DATADOG_SERVICE || 'recruitiq',
    },
  },
  
  // Deployment Configuration
  deployment: {
    type: process.env.DEPLOYMENT_TYPE || 'onpremise', // 'cloud' or 'onpremise'
    tenantId: process.env.TENANT_ID, // Required for cloud multi-tenant SaaS
    instanceId: process.env.INSTANCE_ID || process.env.HOSTNAME || 'unknown',
  },
  
  // Central Logging (for cloud instances only)
  centralLogging: {
    enabled: process.env.CENTRAL_LOGGING_ENABLED === 'true',
    host: process.env.CENTRAL_LOG_DB_HOST,
    port: parseInt(process.env.CENTRAL_LOG_DB_PORT, 10) || 5432,
    database: process.env.CENTRAL_LOG_DB_NAME || 'platform_logs',
    user: process.env.CENTRAL_LOG_DB_USER,
    password: process.env.CENTRAL_LOG_DB_PASSWORD,
    ssl: process.env.CENTRAL_LOG_DB_SSL !== 'false',
  },
  
  // Central Monitoring (for cloud instances only)
  centralMonitoring: {
    enabled: process.env.CENTRAL_MONITORING_ENABLED === 'true',
    host: process.env.CENTRAL_MONITOR_DB_HOST,
    port: parseInt(process.env.CENTRAL_MONITOR_DB_PORT, 10) || 5432,
    database: process.env.CENTRAL_MONITOR_DB_NAME || 'platform_logs',
    user: process.env.CENTRAL_MONITOR_DB_USER,
    password: process.env.CENTRAL_MONITOR_DB_PASSWORD,
    ssl: process.env.CENTRAL_MONITOR_DB_SSL !== 'false',
  },
  
  // Feature Flags
  features: {
    websockets: process.env.ENABLE_WEBSOCKETS === 'true',
    fileUploads: process.env.ENABLE_FILE_UPLOADS === 'true',
    emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
    auditLogs: process.env.ENABLE_AUDIT_LOGS === 'true',
  },
  
  // License
  license: {
    apiUrl: process.env.LICENSE_API_URL || 'https://license.recruitiq.com',
    checkIntervalHours: parseInt(process.env.LICENSE_CHECK_INTERVAL_HOURS, 10) || 24,
  },
};

// Validation
if (!config.jwt.secret || config.jwt.secret.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}

if (!config.jwt.refreshSecret || config.jwt.refreshSecret.length < 32) {
  console.error('❌ JWT_REFRESH_SECRET must be at least 32 characters long');
  process.exit(1);
}

if (!config.database.url && !config.database.host) {
  console.error('❌ Database configuration is missing');
  process.exit(1);
}

export default config;
