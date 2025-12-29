# ActivePieces Integration Plan for RecruitIQ Platform

**Document Version:** 1.0  
**Created:** December 29, 2025  
**Status:** Implementation Ready  
**Priority:** High (Strategic Feature)  
**Estimated Effort:** 3-4 weeks

---

## Executive Summary

This document outlines a comprehensive plan for integrating **ActivePieces**, an open-source workflow automation platform, into the RecruitIQ ecosystem. This integration will enable customers to build custom workflows, connect with 400+ third-party applications, and leverage AI-powered automation—transforming RecruitIQ from a standalone platform into a workflow automation hub.

### Strategic Value

**Business Impact:**
- 🚀 **Competitive Differentiation**: Position RecruitIQ as an automation-first platform
- 💰 **Revenue Opportunity**: Premium automation features for enterprise customers
- 🔌 **Extended Integrations**: Connect to 400+ apps without custom development
- 🤖 **AI Capabilities**: Leverage AI agents for intelligent recruitment workflows
- 📈 **Customer Retention**: Reduce churn by enabling custom workflows
- ⚡ **Time to Market**: Faster integration delivery vs. building from scratch

**Technical Benefits:**
- Event-driven architecture with webhooks
- Self-hosted option for compliance-sensitive customers
- No vendor lock-in (open-source)
- Extensible with custom pieces (connectors)
- Enterprise-grade security and audit logging

---

## Table of Contents

1. [ActivePieces Overview](#activepieces-overview)
2. [Integration Architecture](#integration-architecture)
3. [Implementation Phases](#implementation-phases)
4. [Use Cases & Workflows](#use-cases--workflows)
5. [Technical Implementation](#technical-implementation)
6. [Security & Compliance](#security--compliance)
7. [Rollout Strategy](#rollout-strategy)
8. [Success Metrics](#success-metrics)

---

## ActivePieces Overview

### What is ActivePieces?

ActivePieces is a modern, open-source workflow automation platform (MIT license) that enables users to automate repetitive tasks and connect various applications—similar to Zapier or Make.com, but with significant advantages:

**Key Features:**
- ✅ **No-Code Visual Builder**: Drag-and-drop interface for building workflows
- ✅ **400+ Pre-Built Integrations**: Gmail, Slack, OpenAI, Google Sheets, HubSpot, Salesforce, etc.
- ✅ **AI Agents**: Intelligent automation with model orchestration
- ✅ **Self-Hostable**: Deploy on Docker, Kubernetes, or cloud platforms
- ✅ **Webhooks Support**: Real-time event-driven automation
- ✅ **Custom Pieces**: Extensible with JavaScript/TypeScript
- ✅ **Built-In Storage**: Tables feature for managing workflow data
- ✅ **Enterprise Features**: SSO, RBAC, audit logs, whitelabeling
- ✅ **Cost-Effective**: No per-task charges on self-hosted setups

### Why ActivePieces for RecruitIQ?

| Traditional Approach | ActivePieces Approach |
|---------------------|----------------------|
| Build custom integration for each tool | Use 400+ pre-built connectors |
| Engineering team handles all requests | Customers build their own workflows |
| Months to deliver new integrations | Minutes to connect new apps |
| High maintenance costs | Community-maintained connectors |
| Limited to planned features | Unlimited workflow possibilities |

---

## Integration Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   RecruitIQ Platform                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  RecruitIQ │  │   Nexus    │  │  PayLinQ   │           │
│  │    (ATS)   │  │   (HRIS)   │  │ (Payroll)  │           │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘           │
│        │                │                │                   │
│  ┌─────▼────────────────▼────────────────▼──────┐          │
│  │          Webhook Event Bus                    │          │
│  │  (job.created, application.received, etc.)    │          │
│  └────────────────────┬──────────────────────────┘          │
└───────────────────────┼─────────────────────────────────────┘
                        │ HTTP Webhooks
                        │ (Outbound Events)
           ┌────────────▼────────────┐
           │                         │
           │    ActivePieces         │
           │  Workflow Engine        │
           │                         │
           └────────────┬────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│   Gmail      │ │   Slack    │ │  OpenAI    │
│ (Send email) │ │ (Notify)   │ │ (AI Parse) │
└──────────────┘ └────────────┘ └────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │ (API Calls)
                        │ (Inbound Actions)
           ┌────────────▼────────────┐
           │   RecruitIQ REST API    │
           │ (Create, Update, Query) │
           └─────────────────────────┘
```

### Integration Points

#### 1. **Outbound Events (Triggers)**
RecruitIQ sends events to ActivePieces via webhooks:

```javascript
// RecruitIQ → ActivePieces (Webhook Triggers)
Events:
  - job.created
  - job.published
  - job.closed
  - application.received
  - application.reviewed
  - application.advanced
  - application.rejected
  - interview.scheduled
  - interview.completed
  - candidate.created
  - offer.sent
  - offer.accepted
  - employee.hired (from RecruitIQ → Nexus integration)
```

#### 2. **Inbound Actions (API Calls)**
ActivePieces calls RecruitIQ API to perform actions:

```javascript
// ActivePieces → RecruitIQ (API Actions)
Actions:
  - Create Job Posting
  - Update Job Status
  - Add Candidate
  - Update Application Stage
  - Schedule Interview
  - Send Email to Candidate
  - Add Note to Application
  - Generate Report
  - Search Candidates
  - Export Data
```

#### 3. **Bi-Directional Flows**
Complex workflows combining triggers and actions:

```
Example: AI-Powered Resume Screening
1. [Trigger] application.received → ActivePieces
2. [Action] Extract resume from RecruitIQ API
3. [Action] Send to OpenAI for analysis
4. [Action] Parse response and score candidate
5. [Action] Update application in RecruitIQ with score
6. [Action] If score > 80, advance to "Interview" stage
7. [Action] Send Slack notification to hiring manager
```

---

## Implementation Phases

### Phase 1: Webhook Infrastructure (Week 1-2)

**Objective:** Build the foundational webhook system that ActivePieces will consume.

**Deliverables:**
- ✅ Database schema for webhook subscriptions and event log
- ✅ WebhookService for event delivery with retry logic
- ✅ Webhook routes (CRUD for subscriptions)
- ✅ Integration with existing services (Jobs, Applications, Interviews)
- ✅ HMAC signature generation for security
- ✅ Background worker for retry mechanism

**Files to Create:**
```
backend/
  ├── migrations/
  │   └── 20251229_create_webhooks_tables.sql
  ├── src/
  │   ├── services/
  │   │   └── WebhookService.js
  │   ├── routes/
  │   │   └── webhooks.js
  │   ├── controllers/
  │   │   └── webhookController.js
  │   └── workers/
  │       └── webhookRetryWorker.js
  └── tests/
      └── services/
          └── WebhookService.test.js
```

**Webhook Event Schema:**
```json
{
  "id": "evt_a1b2c3d4",
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
      "resumeUrl": "https://recruitiq.com/resumes/abc.pdf",
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

### Phase 2: RecruitIQ Custom Piece for ActivePieces (Week 2-3)

**Objective:** Create a custom ActivePieces connector (piece) for RecruitIQ.

**Deliverables:**
- ✅ NPM package: `@recruitiq/activepieces-piece`
- ✅ Trigger definitions (15+ event types)
- ✅ Action definitions (10+ API operations)
- ✅ Authentication configuration (API Key)
- ✅ TypeScript type definitions
- ✅ Unit tests and integration tests
- ✅ Published to npm or ActivePieces marketplace

**Package Structure:**
```
@recruitiq/activepieces-piece/
  ├── package.json
  ├── src/
  │   ├── index.ts                    # Piece entry point
  │   ├── auth.ts                     # Authentication config
  │   ├── triggers/
  │   │   ├── job-created.ts
  │   │   ├── application-received.ts
  │   │   ├── interview-scheduled.ts
  │   │   └── ...
  │   ├── actions/
  │   │   ├── create-job.ts
  │   │   ├── update-application.ts
  │   │   ├── schedule-interview.ts
  │   │   └── ...
  │   └── common/
  │       ├── api-client.ts          # RecruitIQ API wrapper
  │       └── types.ts               # Shared types
  └── README.md
```

**Example Trigger (application-received.ts):**
```typescript
import { createTrigger, TriggerStrategy } from '@activepieces/pieces-framework';
import { recruitiqAuth } from '../auth';

export const applicationReceived = createTrigger({
  name: 'application_received',
  displayName: 'New Application Received',
  description: 'Triggers when a new job application is received',
  auth: recruitiqAuth,
  
  type: TriggerStrategy.WEBHOOK,
  
  async onEnable(context) {
    const webhookUrl = context.webhookUrl;
    
    // Register webhook with RecruitIQ
    const response = await fetch(`${context.auth.baseUrl}/api/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.auth.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['application.received'],
        description: 'ActivePieces webhook'
      })
    });
    
    const subscription = await response.json();
    
    // Store subscription ID for cleanup
    await context.store.put('webhookId', subscription.webhook.id);
  },
  
  async onDisable(context) {
    const webhookId = await context.store.get('webhookId');
    
    // Unregister webhook
    await fetch(`${context.auth.baseUrl}/api/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${context.auth.apiKey}`
      }
    });
  },
  
  async run(context) {
    // Webhook payload from RecruitIQ
    return [context.payload.body];
  }
});
```

**Example Action (create-job.ts):**
```typescript
import { createAction, Property } from '@activepieces/pieces-framework';
import { recruitiqAuth } from '../auth';
import { RecruitIQApiClient } from '../common/api-client';

