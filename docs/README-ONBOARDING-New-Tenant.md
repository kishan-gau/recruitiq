# Tenant Onboarding Script

This document explains how to manually onboard a new tenant on their VPS after license creation.

## Overview

The tenant onboarding process has been decoupled from license creation to provide better control and separation between the platform and tenant infrastructure. When a new license is created in the portal, you must manually run the onboarding script on the tenant's VPS to complete the setup.

## Process Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TENANT ONBOARDING FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

1. Portal Admin (platform.recruitiq.com)
   ├─ Create customer record
   ├─ Create license for customer
   └─ Copy onboarding command from response

2. Connect to Tenant VPS
   ├─ SSH into tenant's VPS
   └─ Navigate to backend directory

3. Run Onboarding Script
   ├─ Execute node scripts/onboard-tenant.js with parameters
   ├─ Script creates organization, admin user, and seed data
   └─ Script outputs temporary password

4. Send Welcome Email
   ├─ Email admin with credentials
   ├─ Include login URL
   └─ Instruct to change password on first login
```

## Prerequisites

- License created in platform portal
- Customer record exists
- SSH access to tenant's VPS
- Backend application deployed on VPS
- Database initialized and migrated

## Usage

### Method 1: Command Line Arguments

```bash
node scripts/onboard-tenant.js \
  --license-id=550e8400-e29b-41d4-a716-446655440000 \
  --customer-id=660e8400-e29b-41d4-a716-446655440000 \
  --email=admin@acmecorp.com \
  --name="Acme Corporation" \
  --tier=professional \
  --products=nexus,paylinq \
  --country=SR
```

### Method 2: Environment Variables

```bash
export LICENSE_ID=550e8400-e29b-41d4-a716-446655440000
export CUSTOMER_ID=660e8400-e29b-41d4-a716-446655440000
export CUSTOMER_EMAIL=admin@acmecorp.com
export CUSTOMER_NAME="Acme Corporation"
export TIER=professional
export PRODUCTS=nexus,paylinq
export COUNTRY=SR

