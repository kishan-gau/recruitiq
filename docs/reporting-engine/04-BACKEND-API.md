# Backend API - Reporting Engine

**Document:** 04-BACKEND-API.md  
**Project:** Multi-Tenant Consolidated Reporting System  
**Created:** November 13, 2025  

---

## Overview

The reporting engine backend provides RESTful APIs for accessing consolidated reports across multiple organizations. Built with Node.js and Express, it enforces security at every layer and provides comprehensive reporting capabilities.

---

## 1. Project Structure

```
reporting-backend/
├── src/
│   ├── app.js                      # Express app setup
│   ├── server.js                   # Server entry point
│   ├── config/
│   │   ├── database.js             # Database connection pool
│   │   ├── jwt.config.js           # JWT settings
│   │   └── security.config.js      # Security configurations
│   ├── auth/                       # Authentication services (from doc 03)
│   ├── middleware/                 # Middleware (from doc 03)
│   ├── routes/
│   │   ├── auth.routes.js          # Authentication endpoints
│   │   ├── hr.routes.js            # HR reporting endpoints
│   │   ├── payroll.routes.js       # Payroll reporting endpoints
│   │   ├── scheduling.routes.js    # Scheduling endpoints
│   │   └── admin.routes.js         # Admin/user management
│   ├── controllers/
│   │   ├── hr.controller.js
│   │   ├── payroll.controller.js
│   │   ├── scheduling.controller.js
│   │   └── admin.controller.js
│   ├── services/
│   │   ├── hr.service.js
│   │   ├── payroll.service.js
│   │   ├── report.service.js       # Generic report utilities
│   │   └── export.service.js       # PDF/Excel export
│   ├── utils/
│   │   ├── queryBuilder.js         # Secure SQL query builder
│   │   ├── dataMasking.js          # Data masking utilities
│   │   ├── errors.js               # Custom error classes
│   │   └── validation.js           # Input validation
│   └── database/
│       └── connection.js           # PostgreSQL connection
├── tests/
│   ├── integration/
│   ├── unit/
│   └── security/
├── package.json
├── .env.example
└── README.md
```

---

## 2. Application Setup

### package.json

```json
{
  "name": "recruitiq-reporting-backend",
  "version": "1.0.0",
  "description": "Multi-tenant reporting engine backend",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "test:security": "jest tests/security",
    "lint": "eslint src/",
    "migrate": "node scripts/migrate.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^4.2.0",
    "ioredis": "^5.3.2",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1",
    "joi": "^17.11.0",
    "uuid": "^9.0.1",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",
    "exceljs": "^4.4.0",
    "pdfkit": "^0.14.0",
    "compression": "^1.7.4",
    "express-validator": "^7.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "eslint": "^8.55.0"
  }
}
```

### Express App Setup

```javascript
// src/app.js

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { apiLimiter } = require('./middleware/rateLimit');
const logger = require('./utils/logger');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', apiLimiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/hr', require('./routes/hr.routes'));
app.use('/api/payroll', require('./routes/payroll.routes'));
app.use('/api/scheduling', require('./routes/scheduling.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: 'Endpoint not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.status || 500).json({
    error: err.name || 'server_error',
    message: err.message || 'Internal server error'
  });
});

module.exports = app;
```

### Server Entry Point

```javascript
// src/server.js

require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const db = require('./database/connection');

const PORT = process.env.PORT || 4000;

// Test database connection
db.query('SELECT NOW()')
  .then(() => {
    logger.info('Database connected successfully');
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Reporting engine backend listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch(err => {
    logger.error('Failed to connect to database', { error: err.message });
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await db.end();
  process.exit(0);
});
```

---

## 3. HR Reporting API

### HR Routes

