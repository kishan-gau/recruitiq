import Customer from '../models/Customer.js'
import License from '../models/License.js'
import UsageEvent from '../models/UsageEvent.js'
import AdminUser from '../models/AdminUser.js'
import db from '../../../shared/database/licenseManagerDb.js'
import { addMonths, subDays, format } from 'date-fns'

export const adminController = {
  // Dashboard metrics
  getDashboard: async (req, res) => {
    try {
      // Get total customers by status
      const customerStats = await db.query(`
        SELECT status, COUNT(*) as count
        FROM customers
        GROUP BY status
      `)

      // Get license stats
      const licenseStats = await db.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE expires_at < NOW()) as expired,
          COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days') as expiring_soon
        FROM licenses
      `)

      // Calculate MRR (assuming monthly billing)
      const mrrResult = await db.query(`
        SELECT 
          SUM(CASE 
            WHEN l.tier = 'starter' THEN 99
            WHEN l.tier = 'professional' THEN 299
            WHEN l.tier = 'enterprise' THEN 999
            ELSE 0
          END) as mrr
        FROM licenses l
        JOIN customers c ON l.customer_id = c.id
        WHERE l.status = 'active' AND c.status = 'active'
      `)

      // Get upcoming renewals
      const upcomingRenewals = await db.query(`
        SELECT 
          c.id,
          c.name,
          c.contact_email,
          l.tier,
          l.expires_at,
          EXTRACT(DAY FROM (l.expires_at - NOW())) as days_until_expiry
        FROM licenses l
        JOIN customers c ON l.customer_id = c.id
        WHERE l.status = 'active'
          AND l.expires_at > NOW()
          AND l.expires_at <= NOW() + INTERVAL '60 days'
        ORDER BY l.expires_at ASC
        LIMIT 10
      `)

      // Get recent activity
      const recentActivity = await UsageEvent.getRecentActivity(20)

      const totalCustomers = customerStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
      const activeCustomers = customerStats.rows.find(r => r.status === 'active')?.count || 0

      res.json({
        metrics: {
          totalCustomers,
          activeCustomers,
          activeLicenses: parseInt(licenseStats.rows[0].active) || 0,
          expiredLicenses: parseInt(licenseStats.rows[0].expired) || 0,
          expiringLicenses: parseInt(licenseStats.rows[0].expiring_soon) || 0,
          mrr: parseFloat(mrrResult.rows[0].mrr) || 0,
          arr: (parseFloat(mrrResult.rows[0].mrr) || 0) * 12
        },
        upcomingRenewals: upcomingRenewals.rows,
        recentActivity: recentActivity.map(event => ({
          id: event.id,
          customerName: event.customer_name,
          instanceKey: event.instance_key,
          eventType: event.event_type,
          timestamp: event.timestamp
        }))
      })
    } catch (_error) {
      console.error('Dashboard error:', error)
      res.status(500).json({ error: 'Failed to fetch dashboard data' })
    }
  },

  // Login
  login: async (req, res) => {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' })
      }

      const user = await AdminUser.verifyPassword(email, password)

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }

      // Generate token
      const { generateToken } = await import('../middleware/auth')
      const token = generateToken(user)

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      })
    } catch (_error) {
      console.error('Login error:', error)
      res.status(500).json({ error: 'Login failed' })
    }
  },

  // Get current admin user
  getMe: async (req, res) => {
    res.json({ user: req.user })
  },

  // Get all admin users
  getAdminUsers: async (req, res) => {
    try {
      const users = await AdminUser.findAll()
      res.json({ users })
    } catch (_error) {
      console.error('Get admin users error:', error)
      res.status(500).json({ error: 'Failed to fetch admin users' })
    }
  },

  // Create admin user
  createAdminUser: async (req, res) => {
    try {
      const { email, password, name, role } = req.body

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name required' })
      }

      const user = await AdminUser.create({ email, password, name, role })
      res.status(201).json({ user })
    } catch (_error) {
      console.error('Create admin user error:', error)
      res.status(500).json({ error: 'Failed to create admin user' })
    }
  },

  // Update admin user
  updateAdminUser: async (req, res) => {
    try {
      const { id } = req.params
      const updates = req.body

      const user = await AdminUser.update(id, updates)
      
      if (!user) {
        return res.status(404).json({ error: 'Admin user not found' })
      }

      res.json({ user })
    } catch (_error) {
      console.error('Update admin user error:', error)
      res.status(500).json({ error: 'Failed to update admin user' })
    }
  },

  // Delete admin user
  deleteAdminUser: async (req, res) => {
    try {
      const { id } = req.params

      // Prevent deleting yourself
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' })
      }

      const user = await AdminUser.delete(id)
      
      if (!user) {
        return res.status(404).json({ error: 'Admin user not found' })
      }

      res.json({ message: 'Admin user deleted', user })
    } catch (_error) {
      console.error('Delete admin user error:', error)
      res.status(500).json({ error: 'Failed to delete admin user' })
    }
  },

  // Get audit log
  getAuditLog: async (req, res) => {
    try {
      const { limit = 100, offset = 0, adminUserId, action, entityType } = req.query

      let query = `
        SELECT 
          a.*,
          u.email as admin_email,
          u.name as admin_name
        FROM audit_log a
        JOIN admin_users u ON a.admin_user_id = u.id
        WHERE 1=1
      `

      const params = []
      let paramCount = 0

      if (adminUserId) {
        paramCount++
        query += ` AND a.admin_user_id = $${paramCount}`
        params.push(adminUserId)
      }

      if (action) {
        paramCount++
        query += ` AND a.action = $${paramCount}`
        params.push(action)
      }

      if (entityType) {
        paramCount++
        query += ` AND a.entity_type = $${paramCount}`
        params.push(entityType)
      }

      query += ` ORDER BY a.timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      const result = await db.query(query, params)

      res.json({ logs: result.rows })
    } catch (_error) {
      console.error('Get audit log error:', error)
      res.status(500).json({ error: 'Failed to fetch audit log' })
    }
  }
}
