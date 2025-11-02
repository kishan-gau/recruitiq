/**
 * Check Database Schema
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/recruitiq_dev'
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name IN ('jobs', 'candidates', 'refresh_tokens', 'users', 'applications', 'workspaces')
      ORDER BY table_name, ordinal_position
    `);
    
    let currentTable = '';
    result.rows.forEach(col => {
      if (col.table_name !== currentTable) {
        currentTable = col.table_name;
        console.log(`\n${currentTable.toUpperCase()}:`);
      }
      console.log(`  ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
