import db from '../../../shared/database/licenseManagerDb.js'

class Customer {
  // Create new customer
  static async create(customerData) {
    const {
      name,
      contactEmail,
      contactName,
      deploymentType,
      contractStartDate,
      contractEndDate,
      tier,
      maxUsers,
      maxWorkspaces,
      maxJobs,
      maxCandidates,
      features = []
    } = customerData

    const client = await db.connect()
    
    try {
      await client.query('BEGIN')

      // Create customer
      const customerResult = await client.query(
        `INSERT INTO customers (
          name, contact_email, contact_name, deployment_type,
          contract_start_date, contract_end_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [name, contactEmail, contactName, deploymentType, contractStartDate, contractEndDate, 'active']
      )

      const customer = customerResult.rows[0]

      // Create instance
      const instanceKey = name.toLowerCase().replace(/\s+/g, '-') + '-prod'
      const instanceResult = await client.query(
        `INSERT INTO instances (
          customer_id, instance_key, instance_url, status
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [customer.id, instanceKey, customerData.instanceUrl || '', 'active']
      )

      const instance = instanceResult.rows[0]

      // Create license
      const licenseKey = `LIC-${instanceKey}-${Date.now()}`
      const licenseResult = await client.query(
        `INSERT INTO licenses (
          customer_id, instance_id, license_key, tier,
          max_users, max_workspaces, max_jobs, max_candidates,
          features, expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          customer.id,
          instance.id,
          licenseKey,
          tier,
          maxUsers,
          maxWorkspaces,
          maxJobs,
          maxCandidates,
          JSON.stringify(features),
          contractEndDate,
          'active'
        ]
      )

      await client.query('COMMIT')

      return {
        ...customer,
        instance,
        license: licenseResult.rows[0]
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // Get all customers with filters
  static async findAll(filters = {}) {
    let query = `
      SELECT 
        c.*,
        i.instance_key,
        i.instance_url,
        i.last_heartbeat,
        i.app_version,
        l.tier,
        l.license_key,
        l.max_users,
        l.max_workspaces,
        l.max_jobs,
        l.max_candidates,
        l.expires_at as license_expires_at
      FROM customers c
      LEFT JOIN instances i ON c.id = i.customer_id
      LEFT JOIN licenses l ON c.id = l.customer_id
      WHERE 1=1
    `

    const params = []
    let paramCount = 0

    if (filters.tier) {
      paramCount++
      query += ` AND l.tier = $${paramCount}`
      params.push(filters.tier)
    }

    if (filters.status) {
      paramCount++
      query += ` AND c.status = $${paramCount}`
      params.push(filters.status)
    }

    if (filters.deploymentType) {
      paramCount++
      query += ` AND c.deployment_type = $${paramCount}`
      params.push(filters.deploymentType)
    }

    if (filters.search) {
      paramCount++
      query += ` AND (c.name ILIKE $${paramCount} OR c.contact_email ILIKE $${paramCount} OR i.instance_key ILIKE $${paramCount})`
      params.push(`%${filters.search}%`)
    }

    query += ` ORDER BY c.created_at DESC`

    const result = await db.query(query, params)
    return result.rows
  }

  // Get customer by ID
  static async findById(id) {
    const result = await db.query(
      `SELECT 
        c.*,
        i.id as instance_id,
        i.instance_key,
        i.instance_url,
        i.last_heartbeat,
        i.app_version,
        i.database_host,
        i.database_name,
        l.id as license_id,
        l.tier,
        l.license_key,
        l.max_users,
        l.max_workspaces,
        l.max_jobs,
        l.max_candidates,
        l.features,
        l.expires_at as license_expires_at,
        l.status as license_status
      FROM customers c
      LEFT JOIN instances i ON c.id = i.customer_id
      LEFT JOIN licenses l ON c.id = l.customer_id
      WHERE c.id = $1`,
      [id]
    )

    return result.rows[0]
  }

  // Update customer
  static async update(id, updates) {
    const fields = []
    const values = []
    let paramCount = 0

    Object.keys(updates).forEach(key => {
      paramCount++
      fields.push(`${key} = $${paramCount}`)
      values.push(updates[key])
    })

    values.push(id)

    const query = `
      UPDATE customers 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING *
    `

    const result = await db.query(query, values)
    return result.rows[0]
  }

  // Delete customer (cascades to instances, licenses, usage_events)
  static async delete(id) {
    const result = await db.query(
      'DELETE FROM customers WHERE id = $1 RETURNING *',
      [id]
    )
    return result.rows[0]
  }

  // Get customer usage stats
  static async getUsageStats(id, days = 30) {
    const result = await db.query(
      `SELECT 
        MAX(user_count) as max_users,
        MAX(workspace_count) as max_workspaces,
        MAX(job_count) as max_jobs,
        MAX(candidate_count) as max_candidates,
        COUNT(DISTINCT DATE(timestamp)) as active_days,
        COUNT(*) as total_events
      FROM usage_events
      WHERE customer_id = $1
        AND timestamp > NOW() - INTERVAL '${days} days'`,
      [id]
    )

    return result.rows[0]
  }

  // Get customer activity log
  static async getActivity(id, limit = 10) {
    const result = await db.query(
      `SELECT 
        event_type,
        event_data,
        timestamp
      FROM usage_events
      WHERE customer_id = $1
      ORDER BY timestamp DESC
      LIMIT $2`,
      [id, limit]
    )

    return result.rows
  }
}

export default Customer
