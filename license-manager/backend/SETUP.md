# License Manager Backend Setup Guide

## Quick Start

### 1. Install Dependencies
```powershell
cd c:\RecruitIQ\license-manager\backend
npm install
```

### 2. Setup PostgreSQL Database

#### Option A: Using existing PostgreSQL installation
```powershell
# Create database
psql -U postgres -c "CREATE DATABASE license_manager_db;"

# Run schema
psql -U postgres -d license_manager_db -f database/schema.sql

# Initialize with admin user and demo data
psql -U postgres -d license_manager_db -f database/init.sql

# (Optional) Seed with more sample data
psql -U postgres -d license_manager_db -f database/seed.sql
```

#### Option B: Using Docker
```powershell
# Start PostgreSQL
docker run --name recruitiq-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=license_manager_db `
  -p 5432:5432 `
  -d postgres:15

# Wait for PostgreSQL to start, then run migrations
docker exec -i recruitiq-postgres psql -U postgres -d license_manager_db < database/schema.sql
docker exec -i recruitiq-postgres psql -U postgres -d license_manager_db < database/init.sql
```

### 3. Configure Environment

The `.env` file is already created with default values. Update if needed:
```
DB_PASSWORD=your_actual_password
JWT_SECRET=generate_a_long_random_string
```

### 4. Generate RSA Keys

```powershell
npm run generate-keys
```

This creates:
- `keys/private.key` - Keep this SECRET (used to sign license files)
- `keys/public.key` - Distribute to RecruitIQ instances (used to verify signatures)

### 5. Start the Server

```powershell
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on http://localhost:5000

## Default Admin Credentials

```
Email: admin@recruitiq.com
Password: admin123
```

**⚠️ IMPORTANT: Change this password immediately after first login!**

## API Endpoints

### Admin Panel (Authenticated)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/dashboard` - Dashboard metrics
- `GET /api/admin/customers` - List all customers
- `GET /api/admin/customers/:id` - Get customer details
- `POST /api/admin/customers` - Create customer
- `PUT /api/admin/licenses/:id/renew` - Renew license
- `POST /api/admin/licenses/:id/suspend` - Suspend license
- `GET /api/admin/licenses/:id/download` - Download .lic file

### Validation (Public)
- `POST /api/validate/validate` - Validate license
- `POST /api/validate/feature` - Check feature access
- `POST /api/validate/limit` - Check resource limit
- `GET /api/validate/public-key` - Get public key

### Telemetry (Public)
- `POST /api/telemetry/event` - Report usage event
- `POST /api/telemetry/heartbeat` - Send heartbeat
- `GET /api/telemetry/stats/:customerId` - Get usage stats

## Testing the API

### 1. Login as admin
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@recruitiq.com","password":"admin123"}'

$token = $response.token
```

### 2. Get dashboard
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/admin/dashboard" `
  -Method GET `
  -Headers @{ "Authorization" = "Bearer $token" }
```

### 3. Validate a license
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/validate/validate" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"licenseKey":"LIC-DEMO-12345678-...","instanceKey":"demo-company-prod"}'
```

## Next Steps

1. **Test the backend** - Run through the API endpoints
2. **Connect frontend** - Replace mock API in frontend with real backend
3. **Setup production** - Deploy to cloud with proper security
4. **Backup keys** - Securely backup private.key

## Troubleshooting

**Database connection fails:**
- Check PostgreSQL is running: `psql -U postgres -l`
- Verify credentials in `.env` file
- Check port 5432 is not in use

**Keys not found:**
- Run `npm run generate-keys`
- Check `keys/private.key` and `keys/public.key` exist

**Rate limit errors:**
- Adjust `RATE_LIMIT_MAX_REQUESTS` in `.env`
- Clear IP rate limit (restart server)

## Security Checklist

- [ ] Change default admin password
- [ ] Generate strong JWT_SECRET
- [ ] Backup private.key securely
- [ ] Never commit private.key to git
- [ ] Use HTTPS in production
- [ ] Setup firewall rules
- [ ] Enable PostgreSQL SSL
- [ ] Regular database backups
