# Database Schema Verification

## Migration Files Overview

This document verifies the completeness of the consolidated database schema across all migration files.

---

## Migration 1: 20251130000000_consolidated_schema.js (Main Schema)

### Core Platform Tables (6)
1. `organizations` - Multi-tenant organization data
2. `permissions` - Product-specific permissions
3. `roles` - Organization roles
4. `role_permissions` - Role-permission mappings
5. `user_roles` - Predefined system roles
6. `email_settings` - Email configuration per organization

### HRIS/Nexus Tables (13)
7. `user_account` - User authentication (hris schema)
8. `tenant_refresh_tokens` - JWT refresh tokens
9. `department` - Department structure
10. `location` - Physical locations
11. `worker_type` - Worker classifications
12. `employee` - Employee master data
13. `worker_metadata` - Worker type metadata
14. `compensation` - Compensation records
15. `time_attendance_event` - Time tracking events
16. `time_entry` - Time entries
17. `timesheet` - Timesheet records
18. `shift_type` - Shift definitions
19. `employee_payroll_config` - Employee payroll settings

### PayLinQ Tables (18)
20. `payroll_run` - Payroll run header
21. `payroll_run_line` - Payroll run details
22. `tax_table` - Tax calculation tables
23. `pay_component` - Pay components (earnings/deductions)
24. `component_formula` - Formula definitions
25. `formula_execution_log` - Formula execution audit
26. `employee_pay_component_assignment` - Component assignments
27. `rated_time_line` - Time-based calculations
28. `employee_deduction` - Deduction records
29. `tax_rule_set` - Tax rule configurations
30. `tax_bracket` - Tax bracket definitions
31. `allowance` - Allowance configurations
32. `loontijdvak` - Dutch payroll periods
33. `payroll_run_type` - Payroll run type templates
34. `worker_type_pay_config` - Worker type pay defaults
35. `worker_type_history` - Worker type audit trail
36. `pay_structure_template_resolution_cache` - Template cache

### RecruitIQ Tables (4)
37. `workspace` - Recruitment workspaces
38. `job` - Job postings
39. `candidate` - Candidate profiles
40. `application` - Job applications
41. `interview` - Interview scheduling

### ScheduleHub Tables (3)
42. `station` - Work stations
43. `shift` - Shift assignments
44. `schedule` - Schedule master

### Central Logging Tables (3)
45. `system_logs` - System event logs
46. `security_events` - Security audit logs
47. `audit_trail` - General audit trail

**Total Tables in Main Schema: 47**

---

## Migration 2: 20251130000001_consolidated_schema_part2.js (Duplicates - Should be Removed)

**⚠️ DUPLICATE TABLES DETECTED:**
- `jobs` (duplicate of `job`)
- `candidates` (duplicate of `candidate`)
- `applications` (duplicate of `application`)
- `stations` (duplicate of `station`)
- `shifts` (duplicate of `shift`)

**Action Required:** This migration file contains duplicate table definitions and should be deleted or merged into the main schema.

---

## Migration 3: 20251130000001_consolidated_schema_tables.js (Partial Duplicates)

**⚠️ DUPLICATE/OVERLAPPING TABLES:**
- `organizations` ✓ (already in main)
- `features` ❓ (NEW - not in main)
- `license_plans` ❓ (NEW - not in main)
- `organization_licenses` ❓ (NEW - not in main)
- `organization_features` ❓ (NEW - not in main)
- `workspaces` (duplicate of `workspace`)
- `user_account` (duplicate - already in main)
- `user_roles` (duplicate - already in main)
- `user_role_assignments` ❓ (NEW - not in main)
- `workspace_memberships` ❓ (NEW - not in main)
- `locations` (duplicate of `location`)
- `departments` (duplicate of `department`)
- `employees` (duplicate of `employee`)

**New Tables to Add to Main Schema:**
1. `features` - Product feature definitions
2. `license_plans` - License plan configurations
3. `organization_licenses` - Organization license assignments
4. `organization_features` - Feature flag overrides
5. `user_role_assignments` - User-role mappings
6. `workspace_memberships` - Workspace access control

---

## Migration 4: 20251130000001_hris_nexus_schema.js (HRIS Extensions)

**⚠️ DUPLICATE TABLES:**
- `hris_locations` (duplicate of `location`)
- `hris_departments` (duplicate of `department`)
- `employee_records` (duplicate of `employee`)

**NEW HRIS Tables:**
1. `hris_time_off_types` - Time off type definitions
2. `hris_time_off_requests` - Time off requests
3. `hris_time_off_balances` - Time off balance tracking

**Action Required:** Add new time-off tables to main schema, remove duplicates.

---

## Migration 5: 20251130000002_consolidated_schema_part3.js (System Tables)

