/**
 * Migration CLI Wrapper for Knex
 * Simplifies running migrations with better output
 */

import knex from 'knex';
import knexConfig from '../knexfile.js';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

if (!config) {
  console.error(`❌ No configuration found for environment: ${environment}`);
  process.exit(1);
}

const db = knex(config);

const command = process.argv[2];
const arg = process.argv[3];

async function runMigrations() {
  try {
    switch (command) {
      case 'latest':
      case 'up':
        console.log('🚀 Running migrations...\n');
        const [batch, log] = await db.migrate.latest();
        if (log.length === 0) {
          console.log('✅ Already up to date!');
        } else {
          console.log(`✅ Batch ${batch} run: ${log.length} migrations`);
          log.forEach(migration => console.log(`   - ${migration}`));
        }
        break;

      case 'down':
      case 'rollback':
        console.log('⏮️  Rolling back last batch...\n');
        const [batchNo, rollbackLog] = await db.migrate.rollback();
        if (rollbackLog.length === 0) {
          console.log('ℹ️  Already at the base migration');
        } else {
          console.log(`✅ Batch ${batchNo} rolled back: ${rollbackLog.length} migrations`);
          rollbackLog.forEach(migration => console.log(`   - ${migration}`));
        }
        break;

      case 'status':
        console.log('📊 Migration Status\n');
        const [completed, pending] = await db.migrate.list();
        
        if (completed.length > 0) {
          console.log(`✅ Completed (${completed.length}):`);
          completed.forEach(migration => {
            const name = typeof migration === 'string' ? migration : migration.name || migration.file;
            console.log(`   ✓ ${name}`);
          });
        }
        
        if (pending.length > 0) {
          console.log(`\n⏳ Pending (${pending.length}):`);
          pending.forEach(migration => {
            const name = typeof migration === 'string' ? migration : migration.name || migration.file;
            console.log(`   - ${name}`);
          });
        }
        
        if (completed.length === 0 && pending.length === 0) {
          console.log('ℹ️  No migrations found');
        }
        break;

      case 'reset':
        console.log('🔄 Resetting database (rollback all + migrate)...\n');
        await db.migrate.rollback(undefined, true);
        console.log('✅ Rolled back all migrations');
        
        const [batch2, log2] = await db.migrate.latest();
        console.log(`✅ Batch ${batch2} run: ${log2.length} migrations`);
        log2.forEach(migration => console.log(`   - ${migration}`));
        break;

      case 'seed':
        console.log('🌱 Running seeds...\n');
        await db.seed.run();
        console.log('✅ Seeds completed!');
        break;

      case 'seed:specific':
        if (!arg) {
          console.error('❌ Please specify a seed file');
          process.exit(1);
        }
        console.log(`🌱 Running seed: ${arg}...\n`);
        await db.seed.run({ specific: arg });
        console.log('✅ Seed completed!');
        break;

      case 'make':
        if (!arg) {
          console.error('❌ Please specify a migration name');
          console.log('Usage: npm run migrate:make <migration_name>');
          process.exit(1);
        }
        const filename = await db.migrate.make(arg);
        console.log(`✅ Created migration: ${filename}`);
        break;

      default:
        console.log('Usage:');
        console.log('  npm run migrate:latest    - Run all pending migrations');
        console.log('  npm run migrate:rollback  - Rollback last batch');
        console.log('  npm run migrate:status    - Show migration status');
        console.log('  npm run migrate:reset     - Rollback all + migrate');
        console.log('  npm run migrate:make <name> - Create new migration');
        console.log('  npm run seed              - Run all seeds');
        console.log('  npm run seed:specific <name> - Run specific seed');
        process.exit(1);
    }

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await db.destroy();
    process.exit(1);
  }
}

runMigrations();
