import db from '../config/database.js'

class Instance {
  // Create new instance
  static async create(instanceData) {
    const {
      customerId,
      instanceKey,
      instanceUrl,
      databaseHost = null,
      databaseName = null,
      appVersion = null
    } = instanceData

    const result = await db.query(
      `INSERT INTO instances (
        customer_id, instance_key, instance_url,
        database_host, database_name, app_version, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [customerId, instanceKey, instanceUrl, databaseHost, databaseName, appVersion, 'active']
    )

    return result.rows[0]
  }

  // Find instance by key
  static async findByKey(instanceKey) {
    const result = await db.query(
      `SELECT i.*, c.name as customer_name, c.deployment_type
      FROM instances i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.instance_key = $1`,
      [instanceKey]
    )

    return result.rows[0]
  }

  // Find instances by customer ID
  static async findByCustomerId(customerId) {
    const result = await db.query(
      'SELECT * FROM instances WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    )

    return result.rows
  }

  // Find instance by ID
  static async findById(id) {
    const result = await db.query(
      `SELECT i.*, c.name as customer_name, c.deployment_type
      FROM instances i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1`,
      [id]
    )

    return result.rows[0]
  }

  // Update heartbeat
  static async updateHeartbeat(instanceKey, appVersion = null) {
    const query = appVersion
      ? 'UPDATE instances SET last_heartbeat = NOW(), app_version = $2, updated_at = NOW() WHERE instance_key = $1 RETURNING *'
      : 'UPDATE instances SET last_heartbeat = NOW(), updated_at = NOW() WHERE instance_key = $1 RETURNING *'

    const params = appVersion ? [instanceKey, appVersion] : [instanceKey]

    const result = await db.query(query, params)
    return result.rows[0]
  }

  // Update instance
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
      UPDATE instances 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount + 1}
      RETURNING *
    `

    const result = await db.query(query, values)
    return result.rows[0]
  }

  // Get inactive instances (no heartbeat for N days)
  static async getInactive(days = 7) {
    const result = await db.query(
      `SELECT 
        i.*,
        c.name as customer_name,
        c.contact_email
      FROM instances i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.last_heartbeat < NOW() - INTERVAL '${days} days'
        AND i.status = 'active'
      ORDER BY i.last_heartbeat ASC`
    )

    return result.rows
  }

  // Delete instance
  static async delete(id) {
    const result = await db.query(
      'DELETE FROM instances WHERE id = $1 RETURNING *',
      [id]
    )
    return result.rows[0]
  }
}

export default Instance
