-- Performance Optimization Indexes
-- Created: November 2, 2025
-- Purpose: Improve query performance under load (identified via stress testing)

-- ============================================================================
-- JOBS TABLE INDEXES
-- ============================================================================

-- Primary lookup: Jobs by organization
CREATE INDEX IF NOT EXISTS idx_jobs_organization_id 
ON jobs(organization_id);

-- Job search and filtering
CREATE INDEX IF NOT EXISTS idx_jobs_status 
ON jobs(status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_created_at 
ON jobs(created_at DESC) WHERE deleted_at IS NULL;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_org_status 
ON jobs(organization_id, status) WHERE deleted_at IS NULL;

-- Workspace filtering
CREATE INDEX IF NOT EXISTS idx_jobs_workspace_id 
ON jobs(workspace_id) WHERE deleted_at IS NULL;

-- Full-text search on job titles
CREATE INDEX IF NOT EXISTS idx_jobs_title_search 
ON jobs USING gin(to_tsvector('english', title));

-- ============================================================================
-- CANDIDATES TABLE INDEXES
-- ============================================================================

-- Primary lookup: Candidates by organization
CREATE INDEX IF NOT EXISTS idx_candidates_organization_id 
ON candidates(organization_id);

-- Candidate email lookup (for duplicate checks)
CREATE INDEX IF NOT EXISTS idx_candidates_email 
ON candidates(email) WHERE deleted_at IS NULL;

-- Candidate name search
CREATE INDEX IF NOT EXISTS idx_candidates_name 
ON candidates(name) WHERE deleted_at IS NULL;

-- Full-text search on candidate names
CREATE INDEX IF NOT EXISTS idx_candidates_name_search 
ON candidates USING gin(to_tsvector('english', name));

-- ============================================================================
-- REFRESH_TOKENS TABLE INDEXES (Session Management)
-- ============================================================================

-- Critical: Lookup by user for session management
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id 
ON refresh_tokens(user_id);

-- Critical: Cleanup old tokens (performance for enforceSessionLimit)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_created_at 
ON refresh_tokens(created_at DESC);

-- Critical: Token validation
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token 
ON refresh_tokens(token);

-- Composite index for session enforcement query
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_created 
ON refresh_tokens(user_id, created_at DESC);

-- Check for expired tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at 
ON refresh_tokens(expires_at);

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

-- Organization lookup
CREATE INDEX IF NOT EXISTS idx_users_organization_id 
ON users(organization_id);

-- Email verification
CREATE INDEX IF NOT EXISTS idx_users_email_verified 
ON users(email_verified);

-- Account lockout queries
CREATE INDEX IF NOT EXISTS idx_users_locked_until 
ON users(locked_until) 
WHERE locked_until IS NOT NULL;

-- ============================================================================
-- APPLICATIONS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_applications_job_id 
ON applications(job_id);

CREATE INDEX IF NOT EXISTS idx_applications_candidate_id 
ON applications(candidate_id);

CREATE INDEX IF NOT EXISTS idx_applications_status 
ON applications(status);

-- Composite for common queries
CREATE INDEX IF NOT EXISTS idx_applications_job_status 
ON applications(job_id, status);

-- ============================================================================
-- WORKSPACES TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workspaces_organization_id 
ON workspaces(organization_id);

-- ============================================================================
-- ANALYZE TABLES (Update Statistics)
-- ============================================================================

ANALYZE jobs;
ANALYZE candidates;
ANALYZE refresh_tokens;
ANALYZE users;
ANALYZE applications;
ANALYZE workspaces;
ANALYZE organizations;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Show table sizes and index usage
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