```javascript
// src/routes/hr.routes.js

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { requirePermission, filterOrganizations, enforceDataVisibility, requireExportPermission } = require('../middleware/authorize');
const { auditLog } = require('../middleware/auditLog');
const hrController = require('../controllers/hr.controller');

// All HR routes require authentication
router.use(authenticate);

/**
 * GET /api/hr/employees
 * Get employee list with filtering
 */
router.get('/employees',
  requirePermission('hr', 'viewEmployees'),
  filterOrganizations,
  auditLog('employee_list', 'hr'),
  hrController.getEmployees
);

/**
 * GET /api/hr/employees/:id
 * Get individual employee details
 */
router.get('/employees/:id',
  requirePermission('hr', 'viewDetails'),
  enforceDataVisibility('masked_detail'),
  auditLog('employee_detail', 'hr'),
  hrController.getEmployeeById
);

/**
 * GET /api/hr/headcount
 * Get headcount statistics
 */
router.get('/headcount',
  requirePermission('hr', 'viewEmployees'),
  filterOrganizations,
  auditLog('headcount_report', 'hr'),
  hrController.getHeadcount
);

/**
 * GET /api/hr/headcount/trends
 * Get headcount trends over time
 */
router.get('/headcount/trends',
  requirePermission('hr', 'viewEmployees'),
  filterOrganizations,
  auditLog('headcount_trends', 'hr'),
  hrController.getHeadcountTrends
);

/**
 * GET /api/hr/turnover
 * Get turnover metrics
 */
router.get('/turnover',
  requirePermission('hr', 'viewEmployees'),
  filterOrganizations,
  auditLog('turnover_report', 'hr'),
  hrController.getTurnoverMetrics
);

/**
 * GET /api/hr/demographics
 * Get workforce demographics
 */
router.get('/demographics',
  requirePermission('hr', 'viewEmployees'),
  filterOrganizations,
  auditLog('demographics_report', 'hr'),
  hrController.getDemographics
);

/**
 * GET /api/hr/export/employees
 * Export employee data
 */
router.get('/export/employees',
  requirePermission('hr', 'viewEmployees'),
  requireExportPermission('hr'),
  filterOrganizations,
  auditLog('employee_export', 'hr'),
  hrController.exportEmployees
);

module.exports = router;
```

### HR Controller

```javascript
// src/controllers/hr.controller.js

const hrService = require('../services/hr.service');
const { ValidationError } = require('../utils/errors');

class HRController {
  /**
   * Get employee list
   */
  async getEmployees(req, res, next) {
    try {
      const {
        status = 'active',
        department,
        location,
        employmentType,
        search,
        page = 1,
        limit = 50,
        sortBy = 'last_name',
        sortOrder = 'asc'
      } = req.query;

      // Validate pagination
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 500) {
        throw new ValidationError('Invalid pagination parameters');
      }

      const result = await hrService.getEmployees({
        organizationIds: req.auth.filteredOrganizations,
        userId: req.auth.userId,
        dataVisibilityLevel: req.auth.scope.dataVisibilityLevel,
        filters: {
          status,
          department,
          location,
          employmentType,
          search
        },
        pagination: {
          page: pageNum,
          limit: limitNum
        },
        sort: {
          by: sortBy,
          order: sortOrder
        }
      });

      res.json({
        data: result.employees,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          pages: Math.ceil(result.total / limitNum)
        },
        warnings: req.warnings
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(req, res, next) {
    try {
      const { id } = req.params;

      const employee = await hrService.getEmployeeById(
        id,
        req.auth.filteredOrganizations,
        req.auth.userId,
        req.auth.scope.dataVisibilityLevel
      );

      if (!employee) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Employee not found or you do not have access'
        });
      }

      res.json({ data: employee });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get headcount statistics
   */
  async getHeadcount(req, res, next) {
    try {
      const { groupBy = 'organization', asOf } = req.query;

      const result = await hrService.getHeadcount({
        organizationIds: req.auth.filteredOrganizations,
        groupBy,
        asOf: asOf ? new Date(asOf) : new Date()
      });

      res.json({ data: result });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get headcount trends
   */
  async getHeadcountTrends(req, res, next) {
    try {
      const {
        startDate,
        endDate,
        granularity = 'month'
      } = req.query;

      if (!startDate || !endDate) {
        throw new ValidationError('startDate and endDate are required');
      }

      const result = await hrService.getHeadcountTrends({
        organizationIds: req.auth.filteredOrganizations,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        granularity
      });

      res.json({ data: result });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get turnover metrics
   */
  async getTurnoverMetrics(req, res, next) {
    try {
      const {
        startDate,
        endDate,
        groupBy = 'organization'
      } = req.query;

      const result = await hrService.getTurnoverMetrics({
        organizationIds: req.auth.filteredOrganizations,
        startDate: startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 12)),
        endDate: endDate ? new Date(endDate) : new Date(),
        groupBy
      });

      res.json({ data: result });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get workforce demographics
   */
  async getDemographics(req, res, next) {
    try {
      const result = await hrService.getDemographics({
        organizationIds: req.auth.filteredOrganizations,
        dataVisibilityLevel: req.auth.scope.dataVisibilityLevel
      });

      res.json({ data: result });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Export employees
   */
  async exportEmployees(req, res, next) {
    try {
      const { format = 'excel' } = req.query;

      const result = await hrService.exportEmployees({
        organizationIds: req.auth.filteredOrganizations,
        userId: req.auth.userId,
        dataVisibilityLevel: req.auth.scope.dataVisibilityLevel,
        format
      });

      // Set appropriate headers
      res.setHeader('Content-Type', 
        format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      );
      res.setHeader('Content-Disposition', `attachment; filename="employees_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}"`);

      res.send(result.buffer);

    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HRController();
```

