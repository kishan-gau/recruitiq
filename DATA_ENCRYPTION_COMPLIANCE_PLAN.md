# Data Encryption Compliance Plan
## Comprehensive Strategy for GDPR, CCPA, and Data Protection Regulations

**Version:** 1.0.0  
**Created:** November 15, 2025  
**Status:** Implementation Required  
**Priority:** Critical - Security & Compliance

---

## Executive Summary

This document outlines a comprehensive plan to implement field-level encryption across all RecruitIQ platform applications (RecruitIQ, Nexus, PayLinq, ScheduleHub) to achieve compliance with:

- **GDPR** (General Data Protection Regulation - EU)
- **CCPA** (California Consumer Privacy Act)
- **PIPEDA** (Personal Information Protection and Electronic Documents Act - Canada)
- **PCI DSS** (Payment Card Industry Data Security Standard)
- **HIPAA** (Health Insurance Portability and Accountability Act - US)

**Current Status:** Minimal encryption implemented (only `payments` table)  
**Risk Level:** High - Significant compliance gaps across all products  
**Estimated Effort:** 3-4 weeks for full implementation  
**Business Impact:** Critical for enterprise sales and regulatory compliance

---

## Table of Contents

1. [Regulatory Requirements](#regulatory-requirements)
2. [Current State Analysis](#current-state-analysis)
3. [Encryption Architecture](#encryption-architecture)
4. [Implementation Plan by Product](#implementation-plan-by-product)
5. [Migration Strategy](#migration-strategy)
6. [Performance Considerations](#performance-considerations)
7. [Audit & Compliance](#audit--compliance)
8. [Implementation Timeline](#implementation-timeline)

---

## Regulatory Requirements

### GDPR Requirements (Articles 32, 34, 35)

**Personal Data Categories Requiring Encryption:**
- Identification data (name, email, phone, address, national ID)
- Financial data (salary, bank accounts, payment details)
- Health data (medical leave, benefits enrollment)
- Special category data (biometric data, genetic data)
- Performance data (reviews, disciplinary records)

**Obligations:**
- ✅ Encryption at rest for all personal data
- ✅ Pseudonymization of identifiers where possible
- ✅ Searchable encryption for necessary lookups
- ✅ Data breach notification within 72 hours
- ✅ Right to access encrypted data
- ✅ Right to erasure (crypto-shredding capability)

### CCPA Requirements

**Protected Information:**
- Personal information identifiers
- Commercial information (purchase records, employment data)
- Biometric information
- Internet activity
- Geolocation data
- Professional information
- Education information

### PCI DSS Requirements (for Payment Data)

**Requirement 3:** Protect stored cardholder data
- ✅ Encrypt PANs (Primary Account Numbers)
- ✅ Render PAN unreadable (AES-256)
- ✅ Key management procedures
- ✅ Cryptographic key strength minimum 128-bit

### HIPAA Requirements (for Health Data)

**164.312(a)(2)(iv):** Encryption and decryption
- ✅ Encrypt electronic protected health information (ePHI)
- ✅ AES-256 encryption standard
- ✅ Secure key management
- ✅ Access controls

---

## Current State Analysis

### Encryption Coverage Matrix

| Product | Tables | Encrypted Tables | Coverage | Risk Level |
|---------|--------|------------------|----------|------------|
| **Core Platform** | 5 | 0 | 0% | Critical |
| **RecruitIQ** | 8 | 1 (partial) | 12.5% | High |
| **Nexus (HRIS)** | 23 | 0 | 0% | Critical |
| **PayLinq** | 35 | 1 | 2.9% | Critical |
| **ScheduleHub** | 16 | 0 | 0% | High |
| **TOTAL** | **87** | **1** | **1.1%** | **Critical** |

### Current Encrypted Fields

```javascript
// backend/src/utils/dbEncryption.js
export const ENCRYPTED_FIELDS = {
  payments: ['cardNumber', 'accountNumber', 'routingNumber']
};

export const SEARCHABLE_FIELDS = {
  payments: ['cardNumber', 'accountNumber']
};
```

### Critical Gaps Identified

**❌ No Encryption:**
1. Employee personal data (SSN, DOB, addresses, emergency contacts)
2. Candidate PII (email, phone, addresses, documents)
3. Compensation data (salaries, bonuses, equity)
4. Performance reviews (feedback, ratings, disciplinary records)
5. Benefits enrollment (health data, beneficiaries)
6. Time-off requests (medical reasons, family information)
7. Banking information (employee payroll accounts)
8. Contract details (terms, compensation clauses)
9. Background check results
10. Interview feedback notes

---

## Encryption Architecture

### Technology Stack

**Algorithm:** AES-256-GCM (Galois/Counter Mode)
- Authenticated encryption (prevents tampering)
- 256-bit key strength
- 128-bit authentication tag
- NIST approved

**Key Derivation:** PBKDF2
- 100,000 iterations
- SHA-512 digest
- Random salt per encryption
- Prevents rainbow table attacks

**Implementation:** Node.js Crypto Module
```javascript
// backend/src/services/encryption.js
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
```

### Encryption Features

✅ **Field-Level Encryption:** Granular control over sensitive columns  
✅ **Transparent Encryption:** Automatic encrypt/decrypt via middleware  
✅ **Searchable Encryption:** Hash-based searching for encrypted fields  
✅ **Key Rotation:** Re-encryption with new keys without downtime  
✅ **Batch Operations:** Efficient encryption of large datasets  
✅ **Migration Tools:** Encrypt existing unencrypted data

### Data Classification

#### Level 1: Highly Sensitive (Mandatory Encryption)
- SSN / National ID numbers
- Credit card numbers
- Bank account numbers
- Medical information
- Biometric data
- Authentication credentials
- Background check results

#### Level 2: Sensitive (Recommended Encryption)
- Full names
- Email addresses
- Phone numbers
- Dates of birth
- Home addresses
- Salary information
- Performance reviews
- Disciplinary records

#### Level 3: Confidential (Conditional Encryption)
- Job titles
- Department assignments
- Skills and qualifications
- Interview feedback
- Internal notes
- Work schedules

#### Level 4: Internal (No Encryption Required)
- Organization metadata
- Job posting descriptions
- Public-facing content
- Anonymized analytics
- System logs (sanitized)

---

## Implementation Plan by Product

### 1. Core Platform (organizations, roles, permissions)

**Schema:** `public`

#### organizations
**Fields to Encrypt:**
- `contact_email` (Level 2)
- `billing_email` (Level 2)
- `phone` (Level 2)
- `address_line1`, `address_line2` (Level 2)
- `tax_id` (Level 1 - if implemented)

**Searchable Fields:**
- `contact_email_hash`
- `billing_email_hash`
- `tax_id_hash`

**Implementation:**
```javascript
export const ENCRYPTED_FIELDS = {
  organizations: [
    'contact_email',
    'billing_email',
    'phone',
    'address_line1',
    'address_line2',
    'tax_id'
  ]
};

export const SEARCHABLE_FIELDS = {
  organizations: ['contact_email', 'billing_email', 'tax_id']
};
```

---

### 2. RecruitIQ (Applicant Tracking System)

**Schema:** `public` (recruitiq tables)  
**Priority:** High (GDPR Article 6 - legitimate interest in recruitment)

#### candidates
**Fields to Encrypt (Level 1 & 2):**
- `email` ⭐ Searchable
- `phone`
- `first_name`, `last_name`, `name`
- `location`
- `linkedin_url`
- `portfolio_url`
- `resume_url`
- `current_company`
- `notes` (may contain sensitive info)
- `application_data` (JSONB - may contain SSN, DOB)

**Searchable Fields:**
- `email_hash` (primary lookup)
- `phone_hash`

**Rationale:** Candidates' personal information is highly sensitive. Email and phone require searchability for deduplication and contact.

#### applications
**Fields to Encrypt (Level 2 & 3):**
- `cover_letter` (may contain personal information)
- `notes`
- `rejection_reason` (sensitive feedback)

**No Searchable Fields:** Lookups by candidate_id and job_id

#### interviews
**Fields to Encrypt (Level 3):**
- `notes`
- `feedback`
- `strengths`
- `weaknesses`
- `location` (if contains home address)
- `meeting_link` (contains access tokens)

**Rationale:** Interview feedback often contains subjective personal assessments that could be damaging if exposed.

#### communications
**Fields to Encrypt (Level 3):**
- `subject`
- `message`
- `attachments` (JSONB - may contain PII)

**Rationale:** Communications may contain offer details, rejection reasons, or other sensitive content.

**Implementation:**
```javascript
export const ENCRYPTED_FIELDS = {
  // ... existing fields ...
  
  candidates: [
    'email',
    'phone',
    'first_name',
    'last_name',
    'name',
    'location',
    'linkedin_url',
    'portfolio_url',
    'resume_url',
    'current_company',
    'notes',
    'application_data'
  ],
  
  applications: [
    'cover_letter',
    'notes',
    'rejection_reason'
  ],
  
  interviews: [
    'notes',
    'feedback',
    'strengths',
    'weaknesses',
    'location',
    'meeting_link'
  ],
  
  communications: [
    'subject',
    'message',
    'attachments'
  ]
};

export const SEARCHABLE_FIELDS = {
  // ... existing fields ...
  
  candidates: ['email', 'phone']
};
```

---

### 3. Nexus (HRIS - Human Resource Information System)

**Schema:** `hris`  
**Priority:** Critical (Contains most sensitive employee data)

#### hris.user_account
**Fields to Encrypt (Level 1 & 2):**
- `email` ⭐ Searchable
- `last_login_ip` (privacy protection)
- `mfa_secret` (Level 1 - security critical)
- `mfa_backup_codes` (Level 1)

**Searchable Fields:**
- `email_hash`

**Note:** `password_hash` is already hashed (bcrypt), no encryption needed

#### hris.employee
**Fields to Encrypt (Level 1 & 2):**
- `email` ⭐ Searchable
- `phone`
- `mobile_phone`
- `date_of_birth` (Level 1)
- `nationality`
- `address_line1`, `address_line2`
- `city`, `state_province`, `postal_code`, `country`
- `emergency_contact_name` (Level 1)
- `emergency_contact_relationship`
- `emergency_contact_phone` (Level 1)
- `bio` (may contain personal information)
- `national_id` (Level 1 - if added)
- `ssn` (Level 1 - if added)
- `passport_number` (Level 1 - if added)

**Searchable Fields:**
- `email_hash`
- `phone_hash`
- `ssn_hash` (if implemented)
- `national_id_hash` (if implemented)

#### hris.contract
**Fields to Encrypt (Level 1 & 2):**
- `salary` (Level 2)
- `hourly_rate` (Level 2)
- `bonus_amount` (Level 2)
- `equity_percentage` (Level 2)
- `signing_bonus` (Level 2)
- `contract_terms` (may contain compensation details)
- `special_clauses` (may contain sensitive agreements)

**Rationale:** Compensation data is highly confidential and subject to privacy laws.

#### hris.performance_review
**Fields to Encrypt (Level 2 & 3):**
- `review_notes`
- `manager_comments`
- `employee_comments`
- `goals_achieved`
- `areas_for_improvement`
- `overall_rating` (consider encrypting)

#### hris.feedback
**Fields to Encrypt (Level 3):**
- `feedback_text`
- `response_text`

#### hris.employee_benefit_enrollment
**Fields to Encrypt (Level 1 - HIPAA):**
- `beneficiary_name`
- `beneficiary_relationship`
- `beneficiary_contact`
- `health_conditions` (if stored)
- `coverage_details`

**Rationale:** Health benefits contain ePHI (electronic Protected Health Information) under HIPAA.

#### hris.time_off_request
**Fields to Encrypt (Level 1 & 2):**
- `reason` (may contain medical information)
- `notes` (may contain sensitive personal details)
- `supporting_documents` (JSONB - may contain medical documents)

**Rationale:** Medical leave reasons are protected health information.

#### hris.employee_document
**Fields to Encrypt (Level 1 & 2):**
- `document_name`
- `file_path` (contains potentially sensitive file names)
- `file_url`
- `metadata` (JSONB - may contain document classification)

**Rationale:** Employee documents may include medical records, background checks, I-9 forms, etc.

#### hris.employment_history
**Fields to Encrypt (Level 2 & 3):**
- `termination_reason`
- `termination_notes`
- `rehire_notes`
- `exit_interview_notes`

**Rationale:** Termination reasons and exit interviews contain sensitive personal assessments.

**Implementation:**
```javascript
export const ENCRYPTED_FIELDS = {
  // ... existing fields ...
  
  // Nexus HRIS
  'hris.user_account': [
    'email',
    'last_login_ip',
    'mfa_secret',
    'mfa_backup_codes'
  ],
  
  'hris.employee': [
    'email',
    'phone',
    'mobile_phone',
    'date_of_birth',
    'nationality',
    'address_line1',
    'address_line2',
    'city',
    'state_province',
    'postal_code',
    'country',
    'emergency_contact_name',
    'emergency_contact_relationship',
    'emergency_contact_phone',
    'bio',
    'ssn',           // If implemented
    'national_id',   // If implemented
    'passport_number' // If implemented
  ],
  
  'hris.contract': [
    'salary',
    'hourly_rate',
    'bonus_amount',
    'equity_percentage',
    'signing_bonus',
    'contract_terms',
    'special_clauses'
  ],
  
  'hris.performance_review': [
    'review_notes',
    'manager_comments',
    'employee_comments',
    'goals_achieved',
    'areas_for_improvement'
  ],
  
  'hris.feedback': [
    'feedback_text',
    'response_text'
  ],
  
  'hris.employee_benefit_enrollment': [
    'beneficiary_name',
    'beneficiary_relationship',
    'beneficiary_contact',
    'health_conditions',
    'coverage_details'
  ],
  
  'hris.time_off_request': [
    'reason',
    'notes',
    'supporting_documents'
  ],
  
  'hris.employee_document': [
    'document_name',
    'file_path',
    'file_url',
    'metadata'
  ],
  
  'hris.employment_history': [
    'termination_reason',
    'termination_notes',
    'rehire_notes',
    'exit_interview_notes'
  ]
};

export const SEARCHABLE_FIELDS = {
  // ... existing fields ...
  
  'hris.user_account': ['email'],
  'hris.employee': ['email', 'phone', 'ssn', 'national_id']
};
```

---

### 4. PayLinq (Payroll Management)

**Schema:** `payroll`  
**Priority:** Critical (PCI DSS, financial data protection)

#### payroll.employee_payroll_config
**Fields to Encrypt (Level 1):**
- `account_number` ⭐ Searchable (bank account)
- `routing_number`
- `tax_id` ⭐ Searchable (SSN or tax ID)

**Searchable Fields:**
- `account_number_hash`
- `tax_id_hash`

**Rationale:** Bank account information requires PCI DSS-level protection.

#### payroll.compensation
**Fields to Encrypt (Level 2):**
- `amount` (base salary/wage)
- `overtime_rate`
- `hourly_rate` (if added)

**Rationale:** Salary data is highly confidential and subject to pay equity laws.

#### payroll.paycheck
**Fields to Encrypt (Level 2):**
- `gross_pay`
- `net_pay`
- `regular_pay`
- `overtime_pay`
- `bonus_pay`
- `commission_pay`
- `federal_tax`
- `state_tax`
- `local_tax`
- `social_security`
- `medicare`
- `retirement_contribution`
- `health_insurance`
- `other_deductions`

**Rationale:** Individual paycheck details are confidential financial records.

#### payroll.payment_transaction
**Fields to Encrypt (Level 1):**
- `payment_amount`
- `bank_account` (if stored)
- `transaction_reference`
- `payment_details` (JSONB)

#### payroll.employee_deduction
**Fields to Encrypt (Level 2):**
- `deduction_amount`
- `garnishment_details` (if applicable)

#### payroll.tax_rule_set & payroll.tax_bracket
**Fields to Encrypt:** None (public tax rules)

#### payroll.time_entry & payroll.timesheet
**Fields to Encrypt (Level 3):**
- `notes` (may contain personal information)

**Implementation:**
```javascript
export const ENCRYPTED_FIELDS = {
  // ... existing fields ...
  
  // PayLinq Payroll
  'payroll.employee_payroll_config': [
    'account_number',
    'routing_number',
    'tax_id'
  ],
  
  'payroll.compensation': [
    'amount',
    'overtime_rate',
    'hourly_rate'
  ],
  
  'payroll.paycheck': [
    'gross_pay',
    'net_pay',
    'regular_pay',
    'overtime_pay',
    'bonus_pay',
    'commission_pay',
    'federal_tax',
    'state_tax',
    'local_tax',
    'social_security',
    'medicare',
    'retirement_contribution',
    'health_insurance',
    'other_deductions'
  ],
  
  'payroll.payment_transaction': [
    'payment_amount',
    'bank_account',
    'transaction_reference',
    'payment_details'
  ],
  
  'payroll.employee_deduction': [
    'deduction_amount',
    'garnishment_details'
  ],
  
  'payroll.time_entry': [
    'notes'
  ],
  
  'payroll.timesheet': [
    'notes'
  ]
};

export const SEARCHABLE_FIELDS = {
  // ... existing fields ...
  
  'payroll.employee_payroll_config': ['account_number', 'tax_id']
};
```

---

### 5. ScheduleHub (Workforce Scheduling)

**Schema:** `scheduling`  
**Priority:** Medium (Less sensitive than HRIS/Payroll)

#### scheduling.worker_scheduling_config
**Fields to Encrypt (Level 3):**
- `scheduling_notes` (may contain personal preferences/restrictions)

#### scheduling.availability
**Fields to Encrypt (Level 3):**
- `reason` (may contain personal information, medical reasons)

#### scheduling.shift_swap_request
**Fields to Encrypt (Level 3):**
- `reason` (personal reasons for swap requests)
- `notes`

#### scheduling.time_off_request (if duplicated from HRIS)
**Fields to Encrypt (Level 1 & 2):**
- Same as `hris.time_off_request`

**Implementation:**
```javascript
export const ENCRYPTED_FIELDS = {
  // ... existing fields ...
  
  // ScheduleHub
  'scheduling.worker_scheduling_config': [
    'scheduling_notes'
  ],
  
  'scheduling.availability': [
    'reason'
  ],
  
  'scheduling.shift_swap_request': [
    'reason',
    'notes'
  ]
};

// No searchable fields needed for ScheduleHub
```

---

## Migration Strategy

### Phase 1: Preparation (Week 1)

**1.1 Backup All Data**
```bash
# Create full database backup
pg_dump recruitiq_dev > backup_pre_encryption_$(date +%Y%m%d).sql

# Verify backup integrity
pg_restore --list backup_pre_encryption_*.sql
```

**1.2 Update Encryption Configuration**
```javascript
// backend/src/utils/dbEncryption.js
export const ENCRYPTED_FIELDS = {
  // Add all fields from implementation plan
};

export const SEARCHABLE_FIELDS = {
  // Add all searchable fields
};
```

**1.3 Add Hash Columns for Searchable Fields**
```sql
-- Add hash columns for searchable encrypted fields
ALTER TABLE candidates ADD COLUMN email_hash VARCHAR(64);
ALTER TABLE candidates ADD COLUMN phone_hash VARCHAR(64);
ALTER TABLE hris.employee ADD COLUMN email_hash VARCHAR(64);
ALTER TABLE hris.employee ADD COLUMN phone_hash VARCHAR(64);
ALTER TABLE hris.employee ADD COLUMN ssn_hash VARCHAR(64);
-- ... etc for all searchable fields

-- Create indexes on hash columns
CREATE INDEX idx_candidates_email_hash ON candidates(email_hash);
CREATE INDEX idx_candidates_phone_hash ON candidates(phone_hash);
CREATE INDEX idx_employee_email_hash ON hris.employee(email_hash);
-- ... etc
```

**1.4 Test Encryption in Development**
```javascript
// backend/tests/encryption/migration.test.js
import { migrateToEncryption } from '../src/utils/dbEncryption.js';

describe('Encryption Migration', () => {
  it('should encrypt all candidate records', async () => {
    await migrateToEncryption(db, 'candidates', 100);
    // Verify encryption
  });
});
```

### Phase 2: Staged Migration (Week 2)

**2.1 Migration Order (Low to High Risk)**
1. Test environment first
2. Staging environment
3. Production (during maintenance window)

**2.2 Table Migration Priority**
```javascript
// Migration sequence (least critical to most critical)
const MIGRATION_SEQUENCE = [
  // Phase 2A: Non-critical
  'communications',
  'interviews',
  'applications',
  
  // Phase 2B: Moderately critical
  'candidates',
  'organizations',
  'scheduling.availability',
  
  // Phase 2C: Highly critical (require maintenance window)
  'hris.employee',
  'hris.contract',
  'payroll.employee_payroll_config',
  'payroll.compensation',
  'payroll.paycheck',
  'payroll.payment_transaction'
];
```

**2.3 Execute Migration with Monitoring**
```javascript
// backend/scripts/migrate-encryption.js
import db from '../src/config/database.js';
import { migrateToEncryption } from '../src/utils/dbEncryption.js';
import logger from '../src/utils/logger.js';

async function migrateAllTables() {
  for (const table of MIGRATION_SEQUENCE) {
    logger.info(`Starting migration for table: ${table}`);
    
    const startTime = Date.now();
    const rowsMigrated = await migrateToEncryption(db, table, 100);
    const duration = Date.now() - startTime;
    
    logger.info(`Completed ${table}: ${rowsMigrated} rows in ${duration}ms`);
    
    // Pause between tables to reduce load
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

migrateAllTables().catch(console.error);
```

**2.4 Verification Script**
```javascript
// backend/scripts/verify-encryption.js
async function verifyEncryption(table, fields) {
  const rows = await db.query(`SELECT * FROM ${table} LIMIT 100`);
  
  for (const row of rows.rows) {
    for (const field of fields) {
      if (row[field] && !encryption.isEncrypted(row[field])) {
        logger.error(`Unencrypted data found: ${table}.${field}`);
        return false;
      }
    }
  }
  
  logger.info(`✅ ${table} encryption verified`);
  return true;
}
```

### Phase 3: Code Updates (Week 2-3)

**3.1 Update Repository Methods**
```javascript
// Add encryption middleware to all data access methods

// Example: backend/src/repositories/CandidateRepository.js
import { encryptRow, decryptRow } from '../utils/dbEncryption.js';

class CandidateRepository {
  async create(candidateData, organizationId) {
    // Encrypt before saving
    const encrypted = encryptRow('candidates', candidateData);
    
    const result = await db.query(
      `INSERT INTO candidates (email, phone, ...) VALUES ($1, $2, ...)`,
      [encrypted.email, encrypted.phone, ...]
    );
    
    // Decrypt before returning
    return decryptRow('candidates', result.rows[0]);
  }
  
  async findByEmail(email, organizationId) {
    // Use hash for searching
    const emailHash = encryption.hash(email);
    
    const result = await db.query(
      `SELECT * FROM candidates WHERE email_hash = $1 AND organization_id = $2`,
      [emailHash, organizationId]
    );
    
    if (result.rows.length === 0) return null;
    
    // Decrypt before returning
    return decryptRow('candidates', result.rows[0]);
  }
}
```

**3.2 Update Service Layer**
```javascript
// Services automatically use repository encryption
// No changes needed if repositories handle encryption transparently
```

**3.3 Update Controllers**
```javascript
// Controllers receive decrypted data from services
// No changes needed (encryption is transparent)
```

### Phase 4: Testing (Week 3)

**4.1 Unit Tests**
- Test encryption/decryption functions
- Test hash generation for searchable fields
- Test key rotation

**4.2 Integration Tests**
- Test CRUD operations with encryption
- Test search functionality with hashed fields
- Test performance with encrypted data

**4.3 End-to-End Tests**
- Test complete user workflows
- Test data export (GDPR right to access)
- Test data deletion (GDPR right to erasure)

### Phase 5: Production Deployment (Week 4)

**5.1 Pre-Deployment Checklist**
- ✅ All tests passing in staging
- ✅ Full database backup completed
- ✅ Rollback plan documented
- ✅ Maintenance window scheduled
- ✅ Monitoring alerts configured
- ✅ Team briefed on deployment

**5.2 Deployment Steps**
1. Enable maintenance mode
2. Create final database backup
3. Run migration scripts
4. Verify encryption
5. Deploy updated application code
6. Run smoke tests
7. Disable maintenance mode
8. Monitor for 24 hours

**5.3 Rollback Plan**
```bash
# If issues occur, restore from backup
pg_restore --clean --if-exists -d recruitiq_dev backup_pre_encryption_*.sql

# Redeploy previous application version
git checkout <previous-commit>
npm run deploy:production
```

---

## Performance Considerations

### Encryption Overhead

**Benchmarks (AES-256-GCM):**
- Encryption: ~0.1-0.5ms per field
- Decryption: ~0.1-0.5ms per field
- Hash generation: ~0.01ms per field

**Impact on Common Operations:**
- INSERT: +5-10ms for 10 encrypted fields
- SELECT: +10-20ms for 10 encrypted fields
- UPDATE: +15-30ms for 10 encrypted fields

### Optimization Strategies

**1. Batch Operations**
```javascript
// Encrypt multiple rows in parallel
async function encryptBatch(rows, table) {
  return Promise.all(
    rows.map(row => encryptRow(table, row))
  );
}
```

**2. Caching Decrypted Data**
```javascript
// Cache frequently accessed encrypted data (with TTL)
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function getCachedEmployee(employeeId) {
  let employee = cache.get(employeeId);
  
  if (!employee) {
    employee = await employeeRepository.findById(employeeId);
    cache.set(employeeId, employee);
  }
  
  return employee;
}
```

**3. Lazy Decryption**
```javascript
// Only decrypt fields when accessed
class EncryptedEmployee {
  constructor(encryptedData) {
    this._encrypted = encryptedData;
    this._decrypted = {};
  }
  
  get email() {
    if (!this._decrypted.email) {
      this._decrypted.email = decrypt(this._encrypted.email);
    }
    return this._decrypted.email;
  }
}
```

**4. Database Connection Pooling**
```javascript
// Increase pool size to handle encryption overhead
const pool = new Pool({
  max: 50, // Increased from 20
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**5. Index Optimization**
```sql
-- Ensure hash columns are indexed for fast lookups
CREATE INDEX CONCURRENTLY idx_candidates_email_hash ON candidates(email_hash);
CREATE INDEX CONCURRENTLY idx_employee_ssn_hash ON hris.employee(ssn_hash);
```

### Monitoring

**Metrics to Track:**
- Average query time (before/after encryption)
- Database CPU usage
- Memory consumption
- Cache hit rate
- API response times

**Alerting Thresholds:**
- Query time > 500ms (P95)
- CPU usage > 80%
- Memory usage > 90%
- Error rate > 0.1%

---

## Audit & Compliance

### Audit Logging

**Log All Encryption Operations:**
```javascript
// backend/src/utils/encryptionAudit.js
export async function logEncryptionAccess(userId, table, field, action) {
  await db.query(`
    INSERT INTO audit_log (
      user_id, 
      action_type, 
      resource_type, 
      resource_id, 
      details
    ) VALUES ($1, $2, $3, $4, $5)
  `, [
    userId,
    `encryption.${action}`,
    table,
    field,
    JSON.stringify({ timestamp: new Date(), algorithm: 'aes-256-gcm' })
  ]);
}
```

### Compliance Documentation

**Create Compliance Reports:**
```javascript
// backend/scripts/compliance-report.js
async function generateComplianceReport() {
  const report = {
    generatedAt: new Date(),
    encryptionAlgorithm: 'AES-256-GCM',
    keyLength: 256,
    encryptedTables: [],
    unencryptedPII: []
  };
  
  // Check each table for encrypted fields
  for (const [table, fields] of Object.entries(ENCRYPTED_FIELDS)) {
    report.encryptedTables.push({
      table,
      encryptedFields: fields,
      coverage: calculateCoverage(table, fields)
    });
  }
  
  return report;
}
```

### GDPR Data Subject Rights

**1. Right to Access (Article 15)**
```javascript
// Export all user data (decrypted)
async function exportUserData(userId) {
  const userData = {
    personal: await getEmployeeData(userId),
    employment: await getContractData(userId),
    payroll: await getPayrollData(userId),
    performance: await getReviewData(userId),
    benefits: await getBenefitsData(userId)
  };
  
  // All data is automatically decrypted by repositories
  return userData;
}
```

**2. Right to Erasure (Article 17)**
```javascript
// Crypto-shredding: Delete encryption keys for user's data
async function eraseUserData(userId) {
  // Option 1: Delete encrypted data
  await db.query('DELETE FROM hris.employee WHERE id = $1', [userId]);
  
  // Option 2: Keep encrypted data but destroy keys (crypto-shredding)
  // This makes data permanently unrecoverable
  await keyManagement.destroyUserKeys(userId);
}
```

**3. Right to Portability (Article 20)**
```javascript
// Export data in machine-readable format
async function exportUserDataPortable(userId) {
  const data = await exportUserData(userId);
  return {
    format: 'JSON',
    version: '1.0',
    data,
    exportedAt: new Date()
  };
}
```

### Key Management

**Master Key Storage:**
- Environment variable: `ENCRYPTION_MASTER_KEY`
- Length: Minimum 64 characters (256 bits)
- Stored in: AWS Secrets Manager / Azure Key Vault / HashiCorp Vault

**Key Rotation Schedule:**
- Master key rotation: Annually
- Data re-encryption: On key rotation
- Emergency rotation: Within 24 hours of suspected compromise

**Key Backup:**
```bash
# Backup master key securely
aws secretsmanager get-secret-value \
  --secret-id encryption-master-key \
  --region us-east-1 > master-key-backup.json

# Encrypt backup with GPG
gpg --encrypt --recipient security@company.com master-key-backup.json
```

---

## Implementation Timeline

### Week 1: Preparation & Infrastructure
- **Days 1-2:** Update encryption configuration files
- **Days 3-4:** Add hash columns to all tables
- **Day 5:** Test encryption in development environment

### Week 2: Data Migration
- **Days 1-2:** Migrate test/staging databases
- **Day 3:** Verify encryption in staging
- **Days 4-5:** Plan production migration window

### Week 3: Code Updates & Testing
- **Days 1-2:** Update repository layer with encryption
- **Days 3-4:** Update service and controller layers
- **Day 5:** Run comprehensive test suite

### Week 4: Production Deployment
- **Days 1-2:** Production migration (maintenance window)
- **Days 3-4:** Monitor and verify
- **Day 5:** Documentation and compliance reporting

---

## Success Criteria

### Technical Metrics
- ✅ 100% of identified sensitive fields encrypted
- ✅ All searchable fields have hash indexes
- ✅ Query performance degradation < 20%
- ✅ Zero data loss during migration
- ✅ All tests passing post-migration

### Compliance Metrics
- ✅ GDPR compliance achieved (Articles 32, 34, 35)
- ✅ PCI DSS compliance (Requirement 3)
- ✅ HIPAA compliance (164.312(a)(2)(iv))
- ✅ CCPA compliance
- ✅ Audit trail for all encrypted data access

### Business Metrics
- ✅ No customer-facing downtime
- ✅ API response times within SLA
- ✅ Zero security incidents post-deployment
- ✅ Compliance certification ready
- ✅ Customer data export feature working

---

## Risk Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:**
- Full database backups before migration
- Test migration in staging first
- Incremental migration with verification
- Rollback plan ready

### Risk 2: Performance Degradation
**Mitigation:**
- Performance testing before production
- Caching strategy for frequently accessed data
- Database optimization (indexes, connection pooling)
- Monitoring and alerting

### Risk 3: Application Bugs
**Mitigation:**
- Comprehensive test coverage
- Gradual rollout (canary deployment)
- Feature flags for encryption
- Rollback capability

### Risk 4: Key Compromise
**Mitigation:**
- Secure key storage (secrets manager)
- Key rotation procedures
- Access logging and monitoring
- Incident response plan

---

## Post-Implementation

### Maintenance
- Monthly encryption coverage audit
- Quarterly key rotation
- Annual penetration testing
- Continuous monitoring

### Training
- Security awareness for developers
- Encryption best practices documentation
- Incident response procedures
- Compliance requirements training

### Documentation
- Update security policies
- Create runbooks for key rotation
- Document data classification
- Maintain compliance reports

---

## Appendix A: Complete Encryption Configuration

```javascript
// backend/src/utils/dbEncryption.js

export const ENCRYPTED_FIELDS = {
  // Core Platform
  organizations: [
    'contact_email',
    'billing_email',
    'phone',
    'address_line1',
    'address_line2',
    'tax_id'
  ],
  
  // RecruitIQ
  candidates: [
    'email',
    'phone',
    'first_name',
    'last_name',
    'name',
    'location',
    'linkedin_url',
    'portfolio_url',
    'resume_url',
    'current_company',
    'notes',
    'application_data'
  ],
  
  applications: [
    'cover_letter',
    'notes',
    'rejection_reason'
  ],
  
  interviews: [
    'notes',
    'feedback',
    'strengths',
    'weaknesses',
    'location',
    'meeting_link'
  ],
  
  communications: [
    'subject',
    'message',
    'attachments'
  ],
  
  // Nexus HRIS
  'hris.user_account': [
    'email',
    'last_login_ip',
    'mfa_secret',
    'mfa_backup_codes'
  ],
  
  'hris.employee': [
    'email',
    'phone',
    'mobile_phone',
    'date_of_birth',
    'nationality',
    'address_line1',
    'address_line2',
    'city',
    'state_province',
    'postal_code',
    'country',
    'emergency_contact_name',
    'emergency_contact_relationship',
    'emergency_contact_phone',
    'bio',
    'ssn',
    'national_id',
    'passport_number'
  ],
  
  'hris.contract': [
    'salary',
    'hourly_rate',
    'bonus_amount',
    'equity_percentage',
    'signing_bonus',
    'contract_terms',
    'special_clauses'
  ],
  
  'hris.performance_review': [
    'review_notes',
    'manager_comments',
    'employee_comments',
    'goals_achieved',
    'areas_for_improvement'
  ],
  
  'hris.feedback': [
    'feedback_text',
    'response_text'
  ],
  
  'hris.employee_benefit_enrollment': [
    'beneficiary_name',
    'beneficiary_relationship',
    'beneficiary_contact',
    'health_conditions',
    'coverage_details'
  ],
  
  'hris.time_off_request': [
    'reason',
    'notes',
    'supporting_documents'
  ],
  
  'hris.employee_document': [
    'document_name',
    'file_path',
    'file_url',
    'metadata'
  ],
  
  'hris.employment_history': [
    'termination_reason',
    'termination_notes',
    'rehire_notes',
    'exit_interview_notes'
  ],
  
  // PayLinq
  'payroll.employee_payroll_config': [
    'account_number',
    'routing_number',
    'tax_id'
  ],
  
  'payroll.compensation': [
    'amount',
    'overtime_rate',
    'hourly_rate'
  ],
  
  'payroll.paycheck': [
    'gross_pay',
    'net_pay',
    'regular_pay',
    'overtime_pay',
    'bonus_pay',
    'commission_pay',
    'federal_tax',
    'state_tax',
    'local_tax',
    'social_security',
    'medicare',
    'retirement_contribution',
    'health_insurance',
    'other_deductions'
  ],
  
  'payroll.payment_transaction': [
    'payment_amount',
    'bank_account',
    'transaction_reference',
    'payment_details'
  ],
  
  'payroll.employee_deduction': [
    'deduction_amount',
    'garnishment_details'
  ],
  
  'payroll.time_entry': [
    'notes'
  ],
  
  'payroll.timesheet': [
    'notes'
  ],
  
  // ScheduleHub
  'scheduling.worker_scheduling_config': [
    'scheduling_notes'
  ],
  
  'scheduling.availability': [
    'reason'
  ],
  
  'scheduling.shift_swap_request': [
    'reason',
    'notes'
  ],
  
  // Existing (unchanged)
  payments: [
    'cardNumber',
    'accountNumber',
    'routingNumber'
  ]
};

export const SEARCHABLE_FIELDS = {
  // Core Platform
  organizations: ['contact_email', 'billing_email', 'tax_id'],
  
  // RecruitIQ
  candidates: ['email', 'phone'],
  
  // Nexus HRIS
  'hris.user_account': ['email'],
  'hris.employee': ['email', 'phone', 'ssn', 'national_id'],
  
  // PayLinq
  'payroll.employee_payroll_config': ['account_number', 'tax_id'],
  
  // Existing (unchanged)
  payments: ['cardNumber', 'accountNumber']
};

/**
 * Allowed tables for encryption operations (SQL injection prevention)
 */
const ALLOWED_TABLES = [
  // Core
  'organizations',
  
  // RecruitIQ
  'candidates',
  'applications',
  'interviews',
  'communications',
  
  // Nexus HRIS
  'hris.user_account',
  'hris.employee',
  'hris.contract',
  'hris.performance_review',
  'hris.feedback',
  'hris.employee_benefit_enrollment',
  'hris.time_off_request',
  'hris.employee_document',
  'hris.employment_history',
  
  // PayLinq
  'payroll.employee_payroll_config',
  'payroll.compensation',
  'payroll.paycheck',
  'payroll.payment_transaction',
  'payroll.employee_deduction',
  'payroll.time_entry',
  'payroll.timesheet',
  
  // ScheduleHub
  'scheduling.worker_scheduling_config',
  'scheduling.availability',
  'scheduling.shift_swap_request',
  
  // Existing
  'payments'
];
```

---

## Appendix B: Database Migration Script

```sql
-- ====================================================================
-- ENCRYPTION MIGRATION SCRIPT
-- Adds hash columns for searchable encrypted fields
-- ====================================================================

-- Core Platform
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_email_hash VARCHAR(64);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_email_hash VARCHAR(64);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_id_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_organizations_contact_email_hash 
  ON organizations(contact_email_hash);
CREATE INDEX IF NOT EXISTS idx_organizations_billing_email_hash 
  ON organizations(billing_email_hash);
CREATE INDEX IF NOT EXISTS idx_organizations_tax_id_hash 
  ON organizations(tax_id_hash);

-- RecruitIQ
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_candidates_email_hash 
  ON candidates(email_hash);
CREATE INDEX IF NOT EXISTS idx_candidates_phone_hash 
  ON candidates(phone_hash);

-- Nexus HRIS
ALTER TABLE hris.user_account ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_user_account_email_hash 
  ON hris.user_account(email_hash);

ALTER TABLE hris.employee ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);
ALTER TABLE hris.employee ADD COLUMN IF NOT EXISTS phone_hash VARCHAR(64);
ALTER TABLE hris.employee ADD COLUMN IF NOT EXISTS ssn_hash VARCHAR(64);
ALTER TABLE hris.employee ADD COLUMN IF NOT EXISTS national_id_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_employee_email_hash 
  ON hris.employee(email_hash);
CREATE INDEX IF NOT EXISTS idx_employee_phone_hash 
  ON hris.employee(phone_hash);
CREATE INDEX IF NOT EXISTS idx_employee_ssn_hash 
  ON hris.employee(ssn_hash);
CREATE INDEX IF NOT EXISTS idx_employee_national_id_hash 
  ON hris.employee(national_id_hash);

-- PayLinq
ALTER TABLE payroll.employee_payroll_config 
  ADD COLUMN IF NOT EXISTS account_number_hash VARCHAR(64);
ALTER TABLE payroll.employee_payroll_config 
  ADD COLUMN IF NOT EXISTS tax_id_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_payroll_config_account_number_hash 
  ON payroll.employee_payroll_config(account_number_hash);
CREATE INDEX IF NOT EXISTS idx_payroll_config_tax_id_hash 
  ON payroll.employee_payroll_config(tax_id_hash);

-- Existing payments table (already has hash columns)
-- No changes needed
```

---

## Conclusion

This comprehensive plan provides a roadmap to achieve full data encryption compliance across the RecruitIQ platform. Implementation will require careful coordination between development, operations, and security teams, but is essential for:

1. **Regulatory Compliance:** Meeting GDPR, CCPA, PCI DSS, and HIPAA requirements
2. **Customer Trust:** Demonstrating commitment to data protection
3. **Enterprise Sales:** Enabling sales to Fortune 500 companies with strict security requirements
4. **Risk Mitigation:** Protecting against data breaches and associated costs

**Next Steps:**
1. Review and approve this plan with stakeholders
2. Schedule implementation kickoff meeting
3. Allocate development resources
4. Begin Phase 1 (Preparation) immediately

**Estimated Total Effort:** 3-4 weeks (2 developers)  
**Estimated Cost:** $30,000-$40,000 (development time)  
**ROI:** Avoid $4.35M average data breach cost (IBM 2023 report)

---

**Document Owner:** Security Team  
**Last Updated:** November 15, 2025  
**Review Cycle:** Quarterly  
**Classification:** Internal - Security Sensitive
