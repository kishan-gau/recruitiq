/**
 * ScheduleHub Schema Migration
 * 
 * Creates the ScheduleHub (Workforce Scheduling) schema
 * for comprehensive workforce scheduling including shift management,
 * availability tracking, time-off requests, shift swapping,
 * and demand forecasting.
 * 
 * Schema: scheduling
 * Dependencies: organizations, hris.employee, hris.user_account, hris.location
 */

/**
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
  // ============================================================================
  // CREATE SCHEDULING SCHEMA
  // ============================================================================
  await knex.raw('CREATE SCHEMA IF NOT EXISTS scheduling');
  await knex.raw('SET search_path TO scheduling, public');

  // ============================================================================
  // WORKER SCHEDULING CONFIG - Extends hris.employee with scheduling data
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('worker_scheduling_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.decimal('max_hours_per_week', 5, 2).defaultTo(40.00);
    table.decimal('min_hours_per_week', 5, 2).defaultTo(0.00);
    table.integer('max_consecutive_days').defaultTo(6);
    table.integer('min_rest_hours_between_shifts').defaultTo(11);
    table.specificType('preferred_shift_types', 'VARCHAR(50)[]');
    table.specificType('blocked_days', 'INTEGER[]');
    table.text('scheduling_notes');
    table.boolean('is_schedulable').defaultTo(true);
    table.string('scheduling_status', 20).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
    table.unique(['organization_id', 'employee_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_worker_config_organization ON scheduling.worker_scheduling_config(organization_id);
    CREATE INDEX idx_worker_config_employee ON scheduling.worker_scheduling_config(employee_id);
    CREATE INDEX idx_worker_config_schedulable ON scheduling.worker_scheduling_config(is_schedulable);
    
    COMMENT ON TABLE scheduling.worker_scheduling_config IS 'Scheduling-specific configuration for employees. Core employee data is in hris.employee (single source of truth)';
    COMMENT ON COLUMN scheduling.worker_scheduling_config.employee_id IS 'References hris.employee(id) - the single source of truth for employee data';
    COMMENT ON COLUMN scheduling.worker_scheduling_config.scheduling_status IS 'Status: active, temporary_unavailable, restricted';
  `);

  // ============================================================================
  // ROLES - Job positions/functions for scheduling
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('role_code', 50).notNullable();
    table.string('role_name', 100).notNullable();
    table.text('description');
    table.string('color', 7);
    table.boolean('requires_certification').defaultTo(false);
    table.specificType('certification_types', 'TEXT[]');
    table.string('skill_level', 20);
    table.decimal('hourly_rate', 10, 2);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['organization_id', 'role_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_roles_organization ON scheduling.roles(organization_id);
    CREATE INDEX idx_roles_active ON scheduling.roles(is_active);
    
    COMMENT ON TABLE scheduling.roles IS 'Job roles/positions for shift assignments';
    COMMENT ON COLUMN scheduling.roles.skill_level IS 'Levels: entry, intermediate, advanced, expert';
  `);

  // ============================================================================
  // WORKER ROLES - Many-to-many relationship
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('worker_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.uuid('role_id').notNullable().references('id').inTable('scheduling.roles').onDelete('CASCADE');
    table.string('proficiency_level', 20);
    table.jsonb('certifications').defaultTo('[]');
    table.date('certification_expiry');
    table.date('assigned_date').defaultTo(knex.raw('CURRENT_DATE'));
    table.date('removed_date');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['employee_id', 'role_id', 'removed_date']);
  });

  await knex.raw(`
    CREATE INDEX idx_worker_roles_employee ON scheduling.worker_roles(employee_id);
    CREATE INDEX idx_worker_roles_role ON scheduling.worker_roles(role_id);
    CREATE INDEX idx_worker_roles_organization ON scheduling.worker_roles(organization_id);
    
    COMMENT ON TABLE scheduling.worker_roles IS 'Many-to-many relationship between employees and scheduling roles';
    COMMENT ON COLUMN scheduling.worker_roles.employee_id IS 'References hris.employee(id) - the single source of truth';
    COMMENT ON COLUMN scheduling.worker_roles.proficiency_level IS 'Levels: trainee, competent, proficient, expert';
  `);

  // ============================================================================
  // STATIONS - Work locations/areas within a facility
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('stations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('station_code', 50).notNullable();
    table.string('station_name', 100).notNullable();
    table.text('description');
    table.uuid('location_id').references('id').inTable('hris.location').onDelete('SET NULL');
    table.string('floor_level', 20);
    table.string('zone', 50);
    table.integer('capacity');
    table.boolean('is_active').defaultTo(true);
    table.boolean('requires_supervision').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['organization_id', 'station_code']);
  });

  await knex.raw(`
    CREATE INDEX idx_stations_organization ON scheduling.stations(organization_id);
    CREATE INDEX idx_stations_location ON scheduling.stations(location_id);
    CREATE INDEX idx_stations_active ON scheduling.stations(is_active);
    
    COMMENT ON TABLE scheduling.stations IS 'Physical work locations/areas within facilities';
  `);

  // ============================================================================
  // STATION ROLE REQUIREMENTS
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('station_role_requirements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('station_id').notNullable().references('id').inTable('scheduling.stations').onDelete('CASCADE');
    table.uuid('role_id').notNullable().references('id').inTable('scheduling.roles').onDelete('CASCADE');
    table.integer('min_workers').defaultTo(1);
    table.integer('max_workers');
    table.string('required_proficiency', 20);
    table.integer('priority').defaultTo(50);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['station_id', 'role_id']);
  });

  await knex.raw(`
    CREATE INDEX idx_station_requirements_station ON scheduling.station_role_requirements(station_id);
    CREATE INDEX idx_station_requirements_role ON scheduling.station_role_requirements(role_id);
    
    COMMENT ON TABLE scheduling.station_role_requirements IS 'Required roles and headcount per station';
    COMMENT ON COLUMN scheduling.station_role_requirements.required_proficiency IS 'Levels: trainee, competent, proficient, expert';
  `);

  // ============================================================================
  // SCHEDULES - Weekly/period schedules
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('schedules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('schedule_name', 100).notNullable();
    table.text('description');
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.string('status', 20).defaultTo('draft');
    table.timestamp('published_at');
    table.uuid('published_by').references('id').inTable('hris.user_account');
    table.integer('version').defaultTo(1);
    table.uuid('parent_schedule_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
  });

  // Add self-referential FK after table creation
  await knex.raw(`
    ALTER TABLE scheduling.schedules 
    ADD CONSTRAINT fk_schedule_parent 
    FOREIGN KEY (parent_schedule_id) REFERENCES scheduling.schedules(id);
  `);

  await knex.raw(`
    CREATE INDEX idx_schedules_organization ON scheduling.schedules(organization_id);
    CREATE INDEX idx_schedules_dates ON scheduling.schedules(start_date, end_date);
    CREATE INDEX idx_schedules_status ON scheduling.schedules(status);
    
    COMMENT ON TABLE scheduling.schedules IS 'Weekly or period-based work schedules';
    COMMENT ON COLUMN scheduling.schedules.status IS 'Status: draft, published, finalized, archived';
  `);

  // ============================================================================
  // SHIFTS - Individual work shifts
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('shifts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('schedule_id').notNullable().references('id').inTable('scheduling.schedules').onDelete('CASCADE');
    table.date('shift_date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.uuid('employee_id').references('id').inTable('hris.employee').onDelete('SET NULL');
    table.uuid('role_id').notNullable().references('id').inTable('scheduling.roles');
    table.uuid('station_id').references('id').inTable('scheduling.stations');
    table.integer('break_duration_minutes').defaultTo(0);
    table.boolean('break_paid').defaultTo(true);
    table.string('shift_type', 20).defaultTo('regular');
    table.string('status', 20).defaultTo('scheduled');
    table.timestamp('actual_clock_in');
    table.timestamp('actual_clock_out');
    table.integer('actual_break_minutes');
    table.text('notes');
    table.text('cancellation_reason');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
    table.uuid('updated_by').references('id').inTable('hris.user_account');
  });

  await knex.raw(`
    CREATE INDEX idx_shifts_organization ON scheduling.shifts(organization_id);
    CREATE INDEX idx_shifts_schedule ON scheduling.shifts(schedule_id);
    CREATE INDEX idx_shifts_employee ON scheduling.shifts(employee_id);
    CREATE INDEX idx_shifts_date ON scheduling.shifts(shift_date);
    CREATE INDEX idx_shifts_status ON scheduling.shifts(status);
    CREATE INDEX idx_shifts_station ON scheduling.shifts(station_id);
    CREATE INDEX idx_shifts_role ON scheduling.shifts(role_id);
    
    COMMENT ON TABLE scheduling.shifts IS 'Individual work shifts with employee assignments';
    COMMENT ON COLUMN scheduling.shifts.employee_id IS 'References hris.employee(id) - the single source of truth';
    COMMENT ON COLUMN scheduling.shifts.shift_type IS 'Types: regular, overtime, on_call, training';
    COMMENT ON COLUMN scheduling.shifts.status IS 'Status: scheduled, confirmed, in_progress, completed, cancelled, no_show';
  `);

  // ============================================================================
  // WORKER AVAILABILITY
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('worker_availability', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.string('availability_type', 20).notNullable();
    table.integer('day_of_week');
    table.date('specific_date');
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.date('effective_from').defaultTo(knex.raw('CURRENT_DATE'));
    table.date('effective_to');
    table.string('priority', 20).defaultTo('preferred');
    table.text('reason');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_availability_employee ON scheduling.worker_availability(employee_id);
    CREATE INDEX idx_availability_organization ON scheduling.worker_availability(organization_id);
    CREATE INDEX idx_availability_date ON scheduling.worker_availability(specific_date);
    CREATE INDEX idx_availability_day ON scheduling.worker_availability(day_of_week);
    CREATE INDEX idx_availability_type ON scheduling.worker_availability(availability_type);
    
    COMMENT ON TABLE scheduling.worker_availability IS 'Employee availability for scheduling';
    COMMENT ON COLUMN scheduling.worker_availability.employee_id IS 'References hris.employee(id) - the single source of truth';
    COMMENT ON COLUMN scheduling.worker_availability.availability_type IS 'Types: recurring, one_time, unavailable';
    COMMENT ON COLUMN scheduling.worker_availability.priority IS 'Priority: required, preferred, available, unavailable';
    COMMENT ON COLUMN scheduling.worker_availability.day_of_week IS '0=Sunday, 6=Saturday';
  `);

  // ============================================================================
  // TIME OFF REQUESTS
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('time_off_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.string('request_type', 20).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.boolean('is_full_day').defaultTo(true);
    table.time('start_time');
    table.time('end_time');
    table.decimal('total_days', 5, 2);
    table.string('status', 20).defaultTo('pending');
    table.uuid('reviewed_by').references('id').inTable('hris.user_account');
    table.timestamp('reviewed_at');
    table.text('denial_reason');
    table.text('reason');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_time_off_employee ON scheduling.time_off_requests(employee_id);
    CREATE INDEX idx_time_off_organization ON scheduling.time_off_requests(organization_id);
    CREATE INDEX idx_time_off_dates ON scheduling.time_off_requests(start_date, end_date);
    CREATE INDEX idx_time_off_status ON scheduling.time_off_requests(status);
    
    COMMENT ON TABLE scheduling.time_off_requests IS 'Time off requests specific to scheduling';
    COMMENT ON COLUMN scheduling.time_off_requests.employee_id IS 'References hris.employee(id) - the single source of truth';
    COMMENT ON COLUMN scheduling.time_off_requests.request_type IS 'Types: vacation, sick, personal, unpaid, other';
    COMMENT ON COLUMN scheduling.time_off_requests.status IS 'Status: pending, approved, denied, cancelled, expired';
  `);

  // ============================================================================
  // SHIFT SWAP OFFERS
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('shift_swap_offers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('shift_id').notNullable().references('id').inTable('scheduling.shifts').onDelete('CASCADE');
    table.uuid('offering_employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.string('swap_type', 20).defaultTo('direct');
    table.uuid('target_employee_id').references('id').inTable('hris.employee');
    table.string('status', 20).defaultTo('open');
    table.boolean('requires_approval').defaultTo(true);
    table.uuid('approved_by').references('id').inTable('hris.user_account');
    table.timestamp('approved_at');
    table.text('denial_reason');
    table.timestamp('expires_at');
    table.text('reason');
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_swap_offers_shift ON scheduling.shift_swap_offers(shift_id);
    CREATE INDEX idx_swap_offers_offering_employee ON scheduling.shift_swap_offers(offering_employee_id);
    CREATE INDEX idx_swap_offers_target_employee ON scheduling.shift_swap_offers(target_employee_id);
    CREATE INDEX idx_swap_offers_status ON scheduling.shift_swap_offers(status);
    CREATE INDEX idx_swap_offers_organization ON scheduling.shift_swap_offers(organization_id);
    
    COMMENT ON TABLE scheduling.shift_swap_offers IS 'Employees offering their shifts for swap';
    COMMENT ON COLUMN scheduling.shift_swap_offers.offering_employee_id IS 'References hris.employee(id) - the single source of truth';
    COMMENT ON COLUMN scheduling.shift_swap_offers.target_employee_id IS 'References hris.employee(id) - the single source of truth';
    COMMENT ON COLUMN scheduling.shift_swap_offers.swap_type IS 'Types: direct, open, trade';
    COMMENT ON COLUMN scheduling.shift_swap_offers.status IS 'Status: open, pending_approval, approved, completed, cancelled, expired';
  `);

  // ============================================================================
  // SHIFT SWAP REQUESTS
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('shift_swap_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('swap_offer_id').notNullable().references('id').inTable('scheduling.shift_swap_offers').onDelete('CASCADE');
    table.uuid('requesting_employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.string('status', 20).defaultTo('pending');
    table.timestamp('responded_at');
    table.text('response_notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_swap_requests_offer ON scheduling.shift_swap_requests(swap_offer_id);
    CREATE INDEX idx_swap_requests_employee ON scheduling.shift_swap_requests(requesting_employee_id);
    CREATE INDEX idx_swap_requests_status ON scheduling.shift_swap_requests(status);
    
    COMMENT ON TABLE scheduling.shift_swap_requests IS 'Requests to take offered shifts';
    COMMENT ON COLUMN scheduling.shift_swap_requests.requesting_employee_id IS 'References hris.employee(id) - the single source of truth';
    COMMENT ON COLUMN scheduling.shift_swap_requests.status IS 'Status: pending, accepted, rejected, withdrawn';
  `);

  // ============================================================================
  // SWAP CREDITS - Gamification for shift swapping
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('swap_credits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    table.integer('credits').defaultTo(0);
    table.string('transaction_type', 20);
    table.integer('amount').notNullable();
    table.integer('balance_after').notNullable();
    table.uuid('shift_swap_offer_id').references('id').inTable('scheduling.shift_swap_offers');
    table.text('reason');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
  });

  await knex.raw(`
    CREATE INDEX idx_swap_credits_employee ON scheduling.swap_credits(employee_id);
    CREATE INDEX idx_swap_credits_organization ON scheduling.swap_credits(organization_id);
    CREATE INDEX idx_swap_credits_created ON scheduling.swap_credits(created_at);
    
    COMMENT ON TABLE scheduling.swap_credits IS 'Gamification credits for shift swapping';
    COMMENT ON COLUMN scheduling.swap_credits.employee_id IS 'References hris.employee(id) - the single source of truth';
    COMMENT ON COLUMN scheduling.swap_credits.transaction_type IS 'Types: earned, spent, bonus, penalty, adjustment';
  `);

  // ============================================================================
  // COVERAGE REQUIREMENTS
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('coverage_requirements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('location_id').references('id').inTable('hris.location').onDelete('SET NULL');
    table.uuid('station_id').references('id').inTable('scheduling.stations');
    table.integer('day_of_week');
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.uuid('role_id').references('id').inTable('scheduling.roles');
    table.integer('min_workers').notNullable().defaultTo(1);
    table.integer('optimal_workers');
    table.integer('max_workers');
    table.date('effective_from').defaultTo(knex.raw('CURRENT_DATE'));
    table.date('effective_to');
    table.integer('priority').defaultTo(50);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_coverage_organization ON scheduling.coverage_requirements(organization_id);
    CREATE INDEX idx_coverage_location ON scheduling.coverage_requirements(location_id);
    CREATE INDEX idx_coverage_station ON scheduling.coverage_requirements(station_id);
    CREATE INDEX idx_coverage_role ON scheduling.coverage_requirements(role_id);
    CREATE INDEX idx_coverage_day ON scheduling.coverage_requirements(day_of_week);
    
    COMMENT ON TABLE scheduling.coverage_requirements IS 'Staffing requirements per time slot';
    COMMENT ON COLUMN scheduling.coverage_requirements.day_of_week IS '0=Sunday, 6=Saturday';
  `);

  // ============================================================================
  // DEMAND HISTORY - Historical data for forecasting
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('demand_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.date('date').notNullable();
    table.integer('hour');
    table.integer('day_of_week');
    table.uuid('location_id').references('id').inTable('hris.location').onDelete('SET NULL');
    table.uuid('department_id').references('id').inTable('hris.department').onDelete('SET NULL');
    table.integer('customer_count');
    table.integer('transaction_count');
    table.decimal('revenue', 12, 2);
    table.decimal('labor_hours', 8, 2);
    table.integer('workers_scheduled');
    table.integer('workers_present');
    table.decimal('labor_cost', 12, 2);
    table.decimal('revenue_per_labor_hour', 10, 2);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_demand_history_organization ON scheduling.demand_history(organization_id);
    CREATE INDEX idx_demand_history_date ON scheduling.demand_history(date);
    CREATE INDEX idx_demand_history_location ON scheduling.demand_history(location_id);
    CREATE INDEX idx_demand_history_department ON scheduling.demand_history(department_id);
    
    COMMENT ON TABLE scheduling.demand_history IS 'Historical demand data for forecasting';
    COMMENT ON COLUMN scheduling.demand_history.hour IS '0-23';
    COMMENT ON COLUMN scheduling.demand_history.day_of_week IS '0=Sunday, 6=Saturday';
  `);

  // ============================================================================
  // DEMAND FORECASTS - AI/ML generated predictions
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('demand_forecasts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.date('forecast_date').notNullable();
    table.integer('hour');
    table.uuid('location_id').references('id').inTable('hris.location').onDelete('SET NULL');
    table.uuid('department_id').references('id').inTable('hris.department').onDelete('SET NULL');
    table.integer('predicted_customer_count');
    table.integer('predicted_transaction_count');
    table.decimal('predicted_revenue', 12, 2);
    table.integer('recommended_workers');
    table.decimal('confidence_level', 5, 4);
    table.string('model_version', 50);
    table.string('algorithm', 50);
    table.timestamp('generated_at').defaultTo(knex.fn.now());
    table.uuid('generated_by').references('id').inTable('hris.user_account');
  });

  await knex.raw(`
    CREATE INDEX idx_forecasts_organization ON scheduling.demand_forecasts(organization_id);
    CREATE INDEX idx_forecasts_date ON scheduling.demand_forecasts(forecast_date);
    CREATE INDEX idx_forecasts_location ON scheduling.demand_forecasts(location_id);
    
    COMMENT ON TABLE scheduling.demand_forecasts IS 'AI-generated demand predictions';
    COMMENT ON COLUMN scheduling.demand_forecasts.confidence_level IS 'Confidence: 0.0000 to 1.0000';
  `);

  // ============================================================================
  // OPTIMIZATION HISTORY - Track schedule optimization attempts
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('optimization_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('schedule_id').notNullable().references('id').inTable('scheduling.schedules').onDelete('CASCADE');
    table.string('algorithm', 50).notNullable();
    table.string('objective', 50).notNullable();
    table.string('status', 20).notNullable();
    table.boolean('success');
    table.integer('execution_time_ms');
    table.decimal('initial_cost', 12, 2);
    table.decimal('optimized_cost', 12, 2);
    table.decimal('cost_savings', 12, 2);
    table.decimal('coverage_score', 5, 2);
    table.decimal('fairness_score', 5, 2);
    table.jsonb('parameters');
    table.jsonb('constraints');
    table.text('error_message');
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.uuid('triggered_by').references('id').inTable('hris.user_account');
  });

  await knex.raw(`
    CREATE INDEX idx_optimization_organization ON scheduling.optimization_history(organization_id);
    CREATE INDEX idx_optimization_schedule ON scheduling.optimization_history(schedule_id);
    CREATE INDEX idx_optimization_status ON scheduling.optimization_history(status);
    CREATE INDEX idx_optimization_started ON scheduling.optimization_history(started_at);
    
    COMMENT ON TABLE scheduling.optimization_history IS 'Track schedule optimization runs';
    COMMENT ON COLUMN scheduling.optimization_history.objective IS 'Objectives: minimize_cost, maximize_coverage, balance_workload, fairness';
    COMMENT ON COLUMN scheduling.optimization_history.status IS 'Status: running, completed, failed, cancelled';
  `);

  // ============================================================================
  // SERVICE LEVEL TARGETS - SLAs for staffing levels
  // ============================================================================
  await knex.schema.withSchema('scheduling').createTable('service_level_targets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('target_name', 100).notNullable();
    table.text('description');
    table.uuid('location_id').references('id').inTable('hris.location').onDelete('SET NULL');
    table.uuid('department_id').references('id').inTable('hris.department').onDelete('SET NULL');
    table.string('metric_type', 50).notNullable();
    table.decimal('target_value', 10, 2).notNullable();
    table.decimal('min_acceptable_value', 10, 2);
    table.specificType('applies_to_day_of_week', 'INTEGER[]');
    table.specificType('applies_to_time_range', 'TSRANGE');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').references('id').inTable('hris.user_account');
  });

  await knex.raw(`
    CREATE INDEX idx_sla_targets_organization ON scheduling.service_level_targets(organization_id);
    CREATE INDEX idx_sla_targets_location ON scheduling.service_level_targets(location_id);
    CREATE INDEX idx_sla_targets_department ON scheduling.service_level_targets(department_id);
    CREATE INDEX idx_sla_targets_active ON scheduling.service_level_targets(is_active);
    
    COMMENT ON TABLE scheduling.service_level_targets IS 'SLA targets for staffing levels';
    COMMENT ON COLUMN scheduling.service_level_targets.metric_type IS 'Types: coverage_percentage, response_time, wait_time, customer_satisfaction';
  `);

  // ============================================================================
  // TRIGGERS FOR UPDATED_AT
  // ============================================================================
  await knex.raw(`
    CREATE OR REPLACE FUNCTION scheduling.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Apply triggers to all relevant tables
  const tablesWithUpdatedAt = [
    'roles', 'worker_roles', 'stations', 'schedules', 'shifts',
    'worker_availability', 'time_off_requests', 'shift_swap_offers',
    'shift_swap_requests', 'coverage_requirements', 'service_level_targets'
  ];

  for (const tableName of tablesWithUpdatedAt) {
    await knex.raw(`
      CREATE TRIGGER update_${tableName}_updated_at 
      BEFORE UPDATE ON scheduling.${tableName}
      FOR EACH ROW EXECUTE FUNCTION scheduling.update_updated_at_column();
    `);
  }

  // ============================================================================
  // SCHEMA COMMENTS
  // ============================================================================
  await knex.raw(`
    COMMENT ON SCHEMA scheduling IS 'ScheduleHub workforce scheduling and optimization - References hris.employee as single source of truth';
  `);

  // ============================================================================
  // GRANT PERMISSIONS
  // ============================================================================
  await knex.raw(`
    GRANT USAGE ON SCHEMA scheduling TO PUBLIC;
    GRANT SELECT ON ALL TABLES IN SCHEMA scheduling TO PUBLIC;
  `);

  console.log('✓ ScheduleHub schema migration complete');
}

/**
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
  // Drop scheduling schema (cascades all tables and functions)
  await knex.raw('DROP SCHEMA IF EXISTS scheduling CASCADE');
  
  console.log('✓ ScheduleHub schema rollback complete');
}
