/**
 * VPS Manager Service
 * Manages VPS pool, capacity tracking, and organization assignments
 */

import { query as dbQuery } from '../config/database.js';

class VPSManager {
  /**
   * Register a new VPS in the system
   */
  async registerVPS(vpsData) {
    const {
      vpsName,
      vpsIp,
      hostname,
      deploymentType,
      organizationId = null,
      location,
      cpuCores,
      memoryMb,
      diskGb,
      maxTenants = 20,
      notes = null
    } = vpsData;

    const result = await dbQuery(
      `INSERT INTO vps_instances (
        vps_name, vps_ip, hostname, deployment_type, organization_id,
        location, cpu_cores, memory_mb, disk_gb, max_tenants, status, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11)
      RETURNING *`,
      [
        vpsName, vpsIp, hostname, deploymentType, organizationId,
        location, cpuCores, memoryMb, diskGb, maxTenants, notes
      ]
    );

    logger.info(`✅ VPS registered: ${vpsName}`);
    return result.rows[0];
  }

  /**
   * Get all available shared VPS instances
   */
  async getAvailableSharedVPS() {
    const result = await dbQuery(
      `SELECT 
        v.*,
        v.current_tenants as tenant_count,
        (v.max_tenants - v.current_tenants) as available_slots,
        COALESCE(v.cpu_usage_percent, 0) as cpu_usage_percent,
        COALESCE(v.memory_usage_percent, 0) as memory_usage_percent
       FROM vps_instances v
       WHERE v.deployment_type = 'shared'
         AND v.status = 'active'
         AND v.current_tenants < v.max_tenants
       ORDER BY v.current_tenants ASC, v.cpu_usage_percent ASC`
    );

    return result.rows;
  }

  /**
   * Get all VPS instances (for management UI)
   */
  async getAllVPS() {
    const result = await dbQuery(
      `SELECT 
        v.*,
        v.current_tenants as tenant_count,
        (v.max_tenants - v.current_tenants) as available_slots,
        o.name as dedicated_org_name,
        o.slug as dedicated_org_slug
       FROM vps_instances v
       LEFT JOIN organizations o ON v.organization_id = o.id
       ORDER BY v.deployment_type, v.created_at DESC`
    );

    return result.rows;
  }

