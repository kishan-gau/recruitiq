/**
 * VIP Access Control Middleware
 * 
 * Middleware to check if the authenticated user can access
 * specific employee data based on VIP restrictions.
 * 
 * @module middleware/checkVIPAccess
 */

import VIPEmployeeService from '../products/nexus/services/vipEmployeeService.js';
import logger from '../utils/logger.js';

const vipEmployeeService = new VIPEmployeeService();

/**
 * Middleware factory to check VIP employee access
 * 
 * @param {string} accessType - Type of data being accessed
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/employees/:id/compensation', 
 *   authenticateTenant,
 *   checkVIPAccess('compensation'),
 *   getCompensation
 * );
 */
export function checkVIPAccess(accessType = 'general') {
  return async (req, res, next) => {
    try {
      const employeeId = req.params.id || req.params.employeeId;
      const userId = req.user.id;
      const organizationId = req.user.organizationId || req.user.organization_id;

      if (!employeeId) {
        logger.debug('VIP check skipped - no employee ID in params');
        return next(); // Continue without check if no employee ID
      }

      logger.debug('Checking VIP access via middleware', {
        employeeId,
        userId,
        accessType,
        organizationId,
        endpoint: req.originalUrl
      });

      // Perform access check
      const accessCheck = await vipEmployeeService.checkAccess(
        employeeId,
        userId,
        organizationId,
        accessType,
        {
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('user-agent')
        }
      );

      if (!accessCheck.granted) {
        logger.warn('VIP employee access denied', {
          employeeId,
          userId,
          accessType,
          reason: accessCheck.reason
        });

        // Return 403 Forbidden
        return res.status(403).json({
          success: false,
          error: accessCheck.reason || 'Access denied',
          errorCode: 'VIP_ACCESS_DENIED',
          isVIPRestricted: true
        });
      }

      // Access granted - attach log ID for reference
      req.vipAccessLogId = accessCheck.logId;

      logger.debug('VIP employee access granted', {
        employeeId,
        userId,
        accessType,
        reason: accessCheck.reason
      });

      next();
    } catch (error) {
      logger.error('Error in VIP access middleware', {
        error: error.message,
        stack: error.stack,
        employeeId: req.params.id || req.params.employeeId,
        userId: req.user?.id
      });

      // Pass error to error handler
      next(error);
    }
  };
}

/**
 * Middleware to filter restricted VIP employees from list responses
 * 
 * Removes or masks VIP employees from response based on user access.
 * Use this for list endpoints (GET /employees) to handle VIP employees.
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.mask - If true, mask VIP employees instead of removing
 * @param {string} options.employeesKey - Key in response containing employees array (default: 'employees')
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/employees', 
 *   authenticateTenant,
 *   listEmployees,
 *   filterVIPEmployees({ mask: true })
 * );
 */
export function filterVIPEmployees(options = {}) {
  const { mask = false, employeesKey = 'employees' } = options;

  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organizationId || req.user.organization_id;

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to filter employees
      res.json = async function(data) {
        // Only filter if response has employees array
        if (data[employeesKey] && Array.isArray(data[employeesKey])) {
          const originalCount = data[employeesKey].length;
          
          logger.debug('Filtering VIP employees from list', {
            originalCount,
            userId,
            organizationId
          });

          // Process employees based on VIP access
          const processedEmployees = [];
          for (const employee of data[employeesKey]) {
            // Check if employee is VIP and restricted
            if (employee.isVip && employee.isRestricted) {
              // Check access for this employee
              const accessCheck = await vipEmployeeService.checkAccess(
                employee.id,
                userId,
                organizationId,
                'general',
                {
                  endpoint: req.originalUrl,
                  method: req.method,
                  ip: req.ip
                }
              );

              if (accessCheck.granted) {
                // User has access, include employee
                processedEmployees.push(employee);
              } else if (mask) {
                // Mask VIP employee data
                processedEmployees.push({
                  id: employee.id,
                  firstName: '[RESTRICTED]',
                  lastName: '[RESTRICTED]',
                  email: '[RESTRICTED]',
                  phone: null,
                  mobilePhone: null,
                  departmentId: employee.departmentId,
                  departmentName: employee.departmentName,
                  jobTitle: '[RESTRICTED]',
                  employmentStatus: employee.employmentStatus,
                  isVip: true,
                  isRestricted: true,
                  vipRestricted: true
                });
              }
              // If not masking, employee is simply excluded
            } else {
              // Not VIP or not restricted, include as-is
              processedEmployees.push(employee);
            }
          }

          data[employeesKey] = processedEmployees;

          logger.debug('VIP employees filtered', {
            originalCount,
            filteredCount: processedEmployees.length
          });
        }

        // Call original res.json with processed data
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Error in filter VIP employees middleware', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      // Don't fail the request, just pass through
      next();
    }
  };
}

export default {
  checkVIPAccess,
  filterVIPEmployees
};
