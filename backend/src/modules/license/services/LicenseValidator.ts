import License from '../models/License.js'
import Customer from '../models/Customer.js'
import UsageEvent from '../models/UsageEvent.js'
import db from '../../../shared/database/licenseManagerDb.js'

class LicenseValidator {
  /**
   * Validate a license key for an instance
   * @param {string} licenseKey - The license key to validate
   * @param {string} instanceKey - The instance key requesting validation
   * @returns {Object} Validation result with valid flag and details
   */
  static async validateLicense(licenseKey, instanceKey) {
    try {
      const validation = await License.validate(licenseKey, instanceKey)

      // Log validation attempt
      const license = validation.license
      if (license) {
        await db.query(
          `INSERT INTO validation_logs (
            customer_id, instance_id, license_key, is_valid, validation_message, timestamp
          ) VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            license.customer_id,
            license.instance_id,
            licenseKey,
            validation.valid,
            validation.reason
          ]
        )
      }

      return {
        valid: validation.valid,
        reason: validation.reason,
        withinGracePeriod: validation.withinGracePeriod || false,
        license: validation.valid ? {
          tier: license.tier,
          maxUsers: license.max_users,
          maxWorkspaces: license.max_workspaces,
          maxJobs: license.max_jobs,
          maxCandidates: license.max_candidates,
          features: typeof license.features === 'string' 
            ? JSON.parse(license.features) 
            : license.features,
          expiresAt: license.expires_at
        } : null
      }
    } catch (_error) {
      console.error('License validation error:', error)
      return {
        valid: false,
        reason: 'Validation error occurred',
        license: null
      }
    }
  }

  /**
   * Check if a customer has exceeded a resource limit (PRE-ACTION CHECK)
   * This is called by RecruitIQ instances BEFORE creating a new resource
   * @param {string} customerId - Customer UUID
   * @param {string} resourceType - Type of resource (users, workspaces, jobs, candidates)
   * @param {number} currentCount - Current count to check against limit
   * @returns {Object} Limit check result with upgrade messaging
   */
  static async checkLimit(customerId, resourceType, currentCount) {
    try {
      const result = await License.checkLimit(customerId, resourceType, currentCount)
      
      // Get customer and license info for better error messages
      const customer = await Customer.findById(customerId)
      const licenses = await License.findByCustomerId(customerId)
      const license = licenses[0]
      
      const allowed = !result.exceeded
      const remaining = result.limit === null ? null : Math.max(0, result.limit - result.current)

      // Build response with upgrade suggestions
      let message = null
      let upgradeSuggestion = null

      if (!allowed) {
        const resourceName = {
          'users': 'users',
          'workspaces': 'workspaces',
          'jobs': 'jobs',
          'candidates': 'candidates'
        }[resourceType] || resourceType

        message = `You've reached your ${resourceName} limit (${result.current}/${result.limit}).`

        // Suggest upgrade path based on current tier
        if (license.tier === 'starter') {
          upgradeSuggestion = {
            recommendedTier: 'professional',
            benefits: [
              `Up to 50 users`,
              `5 workspaces`,
              `Unlimited jobs`,
              `5,000 candidates`,
              `Advanced analytics`,
              `API access`
            ],
            ctaText: 'Upgrade to Professional'
          }
        } else if (license.tier === 'professional') {
          upgradeSuggestion = {
            recommendedTier: 'enterprise',
            benefits: [
              `Unlimited users`,
              `Unlimited workspaces`,
              `Unlimited jobs`,
              `Unlimited candidates`,
              `SSO/SAML integration`,
              `White-label options`,
              `Dedicated support`
            ],
            ctaText: 'Upgrade to Enterprise'
          }
        }
      }

      return {
        allowed,
        limit: result.limit,
        current: result.current,
        remaining,
        resourceType,
        message,
        upgradeSuggestion,
        tier: license?.tier,
        customerName: customer?.name
      }
    } catch (_error) {
      console.error('Limit check error:', error)
      return {
        allowed: false,
        limit: 0,
        current: currentCount,
        remaining: 0,
        error: 'Limit check failed',
        message: 'Unable to verify resource limits. Please contact support.'
      }
    }
  }

  /**
   * Check limit by instance key (for RecruitIQ instances that don't know customer ID)
   * @param {string} instanceKey - Instance key
   * @param {string} resourceType - Type of resource
   * @param {number} currentCount - Current count
   * @returns {Object} Limit check result
   */
  static async checkLimitByInstance(instanceKey, resourceType, currentCount) {
    try {
      // Find customer by instance key
      const result = await db.query(
        `SELECT c.id as customer_id
         FROM instances i
         JOIN customers c ON c.id = i.customer_id
         WHERE i.instance_key = $1`,
        [instanceKey]
      )

      if (result.rows.length === 0) {
        return {
          allowed: false,
          error: 'Instance not found',
          message: 'Your instance is not registered. Please contact support.'
        }
      }

      const customerId = result.rows[0].customer_id
      return await this.checkLimit(customerId, resourceType, currentCount)
    } catch (_error) {
      console.error('Check limit by instance error:', error)
      return {
        allowed: false,
        error: 'Limit check failed',
        message: 'Unable to verify resource limits. Please contact support.'
      }
    }
  }

  /**
   * Check if a customer has access to a specific feature
   * @param {string} customerId - Customer UUID
   * @param {string} featureName - Name of the feature to check
   * @returns {boolean} Whether feature is enabled
   */
  static async hasFeature(customerId, featureName) {
    try {
      return await License.hasFeature(customerId, featureName)
    } catch (_error) {
      console.error('Feature check error:', error)
      return false
    }
  }

  /**
   * Get all license details for a customer including usage
   * @param {string} customerId - Customer UUID
   * @returns {Object} Complete license and usage information
   */
  static async getLicenseDetails(customerId) {
    try {
      const licenses = await License.findByCustomerId(customerId)
      
      if (licenses.length === 0) {
        return null
      }

      const license = licenses[0] // Get most recent license
      const currentUsage = await UsageEvent.getCurrentCounts(customerId)

      const features = typeof license.features === 'string'
        ? JSON.parse(license.features)
        : license.features

      return {
        licenseKey: license.license_key,
        tier: license.tier,
        status: license.status,
        expiresAt: license.expires_at,
        limits: {
          users: {
            max: license.max_users,
            current: currentUsage.user_count || 0,
            exceeded: license.max_users !== null && currentUsage.user_count >= license.max_users
          },
          workspaces: {
            max: license.max_workspaces,
            current: currentUsage.workspace_count || 0,
            exceeded: license.max_workspaces !== null && currentUsage.workspace_count >= license.max_workspaces
          },
          jobs: {
            max: license.max_jobs,
            current: currentUsage.job_count || 0,
            exceeded: license.max_jobs !== null && currentUsage.job_count >= license.max_jobs
          },
          candidates: {
            max: license.max_candidates,
            current: currentUsage.candidate_count || 0,
            exceeded: license.max_candidates !== null && currentUsage.candidate_count >= license.max_candidates
          }
        },
        features,
        instanceKey: license.instance_key,
        instanceUrl: license.instance_url
      }
    } catch (_error) {
      console.error('Get license details error:', error)
      return null
    }
  }

  /**
   * Get validation history for a license
   * @param {string} customerId - Customer UUID
   * @param {number} limit - Number of records to return
   * @returns {Array} Validation log entries
   */
  static async getValidationHistory(customerId, limit = 50) {
    try {
      const result = await db.query(
        `SELECT * FROM validation_logs
        WHERE customer_id = $1
        ORDER BY timestamp DESC
        LIMIT $2`,
        [customerId, limit]
      )

      return result.rows
    } catch (_error) {
      console.error('Get validation history error:', error)
      return []
    }
  }
}

export default LicenseValidator
