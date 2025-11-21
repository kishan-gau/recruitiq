#!/usr/bin/env node
/**
 * Secrets Management CLI Tool
 * 
 * Usage:
 *   npm run secrets:generate JWT_SECRET          - Generate JWT secret
 *   npm run secrets:store JWT_SECRET <value>     - Store secret in Barbican
 *   npm run secrets:get JWT_SECRET               - Retrieve secret from Barbican
 *   npm run secrets:rotate JWT_SECRET            - Rotate secret (generate + store new)
 *   npm run secrets:delete JWT_SECRET            - Delete secret from Barbican
 *   npm run secrets:list                         - List all configured secrets
 *   npm run secrets:health                       - Check Barbican connection
 */

import { Command } from 'commander';
import crypto from 'crypto';
import { loadSecrets } from '../src/config/secrets.js';
import BarbicanProvider from '../src/config/providers/barbicanProvider.js';

const program = new Command();

program
  .name('secrets-cli')
  .description('RecruitIQ Secrets Management Tool')
  .version('1.0.0');

/**
 * Generate a cryptographically secure secret
 */
program
  .command('generate <secretName>')
  .description('Generate a cryptographically secure secret')
  .option('-l, --length <length>', 'Length in bytes (default: 32)', '32')
  .option('-e, --encoding <encoding>', 'Encoding (hex, base64, base64url)', 'base64')
  .action(async (secretName, options) => {
    const length = parseInt(options.length);
    const encoding = options.encoding;
    
    const secret = crypto.randomBytes(length).toString(encoding);
    
    console.log('\n✅ Generated Secret:');
    console.log('='.repeat(80));
    console.log(`Secret Name: ${secretName}`);
    console.log(`Length: ${secret.length} characters`);
    console.log(`Value: ${secret}`);
    console.log('='.repeat(80));
    console.log('\n💡 Next Steps:');
    console.log(`1. Store in Barbican: npm run secrets:store ${secretName} "${secret}"`);
    console.log(`2. Or add to .env: ${secretName}=${secret}`);
    console.log('');
  });

/**
 * Store a secret in Barbican
 */
program
  .command('store <secretName> <secretValue>')
  .description('Store a secret in Barbican')
  .option('-e, --expiration <date>', 'Expiration date (ISO 8601)')
  .action(async (secretName, secretValue, options) => {
    try {
      console.log(`\n📦 Storing secret in Barbican: ${secretName}`);
      
      const barbican = new BarbicanProvider({
        endpoint: process.env.BARBICAN_ENDPOINT,
        authEndpoint: process.env.OPENSTACK_AUTH_URL,
        username: process.env.OPENSTACK_USERNAME,
        password: process.env.OPENSTACK_PASSWORD,
        projectName: process.env.OPENSTACK_PROJECT_NAME,
      });
      
      const secretRef = await barbican.storeSecret(secretName, secretValue, {
        expiration: options.expiration || null,
      });
      
      console.log('✅ Secret stored successfully!');
      console.log(`Secret Reference: ${secretRef}`);
      console.log('');
    } catch (error) {
      console.error('❌ Failed to store secret:', error.message);
      process.exit(1);
    }
  });

/**
 * Retrieve a secret from Barbican
 */
program
  .command('get <secretName>')
  .description('Retrieve a secret from Barbican')
  .option('--no-cache', 'Skip cache and fetch fresh from Barbican')
  .action(async (secretName, options) => {
    try {
      console.log(`\n🔍 Retrieving secret: ${secretName}`);
      
      const barbican = new BarbicanProvider({
        endpoint: process.env.BARBICAN_ENDPOINT,
        authEndpoint: process.env.OPENSTACK_AUTH_URL,
        username: process.env.OPENSTACK_USERNAME,
        password: process.env.OPENSTACK_PASSWORD,
        projectName: process.env.OPENSTACK_PROJECT_NAME,
      });
      
      const secretValue = await barbican.getSecret(secretName, {
        refresh: !options.cache,
      });
      
      console.log('✅ Secret retrieved successfully!');
      console.log('='.repeat(80));
      console.log(`Value: ${secretValue}`);
      console.log(`Length: ${secretValue.length} characters`);
      console.log('='.repeat(80));
      console.log('');
    } catch (error) {
      console.error('❌ Failed to retrieve secret:', error.message);
      process.exit(1);
    }
  });

/**
 * Rotate a secret (generate new + store)
 */
