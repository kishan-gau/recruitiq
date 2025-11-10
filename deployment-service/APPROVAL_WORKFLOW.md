# VPS Provisioning Approval Workflow

## Overview

The VPS Provisioning Approval Workflow provides a complete approval process for VPS provisioning requests before they are sent to TransIP. This ensures proper authorization, cost control, and audit trails for all infrastructure provisioning.

## Features

- ✅ **Multi-stage approval workflow** (Pending → Approved/Rejected → Provisioning → Completed)
- ✅ **Role-based approvers** with customizable permissions
- ✅ **Cost limits** per approver
- ✅ **Product/region restrictions** for fine-grained control
- ✅ **Priority levels** (low, normal, high, urgent)
- ✅ **Comment system** for collaboration
- ✅ **Comprehensive audit logging** of all actions
- ✅ **VPS inventory tracking** with TransIP sync
- ✅ **Automatic request numbering** (VPS-2025-0001)

## Workflow Stages

```
1. Request Creation (status: pending)
   ↓
2. Review & Comments
   ↓
3. Approval/Rejection
   ↓
4. Provisioning (if approved)
   ↓
5. Completion & Inventory Tracking
```

## Database Schema

The approval workflow uses the `deployment` schema with 5 tables:

- **`vps_provision_requests`** - All provision requests
- **`vps_provision_approvers`** - Authorized approvers
- **`vps_provision_comments`** - Request comments
- **`vps_provision_audit_log`** - Audit trail
- **`transip_vps_inventory`** - VPS inventory

## API Endpoints

### Create VPS Provision Request

```http
POST /api/vps-provision/requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "cust-123",
  "customerName": "Acme Corp",
  "productName": "vps-bladevps-x4",
  "vpsName": "recruitiq-acme-prod",
  "hostname": "app",
  "domain": "acme.com",
  "region": "ams0",
  "operatingSystem": "ubuntu-22.04",
  "licenseKey": "LICENSE-KEY-HERE",
  "licenseTier": "professional",
  "adminEmail": "admin@acme.com",
  "priority": "normal",
  "estimatedMonthlyCost": 45.00,
  "businessJustification": "Production environment for new customer",
  "projectCode": "ACME-2025",
  "tags": ["production", "customer-facing"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "VPS provision request created successfully",
  "request": {
    "id": "uuid-here",
    "requestNumber": "VPS-2025-0001",
    "status": "pending",
    "vpsName": "recruitiq-acme-prod",
    "customerName": "Acme Corp",
    "priority": "normal",
    "estimatedMonthlyCost": 45.00,
    "currency": "EUR",
    "createdAt": "2025-11-07T10:00:00Z"
  }
}
```

### List Pending Requests (Approvers)

```http
GET /api/vps-provision/requests/pending
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "requests": [
    {
      "id": "uuid-1",
      "request_number": "VPS-2025-0001",
      "customer_name": "Acme Corp",
      "product_name": "vps-bladevps-x4",
      "vps_name": "recruitiq-acme-prod",
      "priority": "high",
      "estimated_monthly_cost": 45.00,
      "business_justification": "Production environment",
      "requester_name": "John Doe",
      "requester_email": "john@example.com",
      "created_at": "2025-11-07T10:00:00Z",
      "hours_pending": 2.5
    }
  ]
}
```

### Approve Request

```http
POST /api/vps-provision/requests/:id/approve
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Request approved successfully",
  "request": {
    "id": "uuid-here",
    "requestNumber": "VPS-2025-0001",
    "status": "approved",
    "approvedBy": "Jane Smith",
    "approvedAt": "2025-11-07T12:00:00Z"
  }
}
```

**Note:** Approval automatically triggers the provisioning workflow.

### Reject Request

```http
POST /api/vps-provision/requests/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Cost exceeds budget for this project"
}
```

### Add Comment

```http
POST /api/vps-provision/requests/:id/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "commentText": "Please confirm the cost center code",
  "isInternal": false
}
```

### Get Request Details

