const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hris',
  user: 'postgres',
  password: 'postgres',
});

async function checkHrisSchema() {
  try {
    // List all tables in hris database
    console.log('\n📋 Tables in hris database:');
    console.log('============================');
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname='public' 
      ORDER BY tablename
    `);
    tables.rows.forEach(row => console.log(`  - ${row.tablename}`));
    console.log(`\nTotal: ${tables.rows.length} tables`);
    
    // Check for user-related tables
    console.log('\n👥 User/Auth related tables:');
    const userTables = tables.rows.filter(r => 
      r.tablename.includes('user') || 
      r.tablename.includes('employee') || 
      r.tablename.includes('auth') ||
      r.tablename.includes('tenant')
    );
    userTables.forEach(row => console.log(`  - ${row.tablename}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkHrisSchema();
