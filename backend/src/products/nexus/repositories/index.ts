/**
 * Product Repositories Export
 */

import ProductRepository from './productRepository.js';
import ProductPermissionRepository from './productPermissionRepository.js';
import ProductConfigRepository from './productConfigRepository.js';
import ProductFeatureRepository from './productFeatureRepository.js';

// Instantiate repositories as singletons
const productRepository = new ProductRepository();
const productPermissionRepository = new ProductPermissionRepository();
const productConfigRepository = new ProductConfigRepository();
const productFeatureRepository = new ProductFeatureRepository();

export {
  productRepository,
  productPermissionRepository,
  productConfigRepository,
  productFeatureRepository
};
