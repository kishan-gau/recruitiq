#!/usr/bin/env node
/**
 * Create Platform Admin User Script
 * 
 * Creates a platform administrator user for the Portal application.
 * This is a platform-level user (not tenant-specific) with full administrative access.
 * 
 * Usage:
 *   node scripts/create-platform-admin.js --email=platform_admin@primecore.app --password=YourSecurePassword123!
 * 
 * Or with environment variables:
 *   ADMIN_EMAIL=platform_admin@primecore.app ADMIN_PASSWORD=YourSecurePassword123! node scripts/create-platform-admin.js
 * 
 * Or with defaults:
 *   node scripts/create-platform-admin.js
 *   (Uses platform_admin@primecore.app with a generated password)
 */

import pg from 'pg'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

const SALT_ROUNDS = 12

// Create platform database connection pool
const platformPool = new Pool({
  host: process.env.PLATFORM_DATABASE_HOST || 'localhost',
  port: parseInt(process.env.PLATFORM_DATABASE_PORT, 10) || 5432,
  database: process.env.PLATFORM_DATABASE_NAME || 'platform_db',
  user: process.env.PLATFORM_DATABASE_USER || 'postgres',
  password: process.env.PLATFORM_DATABASE_PASSWORD,
  ssl: process.env.PLATFORM_DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    email: process.env.ADMIN_EMAIL || 'platform_admin@primecore.app',
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || 'Platform Administrator'
  }

  // Parse --key=value arguments
  args.forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.+)$/)
    if (match) {
      const [, key, value] = match 
      options[key] = value
    }
  })

  return options
}

