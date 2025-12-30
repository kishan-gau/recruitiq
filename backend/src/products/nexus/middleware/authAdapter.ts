/**
 * Auth Adapter Middleware
 * Maps req.user (from main auth middleware) to req.auth format expected by Nexus controllers
 */

/**
 * Middleware to adapt authentication data format
 * Converts req.user to req.auth with the structure Nexus controllers expect
 */
export const adaptAuthForNexus = (req, res, next) => {
  if (req.user) {
    req.auth = {
      userId: req.user.id,
      organizationId: req.user.organization_id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      permissions: req.user.permissions,
      userType: req.user.user_type
    };
  }
  next();
};
