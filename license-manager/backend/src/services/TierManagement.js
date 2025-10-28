import TierPreset from '../models/TierPreset.js'
import License from '../models/License.js'
import Customer from '../models/Customer.js'
import db from '../config/database.js'

/**
 * TierManagement Service
 * Handles tier version upgrades and selective customer migrations
 */
class TierManagement {
  /**
   * Create a new version of a tier preset
   * @param {Object} tierData - New tier configuration
   * @param {boolean} autoMigrate - Whether to auto-migrate customers with auto_upgrade=true
   * @returns {Object} New preset and migration info
   */
  static async createTierVersion(tierData, autoMigrate = false) {
    try {
      const client = await db.connect()
      
      try {
        await client.query('BEGIN')

        // Create new tier version
        const newPreset = await TierPreset.createVersion(tierData)

        // Count affected customers
        const countResult = await client.query(
          `SELECT COUNT(*) as total
           FROM licenses l
           JOIN customers c ON c.id = l.customer_id
           WHERE l.tier = $1
           AND l.auto_upgrade = $2
           AND c.status = 'active'`,
          [tierData.tierName, autoMigrate]
        )

        const affectedCount = parseInt(countResult.rows[0].total)

        // Create migration record
        const migrationResult = await client.query(
          `INSERT INTO tier_migrations (
            to_preset_id, migration_type, affected_customers,
            status, executed_by
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *`,
          [
            newPreset.id,
            autoMigrate ? 'automatic' : 'manual',
            affectedCount,
            autoMigrate && affectedCount > 0 ? 'pending' : 'completed',
            tierData.createdBy
          ]
        )

        const migration = migrationResult.rows[0]

        await client.query('COMMIT')

        // If auto-migrate, execute migration in background
        if (autoMigrate && affectedCount > 0) {
          // Execute migration (in production, use a job queue)
          setImmediate(() => {
            this.executeMigration(migration.id, { tier: tierData.tierName, autoUpgrade: true })
              .catch(err => console.error('Auto-migration error:', err))
          })
        }

        return {
          preset: newPreset,
          migration,
          affectedCustomers: affectedCount,
          willAutoMigrate: autoMigrate && affectedCount > 0
        }
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Create tier version error:', error)
      throw new Error('Failed to create tier version')
    }
  }

  /**
   * Preview what would happen if we migrate customers to a new tier version
   * @param {string} tierName - Tier to preview
   * @param {Object} filters - Customer filters (status, deployment_type, etc.)
   * @returns {Object} Preview data
   */
  static async previewMigration(tierName, filters = {}) {
    try {
      const activePreset = await TierPreset.getActivePreset(tierName)
      
      if (!activePreset) {
        throw new Error(`No active preset found for tier: ${tierName}`)
      }

      // Build query with filters
      let query = `
        SELECT 
          c.id, c.name, c.status, c.deployment_type,
          l.license_key, l.tier_version, l.auto_upgrade,
          l.max_users, l.max_workspaces, l.max_jobs, l.max_candidates
        FROM customers c
        JOIN licenses l ON l.customer_id = c.id
        WHERE l.tier = $1
      `
      const params = [tierName]
      let paramIndex = 2

      // Apply filters
      if (filters.status) {
        query += ` AND c.status = ANY($${paramIndex})`
        params.push(Array.isArray(filters.status) ? filters.status : [filters.status])
        paramIndex++
      }

      if (filters.deploymentType) {
        query += ` AND c.deployment_type = ANY($${paramIndex})`
        params.push(Array.isArray(filters.deploymentType) ? filters.deploymentType : [filters.deploymentType])
        paramIndex++
      }

      if (filters.autoUpgrade !== undefined) {
        query += ` AND l.auto_upgrade = $${paramIndex}`
        params.push(filters.autoUpgrade)
        paramIndex++
      }

      query += ` ORDER BY c.name`

      const result = await db.query(query, params)
      const customers = result.rows

      // Calculate changes for each customer
      const changes = customers.map(customer => {
        const limitChanges = []

        if (customer.max_users !== activePreset.max_users) {
          limitChanges.push({
            field: 'max_users',
            from: customer.max_users,
            to: activePreset.max_users,
            change: activePreset.max_users === null ? 'unlimited' : 
                   (activePreset.max_users > customer.max_users ? 'increased' : 'decreased')
          })
        }

        if (customer.max_workspaces !== activePreset.max_workspaces) {
          limitChanges.push({
            field: 'max_workspaces',
            from: customer.max_workspaces,
            to: activePreset.max_workspaces,
            change: activePreset.max_workspaces === null ? 'unlimited' :
                   (activePreset.max_workspaces > customer.max_workspaces ? 'increased' : 'decreased')
          })
        }

        if (customer.max_jobs !== activePreset.max_jobs) {
          limitChanges.push({
            field: 'max_jobs',
            from: customer.max_jobs,
            to: activePreset.max_jobs,
            change: activePreset.max_jobs === null ? 'unlimited' :
                   (activePreset.max_jobs > customer.max_jobs ? 'increased' : 'decreased')
          })
        }

        if (customer.max_candidates !== activePreset.max_candidates) {
          limitChanges.push({
            field: 'max_candidates',
            from: customer.max_candidates,
            to: activePreset.max_candidates,
            change: activePreset.max_candidates === null ? 'unlimited' :
                   (activePreset.max_candidates > customer.max_candidates ? 'increased' : 'decreased')
          })
        }

        return {
          customerId: customer.id,
          customerName: customer.name,
          status: customer.status,
          deploymentType: customer.deployment_type,
          autoUpgrade: customer.auto_upgrade,
          currentVersion: customer.tier_version,
          newVersion: activePreset.version,
          willChange: limitChanges.length > 0,
          changes: limitChanges
        }
      })

      return {
        tierName,
        newPreset: activePreset,
        totalCustomers: customers.length,
        customersWithChanges: changes.filter(c => c.willChange).length,
        customers: changes,
        filters
      }
    } catch (error) {
      console.error('Preview migration error:', error)
      throw new Error('Failed to preview migration')
    }
  }

  /**
   * Execute a tier migration
   * @param {string} migrationId - Migration record ID
   * @param {Object} filters - Customer filters
   * @returns {Object} Migration result
   */
  static async executeMigration(migrationId, filters = {}) {
    try {
      // Get migration record
      const migrationResult = await db.query(
        'SELECT * FROM tier_migrations WHERE id = $1',
        [migrationId]
      )

      if (migrationResult.rows.length === 0) {
        throw new Error('Migration not found')
      }

      const migration = migrationResult.rows[0]

      // Update status to in-progress
      await db.query(
        `UPDATE tier_migrations 
         SET status = 'in-progress', started_at = NOW()
         WHERE id = $1`,
        [migrationId]
      )

      // Get the target preset
      const preset = await TierPreset.getById(migration.to_preset_id)

      if (!preset) {
        throw new Error('Target preset not found')
      }

      // Build query to find licenses to migrate
      let query = `
        SELECT l.id, l.customer_id, l.tier
        FROM licenses l
        JOIN customers c ON c.id = l.customer_id
        WHERE l.tier = $1
      `
      const params = [preset.tier_name]
      let paramIndex = 2

      // Apply filters
      if (filters.status) {
        query += ` AND c.status = ANY($${paramIndex})`
        params.push(Array.isArray(filters.status) ? filters.status : [filters.status])
        paramIndex++
      }

      if (filters.deploymentType) {
        query += ` AND c.deployment_type = ANY($${paramIndex})`
        params.push(Array.isArray(filters.deploymentType) ? filters.deploymentType : [filters.deploymentType])
        paramIndex++
      }

      if (filters.autoUpgrade !== undefined) {
        query += ` AND l.auto_upgrade = $${paramIndex}`
        params.push(filters.autoUpgrade)
        paramIndex++
      }

      const licensesResult = await db.query(query, params)
      const licenses = licensesResult.rows

      let migratedCount = 0
      const errors = []

      // Update each license
      for (const license of licenses) {
        try {
          await db.query(
            `UPDATE licenses
             SET tier_preset_id = $1,
                 tier_version = $2,
                 max_users = $3,
                 max_workspaces = $4,
                 max_jobs = $5,
                 max_candidates = $6,
                 features = $7,
                 updated_at = NOW()
             WHERE id = $8`,
            [
              preset.id,
              preset.version,
              preset.max_users,
              preset.max_workspaces,
              preset.max_jobs,
              preset.max_candidates,
              JSON.stringify(preset.features),
              license.id
            ]
          )
          migratedCount++
        } catch (error) {
          errors.push({
            licenseId: license.id,
            customerId: license.customer_id,
            error: error.message
          })
        }
      }

      // Update migration record
      const status = errors.length === 0 ? 'completed' : 'failed'
      await db.query(
        `UPDATE tier_migrations
         SET status = $1,
             migrated_customers = $2,
             completed_at = NOW(),
             error_message = $3,
             filter_criteria = $4
         WHERE id = $5`,
        [
          status,
          migratedCount,
          errors.length > 0 ? JSON.stringify(errors) : null,
          JSON.stringify(filters),
          migrationId
        ]
      )

      return {
        migrationId,
        status,
        affectedCustomers: licenses.length,
        migratedCustomers: migratedCount,
        errors: errors.length > 0 ? errors : null
      }
    } catch (error) {
      console.error('Execute migration error:', error)
      
      // Update migration status to failed
      await db.query(
        `UPDATE tier_migrations
         SET status = 'failed',
             completed_at = NOW(),
             error_message = $1
         WHERE id = $2`,
        [error.message, migrationId]
      )

      throw new Error('Migration failed')
    }
  }

  /**
   * Get migration history
   * @param {string} tierName - Optional tier filter
   * @param {number} limit - Max records to return
   * @returns {Array} Migration records
   */
  static async getMigrationHistory(tierName = null, limit = 50) {
    try {
      let query = `
        SELECT 
          tm.*,
          tp.tier_name,
          tp.version,
          tp.description as preset_description
        FROM tier_migrations tm
        JOIN tier_presets tp ON tp.id = tm.to_preset_id
      `
      const params = []

      if (tierName) {
        query += ` WHERE tp.tier_name = $1`
        params.push(tierName)
        query += ` ORDER BY tm.created_at DESC LIMIT $2`
        params.push(limit)
      } else {
        query += ` ORDER BY tm.created_at DESC LIMIT $1`
        params.push(limit)
      }

      const result = await db.query(query, params)
      return result.rows
    } catch (error) {
      console.error('Get migration history error:', error)
      return []
    }
  }
}

export default TierManagement
