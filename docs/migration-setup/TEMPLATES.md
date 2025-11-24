# Migration Templates & Examples

**Reference Document**  
**Last Updated:** November 22, 2025

---

## Overview

This document provides ready-to-use templates and real-world examples for creating Knex.js migrations in the RecruitIQ codebase.

---

## Basic Table Creation Template

```javascript
/**
 * Migration: [DESCRIPTION]
 * 
 * @description [What this migration does]
 * @author [Your Name]
 * @date [YYYY-MM-DD]
 */

export async function up(knex) {
  await knex.schema.createTable('[table_name]', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Tenant Isolation (if multi-tenant table)
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    // Business Columns
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    
    // Audit Columns (REQUIRED)
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable()
      .references('id').inTable('hris.user_account');
    table.uuid('updated_by').nullable()
      .references('id').inTable('hris.user_account');
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index(['organization_id', 'deleted_at']);
    table.index(['is_active', 'organization_id']);
  });
  
  // Add table comment
  await knex.raw(`
    COMMENT ON TABLE [table_name] IS '[Table purpose]';
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('[table_name]');
}
```

---

## Junction Table (Many-to-Many) Template

```javascript
/**
 * Migration: Create Junction Table
 */

export async function up(knex) {
  await knex.schema.createTable('[table1]_[table2]', (table) => {
    // Composite Primary Key
    table.uuid('[table1]_id').notNullable()
      .references('id').inTable('[table1]').onDelete('CASCADE');
    table.uuid('[table2]_id').notNullable()
      .references('id').inTable('[table2]').onDelete('CASCADE');
    
    // Tenant Isolation
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    // Additional junction columns (optional)
    table.string('role', 50).nullable();
    table.integer('sort_order').nullable();
    
    // Audit columns
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    
    // Composite primary key
    table.primary(['[table1]_id', '[table2]_id']);
    
    // Indexes
    table.index(['[table1]_id']);
    table.index(['[table2]_id']);
    table.index(['organization_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('[table1]_[table2]');
}
```

---

## Add Column Template

```javascript
/**
 * Migration: Add Column to Existing Table
 */

export async function up(knex) {
  await knex.schema.table('[table_name]', (table) => {
    table.string('new_column', 100).nullable();
  });
  
  // Add column comment
  await knex.raw(`
    COMMENT ON COLUMN [table_name].new_column IS '[Column description]';
  `);
}

export async function down(knex) {
  await knex.schema.table('[table_name]', (table) => {
    table.dropColumn('new_column');
  });
}
```

---

## Seed Data Migration Template

```javascript
/**
 * Migration: Seed [Entity] Data
 */

export async function up(knex) {
  const data = [
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Example 1',
      value: 'value1',
      created_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      name: 'Example 2',
      value: 'value2',
      created_at: knex.fn.now()
    }
  ];
  
  await knex('[table_name]').insert(data);
}

export async function down(knex) {
  await knex('[table_name]')
    .whereIn('name', ['Example 1', 'Example 2'])
    .del();
}
```

---

## Real Example: PayLinQ Payroll Runs

```javascript
/**
 * Migration: Create PayLinQ Payroll Runs Table
 * 
 * @description Creates the core payroll_runs table for payroll processing
 */

export async function up(knex) {
  await knex.schema.createTable('payroll_runs', (table) => {
    // Primary Key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Tenant Isolation
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    // Business Columns
    table.string('run_number', 50).notNullable();
    table.string('run_type', 50).notNullable(); // 'regular', 'bonus', 'final'
    table.date('pay_period_start').notNullable();
    table.date('pay_period_end').notNullable();
    table.date('pay_date').notNullable();
    table.date('check_date').nullable();
    table.string('status', 50).notNullable().defaultTo('draft'); // 'draft', 'calculating', 'calculated', 'approved', 'processing', 'paid', 'cancelled'
    table.decimal('total_gross', 15, 2).defaultTo(0);
    table.decimal('total_deductions', 15, 2).defaultTo(0);
    table.decimal('total_net', 15, 2).defaultTo(0);
    table.decimal('total_employer_cost', 15, 2).defaultTo(0);
    table.integer('employee_count').defaultTo(0);
    table.string('currency', 10).notNullable().defaultTo('SRD');
    table.string('payment_method', 50).nullable(); // 'bank_transfer', 'check', 'cash'
    table.text('notes').nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.boolean('is_locked').notNullable().defaultTo(false);
    table.timestamp('locked_at').nullable();
    table.uuid('locked_by').nullable().references('id').inTable('hris.user_account');
    
    // Audit Columns
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('id').inTable('hris.user_account');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account');
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index(['organization_id', 'deleted_at']);
    table.index(['status', 'organization_id']);
    table.index(['pay_date', 'organization_id']);
    table.unique(['organization_id', 'run_number'], 'unique_run_number_per_org');
    
    // Check constraints
    table.check('pay_period_end >= pay_period_start', [], 'check_pay_period_dates');
    table.check('total_net >= 0', [], 'check_total_net_positive');
  });
  
  // Add table comments
  await knex.raw(`
    COMMENT ON TABLE payroll_runs IS 'Payroll processing runs for organizations';
    COMMENT ON COLUMN payroll_runs.run_number IS 'Unique run identifier within organization';
    COMMENT ON COLUMN payroll_runs.run_type IS 'Type of payroll run (regular, bonus, final, etc.)';
    COMMENT ON COLUMN payroll_runs.is_locked IS 'Prevents modifications after approval';
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('payroll_runs');
}
```

---

## Real Example: Nexus Employee Benefits

```javascript
/**
 * Migration: Create Nexus Employee Benefits Tables
 */

export async function up(knex) {
  // Create benefit_plans table
  await knex.schema.createTable('hris.benefit_plans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    table.string('name', 255).notNullable();
    table.string('type', 100).notNullable(); // 'health', 'dental', 'vision', 'retirement', 'life', 'disability'
    table.text('description').nullable();
    table.string('provider', 255).nullable();
    table.string('policy_number', 100).nullable();
    table.decimal('employee_cost', 10, 2).defaultTo(0);
    table.decimal('employer_cost', 10, 2).defaultTo(0);
    table.string('cost_frequency', 50).notNullable(); // 'monthly', 'biweekly', 'annual'
    table.date('effective_date').notNullable();
    table.date('termination_date').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.jsonb('coverage_details').defaultTo('{}');
    table.jsonb('eligibility_rules').defaultTo('{}');
    
    // Audit columns
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('id').inTable('hris.user_account');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account');
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index(['organization_id', 'deleted_at']);
    table.index(['type', 'is_active', 'organization_id']);
    table.index(['effective_date', 'termination_date']);
  });
  
  // Create employee_benefits table
  await knex.schema.createTable('hris.employee_benefits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('employee_id').notNullable()
      .references('id').inTable('hris.employees').onDelete('CASCADE');
    table.uuid('benefit_plan_id').notNullable()
      .references('id').inTable('hris.benefit_plans').onDelete('RESTRICT');
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    
    table.date('enrollment_date').notNullable();
    table.date('effective_date').notNullable();
    table.date('termination_date').nullable();
    table.string('status', 50).notNullable().defaultTo('active'); // 'pending', 'active', 'terminated'
    table.string('coverage_level', 50).nullable(); // 'employee_only', 'employee_spouse', 'employee_family'
    table.decimal('employee_contribution', 10, 2).defaultTo(0);
    table.decimal('employer_contribution', 10, 2).defaultTo(0);
    table.jsonb('dependents').defaultTo('[]');
    table.text('notes').nullable();
    
    // Audit columns
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.uuid('created_by').notNullable().references('id').inTable('hris.user_account');
    table.uuid('updated_by').nullable().references('id').inTable('hris.user_account');
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index(['employee_id', 'deleted_at']);
    table.index(['benefit_plan_id']);
    table.index(['organization_id', 'deleted_at']);
    table.index(['status', 'effective_date']);
    
    // Unique constraint: one active enrollment per employee per benefit
    table.unique(['employee_id', 'benefit_plan_id', 'deleted_at'], 'unique_employee_benefit');
  });
  
  // Add comments
  await knex.raw(`
    COMMENT ON TABLE hris.benefit_plans IS 'Organization benefit plans available to employees';
    COMMENT ON TABLE hris.employee_benefits IS 'Employee enrollment in benefit plans';
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('hris.employee_benefits');
  await knex.schema.dropTableIfExists('hris.benefit_plans');
}
```

---

## Complex Example: Data Migration with Transaction

```javascript
/**
 * Migration: Migrate Payroll Components to New Structure
 * 
 * @description Splits pay_components table into base and tax-specific tables
 */

export async function up(knex) {
  // Use transaction for data migrations
  await knex.transaction(async (trx) => {
    // 1. Create new table structure
    await trx.schema.createTable('pay_components_base', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('organization_id').notNullable();
      table.string('component_code', 50).notNullable();
      table.string('component_name', 255).notNullable();
      table.string('component_type', 50).notNullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
    
    await trx.schema.createTable('pay_components_tax', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('component_id').notNullable()
        .references('id').inTable('pay_components_base').onDelete('CASCADE');
      table.boolean('is_taxable').notNullable().defaultTo(false);
      table.decimal('tax_rate', 5, 4).nullable();
      table.jsonb('tax_rules').defaultTo('{}');
    });
    
    // 2. Migrate existing data
    const components = await trx('pay_components').select('*');
    
    for (const component of components) {
      // Insert into base table
      const [baseId] = await trx('pay_components_base').insert({
        id: component.id,
        organization_id: component.organization_id,
        component_code: component.component_code,
        component_name: component.component_name,
        component_type: component.component_type,
        is_active: component.is_active,
        created_at: component.created_at
      }).returning('id');
      
      // Insert tax information if applicable
      if (component.is_taxable || component.tax_rate) {
        await trx('pay_components_tax').insert({
          component_id: baseId,
          is_taxable: component.is_taxable || false,
          tax_rate: component.tax_rate,
          tax_rules: component.tax_rules || {}
        });
      }
    }
    
    // 3. Verify migration
    const baseCount = await trx('pay_components_base').count('* as count');
    const originalCount = await trx('pay_components').count('* as count');
    
    if (baseCount[0].count !== originalCount[0].count) {
      throw new Error('Data migration count mismatch!');
    }
    
    // 4. Drop old table (optional - can be done in separate migration)
    // await trx.schema.dropTable('pay_components');
  });
}

export async function down(knex) {
  // Reverse migration
  await knex.transaction(async (trx) => {
    // Restore original structure
    await trx.schema.createTable('pay_components', (table) => {
      table.uuid('id').primary();
      table.uuid('organization_id').notNullable();
      table.string('component_code', 50).notNullable();
      table.string('component_name', 255).notNullable();
      table.string('component_type', 50).notNullable();
      table.boolean('is_taxable').notNullable().defaultTo(false);
      table.decimal('tax_rate', 5, 4).nullable();
      table.jsonb('tax_rules').defaultTo('{}');
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });
    
    // Migrate data back
    const baseComponents = await trx('pay_components_base').select('*');
    const taxInfo = await trx('pay_components_tax').select('*');
    const taxMap = new Map(taxInfo.map(t => [t.component_id, t]));
    
    for (const base of baseComponents) {
      const tax = taxMap.get(base.id) || {};
      
      await trx('pay_components').insert({
        ...base,
        is_taxable: tax.is_taxable || false,
        tax_rate: tax.tax_rate,
        tax_rules: tax.tax_rules || {}
      });
    }
    
    // Drop new tables
    await trx.schema.dropTable('pay_components_tax');
    await trx.schema.dropTable('pay_components_base');
  });
}
```

---

## Migration Best Practices Checklist

When creating migrations, ensure:

- [ ] Migration has descriptive name and date prefix
- [ ] Both `up()` and `down()` functions implemented
- [ ] Transactions used for data migrations
- [ ] Foreign keys defined with proper `onDelete` behavior
- [ ] Indexes created for foreign keys
- [ ] Audit columns included (created_at, updated_at, deleted_at)
- [ ] organization_id included for tenant isolation
- [ ] Table and column comments added
- [ ] Migration tested with `up` and `down`
- [ ] No hardcoded UUIDs (except seed data)

---

## See Also

- [Database Standards](../DATABASE_STANDARDS.md)
- [Phase 2: Migration Conversion](./PHASE2_CONVERSION.md)
- [Knex.js Schema Builder Documentation](https://knexjs.org/guide/schema-builder.html)