### HR Service

```javascript
// src/services/hr.service.js

const db = require('../database/connection');
const { buildSecureQuery } = require('../utils/queryBuilder');
const { maskData } = require('../utils/dataMasking');

class HRService {
  /**
   * Get employees with security filtering
   */
  async getEmployees(options) {
    const {
      organizationIds,
      userId,
      dataVisibilityLevel,
      filters,
      pagination,
      sort
    } = options;

    // Build WHERE conditions
    const conditions = ['e.organization_id = ANY($1)'];
    const params = [organizationIds];
    let paramCount = 1;

    if (filters.status) {
      paramCount++;
      conditions.push(`e.employment_status = $${paramCount}`);
      params.push(filters.status);
    }

    if (filters.department) {
      paramCount++;
      conditions.push(`e.department = $${paramCount}`);
      params.push(filters.department);
    }

    if (filters.location) {
      paramCount++;
      conditions.push(`e.location = $${paramCount}`);
      params.push(filters.location);
    }

    if (filters.employmentType) {
      paramCount++;
      conditions.push(`e.employment_type = $${paramCount}`);
      params.push(filters.employmentType);
    }

    if (filters.search) {
      paramCount++;
      conditions.push(`(
        e.first_name ILIKE $${paramCount} OR
        e.last_name ILIKE $${paramCount} OR
        e.employee_number ILIKE $${paramCount} OR
        e.email ILIKE $${paramCount}
      )`);
      params.push(`%${filters.search}%`);
    }

    // Select columns based on visibility level
    const columns = this.getColumnsForVisibilityLevel(dataVisibilityLevel);

    // Build query
    const query = `
      SELECT ${columns}
      FROM reporting.employee_details e
      WHERE ${conditions.join(' AND ')}
        AND e.deleted_at IS NULL
      ORDER BY e.${sort.by} ${sort.order}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    // Execute query
    const { rows } = await db.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reporting.employee_details e
      WHERE ${conditions.join(' AND ')}
        AND e.deleted_at IS NULL
    `;
    const { rows: countRows } = await db.query(countQuery, params.slice(0, paramCount));

    // Apply data masking
    const maskedEmployees = await Promise.all(
      rows.map(emp => this.maskEmployeeData(emp, userId, dataVisibilityLevel))
    );

    return {
      employees: maskedEmployees,
      total: parseInt(countRows[0].total)
    };
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(employeeId, organizationIds, userId, dataVisibilityLevel) {
    const columns = this.getColumnsForVisibilityLevel(dataVisibilityLevel);

    const { rows } = await db.query(
      `SELECT ${columns}
       FROM reporting.employee_details e
       WHERE e.employee_id = $1
         AND e.organization_id = ANY($2)
         AND e.deleted_at IS NULL`,
      [employeeId, organizationIds]
    );

    if (rows.length === 0) {
      return null;
    }

    return await this.maskEmployeeData(rows[0], userId, dataVisibilityLevel);
  }

  /**
   * Get headcount statistics
   */
  async getHeadcount(options) {
    const { organizationIds, groupBy, asOf } = options;

    let groupByColumn;
    switch (groupBy) {
      case 'department':
        groupByColumn = 'e.department';
        break;
      case 'location':
        groupByColumn = 'e.location';
        break;
      case 'employmentType':
        groupByColumn = 'e.employment_type';
        break;
      default:
        groupByColumn = 'e.organization_name';
    }

    const { rows } = await db.query(
      `SELECT 
        ${groupByColumn} as group_name,
        COUNT(*) as total_employees,
        COUNT(*) FILTER (WHERE employment_status = 'active') as active_employees,
        COUNT(*) FILTER (WHERE employment_type = 'full_time') as full_time_count,
        COUNT(*) FILTER (WHERE employment_type = 'part_time') as part_time_count,
        COUNT(*) FILTER (WHERE employment_type = 'contract') as contract_count
       FROM reporting.employee_details e
       WHERE e.organization_id = ANY($1)
         AND e.deleted_at IS NULL
         AND (e.termination_date IS NULL OR e.termination_date > $2)
       GROUP BY ${groupByColumn}
       ORDER BY total_employees DESC`,
      [organizationIds, asOf]
    );

    return rows;
  }

  /**
   * Get headcount trends
   */
  async getHeadcountTrends(options) {
    const { organizationIds, startDate, endDate, granularity } = options;

    const { rows } = await db.query(
      `SELECT 
        snapshot_date,
        organization_name,
        SUM(employee_count) as total_count,
        SUM(employee_count) FILTER (WHERE employment_type = 'full_time') as full_time_count,
        SUM(employee_count) FILTER (WHERE employment_type = 'part_time') as part_time_count
       FROM reporting.headcount_trends
       WHERE organization_id = ANY($1)
         AND snapshot_date BETWEEN $2 AND $3
       GROUP BY snapshot_date, organization_name
       ORDER BY snapshot_date, organization_name`,
      [organizationIds, startDate, endDate]
    );

    return rows;
  }

  /**
   * Get turnover metrics
   */
  async getTurnoverMetrics(options) {
    const { organizationIds, startDate, endDate, groupBy } = options;

    const groupByColumn = groupBy === 'department' ? 'department' : 'organization_name';

    const { rows } = await db.query(
      `SELECT 
        ${groupByColumn} as group_name,
        SUM(terminations) as total_terminations,
        SUM(voluntary_terminations) as voluntary_terminations,
        SUM(involuntary_terminations) as involuntary_terminations,
        AVG(monthly_turnover_rate) as avg_monthly_turnover_rate,
        AVG(annualized_turnover_rate) as avg_annualized_turnover_rate
       FROM reporting.turnover_metrics
       WHERE organization_id = ANY($1)
         AND turnover_month BETWEEN $2 AND $3
       GROUP BY ${groupByColumn}
       ORDER BY total_terminations DESC`,
      [organizationIds, startDate, endDate]
    );

    return rows;
  }

  /**
   * Get demographics
   */
  async getDemographics(options) {
    const { organizationIds, dataVisibilityLevel } = options;

    // Only show detailed demographics if user has appropriate access
    if (dataVisibilityLevel === 'aggregate_only') {
      const { rows } = await db.query(
        `SELECT 
          COUNT(*) as total_employees,
          'All Organizations' as category
         FROM reporting.employee_details
         WHERE organization_id = ANY($1)
           AND employment_status = 'active'
           AND deleted_at IS NULL`,
        [organizationIds]
      );
      return rows;
    }

    const { rows } = await db.query(
      `SELECT 
        'Age Group' as category_type,
        age_group as category,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
       FROM reporting.employee_details
       WHERE organization_id = ANY($1)
         AND employment_status = 'active'
         AND deleted_at IS NULL
       GROUP BY age_group
       
       UNION ALL
       
       SELECT 
        'Employment Type' as category_type,
        employment_type as category,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
       FROM reporting.employee_details
       WHERE organization_id = ANY($1)
         AND employment_status = 'active'
         AND deleted_at IS NULL
       GROUP BY employment_type
       
       ORDER BY category_type, count DESC`,
      [organizationIds]
    );

    return rows;
  }

  /**
   * Export employees to Excel/PDF
   */
  async exportEmployees(options) {
    const exportService = require('./export.service');
    
    // Get all employees (no pagination for export)
    const employees = await this.getEmployees({
      ...options,
      pagination: { page: 1, limit: 10000 },
      sort: { by: 'last_name', order: 'asc' }
    });

    return await exportService.exportToFormat(
      employees.employees,
      options.format,
      'Employees Report'
    );
  }

  /**
   * Get columns based on visibility level
   */
  getColumnsForVisibilityLevel(level) {
    const baseColumns = `
      e.employee_id,
      e.organization_id,
      e.organization_name,
      e.employee_number,
      e.first_name,
      e.last_name,
      e.email,
      e.department_name,
      e.job_title,
      e.employment_status,
      e.employment_type,
      e.hire_date
    `;

    if (level === 'full_detail') {
      return `${baseColumns},
        e.phone,
        e.location,
        e.manager_name,
        e.salary_amount,
        e.salary_currency,
        e.pay_type,
        e.termination_date,
        e.years_of_service`;
    }

    if (level === 'masked_detail') {
      return `${baseColumns},
        e.location,
        e.manager_name,
        e.salary_band,
        e.termination_date,
        e.years_of_service`;
    }

    // aggregate_only
    return baseColumns;
  }

  /**
   * Mask employee data based on user permissions
   */
  async maskEmployeeData(employee, userId, dataVisibilityLevel) {
    const masked = { ...employee };

    // Apply field-level masking
    if (employee.phone) {
      masked.phone = await maskData('phone', employee.phone, userId);
    }

    if (employee.email && dataVisibilityLevel !== 'full_detail') {
      masked.email = await maskData('email', employee.email, userId);
    }

    if (employee.salary_amount) {
      masked.salary_display = await maskData('salary', employee.salary_amount, userId);
      // Remove exact salary unless full_detail access
      if (dataVisibilityLevel !== 'full_detail') {
        delete masked.salary_amount;
      }
    }

    return masked;
  }
}

module.exports = new HRService();
```

---

**Status:** ✅ Backend API Part 1 Complete (HR Module)  
**Next:** 04b - Payroll & Export Services
