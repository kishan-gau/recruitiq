import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection.js';

/**
 * TransipVpsInventory Model
 * Manages inventory of all VPS instances
 */
class TransipVpsInventory {
  /**
   * Create or update VPS inventory entry
   * @param {Object} vpsData - VPS data
   * @returns {Promise<Object>} Created/updated VPS entry
   */
  static async upsert(vpsData) {
    const {
      vpsName,
      provisionRequestId = null,
      productName,
      region,
      operatingSystem = null,
      ipAddress = null,
      ipv6Address = null,
      customerId = null,
      customerName = null,
      organizationId = null,
      instanceId = null,
      status,
      isLocked = false,
      isBlocked = false,
      hostname = null,
      domain = null,
      fqdn = null,
      cpuCores = null,
      memoryMb = null,
      diskGb = null,
      hasSnapshots = false,
      snapshotCount = 0,
      lastSnapshotAt = null,
      monthlyCost = null,
      currency = 'EUR',
      billingCycle = 'monthly',
      provisionedAt = null,
      tags = [],
      metadata = {},
    } = vpsData;

    const query = `
      INSERT INTO deployment.transip_vps_inventory (
        id, vps_name, provision_request_id, product_name, region,
        operating_system, ip_address, ipv6_address, customer_id, customer_name,
        organization_id, instance_id, status, is_locked, is_blocked,
        hostname, domain, fqdn, cpu_cores, memory_mb, disk_gb,
        has_snapshots, snapshot_count, last_snapshot_at,
        monthly_cost, currency, billing_cycle, provisioned_at,
        tags, metadata, last_synced_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, CURRENT_TIMESTAMP
      )
      ON CONFLICT (vps_name) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        region = EXCLUDED.region,
        operating_system = EXCLUDED.operating_system,
        ip_address = EXCLUDED.ip_address,
        ipv6_address = EXCLUDED.ipv6_address,
        status = EXCLUDED.status,
        is_locked = EXCLUDED.is_locked,
        is_blocked = EXCLUDED.is_blocked,
        hostname = EXCLUDED.hostname,
        domain = EXCLUDED.domain,
        fqdn = EXCLUDED.fqdn,
        cpu_cores = EXCLUDED.cpu_cores,
        memory_mb = EXCLUDED.memory_mb,
        disk_gb = EXCLUDED.disk_gb,
        has_snapshots = EXCLUDED.has_snapshots,
        snapshot_count = EXCLUDED.snapshot_count,
        last_snapshot_at = EXCLUDED.last_snapshot_at,
        monthly_cost = EXCLUDED.monthly_cost,
        tags = EXCLUDED.tags,
        metadata = EXCLUDED.metadata,
        last_synced_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      uuidv4(),
      vpsName,
      provisionRequestId,
      productName,
      region,
      operatingSystem,
      ipAddress,
      ipv6Address,
      customerId,
      customerName,
      organizationId,
      instanceId,
      status,
      isLocked,
      isBlocked,
      hostname,
      domain,
      fqdn,
      cpuCores,
      memoryMb,
      diskGb,
      hasSnapshots,
      snapshotCount,
      lastSnapshotAt,
      monthlyCost,
      currency,
      billingCycle,
      provisionedAt,
      JSON.stringify(tags),
      JSON.stringify(metadata),
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get VPS by name
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object|null>} VPS or null
   */
  static async findByName(vpsName) {
    const query = `
      SELECT * FROM deployment.transip_vps_inventory
      WHERE vps_name = $1 AND deleted_at IS NULL
    `;
    const result = await db.query(query, [vpsName]);
    return result.rows[0] || null;
  }

  /**
   * Get VPS by ID
   * @param {string} id - VPS ID
   * @returns {Promise<Object|null>} VPS or null
   */
  static async findById(id) {
    const query = `
      SELECT * FROM deployment.transip_vps_inventory
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * List VPS instances
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of VPS instances
   */
  static async list(filters = {}) {
    const {
      status = null,
      customerId = null,
      organizationId = null,
      region = null,
      limit = 100,
      offset = 0,
    } = filters;

    let query = `
      SELECT * FROM deployment.transip_vps_inventory
      WHERE deleted_at IS NULL
    `;
    const values = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(status);
    }

    if (customerId) {
      paramCount++;
      query += ` AND customer_id = $${paramCount}`;
      values.push(customerId);
    }

    if (organizationId) {
      paramCount++;
      query += ` AND organization_id = $${paramCount}`;
      values.push(organizationId);
    }

    if (region) {
      paramCount++;
      query += ` AND region = $${paramCount}`;
      values.push(region);
    }

    query += ' ORDER BY provisioned_at DESC';

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const result = await db.query(query, values);
    return result.rows;
  }

