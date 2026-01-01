/**
 * Global Test Teardown
 * 
 * This file runs once after all tests complete.
 * Use it for cleanup operations.
 */

export default async function globalTeardown() {
  // Close database pool to prevent connection leaks
  try {
    // Import from TypeScript source file
    const { closePool } = await import('../src/config/database.ts');
    await closePool();
    console.error('🧹 Database pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error.message);
  }
  
  console.error('🧹 Jest global teardown complete');
}
