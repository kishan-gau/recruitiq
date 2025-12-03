import db from '../../../shared/database/licenseManagerDb.js'
import { addMonths, isBefore } from 'date-fns'

class License {
  // Create new license
  static async create(licenseData) {
    const {
      customerId,
      instanceId,
      tier,
      maxUsers,
      maxWorkspaces,
      maxJobs,
      maxCandidates,
      features = [],
      expiresAt,
      licenseFile = null
    } = licenseData

    // Generate license key
    const licenseKey = `LIC-${tier.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const result = await db.query(
      `INSERT INTO licenses (
        customer_id, instance_id, license_key, tier,
        max_users, max_workspaces, max_jobs, max_candidates,
        features, expires_at, status, license_file
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        customerId,
        instanceId,
        licenseKey,
        tier,
        maxUsers,
        maxWorkspaces,
        maxJobs,
        maxCandidates,
        JSON.stringify(features),
        expiresAt,
        'active',
        licenseFile ? JSON.stringify(licenseFile) : null
      ]
    )

    return result.rows[0]
  }

  // Find license by key
  static async findByKey(licenseKey) {
    const result = await db.query(
      `SELECT 
        l.*,
        c.name as customer_name,
        c.deployment_type,
        c.status as customer_status
      FROM licenses l
      JOIN customers c ON l.customer_id = c.id
      WHERE l.license_key = $1`,
      [licenseKey]
    )

    return result.rows[0]
  }

  // Find license by customer ID
  static async findByCustomerId(customerId) {
    const result = await db.query(
      `SELECT l.*
      FROM licenses l
      WHERE l.customer_id = $1
      ORDER BY l.created_at DESC`,
      [customerId]
    )

    return result.rows
  }

  // Find license by ID
  static async findById(id) {
    const result = await db.query(
      `SELECT 
        l.*,
        c.name as customer_name,
        c.deployment_type,
        c.instance_key as customer_instance_key,
        c.instance_url as customer_instance_url,
        i.instance_key,
        i.instance_url
      FROM licenses l
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN instances i ON c.id = i.customer_id
      WHERE l.id = $1`,
      [id]
    )

    return result.rows[0]
  }

  // Validate license
  static async validate(licenseKey, instanceKey) {
    const license = await this.findByKey(licenseKey)

    if (!license) {
      return {
        valid: false,
        reason: 'License not found',
        license: null
      }
    }

    // Check if license is active
    if (license.status !== 'active') {
      return {
        valid: false,
        reason: `License is ${license.status}`,
        license
      }
    }

    // Check if customer is active
    if (license.customer_status !== 'active') {
      return {
        valid: false,
        reason: `Customer account is ${license.customer_status}`,
        license
      }
    }

    // Check if instance key matches
    if (license.instance_key !== instanceKey) {
      return {
        valid: false,
        reason: 'License key does not match instance',
        license
      }
    }

    // Check expiration
    const now = new Date()
    const expiresAt = new Date(license.expires_at)
    
    if (isBefore(expiresAt, now)) {
      return {
        valid: false,
        reason: 'License has expired',
        license
      }
    }

    // Check if within grace period (7 days before expiration)
    const gracePeriodStart = addMonths(expiresAt, 0)
    gracePeriodStart.setDate(gracePeriodStart.getDate() - 7)
    
    const withinGracePeriod = isBefore(gracePeriodStart, now) && isBefore(now, expiresAt)

    return {
      valid: true,
      reason: 'License is valid',
      license,
      withinGracePeriod
    }
  }

  // Check if resource limit is exceeded
  static async checkLimit(customerId, resourceType, currentCount) {
    const licenses = await this.findByCustomerId(customerId)
    
    if (licenses.length === 0) {
      return { exceeded: true, limit: 0, current: currentCount }
    }

    const license = licenses[0] // Get most recent license
    const limitField = `max_${resourceType}`
    const limit = license[limitField]

    // NULL means unlimited
    if (limit === null) {
      return { exceeded: false, limit: null, current: currentCount }
    }

    return {
      exceeded: currentCount >= limit,
      limit,
      current: currentCount
    }
  }

  // Check if feature is enabled
  static async hasFeature(customerId, featureName) {
    const licenses = await this.findByCustomerId(customerId)
    
    if (licenses.length === 0) {
      return false
    }

    const license = licenses[0]
    const features = typeof license.features === 'string' 
      ? JSON.parse(license.features) 
      : license.features

    return features.includes(featureName)
  }

  // Renew license
  static async renew(id, months = 12) {
    const license = await this.findById(id)
    
    if (!license) {
      throw new Error('License not found')
    }

    const currentExpiry = new Date(license.expires_at)
    const now = new Date()
    
    // If license has expired, renew from now, otherwise extend from current expiry
    const newExpiry = isBefore(currentExpiry, now)
      ? addMonths(now, months)
      : addMonths(currentExpiry, months)

    const result = await db.query(
      `UPDATE licenses 
      SET expires_at = $1, status = 'active', updated_at = NOW()
      WHERE id = $2
      RETURNING *`,
      [newExpiry, id]
    )

    return result.rows[0]
  }

  // Suspend license
  static async suspend(id) {
    const client = await db.connect()
    
    try {
      await client.query('BEGIN')
      
      // Update license status
      const licenseResult = await client.query(
        `UPDATE licenses 
        SET status = 'suspended', updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
        [id]
      )
      
      const license = licenseResult.rows[0]
      
      // Also update customer status
      if (license) {
        await client.query(
          `UPDATE customers 
          SET status = 'suspended'
          WHERE id = $1`,
          [license.customer_id]
        )
      }
      
      await client.query('COMMIT')
      return license
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // Reactivate license
  static async reactivate(id) {
    const client = await db.connect()
    
    try {
      await client.query('BEGIN')
      
      // Update license status
      const licenseResult = await client.query(
        `UPDATE licenses 
        SET status = 'active', updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
        [id]
      )
      
      const license = licenseResult.rows[0]
      
      // Also update customer status
      if (license) {
        await client.query(
          `UPDATE customers 
          SET status = 'active'
          WHERE id = $1`,
          [license.customer_id]
        )
      }
      
      await client.query('COMMIT')
      return license
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // Update license
  static async update(id, updates) {
    const fields = []
    const values = []
    let paramCount = 0

    // Handle features array separately
    if (updates.features) {
      updates.features = JSON.stringify(updates.features)
    }

    Object.keys(updates).forEach(key => {
      paramCount++
      fields.push(`${key} = $${paramCount}`)
      values.push(updates[key])
    })

    values.push(id)

    const query = `
      UPDATE licenses 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount + 1}
      RETURNING *
    `

    const result = await db.query(query, values)
    return result.rows[0]
  }

  // Get expiring licenses (within N days)
  static async getExpiring(days = 30) {
    const result = await db.query(
      `SELECT 
        l.*,
        c.name as customer_name,
        c.contact_email,
        i.instance_key
      FROM licenses l
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN instances i ON l.instance_id = i.id
      WHERE l.status = 'active'
        AND l.expires_at > NOW()
        AND l.expires_at <= NOW() + INTERVAL '${days} days'
      ORDER BY l.expires_at ASC`
    )

    return result.rows
  }

  // Delete license
  static async delete(id) {
    const result = await db.query(
      'DELETE FROM licenses WHERE id = $1 RETURNING *',
      [id]
    )
    return result.rows[0]
  }
}

export default License
