/**
 * ScheduleHub Product Module
 * Entry point for dynamic product loading system
 * Exports routes, middleware, and configuration for the ScheduleHub workforce scheduling product
 */

import schedulehubRoutes from './routes/index.js';

/**
 * Product module configuration
 */
const config = {
  name: 'ScheduleHub',
  version: '1.0.0',
  description: 'Workforce scheduling and shift management system',
  features: [
    'schedule-management',
    'shift-management',
    'worker-management',
    'availability-tracking',
    'time-off-management',
    'shift-trading',
    'role-management',
    'station-management'
  ]
};

/**
 * Product middleware (optional)
 * Applied to all routes in this product
 */
const middleware = [
  // Product-specific context
  (req, res, next) => {
    req.productContext = {
      product: 'schedulehub',
      timestamp: new Date()
    };
    next();
  }
];

/**
 * Product routes
 * Main router exported for dynamic mounting
 */
const routes = schedulehubRoutes;

/**
 * Lifecycle hooks (optional)
 */
const hooks = {
  /**
   * Called when product is loaded
   */
  onLoad: async () => {
    console.log('📅 ScheduleHub product loaded');
  },

  /**
   * Called when product is unloaded
   */
  onUnload: async () => {
    console.log('📅 ScheduleHub product unloaded');
  },

  /**
   * Called on server startup
   */
  onStartup: async () => {
    console.log('🚀 ScheduleHub product startup');
  },

  /**
   * Called on server shutdown
   */
  onShutdown: async () => {
    console.log('🛑 ScheduleHub product shutdown');
  }
};

/**
 * Export product module
 * This structure is required by the ProductLoader
 */
export default {
  config,
  routes,
  middleware,
  hooks
};

/**
 * Named exports for direct imports (optional)
 */
export {
  config,
  routes,
  middleware,
  hooks
};
