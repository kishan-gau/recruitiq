/**
 * Migration: Add VIP Employee Tracking
 * 
 * This migration adds:
 * 1. VIP and restriction columns to hris.employee table
 * 2. hris.employee_access_control table for granular access rules
 * 3. hris.restricted_access_log table for audit logging
 * 
 * Based on VIP_EMPLOYEE_TRACKING_IMPLEMENTATION_PLAN.md
 */

export async function up(knex) {
  // ===========================
  // 1. Add VIP columns to hris.employee
  // ===========================
  
  await knex.schema.withSchema('hris').alterTable('employee', (table) => {
    // VIP Status
    table.boolean('is_vip').defaultTo(false);
    
    // Access Restriction
    table.boolean('is_restricted').defaultTo(false);
    table.string('restriction_level', 20).nullable();
    table.uuid('restricted_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('restricted_at', { useTz: true }).nullable();
    table.text('restriction_reason').nullable();
  });

  // Add check constraint for restriction_level
  await knex.raw(`
    ALTER TABLE hris.employee 
    ADD CONSTRAINT employee_restriction_level_check 
    CHECK (restriction_level IN (NULL, 'none', 'financial', 'full', 'executive'))
  `);

  // Add indexes for VIP queries
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_employee_vip_restricted 
    ON hris.employee(organization_id, is_restricted, restriction_level) 
    WHERE deleted_at IS NULL
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_employee_is_vip 
    ON hris.employee(organization_id, is_vip) 
    WHERE deleted_at IS NULL AND is_vip = TRUE
  `);

  // Add column comments
  await knex.raw(`
    COMMENT ON COLUMN hris.employee.is_vip IS 
      'Flag indicating VIP status (C-level executives, board members, high-value employees). VIP employees may have access restrictions enabled.';
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN hris.employee.is_restricted IS 
      'Flag to enable access restrictions. When TRUE, only authorized users can access this employee''s data based on access control rules.';
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN hris.employee.restriction_level IS 
      'Type of restriction: none (No restrictions, default), financial (Only compensation data restricted), full (Compensation + performance + documents restricted), executive (Maximum protection - all sensitive data restricted)';
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN hris.employee.restricted_by IS 
      'User who marked this employee as restricted. NULL if not restricted.';
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN hris.employee.restricted_at IS 
      'Timestamp when restriction was enabled. NULL if not restricted.';
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN hris.employee.restriction_reason IS 
      'Business reason for restriction (audit trail). Example: "C-level executive with highly sensitive compensation structure"';
  `);

  // ===========================
  // 2. Create Employee Access Control Table
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('employee_access_control', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    
    // Access Grants (stored as UUID arrays)
    table.specificType('allowed_user_ids', 'UUID[]').defaultTo('{}');
    table.specificType('allowed_role_ids', 'UUID[]').defaultTo('{}');
    table.specificType('allowed_department_ids', 'UUID[]').defaultTo('{}');
    
    // Granular Data Type Restrictions
    // When TRUE, the data type is RESTRICTED (requires authorization)
    table.boolean('restrict_compensation').defaultTo(true);
    table.boolean('restrict_personal_info').defaultTo(false);
    table.boolean('restrict_performance').defaultTo(false);
    table.boolean('restrict_documents').defaultTo(false);
    table.boolean('restrict_time_off').defaultTo(false);
    table.boolean('restrict_benefits').defaultTo(false);
    table.boolean('restrict_attendance').defaultTo(false);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account').onDelete('SET NULL');
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });

  // Add unique constraint
  await knex.raw(`
    ALTER TABLE hris.employee_access_control 
    ADD CONSTRAINT uq_employee_access_control UNIQUE (employee_id, organization_id)
  `);

  // Add indexes
  await knex.raw(`
    CREATE INDEX idx_employee_access_control_org 
    ON hris.employee_access_control(organization_id) 
    WHERE deleted_at IS NULL
  `);

  await knex.raw(`
    CREATE INDEX idx_employee_access_control_employee 
    ON hris.employee_access_control(employee_id) 
    WHERE deleted_at IS NULL
  `);

  // GIN indexes for array searches
  await knex.raw(`
    CREATE INDEX idx_employee_access_control_allowed_users 
    ON hris.employee_access_control USING GIN(allowed_user_ids)
  `);

  await knex.raw(`
    CREATE INDEX idx_employee_access_control_allowed_roles 
    ON hris.employee_access_control USING GIN(allowed_role_ids)
  `);

  await knex.raw(`
    CREATE INDEX idx_employee_access_control_allowed_departments 
    ON hris.employee_access_control USING GIN(allowed_department_ids)
  `);

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE hris.employee_access_control IS 
      'Defines access control rules for restricted VIP employees. Specifies which users, roles, or departments can access specific data types for each restricted employee.';
  `);

  // ===========================
  // 3. Create Restricted Access Log (Audit Trail)
  // ===========================
  
  await knex.schema.withSchema('hris').createTable('restricted_access_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('hris.user_account').onDelete('CASCADE');
    
    // Access Details
    table.string('access_type', 50).notNullable();
    table.boolean('access_granted').notNullable();
    table.string('denial_reason', 200).nullable();
    
    // Context Information
    table.string('endpoint', 300).nullable();
    table.string('http_method', 10).nullable();
    table.specificType('ip_address', 'INET').nullable();
    table.text('user_agent').nullable();
    
    // Timestamp
    table.timestamp('accessed_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // Add check constraint for access_type
  await knex.raw(`
    ALTER TABLE hris.restricted_access_log 
    ADD CONSTRAINT restricted_access_log_type_check 
    CHECK (access_type IN (
      'general', 'compensation', 'personal_info', 'performance', 
      'documents', 'time_off', 'benefits', 'attendance'
    ))
  `);

  // Add check constraint for denial_reason
  await knex.raw(`
    ALTER TABLE hris.restricted_access_log 
    ADD CONSTRAINT check_denial_reason 
    CHECK (
      (access_granted = TRUE AND denial_reason IS NULL) OR
      (access_granted = FALSE AND denial_reason IS NOT NULL)
    )
  `);

  // Add indexes
  await knex.raw(`
    CREATE INDEX idx_restricted_access_log_employee_time 
    ON hris.restricted_access_log(employee_id, accessed_at DESC)
  `);

  await knex.raw(`
    CREATE INDEX idx_restricted_access_log_user_time 
    ON hris.restricted_access_log(user_id, accessed_at DESC)
  `);

  await knex.raw(`
    CREATE INDEX idx_restricted_access_log_org_time 
    ON hris.restricted_access_log(organization_id, accessed_at DESC)
  `);

  await knex.raw(`
    CREATE INDEX idx_restricted_access_log_granted 
    ON hris.restricted_access_log(access_granted, accessed_at DESC)
    WHERE access_granted = FALSE
  `);

  await knex.raw(`
    CREATE INDEX idx_restricted_access_log_access_type 
    ON hris.restricted_access_log(access_type, accessed_at DESC)
  `);

  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE hris.restricted_access_log IS 
      'Audit trail for all access attempts to restricted VIP employee data. Logs both granted and denied access for compliance and security monitoring.';
  `);

  // ===========================
  // 4. Enable RLS for new tables
  // ===========================
  
  await knex.raw(`
    ALTER TABLE hris.employee_access_control ENABLE ROW LEVEL SECURITY
  `);

  await knex.raw(`
    CREATE POLICY employee_access_control_tenant_isolation ON hris.employee_access_control
      USING (organization_id = hris.get_current_organization_id())
  `);

  await knex.raw(`
    CREATE POLICY employee_access_control_tenant_isolation_insert ON hris.employee_access_control
      FOR INSERT
      WITH CHECK (organization_id = hris.get_current_organization_id())
  `);

  await knex.raw(`
    ALTER TABLE hris.restricted_access_log ENABLE ROW LEVEL SECURITY
  `);

  await knex.raw(`
    CREATE POLICY restricted_access_log_tenant_isolation ON hris.restricted_access_log
      USING (organization_id = hris.get_current_organization_id())
  `);

  await knex.raw(`
    CREATE POLICY restricted_access_log_tenant_isolation_insert ON hris.restricted_access_log
      FOR INSERT
      WITH CHECK (organization_id = hris.get_current_organization_id())
  `);

  // ===========================
  // 5. Create cleanup function for old access logs
  // ===========================
  
  await knex.raw(`
    CREATE OR REPLACE FUNCTION hris.cleanup_old_access_logs()
    RETURNS INTEGER AS $$
    DECLARE
      deleted_count INTEGER;
    BEGIN
      DELETE FROM hris.restricted_access_log
      WHERE accessed_at < NOW() - INTERVAL '7 years';
      
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql
  `);

  await knex.raw(`
    COMMENT ON FUNCTION hris.cleanup_old_access_logs() IS 
      'Deletes access logs older than 7 years for compliance. Run monthly via cron job or pg_cron.';
  `);
}

export async function down(knex) {
  // Drop function first
  await knex.raw('DROP FUNCTION IF EXISTS hris.cleanup_old_access_logs()');

  // Drop RLS policies
  await knex.raw('DROP POLICY IF EXISTS restricted_access_log_tenant_isolation_insert ON hris.restricted_access_log');
  await knex.raw('DROP POLICY IF EXISTS restricted_access_log_tenant_isolation ON hris.restricted_access_log');
  await knex.raw('DROP POLICY IF EXISTS employee_access_control_tenant_isolation_insert ON hris.employee_access_control');
  await knex.raw('DROP POLICY IF EXISTS employee_access_control_tenant_isolation ON hris.employee_access_control');

  // Drop new tables
  await knex.schema.withSchema('hris').dropTableIfExists('restricted_access_log');
  await knex.schema.withSchema('hris').dropTableIfExists('employee_access_control');

  // Drop indexes from employee table
  await knex.raw('DROP INDEX IF EXISTS hris.idx_employee_is_vip');
  await knex.raw('DROP INDEX IF EXISTS hris.idx_employee_vip_restricted');
  
  // Drop constraint from employee table
  await knex.raw('ALTER TABLE hris.employee DROP CONSTRAINT IF EXISTS employee_restriction_level_check');

  // Remove VIP columns from employee table
  await knex.schema.withSchema('hris').alterTable('employee', (table) => {
    table.dropColumn('restriction_reason');
    table.dropColumn('restricted_at');
    table.dropColumn('restricted_by');
    table.dropColumn('restriction_level');
    table.dropColumn('is_restricted');
    table.dropColumn('is_vip');
  });
}