  /**
   * Get VPS with least load (for automatic assignment)
   */
  async getOptimalSharedVPS() {
    const result = await dbQuery(
      `SELECT *
       FROM vps_instances
       WHERE deployment_type = 'shared'
         AND status = 'active'
         AND current_tenants < max_tenants
       ORDER BY 
         current_tenants ASC,
         COALESCE(cpu_usage_percent, 0) ASC,
         COALESCE(memory_usage_percent, 0) ASC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      throw new Error('No available shared VPS instances. Please add more capacity.');
    }

    return result.rows[0];
  }

  /**
   * Get VPS details by ID
   */
  async getVPSById(vpsId) {
    const result = await dbQuery(
      `SELECT v.*, 
        COUNT(o.id) as actual_tenant_count,
        array_agg(
          CASE WHEN o.id IS NOT NULL 
          THEN json_build_object('id', o.id, 'name', o.name, 'slug', o.slug, 'tier', o.tier) 
          END
        ) FILTER (WHERE o.id IS NOT NULL) as tenants
       FROM vps_instances v
       LEFT JOIN organizations o ON o.vps_id = v.id
       WHERE v.id = $1
       GROUP BY v.id`,
      [vpsId]
    );

    if (result.rows.length === 0) {
      throw new Error('VPS not found');
    }

    return result.rows[0];
  }

  /**
   * Assign organization to VPS
   */
  async assignOrganizationToVPS(organizationId, vpsId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get VPS details
      const vpsResult = await client.query(
        'SELECT * FROM vps_instances WHERE id = $1 FOR UPDATE',
        [vpsId]
      );

      if (vpsResult.rows.length === 0) {
        throw new Error('VPS not found');
      }

      const vps = vpsResult.rows[0];

      // Check capacity (for shared VPS)
      if (vps.deployment_type === 'shared' && vps.current_tenants >= vps.max_tenants) {
        throw new Error(`VPS ${vps.vps_name} is at capacity (${vps.current_tenants}/${vps.max_tenants})`);
      }

      // Update organization
      await client.query(
        'UPDATE organizations SET vps_id = $1, updated_at = NOW() WHERE id = $2',
        [vpsId, organizationId]
      );

      // Increment tenant count
      await client.query(
        'UPDATE vps_instances SET current_tenants = current_tenants + 1, updated_at = NOW() WHERE id = $1',
        [vpsId]
      );

      await client.query('COMMIT');
      
      logger.info(`✅ Organization ${organizationId} assigned to VPS ${vps.vps_name}`);
      
      return vps;

    } catch (_error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove organization from VPS
   */
  async removeOrganizationFromVPS(organizationId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current VPS
      const orgResult = await client.query(
        'SELECT vps_id FROM organizations WHERE id = $1',
        [organizationId]
      );

      if (orgResult.rows.length === 0 || !orgResult.rows[0].vps_id) {
        throw new Error('Organization not assigned to any VPS');
      }

      const vpsId = orgResult.rows[0].vps_id;

      // Remove assignment
      await client.query(
        'UPDATE organizations SET vps_id = NULL, updated_at = NOW() WHERE id = $1',
        [organizationId]
      );

      // Decrement tenant count
      await client.query(
        'UPDATE vps_instances SET current_tenants = GREATEST(current_tenants - 1, 0), updated_at = NOW() WHERE id = $1',
        [vpsId]
      );

      await client.query('COMMIT');
      
      logger.info(`✅ Organization ${organizationId} removed from VPS`);

    } catch (_error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update VPS health metrics
   */
  async updateVPSHealth(vpsId, metrics) {
    await dbQuery(
      `UPDATE vps_instances 
       SET cpu_usage_percent = $1,
           memory_usage_percent = $2,
           disk_usage_percent = $3,
           last_health_check = NOW(),
           updated_at = NOW()
       WHERE id = $4`,
      [metrics.cpu, metrics.memory, metrics.disk, vpsId]
    );
  }

  /**
   * Update VPS status
   */
  async updateVPSStatus(vpsId, status, notes = null) {
    await dbQuery(
      `UPDATE vps_instances 
       SET status = $1,
           notes = COALESCE($2, notes),
           updated_at = NOW()
       WHERE id = $3`,
      [status, notes, vpsId]
    );
  }

  /**
   * Get VPS statistics
   */
  async getVPSStatistics() {
    const result = await dbQuery(
      `SELECT 
        COUNT(*) as total_vps,
        SUM(CASE WHEN deployment_type = 'shared' THEN 1 ELSE 0 END) as shared_vps,
        SUM(CASE WHEN deployment_type = 'dedicated' THEN 1 ELSE 0 END) as dedicated_vps,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_vps,
        SUM(current_tenants) as total_tenants,
        SUM(max_tenants) as total_capacity,
        AVG(COALESCE(cpu_usage_percent, 0)) as avg_cpu_usage,
        AVG(COALESCE(memory_usage_percent, 0)) as avg_memory_usage,
        AVG(COALESCE(disk_usage_percent, 0)) as avg_disk_usage
       FROM vps_instances
       WHERE status = 'active'`
    );

    return result.rows[0];
  }

  /**
   * Decommission VPS (soft delete)
   */
  async decommissionVPS(vpsId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if any organizations are still assigned
      const tenantsResult = await client.query(
        'SELECT COUNT(*) as count FROM organizations WHERE vps_id = $1',
        [vpsId]
      );

      if (parseInt(tenantsResult.rows[0].count) > 0) {
        throw new Error('Cannot decommission VPS with active tenants. Please migrate them first.');
      }

      // Update status to decommissioned
      await client.query(
        `UPDATE vps_instances 
         SET status = 'decommissioned', updated_at = NOW()
         WHERE id = $1`,
        [vpsId]
      );

      await client.query('COMMIT');
      
      logger.info(`✅ VPS ${vpsId} decommissioned`);

    } catch (_error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new VPSManager();