node scripts/onboard-tenant.js
```

### Method 3: Copy from License Creation Response

When you create a license in the portal, the response includes a ready-to-use command:

```json
{
  "license": { ... },
  "message": "License created successfully...",
  "onboardingCommand": "node scripts/onboard-tenant.js --license-id=... --customer-id=... --email=... --name=\"...\""
}
```

Just copy and paste this command on the tenant's VPS.

## Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `--license-id` | Yes | - | UUID of the created license |
| `--customer-id` | Yes | - | UUID of the customer record |
| `--email` | Yes | - | Admin user email address |
| `--name` | Yes | - | Organization name |
| `--tier` | No | `starter` | License tier (starter/professional/enterprise) |
| `--products` | No | `nexus` | Comma-separated product list |
| `--country` | No | `SR` | Country code (SR, NL, US, etc.) |

## Products

Available products to enable:

- **nexus** - HRIS (Human Resources Information System)
- **paylinq** - Payroll Management System
- **schedulehub** - Scheduling and Time Tracking
- **recruitiq** - Applicant Tracking System

## License Tiers

- **starter** - Basic tier with limited features
- **professional** - Standard tier with full features
- **enterprise** - Premium tier with advanced features

## What the Script Does

The onboarding script performs the following operations:

### 1. Organization Creation
- Creates organization record with provided name
- Generates unique slug from name
- Sets license tier and enabled products
- Configures default settings (timezone, locale, currency)

### 2. Admin User Creation
- Creates admin user account
- Generates secure temporary password (16 characters)
- Hashes password using bcrypt (12 rounds)
- Assigns super_admin role

### 3. RBAC Seeding
- Creates 9 tenant-level roles:
  - `super_admin` - Full system access
  - `org_admin` - Organization management
  - `hr_manager` - HR operations
  - `payroll_admin` - Payroll management
  - `hr_user` - Basic HR operations
  - `employee` - Employee self-service
  - `recruiter` - Recruitment functions
  - `hiring_manager` - Hiring decisions
  - `interviewer` - Interview participation
- Assigns permissions to each role

### 4. HRIS Data (Nexus Product)
- Seeds 6 worker types:
  - Full-time
  - Part-time
  - Contract
  - Temporary
  - Internship
  - Consultant

### 5. Payroll Data (PayLinQ Product)
- Seeds 5 payroll run types:
  - Regular payroll (monthly)
  - 13th Month / Bonus (annual)
  - Vacation Pay (annual)
  - Severance / Final Pay (ad-hoc)
  - Commission (monthly)
- Seeds 30+ pay components (earnings/deductions)
- Seeds Suriname-specific components (for SR country):
  - Forfaitair allowances
  - Tax-free allowances
  - Standard deductions

### 6. Tax Rules (Country-Specific)
- **Suriname (SR)**: Seeds progressive tax brackets (0%-38%)
- **Netherlands (NL)**: Seeds Dutch tax system (if implemented)
- **Other countries**: Skips tax rules (configure manually)

### 7. Global Templates
- Formula templates (available to all organizations)
- Calculation templates
- Report templates

## Output

The script outputs detailed progress and a summary:

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                      TENANT ONBOARDING SCRIPT                             ║
║                          RecruitIQ Platform                               ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 CONFIGURATION:
   License ID:  550e8400-e29b-41d4-a716-446655440000
   Customer ID: 660e8400-e29b-41d4-a716-446655440000
   Email:       admin@acmecorp.com
   Name:        Acme Corporation
   Tier:        professional
   Products:    nexus, paylinq
   Country:     SR

🔌 Verifying database connection...
✅ Database connection established

🔍 Verifying license...
✅ License found: LIC-ACME-2025-001
   Status: active
   Expires: 2026-12-02

🚀 Starting tenant initialization...

[1/8] Creating organization...
[OK] Organization created: 770e8400-e29b-41d4-a716-446655440000

[2/8] Creating admin user...
[OK] Admin user created: 880e8400-e29b-41d4-a716-446655440000

[3/8] Seeding RBAC roles...
[OK] Created 9 roles with permissions

[4/8] Seeding worker types...
[OK] Created 6 worker types

[5/8] Seeding payroll run types...
[OK] Created 5 run types

[6/8] Seeding pay components...
[OK] Created 31 components

[7/8] Seeding tax rules...
[OK] Created 6 tax brackets for SR

[8/8] Finalizing...
[OK] Tenant onboarding complete

✅ TENANT ONBOARDING COMPLETED SUCCESSFULLY!

📊 SUMMARY:
   Organization ID:  770e8400-e29b-41d4-a716-446655440000
   Organization:     Acme Corporation
   Slug:             acme-corporation
   Admin User ID:    880e8400-e29b-41d4-a716-446655440000
   Admin Email:      admin@acmecorp.com
   Temp Password:    Xy9$mK2#nP4@vL8!
   Roles Created:    9
   Duration:         45.23s

📧 NEXT STEPS:
   1. Send welcome email to admin@acmecorp.com
   2. Include temporary password and login instructions
   3. Admin should change password on first login
   4. Configure DNS if using custom domain
   5. Verify SSL certificate is active

⚠️  IMPORTANT:
   - Store the temporary password securely
   - It will be shown only once
   - Admin must change it on first login
```

## Error Handling

The script includes comprehensive error handling:

### Common Errors

**License not found:**
```
❌ License not found: 550e8400-e29b-41d4-a716-446655440000
   Please verify the license ID and try again.
```

**Database connection failed:**
```
❌ TENANT ONBOARDING FAILED!

ERROR DETAILS:
   Message: connect ECONNREFUSED 127.0.0.1:5432

TROUBLESHOOTING:
   1. Verify database connection is working
   2. Check database credentials in .env
   3. Ensure PostgreSQL is running
```

**Duplicate organization:**
```
❌ TENANT ONBOARDING FAILED!

ERROR DETAILS:
   Message: duplicate key value violates unique constraint "organizations_slug_key"

TROUBLESHOOTING:
   1. Organization with this name already exists
   2. Choose a different organization name
   3. Or delete existing organization if this is a retry
```

## Rollback

