/**
 * Tenant Onboarding Service
 * 
 * Handles complete tenant initialization when a license is created:
 * 1. Create organization record
 * 2. Create admin user account
 * 3. Seed default roles with permissions
 * 4. Seed worker types (HRIS)
 * 5. Seed payroll run types (PayLinQ)
 * 6. Seed pay components (PayLinQ)
 * 7. Seed tax rules (if applicable)
 * 8. Seed allowances and deductions
 * 
 * Based on seed files:
 * - 010_seed_test_tenant.js (organization + admin user)
 * - 011_seed_rbac_tenant_roles.js (roles + permission assignments)
 * - 012_seed_worker_types.js (HRIS worker types)
 * - 013_seed_payroll_run_types.js (PayLinQ run types)
 * - 014_seed_formula_templates.js (global templates)
 * - 015_seed_suriname_tax_rules.js (tax rules for SR)
 * - 016_seed_allowances.js (tax-free allowances)
 * - 017_seed_forfaitair_components.js (default pay components)
 */

import pool from '../../../config/database.js'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

class TenantOnboardingService {
  /**
   * Initialize complete tenant (organization + admin + seed data)
   * 
   * @param {Object} options - Tenant initialization options
   * @param {string} options.customerId - Customer UUID
   * @param {string} options.customerName - Customer/Organization name
   * @param {string} options.customerEmail - Admin user email
   * @param {string} options.licenseId - License UUID
   * @param {string} options.tier - License tier (starter/professional/enterprise)
   * @param {Array<string>} options.products - Enabled products (default: ['nexus'])
   * @param {string} options.country - Country code (default: 'SR')
   * @returns {Promise<Object>} Created tenant data
   */
  async initializeTenant(options) {
    const {
      customerId,
      customerName,
      customerEmail,
      licenseId,
      tier = 'starter',
      products = ['nexus'],
      country = 'SR'
    } = options

    console.log('[TENANT ONBOARDING] Starting tenant initialization...')
    console.log(`[INFO] Customer: ${customerName} (${customerEmail})`)
    console.log(`[INFO] License: ${licenseId} - Tier: ${tier}`)
    console.log(`[INFO] Products: ${products.join(', ')}`)

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // ========================================================================
      // STEP 1: Create Organization
      // ========================================================================
      console.log('[1/8] Creating organization...')
      
      const orgId = uuidv4()
      const slug = this._generateSlug(customerName)
      
      await client.query(`
        INSERT INTO organizations (
          id, name, slug, tier, license_key, settings
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        orgId,
        customerName,
        slug,
        tier,
        licenseId, // Store the license ID (which may be license key or UUID)
        JSON.stringify({
          timezone: 'America/Paramaribo',
          locale: 'nl-SR',
          currency: 'SRD',
          dateFormat: 'DD-MM-YYYY',
          country: country,
          products: products // Store products in settings
        })
      ])

      console.log(`[OK] Organization created: ${orgId}`)

      // ========================================================================
      // STEP 2: Create Admin User
      // ========================================================================
      console.log('[2/8] Creating admin user...')
      
      const userId = uuidv4()
      const tempPassword = this._generateTempPassword()
      const passwordHash = await bcrypt.hash(tempPassword, 12)
      
      await client.query(`
        INSERT INTO hris.user_account (
          id, organization_id, email, password_hash, 
          enabled_products, is_active, email_verified, account_status, created_at
        ) VALUES ($1, $2, $3, $4, $5::jsonb, true, true, 'active', NOW())
      `, [
        userId,
        orgId,
        customerEmail,
        passwordHash,
        JSON.stringify(products) // Store enabled products as JSONB array
      ])

      console.log(`[OK] Admin user created: ${customerEmail}`)
      console.log(`[INFO] Temporary password: ${tempPassword}`)

      // ========================================================================
      // STEP 3: Seed Default Roles with Permissions
      // ========================================================================
      console.log('[3/8] Seeding default roles...')
      
      await this._seedRoles(client, orgId, userId)

      // ========================================================================
      // STEP 4: Seed Worker Types (HRIS)
      // ========================================================================
      if (products.includes('nexus')) {
        console.log('[4/8] Seeding worker types...')
        await this._seedWorkerTypes(client, orgId, userId)
      } else {
        console.log('[4/8] Skipping worker types (Nexus not enabled)')
      }

      // ========================================================================
      // STEP 5: Seed Payroll Run Types (PayLinQ)
      // ========================================================================
      if (products.includes('paylinq')) {
        console.log('[5/8] Seeding payroll run types...')
        await this._seedPayrollRunTypes(client, orgId, userId)
      } else {
        console.log('[5/8] Skipping payroll run types (PayLinQ not enabled)')
      }

      // ========================================================================
      // STEP 6: Seed Pay Components (PayLinQ)
      // ========================================================================
      if (products.includes('paylinq')) {
        console.log('[6/8] Seeding pay components...')
        await this._seedPayComponents(client, orgId, userId)
      } else {
        console.log('[6/8] Skipping pay components (PayLinQ not enabled)')
      }

      // ========================================================================
      // STEP 7: Seed Tax Rules (Country-specific)
      // ========================================================================
      if (products.includes('paylinq') && country === 'SR') {
        console.log('[7/8] Seeding Suriname tax rules...')
        await this._seedTaxRules(client, orgId, userId)
      } else {
        console.log('[7/8] Skipping tax rules')
      }

      // ========================================================================
      // STEP 8: Seed Allowances & Deductions
      // ========================================================================
      if (products.includes('paylinq')) {
        console.log('[8/8] Seeding allowances and deductions...')
        await this._seedAllowances(client, orgId, userId)
      } else {
        console.log('[8/8] Skipping allowances (PayLinQ not enabled)')
      }

      await client.query('COMMIT')

      console.log('[SUCCESS] Tenant onboarding completed!')

      return {
        organizationId: orgId,
        organizationSlug: slug,
        adminUserId: userId,
        adminEmail: customerEmail,
        tempPassword: tempPassword,
        productsEnabled: products,
        message: 'Tenant initialized successfully. Admin must change password on first login.'
      }

    } catch (error) {
      await client.query('ROLLBACK')
      console.error('[ERROR] Tenant onboarding failed:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Generate URL-friendly slug from organization name
   */
  _generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
  }

  /**
   * Generate secure temporary password
   */
  _generateTempPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  /**
   * Seed default RBAC roles with permission assignments
   * Based on: 011_seed_rbac_tenant_roles.js
   */
  async _seedRoles(client, orgId, userId) {
    // Get all platform permissions for assignment
    const permissionsResult = await client.query(`
      SELECT id, name FROM permissions ORDER BY name
    `)
    const allPermissions = permissionsResult.rows

    // Define roles with their permission patterns
    const roles = [
      {
        name: 'org_admin',
        displayName: 'Organization Administrator',
        description: 'Full administrative access to all products and settings',
        permissions: allPermissions.map(p => p.id) // All permissions
      },
      {
        name: 'hr_manager',
        displayName: 'HR Manager',
        description: 'Manage employees, departments, attendance, and HR operations',
        permissions: allPermissions.filter(p => 
          p.name.startsWith('nexus:') || 
          p.name.startsWith('scheduling:') ||
          p.name.includes(':read')
        ).map(p => p.id)
      },
      {
        name: 'payroll_admin',
        displayName: 'Payroll Administrator',
        description: 'Full payroll management access',
        permissions: allPermissions.filter(p => 
          p.name.startsWith('payroll:') ||
          p.name.startsWith('nexus:employee:')
        ).map(p => p.id)
      },
      {
        name: 'payroll_manager',
        displayName: 'Payroll Manager',
        description: 'Manage payroll runs and employee payroll data',
        permissions: allPermissions.filter(p => 
          p.name.startsWith('payroll:run:') ||
          p.name.startsWith('payroll:employee:') ||
          p.name === 'payroll:payment:read' ||
          p.name.startsWith('nexus:employee:')
        ).map(p => p.id)
      },
      {
        name: 'scheduler',
        displayName: 'Scheduler',
        description: 'Create and manage work schedules',
        permissions: allPermissions.filter(p => 
          p.name.startsWith('scheduling:') ||
          p.name.includes('employee:read')
        ).map(p => p.id)
      },
      {
        name: 'recruiter',
        displayName: 'Recruiter',
        description: 'Manage job postings and recruitment process',
        permissions: allPermissions.filter(p => 
          p.name.startsWith('recruitiq:')
        ).map(p => p.id)
      },
      {
        name: 'hiring_manager',
        displayName: 'Hiring Manager',
        description: 'Review applications and conduct interviews',
        permissions: allPermissions.filter(p => 
          p.name.startsWith('recruitiq:application:') ||
          p.name.startsWith('recruitiq:interview:') ||
          p.name.startsWith('recruitiq:job:read')
        ).map(p => p.id)
      },
      {
        name: 'manager',
        displayName: 'Manager',
        description: 'Manage team members and schedules',
        permissions: allPermissions.filter(p => 
          p.name.includes(':read') ||
          p.name.startsWith('nexus:timeoff:') ||
          p.name.startsWith('scheduling:shift:')
        ).map(p => p.id)
      },
      {
        name: 'employee',
        displayName: 'Employee',
        description: 'Basic employee access - view own information',
        permissions: allPermissions.filter(p => 
          p.name.includes(':read') &&
          (p.name.includes('employee') || p.name.includes('timeoff') || p.name.includes('attendance'))
        ).map(p => p.id)
      }
    ]

    for (const role of roles) {
      // Insert role
      const roleResult = await client.query(`
        INSERT INTO roles (
          organization_id, name, display_name, role_type, description, is_active
        ) VALUES ($1, $2, $3, 'tenant', $4, true)
        RETURNING id
      `, [orgId, role.name, role.displayName, role.description])

      const roleId = roleResult.rows[0].id

      // Assign permissions to role
      if (role.permissions.length > 0) {
        const values = role.permissions.map(permId => 
          `('${roleId}', '${permId}')`
        ).join(',')

        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ${values}
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `)
      }

