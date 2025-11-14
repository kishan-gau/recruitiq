# Reporting Engine Implementation Plan

**Project:** Multi-Tenant Consolidated Reporting System  
**Created:** November 13, 2025  
**Status:** Planning Phase  
**Estimated Timeline:** 4-5 weeks  
**Team Size:** 1-2 developers  

---

## Executive Summary

Build a secure, scalable reporting engine that allows authorized users to view consolidated data across multiple subsidiary organizations while maintaining strict data isolation and role-based access control.

### Key Objectives

1. ✅ **Consolidated Reporting** - View aggregated data across multiple subsidiaries
2. ✅ **Security First** - Zero cross-tenant data leakage
3. ✅ **Role-Based Access** - Granular permissions (see totals only, see specific orgs, etc.)
4. ✅ **Performance Isolation** - Separate database to protect operational systems
5. ✅ **Enterprise BI Integration** - Metabase for visualization
6. ✅ **Audit Compliance** - Complete access logging

---

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Users & Roles                                 │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Group CFO   │  │ HR Director  │  │ Dept Manager │         │
│  │  - All orgs  │  │  - HR data   │  │  - Own org   │         │
│  │  - All data  │  │  - All orgs  │  │  - Limited   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            ↓ ↓ ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Metabase (BI Frontend)                         │
│  - Dashboards & Visualizations                                  │
│  - Filters & Drill-downs                                        │
│  - PDF/Excel Export                                             │
│  - Scheduled Reports                                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓ ↓ ↓
                    Authentication & API
                            ↓ ↓ ↓
┌─────────────────────────────────────────────────────────────────┐
│              Reporting Backend (Node.js/Express)                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authentication Layer                                     │  │
│  │  - JWT with role-based scoping                           │  │
│  │  - Group/Organization access control                     │  │
│  │  - Permission validation                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authorization Middleware                                │  │
│  │  - Validate group access                                 │  │
│  │  - Filter accessible organizations                       │  │
│  │  - Enforce data masking rules                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer                                    │  │
│  │  - HR Reports Service                                    │  │
│  │  - Payroll Reports Service                              │  │
│  │  - Scheduling Reports Service                           │  │
│  │  - Cross-org Aggregation                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Data Access Layer                                       │  │
│  │  - Secure Query Builder                                  │  │
│  │  - Organization Filtering                                │  │
│  │  - Query Validation                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Audit Logger                                            │  │
│  │  - Log all access                                        │  │
│  │  - Track data viewed                                     │  │
│  │  - Security monitoring                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓ ↓ ↓
                    ETL Process (Nightly)
                            ↓ ↓ ↓
┌─────────────────────────────────────────────────────────────────┐
│           Reporting Database (PostgreSQL - Separate)             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Operational Data (Replicated)                           │  │
│  │  - Employees, Contracts, Departments                     │  │
│  │  - Payroll, Paychecks, Time entries                     │  │
│  │  - Schedules, Shifts                                     │  │
│  │  - Updated nightly via ETL                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Reporting-Optimized Views                               │  │
│  │  - Denormalized employee data                           │  │
│  │  - Pre-calculated aggregations                          │  │
│  │  - Historical snapshots                                  │  │
│  │  - Trend analysis tables                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Security & Audit                                        │  │
│  │  - Organization groups & memberships                     │  │
│  │  - Reporting users & roles                              │  │
│  │  - Access audit log                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↑ ↑ ↑
                    Reads from (nightly)
                            ↑ ↑ ↑
┌─────────────────────────────────────────────────────────────────┐
│         Operational Database (PostgreSQL - Primary)              │
│  - Live transactional data                                      │
│  - Nexus, PayLinq, ScheduleHub operations                      │
│  - NOT accessed directly by reporting                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Role-Based Access Control Design

### Role Hierarchy

