#!/usr/bin/env node
/**
 * Manual Tenant Onboarding Script
 * 
 * Run this script on the tenant's VPS after license creation to:
 * 1. Create organization record
 * 2. Create admin user account
 * 3. Seed default roles with permissions
 * 4. Seed worker types (HRIS)
 * 5. Seed payroll run types (PayLinQ)
 * 6. Seed pay components (PayLinQ)
 * 7. Seed tax rules (if applicable)
 * 8. Seed allowances and deductions
 * 
 * Usage:
 *   node scripts/onboard-tenant.js --license-id=<uuid> --customer-id=<uuid> --email=admin@example.com --name="Company Name"
 * 
 * Or with environment variables:
 *   LICENSE_ID=<uuid> CUSTOMER_ID=<uuid> CUSTOMER_EMAIL=admin@example.com CUSTOMER_NAME="Company Name" node scripts/onboard-tenant.js
 */

import TenantOnboardingService from '../src/modules/license/services/TenantOnboardingService.js'
import License from '../src/modules/license/models/License.js'
import Customer from '../src/modules/license/models/Customer.js'
import pool from '../src/config/database.js'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    licenseId: process.env.LICENSE_ID,
    customerId: process.env.CUSTOMER_ID,
    customerEmail: process.env.CUSTOMER_EMAIL,
    customerName: process.env.CUSTOMER_NAME,
    tier: process.env.TIER || 'starter',
    products: process.env.PRODUCTS ? process.env.PRODUCTS.split(',') : null, // null = auto-detect from tier
    country: process.env.COUNTRY || 'SR'
  }

  // Parse --key=value arguments
  args.forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.+)$/)
    if (match) {
      const [, key, value] = match
      const camelKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      
      if (camelKey === 'products') {
        options[camelKey] = value.split(',')
      } else {
        options[camelKey] = value
      }
    }
  })

  return options
}

// Validate required options
function validateOptions(options) {
  const errors = []

  if (!options.licenseId) {
    errors.push('❌ Missing required option: --license-id or LICENSE_ID')
  }

  if (!options.customerId) {
    errors.push('❌ Missing required option: --customer-id or CUSTOMER_ID')
  }

  if (!options.customerEmail) {
    errors.push('❌ Missing required option: --email or CUSTOMER_EMAIL')
  }

  if (!options.customerName) {
    errors.push('❌ Missing required option: --name or CUSTOMER_NAME')
  }

  return errors
}

// Display help
function displayHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                      TENANT ONBOARDING SCRIPT                             ║
╚═══════════════════════════════════════════════════════════════════════════╝

This script initializes a new tenant on the VPS with organization, admin user,
and all required seed data.

USAGE:
  node scripts/onboard-tenant.js [OPTIONS]

OPTIONS:
  --license-id=<id>            License UUID or License Key (required)
  --customer-id=<uuid>         Customer UUID (required)
  --email=<email>              Admin user email (required)
  --name=<name>                Organization name (required)
  --tier=<tier>                License tier (optional, default: starter)
  --products=<list>            Comma-separated product list (optional, default: nexus)
  --country=<code>             Country code (optional, default: SR)
  --help                       Display this help message

ENVIRONMENT VARIABLES:
  LICENSE_ID                   License UUID or License Key
  CUSTOMER_ID                  Customer UUID
  CUSTOMER_EMAIL               Admin user email
  CUSTOMER_NAME                Organization name
  TIER                         License tier
  PRODUCTS                     Comma-separated product list
  COUNTRY                      Country code

EXAMPLES:
  # Using command line arguments
  node scripts/onboard-tenant.js \\
    --license-id=550e8400-e29b-41d4-a716-446655440000 \\
    --customer-id=660e8400-e29b-41d4-a716-446655440000 \\
    --email=admin@company.com \\
    --name="Acme Corporation" \\
    --tier=professional \\
    --products=nexus,paylinq

  # Using environment variables
  LICENSE_ID=550e8400-e29b-41d4-a716-446655440000 \\
  CUSTOMER_ID=660e8400-e29b-41d4-a716-446655440000 \\
  CUSTOMER_EMAIL=admin@company.com \\
  CUSTOMER_NAME="Acme Corporation" \\
  node scripts/onboard-tenant.js

PRODUCTS:
  - nexus         HRIS (Human Resources Information System)
  - paylinq       Payroll Management System
  - schedulehub   Scheduling and Time Tracking
  - recruitiq     Applicant Tracking System

TIERS:
  - starter       Basic tier with limited features
  - professional  Standard tier with full features
  - enterprise    Premium tier with advanced features