      console.log(`  [+] Role: ${role.displayName} (${role.permissions.length} permissions)`)
    }

    // Assign org_admin role to the admin user
    const adminRole = await client.query(`
      SELECT id FROM roles 
      WHERE organization_id = $1 AND name = 'org_admin'
    `, [orgId])

    if (adminRole.rows.length > 0) {
      await client.query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
      `, [userId, adminRole.rows[0].id])

      console.log('  [+] Assigned org_admin role to admin user')
    }
  }

  /**
   * Seed worker types
   * Based on: 012_seed_worker_types.js
   */
  async _seedWorkerTypes(client, orgId, userId) {
    const workerTypes = [
      {
        code: 'FT',
        name: 'Full-Time',
        description: 'Full-time employee with standard benefits',
        standardHours: 40,
        isActive: true,
        benefitsEligible: true,
        overtimeEligible: true,
        defaultPayFrequency: 'monthly'
      },
      {
        code: 'PT',
        name: 'Part-Time',
        description: 'Part-time employee with pro-rated benefits',
        standardHours: 20,
        isActive: true,
        benefitsEligible: true,
        overtimeEligible: true,
        defaultPayFrequency: 'monthly'
      },
      {
        code: 'CTR',
        name: 'Contractor',
        description: 'Independent contractor',
        standardHours: 40,
        isActive: true,
        benefitsEligible: false,
        overtimeEligible: false,
        defaultPayFrequency: 'monthly'
      },
      {
        code: 'TMP',
        name: 'Temporary',
        description: 'Temporary worker for short-term projects',
        standardHours: 40,
        isActive: true,
        benefitsEligible: false,
        overtimeEligible: true,
        defaultPayFrequency: 'weekly'
      },
      {
        code: 'INT',
        name: 'Intern',
        description: 'Student intern or trainee',
        standardHours: 20,
        isActive: true,
        benefitsEligible: false,
        overtimeEligible: false,
        defaultPayFrequency: 'monthly'
      },
      {
        code: 'FRL',
        name: 'Freelance',
        description: 'Freelance worker paid per project',
        standardHours: null,
        isActive: true,
        benefitsEligible: false,
        overtimeEligible: false,
        defaultPayFrequency: 'project'
      },
      {
        code: 'SEA',
        name: 'Seasonal',
        description: 'Seasonal worker',
        standardHours: 40,
        isActive: true,
        benefitsEligible: false,
        overtimeEligible: true,
        defaultPayFrequency: 'weekly'
      }
    ]

    for (const wt of workerTypes) {
      await client.query(`
        INSERT INTO hris.worker_type (
          organization_id, code, name, description,
          benefits_eligible, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (organization_id, code) DO NOTHING
      `, [
        orgId, wt.code, wt.name, wt.description,
        wt.benefitsEligible, wt.isActive, userId
      ])

      console.log(`  [+] Worker Type: ${wt.name} (${wt.code})`)
    }
  }

  /**
   * Seed payroll run types
   * Based on: 013_seed_payroll_run_types.js
   */
  async _seedPayrollRunTypes(client, orgId, userId) {
    const runTypes = [
      {
        typeCode: 'REGULAR',
        typeName: 'Regular Payroll',
        description: 'Standard monthly payroll run',
        componentOverrideMode: 'default',
        allowedComponents: [],
        excludedComponents: [],
        isActive: true
      },
      {
        typeCode: 'VAKANTIEGELD',
        typeName: 'Holiday Allowance (Vakantiegeld)',
        description: 'Annual holiday allowance payment (8% of gross)',
        componentOverrideMode: 'explicit',
        allowedComponents: ['BASE_SALARY', 'VAKANTIEGELD'],
        excludedComponents: ['LOONBELASTING', 'AOV', 'AWW'],
        isActive: true
      },
      {
        typeCode: 'BONUS',
        typeName: 'Bonus Payment',
        description: 'One-time bonus or incentive payment',
        componentOverrideMode: 'explicit',
        allowedComponents: ['BONUS', 'LOONBELASTING', 'AOV', 'AWW'],
        excludedComponents: [],
        isActive: true
      },
      {
        typeCode: 'MONTH13',
        typeName: '13th Month Salary',
        description: '13th month payment (if applicable)',
        componentOverrideMode: 'explicit',
        allowedComponents: ['BASE_SALARY', 'MONTH_13', 'LOONBELASTING', 'AOV', 'AWW'],
        excludedComponents: [],
        isActive: true
      },
      {
        typeCode: 'ADJUSTMENT',
        typeName: 'Adjustment',
        description: 'Payroll adjustment or correction',
        componentOverrideMode: 'explicit',
        allowedComponents: [],
        excludedComponents: [],
        isActive: true
      },
      {
        typeCode: 'FINAL',
        typeName: 'Final Settlement',
        description: 'Final payroll for terminated employee',
        componentOverrideMode: 'default',
        allowedComponents: [],
        excludedComponents: [],
        isActive: true
      },
      {
        typeCode: 'COMMISSION',
        typeName: 'Commission Payment',
        description: 'Sales commission or variable pay',
        componentOverrideMode: 'explicit',
        allowedComponents: ['COMMISSION', 'LOONBELASTING', 'AOV', 'AWW'],
        excludedComponents: [],
        isActive: true
      }
    ]

    for (const rt of runTypes) {
      await client.query(`
        INSERT INTO payroll.payroll_run_type (
          organization_id, type_code, type_name, description,
          component_override_mode, allowed_components, excluded_components,
          is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (organization_id, type_code) DO NOTHING
      `, [
        orgId, rt.typeCode, rt.typeName, rt.description,
        rt.componentOverrideMode,
        JSON.stringify(rt.allowedComponents),
        JSON.stringify(rt.excludedComponents),
        rt.isActive, userId
      ])

      console.log(`  [+] Run Type: ${rt.typeName}`)
    }
  }

  /**
   * Seed pay components
   * Based on: 017_seed_forfaitair_components.js
   */
  async _seedPayComponents(client, orgId, userId) {
    const components = [
      // Earnings
      {
        code: 'BASE_SALARY',
        name: 'Basissalaris',
        type: 'earning',
        category: 'gross',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 1
      },
      {
        code: 'OVERTIME',
        name: 'Overuren',
        type: 'earning',
        category: 'gross',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 2
      },
      {
        code: 'BONUS',
        name: 'Bonus',
        type: 'earning',
        category: 'gross',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 3
      },
      {
        code: 'VAKANTIEGELD',
        name: 'Vakantiegeld',
        type: 'earning',
        category: 'gross',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 4
      },
      // Deductions
      {
        code: 'LOONBELASTING',
        name: 'Loonbelasting',
        type: 'deduction',
        category: 'tax',
        isTaxable: false,
        isStatutory: true,
        displayOrder: 10
      },
      {
        code: 'AOV',
        name: 'AOV (Ouderdomspensioen)',
        type: 'deduction',
        category: 'social_security',
        isTaxable: false,
        isStatutory: true,
        displayOrder: 11
      },
      {
        code: 'AWW',
        name: 'AWW (Weduwen en Wezen)',
        type: 'deduction',
        category: 'social_security',
        isTaxable: false,
        isStatutory: true,
        displayOrder: 12
      },
      {
        code: 'PENSIOEN',
        name: 'Pensioen',
        type: 'deduction',
        category: 'pension',
        isTaxable: false,
        isStatutory: false,
        displayOrder: 13
      },
      {
        code: 'ZORGVERZEKERING',
        name: 'Zorgverzekering',
        type: 'deduction',
        category: 'insurance',
        isTaxable: false,
        isStatutory: false,
        displayOrder: 14
      }
    ]

    for (const comp of components) {
      await client.query(`
        INSERT INTO payroll.pay_component (
          organization_id, component_code, component_name, component_type,
          component_category, is_taxable, is_statutory, display_order,
          is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
        ON CONFLICT (organization_id, component_code) DO NOTHING
      `, [
        orgId, comp.code, comp.name, comp.type,
        comp.category, comp.isTaxable, comp.isStatutory,
        comp.displayOrder, userId
      ])

      console.log(`  [+] Component: ${comp.name} (${comp.code})`)
    }
  }

  /**
   * Seed Suriname tax rules
   * Based on: 015_seed_suriname_tax_rules.js
   * 
   * Note: This is simplified. Full implementation should include
   * all tax brackets and rules from the seed file.
   */
  async _seedTaxRules(client, orgId, userId) {
    // Create 2025 Wage Tax rule set
    const taxRuleResult = await client.query(`
      INSERT INTO payroll.tax_rule_set (
        organization_id, rule_name, country_code, rule_type,
        effective_start_date, effective_end_date, calculation_frequency,
        is_active, created_by
      ) VALUES ($1, 'Suriname Wage Tax 2025', 'SR', 'wage_tax', 
                '2025-01-01', '2025-12-31', 'annual', true, $2)
      RETURNING id
    `, [orgId, userId])

    const taxRuleId = taxRuleResult.rows[0].id

    // Seed 2025 tax brackets (simplified - monthly rates)
    const brackets = [
      { min: 0, max: 2500, rate: 0.00 },
      { min: 2500, max: 5000, rate: 0.08 },
      { min: 5000, max: 8333.33, rate: 0.18 },
      { min: 8333.33, max: 16666.67, rate: 0.28 },
      { min: 16666.67, max: null, rate: 0.38 }
    ]

    for (const bracket of brackets) {
      await client.query(`
        INSERT INTO payroll.tax_bracket (
          tax_rule_set_id, bracket_min, bracket_max, tax_rate
        ) VALUES ($1, $2, $3, $4)
      `, [taxRuleId, bracket.min, bracket.max, bracket.rate])
    }

    console.log('  [+] Tax brackets created')

    // Create AOV rule (4% flat rate)
    await client.query(`
      INSERT INTO payroll.tax_rule_set (
        organization_id, rule_name, country_code, rule_type,
        effective_start_date, effective_end_date, calculation_frequency,
        is_active, created_by
      ) VALUES ($1, 'Suriname AOV 2025', 'SR', 'social_security', 
                '2025-01-01', '2025-12-31', 'annual', true, $2)
    `, [orgId, userId])

    // Create AWW rule (1% flat rate)
    await client.query(`
      INSERT INTO payroll.tax_rule_set (
        organization_id, rule_name, country_code, rule_type,
        effective_start_date, effective_end_date, calculation_frequency,
        is_active, created_by
      ) VALUES ($1, 'Suriname AWW 2025', 'SR', 'social_security', 
                '2025-01-01', '2025-12-31', 'annual', true, $2)
    `, [orgId, userId])

    console.log('  [+] Social security rules created (AOV, AWW)')
  }

  /**
   * Seed allowances and deductions
   * Based on: 016_seed_allowances.js
   */
  async _seedAllowances(client, orgId, userId) {
    const allowances = [
      {
        code: 'TAX_FREE_ANNUAL',
        name: 'Tax-Free Sum (Annual)',
        type: 'tax_free',
        amount: 30000.00,
        frequency: 'annual',
        isActive: true
      },
      {
        code: 'TAX_FREE_MONTHLY',
        name: 'Tax-Free Sum (Monthly)',
        type: 'tax_free',
        amount: 2500.00,
        frequency: 'monthly',
        isActive: true
      },
      {
        code: 'HOLIDAY_ALLOWANCE',
        name: 'Holiday Allowance (8%)',
        type: 'holiday',
        amount: 0.08,
        frequency: 'annual',
        isActive: true
      }
    ]

    for (const allowance of allowances) {
      await client.query(`
        INSERT INTO payroll.allowance (
          organization_id, allowance_code, allowance_name, allowance_type,
          allowance_amount, allowance_frequency, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (organization_id, allowance_code) DO NOTHING
      `, [
        orgId, allowance.code, allowance.name, allowance.type,
        allowance.amount, allowance.frequency, allowance.isActive, userId
      ])

      console.log(`  [+] Allowance: ${allowance.name}`)
    }
  }
}

export default new TenantOnboardingService()
