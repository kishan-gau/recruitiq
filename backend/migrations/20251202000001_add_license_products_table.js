/**
 * Migration: Add Tier Preset Products Table
 * 
 * Creates junction table to define which products are included in each tier preset.
 * This is the SOURCE OF TRUTH for product bundling:
 * 
 * - Starter Tier → RecruitIQ only
 * - Professional Tier → RecruitIQ + Nexus + PayLinQ
 * - Enterprise Tier → All products (RecruitIQ + Nexus + PayLinQ + ScheduleHub)
 * 
 * Licenses inherit products from their tier_preset_id.
 * This ensures consistent product bundling across all licenses of the same tier.
 */

export async function up(knex) {
  // ============================================================================
  // TIER_PRESET_PRODUCTS - Defines which products are in each tier
  // ============================================================================
  await knex.schema.createTable('tier_preset_products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Foreign Keys
    table.uuid('tier_preset_id').notNullable()
      .references('id').inTable('tier_presets').onDelete('CASCADE');
    table.uuid('product_id').notNullable()
      .references('id').inTable('products').onDelete('CASCADE');
    
    // Product-specific configuration for this tier
    table.jsonb('enabled_features').defaultTo('[]'); // Product features enabled in this tier
    table.jsonb('disabled_features').defaultTo('[]'); // Product features explicitly disabled
    table.integer('max_users_per_product'); // Per-product user limit (NULL = use tier-level limit)
    table.integer('max_workspaces_per_product'); // Per-product workspace limit
    
    // Display & Ordering
    table.integer('display_order').defaultTo(0); // Order in which products are shown
    table.boolean('is_core').defaultTo(false); // Core product (always enabled) vs add-on
    
    // Status
    table.boolean('is_active').defaultTo(true);
    table.text('notes');
    
    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true });
    
    // Constraints
    table.unique(['tier_preset_id', 'product_id']);
  });

  // Create indexes
  await knex.raw(`
    CREATE INDEX idx_tier_preset_products_tier_preset ON tier_preset_products(tier_preset_id);
    CREATE INDEX idx_tier_preset_products_product ON tier_preset_products(product_id);
    CREATE INDEX idx_tier_preset_products_active ON tier_preset_products(is_active);
    CREATE INDEX idx_tier_preset_products_core ON tier_preset_products(is_core);
    CREATE INDEX idx_tier_preset_products_display_order ON tier_preset_products(display_order);
  `);

  // Add comments
  await knex.raw(`
    COMMENT ON TABLE tier_preset_products IS 'Defines which products are included in each tier preset - source of truth for product bundling';
    COMMENT ON COLUMN tier_preset_products.enabled_features IS 'Product-specific features enabled for this tier (e.g., ["multi_currency", "advanced_tax_rules"])';
    COMMENT ON COLUMN tier_preset_products.is_core IS 'Core products (like RecruitIQ) are included in all tiers, add-ons vary by tier';
    COMMENT ON COLUMN tier_preset_products.max_users_per_product IS 'Per-product user limit (NULL = inherit from tier preset max_users)';
  `);

  console.log('✅ Created tier_preset_products junction table');
  console.log('   Product bundles are now defined at the tier preset level');
  console.log('   Licenses will inherit products from their tier_preset_id');
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('tier_preset_products');
  console.log('✅ Dropped tier_preset_products table');
}
