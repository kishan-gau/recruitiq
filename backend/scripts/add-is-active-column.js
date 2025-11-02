// Add is_active column to users table
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'recruitiq_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function addIsActiveColumn() {
  const client = await pool.connect();
  try {
    console.log('Adding is_active column to users table...');
    
    // Add column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `);
    console.log('✓ Column added');
    
    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
    `);
    console.log('✓ Index created');
    
    // Add comment
    await client.query(`
      COMMENT ON COLUMN users.is_active IS 'Whether user is enabled. Disabled users do not count against license limits.';
    `);
    console.log('✓ Comment added');
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addIsActiveColumn();
