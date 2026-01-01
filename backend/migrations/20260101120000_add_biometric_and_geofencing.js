/**
 * Migration: Add Biometric Authentication and Geofencing Support
 * 
 * Creates:
 * 1. hris.biometric_credential - Stores WebAuthn credentials for Touch ID/Face ID
 * 2. Adds geofencing columns to hris.location for clock-in restrictions
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Create biometric_credential table for WebAuthn/FIDO2 credentials
  await knex.schema.withSchema('hris').createTable('biometric_credential', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('employee_id').notNullable().references('id').inTable('hris.employee').onDelete('CASCADE');
    
    // WebAuthn credential data
    table.string('credential_id', 512).notNullable().unique(); // Base64URL encoded credential ID
    table.text('public_key').notNullable(); // Public key in PEM or base64 format
    table.integer('counter').notNullable().defaultTo(0); // Sign counter for replay attack prevention
    table.string('credential_type', 50).notNullable().defaultTo('public-key'); // Credential type
    table.jsonb('transports').nullable(); // ['usb', 'nfc', 'ble', 'internal']
    
    // Device information
    table.string('device_name', 255).nullable(); // User-friendly device name
    table.string('device_type', 50).nullable(); // 'mobile', 'desktop', 'tablet'
    table.string('browser', 100).nullable(); // Browser type
    table.string('platform', 100).nullable(); // OS platform (iOS, Android, Windows, macOS)
    table.string('aaguid', 100).nullable(); // Authenticator Attestation GUID
    
    // Attestation and trust
    table.text('attestation_object').nullable(); // Attestation object for device verification
    table.string('attestation_format', 50).nullable(); // 'packed', 'fido-u2f', 'none', etc.
    table.boolean('is_backed_up').defaultTo(false); // Credential backed up to cloud
    table.boolean('is_discoverable').defaultTo(false); // Passkey/discoverable credential
    
    // Status and usage
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_used_at', { useTz: true }).nullable();
    table.integer('use_count').defaultTo(0);
    
    // Audit columns
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('created_by').nullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.uuid('updated_by').nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.uuid('deleted_by').nullable();
    
    // Indexes
    table.index(['organization_id', 'employee_id'], 'idx_biometric_org_employee');
    table.index(['credential_id'], 'idx_biometric_credential_id');
    table.index(['is_active'], 'idx_biometric_active');
    table.index(['deleted_at'], 'idx_biometric_deleted');
  });
  
  console.log('✅ Created hris.biometric_credential table');
  
  // 2. Add geofencing columns to hris.location table
  await knex.schema.withSchema('hris').alterTable('location', (table) => {
    // Geofencing configuration
    table.boolean('geofencing_enabled').defaultTo(false).comment('Enable location-based clock-in restrictions');
    table.decimal('geofence_latitude', 10, 8).nullable().comment('Center latitude for geofence');
    table.decimal('geofence_longitude', 11, 8).nullable().comment('Center longitude for geofence');
    table.integer('geofence_radius_meters').nullable().comment('Geofence radius in meters (e.g., 100m)');
    table.boolean('strict_geofencing').defaultTo(false).comment('Strict mode rejects clock-in outside geofence');
  });
  
  console.log('✅ Added geofencing columns to hris.location table');
  
  // 3. Create check constraints for geofencing
  await knex.raw(`
    ALTER TABLE hris.location 
    ADD CONSTRAINT check_geofencing_config 
    CHECK (
      (geofencing_enabled = false) OR 
      (geofencing_enabled = true AND 
       geofence_latitude IS NOT NULL AND 
       geofence_longitude IS NOT NULL AND 
       geofence_radius_meters IS NOT NULL AND
       geofence_radius_meters > 0)
    )
  `);
  
  await knex.raw(`
    ALTER TABLE hris.location 
    ADD CONSTRAINT check_geofence_latitude 
    CHECK (geofence_latitude IS NULL OR (geofence_latitude >= -90 AND geofence_latitude <= 90))
  `);
  
  await knex.raw(`
    ALTER TABLE hris.location 
    ADD CONSTRAINT check_geofence_longitude 
    CHECK (geofence_longitude IS NULL OR (geofence_longitude >= -180 AND geofence_longitude <= 180))
  `);
  
  console.log('✅ Added geofencing validation constraints');
  
  // 4. Add comments for documentation
  await knex.raw(`
    COMMENT ON TABLE hris.biometric_credential IS 'Stores WebAuthn/FIDO2 credentials for biometric authentication (Touch ID, Face ID)';
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN hris.location.geofencing_enabled IS 'When true, clock-in validation checks employee location';
  `);
  
  await knex.raw(`
    COMMENT ON COLUMN hris.location.strict_geofencing IS 'When true, clock-in is rejected if outside geofence. When false, only logs warning.';
  `);
  
  console.log('✅ Migration completed successfully');
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Remove geofencing constraints
  await knex.raw('ALTER TABLE hris.location DROP CONSTRAINT IF EXISTS check_geofencing_config');
  await knex.raw('ALTER TABLE hris.location DROP CONSTRAINT IF EXISTS check_geofence_latitude');
  await knex.raw('ALTER TABLE hris.location DROP CONSTRAINT IF EXISTS check_geofence_longitude');
  
  // Remove geofencing columns from location table
  await knex.schema.withSchema('hris').alterTable('location', (table) => {
    table.dropColumn('geofencing_enabled');
    table.dropColumn('geofence_latitude');
    table.dropColumn('geofence_longitude');
    table.dropColumn('geofence_radius_meters');
    table.dropColumn('strict_geofencing');
  });
  
  console.log('✅ Removed geofencing columns from hris.location table');
  
  // Drop biometric_credential table
  await knex.schema.withSchema('hris').dropTableIfExists('biometric_credential');
  
  console.log('✅ Dropped hris.biometric_credential table');
  console.log('✅ Rollback completed successfully');
}
