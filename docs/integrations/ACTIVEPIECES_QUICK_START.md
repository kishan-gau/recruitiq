# ActivePieces Integration - Quick Start Guide

**For:** Developers implementing ActivePieces workflows  
**Time to Complete:** 30 minutes  
**Prerequisites:** RecruitIQ account, ActivePieces instance

---

## Overview

This guide walks you through setting up your first ActivePieces workflow with RecruitIQ in 30 minutes.

**What You'll Build:** An automated workflow that sends a Slack notification whenever a new job application is received.

---

## Step 1: Setup RecruitIQ Webhook (5 minutes)

### 1.1 Generate API Key

```bash
# Login to RecruitIQ
curl -X POST https://api.recruitiq.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'

# Response includes JWT token
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

### 1.2 Create Webhook Subscription

```bash
curl -X POST https://api.recruitiq.com/api/webhooks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-activepieces-instance.com/webhooks/recruitiq",
    "events": ["application.received"],
    "description": "ActivePieces webhook for new applications"
  }'

# Response includes webhook secret for verification
{
  "success": true,
  "webhook": {
    "id": "wh_abc123",
    "url": "https://your-activepieces-instance.com/webhooks/recruitiq",
    "events": ["application.received"],
    "secret": "whsec_1234567890abcdef...",
    "createdAt": "2025-12-29T10:00:00Z"
  }
}
```

**Important:** Save the `secret` value - you'll need it to verify webhook signatures!

---

## Step 2: Install ActivePieces (10 minutes)

### 2.1 Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  activepieces:
    image: activepieces/activepieces:latest
    container_name: activepieces
    ports:
      - "8080:80"
    environment:
      # Database
      - AP_POSTGRES_HOST=postgres
      - AP_POSTGRES_PORT=5432
      - AP_POSTGRES_DATABASE=activepieces
      - AP_POSTGRES_USERNAME=postgres
      - AP_POSTGRES_PASSWORD=activepieces_password
      
      # Security
      - AP_JWT_SECRET=your_jwt_secret_min_32_chars
      - AP_ENCRYPTION_KEY=your_encryption_key_32_bytes
      
      # Instance
      - AP_ENGINE_EXECUTABLE_PATH=/app/dist/packages/engine/main.js
      - AP_FRONTEND_URL=http://localhost:8080
    depends_on:
      - postgres
    volumes:
      - activepieces_data:/app/data

  postgres:
    image: postgres:15-alpine
    container_name: activepieces_postgres
    environment:
      - POSTGRES_DB=activepieces
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=activepieces_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  activepieces_data:
  postgres_data:
```

### 2.2 Start ActivePieces

```bash
# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f activepieces

# Access at http://localhost:8080
```

### 2.3 Initial Setup

1. Open http://localhost:8080
2. Create admin account
3. Complete onboarding wizard

---

## Step 3: Create Your First Workflow (10 minutes)

### 3.1 Create New Flow

1. Click **"New Flow"** in ActivePieces dashboard
2. Name it: **"Notify Slack on New Application"**
3. Click **"Create"**

### 3.2 Add Webhook Trigger