program
  .command('rotate <secretName>')
  .description('Rotate a secret (generate new value and store in Barbican)')
  .option('-l, --length <length>', 'Length in bytes for new secret (default: 32)', '32')
  .option('-e, --encoding <encoding>', 'Encoding (hex, base64, base64url)', 'base64')
  .action(async (secretName, options) => {
    try {
      console.log(`\n🔄 Rotating secret: ${secretName}`);
      
      // Generate new secret
      const length = parseInt(options.length);
      const newSecret = crypto.randomBytes(length).toString(options.encoding);
      
      console.log(`Generated new secret (length: ${newSecret.length})`);
      
      // Store in Barbican
      const barbican = new BarbicanProvider({
        endpoint: process.env.BARBICAN_ENDPOINT,
        authEndpoint: process.env.OPENSTACK_AUTH_URL,
        username: process.env.OPENSTACK_USERNAME,
        password: process.env.OPENSTACK_PASSWORD,
        projectName: process.env.OPENSTACK_PROJECT_NAME,
      });
      
      const secretRef = await barbican.rotateSecret(secretName, newSecret);
      
      console.log('✅ Secret rotated successfully!');
      console.log(`New Secret Reference: ${secretRef}`);
      console.log('\n⚠️  IMPORTANT: Update application to use new secret!');
      console.log('Restart services to pick up the new secret.');
      console.log('');
    } catch (error) {
      console.error('❌ Failed to rotate secret:', error.message);
      process.exit(1);
    }
  });

/**
 * Delete a secret from Barbican
 */
program
  .command('delete <secretName>')
  .description('Delete a secret from Barbican')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (secretName, options) => {
    try {
      if (!options.force) {
        console.log(`\n⚠️  WARNING: You are about to delete: ${secretName}`);
        console.log('This action cannot be undone!');
        console.log('\nUse --force flag to confirm deletion.');
        process.exit(0);
      }
      
      console.log(`\n🗑️  Deleting secret: ${secretName}`);
      
      const barbican = new BarbicanProvider({
        endpoint: process.env.BARBICAN_ENDPOINT,
        authEndpoint: process.env.OPENSTACK_AUTH_URL,
        username: process.env.OPENSTACK_USERNAME,
        password: process.env.OPENSTACK_PASSWORD,
        projectName: process.env.OPENSTACK_PROJECT_NAME,
      });
      
      await barbican.deleteSecret(secretName);
      
      console.log('✅ Secret deleted successfully!');
      console.log('');
    } catch (error) {
      console.error('❌ Failed to delete secret:', error.message);
      process.exit(1);
    }
  });

/**
 * List all configured secrets
 */
program
  .command('list')
  .description('List all configured secrets (from SECRET_DEFINITIONS)')
  .action(async () => {
    try {
      console.log('\n📋 Configured Secrets:');
      console.log('='.repeat(80));
      
      const secrets = await loadSecrets();
      const secretKeys = Object.keys(secrets).filter(key => key !== '_barbicanClient');
      
      console.log(`\nTotal: ${secretKeys.length} secrets`);
      console.log('');
      
      secretKeys.forEach(key => {
        const value = secrets[key];
        const status = value ? '✅ Loaded' : '❌ Missing';
        const length = value ? `(${value.length} chars)` : '';
        console.log(`${status} ${key} ${length}`);
      });
      
      console.log('='.repeat(80));
      console.log('');
    } catch (error) {
      console.error('❌ Failed to list secrets:', error.message);
      process.exit(1);
    }
  });

/**
 * Health check for Barbican connection
 */
program
  .command('health')
  .description('Check Barbican connection and authentication')
  .action(async () => {
    try {
      console.log('\n🏥 Barbican Health Check');
      console.log('='.repeat(80));
      
      const barbican = new BarbicanProvider({
        endpoint: process.env.BARBICAN_ENDPOINT,
        authEndpoint: process.env.OPENSTACK_AUTH_URL,
        username: process.env.OPENSTACK_USERNAME,
        password: process.env.OPENSTACK_PASSWORD,
        projectName: process.env.OPENSTACK_PROJECT_NAME,
      });
      
      const health = await barbican.healthCheck();
      
      if (health.status === 'healthy') {
        console.log('✅ Status: HEALTHY');
        console.log(`Endpoint: ${health.endpoint}`);
        console.log(`Authentication: ${health.authenticated ? 'OK' : 'FAILED'}`);
      } else {
        console.log('❌ Status: UNHEALTHY');
        console.log(`Error: ${health.error}`);
      }
      
      console.log('='.repeat(80));
      console.log('');
      
      process.exit(health.status === 'healthy' ? 0 : 1);
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      process.exit(1);
    }
  });

program.parse();