```
┌────────────────────────────────────────────────────────────┐
│                    Super Admin                              │
│  Access: All groups, all organizations, all data           │
│  Use Case: Platform administrators                         │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│                    Group Executive                          │
│  Access: Specific groups, all orgs in groups, all data    │
│  Use Case: CEO, CFO of parent company                      │
│  Example: Can see all subsidiaries' full data              │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│               Department Head (Cross-Org)                   │
│  Access: Specific groups, all orgs, specific modules      │
│  Use Case: Group HR Director, Group Finance Director       │
│  Example: Can see HR data across all subsidiaries         │
│           Cannot see detailed payroll amounts               │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│              Organization Manager                           │
│  Access: Single organization, all data                     │
│  Use Case: Subsidiary CEO, Subsidiary CFO                  │
│  Example: Can see everything for their subsidiary only    │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│              Department Manager                             │
│  Access: Single organization, specific department          │
│  Use Case: Department manager in subsidiary                │
│  Example: Can see only their department's data             │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│                    Auditor/Viewer                           │
│  Access: Specific groups, aggregates only (no details)    │
│  Use Case: External auditors, board members                │
│  Example: Can see totals, cannot see individual records   │
└────────────────────────────────────────────────────────────┘
```

### Permission Matrix

| Role | View Orgs | View Employees | View Salaries | View Details | Export Data | Schedule Reports |
|------|-----------|----------------|---------------|--------------|-------------|------------------|
| **Super Admin** | All | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Group Executive** | All in groups | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Dept Head (HR)** | All in groups | ✅ | ❌ Masked | ✅ | ✅ | ✅ |
| **Dept Head (Finance)** | All in groups | ✅ Limited | ✅ | ✅ | ✅ | ✅ |
| **Org Manager** | Own org only | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Dept Manager** | Own org only | ✅ Dept only | ❌ | ✅ Limited | ❌ | ❌ |
| **Auditor** | All in groups | ❌ | ❌ | ❌ Aggregates only | ❌ | ❌ |

---

## Data Visibility Rules

### Level 1: Full Access
**Who:** Group Executive, Super Admin  
**Sees:**
```sql
-- All organizations, all data, all details
SELECT * FROM reporting.employee_full
WHERE organization_id IN (accessible_orgs);

-- Individual employee records
-- Salary details
-- Personal information
-- Performance reviews
```

### Level 2: Cross-Org Module Access
**Who:** Department Head (Cross-Org)  
**Sees:**
```sql
-- HR Director sees HR data across all orgs
SELECT 
  organization_name,
  COUNT(*) as employee_count,
  AVG(tenure_months) as avg_tenure,
  -- Salary MASKED or RANGE
  CASE 
    WHEN salary < 50000 THEN '< 50K'
    WHEN salary < 100000 THEN '50K-100K'
    ELSE '> 100K'
  END as salary_range
FROM reporting.employee_full
WHERE organization_id IN (accessible_orgs);

-- NO individual salary amounts
-- NO individual employee details (aggregate only)
```

### Level 3: Single Organization Access
**Who:** Organization Manager  
**Sees:**
```sql
-- All data for their organization only
SELECT * FROM reporting.employee_full
WHERE organization_id = 'their-org-id';

-- Full access to their org
-- Cannot see other organizations
```

### Level 4: Department Access
**Who:** Department Manager  
**Sees:**
```sql
-- Only their department in their organization
SELECT * FROM reporting.employee_full
WHERE organization_id = 'their-org-id'
  AND department_id = 'their-dept-id';

-- Limited to their scope
```

### Level 5: Aggregate Only
**Who:** Auditor, Board Member  
**Sees:**
```sql
-- Only pre-aggregated totals
SELECT 
  organization_name,
  COUNT(*) as employee_count,
  SUM(total_compensation) as total_payroll,
  -- NO individual records
  -- NO drill-down capability
FROM reporting.monthly_summaries
WHERE organization_id IN (accessible_orgs);
```

---

## Technology Stack

### Backend (Reporting API)
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** JavaScript/ES6+
- **Authentication:** JWT (jsonwebtoken)
- **Database Client:** pg (PostgreSQL)
- **Job Scheduler:** node-cron (for ETL)
- **Logging:** Winston
- **Validation:** Joi

### Database
- **Primary:** PostgreSQL 15+
- **Reporting DB:** Separate PostgreSQL instance
- **Connection Pooling:** pg-pool

### Frontend (BI Tool)
- **Primary Choice:** Metabase (Open Source)
- **Alternative:** Apache Superset
- **Deployment:** Docker container

### Infrastructure
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **Reverse Proxy:** Nginx (optional)
- **SSL/TLS:** Let's Encrypt (production)

---

## Project Timeline

