/**
 * Feature Management Seed Script
 * 
 * Populates initial features for Nexus (ATS), Paylinq (Payroll), and Portal products
 * Run this after applying the schema updates to create the base feature catalog
 * 
 * Usage:
 *   node backend/scripts/seeds/seedFeatures.js
 */

import { query } from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

// Feature definitions for each product
const FEATURES = {
  nexus: {
    productName: 'Nexus ATS',
    features: [
      {
        featureKey: 'basic_ats',
        name: 'Basic ATS Features',
        description: 'Core applicant tracking functionality including job postings, candidate management, and basic workflows',
        category: 'core',
        minTier: 'starter',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'advanced_analytics',
        name: 'Advanced Analytics',
        description: 'Comprehensive analytics dashboard with hiring metrics, pipeline analysis, and custom reports',
        category: 'analytics',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
        dependencies: ['basic_ats'],
      },
      {
        featureKey: 'custom_reports',
        name: 'Custom Report Builder',
        description: 'Build and schedule custom reports with flexible filtering and grouping options',
        category: 'analytics',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
        dependencies: ['advanced_analytics'],
        metadata: { usageUnit: 'reports', defaultLimit: 50 },
      },
      {
        featureKey: 'data_export',
        name: 'Data Export',
        description: 'Export recruitment data to CSV, Excel, and PDF formats',
        category: 'integration',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
        metadata: { usageUnit: 'exports', defaultLimit: 100 },
      },
      {
        featureKey: 'api_access',
        name: 'API Access',
        description: 'Full REST API access for custom integrations and automation',
        category: 'integration',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
        metadata: { usageUnit: 'api_calls', defaultLimit: 10000 },
      },
      {
        featureKey: 'workflow_automation',
        name: 'Workflow Automation',
        description: 'Create automated workflows with triggers, actions, and conditions',
        category: 'automation',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
        dependencies: ['basic_ats'],
        metadata: { usageUnit: 'workflows', defaultLimit: 20 },
      },
      {
        featureKey: 'email_templates',
        name: 'Custom Email Templates',
        description: 'Create and manage branded email templates for candidate communication',
        category: 'communication',
        minTier: 'starter',
        status: 'active',
        rolloutPercentage: 100,
        metadata: { usageUnit: 'templates', defaultLimit: 10 },
      },
      {
        featureKey: 'bulk_actions',
        name: 'Bulk Actions',
        description: 'Perform actions on multiple candidates simultaneously',
        category: 'productivity',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'ai_resume_parsing',
        name: 'AI Resume Parsing',
        description: 'Automatically extract candidate information from resumes using AI',
        category: 'ai',
        minTier: 'enterprise',
        status: 'beta',
        rolloutPercentage: 50,
        metadata: { usageUnit: 'parses', defaultLimit: 1000 },
      },
      {
        featureKey: 'ai_candidate_matching',
        name: 'AI Candidate Matching',
        description: 'Intelligent candidate-to-job matching using machine learning',
        category: 'ai',
        minTier: 'enterprise',
        status: 'beta',
        rolloutPercentage: 50,
        dependencies: ['ai_resume_parsing'],
      },
      {
        featureKey: 'video_interviews',
        name: 'Video Interviews',
        description: 'Conduct and record video interviews within the platform',
        category: 'interviews',
        minTier: 'enterprise',
        status: 'active',
        rolloutPercentage: 100,
        metadata: { usageUnit: 'interviews', defaultLimit: 100 },
      },
      {
        featureKey: 'collaborative_hiring',
        name: 'Collaborative Hiring',
        description: 'Team-based hiring with shared feedback, scorecards, and decision-making',
        category: 'collaboration',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'compliance_reports',
        name: 'Compliance Reporting',
        description: 'Generate EEO, OFCCP, and other compliance reports',
        category: 'compliance',
        minTier: 'enterprise',
        status: 'active',
        rolloutPercentage: 100,
        dependencies: ['advanced_analytics'],
      },
      {
        featureKey: 'sso_integration',
        name: 'SSO Integration',
        description: 'Single Sign-On integration with SAML 2.0 and OAuth providers',
        category: 'security',
        minTier: 'enterprise',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'advanced_permissions',
        name: 'Advanced Permissions',
        description: 'Granular role-based access control with custom permission sets',
        category: 'security',
        minTier: 'enterprise',
        status: 'active',
        rolloutPercentage: 100,
      },
    ],
  },

  paylinq: {
    productName: 'Paylinq Payroll',
    features: [
      {
        featureKey: 'basic_payroll',
        name: 'Basic Payroll',
        description: 'Core payroll processing including salary calculations, tax withholding, and payment generation',
        category: 'core',
        minTier: 'starter',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'time_attendance',
        name: 'Time & Attendance',
        description: 'Track employee hours, overtime, and attendance with timesheet management',
        category: 'time',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
        dependencies: ['basic_payroll'],
      },
      {
        featureKey: 'multi_currency',
        name: 'Multi-Currency Support',
        description: 'Process payroll in multiple currencies with automatic exchange rate updates',
        category: 'international',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
        dependencies: ['basic_payroll'],
      },
      {
        featureKey: 'batch_payments',
        name: 'Batch Payments',
        description: 'Process multiple payments simultaneously with bank file generation',
        category: 'payments',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
        metadata: { usageUnit: 'batches', defaultLimit: 50 },
      },
      {
        featureKey: 'payment_analytics',
        name: 'Payment Analytics',
        description: 'Detailed analytics and reporting on payroll costs, trends, and forecasting',
        category: 'analytics',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
        dependencies: ['basic_payroll'],
      },
      {
        featureKey: 'benefits_management',
        name: 'Benefits Management',
        description: 'Manage employee benefits, deductions, and contributions',
        category: 'benefits',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
        dependencies: ['basic_payroll'],
      },
      {
        featureKey: 'tax_filing',
        name: 'Automated Tax Filing',
        description: 'Automatic calculation and filing of payroll taxes',
        category: 'compliance',
        minTier: 'enterprise',
        status: 'active',
        rolloutPercentage: 100,
        dependencies: ['basic_payroll'],
      },
      {
        featureKey: 'payroll_api',
        name: 'Payroll API',
        description: 'RESTful API for payroll integration with external systems',
        category: 'integration',
        minTier: 'enterprise',
        status: 'active',
        rolloutPercentage: 100,
        metadata: { usageUnit: 'api_calls', defaultLimit: 5000 },
      },
      {
        featureKey: 'contractor_payments',
        name: 'Contractor Payments',
        description: 'Specialized payment processing for contractors and freelancers',
        category: 'payments',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'retroactive_adjustments',
        name: 'Retroactive Adjustments',
        description: 'Apply retroactive pay adjustments with automatic recalculations',
        category: 'advanced',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
        dependencies: ['basic_payroll'],
      },
      {
        featureKey: 'global_payroll',
        name: 'Global Payroll',
        description: 'Multi-country payroll with local compliance and regulations',
        category: 'international',
        minTier: 'enterprise',
        status: 'beta',
        rolloutPercentage: 30,
        dependencies: ['multi_currency', 'tax_filing'],
      },
      {
        featureKey: 'employee_self_service',
        name: 'Employee Self-Service',
        description: 'Portal for employees to view pay stubs, tax forms, and update information',
        category: 'portal',
        minTier: 'starter',
        status: 'active',
        rolloutPercentage: 100,
      },
    ],
  },

  portal: {
    productName: 'Portal Platform',
    features: [
      {
        featureKey: 'basic_portal',
        name: 'Basic Portal',
        description: 'Core portal functionality with user management and basic customization',
        category: 'core',
        minTier: 'starter',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'white_label',
        name: 'White Label Branding',
        description: 'Remove RecruitIQ branding and apply custom branding',
        category: 'branding',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'custom_domains',
        name: 'Custom Domains',
        description: 'Use your own domain for the portal (e.g., portal.yourcompany.com)',
        category: 'branding',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
        dependencies: ['white_label'],
      },
      {
        featureKey: 'advanced_theming',
        name: 'Advanced Theming',
        description: 'Complete visual customization with CSS overrides and theme editor',
        category: 'branding',
        minTier: 'enterprise',
        status: 'active',
        rolloutPercentage: 100,
        dependencies: ['white_label'],
      },
      {
        featureKey: 'sso_saml',
        name: 'SAML SSO',
        description: 'SAML 2.0 Single Sign-On integration',
        category: 'authentication',
        minTier: 'enterprise',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'sso_oauth',
        name: 'OAuth SSO',
        description: 'OAuth 2.0 / OpenID Connect authentication',
        category: 'authentication',
        minTier: 'enterprise',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'multi_product_access',
        name: 'Multi-Product Access',
        description: 'Unified access to multiple RecruitIQ products through one portal',
        category: 'integration',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'usage_analytics',
        name: 'Usage Analytics',
        description: 'Track portal usage, user activity, and engagement metrics',
        category: 'analytics',
        minTier: 'professional',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'api_management',
        name: 'API Management',
        description: 'Manage API keys, rate limits, and access controls',
        category: 'integration',
        minTier: 'enterprise',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'audit_logging',
        name: 'Advanced Audit Logging',
        description: 'Comprehensive audit trails for compliance and security',
        category: 'security',
        minTier: 'enterprise',
        status: 'active',
        rolloutPercentage: 100,
      },
      {
        featureKey: 'custom_workflows',
        name: 'Custom Workflows',
        description: 'Build custom approval workflows and automation',
        category: 'automation',
        minTier: 'enterprise',
        status: 'beta',
        rolloutPercentage: 50,
      },
    ],
  },
};

