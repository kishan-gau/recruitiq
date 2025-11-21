# Health Monitoring System - Implementation Plan (Part 4)

**Continuation of:** [HEALTH_MONITORING_PLAN_PART3.md](./HEALTH_MONITORING_PLAN_PART3.md)

---

## Database Schema

### Health Check Tables

**File:** `backend/src/database/migrations/20251120000000_create_health_tables.sql`

```sql
-- Health Checks Time-Series Table
CREATE TABLE health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source Information
  vps_id VARCHAR(100) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  service_type VARCHAR(50) NOT NULL, -- 'backend', 'frontend', 'database', 'redis', etc.
  
  -- Health Status
  status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'unhealthy', 'unknown'
  health_score DECIMAL(5,2), -- 0-100
  
  -- Response Metrics
  response_time_ms INTEGER,
  uptime_seconds BIGINT,
  
  -- Dependency Status (JSONB for flexibility)
  dependencies JSONB, -- { "database": "healthy", "redis": "healthy" }
  
  -- System Metrics
  cpu_percent DECIMAL(5,2),
  memory_percent DECIMAL(5,2),
  disk_percent DECIMAL(5,2),
  
  -- Additional Details
  details JSONB,
  error_message TEXT,
  
  -- Timestamps
  checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for queries
  INDEX idx_health_checks_vps_time (vps_id, checked_at DESC),
  INDEX idx_health_checks_service_time (service_name, checked_at DESC),
  INDEX idx_health_checks_status (status),
  INDEX idx_health_checks_time (checked_at DESC)
);

-- Partition by time for performance (monthly partitions)
CREATE TABLE health_checks_2025_11 PARTITION OF health_checks
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Comment
COMMENT ON TABLE health_checks IS 'Time-series health check data for all services';

-- Health Alerts Table
CREATE TABLE health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Alert Identification
  alert_rule_id UUID NOT NULL,
  alert_code VARCHAR(100) NOT NULL, -- 'DB_CONNECTION_FAILURE', 'HIGH_MEMORY'
  
  -- Severity
  severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
  
  -- Source
  vps_id VARCHAR(100),
  service_name VARCHAR(100),
  tenant_id UUID,
  
  -- Alert Content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'snoozed'
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP,
  resolved_by UUID,
  resolved_at TIMESTAMP,
  snoozed_until TIMESTAMP,
  
  -- Metrics
  trigger_value DECIMAL(10,2),
  threshold_value DECIMAL(10,2),
  
  -- Timestamps
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_health_alerts_status (status),
  INDEX idx_health_alerts_severity (severity),
  INDEX idx_health_alerts_vps (vps_id),
  INDEX idx_health_alerts_time (triggered_at DESC)
);

COMMENT ON TABLE health_alerts IS 'Health alerts and their lifecycle';

-- Alert Rules Table
CREATE TABLE health_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule Identification
  rule_code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Condition
  metric_name VARCHAR(100) NOT NULL, -- 'database.status', 'system.memory.percent'
  operator VARCHAR(20) NOT NULL, -- 'equals', 'greaterThan', 'lessThan'
  threshold_value DECIMAL(10,2) NOT NULL,
  duration_seconds INTEGER NOT NULL, -- How long condition must persist
  
  -- Severity & Actions
  severity VARCHAR(20) NOT NULL,
  notification_channels JSONB NOT NULL, -- ['email', 'sms', 'webhook']
  notification_recipients JSONB NOT NULL, -- ['admin@example.com']
  escalate_after_seconds INTEGER,
  
  -- Scope
  applies_to_vps VARCHAR(100), -- NULL = all VPS, specific VPS ID = only that VPS
  applies_to_service VARCHAR(100), -- NULL = all services, specific service = only that
  
  -- Status
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  
  -- Indexes
  INDEX idx_alert_rules_enabled (is_enabled),
  INDEX idx_alert_rules_metric (metric_name)
);

COMMENT ON TABLE health_alert_rules IS 'Configurable alert rules for health monitoring';

-- Alert Notifications Table
CREATE TABLE health_alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  alert_id UUID NOT NULL REFERENCES health_alerts(id) ON DELETE CASCADE,
  
  -- Notification Details
  channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'webhook'
  recipient VARCHAR(255) NOT NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMP,
  failed_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Content
  subject VARCHAR(255),
  message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_notifications_alert (alert_id),
  INDEX idx_notifications_status (status),
  INDEX idx_notifications_time (created_at DESC)
);

COMMENT ON TABLE health_alert_notifications IS 'Alert notification delivery tracking';

-- Health Configuration Table
CREATE TABLE health_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID
);

COMMENT ON TABLE health_config IS 'System-wide health monitoring configuration';

-- Insert default configuration
INSERT INTO health_config (key, value, description) VALUES
  ('collection_interval_seconds', '30', 'How often to collect health data from each service'),
  ('cache_ttl_seconds', '30', 'Health data cache TTL'),
  ('alert_deduplication_window_seconds', '300', 'Prevent duplicate alerts within this window'),
  ('vps_registry', '[]', 'List of VPS instances to monitor'),
  ('notification_rate_limit', '{"email": 10, "sms": 5}', 'Max notifications per hour per channel');

-- Health Aggregates Table (for fast queries)
CREATE TABLE health_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Aggregation Period
  period_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily'
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Aggregation Scope
  vps_id VARCHAR(100),
  service_name VARCHAR(100),
  
  -- Aggregated Metrics
  avg_health_score DECIMAL(5,2),
  min_health_score DECIMAL(5,2),
  max_health_score DECIMAL(5,2),
  
  avg_response_time_ms INTEGER,
  p95_response_time_ms INTEGER,
  p99_response_time_ms INTEGER,
  
  uptime_percent DECIMAL(5,2),
  downtime_seconds INTEGER,
  
  alert_count INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint
  UNIQUE (period_type, period_start, vps_id, service_name),
  
  -- Indexes
  INDEX idx_aggregates_period (period_type, period_start DESC),
  INDEX idx_aggregates_vps (vps_id, period_start DESC),
  INDEX idx_aggregates_service (service_name, period_start DESC)
);

COMMENT ON TABLE health_aggregates IS 'Pre-computed health metrics aggregates for fast queries';
```

