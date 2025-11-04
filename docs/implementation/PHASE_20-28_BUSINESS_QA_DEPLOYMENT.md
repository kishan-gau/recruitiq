# Phases 20-28: Business Features, Quality Assurance & Deployment

**Combined Duration:** 26 days  
**Dependencies:** Phases 1-19  
**Teams:** Full Stack Team, QA Team, DevOps Team  
**Status:** Not Started

---

## 📋 Overview

This document covers the final implementation phases focusing on business features, quality assurance, security hardening, performance optimization, documentation, and deployment preparation.

---

## 🎯 Phase Summaries

### Phase 20: Subscription & Billing System (4 days)
Implement multi-tier subscription management and billing integration

### Phase 21: Security Hardening (3 days)
Comprehensive security audit and hardening

### Phase 22: Performance Optimization (3 days)
Database, API, and frontend performance tuning

### Phase 23: Documentation & Training (3 days)
Complete user and developer documentation

### Phase 24: Integration Testing (4 days)
End-to-end cross-product testing

### Phase 25: User Acceptance Testing (3 days)
UAT with stakeholders and beta users

### Phase 26: Deployment Infrastructure (2 days)
Production environment setup

### Phase 27: Initial Deployment (2 days)
First production deployment

### Phase 28: Monitoring & Observability (2 days)
Production monitoring setup

---

## 📊 Phase 20: Subscription & Billing System

**Duration:** 4 days | **Team:** Backend (2 devs), Frontend (1 dev)

### Objectives
1. Implement subscription tier management
2. Create billing integration (Stripe)
3. Implement usage tracking
4. Create subscription upgrade/downgrade flows
5. Implement billing portal

### Key Deliverables

**Database Schema:**
```sql
-- Subscriptions table
CREATE TABLE core.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES core.organizations(id),
    product_id VARCHAR(50) NOT NULL, -- 'recruitiq', 'paylinq', 'nexus'
    tier VARCHAR(50) NOT NULL, -- 'starter', 'professional', 'enterprise'
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
    billing_cycle VARCHAR(50) NOT NULL, -- 'monthly', 'annual'
    stripe_subscription_id VARCHAR(255),
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE core.usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL, -- 'candidates', 'employees', 'payroll_runs'
    metric_value INTEGER NOT NULL,
    recorded_at TIMESTAMP DEFAULT NOW()
);
```

**Subscription Service:**
```javascript
class SubscriptionService {
  async createSubscription(organizationId, productId, tier, billingCycle) {
    // Create Stripe subscription
    // Create database record
    // Enable product access
    // Publish subscription.created event
  }
  
  async upgradeSubscription(subscriptionId, newTier) {
    // Update Stripe subscription
    // Update database
    // Adjust limits
    // Publish subscription.upgraded event
  }
  
  async cancelSubscription(subscriptionId, immediate = false) {
    // Cancel Stripe subscription
    // Update status
    // Publish subscription.cancelled event
  }
  
  async checkUsageLimit(organizationId, productId, metricName) {
    // Get current usage
    // Compare with tier limits
    // Return allowed/blocked
  }
}
```

### Tasks
- Task 20.1: Database schema (0.5 days)
- Task 20.2: Stripe integration (1.5 days)
- Task 20.3: Subscription service (1 day)
- Task 20.4: Billing portal UI (0.75 days)
- Task 20.5: Testing (0.25 days)

---

## 📊 Phase 21: Security Hardening

**Duration:** 3 days | **Team:** Security Engineer, Backend (2 devs)

### Objectives
1. Complete security audit
2. Implement rate limiting
3. Add security headers
4. SQL injection prevention audit
5. XSS prevention audit
6. CSRF protection
7. Secrets management
8. Penetration testing

### Key Deliverables

**Rate Limiting:**
```javascript
// middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts
  message: 'Too many login attempts'
});
```

**Security Headers:**
```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Secrets Management:**
```javascript
// Use AWS Secrets Manager or Azure Key Vault
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

class SecretsService {
  async getSecret(secretName) {
    const client = new SecretsManager({ region: 'us-east-1' });
    const response = await client.getSecretValue({ SecretId: secretName });
    return JSON.parse(response.SecretString);
  }
}
```

### Tasks
- Task 21.1: Security audit (1 day)
- Task 21.2: Rate limiting & headers (0.5 days)
- Task 21.3: Secrets management (0.5 days)
- Task 21.4: Penetration testing (0.75 days)
- Task 21.5: Fix vulnerabilities (0.25 days)

---

## 📊 Phase 22: Performance Optimization

**Duration:** 3 days | **Team:** Backend (2 devs), Frontend (1 dev), DBA

### Objectives
1. Database query optimization
2. Add caching layer (Redis)
3. API response optimization
4. Frontend performance tuning
5. Load testing
6. CDN setup for static assets

### Key Deliverables

**Caching Layer:**
```javascript
import Redis from 'ioredis';

