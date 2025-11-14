# Metabase Integration - BI Frontend

**Document:** 06-METABASE-INTEGRATION.md  
**Project:** Multi-Tenant Consolidated Reporting System  
**Created:** November 13, 2025  

---

## Overview

Metabase is an open-source Business Intelligence tool that provides a user-friendly interface for creating dashboards and reports. This document covers installation, configuration, and integration with the reporting engine's security model.

---

## 1. Why Metabase?

### Advantages

✅ **Free & Open Source** - No licensing costs  
✅ **User-Friendly** - Non-technical users can create reports  
✅ **Self-Hosted** - Full control over data and infrastructure  
✅ **SQL Support** - Power users can write custom queries  
✅ **Dashboard Builder** - Drag-and-drop interface  
✅ **Multiple Visualizations** - Charts, tables, maps, etc.  
✅ **Scheduled Reports** - Email reports automatically  
✅ **REST API** - Programmatic access for integration  
✅ **SSO Support** - SAML, JWT authentication  

### Alternative BI Tools

- **Redash** - Open-source, more developer-focused
- **Apache Superset** - Open-source, feature-rich but complex
- **Tableau** - Enterprise-grade but expensive ($70+/user/month)
- **Power BI** - Microsoft, good for Office 365 integration
- **Looker** - Google, expensive enterprise option

**Verdict:** Metabase offers the best balance of features, ease-of-use, and cost for this project.

---

## 2. Installation & Setup

### Docker Compose Setup

```yaml
# docker-compose.metabase.yml

version: '3.8'

services:
  metabase:
    image: metabase/metabase:v0.48.0
    container_name: recruitiq-metabase
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      # Database for Metabase application data
      MB_DB_TYPE: postgres
      MB_DB_DBNAME: metabase
      MB_DB_PORT: 5432
      MB_DB_USER: metabase
      MB_DB_PASS: ${METABASE_DB_PASSWORD}
      MB_DB_HOST: metabase-db
      
      # Java options
      JAVA_TIMEZONE: America/New_York
      MB_JETTY_PORT: 3000
      
      # Security
      MB_PASSWORD_COMPLEXITY: strong
      MB_PASSWORD_LENGTH: 12
      MB_SESSION_TIMEOUT: 480  # 8 hours in minutes
      
      # Email settings (for scheduled reports)
      MB_EMAIL_SMTP_HOST: ${SMTP_HOST}
      MB_EMAIL_SMTP_PORT: ${SMTP_PORT}
      MB_EMAIL_SMTP_USERNAME: ${SMTP_USER}
      MB_EMAIL_SMTP_PASSWORD: ${SMTP_PASSWORD}
      MB_EMAIL_SMTP_SECURITY: tls
      
      # JWT authentication (for SSO with reporting backend)
      MB_JWT_SHARED_SECRET: ${JWT_SHARED_SECRET}
      MB_JWT_IDENTITY_PROVIDER_URI: ${BACKEND_URL}/api/auth/metabase-sso
      
    volumes:
      - metabase-data:/metabase-data
    networks:
      - reporting-network
    depends_on:
      - metabase-db
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  metabase-db:
    image: postgres:15-alpine
    container_name: metabase-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: metabase
      POSTGRES_USER: metabase
      POSTGRES_PASSWORD: ${METABASE_DB_PASSWORD}
    volumes:
      - metabase-db-data:/var/lib/postgresql/data
    networks:
      - reporting-network

volumes:
  metabase-data:
  metabase-db-data:

networks:
  reporting-network:
    external: true
```

### Start Metabase

```bash
# Start Metabase
docker-compose -f docker-compose.metabase.yml up -d

# Check logs
docker logs -f recruitiq-metabase

# Access Metabase
# Open browser: http://localhost:3001
```

### Initial Configuration

