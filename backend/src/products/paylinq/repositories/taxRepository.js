/**
 * Tax Repository
 * Data access layer for tax-related operations
 */

import pool from '../../../config/database.js';

/**
 * Get tax rates for a jurisdiction
 */
export async function getTaxRates(jurisdictionId, effectiveDate) {
  const query = `
    SELECT * FROM tax_rates
    WHERE jurisdiction_id = $1
    AND effective_from <= $2
    AND (effective_to IS NULL OR effective_to >= $2)
    ORDER BY tax_type, created_at DESC
  `;
  
  const result = await pool.query(query, [jurisdictionId, effectiveDate]);
  return result.rows;
}

/**
 * Get all tax jurisdictions
 */
export async function getAllJurisdictions() {
  const query = `
    SELECT * FROM tax_jurisdictions
    ORDER BY jurisdiction_name
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get tax jurisdiction by ID
 */
export async function getJurisdictionById(jurisdictionId) {
  const query = `
    SELECT * FROM tax_jurisdictions
    WHERE id = $1
  `;
  
  const result = await pool.query(query, [jurisdictionId]);
  return result.rows[0];
}

export default {
  getTaxRates,
  getAllJurisdictions,
  getJurisdictionById
};
