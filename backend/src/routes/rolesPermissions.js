/**
 * Roles and Permissions Management Routes
 */

import express from 'express';
import { authenticate, requirePlatformUser, requirePermission } from '../middleware/auth.js';
import pool from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

// All routes require platform user authentication
router.use(authenticate);
router.use(requirePlatformUser);

// ============================================================================
// ROLES MANAGEMENT
// ============================================================================

/**
 * GET /api/portal/roles
 * Get all roles
 */
router.get('/roles', requirePermission('portal.view'), async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id,
        r.name,
        r.display_name,
        r.description,
        r.role_type,
        r.level,
        r.created_at,
        r.updated_at,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT rp.permission_id) as permission_count,
        array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permissions
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id AND u.deleted_at IS NULL
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id
      ORDER BY r.level DESC, r.name
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      roles: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch roles', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles'
    });
  }
});

/**
 * GET /api/portal/roles/:id
 * Get role details
 */
router.get('/roles/:id', requirePermission('portal.view'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        r.*,
        array_agg(DISTINCT p.id) FILTER (WHERE p.id IS NOT NULL) as permission_ids,
        array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.id = $1
      GROUP BY r.id
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }
    
    res.json({
      success: true,
      role: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to fetch role', { error: error.message, roleId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch role'
    });
  }
});

/**
 * POST /api/portal/roles
 * Create a new role
 */
router.post('/roles', requirePermission('portal.manage'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { name, display_name, description, role_type, level, permissions } = req.body;
    
    if (!name || !display_name || !role_type) {
      return res.status(400).json({
        success: false,
        error: 'Name, display_name, and role_type are required'
      });
    }
    
    await client.query('BEGIN');
    
    // Create role
    const roleResult = await client.query(
      `INSERT INTO roles (name, display_name, description, role_type, level)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, display_name, description, role_type, level || 0]
    );
    
    const role = roleResult.rows[0];
    
    // Add permissions if provided
    if (permissions && permissions.length > 0) {
      const permResult = await client.query(
        'SELECT id FROM permissions WHERE name = ANY($1)',
        [permissions]
      );
      
      for (const perm of permResult.rows) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [role.id, perm.id]
        );
      }
    }
    
    await client.query('COMMIT');
    
    logger.info('Role created', {
      roleId: role.id,
      roleName: role.name,
      createdBy: req.user.id
    });
    
    res.json({
      success: true,
      role
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create role', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create role'
    });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/portal/roles/:id
 * Update role
 */
router.put('/roles/:id', requirePermission('portal.manage'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { display_name, description, level, permissions } = req.body;
    
    await client.query('BEGIN');
    
    // Update role details
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (display_name) {
      updates.push(`display_name = $${paramIndex}`);
      values.push(display_name);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    
    if (level !== undefined) {
      updates.push(`level = $${paramIndex}`);
      values.push(level);
      paramIndex++;
    }
    
    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(id);
      
      await client.query(
        `UPDATE roles SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        values
      );
    }
    
    // Update permissions if provided
    if (permissions) {
      // Remove existing permissions
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
      
      // Add new permissions
      if (permissions.length > 0) {
        const permResult = await client.query(
          'SELECT id FROM permissions WHERE name = ANY($1)',
          [permissions]
        );
        
        for (const perm of permResult.rows) {
          await client.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [id, perm.id]
          );
        }
      }
    }
    
    await client.query('COMMIT');
    
    logger.info('Role updated', {
      roleId: id,
      updatedBy: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Role updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to update role', { error: error.message, roleId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update role'
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/portal/roles/:id
 * Delete role
 */
router.delete('/roles/:id', requirePermission('portal.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if role is in use
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role_id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete role that is assigned to users'
      });
    }
    
    await pool.query('DELETE FROM roles WHERE id = $1', [id]);
    
    logger.warn('Role deleted', {
      roleId: id,
      deletedBy: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete role', { error: error.message, roleId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete role'
    });
  }
});

// ============================================================================
// PERMISSIONS MANAGEMENT
// ============================================================================

/**
 * GET /api/portal/permissions
 * Get all permissions
 */
router.get('/permissions', requirePermission('portal.view'), async (req, res) => {
  try {
    const query = `
      SELECT 
        p.*,
        COUNT(DISTINCT rp.role_id) as role_count,
        array_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id
      GROUP BY p.id
      ORDER BY p.category, p.name
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      permissions: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch permissions', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions'
    });
  }
});

/**
 * POST /api/portal/permissions
 * Create a new permission
 */
router.post('/permissions', requirePermission('portal.manage'), async (req, res) => {
  try {
    const { name, category, description } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name and category are required'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO permissions (name, category, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, category, description]
    );
    
    logger.info('Permission created', {
      permissionId: result.rows[0].id,
      permissionName: name,
      createdBy: req.user.id
    });
    
    res.json({
      success: true,
      permission: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to create permission', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create permission'
    });
  }
});

/**
 * PUT /api/portal/permissions/:id
 * Update permission
 */
router.put('/permissions/:id', requirePermission('portal.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    const { category, description } = req.body;
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (category) {
      updates.push(`category = $${paramIndex}`);
      values.push(category);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    values.push(id);
    
    const result = await pool.query(
      `UPDATE permissions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Permission not found'
      });
    }
    
    logger.info('Permission updated', {
      permissionId: id,
      updatedBy: req.user.id
    });
    
    res.json({
      success: true,
      permission: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to update permission', { error: error.message, permissionId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to update permission'
    });
  }
});

/**
 * DELETE /api/portal/permissions/:id
 * Delete permission
 */
router.delete('/permissions/:id', requirePermission('portal.manage'), async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM permissions WHERE id = $1', [id]);
    
    logger.warn('Permission deleted', {
      permissionId: id,
      deletedBy: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete permission', { error: error.message, permissionId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete permission'
    });
  }
});

export default router;