**NEW System/Platform Tables:**
1. `activity_logs` - User activity tracking
2. `security_events` - Security event logging (duplicate check needed)
3. `notifications` - Notification system
4. `file_uploads` - File upload tracking
5. `scheduled_jobs` - Background job scheduling
6. `rate_limits` - Rate limiting tracking
7. `system_metrics` - System performance metrics

**Note:** `security_events` may be duplicate of table in main schema - needs verification.

---

## Migration 6: 20251130000003_hris_nexus_extended.js (HRIS Extended Features)

**NEW HRIS Extended Tables:**
1. `hris_employment_history` - Employment status changes
2. `hris_contract_sequence_policy` - Contract progression rules
3. `hris_contract_sequence_step` - Contract sequence steps
4. `hris_contract` - Employment contracts
5. `hris_review_template` - Performance review templates
6. `hris_performance_review` - Performance reviews
7. `hris_performance_goal` - Performance goals
8. `hris_feedback` - 360° feedback
9. `hris_benefits_plan` - Benefits plan definitions
10. `hris_employee_benefit_enrollment` - Benefit enrollments
11. `hris_time_off_accrual_history` - Time off accrual tracking
12. `hris_attendance_record` - Attendance tracking
13. `hris_rule_definition` - Business rule engine
14. `hris_rule_execution_history` - Rule execution audit
15. `hris_document_category` - Document categories
16. `hris_employee_document` - Employee documents
17. `hris_audit_log` - HRIS-specific audit trail

---

## Schema Completeness Assessment

### ✅ Complete Modules
1. **Core Platform** - Organizations, RBAC (needs user_role_assignments)
2. **PayLinQ** - Payroll system (complete)
3. **RecruitIQ** - Recruitment ATS (complete)
4. **ScheduleHub** - Scheduling (complete)

### ⚠️ Incomplete/Needs Consolidation
1. **HRIS/Nexus** - Split across multiple files, duplicates present
2. **Licensing System** - Tables exist but not in main schema
3. **System Tables** - Activity logs, notifications not in main schema

### 🔴 Missing Tables (Based on Standards Documents)
1. **Multi-Currency Support** (mentioned in PERFORMANCE_STANDARDS.md)
   - `currencies` table
   - `exchange_rates` table
   
2. **Session Management** (mentioned in security docs)
   - `user_sessions` table (for session tracking)
   - `session_devices` table (for device fingerprinting)
   
3. **API Rate Limiting** (mentioned in API_STANDARDS.md)
   - Partially covered by `rate_limits` in part3
   
4. **Notification Preferences** (user settings)
   - `user_notification_preferences` table
   
5. **Product Configuration** (for dynamic product loading)
   - `products` table (metadata for paylinq, nexus, etc.)
   - `product_licenses` table (which products org has access to)

---

## Recommended Actions

### 1. **Consolidate Main Schema** (Priority: HIGH)
   - Add missing tables from other migrations to `20251130000000_consolidated_schema.js`:
     - License system tables (features, license_plans, etc.)
     - HRIS time-off tables
     - System tables (activity_logs, notifications, etc.)
     - HRIS extended tables (contracts, reviews, documents)
   
### 2. **Remove Duplicate Migrations** (Priority: HIGH)
   - Delete `20251130000001_consolidated_schema_part2.js` (all duplicates)
   - Delete duplicate tables from `20251130000001_consolidated_schema_tables.js`
   - Delete duplicate tables from `20251130000001_hris_nexus_schema.js`
   
### 3. **Add Missing Tables** (Priority: MEDIUM)
   - Multi-currency tables
   - Session management tables
   - Product configuration tables
   - User notification preferences
   
### 4. **Final Migration Structure** (Priority: HIGH)
   ```
   20251130000000_consolidated_schema.js (ALL tables)
   20251130000001_seed_data.js (seed data only)
   ```

---

## Total Table Count

### Current State
- Main Schema: 47 tables
- Duplicates: ~15 tables
- New Unique Tables: ~30 tables
- **Estimated Total Unique Tables: 77 tables**

### Expected Final State
- Single consolidated migration: ~80-85 tables (including missing tables)

---

## Verification Checklist

- [ ] All duplicate tables removed
- [ ] All unique tables consolidated into main schema
- [ ] Missing multi-currency tables added
- [ ] Missing session management tables added
- [ ] Missing product configuration tables added
- [ ] All foreign key relationships verified
- [ ] All indexes created
- [ ] All constraints defined
- [ ] Audit columns present on all tables (created_at, updated_at, deleted_at)
- [ ] Soft delete support on all business tables
- [ ] Schema documentation comments added
- [ ] Migration tested on clean database
- [ ] Rollback tested

---

**Status:** ⚠️ Schema is ~60% complete. Significant consolidation work needed.

**Next Steps:** 
1. Create a single comprehensive migration file
2. Remove all duplicate migration files
3. Add missing tables for complete functionality
4. Test end-to-end migration
