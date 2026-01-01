# Phase 2 & 3 Employee Self-Service - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Phase 2 & 3 Employee Self-Service features to production. These features include time & attendance tracking, payroll viewing, and push notifications.

---

## Pre-Deployment Checklist

### 1. Code Review
- [ ] All code changes reviewed and approved
- [ ] Security scan completed (CodeQL)
- [ ] No vulnerabilities in dependencies
- [ ] Code follows project standards

### 2. Testing
- [ ] Unit tests passing (90%+ coverage for services)
- [ ] Integration tests passing
- [ ] End-to-end tests passing
- [ ] Manual QA completed

### 3. Documentation
- [ ] API documentation updated
- [ ] User documentation updated
- [ ] Deployment runbook created

---

## Deployment Steps

### Step 1: Database Migration

**⚠️ CRITICAL: Run migrations during maintenance window**

1. **Backup Production Database**
   ```bash
   # Create backup before migration
   pg_dump -h <host> -U <user> -d recruitiq_prod > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Run Migration in Development/Staging First**
   ```bash
   cd backend
   NODE_ENV=staging npm run migrate:latest
   ```

3. **Verify Migration Success**
   ```bash
   npm run migrate:status
   ```
   
   Expected output should show:
   ```
   Migrations:
   ✓ 20260101000001_create_push_notification_tables.js
   ```

4. **Verify Tables Created**
   ```sql
   -- Check tables exist in hris schema
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'hris' 
   AND table_name LIKE 'push_notification%';
   
   -- Expected results:
   -- push_notification_subscription
   -- push_notification_preference
   -- push_notification_log
   ```

5. **Run in Production**
   ```bash
   NODE_ENV=production npm run migrate:latest
   ```

### Step 2: Environment Configuration

**1. Generate VAPID Keys for Production**

⚠️ **NEVER use development VAPID keys in production!**

```bash
# Generate new VAPID keys
cd backend
node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log('Public Key:', keys.publicKey); console.log('Private Key:', keys.privateKey);"
```

**2. Add to Production Environment Variables**

Add the following to your production `.env` file or environment configuration:

```bash
# Push Notifications (Web Push)
VAPID_PUBLIC_KEY=<generated_public_key>
VAPID_PRIVATE_KEY=<generated_private_key>
VAPID_SUBJECT=mailto:admin@<your-domain>.com
```

**3. Verify Environment Variables**

```bash
# SSH to production server
ssh production-server

# Check environment variables are set
echo $VAPID_PUBLIC_KEY
echo $VAPID_PRIVATE_KEY
echo $VAPID_SUBJECT
```

### Step 3: Backend Deployment

1. **Build Backend**
   ```bash
   cd backend
   npm run build
   ```

2. **Run Tests**
   ```bash
   npm test
   npm run test:integration
   ```

3. **Deploy to Production**
   ```bash
   # Using your deployment method (e.g., Docker, PM2, etc.)
   # Example with PM2:
   pm2 restart backend
   pm2 logs backend --lines 100
   ```

4. **Verify Backend Health**
   ```bash
   curl https://api.yourdomain.com/health
   curl https://api.yourdomain.com/api/notifications/vapid-public-key
   ```

### Step 4: Frontend Deployment

1. **Build Frontend**
   ```bash
   cd apps/web
   npm run build
   ```

2. **Deploy to CDN/Server**
   ```bash
   # Upload build files to your hosting service
   # Example with AWS S3:
   aws s3 sync dist/ s3://your-bucket/
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   ```

3. **Verify Frontend Deployment**
   - Open https://yourdomain.com in browser
   - Check browser console for errors
   - Verify service worker registered

### Step 5: Post-Deployment Verification

**1. Test Each Endpoint**

```bash
# Get VAPID public key
curl https://api.yourdomain.com/api/notifications/vapid-public-key

# Clock status (requires authentication)
curl -H "Cookie: access_token=<token>" \
     https://api.yourdomain.com/api/products/schedulehub/clock-status

# YTD summary (requires authentication)
curl -H "Cookie: access_token=<token>" \
     https://api.yourdomain.com/api/products/paylinq/employees/<employee_id>/ytd-summary
```

**2. Test Frontend Features**

- [ ] Login as employee
- [ ] Clock in/out functionality works
- [ ] Schedule displays correctly
- [ ] Payslips load and display
- [ ] YTD summary shows correct data
- [ ] Push notification subscription works
- [ ] Notification preferences save correctly

**3. Monitor Logs**

```bash
# Watch for errors
pm2 logs backend --lines 50

# Check database logs for any issues
tail -f /var/log/postgresql/postgresql-*.log
```

**4. Monitor Performance**

- [ ] Response times < 500ms for all endpoints
- [ ] No memory leaks
- [ ] CPU usage normal
- [ ] Database connections stable

---

## Rollback Procedure

If issues are discovered after deployment:

### 1. Immediate Rollback

```bash
# Revert backend to previous version
pm2 restart backend --update-env

# Revert frontend to previous version
# Restore previous build from backup or redeploy previous commit
```

### 2. Database Rollback (if necessary)

⚠️ **CAUTION: Only rollback if data corruption or critical issues**

```bash
cd backend
npm run migrate:rollback
```

### 3. Restore from Backup (if necessary)

```bash
psql -h <host> -U <user> -d recruitiq_prod < backup_YYYYMMDD_HHMMSS.sql
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **API Response Times**
   - Clock-in/out: < 200ms
   - Employee shifts: < 300ms
   - YTD summary: < 500ms
   - Push notifications: < 1s

2. **Error Rates**
   - Target: < 0.1% error rate
   - Alert if > 1% error rate

3. **Database Performance**
   - Query execution time
   - Connection pool usage
   - Lock wait time

4. **Push Notification Delivery**
   - Subscription success rate
   - Notification delivery rate
   - Failed notifications

### Set Up Alerts

Configure alerts for:
- API error rates > 1%
- Response times > 2x baseline
- Database connection failures
- Push notification failures > 5%

---

## Troubleshooting

### Common Issues

**1. Migration Fails**
- Check database connection
- Verify schema exists
- Check user permissions
- Review migration logs

**2. VAPID Keys Not Working**
- Verify keys are correctly formatted
- Check environment variables are set
- Ensure `web-push` package is installed
- Verify VAPID_SUBJECT is a valid mailto: URL

**3. Push Notifications Not Working**
- Check browser compatibility
- Verify HTTPS is enabled (required for push)
- Check service worker is registered
- Verify VAPID public key is accessible

**4. Clock-In/Out Fails**
- Check employee ID exists
- Verify organization ID
- Check time_attendance_event table
- Review service logs

---

## Support Contacts

- **DevOps Team:** devops@yourdomain.com
- **Backend Team:** backend@yourdomain.com
- **Frontend Team:** frontend@yourdomain.com
- **QA Team:** qa@yourdomain.com

---

## Post-Deployment Tasks

- [ ] Update release notes
- [ ] Notify users of new features
- [ ] Schedule user training sessions
- [ ] Monitor for 48 hours
- [ ] Conduct post-deployment review
- [ ] Update documentation with lessons learned

---

**Deployment Completed By:** _________________  
**Date:** _________________  
**Sign-off:** _________________