1. Click **"Add Trigger"**
2. Select **"Webhook"**
3. Configure:
   - **URL:** Copy the generated webhook URL
   - **Method:** POST
   - **Authentication:** None (we'll verify signature in code)

### 3.3 Verify Webhook Signature (Important!)

1. After trigger, click **"+"** to add step
2. Select **"Code"**
3. Add this verification code:

```javascript
const crypto = require('crypto');

// Get webhook payload and signature
const payload = inputs.trigger.body;
const signature = inputs.trigger.headers['x-webhook-signature'];
const secret = 'YOUR_WEBHOOK_SECRET_FROM_STEP_1.2';

// Verify signature
function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expected = `sha256=${hmac.digest('hex')}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

const isValid = verifySignature(payload, signature, secret);

if (!isValid) {
  throw new Error('Invalid webhook signature!');
}

// Return verified payload
return {
  isValid: true,
  event: payload
};
```

### 3.4 Add Slack Notification

1. Click **"+"** after verification step
2. Select **"Slack"** → **"Send Message to Channel"**
3. Configure:
   - **Connection:** Create new Slack connection
   - **Channel:** #hiring
   - **Message:**

```
🎉 New Job Application Received!

*Candidate:* {{trigger.body.data.application.candidateName}}
*Email:* {{trigger.body.data.application.candidateEmail}}
*Job:* {{trigger.body.data.job.title}}
*Department:* {{trigger.body.data.job.department}}

*Applied:* {{trigger.body.data.application.appliedAt}}

View in RecruitIQ: https://app.recruitiq.com/applications/{{trigger.body.data.application.id}}
```

### 3.5 Test the Flow

1. Click **"Test"** button
2. Use this sample payload:

```json
{
  "id": "evt_test123",
  "type": "application.received",
  "timestamp": "2025-12-29T10:30:00Z",
  "organizationId": "org-123",
  "data": {
    "application": {
      "id": "app-456",
      "jobId": "job-789",
      "candidateId": "cand-012",
      "candidateName": "John Doe",
      "candidateEmail": "john@example.com",
      "stage": "new",
      "appliedAt": "2025-12-29T10:29:45Z"
    },
    "job": {
      "id": "job-789",
      "title": "Senior Software Engineer",
      "department": "Engineering"
    }
  }
}
```

3. Check Slack - you should see the notification!

### 3.6 Publish the Flow

1. Click **"Publish"**
2. Copy the webhook URL from the trigger
3. Update your RecruitIQ webhook subscription with this URL:

```bash
curl -X PUT https://api.recruitiq.com/api/webhooks/wh_abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-activepieces.com/api/v1/webhooks/YOUR_FLOW_ID",
    "isActive": true
  }'
```

---

## Step 4: Test End-to-End (5 minutes)

### 4.1 Trigger Real Event

Option A: **Create test application in RecruitIQ UI**
1. Go to RecruitIQ → Jobs
2. Select any job
3. Click "Add Application"
4. Fill in test candidate details
5. Submit

Option B: **Use API to create application**

```bash
curl -X POST https://api.recruitiq.com/api/jobs/job-789/applications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "candidateName": "Jane Smith",
    "candidateEmail": "jane@example.com",
    "phone": "555-0100",
    "resumeUrl": "https://example.com/resume.pdf"
  }'
```

### 4.2 Verify

1. Check Slack #hiring channel - you should see the notification!
2. Check ActivePieces dashboard - view execution history
3. Check RecruitIQ webhook logs:

```bash
curl -X GET https://api.recruitiq.com/api/webhooks/wh_abc123/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Common Workflows

### Workflow 1: AI Resume Screening

**Trigger:** `application.received`

**Steps:**
1. Verify webhook signature
2. Get application details from RecruitIQ API
3. Download resume
4. Send to OpenAI: "Rate this resume 1-100 for [job title]"
5. If score > 80: Update stage to "Interview"
6. Send Slack notification with score

### Workflow 2: Interview Reminder

**Trigger:** `interview.scheduled`

**Steps:**
1. Verify webhook signature
2. Wait 24 hours (using Delay step)
3. Send email reminder to candidate
4. Send email reminder to interviewer
5. Post to Slack: "Interview tomorrow with [candidate]"

### Workflow 3: Multi-Channel Job Post

**Trigger:** `job.published`

**Steps:**
1. Verify webhook signature
2. Format job for LinkedIn
3. Post to LinkedIn
4. Tweet on Twitter
5. Post to Facebook Jobs
6. Add to Google Sheets tracker

---

## Troubleshooting

### Webhook Not Receiving Events

**Check 1: Is webhook active?**
```bash
curl -X GET https://api.recruitiq.com/api/webhooks/wh_abc123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return: "isActive": true
```

**Check 2: Is URL correct?**
- Ensure webhook URL matches ActivePieces flow URL
- Check for typos (http vs https)

**Check 3: Check event log**
```bash
curl -X GET https://api.recruitiq.com/api/webhooks/wh_abc123/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Shows delivery attempts and errors
```

### Signature Verification Failing

**Issue:** HMAC signature doesn't match

**Solution:**
1. Ensure you're using the correct secret from webhook creation
2. Verify you're stringifying the payload correctly: `JSON.stringify(payload)`
3. Check the signature header name: `x-webhook-signature`
4. Ensure timing-safe comparison: `crypto.timingSafeEqual()`

