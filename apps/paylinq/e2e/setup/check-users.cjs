const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'recruitiq_dev',
  user: 'postgres',
  password: 'postgres',
});

async function checkUserTables() {
  try {
    // Check platform_users structure
    console.log('\n📋 Checking platform_users table...');
    const platformUsersColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='platform_users' 
      ORDER BY ordinal_position
    `);
    console.log('Columns:', platformUsersColumns.rows.map(r => r.column_name).join(', '));
    
    // Check if there are any other user-related tables
    console.log('\n📋 User-related tables:');
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname='public' 
      AND tablename LIKE '%user%'
      ORDER BY tablename
    `);
    tables.rows.forEach(row => console.log(`  - ${row.tablename}`));
    
    // Check existing users
    console.log('\n👥 Existing users in platform_users:');
    const users = await pool.query(`SELECT email, type FROM platform_users LIMIT 10`);
    users.rows.forEach(row => console.log(`  - ${row.email} (${row.type})`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserTables();
