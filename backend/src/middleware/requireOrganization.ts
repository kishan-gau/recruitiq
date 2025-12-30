/**
 * Organization Validation Middleware
 * 
 * Ensures that users accessing product features have an organization_id.
 * Platform admins and users without organizations cannot access product features.
 * This applies to all products: Nexus, PayLinq, Portal, etc.
 */

import logger from '../utils/logger.ts';

/**
 * Middleware to require organization_id for product access
 * This should be applied to all product routes after authentication
 */
export const requireOrganization = (req, res, next) => {
  const organizationId = req.user?.organization_id;
  const userType = req.user?.user_type;
  const userId = req.user?.id;
  const email = req.user?.email;

  // Check if user has an organization
  if (!organizationId) {
    logger.warn('Product access denied: User has no organization', {
      userId,
      email,
      userType,
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access to this product requires an organization account. Your account type does not have access to organizational features.',
      code: 'ORGANIZATION_REQUIRED',
      details: {
        userType,
        hasOrganization: false,
        reason: 'Product features are only accessible to users with an active organization account',
      },
    });
  }

  // Explicitly block platform admins even if they somehow have an org_id
  if (userType === 'platform') {
    logger.warn('Product access denied: Platform admin attempted access', {
      userId,
      email,
      organizationId,
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Platform administrators cannot access organization-specific features. Please use a tenant account.',
      code: 'PLATFORM_ADMIN_RESTRICTED',
      details: {
        userType,
        reason: 'Platform admins cannot access product features',
      },
    });
  }

  // User has organization and is not platform admin, allow access
  next();
};

export default requireOrganization;