---

## Configuration Management

### VPS Registry Configuration

**File:** `backend/src/config/vpsRegistry.json`

```json
{
  "vps": [
    {
      "id": "vps-nl-001",
      "name": "Netherlands VPS 1",
      "region": "nl-west",
      "provider": "transip",
      "baseUrl": "https://vps1.recruitiq.nl",
      "healthEndpoint": "/health",
      "services": [
        {
          "name": "backend-api",
          "type": "backend",
          "url": "https://api.vps1.recruitiq.nl/health"
        },
        {
          "name": "nexus-frontend",
          "type": "frontend",
          "url": "https://nexus.vps1.recruitiq.nl"
        },
        {
          "name": "paylinq-frontend",
          "type": "frontend",
          "url": "https://paylinq.vps1.recruitiq.nl"
        },
        {
          "name": "portal-frontend",
          "type": "frontend",
          "url": "https://portal.vps1.recruitiq.nl"
        },
        {
          "name": "recruitiq-frontend",
          "type": "frontend",
          "url": "https://app.vps1.recruitiq.nl"
        }
      ],
      "tenants": [
        "tenant-acme-001",
        "tenant-techcorp-002"
      ],
      "monitoring": {
        "enabled": true,
        "checkInterval": 30,
        "timeout": 10
      }
    },
    {
      "id": "vps-nl-002",
      "name": "Netherlands VPS 2",
      "region": "nl-west",
      "provider": "transip",
      "baseUrl": "https://vps2.recruitiq.nl",
      "healthEndpoint": "/health",
      "services": [
        {
          "name": "backend-api",
          "type": "backend",
          "url": "https://api.vps2.recruitiq.nl/health"
        },
        {
          "name": "nexus-frontend",
          "type": "frontend",
          "url": "https://nexus.vps2.recruitiq.nl"
        }
      ],
      "tenants": [
        "tenant-globex-003"
      ],
      "monitoring": {
        "enabled": true,
        "checkInterval": 30,
        "timeout": 10
      }
    }
  ]
}
```

### Default Alert Rules

**File:** `backend/src/config/defaultAlertRules.json`