```http
GET /api/vps-provision/requests/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "request": { /* full request details */ },
  "comments": [ /* all comments */ ],
  "auditLog": [ /* audit trail */ ]
}
```

## Approver Management

### Create Approver

```http
POST /api/vps-provision/approvers
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "email": "approver@example.com",
  "name": "Jane Smith",
  "role": "manager",
  "canApproveAll": false,
  "maxMonthlyCost": 100.00,
  "allowedProducts": ["vps-bladevps-x4", "vps-bladevps-x8"],
  "allowedRegions": ["ams0", "rtm0"]
}
```

### List Approvers

```http
GET /api/vps-provision/approvers
Authorization: Bearer <token>
```

### Check Approval Eligibility

```http
POST /api/vps-provision/approvers/check-approval
Authorization: Bearer <token>
Content-Type: application/json

{
  "requestId": "request-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "canApprove": true,
  "approver": { /* approver details */ }
}
```

Or if not eligible:
```json
{
  "success": true,
  "canApprove": false,
  "reason": "Request cost (150.00) exceeds approver limit (100.00)"
}
```

## VPS Inventory

### List Inventory

```http
GET /api/vps-inventory?status=running
Authorization: Bearer <token>
```

### Get VPS Details

```http
GET /api/vps-inventory/:vpsName
Authorization: Bearer <token>
```

### Sync from TransIP

```http
POST /api/vps-inventory/:vpsName/sync
Authorization: Bearer <token>
```

### Sync All VPS

```http
POST /api/vps-inventory/sync-all
Authorization: Bearer <token>
```

### Get Inventory Statistics

```http
GET /api/vps-inventory/statistics
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "total_vps": 15,
    "running": 12,
    "stopped": 3,
    "with_snapshots": 8,
    "total_monthly_cost": 675.00,
    "avg_monthly_cost": 45.00,
    "unique_customers": 10,
    "regions_used": 2
  }
}
```

## Approver Roles

- **`admin`** - Full approval authority, no restrictions
- **`manager`** - Department/team level approvals with cost limits
- **`finance`** - Budget and cost-focused approvals
- **`operations`** - Technical resource approvals

## Permission Model

Approvers can be restricted by:

1. **Cost Limit** - Maximum monthly cost they can approve
2. **Products** - Specific VPS products (e.g., only certain tiers)
3. **Regions** - Specific datacenter regions
4. **Global Flag** - `canApproveAll` bypasses all restrictions

## Priority Levels

- **`urgent`** - Requires immediate attention
- **`high`** - High priority, expedited review
- **`normal`** - Standard priority (default)
- **`low`** - Low priority, can wait

Pending requests are sorted by priority then age.

## Audit Logging

All actions are automatically logged:

- Request creation
- Status changes
- Approvals/rejections
- Comments
- Provisioning events
- Failures and errors

Each audit entry includes:
- Action performed
- User who performed it
- Timestamp
- Before/after state
- Additional metadata

## Provisioning Integration

When a request is **approved**:

1. Status changes to `approved`
2. Provisioning service is triggered automatically
3. Status changes to `provisioning`
4. TransIP VPS is created
5. VPS polls until `running` status
6. Status changes to `completed`
7. VPS added to inventory

If provisioning **fails**:
- Status changes to `failed`
- Error details logged in audit trail
- Request can be retried or cancelled

## Error Handling

### Dry Run Mode

Set `DEPLOYMENT_DRY_RUN=true` to simulate provisioning without creating actual resources:

```json
{
  "success": true,
  "dryRun": true,
  "message": "Dry run completed successfully",
  "vpsName": "dryrun-vps-1699364400000"
}
```

### Billing Guard

Set `DEPLOYMENT_BILLING_GUARD=true` to block all billable operations:

```json
{
  "error": "BILLING GUARD ACTIVE: Cannot create VPS that generates invoices"
}
```

## Example Workflow

### 1. User Creates Request

