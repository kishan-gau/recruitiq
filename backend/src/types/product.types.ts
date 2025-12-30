/**
 * Product system types
 */

import { Router } from 'express';
import { Middleware } from './request.types.js';

export interface ProductConfig {
  name: string;
  slug: string;
  version: string;
  description?: string;
  features?: string[];
}

export interface ProductHooks {
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
  onStartup?: () => Promise<void>;
  onShutdown?: () => Promise<void>;
}

export interface ProductModule {
  config: ProductConfig;
  routes: Router;
  middleware?: Middleware[];
  hooks?: ProductHooks;
}

export interface LoadedProduct {
  config: ProductConfig;
  router: Router;
  middleware: Middleware[];
  hooks: ProductHooks;
}

export type ProductSlug = 'nexus' | 'paylinq' | 'schedulehub' | 'recruitiq';
