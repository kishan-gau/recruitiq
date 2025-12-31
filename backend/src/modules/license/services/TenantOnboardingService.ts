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


    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // ========================================================================
      // STEP 1: Create Organization
      // ========================================================================
      
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


      // ========================================================================
      // STEP 2: Create Admin User
      // ========================================================================
      
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


      // ========================================================================
      // STEP 3: Seed Default Roles with Permissions
      // ========================================================================
      
      await this._seedRoles(client, orgId, userId)

      // ========================================================================
      // STEP 4: Seed Worker Types (HRIS)
      // ========================================================================
      if (products.includes('nexus')) {
        await this._seedWorkerTypes(client, orgId, userId)
      } else {
      }

      // ========================================================================
      // STEP 5: Seed Payroll Run Types (PayLinQ)
      // ========================================================================
      if (products.includes('paylinq')) {
        await this._seedPayrollRunTypes(client, orgId, userId)
      } else {
      }

      // ========================================================================
      // STEP 6: Seed Pay Components (PayLinQ)
      // ========================================================================
      if (products.includes('paylinq')) {
        await this._seedPayComponents(client, orgId, userId)
      } else {
      }

      // ========================================================================
      // STEP 7: Seed Tax Rules (Country-specific)
      // ========================================================================
      if (products.includes('paylinq') && country === 'SR') {
        await this._seedTaxRules(client, orgId, userId)
      } else {
      }

      // ========================================================================
      // STEP 8: Seed Allowances & Deductions
      // ========================================================================
      if (products.includes('paylinq')) {
        await this._seedAllowances(client, orgId, userId)
      } else {
      }

      await client.query('COMMIT')


      return {
        organizationId: orgId,
        organizationSlug: slug,
        adminUserId: userId,
        adminEmail: customerEmail,
        tempPassword: tempPassword,
        productsEnabled: products,
        message: 'Tenant initialized successfully. Admin must change password on first login.'
      }

    } catch (_error) {
      await client.query('ROLLBACK')
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

    }
  }

  /**
   * Seed pay components
   * Based on: 017_seed_forfaitair_components.js
   * 
   * Complete set of 37 standard pay components including forfaitair components for Suriname payroll
   */
  async _seedPayComponents(client, orgId, userId) {
    const components = [
      // ==================== EARNINGS (Gross Pay) ====================
      // Base salary components
      {
        code: 'BASE_SALARY',
        name: 'Basissalaris',
        type: 'earning',
        category: 'gross',
        description: 'Regular base salary',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 1
      },
      {
        code: 'HOURLY_WAGE',
        name: 'Uurloon',
        type: 'earning',
        category: 'gross',
        description: 'Hourly wage for hourly employees',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 2
      },

      // Overtime
      {
        code: 'OVERTIME_1_5X',
        name: 'Overuren 1.5x',
        type: 'earning',
        category: 'gross',
        description: 'Overtime pay at 1.5x rate',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 3
      },
      {
        code: 'OVERTIME_2X',
        name: 'Overuren 2x',
        type: 'earning',
        category: 'gross',
        description: 'Overtime pay at 2x rate (weekends/holidays)',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 4
      },

      // Bonuses and commissions
      {
        code: 'BONUS',
        name: 'Bonus',
        type: 'earning',
        category: 'gross',
        description: 'Performance or discretionary bonus',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 5
      },
      {
        code: 'COMMISSION',
        name: 'Commissie',
        type: 'earning',
        category: 'gross',
        description: 'Sales commission',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 6
      },
      {
        code: 'MONTH_13',
        name: '13e Maand',
        type: 'earning',
        category: 'gross',
        description: '13th month salary',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 7
      },
      {
        code: 'GRATUITY',
        name: 'Gratificatie',
        type: 'earning',
        category: 'gross',
        description: 'End-of-year gratuity',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 8
      },

      // Allowances (taxable)
      {
        code: 'TRANSPORT_ALLOWANCE',
        name: 'Reiskostenvergoeding',
        type: 'earning',
        category: 'allowance',
        description: 'Transportation allowance',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 9
      },
      {
        code: 'MEAL_ALLOWANCE',
        name: 'Maaltijdvergoeding',
        type: 'earning',
        category: 'allowance',
        description: 'Meal allowance',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 10
      },
      {
        code: 'HOUSING_ALLOWANCE',
        name: 'Huisvestingsvergoeding',
        type: 'earning',
        category: 'allowance',
        description: 'Housing allowance',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 11
      },
      {
        code: 'TELEPHONE_ALLOWANCE',
        name: 'Telefoonvergoeding',
        type: 'earning',
        category: 'allowance',
        description: 'Telephone/mobile allowance',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 12
      },
      {
        code: 'CHILD_ALLOWANCE',
        name: 'Kinderbijslag',
        type: 'earning',
        category: 'allowance',
        description: 'Child benefit allowance',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 13
      },
      {
        code: 'EXCHANGE_RATE_ALLOWANCE',
        name: 'Wisselkoersvergoeding',
        type: 'earning',
        category: 'allowance',
        description: 'Exchange rate compensation',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 14
      },

      // Statutory earning
      {
        code: 'VAKANTIEGELD',
        name: 'Vakantiegeld (8%)',
        type: 'earning',
        category: 'statutory',
        description: 'Annual vacation allowance (8% of gross)',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 15
      },

      // ==================== DEDUCTIONS ====================
      // Statutory deductions (Taxes and Social Security)
      {
        code: 'LOONBELASTING',
        name: 'Loonbelasting',
        type: 'deduction',
        category: 'tax',
        description: 'Wage tax (progressive rates)',
        isTaxable: false,
        isStatutory: true,
        displayOrder: 101
      },
      {
        code: 'AOV',
        name: 'AOV (Ouderdomspensioen)',
        type: 'deduction',
        category: 'social_security',
        description: 'Old Age Pension (4% of gross)',
        isTaxable: false,
        isStatutory: true,
        displayOrder: 102
      },
      {
        code: 'AWW',
        name: 'AWW (Weduwen en Wezen)',
        type: 'deduction',
        category: 'social_security',
        description: 'Widow and Orphan Pension (1% of gross)',
        isTaxable: false,
        isStatutory: true,
        displayOrder: 103
      },

      // Voluntary deductions (Pension and Insurance)
      {
        code: 'PENSIOEN_EMPLOYEE',
        name: 'Pensioen (Werknemer)',
        type: 'deduction',
        category: 'pension',
        description: 'Employee pension contribution',
        isTaxable: false,
        isStatutory: false,
        displayOrder: 104
      },
      {
        code: 'PENSIOEN_EMPLOYER',
        name: 'Pensioen (Werkgever)',
        type: 'deduction',
        category: 'pension',
        description: 'Employer pension contribution',
        isTaxable: false,
        isStatutory: false,
        displayOrder: 105
      },
      {
        code: 'ZORGVERZEKERING',
        name: 'Zorgverzekering',
        type: 'deduction',
        category: 'insurance',
        description: 'Health insurance premium',
        isTaxable: false,
        isStatutory: false,
        displayOrder: 106
      },
      {
        code: 'LIFE_INSURANCE',
        name: 'Levensverzekering',
        type: 'deduction',
        category: 'insurance',
        description: 'Life insurance premium',
        isTaxable: false,
        isStatutory: false,
        displayOrder: 107
      },

      // Other deductions
      {
        code: 'ADVANCE_PAYMENT',
        name: 'Voorschot',
        type: 'deduction',
        category: 'advance',
        description: 'Salary advance repayment',
        isTaxable: false,
        isStatutory: false,
        displayOrder: 108
      },
      {
        code: 'LOAN_REPAYMENT',
        name: 'Lening Aflossing',
        type: 'deduction',
        category: 'loan',
        description: 'Company loan repayment',
        isTaxable: false,
        isStatutory: false,
        displayOrder: 109
      },
      {
        code: 'UNION_DUES',
        name: 'Vakbondsbijdrage',
        type: 'deduction',
        category: 'membership',
        description: 'Union membership dues',
        isTaxable: false,
        isStatutory: false,
        displayOrder: 110
      },
      {
        code: 'GARNISHMENT',
        name: 'Loonbeslag',
        type: 'deduction',
        category: 'legal',
        description: 'Court-ordered wage garnishment',
        isTaxable: false,
        isStatutory: false,
        displayOrder: 111
      },

      // ==================== EMPLOYER CONTRIBUTIONS ====================
      {
        code: 'EMPLOYER_AOV',
        name: 'Werkgeversbijdrage AOV',
        type: 'employer_contribution',
        category: 'social_security',
        description: 'Employer AOV contribution (4%)',
        isTaxable: false,
        isStatutory: true,
        displayOrder: 201
      },
      {
        code: 'EMPLOYER_AWW',
        name: 'Werkgeversbijdrage AWW',
        type: 'employer_contribution',
        category: 'social_security',
        description: 'Employer AWW contribution (1%)',
        isTaxable: false,
        isStatutory: true,
        displayOrder: 202
      },
      {
        code: 'EMPLOYER_PENSION',
        name: 'Werkgeversbijdrage Pensioen',
        type: 'employer_contribution',
        category: 'pension',
        description: 'Employer pension contribution',
        isTaxable: false,
        isStatutory: false,
        displayOrder: 203
      },
      {
        code: 'EMPLOYER_INSURANCE',
        name: 'Werkgeversbijdrage Verzekering',
        type: 'employer_contribution',
        category: 'insurance',
        description: 'Employer insurance contribution',
        isTaxable: false,
        isStatutory: false,
        displayOrder: 204
      },

      // ==================== BENEFIT COMPONENTS ====================
      // These components represent actual benefits provided to employees
      // They trigger forfait taxation calculations per Wet Loonbelasting Art. 10-11
      {
        code: 'CAR_BENEFIT',
        name: 'Autovoordeel',
        type: 'benefit',
        category: 'transport',
        description: 'Company car benefit - triggers forfait taxation per Wet Loonbelasting Art. 11',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 250,
        requiresConfiguration: true,
        configurationFields: {
          catalogValue: { type: 'number', required: true, min: 0, label: 'Car Catalog Value (SRD)' },
          registrationDate: { type: 'date', required: true, label: 'Registration Date' },
          businessUsePercentage: { type: 'number', required: false, min: 0, max: 100, default: 100, label: 'Business Use %' }
        },
        calculationMetadata: {
          forfaitRule: {
            enabled: true,
            benefitType: 'company_car',
            forfaitComponentCode: 'CAR_FORFAIT_2PCT',
            calculationType: 'percentage_of_catalog_value',
            rate: 2.0,
            valueMapping: {
              catalogValue: {
                sourceField: 'catalogValue',
                targetField: 'catalogValue',
                required: true
              }
            },
            description: '2% of catalog value per year (Article 11 Wet Loonbelasting)',
            legalReference: 'Article 11, Wet Loonbelasting (Suriname)'
          }
        }
      },
      {
        code: 'HOUSING_BENEFIT',
        name: 'Huisvestingsvoordeel',
        type: 'benefit',
        category: 'housing',
        description: 'Housing benefit provided by employer - subject to forfait taxation at 7.5%',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 251,
        requiresConfiguration: true,
        configurationFields: {
          rentalValue: { type: 'number', required: true, min: 0, label: 'Monthly Rental Value (SRD)' },
          propertyType: { type: 'select', options: ['apartment', 'house', 'room'], required: true, label: 'Property Type' }
        },
        calculationMetadata: {
          forfaitRule: {
            enabled: true,
            benefitType: 'housing',
            forfaitComponentCode: 'HOUSING_FORFAIT_7_5PCT',
            calculationType: 'percentage_of_rental_value',
            rate: 7.5,
            valueMapping: {
              rentalValue: {
                sourceField: 'rentalValue',
                targetField: 'rentalValue',
                required: true
              }
            },
            description: '7.5% of monthly rental value (Article 10 Wet Loonbelasting)',
            legalReference: 'Article 10, Wet Loonbelasting (Suriname)'
          }
        }
      },
      {
        code: 'MEAL_BENEFIT',
        name: 'Maaltijdvoordeel',
        type: 'benefit',
        category: 'meal',
        description: 'Meal benefit - hot meals subject to forfait taxation per Wet Loonbelasting',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 252,
        requiresConfiguration: true,
        configurationFields: {
          mealsPerMonth: { type: 'number', required: true, min: 1, max: 31, label: 'Meals Per Month' },
          mealType: { type: 'select', options: ['hot_meal', 'cold_meal', 'voucher'], required: true, label: 'Meal Type' }
        },
        calculationMetadata: {
          forfaitRule: {
            enabled: true,
            benefitType: 'hot_meals',
            forfaitComponentCode: 'MEAL_FORFAIT_1_50',
            calculationType: 'fixed_per_meal',
            fixedAmount: 1.50,
            valueMapping: {
              mealsPerMonth: {
                sourceField: 'mealsPerMonth',
                targetField: 'mealsPerMonth',
                required: true
              }
            },
            description: 'SRD 1.50 per hot meal (Article 10 Wet Loonbelasting)',
            legalReference: 'Article 10, Wet Loonbelasting (Suriname)'
          }
        }
      },
      {
        code: 'FUEL_BENEFIT',
        name: 'Brandstofvoordeel',
        type: 'benefit',
        category: 'transport',
        description: 'Fuel allowance benefit - subject to forfait taxation',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 253,
        requiresConfiguration: true,
        configurationFields: {
          monthlyAmount: { type: 'number', required: true, min: 0, label: 'Monthly Fuel Amount (SRD)' },
          fuelType: { type: 'select', options: ['gasoline', 'diesel', 'electric'], required: true, label: 'Fuel Type' }
        },
        calculationMetadata: {
          forfaitRule: {
            enabled: true,
            benefitType: 'fuel_allowance',
            forfaitComponentCode: 'FUEL_FORFAIT_20PCT',
            calculationType: 'percentage_of_amount',
            rate: 20.0,
            valueMapping: {
              monthlyAmount: {
                sourceField: 'monthlyAmount',
                targetField: 'allowanceAmount',
                required: true
              }
            },
            description: '20% of monthly fuel allowance (Article 10 Wet Loonbelasting)',
            legalReference: 'Article 10, Wet Loonbelasting (Suriname)'
          }
        }
      },
      {
        code: 'PHONE_BENEFIT',
        name: 'Telefoonvoordeel',
        type: 'benefit',
        category: 'communication',
        description: 'Company phone benefit - taxable benefit per employer policy',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 254,
        requiresConfiguration: true,
        configurationFields: {
          monthlyValue: { type: 'number', required: true, min: 0 },
          phoneType: { type: 'select', options: ['mobile', 'landline', 'both'], required: true }
        },
        calculationMetadata: {
          forfaitRule: {
            enabled: true,
            benefitType: 'communication_allowance',
            forfaitComponentCode: 'PHONE_FORFAIT_10PCT',
            calculationType: 'percentage_of_amount',
            rate: 10.0,
            valueMapping: {
              monthlyValue: {
                sourceField: 'monthlyValue',
                targetField: 'allowanceAmount',
                required: true
              }
            },
            description: '10% of monthly communication allowance (Article 10 Wet Loonbelasting)',
            legalReference: 'Article 10, Wet Loonbelasting (Suriname)'
          }
        }
      },
      {
        code: 'MEDICAL_BENEFIT',
        name: 'Medisch Voordeel',
        type: 'benefit',
        category: 'medical',
        description: 'Medical/health insurance benefit - progressive forfait taxation',
        isTaxable: true,
        isStatutory: false,
        displayOrder: 255,
        requiresConfiguration: true,
        configurationFields: {
          monthlyPremium: { type: 'number', required: true, min: 0 },
          coverageType: { type: 'select', options: ['basic', 'extended', 'family'], required: true }
        },
        calculationMetadata: {
          forfaitRule: {
            enabled: true,
            benefitType: 'medical_insurance',
            forfaitComponentCode: 'MEDICAL_FORFAIT_15PCT',
            calculationType: 'percentage_of_amount',
            rate: 15.0,
            valueMapping: {
              monthlyPremium: {
                sourceField: 'monthlyPremium',
                targetField: 'premiumAmount',
                required: true
              }
            },
            description: '15% of monthly medical premium (Article 10 Wet Loonbelasting)',
            legalReference: 'Article 10, Wet Loonbelasting (Suriname)'
          }
        }
      },

      // ==================== FORFAITAIR COMPONENTS (BENEFIT TAXATION) ====================
      // These are the forfait components referenced by ForfaitRuleService
      // All tenants need these for proper forfait calculation
      {
        code: 'CAR_FORFAIT_2PCT',
        name: 'Auto Forfait (2%)',
        type: 'deduction',
        category: 'benefit_forfait',
        description: 'Forfait car benefit taxation at 2% of gross salary (Wet Loonbelasting Art. 11)',
        isTaxable: true,
        isStatutory: true,
        displayOrder: 300
      },
      {
        code: 'CAR_FORFAIT_3PCT',
        name: 'Auto Forfait (3%)',
        type: 'deduction',
        category: 'benefit_forfait',
        description: 'Forfait car benefit taxation at 3% of gross salary (Wet Loonbelasting Art. 11)',
        isTaxable: true,
        isStatutory: true,
        displayOrder: 301
      },
      {
        code: 'HOUSING_FORFAIT_7_5PCT',
        name: 'Huisvesting Forfait (7.5%)',
        type: 'deduction',
        category: 'benefit_forfait',
        description: 'Forfait housing benefit taxation at 7.5% of gross salary (Wet Loonbelasting Art. 11)',
        isTaxable: true,
        isStatutory: true,
        displayOrder: 302
      },
      {
        code: 'MEAL_FORFAIT_HOT',
        name: 'Warme Maaltijd Forfait',
        type: 'deduction',
        category: 'benefit_forfait',
        description: 'Forfait hot meal benefit taxation (Wet Loonbelasting Art. 11)',
        isTaxable: true,
        isStatutory: true,
        displayOrder: 303
      },
      {
        code: 'MEDICAL_FORFAIT_PROGRESSIVE',
        name: 'Medische Forfait (Progressief)',
        type: 'deduction',
        category: 'benefit_forfait',
        description: 'Progressive medical forfait benefit taxation (Wet Loonbelasting Art. 11)',
        isTaxable: true,
        isStatutory: true,
        displayOrder: 304
      },
      {
        code: 'PHONE_FORFAIT_10PCT',
        name: 'Telefoon Forfait (10%)',
        type: 'deduction',
        category: 'benefit_forfait',
        description: 'Forfait communication benefit taxation at 10% of allowance (Wet Loonbelasting Art. 10)',
        isTaxable: true,
        isStatutory: true,
        displayOrder: 305
      },
      {
        code: 'MEDICAL_FORFAIT_15PCT',
        name: 'Medische Forfait (15%)',
        type: 'deduction',
        category: 'benefit_forfait',
        description: 'Forfait medical insurance benefit taxation at 15% of premium (Wet Loonbelasting Art. 10)',
        isTaxable: true,
        isStatutory: true,
        displayOrder: 306
      },
      {
        code: 'FUEL_FORFAIT_20PCT',
        name: 'Brandstof Forfait (20%)',
        type: 'deduction',
        category: 'benefit_forfait',
        description: 'Forfait fuel allowance benefit taxation at 20% of allowance (Wet Loonbelasting Art. 10)',
        isTaxable: true,
        isStatutory: true,
        displayOrder: 307
      }
    ]

    for (const comp of components) {
      await client.query(`
        INSERT INTO payroll.pay_component (
          organization_id, component_code, component_name, component_type,
          category, is_taxable, display_order, calculation_type,
          is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'fixed_amount', true, $8)
        ON CONFLICT (organization_id, component_code) DO NOTHING
      `, [
        orgId, comp.code, comp.name, comp.type,
        comp.category, comp.isTaxable,
        comp.displayOrder, userId
      ])

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
        organization_id, tax_name, country, tax_type,
        effective_from, effective_to, created_by
      ) VALUES ($1, 'Suriname Wage Tax 2025', 'SR', 'wage_tax', 
                '2025-01-01', '2025-12-31', $2)
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

    for (let i = 0; i < brackets.length; i++) {
      const bracket = brackets[i]
      await client.query(`
        INSERT INTO payroll.tax_bracket (
          organization_id, tax_rule_set_id, bracket_order, 
          income_min, income_max, rate_percentage, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [orgId, taxRuleId, i + 1, bracket.min, bracket.max, bracket.rate, userId])
    }


    // Create AOV rule (4% flat rate)
    await client.query(`
      INSERT INTO payroll.tax_rule_set (
        organization_id, tax_name, country, tax_type,
        effective_from, effective_to, created_by
      ) VALUES ($1, 'Suriname AOV 2025', 'SR', 'social_security', 
                '2025-01-01', '2025-12-31', $2)
    `, [orgId, userId])

    // Create AWW rule (1% flat rate)
    await client.query(`
      INSERT INTO payroll.tax_rule_set (
        organization_id, tax_name, country, tax_type,
        effective_from, effective_to, created_by
      ) VALUES ($1, 'Suriname AWW 2025', 'SR', 'social_security', 
                '2025-01-01', '2025-12-31', $2)
    `, [orgId, userId])

  }

  /**
   * Seed allowances and deductions
   * Based on: 016_seed_allowances.js
   */
  async _seedAllowances(client, orgId, userId) {
    const allowances = [
      {
        name: 'Tax-Free Sum (Monthly)',
        type: 'tax_free_sum_monthly',
        amount: 2500.00,
        isPercentage: false,
        isActive: true,
        country: 'SR',
        description: 'Monthly tax-free allowance'
      },
      {
        name: 'Holiday Allowance (8%)',
        type: 'holiday_allowance',
        amount: 8.00,
        isPercentage: true,
        isActive: true,
        country: 'SR',
        description: 'Holiday allowance percentage'
      },
      {
        name: 'Bonus/Gratuity',
        type: 'bonus_gratuity',
        amount: 0.00,
        isPercentage: false,
        isActive: true,
        country: 'SR',
        description: 'Bonus or gratuity payments'
      }
    ]

    for (const allowance of allowances) {
      // Check if allowance already exists for this organization and type
      const existing = await client.query(`
        SELECT id FROM payroll.allowance 
        WHERE organization_id = $1 AND allowance_type = $2 AND deleted_at IS NULL
      `, [orgId, allowance.type])

      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO payroll.allowance (
            organization_id, allowance_type, allowance_name, amount, is_percentage,
            effective_from, is_active, country, description, created_by
          ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9)
        `, [
          orgId, allowance.type, allowance.name, allowance.amount, allowance.isPercentage,
          allowance.isActive, allowance.country, allowance.description, userId
        ])

      } else {
      }
    }
  }
}

export default new TenantOnboardingService()
