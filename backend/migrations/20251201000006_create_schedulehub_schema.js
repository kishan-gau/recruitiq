/**
 * ScheduleHub Database Schema Migration
 * 
 * Creates the comprehensive workforce scheduling schema - aligned with schedulehub-schema.sql
 * 
 * Schema: scheduling
 * Tables: 17
 * Features: Shift scheduling, station management, role assignments,
 *           availability tracking, shift swapping, time-off requests,
 *           schedule optimization, demand forecasting
 * 
 * Version: 1.0.0
 * Created: December 1, 2025
 * Updated: December 1, 2025 - Aligned with schedulehub-schema.sql
 */

export async function up(knex) {
  // Create scheduling schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS scheduling');
  
  // Enable required extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS btree_gist');
  
  // ================================================================
  // HELPER FUNCTIONS
  // ================================================================
  
  await knex.raw(`
    CREATE OR REPLACE FUNCTION scheduling.get_current_organization_id()
    RETURNS UUID AS $$
    DECLARE
      org_id TEXT;
    BEGIN
      org_id := current_setting('app.current_organization_id', true);
      IF org_id IS NULL OR org_id = '' THEN
        RAISE EXCEPTION 'No organization context set. Authentication required.';
      END IF;
      RETURN org_id::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid organization context: %', SQLERRM;
    END;
    $$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
  `);
  
  await knex.raw(`COMMENT ON FUNCTION scheduling.get_current_organization_id IS 'Returns current organization UUID from session variable set by auth middleware. Throws error if not set.'`);
  
  // ================================================================
  // WORKERS & ROLES
  // ================================================================
  
  // Worker Scheduling Configuration (extends hris.employee with scheduling-specific data)
  await knex.schema.withSchema('scheduling').createTable('worker_scheduling_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    
    // Scheduling configuration
    table.decimal('max_hours_per_week', 5, 2).defaultTo(40.00);
    table.decimal('min_hours_per_week', 5, 2).defaultTo(0.00);
    table.integer('max_consecutive_days').defaultTo(6);
    table.integer('min_rest_hours_between_shifts').defaultTo(11);
    
    // Scheduling preferences (arrays)
    table.specificType('preferred_shift_types', 'VARCHAR(50)[]');
    table.specificType('blocked_days', 'INTEGER[]');
    table.text('scheduling_notes');
    
    // Status
    table.boolean('is_schedulable').defaultTo(true);
    table.string('scheduling_status', 20).defaultTo('active');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('hris.user_account');
    table.foreign('updated_by').references('id').inTable('hris.user_account');
    
    // Unique constraint
    table.unique(['organization_id', 'employee_id']);
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE scheduling.worker_scheduling_config
    ADD CONSTRAINT check_scheduling_status
    CHECK (scheduling_status IN ('active', 'temporary_unavailable', 'restricted'))
  `);
  
  // Roles (job positions/functions)
  await knex.schema.withSchema('scheduling').createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    
    // Role info
    table.string('role_code', 50).notNullable();
    table.string('role_name', 100).notNullable();
    table.text('description');
    table.string('color', 7);
    
    // Requirements
    table.boolean('requires_certification').defaultTo(false);
    table.specificType('certification_types', 'TEXT[]');
    table.string('skill_level', 20);
    
    // Pay rate
    table.decimal('hourly_rate', 10, 2);
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    
    // Unique constraint
    table.unique(['organization_id', 'role_code']);
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE scheduling.roles
    ADD CONSTRAINT check_skill_level
    CHECK (skill_level IN ('entry', 'intermediate', 'advanced', 'expert'))
  `);
  
  // Worker role assignments (many-to-many)
  await knex.schema.withSchema('scheduling').createTable('worker_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    table.uuid('role_id').notNullable();
    
    // Skill level
    table.string('proficiency_level', 20);
    
    // Certifications
    table.jsonb('certifications').defaultTo('[]');
    table.date('certification_expiry');
    
    // Dates
    table.date('assigned_date').defaultTo(knex.fn.now());
    table.date('removed_date');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('scheduling.roles').onDelete('CASCADE');
    
    // Unique constraint
    table.unique(['employee_id', 'role_id', 'removed_date']);
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE scheduling.worker_roles
    ADD CONSTRAINT check_proficiency_level
    CHECK (proficiency_level IN ('trainee', 'competent', 'proficient', 'expert'))
  `);
  
  // ================================================================
  // STATIONS & LOCATIONS
  // ================================================================
  
  // Stations (work locations/areas within a facility)
  await knex.schema.withSchema('scheduling').createTable('stations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    
    // Station info
    table.string('station_code', 50).notNullable();
    table.string('station_name', 100).notNullable();
    table.text('description');
    table.uuid('location_id');
    
    // Physical details
    table.string('floor_level', 20);
    table.string('zone', 50);
    table.integer('capacity');
    
    // Configuration
    table.boolean('is_active').defaultTo(true);
    table.boolean('requires_supervision').defaultTo(false);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('location_id').references('id').inTable('hris.location').onDelete('SET NULL');
    
    // Unique constraint
    table.unique(['organization_id', 'station_code']);
  });
  
  // Station role requirements
  await knex.schema.withSchema('scheduling').createTable('station_role_requirements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('station_id').notNullable();
    table.uuid('role_id').notNullable();
    
    // Requirements
    table.integer('min_workers').defaultTo(1);
    table.integer('max_workers');
    table.string('required_proficiency', 20);
    
    // Priority
    table.integer('priority').defaultTo(50);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('station_id').references('id').inTable('scheduling.stations').onDelete('CASCADE');
    table.foreign('role_id').references('id').inTable('scheduling.roles').onDelete('CASCADE');
    
    // Unique constraint
    table.unique(['station_id', 'role_id']);
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE scheduling.station_role_requirements
    ADD CONSTRAINT check_required_proficiency
    CHECK (required_proficiency IN ('trainee', 'competent', 'proficient', 'expert'))
  `);
  
  // ================================================================
  // SCHEDULES & SHIFTS
  // ================================================================
  
  // Schedules (weekly/period schedules)
  await knex.schema.withSchema('scheduling').createTable('schedules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    
    // Schedule info
    table.string('schedule_name', 100).notNullable();
    table.text('description');
    
    // Time period
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    
    // Status
    table.string('status', 20).defaultTo('draft');
    table.timestamp('published_at', { useTz: true });
    table.uuid('published_by');
    
    // Version control
    table.integer('version').defaultTo(1);
    table.uuid('parent_schedule_id');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('published_by').references('id').inTable('hris.user_account');
    table.foreign('parent_schedule_id').references('id').inTable('scheduling.schedules');
    table.foreign('created_by').references('id').inTable('hris.user_account');
    table.foreign('updated_by').references('id').inTable('hris.user_account');
  });
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE scheduling.schedules
    ADD CONSTRAINT check_schedule_status
    CHECK (status IN ('draft', 'published', 'finalized', 'archived'))
  `);
  
  await knex.raw(`
    ALTER TABLE scheduling.schedules
    ADD CONSTRAINT check_schedule_dates
    CHECK (end_date >= start_date)
  `);
  
  // Shifts (individual work shifts)
  await knex.schema.withSchema('scheduling').createTable('shifts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('schedule_id').notNullable();
    
    // Shift details
    table.date('shift_date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    
    // Worker assignment
    table.uuid('employee_id');
    table.uuid('role_id').notNullable();
    table.uuid('station_id');
    
    // Break time
    table.integer('break_duration_minutes').defaultTo(0);
    table.boolean('break_paid').defaultTo(true);
    
    // Shift type
    table.string('shift_type', 20).defaultTo('regular');
    
    // Status
    table.string('status', 20).defaultTo('scheduled');
    
    // Time tracking
    table.timestamp('actual_clock_in', { useTz: true });
    table.timestamp('actual_clock_out', { useTz: true });
    table.integer('actual_break_minutes');
    
    // Notes
    table.text('notes');
    table.text('cancellation_reason');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.uuid('created_by');
    table.uuid('updated_by');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('schedule_id').references('id').inTable('scheduling.schedules').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('SET NULL');
    table.foreign('role_id').references('id').inTable('scheduling.roles');
    table.foreign('station_id').references('id').inTable('scheduling.stations');
    table.foreign('created_by').references('id').inTable('hris.user_account');
    table.foreign('updated_by').references('id').inTable('hris.user_account');
  });
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE scheduling.shifts
    ADD CONSTRAINT check_shift_type
    CHECK (shift_type IN ('regular', 'overtime', 'on_call', 'training'))
  `);
  
  await knex.raw(`
    ALTER TABLE scheduling.shifts
    ADD CONSTRAINT check_shift_status
    CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'))
  `);
  
  // ================================================================
  // AVAILABILITY & PREFERENCES
  // ================================================================
  
  // Worker availability
  await knex.schema.withSchema('scheduling').createTable('worker_availability', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    
    // Availability type
    table.string('availability_type', 20).notNullable();
    
    // Recurring availability
    table.integer('day_of_week');
    
    // One-time availability
    table.date('specific_date');
    
    // Time range
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    
    // Effective period
    table.date('effective_from').defaultTo(knex.fn.now());
    table.date('effective_to');
    
    // Priority
    table.string('priority', 20).defaultTo('preferred');
    
    // Reason
    table.text('reason');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
  });
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE scheduling.worker_availability
    ADD CONSTRAINT check_availability_type
    CHECK (availability_type IN ('recurring', 'one_time', 'unavailable'))
  `);
  
  await knex.raw(`
    ALTER TABLE scheduling.worker_availability
    ADD CONSTRAINT check_day_of_week
    CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6))
  `);
  
  await knex.raw(`
    ALTER TABLE scheduling.worker_availability
    ADD CONSTRAINT check_priority
    CHECK (priority IN ('required', 'preferred', 'available', 'unavailable'))
  `);
  
  await knex.raw(`
    ALTER TABLE scheduling.worker_availability
    ADD CONSTRAINT check_availability_logic
    CHECK (
      (availability_type = 'recurring' AND day_of_week IS NOT NULL AND specific_date IS NULL) OR
      (availability_type IN ('one_time', 'unavailable') AND specific_date IS NOT NULL AND day_of_week IS NULL)
    )
  `);
  
  // ================================================================
  // TIME OFF REQUESTS
  // ================================================================
  
  // Time off requests (managed in ScheduleHub)
  await knex.schema.withSchema('scheduling').createTable('time_off_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    
    // Request details
    table.string('request_type', 20).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    
    // Time details
    table.boolean('is_full_day').defaultTo(true);
    table.time('start_time');
    table.time('end_time');
    table.decimal('total_days', 5, 2);
    
    // Status
    table.string('status', 20).defaultTo('pending');
    
    // Approval
    table.uuid('reviewed_by');
    table.timestamp('reviewed_at', { useTz: true });
    table.text('denial_reason');
    
    // Notes
    table.text('reason');
    table.text('notes');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('reviewed_by').references('id').inTable('hris.user_account');
  });
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE scheduling.time_off_requests
    ADD CONSTRAINT check_request_type
    CHECK (request_type IN ('vacation', 'sick', 'personal', 'unpaid', 'other'))
  `);
  
  await knex.raw(`
    ALTER TABLE scheduling.time_off_requests
    ADD CONSTRAINT check_time_off_status
    CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'expired'))
  `);
  
  await knex.raw(`
    ALTER TABLE scheduling.time_off_requests
    ADD CONSTRAINT check_time_off_dates
    CHECK (end_date >= start_date)
  `);
  
  // ================================================================
  // SHIFT SWAPPING & MARKETPLACE
  // ================================================================
  
  // Shift swap offers
  await knex.schema.withSchema('scheduling').createTable('shift_swap_offers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    
    // Original shift
    table.uuid('shift_id').notNullable();
    table.uuid('offering_employee_id').notNullable();
    
    // Swap details
    table.string('swap_type', 20).defaultTo('direct');
    table.uuid('target_employee_id');
    
    // Status
    table.string('status', 20).defaultTo('open');
    
    // Approval
    table.boolean('requires_approval').defaultTo(true);
    table.uuid('approved_by');
    table.timestamp('approved_at', { useTz: true });
    table.text('denial_reason');
    
    // Expiry
    table.timestamp('expires_at', { useTz: true });
    
    // Notes
    table.text('reason');
    table.text('notes');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('shift_id').references('id').inTable('scheduling.shifts').onDelete('CASCADE');
    table.foreign('offering_employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('target_employee_id').references('id').inTable('hris.employee');
    table.foreign('approved_by').references('id').inTable('hris.user_account');
  });
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE scheduling.shift_swap_offers
    ADD CONSTRAINT check_swap_type
    CHECK (swap_type IN ('direct', 'open', 'trade'))
  `);
  
  await knex.raw(`
    ALTER TABLE scheduling.shift_swap_offers
    ADD CONSTRAINT check_swap_offer_status
    CHECK (status IN ('open', 'pending_approval', 'approved', 'completed', 'cancelled', 'expired'))
  `);
  
  // Shift swap requests
  await knex.schema.withSchema('scheduling').createTable('shift_swap_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('swap_offer_id').notNullable();
    
    // Requesting worker
    table.uuid('requesting_employee_id').notNullable();
    
    // Status
    table.string('status', 20).defaultTo('pending');
    
    // Response
    table.timestamp('responded_at', { useTz: true });
    table.text('response_notes');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('swap_offer_id').references('id').inTable('scheduling.shift_swap_offers').onDelete('CASCADE');
    table.foreign('requesting_employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE scheduling.shift_swap_requests
    ADD CONSTRAINT check_swap_request_status
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn'))
  `);
  
  // Swap credits (gamification)
  await knex.schema.withSchema('scheduling').createTable('swap_credits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('employee_id').notNullable();
    
    // Credit balance
    table.integer('credits').defaultTo(0);
    
    // Transaction details
    table.string('transaction_type', 20);
    table.integer('amount').notNullable();
    table.integer('balance_after').notNullable();
    
    // Reference
    table.uuid('shift_swap_offer_id');
    table.text('reason');
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('employee_id').references('id').inTable('hris.employee').onDelete('CASCADE');
    table.foreign('shift_swap_offer_id').references('id').inTable('scheduling.shift_swap_offers');
    table.foreign('created_by').references('id').inTable('hris.user_account');
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE scheduling.swap_credits
    ADD CONSTRAINT check_transaction_type
    CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'penalty', 'adjustment'))
  `);
  
  // ================================================================
  // SCHEDULE OPTIMIZATION & ANALYTICS
  // ================================================================
  
  // Coverage requirements
  await knex.schema.withSchema('scheduling').createTable('coverage_requirements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    
    // Location
    table.uuid('location_id');
    table.uuid('station_id');
    
    // Time period
    table.integer('day_of_week');
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    
    // Requirements
    table.uuid('role_id');
    table.integer('min_workers').notNullable().defaultTo(1);
    table.integer('optimal_workers');
    table.integer('max_workers');
    
    // Effective period
    table.date('effective_from').defaultTo(knex.fn.now());
    table.date('effective_to');
    
    // Priority
    table.integer('priority').defaultTo(50);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('station_id').references('id').inTable('scheduling.stations');
    table.foreign('role_id').references('id').inTable('scheduling.roles');
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE scheduling.coverage_requirements
    ADD CONSTRAINT check_coverage_day_of_week
    CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6))
  `);
  
  // Demand history
  await knex.schema.withSchema('scheduling').createTable('demand_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    
    // Period
    table.date('date').notNullable();
    table.integer('hour');
    table.integer('day_of_week');
    
    // Location
    table.uuid('location_id');
    table.uuid('department_id');
    
    // Metrics
    table.integer('customer_count');
    table.integer('transaction_count');
    table.decimal('revenue', 12, 2);
    table.decimal('labor_hours', 8, 2);
    table.integer('workers_scheduled');
    table.integer('workers_present');
    
    // Calculated metrics
    table.decimal('labor_cost', 12, 2);
    table.decimal('revenue_per_labor_hour', 10, 2);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
  });
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE scheduling.demand_history
    ADD CONSTRAINT check_demand_hour
    CHECK (hour IS NULL OR (hour BETWEEN 0 AND 23))
  `);
  
  await knex.raw(`
    ALTER TABLE scheduling.demand_history
    ADD CONSTRAINT check_demand_day_of_week
    CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6))
  `);
  
  // Demand forecasts
  await knex.schema.withSchema('scheduling').createTable('demand_forecasts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    
    // Forecast period
    table.date('forecast_date').notNullable();
    table.integer('hour');
    
    // Location
    table.uuid('location_id');
    table.uuid('department_id');
    
    // Predictions
    table.integer('predicted_customer_count');
    table.integer('predicted_transaction_count');
    table.decimal('predicted_revenue', 12, 2);
    table.integer('recommended_workers');
    table.decimal('confidence_level', 5, 4);
    
    // Model info
    table.string('model_version', 50);
    table.string('algorithm', 50);
    
    // Metadata
    table.timestamp('generated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('generated_by');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('generated_by').references('id').inTable('hris.user_account');
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE scheduling.demand_forecasts
    ADD CONSTRAINT check_forecast_hour
    CHECK (hour IS NULL OR (hour BETWEEN 0 AND 23))
  `);
  
  // Optimization history
  await knex.schema.withSchema('scheduling').createTable('optimization_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    table.uuid('schedule_id').notNullable();
    
    // Optimization details
    table.string('algorithm', 50).notNullable();
    table.string('objective', 50).notNullable();
    
    // Results
    table.string('status', 20).notNullable();
    table.boolean('success');
    table.integer('execution_time_ms');
    
    // Metrics
    table.decimal('initial_cost', 12, 2);
    table.decimal('optimized_cost', 12, 2);
    table.decimal('cost_savings', 12, 2);
    table.decimal('coverage_score', 5, 2);
    table.decimal('fairness_score', 5, 2);
    
    // Parameters
    table.jsonb('parameters');
    table.jsonb('constraints');
    
    // Error info
    table.text('error_message');
    
    // Metadata
    table.timestamp('started_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('completed_at', { useTz: true });
    table.uuid('triggered_by');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('schedule_id').references('id').inTable('scheduling.schedules').onDelete('CASCADE');
    table.foreign('triggered_by').references('id').inTable('hris.user_account');
  });
  
  // Add check constraints
  await knex.raw(`
    ALTER TABLE scheduling.optimization_history
    ADD CONSTRAINT check_optimization_objective
    CHECK (objective IN ('minimize_cost', 'maximize_coverage', 'balance_workload', 'fairness'))
  `);
  
  await knex.raw(`
    ALTER TABLE scheduling.optimization_history
    ADD CONSTRAINT check_optimization_status
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled'))
  `);
  
  // ================================================================
  // SERVICE LEVEL TARGETS
  // ================================================================
  
  // Service level targets
  await knex.schema.withSchema('scheduling').createTable('service_level_targets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable();
    
    // Target details
    table.string('target_name', 100).notNullable();
    table.text('description');
    
    // Scope
    table.uuid('location_id');
    table.uuid('department_id');
    
    // Metrics
    table.string('metric_type', 50).notNullable();
    table.decimal('target_value', 10, 2).notNullable();
    table.decimal('min_acceptable_value', 10, 2);
    
    // Time period (arrays)
    table.specificType('applies_to_day_of_week', 'INTEGER[]');
    table.specificType('applies_to_time_range', 'TSRANGE');
    
    // Status
    table.boolean('is_active').defaultTo(true);
    
    // Metadata
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    table.uuid('created_by');
    
    // Foreign keys
    table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');
    table.foreign('created_by').references('id').inTable('hris.user_account');
  });
  
  // Add check constraint
  await knex.raw(`
    ALTER TABLE scheduling.service_level_targets
    ADD CONSTRAINT check_metric_type
    CHECK (metric_type IN ('coverage_percentage', 'response_time', 'wait_time', 'customer_satisfaction'))
  `);
  
  // ================================================================
  // TRIGGERS FOR UPDATED_AT
  // ================================================================
  
  await knex.raw(`
    CREATE OR REPLACE FUNCTION scheduling.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  
  // Apply triggers to all relevant tables with updated_at column
  const tablesWithUpdatedAt = [
    'worker_scheduling_config', 'roles', 'worker_roles', 'stations', 'schedules', 
    'shifts', 'worker_availability', 'time_off_requests', 'shift_swap_offers',
    'shift_swap_requests', 'coverage_requirements', 'service_level_targets'
  ];
  
  for (const tableName of tablesWithUpdatedAt) {
    await knex.raw(`
      CREATE TRIGGER update_${tableName}_updated_at 
      BEFORE UPDATE ON scheduling.${tableName}
      FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column()
    `);
  }
  
  // ================================================================
  // INDEXES
  // ================================================================
  
  // Worker scheduling config indexes
  await knex.raw('CREATE INDEX idx_worker_config_organization ON scheduling.worker_scheduling_config(organization_id)');
  await knex.raw('CREATE INDEX idx_worker_config_employee ON scheduling.worker_scheduling_config(employee_id)');
  await knex.raw('CREATE INDEX idx_worker_config_schedulable ON scheduling.worker_scheduling_config(is_schedulable)');
  
  // Roles indexes
  await knex.raw('CREATE INDEX idx_roles_organization ON scheduling.roles(organization_id)');
  await knex.raw('CREATE INDEX idx_roles_active ON scheduling.roles(is_active)');
  
  // Worker roles indexes
  await knex.raw('CREATE INDEX idx_worker_roles_employee ON scheduling.worker_roles(employee_id)');
  await knex.raw('CREATE INDEX idx_worker_roles_role ON scheduling.worker_roles(role_id)');
  await knex.raw('CREATE INDEX idx_worker_roles_organization ON scheduling.worker_roles(organization_id)');
  
  // Stations indexes
  await knex.raw('CREATE INDEX idx_stations_organization ON scheduling.stations(organization_id)');
  await knex.raw('CREATE INDEX idx_stations_location ON scheduling.stations(location_id)');
  await knex.raw('CREATE INDEX idx_stations_active ON scheduling.stations(is_active)');
  
  // Station role requirements indexes
  await knex.raw('CREATE INDEX idx_station_requirements_station ON scheduling.station_role_requirements(station_id)');
  await knex.raw('CREATE INDEX idx_station_requirements_role ON scheduling.station_role_requirements(role_id)');
  
  // Schedules indexes
  await knex.raw('CREATE INDEX idx_schedules_organization ON scheduling.schedules(organization_id)');
  await knex.raw('CREATE INDEX idx_schedules_dates ON scheduling.schedules(start_date, end_date)');
  await knex.raw('CREATE INDEX idx_schedules_status ON scheduling.schedules(status)');
  
  // Shifts indexes
  await knex.raw('CREATE INDEX idx_shifts_organization ON scheduling.shifts(organization_id)');
  await knex.raw('CREATE INDEX idx_shifts_schedule ON scheduling.shifts(schedule_id)');
  await knex.raw('CREATE INDEX idx_shifts_employee ON scheduling.shifts(employee_id)');
  await knex.raw('CREATE INDEX idx_shifts_date ON scheduling.shifts(shift_date)');
  await knex.raw('CREATE INDEX idx_shifts_status ON scheduling.shifts(status)');
  await knex.raw('CREATE INDEX idx_shifts_station ON scheduling.shifts(station_id)');
  await knex.raw('CREATE INDEX idx_shifts_role ON scheduling.shifts(role_id)');
  
  // Worker availability indexes
  await knex.raw('CREATE INDEX idx_availability_employee ON scheduling.worker_availability(employee_id)');
  await knex.raw('CREATE INDEX idx_availability_organization ON scheduling.worker_availability(organization_id)');
  await knex.raw('CREATE INDEX idx_availability_date ON scheduling.worker_availability(specific_date)');
  await knex.raw('CREATE INDEX idx_availability_day ON scheduling.worker_availability(day_of_week)');
  await knex.raw('CREATE INDEX idx_availability_type ON scheduling.worker_availability(availability_type)');
  
  // Time off requests indexes
  await knex.raw('CREATE INDEX idx_time_off_employee ON scheduling.time_off_requests(employee_id)');
  await knex.raw('CREATE INDEX idx_time_off_organization ON scheduling.time_off_requests(organization_id)');
  await knex.raw('CREATE INDEX idx_time_off_dates ON scheduling.time_off_requests(start_date, end_date)');
  await knex.raw('CREATE INDEX idx_time_off_status ON scheduling.time_off_requests(status)');
  
  // Shift swap offers indexes
  await knex.raw('CREATE INDEX idx_swap_offers_shift ON scheduling.shift_swap_offers(shift_id)');
  await knex.raw('CREATE INDEX idx_swap_offers_offering_employee ON scheduling.shift_swap_offers(offering_employee_id)');
  await knex.raw('CREATE INDEX idx_swap_offers_target_employee ON scheduling.shift_swap_offers(target_employee_id)');
  await knex.raw('CREATE INDEX idx_swap_offers_status ON scheduling.shift_swap_offers(status)');
  await knex.raw('CREATE INDEX idx_swap_offers_organization ON scheduling.shift_swap_offers(organization_id)');
  
  // Shift swap requests indexes
  await knex.raw('CREATE INDEX idx_swap_requests_offer ON scheduling.shift_swap_requests(swap_offer_id)');
  await knex.raw('CREATE INDEX idx_swap_requests_employee ON scheduling.shift_swap_requests(requesting_employee_id)');
  await knex.raw('CREATE INDEX idx_swap_requests_status ON scheduling.shift_swap_requests(status)');
  
  // Swap credits indexes
  await knex.raw('CREATE INDEX idx_swap_credits_employee ON scheduling.swap_credits(employee_id)');
  await knex.raw('CREATE INDEX idx_swap_credits_organization ON scheduling.swap_credits(organization_id)');
  await knex.raw('CREATE INDEX idx_swap_credits_created ON scheduling.swap_credits(created_at)');
  
  // Coverage requirements indexes
  await knex.raw('CREATE INDEX idx_coverage_organization ON scheduling.coverage_requirements(organization_id)');
  await knex.raw('CREATE INDEX idx_coverage_location ON scheduling.coverage_requirements(location_id)');
  await knex.raw('CREATE INDEX idx_coverage_station ON scheduling.coverage_requirements(station_id)');
  await knex.raw('CREATE INDEX idx_coverage_role ON scheduling.coverage_requirements(role_id)');
  await knex.raw('CREATE INDEX idx_coverage_day ON scheduling.coverage_requirements(day_of_week)');
  
  // Demand history indexes
  await knex.raw('CREATE INDEX idx_demand_history_organization ON scheduling.demand_history(organization_id)');
  await knex.raw('CREATE INDEX idx_demand_history_date ON scheduling.demand_history(date)');
  await knex.raw('CREATE INDEX idx_demand_history_location ON scheduling.demand_history(location_id)');
  await knex.raw('CREATE INDEX idx_demand_history_department ON scheduling.demand_history(department_id)');
  
  // Demand forecasts indexes
  await knex.raw('CREATE INDEX idx_forecasts_organization ON scheduling.demand_forecasts(organization_id)');
  await knex.raw('CREATE INDEX idx_forecasts_date ON scheduling.demand_forecasts(forecast_date)');
  await knex.raw('CREATE INDEX idx_forecasts_location ON scheduling.demand_forecasts(location_id)');
  
  // Optimization history indexes
  await knex.raw('CREATE INDEX idx_optimization_organization ON scheduling.optimization_history(organization_id)');
  await knex.raw('CREATE INDEX idx_optimization_schedule ON scheduling.optimization_history(schedule_id)');
  await knex.raw('CREATE INDEX idx_optimization_status ON scheduling.optimization_history(status)');
  await knex.raw('CREATE INDEX idx_optimization_started ON scheduling.optimization_history(started_at)');
  
  // Service level targets indexes
  await knex.raw('CREATE INDEX idx_sla_targets_organization ON scheduling.service_level_targets(organization_id)');
  await knex.raw('CREATE INDEX idx_sla_targets_location ON scheduling.service_level_targets(location_id)');
  await knex.raw('CREATE INDEX idx_sla_targets_department ON scheduling.service_level_targets(department_id)');
  await knex.raw('CREATE INDEX idx_sla_targets_active ON scheduling.service_level_targets(is_active)');
  
  // ================================================================
  // ROW LEVEL SECURITY POLICIES
  // ================================================================
  
  const tablesWithRLS = [
    'worker_scheduling_config', 'roles', 'worker_roles', 'stations', 
    'station_role_requirements', 'schedules', 'shifts', 'worker_availability',
    'time_off_requests', 'shift_swap_offers', 'shift_swap_requests', 'swap_credits',
    'coverage_requirements', 'demand_history', 'demand_forecasts', 
    'optimization_history', 'service_level_targets'
  ];
  
  for (const tableName of tablesWithRLS) {
    await knex.raw(`ALTER TABLE scheduling.${tableName} ENABLE ROW LEVEL SECURITY`);
    
    await knex.raw(`
      CREATE POLICY ${tableName}_tenant_isolation ON scheduling.${tableName}
        USING (organization_id = scheduling.get_current_organization_id())
    `);
    
    await knex.raw(`
      CREATE POLICY ${tableName}_tenant_isolation_insert ON scheduling.${tableName}
        FOR INSERT
        WITH CHECK (organization_id = scheduling.get_current_organization_id())
    `);
  }
  
  // ================================================================
  // COMMENTS
  // ================================================================
  
  await knex.raw(`COMMENT ON SCHEMA scheduling IS 'ScheduleHub workforce scheduling and optimization - References hris.employee as single source of truth'`);
  await knex.raw(`COMMENT ON TABLE scheduling.worker_scheduling_config IS 'Scheduling-specific configuration for employees - Core employee data in hris.employee'`);
  await knex.raw(`COMMENT ON COLUMN scheduling.worker_scheduling_config.employee_id IS 'References hris.employee(id) - the single source of truth for employee data'`);
  await knex.raw(`COMMENT ON TABLE scheduling.roles IS 'Job roles/positions for shift assignments'`);
  await knex.raw(`COMMENT ON TABLE scheduling.worker_roles IS 'Many-to-many relationship between employees and scheduling roles'`);
  await knex.raw(`COMMENT ON COLUMN scheduling.worker_roles.employee_id IS 'References hris.employee(id) - the single source of truth'`);
  await knex.raw(`COMMENT ON TABLE scheduling.stations IS 'Physical work locations/areas within facilities'`);
  await knex.raw(`COMMENT ON TABLE scheduling.station_role_requirements IS 'Required roles and headcount per station'`);
  await knex.raw(`COMMENT ON TABLE scheduling.schedules IS 'Weekly or period-based work schedules'`);
  await knex.raw(`COMMENT ON TABLE scheduling.shifts IS 'Individual work shifts with employee assignments'`);
  await knex.raw(`COMMENT ON COLUMN scheduling.shifts.employee_id IS 'References hris.employee(id) - the single source of truth'`);
  await knex.raw(`COMMENT ON TABLE scheduling.worker_availability IS 'Employee availability for scheduling'`);
  await knex.raw(`COMMENT ON COLUMN scheduling.worker_availability.employee_id IS 'References hris.employee(id) - the single source of truth'`);
  await knex.raw(`COMMENT ON TABLE scheduling.time_off_requests IS 'Time off requests specific to scheduling (separate from Nexus HRIS time-off)'`);
  await knex.raw(`COMMENT ON COLUMN scheduling.time_off_requests.employee_id IS 'References hris.employee(id) - the single source of truth'`);
  await knex.raw(`COMMENT ON TABLE scheduling.shift_swap_offers IS 'Employees offering their shifts for swap'`);
  await knex.raw(`COMMENT ON COLUMN scheduling.shift_swap_offers.offering_employee_id IS 'References hris.employee(id) - the single source of truth'`);
  await knex.raw(`COMMENT ON COLUMN scheduling.shift_swap_offers.target_employee_id IS 'References hris.employee(id) - the single source of truth'`);
  await knex.raw(`COMMENT ON TABLE scheduling.shift_swap_requests IS 'Requests to take offered shifts'`);
  await knex.raw(`COMMENT ON COLUMN scheduling.shift_swap_requests.requesting_employee_id IS 'References hris.employee(id) - the single source of truth'`);
  await knex.raw(`COMMENT ON TABLE scheduling.swap_credits IS 'Gamification credits for shift swapping'`);
  await knex.raw(`COMMENT ON COLUMN scheduling.swap_credits.employee_id IS 'References hris.employee(id) - the single source of truth'`);
  await knex.raw(`COMMENT ON TABLE scheduling.coverage_requirements IS 'Staffing requirements per time slot'`);
  await knex.raw(`COMMENT ON TABLE scheduling.demand_history IS 'Historical demand data for forecasting'`);
  await knex.raw(`COMMENT ON TABLE scheduling.demand_forecasts IS 'AI-generated demand predictions'`);
  await knex.raw(`COMMENT ON TABLE scheduling.optimization_history IS 'Track schedule optimization runs'`);
  await knex.raw(`COMMENT ON TABLE scheduling.service_level_targets IS 'SLA targets for staffing levels'`);
  
  // ================================================================
  // GRANT PERMISSIONS
  // ================================================================
  
  await knex.raw('GRANT USAGE ON SCHEMA scheduling TO PUBLIC');
  await knex.raw('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA scheduling TO PUBLIC');
  await knex.raw('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA scheduling TO PUBLIC');
  
  console.log('✅ ScheduleHub schema created successfully with 17 tables');
};

export async function down(knex) {
  console.log('Dropping ScheduleHub schema...');
  
  // Drop all tables in reverse dependency order
  const tables = [
    'service_level_targets', 'optimization_history', 'demand_forecasts', 
    'demand_history', 'coverage_requirements', 'swap_credits', 
    'shift_swap_requests', 'shift_swap_offers', 'time_off_requests',
    'worker_availability', 'shifts', 'schedules', 'station_role_requirements',
    'stations', 'worker_roles', 'roles', 'worker_scheduling_config'
  ];
  
  for (const table of tables) {
    try {
      await knex.schema.withSchema('scheduling').dropTableIfExists(table);
    } catch (error) {
      console.log(`Warning: Could not drop ${table}: ${error.message}`);
    }
  }
  
  // Drop helper functions
  await knex.raw('DROP FUNCTION IF EXISTS scheduling.update_updated_at_column() CASCADE');
  await knex.raw('DROP FUNCTION IF EXISTS scheduling.get_current_organization_id() CASCADE');
  
  // Drop schema (CASCADE will catch any remaining objects)
  await knex.raw('DROP SCHEMA IF EXISTS scheduling CASCADE');
  
  console.log('✅ ScheduleHub schema dropped successfully');
};