1. **First-Time Setup** (http://localhost:3001/setup)
   - Language: English
   - Create admin account:
     - Email: admin@recruitiq.com
     - Password: (strong password, store securely)
   
2. **Skip "Add your data" for now** - We'll configure this programmatically

3. **Complete setup** - You'll be redirected to the home page

---

## 3. Database Connection Setup

### Connect to Reporting Database

```javascript
// scripts/setup-metabase-connection.js

const axios = require('axios');

const METABASE_URL = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@recruitiq.com';
const ADMIN_PASSWORD = process.env.METABASE_ADMIN_PASSWORD;

async function setupMetabase() {
  // 1. Login to get session token
  const loginResponse = await axios.post(`${METABASE_URL}/api/session`, {
    username: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });

  const sessionToken = loginResponse.data.id;
  const headers = { 'X-Metabase-Session': sessionToken };

  // 2. Add reporting database connection
  const dbResponse = await axios.post(`${METABASE_URL}/api/database`, {
    engine: 'postgres',
    name: 'RecruitIQ Reporting',
    details: {
      host: process.env.REPORTING_DB_HOST || 'reporting-db',
      port: 5432,
      dbname: 'recruitiq_reporting',
      user: 'reporting_reader',  // Read-only user
      password: process.env.REPORTING_READER_PASSWORD,
      ssl: true,
      'tunnel-enabled': false,
      'advanced-options': true,
      'schema-filters-type': 'inclusion',
      'schema-filters-patterns': 'reporting,operational' // Limit to these schemas
    },
    is_full_sync: true,
    is_on_demand: false,
    schedules: {
      metadata_sync: {
        schedule_day: null,
        schedule_frame: null,
        schedule_hour: 2,
        schedule_type: 'daily'
      },
      cache_field_values: {
        schedule_day: null,
        schedule_frame: null,
        schedule_hour: 3,
        schedule_type: 'daily'
      }
    }
  }, { headers });

  const databaseId = dbResponse.data.id;
  console.log(`Database connected with ID: ${databaseId}`);

  // 3. Sync database schema
  await axios.post(
    `${METABASE_URL}/api/database/${databaseId}/sync_schema`,
    {},
    { headers }
  );

  console.log('Database schema sync initiated');

  // 4. Create collections for organizing dashboards
  const collections = [
    { name: 'HR Reports', color: '#509EE3' },
    { name: 'Payroll Reports', color: '#88BF4D' },
    { name: 'Executive Dashboards', color: '#ED6E6E' },
    { name: 'Compliance Reports', color: '#F9D45C' }
  ];

  for (const collection of collections) {
    await axios.post(`${METABASE_URL}/api/collection`, collection, { headers });
    console.log(`Created collection: ${collection.name}`);
  }

  console.log('Metabase setup completed!');
}

setupMetabase().catch(console.error);
```

Run the setup script:

```bash
node scripts/setup-metabase-connection.js
```

---

## 4. Row-Level Security in Metabase

Metabase supports row-level security through **Sandboxing**. This ensures users only see data for their authorized organizations.

### Enable Sandboxing (Metabase Enterprise Feature Alternative)

Since sandboxing is an Enterprise feature, we'll implement security at the query level using our backend API.

### Option 1: Use Backend API as Data Source

Instead of connecting Metabase directly to PostgreSQL, connect it to our reporting API.

```javascript
// Add to backend: src/routes/metabase.routes.js

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');

/**
 * Metabase-compatible SQL endpoint
 * Accepts SQL query, applies organization filtering, returns results
 */
router.post('/query',
  authenticate,
  async (req, res) => {
    const { query, parameters } = req.body;

    try {
      // Parse and validate SQL query
      const secureQuery = await injectOrganizationFilter(
        query,
        req.auth.filteredOrganizations
      );

      // Execute with parameters
      const { rows } = await db.query(secureQuery, parameters);

      res.json({
        data: rows,
        columns: Object.keys(rows[0] || {}),
        rows: rows.length
      });

    } catch (error) {
      res.status(400).json({
        error: 'query_failed',
        message: error.message
      });
    }
  }
);

/**
 * Inject organization filter into SQL query
 */
async function injectOrganizationFilter(query, allowedOrgIds) {
  // Parse SQL and add WHERE clause with organization filtering
  // This is a simplified example - use a proper SQL parser in production
  
  const orgFilter = `organization_id = ANY(ARRAY[${allowedOrgIds.map(id => `'${id}'`).join(',')}])`;
  
  if (query.toLowerCase().includes('where')) {
    return query.replace(/where/i, `WHERE ${orgFilter} AND `);
  } else {
    // Add WHERE clause before ORDER BY, GROUP BY, or LIMIT
    const insertPoint = query.search(/(order by|group by|limit)/i);
    if (insertPoint > -1) {
      return query.slice(0, insertPoint) + ` WHERE ${orgFilter} ` + query.slice(insertPoint);
    } else {
      return query + ` WHERE ${orgFilter}`;
    }
  }
}

module.exports = router;
```

### Option 2: Create Parameterized Views

Create PostgreSQL views with user context:

```sql
-- Create view that respects current user context
CREATE OR REPLACE VIEW reporting.employee_details_secure AS
SELECT *
FROM reporting.employee_details
WHERE organization_id IN (
  SELECT organization_id
  FROM security.get_user_accessible_orgs(
    current_setting('app.current_user_id')::uuid
  )
);

-- Set user context before queries
SELECT set_config('app.current_user_id', '<user-id-here>', false);
```

### Option 3: Use Metabase Saved Questions

Create "Saved Questions" in Metabase with organization filtering built-in, then restrict users to only use those pre-approved questions.

---

## 5. Creating Dashboards

### Example Dashboard: HR Executive Summary

```javascript
// scripts/create-hr-dashboard.js

const axios = require('axios');

async function createHRDashboard(sessionToken) {
  const headers = { 'X-Metabase-Session': sessionToken };
  const METABASE_URL = 'http://localhost:3001';

  // 1. Create dashboard
  const dashboard = await axios.post(`${METABASE_URL}/api/dashboard`, {
    name: 'HR Executive Summary',
    description: 'Key HR metrics and headcount trends',
    collection_id: null // Or specify collection ID
  }, { headers });

  const dashboardId = dashboard.data.id;

  // 2. Create question: Total Headcount
  const headcountQuestion = await axios.post(`${METABASE_URL}/api/card`, {
    name: 'Total Headcount',
    dataset_query: {
      type: 'query',
      database: 1, // Database ID from setup
      query: {
        'source-table': 'reporting.employee_details',
        aggregation: [['count']],
        filter: ['=', ['field', 'employment_status'], 'active']
      }
    },
    display: 'scalar',
    visualization_settings: {
      'scalar.field': 'count'
    }
  }, { headers });

  // 3. Add question to dashboard
  await axios.post(`${METABASE_URL}/api/dashboard/${dashboardId}/cards`, {
    cardId: headcountQuestion.data.id,
    row: 0,
    col: 0,
    sizeX: 4,
    sizeY: 3
  }, { headers });

  // 4. Create question: Headcount by Department
  const deptHeadcountQuestion = await axios.post(`${METABASE_URL}/api/card`, {
    name: 'Headcount by Department',
    dataset_query: {
      type: 'query',
      database: 1,
      query: {
        'source-table': 'reporting.employee_details',
        aggregation: [['count']],
        breakout: [['field', 'department_name']],
        filter: ['=', ['field', 'employment_status'], 'active']
      }
    },
    display: 'bar',
    visualization_settings: {
      'graph.dimensions': ['department_name'],
      'graph.metrics': ['count']
    }
  }, { headers });

  await axios.post(`${METABASE_URL}/api/dashboard/${dashboardId}/cards`, {
    cardId: deptHeadcountQuestion.data.id,
    row: 0,
    col: 4,
    sizeX: 8,
    sizeY: 6
  }, { headers });

  // 5. Create question: Turnover Rate
  const turnoverQuestion = await axios.post(`${METABASE_URL}/api/card`, {
    name: 'Monthly Turnover Rate',
    dataset_query: {
      type: 'native',
      database: 1,
      native: {
        query: `
          SELECT 
            turnover_month,
            AVG(monthly_turnover_rate) as turnover_rate
          FROM reporting.turnover_metrics
          WHERE turnover_month > NOW() - INTERVAL '12 months'
          GROUP BY turnover_month
          ORDER BY turnover_month
        `
      }
    },
    display: 'line',
    visualization_settings: {
      'graph.dimensions': ['turnover_month'],
      'graph.metrics': ['turnover_rate']
    }
  }, { headers });

  await axios.post(`${METABASE_URL}/api/dashboard/${dashboardId}/cards`, {
    cardId: turnoverQuestion.data.id,
    row: 6,
    col: 0,
    sizeX: 12,
    sizeY: 6
  }, { headers });

  console.log(`Dashboard created: ${METABASE_URL}/dashboard/${dashboardId}`);
  return dashboardId;
}
```

---

## 6. User Synchronization

Sync reporting users to Metabase for seamless access.

```javascript
// src/services/metabase.service.js

const axios = require('axios');
const db = require('../database/connection');

class MetabaseService {
  constructor() {
    this.baseUrl = process.env.METABASE_URL || 'http://localhost:3001';
    this.adminSession = null;
  }

  /**
   * Login as admin
   */
  async loginAsAdmin() {
    const response = await axios.post(`${this.baseUrl}/api/session`, {
      username: process.env.METABASE_ADMIN_EMAIL,
      password: process.env.METABASE_ADMIN_PASSWORD
    });

    this.adminSession = response.data.id;
    return this.adminSession;
  }

  /**
   * Get headers with session token
   */
  getHeaders() {
    return { 'X-Metabase-Session': this.adminSession };
  }

  /**
   * Sync reporting user to Metabase
   */
  async syncUser(reportingUser) {
    if (!this.adminSession) {
      await this.loginAsAdmin();
    }

    try {
      // Check if user exists in Metabase
      const { data: existingUsers } = await axios.get(
        `${this.baseUrl}/api/user`,
        { headers: this.getHeaders() }
      );

      const existingUser = existingUsers.data.find(
        u => u.email === reportingUser.email
      );

      if (existingUser) {
        // Update existing user
        await axios.put(
          `${this.baseUrl}/api/user/${existingUser.id}`,
          {
            first_name: reportingUser.first_name,
            last_name: reportingUser.last_name,
            is_superuser: reportingUser.role === 'super_admin'
          },
          { headers: this.getHeaders() }
        );

        return existingUser.id;
      } else {
        // Create new user
        const { data: newUser } = await axios.post(
          `${this.baseUrl}/api/user`,
          {
            email: reportingUser.email,
            first_name: reportingUser.first_name,
            last_name: reportingUser.last_name,
            password: this.generateRandomPassword(),
            is_superuser: reportingUser.role === 'super_admin'
          },
          { headers: this.getHeaders() }
        );

        return newUser.id;
      }
    } catch (error) {
      console.error('Failed to sync user to Metabase:', error.message);
      throw error;
    }
  }

  /**
   * Generate SSO URL for user
   */
  async generateSSOUrl(reportingUser, dashboardId = null) {
    const jwt = require('jsonwebtoken');

    const payload = {
      email: reportingUser.email,
      first_name: reportingUser.first_name,
      last_name: reportingUser.last_name,
      exp: Math.floor(Date.now() / 1000) + (60 * 10) // 10 minutes
    };

    const token = jwt.sign(payload, process.env.JWT_SHARED_SECRET);

    let ssoUrl = `${this.baseUrl}/auth/sso?jwt=${token}`;
    
    if (dashboardId) {
      ssoUrl += `&return_to=/dashboard/${dashboardId}`;
    }

    return ssoUrl;
  }

  /**
   * Generate random password
   */
  generateRandomPassword() {
    return Math.random().toString(36).slice(-16) + 
           Math.random().toString(36).slice(-16).toUpperCase() +
           '!@#';
  }
}

module.exports = new MetabaseService();
```

### Add SSO Endpoint to Backend

```javascript
// Add to auth routes: src/routes/auth.routes.js

/**
 * GET /api/auth/metabase-sso
 * Generate Metabase SSO URL for authenticated user
 */
router.get('/metabase-sso',
  authenticate,
  async (req, res) => {
    try {
      const { rows } = await db.query(
        'SELECT * FROM security.reporting_users WHERE id = $1',
        [req.auth.userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = rows[0];
      const dashboardId = req.query.dashboard;

      const ssoUrl = await metabaseService.generateSSOUrl(user, dashboardId);

      res.json({ ssoUrl });

    } catch (error) {
      console.error('Metabase SSO failed:', error);
      res.status(500).json({
        error: 'sso_failed',
        message: 'Failed to generate Metabase SSO URL'
      });
    }
  }
);
```

---

## 7. Scheduled Reports

### Configure Email Reports in Metabase

Users can schedule dashboards to be emailed automatically:

1. Open dashboard in Metabase
2. Click "⋯" (more options) → "Subscriptions"
3. Click "Set up a dashboard subscription"
4. Configure:
   - Recipients: email addresses
   - Frequency: Daily, Weekly, Monthly
   - Time: When to send
   - Format: PDF or PNG

### Programmatic Report Scheduling

```javascript
// scripts/schedule-report.js

async function scheduleReport(sessionToken, dashboardId, recipients) {
  const response = await axios.post(
    `${METABASE_URL}/api/pulse`,
    {
      name: 'HR Weekly Report',
      dashboard_id: dashboardId,
      cards: [], // Empty means all cards in dashboard
      channels: [
        {
          enabled: true,
          channel_type: 'email',
          schedule_type: 'weekly',
          schedule_day: 'mon',
          schedule_hour: 8,
          schedule_frame: null,
          recipients: recipients.map(email => ({ email }))
        }
      ]
    },
    { headers: { 'X-Metabase-Session': sessionToken } }
  );

  console.log('Report scheduled:', response.data.id);
}
```

---

## 8. Embedding Dashboards

Embed Metabase dashboards in your application using iframes with signed URLs.

```javascript
// Backend: Generate signed embed URL
const jwt = require('jsonwebtoken');

function generateEmbedUrl(dashboardId, params = {}) {
  const payload = {
    resource: { dashboard: dashboardId },
    params: params,
    exp: Math.floor(Date.now() / 1000) + (60 * 10) // 10 minutes
  };

  const token = jwt.sign(payload, process.env.METABASE_EMBED_SECRET);

  return `${process.env.METABASE_URL}/embed/dashboard/${token}#bordered=true&titled=true`;
}
```

```html
<!-- Frontend: Embed in iframe -->
<iframe
  src="<%= embedUrl %>"
  frameborder="0"
  width="100%"
  height="800"
  allowtransparency