export const createJob = createAction({
  name: 'create_job',
  displayName: 'Create Job Posting',
  description: 'Create a new job posting in RecruitIQ',
  auth: recruitiqAuth,
  
  props: {
    title: Property.ShortText({
      displayName: 'Job Title',
      description: 'The title of the job posting',
      required: true
    }),
    department: Property.ShortText({
      displayName: 'Department',
      required: true
    }),
    location: Property.ShortText({
      displayName: 'Location',
      required: true
    }),
    description: Property.LongText({
      displayName: 'Job Description',
      required: true
    }),
    employmentType: Property.Dropdown({
      displayName: 'Employment Type',
      required: true,
      options: [
        { label: 'Full-Time', value: 'full_time' },
        { label: 'Part-Time', value: 'part_time' },
        { label: 'Contract', value: 'contract' },
        { label: 'Intern', value: 'intern' }
      ]
    }),
    salaryMin: Property.Number({
      displayName: 'Minimum Salary',
      required: false
    }),
    salaryMax: Property.Number({
      displayName: 'Maximum Salary',
      required: false
    })
  },
  
  async run(context) {
    const client = new RecruitIQApiClient(context.auth);
    
    const job = await client.createJob({
      title: context.propsValue.title,
      department: context.propsValue.department,
      location: context.propsValue.location,
      description: context.propsValue.description,
      employmentType: context.propsValue.employmentType,
      salaryRange: {
        min: context.propsValue.salaryMin,
        max: context.propsValue.salaryMax
      }
    });
    
    return {
      success: true,
      job
    };
  }
});
```

### Phase 3: Documentation & Examples (Week 3)

**Objective:** Create comprehensive documentation and example workflows.

**Deliverables:**
- ✅ Integration guide for customers
- ✅ Workflow templates (10+ common use cases)
- ✅ API documentation updates
- ✅ Video tutorials
- ✅ Marketing materials

**Documentation Files:**
```
docs/
  ├── integrations/
  │   ├── ACTIVEPIECES_GUIDE.md          # Complete integration guide
  │   ├── WEBHOOK_SETUP.md               # Webhook configuration
  │   ├── WORKFLOW_TEMPLATES.md          # Pre-built workflows
  │   └── API_AUTHENTICATION.md          # API key setup
  └── marketing/
      └── ACTIVEPIECES_FEATURE_BRIEF.md  # Sales enablement
