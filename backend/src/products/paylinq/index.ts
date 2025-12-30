/**
 * Paylinq Product Module
 * Entry point for dynamic product loading system
 * Exports routes, middleware, and configuration for the Paylinq Payroll product
 */

import paylinqRoutes from './routes/routes.js';

/**
 * Product module configuration
 */
const config = {
  name: 'PayLinQ',
  version: '1.0.0',
  description: 'Comprehensive payroll management with multi-currency support, tax calculations, and payment processing',
  features: [
    'payroll-processing',
    'time-tracking',
    'tax-management',
    'payment-processing',
    'multi-currency',
    'compensation-management',
    'deductions',
    'reporting'
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
      product: 'paylinq',
      timestamp: new Date()
    };
    next();
  }
];

/**
 * Product routes
 * Main router exported for dynamic mounting
 */
const routes = paylinqRoutes;

/**
 * Lifecycle hooks (optional)
 */
const hooks = {
  /**
   * Called when product is loaded
   */
  onLoad: async () => {
    console.log('💰 Paylinq product loaded');
  },

  /**
   * Called when product is unloaded
   */
  onUnload: async () => {
    console.log('💰 Paylinq product unloaded');
  },

  /**
   * Called on server startup
   */
  onStartup: async () => {
    console.log('🚀 Paylinq product startup');
  },

  /**
   * Called on server shutdown
   */
  onShutdown: async () => {
    console.log('🛑 Paylinq product shutdown');
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
