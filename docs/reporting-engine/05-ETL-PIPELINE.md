# ETL Pipeline - Data Synchronization

**Document:** 05-ETL-PIPELINE.md  
**Project:** Multi-Tenant Consolidated Reporting System  
**Created:** November 13, 2025  

---

## Overview

The ETL (Extract, Transform, Load) pipeline synchronizes data from operational databases to the reporting database. It runs nightly during off-hours to ensure fresh data without impacting production systems.

---

## 1. ETL Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    OPERATIONAL DATABASES                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Nexus DB   │  │  PayLinq DB  │  │ScheduleHub DB│      │
│  │  (HRIS Data) │  │(Payroll Data)│  │(Schedule Data)│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   ETL ORCHESTRATOR   │
                  │   (Node.js + Cron)   │
                  └──────────┬───────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │ Extract  │ │Transform │ │  Load    │
         │  Layer   │ │  Layer   │ │  Layer   │
         └────┬─────┘ └────┬─────┘ └────┬─────┘
              │            │            │
              └────────────┴────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  REPORTING DATABASE   │
              │   (PostgreSQL 15+)    │
              │                       │
              │  ┌─────────────────┐  │
              │  │ Operational     │  │
              │  │ Schema          │  │
              │  └─────────────────┘  │
              │  ┌─────────────────┐  │
              │  │ Reporting       │  │
              │  │ Materialized    │  │
              │  │ Views           │  │
              │  └─────────────────┘  │
              └───────────────────────┘
```

### Scheduling Strategy

```
Nightly ETL Schedule (Runs at 2:00 AM Server Time):

2:00 AM - Start ETL Orchestrator
2:01 AM - Extract Organizations
2:05 AM - Extract Employees (Parallel: Nexus)
2:10 AM - Extract Departments
2:15 AM - Extract Payroll Data (Parallel: PayLinq)
2:25 AM - Extract Scheduling Data (Parallel: ScheduleHub)
2:30 AM - Transform & Load
2:45 AM - Refresh Materialized Views
3:00 AM - ETL Complete, Send Status Email

On-Demand: Manual refresh via API endpoint (admin only)
```

---

## 2. ETL Service Implementation

### Project Structure

```
etl-service/
├── src/
│   ├── orchestrator.js        # Main ETL coordinator
│   ├── extractors/
│   │   ├── base.extractor.js
│   │   ├── nexus.extractor.js
│   │   ├── paylinq.extractor.js
│   │   └── schedulehub.extractor.js
│   ├── transformers/
│   │   ├── employee.transformer.js
│   │   ├── payroll.transformer.js
│   │   └── schedule.transformer.js
│   ├── loaders/
│   │   └── database.loader.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── notifications.js
│   │   └── retry.js
│   └── config/
│       ├── databases.js
│       └── schedule.js
├── scripts/
│   ├── run-etl.js
│   └── manual-sync.js
├── package.json
└── .env.example
```

### ETL Orchestrator

```javascript
// src/orchestrator.js

const cron = require('node-cron');
const db = require('./config/databases');
const logger = require('./utils/logger');
const notifier = require('./utils/notifications');

// Extractors
const NexusExtractor = require('./extractors/nexus.extractor');
const PayLinqExtractor = require('./extractors/paylinq.extractor');
const ScheduleHubExtractor = require('./extractors/schedulehub.extractor');

// Loaders
const DatabaseLoader = require('./loaders/database.loader');

class ETLOrchestrator {
  constructor() {
    this.jobRunId = null;
    this.stats = {
      startTime: null,
      endTime: null,
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      errors: []
    };
  }