```json
[
  {
    "rule_code": "DATABASE_CONNECTION_FAILURE",
    "name": "Database Connection Failure",
    "description": "Alert when database connection fails",
    "metric_name": "database.status",
    "operator": "equals",
    "threshold_value": "unhealthy",
    "duration_seconds": 60,
    "severity": "critical",
    "notification_channels": ["email", "sms"],
    "notification_recipients": ["admin@recruitiq.com", "+31612345678"],
    "escalate_after_seconds": 300
  },
  {
    "rule_code": "HIGH_MEMORY_USAGE",
    "name": "High Memory Usage",
    "description": "Alert when memory usage exceeds 85%",
    "metric_name": "system.memory.percent",
    "operator": "greaterThan",
    "threshold_value": 85,
    "duration_seconds": 300,
    "severity": "warning",
    "notification_channels": ["email"],
    "notification_recipients": ["ops@recruitiq.com"]
  },
  {
    "rule_code": "HIGH_CPU_USAGE",
    "name": "High CPU Usage",
    "description": "Alert when CPU usage exceeds 90%",
    "metric_name": "system.cpu.percent",
    "operator": "greaterThan",
    "threshold_value": 90,
    "duration_seconds": 300,
    "severity": "warning",
    "notification_channels": ["email"],
    "notification_recipients": ["ops@recruitiq.com"]
  },
  {
    "rule_code": "LOW_DISK_SPACE",
    "name": "Low Disk Space",
    "description": "Alert when disk usage exceeds 85%",
    "metric_name": "system.disk.percent",
    "operator": "greaterThan",
    "threshold_value": 85,
    "duration_seconds": 600,
    "severity": "warning",
    "notification_channels": ["email"],
    "notification_recipients": ["ops@recruitiq.com"]
  },
  {
    "rule_code": "SERVICE_DOWN",
    "name": "Service Down",
    "description": "Alert when a service becomes unreachable",
    "metric_name": "service.status",
    "operator": "equals",
    "threshold_value": "unhealthy",
    "duration_seconds": 120,
    "severity": "critical",
    "notification_channels": ["email", "sms"],
    "notification_recipients": ["admin@recruitiq.com"],
    "escalate_after_seconds": 600
  },
  {
    "rule_code": "SLOW_API_RESPONSE",
    "name": "Slow API Response Time",
    "description": "Alert when API response time exceeds 2 seconds",
    "metric_name": "api.response_time_ms",
    "operator": "greaterThan",
    "threshold_value": 2000,
    "duration_seconds": 300,
    "severity": "warning",
    "notification_channels": ["email"],
    "notification_recipients": ["dev@recruitiq.com"]
  },
  {
    "rule_code": "REDIS_CONNECTION_FAILURE",
    "name": "Redis Connection Failure",
    "description": "Alert when Redis connection fails",
    "metric_name": "redis.status",
    "operator": "equals",
    "threshold_value": "unhealthy",
    "duration_seconds": 120,
    "severity": "warning",
    "notification_channels": ["email"],
    "notification_recipients": ["ops@recruitiq.com"]
  },
  {
    "rule_code": "S3_CONNECTION_FAILURE",
    "name": "S3 Connection Failure",
    "description": "Alert when S3 connection fails",
    "metric_name": "s3.status",
    "operator": "equals",
    "threshold_value": "unhealthy",
    "duration_seconds": 120,
    "severity": "warning",
    "notification_channels": ["email"],
    "notification_recipients": ["ops@recruitiq.com"]
  }
]
```

---

## Success Metrics & KPIs

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Health Check Latency** | < 100ms | Average time to complete health check |
| **API Response Time** | < 200ms (cached) | `/health/overview` endpoint |
| **WebSocket Latency** | < 1 second | Time from health change to client update |
| **Data Collection Interval** | 30 seconds | How often health data is collected |
| **Cache Hit Rate** | > 90% | Percentage of requests served from cache |
| **Alert Delivery Time** | < 30 seconds | Time from condition to notification |
| **False Positive Rate** | < 5% | Percentage of alerts that are false positives |
| **System Overhead** | < 2% CPU | Resource usage of monitoring system |

### Business Metrics

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| **MTTR** | 45 min | < 10 min | 78% reduction |
| **Unplanned Downtime** | 2-3 hours/month | < 30 min/month | 90% reduction |
| **Incident Detection Time** | 15-30 min | < 2 min | 87% faster |
| **Customer Satisfaction** | N/A | > 4.5/5 | Transparency builds trust |
| **SLA Compliance** | Unknown | 99.9% | Measurable uptime |

### User Adoption Metrics

| Metric | Week 1 | Week 4 | Week 12 |
|--------|--------|--------|---------|
| **Active Admin Users** | 5 | 15 | 30 |
| **Dashboard Views/Day** | 20 | 100 | 300 |
| **Alert Response Time** | N/A | < 5 min | < 3 min |
| **Manual Health Checks** | 10/day | 5/day | 1/day |

---

## Risk Mitigation

### Potential Risks & Mitigations

#### 1. Performance Impact
**Risk:** Health monitoring adds load to production systems

**Mitigation:**
- Use lightweight health checks (< 100ms each)
- Implement aggressive caching (30s TTL)
- Use background workers for collection
- Rate limit health check requests
- Monitor monitoring system resource usage