></iframe>
```

---

## 9. Backup & Restore

### Backup Metabase Application Database

```bash
#!/bin/bash
# backup-metabase.sh

BACKUP_DIR="/var/backups/metabase"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup Metabase PostgreSQL database
docker exec metabase-postgres pg_dump -U metabase metabase | \
  gzip > "$BACKUP_DIR/metabase_${TIMESTAMP}.sql.gz"

echo "Metabase backup completed: metabase_${TIMESTAMP}.sql.gz"
```

### Restore Metabase

```bash
#!/bin/bash
# restore-metabase.sh

BACKUP_FILE=$1

gunzip -c $BACKUP_FILE | \
  docker exec -i metabase-postgres psql -U metabase -d metabase

echo "Metabase restored from $BACKUP_FILE"
```

---

## Summary

### Metabase Setup Checklist

- ✅ Install Metabase via Docker Compose
- ✅ Configure initial admin account
- ✅ Connect to reporting PostgreSQL database
- ✅ Create collections for organizing reports
- ✅ Implement row-level security (via backend API or views)
- ✅ Sync users from reporting system
- ✅ Set up SSO with JWT
- ✅ Create initial dashboards (HR, Payroll, Executive)
- ✅ Configure scheduled email reports
- ✅ Set up backup procedures

### Key Integration Points

1. **Authentication** - JWT SSO from reporting backend
2. **Data Access** - Via reporting_reader PostgreSQL user
3. **Security** - Organization filtering at query level
4. **User Sync** - Automatic via Metabase API
5. **Embedding** - Signed URLs for in-app dashboards

---

**Status:** ✅ Metabase Integration Complete  
**Next:** 07-DEPLOYMENT-GUIDE.md
