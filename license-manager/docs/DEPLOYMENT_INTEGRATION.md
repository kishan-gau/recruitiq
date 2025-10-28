# License Manager - Deployment Integration

## What Was Added

The License Manager frontend has been integrated with the deployment service to enable one-click instance deployments directly from the admin portal.

## New Files

### Components
- `src/components/DeploymentButton.jsx` - Modal-based deployment form with configuration options
- `src/components/DeploymentProgress.jsx` - Real-time deployment progress tracking with polling

### Configuration
- `.env` - Environment variables (VITE_DEPLOYMENT_API_URL)
- `.env.example` - Environment template

## Modified Files

### `src/pages/CustomerDetail.jsx`
Added a new "Instance Deployment" section that includes:
- Deployment overview with cloud deployment description
- `DeploymentButton` component for initiating deployments
- `DeploymentProgress` component for tracking deployment status
- Toast notifications for deployment start/complete/fail events
- Automatic customer data reload on successful deployment

### `src/services/api.js`
Added 10 new deployment methods:
- `deployInstance(deploymentData)` - Start a new deployment
- `getDeploymentStatus(jobId)` - Poll deployment status
- `cancelDeployment(jobId)` - Cancel a queued/active deployment
- `getDeploymentStats()` - Get queue statistics
- `getInstanceDetails(vpsName)` - Get VPS details from TransIP
- `startInstance(vpsName)` - Start a stopped instance
- `stopInstance(vpsName)` - Stop a running instance
- `rebootInstance(vpsName)` - Reboot an instance
- `deleteInstance(vpsName)` - Delete an instance (with billing guard)
- `createSnapshot(vpsName, description)` - Create a VPS snapshot

## How It Works

### User Flow

1. **Navigate to Customer Detail Page**
   - Admin opens any customer's detail page
   - New "Instance Deployment" section visible

