import TierManagement from '../services/TierManagement.js'
import TierPreset from '../models/TierPreset.js'

export const tierController = {
  /**
   * Get all active tier presets
   */
  getAllTiers: async (req, res) => {
    try {
      const tiers = await TierPreset.getAllActive()
      res.json({ tiers })
    } catch (error) {
      console.error('Get all tiers error:', error)
      res.status(500).json({ error: 'Failed to fetch tiers' })
    }
  },

  /**
   * Get tier history (all versions)
   */
  getTierHistory: async (req, res) => {
    try {
      const { tierName } = req.params
      const history = await TierPreset.getTierHistory(tierName)
      res.json({ history })
    } catch (error) {
      console.error('Get tier history error:', error)
      res.status(500).json({ error: 'Failed to fetch tier history' })
    }
  },

  /**
   * Get usage statistics for tiers
   */
  getTierStats: async (req, res) => {
    try {
      const stats = await TierPreset.getUsageStats()
      res.json({ stats })
    } catch (error) {
      console.error('Get tier stats error:', error)
      res.status(500).json({ error: 'Failed to fetch tier statistics' })
    }
  },

  /**
   * Create a new tier version
   */
  createTierVersion: async (req, res) => {
    try {
      const { autoMigrate = false, ...tierData } = req.body

      // Add created_by from authenticated user
      tierData.createdBy = req.user?.username || 'admin'

      // Validate required fields
      if (!tierData.tierName) {
        return res.status(400).json({ error: 'tierName is required' })
      }

      const result = await TierManagement.createTierVersion(tierData, autoMigrate)

      res.json({
        success: true,
        ...result,
        message: `Created version ${result.preset.version} for ${result.preset.tier_name} tier`
      })
    } catch (error) {
      console.error('Create tier version error:', error)
      res.status(500).json({ 
        success: false,
        error: 'Failed to create tier version',
        details: error.message
      })
    }
  },

  /**
   * Preview migration impact
   */
  previewMigration: async (req, res) => {
    try {
      const { tierName } = req.params
      const filters = req.body || {}

      const preview = await TierManagement.previewMigration(tierName, filters)

      res.json({
        success: true,
        ...preview
      })
    } catch (error) {
      console.error('Preview migration error:', error)
      res.status(500).json({ 
        success: false,
        error: 'Failed to preview migration',
        details: error.message
      })
    }
  },

  /**
   * Execute migration
   */
  executeMigration: async (req, res) => {
    try {
      const { migrationId } = req.params
      const filters = req.body || {}

      const result = await TierManagement.executeMigration(migrationId, filters)

      res.json({
        success: true,
        ...result,
        message: `Successfully migrated ${result.migratedCustomers} of ${result.affectedCustomers} customers`
      })
    } catch (error) {
      console.error('Execute migration error:', error)
      res.status(500).json({ 
        success: false,
        error: 'Failed to execute migration',
        details: error.message
      })
    }
  },

  /**
   * Get migration history
   */
  getMigrationHistory: async (req, res) => {
    try {
      const { tierName } = req.query
      const { limit = 50 } = req.query

      const history = await TierManagement.getMigrationHistory(
        tierName || null, 
        parseInt(limit)
      )

      res.json({ history })
    } catch (error) {
      console.error('Get migration history error:', error)
      res.status(500).json({ error: 'Failed to fetch migration history' })
    }
  },

  /**
   * Get customers using a specific preset
   */
  getPresetCustomers: async (req, res) => {
    try {
      const { presetId } = req.params

      const customers = await TierPreset.getCustomersUsingPreset(presetId)

      res.json({ 
        presetId,
        count: customers.length,
        customers 
      })
    } catch (error) {
      console.error('Get preset customers error:', error)
      res.status(500).json({ error: 'Failed to fetch preset customers' })
    }
  },

  /**
   * Compare two tier versions
   */
  compareTierVersions: async (req, res) => {
    try {
      const { presetId1, presetId2 } = req.query

      if (!presetId1 || !presetId2) {
        return res.status(400).json({ error: 'Both presetId1 and presetId2 required' })
      }

      const comparison = await TierPreset.compareVersions(presetId1, presetId2)

      res.json({
        success: true,
        ...comparison
      })
    } catch (error) {
      console.error('Compare versions error:', error)
      res.status(500).json({ 
        error: 'Failed to compare versions',
        details: error.message
      })
    }
  }
}