  /**
   * Get active VPS summary
   * @returns {Promise<Array>} Active VPS instances
   */
  static async getActiveSummary() {
    const query = 'SELECT * FROM deployment.active_vps_summary';
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Update VPS status
   * @param {string} vpsName - VPS name
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated VPS
   */
  static async updateStatus(vpsName, status) {
    const query = `
      UPDATE deployment.transip_vps_inventory
      SET 
        status = $1,
        last_synced_at = CURRENT_TIMESTAMP
      WHERE vps_name = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await db.query(query, [status, vpsName]);
    return result.rows[0] || null;
  }

  /**
   * Update snapshot information
   * @param {string} vpsName - VPS name
   * @param {number} snapshotCount - Number of snapshots
   * @returns {Promise<Object>} Updated VPS
   */
  static async updateSnapshots(vpsName, snapshotCount) {
    const query = `
      UPDATE deployment.transip_vps_inventory
      SET 
        has_snapshots = $1,
        snapshot_count = $2,
        last_snapshot_at = CURRENT_TIMESTAMP,
        last_synced_at = CURRENT_TIMESTAMP
      WHERE vps_name = $3 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await db.query(query, [
      snapshotCount > 0,
      snapshotCount,
      vpsName,
    ]);
    return result.rows[0] || null;
  }

  /**
   * Soft delete VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Deleted VPS
   */
  static async softDelete(vpsName) {
    const query = `
      UPDATE deployment.transip_vps_inventory
      SET 
        deleted_at = CURRENT_TIMESTAMP,
        status = 'unknown'
      WHERE vps_name = $1 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await db.query(query, [vpsName]);
    return result.rows[0] || null;
  }

  /**
   * Sync VPS from TransIP API data
   * @param {Object} transipData - Data from TransIP API
   * @returns {Promise<Object>} Synced VPS
   */
  static async syncFromTransip(transipData) {
    const vpsData = {
      vpsName: transipData.name,
      productName: transipData.productName || 'unknown',
      region: transipData.availabilityZone || 'unknown',
      operatingSystem: transipData.operatingSystem,
      ipAddress: transipData.ipAddress,
      ipv6Address: transipData.ipv6Address,
      status: transipData.status,
      isLocked: transipData.isLocked || false,
      isBlocked: transipData.isBlocked || false,
      cpuCores: transipData.cpuCores,
      memoryMb: transipData.memoryMb,
      diskGb: transipData.diskSize,
    };

    return this.upsert(vpsData);
  }

  /**
   * Get VPS statistics
   * @returns {Promise<Object>} Inventory statistics
   */
  static async getStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total_vps,
        COUNT(*) FILTER (WHERE status = 'running') as running,
        COUNT(*) FILTER (WHERE status = 'stopped') as stopped,
        COUNT(*) FILTER (WHERE has_snapshots = true) as with_snapshots,
        SUM(monthly_cost) as total_monthly_cost,
        AVG(monthly_cost) as avg_monthly_cost,
        COUNT(DISTINCT customer_id) as unique_customers,
        COUNT(DISTINCT region) as regions_used
      FROM deployment.transip_vps_inventory
      WHERE deleted_at IS NULL
    `;
    const result = await db.query(query);
    return result.rows[0];
  }

  /**
   * Get VPS by customer
   * @param {string} customerId - Customer ID
   * @returns {Promise<Array>} Customer's VPS instances
   */
  static async getByCustomer(customerId) {
    const query = `
      SELECT * FROM deployment.transip_vps_inventory
      WHERE customer_id = $1 AND deleted_at IS NULL
      ORDER BY provisioned_at DESC
    `;
    const result = await db.query(query, [customerId]);
    return result.rows;
  }
}

export default TransipVpsInventory;
