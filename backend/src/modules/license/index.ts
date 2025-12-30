/**
 * License Manager Module
 * Centralized license management for RecruitIQ
 * 
 * This module handles:
 * - Customer management
 * - License creation and validation
 * - Tier presets and feature management
 * - Usage telemetry
 * - Admin user management (separate from platform users)
 */

// Re-export database connection for convenience
export { default as db } from '../../shared/database/licenseManagerDb.js';

// Re-export routes
export { default as adminRoutes } from './routes/admin.js';
export { default as validationRoutes } from './routes/validation.js';
export { default as telemetryRoutes } from './routes/telemetry.js';
export { default as tierRoutes } from './routes/tiers.js';