class CacheService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async get(key) {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key, value, ttl = 3600) {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async invalidate(pattern) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

**Query Optimization:**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_candidates_status_org 
  ON recruitment.candidates(organization_id, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_employees_dept_status 
  ON hris.employees(department_id, employment_status) 
  WHERE deleted_at IS NULL;

-- Optimize slow queries
EXPLAIN ANALYZE SELECT ...;
```

**Frontend Optimization:**
```typescript
// Code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Employees = lazy(() => import('./pages/Employees'));

// Memoization
const MemoizedTable = React.memo(Table);

// Virtual scrolling for large lists
import { FixedSizeList } from 'react-window';
```

### Tasks
- Task 22.1: Database optimization (1 day)
- Task 22.2: Caching implementation (1 day)
- Task 22.3: Frontend optimization (0.75 days)
- Task 22.4: Load testing (0.25 days)

---

## 📊 Phase 23: Documentation & Training

**Duration:** 3 days | **Team:** Technical Writer, Product Manager, Developers

### Objectives
1. Complete user documentation
2. API documentation (OpenAPI/Swagger)
3. Developer onboarding guide
4. Video tutorials
5. Admin guide
6. Troubleshooting guide

### Key Deliverables

- User Guide (per product)
  - Getting Started
  - Feature walkthroughs
  - FAQs
  - Best practices

- API Documentation
  - OpenAPI specification
  - Authentication guide
  - Code examples
  - Postman collection

- Developer Guide
  - Architecture overview
  - Setup instructions
  - Coding standards
  - Deployment guide

- Video Tutorials
  - Product overviews (3x 10-min videos)
  - Admin tasks (2x 5-min videos)

### Tasks
- Task 23.1: User documentation (1 day)
- Task 23.2: API documentation (0.75 days)
- Task 23.3: Developer guide (0.75 days)
- Task 23.4: Video tutorials (0.5 days)

---

## 📊 Phase 24: Integration Testing

**Duration:** 4 days | **Team:** QA (3 testers), Developers

### Objectives
1. End-to-end workflow testing
2. Cross-product integration testing
3. Multi-tenant isolation testing
4. Performance testing under load
5. Browser compatibility testing
6. Mobile responsiveness testing

### Key Test Scenarios

**Scenario 1: Complete Recruitment to Payroll Flow**
1. Create candidate in RecruitIQ
2. Move through hiring pipeline
3. Hire candidate
4. Verify employee created in Nexus
5. Verify payroll record created in Paylinq
6. Create timesheet
7. Run payroll
8. Verify paycheck generated

**Scenario 2: Multi-Tenant Isolation**
1. Create two organizations
2. Create data in both
3. Verify each can only see their own data
4. Test cross-tenant access attempts (should fail)

**Load Testing:**
```javascript
// k6 load test script
import http from 'k6/http';

export const options = {
  vus: 100, // 100 virtual users
  duration: '5m'
};

export default function () {
  http.get('https://api.recruitiq.com/api/recruitment/candidates');
  http.post('https://api.recruitiq.com/api/hris/employees', ...);
}
```

### Tasks
- Task 24.1: E2E test scenarios (1.5 days)
- Task 24.2: Cross-product tests (1 day)
- Task 24.3: Performance tests (1 day)
- Task 24.4: Browser/mobile tests (0.5 days)

---

## 📊 Phase 25: User Acceptance Testing

**Duration:** 3 days | **Team:** Product Manager, QA, Beta Users

### Objectives
1. Beta user testing
2. Stakeholder demos
3. Collect feedback
4. Prioritize fixes
5. Fix critical issues
6. Get sign-off

### Activities
- Day 1: Setup beta environment, invite users
- Day 2: Monitor usage, collect feedback
- Day 3: Review feedback, prioritize, fix critical issues

### Acceptance Criteria
- [ ] All critical bugs fixed
- [ ] User workflows validated
- [ ] Performance acceptable
- [ ] Stakeholder sign-off obtained
- [ ] No blocker issues

### Tasks
- Task 25.1: Beta environment setup (0.5 days)
- Task 25.2: User testing (1.5 days)
- Task 25.3: Bug fixes (0.75 days)
- Task 25.4: Sign-off (0.25 days)

---

## 📊 Phase 26: Deployment Infrastructure

**Duration:** 2 days | **Team:** DevOps (2 engineers)

### Objectives
1. Setup production environment
2. Configure CI/CD pipelines
3. Setup database backups
4. Configure monitoring
5. Setup SSL certificates
6. Configure DNS

### Infrastructure Components

**AWS/Azure Setup:**
```yaml
# Infrastructure as Code (Terraform)
resource "aws_ecs_cluster" "recruitiq" {
  name = "recruitiq-production"
}

resource "aws_rds_instance" "postgres" {
  identifier = "recruitiq-db"
  engine = "postgres"
  instance_class = "db.t3.large"
  backup_retention_period = 30
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id = "recruitiq-cache"
  engine = "redis"
}
```

**CI/CD Pipeline:**
```yaml
# GitHub Actions
name: Deploy Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
      - run: npm run build
      - run: docker build -t recruitiq .
      - run: docker push recruitiq
      - run: kubectl apply -f k8s/
```

### Tasks
- Task 26.1: Infrastructure provisioning (1 day)
- Task 26.2: CI/CD setup (0.75 days)
- Task 26.3: SSL & DNS (0.25 days)

---

## 📊 Phase 27: Initial Deployment

**Duration:** 2 days | **Team:** DevOps, Backend Lead

### Objectives
1. Deploy backend services
2. Deploy frontend applications
3. Run database migrations
4. Verify all services running
5. Smoke testing
6. Create first organization

### Deployment Checklist
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] Backend services deployed
- [ ] Frontend apps deployed
- [ ] Health checks passing
- [ ] SSL certificates valid
- [ ] DNS records configured
- [ ] Backups configured
- [ ] Monitoring active

### Tasks
- Task 27.1: Backend deployment (0.75 days)
- Task 27.2: Frontend deployment (0.5 days)
- Task 27.3: Smoke testing (0.5 days)
- Task 27.4: First customer onboarding (0.25 days)

---

## 📊 Phase 28: Monitoring & Observability

**Duration:** 2 days | **Team:** DevOps, Backend Team

### Objectives
1. Setup application monitoring (Datadog/New Relic)
2. Setup error tracking (Sentry)
3. Setup log aggregation (CloudWatch/ELK)
4. Create dashboards
5. Configure alerts
6. Setup on-call rotation

### Monitoring Setup

**Application Metrics:**
```javascript
import { StatsD } from 'node-statsd';

const metrics = new StatsD();

// Track API response times
metrics.timing('api.response_time', duration);

// Track errors
metrics.increment('api.errors');

// Track business metrics
metrics.gauge('active_users', count);
```

**Health Check Endpoint:**
```javascript
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    integrationBus: await checkIntegrationBus()
  };
  