`)
}

// Main function
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                      TENANT ONBOARDING SCRIPT                             ║
║                          RecruitIQ Platform                               ║
╚═══════════════════════════════════════════════════════════════════════════╝
`)

  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    displayHelp()
    process.exit(0)
  }

  // Parse and validate options
  const options = parseArgs()
  const errors = validateOptions(options)

  if (errors.length > 0) {
    console.error('\n⚠️  VALIDATION ERRORS:\n')
    errors.forEach(error => console.error(`  ${error}`))
    console.error('\nRun with --help for usage information.\n')
    process.exit(1)
  }

  console.log('📋 CONFIGURATION:')
  console.log(`   License ID:  ${options.licenseId}`)
  console.log(`   Customer ID: ${options.customerId}`)
  console.log(`   Email:       ${options.customerEmail}`)
  console.log(`   Name:        ${options.customerName}`)
  console.log(`   Tier:        ${options.tier}`)
  console.log(`   Products:    ${options.products.join(', ')}`)
  console.log(`   Country:     ${options.country}`)
  console.log('')

  try {
    // Verify database connection
    console.log('🔌 Verifying database connection...')
    await pool.query('SELECT 1')
    console.log('✅ Database connection established')
    console.log('')

    // Verify license exists (try by key first, then by ID)
    console.log('🔍 Verifying license...')
    let license = null
    
    // Check if it's a UUID format (has dashes in specific positions)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.licenseId)
    
    if (isUUID) {
      // Try finding by ID
      license = await License.findById(options.licenseId)
    } else {
      // Try finding by license key
      license = await License.findByKey(options.licenseId)
    }
    
    if (!license) {
      console.error(`❌ License not found: ${options.licenseId}`)
      console.error('   Please verify the license ID/key and try again.')
      process.exit(1)
    }

    console.log(`✅ License found: ${license.license_key}`)
    console.log(`   Status: ${license.status}`)
    console.log(`   Expires: ${license.expires_at}`)
    console.log('')

    // Verify customer exists (optional - may be created externally)
    console.log('🔍 Verifying customer...')
    const customer = await Customer.findById(options.customerId)
    
    if (customer) {
      console.log(`✅ Customer found: ${customer.name}`)
      console.log(`   Email: ${customer.email}`)
      console.log(`   Country: ${customer.country || 'Not specified'}`)
      console.log('')
    } else {
      console.log(`⚠️  Customer not found in system (ID: ${options.customerId})`)
      console.log('   Continuing with provided information...')
      console.log('')
    }

    // Start tenant initialization
    console.log('🚀 Starting tenant initialization...')
    console.log('   This may take 1-2 minutes...')
    console.log('')
    console.log('─'.repeat(75))
    console.log('')

    const startTime = Date.now()

    // Determine products based on tier if not explicitly provided
    let products = options.products
    if (!products) {
      if (license.tier === 'enterprise') {
        // Enterprise tier gets all products
        products = ['nexus', 'paylinq', 'schedulehub', 'recruitiq']
        console.log('   🎯 Enterprise tier detected - enabling all products')
      } else if (license.tier === 'professional') {
        // Professional tier gets most products
        products = ['nexus', 'paylinq', 'recruitiq']
        console.log('   🎯 Professional tier detected - enabling nexus, paylinq, recruitiq')
      } else {
        // Basic/Starter tier gets nexus only
        products = ['nexus']
        console.log('   🎯 Starter/Basic tier detected - enabling nexus only')
      }
    } else {
      console.log(`   🎯 Custom products specified: ${products.join(', ')}`)
    }
    console.log('')

    const tenantData = await TenantOnboardingService.initializeTenant({
      customerId: options.customerId,
      customerName: options.customerName,
      customerEmail: options.customerEmail,
      licenseId: options.licenseId,
      tier: options.tier,
      products: products,
      country: options.country
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('')
    console.log('─'.repeat(75))
    console.log('')
    console.log('✅ TENANT ONBOARDING COMPLETED SUCCESSFULLY!')
    console.log('')
    console.log('📊 SUMMARY:')
    console.log(`   Organization ID:  ${tenantData.organizationId}`)
    console.log(`   Organization:     ${tenantData.organizationName}`)
    console.log(`   Slug:             ${tenantData.slug}`)
    console.log(`   Admin User ID:    ${tenantData.adminUserId}`)
    console.log(`   Admin Email:      ${tenantData.adminEmail}`)
    console.log(`   Temp Password:    ${tenantData.tempPassword}`)
    console.log(`   Roles Created:    ${tenantData.rolesCount}`)
    console.log(`   Duration:         ${duration}s`)
    console.log('')
    console.log('📧 NEXT STEPS:')
    console.log(`   1. Send welcome email to ${tenantData.adminEmail}`)
    console.log('   2. Include temporary password and login instructions')
    console.log('   3. Admin should change password on first login')
    console.log('   4. Configure DNS if using custom domain')
    console.log('   5. Verify SSL certificate is active')
    console.log('')
    console.log('⚠️  IMPORTANT:')
    console.log('   - Store the temporary password securely')
    console.log('   - It will be shown only once')
    console.log('   - Admin must change it on first login')
    console.log('')

    process.exit(0)

  } catch (error) {
    console.error('')
    console.error('─'.repeat(75))
    console.error('')
    console.error('❌ TENANT ONBOARDING FAILED!')
    console.error('')
    console.error('ERROR DETAILS:')
    console.error(`   Message: ${error.message}`)
    
    if (error.stack) {
      console.error('')
      console.error('STACK TRACE:')
      console.error(error.stack)
    }
    
    console.error('')
    console.error('TROUBLESHOOTING:')
    console.error('   1. Verify database connection is working')
    console.error('   2. Check that license ID is correct and exists')
    console.error('   3. Ensure customer ID is valid')
    console.error('   4. Verify email format is correct')
    console.error('   5. Check database logs for more details')
    console.error('')
    console.error('If the issue persists, contact support with:')
    console.error('   - License ID')
    console.error('   - Error message')
    console.error('   - Stack trace (above)')
    console.error('')

    process.exit(1)
  } finally {
    // Close database pool
    await pool.end()
  }
}

// Run script
main().catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
