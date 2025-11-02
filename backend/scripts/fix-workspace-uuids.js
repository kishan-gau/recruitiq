import db from '../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Script to check and fix malformed workspace UUIDs
 */
async function fixWorkspaceUUIDs() {
  console.log('Checking workspace UUIDs...\n');
  
  try {
    // Get all workspaces
    const result = await db.query('SELECT id, name FROM workspaces WHERE deleted_at IS NULL');
    const workspaces = result.rows;
    
    console.log(`Found ${workspaces.length} workspaces\n`);
    
    for (const workspace of workspaces) {
      console.log(`Workspace: ${workspace.name}`);
      console.log(`  Current ID: ${workspace.id}`);
      console.log(`  ID length: ${workspace.id.length}`);
      console.log(`  ID format: ${workspace.id.split('-').map(s => s.length).join('-')}`);
      
      // Check if UUID is valid (should be 8-4-4-4-12 format)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValid = uuidPattern.test(workspace.id);
      
      console.log(`  Valid: ${isValid ? '✓' : '✗'}\n`);
      
      if (!isValid) {
        console.log(`  ⚠️  MALFORMED UUID DETECTED!`);
        console.log(`  This workspace has an invalid UUID format.`);
        console.log(`  Expected format: 8-4-4-4-12 (e.g., 123e4567-e89b-12d3-a456-426614174000)`);
        console.log(`  Actual format: ${workspace.id.split('-').map(s => s.length).join('-')}\n`);
        
        // Generate a new UUID
        const newId = uuidv4();
        console.log(`  Suggested new ID: ${newId}`);
        console.log(`  Would you like to fix this? You'll need to:`);
        console.log(`    1. Update the workspace ID`);
        console.log(`    2. Update all foreign key references (jobs, workspace_members, etc.)\n`);
      }
    }
    
    console.log('✓ Workspace UUID check complete');
    
  } catch (error) {
    console.error('Error checking workspace UUIDs:', error);
  } finally {
    await db.end();
  }
}

fixWorkspaceUUIDs();
