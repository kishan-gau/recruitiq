import db from '../../../shared/database/licenseManagerDb.js'
import bcrypt from 'bcryptjs'

class AdminUser {
  // Create new admin user
  static async create(userData) {
    const { email, password, name, role = 'admin' } = userData

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const result = await db.query(
      `INSERT INTO admin_users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, role, created_at`,
      [email, passwordHash, name, role]
    )

    return result.rows[0]
  }

  // Find admin by email
  static async findByEmail(email) {
    const result = await db.query(
      'SELECT * FROM admin_users WHERE email = $1',
      [email]
    )

    return result.rows[0]
  }

  // Find admin by ID
  static async findById(id) {
    const result = await db.query(
      'SELECT id, email, name, role, last_login_at, created_at FROM admin_users WHERE id = $1',
      [id]
    )

    return result.rows[0]
  }

  // Get all admin users
  static async findAll() {
    const result = await db.query(
      'SELECT id, email, name, role, last_login_at, created_at FROM admin_users ORDER BY created_at DESC'
    )

    return result.rows
  }

  // Verify password
  static async verifyPassword(email, password) {
    const user = await this.findByEmail(email)
    
    if (!user) {
      return null
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)
    
    if (!isMatch) {
      return null
    }

    // Update last login
    await db.query(
      'UPDATE admin_users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    )

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  // Update admin user
  static async update(id, updates) {
    const fields = []
    const values = []
    let paramCount = 0

    // Hash password if provided
    if (updates.password) {
      const salt = await bcrypt.genSalt(10)
      updates.password_hash = await bcrypt.hash(updates.password, salt)
      delete updates.password
    }

    Object.keys(updates).forEach(key => {
      paramCount++
      fields.push(`${key} = $${paramCount}`)
      values.push(updates[key])
    })

    values.push(id)

    const query = `
      UPDATE admin_users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING id, email, name, role, last_login_at, created_at
    `

    const result = await db.query(query, values)
    return result.rows[0]
  }

  // Delete admin user
  static async delete(id) {
    const result = await db.query(
      'DELETE FROM admin_users WHERE id = $1 RETURNING id, email, name',
      [id]
    )
    return result.rows[0]
  }
}

export default AdminUser
