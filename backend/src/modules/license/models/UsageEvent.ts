import db from '../../../shared/database/licenseManagerDb.js'

class UsageEvent {
  // Record a usage event
  static async create(eventPayload) {
    const {
      customerId,
      instanceId,
      eventType,
      eventData = {},
      usersCount = null,
      workspacesCount = null,
      jobsCount = null,
      candidatesCount = null
    } = eventPayload

    const result = await db.query(
      `INSERT INTO usage_events (
        customer_id, instance_key, event_type, event_data,
        users_count, workspaces_count, jobs_count, candidates_count,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        customerId,
        instanceId,
        eventType,
        JSON.stringify(eventData),
        usersCount,
        workspacesCount,
        jobsCount,
        candidatesCount
      ]
    )

    return result.rows[0]
  }

  // Get events by customer ID
  static async findByCustomerId(customerId: string, filters: { eventType?: string; since?: Date | string; until?: Date | string; limit?: number } = {}) {
    let query = 'SELECT * FROM usage_events WHERE customer_id = $1'
    const params = [customerId]
    let paramCount = 1

    if (filters.eventType) {
      paramCount++
      query += ` AND event_type = $${paramCount}`
      params.push(filters.eventType)
    }

    if (filters.since) {
      paramCount++
      query += ` AND timestamp >= $${paramCount}`
      params.push(filters.since)
    }

    if (filters.until) {
      paramCount++
      query += ` AND timestamp <= $${paramCount}`
      params.push(filters.until)
    }

    query += ' ORDER BY timestamp DESC'

    if (filters.limit) {
      paramCount++
      query += ` LIMIT $${paramCount}`
      params.push(filters.limit)
    }

    const result = await db.query(query, params)
    return result.rows
  }

  // Get events by instance ID
  static async findByInstanceId(instanceId, limit = 100) {
    const result = await db.query(
      `SELECT * FROM usage_events 
      WHERE instance_key = $1 
      ORDER BY timestamp DESC 
      LIMIT $2`,
      [instanceId, limit]
    )

    return result.rows
  }

  // Get current resource counts for a customer
  static async getCurrentCounts(customerId) {
    const result = await db.query(
      `SELECT 
        users_count,
        workspaces_count,
        jobs_count,
        candidates_count,
        timestamp
      FROM usage_events
      WHERE customer_id = $1
        AND users_count IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT 1`,
      [customerId]
    )

    return result.rows[0] || {
      users_count: 0,
      workspaces_count: 0,
      jobs_count: 0,
      candidates_count: 0
    }
  }

  // Get usage summary for a customer over a period
  static async getSummary(customerId, days = 30) {
    const result = await db.query(
      `SELECT 
        event_type,
        COUNT(*) as event_count,
        MAX(users_count) as peak_users,
        MAX(workspaces_count) as peak_workspaces,
        MAX(jobs_count) as peak_jobs,
        MAX(candidates_count) as peak_candidates,
        MIN(timestamp) as first_event,
        MAX(timestamp) as last_event
      FROM usage_events
      WHERE customer_id = $1
        AND timestamp > NOW() - INTERVAL '${days} days'
      GROUP BY event_type
      ORDER BY event_count DESC`,
      [customerId]
    )

    return result.rows
  }

  // Get usage trends (daily aggregates)
  static async getTrends(customerId, days = 30) {
    const result = await db.query(
      `SELECT 
        DATE(timestamp) as date,
        MAX(users_count) as max_users,
        MAX(workspaces_count) as max_workspaces,
        MAX(jobs_count) as max_jobs,
        MAX(candidates_count) as max_candidates,
        COUNT(*) as total_events
      FROM usage_events
      WHERE customer_id = $1
        AND timestamp > NOW() - INTERVAL '${days} days'
        AND users_count IS NOT NULL
      GROUP BY DATE(timestamp)
      ORDER BY date DESC`,
      [customerId]
    )

    return result.rows
  }

  // Get all recent activity across all customers
  static async getRecentActivity(limit = 50) {
    const result = await db.query(
      `SELECT 
        e.*,
        c.name as customer_name,
        e.instance_key
      FROM usage_events e
      JOIN customers c ON e.customer_id = c.id
      ORDER BY e.timestamp DESC
      LIMIT $1`,
      [limit]
    )

    return result.rows
  }

  // Delete old events (cleanup)
  static async deleteOlderThan(days) {
    const result = await db.query(
      `DELETE FROM usage_events 
      WHERE timestamp < NOW() - INTERVAL '${days} days'
      RETURNING COUNT(*)`
    )

    return result.rowCount
  }
}

export default UsageEvent
