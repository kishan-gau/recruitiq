const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'recruitiq_dev',
  user: 'postgres',
  password: 'postgres',
});

async function listTables() {
  try {
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname='public' 
      ORDER BY tablename
    `);
    
    console.log('\n📋 Tables in database:');
    console.log('======================');
    result.rows.forEach(row => console.log(`  - ${row.tablename}`));
    console.log(`\nTotal: ${result.rows.length} tables`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

listTables();
