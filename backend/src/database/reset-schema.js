#!/usr/bin/env node
/**
 * Reset Database Schema
 * 
 * Drops all tables and recreates them from schema.sql
 * This is the single source of truth for database structure.
 * 
 * Usage: node src/database/reset-schema.js
 */

import pkg from 'pg';
const { Pool } = pkg;
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
loadEnv({ path: join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'recruitiq_dev',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres'
});

async function resetSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 RESETTING DATABASE SCHEMA...\n');
    console.log(`Database: ${process.env.DATABASE_NAME}`);
    console.log(`Host: ${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}\n`);
    console.log('⚠️  WARNING: This will DROP ALL TABLES and recreate them!\n');
    console.log('⏳ Starting in 2 seconds... (Press Ctrl+C to cancel)\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Applying schema.sql...\n');
    
    // Execute schema
    await client.query(schema);
    
    console.log('✅ Database schema reset successfully!\n');
    
    // Verify tables exist
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    console.log(`\n   Total: ${result.rows.length} tables\n`);
    
  } catch (error) {
    console.error('❌ Error resetting schema:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || 
    import.meta.url.endsWith('reset-schema.js')) {
  resetSchema()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error.message);
      process.exit(1);
    });
}

export default resetSchema;
