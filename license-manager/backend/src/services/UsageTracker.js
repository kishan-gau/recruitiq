import UsageEvent from '../models/UsageEvent.js'
import Instance from '../models/Instance.js'
import License from '../models/License.js'

class UsageTracker {
  /**
   * Track a usage event from an instance
   * @param {Object} eventData - Event data from instance
   * @returns {Object} Created event record
   */
  static async trackEvent(eventData) {
    try {
      const {
        instanceKey,
        eventType,
        data = {},
        counts = {}
      } = eventData

      // Get instance to verify it exists and get customer
      const instance = await Instance.findByKey(instanceKey)
      
      if (!instance) {
        throw new Error('Instance not found')
      }

      // Update instance heartbeat
      await Instance.updateHeartbeat(instanceKey, data.appVersion)

      // Create usage event
      const event = await UsageEvent.create({
        customerId: instance.customer_id,
        instanceId: instance.id,
        eventType,
        eventData: data,
        userCount: counts.users || null,
        workspaceCount: counts.workspaces || null,
        jobCount: counts.jobs || null,
        candidateCount: counts.candidates || null
      })

      // Check if any limits are exceeded
      const warnings = await this.checkLimits(instance.customer_id, counts)

      return {
        success: true,
        eventId: event.id,
        warnings
      }
    } catch (error) {
      console.error('Track event error:', error)
      throw error
    }
  }

  /**
   * Check if any resource limits are exceeded
   * @param {string} customerId - Customer UUID
   * @param {Object} counts - Current resource counts
   * @returns {Array} Array of warnings for exceeded limits
   */
  static async checkLimits(customerId, counts) {
    const warnings = []

    const resources = [
      { type: 'users', count: counts.users },
      { type: 'workspaces', count: counts.workspaces },
      { type: 'jobs', count: counts.jobs },
      { type: 'candidates', count: counts.candidates }
    ]

    for (const resource of resources) {
      if (resource.count !== undefined && resource.count !== null) {
        const limitCheck = await License.checkLimit(customerId, resource.type, resource.count)
        
        if (limitCheck.exceeded) {
          warnings.push({
            resource: resource.type,
            limit: limitCheck.limit,
            current: limitCheck.current,
            message: `${resource.type} limit exceeded`
          })
        }
      }
    }

    return warnings
  }

  /**
   * Get usage statistics for a customer
   * @param {string} customerId - Customer UUID
   * @param {number} days - Number of days to look back
   * @returns {Object} Usage statistics
   */
  static async getUsageStats(customerId, days = 30) {
    try {
      const summary = await UsageEvent.getSummary(customerId, days)
      const trends = await UsageEvent.getTrends(customerId, days)
      const currentCounts = await UsageEvent.getCurrentCounts(customerId)

      return {
        current: currentCounts,
        summary,
        trends
      }
    } catch (error) {
      console.error('Get usage stats error:', error)
      throw error
    }
  }

  /**
   * Get recent activity for a customer
   * @param {string} customerId - Customer UUID
   * @param {number} limit - Number of events to return
   * @returns {Array} Recent activity events
   */
  static async getRecentActivity(customerId, limit = 20) {
    try {
      return await UsageEvent.findByCustomerId(customerId, { limit })
    } catch (error) {
      console.error('Get recent activity error:', error)
      throw error
    }
  }

  /**
   * Calculate usage metrics for all customers (for dashboard)
   * @returns {Object} Aggregate usage metrics
   */
  static async calculateGlobalMetrics() {
    try {
      const recentActivity = await UsageEvent.getRecentActivity(100)
      
      // Group by customer
      const customerActivity = {}
      recentActivity.forEach(event => {
        if (!customerActivity[event.customer_id]) {
          customerActivity[event.customer_id] = {
            customerId: event.customer_id,
            customerName: event.customer_name,
            instanceKey: event.instance_key,
            eventCount: 0,
            lastActivity: event.timestamp
          }
        }
        customerActivity[event.customer_id].eventCount++
      })

      const metrics = {
        totalEvents: recentActivity.length,
        activeCustomers: Object.keys(customerActivity).length,
        topActiveCustomers: Object.values(customerActivity)
          .sort((a, b) => b.eventCount - a.eventCount)
          .slice(0, 5)
      }

      return metrics
    } catch (error) {
      console.error('Calculate global metrics error:', error)
      throw error
    }
  }

  /**
   * Process heartbeat from an instance
   * @param {string} instanceKey - Instance identifier
   * @param {Object} heartbeatData - Heartbeat data including resource counts
   * @returns {Object} Heartbeat processing result
   */
  static async processHeartbeat(instanceKey, heartbeatData) {
    try {
      const instance = await Instance.findByKey(instanceKey)
      
      if (!instance) {
        return {
          success: false,
          error: 'Instance not found'
        }
      }

      // Update heartbeat and version
      await Instance.updateHeartbeat(instanceKey, heartbeatData.appVersion)

      // Record usage snapshot if counts provided
      if (heartbeatData.counts) {
        await this.trackEvent({
          instanceKey,
          eventType: 'heartbeat',
          data: heartbeatData,
          counts: heartbeatData.counts
        })
      }

      return {
        success: true,
        message: 'Heartbeat received',
        instanceStatus: instance.status,
        lastHeartbeat: new Date()
      }
    } catch (error) {
      console.error('Process heartbeat error:', error)
      return {
        success: false,
        error: 'Failed to process heartbeat'
      }
    }
  }
}

export default UsageTracker