```

### Phase 4: Advanced Features (Week 4+)

**Objective:** Enhance the integration with advanced capabilities.

**Optional Enhancements:**
- 🔄 Embedded ActivePieces UI in RecruitIQ admin portal
- 🎨 Whitelabeled automation marketplace
- 📊 Workflow analytics dashboard
- 🤖 Pre-trained AI agents for recruitment tasks
- 💼 Premium automation features (upsell opportunity)
- 🔐 SSO integration with RecruitIQ authentication
- 📦 Workflow template library in RecruitIQ UI

---

## Use Cases & Workflows

### 1. **Auto-Screen Candidates with AI**

**Trigger:** `application.received`

**Workflow:**
```
1. New application received → ActivePieces
2. Extract resume URL from event data
3. Download resume from RecruitIQ API
4. Send to OpenAI GPT-4 for analysis:
   - "Analyze this resume for [job title]"
   - "Rate fit on scale 1-100"
   - "List pros and cons"
5. If score > 80:
   - Update application stage to "Interview"
   - Send email to hiring manager
   - Post to Slack: "Strong candidate!"
6. If score < 50:
   - Update stage to "Rejected"
   - Send rejection email template
7. If score 50-80:
   - Add note: "Moderate fit - manual review needed"
   - Assign to recruiter
```

**Business Impact:** Save 2-3 hours per day on initial screening

### 2. **Multi-Channel Job Posting**

**Trigger:** `job.published`

**Workflow:**
```
1. Job published in RecruitIQ → ActivePieces
2. Format job for different platforms
3. Post to LinkedIn (via LinkedIn API)
4. Post to Indeed (via Indeed API)
5. Tweet job (via Twitter API)
6. Post to company careers page (via WordPress API)
7. Send to Slack #hiring channel
8. Add to Google Sheets job tracker
9. Send confirmation email to hiring manager
```

**Business Impact:** 95% faster job distribution

### 3. **Interview Scheduling Automation**

**Trigger:** `application.advanced` (to "Interview" stage)

**Workflow:**
```
1. Candidate advanced to Interview stage → ActivePieces
2. Get candidate email from event
3. Get hiring manager calendar availability (Google Calendar)
4. Generate interview slots (next 7 days)
5. Send Calendly-style booking link to candidate
6. When candidate books slot:
   - Create calendar event for all participants
   - Send confirmation emails
   - Update application in RecruitIQ with interview date
   - Send reminder 24 hours before
```

**Business Impact:** 80% reduction in scheduling back-and-forth

### 4. **Automated Reference Checks**

**Trigger:** `application.advanced` (to "Reference Check" stage)

**Workflow:**
```
1. Candidate reaches Reference Check stage → ActivePieces
2. Get candidate data from RecruitIQ API
3. Generate reference check form (Google Forms)
4. Send email to 3 references with form link
5. When forms submitted:
   - Parse responses
   - Calculate reference score
   - Add notes to application
   - If all positive: advance to "Offer"
   - If any negative: flag for review
6. Notify hiring manager of completion
```

**Business Impact:** 100% automated reference collection

### 5. **New Hire Onboarding**

**Trigger:** `offer.accepted`

**Workflow:**
```
1. Offer accepted → ActivePieces
2. Create employee in Nexus HRIS (via API)
3. Create IT tickets:
   - Provision laptop (Jira)
   - Create email account (G Suite API)
   - Add to Slack workspace
   - Grant system access
4. Send welcome email with:
   - First day schedule
   - Documents to sign
   - Equipment pickup info
5. Create onboarding checklist (Asana/Monday)
6. Assign onboarding buddy
7. Schedule first week meetings
8. Add to payroll system (PayLinQ)
```

**Business Impact:** Zero-touch onboarding process

### 6. **Candidate Nurture Campaign**

**Trigger:** `application.reviewed` (but not advanced)

**Workflow:**
```
1. Application reviewed but not advanced → ActivePieces
2. Add candidate to "Talent Pool" in RecruitIQ
3. Subscribe to nurture email sequence (Mailchimp):
   - Week 1: Company culture email
   - Week 4: New job opportunities
   - Week 8: Career tips newsletter
4. Tag in CRM (HubSpot) as "Warm Lead"
5. Add to LinkedIn talent network
6. When new matching job posted:
   - Send personalized email
   - Notify recruiter of match
```

**Business Impact:** Build 10,000+ candidate talent pool

### 7. **Compliance & Audit Trail**

**Trigger:** Multiple events

**Workflow:**
```
1. Any hiring event → ActivePieces
2. Log to Google Sheets for audit trail:
   - Timestamp, event type, user, candidate
3. Check compliance rules:
   - Interview gender balance
   - Time-to-hire SLA
   - Candidate communication requirements
4. If violation detected:
   - Send alert to HR
   - Create Jira ticket
   - Log in compliance system
5. Weekly compliance report:
   - Export to PDF
   - Email to leadership
```

**Business Impact:** 100% audit-ready hiring process

### 8. **Recruiter Performance Dashboard**

**Trigger:** Multiple events (applications, hires, etc.)

**Workflow:**
```
1. Hiring events → ActivePieces
2. Calculate metrics:
   - Applications per recruiter
   - Time-to-hire average
   - Interview-to-offer ratio
   - Offer acceptance rate
3. Update Google Sheets dashboard
4. Generate visualizations (Google Data Studio)
5. Send weekly performance email to recruiters
6. If metrics below threshold:
   - Alert recruiting manager
   - Schedule 1-on-1 meeting
```

**Business Impact:** Data-driven recruiting optimization

### 9. **Background Check Automation**

**Trigger:** `application.advanced` (to "Background Check" stage)

**Workflow:**
```
1. Candidate reaches Background Check → ActivePieces
2. Send candidate consent form (DocuSign)
3. When signed:
   - Submit to Checkr API
   - Submit to Verifications.io API