// Generate secure password
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*'
  let password = ''
  
  // Ensure at least one of each type
  password += 'ABCDEFGHJKLMNPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 25))
  password += 'abcdefghjkmnpqrstuvwxyz'.charAt(Math.floor(Math.random() * 25))
  password += '23456789'.charAt(Math.floor(Math.random() * 8))
  password += '!@#$%^&*'.charAt(Math.floor(Math.random() * 8))
  
  // Fill rest with random chars
  for (let i = 4; i < 20; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Display help
function displayHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                   CREATE PLATFORM ADMIN USER SCRIPT                       ║
╚═══════════════════════════════════════════════════════════════════════════╝

This script creates a platform administrator user for the Portal application.
This is a platform-level user (NOT tenant-specific) with full administrative
access to manage licenses, customers, products, and system settings.

USAGE:
  node scripts/create-platform-admin.js [OPTIONS]

OPTIONS:
  --email=<email>              Admin user email (default: platform_admin@primecore.app)
  --password=<password>        Admin user password (auto-generated if not provided)
  --name=<name>                Admin user display name (default: Platform Administrator)
  --help                       Display this help message

ENVIRONMENT VARIABLES:
  ADMIN_EMAIL                  Admin user email
  ADMIN_PASSWORD               Admin user password
  ADMIN_NAME                   Admin user display name

EXAMPLES:
  # Using default email with auto-generated password
  node scripts/create-platform-admin.js

  # With custom email and password
  node scripts/create-platform-admin.js \\
    --email=admin@example.com \\
    --password=SecurePassword123!

  # Using environment variables
  ADMIN_EMAIL=admin@example.com \\
  ADMIN_PASSWORD=SecurePassword123! \\
  node scripts/create-platform-admin.js

NOTES:
  - Password must be at least 12 characters
  - Password should contain uppercase, lowercase, numbers, and special characters
  - If password is not provided, a secure password will be generated
  - The user will be assigned the 'super_admin' platform role
  - This role grants full access to all platform features
`)
}

// Validate password strength
function validatePassword(password) {
  const errors = []

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return errors
}

// Main function
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                   CREATE PLATFORM ADMIN USER SCRIPT                       ║
║                          RecruitIQ Platform                               ║
╚═══════════════════════════════════════════════════════════════════════════╝
`)

  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    displayHelp()
    process.exit(0)
  }

  // Parse options
  const options = parseArgs()

  // Validate platform database configuration
  if (!process.env.PLATFORM_DATABASE_NAME) {
    console.error('\n❌ PLATFORM DATABASE NOT CONFIGURED!\n')
    console.error('This script requires platform database environment variables:')
    console.error('  PLATFORM_DATABASE_HOST       (e.g., localhost)')
    console.error('  PLATFORM_DATABASE_PORT       (e.g., 5432)')
    console.error('  PLATFORM_DATABASE_NAME       (e.g., platform_db)')
    console.error('  PLATFORM_DATABASE_USER       (e.g., postgres)')
    console.error('  PLATFORM_DATABASE_PASSWORD   (required)')
    console.error('')
    console.error('Please add these variables to your .env file.')
    console.error('Example:')
    console.error('  PLATFORM_DATABASE_HOST=localhost')
    console.error('  PLATFORM_DATABASE_PORT=5432')
    console.error('  PLATFORM_DATABASE_NAME=platform_db')
    console.error('  PLATFORM_DATABASE_USER=postgres')
    console.error('  PLATFORM_DATABASE_PASSWORD=your_password')
    console.error('')
    process.exit(1)
  }

  // Generate password if not provided
  if (!options.password) {
    console.log('ℹ️  No password provided, generating secure password...')
    options.password = generatePassword()
    console.log('')
  }

  // Validate password
  const passwordErrors = validatePassword(options.password)
  if (passwordErrors.length > 0) {
    console.error('\n⚠️  PASSWORD VALIDATION ERRORS:\n')
    passwordErrors.forEach(error => console.error(`  ❌ ${error}`))
    console.error('\nPlease provide a stronger password.\n')
    process.exit(1)
  }

  console.log('📋 CONFIGURATION:')
  console.log(`   Email:    ${options.email}`)
  console.log(`   Name:     ${options.name}`)
  console.log(`   Password: ${options.password.substring(0, 4)}${'*'.repeat(options.password.length - 4)}`)
  console.log('')
  console.log('🔌 PLATFORM DATABASE:')
  console.log(`   Host:     ${process.env.PLATFORM_DATABASE_HOST || 'localhost'}`)
  console.log(`   Port:     ${process.env.PLATFORM_DATABASE_PORT || 5432}`)
  console.log(`   Database: ${process.env.PLATFORM_DATABASE_NAME || 'platform_db'}`)
  console.log(`   User:     ${process.env.PLATFORM_DATABASE_USER || 'postgres'}`)
  console.log('')

  const client = await platformPool.connect()

  try {
    // Verify database connection
    console.log('🔌 Verifying database connection...')
    const dbCheck = await client.query('SELECT current_database(), current_schema()')
    console.log(`✅ Connected to database: ${dbCheck.rows[0].current_database}`)
    console.log(`   Current schema: ${dbCheck.rows[0].current_schema}`)
    console.log('')

    await client.query('BEGIN')

    // Check if user already exists
    console.log('🔍 Checking if user already exists...')
    const existingUser = await client.query(`
      SELECT id, email FROM platform_users WHERE email = $1
    `, [options.email])

    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists!')
      console.log(`   User ID: ${existingUser.rows[0].id}`)
      console.log(`   Email:   ${existingUser.rows[0].email}`)
      console.log('')
      console.log('Would you like to:')
      console.log('  1. Update the existing user\'s password')
      console.log('  2. Exit without changes')
      console.log('')
      console.log('Run with a different email to create a new user.')
      
      await client.query('ROLLBACK')
      process.exit(0)
    }

    console.log('✅ Email is available')
    console.log('')

    // Get super_admin role
    console.log('🔍 Finding super_admin platform role...')
    
    // First, let's see what platform roles exist
    const allPlatformRoles = await client.query(`
      SELECT id, name, display_name, role_type, organization_id 
      FROM public.roles 
      WHERE role_type = 'platform'
      ORDER BY name
    `)
    
    console.log(`Found ${allPlatformRoles.rows.length} platform roles:`)
    allPlatformRoles.rows.forEach(role => {
      console.log(`  - ${role.name} (${role.display_name}) [org_id: ${role.organization_id}]`)
    })
    console.log('')
    
    const roleResult = await client.query(`
      SELECT id, name, display_name 
      FROM public.roles 
      WHERE name = 'super_admin' 
        AND organization_id IS NULL 
        AND role_type = 'platform'
      LIMIT 1
    `)

    if (roleResult.rows.length === 0) {
      console.error('❌ super_admin role not found!')
      console.error('')
      console.error('The super_admin platform role must exist before creating admin users.')
      console.error('Please run the RBAC migrations first:')
      console.error('  npm run migrate')
      console.error('')
      console.error('Or run the platform roles seed:')
      console.error('  npm run seed:platform-roles')
      console.error('')
      
      await client.query('ROLLBACK')
      process.exit(1)
    }

    const superAdminRole = roleResult.rows[0]
    console.log(`✅ Found role: ${superAdminRole.display_name} (${superAdminRole.id})`)
    console.log('')

    // Hash password
    console.log('🔐 Hashing password...')
    const passwordHash = await bcrypt.hash(options.password, SALT_ROUNDS)
    console.log('✅ Password hashed')
    console.log('')

    // Create user
    console.log('👤 Creating platform admin user...')
    const userId = uuidv4()
    
    await client.query(`
      INSERT INTO platform_users (
        id, email, password_hash, name, is_active, email_verified, created_at
      ) VALUES ($1, $2, $3, $4, true, true, NOW())
    `, [userId, options.email, passwordHash, options.name])

    console.log(`✅ User created: ${userId}`)
    console.log('')

    // Assign super_admin role
    console.log('🔑 Assigning super_admin role...')
    await client.query(`
      INSERT INTO user_roles (user_id, role_id, created_by)
      VALUES ($1, $2, $1)
    `, [userId, superAdminRole.id])

    console.log('✅ Role assigned')
    console.log('')

    // Get all permissions for the role
    console.log('📋 Verifying permissions...')
    const permissionsResult = await client.query(`
      SELECT COUNT(*) as count
      FROM role_permissions rp
      WHERE rp.role_id = $1
    `, [superAdminRole.id])

    const permissionCount = permissionsResult.rows[0].count

    await client.query('COMMIT')

    console.log('─'.repeat(75))
    console.log('')
    console.log('✅ PLATFORM ADMIN USER CREATED SUCCESSFULLY!')
    console.log('')
    console.log('📊 SUMMARY:')
    console.log(`   User ID:      ${userId}`)
    console.log(`   Email:        ${options.email}`)
    console.log(`   Name:         ${options.name}`)
    console.log(`   Password:     ${options.password}`)
    console.log(`   Role:         ${superAdminRole.display_name}`)
    console.log(`   Permissions:  ${permissionCount} platform permissions`)
    console.log(`   Status:       Active and Verified`)
    console.log('')
    console.log('🔐 LOGIN CREDENTIALS:')
    console.log(`   URL:      http://localhost:5173 (Portal)`)
    console.log(`   Email:    ${options.email}`)
    console.log(`   Password: ${options.password}`)
    console.log('')
    console.log('📧 NEXT STEPS:')
    console.log('   1. Save these credentials securely')
    console.log('   2. Log in to the Portal application')
    console.log('   3. Change password after first login (recommended)')
    console.log('   4. Configure two-factor authentication (if available)')
    console.log('   5. Review and customize platform settings')
    console.log('')
    console.log('⚠️  IMPORTANT:')
    console.log('   - This password will NOT be shown again')
    console.log('   - Store it in a secure password manager')
    console.log('   - This user has FULL platform access')
    console.log('   - Use this account responsibly')
    console.log('')

    process.exit(0)

  } catch (error) {
    await client.query('ROLLBACK')
    
    console.error('')
    console.error('─'.repeat(75))
    console.error('')
    console.error('❌ PLATFORM ADMIN CREATION FAILED!')
    console.error('')
    console.error('ERROR DETAILS:')
    console.error(`   Message: ${error.message}`)
    
    if (error.code) {
      console.error(`   Code:    ${error.code}`)
    }
    
    if (error.stack) {
      console.error('')
      console.error('STACK TRACE:')
      console.error(error.stack)
    }
    
    console.error('')
    console.error('TROUBLESHOOTING:')
    console.error('   1. Verify database connection is working')
    console.error('   2. Ensure RBAC migrations have been run')
    console.error('   3. Check that platform_users table exists')
    console.error('   4. Verify super_admin role exists')
    console.error('   5. Check database logs for more details')
    console.error('')

    process.exit(1)
  } finally {
    client.release()
    await platformPool.end()
  }
}

// Run script
main().catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
