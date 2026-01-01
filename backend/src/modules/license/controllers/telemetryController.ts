import UsageTracker from '../services/UsageTracker.js'
import UsageEvent from '../models/UsageEvent.js'

export const telemetryController = {
  // Report usage event
  reportUsage: async (req, res) => {
    try {
      const eventData = req.body

      if (!eventData.instanceKey || !eventData.eventType) {
        return res.status(400).json({ 
          error: 'Instance key and event type required' 
        })
      }

      const result = await UsageTracker.trackEvent(eventData)

      res.json(result)
    } catch (error) {
      console.error('Report usage error:', error)
      res.status(500).json({ 
        success: false,
        error: 'Failed to report usage' 
      })
    }
  },

  // Process heartbeat
  heartbeat: async (req, res) => {
    try {
      const { instanceKey, appVersion, counts } = req.body

      if (!instanceKey) {
        return res.status(400).json({ error: 'Instance key required' })
      }

      const result = await UsageTracker.processHeartbeat(instanceKey, {
        appVersion,
        counts
      })

      res.json(result)
    } catch (error) {
      console.error('Heartbeat error:', error)
      res.status(500).json({ 
        success: false,
        error: 'Failed to process heartbeat' 
      })
    }
  },

  // Get usage statistics
  getUsageStats: async (req, res) => {
    try {
      const { customerId } = req.params
      const { days = 30 } = req.query

      const stats = await UsageTracker.getUsageStats(customerId, parseInt(days))

      res.json(stats)
    } catch (error) {
      console.error('Get usage stats error:', error)
      res.status(500).json({ error: 'Failed to fetch usage statistics' })
    }
  },

  // Get recent activity
  getRecentActivity: async (req, res) => {
    try {
      const { customerId } = req.params
      const { limit = 20 } = req.query

      const activity = await UsageTracker.getRecentActivity(customerId, parseInt(limit))

      res.json({ activity })
    } catch (error) {
      console.error('Get recent activity error:', error)
      res.status(500).json({ error: 'Failed to fetch recent activity' })
    }
  },

  // Get global telemetry metrics
  getGlobalMetrics: async (req, res) => {
    try {
      const metrics = await UsageTracker.calculateGlobalMetrics()

      res.json(metrics)
    } catch (error) {
      console.error('Get global metrics error:', error)
      res.status(500).json({ error: 'Failed to fetch global metrics' })
    }
  }
}
