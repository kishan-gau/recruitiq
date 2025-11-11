const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'recruitiq_dev',
  user: 'postgres',
  password: 'postgres',
});

async function checkPlatformUsers() {
  try {
    console.log('\n📋 platform_users table structure:');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'platform_users'
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})${col.is_nullable === 'YES' ? ' NULL' : ' NOT NULL'}`);
    });
    
    console.log('\n👥 Existing users:');
    const users = await pool.query(`SELECT email, type, role FROM platform_users LIMIT 10`);
    if (users.rows.length > 0) {
      users.rows.forEach(user => console.log(`  - ${user.email} (${user.type}, ${user.role})`));
    } else {
      console.log('  (no users found)');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPlatformUsers();
