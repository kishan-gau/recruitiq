# RecruitIQ Docker Development - Quick Reference

## 🚀 Quick Start Commands

### Basic Setup (Database Only)
```powershell
cd backend/docker-init
.\setup.ps1
```

### Setup with Tenant Creation
```powershell
cd backend/docker-init
.\setup.ps1 -LicenseId "<existing-license-uuid>" -CustomerId "<existing-customer-uuid>"
```

### Validation & Testing
```powershell
# Validate current setup
.\validate.ps1

# Test both scenarios
.\test-workflow.ps1 -FullTest

# Test with tenant creation
.\test-workflow.ps1 -TestLicenseId "<uuid>" -TestCustomerId "<uuid>" -FullTest
```

## 🔧 Management Commands

### Environment Management
```powershell
# Clean reset
.\setup.ps1 -Reset

# View current configuration
Get-Content ..\.env

# Check service status
docker-compose ps
```

### Database Access
```powershell
# Database console
docker-compose exec postgres psql -U postgres -d recruitiq

# View tenant data
docker-compose exec postgres psql -U postgres -d recruitiq -c "SELECT * FROM customer_licenses;"

# Monitor logs
docker-compose logs -f postgres
```

### Manual Tenant Creation
```powershell
# If you have license/customer IDs from existing database
docker-compose exec backend node scripts/onboard-tenant.js \
  --license-id "<existing-license-uuid>" \
  --customer-id "<existing-customer-uuid>" \
  --email "admin@company.com" \
  --name "Company Name"
```

## 📋 Parameter Reference

### Required for Tenant Creation
- `DEFAULT_LICENSE_ID`: UUID from existing customer_licenses table
- `DEFAULT_CUSTOMER_ID`: UUID from existing customers table  
- `DEFAULT_ADMIN_EMAIL`: Admin email for the tenant
- `DEFAULT_ORG_NAME`: Organization name for the tenant

### Where to Find IDs
The license-id and customer-id values come from your existing database records:
- Run existing RecruitIQ instance
- Check customer_licenses and customers tables
- Use those UUIDs for tenant creation in development

## 🎯 Common Workflows

### First Time Setup
1. `.\setup.ps1` (basic database)
2. `.\validate.ps1` (confirm working)
3. Manual tenant creation when needed

### Development with Tenant
1. Get license/customer IDs from production
2. `.\setup.ps1 -LicenseId "<id>" -CustomerId "<id>"`
3. `.\validate.ps1` (confirm tenant created)

### Testing & Validation
1. `.\test-workflow.ps1` (basic test)
2. `.\test-workflow.ps1 -FullTest` (comprehensive)
3. Check logs for any issues

### Clean Reset
1. `.\setup.ps1 -Reset`
2. `.\setup.ps1` (fresh start)

## 🚨 Troubleshooting

### Container Issues
```powershell
# Restart services
docker-compose restart

# Full rebuild
docker-compose down -v
.\setup.ps1
```

### Database Issues
```powershell
# Check database connection
docker-compose exec postgres pg_isready

# View initialization logs
docker-compose logs postgres | Select-String -Pattern "init"
```

### Tenant Creation Issues
```powershell
# Verify parameters in .env
Get-Content ..\.env | Select-String -Pattern "DEFAULT_"

# Manual tenant creation
docker-compose exec backend node scripts/onboard-tenant.js --help
```

## 📚 More Information

- Full documentation: `README.md` → Docker Development Setup
- Backend architecture: `backend/ROUTING_ARCHITECTURE.md`
- Tenant onboarding: `backend/TENANT_ONBOARDING.md`