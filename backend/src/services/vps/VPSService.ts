/**
 * VPS Service
 * 
 * Service for managing VPS instances for deployment
 * Handles VPS lifecycle operations with proper validation and error handling
 * 
 * @module services/vps/VPSService
 */

import Joi from 'joi';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import VPSRepository from '../../repositories/VPSRepository.js';

export interface WaitForVPSReadyOptions {
  timeout?: number;
  interval?: number;
}

class VPSService {
  /**
   * Constructor with dependency injection
   * @param {VPSRepository} repository - Optional repository instance for testing
   */
  
  repository: VPSRepository;

constructor(repository: VPSRepository | null = null) {
    this.repository = repository || new VPSRepository();
  }

  /**
   * Joi validation schema for VPS creation
   */
  static get createSchema() {
    return Joi.object({
      name: Joi.string().required().trim().min(3).max(100),
      ipAddress: Joi.string().required().ip({ version: ['ipv4', 'ipv6'] }),
      hostname: Joi.string().required().trim().min(3).max(255),
      provider: Joi.string().required().valid('digitalocean', 'aws', 'azure', 'gcp', 'vultr', 'linode'),
      region: Joi.string().required().trim().max(100),
      size: Joi.string().required().trim().max(50),
      organizationId: Joi.string().uuid().required(),
      status: Joi.string().valid('provisioning', 'ready', 'deploying', 'error').default('provisioning'),
      sshKeyId: Joi.string().optional().allow(null),
      tags: Joi.array().items(Joi.string()).optional(),
      metadata: Joi.object().optional()
    }).options({ stripUnknown: true });
  }

  /**
   * Joi validation schema for VPS updates
   */
  static get updateSchema() {
    return Joi.object({
      name: Joi.string().optional().trim().min(3).max(100),
      status: Joi.string().valid('provisioning', 'ready', 'deploying', 'deployed', 'error', 'locked', 'blocked').optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      metadata: Joi.object().optional()
    }).min(1).options({ stripUnknown: true });
  }

  /**
   * Creates a new VPS
   * 
   * @param {Object} data - VPS data (validated against createSchema)
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID who created the VPS
   * @returns {Promise<Object>} Created VPS object
   * @throws {ValidationError} If data is invalid
   * @throws {ConflictError} If IP address already exists
   */
  async create(data, organizationId, userId) {
    try {
      // 1. ALWAYS validate first
      const validated = await VPSService.createSchema.validateAsync(data);

      // 2. Check if IP address already exists
      const existingVPS = await this.repository.findByIpAddress(validated.ipAddress, organizationId);
      if (existingVPS) {
        throw new ConflictError('VPS with this IP address already exists');
      }

      // 3. Apply business rules
      const vpsData = {
        ...validated,
        organizationId,
        createdBy: userId,
        status: validated.status || 'provisioning',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 4. Delegate to repository
      const vps = await this.repository.create(vpsData);

      // 5. Log success
      logger.info('VPS created successfully', {
        vpsId: vps.id,
        organizationId,
        userId,
        ipAddress: vps.ipAddress
      });

      return vps;
    } catch (error) {
      // 6. Log errors with context
      logger.error('Error creating VPS', {
        error: error.message,
        organizationId,
        userId,
        data: { ipAddress: data.ipAddress, hostname: data.hostname }
      });
      throw error;
    }
  }

  /**
   * Retrieves a VPS by ID
   * 
   * @param {string} vpsId - VPS UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} VPS object
   * @throws {NotFoundError} If VPS not found
   */
  async getById(vpsId, organizationId) {
    const vps = await this.repository.findById(vpsId, organizationId);

    if (!vps) {
      throw new NotFoundError('VPS not found');
    }

    return vps;
  }

  /**
   * Retrieves a VPS by IP address
   * 
   * @param {string} ipAddress - VPS IP address
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} VPS object or null
   */
  async getByIpAddress(ipAddress, organizationId) {
    return this.repository.findByIpAddress(ipAddress, organizationId);
  }

  /**
   * Updates a VPS
   * 
   * @param {string} vpsId - VPS UUID
   * @param {Object} data - Update data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing update
   * @returns {Promise<Object>} Updated VPS object
   * @throws {ValidationError} If data is invalid
   * @throws {NotFoundError} If VPS not found
   */
  async update(vpsId, data, organizationId, userId) {
    // 1. Validate update data
    const validated = await VPSService.updateSchema.validateAsync(data);

    // 2. Verify VPS exists and belongs to organization
    const existingVPS = await this.getById(vpsId, organizationId);

    // 3. Apply business rules for updates
    const updateData = {
      ...validated,
      updatedBy: userId,
      updatedAt: new Date()
    };

    // 4. Update in repository
    const updated = await this.repository.update(vpsId, updateData, organizationId);

    logger.info('VPS updated successfully', { vpsId, organizationId, userId });

    return updated;
  }

  /**
   * Deletes a VPS (soft delete)
   * 
   * @param {string} vpsId - VPS UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User UUID performing delete
   * @returns {Promise<void>}
   * @throws {NotFoundError} If VPS not found
   */
  async delete(vpsId, organizationId, userId) {
    // Verify VPS exists
    await this.getById(vpsId, organizationId);

    // Soft delete
    await this.repository.softDelete(vpsId, organizationId, userId);

    logger.info('VPS deleted successfully', { vpsId, organizationId, userId });
  }

  /**
   * Lists VPS instances with filtering and pagination
   * 
   * @param {Object} filters - Query filters
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} { vpsList, pagination, filters }
   */
  async list(filters, organizationId) {
    // Validate pagination params
    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
    const offset = (page - 1) * limit;

    // Build safe filter object
    const safeFilters = {
      status: filters.status || null,
      provider: filters.provider || null,
      region: filters.region || null,
      search: filters.search || null
    };

    // Get data from repository
    const { vpsList, total } = await this.repository.findAll(
      safeFilters,
      { limit, offset },
      organizationId
    );

    return {
      vpsList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: safeFilters
    };
  }

  /**
   * Waits for VPS to reach ready state
   * 
   * @param {string} vpsId - VPS UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} options - Wait options
   * @param {number} options.timeout - Timeout in milliseconds (default: 300000 = 5 minutes)
   * @param {number} options.interval - Check interval in milliseconds (default: 5000 = 5 seconds)
   * @returns {Promise<Object>} VPS object when ready
   * @throws {Error} If timeout reached or VPS enters error/locked/blocked state
   */
  async waitForVPSReady(vpsId: string, organizationId: string, options: WaitForVPSReadyOptions = {}): Promise<unknown> {
    const timeout = options.timeout || 300000; // 5 minutes default
    const interval = options.interval || 5000; // 5 seconds default
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const vps = await this.getById(vpsId, organizationId);

      // Check for error states
      if (vps.status === 'error') {
        throw new Error(`VPS entered error state: ${vps.metadata?.errorMessage || 'Unknown error'}`);
      }

      if (vps.status === 'locked') {
        throw new Error('VPS is locked and cannot be used');
      }

      if (vps.status === 'blocked') {
        throw new Error('VPS is blocked and cannot be used');
      }

      // Check for ready state
      if (vps.status === 'ready') {
        logger.info('VPS is ready', { vpsId, organizationId });
        return vps;
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, interval));

      logger.debug('Waiting for VPS to be ready', {
        vpsId,
        currentStatus: vps.status,
        elapsed: Date.now() - startTime
      });
    }

    throw new Error(`Timeout waiting for VPS to be ready after ${timeout}ms`);
  }
}

export default VPSService;
