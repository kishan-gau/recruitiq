/**
 * Global Test Teardown
 * 
 * This file runs once after all tests complete.
 * Use it for cleanup operations.
 */

export default async function globalTeardown() {
  // Close database pool to prevent connection leaks
  try {
    // Import dynamically to avoid .ts extension issues
    const { closePool } = await import('../src/config/database.js');
    await closePool();
    console.error('🧹 Database pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error.message);
  }
  
  console.error('🧹 Jest global teardown complete');
}
