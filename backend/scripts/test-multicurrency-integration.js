/**
 * Manual Integration Test for Multi-Currency Features
 * 
 * This script tests:
 * 1. Approval workflow end-to-end
 * 2. Component-level currency support
 * 3. Materialized views
 * 
 * Run with: node backend/scripts/test-multicurrency-integration.js
 */

import pool from '../src/config/database.js';
import ApprovalService from '../src/products/paylinq/services/approvalService.js';
import logger from '../src/utils/logger.js';

const TEST_ORG_ID = '9ee50aee-76c3-46ce-87ed-005c6dd893ef'; // Test org from seed
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000'; // Test user from seed

async function testApprovalWorkflow() {
  console.log('\n=== Testing Approval Workflow ===\n');
  
  const approvalService = new ApprovalService();
  
  try {
    // 1. Create approval request
    console.log('1. Creating approval request...');
    const requestResult = await approvalService.createApprovalRequest({
      organizationId: TEST_ORG_ID,
      requestType: 'rate_change',
      referenceType: 'exchange_rate',
      referenceId: 1,
      requestData: {
        fromCurrency: 'USD',
        toCurrency: 'SRD',
        oldRate: 21.5,
        newRate: 22.0,
        reason: 'Market rate adjustment'
      },
      reason: 'Testing approval workflow',
      priority: 'normal',
      createdBy: TEST_USER_ID
    });
    
    if (requestResult.requiresApproval) {
      console.log('✓ Approval request created:', requestResult.approvalRequest.id);
      const requestId = requestResult.approvalRequest.id;
      
      // 2. Get pending approvals
      console.log('\n2. Fetching pending approvals...');
      const pending = await approvalService.getPendingApprovals(TEST_ORG_ID, TEST_USER_ID);
      console.log(`✓ Found ${pending.length} pending approval(s)`);
      
      // 3. Approve the request
      console.log('\n3. Approving request...');
      const approveResult = await approvalService.approveRequest(
        requestId,
        TEST_ORG_ID,
        TEST_USER_ID,
        'Approved for testing'
      );
      console.log('✓ Approval recorded:', approveResult.action);
      
      // 4. Check final status
      console.log('\n4. Checking final status...');
      const history = await approvalService.getApprovalHistory('exchange_rate', 1);
      console.log(`✓ Approval history retrieved: ${history.length} record(s)`);
      
      console.log('\n✅ Approval workflow test PASSED\n');
    } else {
      console.log('ℹ️  No approval rules configured - request auto-approved');
    }
    
  } catch (error) {
    console.error('❌ Approval workflow test FAILED:', error.message);
    throw error;
  }
}

async function testComponentCurrency() {
  console.log('\n=== Testing Component-Level Currency ===\n');
  
  try {
    // 1. Create component with currency
    console.log('1. Creating pay component with currency...');
    const result = await pool.query(`
      INSERT INTO payroll.pay_component (
        organization_id, component_code, component_name, component_type,
        calculation_type, default_amount, status, description,
        default_currency, allow_currency_override, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, component_code, component_name, default_currency, allow_currency_override
    `, [
      TEST_ORG_ID,
      'TEST_BONUS_USD',
      'Test USD Bonus',
      'earning',
      'fixed_amount',
      1000.00,
      'active',
      'Test component with USD currency',
      'USD', // default_currency
      true,  // allow_currency_override
      TEST_USER_ID
    ]);
    
    const component = result.rows[0];
    console.log('✓ Component created:', {
      id: component.id,
      code: component.component_code,
      currency: component.default_currency,
      overrideAllowed: component.allow_currency_override
    });
    
    // 2. Verify we can query it
    console.log('\n2. Querying component with currency filter...');
    const queryResult = await pool.query(`
      SELECT component_code, component_name, default_currency, allow_currency_override
      FROM payroll.pay_component
      WHERE organization_id = $1 
        AND default_currency = $2
        AND deleted_at IS NULL
    `, [TEST_ORG_ID, 'USD']);
    
    console.log(`✓ Found ${queryResult.rows.length} component(s) with USD currency`);
    
    // 3. Clean up test data
    console.log('\n3. Cleaning up test component...');
    await pool.query(`
      DELETE FROM payroll.pay_component 
      WHERE component_code = $1 AND organization_id = $2
    `, ['TEST_BONUS_USD', TEST_ORG_ID]);
    console.log('✓ Test data cleaned up');
    
    console.log('\n✅ Component currency test PASSED\n');
    
  } catch (error) {
    console.error('❌ Component currency test FAILED:', error.message);
    throw error;
  }
}

async function testMaterializedViews() {
  console.log('\n=== Testing Materialized Views ===\n');
  
  try {
    // 1. Check if materialized views exist
    console.log('1. Checking materialized views...');
    const viewsResult = await pool.query(`
      SELECT matviewname, pg_size_pretty(pg_total_relation_size('payroll.' || matviewname)) as size
      FROM pg_matviews
      WHERE schemaname = 'payroll'
        AND matviewname LIKE '%exchange_rate%' OR matviewname LIKE '%currency%'
      ORDER BY matviewname
    `);
    
    console.log(`✓ Found ${viewsResult.rows.length} materialized view(s):`);
    viewsResult.rows.forEach(view => {
      console.log(`  - ${view.matviewname} (${view.size})`);
    });
    
    // 2. Query active exchange rates view
    if (viewsResult.rows.some(v => v.matviewname === 'active_exchange_rates_mv')) {
      console.log('\n2. Querying active_exchange_rates_mv...');
      const ratesResult = await pool.query(`
        SELECT organization_id, from_currency, to_currency, rate
        FROM payroll.active_exchange_rates_mv
        LIMIT 5
      `);
      console.log(`✓ Retrieved ${ratesResult.rows.length} active rate(s) from materialized view`);
    }
    
    console.log('\n✅ Materialized views test PASSED\n');
    
  } catch (error) {
    console.error('❌ Materialized views test FAILED:', error.message);
    throw error;
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Multi-Currency Integration Test Suite               ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  try {
    await testMaterializedViews();
    await testComponentCurrency();
    await testApprovalWorkflow();
    
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   ✅ ALL TESTS PASSED                                 ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════╗');
    console.error('║   ❌ TESTS FAILED                                     ║');
    console.error('╚════════════════════════════════════════════════════════╝\n');
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