If onboarding fails partway through, the transaction will automatically rollback. However, if you need to manually clean up:

```sql
-- Connect to database
psql -U postgres -d recruitiq_tenant

-- Delete organization and cascading data
DELETE FROM organizations WHERE id = '770e8400-e29b-41d4-a716-446655440000';

-- Verify cleanup
SELECT COUNT(*) FROM organizations WHERE name = 'Acme Corporation';
```

## Security Considerations

1. **Temporary Password**: 
   - Generated with high entropy (16 chars, mixed case, numbers, symbols)
   - Must be changed on first login
   - Never store in plain text

2. **SSH Access**:
   - Use SSH keys, not passwords
   - Restrict SSH to specific IPs if possible
   - Use non-standard SSH port

3. **Database Access**:
   - Script uses connection from .env
   - Ensure .env has proper permissions (600)
   - Never commit .env to version control

4. **Logging**:
   - Script logs to stdout
   - Capture output for audit trail
   - Don't log passwords or sensitive data

## Welcome Email Template

After successful onboarding, send this email to the admin:

```
Subject: Welcome to RecruitIQ - Your Account is Ready

Dear [Customer Name],

Your RecruitIQ account has been successfully set up and is ready to use!

LOGIN DETAILS:
- URL: https://[tenant-domain].recruitiq.com
- Email: [admin@email.com]
- Temporary Password: [temp-password]

IMPORTANT:
⚠️ You must change your password upon first login for security reasons.

WHAT'S NEXT:
1. Log in using the credentials above
2. Change your password immediately
3. Complete your organization profile
4. Invite team members
5. Configure your workspace settings

ENABLED PRODUCTS:
✓ Nexus - Human Resources Management
✓ PayLinQ - Payroll Processing
[Add others as applicable]

SUPPORT:
If you need assistance, contact our support team:
- Email: support@recruitiq.com
- Phone: [support number]
- Documentation: https://docs.recruitiq.com

Welcome aboard!
The RecruitIQ Team
```

## Troubleshooting

### Script hangs during execution

**Cause**: Database connection timeout or slow query

**Solution**:
1. Check database load
2. Verify network connectivity
3. Increase query timeout in code
4. Run during off-peak hours

### Permission denied error

**Cause**: Insufficient file permissions

**Solution**:
```bash
chmod +x scripts/onboard-tenant.js
```

### Module not found error

**Cause**: Dependencies not installed

**Solution**:
```bash
cd backend
npm install
```

### Database migration errors

**Cause**: Database not up to date

**Solution**:
```bash
cd backend
npm run migrate
```

## Best Practices

1. **Always test in staging first**
   - Run script on staging VPS
   - Verify all data created correctly
   - Check for any errors

2. **Document the process**
   - Keep record of license ID
   - Store customer information
   - Note any special configurations

3. **Monitor execution time**
   - Typical: 30-60 seconds
   - If > 2 minutes, investigate
   - May indicate database issues

4. **Verify completion**
   - Check organization exists
   - Verify admin can log in
   - Test key features

5. **Backup before running**
   - Take database snapshot
   - Allows rollback if needed
   - Especially for production

## FAQ

**Q: Can I run this script multiple times?**  
A: No, it will fail if organization already exists. Use rollback procedure first.

**Q: Can I customize the seed data?**  
A: Yes, modify TenantOnboardingService.js to adjust seeded data.

**Q: What if customer info changes?**  
A: Update in database manually or through portal. Script uses values at time of creation.

**Q: Can I add products later?**  
A: Yes, update organization.enabled_products array in database.

**Q: How do I reset the admin password?**  
A: Use password reset flow or update directly in database with bcrypt hash.

## Related Documentation

- [Tenant Onboarding Service](../src/modules/license/services/TenantOnboardingService.js) - Core implementation
- [License Controller](../src/modules/license/controllers/licenseController.js) - License creation
- [TENANT_ONBOARDING.md](../TENANT_ONBOARDING.md) - Original onboarding documentation
- [Seed Files](../seeds/) - Data seeding scripts

## Support

For issues or questions:
- Create an issue in the repository
- Contact the development team
- Refer to system documentation