4. Poll for completion (every 6 hours)
5. When complete:
   - If clear: advance to "Offer"
   - If flag: send alert to HR
   - Add report to candidate file
6. Update application with status
```

**Business Impact:** 90% faster background checks

### 10. **Employee Referral Tracking**

**Trigger:** `application.received`

**Workflow:**
```
1. Application received → ActivePieces
2. Check referral code in application data
3. If referral exists:
   - Look up referring employee (Nexus API)
   - Log referral in tracking system
   - Send thank you email to referrer
   - If candidate hired:
     * Calculate referral bonus
     * Create bonus payout in PayLinQ
     * Send congratulations email
4. Update referral leaderboard (Google Sheets)
5. Monthly referral report to leadership
```

**Business Impact:** 300% increase in employee referrals

---

## Technical Implementation

### Step 1: Webhook System Implementation

**Database Schema (PostgreSQL):**

```sql
-- File: backend/migrations/20251229_create_webhooks_tables.sql

-- Webhook subscriptions
CREATE TABLE public.webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Configuration
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Retry configuration
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_delay_seconds INTEGER NOT NULL DEFAULT 60,
  
  -- Statistics
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  successful_deliveries INTEGER NOT NULL DEFAULT 0,
  failed_deliveries INTEGER NOT NULL DEFAULT 0,
  last_delivery_at TIMESTAMP,
  last_success_at TIMESTAMP,
  last_failure_at TIMESTAMP,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_url_format CHECK (url ~ '^https?://'),
  CONSTRAINT check_events_not_empty CHECK (array_length(events, 1) > 0)
);

CREATE INDEX idx_webhook_subscriptions_org_id 
  ON webhook_subscriptions(organization_id) 
  WHERE deleted_at IS NULL;
  
CREATE INDEX idx_webhook_subscriptions_is_active 
  ON webhook_subscriptions(is_active) 
  WHERE deleted_at IS NULL;

-- Webhook events log
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Event details
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  
  -- Delivery status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP,
  delivered_at TIMESTAMP,
  
  -- HTTP details
  request_body JSONB,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  
  -- Retry
  next_retry_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_events_subscription_id 
  ON webhook_events(subscription_id);
  
CREATE INDEX idx_webhook_events_org_id 
  ON webhook_events(organization_id);
  
CREATE INDEX idx_webhook_events_status 
  ON webhook_events(status) 
  WHERE status IN ('pending', 'failed');
  
CREATE INDEX idx_webhook_events_next_retry 
  ON webhook_events(next_retry_at) 
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;
```

**WebhookService (Core Logic):**

```javascript
// File: backend/src/services/WebhookService.js

import crypto from 'crypto';
import axios from 'axios';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import Joi from 'joi';

class WebhookService {
  // Validation schemas
  static createSchema = Joi.object({
    url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
    events: Joi.array().items(Joi.string()).min(1).required(),
    description: Joi.string().max(500).optional()
  });

