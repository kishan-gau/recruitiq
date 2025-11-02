import pool from '../src/config/database.js';

async function verify() {
  try {
    const result = await pool.query(`
      SELECT 
        u.email, 
        u.name, 
        u.user_type, 
        u.legacy_role,
        array_length(u.additional_permissions, 1) as permission_count,
        array(
          SELECT p.name 
          FROM permissions p 
          WHERE p.id = ANY(u.additional_permissions)
          ORDER BY p.name
        ) as permissions
      FROM users u
      WHERE u.user_type = 'platform' OR u.legacy_role = 'platform_admin'
    `);
    
    console.log('\n📋 Platform Admin Users & Permissions:\n');
    
    result.rows.forEach(user => {
      console.log(`👤 ${user.name} (${user.email})`);
      console.log(`   Role: ${user.legacy_role}`);
      console.log(`   User Type: ${user.user_type}`);
      console.log(`   Permissions: ${user.permission_count || 0}`);
      if (user.permissions && user.permissions.length > 0) {
        user.permissions.forEach(perm => {
          console.log(`      ✓ ${perm}`);
        });
      }
      console.log('');
    });
    
    console.log('✅ Verification complete!\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

verify();