### Week 1: Database & Infrastructure Setup
**Days 1-2:** Reporting database setup
- Create separate PostgreSQL database
- Design schema (groups, memberships, users, audit)
- Create materialized views for reporting

**Days 3-4:** ETL Pipeline
- Build data synchronization jobs
- Create nightly ETL process
- Test data replication

**Day 5:** Testing & Validation
- Verify data accuracy
- Performance testing
- Rollback procedures

### Week 2: Authentication & Authorization
**Days 1-2:** User management system
- Reporting users table
- Role definitions
- Permission matrix implementation

**Days 3-4:** Authentication API
- Login/logout endpoints
- JWT token generation with scoping
- Password management
- MFA support (optional)

**Day 5:** Authorization middleware
- Group access validation
- Organization filtering
- Permission checks

### Week 3: Reporting Backend API
**Days 1-2:** Core API structure
- Express server setup
- Database connection pooling
- Error handling
- Logging infrastructure

**Days 3-4:** Report endpoints
- HR reports (headcount, demographics, turnover)
- Payroll reports (summaries, trends)
- Scheduling reports (utilization)
- Cross-org aggregations

**Day 5:** Security & audit logging
- Access audit logging
- Query validation
- Security testing

### Week 4: Metabase Integration
**Days 1-2:** Metabase setup
- Docker deployment
- Database connection
- User synchronization

**Days 3-4:** Dashboard creation
- Executive dashboard
- HR dashboard
- Payroll dashboard
- Department dashboards

**Day 5:** User training & documentation

### Week 5: Testing & Deployment
**Days 1-3:** Comprehensive testing
- Security penetration testing
- Performance testing
- User acceptance testing

**Days 4-5:** Production deployment
- Deploy to production
- Monitor performance
- Gather feedback

---

## Success Metrics

### Security
- ✅ Zero cross-tenant data leakage incidents
- ✅ 100% audit coverage of data access
- ✅ All queries include organization filtering
- ✅ Failed authorization attempts < 0.1%

### Performance
- ✅ Report load time < 3 seconds (95th percentile)
- ✅ Zero impact on operational database performance
- ✅ ETL completion < 1 hour
- ✅ Concurrent users supported: 50+

### Adoption
- ✅ Executive dashboard usage: Daily
- ✅ Department reports usage: Weekly
- ✅ User satisfaction score: > 8/10
- ✅ Report export usage: > 100/month

### Business Value
- ✅ Decision-making time reduced by 60%
- ✅ Manual report generation eliminated
- ✅ Cross-subsidiary insights enabled
- ✅ Compliance audit trail established

---

## Risk Mitigation

### Risk 1: Data Leakage
**Mitigation:**
- Multiple security layers (JWT scope, middleware, query-level)
- Comprehensive audit logging
- Regular security audits
- Automated testing for cross-tenant access

### Risk 2: Performance Impact on Operations
**Mitigation:**
- Separate reporting database
- Read-only access to operational data
- ETL runs during off-hours
- Connection limits and timeouts

### Risk 3: ETL Failures
**Mitigation:**
- Idempotent ETL jobs
- Error notifications
- Automatic retry logic
- Rollback capabilities

### Risk 4: User Access Misconfiguration
**Mitigation:**
- Principle of least privilege
- Regular access reviews
- Automated access expiration
- Approval workflows for role changes

---

## Next Steps

1. **Approve Architecture** - Review and approve this plan
2. **Provision Infrastructure** - Set up reporting database
3. **Begin Week 1** - Start with database schema
4. **Weekly Reviews** - Progress checkpoints
5. **Iterate Based on Feedback** - Adjust as needed

---

## Document Structure

This implementation plan is divided into multiple documents:

1. **01-PROJECT-OVERVIEW.md** (This document)
2. **02-DATABASE-SCHEMA.md** - Complete database design
3. **03-AUTHENTICATION-SYSTEM.md** - Auth implementation details
4. **04-BACKEND-API.md** - API endpoints and services
5. **05-ETL-PIPELINE.md** - Data synchronization jobs
6. **06-METABASE-INTEGRATION.md** - BI tool setup
7. **07-DEPLOYMENT-GUIDE.md** - Production deployment steps
8. **08-SECURITY-TESTING.md** - Security validation procedures

---

**Status:** ✅ Ready for Review  
**Next Document:** 02-DATABASE-SCHEMA.md