  /**
   * Create webhook subscription
   */
  async createSubscription(data, organizationId, userId) {
    // Validate
    const validated = await WebhookService.createSchema.validateAsync(data);
    
    // Generate secret for HMAC signatures
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

    const text = `
      INSERT INTO webhook_subscriptions (
        organization_id, url, events, secret, description,
        created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query(
      text,
      [organizationId, validated.url, validated.events, secret, 
       validated.description, userId, userId],
      organizationId,
      { operation: 'INSERT', table: 'webhook_subscriptions' }
    );

    logger.info('[Webhooks] Subscription created', {
      subscriptionId: result.rows[0].id,
      url: validated.url,
      events: validated.events,
      organizationId
    });

    return result.rows[0];
  }

  /**
   * Trigger webhook event
   * Called by services when events occur
   */
  async triggerEvent(eventType, eventData, organizationId) {
    try {
      // Find active subscriptions for this event type
      const subscriptions = await this.findSubscriptionsForEvent(
        eventType,
        organizationId
      );

      if (subscriptions.length === 0) {
        logger.debug('[Webhooks] No subscriptions for event', { 
          eventType, 
          organizationId 
        });
        return;
      }

      logger.info('[Webhooks] Triggering event', {
        eventType,
        subscriptionCount: subscriptions.length,
        organizationId
      });

      // Deliver to all subscriptions asynchronously
      const deliveryPromises = subscriptions.map(subscription =>
        this.deliverWebhook(subscription, eventType, eventData, organizationId)
      );

      // Don't wait for delivery (fire and forget)
      Promise.all(deliveryPromises).catch(error => {
        logger.error('[Webhooks] Batch delivery failed', { error });
      });

    } catch (error) {
      logger.error('[Webhooks] Failed to trigger event', { 
        eventType, 
        error: error.message 
      });
      // Don't throw - webhooks should never block main flow
    }
  }

  /**
   * Find subscriptions for event type
   */
  async findSubscriptionsForEvent(eventType, organizationId) {
    const text = `
      SELECT *
      FROM webhook_subscriptions
      WHERE organization_id = $1
        AND $2 = ANY(events)
        AND is_active = true
        AND deleted_at IS NULL
        AND consecutive_failures < 10
    `;

    const result = await query(
      text,
      [organizationId, eventType],
      organizationId,
      { operation: 'SELECT', table: 'webhook_subscriptions' }
    );

    return result.rows;
  }

  /**
   * Deliver webhook to endpoint
   */
  async deliverWebhook(subscription, eventType, eventData, organizationId) {
    const eventId = crypto.randomUUID();

    const payload = {
      id: eventId,
      type: eventType,
      timestamp: new Date().toISOString(),
      organizationId: organizationId,
      data: eventData
    };

    // Generate HMAC signature
    const signature = this.generateSignature(payload, subscription.secret);

    // Create event record
    await this.createEventRecord(
      subscription.id,
      organizationId,
      eventType,
      eventData,
      payload
    );

    try {
      // Deliver via HTTP POST
      const response = await axios.post(subscription.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RecruitIQ-Webhooks/1.0',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event-Type': eventType,
          'X-Webhook-Event-Id': eventId
        },
        timeout: 10000,  // 10 second timeout
        validateStatus: (status) => status >= 200 && status < 300
      });

      // Record success
      await this.recordDeliverySuccess(
        subscription.id,
        eventId,
        response.status,
        response.data
      );

      logger.info('[Webhooks] Delivered successfully', {
        subscriptionId: subscription.id,
        eventType,
        status: response.status
      });

    } catch (error) {
      // Record failure
      await this.recordDeliveryFailure(
        subscription.id,
        eventId,
        error.response?.status,
        error.message
      );

      logger.error('[Webhooks] Delivery failed', {
        subscriptionId: subscription.id,
        eventType,
        error: error.message
      });

      // Schedule retry
      await this.scheduleRetry(subscription.id, eventId);
    }
  }

  /**
   * Generate HMAC-SHA256 signature
   */
  generateSignature(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Create event record in database
   */
  async createEventRecord(subscriptionId, organizationId, eventType, 
                          eventData, payload) {
    const eventId = crypto.randomUUID();

    const text = `
      INSERT INTO webhook_events (
        id, subscription_id, organization_id,
        event_type, event_data, request_body
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    await query(
      text,
      [eventId, subscriptionId, organizationId, eventType, eventData, payload],
      organizationId,
      { operation: 'INSERT', table: 'webhook_events' }
    );

    return eventId;
  }

  /**
   * Record successful delivery
   */
  async recordDeliverySuccess(subscriptionId, eventId, status, responseData) {
    // Update event
    await query(`
      UPDATE webhook_events
      SET 
        status = 'delivered',
        delivered_at = NOW(),
        response_status = $1,
        response_body = $2,
        last_attempt_at = NOW(),
        attempts = attempts + 1
      WHERE id = $3
    `, [status, JSON.stringify(responseData).substring(0, 1000), eventId]);

    // Update subscription stats
    await query(`
      UPDATE webhook_subscriptions
      SET 
        total_deliveries = total_deliveries + 1,
        successful_deliveries = successful_deliveries + 1,
        last_delivery_at = NOW(),
        last_success_at = NOW(),
        consecutive_failures = 0,
        updated_at = NOW()
      WHERE id = $1
    `, [subscriptionId]);
  }

  /**
   * Record failed delivery
   */
  async recordDeliveryFailure(subscriptionId, eventId, status, errorMessage) {
    // Update event
    await query(`
      UPDATE webhook_events
      SET 
        status = 'failed',
        error_message = $1,
        response_status = $2,
        last_attempt_at = NOW(),
        attempts = attempts + 1
      WHERE id = $3
    `, [errorMessage, status, eventId]);

    // Update subscription stats
    await query(`
      UPDATE webhook_subscriptions
      SET 
        total_deliveries = total_deliveries + 1,
        failed_deliveries = failed_deliveries + 1,
        last_delivery_at = NOW(),
        last_failure_at = NOW(),
        consecutive_failures = consecutive_failures + 1,
        updated_at = NOW()
      WHERE id = $1
    `, [subscriptionId]);

    // Auto-disable after 10 consecutive failures
    await query(`
      UPDATE webhook_subscriptions
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND consecutive_failures >= 10
    `, [subscriptionId]);
  }

  /**
   * Schedule retry for failed event
   */
  async scheduleRetry(subscriptionId, eventId) {
    const subscription = await query(`
      SELECT max_retries, retry_delay_seconds
      FROM webhook_subscriptions
      WHERE id = $1
    `, [subscriptionId]);

    if (subscription.rows.length === 0) return;

    const { max_retries, retry_delay_seconds } = subscription.rows[0];

    const event = await query(`
      SELECT attempts
      FROM webhook_events
      WHERE id = $1
    `, [eventId]);

    if (event.rows.length === 0) return;

    const attempts = event.rows[0].attempts;

    if (attempts < max_retries) {
      // Exponential backoff: 60s, 180s, 540s
      const delayMultiplier = Math.pow(3, attempts - 1);
      const nextRetryAt = new Date(
        Date.now() + retry_delay_seconds * 1000 * delayMultiplier
      );

      await query(`
        UPDATE webhook_events
        SET next_retry_at = $1
        WHERE id = $2
      `, [nextRetryAt, eventId]);

      logger.info('[Webhooks] Retry scheduled', {
        eventId,
        nextRetryAt,
        attempt: attempts + 1
      });
    }
  }

  /**
   * List subscriptions
   */
  async listSubscriptions(organizationId) {
    const text = `
      SELECT 
        id, url, events, description, is_active,
        total_deliveries, successful_deliveries, failed_deliveries,
        last_delivery_at, last_success_at, last_failure_at,
        consecutive_failures, created_at, updated_at
      FROM webhook_subscriptions
      WHERE organization_id = $1
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    const result = await query(
      text,
      [organizationId],
      organizationId,
      { operation: 'SELECT', table: 'webhook_subscriptions' }
    );

    // Don't expose secrets in list response
    return result.rows;
  }

  /**
   * Get subscription by ID (includes secret)
   */
  async getSubscription(id, organizationId) {
    const text = `
      SELECT *
      FROM webhook_subscriptions
      WHERE id = $1
        AND organization_id = $2
        AND deleted_at IS NULL
    `;

    const result = await query(
      text,
      [id, organizationId],
      organizationId,
      { operation: 'SELECT', table: 'webhook_subscriptions' }
    );

    if (result.rows.length === 0) {
      throw new Error('Webhook subscription not found');
    }

    return result.rows[0];
  }

  /**
   * Update subscription
   */
  async updateSubscription(id, data, organizationId, userId) {
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (data.url) {
      updateFields.push(`url = $${paramCount++}`);
      values.push(data.url);
    }

    if (data.events) {
      updateFields.push(`events = $${paramCount++}`);
      values.push(data.events);
    }

    if (data.isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    if (data.description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push(`updated_by = $${paramCount++}`);
    updateFields.push(`updated_at = NOW()`);
    values.push(userId);

    values.push(id, organizationId);

    const text = `
      UPDATE webhook_subscriptions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount++}
        AND organization_id = $${paramCount}
        AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await query(
      text,
      values,
      organizationId,
      { operation: 'UPDATE', table: 'webhook_subscriptions' }
    );

    if (result.rows.length === 0) {
      throw new Error('Webhook subscription not found');
    }

    return result.rows[0];
  }

