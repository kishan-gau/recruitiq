/**
 * VPS Controller - TransIP Integration
 * 
 * Handles HTTP requests for VPS management operations
 */

import transipService from '../services/transip/TransIPService.ts';
import logger from '../utils/logger.ts';

/**
 * Health check endpoint
 */
export async function healthCheck(req, res, next) {
  try {
    const health = await transipService.healthCheck();

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return res.status(statusCode).json({
      success: health.status === 'healthy',
      ...health
    });
  } catch (error) {
    logger.error('VPS health check failed', {
      error: error.message
    });

    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: error.message
    });
  }
}

/**
 * Get VPS information
 */
export async function getVPSInfo(req, res, next) {
  try {
    const vpsInfo = await transipService.getVPSInfo();

    logger.info('VPS info requested', {
      userId: req.user.id,
      vpsName: vpsInfo.name
    });

    return res.status(200).json({
      success: true,
      vps: vpsInfo
    });
  } catch (error) {
    logger.error('Failed to get VPS info', {
      error: error.message,
      userId: req.user.id
    });

    next(error);
  }
}

/**
 * Get VPS metrics
 */
export async function getVPSMetrics(req, res, next) {
  try {
    const metrics = await transipService.getVPSMetrics();

    logger.info('VPS metrics requested', {
      userId: req.user.id
    });

    return res.status(200).json({
      success: true,
      metrics
    });
  } catch (error) {
    logger.error('Failed to get VPS metrics', {
      error: error.message,
      userId: req.user.id
    });

    next(error);
  }
}

/**
 * Start VPS
 */
export async function startVPS(req, res, next) {
  try {
    const result = await transipService.startVPS();

    logger.info('VPS start requested', {
      userId: req.user.id,
      userEmail: req.user.email
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to start VPS', {
      error: error.message,
      userId: req.user.id
    });

    next(error);
  }
}

/**
 * Stop VPS
 */
export async function stopVPS(req, res, next) {
  try {
    const result = await transipService.stopVPS();

    logger.info('VPS stop requested', {
      userId: req.user.id,
      userEmail: req.user.email
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to stop VPS', {
      error: error.message,
      userId: req.user.id
    });

    next(error);
  }
}

/**
 * Reboot VPS
 */
export async function rebootVPS(req, res, next) {
  try {
    const result = await transipService.rebootVPS();

    logger.info('VPS reboot requested', {
      userId: req.user.id,
      userEmail: req.user.email
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to reboot VPS', {
      error: error.message,
      userId: req.user.id
    });

    next(error);
  }
}

/**
 * Get VPS snapshots
 */
export async function getSnapshots(req, res, next) {
  try {
    const snapshots = await transipService.getSnapshots();

    logger.info('VPS snapshots requested', {
      userId: req.user.id,
      count: snapshots.length
    });

    return res.status(200).json({
      success: true,
      snapshots
    });
  } catch (error) {
    logger.error('Failed to get VPS snapshots', {
      error: error.message,
      userId: req.user.id
    });

    next(error);
  }
}

/**
 * Create VPS snapshot
 */
export async function createSnapshot(req, res, next) {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Snapshot description is required'
      });
    }

    const snapshot = await transipService.createSnapshot(description);

    logger.info('VPS snapshot created', {
      userId: req.user.id,
      snapshotId: snapshot.id,
      description
    });

    return res.status(201).json({
      success: true,
      snapshot,
      message: 'Snapshot created successfully'
    });
  } catch (error) {
    logger.error('Failed to create VPS snapshot', {
      error: error.message,
      userId: req.user.id
    });

    next(error);
  }
}

/**
 * Revert VPS to snapshot
 */
export async function revertToSnapshot(req, res, next) {
  try {
    const { snapshotId } = req.params;

    if (!snapshotId) {
      return res.status(400).json({
        success: false,
        error: 'Snapshot ID is required'
      });
    }

    const result = await transipService.revertToSnapshot(snapshotId);

    logger.info('VPS reverted to snapshot', {
      userId: req.user.id,
      userEmail: req.user.email,
      snapshotId
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to revert VPS to snapshot', {
      error: error.message,
      userId: req.user.id,
      snapshotId: req.params.snapshotId
    });

    next(error);
  }
}