/**
 * Get or create product and return its ID
 */
async function ensureProduct(productSlug, productName) {
  // Check if product exists
  const checkResult = await query(
    'SELECT id FROM products WHERE slug = $1',
    [productSlug]
  );

  if (checkResult.rows.length > 0) {
    logger.info(`Product ${productName} already exists`);
    return checkResult.rows[0].id;
  }

  // Create product if it doesn't exist
  const createResult = await query(
    `INSERT INTO products (name, slug, description, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING id`,
    [productName, productSlug, `${productName} - Feature management product`]
  );

  logger.info(`Created product: ${productName}`);
  return createResult.rows[0].id;
}

/**
 * Seed features for a product
 */
async function seedProductFeatures(productSlug, productData) {
  const productId = await ensureProduct(productSlug, productData.productName);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const feature of productData.features) {
    try {
      // Check if feature exists
      const existingFeature = await query(
        'SELECT id, status FROM features WHERE product_id = $1 AND feature_key = $2',
        [productId, feature.featureKey]
      );

      if (existingFeature.rows.length > 0) {
        // Feature exists - update it
        await query(
          `UPDATE features 
           SET name = $3,
               description = $4,
               category = $5,
               min_tier = $6,
               status = $7,
               rollout_percentage = $8,
               dependencies = $9,
               metadata = $10,
               updated_at = NOW()
           WHERE product_id = $1 AND feature_key = $2`,
          [
            productId,
            feature.featureKey,
            feature.name,
            feature.description || null,
            feature.category || null,
            feature.minTier || null,
            feature.status,
            feature.rolloutPercentage,
            feature.dependencies ? JSON.stringify(feature.dependencies) : null,
            feature.metadata ? JSON.stringify(feature.metadata) : null,
          ]
        );
        updated++;
        logger.info(`  ✓ Updated: ${feature.featureKey}`);
      } else {
        // Create new feature
        await query(
          `INSERT INTO features (
             product_id, feature_key, name, description, category,
             min_tier, status, rollout_percentage, dependencies, metadata
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            productId,
            feature.featureKey,
            feature.name,
            feature.description || null,
            feature.category || null,
            feature.minTier || null,
            feature.status,
            feature.rolloutPercentage,
            feature.dependencies ? JSON.stringify(feature.dependencies) : null,
            feature.metadata ? JSON.stringify(feature.metadata) : null,
          ]
        );
        created++;
        logger.info(`  ✓ Created: ${feature.featureKey}`);
      }
    } catch (error) {
      logger.error(`  ✗ Failed to seed ${feature.featureKey}:`, error.message);
      skipped++;
    }
  }

  return { created, updated, skipped };
}

/**
 * Main seed function
 */
async function seedFeatures() {
  logger.info('🌱 Starting feature seed...\n');

  const results = {
    nexus: null,
    paylinq: null,
    portal: null,
  };

  try {
    // Seed Nexus ATS features
    logger.info('📦 Seeding Nexus ATS features...');
    results.nexus = await seedProductFeatures('nexus', FEATURES.nexus);
    logger.info(`   Created: ${results.nexus.created}, Updated: ${results.nexus.updated}, Skipped: ${results.nexus.skipped}\n`);

    // Seed Paylinq features
    logger.info('💰 Seeding Paylinq Payroll features...');
    results.paylinq = await seedProductFeatures('paylinq', FEATURES.paylinq);
    logger.info(`   Created: ${results.paylinq.created}, Updated: ${results.paylinq.updated}, Skipped: ${results.paylinq.skipped}\n`);

    // Seed Portal features
    logger.info('🔐 Seeding Portal features...');
    results.portal = await seedProductFeatures('portal', FEATURES.portal);
    logger.info(`   Created: ${results.portal.created}, Updated: ${results.portal.updated}, Skipped: ${results.portal.skipped}\n`);

    // Summary
    const totalCreated = results.nexus.created + results.paylinq.created + results.portal.created;
    const totalUpdated = results.nexus.updated + results.paylinq.updated + results.portal.updated;
    const totalSkipped = results.nexus.skipped + results.paylinq.skipped + results.portal.skipped;

    logger.info('✅ Feature seed complete!');
    logger.info(`   Total Created: ${totalCreated}`);
    logger.info(`   Total Updated: ${totalUpdated}`);
    logger.info(`   Total Skipped: ${totalSkipped}`);

  } catch (error) {
    logger.error('❌ Feature seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFeatures();
}

export default seedFeatures;