### Flow Not Executing

**Check 1: Flow published?**
- Flows must be published to receive webhooks
- Draft flows won't execute

**Check 2: Check execution history**
- ActivePieces Dashboard → Flows → Executions
- View error logs

**Check 3: Test with sample payload**
- Use the "Test" button with sample data
- Verify each step executes

---

## Available RecruitIQ Events

### Job Events
- `job.created` - New job created
- `job.published` - Job published
- `job.closed` - Job closed
- `job.updated` - Job updated
- `job.deleted` - Job deleted

### Application Events
- `application.received` - New application
- `application.reviewed` - Application reviewed
- `application.advanced` - Stage changed
- `application.rejected` - Application rejected
- `application.withdrawn` - Candidate withdrew

### Interview Events
- `interview.scheduled` - Interview scheduled
- `interview.rescheduled` - Interview rescheduled
- `interview.completed` - Interview completed
- `interview.cancelled` - Interview cancelled
- `interview.feedback_submitted` - Feedback added

### Offer Events
- `offer.sent` - Offer sent
- `offer.accepted` - Offer accepted
- `offer.declined` - Offer declined
- `offer.expired` - Offer expired

### Hire Events
- `hire.completed` - Candidate hired

---

## RecruitIQ API Quick Reference

### Authentication

```bash
# Get JWT token
curl -X POST https://api.recruitiq.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "pass"}'
```

### Common Endpoints

**List Jobs:**
```bash
GET /api/jobs
Authorization: Bearer {token}
```

**Get Job Details:**
```bash
GET /api/jobs/{jobId}
Authorization: Bearer {token}
```

**Create Application:**
```bash
POST /api/jobs/{jobId}/applications
Authorization: Bearer {token}
Content-Type: application/json

{
  "candidateName": "John Doe",
  "candidateEmail": "john@example.com",
  "phone": "555-0100",
  "resumeUrl": "https://example.com/resume.pdf"
}
```

**Update Application Stage:**
```bash
PUT /api/applications/{applicationId}/stage
Authorization: Bearer {token}
Content-Type: application/json

{
  "stage": "interview"
}
```

**Schedule Interview:**
```bash
POST /api/applications/{applicationId}/interviews
Authorization: Bearer {token}
Content-Type: application/json

{
  "scheduledAt": "2025-12-30T14:00:00Z",
  "duration": 60,
  "type": "phone",
  "interviewers": ["user-123"]
}
```

Full API documentation: https://docs.recruitiq.com/api

---

## Next Steps

### Build More Workflows

1. **Candidate Nurture Campaign**
   - Trigger: `application.reviewed` (not advanced)
   - Action: Add to Mailchimp nurture sequence

2. **Reference Check Automation**
   - Trigger: `application.advanced` (to "Reference Check")
   - Action: Send Google Form to references

3. **Background Check**
   - Trigger: `application.advanced` (to "Background Check")
   - Action: Submit to Checkr API

4. **Onboarding Automation**
   - Trigger: `offer.accepted`
   - Actions:
     * Create employee in Nexus HRIS
     * Provision IT equipment
     * Send welcome email
     * Schedule onboarding meetings

### Learn More

- **Full Documentation:** `/docs/integrations/ACTIVEPIECES_GUIDE.md`
- **Workflow Templates:** `/docs/integrations/WORKFLOW_TEMPLATES.md`
- **Complete Plan:** `/ACTIVEPIECES_INTEGRATION_PLAN.md`
- **ActivePieces Docs:** https://www.activepieces.com/docs

### Get Help

- **Support:** support@recruitiq.com
- **Community:** https://community.recruitiq.com
- **ActivePieces Forum:** https://community.activepieces.com

---

## Summary

Congratulations! 🎉 You've successfully:

- ✅ Created a RecruitIQ webhook subscription
- ✅ Installed ActivePieces
- ✅ Built your first automated workflow
- ✅ Integrated Slack notifications
- ✅ Tested end-to-end

**Time to explore:** Build more workflows and automate your entire hiring process!

---

**Document Version:** 1.0  
**Last Updated:** December 29, 2025  
**Maintained By:** RecruitIQ Engineering Team
