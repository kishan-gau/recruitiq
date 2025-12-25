/**
 * Migration: Create forfait_rules table
 * 
 * This table manages forfait (lump sum) payment rules that automatically
 * generate additional payment components when certain pay components are used.
 * 
 * Example: When a bonus is paid, a 5% vacation allowance is automatically added.
 */

export function up(knex) {
  return knex.schema.withSchema('payroll').createTable('forfait_rule', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Tenant isolation
    table.uuid('organization_id').notNullable();
    table.foreign('organization_id').references('id').inTable('organizations');
    
    // Rule configuration
    table.string('rule_name', 200).notNullable()
      .comment('Name of the rule (e.g., "5% Vacation Allowance on Bonus")');
    
    table.text('description')
      .comment('Detailed description of when and how this rule applies');
    
    // Source component (trigger)
    table.uuid('source_component_id').notNullable()
      .comment('The pay component that triggers this forfait rule');
    table.foreign('source_component_id').references('id').inTable('payroll.pay_component');
    
    // Target forfait component (generated)
    table.uuid('forfait_component_id').notNullable()
      .comment('The forfait component to create when rule is triggered');
    table.foreign('forfait_component_id').references('id').inTable('payroll.pay_component');
    
    // Calculation configuration
    table.decimal('percentage_rate', 5, 2).notNullable()
      .comment('Percentage to apply (e.g., 5.00 for 5%)');
    
    table.boolean('apply_on_gross').notNullable().defaultTo(true)
      .comment('Whether to apply on gross amount (before deductions)');
    
    table.decimal('min_amount', 12, 2).nullable()
      .comment('Minimum amount for forfait to apply');
    
    table.decimal('max_amount', 12, 2).nullable()
      .comment('Maximum forfait amount that can be generated');
    
    // Catalog value for tax reporting
    table.string('catalog_value', 10).nullable()
      .comment('Tax catalog code for reporting (e.g., "025" for vacation pay)');
    
    // Effective dates
    table.date('effective_from').notNullable()
      .comment('Date when this rule becomes active');
    
    table.date('effective_to').nullable()
      .comment('Date when this rule expires (null = no expiration)');
    
    // Status
    table.boolean('is_active').notNullable().defaultTo(true)
      .comment('Whether this rule is currently active');
    
    // Metadata
    table.jsonb('metadata').nullable()
      .comment('Additional configuration options');
    
    // Audit columns
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.uuid('deleted_by').nullable();
    
    // Indexes for performance
    table.index('organization_id', 'idx_forfait_rules_organization_id');
    table.index('source_component_id', 'idx_forfait_rules_source_component');
    table.index('forfait_component_id', 'idx_forfait_rules_forfait_component');
    table.index(['organization_id', 'is_active'], 'idx_forfait_rules_org_active');
    table.index(['effective_from', 'effective_to'], 'idx_forfait_rules_effective_dates');
    
    // Unique constraint: one rule per source-forfait pair per org
    table.unique(
      ['organization_id', 'source_component_id', 'forfait_component_id', 'effective_from'],
      { predicate: knex.whereNull('deleted_at') }
    );
  })
  .then(() => {
    // Add foreign keys for audit columns
    return knex.schema.withSchema('payroll').alterTable('forfait_rule', (table) => {
      table.foreign('created_by').references('id').inTable('hris.user_account');
      table.foreign('updated_by').references('id').inTable('hris.user_account');
      table.foreign('deleted_by').references('id').inTable('hris.user_account');
    });
  })
  .then(() => {
    // Add comments
    return knex.raw(`
      COMMENT ON TABLE payroll.forfait_rule IS 'Manages forfait (lump sum) payment rules that automatically generate additional payment components';
      COMMENT ON COLUMN payroll.forfait_rule.rule_name IS 'Name of the rule (e.g., "5% Vacation Allowance on Bonus")';
      COMMENT ON COLUMN payroll.forfait_rule.source_component_id IS 'The pay component that triggers this forfait rule';
      COMMENT ON COLUMN payroll.forfait_rule.forfait_component_id IS 'The forfait component to create when rule is triggered';
      COMMENT ON COLUMN payroll.forfait_rule.percentage_rate IS 'Percentage to apply (e.g., 5.00 for 5%)';
      COMMENT ON COLUMN payroll.forfait_rule.catalog_value IS 'Tax catalog code for reporting (e.g., "025" for vacation pay)';
    `);
  });
}

export function down(knex) {
  return knex.schema.withSchema('payroll').dropTableIfExists('forfait_rule');
}