```bash
curl -X POST http://localhost:5001/api/vps-provision/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust-123",
    "customerName": "Acme Corp",
    "productName": "vps-bladevps-x4",
    "vpsName": "recruitiq-acme",
    "adminEmail": "admin@acme.com",
    "estimatedMonthlyCost": 45.00,
    "businessJustification": "New customer production environment"
  }'
```

### 2. Approver Reviews Pending Requests

```bash
curl -X GET http://localhost:5001/api/vps-provision/requests/pending \
  -H "Authorization: Bearer $APPROVER_TOKEN"
```

### 3. Approver Adds Comment

```bash
curl -X POST http://localhost:5001/api/vps-provision/requests/$REQUEST_ID/comments \
  -H "Authorization: Bearer $APPROVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"commentText": "Approved - budget confirmed with finance"}'
```

### 4. Approver Approves Request

```bash
curl -X POST http://localhost:5001/api/vps-provision/requests/$REQUEST_ID/approve \
  -H "Authorization: Bearer $APPROVER_TOKEN"
```

### 5. Check Provisioning Status

```bash
curl -X GET http://localhost:5001/api/vps-provision/requests/$REQUEST_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 6. View Inventory

```bash
curl -X GET http://localhost:5001/api/vps-inventory \
  -H "Authorization: Bearer $TOKEN"
```

## Setup

### 1. Run Database Migration

```bash
cd c:\RecruitIQ\backend\src\database
.\setup-database.ps1
```

This creates the `deployment` schema with all required tables.

### 2. Install Dependencies

```bash
cd c:\RecruitIQ\deployment-service
npm install
```

### 3. Configure Environment

Update `.env` with database connection:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recruitiq_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recruitiq_dev
DB_USER=postgres
DB_PASSWORD=postgres
```

### 4. Create Initial Approver

Use the API or database to create your first approver:

```sql
INSERT INTO deployment.vps_provision_approvers (
    id, user_id, email, name, role, can_approve_all, is_active
) VALUES (
    gen_random_uuid(),
    'your-user-id',
    'admin@example.com',
    'System Administrator',
    'admin',
    true,
    true
);
```

### 5. Start Service

```bash
npm run dev
```

## Security Considerations

1. **Authentication Required** - All endpoints require valid JWT token
2. **Approver Authorization** - Only authorized approvers can approve/reject
3. **Audit Logging** - All actions are logged with user details
4. **Cost Controls** - Approvers have cost limits
5. **Dry Run Mode** - Test without creating billable resources
6. **Billing Guard** - Extra safety layer for production

## Testing

### Test with Dry Run

Set environment variables:
```env
DEPLOYMENT_DRY_RUN=true
DEPLOYMENT_BILLING_GUARD=false
```

Create and approve a request - it will simulate provisioning without calling TransIP API.

### Test Approval Workflow

1. Create a request as a regular user
2. Log in as an approver
3. View pending requests
4. Add comments
5. Approve the request
6. Check audit log

## Troubleshooting

### Request stuck in "provisioning"

Check TransIP API status or VPS details:
```bash
curl -X POST http://localhost:5001/api/vps-inventory/$VPS_NAME/sync \
  -H "Authorization: Bearer $TOKEN"
```

### Approver can't approve

Check eligibility:
```bash
curl -X POST http://localhost:5001/api/vps-provision/approvers/check-approval \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"requestId": "$REQUEST_ID"}'
```

### View audit trail

```bash
curl -X GET http://localhost:5001/api/vps-provision/requests/$REQUEST_ID \
  -H "Authorization: Bearer $TOKEN"
```

The `auditLog` field shows all actions taken on the request.

## Future Enhancements

- [ ] Email notifications for approvers
- [ ] Slack/Teams integration
- [ ] Automated approval for low-cost requests
- [ ] Approval delegation
- [ ] Multi-level approval chains
- [ ] Budget tracking and alerts
- [ ] SLA tracking for approval times
- [ ] Approval templates
- [ ] Bulk operations

## Support

For issues or questions about the approval workflow:
- Check audit logs for detailed history
- Review approver permissions
- Verify database connectivity
- Check TransIP API credentials
- Review application logs

## License

MIT
