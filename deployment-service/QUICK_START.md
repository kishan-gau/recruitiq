# Quick Start Guide - VPS Provisioning with Approval Workflow

## Setup (5 minutes)

### 1. Install Dependencies
```powershell
cd c:\RecruitIQ\deployment-service
npm install
```

### 2. Setup Database
```powershell
cd ..\backend\src\database
.\setup-database.ps1
```

This creates the `deployment` schema with all approval workflow tables.

### 3. Configure Environment
```powershell
cd ..\..\..\deployment-service
cp .env.example .env
```

Edit `.env` and set:
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recruitiq_dev

# TransIP (for provisioning)
TRANSIP_ACCOUNT_NAME=your-account
TRANSIP_PRIVATE_KEY_PATH=/path/to/key
DEPLOYMENT_DRY_RUN=true
DEPLOYMENT_BILLING_GUARD=true
```

### 4. Create First Approver
```sql
-- Connect to database
psql -U postgres -d recruitiq_dev

-- Create approver
INSERT INTO deployment.vps_provision_approvers (
    id, user_id, email, name, role, can_approve_all, is_active
) VALUES (
    gen_random_uuid(),
    'admin-user-id',
    'admin@example.com',
    'System Administrator',
    'admin',
    true,
    true
);
```

### 5. Start Service
```powershell
npm run dev
```

Service runs on http://localhost:5001

## Usage Flow

### Step 1: Create VPS Provision Request

```bash
curl -X POST http://localhost:5001/api/vps-provision/requests \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust-001",
    "customerName": "Acme Corp",
    "productName": "vps-bladevps-x4",
    "vpsName": "recruitiq-acme-prod",
    "adminEmail": "admin@acme.com",
    "hostname": "app",
    "domain": "acme.com",
    "estimatedMonthlyCost": 45.00,
    "businessJustification": "Production environment for new customer",
    "priority": "normal"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "VPS provision request created successfully",
  "request": {
    "id": "abc-123",
    "requestNumber": "VPS-2025-0001",
    "status": "pending"
  }
}
```

### Step 2: View Pending Requests (Approver)

```bash
curl http://localhost:5001/api/vps-provision/requests/pending
```

**Response:**
```json
{
  "success": true,
  "count": 1,
  "requests": [
    {
      "request_number": "VPS-2025-0001",
      "customer_name": "Acme Corp",
      "vps_name": "recruitiq-acme-prod",
      "priority": "normal",
      "estimated_monthly_cost": 45.00,
      "hours_pending": 0.5
    }
  ]
}
```

### Step 3: Add Comment (Optional)

```bash
curl -X POST http://localhost:5001/api/vps-provision/requests/abc-123/comments \
  -H "Content-Type: application/json" \
  -d '{
    "commentText": "Verified budget allocation - approved",
    "isInternal": false
  }'
```

### Step 4: Approve Request

```bash
curl -X POST http://localhost:5001/api/vps-provision/requests/abc-123/approve
```

**Response:**
```json
{
  "success": true,
  "message": "Request approved successfully",
  "request": {
    "requestNumber": "VPS-2025-0001",
    "status": "approved"
  }
}
```

**Note:** With `DEPLOYMENT_DRY_RUN=true`, this simulates provisioning without calling TransIP API.

### Step 5: Check Status

```bash
curl http://localhost:5001/api/vps-provision/requests/abc-123
```

**Response:**
```json
{
  "success": true,
  "request": {
    "status": "completed",
    "transip_vps_name": "dryrun-vps-1699364400000",
    "vps_ip_address": "192.0.2.1"
  },
  "comments": [...],
  "auditLog": [...]
}
```

### Step 6: View Inventory

```bash
curl http://localhost:5001/api/vps-inventory
```

```json
{
  "success": true,
  "count": 1,
  "inventory": [
    {
      "vps_name": "dryrun-vps-1699364400000",
      "customer_name": "Acme Corp",
      "status": "running",
      "ip_address": "192.0.2.1",
      "monthly_cost": 45.00
    }
  ]
}
```

## Key Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/vps-provision/requests` | POST | Create request |
| `/api/vps-provision/requests` | GET | List all requests |
| `/api/vps-provision/requests/pending` | GET | List pending (approvers) |
| `/api/vps-provision/requests/:id` | GET | Get request details |
| `/api/vps-provision/requests/:id/approve` | POST | Approve request |
| `/api/vps-provision/requests/:id/reject` | POST | Reject request |
| `/api/vps-provision/requests/:id/comments` | POST | Add comment |
| `/api/vps-provision/requests/:id/cancel` | POST | Cancel request |
| `/api/vps-provision/approvers` | GET | List approvers |
| `/api/vps-provision/approvers` | POST | Create approver |
| `/api/vps-inventory` | GET | List VPS inventory |
| `/api/vps-inventory/summary` | GET | Get active VPS summary |
| `/api/vps-inventory/statistics` | GET | Get statistics |
| `/api/vps-inventory/:name/sync` | POST | Sync from TransIP |

## Testing

### Test Approval Workflow

1. **Create request** (as user)
2. **View pending** (as approver)
3. **Add comments**
4. **Approve** (triggers provisioning)
5. **Check status**
6. **View inventory**

### Test with Real TransIP API

1. Set `DEPLOYMENT_DRY_RUN=false`
2. Set `DEPLOYMENT_BILLING_GUARD=false`
3. Ensure TransIP credentials are correct
4. Create and approve request
5. Monitor actual VPS creation

**⚠️ Warning:** Real provisioning will create billable resources!

## Troubleshooting

### Database connection failed
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Test connection
psql -U postgres -d recruitiq_dev -c "SELECT 1"
```

### Can't approve request
```bash
# Check if user is an approver
curl http://localhost:5001/api/vps-provision/approvers

# Check eligibility for specific request
curl -X POST http://localhost:5001/api/vps-provision/approvers/check-approval \
  -d '{"requestId": "abc-123"}'
```

### Request stuck in provisioning
```bash
# Check VPS status in TransIP
curl http://localhost:5001/api/vps-inventory/:vpsName/sync
```

## Next Steps

1. **Read full documentation** - [APPROVAL_WORKFLOW.md](./APPROVAL_WORKFLOW.md)
2. **Configure approvers** - Set up your team's approval structure
3. **Test dry run** - Create test requests to verify workflow
4. **Production setup** - Disable dry run when ready
5. **Monitor inventory** - Regular sync with TransIP

## Support

- Full API documentation: [APPROVAL_WORKFLOW.md](./APPROVAL_WORKFLOW.md)
- Main README: [README.md](./README.md)
- Database schema: `src/database/deployment-service-schema.sql`

## Security Checklist

- [ ] Change default passwords
- [ ] Configure JWT secret
- [ ] Set up proper authentication
- [ ] Create approvers with appropriate limits
- [ ] Test with dry run mode first
- [ ] Enable billing guard in production
- [ ] Review audit logs regularly
- [ ] Secure TransIP private key

## Production Readiness

Before going to production:

1. ✅ Database schema created
2. ✅ Approvers configured
3. ✅ TransIP credentials tested
4. ✅ Dry run testing completed
5. ⚠️ Set `DEPLOYMENT_DRY_RUN=false`
6. ⚠️ Review `DEPLOYMENT_BILLING_GUARD` setting
7. ⚠️ Configure authentication properly
8. ⚠️ Set up monitoring and alerts

---

**Ready to provision VPS with approval workflow! 🚀**