#### 2. Alert Fatigue
**Risk:** Too many alerts lead to ignored notifications

**Mitigation:**
- Start with conservative thresholds
- Implement alert deduplication (5 min window)
- Use severity levels (info/warning/critical)
- Allow snoozing of non-critical alerts
- Track and reduce false positives

#### 3. Data Storage Growth
**Risk:** Time-series data grows unbounded

**Mitigation:**
- Partition tables by month
- Implement data retention policy (90 days)
- Use pre-computed aggregates for old data
- Archive to cold storage after 30 days

#### 4. Single Point of Failure
**Risk:** Monitoring system itself becomes unavailable

**Mitigation:**
- Deploy monitoring service separately from main app
- Use separate database connection pool
- Implement circuit breakers
- Fallback to basic health checks if system fails

#### 5. Security Concerns
**Risk:** Health data exposes system internals

**Mitigation:**
- Require admin authentication
- Rate limit API requests
- Sanitize error messages
- Audit log all health data access
- Use HTTPS for all communication

---

## Rollback Plan

### If Issues Arise

#### Phase 1: Disable Dashboard
1. Hide health dashboard from Portal menu
2. No backend changes needed
3. Monitoring continues in background

#### Phase 2: Disable Alerts
1. Set `is_enabled = false` for all alert rules
2. Stop alert engine service
3. Health data still collected

#### Phase 3: Disable Collection
1. Stop health collector service
2. Fallback to basic `/health` endpoints only
3. Minimal system impact

#### Phase 4: Complete Rollback
1. Drop health-related database tables
2. Remove health monitoring code
3. Restore previous version from git

### Rollback Triggers
- System performance degradation > 5%
- Critical bug affecting core functionality
- Data storage growth > 10GB/day
- False positive rate > 20%
- Customer complaints about system slowness

---

## Maintenance & Operations

### Ongoing Maintenance Tasks

#### Daily
- Monitor alert false positive rate
- Review critical alerts
- Check system performance metrics

#### Weekly
- Review health trends
- Tune alert thresholds if needed
- Clean up resolved alerts (> 7 days old)
- Review notification delivery rates

#### Monthly
- Archive health data (> 30 days)
- Review and optimize database queries
- Update alert rules based on patterns
- Generate uptime reports for customers

#### Quarterly
- Review VPS registry
- Update health check endpoints
- Performance optimization
- Capacity planning based on trends

---

## Future Enhancements (Post-Launch)

### Phase 2 Features (3-6 months)

1. **Predictive Analytics**
   - Machine learning models to predict failures
   - Anomaly detection for unusual patterns
   - Capacity forecasting

2. **Customer Status Page**
   - Public-facing status page
   - Subscribe to status updates
   - Historical uptime display

3. **Integration with External Tools**
   - PagerDuty integration
   - Slack notifications
   - Datadog/New Relic integration
   - Grafana dashboards

4. **Advanced Alerting**
   - Alert routing based on time of day
   - On-call schedule integration
   - Intelligent alert grouping
   - Auto-remediation actions

5. **Mobile App**
   - Native iOS/Android apps
   - Push notifications
   - Quick actions for incident response

---

## Approval & Sign-Off

### Stakeholder Review

| Stakeholder | Role | Approval Date | Status |
|-------------|------|---------------|--------|
| Technical Lead | Architecture Review | [Pending] | ⏳ |
| Product Manager | Business Value | [Pending] | ⏳ |
| DevOps Lead | Operations Impact | [Pending] | ⏳ |
| Security Team | Security Review | [Pending] | ⏳ |
| CTO | Final Approval | [Pending] | ⏳ |

### Ready for Implementation?

- [ ] All stakeholders reviewed plan
- [ ] Architecture approved
- [ ] Resources allocated
- [ ] Timeline approved
- [ ] Budget approved
- [ ] Risk mitigation acceptable

---

## Appendix

### References

1. [Health Check Best Practices](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/monitor-app-health)
2. [Kubernetes Health Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
3. [Site Reliability Engineering (Google)](https://sre.google/sre-book/monitoring-distributed-systems/)
4. [The Twelve-Factor App - Admin Processes](https://12factor.net/admin-processes)

### Tools & Libraries

- **Backend:** Node.js, Express, Socket.io
- **Frontend:** React, TanStack Query, Recharts
- **Database:** PostgreSQL (time-series), Redis (cache)
- **Testing:** Jest, Playwright, Autocannon
- **Monitoring:** Winston (logging), Prometheus (metrics)

---

**End of Implementation Plan**

For questions or clarifications, contact: [Your Name/Email]
