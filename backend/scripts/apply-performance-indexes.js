/**
 * Apply Performance Indexes
 * Run this script to add database indexes for improved performance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/recruitiq_dev'
});

async function applyIndexes() {
  try {
    console.log('📊 Applying performance indexes...\n');
    
    const sqlFile = path.join(__dirname, 'add-performance-indexes.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Performance indexes applied successfully!\n');
    
    // Show created indexes
    console.log('📋 Verifying indexes...\n');
    const result = await pool.query(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);
    
    console.log(`Found ${result.rows.length} performance indexes:\n`);
    
    let currentTable = '';
    result.rows.forEach(row => {
      if (row.tablename !== currentTable) {
        currentTable = row.tablename;
        console.log(`\n📁 ${currentTable.toUpperCase()}:`);
      }
      console.log(`  ✓ ${row.indexname}`);
    });
    
    // Show table sizes
    console.log('\n\n📊 Table & Index Sizes:\n');
    const sizeResult = await pool.query(`
      SELECT
        tablename,
        pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS total_size,
        pg_size_pretty(pg_relation_size('public.'||tablename)) AS table_size,
        pg_size_pretty(pg_indexes_size('public.'||tablename)) AS index_size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size('public.'||tablename) DESC
      LIMIT 10
    `);
    
    console.log('Table                    Total Size    Table Size    Index Size');
    console.log('─'.repeat(70));
    sizeResult.rows.forEach(row => {
      console.log(
        `${row.tablename.padEnd(23)} ${row.total_size.padEnd(12)} ${row.table_size.padEnd(12)} ${row.index_size}`
      );
    });
    
    console.log('\n✅ Performance optimization complete!\n');
    
  } catch (error) {
    console.error('❌ Error applying indexes:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyIndexes();
