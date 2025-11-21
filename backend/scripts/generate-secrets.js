/**
 * Script to generate and manage secrets using Barbican
 * 
 * Usage:
 *   node scripts/generate-secrets.js generate JWT_SECRET
 *   node scripts/generate-secrets.js rotate JWT_SECRET
 *   node scripts/generate-secrets.js list
 *   node scripts/generate-secrets.js migrate
 */

import secretsManager from '../src/services/SecretsManager.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

/**
 * Generate a new secret in Barbican
 */
async function generateSecret(name, options = {}) {
  console.log(`\n🔐 Generating secret: ${name}`);
  
  try {
    const secretRef = await secretsManager.generateSecret(name, {
      algorithm: options.algorithm || 'aes',
      bit_length: options.bitLength || 256,
      mode: options.mode || 'cbc',
      secret_type: options.type || 'symmetric',
      expiration: options.expiration,
    });
    
    console.log(`✅ Secret generated successfully!`);
    console.log(`   Reference: ${secretRef}`);
    console.log(`   Algorithm: ${options.algorithm || 'aes'}`);
    console.log(`   Bit Length: ${options.bitLength || 256}`);
    
    // Retrieve and display (for testing)
    const value = await secretsManager.getSecret(name);
    console.log(`   Value: ${value.substring(0, 20)}... (truncated)`);
    
    return secretRef;
  } catch (error) {
    console.error(`❌ Failed to generate secret: ${error.message}`);
    throw error;
  }
}

/**
 * Generate standard application secrets
 */
async function generateStandardSecrets() {
  console.log('\n📦 Generating standard application secrets...\n');
  
  const secrets = [
    {
      name: 'JWT_SECRET',
      algorithm: 'aes',
      bitLength: 256,
      mode: 'cbc',
      type: 'symmetric',
      description: 'JWT signing secret',
    },
    {
      name: 'JWT_REFRESH_SECRET',
      algorithm: 'aes',
      bitLength: 256,
      mode: 'cbc',
      type: 'symmetric',
      description: 'JWT refresh token secret',
    },
    {
      name: 'ENCRYPTION_KEY',
      algorithm: 'aes',
      bitLength: 256,
      mode: 'gcm',
      type: 'symmetric',
      description: 'Data encryption key',
    },
    {
      name: 'SESSION_SECRET',
      algorithm: 'aes',
      bitLength: 256,
      mode: 'cbc',
      type: 'symmetric',
      description: 'Session encryption secret',
    },
    {
      name: 'API_KEY_SALT',
      algorithm: 'octets',
      bitLength: 256,
      type: 'opaque',
      description: 'API key hashing salt',
    },
  ];
  
  const results = [];
  
  for (const config of secrets) {
    console.log(`\nGenerating: ${config.name}`);
    console.log(`  Description: ${config.description}`);
    
    try {
      const secretRef = await generateSecret(config.name, {
        algorithm: config.algorithm,
        bitLength: config.bitLength,
        mode: config.mode,
        type: config.type,
      });
      
      results.push({
        name: config.name,
        status: 'success',
        ref: secretRef,
      });
    } catch (error) {
      results.push({
        name: config.name,
        status: 'failed',
        error: error.message,
      });
    }
  }
  
  console.log('\n\n📊 Generation Summary:');
  console.log('─'.repeat(80));
  
  results.forEach((result) => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${result.name.padEnd(30)} ${result.status.toUpperCase()}`);
    if (result.ref) {
      console.log(`   ${result.ref}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.status === 'success').length;
  console.log('─'.repeat(80));
  console.log(`\n✨ Generated ${successCount}/${results.length} secrets successfully`);
  
  return results;
}

/**
 * Migrate existing secrets from .env to Barbican
 */