  const healthy = Object.values(checks).every(c => c === 'ok');
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks
  });
});
```

**Alerts:**
- API error rate > 1%
- Response time > 2s (95th percentile)
- Database connections > 80%
- Disk usage > 85%
- Failed login attempts > threshold

### Tasks
- Task 28.1: Monitoring setup (1 day)
- Task 28.2: Dashboards & alerts (0.75 days)
- Task 28.3: Documentation (0.25 days)

---

## 🎯 Overall Success Criteria

All phases 20-28 complete when:

1. ✅ Subscription system functional
2. ✅ Security audit passed
3. ✅ Performance targets met
4. ✅ Documentation complete
5. ✅ All integration tests passing
6. ✅ UAT sign-off obtained
7. ✅ Production deployed
8. ✅ Monitoring active
9. ✅ First customer onboarded
10. ✅ No critical issues

---

## 📤 Key Outputs

- [ ] Production-ready applications
- [ ] Complete documentation suite
- [ ] Monitoring dashboards
- [ ] CI/CD pipelines
- [ ] Security audit report
- [ ] Performance test results
- [ ] UAT sign-off document
- [ ] Deployment runbook

---

## ⚠️ Critical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Security vulnerabilities | Critical | Thorough audit; penetration testing |
| Performance issues | High | Load testing; optimization |
| Deployment failures | Critical | Staging environment; rollback plan |
| Data loss | Critical | Backups; disaster recovery plan |

---

## 🔗 Related Documents

- **Previous:** [Phases 17-19: Frontend Applications](./PHASE_17-19_FRONTEND_APPLICATIONS.md)
- **Related:** [PRODUCTION_RESOURCE_PLANNING.md](../../PRODUCTION_RESOURCE_PLANNING.md)
- **Related:** [DOCKER_DEPLOYMENT_GUIDE.md](../../DOCKER_DEPLOYMENT_GUIDE.md)

---

**Phase Owners:**  
- Phase 20: Backend Team Lead  
- Phase 21: Security Engineer  
- Phase 22: Performance Engineer  
- Phase 23: Technical Writer  
- Phase 24-25: QA Lead  
- Phase 26-28: DevOps Lead  

**Last Updated:** November 3, 2025  
**Status:** Ready to Start
