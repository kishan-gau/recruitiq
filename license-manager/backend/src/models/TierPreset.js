import db from '../config/database.js'

/**
 * TierPreset Model
 * Manages versioned tier configurations with backwards compatibility
 */
class TierPreset {
  /**
   * Get the active (current) preset for a tier
   */
  static async getActivePreset(tierName) {
    const result = await db.query(
      `SELECT * FROM tier_presets 
       WHERE tier_name = $1 
       AND is_active = true 
       AND (effective_until IS NULL OR effective_until > NOW())
       ORDER BY version DESC
       LIMIT 1`,
      [tierName]
    )
    return result.rows[0] || null
  }

  /**
   * Get all versions of a tier (history)
   */
  static async getTierHistory(tierName) {
    const result = await db.query(
      `SELECT * FROM tier_presets 
       WHERE tier_name = $1 
       ORDER BY version DESC`,
      [tierName]
    )
    return result.rows
  }

  /**
   * Get specific preset by ID
   */
  static async getById(presetId) {
    const result = await db.query(
      'SELECT * FROM tier_presets WHERE id = $1',
      [presetId]
    )
    return result.rows[0] || null
  }

  /**
   * Get all active tier presets (current versions)
   */
  static async getAllActive() {
    const result = await db.query(
      `SELECT DISTINCT ON (tier_name) *
       FROM tier_presets 
       WHERE is_active = true 
       AND (effective_until IS NULL OR effective_until > NOW())
       ORDER BY tier_name, version DESC`
    )
    return result.rows
  }

  /**
   * Create a new tier preset version
   */
  static async createVersion(tierData) {
    const { 
      tierName, 
      maxUsers, 
      maxWorkspaces, 
      maxJobs, 
      maxCandidates,
      features,
      monthlyPricePerUser,
      annualPricePerUser,
      basePrice,
      description,
      createdBy,
      effectiveFrom
    } = tierData

    // Get the current max version for this tier
    const versionResult = await db.query(
      'SELECT COALESCE(MAX(version), 0) as max_version FROM tier_presets WHERE tier_name = $1',
      [tierName]
    )
    const newVersion = versionResult.rows[0].max_version + 1

    // Deactivate previous active version (set effective_until)
    await db.query(
      `UPDATE tier_presets 
       SET is_active = false, 
           effective_until = $1
       WHERE tier_name = $2 
       AND is_active = true`,
      [effectiveFrom || new Date(), tierName]
    )

    // Insert new version
    const result = await db.query(
      `INSERT INTO tier_presets (
        tier_name, version,
        max_users, max_workspaces, max_jobs, max_candidates,
        features,
        monthly_price_per_user, annual_price_per_user, base_price,
        description, created_by, effective_from
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        tierName, newVersion,
        maxUsers, maxWorkspaces, maxJobs, maxCandidates,
        JSON.stringify(features),
        monthlyPricePerUser, annualPricePerUser, basePrice,
        description, createdBy, effectiveFrom || new Date()
      ]
    )

    return result.rows[0]
  }

  /**
   * Compare two presets to show what changed
   */
  static async compareVersions(presetId1, presetId2) {
    const preset1 = await this.getById(presetId1)
    const preset2 = await this.getById(presetId2)

    if (!preset1 || !preset2) {
      throw new Error('One or both presets not found')
    }

    const changes = []

    // Compare limits
    const limits = ['max_users', 'max_workspaces', 'max_jobs', 'max_candidates']
    limits.forEach(limit => {
      if (preset1[limit] !== preset2[limit]) {
        changes.push({
          field: limit,
          from: preset1[limit],
          to: preset2[limit],
          type: 'limit'
        })
      }
    })

    // Compare features
    const features1 = new Set(preset1.features || [])
    const features2 = new Set(preset2.features || [])

    const addedFeatures = [...features2].filter(f => !features1.has(f))
    const removedFeatures = [...features1].filter(f => !features2.has(f))

    if (addedFeatures.length > 0) {
      changes.push({
        field: 'features',
        type: 'added',
        values: addedFeatures
      })
    }

    if (removedFeatures.length > 0) {
      changes.push({
        field: 'features',
        type: 'removed',
        values: removedFeatures
      })
    }

    // Compare pricing
    const prices = ['monthly_price_per_user', 'annual_price_per_user', 'base_price']
    prices.forEach(price => {
      if (preset1[price] !== preset2[price]) {
        changes.push({
          field: price,
          from: preset1[price],
          to: preset2[price],
          type: 'price'
        })
      }
    })

    return {
      from: preset1,
      to: preset2,
      changes
    }
  }

  /**
   * Get customers using a specific preset version
   */
  static async getCustomersUsingPreset(presetId) {
    const result = await db.query(
      `SELECT c.id, c.name, c.status, l.license_key, l.tier_version
       FROM customers c
       JOIN licenses l ON l.customer_id = c.id
       WHERE l.tier_preset_id = $1
       ORDER BY c.name`,
      [presetId]
    )
    return result.rows
  }

  /**
   * Get count of customers per tier and version
   */
  static async getUsageStats() {
    const result = await db.query(
      `SELECT 
        l.tier,
        l.tier_version,
        tp.tier_name as preset_tier,
        tp.version as preset_version,
        COUNT(DISTINCT c.id) as customer_count,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_customers
       FROM customers c
       JOIN licenses l ON l.customer_id = c.id
       LEFT JOIN tier_presets tp ON tp.id = l.tier_preset_id
       GROUP BY l.tier, l.tier_version, tp.tier_name, tp.version
       ORDER BY l.tier, l.tier_version DESC`
    )
    return result.rows
  }
}

export default TierPreset