2. **Click "Deploy Instance"**
   - Modal opens with deployment configuration form
   - Pre-filled with customer data (hostname, email, tier)
   - Admin can customize:
     - Hostname (auto-generated from customer name)
     - Domain (optional, for SSL)
     - Email (for Let's Encrypt notifications)
     - Region (Amsterdam or Rotterdam)

3. **Deployment Starts**
   - Job created in deployment service queue
   - Job ID returned and stored in component state
   - Toast notification shown

4. **Real-Time Progress Tracking**
   - `DeploymentProgress` component polls status every 5 seconds
   - Shows progress bar (0-100%)
   - Displays deployment logs in real-time
   - Shows state: queued → active → completed/failed

5. **Deployment Complete**
   - Success: Shows VPS name, IP address, FQDN (if domain provided)
   - Can click FQDN to open deployed instance
   - Customer data reloaded to update instance URL
   - Failure: Shows error details and logs

### Technical Flow

```
CustomerDetail Page
  ↓ (user clicks Deploy)
DeploymentButton
  ↓ (calls api.deployInstance)
License Manager API Client
  ↓ (HTTP POST to deployment service)
Deployment Service
  ↓ (creates job in Redis queue)
Returns Job ID
  ↓
DeploymentProgress (starts polling)
  ↓ (polls api.getDeploymentStatus every 5s)
Deployment Service
  ↓ (returns job state & progress)
Shows Progress/Logs
  ↓ (job completes)
onComplete Callback
  ↓
Toast + Reload Customer Data
```

## Environment Variables

### Required

```env
# Backend API (License Manager)
VITE_API_URL=http://localhost:5000/api

# Deployment Service API
VITE_DEPLOYMENT_API_URL=http://localhost:5001
```

For production, update to your actual deployment service URL:
```env
VITE_DEPLOYMENT_API_URL=https://deploy.yourcompany.com
```

## Testing the Integration

### 1. Start All Services

```bash
# Terminal 1: Start License Manager Backend
cd license-manager/backend
npm start

# Terminal 2: Start Deployment Service
cd deployment-service
npm run dev

# Terminal 3: Start License Manager Frontend
cd license-manager/frontend
npm run dev
```

### 2. Test Deployment Flow

1. Open License Manager: http://localhost:5173
2. Login with admin credentials
3. Navigate to Customers → Select any customer
4. Scroll to "Instance Deployment" section
5. Click "Deploy Instance" button
6. Fill in the form (email is required)
7. Click "Deploy Now"
8. Watch the progress tracker update in real-time

### 3. With Dry-Run Mode (Recommended First)

Ensure deployment service has `DEPLOYMENT_DRY_RUN=true` in `.env`:
- No actual VPS will be created
- Simulated IP address returned (192.0.2.x)
- Full flow tested without charges

### 4. Production Deployment

Once dry-run testing succeeds:
1. Set `DEPLOYMENT_DRY_RUN=false` in deployment service
2. Set `DEPLOYMENT_BILLING_GUARD=false` (or keep true for manual approval)
3. Restart deployment service
4. Deploy to real TransIP infrastructure

## Features

### DeploymentButton Component
- ✅ Pre-filled form with customer data
- ✅ Hostname auto-generated from customer name
- ✅ Domain input for SSL (optional)
- ✅ Email validation (required for Let's Encrypt)
- ✅ Region selection (ams0, rtm0)
- ✅ Warning banner about billable resources
- ✅ Disabled state during deployment
- ✅ Loading spinner during API call

### DeploymentProgress Component
- ✅ Real-time status polling (5 second interval)
- ✅ Progress bar with percentage
- ✅ State indicators (queued, active, completed, failed)
- ✅ Deployment logs display
- ✅ Success details (VPS name, IP, URL)
- ✅ Error details on failure
- ✅ Timestamps (created, started, finished)
- ✅ Auto-cleanup on unmount (stops polling)

## UI/UX Features

### Visual Feedback
- 🎨 Color-coded states (blue=active, green=success, red=failed)
- 📊 Animated progress bar
- 🔄 Spinning loader during active deployment
- ⏱️ Relative timestamps ("5 minutes ago")

### Error Handling
- ❌ Form validation (email required)
- ❌ API error display
- ❌ Network error handling
- ❌ Job not found handling
- ❌ Rate limit detection

### Success Flow
- ✅ Toast notifications
- ✅ Clickable FQDN link to deployed instance
- ✅ VPS details displayed
- ✅ Automatic customer data refresh

## Next Steps

### Recommended Enhancements

1. **Instance Management UI**
   - Add start/stop/reboot buttons to customer detail page
   - Show current VPS status (running/stopped)
   - Display resource usage (CPU, memory, disk)

2. **Deployment History**
   - List all deployments for a customer
   - Show deployment timeline
   - Filter by status (success/failed)

3. **Batch Deployments**
   - Deploy multiple customers at once
   - Deployment queue management
   - Priority queue for urgent deployments

4. **Cost Tracking**
   - Show estimated monthly cost per deployment
   - Track actual TransIP invoices
   - Cost breakdown by customer

5. **Automated Backups**
   - Schedule automatic snapshots
   - Snapshot management UI
   - Restore from snapshot

6. **Health Monitoring**
   - Real-time instance health checks
   - Uptime monitoring
   - Alert on instance down

## Security Notes

⚠️ **Important Security Considerations:**

1. **API Authentication**
   - Deployment endpoints require JWT token
   - License Manager passes token from admin session
   - Tokens should expire and refresh

2. **Billing Guard**
   - Keep `DEPLOYMENT_BILLING_GUARD=true` in production
   - Require manual approval for invoice-generating operations
   - Log all deployment attempts for audit

3. **Access Control**
   - Only admin users should access deployment features
   - Consider role-based permissions (super-admin only)
   - Log all deployment actions with user attribution

4. **Rate Limiting**
   - Deployment service has built-in rate limits
   - TransIP API has rate limits
   - Implement backoff/retry logic

5. **Private Key Storage**
   - Store TransIP private key in vault/secrets manager
   - Never commit to git
   - Rotate keys periodically

## Troubleshooting

### "Failed to start deployment"
- Check deployment service is running on port 5001
- Verify `VITE_DEPLOYMENT_API_URL` in `.env`
- Check browser console for CORS errors
- Ensure JWT token is valid

### "Deployment stuck in 'waiting'"
- Check Redis is running
- Check deployment service logs for queue errors
- Verify `MAX_CONCURRENT_DEPLOYMENTS` setting

### "TransIP authentication failed"
- Verify `TRANSIP_ACCOUNT_NAME` is correct
- Check private key path and permissions
- Ensure private key matches account

### Progress not updating
- Check polling interval (default 5s)
- Verify deployment service is returning status
- Check browser network tab for failed requests
- Look for CORS issues

## Files Reference

### Key Files
- `license-manager/frontend/src/pages/CustomerDetail.jsx` - Main integration point
- `license-manager/frontend/src/components/DeploymentButton.jsx` - Deploy modal
- `license-manager/frontend/src/components/DeploymentProgress.jsx` - Progress tracker
- `license-manager/frontend/src/services/api.js` - API methods
- `license-manager/frontend/.env` - Environment config

### Related Documentation
- `deployment-service/README.md` - Full deployment service docs
- `deployment-service/GETTING_STARTED.md` - Quick start guide
- `license-manager/docs/TRANSIP_OPENSTACK_INTEGRATION.md` - Integration design

---

**Integration completed successfully! ✅**

The License Manager can now deploy RecruitIQ instances to TransIP OpenStack with real-time progress tracking.
