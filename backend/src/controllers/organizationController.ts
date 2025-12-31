import Joi from 'joi';
import Organization from '../models/Organization.js';
import logger from '../utils/logger.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

// Validation schemas
const updateOrgSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  tier: Joi.string().valid('starter', 'professional', 'enterprise'),
  maxUsers: Joi.number().integer().min(1),
  maxWorkspaces: Joi.number().integer().min(1),
  maxJobs: Joi.number().integer().min(1),
  maxCandidates: Joi.number().integer().min(1),
  settings: Joi.object(),
  branding: Joi.object()
});

/**
 * Get current organization details
 */
export async function getOrganization(req, res, next) {
  try {
    const organizationId = req.user.organization_id;

    const organization = await Organization.findById(organizationId);
    
    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        tier: organization.tier,
        subscriptionStatus: organization.subscription_status,
        maxUsers: organization.max_users,
        maxWorkspaces: organization.max_workspaces,
        maxJobs: organization.max_jobs,
        maxCandidates: organization.max_candidates,
        settings: organization.settings,
        branding: organization.branding,
        createdAt: organization.created_at
      }
    });

  } catch (_error) {
    next(error);
  }
}

/**
 * Update organization
 */
export async function updateOrganization(req, res, next) {
  try {
    const organizationId = req.user.organization_id;

    // Only owner and admin can update organization
    if (!['owner', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners and admins can update organization settings');
    }

    // Validate input
    const { error, value } = updateOrgSchema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const updatedOrg = await Organization.update(organizationId, value);

    if (!updatedOrg) {
      throw new NotFoundError('Organization not found');
    }

    logger.info(`Organization updated: ${updatedOrg.id} by ${req.user.email}`);

    res.json({
      message: 'Organization updated successfully',
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        tier: updatedOrg.tier,
        subscriptionStatus: updatedOrg.subscription_status
      }
    });

  } catch (_error) {
    next(error);
  }
}

/**
 * Get organization usage stats
 */
export async function getUsageStats(req, res, next) {
  try {
    const organizationId = req.user.organization_id;

    const stats = await Organization.getUsageStats(organizationId);

    res.json({
      stats
    });

  } catch (_error) {
    next(error);
  }
}

/**
 * Get session policy settings
 */
export async function getSessionPolicy(req, res, next) {
  try {
    const organizationId = req.user.organization_id;

    const organization = await Organization.findById(organizationId);
    
    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    res.json({
      sessionPolicy: {
        policy: organization.session_policy || 'multiple',
        maxSessionsPerUser: organization.max_sessions_per_user || 5,
        concurrentLoginDetection: organization.concurrent_login_detection || false
      }
    });

  } catch (_error) {
    next(error);
  }
}

/**
 * Update session policy settings
 */
export async function updateSessionPolicy(req, res, next) {
  try {
    const organizationId = req.user.organization_id;

    // Only owner and admin can update session policy
    if (!['owner', 'admin'].includes(req.user.role)) {
      throw new ForbiddenError('Only owners and admins can update session policy');
    }

    // Validate input
    const schema = Joi.object({
      sessionPolicy: Joi.string().valid('single', 'multiple').required(),
      maxSessionsPerUser: Joi.number().integer().min(1).max(10),
      concurrentLoginDetection: Joi.boolean()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Update organization
    const updateData: any = {
      session_policy: value.sessionPolicy
    };

    if (value.maxSessionsPerUser !== undefined) {
      updateData.max_sessions_per_user = value.maxSessionsPerUser;
    }

    if (value.concurrentLoginDetection !== undefined) {
      updateData.concurrent_login_detection = value.concurrentLoginDetection;
    }

    const updatedOrg = await Organization.update(organizationId, updateData);

    if (!updatedOrg) {
      throw new NotFoundError('Organization not found');
    }

    logger.info(`Session policy updated for organization ${organizationId}: ${value.sessionPolicy} by ${req.user.email}`);

    // If switching to single session, optionally revoke all existing sessions
    if (value.sessionPolicy === 'single' && req.body.revokeExistingSessions) {
      const RefreshToken = (await import('../models/RefreshToken')).default;
      const db = (await import('../config/database')).default;
      
      // Get all users in the organization
      const usersResult = await db.query(
        'SELECT id FROM users WHERE organization_id = $1 AND deleted_at IS NULL',
        [organizationId]
      );
      
      let totalRevoked = 0;
      for (const user of usersResult.rows) {
        const sessions = await RefreshToken.getActiveSessions(user.id);
        if (sessions.length > 1) {
          // Keep the most recent session, revoke others
          const sortedSessions = sessions.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          );
          
          for (let i = 1; i < sortedSessions.length; i++) {
            await RefreshToken.revokeSession(user.id, sortedSessions[i].id);
            totalRevoked++;
          }
        }
      }
      
      logger.info(`Single session policy enforced: ${totalRevoked} sessions revoked across organization ${organizationId}`);
    }

    res.json({
      message: 'Session policy updated successfully',
      sessionPolicy: {
        policy: updatedOrg.session_policy,
        maxSessionsPerUser: updatedOrg.max_sessions_per_user,
        concurrentLoginDetection: updatedOrg.concurrent_login_detection
      }
    });

  } catch (_error) {
    next(error);
  }
}
