/**
 * Nexus Product Module
 * Entry point for dynamic product loading system
 * Exports routes, middleware, and configuration for the Nexus HRIS product
 */

import nexusRoutes from './routes/index.js';

/**
 * Product module configuration
 */
const config = {
  name: 'Nexus',
  version: '1.1.0',
  description: 'Core HRIS Management System with VIP Employee Support',
  features: [
    'employee-management',
    'department-management',
    'leave-management',
    'performance-management',
    'benefits-management',
    'vip-employee-tracking'
  ]
};

/**
 * Product middleware (optional)
 * Applied to all routes in this product
 */
const middleware = [
  // Example: Product-specific logging
  (req, res, next) => {
    req.productContext = {
      product: 'nexus',
      timestamp: new Date()
    };
    next();
  }
];

/**
 * Product routes
 * Main router exported for dynamic mounting
 */
const routes = nexusRoutes;

/**
 * Lifecycle hooks (optional)
 */
const hooks = {
  /**
   * Called when product is loaded
   */
  onLoad: async () => {
    console.log('📦 Nexus product loaded');
  },

  /**
   * Called when product is unloaded
   */
  onUnload: async () => {
    console.log('📦 Nexus product unloaded');
  },

  /**
   * Called on server startup
   */
  onStartup: async () => {
    console.log('🚀 Nexus product startup');
  },

  /**
   * Called on server shutdown
   */
  onShutdown: async () => {
    console.log('🛑 Nexus product shutdown');
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
