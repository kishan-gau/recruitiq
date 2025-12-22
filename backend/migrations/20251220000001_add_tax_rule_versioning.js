/**
 * Add tax rule versioning support
 * 
 * This migration adds versioning capabilities to tax rules following 
 * the same pattern as pay structure templates.
 * 
 * Created: December 20, 2025
 */

export async function up(knex) {
  // ================================================================
  // ADD VERSIONING COLUMNS TO TAX_RULE_SET
  // ================================================================
  
  await knex.schema.withSchema('payroll').alterTable('tax_rule_set', (table) => {
    // Version identification
    table.string('rule_set_code', 50); // Shared across versions
    table.integer('version_major').defaultTo(1);
    table.integer('version_minor').defaultTo(0);
    table.integer('version_patch').defaultTo(0);
    
    // Version status and metadata
    table.boolean('is_draft').notNullable().defaultTo(true);
    table.boolean('is_published').notNullable().defaultTo(false);
    table.boolean('is_archived').notNullable().defaultTo(false);
    table.string('version_type', 20); // 'major', 'minor', 'patch'
    table.text('change_summary');
    table.text('change_log');
    
    // Version relationships
    table.uuid('base_version_id'); // Points to the version this was created from
    table.uuid('parent_rule_set_id'); // Points to original rule set (for audit trail)
    
    // Publishing information
    table.timestamp('published_at', { useTz: true });
    table.uuid('published_by');
    table.timestamp('archived_at', { useTz: true });
    table.uuid('archived_by');
    
    // Add foreign key constraints
    table.foreign('base_version_id').references('id').inTable('payroll.tax_rule_set');
    table.foreign('parent_rule_set_id').references('id').inTable('payroll.tax_rule_set');
    table.foreign('published_by').references('id').inTable('hris.user_account');
    table.foreign('archived_by').references('id').inTable('hris.user_account');
  });

  // ================================================================
  // CREATE TAX_RULE_SET_VERSION_HISTORY TABLE
  // ================================================================
  
  await knex.schema.withSchema('payroll').createTable('tax_rule_set_version_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('rule_set_id').notNullable(); // Points to tax_rule_set
    
    // Version action tracking
    table.string('action', 30).notNullable(); // 'created', 'published', 'archived', 'modified'
    table.string('version_type', 20); // 'major', 'minor', 'patch'
    table.text('change_description');
    table.jsonb('changes_detail'); // Detailed change tracking
    
    // Version snapshot (for comparison)
    table.text('version_summary');
    table.integer('version_major');
    table.integer('version_minor'); 
    table.integer('version_patch');
    
    // User and timing
    table.uuid('performed_by');
    table.timestamp('performed_at', { useTz: true }).defaultTo(knex.fn.now());
    table.string('ip_address', 45);
    table.text('user_agent');
    
    // Audit fields
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('rule_set_id').references('id').inTable('payroll.tax_rule_set').onDelete('CASCADE');
    table.foreign('performed_by').references('id').inTable('hris.user_account');
    table.foreign('created_by').references('id').inTable('hris.user_account');
  });

  // ================================================================
  // CREATE UNIQUE CONSTRAINTS AND INDEXES
  // ================================================================
  
  // Only one published version per rule set code at a time
  await knex.raw(`
    CREATE UNIQUE INDEX tax_rule_set_published_version 
    ON payroll.tax_rule_set (organization_id, rule_set_code) 
    WHERE is_published = true AND deleted_at IS NULL
  `);
  
  // Ensure version numbers are unique per rule set code
  await knex.raw(`
    CREATE UNIQUE INDEX tax_rule_set_version_unique
    ON payroll.tax_rule_set (organization_id, rule_set_code, version_major, version_minor, version_patch)
    WHERE deleted_at IS NULL
  `);
  
  // Indexes for version queries
  await knex.schema.withSchema('payroll').alterTable('tax_rule_set', (table) => {
    table.index(['organization_id', 'rule_set_code'], 'tax_rule_set_code_idx');
    table.index(['organization_id', 'is_published'], 'tax_rule_set_published_idx');
    table.index(['organization_id', 'is_draft'], 'tax_rule_set_draft_idx');
    table.index(['effective_from', 'effective_to'], 'tax_rule_set_effective_dates_idx');
  });

  await knex.schema.withSchema('payroll').alterTable('tax_rule_set_version_history', (table) => {
    table.index(['rule_set_id', 'performed_at'], 'tax_version_history_timeline_idx');
    table.index(['organization_id', 'performed_at'], 'tax_version_history_org_timeline_idx');
  });

  // ================================================================
  // UPDATE EXISTING RECORDS WITH VERSIONING DATA
  // ================================================================
  
  // Generate rule_set_code for existing records and set as v1.0.0 published
  await knex.raw(`
    UPDATE payroll.tax_rule_set 
    SET 
      rule_set_code = CASE 
        WHEN tax_type = 'income_tax' THEN CONCAT('income_tax_', country, COALESCE('_' || state, ''))
        WHEN tax_type = 'payroll_tax' THEN CONCAT('payroll_tax_', country)
        ELSE CONCAT(tax_type, '_', country)
      END,
      version_major = 1,
      version_minor = 0, 
      version_patch = 0,
      is_draft = false,
      is_published = true,
      published_at = created_at,
      published_by = created_by,
      version_type = 'major',
      change_summary = 'Initial version'
    WHERE rule_set_code IS NULL
  `);

  // ================================================================
  // ADD HELPER FUNCTIONS
  // ================================================================
  
  await knex.raw(`
    CREATE OR REPLACE FUNCTION payroll.get_next_version(
      p_rule_set_code TEXT,
      p_organization_id UUID,
      p_version_type TEXT
    ) RETURNS TEXT AS $$
    DECLARE
      current_major INT;
      current_minor INT;
      current_patch INT;
      new_version TEXT;
    BEGIN
      -- Get current highest version
      SELECT 
        COALESCE(MAX(version_major), 0),
        COALESCE(MAX(version_minor), 0), 
        COALESCE(MAX(version_patch), 0)
      INTO current_major, current_minor, current_patch
      FROM payroll.tax_rule_set
      WHERE rule_set_code = p_rule_set_code 
        AND organization_id = p_organization_id
        AND deleted_at IS NULL;
      
      -- Calculate next version based on type
      CASE p_version_type
        WHEN 'major' THEN 
          new_version := (current_major + 1) || '.0.0';
        WHEN 'minor' THEN
          new_version := current_major || '.' || (current_minor + 1) || '.0';
        WHEN 'patch' THEN
          new_version := current_major || '.' || current_minor || '.' || (current_patch + 1);
        ELSE
          RAISE EXCEPTION 'Invalid version type: %. Must be major, minor, or patch', p_version_type;
      END CASE;
      
      RETURN new_version;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION payroll.log_tax_rule_version_change()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Log version history for significant changes
      IF TG_OP = 'INSERT' THEN
        INSERT INTO payroll.tax_rule_set_version_history (
          organization_id, rule_set_id, action, version_type,
          change_description, version_major, version_minor, version_patch,
          performed_by, performed_at, created_by
        ) VALUES (
          NEW.organization_id, NEW.id, 'created', NEW.version_type,
          NEW.change_summary, NEW.version_major, NEW.version_minor, NEW.version_patch,
          NEW.created_by, NOW(), NEW.created_by
        );
      ELSIF TG_OP = 'UPDATE' THEN
        -- Log publication
        IF OLD.is_published = false AND NEW.is_published = true THEN
          INSERT INTO payroll.tax_rule_set_version_history (
            organization_id, rule_set_id, action, 
            change_description, version_major, version_minor, version_patch,
            performed_by, performed_at, created_by
          ) VALUES (
            NEW.organization_id, NEW.id, 'published',
            'Version published and made active', NEW.version_major, NEW.version_minor, NEW.version_patch,
            NEW.published_by, NEW.published_at, NEW.published_by
          );
        END IF;
        
        -- Log archival
        IF OLD.is_archived = false AND NEW.is_archived = true THEN
          INSERT INTO payroll.tax_rule_set_version_history (
            organization_id, rule_set_id, action,
            change_description, version_major, version_minor, version_patch, 
            performed_by, performed_at, created_by
          ) VALUES (
            NEW.organization_id, NEW.id, 'archived',
            'Version archived and deactivated', NEW.version_major, NEW.version_minor, NEW.version_patch,
            NEW.archived_by, NEW.archived_at, NEW.archived_by
          );
        END IF;
      END IF;
      
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger for automatic version history logging
  await knex.raw(`
    CREATE TRIGGER tax_rule_version_history_trigger
      AFTER INSERT OR UPDATE ON payroll.tax_rule_set
      FOR EACH ROW
      EXECUTE FUNCTION payroll.log_tax_rule_version_change();
  `);

  // ================================================================
  // ADD COMMENTS FOR DOCUMENTATION
  // ================================================================
  
  await knex.raw(`COMMENT ON COLUMN payroll.tax_rule_set.rule_set_code IS 'Unique code shared across all versions of a tax rule set'`);
  await knex.raw(`COMMENT ON COLUMN payroll.tax_rule_set.version_major IS 'Major version number (breaking changes)'`);
  await knex.raw(`COMMENT ON COLUMN payroll.tax_rule_set.version_minor IS 'Minor version number (new features)'`);
  await knex.raw(`COMMENT ON COLUMN payroll.tax_rule_set.version_patch IS 'Patch version number (bug fixes)'`);
  await knex.raw(`COMMENT ON COLUMN payroll.tax_rule_set.is_draft IS 'True if version is in draft state'`);
  await knex.raw(`COMMENT ON COLUMN payroll.tax_rule_set.is_published IS 'True if version is published and active'`);
  await knex.raw(`COMMENT ON COLUMN payroll.tax_rule_set.base_version_id IS 'ID of the version this was created from'`);
  await knex.raw(`COMMENT ON TABLE payroll.tax_rule_set_version_history IS 'Complete audit trail of all tax rule version changes'`);
}

export async function down(knex) {
  // Drop trigger first
  await knex.raw('DROP TRIGGER IF EXISTS tax_rule_version_history_trigger ON payroll.tax_rule_set');
  
  // Drop functions
  await knex.raw('DROP FUNCTION IF EXISTS payroll.log_tax_rule_version_change()');
  await knex.raw('DROP FUNCTION IF EXISTS payroll.get_next_version(TEXT, UUID, TEXT)');
  
  // Drop indexes
  await knex.raw('DROP INDEX IF EXISTS payroll.tax_rule_set_published_version');
  await knex.raw('DROP INDEX IF EXISTS payroll.tax_rule_set_version_unique');
  await knex.raw('DROP INDEX IF EXISTS payroll.tax_rule_set_code_idx');
  await knex.raw('DROP INDEX IF EXISTS payroll.tax_rule_set_published_idx');
  await knex.raw('DROP INDEX IF EXISTS payroll.tax_rule_set_draft_idx');
  await knex.raw('DROP INDEX IF EXISTS payroll.tax_rule_set_effective_dates_idx');
  await knex.raw('DROP INDEX IF EXISTS payroll.tax_version_history_timeline_idx');
  await knex.raw('DROP INDEX IF EXISTS payroll.tax_version_history_org_timeline_idx');
  
  // Drop version history table
  await knex.schema.withSchema('payroll').dropTableIfExists('tax_rule_set_version_history');
  
  // Remove versioning columns from tax_rule_set
  await knex.schema.withSchema('payroll').alterTable('tax_rule_set', (table) => {
    table.dropColumn('rule_set_code');
    table.dropColumn('version_major');
    table.dropColumn('version_minor');
    table.dropColumn('version_patch');
    table.dropColumn('is_draft');
    table.dropColumn('is_published');
    table.dropColumn('is_archived');
    table.dropColumn('version_type');
    table.dropColumn('change_summary');
    table.dropColumn('change_log');
    table.dropColumn('base_version_id');
    table.dropColumn('parent_rule_set_id');
    table.dropColumn('published_at');
    table.dropColumn('published_by');
    table.dropColumn('archived_at');
    table.dropColumn('archived_by');
  });
}