  /**
   * Start scheduled ETL job
   */
  start() {
    // Schedule nightly at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      logger.info('Starting scheduled ETL job');
      await this.runFullSync();
    });

    logger.info('ETL Orchestrator started. Scheduled for 2:00 AM daily.');
  }

  /**
   * Run full data synchronization
   */
  async runFullSync() {
    this.stats.startTime = new Date();
    
    try {
      // Create job run record
      this.jobRunId = await this.createJobRun('full_sync');
      logger.info(`ETL Job Started: ${this.jobRunId}`);

      // Phase 1: Extract from operational databases
      logger.info('Phase 1: Extracting data from operational databases');
      const extractedData = await this.extractPhase();

      // Phase 2: Transform data
      logger.info('Phase 2: Transforming data');
      const transformedData = await this.transformPhase(extractedData);

      // Phase 3: Load into reporting database
      logger.info('Phase 3: Loading data into reporting database');
      await this.loadPhase(transformedData);

      // Phase 4: Refresh materialized views
      logger.info('Phase 4: Refreshing materialized views');
      await this.refreshViews();

      // Mark job as completed
      this.stats.endTime = new Date();
      await this.completeJobRun('completed');

      // Send success notification
      await notifier.sendSuccess(this.jobRunId, this.stats);

      logger.info('ETL Job Completed Successfully', {
        jobRunId: this.jobRunId,
        duration: this.stats.endTime - this.stats.startTime,
        recordsProcessed: this.stats.recordsProcessed
      });

    } catch (error) {
      logger.error('ETL Job Failed', {
        jobRunId: this.jobRunId,
        error: error.message,
        stack: error.stack
      });

      this.stats.errors.push(error.message);
      await this.completeJobRun('failed', error.message);

      // Send failure notification
      await notifier.sendFailure(this.jobRunId, error, this.stats);

      throw error;
    }
  }

  /**
   * Extract phase - Get data from operational databases
   */
  async extractPhase() {
    const extractors = {
      nexus: new NexusExtractor(),
      paylinq: new PayLinqExtractor(),
      schedulehub: new ScheduleHubExtractor()
    };

    const extractedData = {
      organizations: [],
      employees: [],
      departments: [],
      payrollRuns: [],
      payrollLineItems: [],
      schedules: []
    };

    try {
      // Extract organizations (foundational data)
      logger.info('Extracting organizations');
      extractedData.organizations = await extractors.nexus.extractOrganizations();
      await this.logSyncProgress('organizations', extractedData.organizations.length);

      // Extract in parallel for performance
      const [employees, departments] = await Promise.all([
        extractors.nexus.extractEmployees(),
        extractors.nexus.extractDepartments()
      ]);

      extractedData.employees = employees;
      extractedData.departments = departments;

      await this.logSyncProgress('employees', employees.length);
      await this.logSyncProgress('departments', departments.length);

      // Extract payroll data
      logger.info('Extracting payroll data');
      const [payrollRuns, payrollLineItems] = await Promise.all([
        extractors.paylinq.extractPayrollRuns(),
        extractors.paylinq.extractPayrollLineItems()
      ]);

      extractedData.payrollRuns = payrollRuns;
      extractedData.payrollLineItems = payrollLineItems;

      await this.logSyncProgress('payroll_runs', payrollRuns.length);
      await this.logSyncProgress('payroll_line_items', payrollLineItems.length);

      // Extract scheduling data
      logger.info('Extracting scheduling data');
      extractedData.schedules = await extractors.schedulehub.extractSchedules();
      await this.logSyncProgress('schedules', extractedData.schedules.length);

      this.stats.recordsProcessed = Object.values(extractedData)
        .reduce((sum, arr) => sum + arr.length, 0);

      return extractedData;

    } catch (error) {
      logger.error('Extract phase failed', { error: error.message });
      throw new Error(`Extract phase failed: ${error.message}`);
    }
  }

  /**
   * Transform phase - Clean and normalize data
   */
  async transformPhase(extractedData) {
    const EmployeeTransformer = require('./transformers/employee.transformer');
    const PayrollTransformer = require('./transformers/payroll.transformer');

    try {
      logger.info('Transforming employees');
      const transformedEmployees = await EmployeeTransformer.transform(
        extractedData.employees
      );

      logger.info('Transforming payroll data');
      const transformedPayroll = await PayrollTransformer.transform(
        extractedData.payrollRuns,
        extractedData.payrollLineItems
      );

      return {
        organizations: extractedData.organizations, // No transformation needed
        departments: extractedData.departments,
        employees: transformedEmployees,
        payrollRuns: transformedPayroll.runs,
        payrollLineItems: transformedPayroll.lineItems,
        schedules: extractedData.schedules
      };

    } catch (error) {
      logger.error('Transform phase failed', { error: error.message });
      throw new Error(`Transform phase failed: ${error.message}`);
    }
  }

  /**
   * Load phase - Insert/Update data in reporting database
   */
  async loadPhase(transformedData) {
    const loader = new DatabaseLoader(db.reporting);

    try {
      // Load in dependency order
      logger.info('Loading organizations');
      const orgsResult = await loader.upsertBatch(
        'operational.organizations',
        transformedData.organizations,
        ['id']
      );
      this.stats.recordsInserted += orgsResult.inserted;
      this.stats.recordsUpdated += orgsResult.updated;

      logger.info('Loading departments');
      const deptsResult = await loader.upsertBatch(
        'operational.departments',
        transformedData.departments,
        ['id']
      );
      this.stats.recordsInserted += deptsResult.inserted;
      this.stats.recordsUpdated += deptsResult.updated;

      logger.info('Loading employees');
      const empsResult = await loader.upsertBatch(
        'operational.employees',
        transformedData.employees,
        ['id']
      );
      this.stats.recordsInserted += empsResult.inserted;
      this.stats.recordsUpdated += empsResult.updated;

      logger.info('Loading payroll runs');
      const payrollRunsResult = await loader.upsertBatch(
        'operational.payroll_runs',
        transformedData.payrollRuns,
        ['id']
      );
      this.stats.recordsInserted += payrollRunsResult.inserted;
      this.stats.recordsUpdated += payrollRunsResult.updated;

      logger.info('Loading payroll line items');
      const payrollItemsResult = await loader.upsertBatch(
        'operational.payroll_line_items',
        transformedData.payrollLineItems,
        ['id']
      );
      this.stats.recordsInserted += payrollItemsResult.inserted;
      this.stats.recordsUpdated += payrollItemsResult.updated;

      logger.info('Load phase completed', {
        inserted: this.stats.recordsInserted,
        updated: this.stats.recordsUpdated
      });

    } catch (error) {
      logger.error('Load phase failed', { error: error.message });
      throw new Error(`Load phase failed: ${error.message}`);
    }
  }

  /**
   * Refresh materialized views
   */
  async refreshViews() {
    try {
      const { rows } = await db.reporting.query(
        'SELECT * FROM reporting.refresh_all_views()'
      );

      logger.info('Materialized views refreshed', {
        viewsRefreshed: rows.length,
        totalRows: rows.reduce((sum, r) => sum + r.rows_affected, 0)
      });

    } catch (error) {
      logger.error('View refresh failed', { error: error.message });
      throw new Error(`View refresh failed: ${error.message}`);
    }
  }

  /**
   * Create job run record
   */
  async createJobRun(jobType) {
    const { rows } = await db.reporting.query(
      `INSERT INTO etl.job_runs (
        job_name, job_type, status, source_db, target_schema
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      ['nightly_sync', jobType, 'running', 'operational', 'operational']
    );

    return rows[0].id;
  }

  /**
   * Complete job run record
   */
  async completeJobRun(status, errorMessage = null) {
    const duration = Math.floor((this.stats.endTime - this.stats.startTime) / 1000);

    await db.reporting.query(
      `UPDATE etl.job_runs
       SET 
         status = $2,
         completed_at = NOW(),
         duration_seconds = $3,
         rows_processed = $4,
         rows_inserted = $5,
         rows_updated = $6,
         error_message = $7
       WHERE id = $1`,
      [
        this.jobRunId,
        status,
        duration,
        this.stats.recordsProcessed,
        this.stats.recordsInserted,
        this.stats.recordsUpdated,
        errorMessage
      ]
    );
  }

  /**
   * Log sync progress for individual table
   */
  async logSyncProgress(tableName, rowsSynced) {
    await db.reporting.query(
      `INSERT INTO etl.sync_log (
        job_run_id, table_name, sync_type, rows_synced, status
      ) VALUES ($1, $2, $3, $4, $5)`,
      [this.jobRunId, tableName, 'full', rowsSynced, 'completed']
    );
  }
}

module.exports = ETLOrchestrator;
```

### Nexus Extractor (HRIS Data)

```javascript
// src/extractors/nexus.extractor.js

const BaseExtractor = require('./base.extractor');

class NexusExtractor extends BaseExtractor {
  constructor() {
    super('nexus'); // Uses nexus database connection
  }

  /**
   * Extract organizations
   */
  async extractOrganizations() {
    const query = `
      SELECT 
        id,
        name,
        code,
        legal_name,
        email,
        phone,
        website,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        tax_id,
        industry,
        size_category,
        subscription_tier,
        is_active,
        created_at,
        updated_at,
        deleted_at
      FROM hris.organizations
      WHERE deleted_at IS NULL
        AND is_active = true
    `;

    return await this.extract(query);
  }

  /**
   * Extract employees
   */
  async extractEmployees() {
    const query = `
      SELECT 
        e.id,
        e.organization_id,
        e.employee_number,
        e.first_name,
        e.last_name,
        e.middle_name,
        e.preferred_name,
        e.email,
        e.phone,
        e.date_of_birth,
        e.ssn_encrypted,
        e.gender,
        e.hire_date,
        e.termination_date,
        e.termination_type,
        e.employment_status,
        e.employment_type,
        e.job_title,
        e.department,
        d.name as department_name,
        e.location,
        e.manager_id,
        e.salary_amount,
        e.salary_currency,
        e.pay_frequency,
        e.pay_type,
        e.hourly_rate,
        e.created_at,
        e.updated_at,
        e.deleted_at
      FROM hris.employees e
      LEFT JOIN hris.departments d ON d.id = e.department
      WHERE e.deleted_at IS NULL
    `;

    return await this.extract(query);
  }

  /**
   * Extract departments
   */
  async extractDepartments() {
    const query = `
      SELECT 
        id,
        organization_id,
        name,
        code,
        description,
        parent_department_id,
        department_head_id,
        cost_center,
        budget_allocated,
        budget_currency,
        is_active,
        created_at,
        updated_at,
        deleted_at
      FROM hris.departments
      WHERE deleted_at IS NULL
        AND is_active = true
    `;

    return await this.extract(query);
  }

  /**
   * Extract time off requests
   */
  async extractTimeOffRequests() {
    const query = `
      SELECT 
        id,
        organization_id,
        employee_id,
        request_type,
        start_date,
        end_date,
        total_days,
        status,
        approved_by,
        approved_at,
        rejection_reason,
        created_at,
        updated_at
      FROM hris.time_off_requests
      WHERE created_at > NOW() - INTERVAL '2 years'
    `;

    return await this.extract(query);
  }
}

module.exports = NexusExtractor;
```

### PayLinq Extractor (Payroll Data)

```javascript
// src/extractors/paylinq.extractor.js

const BaseExtractor = require('./base.extractor');

class PayLinqExtractor extends BaseExtractor {
  constructor() {
    super('paylinq'); // Uses paylinq database connection
  }

  /**
   * Extract payroll runs
   */
  async extractPayrollRuns() {
    const query = `
      SELECT 
        id,
        organization_id,
        run_number,
        run_name,
        pay_period_start,
        pay_period_end,
        pay_date,
        status,
        total_gross_pay,
        total_net_pay,
        total_taxes,
        total_deductions,
        employee_count,
        currency,
        approved_by,
        approved_at,
        processed_by,
        processed_at,
        created_at,
        updated_at
      FROM payroll.payroll_runs
      WHERE pay_date > NOW() - INTERVAL '2 years'
      ORDER BY pay_date DESC
    `;

    return await this.extract(query);
  }

  /**
   * Extract payroll line items
   */
  async extractPayrollLineItems() {
    const query = `
      SELECT 
        pli.id,
        pli.organization_id,
        pli.payroll_run_id,
        pli.employee_id,
        pli.gross_pay,
        pli.regular_hours,
        pli.overtime_hours,
        pli.bonus,
        pli.commission,
        pli.federal_tax,
        pli.state_tax,
        pli.social_security,
        pli.medicare,
        pli.retirement_401k,
        pli.health_insurance,
        pli.other_deductions,
        pli.net_pay,
        pli.currency,
        pli.created_at
      FROM payroll.payroll_line_items pli
      INNER JOIN payroll.payroll_runs pr ON pr.id = pli.payroll_run_id
      WHERE pr.pay_date > NOW() - INTERVAL '2 years'
    `;

    return await this.extract(query);
  }
}

module.exports = PayLinqExtractor;
```

### Base Extractor

```javascript
// src/extractors/base.extractor.js

const db = require('../config/databases');
const logger = require('../utils/logger');
const { retryWithBackoff } = require('../utils/retry');

class BaseExtractor {
  constructor(dbName) {
    this.dbName = dbName;
    this.connection = db[dbName];
  }

  /**
   * Generic extract method with retry logic
   */
  async extract(query, params = []) {
    return await retryWithBackoff(async () => {
      const startTime = Date.now();
      
      try {
        const { rows } = await this.connection.query(query, params);
        
        const duration = Date.now() - startTime;
        logger.info(`Extracted ${rows.length} rows from ${this.dbName}`, {
          duration,
          rowCount: rows.length
        });

        return rows;

      } catch (error) {
        logger.error(`Extract failed from ${this.dbName}`, {
          error: error.message,
          query: query.substring(0, 100)
        });
        throw error;
      }
    }, 3); // 3 retries
  }

  /**
   * Extract with pagination for large tables
   */
  async extractPaginated(query, batchSize = 10000) {
    const allRows = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const paginatedQuery = `${query} LIMIT ${batchSize} OFFSET ${offset}`;
      const rows = await this.extract(paginatedQuery);

      allRows.push(...rows);
      offset += batchSize;
      hasMore = rows.length === batchSize;

      logger.info(`Extracted batch: ${allRows.length} total rows`);
    }

    return allRows;
  }
}

module.exports = BaseExtractor;
```

### Database Loader

```javascript
// src/loaders/database.loader.js

const logger = require('../utils/logger');
const { retryWithBackoff } = require('../utils/retry');

class DatabaseLoader {
  constructor(connection) {
    this.connection = connection;
  }

  /**
   * Upsert batch of records (INSERT ON CONFLICT UPDATE)
   */
  async upsertBatch(tableName, records, conflictColumns) {
    if (records.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    const batchSize = 1000;
    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const result = await retryWithBackoff(async () => {
        return await this.upsertSingleBatch(tableName, batch, conflictColumns);
      }, 3);

      inserted += result.inserted;
      updated += result.updated;

      logger.info(`Loaded batch to ${tableName}`, {
        progress: `${Math.min(i + batchSize, records.length)}/${records.length}`,
        inserted: result.inserted,
        updated: result.updated
      });
    }

    return { inserted, updated };
  }

  /**
   * Upsert single batch
   */
  async upsertSingleBatch(tableName, records, conflictColumns) {
    if (records.length === 0) return { inserted: 0, updated: 0 };

    const columns = Object.keys(records[0]);
    const conflictColumnsStr = conflictColumns.join(', ');
    
    // Build UPDATE clause (all columns except conflict columns)
    const updateColumns = columns.filter(col => !conflictColumns.includes(col));
    const updateClause = updateColumns
      .map(col => `${col} = EXCLUDED.${col}`)
      .join(', ');

    // Build VALUES clause
    const valuePlaceholders = records.map((_, recordIndex) => {
      const rowPlaceholders = columns.map((_, colIndex) => {
        return `$${recordIndex * columns.length + colIndex + 1}`;
      });
      return `(${rowPlaceholders.join(', ')})`;
    }).join(', ');

    // Flatten all values
    const values = records.flatMap(record => 
      columns.map(col => record[col])
    );

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${valuePlaceholders}
      ON CONFLICT (${conflictColumnsStr}) 
      DO UPDATE SET 
        ${updateClause},
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `;

    try {
      const { rows } = await this.connection.query(query, values);
      
      const insertedCount = rows.filter(r => r.inserted).length;
      const updatedCount = rows.length - insertedCount;

      return { inserted: insertedCount, updated: updatedCount };

    } catch (error) {
      logger.error('Upsert batch failed', {
        table: tableName,
        recordCount: records.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete records not in current batch (soft delete)
   */
  async markDeleted(tableName, currentIds) {
    const query = `
      UPDATE ${tableName}
      SET deleted_at = NOW()
      WHERE id NOT IN (${currentIds.map((_, i) => `$${i + 1}`).join(', ')})
        AND deleted_at IS NULL
    `;

    const { rowCount } = await this.connection.query(query, currentIds);
    
    logger.info(`Marked ${rowCount} records as deleted in ${tableName}`);
    
    return rowCount;
  }
}

module.exports = DatabaseLoader;
```

### Retry Utility

```javascript
// src/utils/retry.js

const logger = require('./logger');

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.warn(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
          error: error.message
        });
        
        await sleep(delay);
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { retryWithBackoff };
```

---

## 3. Running the ETL

### Manual Execution

```javascript
// scripts/run-etl.js

require('dotenv').config();
const ETLOrchestrator = require('../src/orchestrator');

async function main() {
  const orchestrator = new ETLOrchestrator();
  
  console.log('Starting manual ETL run...');
  
  try {
    await orchestrator.runFullSync();
    console.log('ETL completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('ETL failed:', error);
    process.exit(1);
  }
}

main();
```

### Scheduled Execution

```javascript
// scripts/start-scheduler.js

require('dotenv').config();
const ETLOrchestrator = require('../src/orchestrator');

const orchestrator = new ETLOrchestrator();
orchestrator.start();

console.log('ETL Scheduler started');
console.log('Scheduled to run daily at 2:00 AM');

// Keep process alive
process.on('SIGINT', () => {
  console.log('Shutting down ETL scheduler');
  process.exit(0);
});
```

### Docker Compose for ETL Service

```yaml
# docker-compose.etl.yml

version: '3.8'

services:
  etl-service:
    build: ./etl-service
    container_name: recruitiq-etl
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - TZ=America/New_York
      
      # Reporting Database
      - REPORTING_DB_HOST=reporting-db
      - REPORTING_DB_PORT=5432
      - REPORTING_DB_NAME=recruitiq_reporting
      - REPORTING_DB_USER=etl_writer
      - REPORTING_DB_PASSWORD=${ETL_DB_PASSWORD}
      
      # Operational Databases
      - NEXUS_DB_HOST=operational-db
      - NEXUS_DB_PORT=5432
      - NEXUS_DB_NAME=nexus_hris
      - NEXUS_DB_USER=etl_reader
      - NEXUS_DB_PASSWORD=${NEXUS_DB_PASSWORD}
      
      - PAYLINQ_DB_HOST=operational-db
      - PAYLINQ_DB_PORT=5432
      - PAYLINQ_DB_NAME=paylinq
      - PAYLINQ_DB_USER=etl_reader
      - PAYLINQ_DB_PASSWORD=${PAYLINQ_DB_PASSWORD}
      
      # Notifications
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - ALERT_EMAIL=${ALERT_EMAIL}
      
    volumes:
      - ./etl-service:/app
      - etl-logs:/app/logs
    networks:
      - reporting-network
    depends_on:
      - reporting-db

volumes:
  etl-logs:

networks:
  reporting-network:
    external: true
```

---

**Status:** ✅ ETL Pipeline Complete  
**Next:** 06-METABASE-INTEGRATION.md
