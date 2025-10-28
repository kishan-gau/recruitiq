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

  } catch (error) {
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

  } catch (error) {
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

  } catch (error) {
    next(error);
  }
}
