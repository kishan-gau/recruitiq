/**
 * Product Repositories Export
 */

import ProductRepository from './productRepository.ts';
import ProductPermissionRepository from './productPermissionRepository.ts';
import ProductConfigRepository from './productConfigRepository.ts';
import ProductFeatureRepository from './productFeatureRepository.ts';

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
