# Security Monitoring & Alerting

Comprehensive guide for security monitoring, event tracking, and alerting in RecruitIQ.

## Table of Contents

- [Overview](#overview)
- [Security Events](#security-events)
- [Alert System](#alert-system)
- [Integration](#integration)
  - [CloudWatch](#cloudwatch)
  - [Datadog](#datadog)
  - [Email Alerts](#email-alerts)
  - [Webhooks](#webhooks)
- [Security Dashboard](#security-dashboard)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

RecruitIQ implements comprehensive security monitoring to detect, track, and alert on security events in real-time.

### Key Features

- **Real-time Event Tracking**: Monitor security events as they occur
- **Brute Force Detection**: Automatic detection of login attacks
- **Anomaly Detection**: Identify unusual patterns and behaviors
- **Multi-Channel Alerts**: Email, Slack, webhooks, CloudWatch, Datadog
- **Security Dashboard**: Web-based dashboard for security metrics
- **Threat Correlation**: Connect related security events
- **Automated Response**: Trigger actions based on security events

### Architecture

```
┌─────────────┐
│ Application │
└──────┬──────┘
       │
       │ Security Events
       ▼
┌────────────────────┐
│ Security Monitor   │
│                    │
│ - Event Tracking   │
│ - Pattern Detection│
│ - Alert Generation │
└──────┬─────────────┘
       │
       │ Alerts
       ▼
┌────────────────────┐
│ Alert Channels     │
│                    │
│ - CloudWatch       │
│ - Datadog          │
│ - Email            │
│ - Webhooks         │
│ - Slack/Teams      │
└────────────────────┘
```

## Security Events

### Event Types

#### Authentication Events

| Event | Description | Severity |
|-------|-------------|----------|
| `failed_login` | Failed login attempt | Warning |
| `brute_force_detected` | Multiple failed logins detected | Critical |
| `account_locked` | User account locked due to failed logins | Warning |
| `suspicious_login` | Login from unusual location or time | Warning |
| `password_reset_requested` | Password reset requested | Info |

#### Authorization Events

| Event | Description | Severity |
|-------|-------------|----------|
| `unauthorized_access` | Attempt to access without authentication | Warning |
| `privilege_escalation` | Attempt to access higher privileges | Critical |
| `forbidden_resource` | Access to forbidden resource | Warning |

#### Data Events

| Event | Description | Severity |
|-------|-------------|----------|
| `sensitive_data_access` | Access to sensitive data | Info |
| `bulk_data_export` | Large data export operation | Warning |
| `data_modification` | Sensitive data modified | Info |
| `encryption_failure` | Encryption/decryption failed | Error |

#### System Events

| Event | Description | Severity |
|-------|-------------|----------|
| `rate_limit_exceeded` | API rate limit exceeded | Warning |
| `sql_injection_attempt` | SQL injection pattern detected | Critical |
| `xss_attempt` | XSS pattern detected | Critical |
| `csrf_violation` | CSRF token validation failed | Error |
| `malicious_file_upload` | Malicious file detected | Critical |

#### Configuration Events

| Event | Description | Severity |
|-------|-------------|----------|
| `config_changed` | Configuration modified | Info |
| `secret_accessed` | Secret accessed from secrets manager | Info |
| `certificate_expiring` | TLS certificate expiring soon | Warning |

#### Anomaly Events

| Event | Description | Severity |
|-------|-------------|----------|
| `unusual_activity` | Unusual activity pattern | Warning |
| `geographic_anomaly` | Access from unusual location | Warning |
| `time_anomaly` | Access during unusual hours | Info |

### Tracking Events

```javascript
import securityMonitor, { SecurityEventType } from './services/securityMonitor.js';

// Track a security event
securityMonitor.trackEvent(SecurityEventType.FAILED_LOGIN, {
  ip: req.ip,
  username: req.body.email,
  userAgent: req.get('user-agent'),
  endpoint: req.path,
});
```

### Using Middleware

```javascript
import {
  trackFailedLogin,
  trackSuccessfulLogin,
  trackUnauthorizedAccess,
} from './middleware/securityMonitoring.js';

// Track failed login
app.post('/api/auth/login', async (req, res) => {
  try {
    const user = await authenticateUser(req.body.email, req.body.password);
    
    if (!user) {
      trackFailedLogin(req, { email: req.body.email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    trackSuccessfulLogin(req, user);
    res.json({ token: generateToken(user) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Track unauthorized access
app.get('/api/admin/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    trackUnauthorizedAccess(req, '/api/admin/users');
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Return users...
});
```

## Alert System

### Alert Severity Levels

- **Info**: Informational events that don't require immediate action
- **Warning**: Events that should be investigated but aren't critical
- **Error**: Errors that need attention
- **Critical**: Critical security issues requiring immediate action

### Alert Triggers

Alerts are automatically triggered when:

1. **Brute Force Detected**: 5+ failed logins in 15 minutes from same IP
2. **Rate Limit Violations**: 100+ violations in 1 minute
3. **Attack Attempts**: Any SQL injection or XSS attempt
4. **Malicious Uploads**: Virus or malware detected in uploaded files
5. **Certificate Expiring**: TLS certificate expiring within 30 days

### Alert Cooldown

To prevent alert spam, alerts have a 5-minute cooldown period. Duplicate alerts from the same source within this period are suppressed.

### Customizing Thresholds

```bash
# Environment variables
FAILED_LOGIN_THRESHOLD=5
FAILED_LOGIN_WINDOW_MS=900000  # 15 minutes
RAPID_REQUEST_THRESHOLD=100
RAPID_REQUEST_WINDOW_MS=60000  # 1 minute
ALERT_COOLDOWN_MS=300000       # 5 minutes
```

## Integration

### CloudWatch

#### Setup

1. **Install AWS SDK**:
```bash
npm install @aws-sdk/client-cloudwatch @aws-sdk/client-cloudwatch-logs
```

2. **Configure Credentials**:
```bash
# Environment variables
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Enable CloudWatch
CLOUDWATCH_ENABLED=true
CLOUDWATCH_NAMESPACE=RecruitIQ/Security
CLOUDWATCH_REGION=us-east-1
```

3. **IAM Permissions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

#### Metrics Sent

- `SecurityEvents`: Count of security events by type
- `FailedLogins`: Count of failed login attempts
- `BruteForceAttempts`: Count of brute force detections
- `RateLimitViolations`: Count of rate limit violations
- `SQLInjectionAttempts`: Count of SQL injection attempts
- `XSSAttempts`: Count of XSS attempts
- `SecurityAlerts`: Count of alerts by severity

### Datadog

#### Setup

1. **Configure API Keys**:
```bash
# Environment variables
DATADOG_API_KEY=your_api_key
DATADOG_APP_KEY=your_app_key
DATADOG_SITE=datadoghq.com  # or datadoghq.eu for EU

# Enable Datadog
DATADOG_ENABLED=true
DATADOG_SERVICE=recruitiq
```

2. **Metrics Sent**:
- `recruitiq.security.events`: Security event count
- `recruitiq.security.alerts`: Alert count
- Event details sent as Datadog events for critical/error severity

3. **Datadog Dashboard**:

Create a custom dashboard with:
- Security events timeline
- Failed login rate
- Alert distribution by severity
- Top attack sources (IPs)

### Email Alerts

#### Setup

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=security@recruitiq.com

# Enable email alerts
ALERT_CHANNELS=log,email
```

#### Email Template

Alerts include:
- Alert severity and type
- Timestamp
- Detailed description
- Source IP and user information
- Recommended actions

### Webhooks

#### Setup

```bash
# Webhook Configuration
ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
ALERT_CHANNELS=log,webhook
```

#### Webhook Payload

```json
{
  "id": "alert-1635789012345-abc123",
  "type": "brute_force_detected",
  "severity": "critical",
  "timestamp": "2024-10-28T10:30:12.345Z",
  "description": "Brute force attack detected from IP 192.168.1.1. 5 failed login attempts.",
  "metadata": {
    "ip": "192.168.1.1",
    "attemptCount": 5,
    "attemptedUsernames": ["admin@example.com", "user@example.com"],
    "windowStart": "2024-10-28T10:15:12.345Z"
  }
}
```

#### Webhook Security

- Use HTTPS endpoints only
- Implement signature verification
- Rate limit webhook calls
- Validate webhook responses

### Slack Integration

#### Setup

1. **Create Slack App**: https://api.slack.com/apps
2. **Enable Incoming Webhooks**
3. **Get Webhook URL**
4. **Configure**:

```bash
ALERT_CHANNELS=log,slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Security Dashboard

### API Endpoints

All dashboard endpoints require admin authentication.

#### GET `/api/security/dashboard`

Get security dashboard overview.

**Response**:
```json
{
  "overview": {
    "totalEvents": 1234,
    "alertsSent": 12,
    "activeThreats": {
      "failedLogins": 3,
      "rateLimitViolations": 1
    },
    "status": "healthy"
  },
  "recentEvents": {
    "eventsByType": {
      "failed_login": 45,
      "unauthorized_access": 12,
      "rate_limit_exceeded": 8
    },
    "lastAlert": {
      "id": "alert-123",
      "type": "brute_force_detected",
      "severity": "critical",
      "timestamp": "2024-10-28T10:30:12.345Z"
    }
  },
  "systemHealth": {
    "monitoring": { "status": "healthy" },
    "encryption": { "valid": true },
    "tls": { "valid": true }
  }
}
```

#### GET `/api/security/metrics`

Get detailed security metrics.

#### GET `/api/security/events`

Get recent security events.

**Query Parameters**:
- `type`: Filter by event type
- `severity`: Filter by severity
- `limit`: Number of events (default: 100)

#### GET `/api/security/alerts`

Get recent alerts.

**Query Parameters**:
- `severity`: Filter by severity
- `limit`: Number of alerts (default: 50)

#### GET `/api/security/threats`

Get active threats.

#### GET `/api/security/health`

Get security system health status.

#### GET `/api/security/statistics`

Get security statistics for a time period.

**Query Parameters**:
- `period`: Time period (24h, 7d, 30d)

### Dashboard UI

Create a React dashboard component:

```jsx
import React, { useEffect, useState } from 'react';

function SecurityDashboard() {
  const [dashboard, setDashboard] = useState(null);
  
  useEffect(() => {
    fetch('/api/security/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => setDashboard(data));
  }, []);
  
  if (!dashboard) return <div>Loading...</div>;
  
  return (
    <div className="security-dashboard">
      <h1>Security Dashboard</h1>
      
      <div className="metrics">
        <div className="metric">
          <h3>Total Events</h3>
          <p>{dashboard.overview.totalEvents}</p>
        </div>
        <div className="metric">
          <h3>Alerts</h3>
          <p>{dashboard.overview.alertsSent}</p>
        </div>
        <div className="metric">
          <h3>Active Threats</h3>
          <p>{dashboard.overview.activeThreats.failedLogins}</p>
        </div>
      </div>
      
      {/* Add charts and visualizations */}
    </div>
  );
}
```

## Configuration

### Environment Variables

```bash
# Monitoring
SECURITY_MONITORING_ENABLED=true
ALERT_CHANNELS=log,email,webhook,cloudwatch,datadog

# Thresholds
FAILED_LOGIN_THRESHOLD=5
FAILED_LOGIN_WINDOW_MS=900000
RAPID_REQUEST_THRESHOLD=100
RAPID_REQUEST_WINDOW_MS=60000
ALERT_COOLDOWN_MS=300000

# CloudWatch
CLOUDWATCH_ENABLED=true
CLOUDWATCH_NAMESPACE=RecruitIQ/Security
CLOUDWATCH_REGION=us-east-1

# Datadog
DATADOG_ENABLED=true
DATADOG_API_KEY=your_api_key
DATADOG_APP_KEY=your_app_key
DATADOG_SITE=datadoghq.com
DATADOG_SERVICE=recruitiq

# Webhooks
ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Programmatic Configuration

```javascript
import config from './config/index.js';

// Override default thresholds
process.env.FAILED_LOGIN_THRESHOLD = '10';
process.env.FAILED_LOGIN_WINDOW_MS = '600000'; // 10 minutes
```

## Usage Examples

### Example 1: Track Login Events

```javascript
import { trackFailedLogin, trackSuccessfulLogin } from './middleware/securityMonitoring.js';

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ where: { email } });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      trackFailedLogin(req, { email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    trackSuccessfulLogin(req, user);
    
    const token = generateToken(user);
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Example 2: Track Data Access

```javascript
import { trackSensitiveDataAccess } from './middleware/securityMonitoring.js';

app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Track sensitive data access
    trackSensitiveDataAccess(req, 'user_profile', user.id);
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Example 3: Custom Security Event

```javascript
import securityMonitor, { SecurityEventType } from './services/securityMonitor.js';

// Track custom security event
app.post('/api/admin/config', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { key, value } = req.body;
    
    // Update configuration
    await updateConfig(key, value);
    
    // Track configuration change
    securityMonitor.trackEvent(SecurityEventType.CONFIG_CHANGED, {
      userId: req.user.id,
      username: req.user.email,
      configKey: key,
      ip: req.ip,
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Example 4: Monitor Certificate Expiry

```javascript
import tlsConfig from './utils/tlsConfig.js';
import securityMonitor, { SecurityEventType } from './services/securityMonitor.js';

// Check certificate expiry daily
setInterval(() => {
  const certPath = process.env.TLS_CERT_PATH;
  const expiry = tlsConfig.checkCertificateExpiry(certPath, 30);
  
  if (expiry.warning || expiry.expired) {
    securityMonitor.trackEvent(SecurityEventType.CERTIFICATE_EXPIRING, {
      daysUntilExpiry: expiry.daysUntilExpiry,
      expiryDate: expiry.expiryDate,
      certPath,
    });
  }
}, 24 * 60 * 60 * 1000); // Once per day
```

## Best Practices

### 1. Event Tracking

✅ **DO**:
- Track all authentication events (success and failure)
- Track access to sensitive data
- Track configuration changes
- Track administrative actions
- Include relevant context (IP, user, endpoint)

❌ **DON'T**:
- Log sensitive data (passwords, tokens, PII)
- Track every request (performance impact)
- Include full request/response bodies
- Ignore low-severity events

### 2. Alert Configuration

✅ **DO**:
- Use appropriate severity levels
- Set reasonable thresholds
- Enable alert cooldown
- Test alerts regularly
- Monitor multiple channels

❌ **DON'T**:
- Set thresholds too low (alert fatigue)
- Ignore warnings
- Rely on single channel
- Skip alert testing

### 3. Monitoring Strategy

✅ **DO**:
- Review security dashboard daily
- Analyze event trends
- Investigate all critical alerts
- Update thresholds based on patterns
- Document incident responses

❌ **DON'T**:
- Ignore repeated events
- Dismiss anomalies
- Disable monitoring in production
- Forget to rotate logs

### 4. Integration

✅ **DO**:
- Use CloudWatch or Datadog in production
- Implement webhook authentication
- Test integrations before deployment
- Monitor integration health
- Have fallback alerting

❌ **DON'T**:
- Expose webhook URLs publicly
- Skip error handling
- Ignore failed alert deliveries
- Forget to test failover

### 5. Dashboard Usage

✅ **DO**:
- Review dashboard regularly
- Set up automated reports
- Share metrics with team
- Track security KPIs
- Document trends

❌ **DON'T**:
- Ignore dashboard warnings
- Skip regular reviews
- Hide security metrics
- Dismiss patterns

## Troubleshooting

### No Alerts Received

**Check**:
1. Monitoring enabled: `SECURITY_MONITORING_ENABLED=true`
2. Alert channels configured: `ALERT_CHANNELS=log,email`
3. Thresholds set correctly
4. Events being tracked (check logs)
5. Integration credentials valid

### High False Positive Rate

**Solutions**:
- Increase failed login threshold
- Extend time windows
- Whitelist known IPs
- Tune detection patterns
- Review event types

### CloudWatch Integration Not Working

**Check**:
1. AWS credentials configured
2. IAM permissions correct
3. CloudWatch enabled: `CLOUDWATCH_ENABLED=true`
4. Region set correctly
5. Check CloudWatch logs for errors

### Datadog Integration Not Working

**Check**:
1. API key valid
2. Datadog enabled: `DATADOG_ENABLED=true`
3. Site correct (datadoghq.com vs datadoghq.eu)
4. Network connectivity
5. Check application logs

### Dashboard Not Loading

**Check**:
1. User has admin role
2. Authentication token valid
3. API endpoints accessible
4. CORS configured correctly
5. Check browser console for errors

---

**Last Updated**: October 2024
**Version**: 1.0.0
**Maintained by**: RecruitIQ Security Team
