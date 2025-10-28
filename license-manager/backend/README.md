# License Manager Backend

Backend API for RecruitIQ License Manager.

## Features

- License validation for customer instances
- Usage telemetry collection
- Customer and license management
- .lic file generation for on-premise deployments
- RSA signing for license files
- Admin authentication

## Setup

### 1. Install Dependencies

```bash
cd license-manager/backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

### 3. Setup Database

Create PostgreSQL database:

```bash
createdb license_manager_db
```

Run schema:

```bash
psql -d license_manager_db -f database/schema.sql
```

### 4. Generate RSA Keys

```bash
npm run generate-keys
```

This creates `keys/private.key` and `keys/public.key` for signing .lic files.

### 5. Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

## API Endpoints

### Admin Endpoints

```
GET    /api/admin/dashboard          - Dashboard metrics
GET    /api/admin/customers          - List customers
POST   /api/admin/customers          - Create customer
GET    /api/admin/customers/:id      - Get customer details
PUT    /api/admin/customers/:id      - Update customer
DELETE /api/admin/customers/:id      - Delete customer
GET    /api/admin/customers/:id/usage - Get customer usage stats
POST   /api/admin/licenses/:id/renew  - Renew license
POST   /api/admin/licenses/:id/suspend - Suspend license
GET    /api/admin/licenses/:id/generate-file - Download .lic file
```

### Validation Endpoints (called by customer instances)

```
POST   /api/validate/license         - Validate license
GET    /api/validate/features/:orgId - Get feature flags
```

### Telemetry Endpoints (called by customer instances)

```
POST   /api/telemetry/usage          - Report usage data
POST   /api/telemetry/heartbeat      - Instance heartbeat
```

## Architecture

```
Backend API (Port 5000)
├── Admin Routes - Customer/License management
├── Validation Routes - License validation
├── Telemetry Routes - Usage tracking
└── Database - PostgreSQL
```

## Database Schema

- `customers` - Customer organizations
- `instances` - Deployment instances
- `licenses` - License records
- `usage_events` - Telemetry data
- `admin_users` - Admin accounts
- `audit_log` - Admin actions

## Security

- JWT authentication for admin endpoints
- Rate limiting on all endpoints
- Helmet security headers
- CORS configured
- SQL injection protection via parameterized queries