async function migrateSecrets() {
  console.log('\n🔄 Migrating secrets from .env to Barbican...\n');
  
  const secretsToMigrate = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DB_PASSWORD',
    'ENCRYPTION_KEY',
    'SESSION_SECRET',
  ];
  
  const results = [];
  
  for (const secretName of secretsToMigrate) {
    const value = process.env[secretName];
    
    if (!value) {
      console.log(`⏭️  Skipping ${secretName} (not found in .env)`);
      results.push({
        name: secretName,
        status: 'skipped',
        reason: 'not found',
      });
      continue;
    }
    
    console.log(`\nMigrating: ${secretName}`);
    
    try {
      const secretRef = await secretsManager.setSecret(secretName, value);
      
      console.log(`✅ Migrated successfully`);
      console.log(`   Reference: ${secretRef}`);
      
      results.push({
        name: secretName,
        status: 'success',
        ref: secretRef,
      });
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      results.push({
        name: secretName,
        status: 'failed',
        error: error.message,
      });
    }
  }
  
  console.log('\n\n📊 Migration Summary:');
  console.log('─'.repeat(80));
  
  results.forEach((result) => {
    const icon = result.status === 'success' ? '✅' : 
                 result.status === 'skipped' ? '⏭️' : '❌';
    console.log(`${icon} ${result.name.padEnd(30)} ${result.status.toUpperCase()}`);
    if (result.ref) {
      console.log(`   ${result.ref}`);
    }
    if (result.reason) {
      console.log(`   Reason: ${result.reason}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.status === 'success').length;
  console.log('─'.repeat(80));
  console.log(`\n✨ Migrated ${successCount}/${secretsToMigrate.length} secrets successfully`);
  
  return results;
}

/**
 * Rotate a secret
 */
async function rotateSecret(name) {
  console.log(`\n🔄 Rotating secret: ${name}`);
  
  try {
    const newRef = await secretsManager.rotateSecret(name);
    
    console.log(`✅ Secret rotated successfully!`);
    console.log(`   New Reference: ${newRef}`);
    
    return newRef;
  } catch (error) {
    console.error(`❌ Failed to rotate secret: ${error.message}`);
    throw error;
  }
}

/**
 * List all secrets (requires Barbican provider)
 */
async function listSecrets() {
  console.log('\n📋 Listing secrets...\n');
  
  await secretsManager.initialize();
  
  if (secretsManager.provider.name !== 'Barbican') {
    console.log('⚠️  Secret listing is only available with Barbican provider');
    return;
  }
  
  try {
    // Access Barbican provider directly
    const token = await secretsManager.provider._getAuthToken();
    const response = await fetch(
      `${process.env.BARBICAN_ENDPOINT}/v1/secrets?limit=100`,
      {
        headers: {
          'X-Auth-Token': token,
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to list secrets: ${response.status}`);
    }
    
    const data = await response.json();
    const secrets = data.secrets || [];
    
    console.log(`Found ${secrets.length} secrets:\n`);
    console.log('─'.repeat(100));
    console.log('NAME'.padEnd(30) + 'ALGORITHM'.padEnd(15) + 'BITS'.padEnd(10) + 'TYPE'.padEnd(15) + 'STATUS');
    console.log('─'.repeat(100));
    
    secrets.forEach((secret) => {
      console.log(
        `${(secret.name || 'unnamed').padEnd(30)}` +
        `${(secret.algorithm || '-').padEnd(15)}` +
        `${(secret.bit_length || '-').toString().padEnd(10)}` +
        `${(secret.secret_type || '-').padEnd(15)}` +
        `${secret.status}`
      );
    });
    
    console.log('─'.repeat(100));
    console.log(`\n✨ Total: ${secrets.length} secrets`);
  } catch (error) {
    console.error(`❌ Failed to list secrets: ${error.message}`);
    throw error;
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   RecruitIQ Secrets Management CLI            ║');
  console.log('║   Powered by OpenStack Barbican               ║');
  console.log('╚════════════════════════════════════════════════╝');
  
  try {
    switch (command) {
      case 'generate':
        if (!arg) {
          console.log('\n❌ Error: Secret name required');
          console.log('Usage: node scripts/generate-secrets.js generate SECRET_NAME');
          process.exit(1);
        }
        await generateSecret(arg);
        break;
      
      case 'generate-all':
        await generateStandardSecrets();
        break;
      
      case 'migrate':
        await migrateSecrets();
        break;
      
      case 'rotate':
        if (!arg) {
          console.log('\n❌ Error: Secret name required');
          console.log('Usage: node scripts/generate-secrets.js rotate SECRET_NAME');
          process.exit(1);
        }
        await rotateSecret(arg);
        break;
      
      case 'list':
        await listSecrets();
        break;
      
      default:
        console.log('\n📖 Available Commands:\n');
        console.log('  generate SECRET_NAME    Generate a new secret');
        console.log('  generate-all            Generate all standard secrets');
        console.log('  migrate                 Migrate secrets from .env to Barbican');
        console.log('  rotate SECRET_NAME      Rotate an existing secret');
        console.log('  list                    List all secrets in Barbican');
        console.log('\nExamples:');
        console.log('  node scripts/generate-secrets.js generate JWT_SECRET');
        console.log('  node scripts/generate-secrets.js generate-all');
        console.log('  node scripts/generate-secrets.js migrate');
        console.log('  node scripts/generate-secrets.js rotate JWT_SECRET');
        console.log('  node scripts/generate-secrets.js list');
        break;
    }
    
    console.log('\n✅ Operation completed successfully\n');
  } catch (error) {
    console.error(`\n❌ Operation failed: ${error.message}\n`);
    process.exit(1);
  }
}

// Run CLI
main();
