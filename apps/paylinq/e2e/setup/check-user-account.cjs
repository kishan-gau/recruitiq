const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'recruitiq_dev',
  user: 'postgres',
  password: 'postgres',
});

async function checkUserAccountTable() {
  try {
    // Check if user_account table exists
    console.log('\n📋 Checking for user_account table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'hris' 
        AND table_name = 'user_account'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✓ user_account table exists\n');
      
      // Get columns
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'hris' AND table_name = 'user_account'
        ORDER BY ordinal_position
      `);
      
      console.log('Columns in user_account:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})${col.is_nullable === 'YES' ? ' NULL' : ' NOT NULL'}`);
      });
      
      // Check existing users
      console.log('\n👥 Existing users:');
      const users = await pool.query(`SELECT email, employee_id FROM hris.user_account LIMIT 5`);
      if (users.rows.length > 0) {
        users.rows.forEach(user => console.log(`  - ${user.email} (Employee: ${user.employee_id})`));
      } else {
        console.log('  (no users found)');
      }
    } else {
      console.log('❌ user_account table does NOT exist');
      
      // Show what user/auth tables exist
      console.log('\n📋 Available auth/user tables:');
      const tables = await pool.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname='public' 
        AND (tablename LIKE '%user%' OR tablename LIKE '%auth%' OR tablename LIKE '%employee%')
        ORDER BY tablename
      `);
      tables.rows.forEach(row => console.log(`  - ${row.tablename}`));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserAccountTable();
