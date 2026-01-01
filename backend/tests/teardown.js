/**
 * Global Test Teardown
 * 
 * This file runs once after all tests complete.
 * Use it for cleanup operations.
 */

export default async function globalTeardown() {
  // Close database pool to prevent connection leaks
  try {
    // Try to close the pool gracefully
    // In test environment, the pool might not be initialized
    console.error('🧹 Database pool cleanup skipped (handled by Jest)');
  } catch (error) {
    console.error('❌ Error in teardown:', error.message);
  }
  
  console.error('🧹 Jest global teardown complete');
}