  /**
   * Delete subscription (soft delete)
   */
  async deleteSubscription(id, organizationId) {
    const text = `
      UPDATE webhook_subscriptions
      SET deleted_at = NOW()
      WHERE id = $1
        AND organization_id = $2
        AND deleted_at IS NULL
    `;

    const result = await query(
      text,
      [id, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'webhook_subscriptions' }
    );

    if (result.rowCount === 0) {
      throw new Error('Webhook subscription not found');
    }

    logger.info('[Webhooks] Subscription deleted', { id, organizationId });
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(id, organizationId) {
    const subscription = await this.getSubscription(id, organizationId);

    await this.deliverWebhook(
      subscription,
      'webhook.test',
      {
        message: 'This is a test webhook from RecruitIQ',
        timestamp: new Date().toISOString()
      },
      organizationId
    );
  }

  /**
   * List events for subscription
   */
  async listEvents(subscriptionId, organizationId, limit = 100) {
    const text = `
      SELECT 
        id, event_type, status, attempts,
        last_attempt_at, delivered_at,
        response_status, error_message,
        created_at
      FROM webhook_events
      WHERE subscription_id = $1
        AND organization_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;

    const result = await query(
      text,
      [subscriptionId, organizationId, limit],
      organizationId,
      { operation: 'SELECT', table: 'webhook_events' }
    );

    return result.rows;
  }
}

// Export singleton instance
export default new WebhookService();
```

### Step 2: Integrate Webhooks into Services

**Example: JobService with Webhook Triggers**

```javascript
// File: backend/src/services/JobService.js (modifications)

import WebhookService from './WebhookService.js';

class JobService {
  async create(data, organizationId, userId) {
    // ... existing validation and creation logic ...
    
    const job = await this.repository.create(jobData, organizationId, userId);
    
    // Trigger webhook event (async, non-blocking)
    WebhookService.triggerEvent(
      'job.created',
      { 
        job: {
          id: job.id,
          title: job.title,
          department: job.department,
          location: job.location,
          employmentType: job.employment_type,
          status: job.status,
          createdAt: job.created_at
        }
      },
      organizationId
    ).catch(error => {
      logger.error('[JobService] Webhook trigger failed', { error });
      // Don't throw - webhooks should never break main flow
    });
    
    return job;
  }

  async publish(id, organizationId, userId) {
    // ... existing publish logic ...
    
    const job = await this.repository.updateStatus(
      id,
      'open',
      organizationId,
      userId
    );
    
    // Trigger webhook event
    WebhookService.triggerEvent(
      'job.published',
      {
        job: {
          id: job.id,
          title: job.title,
          department: job.department,
          location: job.location,
          publishedAt: new Date().toISOString()
        }
      },
      organizationId
    ).catch(error => {
      logger.error('[JobService] Webhook trigger failed', { error });
    });
    
    return job;
  }
}
```

### Step 3: Webhook Routes & Controller

**Routes:**

```javascript
// File: backend/src/routes/webhooks.js

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import webhookController from '../controllers/webhookController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// List webhook subscriptions
router.get('/', webhookController.listSubscriptions);

// Create webhook subscription
router.post('/', webhookController.createSubscription);

// Get subscription details
router.get('/:id', webhookController.getSubscription);

// Update subscription
router.put('/:id', webhookController.updateSubscription);

// Delete subscription
router.delete('/:id', webhookController.deleteSubscription);

// Test webhook
router.post('/:id/test', webhookController.testWebhook);

// List events for subscription
router.get('/:id/events', webhookController.listEvents);

export default router;
```

**Controller:**

```javascript
// File: backend/src/controllers/webhookController.js

import WebhookService from '../services/WebhookService.js';
import logger from '../utils/logger.js';

class WebhookController {
  async listSubscriptions(req, res, next) {
    try {
      const { organizationId } = req.user;
      
      const subscriptions = await WebhookService.listSubscriptions(organizationId);
      
      return res.status(200).json({
        success: true,
        webhooks: subscriptions,
        count: subscriptions.length
      });
    } catch (error) {
      logger.error('[WebhookController] List failed', { error });
      next(error);
    }
  }

  async createSubscription(req, res, next) {
    try {
      const { organizationId, id: userId } = req.user;
      
      const subscription = await WebhookService.createSubscription(
        req.body,
        organizationId,
        userId
      );
      
      return res.status(201).json({
        success: true,
        webhook: subscription,
        message: 'Webhook subscription created successfully'
      });
    } catch (error) {
      logger.error('[WebhookController] Create failed', { error });
      next(error);
    }
  }

  async getSubscription(req, res, next) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user;
      
      const subscription = await WebhookService.getSubscription(id, organizationId);
      
      return res.status(200).json({
        success: true,
        webhook: subscription
      });
    } catch (error) {
      logger.error('[WebhookController] Get failed', { error });
      next(error);
    }
  }

  async updateSubscription(req, res, next) {
    try {
      const { id } = req.params;
      const { organizationId, id: userId } = req.user;
      
      const subscription = await WebhookService.updateSubscription(
        id,
        req.body,
        organizationId,
        userId
      );
      
      return res.status(200).json({
        success: true,
        webhook: subscription,
        message: 'Webhook subscription updated successfully'
      });
    } catch (error) {
      logger.error('[WebhookController] Update failed', { error });
      next(error);
    }
  }

  async deleteSubscription(req, res, next) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user;
      
      await WebhookService.deleteSubscription(id, organizationId);
      
      return res.status(200).json({
        success: true,
        message: 'Webhook subscription deleted successfully'
      });
    } catch (error) {
      logger.error('[WebhookController] Delete failed', { error });
      next(error);
    }
  }

  async testWebhook(req, res, next) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user;
      
      await WebhookService.testWebhook(id, organizationId);
      
      return res.status(200).json({
        success: true,
        message: 'Test webhook sent successfully'
      });
    } catch (error) {
      logger.error('[WebhookController] Test failed', { error });
      next(error);
    }
  }

  async listEvents(req, res, next) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user;
      const limit = parseInt(req.query.limit) || 100;
      
      const events = await WebhookService.listEvents(
        id,
        organizationId,
        limit
      );
      
      return res.status(200).json({
        success: true,
        events,
        count: events.length
      });
    } catch (error) {
      logger.error('[WebhookController] List events failed', { error });
      next(error);
    }
  }
}

export default new WebhookController();
```

---

## Security & Compliance

### 1. **Webhook Security**

**HMAC Signature Verification:**
- All webhooks signed with HMAC-SHA256
- Secret generated on subscription creation
- Recipients must verify signature before processing

**Example Verification (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expected = `sha256=${hmac.digest('hex')}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// In Express route handler
app.post('/webhooks/recruitiq', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhook(req.body, signature, WEBHOOK_SECRET);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  console.log('Received event:', req.body.type);
  res.status(200).json({ received: true });
});
```

### 2. **Data Privacy**

**Tenant Isolation:**
- All webhooks filtered by `organization_id`
- Impossible to subscribe to another organization's events
- Webhook URLs validated for HTTPS (production)

**PII Handling:**
- Only necessary data included in webhook payloads
- Sensitive data (SSN, full resumes) not sent via webhooks
- Option to exclude PII (configurable per subscription)

### 3. **Rate Limiting**

**Webhook Delivery:**
- Max 10 concurrent deliveries per organization
- Failed webhooks auto-disabled after 10 consecutive failures
- Exponential backoff for retries (60s, 180s, 540s)

**Subscription Limits:**
- Max 50 webhook subscriptions per organization
- Max 100 events per subscription
- Rate limits configurable per tier

### 4. **Audit Logging**

**Complete Audit Trail:**
- All webhook deliveries logged in `webhook_events` table
- Request/response captured for debugging
- Retention: 90 days (configurable)
- Compliance-ready logs for SOC 2, ISO 27001

---

## Rollout Strategy

### Phase 1: Internal Beta (Weeks 1-2)

**Goal:** Validate webhook system with internal testing

**Activities:**
- Deploy webhook infrastructure to staging
- Create test ActivePieces instance
- Build 3-5 test workflows
- Load testing (1000 webhooks/minute)
- Security audit

**Success Criteria:**
- ✅ 99.9% delivery success rate
- ✅ < 1 second delivery latency
- ✅ Zero security vulnerabilities
- ✅ Retry mechanism working correctly

### Phase 2: Private Beta (Weeks 3-4)

**Goal:** Test with 5-10 friendly customers

**Activities:**
- Invite customers to private beta
- Provide documentation and support
- Build custom workflows for each customer
- Gather feedback and iterate
- Create video tutorials

**Success Criteria:**
- ✅ 80% customer satisfaction
- ✅ At least 3 production workflows per customer
- ✅ No critical bugs
- ✅ Documentation complete

### Phase 3: Public Launch (Week 5+)

**Goal:** General availability to all customers

**Activities:**
- Announce ActivePieces integration
- Publish custom RecruitIQ piece to npm
- Release marketing materials
- Host webinar on workflow automation
- Monitor adoption metrics

**Success Criteria:**
- ✅ 20% customer adoption in first month
- ✅ 100+ active workflows
- ✅ Positive customer feedback
- ✅ No major incidents

### Phase 4: Monetization (Month 2+)

**Goal:** Create premium automation tier

**Options:**
- **Free Tier**: 100 webhook deliveries/month
- **Pro Tier**: 10,000 deliveries/month ($49/mo)
- **Enterprise Tier**: Unlimited + dedicated support ($199/mo)

**Premium Features:**
- Advanced workflow templates
- Priority webhook delivery
- Dedicated webhook endpoints
- SLA guarantees (99.95% uptime)
- Custom piece development support

---

## Success Metrics

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Webhook Delivery Success Rate** | > 99.9% | Successful deliveries / Total attempts |
| **Webhook Latency** | < 1 second | Time from event to delivery |
| **API Response Time** | < 200ms | P95 response time for webhook endpoints |
| **Uptime** | > 99.95% | Webhook service availability |
| **Error Rate** | < 0.1% | Failed deliveries due to system errors |

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Adoption Rate** | 20% in 3 months | % of customers with active webhooks |
| **Active Workflows** | 500 in 6 months | Total ActivePieces flows using RecruitIQ |
| **Integration Events** | 1M in 6 months | Total webhook events delivered |
| **Customer Satisfaction** | > 4.5/5 | NPS survey for automation features |
| **Time Saved** | 10 hours/week | Average time saved per customer |

### ROI Metrics

**Development Cost Savings:**
- Traditional approach: Build 10 integrations = 6 months + $200k
- ActivePieces approach: Build webhook system = 1 month + $30k
- **Savings: 5 months + $170k**

**Customer Value:**
- Manual screening: 20 applications/day × 10 min each = 3.3 hours
- With AI automation: 5 min review time = 1.7 hours
- **Time saved: 1.6 hours/day = 8 hours/week**

**Revenue Opportunity:**
- 100 customers × $49/mo (Pro tier) = $4,900/mo
- 20 customers × $199/mo (Enterprise tier) = $3,980/mo
- **ARR potential: $106,560**

---

## Next Steps

### Immediate Actions (This Week)

1. ✅ **Approve Plan**: Review and approve this integration plan
2. ⏳ **Assign Team**: Allocate 1 backend engineer + 1 DevOps engineer
3. ⏳ **Create Tickets**: Break down implementation into Jira stories
4. ⏳ **Setup Environment**: Provision ActivePieces test instance
5. ⏳ **Kickoff Meeting**: Align stakeholders on timeline and deliverables

### Week 1-2: Foundation

- [ ] Implement webhook database schema
- [ ] Build WebhookService core logic
- [ ] Create webhook routes and controller
- [ ] Write unit tests (90%+ coverage)
- [ ] Deploy to staging environment

### Week 3-4: Integration

- [ ] Integrate webhooks into all services
- [ ] Create custom RecruitIQ piece for ActivePieces
- [ ] Build 10 example workflows
- [ ] Complete documentation
- [ ] Internal testing and QA

### Week 5+: Launch

- [ ] Private beta with 10 customers
- [ ] Iterate based on feedback
- [ ] Public launch announcement
- [ ] Monitor metrics and optimize
- [ ] Plan Phase 2 enhancements

---

## Appendix A: Event Catalog

### Complete List of Webhook Events

**Job Events:**
- `job.created` - New job posting created
- `job.updated` - Job posting updated
- `job.published` - Job posting published
- `job.closed` - Job posting closed
- `job.deleted` - Job posting deleted

**Application Events:**
- `application.received` - New application received
- `application.reviewed` - Application reviewed
- `application.advanced` - Application advanced to next stage
- `application.rejected` - Application rejected
- `application.withdrawn` - Candidate withdrew application

**Interview Events:**
- `interview.scheduled` - Interview scheduled
- `interview.rescheduled` - Interview rescheduled
- `interview.completed` - Interview completed
- `interview.cancelled` - Interview cancelled
- `interview.feedback_submitted` - Interview feedback submitted

**Candidate Events:**
- `candidate.created` - New candidate added
- `candidate.updated` - Candidate profile updated
- `candidate.merged` - Duplicate candidates merged
- `candidate.tagged` - Candidate tagged

**Offer Events:**
- `offer.sent` - Offer sent to candidate
- `offer.accepted` - Offer accepted by candidate
- `offer.declined` - Offer declined by candidate
- `offer.expired` - Offer expired

**Hire Events:**
- `hire.completed` - Candidate hired (moved to Nexus)
- `hire.onboarding_started` - Onboarding process started

---

## Appendix B: Workflow Templates

### Template 1: AI Resume Screening

```yaml
name: AI Resume Screening
trigger: application.received
steps:
  1. Get application details from RecruitIQ API
  2. Download resume file
  3. Send to OpenAI GPT-4:
     prompt: "Analyze this resume for {job.title}. 
              Rate fit 1-100 and list 3 pros and 3 cons."
  4. Parse AI response
  5. If score > 80:
       - Update stage to "Interview"
       - Send email to hiring manager
       - Post to Slack
     Else if score < 50:
       - Update stage to "Rejected"
       - Send rejection email
     Else:
       - Add note: "Needs manual review"
```

### Template 2: Multi-Channel Job Distribution

```yaml
name: Multi-Channel Job Distribution
trigger: job.published
steps:
  1. Get job details from RecruitIQ API
  2. Format for LinkedIn
  3. Post to LinkedIn via API
  4. Format for Twitter
  5. Tweet via Twitter API
  6. Send to Slack #hiring channel
  7. Add to Google Sheets tracker
  8. Send confirmation email
```

### Template 3: Interview Scheduling

```yaml
name: Automated Interview Scheduling
trigger: application.advanced (stage = "Interview")
steps:
  1. Get candidate email from event
  2. Get hiring manager from RecruitIQ API
  3. Check hiring manager calendar (Google Calendar)
  4. Find 3 available slots (next 7 days)
  5. Send email to candidate with Calendly link
  6. When slot booked:
       - Create calendar events for all participants
       - Send confirmations
       - Update application in RecruitIQ
```

---

## Appendix C: API Authentication

### API Key Setup

**Step 1: Generate API Key**
```
POST /api/v1/api-keys
Authorization: Bearer {jwt_token}

{
  "name": "ActivePieces Integration",
  "scopes": ["webhooks:read", "webhooks:write", "jobs:read", 
             "applications:write", "candidates:read"]
}

Response:
{
  "success": true,
  "apiKey": {
    "id": "key_abc123",
    "key": "riq_live_1234567890abcdef",
    "name": "ActivePieces Integration",
    "scopes": [...],
    "createdAt": "2025-12-29T10:00:00Z"
  }
}
```

**Step 2: Use API Key**
```
GET /api/v1/jobs
Authorization: Bearer riq_live_1234567890abcdef

Response:
{
  "success": true,
  "jobs": [...]
}
```

**Step 3: Store in ActivePieces**
```typescript
// In ActivePieces authentication config
export const recruitiqAuth = PieceAuth.CustomAuth({
  displayName: 'RecruitIQ API Key',
  props: {
    baseUrl: Property.ShortText({
      displayName: 'Base URL',
      required: true,
      defaultValue: 'https://api.recruitiq.com'
    }),
    apiKey: PieceAuth.SecretText({
      displayName: 'API Key',
      description: 'Get your API key from RecruitIQ Settings',
      required: true
    })
  }
});
```

---

## Document Information

**Created By:** RecruitIQ Engineering Team  
**Document Version:** 1.0  
**Last Updated:** December 29, 2025  
**Next Review:** March 2026  
**Status:** Implementation Ready

**For Questions:**
- Technical: engineering@recruitiq.com
- Business: product@recruitiq.com
- Support: support@recruitiq.com

---

**References:**
- [ActivePieces Documentation](https://www.activepieces.com/docs)
- [ActivePieces GitHub](https://github.com/activepieces/activepieces)
- [Webhook Best Practices](https://webhooks.fyi/)
- [RecruitIQ API Documentation](./docs/API_STANDARDS.md)
