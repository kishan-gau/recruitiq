# Docker Database Auto-Initialization

This directory contains scripts for automatic database initialization when the PostgreSQL Docker container starts.

## 🚀 Ultra-Quick Start (Windows)

**One-command setup:**
```powershell
.\docker-init\setup.ps1
```

This PowerShell script will:
- ✅ Create .env file from template with secure defaults
- ✅ Generate secure PostgreSQL password automatically  
- ✅ Start Docker containers with auto-initialization
- ✅ Create default tenant: "DevCorp Solutions" with admin@devcorp.local

**Custom organization setup:**
```powershell
.\docker-init\setup.ps1 -OrgName "Your Company" -AdminEmail "admin@yourcompany.com" -AdminName "John Doe"
```

**Reset and start fresh:**
```powershell
.\docker-init\setup.ps1 -Reset
```

**Check initialization status:**
```powershell
.\docker-init\validate.ps1
```

## 🐧 Manual Setup (Linux/Mac)

1. **Copy environment configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file with your values:**
   ```bash
   # Required: Set a secure PostgreSQL password
   POSTGRES_PASSWORD=your_secure_postgres_password
   
   # Optional: Customize default tenant
   DEFAULT_ORG_NAME=Your Company Name
   DEFAULT_ADMIN_EMAIL=admin@yourcompany.com
   DEFAULT_ADMIN_NAME=Admin User
   ```

3. **Start the services:**
   ```bash
   docker-compose up -d
   ```

## ✨ What Gets Initialized

The database will be automatically initialized with:
- ✅ Complete schema (35+ migrations)
- ✅ Production seeds (platform data, RBAC, permissions)
- ✅ Default tenant with admin user
- ✅ All products enabled (Nexus, PayLinQ, RecruitIQ, ScheduleHub)

## 📋 What Gets Initialized

### Phase 1: Database Schema
- Runs all migrations from `migrations/` directory
- Creates complete RecruitIQ database schema
- Sets up all tables, indexes, and constraints

### Phase 2: Production Seeds
- **001_seed_products.js** - Platform products (Nexus, PayLinQ, etc.)
- **002_seed_features.js** - Product features and capabilities
- **003_platform_rbac.js** - Core platform roles and permissions
- **004_nexus_permissions.js** - HRIS module permissions
- **005_paylinq_permissions.js** - Payroll module permissions
- **006_recruitiq_permissions.js** - Recruitment module permissions
- **007_tier_presets.js** - Subscription tier configurations

### Phase 3: Default Tenant Creation
- Creates organization with specified name
- Sets up admin user with temporary password
- Assigns premium tier and enterprise customer type
- Enables all platform products
- Seeds organization-specific RBAC data

## ⚙️ Configuration Options

All configuration is done through environment variables in `.env`:

```bash
# Database Configuration
POSTGRES_PASSWORD=required_secure_password
POSTGRES_USER=postgres
POSTGRES_DB=recruitiq_dev

# Default Tenant Configuration
DEFAULT_ORG_NAME=DevCorp Solutions
DEFAULT_ADMIN_EMAIL=admin@devcorp.local
DEFAULT_ADMIN_NAME=Admin User
DEFAULT_TIER=premium
DEFAULT_CUSTOMER_TYPE=enterprise
```

## 🔧 Available Scripts

The initialization system uses these npm scripts:

- `npm run migrate:latest` - Run all pending migrations
- `npm run seed:production` - Run production seed files
- `node scripts/onboard-tenant.js` - Create new tenant

## 📁 File Structure

```
backend/
├── docker-init/
│   ├── docker-entrypoint-init.sh     # Main Docker initialization script
│   ├── init-database.sh              # Alternative comprehensive init script
│   └── setup-schema.sh               # Simple setup script
├── migrations/                       # Database schema migrations
├── seeds/production/                 # Production seed data
├── scripts/
│   └── onboard-tenant.js            # Tenant onboarding script
└── docker-compose.yml               # Docker configuration
```

## 🐛 Troubleshooting

### Database Initialization Fails
1. Check Docker logs:
   ```bash
   docker-compose logs postgres
   ```

2. Verify environment variables are set:
   ```bash
   docker-compose config
   ```

### Tenant Creation Fails
- The script continues even if tenant creation fails (tenant may already exist)
- Check logs for admin password output
- Manually run tenant creation if needed:
  ```bash
  docker-compose exec postgres node scripts/onboard-tenant.js --orgName "Test Org"
  ```

### Reinitialization
To reinitialize the database completely:

```bash
# Stop services and remove volumes
docker-compose down -v

# Start fresh (will trigger reinitialization)
docker-compose up -d
```

## 🔒 Security Notes

- Always use strong passwords for `POSTGRES_PASSWORD`
- The admin password is generated automatically and logged during initialization
- Default tenant is for development only - remove/change for production
- Never commit `.env` file with real credentials

## 🎯 Expected Output

When initialization completes successfully, you'll see:

```
🎉 Database initialization completed successfully!
==========================================
Your RecruitIQ development environment is ready!

Default tenant details:
  Organization: DevCorp Solutions
  Admin Email: admin@devcorp.local
  Login URL: http://localhost:3001/login

The admin password was logged above during tenant creation.
==========================================
```

## 📚 Related Documentation

- [Backend Standards](../docs/BACKEND_STANDARDS.md)
- [Database Standards](../docs/DATABASE_STANDARDS.md)
- [Tenant Onboarding Guide](../TENANT_ONBOARDING.md)